import { NextRequest, NextResponse } from 'next/server';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import crypto from 'crypto';
import { createLogger } from '@/lib/api/logger';
import { handleError } from '@/lib/errorHandler';
import { getCredentials, getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';

const log = createLogger({ action: 'passkey-login-start' });

export const runtime = 'nodejs';

function getRpId(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  return host.split(':')[0];
}

function getExpectedOrigin(req: NextRequest) {
  return req.headers.get('origin') ?? `https://${getRpId(req)}`;
}

function requireChallengeSecret() {
  const secret = process.env.PASSKEY_HMAC_SECRET;
  if (!secret) throw new Error('Missing required env var: PASSKEY_HMAC_SECRET');
  return secret;
}

function signPayload(payload: string) {
  return crypto.createHmac('sha256', requireChallengeSecret()).update(payload).digest('base64url');
}

type AuthIntent = 'login' | 'reauth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const intent = (body as { intent?: AuthIntent })?.intent ?? 'login';
    if (intent !== 'login' && intent !== 'reauth') {
      return NextResponse.json({ error: 'INVALID_INTENT' }, { status: 400 });
    }

    const rpID = getRpId(req);
    const expectedOrigin = getExpectedOrigin(req);
    let userId: string | undefined;
    let allowCredentials: Parameters<typeof SimpleWebAuthnServer.generateAuthenticationOptions>[0]['allowCredentials'];
    let userVerification: 'preferred' | 'required' = 'preferred';

    if (intent === 'reauth') {
      const signedInUser = await getSignedInUserFromRequest(req);
      if (!signedInUser) {
        return NextResponse.json({ error: 'NOT_SIGNED_IN' }, { status: 401 });
      }

      const credentials = await getCredentials(signedInUser.$id);
      if (!credentials.length) {
        return NextResponse.json({ error: 'NO_PASSKEY' }, { status: 404 });
      }

      userId = signedInUser.$id;
      userVerification = 'required';
      allowCredentials = credentials.map((credential) => ({
        id: Buffer.from(credential.credentialID, 'hex').toString('base64url'),
        transports: credential.transports,
      }));
    }

    const options = await SimpleWebAuthnServer.generateAuthenticationOptions({
      rpID,
      userVerification,
      allowCredentials,
    });

    const challengePayload = JSON.stringify({
      challenge: options.challenge,
      rpID,
      expectedOrigin,
      iat: Date.now(),
      intent,
      userId,
    });
    const challengeId = `${Buffer.from(challengePayload).toString('base64url')}.${signPayload(challengePayload)}`;

    return NextResponse.json({
      challengeId,
      options,
    });
  } catch (err) {
    return handleError(err);
  }
}

