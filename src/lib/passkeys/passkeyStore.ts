import { Client, Databases, Users, Query, ID, Account } from 'node-appwrite';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/browser';
import type { NextRequest } from 'next/server';
import { DATABASE_ID, MEMBERS_COLLECTION_ID } from '@/lib/constants/collections';
import { logger } from '@/lib/api/logger';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function getBaseClient() {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '';
  const projectId = requireEnv('NEXT_PUBLIC_APPWRITE_PROJECT_ID');
  if (!endpoint) throw new Error('Missing APPWRITE_ENDPOINT or NEXT_PUBLIC_APPWRITE_ENDPOINT');
  return new Client().setEndpoint(endpoint).setProject(projectId);
}

function getAdminClient() {
  const apiKey = requireEnv('APPWRITE_API_KEY');

  const client = getBaseClient().setKey(apiKey);
  return {
    client,
    databases: new Databases(client),
    users: new Users(client),
  };
}

function getSessionCookieFromRequest(req: NextRequest) {
  const nonLegacy = req.cookies
    .getAll()
    .find((cookie) => cookie.name.startsWith('a_session_') && !cookie.name.endsWith('_legacy'));

  if (nonLegacy?.value) return nonLegacy.value;

  const legacy = req.cookies
    .getAll()
    .find((cookie) => cookie.name.startsWith('a_session_') && cookie.name.endsWith('_legacy'));

  return legacy?.value ?? null;
}

export async function getSignedInUserFromRequest(req: NextRequest) {
  const mapAccount = async (client: Client) => {
    const account = new Account(client);
    const user = await account.get();

    return {
      $id: user.$id,
      email: user.email,
      name: user.name,
    };
  };

  // Check x-appwrite-jwt header (legacy format)
  let jwt = req.headers.get('x-appwrite-jwt');
  
  // Also check Authorization: Bearer header (standard format)
  if (!jwt) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      jwt = authHeader.slice(7);
    }
  }
  
  if (jwt) {
    try {
      return await mapAccount(getBaseClient().setJWT(jwt));
    } catch (error) {
      logger.warn('JWT validation failed', error instanceof Error ? error : new Error(String(error)));
      // Fall back to cookie-based session check.
    }
  }

  const session = getSessionCookieFromRequest(req);
  if (!session) {
    logger.warn('No session cookie found');
    return null;
  }

  try {
    return await mapAccount(getBaseClient().setSession(session));
  } catch (error) {
    logger.warn('Session validation failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export type StoredCredential = {
  credentialID: string; // hex
  credentialPublicKey: string; // hex
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports?: AuthenticatorTransportFuture[];
};

export async function getUserByEmail(email: string) {
  const { users } = getAdminClient();
  const response = await users.list([Query.equal('email', email), Query.limit(1)]);
  return response.users?.[0] ?? null;
}

export async function prepareUser(email: string) {
  const existing = await getUserByEmail(email);
  if (existing) return existing;

  // Create user (Appwrite "Users" service).
  const { users } = getAdminClient();
  return users.create(ID.unique(), email);
}

type MemberDoc = {
  $id: string;
  userID: string;
  passkeyCredentials?: string;
  passkeyChallengeId?: string;
  passkeyChallengeToken?: string;
  [key: string]: unknown;
};

type SignedInUser = {
  $id: string;
  email?: string;
  name?: string;
};

function parseStoredCredentials(raw: unknown): StoredCredential[] {
  if (typeof raw !== 'string' || !raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredCredential[]) : [];
  } catch {
    return [];
  }
}

function base64UrlToHex(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('hex');
}

