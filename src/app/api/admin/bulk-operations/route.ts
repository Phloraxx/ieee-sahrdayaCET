import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import {
  getDatabases,
  getUsers,
  DATABASE_ID,
  EVENTS_COLLECTION_ID,
  REGISTRATIONS_COLLECTION_ID,
  SOCIETIES_COLLECTION_ID,
  RegistrationDocument,
} from '@/lib/api/appwrite-admin';
import { Query } from 'node-appwrite';
import Papa from 'papaparse';
import { createLogger } from '@/lib/api/logger';

export const runtime = 'nodejs';

const logger = createLogger('bulk-operations');

interface BulkOperationRequest {
  action: 'export' | 'check-in' | 'checkin' | 'delete';
  registration_ids: string[];
  eventId?: string;
  event_id?: string; // Support both formats
}

// Check if user is chair of event's society or global admin
async function isUserAuthorized(userId: string, eventId: string): Promise<boolean> {
  try {
    const db = getDatabases();
    const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);

    const users = getUsers();
    const memberships = await users.listMemberships(userId);

    // Check global admin
    const isAdmin = memberships.memberships.some(
      (m) => m.teamId === 'admins' || m.teamName?.toLowerCase() === 'admins'
    );
    if (isAdmin) return true;

    // Check chair of event's society
    const society = await db.getDocument(
      DATABASE_ID,
      SOCIETIES_COLLECTION_ID,
      event.society_id as string
    );
    const chairTeamId = `chair_${society.slug}`;

    return memberships.memberships.some(
      (m) => m.teamId === chairTeamId || m.teamName === chairTeamId
    );
  } catch (error) {
    logger.error('Authorization check failed', { userId, eventId, error });
    return false;
  }
}

// Format date for export
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

// Parse form responses safely
function parseFormResponses(formResponses: string | null | undefined): Record<string, unknown> {
  if (!formResponses) return {};
  try {
    return JSON.parse(formResponses);
  } catch {
    return {};
  }
}

// Get phone value from multiple possible fields
function getPhoneValue(registration: Record<string, unknown>, formData: Record<string, unknown> = {}): string {
  const candidates = [
    registration.user_phone,
    registration.user_phone_,
    formData.user_phone,
    formData.user_phone_,
    formData.phone,
  ];

  for (const value of candidates) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }

  return '-';
}

/**
 * POST /api/admin/bulk-operations
 * Perform bulk operations on registrations
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body: BulkOperationRequest = await req.json();
    const { action, registration_ids } = body;
    const eventId = body.eventId || body.event_id;

    if (!action || !registration_ids || !eventId) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Missing required fields: action, registration_ids, eventId/event_id' },
        { status: 400 }
      );
    }

    if (!Array.isArray(registration_ids) || registration_ids.length === 0) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'registration_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (registration_ids.length > 500) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Cannot process more than 500 registrations at once' },
        { status: 400 }
      );
    }

    // Authorization
    const isAuthorized = await isUserAuthorized(user.$id, eventId);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You do not have permission to perform this operation.' },
        { status: 403 }
      );
    }

    const db = getDatabases();

    // Verify event exists
    try {
      await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
    } catch {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Event not found' },
        { status: 404 }
      );
    }

    // Perform the requested action
    switch (action) {
      case 'export': {
        logger.info('Exporting selected registrations', {
          eventId,
          count: registration_ids.length,
          userId: user.$id,
        });

        // Fetch the selected registrations
        const registrations: Record<string, unknown>[] = [];
        
        // Fetch in batches to handle large selections
        for (let i = 0; i < registration_ids.length; i += 25) {
          const batch = registration_ids.slice(i, i + 25);
          const result = await db.listDocuments(
            DATABASE_ID,
            REGISTRATIONS_COLLECTION_ID,
            [
              Query.equal('event_id', eventId),
              Query.equal('$id', batch),
              Query.limit(25),
            ]
          );
          registrations.push(...result.documents);
        }

        if (registrations.length === 0) {
          return NextResponse.json(
            { error: 'NOT_FOUND', message: 'No matching registrations found' },
            { status: 404 }
          );
        }

        // Generate CSV data
        const csvData = registrations.map((r, index) => {
          const formData = parseFormResponses(r.form_responses as string);
          
          return {
            'S.No': index + 1,
            'Ticket ID': r.ticket_id || '-',
            'Name': r.user_name || '-',
            'Email': r.user_email || '-',
            'Phone': getPhoneValue(r, formData),
            'Registration Date': formatDate(r.registration_date as string),
            'Registration Status': r.registration_status || '-',
            'Payment Status': r.payment_status || '-',
            'Amount Paid': r.amount_paid || 0,
            'Payment Reference': r.payment_reference || '-',
            'UTR Number': r.utr_number || '-',
            'Checked In': r.checked_in ? 'Yes' : 'No',
            'Check-in Time': r.checked_in ? formatDate(r.check_in_time as string) : '-',
            'Department': formData.department || formData.dept || '-',
            'Semester': formData.semester || formData.sem || '-',
            'Section': formData.section || '-',
            'Roll Number': formData.roll_number || formData.rollNumber || '-',
            'College': formData.college || '-',
            'Year': formData.year || '-',
          };
        });

        // Generate CSV using papaparse
        const csv = Papa.unparse(csvData, {
          quotes: true,
          header: true,
        });

        // Add BOM for Excel compatibility
        const bom = '\uFEFF';
        const csvWithBom = bom + csv;

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `Selected_Registrations_${timestamp}.csv`;

        // Return CSV file
        return new NextResponse(csvWithBom, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache',
          },
        });
      }

      case 'checkin':
      case 'check-in': {
        logger.info('Bulk check-in registrations', {
          eventId,
          count: registration_ids.length,
          userId: user.$id,
        });

        const checkInTime = new Date().toISOString();
        const results = {
          success: 0,
          failed: 0,
          failed_ids: [] as string[],
        };

        // Update each registration
        for (const regId of registration_ids) {
          try {
            await db.updateDocument(
              DATABASE_ID,
              REGISTRATIONS_COLLECTION_ID,
              regId,
              {
                checked_in: true,
                check_in_time: checkInTime,
              }
            );
            results.success++;
          } catch (error) {
            logger.error('Failed to check-in registration', { regId, error });
            results.failed++;
            results.failed_ids.push(regId);
          }
        }

        return NextResponse.json({
          success: true,
          message: `Checked in ${results.success} out of ${registration_ids.length} registrations`,
          checked_in_count: results.success,
          failed_count: results.failed,
          failed_ids: results.failed_ids,
        });
      }

      case 'delete': {
        logger.info('Bulk delete registrations', {
          eventId,
          count: registration_ids.length,
          userId: user.$id,
        });

        const results = {
          success: 0,
          failed: 0,
          failed_ids: [] as string[],
        };

        // Delete each registration
        for (const regId of registration_ids) {
          try {
            await db.deleteDocument(
              DATABASE_ID,
              REGISTRATIONS_COLLECTION_ID,
              regId
            );
            results.success++;
          } catch (error) {
            logger.error('Failed to delete registration', { regId, error });
            results.failed++;
            results.failed_ids.push(regId);
          }
        }

        return NextResponse.json({
          success: true,
          message: `Deleted ${results.success} out of ${registration_ids.length} registrations`,
          deleted_count: results.success,
          failed_count: results.failed,
          failed_ids: results.failed_ids,
        });
      }

      default:
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: `Invalid action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Bulk operation failed', { error });
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
