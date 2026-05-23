import { NextRequest, NextResponse } from 'next/server';
import { validateCSRF } from '@/lib/api/csrf';
import { getSignedInUserFromRequest, upsertMemberFromSignedInUser } from '@/lib/passkeys/passkeyStore';
import { handleError } from '@/lib/errorHandler';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    validateCSRF(req);
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
    return handleError(err);
  }
}

