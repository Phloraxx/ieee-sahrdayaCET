import { NextRequest, NextResponse } from 'next/server';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

function getRpId(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  return host.split(':')[0];
}

function getExpectedOrigin(req: NextRequest) {
  return req.headers.get('origin') ?? `https://${getRpId(req)}`;
}

function requireChallengeSecret() {
  const secret = process.env.APPWRITE_API_KEY;
  if (!secret) throw new Error('Missing required env var: APPWRITE_API_KEY');
  return secret;
}

function signPayload(payload: string) {
  return crypto.createHmac('sha256', requireChallengeSecret()).update(payload).digest('base64url');
}

export async function POST(req: NextRequest) {
  try {
    await req.json().catch(() => ({}));

    const rpID = getRpId(req);
    const expectedOrigin = getExpectedOrigin(req);

    const options = await SimpleWebAuthnServer.generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
    });

    const challengePayload = JSON.stringify({
      challenge: options.challenge,
      rpID,
      expectedOrigin,
      iat: Date.now(),
    });
    const challengeId = `${Buffer.from(challengePayload).toString('base64url')}.${signPayload(challengePayload)}`;

    return NextResponse.json({
      challengeId,
      options,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Passkey login/start error:', err);
    return NextResponse.json({ error: 'LOGIN_START_FAILED' }, { status: 500 });
  }
}

