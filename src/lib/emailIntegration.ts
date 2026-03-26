/**
 * Email Integration Helper for Registration Flow
 * Handles sending confirmation emails after registration and payment
 */

import { logger } from '@/lib/api/logger';
import { getDatabases, getUsers, DATABASE_ID, EMAIL_TEMPLATES_COLLECTION_ID } from '@/lib/api/appwrite-admin';
import { queueRegistrationEmail, queuePaymentEmail } from '@/lib/emailQueue';
import { getDefaultTemplate, renderTemplate } from '@/lib/emailService';
import { Query } from 'node-appwrite';
import QRCode from 'qrcode';

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

/**
 * Generate QR code data URL for ticket
 */
async function generateQRCode(ticketId: string): Promise<string> {
  try {
    const qrData = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ieeesahrdaya.com'}/ticket/${ticketId}`;
    const dataUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (error) {
    logger.error('Failed to generate QR code', error instanceof Error ? error : new Error(String(error)));
    return '';
  }
}

/**
 * Get custom email template or fall back to default
 */
async function getEmailTemplate(
  eventId: string,
  templateType: 'registration_confirmation' | 'payment_confirmation'
): Promise<{ subject: string; body: string }> {
  try {
    const db = getDatabases();
    const response = await db.listDocuments(
      DATABASE_ID,
      EMAIL_TEMPLATES_COLLECTION_ID,
      [
        Query.equal('event_id', eventId),
        Query.equal('template_type', templateType),
        Query.limit(1),
      ]
    );

    if (response.documents.length > 0) {
      const template = response.documents[0];
      return {
        subject: template.subject as string,
        body: template.body as string,
      };
    }
  } catch (error) {
    logger.warn('Failed to load custom template, using default', {
      eventId,
      templateType,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return getDefaultTemplate(templateType);
}

/**
 * Send registration confirmation email
 * Called after free event registration or payment confirmation
 */
export async function sendRegistrationConfirmation(
  registration: RegistrationDetails,
  event: EventDetails
): Promise<void> {
  try {
    const users = getUsers();
    const user = await users.get(registration.user_id);

    if (!user.email) {
      logger.warn('User has no email address', { userId: registration.user_id });
      return;
    }

    // Get template
    const template = await getEmailTemplate(event.$id, 'registration_confirmation');

    // Generate QR code if ticket exists
    const qrCodeUrl = registration.ticket_id
      ? await generateQRCode(registration.ticket_id)
      : '';

    // Prepare template variables
    const eventDate = new Date(event.start_date || event.date || '');
    const variables = {
      student_name: user.name || 'Student',
      event_name: event.title,
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
        ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/ticket/${registration.ticket_id}`
        : '',
      qr_code_data_url: qrCodeUrl,
    };

    // Queue email
    queueRegistrationEmail(
      user.email,
      variables,
      template.body,
      event.$id,
      registration.$id
    );

    logger.info('Registration confirmation email queued', {
      userId: user.$id,
      email: user.email,
      registrationId: registration.$id,
      eventId: event.$id,
    });
  } catch (error) {
    logger.error('Failed to send registration confirmation',
      error instanceof Error ? error : new Error(String(error)),
      {
        registrationId: registration.$id,
        eventId: event.$id,
      }
    );
  }
}

/**
 * Send payment confirmation email
 * Called after payment is verified
 */
export async function sendPaymentConfirmation(
  registration: RegistrationDetails,
  event: EventDetails,
  amount: number
): Promise<void> {
  try {
    const users = getUsers();
    const user = await users.get(registration.user_id);

    if (!user.email) {
      logger.warn('User has no email address', { userId: registration.user_id });
      return;
    }

    // Get template
    const template = await getEmailTemplate(event.$id, 'payment_confirmation');

    // Generate QR code
    const qrCodeUrl = registration.ticket_id
      ? await generateQRCode(registration.ticket_id)
      : '';

    // Prepare template variables
    const eventDate = new Date(event.start_date || event.date || '');
    const variables = {
      student_name: user.name || 'Student',
      event_name: event.title,
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
        ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/ticket/${registration.ticket_id}`
        : '',
      qr_code_data_url: qrCodeUrl,
      amount: amount,
    };

    // Queue email
    queuePaymentEmail(
      user.email,
      variables,
      template.body,
      event.$id,
      registration.$id
    );

    logger.info('Payment confirmation email queued', {
      userId: user.$id,
      email: user.email,
      registrationId: registration.$id,
      eventId: event.$id,
      amount: String(amount),
    });
  } catch (error) {
    logger.error('Failed to send payment confirmation',
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
  try {
    await sendRegistrationConfirmation(registration, event);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
