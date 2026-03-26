import { NextRequest, NextResponse } from 'next/server';
import {
  getUserRegistrationForEvent,
  getTicketByRegistration,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

/**
 * GET /api/events/[eventId]/registration?userId=<userId>
 * Check if a user is already registered for an event.
 * Returns { registration, ticket } if registered, or {} if not.
 * Public-ish endpoint – userId is passed as a query param;
 * the admin SDK is used so no user-level auth token is required.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const log = createLogger({ action: 'check-registration', eventId });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'userId query parameter is required.' },
      { status: 400 }
    );
  }

  try {
    const registration = await getUserRegistrationForEvent(userId, eventId);

    if (!registration) {
      // Not registered – return empty body with 200 so frontend knows to show the form
      return NextResponse.json({});
    }

    // Fetch ticket (embedded ticket is supported even if ticket_id is missing)
    const ticket = await getTicketByRegistration(registration.$id);

    log.info('Existing registration found', {
      registrationId: registration.$id,
      status: registration.registration_status,
    });

    return NextResponse.json({ registration, ticket });
  } catch (error) {
    const appwriteError = error as { code?: number; message?: string };
    // 404 = collection doesn't exist yet (DB not fully set up) — treat same as "not registered"
    if (appwriteError.code === 404) {
      log.warn('Registrations collection not found — DB may not be set up yet');
      return NextResponse.json({});
    }
    log.error(
      'Failed to check registration',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
