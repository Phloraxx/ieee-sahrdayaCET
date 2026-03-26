/**
 * Cron job endpoint for sending event reminder emails
 * Run every hour to check for events and send reminders
 * 
 * Setup with Vercel Cron:
 * 1. Add to vercel.json: { "crons": [{ "path": "/api/cron/send-reminders", "schedule": "0 * * * *" }] }
 * 2. Add CRON_SECRET to environment variables
 * 3. Vercel will call this endpoint every hour
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabases, getUsers, DATABASE_ID, EVENTS_COLLECTION_ID, EVENT_REGISTRATIONS_COLLECTION_ID, EMAIL_TEMPLATES_COLLECTION_ID } from '@/lib/api/appwrite-admin';
import { logger } from '@/lib/api/logger';
import { Query } from 'node-appwrite';
import { queueReminderEmail } from '@/lib/emailQueue';
import { getDefaultTemplate, renderTemplate } from '@/lib/emailService';
import QRCode from 'qrcode';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution

interface EventDoc {
  $id: string;
  title: string;
  start_date: string;
  venue: string;
  reminder_24h_sent?: boolean;
  reminder_1h_sent?: boolean;
}

interface RegistrationDoc {
  $id: string;
  user_id: string;
  event_id: string;
  ticket_id: string;
  registration_status: string;
  payment_status: string;
}

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
 * Get email template for event (or use default)
 */
