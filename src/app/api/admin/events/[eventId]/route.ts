import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import {
  getDatabases,
  DATABASE_ID,
  EVENTS_COLLECTION_ID,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';
import { z } from 'zod';
import { isUserChairOfEvent } from '@/lib/api/auth-check';
import { handleError } from '@/lib/errorHandler';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  date: z.string().datetime().optional(),
  venue: z.string().max(500).optional(),
  price: z.number().min(0).optional(),
  banner_url: z.string().url().optional(),
  status: z.enum(['draft', 'published', 'archived', 'completed']).optional(),
  max_capacity: z.number().min(0).optional(),
  registration_deadline: z.string().datetime().optional(),
  form_template: z.string().max(5000).optional(),
});

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
    return handleError(error);
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
    return handleError(error);
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
    return handleError(error);
  }
}

