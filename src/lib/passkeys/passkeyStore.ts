import { Client, Databases, Users, Query, ID, Account } from 'node-appwrite';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/browser';
import type { NextRequest } from 'next/server';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'ieee_sahrdaya_db';

// Existing collection used by AuthContext + setup-profile.
const MEMBERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_MEMBERS_COLLECTION_ID || 'members';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function getBaseClient() {
  const endpoint = requireEnv('NEXT_PUBLIC_APPWRITE_ENDPOINT');
  const projectId = requireEnv('NEXT_PUBLIC_APPWRITE_PROJECT_ID');
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

  const jwt = req.headers.get('x-appwrite-jwt');
  if (jwt) {
    try {
      return await mapAccount(getBaseClient().setJWT(jwt));
    } catch {
      // Fall back to cookie-based session check.
    }
  }

  const session = getSessionCookieFromRequest(req);
  if (!session) return null;

  try {
    return await mapAccount(getBaseClient().setSession(session));
  } catch {
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

function getDefaultForAttribute(attr: { key: string; type: string }) {
  // Provide safe defaults for required attributes on `members`.
  // We also key off common attribute names used by `setup-profile`.
  switch (attr.key) {
    case 'fullName':
      return 'Passkey User';
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
      return 'passkey@local';
    case 'personalEmail':
      return 'passkey@local';
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

async function ensureMemberDoc(userId: string): Promise<MemberDoc> {
  const { databases } = getAdminClient();

  const existing = await getMemberDoc(userId);
  if (existing) return existing;

  const attrList = await databases.listAttributes(DATABASE_ID, MEMBERS_COLLECTION_ID);
  const requiredAttrs = attrList.attributes.filter((a) => Boolean((a as { required?: boolean }).required)) as Array<{
    key: string;
    type: string;
    required: boolean;
  }>;

  const data: Record<string, unknown> = {};
  for (const attr of requiredAttrs) {
    const key = String(attr.key);
    if (key === 'userID') {
      data.userID = userId;
      continue;
    }

    // Populate required fields so we can create the member doc.
    data[key] = getDefaultForAttribute({ key, type: String(attr.type) });
  }

  // Create placeholder member doc. Document-level permissions are handled by Appwrite server SDK (API key).
  const created = await databases.createDocument(
    DATABASE_ID,
    MEMBERS_COLLECTION_ID,
    ID.unique(),
    data
  );

  return created as unknown as MemberDoc;
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

  // length=64, ttl=60 seconds, matching the community implementation.
  const token = await users.createToken(userId, 64, 60);
  return token;
}

