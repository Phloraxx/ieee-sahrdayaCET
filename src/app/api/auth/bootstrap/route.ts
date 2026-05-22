import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest, upsertMemberFromSignedInUser } from '@/lib/passkeys/passkeyStore';
import { logger } from '@/lib/api/logger';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const signedInUser = await getSignedInUserFromRequest(req);
    if (!signedInUser) {
      return NextResponse.json({ error: 'NOT_SIGNED_IN' }, { status: 401 });
    }

    const member = await upsertMemberFromSignedInUser(signedInUser);

    return NextResponse.json({
      ok: true,
      memberId: member.$id,
      userId: signedInUser.$id,
    });
  } catch (err) {
    logger.error('Auth bootstrap error', err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'BOOTSTRAP_FAILED' }, { status: 500 });
  }
}

