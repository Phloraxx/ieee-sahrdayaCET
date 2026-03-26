import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import { 
  getDatabases, 
  DATABASE_ID, 
  REGISTRATIONS_COLLECTION_ID,
  getEvent,
  getUsers,
  parseEmbeddedTicket,
  isUserAdmin
} from '@/lib/api/appwrite-admin';
import { createLogger } from '@/lib/api/logger';
import { RegistrationDocument } from '@/lib/api/appwrite-admin';
import { generateQRCodeDataUrl } from '@/lib/ticketGenerator';
import { sendEmail, renderTemplate, getDefaultTemplate } from '@/lib/emailService';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ registrationId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { registrationId } = await params;
  const log = createLogger({ action: 'admin-resend-ticket-email', registrationId });

  try {
    // 1. Check authentication
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      log.warn('Admin resend email attempt without authentication');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const isAdmin = await isUserAdmin(user.$id);
    if (!isAdmin) {
      log.warn('Non-admin user attempted to use admin resend email route', { userId: user.$id });
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You must be an admin to perform this action.' },
        { status: 403 }
      );
    }

    const db = getDatabases();

    // 2. Find registration document
    let registration: RegistrationDocument | null = null;
    try {
      const result = await db.getDocument(DATABASE_ID, REGISTRATIONS_COLLECTION_ID, registrationId);
      registration = result as unknown as RegistrationDocument;
    } catch {
      log.warn('Registration not found', { registrationId });
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Registration does not exist.' },
        { status: 404 }
      );
    }

    if (!registration) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const embeddedTicket = parseEmbeddedTicket(registration);
    
    // We can still send an email even if there's no ticket_id generated yet, but best if there is one
    const ticketIdStr = embeddedTicket?.ticket_id || registration.ticket_id || 'PENDING';

    // 4. Get event details
    const event = await getEvent(registration.event_id);
    if (!event) {
      return NextResponse.json(
        { error: 'EVENT_NOT_FOUND', message: 'The event for this registration does not exist.' },
        { status: 404 }
      );
    }

    // 5. Get user details for email
    const users = getUsers();
    const targetUser = await users.get(registration.user_id);

    // 6. Generate QR code
    const qrCodeDataUrl = await generateQRCodeDataUrl(ticketIdStr);

    // 7. Format event date and time
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

    // 8. Prepare email template
    const template = getDefaultTemplate('registration_confirmation');
    const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ieeesahrdaya.org'}/tickets/${ticketIdStr}`;

    const emailHtml = renderTemplate(template.body, {
      student_name: targetUser.name,
      event_name: event.title,
      event_date: formattedDate,
      event_time: formattedTime,
      event_venue: event.venue || 'To Be Announced',
      ticket_id: ticketIdStr,
      ticket_url: ticketUrl,
      qr_code_data_url: qrCodeDataUrl,
    });

    const emailSubject = renderTemplate(template.subject, {
      event_name: event.title,
    });

    // 9. Prepare attachments (QR Code CID)
    const qrBase64 = qrCodeDataUrl.split(',')[1];
    const qrBuffer = Buffer.from(qrBase64, 'base64');

    // 10. Send email
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
      log.error('Failed to send admin ticket email', new Error(result.error || 'Unknown error'));
      return NextResponse.json(
        { error: 'EMAIL_SEND_FAILED', message: 'Failed to send ticket email.' },
        { status: 500 }
      );
    }

    log.info('Admin ticket email sent successfully', { ticketId: ticketIdStr, email: targetUser.email });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully.',
      sent_to: targetUser.email,
    });
  } catch (error) {
    log.error('Failed to process admin resend email', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
