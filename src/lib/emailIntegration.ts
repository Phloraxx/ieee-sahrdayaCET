/**
 * Email Integration Helper for Registration Flow
 * Handles sending confirmation emails after registration and payment
 * 
 * PRODUCTION MODE (Vercel): Uses direct synchronous email sending
 * DEVELOPMENT MODE: Can use email queue for testing
 */

import { logger } from '@/lib/api/logger';
import { getUsers } from '@/lib/api/appwrite-admin';
import { sendRegistrationEmailDirect, sendReceiptEmailDirect } from '@/lib/emailSender';
import { generateQRCodeDataUrl } from '@/lib/ticketGenerator';

interface EventDetails {
  $id: string;
  title: string;
  start_date?: string;
  date?: string;
  venue?: string;
  price?: number;
}

interface RegistrationDetails {
  $id: string;
  user_id: string;
  event_id: string;
  ticket_id?: string;
}

function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'https://ieeesahrdaya.com';
  return raw.replace(/\/+$/, '');
}

/**
 * Send registration confirmation email
 * Called after free event registration or payment confirmation
 */
export async function sendRegistrationConfirmation(
  registration: RegistrationDetails,
  event: EventDetails
): Promise<{ success: boolean; error?: string }> {
  try {
    const users = getUsers();
    const user = await users.get(registration.user_id);

    if (!user.email) {
      logger.warn('User has no email address', { userId: registration.user_id });
      return { success: false, error: 'User has no email address' };
    }

    // Generate QR code if ticket exists
    const qrCodeUrl = registration.ticket_id
      ? await generateQRCodeDataUrl(`${getAppBaseUrl()}/ticket/${registration.ticket_id}`)
      : '';

    // Prepare template variables
    const eventDate = new Date(event.start_date || event.date || '');
    const eventYear = eventDate.getFullYear() || new Date().getFullYear();
    const variables = {
      student_name: user.name || 'Student',
      event_name: event.title,
      event_year: String(eventYear),
      event_date: eventDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      event_time: eventDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      event_venue: event.venue || 'TBA',
      ticket_id: registration.ticket_id || 'Pending',
      ticket_url: registration.ticket_id
        ? `${getAppBaseUrl()}/ticket/${registration.ticket_id}`
        : '',
      qr_code_data_url: qrCodeUrl,
    };

    if (registration.ticket_id && !qrCodeUrl) {
      logger.error('Skipping registration email: QR generation failed', new Error('QR_GENERATION_FAILED'), {
        registrationId: registration.$id,
        ticketId: registration.ticket_id,
      });
      return { success: false, error: 'Failed to generate QR code for ticket email' };
    }

    // Send email directly (synchronous for Vercel compatibility)
    const result = await sendRegistrationEmailDirect(
      user.email,
      variables,
    );

    if (result.success) {
      logger.info('Registration confirmation email sent', {
        userId: user.$id,
        email: user.email,
        registrationId: registration.$id,
        eventId: event.$id,
      });
      return { success: true };
    } else {
      logger.error('Failed to send registration confirmation email', new Error(result.error || 'Unknown error'), {
        userId: user.$id,
        email: user.email,
        registrationId: registration.$id,
        eventId: event.$id,
      });
      return { success: false, error: result.error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to send registration confirmation',
      error instanceof Error ? error : new Error(errorMessage),
      {
        registrationId: registration.$id,
        eventId: event.$id,
      }
    );
    return { success: false, error: errorMessage };
  }
}

/**
 * Send payment receipt email with PDF attachment
 * Called after payment is verified - SEPARATE from registration confirmation
 */
export async function sendPaymentReceipt(
  registration: RegistrationDetails,
  event: EventDetails,
  paymentDetails: {
    amount: number;
    paidAt?: string;
    transactionId?: string;
    rrn?: string;
    utr?: string;
    senderName?: string;
    upiId?: string;
    paymentReference?: string;
  }
): Promise<void> {
  try {
    const users = getUsers();
    const user = await users.get(registration.user_id);

    if (!user.email) {
      logger.warn('User has no email address', { userId: registration.user_id });
      return;
    }

    // Prepare template variables
    const eventDate = new Date(event.start_date || event.date || '');
    const eventYear = eventDate.getFullYear() || new Date().getFullYear();
    const paymentDate = paymentDetails.paidAt 
      ? new Date(paymentDetails.paidAt).toLocaleString('en-IN')
      : new Date().toLocaleString('en-IN');
    
    const variables = {
      student_name: user.name || 'Student',
      event_name: event.title,
      event_year: String(eventYear),
      event_date: eventDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      event_time: eventDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      event_venue: event.venue || 'TBA',
      ticket_id: registration.ticket_id || 'Pending',
      amount: paymentDetails.amount,
      payment_date: paymentDate,
      payment_reference: paymentDetails.paymentReference || '',
      utr_number: paymentDetails.rrn || paymentDetails.utr || '',
    };

    // Generate PDF receipt
    const { generatePaymentReceipt, getReceiptFilename } = await import('@/lib/pdfReceiptGenerator');
    const pdfBase64 = await generatePaymentReceipt({
      ticketId: registration.ticket_id || 'N/A',
      registrationId: registration.$id,
      user: {
        name: user.name || 'Student',
        email: user.email,
      },
      event: {
        title: event.title,
        venue: event.venue,
        start_date: event.start_date,
        date: event.date,
      },
      payment: {
        amount: paymentDetails.amount,
        paidAt: paymentDetails.paidAt,
        transactionId: paymentDetails.transactionId,
        rrn: paymentDetails.rrn,
        utr: paymentDetails.utr,
        senderName: paymentDetails.senderName,
        upiId: paymentDetails.upiId,
        paymentReference: paymentDetails.paymentReference,
      },
    });

    const receiptFilename = getReceiptFilename(
      registration.ticket_id || 'receipt',
      event.title
    );

    // Send email directly with PDF attachment (synchronous for Vercel)
    const result = await sendReceiptEmailDirect(
      user.email,
      variables,
      event.$id,
      registration.$id,
      pdfBase64,
      receiptFilename
    );

    if (result.success) {
      logger.info('Payment receipt email sent with PDF attachment', {
        userId: user.$id,
        email: user.email,
        registrationId: registration.$id,
        eventId: event.$id,
        amount: String(paymentDetails.amount),
        receiptFilename,
      });
    } else {
      logger.error('Failed to send payment receipt email', new Error(result.error || 'Unknown error'), {
        userId: user.$id,
        email: user.email,
        registrationId: registration.$id,
        eventId: event.$id,
      });
    }
  } catch (error) {
    logger.error('Failed to send payment receipt',
      error instanceof Error ? error : new Error(String(error)),
      {
        registrationId: registration.$id,
        eventId: event.$id,
      }
    );
  }
}

/**
 * Resend ticket email
 * For manual ticket resends
 */
export async function resendTicketEmail(
  registration: RegistrationDetails,
  event: EventDetails
): Promise<{ success: boolean; error?: string }> {
  return sendRegistrationConfirmation(registration, event);
}
