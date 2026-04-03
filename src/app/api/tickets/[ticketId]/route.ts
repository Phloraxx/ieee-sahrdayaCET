import { NextRequest, NextResponse } from 'next/server';
import { getDatabases, DATABASE_ID, REGISTRATIONS_COLLECTION_ID, Query, getEvent, parseEmbeddedTicket } from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';
import { RegistrationDocument } from '@/lib/api/appwrite-admin';
import { getUsers } from '@/lib/api/appwrite-admin';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ ticketId: string }>;
}

/**
 * GET /api/tickets/[ticketId]
 * Get ticket details - requires authentication and ownership
 * Used for viewing tickets and QR code scanning
 * 
 * Simplified schema: Resolves ticket from registration embedded ticket only
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { ticketId } = await params;
  const log = createLogger({ action: 'get-ticket', ticketId });

  try {
    // Check authentication
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Unauthorized ticket access attempt');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    log.info('Fetching ticket', { ticketId, userId: user.$id });

    const db = getDatabases();
    
    // Find registration by embedded ticket_id
    let registration: RegistrationDocument | null = null;
    
    // First try: Look for registration with this ticket_id
    try {
      const result = await db.listDocuments(DATABASE_ID, REGISTRATIONS_COLLECTION_ID, [
        Query.equal('ticket_id', ticketId),
        Query.limit(1),
      ]);
      
      if (result.documents.length > 0) {
        registration = result.documents[0] as unknown as RegistrationDocument;
      }
    } catch {
      // ticket_id index might not exist, continue to fallback
    }
    
    // Second try: Search registrations for embedded ticket (less efficient)
    if (!registration) {
      const userRegistrations = await db.listDocuments(DATABASE_ID, REGISTRATIONS_COLLECTION_ID, [
        Query.equal('user_id', user.$id),
        Query.limit(100),
      ]);
      
      for (const doc of userRegistrations.documents) {
        const reg = doc as unknown as RegistrationDocument;
        const embedded = parseEmbeddedTicket(reg);
        if (embedded && (embedded.ticket_id === ticketId || embedded.ticket_code === ticketId)) {
          registration = reg;
          break;
        }
      }
    }

    if (!registration) {
      log.warn('Ticket not found');
      return NextResponse.json(
        { error: 'TICKET_NOT_FOUND', message: 'The requested ticket does not exist.' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (registration.user_id !== user.$id) {
      log.warn('Ownership check failed', { userId: user.$id, registrationUserId: registration.user_id });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You do not have permission to access this ticket.' },
        { status: 403 }
      );
    }
    
    // Parse embedded ticket
    const embeddedTicket = parseEmbeddedTicket(registration);
    if (!embeddedTicket) {
      log.warn('No embedded ticket in registration');
      return NextResponse.json(
        { error: 'TICKET_NOT_FOUND', message: 'The requested ticket does not exist.' },
        { status: 404 }
      );
    }

    // Get event details
    const event = await getEvent(registration.event_id);
    if (!event) {
      log.warn('Event not found for ticket', { eventId: registration.event_id });
      return NextResponse.json(
        { error: 'EVENT_NOT_FOUND', message: 'The event for this ticket does not exist.' },
        { status: 404 }
      );
    }

    // Get user details
    let userName = 'Unknown';
    try {
      const users = getUsers();
      const ticketUser = await users.get(registration.user_id);
      userName = ticketUser.name;
    } catch (error) {
      log.warn('Could not fetch user details', { userId: registration.user_id });
    }

    // Parse QR data
    let qrData: { ticket_id: string; registration_id: string; event_id: string; timestamp: string } | null = null;
    try {
      qrData = JSON.parse(embeddedTicket.qr_data || embeddedTicket.qr_code);
    } catch {
      // Keep null if parsing fails
    }

    log.info('Ticket fetched successfully');

    return NextResponse.json({
      success: true,
      ticket: {
        ticket_id: embeddedTicket.ticket_id,
        event_name: event.title,
        student_name: userName,
        event_date: event.date,
        event_venue: event.venue,
        qr_code: qrData?.ticket_id || embeddedTicket.ticket_id,
        checked_in: embeddedTicket.is_scanned || false,
        checked_in_at: embeddedTicket.scanned_at,
        created_at: embeddedTicket.issued_at,
      },
    });
  } catch (error) {
    const appwriteError = error as { code?: number };
    if (appwriteError.code === 404) {
      log.warn('Ticket not found');
      return NextResponse.json(
        { error: 'TICKET_NOT_FOUND', message: 'The requested ticket does not exist.' },
        { status: 404 }
      );
    }

    log.error('Failed to fetch ticket', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
