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

interface CheckInEntry {
  id: string;
  registrationId: string;
  studentName: string;
  email: string;
  ticketId: string;
  checkedInAt: string;
  location?: string;
  locationHistory?: LocationRecencyInfo[];
}

interface EventWithCheckIns {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  societyId: string;
  societyName?: string;
  totalRegistered: number;
  totalCheckedIn: number;
  recentCheckIns: CheckInEntry[];
  lastCheckInAt?: string;
}

interface OverviewStats {
  totalCheckInsToday: number;
  totalCheckInsAllTime: number;
  eventsWithCheckIns: number;
  mostRecentCheckIn?: {
    eventTitle: string;
    studentName: string;
    checkedInAt: string;
  };
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
 * GET /api/admin/check-in/overview
 * Returns check-in overview data: events with check-ins, recent check-ins, and stats
 */
export async function GET(req: NextRequest) {
  const log = createLogger({ action: 'get_checkin_overview' });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Unauthorized overview request');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const db = getDatabases();
    const userId = user.$id;
    
    // Get user's accessible society IDs
    const { ids: societyIds, isAdmin } = await getUserSocietyIds(userId);
    if (societyIds.length === 0) {
      return NextResponse.json({
        events: [],
        stats: {
          totalCheckInsToday: 0,
          totalCheckInsAllTime: 0,
          eventsWithCheckIns: 0,
        },
        message: 'No societies accessible.',
      });
    }

    // Fetch all events for user's societies
    const eventsQuery = isAdmin
      ? [Query.orderDesc('date'), Query.limit(100)]
      : [Query.equal('society_id', societyIds), Query.orderDesc('date'), Query.limit(100)];
    
    const eventsRes = await db.listDocuments(DATABASE_ID, EVENTS_COLLECTION_ID, eventsQuery);
    
    // Fetch societies for names
    const societiesRes = await db.listDocuments(DATABASE_ID, SOCIETIES_COLLECTION_ID, [Query.limit(100)]);
    const societyMap = new Map(societiesRes.documents.map(s => [s.$id, (s as unknown as { name: string }).name]));
    
    // Build events with check-in data
    const eventsWithCheckIns: EventWithCheckIns[] = [];
    let totalCheckInsAllTime = 0;
    let totalCheckInsToday = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    let mostRecentCheckIn: OverviewStats['mostRecentCheckIn'] | undefined;
    let mostRecentTime = '';
    
    for (const event of eventsRes.documents) {
      const eventId = event.$id;
      const eventTitle = event.title as string;
      const eventDate = event.date as string;
      const societyId = event.society_id as string;
      
      // Get total registered
      const registeredRes = await db.listDocuments(DATABASE_ID, EVENT_REGISTRATIONS_COLLECTION_ID, [
        Query.equal('event_id', eventId),
        Query.equal('registration_status', 'confirmed'),
        Query.limit(1),
      ]);
      const totalRegistered = registeredRes.total;
      
      // Get all checked-in registrations
      const checkedInRes = await db.listDocuments(DATABASE_ID, EVENT_REGISTRATIONS_COLLECTION_ID, [
        Query.equal('event_id', eventId),
        Query.equal('checked_in', true),
        Query.orderDesc('$updatedAt'),
        Query.limit(50),
      ]);
      
      const totalCheckedIn = checkedInRes.total;
      
      if (totalCheckedIn === 0) {
        continue; // Skip events with no check-ins
      }
      
      totalCheckInsAllTime += totalCheckedIn;
      
      // Process recent check-ins
      const recentCheckIns: CheckInEntry[] = [];
      let lastCheckInAt: string | undefined;
      
      for (const rawReg of checkedInRes.documents) {
        const reg = rawReg as unknown as RegistrationDocument;
        
        // Parse name/email from form_responses
        let studentName = reg.user_name || 'Unknown';
        let email = reg.user_email || '';
        try {
          const formResponses = reg.form_responses ? JSON.parse(reg.form_responses) : {};
          studentName = formResponses.name || studentName;
          email = formResponses.email || email;
        } catch {
          // ignore
        }
        
        const checkedInAt = reg.check_in_time || reg.checked_in_at || reg.$updatedAt;
        
        // Count today's check-ins
        if (checkedInAt >= todayISO) {
          totalCheckInsToday++;
        }
        
        // Track most recent
        if (!lastCheckInAt || checkedInAt > lastCheckInAt) {
          lastCheckInAt = checkedInAt;
        }
        
        if (checkedInAt > mostRecentTime) {
          mostRecentTime = checkedInAt;
          mostRecentCheckIn = {
            eventTitle,
            studentName,
            checkedInAt,
          };
        }
        
        // Get location history
        const locationHistory = getLocationRecency(reg);
        
        recentCheckIns.push({
          id: reg.$id,
          registrationId: reg.$id,
          studentName,
          email,
          ticketId: reg.ticket_id || reg.$id,
          checkedInAt,
          location: reg.last_check_in_location || 'entrance',
          locationHistory,
        });
      }
      
      eventsWithCheckIns.push({
        eventId,
        eventTitle,
        eventDate,
        societyId,
        societyName: societyMap.get(societyId),
        totalRegistered,
        totalCheckedIn,
        recentCheckIns: recentCheckIns.slice(0, 10), // Limit to 10 most recent per event
        lastCheckInAt,
      });
    }
    
    // Sort events by most recent check-in
    eventsWithCheckIns.sort((a, b) => {
      if (!a.lastCheckInAt) return 1;
      if (!b.lastCheckInAt) return -1;
      return b.lastCheckInAt.localeCompare(a.lastCheckInAt);
    });
    
    const stats: OverviewStats = {
      totalCheckInsToday,
      totalCheckInsAllTime,
      eventsWithCheckIns: eventsWithCheckIns.length,
      mostRecentCheckIn,
    };

    log.info('Check-in overview retrieved', { 
      userId, 
      eventsCount: eventsWithCheckIns.length,
      totalCheckIns: totalCheckInsAllTime,
    });

    return NextResponse.json({
      events: eventsWithCheckIns,
      stats,
    });
  } catch (error) {
    log.error('Failed to get check-in overview', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to retrieve check-in overview.' },
      { status: 500 }
    );
  }
}
