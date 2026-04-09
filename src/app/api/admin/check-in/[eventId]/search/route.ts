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

// Cache for chair authorization (TTL: 2 minutes)
const authCache = new Map<string, { isAuthorized: boolean; expires: number }>();
const AUTH_CACHE_TTL = 2 * 60 * 1000;

// Helper function to check if user is chair of the event (with caching)
async function isUserChairOfEvent(userId: string, eventId: string): Promise<boolean> {
    const cacheKey = `${userId}_${eventId}`;
    const cached = authCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.isAuthorized;
    }
    
    const databases = getDatabases();
    const users = getUsers();

    try {
        const [event, memberships] = await Promise.all([
            databases.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId),
            users.listMemberships(userId)
        ]);

        const isGlobalAdmin = memberships.memberships.some(
            m => m.teamId === 'admins' || m.teamName?.toLowerCase() === 'admins'
        );
        if (isGlobalAdmin) {
            authCache.set(cacheKey, { isAuthorized: true, expires: Date.now() + AUTH_CACHE_TTL });
            return true;
        }

        try {
            const society = await databases.getDocument(DATABASE_ID, SOCIETIES_COLLECTION_ID, event.society_id as string);
            const chairTeamId = `chair_${society.slug}`;
            const isChair = memberships.memberships.some(
                m => m.teamId === chairTeamId || m.teamName === chairTeamId
            );
            authCache.set(cacheKey, { isAuthorized: isChair, expires: Date.now() + AUTH_CACHE_TTL });
            return isChair;
        } catch {
            authCache.set(cacheKey, { isAuthorized: false, expires: Date.now() + AUTH_CACHE_TTL });
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

function parseFormResponses(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
}

/**
 * GET /api/admin/check-in/[eventId]/search
 * Search for registrations by name, email, or ticket ID
 * OPTIMIZED: Caching, paginated fetch, early termination
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

    // Check authorization (cached)
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

    const queryLower = query.toLowerCase();
    const matchingRegistrations: RegistrationDocument[] = [];
    const maxResults = 20;
    const maxMatches = maxResults * 2;

    // Paginate through registrations so search includes the full attendee list.
    const pageSize = 200;
    const maxPages = 10;
    let page = 0;
    let offset = 0;
    while (page < maxPages && matchingRegistrations.length < maxMatches) {
      const registrationsResult = await db.listDocuments(
        DATABASE_ID,
        EVENT_REGISTRATIONS_COLLECTION_ID,
        [
          Query.equal('event_id', eventId),
          Query.equal('registration_status', 'confirmed'),
          Query.limit(pageSize),
          Query.offset(offset),
        ]
      );
      page += 1;

      for (const rawReg of registrationsResult.documents) {
        if (matchingRegistrations.length >= maxMatches) break; // Stop early
        const reg = rawReg as RegistrationDocument;
        const formResponses = parseFormResponses(reg.form_responses);
        const formName = typeof formResponses.name === 'string' ? formResponses.name : '';
        const formEmail = typeof formResponses.email === 'string' ? formResponses.email : '';

        let matches = false;

        // Check ticket_id first (most specific)
        if (reg.ticket_id && reg.ticket_id.toLowerCase().includes(queryLower)) {
          matches = true;
        }

        // Check registration ID
        if (!matches && reg.$id.toLowerCase().includes(queryLower)) {
          matches = true;
        }

        // Check user_name field
        if (!matches) {
          const userName = (reg.user_name || '').toLowerCase();
          if (userName.includes(queryLower)) matches = true;
        }

        // Check user_email field
        if (!matches) {
          const userEmail = (reg.user_email || '').toLowerCase();
          if (userEmail.includes(queryLower)) matches = true;
        }

        // Check form_responses for name/email
        if (!matches) {
          if (formName.toLowerCase().includes(queryLower) || formEmail.toLowerCase().includes(queryLower)) {
            matches = true;
          }
        }

        if (matches) {
          matchingRegistrations.push(reg);
        }
      }

      if (registrationsResult.documents.length < pageSize) {
        break;
      }
      offset += pageSize;
    }

    // Get ticket IDs from current registration model
    const results: SearchResult[] = matchingRegistrations.slice(0, maxResults).map((reg) => {
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

      const formResponses = parseFormResponses(reg.form_responses);
      if (typeof formResponses.name === 'string' && formResponses.name.trim()) {
        studentName = formResponses.name;
      }
      if (typeof formResponses.email === 'string' && formResponses.email.trim()) {
        email = formResponses.email;
      }

      // Get location history for checked-in registrations
      const locationHistory = reg.checked_in ? getLocationRecency(reg) : undefined;

      return {
        registrationId: reg.$id,
        ticketId,
        studentName,
        email,
        isCheckedIn: Boolean(reg.checked_in),
        checkedInAt: reg.check_in_time || reg.checked_in_at || undefined,
        lastLocation: reg.last_check_in_location || 'entrance',
        locationHistory,
      };
    });

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
