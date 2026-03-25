/**
 * Cron job endpoint for cleaning up expired slot reservations
 * 
 * This endpoint should be called every 5 minutes to:
 * 1. Find reservations that have expired (reservation_expires_at < now)
 * 2. Delete or mark them as expired
 * 3. Decrement reserved_slots counter on the associated event
 * 
 * Setup with Vercel Cron:
 * 1. Add to vercel.json: { "crons": [{ "path": "/api/cron/cleanup-reservations", "schedule": "*\/5 * * * *" }] }
 * 2. Add CRON_SECRET to environment variables
 * 3. Vercel will call this endpoint every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getDatabases, 
  DATABASE_ID, 
  REGISTRATIONS_COLLECTION_ID,
  EVENTS_COLLECTION_ID,
  SLOT_RESERVATIONS_COLLECTION_ID,
  Query,
} from '@/lib/api/appwrite-admin';
import { logger } from '@/lib/api/logger';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute max execution

/**
 * Verify cron secret for security
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.warn('CRON_SECRET not configured');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');

  return providedSecret === cronSecret;
}

/**
 * Clean up expired slot reservations from the dedicated reservations collection
 */
async function cleanupSlotReservations(db: ReturnType<typeof getDatabases>): Promise<{
  cleaned: number;
  errors: number;
}> {
  const now = new Date().toISOString();
  let cleaned = 0;
  let errors = 0;

  try {
    // Find expired active reservations
    const expiredReservations = await db.listDocuments(
      DATABASE_ID,
      SLOT_RESERVATIONS_COLLECTION_ID,
      [
        Query.equal('status', 'active'),
        Query.lessThan('expires_at', now),
        Query.limit(100), // Process in batches
      ]
    );

    logger.info('Found expired slot reservations', {
      count: String(expiredReservations.documents.length),
    });

    // Group by event_id for efficient counter updates
    const eventReservations = new Map<string, string[]>();
    
    for (const reservation of expiredReservations.documents) {
      const eventId = reservation.event_id as string;
      if (!eventReservations.has(eventId)) {
        eventReservations.set(eventId, []);
      }
      eventReservations.get(eventId)!.push(reservation.$id);
    }

    // Process each event's expired reservations
    for (const [eventId, reservationIds] of eventReservations) {
      try {
        // Mark all reservations as expired
        for (const reservationId of reservationIds) {
          try {
            await db.updateDocument(
              DATABASE_ID,
              SLOT_RESERVATIONS_COLLECTION_ID,
              reservationId,
              { status: 'expired' }
            );
            cleaned++;
          } catch (error) {
            logger.error('Failed to expire reservation',
              error instanceof Error ? error : new Error(String(error)),
              { reservationId }
            );
            errors++;
          }
        }

        // Decrement reserved_slots on event by the count of expired reservations
        try {
          const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
          const currentReserved = (event.reserved_slots as number) || 0;
          const newReserved = Math.max(0, currentReserved - reservationIds.length);

          await db.updateDocument(
            DATABASE_ID,
            EVENTS_COLLECTION_ID,
            eventId,
            { reserved_slots: newReserved }
          );

          logger.info('Updated event reserved_slots', {
            eventId,
            previousReserved: String(currentReserved),
            expiredCount: String(reservationIds.length),
            newReserved: String(newReserved),
          });
        } catch (eventError) {
          logger.error('Failed to update event reserved_slots',
            eventError instanceof Error ? eventError : new Error(String(eventError)),
            { eventId }
          );
        }
      } catch (error) {
        logger.error('Failed to process event reservations',
          error instanceof Error ? error : new Error(String(error)),
          { eventId }
        );
        errors++;
      }
    }
  } catch (error) {
    logger.error('Failed to query expired slot reservations',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }

  return { cleaned, errors };
}

/**
 * Clean up expired reserved registrations (registration_status = 'reserved' with expired reservation_expires_at)
 */
async function cleanupExpiredRegistrations(db: ReturnType<typeof getDatabases>): Promise<{
  cleaned: number;
  errors: number;
}> {
  const now = new Date().toISOString();
  let cleaned = 0;
  let errors = 0;

  try {
    // Find expired reserved registrations
    const expiredRegistrations = await db.listDocuments(
      DATABASE_ID,
      REGISTRATIONS_COLLECTION_ID,
      [
        Query.equal('registration_status', 'reserved'),
        Query.lessThan('reservation_expires_at', now),
        Query.limit(100), // Process in batches
      ]
    );

    logger.info('Found expired reserved registrations', {
      count: String(expiredRegistrations.documents.length),
    });

    // Group by event_id for efficient counter updates
    const eventRegistrations = new Map<string, string[]>();
    
    for (const registration of expiredRegistrations.documents) {
      const eventId = registration.event_id as string;
      if (!eventRegistrations.has(eventId)) {
        eventRegistrations.set(eventId, []);
      }
      eventRegistrations.get(eventId)!.push(registration.$id);
    }

    // Process each event's expired registrations
    for (const [eventId, registrationIds] of eventRegistrations) {
      for (const registrationId of registrationIds) {
        try {
          // Option 1: Delete the expired registration
          // await db.deleteDocument(DATABASE_ID, REGISTRATIONS_COLLECTION_ID, registrationId);
          
          // Option 2: Mark as expired (preferred for audit trail)
          await db.updateDocument(
            DATABASE_ID,
            REGISTRATIONS_COLLECTION_ID,
            registrationId,
            { 
              registration_status: 'expired',
              payment_status: 'failed', // Mark payment as failed since it wasn't completed in time
            }
          );
          
          cleaned++;
          
          logger.debug('Expired registration', { registrationId, eventId });
        } catch (error) {
          logger.error('Failed to expire registration',
            error instanceof Error ? error : new Error(String(error)),
            { registrationId }
          );
          errors++;
        }
      }

      // No need to decrement reserved_slots here as that's handled by cleanupSlotReservations
      // The reserved_slots counter is tied to SLOT_RESERVATIONS_COLLECTION_ID, not registrations
    }
  } catch (error) {
    logger.error('Failed to query expired registrations',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }

  return { cleaned, errors };
}

/**
 * Main cron handler
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cleanup cron attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  logger.info('Starting reservation cleanup cron job');

  try {
    const db = getDatabases();

    // Clean up both slot reservations and expired registrations
    const [slotResult, registrationResult] = await Promise.all([
      cleanupSlotReservations(db),
      cleanupExpiredRegistrations(db),
    ]);

    const totalCleaned = slotResult.cleaned + registrationResult.cleaned;
    const totalErrors = slotResult.errors + registrationResult.errors;
    const duration = Date.now() - startTime;

    logger.info('Reservation cleanup cron job completed', {
      duration: String(duration),
      slotReservationsCleaned: String(slotResult.cleaned),
      registrationsCleaned: String(registrationResult.cleaned),
      totalCleaned: String(totalCleaned),
      totalErrors: String(totalErrors),
    });

    return NextResponse.json({
      success: true,
      cleaned: {
        slot_reservations: slotResult.cleaned,
        registrations: registrationResult.cleaned,
        total: totalCleaned,
      },
      errors: {
        slot_reservations: slotResult.errors,
        registrations: registrationResult.errors,
        total: totalErrors,
      },
      duration_ms: duration,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Reservation cleanup cron job failed', error instanceof Error ? error : new Error(errorMessage));

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
