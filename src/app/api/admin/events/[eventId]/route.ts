import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import {
  getDatabases,
  getUsers,
  DATABASE_ID,
  EVENTS_COLLECTION_ID,
  SOCIETIES_COLLECTION_ID,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';
import { z } from 'zod';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  date: z.string().datetime().optional(),
  venue: z.string().optional(),
  price: z.number().min(0).optional(),
  banner_url: z.string().url().optional(),
  status: z.enum(['draft', 'published', 'archived', 'completed']).optional(),
  max_capacity: z.number().min(0).optional(),
  registration_deadline: z.string().datetime().optional(),
  form_template: z.string().optional(),
});

/**
 * Check if user is chair of event's society
 */
async function isUserChairOfEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    const db = getDatabases();
    const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
    
    const users = getUsers();
    const memberships = await users.listMemberships(userId);
    
    // Get society to check chair team
    const society = await db.getDocument(
      DATABASE_ID,
      SOCIETIES_COLLECTION_ID,
      event.society_id as string
    );
    const chairTeamId = `chair_${society.slug}`;
    
    // Check if user is chair or admin
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
 * GET /api/admin/events/[eventId]
 * Get single event details
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const log = createLogger({ action: 'get_admin_event', eventId });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const isChair = await isUserChairOfEvent(user.$id, eventId);
    if (!isChair) {
      log.warn('Unauthorized access', { userId: user.$id, eventId });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Not authorized to access this event.' },
        { status: 403 }
      );
    }

    const db = getDatabases();
    const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
    
    // Check if deleted
    if (event.is_deleted) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Event not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    const appwriteError = error as { code?: number };
    if (appwriteError.code === 404) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Event not found.' },
        { status: 404 }
      );
    }
    
    log.error('Failed to get event', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to retrieve event.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/events/[eventId]
 * Update event
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const log = createLogger({ action: 'update_event', eventId });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const userId = user.$id;

    // Check authorization
    const isChair = await isUserChairOfEvent(userId, eventId);
    if (!isChair) {
      log.warn('Unauthorized update attempt', { userId, eventId });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Not authorized to update this event.' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await req.json();
    const parsed = updateEventSchema.safeParse(body);
    
    if (!parsed.success) {
      log.warn('Invalid update data', { errors: parsed.error.issues, userId, eventId });
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid event data.', errors: parsed.error.issues },
        { status: 400 }
      );
    }

    const updateData = parsed.data;

    // Update event
    const db = getDatabases();
    const event = await db.updateDocument(
      DATABASE_ID,
      EVENTS_COLLECTION_ID,
      eventId,
      updateData
    );

    log.info('Event updated', { eventId, userId });

    return NextResponse.json({
      success: true,
      event,
      message: 'Event updated successfully.',
    });
  } catch (error) {
    const appwriteError = error as { code?: number };
    if (appwriteError.code === 404) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Event not found.' },
        { status: 404 }
      );
    }

    log.error('Failed to update event', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to update event.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/events/[eventId]
 * Soft delete event
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  const log = createLogger({ action: 'delete_event', eventId });

  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const userId = user.$id;

    // Check authorization
    const isChair = await isUserChairOfEvent(userId, eventId);
    if (!isChair) {
      log.warn('Unauthorized delete attempt', { userId, eventId });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Not authorized to delete this event.' },
        { status: 403 }
      );
    }

    // Soft delete (mark as deleted)
    const db = getDatabases();
    await db.updateDocument(
      DATABASE_ID,
      EVENTS_COLLECTION_ID,
      eventId,
      {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      }
    );

    log.info('Event soft deleted', { eventId, userId });

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully.',
    });
  } catch (error) {
    const appwriteError = error as { code?: number };
    if (appwriteError.code === 404) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Event not found.' },
        { status: 404 }
      );
    }

    log.error('Failed to delete event', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to delete event.' },
      { status: 500 }
    );
  }
}

