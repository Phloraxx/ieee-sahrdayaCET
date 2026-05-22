import { NextRequest, NextResponse } from 'next/server';
import {
  getUserRegistrationForEvent,
  getTicketByRegistration,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import { handleError } from '@/lib/errorHandler';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

/**
 * GET /api/events/[eventId]/registration
 * Check if the authenticated user is registered for an event.
 * Returns { registration, ticket } if registered, or {} if not.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const log = createLogger({ action: 'check-registration', eventId });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const registration = await getUserRegistrationForEvent(user.$id, eventId);

    if (!registration) {
      return NextResponse.json({});
    }

    const ticket = await getTicketByRegistration(registration.$id);

    log.info('Existing registration found', {
      registrationId: registration.$id,
      status: registration.registration_status,
    });

    return NextResponse.json({ registration, ticket });
  } catch (error) {
    const appwriteError = error as { code?: number; message?: string };
    if (appwriteError.code === 404) {
      log.warn('Registrations collection not found — DB may not be set up yet');
      return NextResponse.json({});
    }
    return handleError(error);
  }
}
