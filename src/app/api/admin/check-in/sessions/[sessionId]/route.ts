import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import {
  getDatabases,
  Query,
  DATABASE_ID,
  EVENT_REGISTRATIONS_COLLECTION_ID,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

interface CheckInLogWithDetails {
  $id: string;
  registration_id: string;
  event_id: string;
  session_id: string;
  checked_in_by: string;
  checked_in_at: string;
  user_id: string;
  attendee_name?: string;
  attendee_email?: string;
  ticket_id?: string;
}

/**
 * GET /api/admin/check-in/sessions/[sessionId]
 * Get check-in logs for a specific session
 * 
 * NOTE: Session-based tracking is deprecated. This endpoint now returns
 * an empty result as check-in state is stored in event_registrations.
 * Use /api/admin/check-in/[eventId]/status for recent check-ins instead.
 */
export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  const { sessionId } = await params;
  const log = createLogger({ action: 'get_session_checkin_logs' });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Unauthorized session logs access');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // Session-based check-in logs are deprecated
    // If sessionId contains event info (virtual_<eventId>_...), extract and query registrations
    let enrichedLogs: CheckInLogWithDetails[] = [];
    
    // Try to extract event ID from virtual session format
    const virtualSessionMatch = sessionId.match(/^virtual_([^_]+)/);
    if (virtualSessionMatch) {
      const eventId = virtualSessionMatch[1];
      const db = getDatabases();
      
      try {
        // Get checked-in registrations for this event
        const registrations = await db.listDocuments(
          DATABASE_ID,
          EVENT_REGISTRATIONS_COLLECTION_ID,
          [
            Query.equal('event_id', eventId),
            Query.equal('checked_in', true),
            Query.orderDesc('$updatedAt'),
            Query.limit(1000),
          ]
        );

        enrichedLogs = registrations.documents.map((reg) => {
          let attendeeName = 'Unknown';
          let attendeeEmail = '';
          
          try {
            const formResponses = reg.form_responses 
              ? JSON.parse(reg.form_responses as string) 
              : {};
            attendeeName = formResponses.name || (reg.user_name as string) || 'Unknown';
            attendeeEmail = formResponses.email || (reg.user_email as string) || '';
          } catch {
            attendeeName = (reg.user_name as string) || 'Unknown';
            attendeeEmail = (reg.user_email as string) || '';
          }
          
          return {
            $id: reg.$id,
            registration_id: reg.$id,
            event_id: reg.event_id as string,
            session_id: sessionId,
            checked_in_by: (reg.checked_in_by as string) || '',
            checked_in_at: (reg.check_in_time as string) || (reg.checked_in_at as string) || reg.$updatedAt,
            user_id: reg.user_id as string,
            attendee_name: attendeeName,
            attendee_email: attendeeEmail,
            ticket_id: (reg.ticket_id as string) || reg.$id,
          };
        });
      } catch (error) {
        log.warn('Failed to fetch registrations for session', { sessionId, error });
      }
    }

    // Apply search filter
    let filteredLogs = enrichedLogs;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = enrichedLogs.filter(logItem => 
        logItem.attendee_name?.toLowerCase().includes(searchLower) ||
        logItem.attendee_email?.toLowerCase().includes(searchLower) ||
        logItem.ticket_id?.toLowerCase().includes(searchLower)
      );
    }

    log.info('Session logs fetched (from registrations)', { sessionId, total: filteredLogs.length });

    return NextResponse.json({
      logs: filteredLogs,
      total: filteredLogs.length,
      notice: 'Session-based tracking deprecated. Data derived from event_registrations.',
    });
  } catch (error) {
    log.error('Failed to fetch session logs', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch check-in logs.' },
      { status: 500 }
    );
  }
}
