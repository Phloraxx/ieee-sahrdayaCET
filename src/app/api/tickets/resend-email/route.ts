import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import { 
  getDatabases, 
  DATABASE_ID, 
  REGISTRATIONS_COLLECTION_ID,
  Query,
  getEvent,
  isUserAdmin,
  getUsers,
  parseEmbeddedTicket,
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';
import { RegistrationDocument } from '@/lib/api/appwrite-admin';
import { generateQRCodeDataUrl } from '@/lib/ticketGenerator';
import { sendEmail, renderTemplate, getDefaultTemplate } from '@/lib/emailService';
import { z } from 'zod';

export const runtime = 'nodejs';

const resendEmailSchema = z.object({
  ticket_id: z.string().min(1, 'Ticket ID is required'),
});

/**
 * POST /api/tickets/resend-email
 * Resend ticket email with QR code
 * Auth: Must be user who registered OR admin
 * 
 * Simplified schema: Resolves ticket from registration embedded ticket only
 */
export async function POST(req: NextRequest) {
  const log = createLogger({ action: 'resend-ticket-email' });

  try {
    // 1. Check authentication
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Resend email attempt without authentication');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'You must be signed in to resend ticket emails.' },
        { status: 401 }
      );
    }

    const userId = user.$id;
    log.info('Resend ticket email request', { userId });

    // 2. Validate request body
    const body = await req.json();
    const parsed = resendEmailSchema.safeParse(body);
    
    if (!parsed.success) {
      log.warn('Invalid request data', { errors: parsed.error.issues });
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid data provided.', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { ticket_id } = parsed.data;
    const db = getDatabases();

    // 3. Find registration by embedded ticket_id
    let registration: RegistrationDocument | null = null;
    
    // First try: Look for registration with this ticket_id
    try {
      const result = await db.listDocuments(DATABASE_ID, REGISTRATIONS_COLLECTION_ID, [
        Query.equal('ticket_id', ticket_id),
        Query.limit(1),
      ]);
      
      if (result.documents.length > 0) {
        registration = result.documents[0] as unknown as RegistrationDocument;
      }
    } catch {
      // ticket_id index might not exist, continue to fallback
    }
    
    // Second try: Search registrations for embedded ticket
    if (!registration) {
      const allRegistrations = await db.listDocuments(DATABASE_ID, REGISTRATIONS_COLLECTION_ID, [
        Query.limit(1000),
      ]);
      
      for (const doc of allRegistrations.documents) {
        const reg = doc as unknown as RegistrationDocument;
        const embedded = parseEmbeddedTicket(reg);
        if (embedded && (embedded.ticket_id === ticket_id || embedded.ticket_code === ticket_id)) {
          registration = reg;
          break;
        }
      }
    }
    
    if (!registration) {
      log.warn('Ticket not found', { ticketId: ticket_id });
      return NextResponse.json(
        { error: 'TICKET_NOT_FOUND', message: 'The requested ticket does not exist.' },
        { status: 404 }
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

    // 5. Check authorization (user owns registration OR is admin)
    const isOwner = registration.user_id === userId;
    const isAdmin = await isUserAdmin(userId);
    
    if (!isOwner && !isAdmin) {
      log.warn('Unauthorized resend attempt', { ownerId: registration.user_id });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You do not have permission to resend this ticket.' },
        { status: 403 }
      );
    }

    // 6. Get event details
    const event = await getEvent(registration.event_id);
    if (!event) {
      log.warn('Event not found', { eventId: registration.event_id });
      return NextResponse.json(
        { error: 'EVENT_NOT_FOUND', message: 'The event for this ticket does not exist.' },
        { status: 404 }
      );
    }

    // 7. Get user details for email
    const users = getUsers();
    const targetUser = await users.get(registration.user_id);

    // 8. Generate QR code
    const qrCodeDataUrl = await generateQRCodeDataUrl(embeddedTicket.ticket_id);

    // 9. Format event date and time
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 10. Prepare email template
    const template = getDefaultTemplate('registration_confirmation');
    const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tickets/${embeddedTicket.ticket_id}`;

    const emailHtml = renderTemplate(template.body, {
      student_name: targetUser.name,
      event_name: event.title,
      event_date: formattedDate,
      event_time: formattedTime,
      event_venue: event.venue || 'TBA',
      ticket_id: embeddedTicket.ticket_id,
      ticket_url: ticketUrl,
      qr_code_data_url: qrCodeDataUrl,
    });

    const emailSubject = renderTemplate(template.subject, {
      event_name: event.title,
    });

    // 11. Prepare attachments (QR Code CID)
    const qrBase64 = qrCodeDataUrl.split(',')[1];
    const qrBuffer = Buffer.from(qrBase64, 'base64');

    // 12. Send email
    const result = await sendEmail({
      to: targetUser.email,
      subject: emailSubject,
      html: emailHtml,
      attachments: [{
        filename: 'qrcode.png',
        content: qrBuffer,
        cid: 'qrcode'
      }]
    });

    if (!result.success) {
      log.error('Failed to send ticket email', new Error(result.error || 'Unknown error'));
      return NextResponse.json(
        { error: 'EMAIL_SEND_FAILED', message: 'Failed to send ticket email. Please try again.' },
        { status: 500 }
      );
    }

    log.info('Ticket email resent successfully', { ticketId: embeddedTicket.ticket_id, email: targetUser.email });

    return NextResponse.json({
      success: true,
      message: 'Ticket email sent successfully.',
      ticket_id: embeddedTicket.ticket_id,
      sent_to: targetUser.email,
    });
  } catch (error) {
    log.error('Failed to resend ticket email', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

