import { NextRequest, NextResponse } from 'next/server';
import { getSignedInUserFromRequest } from '@/lib/passkeys/passkeyStore';
import { getDatabases, getUsers, DATABASE_ID, Query } from '@/lib/api/appwrite-admin';
import { EMAIL_LOGS_COLLECTION_ID } from '@/lib/constants/collections';
import { getBatchStatus, getQueueStats } from '@/lib/emailQueue';
import { createLogger } from '@/lib/api/logger';

export const runtime = 'nodejs';

const log = createLogger({ action: 'bulk-email-status-api' });

/**
 * Check if user has admin access
 */
async function hasAdminAccess(userId: string): Promise<boolean> {
  try {
    const users = getUsers();
    const memberships = await users.listMemberships(userId);
    
    return memberships.memberships.some(
      (m) =>
        m.teamId === 'admins' ||
        m.teamName?.toLowerCase() === 'admins' ||
        m.teamId?.startsWith('chair_') ||
        m.teamName?.startsWith('chair_')
    );
  } catch {
    return false;
  }
}

export interface BulkStatusResponse {
  success: boolean;
  batch_id: string;
  // In-memory queue status
  queue: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    is_processing: boolean;
  };
  // Database-persisted status
  persisted: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
  // Failed recipients with details
  failed_recipients: Array<{
    email: string;
    name: string;
    error: string;
    registration_id?: string;
  }>;
  // Progress percentage
  progress: number;
}

/**
 * GET /api/admin/emails/bulk-status
 * Get status of a bulk email batch
 * 
 * Query params:
 * - batch_id: The batch ID to check status for
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSignedInUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const isAdmin = await hasAdminAccess(user.$id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Admin access required.' },
        { status: 403 }
      );
    }

    const batchId = req.nextUrl.searchParams.get('batch_id');
    
    if (!batchId) {
      // Return overall queue stats if no batch_id
      const stats = getQueueStats();
      return NextResponse.json({
        success: true,
        queue: {
          total: stats.total,
          pending: stats.pending,
          processing: stats.processing,
          completed: stats.completed,
          failed: stats.failed,
          is_processing: stats.isProcessing,
        },
      });
    }

    // Get in-memory queue status for this batch
    const queueStatus = getBatchStatus(batchId);

    // Get persisted status from database
    const db = getDatabases();
    const persistedStatus = { total: 0, sent: 0, failed: 0, pending: 0 };
    const failedRecipients: BulkStatusResponse['failed_recipients'] = [];

    try {
      const logsResult = await db.listDocuments(DATABASE_ID, EMAIL_LOGS_COLLECTION_ID, [
        Query.equal('batch_id', batchId),
        Query.limit(500),
      ]);

      persistedStatus.total = logsResult.total;
      
      for (const doc of logsResult.documents) {
        const logDoc = doc as unknown as {
          status: string;
          recipient_email: string;
          recipient_name: string;
          error_message?: string;
          registration_id?: string;
        };
        
        if (logDoc.status === 'sent') {
          persistedStatus.sent++;
        } else if (logDoc.status === 'failed') {
          persistedStatus.failed++;
          failedRecipients.push({
            email: logDoc.recipient_email,
            name: logDoc.recipient_name,
            error: logDoc.error_message || 'Unknown error',
            registration_id: logDoc.registration_id,
          });
        } else {
          persistedStatus.pending++;
        }
      }
    } catch (error) {
      const appwriteError = error as { code?: number };
      if (appwriteError.code !== 404) {
        log.warn('Could not fetch persisted email logs', { error: String(error) });
      }
      // If collection doesn't exist, fall back to in-memory only
    }

    // Calculate progress
    const total = Math.max(queueStatus.total, persistedStatus.total);
    const completed = queueStatus.completed + queueStatus.failed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    const response: BulkStatusResponse = {
      success: true,
      batch_id: batchId,
      queue: {
        total: queueStatus.total,
        pending: queueStatus.pending,
        processing: queueStatus.processing,
        completed: queueStatus.completed,
        failed: queueStatus.failed,
        is_processing: queueStatus.processing > 0,
      },
      persisted: persistedStatus,
      failed_recipients: failedRecipients,
      progress,
    };

    return NextResponse.json(response);
  } catch (error) {
    log.error('Failed to get bulk status', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to get bulk email status.' },
      { status: 500 }
    );
  }
}
