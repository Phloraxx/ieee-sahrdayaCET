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
  getLocationRecency,
  type RegistrationDocument,
  type LocationRecencyInfo,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';

export const runtime = 'nodejs';

interface SearchResult {
  registrationId: string;
  ticketId: string;
  studentName: string;
  email: string;
  isCheckedIn: boolean;
  checkedInAt?: string;
  lastLocation?: string;
  locationHistory?: LocationRecencyInfo[];
  eventId: string;
  eventTitle: string;
}

/**
 * Get user's accessible society IDs
 */
async function getUserSocietyIds(userId: string): Promise<{ ids: string[]; isAdmin: boolean }> {
  try {
    const users = getUsers();
    const memberships = await users.listMemberships(userId);
    
    const db = getDatabases();
    const societiesRes = await db.listDocuments(
      DATABASE_ID,
      SOCIETIES_COLLECTION_ID,
      [Query.limit(100)]
    );
    
    // Check if user is admin
    const isAdmin = memberships.memberships.some(m => 
      m.teamId === 'admins' || m.teamName?.toLowerCase() === 'admins'
    );
    
    // If admin, return all society IDs
    if (isAdmin) {
      return { ids: societiesRes.documents.map(s => s.$id), isAdmin: true };
    }
    
    // Extract chair team slugs
    const chairSlugs = memberships.memberships
      .filter(m => m.teamId?.startsWith('chair_') || m.teamName?.startsWith('chair_'))
      .map(m => (m.teamId?.replace('chair_', '') || m.teamName?.replace('chair_', '') || ''));
    
    // Return society IDs user is chair of
    const ids = societiesRes.documents
      .filter(s => chairSlugs.includes((s as unknown as { slug: string }).slug))
      .map(s => s.$id);
      
    return { ids, isAdmin: false };
  } catch (error) {
    console.error('Error getting user societies:', error);
    return { ids: [], isAdmin: false };
  }
}

/**
 * GET /api/admin/check-in/search-all
 * Search for registrations by name, email, or ticket ID across all accessible events
 */
export async function GET(req: NextRequest) {
  const log = createLogger({ action: 'search_all_registrations' });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Unauthorized search attempt');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
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
    const userId = user.$id;
    
    // Get user's accessible society IDs
    const { ids: societyIds, isAdmin } = await getUserSocietyIds(userId);
    if (societyIds.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        message: 'No societies accessible.',
      });
    }

    // Get events user has access to
    const eventsQuery = isAdmin
      ? [Query.limit(100)]
      : [Query.equal('society_id', societyIds), Query.limit(100)];
    
    const eventsRes = await db.listDocuments(DATABASE_ID, EVENTS_COLLECTION_ID, eventsQuery);
    const eventIds = eventsRes.documents.map(e => e.$id);
    const eventMap = new Map(eventsRes.documents.map(e => [e.$id, e.title as string]));
    
    if (eventIds.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        message: 'No events found.',
      });
    }

    // Search across all accessible events
    // We need to get registrations and filter client-side since Appwrite doesn't support LIKE queries
    const registrationsResult = await db.listDocuments(
      DATABASE_ID,
      EVENT_REGISTRATIONS_COLLECTION_ID,
      [
        Query.equal('event_id', eventIds),
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

      // Check form_responses for name/email
      try {
        const formResponses = reg.form_responses ? JSON.parse(reg.form_responses as string) : {};
        if (formResponses.name?.toLowerCase().includes(queryLower)) return true;
        if (formResponses.email?.toLowerCase().includes(queryLower)) return true;
      } catch {
        // Ignore parse errors
      }

      // Check registration ID
      if (reg.$id.toLowerCase().includes(queryLower)) return true;
      
      // Check ticket_id if present
      if (reg.ticket_id && (reg.ticket_id as string).toLowerCase().includes(queryLower)) return true;

      return false;
    });

    // Build results
    const results: SearchResult[] = matchingRegistrations.slice(0, 30).map((rawReg) => {
      const reg = rawReg as unknown as RegistrationDocument;
      
      // Get ticket ID
      let ticketId = reg.$id;
      if (reg.ticket_id) {
        ticketId = reg.ticket_id;
      }

      // Get name and email from form_responses
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
        isCheckedIn: Boolean(reg.checked_in),
        checkedInAt: reg.check_in_time || reg.checked_in_at || undefined,
        lastLocation: reg.last_check_in_location || 'entrance',
        locationHistory,
        eventId: reg.event_id,
        eventTitle: eventMap.get(reg.event_id) || 'Unknown Event',
      };
    });

    log.info('Global search completed', { 
      userId,
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
