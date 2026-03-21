import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialRequestOptionsJSON,
  type PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/browser';
import { account } from '@/lib/appwrite';

export type PasskeyIntent = 'login' | 'reauth';

type ApiErrorPayload = {
  error?: string;
};

type PasskeyStatusResponse = {
  signedIn: boolean;
  userId?: string;
  passkeyCount: number;
  hasPasskey: boolean;
};

type LoginStartResponse = {
  challengeId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
};

type LoginFinishResponse = {
  userId: string;
  secret: string;
};

type ReauthFinishResponse = {
  ok: true;
  userId: string;
  reauthenticatedAt: number;
};

type RegisterStartResponse = {
  challengeId: string;
  options: PublicKeyCredentialCreationOptionsJSON;
  existingPasskeys: number;
};

type RegisterFinishResponse = {
  ok: true;
};

type AuthBootstrapResponse = {
  ok: true;
  memberId: string;
  userId: string;
};

export class PasskeyClientError extends Error {
  code: string;
  status?: number;

  constructor(code: string, message?: string, status?: number, options?: ErrorOptions) {
    super(message ?? code, options);
    this.name = 'PasskeyClientError';
    this.code = code;
    this.status = status;
  }
}

function normalizeWebAuthnError(error: unknown) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return new PasskeyClientError('ABORTED', 'Passkey request was cancelled.');
  }

  return new PasskeyClientError('BROWSER_PASSKEY_FAILED', 'Passkey operation failed.', undefined, {
    cause: error,
  });
}

async function parseError(res: Response) {
  const payload = (await res.json().catch(() => ({}))) as ApiErrorPayload;
  const code = payload.error || 'PASSKEY_REQUEST_FAILED';
  throw new PasskeyClientError(code, code, res.status);
}

async function withAuthHeaders(initHeaders: HeadersInit = {}) {
  const headers = new Headers(initHeaders);

  try {
    const jwt = await account.createJWT();
    headers.set('x-appwrite-jwt', jwt.jwt);
  } catch {
    // No active session; endpoint will decide if auth is required.
  }

  return headers;
}

export function isPasskeySupported() {
  if (typeof window === 'undefined') return false;
  const secure =
    window.isSecureContext === true ||
    location.protocol === 'https:' ||
    ['localhost', '127.0.0.1'].includes(location.hostname);
  return secure && !!window.PublicKeyCredential;
}

export async function bootstrapSignedInUserMember() {
  const res = await fetch('/api/auth/bootstrap', {
    method: 'POST',
    headers: await withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    await parseError(res);
  }

  return (await res.json()) as AuthBootstrapResponse;
}

export async function getPasskeyStatus() {
  const res = await fetch('/api/passkeys/register/start', {
    method: 'GET',
    headers: await withAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    await parseError(res);
  }

  return (await res.json()) as PasskeyStatusResponse;
}

export async function createPasskeyForSignedInUser() {
  const startRes = await fetch('/api/passkeys/register/start', {
    method: 'POST',
    headers: await withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({}),
  });
  if (!startRes.ok) {
    await parseError(startRes);
  }

  const startBody = (await startRes.json()) as RegisterStartResponse;

  let registration;
  try {
    registration = await startRegistration({ optionsJSON: startBody.options });
  } catch (error) {
    throw normalizeWebAuthnError(error);
  }

  const finishRes = await fetch('/api/passkeys/register/finish', {
    method: 'POST',
    headers: await withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ challengeId: startBody.challengeId, registration }),
  });
  if (!finishRes.ok) {
    await parseError(finishRes);
  }

  return (await finishRes.json()) as RegisterFinishResponse;
}

export async function authenticateWithPasskey(intent: 'login'): Promise<LoginFinishResponse>;
export async function authenticateWithPasskey(intent: 'reauth'): Promise<ReauthFinishResponse>;
export async function authenticateWithPasskey(intent: PasskeyIntent) {
  const startRes = await fetch('/api/passkeys/login/start', {
    method: 'POST',
    headers: await withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ intent }),
  });
  if (!startRes.ok) {
    await parseError(startRes);
  }

  const startBody = (await startRes.json()) as LoginStartResponse;

  let authentication;
  try {
    authentication = await startAuthentication({ optionsJSON: startBody.options });
  } catch (error) {
    throw normalizeWebAuthnError(error);
  }

  const finishRes = await fetch('/api/passkeys/login/finish', {
    method: 'POST',
    headers: await withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      challengeId: startBody.challengeId,
      authentication,
    }),
  });
  if (!finishRes.ok) {
    await parseError(finishRes);
  }

  return (await finishRes.json()) as LoginFinishResponse | ReauthFinishResponse;
}
