/**
 * Email Template Management API
 * GET /api/emails/templates - List templates for an event
 * POST /api/emails/templates - Create/update a template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabases, DATABASE_ID, ID, EMAIL_TEMPLATES_COLLECTION_ID } from '@/lib/api/appwrite-admin';
import { logger } from '@/lib/api/logger';
import { getDefaultTemplate, EmailTemplateType } from '@/lib/emailService';
import { Query } from 'node-appwrite';

export const runtime = 'nodejs';

/**
 * GET - List email templates for an event
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.url ? new URL(request.url) : { searchParams: new URLSearchParams() };
  const eventId = searchParams.get('event_id');
  const templateType = searchParams.get('template_type');

  try {
    const db = getDatabases();
    const queries = [];

    if (eventId) {
      queries.push(Query.equal('event_id', eventId));
    }
    if (templateType) {
      queries.push(Query.equal('template_type', templateType));
    }

    const response = await db.listDocuments(
      DATABASE_ID,
      EMAIL_TEMPLATES_COLLECTION_ID,
      queries
    );

    logger.info('Email templates retrieved', {
      count: String(response.documents.length),
      eventId: eventId || 'all',
      templateType: templateType || 'all',
    });

    return NextResponse.json({
      templates: response.documents,
      total: response.total,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to retrieve email templates', error instanceof Error ? error : new Error(errorMessage));

    return NextResponse.json(
      { error: 'Failed to retrieve templates', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST - Create or update an email template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      template_id,
      event_id,
      template_type,
      subject,
      body: emailBody,
      variables,
    } = body;

    // Validate required fields
    if (!template_type) {
      return NextResponse.json(
        { error: 'template_type is required' },
        { status: 400 }
      );
    }

    // Validate template type
    const validTypes: EmailTemplateType[] = [
      'registration_confirmation',
      'payment_confirmation',
      'event_reminder_24h',
      'event_reminder_1h',
      'custom',
    ];

    if (!validTypes.includes(template_type as EmailTemplateType)) {
      return NextResponse.json(
        { error: `Invalid template_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Get default template if subject/body not provided
    const defaultTemplate = getDefaultTemplate(template_type as EmailTemplateType);
    const finalSubject = subject || defaultTemplate.subject;
    const finalBody = emailBody || defaultTemplate.body;

    const db = getDatabases();
    const templateData = {
      event_id: event_id || null,
      template_type,
      subject: finalSubject,
      body: finalBody,
      variables: variables || {},
      updated_at: new Date().toISOString(),
    };

    let result;

    if (template_id) {
      // Update existing template
      result = await db.updateDocument(
        DATABASE_ID,
        EMAIL_TEMPLATES_COLLECTION_ID,
        template_id,
        templateData
      );

      logger.info('Email template updated', {
        templateId: template_id,
        eventId: event_id,
        templateType: template_type,
      });
    } else {
      // Create new template
      result = await db.createDocument(
        DATABASE_ID,
        EMAIL_TEMPLATES_COLLECTION_ID,
        ID.unique(),
        {
          ...templateData,
          created_at: new Date().toISOString(),
        }
      );

      logger.info('Email template created', {
        templateId: result.$id,
        eventId: event_id,
        templateType: template_type,
      });
    }

    return NextResponse.json({
      success: true,
      template: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to save email template', error instanceof Error ? error : new Error(errorMessage));

    return NextResponse.json(
      { error: 'Failed to save template', details: errorMessage },
      { status: 500 }
    );
  }
}
