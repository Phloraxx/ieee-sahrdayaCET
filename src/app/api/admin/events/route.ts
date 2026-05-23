import { NextRequest, NextResponse } from 'next/server';
import { validateCSRF } from '@/lib/api/csrf';
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
import { handleError } from '@/lib/errorHandler';

export const runtime = 'nodejs';

const createEventSchema = z.object({
  title: z.string().min(1, 'Event title is required').max(200),
  description: z.string().max(5000).optional(),
  date: z.string().datetime({ message: 'Invalid date format' }),
  venue: z.string().max(500).optional(),
  price: z.number().min(0, 'Price must be non-negative').default(0),
  banner_url: z.string().url().optional(),
  society_id: z.string().min(1, 'Society ID is required'),
  status: z.enum(['draft', 'published', 'archived', 'completed']).default('draft'),
  max_capacity: z.number().min(0).optional(),
  registration_deadline: z.string().datetime().optional(),
  form_template: z.string().max(5000).optional(),
});

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
    return handleError(error);
  }
}

/**
 * POST /api/admin/events
 * Create new event
 */
export async function POST(req: NextRequest) {
  const log = createLogger({ action: 'create_event' });

  try {
    validateCSRF(req);
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

    // Check if user is chair of this society BEFORE creating event
    const users = getUsers();
    const memberships = await users.listMemberships(userId);
    const chairTeamIds = memberships.memberships
      .filter(m => m.teamId?.startsWith('chair_') || m.teamName?.startsWith('chair_'))
      .map(m => m.teamId || m.teamName);

    const societiesResult = await getDatabases().listDocuments(
      DATABASE_ID,
      SOCIETIES_COLLECTION_ID,
      [Query.equal('$id', eventData.society_id), Query.limit(1)]
    );
    const society = societiesResult.documents[0] as Record<string, unknown> | undefined;
    const societySlug = society?.slug as string | undefined;

    const isSocietyChair = societySlug
      ? chairTeamIds.includes(`chair_${societySlug}`)
      : false;

    if (!isSocietyChair) {
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
    return handleError(error);
  }
}

