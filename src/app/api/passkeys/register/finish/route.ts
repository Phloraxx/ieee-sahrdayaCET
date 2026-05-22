import { NextRequest, NextResponse } from 'next/server';
import * as SimpleWebAuthnServer from '@simplewebauthn/server';
import * as SimpleWebAuthnServerHelpers from '@simplewebauthn/server/helpers';
import type { RegistrationResponseJSON } from '@simplewebauthn/browser';

import { createLogger } from '@/lib/api/logger';

import {
  deleteChallenge,
  getChallenge,
  addCredential,
  getSignedInUserFromRequest,
} from '@/lib/passkeys/passkeyStore';

const log = createLogger({ action: 'passkey-register-finish' });

export const runtime = 'nodejs';

function getRpId(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  return host.split(':')[0];
}

function getExpectedOrigin(req: NextRequest) {
  return req.headers.get('origin') ?? `https://${getRpId(req)}`;
}

export async function POST(req: NextRequest) {
  try {
    const signedInUser = await getSignedInUserFromRequest(req);
    if (!signedInUser) {
      return NextResponse.json({ error: 'NOT_SIGNED_IN' }, { status: 401 });
    }

    const { challengeId, registration } = await req.json() as {
      challengeId?: string;
      registration?: RegistrationResponseJSON;
    };

    if (!challengeId || !registration) {
      return NextResponse.json({ error: 'Missing challengeId/registration' }, { status: 400 });
    }

    const rpID = getRpId(req);
    const expectedOrigin = getExpectedOrigin(req);

    const challenge = await getChallenge(challengeId);
    const userId = challenge.userId as string;
    if (signedInUser.$id !== userId) {
      return NextResponse.json({ error: 'NOT_ALLOWED' }, { status: 403 });
    }

    const verification = await SimpleWebAuthnServer.verifyRegistrationResponse({
      response: registration,
      expectedChallenge: challenge.token as string,
      expectedOrigin,
      expectedRPID: rpID,
    });

    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo) {
      return NextResponse.json({ error: 'INCORRECT_PASSKEY' }, { status: 400 });
    }

    const credentialIdBytes = SimpleWebAuthnServerHelpers.isoBase64URL.toBuffer(registrationInfo.credential.id);

    // Persist the credential public key + metadata for future logins.
    await addCredential(userId, {
      credentialID: SimpleWebAuthnServerHelpers.isoUint8Array.toHex(credentialIdBytes),
      credentialPublicKey: SimpleWebAuthnServerHelpers.isoUint8Array.toHex(registrationInfo.credential.publicKey),
      counter: registrationInfo.credential.counter,
      credentialDeviceType: registrationInfo.credentialDeviceType,
      credentialBackedUp: registrationInfo.credentialBackedUp,
      transports: registrationInfo.credential.transports,
    });

    await deleteChallenge(challengeId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error('Passkey register/finish error', err as Error);
    return NextResponse.json({ error: 'REGISTER_FINISH_FAILED' }, { status: 500 });
  }
}

