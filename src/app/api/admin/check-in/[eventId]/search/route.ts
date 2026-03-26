import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import { 
  getDatabases, 
  getUsers, 
  Query, 
  DATABASE_ID,
  EVENTS_COLLECTION_ID,
  EVENT_REGISTRATIONS_COLLECTION_ID,
  SOCIETIES_COLLECTION_ID,
  parseEmbeddedTicket,
  getLocationRecency,
  type RegistrationDocument,
  type LocationRecencyInfo,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

// Helper function to check if user is chair of the event
async function isUserChairOfEvent(userId: string, eventId: string): Promise<boolean> {
    const databases = getDatabases();
    const users = getUsers();

    try {
        const event = await databases.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
        const memberships = await users.listMemberships(userId);

        const isGlobalAdmin = memberships.memberships.some(
            m => m.teamId === 'admins' || m.teamName?.toLowerCase() === 'admins'
        );
        if (isGlobalAdmin) return true;

        try {
            const society = await databases.getDocument(DATABASE_ID, SOCIETIES_COLLECTION_ID, event.society_id as string);
            const chairTeamId = `chair_${society.slug}`;
            return memberships.memberships.some(
                m => m.teamId === chairTeamId || m.teamName === chairTeamId
            );
        } catch {
            return false;
        }
    } catch (error) {
        console.error('Error verifying chair access:', error);
        return false;
    }
}

interface SearchResult {
  registrationId: string;
  ticketId: string;
  studentName: string;
  email: string;
  isCheckedIn: boolean;
  checkedInAt?: string;
  lastLocation?: string;
  locationHistory?: LocationRecencyInfo[];
}

/**
 * GET /api/admin/check-in/[eventId]/search
 * Search for registrations by name, email, or ticket ID
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const log = createLogger({ action: 'search_registrations', eventId });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Unauthorized search attempt');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    // Check authorization
    const isAuthorized = await isUserChairOfEvent(user.$id, eventId);
    if (!isAuthorized) {
      log.warn('Unauthorized search attempt', { userId: user.$id, eventId });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You do not have permission to search registrations for this event.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        message: 'Please enter at least 2 characters to search.',
      });
    }

    const db = getDatabases();

    // Get all registrations for this event
    const registrationsResult = await db.listDocuments(
      DATABASE_ID,
      EVENT_REGISTRATIONS_COLLECTION_ID,
      [
        Query.equal('event_id', eventId),
        Query.equal('registration_status', 'confirmed'),
        Query.limit(500),
      ]
    );

    // Filter by search query
    const queryLower = query.toLowerCase();
    const matchingRegistrations = registrationsResult.documents.filter(reg => {
      // Check user_name field
      const userName = (reg.user_name as string || '').toLowerCase();
      if (userName.includes(queryLower)) return true;

      // Check user_email field
      const userEmail = (reg.user_email as string || '').toLowerCase();
      if (userEmail.includes(queryLower)) return true;

      // Check form_responses for name/email (new schema uses form_responses)
      try {
        const formResponses = reg.form_responses ? JSON.parse(reg.form_responses as string) : {};
        if (formResponses.name?.toLowerCase().includes(queryLower)) return true;
        if (formResponses.email?.toLowerCase().includes(queryLower)) return true;
      } catch {
        // Ignore parse errors
      }

      // Check registration ID
      if (reg.$id.toLowerCase().includes(queryLower)) return true;
      
      // Check ticket_id if present (embedded ticket)
      if (reg.ticket_id && (reg.ticket_id as string).toLowerCase().includes(queryLower)) return true;

      return false;
    });

    // Get ticket IDs from current registration model
    const results: SearchResult[] = await Promise.all(
      matchingRegistrations.slice(0, 20).map(async (rawReg) => {
        const reg = rawReg as unknown as RegistrationDocument;
        
        // Prefer embedded ticket ID, then registration ticket_id
        let ticketId = reg.$id; // Default to registration ID
        
        // Check for embedded ticket first (new schema)
        const embeddedTicket = parseEmbeddedTicket(reg);
        if (embeddedTicket) {
          ticketId = embeddedTicket.ticket_id;
        } else if (reg.ticket_id) {
          ticketId = reg.ticket_id;
        }

        // Get name and email from form_responses (new schema)
        let studentName = reg.user_name || 'Unknown';
        let email = reg.user_email || '';

        try {
          const formResponses = reg.form_responses ? JSON.parse(reg.form_responses) : {};
          studentName = formResponses.name || studentName;
          email = formResponses.email || email;
        } catch {
          // Ignore
        }

        // Get location history for checked-in registrations
        const locationHistory = reg.checked_in ? getLocationRecency(reg) : undefined;

        return {
          registrationId: reg.$id,
          ticketId,
          studentName,
          email,
          isCheckedIn: reg.checked_in === true,
          checkedInAt: reg.check_in_time || reg.checked_in_at || undefined,
          lastLocation: reg.last_check_in_location || 'entrance',
          locationHistory,
        };
      })
    );

    log.info('Search completed', { 
      eventId, 
      query, 
      resultCount: results.length 
    });

    return NextResponse.json({
      results,
      total: matchingRegistrations.length,
      showing: results.length,
    });
  } catch (error) {
    log.error('Search failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Search failed.' },
      { status: 500 }
    );
  }
}
