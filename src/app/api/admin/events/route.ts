import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import {
  getDatabases,
  getUsers,
  ID,
  Query,
  DATABASE_ID,
  EVENTS_COLLECTION_ID,
  SOCIETIES_COLLECTION_ID,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';
import { z } from 'zod';

export const runtime = 'nodejs';

const createEventSchema = z.object({
  title: z.string().min(1, 'Event title is required').max(200),
  description: z.string().optional(),
  date: z.string().datetime({ message: 'Invalid date format' }),
  venue: z.string().optional(),
  price: z.number().min(0, 'Price must be non-negative').default(0),
  banner_url: z.string().url().optional(),
  society_id: z.string().min(1, 'Society ID is required'),
  status: z.enum(['draft', 'published', 'archived', 'completed']).default('draft'),
  max_capacity: z.number().min(0).optional(),
  registration_deadline: z.string().datetime().optional(),
  form_template: z.string().optional(), // JSON string
});

/**
 * Check if user is chair of a society
 */
async function isUserChairOfSociety(userId: string, societyId: string): Promise<boolean> {
  try {
    const users = getUsers();
    const memberships = await users.listMemberships(userId);
    
    // Get society to check chair team
    const db = getDatabases();
    const society = await db.getDocument(DATABASE_ID, SOCIETIES_COLLECTION_ID, societyId);
    const chairTeamId = `chair_${society.slug}`;
    
    // Check if user is chair of this society or global admin
    return memberships.memberships.some(m => 
      m.teamId === chairTeamId || 
      m.teamName === chairTeamId ||
      m.teamId === 'admins' ||
      m.teamName?.toLowerCase() === 'admins'
    );
  } catch (error) {
    console.error('Error checking chair access:', error);
    return false;
  }
}

/**
 * GET /api/admin/events
 * List events where user is chair
 */
export async function GET(req: NextRequest) {
  const log = createLogger({ action: 'list_admin_events' });

  try {
    // Check authentication
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Unauthorized access attempt');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const userId = user.$id;
    log.info('Listing admin events', { userId });

    // Get user's team memberships to find societies they chair
    const users = getUsers();
    const memberships = await users.listMemberships(userId);
    
    const chairTeamIds = memberships.memberships
      .filter(m => m.teamId?.startsWith('chair_') || m.teamName?.startsWith('chair_'))
      .map(m => m.teamId || m.teamName);
    
    // Check if user is global admin
    const isAdmin = memberships.memberships.some(m => 
      m.teamId === 'admins' || m.teamName?.toLowerCase() === 'admins'
    );

    const db = getDatabases();
    
    // If admin, return all events, otherwise filter by society
    const queries = isAdmin 
      ? [Query.orderDesc('$createdAt'), Query.limit(100)]
      : [];

    // Get societies for chair teams
    if (!isAdmin && chairTeamIds.length > 0) {
      const societiesResult = await db.listDocuments(
        DATABASE_ID,
          SOCIETIES_COLLECTION_ID,
        [Query.limit(100)]
      );
      
      const societyIds = societiesResult.documents
        .filter(s => chairTeamIds.includes(`chair_${s.slug}`))
        .map(s => s.$id);

      if (societyIds.length > 0) {
        queries.push(Query.equal('society_id', societyIds));
      } else {
        // User is not chair of any society
        return NextResponse.json({ events: [], total: 0 });
      }
    }

    // Fetch events (exclude soft-deleted)
    const eventsResult = await db.listDocuments(DATABASE_ID, EVENTS_COLLECTION_ID, [
      ...queries,
      Query.equal('is_deleted', false),
      Query.orderDesc('$createdAt'),
    ]);

    log.info('Events retrieved', { count: eventsResult.documents.length, userId });

    return NextResponse.json({
      events: eventsResult.documents,
      total: eventsResult.total,
    });
  } catch (error) {
    log.error('Failed to list events', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to retrieve events.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/events
 * Create new event
 */
export async function POST(req: NextRequest) {
  const log = createLogger({ action: 'create_event' });

  try {
    // Check authentication
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Unauthorized create attempt');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const userId = user.$id;

    // Validate request body
    const body = await req.json();
    const parsed = createEventSchema.safeParse(body);
    
    if (!parsed.success) {
      log.warn('Invalid event data', { errors: parsed.error.issues, userId });
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid event data.', errors: parsed.error.issues },
        { status: 400 }
      );
    }

    const eventData = parsed.data;

    // Check if user is chair of the society
    const isChair = await isUserChairOfSociety(userId, eventData.society_id);
    if (!isChair) {
      log.warn('User not authorized for society', { userId, societyId: eventData.society_id });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You are not authorized to create events for this society.' },
        { status: 403 }
      );
    }

    // Create event
    const db = getDatabases();
    const event = await db.createDocument(
      DATABASE_ID,
      EVENTS_COLLECTION_ID,
      ID.unique(),
      {
        ...eventData,
        current_registrations: 0,
        total_paid: 0,
        is_deleted: false,
        created_by: userId,
      }
    );

    log.info('Event created', { eventId: event.$id, userId });

    return NextResponse.json({
      success: true,
      event,
      message: 'Event created successfully.',
    }, { status: 201 });
  } catch (error) {
    log.error('Failed to create event', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to create event.' },
      { status: 500 }
    );
  }
}

