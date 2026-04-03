import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import {
  getDatabases,
  DATABASE_ID,
  EVENTS_COLLECTION_ID,
  SOCIETIES_COLLECTION_ID,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';
import { z } from 'zod';

export const runtime = 'nodejs';

const startSessionSchema = z.object({
  event_id: z.string().min(1, 'Event ID is required'),
  location: z.string().optional(),
});

/**
 * Check if user is chair of event's society
 */
async function isUserChairOfEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    const db = getDatabases();
    const { getUsers } = await import('@/lib/api/appwrite-admin');
    
    const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
    const users = getUsers();
    const memberships = await users.listMemberships(userId);
    
    // Check if user is global admin first
    const isGlobalAdmin = memberships.memberships.some(m => 
      m.teamId === 'admins' || m.teamName?.toLowerCase() === 'admins'
    );
    
    if (isGlobalAdmin) return true;
    
    // Try to get society, but handle if it doesn't exist
    try {
      const society = await db.getDocument(
        DATABASE_ID,
        SOCIETIES_COLLECTION_ID,
        event.society_id as string
      );
      const chairTeamId = `chair_${society.slug}`;
      
      return memberships.memberships.some(m => 
        m.teamId === chairTeamId || m.teamName === chairTeamId
      );
    } catch (societyError) {
      // Society not found - just check if user is admin
      console.warn('Society not found for event:', event.society_id);
      return false;
    }
  } catch (error) {
    console.error('Error checking chair access:', error);
    return false;
  }
}

/**
 * POST /api/admin/check-in/start-session
 * Sessionless mode: Returns a virtual session for backward compatibility
 * No actual session document is created in check_in_sessions collection
 */
export async function POST(req: NextRequest) {
  const log = createLogger({ action: 'start_check_in_session' });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Unauthorized session start attempt');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const userId = user.$id;

    // Validate request body
    const body = await req.json();
    const parsed = startSessionSchema.safeParse(body);
    
    if (!parsed.success) {
      log.warn('Invalid session data', { errors: parsed.error.issues, userId });
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid session data.', errors: parsed.error.issues },
        { status: 400 }
      );
    }

    const { event_id, location } = parsed.data;

    // Check authorization
    const isChair = await isUserChairOfEvent(userId, event_id);
    if (!isChair) {
      log.warn('User not authorized for event', { userId, eventId: event_id });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Not authorized to manage check-ins for this event.' },
        { status: 403 }
      );
    }

    // Sessionless mode: Return a virtual session payload without DB write
    const virtualSessionId = `virtual_${event_id}_${Date.now()}`;
    const virtualSession = {
      $id: virtualSessionId,
      event_id,
      created_by: userId,
      start_time: new Date().toISOString(),
      status: 'active',
      location: location || '',
      check_in_count: 0,
      session_name: `Session ${new Date().toLocaleString()}`,
      _sessionless: true, // Marker for sessionless mode
    };

    log.info('Virtual check-in session started (sessionless mode)', { 
      virtualSessionId, 
      eventId: event_id, 
      userId 
    });

    return NextResponse.json({
      success: true,
      session: virtualSession,
      session_id: virtualSessionId,
      message: 'Check-in session started successfully (sessionless mode).',
      notice: 'Sessions are optional. Check-ins work without session tracking.',
    }, { status: 201 });
  } catch (error) {
    log.error('Failed to start session', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to start check-in session.' },
      { status: 500 }
    );
  }
}

