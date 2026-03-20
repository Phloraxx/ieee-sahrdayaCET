import { NextRequest, NextResponse } from 'next/server';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import * as SimpleWebAuthnServerHelpers from '@simplewebauthn/server/helpers';

import {
  createChallenge,
  prepareUser,
} from '@/lib/passkeys/passkeyStore';

export const runtime = 'nodejs';

function getRpId(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  return host.split(':')[0];
}

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const rpID = getRpId(req);

    const user = await prepareUser(email);

    const options = await SimpleWebAuthnServer.generateRegistrationOptions({
      rpName: 'IEEE Sahrdaya',
      rpID,
      userID: SimpleWebAuthnServerHelpers.isoUint8Array.fromUTF8String(user.$id),
      userName: email,
      userDisplayName: email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    const challengeId = await createChallenge(user.$id, options.challenge);

    return NextResponse.json({
      challengeId,
      options,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Passkey register/start error:', err);
    return NextResponse.json({ error: 'REGISTER_START_FAILED' }, { status: 500 });
  }
}

