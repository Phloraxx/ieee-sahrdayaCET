/**
 * POST /api/emails/send - Internal email sending endpoint
 * Sends email via SMTP and logs the result
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, renderTemplate } from '@/lib/emailService';
import { logger } from '@/lib/api/logger';
import { getDatabases, DATABASE_ID, ID } from '@/lib/api/appwrite-admin';

// Email logs collection
const EMAIL_LOGS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EMAIL_LOGS_COLLECTION_ID || 'email_logs';

interface SendEmailRequestBody {
  to: string;
  subject: string;
  html: string;
  text?: string;
  event_id?: string;
  registration_id?: string;
  template_variables?: Record<string, string | number | undefined>;
}

export async function POST(request: NextRequest) {
  // Verify internal API key for security
  const apiKey = request.headers.get('x-internal-api-key');
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (expectedKey && apiKey !== expectedKey) {
    logger.warn('Unauthorized email send attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body: SendEmailRequestBody = await request.json();
    const { to, subject, html, text, event_id, registration_id, template_variables } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Render template if variables provided
    const renderedHtml = template_variables
      ? renderTemplate(html, template_variables)
      : html;
    const renderedSubject = template_variables
      ? renderTemplate(subject, template_variables)
      : subject;

    // Send email
    const result = await sendEmail({
      to,
      subject: renderedSubject,
      html: renderedHtml,
      text,
    });

    // Log to Appwrite
    try {
      const db = getDatabases();
      await db.createDocument(DATABASE_ID, EMAIL_LOGS_COLLECTION_ID, ID.unique(), {
        to,
        subject: renderedSubject,
        event_id: event_id || null,
        registration_id: registration_id || null,
        status: result.success ? 'sent' : 'failed',
        message_id: result.messageId || null,
        error: result.error || null,
        sent_at: new Date().toISOString(),
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      logger.warn('Failed to log email to database', {
        error: logError instanceof Error ? logError.message : 'Unknown error',
      });
    }

    if (result.success) {
      logger.info('Email sent via API', {
        to,
        subject: renderedSubject,
        messageId: result.messageId,
        eventId: event_id,
      });

      return NextResponse.json({
        success: true,
        message_id: result.messageId,
      });
    } else {
      logger.error('Failed to send email via API', new Error(result.error || 'Unknown error'), {
        to,
        subject: renderedSubject,
      });

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Email send API error', error instanceof Error ? error : new Error(errorMessage));

    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
