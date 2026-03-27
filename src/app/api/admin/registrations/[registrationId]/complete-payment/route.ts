/**
 * Manual payment completion endpoint for admin use
 * POST /api/admin/registrations/[registrationId]/complete-payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import { 
  getRegistration, 
  isUserAdmin, 
  getDatabases,
  DATABASE_ID,
  REGISTRATIONS_COLLECTION_ID
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';
import { ID } from 'node-appwrite';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ registrationId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { registrationId } = await params;
  const log = createLogger({ action: 'complete-payment', registrationId });

  try {
    // 1. Check authentication
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    // 2. Check admin permission
    const isAdmin = await isUserAdmin(user.$id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Admin permission required.' },
        { status: 403 }
      );
    }

    // 3. Get registration
    const registration = await getRegistration(registrationId);
    if (!registration) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Registration not found.' },
        { status: 404 }
      );
    }

    log.info('Manually completing payment', {
      registrationId,
      currentStatus: registration.payment_status,
      ticketId: registration.ticket_id,
    });

    const db = getDatabases();

    // 4. Create ticket_id if missing
    let ticketId = registration.ticket_id;
    if (!ticketId) {
      ticketId = ID.unique();
      log.info('Creating new ticket_id', { ticketId });
    }

    // 5. Update registration
    await db.updateDocument(
      DATABASE_ID,
      REGISTRATIONS_COLLECTION_ID,
      registrationId,
      {
        payment_status: 'paid',
        registration_status: 'confirmed',
        ticket_id: ticketId,
        payment_date: new Date().toISOString(),
      }
    );

    log.info('Payment completed successfully', { ticketId });

    return NextResponse.json({
      success: true,
      ticket_id: ticketId,
      message: 'Payment marked as completed and ticket created.',
    });

  } catch (error) {
    log.error('Failed to complete payment', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to complete payment.' },
      { status: 500 }
    );
  }
}
