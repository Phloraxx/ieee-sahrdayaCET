import { NextRequest, NextResponse } from 'next/server';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import * as SimpleWebAuthnServerHelpers from '@simplewebauthn/server/helpers';

import { createLogger } from '@/lib/api/logger';

import {
  createChallenge,
  getCredentials,
  getSignedInUserFromRequest,
  upsertMemberFromSignedInUser,
} from '@/lib/passkeys/passkeyStore';

const log = createLogger({ action: 'passkey-register-start' });

export const runtime = 'nodejs';

function getRpId(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  return host.split(':')[0];
}

export async function GET(req: NextRequest) {
  try {
    const signedInUser = await getSignedInUserFromRequest(req);
    if (!signedInUser) {
      return NextResponse.json({
        signedIn: false,
        passkeyCount: 0,
        hasPasskey: false,
      });
    }

    await upsertMemberFromSignedInUser(signedInUser);
    const existingCredentials = await getCredentials(signedInUser.$id);

    return NextResponse.json({
      signedIn: true,
      userId: signedInUser.$id,
      passkeyCount: existingCredentials.length,
      hasPasskey: existingCredentials.length > 0,
    });
  } catch (err) {
    log.error('Passkey register/start status error', err as Error);
    return NextResponse.json({ error: 'PASSKEY_STATUS_FAILED' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await req.json().catch(() => ({}));

    const signedInUser = await getSignedInUserFromRequest(req);
    if (!signedInUser) {
      return NextResponse.json({ error: 'NOT_SIGNED_IN' }, { status: 401 });
    }

    await upsertMemberFromSignedInUser(signedInUser);

    const rpID = getRpId(req);
    const existingCredentials = await getCredentials(signedInUser.$id);

    const options = await SimpleWebAuthnServer.generateRegistrationOptions({
      rpName: 'IEEE Sahrdaya',
      rpID,
      userID: SimpleWebAuthnServerHelpers.isoUint8Array.fromUTF8String(signedInUser.$id),
      userName: signedInUser.email || signedInUser.$id,
      userDisplayName: signedInUser.name || signedInUser.email || 'IEEE Member',
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      excludeCredentials: existingCredentials.map((credential) => ({
        id: Buffer.from(credential.credentialID, 'hex').toString('base64url'),
        transports: credential.transports,
      })),
    });

    const challengeId = await createChallenge(signedInUser.$id, options.challenge);

    return NextResponse.json({
      challengeId,
      options,
      existingPasskeys: existingCredentials.length,
    });
  } catch (err) {
    log.error('Passkey register/start error', err as Error);
    return NextResponse.json({ error: 'REGISTER_START_FAILED' }, { status: 500 });
  }
}

