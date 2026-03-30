import { NextRequest, NextResponse } from 'next/server';
import { getDatabases, DATABASE_ID, REGISTRATIONS_COLLECTION_ID, getEvent, Query, parseEmbeddedTicket } from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';
import { RegistrationDocument } from '@/lib/api/appwrite-admin';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ ticketId: string }>;
}

/**
 * GET /api/ticket/[ticketId]
 * Public endpoint to get ticket details for display
 * Used by the /ticket/[ticketId] page (accessible from email links)
 * Returns limited info - no sensitive user data
 * 
 * Simplified schema: Resolves ticket from registration embedded ticket only
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { ticketId } = await params;
  const log = createLogger({ action: 'get-ticket-public', ticketId });

  try {
    log.info('Fetching ticket (public)', { ticketId });

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
    
    // Second try: Search all registrations for embedded ticket (less efficient)
    if (!registration) {
      const allRegistrations = await db.listDocuments(DATABASE_ID, REGISTRATIONS_COLLECTION_ID, [
        Query.limit(1000),
      ]);
      
      for (const doc of allRegistrations.documents) {
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
        { error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' },
        { status: 404 }
      );
    }
    
    // Parse embedded ticket with fallback for legacy/manual rows with only ticket_id
    const embeddedTicket = parseEmbeddedTicket(registration) ?? {
      ticket_id: registration.ticket_id || ticketId,
      ticket_code: registration.ticket_id || ticketId,
      qr_code: JSON.stringify({
        ticket_id: registration.ticket_id || ticketId,
        registration_id: registration.$id,
        event_id: registration.event_id,
        timestamp: registration.registration_date || registration.$createdAt,
      }),
      qr_data: JSON.stringify({
        ticket_id: registration.ticket_id || ticketId,
        registration_id: registration.$id,
        event_id: registration.event_id,
        timestamp: registration.registration_date || registration.$createdAt,
      }),
      issued_at: registration.registration_date || registration.$createdAt,
      is_scanned: registration.checked_in || false,
      scanned_at: registration.checked_in_at || registration.check_in_time,
    };

    // Get event details
    const event = await getEvent(registration.event_id);
    if (!event) {
      log.warn('Event not found for ticket', { eventId: registration.event_id });
      return NextResponse.json(
        { error: 'EVENT_NOT_FOUND', message: 'Event not found.' },
        { status: 404 }
      );
    }

    log.info('Ticket fetched successfully (public)');

    // Return public ticket data
    return NextResponse.json({
      ticket: {
        id: embeddedTicket.ticket_id,
        qr_data: embeddedTicket.qr_data || embeddedTicket.qr_code,
        is_scanned: embeddedTicket.is_scanned || false,
        scanned_at: embeddedTicket.scanned_at,
        created_at: embeddedTicket.issued_at,
      },
      event: {
        id: event.$id,
        title: event.title,
        description: event.description,
        date: event.date,
        venue: event.venue,
        banner_url: event.banner_url,
        society_id: event.society_id,
      },
      registration: {
        id: registration.$id,
        payment_status: registration.payment_status || 'not_required',
        registration_status: registration.registration_status || 'confirmed',
      },
    });
  } catch (error) {
    log.error('Failed to fetch ticket', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
