import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import {
  getDatabases,
  getUsers,
  DATABASE_ID,
  EVENTS_COLLECTION_ID,
  REGISTRATIONS_COLLECTION_ID,
  SOCIETIES_COLLECTION_ID,
  RegistrationDocument,
  getEvent,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';
import { resendTicketEmail } from '@/lib/emailIntegration';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

interface BulkEmailRequest {
  registration_ids?: string[];
}

async function isUserChairOfEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    const db = getDatabases();
    const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);

    const users = getUsers();
    const memberships = await users.listMemberships(userId);

    const isAdmin = memberships.memberships.some(
      (m) => m.teamId === 'admins' || m.teamName?.toLowerCase() === 'admins'
    );
    if (isAdmin) return true;

    const society = await db.getDocument(
      DATABASE_ID,
      SOCIETIES_COLLECTION_ID,
      event.society_id as string
    );
    const chairTeamId = `chair_${society.slug}`;

    return memberships.memberships.some(
      (m) => m.teamId === chairTeamId || m.teamName === chairTeamId
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const log = createLogger({ action: 'bulk-send-registration-email', eventId });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const isChair = await isUserChairOfEvent(user.$id, eventId);
    if (!isChair) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Not authorized to send emails for this event.' },
        { status: 403 }
      );
    }

    const body = (await req.json()) as BulkEmailRequest;
    const registrationIds = Array.isArray(body.registration_ids) ? body.registration_ids : [];

    if (registrationIds.length === 0) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'registration_ids is required.' },
        { status: 400 }
      );
    }

    if (registrationIds.length > 500) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Maximum 500 registrations per request.' },
        { status: 400 }
      );
    }

    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Event not found.' },
        { status: 404 }
      );
    }

    const db = getDatabases();

    const registrations = await Promise.all(
      registrationIds.map(async (registrationId) => {
        try {
          const reg = (await db.getDocument(
            DATABASE_ID,
            REGISTRATIONS_COLLECTION_ID,
            registrationId
          )) as unknown as RegistrationDocument;

          if (reg.event_id !== eventId) return null;
          return reg;
        } catch {
          return null;
        }
      })
    );

    const validRegistrations = registrations.filter((r): r is RegistrationDocument => Boolean(r));

    let sentCount = 0;
    const failedIds: string[] = [];

    for (const registration of validRegistrations) {
      const result = await resendTicketEmail(
        {
          $id: registration.$id,
          user_id: registration.user_id,
          event_id: registration.event_id,
          ticket_id: registration.ticket_id,
        },
        {
          $id: event.$id,
          title: event.title,
          start_date: event.start_date,
          date: event.date,
          venue: event.venue,
          price: event.price,
        }
      );

      if (result.success) {
        sentCount++;
      } else {
        failedIds.push(registration.$id);
      }
    }

    const skippedCount = registrationIds.length - validRegistrations.length;

    log.info('Bulk registration email processed', {
      requested: String(registrationIds.length),
      valid: String(validRegistrations.length),
      sent: String(sentCount),
      failed: String(failedIds.length),
      skipped: String(skippedCount),
    });

    return NextResponse.json({
      success: true,
      requested_count: registrationIds.length,
      processed_count: validRegistrations.length,
      sent_count: sentCount,
      failed_count: failedIds.length,
      skipped_count: skippedCount,
      failed_registration_ids: failedIds,
      message: `Queued emails for ${sentCount} registration(s).`,
    });
  } catch (error) {
    log.error(
      'Failed to process bulk registration emails',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to send bulk emails.' },
      { status: 500 }
    );
  }
}
