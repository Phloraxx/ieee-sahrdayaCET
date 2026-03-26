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

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

// Helper function to check if user is chair of the event
async function isUserChairOfEvent(userId: string, eventId: string, db: ReturnType<typeof getDatabases>, users: ReturnType<typeof getUsers>): Promise<boolean> {
    try {
        // Get event
        const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
        
        // List user's team memberships
        const memberships = await users.listMemberships(userId);
        
        // Check if user is global admin first
        const isGlobalAdmin = memberships.memberships.some(
            m => m.teamId === 'admins' || m.teamName?.toLowerCase() === 'admins'
        );
        
        if (isGlobalAdmin) return true;
        
        // Try to get society, but handle if it doesn't exist
        try {
            const society = await db.getDocument(DATABASE_ID, SOCIETIES_COLLECTION_ID, event.society_id as string);
            const chairTeamId = `chair_${society.slug}`;
            
            // Check for chair team
            return memberships.memberships.some(
                m => m.teamId === chairTeamId || m.teamName === chairTeamId
            );
        } catch (societyError) {
            // Society not found - user needs to be admin
            console.warn('Society not found for event:', event.society_id);
            return false;
        }
    } catch (error) {
        console.error('Error verifying chair access:', error);
        return false;
    }
}

/**
 * GET /api/admin/check-in/[eventId]/status
 * Get check-in status and event info for the check-in page
 * Sessionless mode: activeSession is always null
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const log = createLogger({ action: 'get_checkin_status', eventId });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Unauthorized status check');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const db = getDatabases();
    const users = getUsers();

    // Check authorization
    const isAuthorized = await isUserChairOfEvent(user.$id, eventId, db, users);
    if (!isAuthorized) {
      log.warn('Unauthorized check-in access', { userId: user.$id, eventId });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You do not have permission to access check-in for this event.' },
        { status: 403 }
      );
    }

    // Get event details
    const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);

    // Count total registrations
    const registrationsResult = await db.listDocuments(DATABASE_ID, EVENT_REGISTRATIONS_COLLECTION_ID, [
      Query.equal('event_id', eventId),
      Query.equal('registration_status', 'confirmed'),
      Query.limit(1),
    ]);
    const totalRegistered = registrationsResult.total;

    // Count checked-in registrations
    const checkedInResult = await db.listDocuments(DATABASE_ID, EVENT_REGISTRATIONS_COLLECTION_ID, [
      Query.equal('event_id', eventId),
      Query.equal('checked_in', true),
      Query.limit(1),
    ]);
    const totalCheckedIn = checkedInResult.total;

    // Sessionless mode: activeSession is always null
    // Check-ins work without requiring a session
    const activeSession = null;

    // Get recent check-ins from event_registrations
    let recentCheckIns: Array<{
      id: string;
      studentName: string;
      ticketId: string;
      checkedInAt: string;
      location?: string;
      locationHistory?: LocationRecencyInfo[];
    }> = [];
    
    try {
      // Query registrations that are checked in, sorted by $updatedAt (as proxy for check-in time)
      const checkedInRegistrations = await db.listDocuments(DATABASE_ID, EVENT_REGISTRATIONS_COLLECTION_ID, [
        Query.equal('event_id', eventId),
        Query.equal('checked_in', true),
        Query.orderDesc('$updatedAt'),
        Query.limit(50),
      ]);

      recentCheckIns = checkedInRegistrations.documents.map((rawReg) => {
        const reg = rawReg as unknown as RegistrationDocument;
        
        // Parse name from form_responses
        let studentName = reg.user_name || 'Unknown';
        try {
          const formResponses = reg.form_responses ? JSON.parse(reg.form_responses) : {};
          studentName = formResponses.name || studentName;
        } catch {
          // ignore
        }
        
        // Get location history for the check-in timeline
        const locationHistory = getLocationRecency(reg);
        
        return {
          id: reg.$id,
          studentName,
          ticketId: reg.ticket_id || reg.$id,
          checkedInAt: reg.check_in_time || reg.checked_in_at || reg.$updatedAt,
          location: reg.last_check_in_location || 'entrance',
          locationHistory,
        };
      });
    } catch (error) {
      log.warn('Could not fetch recent check-ins', { error: String(error) });
    }

    log.info('Check-in status retrieved (sessionless mode)', { eventId });

    return NextResponse.json({
      event: {
        id: event.$id,
        title: event.title,
        date: event.date,
        venue: event.venue,
        maxCapacity: event.max_capacity || 0,
        totalRegistered,
        totalCheckedIn,
        societyId: event.society_id,
      },
      activeSession,
      recentCheckIns,
      notice: 'Sessionless mode: Check-ins work without session tracking.',
    });
  } catch (error) {
    const appwriteError = error as { code?: number };
    if (appwriteError.code === 404) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Event not found.' },
        { status: 404 }
      );
    }

    log.error('Failed to get check-in status', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to retrieve check-in status.' },
      { status: 500 }
    );
  }
}