function getDefaultForAttribute(attr: { key: string; type: string }, user?: SignedInUser) {
  // Provide safe defaults for required attributes on `members`.
  // We also key off common attribute names used by `setup-profile`.
  switch (attr.key) {
    case 'fullName':
      return user?.name || 'Passkey User';
    case 'semester':
      return '1';
    case 'class':
      return 'A';
    case 'course':
      return 'CS';
    case 'foodPreference':
      return 'N/A';
    case 'residence':
      return 'N/A';
    case 'sahrdayaEmail':
      if (user?.email?.toLowerCase().endsWith('@sahrdaya.ac.in')) {
        return user.email;
      }
      return user?.email || 'passkey@local';
    case 'personalEmail':
      return user?.email || 'passkey@local';
    case 'phone':
      return '0000000000';
    case 'profileCompleted':
      return false;
    case 'userID':
      // Must be overridden by caller.
      return '';
    default:
      break;
  }

  if (attr.type === 'boolean') return false;
  if (attr.type === 'integer' || attr.type === 'float') return 0;
  if (attr.type === 'datetime') return new Date().toISOString();

  // For strings/emails/urls/enums: fallback to string.
  return 'unknown';
}

async function getMemberDoc(userId: string): Promise<MemberDoc | null> {
  const { databases } = getAdminClient();
  const res = await databases.listDocuments(DATABASE_ID, MEMBERS_COLLECTION_ID, [
    Query.equal('userID', userId),
    Query.limit(1),
  ]);
  return (res.documents?.[0] as unknown as MemberDoc) ?? null;
}

const PROFILE_PLACEHOLDERS = new Set(['', 'unknown', 'Passkey User', 'passkey@local']);

function isPlaceholder(value: unknown) {
  return typeof value === 'string' && PROFILE_PLACEHOLDERS.has(value);
}

async function ensureMemberDoc(userId: string, user?: SignedInUser): Promise<MemberDoc> {
  const { databases } = getAdminClient();
  
  // Known attributes for members collection - avoid calling listAttributes which requires special permissions
  const knownAttrs = new Set([
    'userID', 'fullName', 'personalEmail', 'sahrdayaEmail', 'phone', 
    'profileCompleted', 'passkeyCredentials', 'passkeyLastUsed'
  ]);

  const existing = await getMemberDoc(userId);
  if (existing) {
    const patch: Record<string, unknown> = {};

    if (user?.name && knownAttrs.has('fullName') && isPlaceholder(existing.fullName)) {
      patch.fullName = user.name;
    }

    if (user?.email) {
      if (knownAttrs.has('personalEmail') && isPlaceholder(existing.personalEmail)) {
        patch.personalEmail = user.email;
      }

      if (
        knownAttrs.has('sahrdayaEmail') &&
        isPlaceholder(existing.sahrdayaEmail) &&
        user.email.toLowerCase().endsWith('@sahrdaya.ac.in')
      ) {
        patch.sahrdayaEmail = user.email;
      }
    }

    if (Object.keys(patch).length > 0) {
      try {
        const updated = await databases.updateDocument(DATABASE_ID, MEMBERS_COLLECTION_ID, existing.$id, patch);
        return updated as unknown as MemberDoc;
      } catch (error) {
        logger.error('Failed to update member doc', error instanceof Error ? error : new Error(String(error)));
        return existing;
      }
    }

    return existing;
  }

  // Create new member document with minimal required fields
  const data: Record<string, unknown> = {
    userID: userId,
    fullName: user?.name || 'Passkey User',
    personalEmail: user?.email || 'passkey@local',
    phone: '0000000000',
    profileCompleted: false,
  };

  // Add sahrdaya email if applicable
  if (user?.email?.toLowerCase().endsWith('@sahrdaya.ac.in')) {
    data.sahrdayaEmail = user.email;
  }

  try {
    // Create placeholder member doc. Document-level permissions are handled by Appwrite server SDK (API key).
    const created = await databases.createDocument(
      DATABASE_ID,
      MEMBERS_COLLECTION_ID,
      ID.unique(),
      data
    );

    return created as unknown as MemberDoc;
  } catch (error) {
    logger.error('Failed to create member doc', error instanceof Error ? error : new Error(String(error)));
    // Return a minimal placeholder if creation fails
    return {
      $id: userId,
      userID: userId,
      fullName: user?.name || 'Passkey User',
      personalEmail: user?.email || 'passkey@local',
      profileCompleted: false,
    } as MemberDoc;
  }
}