async function getEmailTemplate(
  db: ReturnType<typeof getDatabases>,
  eventId: string,
  templateType: 'event_reminder_24h' | 'event_reminder_1h'
): Promise<{ subject: string; body: string }> {
  try {
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
 * Send 24-hour reminders for events starting tomorrow
 */
async function send24HourReminders(db: ReturnType<typeof getDatabases>) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowEnd = new Date(tomorrow.getTime() + 60 * 60 * 1000); // +1 hour window

  logger.info('Checking for 24h reminders', {
    startTime: tomorrow.toISOString(),
    endTime: tomorrowEnd.toISOString(),
  });

  // Find events starting in 24 hours (±1 hour window)
  const events = await db.listDocuments(
    DATABASE_ID,
    EVENTS_COLLECTION_ID,
    [
      Query.greaterThanEqual('start_date', tomorrow.toISOString()),
      Query.lessThan('start_date', tomorrowEnd.toISOString()),
      Query.equal('status', 'published'),
    ]
  );

  logger.info('Found events for 24h reminders', {
    count: String(events.documents.length),
  });

  let sentCount = 0;

  for (const event of events.documents as unknown as EventDoc[]) {
    // Skip if reminder already sent
    if (event.reminder_24h_sent) {
      logger.info('24h reminder already sent', { eventId: event.$id });
      continue;
    }

    try {
      // Get confirmed registrations
      const registrations = await db.listDocuments(
        DATABASE_ID,
        EVENT_REGISTRATIONS_COLLECTION_ID,
        [
          Query.equal('event_id', event.$id),
          Query.equal('registration_status', 'confirmed'),
        ]
      );

      const template = await getEmailTemplate(db, event.$id, 'event_reminder_24h');
      const users = getUsers();

      // Send reminder to each registered user
      for (const registration of registrations.documents as unknown as RegistrationDoc[]) {
        try {
          // Get user details
          const user = await users.get(registration.user_id);
          if (!user.email) continue;

          // Generate QR code
          const qrCodeUrl = await generateQRCode(registration.ticket_id);

          // Prepare template variables
          const eventDate = new Date(event.start_date);
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
            event_venue: event.venue,
            ticket_id: registration.ticket_id,
            ticket_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/ticket/${registration.ticket_id}`,
            qr_code_data_url: qrCodeUrl,
          };

          // Queue email
          queueReminderEmail(
            user.email,
            variables,
            template.body,
            'event_reminder_24h',
            event.$id,
            registration.$id
          );

          sentCount++;
        } catch (userError) {
          logger.error('Failed to send 24h reminder to user', 
            userError instanceof Error ? userError : new Error(String(userError)),
            { registrationId: registration.$id }
          );
        }
      }

      // Mark reminder as sent
      await db.updateDocument(
        DATABASE_ID,
        EVENTS_COLLECTION_ID,
        event.$id,
        { reminder_24h_sent: true }
      );

      logger.info('24h reminders sent for event', {
        eventId: event.$id,
        eventTitle: event.title,
        recipientCount: String(sentCount),
      });
    } catch (eventError) {
      logger.error('Failed to process 24h reminders for event',
        eventError instanceof Error ? eventError : new Error(String(eventError)),
        { eventId: event.$id }
      );
    }
  }

  return sentCount;
}

/**
 * Send 1-hour reminders for events starting soon
 */
async function send1HourReminders(db: ReturnType<typeof getDatabases>) {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const oneHourEnd = new Date(oneHourLater.getTime() + 10 * 60 * 1000); // +10 minute window

  logger.info('Checking for 1h reminders', {
    startTime: oneHourLater.toISOString(),
    endTime: oneHourEnd.toISOString(),
  });

  // Find events starting in 1 hour (±10 minute window)
  const events = await db.listDocuments(
    DATABASE_ID,
    EVENTS_COLLECTION_ID,
    [
      Query.greaterThanEqual('start_date', oneHourLater.toISOString()),
      Query.lessThan('start_date', oneHourEnd.toISOString()),
      Query.equal('status', 'published'),
    ]
  );

  logger.info('Found events for 1h reminders', {
    count: String(events.documents.length),
  });

  let sentCount = 0;

  for (const event of events.documents as unknown as EventDoc[]) {
    // Skip if reminder already sent
    if (event.reminder_1h_sent) {
      logger.info('1h reminder already sent', { eventId: event.$id });
      continue;
    }

    try {
      // Get confirmed registrations
      const registrations = await db.listDocuments(
        DATABASE_ID,
        EVENT_REGISTRATIONS_COLLECTION_ID,
        [
          Query.equal('event_id', event.$id),
          Query.equal('registration_status', 'confirmed'),
        ]
      );

      const template = await getEmailTemplate(db, event.$id, 'event_reminder_1h');
      const users = getUsers();

      // Send reminder to each registered user
      for (const registration of registrations.documents as unknown as RegistrationDoc[]) {
        try {
          // Get user details
          const user = await users.get(registration.user_id);
          if (!user.email) continue;

          // Prepare template variables
          const eventDate = new Date(event.start_date);
          const variables = {
            student_name: user.name || 'Student',
            event_name: event.title,
            event_venue: event.venue,
            ticket_id: registration.ticket_id,
            ticket_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/ticket/${registration.ticket_id}`,
          };

          // Queue email
          queueReminderEmail(
            user.email,
            variables,
            template.body,
            'event_reminder_1h',
            event.$id,
            registration.$id
          );

          sentCount++;
        } catch (userError) {
          logger.error('Failed to send 1h reminder to user',
            userError instanceof Error ? userError : new Error(String(userError)),
            { registrationId: registration.$id }
          );
        }
      }

      // Mark reminder as sent
      await db.updateDocument(
        DATABASE_ID,
        EVENTS_COLLECTION_ID,
        event.$id,
        { reminder_1h_sent: true }
      );

      logger.info('1h reminders sent for event', {
        eventId: event.$id,
        eventTitle: event.title,
        recipientCount: String(sentCount),
      });
    } catch (eventError) {
      logger.error('Failed to process 1h reminders for event',
        eventError instanceof Error ? eventError : new Error(String(eventError)),
        { eventId: event.$id }
      );
    }
  }

  return sentCount;
}

/**
 * Main cron handler
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  logger.info('Starting reminder cron job');

  try {
    const db = getDatabases();

    // Send both 24h and 1h reminders
    const [reminders24h, reminders1h] = await Promise.all([
      send24HourReminders(db),
      send1HourReminders(db),
    ]);

    const duration = Date.now() - startTime;
    logger.info('Reminder cron job completed', {
      duration: String(duration),
      reminders24h: String(reminders24h),
      reminders1h: String(reminders1h),
      total: String(reminders24h + reminders1h),
    });

    return NextResponse.json({
      success: true,
      reminders_sent: {
        '24h': reminders24h,
        '1h': reminders1h,
        total: reminders24h + reminders1h,
      },
      duration_ms: duration,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Reminder cron job failed', error instanceof Error ? error : new Error(errorMessage));

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
