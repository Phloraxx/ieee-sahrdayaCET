import { NextRequest, NextResponse } from 'next/server';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import * as SimpleWebAuthnServerHelpers from '@simplewebauthn/server/helpers';
import type { AuthenticationResponseJSON } from '@simplewebauthn/browser';
import crypto from 'crypto';

import {
  createSessionToken,
  findUserIdByCredentialId,
  getCredentials,
  updateCredentialCounter,
} from '@/lib/passkeys/passkeyStore';

export const runtime = 'nodejs';

function getRpId(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  return host.split(':')[0];
}

function getExpectedOrigin(req: NextRequest) {
  return req.headers.get('origin') ?? `https://${getRpId(req)}`;
}

type SignedChallenge = {
  challenge: string;
  rpID: string;
  expectedOrigin: string;
  iat: number;
};

function requireChallengeSecret() {
  const secret = process.env.APPWRITE_API_KEY;
  if (!secret) throw new Error('Missing required env var: APPWRITE_API_KEY');
  return secret;
}

function signPayload(payload: string) {
  return crypto.createHmac('sha256', requireChallengeSecret()).update(payload).digest('base64url');
}

function parseChallenge(challengeId: string): SignedChallenge | null {
  const [payloadBase64, signature] = challengeId.split('.');
  if (!payloadBase64 || !signature) return null;

  const payload = Buffer.from(payloadBase64, 'base64url').toString('utf8');
  const expected = signPayload(payload);
  if (signature !== expected) return null;

  const parsed = JSON.parse(payload) as SignedChallenge;
  if (!parsed.challenge || !parsed.rpID || !parsed.expectedOrigin || typeof parsed.iat !== 'number') {
    return null;
  }

  // 5 minute challenge validity window
  if (Date.now() - parsed.iat > 5 * 60 * 1000) {
    return null;
  }

  return parsed;
}

function userHandleToUserId(userHandle?: string | null) {
  if (!userHandle) return null;
  try {
    return Buffer.from(userHandle, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { challengeId, authentication } = await req.json() as {
      challengeId?: string;
      authentication?: AuthenticationResponseJSON;
    };

    if (!challengeId || !authentication) {
      return NextResponse.json({ error: 'Missing challengeId/authentication' }, { status: 400 });
    }

    const parsedChallenge = parseChallenge(challengeId);
    if (!parsedChallenge) {
      return NextResponse.json({ error: 'INVALID_CHALLENGE' }, { status: 400 });
    }

    const rpID = getRpId(req);
    const expectedOrigin = getExpectedOrigin(req);
    if (rpID !== parsedChallenge.rpID || expectedOrigin !== parsedChallenge.expectedOrigin) {
      return NextResponse.json({ error: 'ORIGIN_MISMATCH' }, { status: 400 });
    }

    const userIdFromHandle = userHandleToUserId(authentication.response.userHandle);
    const userId = userIdFromHandle ?? await findUserIdByCredentialId(authentication.id);
    if (!userId) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }

    const credentials = await getCredentials(userId);
    if (!credentials.length) {
      return NextResponse.json({ error: 'NO_PASSKEY' }, { status: 404 });
    }

    const credentialIdBase64URLFromStored = (storedIdHex: string) => {
      const bytes = SimpleWebAuthnServerHelpers.isoUint8Array.fromHex(storedIdHex);
      return SimpleWebAuthnServerHelpers.isoBase64URL.fromBuffer(bytes, 'base64url');
    };

    const authenticationId = authentication.id;
    const matchedCredential = credentials.find(
      (c) => credentialIdBase64URLFromStored(c.credentialID) === authenticationId
    );

    if (!matchedCredential) {
      return NextResponse.json({ error: 'INCORRECT_PASSKEY' }, { status: 400 });
    }

    const verification = await SimpleWebAuthnServer.verifyAuthenticationResponse({
      response: authentication,
      expectedChallenge: parsedChallenge.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: authenticationId,
        publicKey: SimpleWebAuthnServerHelpers.isoUint8Array.fromHex(matchedCredential.credentialPublicKey),
        counter: matchedCredential.counter,
        transports: matchedCredential.transports,
      },
    });

    const { verified, authenticationInfo } = verification;
    if (!verified) {
      return NextResponse.json({ error: 'INCORRECT_PASSKEY' }, { status: 400 });
    }

    // Update the stored counter to prevent replay.
    await updateCredentialCounter(userId, matchedCredential.credentialID, authenticationInfo.newCounter);

    const token = await createSessionToken(userId);

    return NextResponse.json({
      userId,
      secret: token.secret,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Passkey login/finish error:', err);
    return NextResponse.json({ error: 'LOGIN_FINISH_FAILED' }, { status: 500 });
  }
}