export async function upsertMemberFromSignedInUser(user: SignedInUser) {
  return ensureMemberDoc(user.$id, user);
}

export async function getCredentials(userId: string): Promise<StoredCredential[]> {
  const member = await getMemberDoc(userId);
  if (!member) return [];
  return parseStoredCredentials(member.passkeyCredentials);
}

export async function findUserIdByCredentialId(credentialIdBase64URL: string): Promise<string | null> {
  const { databases } = getAdminClient();
  const credentialIdHex = base64UrlToHex(credentialIdBase64URL);
  const pageSize = 100;

  for (let offset = 0; ; offset += pageSize) {
    const res = await databases.listDocuments(DATABASE_ID, MEMBERS_COLLECTION_ID, [
      Query.limit(pageSize),
      Query.offset(offset),
    ]);

    const docs = res.documents as unknown as MemberDoc[];
    for (const doc of docs) {
      const credentials = parseStoredCredentials(doc.passkeyCredentials);
      if (credentials.some((credential) => credential.credentialID === credentialIdHex)) {
        return typeof doc.userID === 'string' ? doc.userID : null;
      }
    }

    if (docs.length < pageSize) break;
  }

  return null;
}

export async function addCredential(userId: string, credential: StoredCredential) {
  const { databases } = getAdminClient();
  const member = await ensureMemberDoc(userId);

  const current = await getCredentials(userId);
  const idx = current.findIndex((c) => c.credentialID === credential.credentialID);
  const next = idx >= 0 ? current.map((c, i) => (i === idx ? credential : c)) : [...current, credential];

  await databases.updateDocument(DATABASE_ID, MEMBERS_COLLECTION_ID, member.$id, {
    passkeyCredentials: JSON.stringify(next),
  });
}

export async function updateCredentialCounter(userId: string, credentialId: string, newCounter: number) {
  const { databases } = getAdminClient();
  const member = await ensureMemberDoc(userId);

  const current = await getCredentials(userId);
  const next = current.map((c) => (c.credentialID === credentialId ? { ...c, counter: newCounter } : c));

  await databases.updateDocument(DATABASE_ID, MEMBERS_COLLECTION_ID, member.$id, {
    passkeyCredentials: JSON.stringify(next),
  });
}

export async function createChallenge(userId: string, token: string) {
  const { databases } = getAdminClient();
  const member = await ensureMemberDoc(userId);

  const challengeId = ID.unique();
  await databases.updateDocument(DATABASE_ID, MEMBERS_COLLECTION_ID, member.$id, {
    passkeyChallengeId: challengeId,
    passkeyChallengeToken: token,
  });

  return challengeId;
}

export async function getChallenge(challengeId: string) {
  const { databases } = getAdminClient();
  const res = await databases.listDocuments(DATABASE_ID, MEMBERS_COLLECTION_ID, [
    Query.equal('passkeyChallengeId', challengeId),
    Query.limit(1),
  ]);
  const doc = (res.documents?.[0] as unknown as MemberDoc) ?? null;
  if (!doc) throw new Error('Challenge not found');

  return {
    userId: doc.userID,
    token: (doc.passkeyChallengeToken as string) ?? '',
  };
}

export async function deleteChallenge(challengeId: string) {
  const { databases } = getAdminClient();
  const res = await databases.listDocuments(DATABASE_ID, MEMBERS_COLLECTION_ID, [
    Query.equal('passkeyChallengeId', challengeId),
    Query.limit(1),
  ]);
  const doc = (res.documents?.[0] as unknown as MemberDoc) ?? null;
  if (!doc) return;

  await databases.updateDocument(DATABASE_ID, MEMBERS_COLLECTION_ID, doc.$id, {
    passkeyChallengeId: '',
    passkeyChallengeToken: '',
  });
}

export async function createSessionToken(userId: string) {
  const { users } = getAdminClient();

  // length=64, ttl=300 seconds (5 minutes).
  const token = await users.createToken(userId, 64, 300);
  return token;
}

