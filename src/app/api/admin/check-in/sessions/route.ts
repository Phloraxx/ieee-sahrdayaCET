import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import {
  getDatabases,
  Query,
  DATABASE_ID,
  getUsers,
  SOCIETIES_COLLECTION_ID,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';

export const runtime = 'nodejs';

/**
 * Get user's accessible society IDs
 */
async function getUserSocietyIds(userId: string): Promise<string[]> {
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
      return societiesRes.documents.map(s => s.$id);
    }
    
    // Extract chair team slugs
    const chairSlugs = memberships.memberships
      .filter(m => m.teamId?.startsWith('chair_') || m.teamName?.startsWith('chair_'))
      .map(m => (m.teamId?.replace('chair_', '') || m.teamName?.replace('chair_', '') || ''));
    
    // Return society IDs user is chair of
    return societiesRes.documents
      .filter(s => chairSlugs.includes((s as unknown as { slug: string }).slug))
      .map(s => s.$id);
  } catch (error) {
    console.error('Error getting user societies:', error);
    return [];
  }
}

/**
 * GET /api/admin/check-in/sessions
 * Sessionless mode: Returns empty list with notice
 * No actual session documents exist to query
 */
export async function GET(req: NextRequest) {
  const log = createLogger({ action: 'list_check_in_sessions' });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Unauthorized sessions list attempt');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const userId = user.$id;
    const { searchParams } = new URL(req.url);
    
    // Parse query params (kept for API compatibility)
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // Get user's accessible society IDs to verify authorization
    const societyIds = await getUserSocietyIds(userId);
    if (societyIds.length === 0) {
      return NextResponse.json({
        sessions: [],
        total: 0,
        page,
        limit,
        stats: {
          total_sessions: 0,
          total_checkins: 0,
          active_sessions: 0,
          average_checkins: 0,
        },
        notice: 'Sessionless mode: Check-ins work without session tracking. Session history is not available.',
      });
    }

    log.info('Sessions list requested (sessionless mode)', { userId, page });

    // Sessionless mode: Return empty session list with notice
    return NextResponse.json({
      sessions: [],
      total: 0,
      page,
      limit,
      stats: {
        total_sessions: 0,
        total_checkins: 0,
        active_sessions: 0,
        average_checkins: 0,
      },
      notice: 'Sessionless mode: Check-ins work without session tracking. Check-in data is available through event and registration endpoints.',
    });
  } catch (error) {
    log.error('Failed to list sessions', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch check-in sessions.' },
      { status: 500 }
    );
  }
}
