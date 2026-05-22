/**
 * Email Queue Service - Stub for admin monitoring
 * 
 * In-memory queue was removed because it can't persist on serverless.
 * Only admin monitoring functions remain for future DB-backed implementation.
 * 
 * For production, use a persistent queue such as:
 * - Redis with Bull/BullMQ
 * - Database-backed queue using Appwrite documents
 * - Cloud-native solutions like AWS SQS or Vercel KV
 */

import { logger } from './api/logger';

// Email log document structure for Appwrite
export interface EmailLogDocument {
  $id?: string;
  recipient_email: string;
  recipient_name: string;
  registration_id?: string;
  event_id?: string;
  event_title?: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  attempts: number;
  sent_at?: string;
  batch_id?: string;
  job_id?: string;
  created_at: string;
}

// Database logging helpers
let dbInstance: {
  getDatabases: () => import('node-appwrite').Databases;
  DATABASE_ID: string;
  EMAIL_LOGS_COLLECTION_ID: string;
  ID: { unique: () => string };
} | null = null;

/**
 * Initialize database logging (called lazily to avoid circular imports)
 */
async function initDbLogging(): Promise<boolean> {
  if (dbInstance) return true;
  
  try {
    const { getDatabases, DATABASE_ID, ID } = await import('./api/appwrite-admin');
    const { EMAIL_LOGS_COLLECTION_ID } = await import('./constants/collections');
    
    dbInstance = {
      getDatabases,
      DATABASE_ID,
      EMAIL_LOGS_COLLECTION_ID,
      ID,
    };
    return true;
  } catch (error) {
    logger.warn('Database logging not available', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Log email to database
 */
async function logEmailToDb(logData: Omit<EmailLogDocument, '$id'>): Promise<string | null> {
  if (!dbInstance) {
    await initDbLogging();
  }
  
  if (!dbInstance) return null;
  
  try {
    const db = dbInstance.getDatabases();
    const doc = await db.createDocument(
      dbInstance.DATABASE_ID,
      dbInstance.EMAIL_LOGS_COLLECTION_ID,
      dbInstance.ID.unique(),
      logData
    );
    return doc.$id;
  } catch (error) {
    const appwriteError = error as { code?: number; message?: string };
    if (appwriteError.code === 404 || appwriteError.message?.includes('Collection')) {
      logger.debug('Email logs collection not found, skipping DB log');
    } else {
      logger.warn('Failed to log email to database', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return null;
  }
}

/**
 * Update email log in database
 */
async function updateEmailLog(
  logId: string,
  updates: Partial<Pick<EmailLogDocument, 'status' | 'error_message' | 'attempts' | 'sent_at'>>
): Promise<boolean> {
  if (!dbInstance) return false;
  
  try {
    const db = dbInstance.getDatabases();
    await db.updateDocument(
      dbInstance.DATABASE_ID,
      dbInstance.EMAIL_LOGS_COLLECTION_ID,
      logId,
      updates
    );
    return true;
  } catch (error) {
    logger.warn('Failed to update email log', {
      logId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Get queue statistics (always empty without queue infrastructure)
 */
export function getQueueStats(): {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  isProcessing: boolean;
} {
  return {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    isProcessing: false,
  };
}

/**
 * Get batch status (always empty without queue infrastructure)
 */
export function getBatchStatus(_batchId: string): {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  jobs: Array<{ id: string; status: string }>;
} {
  return {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    jobs: [],
  };
}

/**
 * Retry email from database logs
 */
async function retryEmailFromLog(logId: string): Promise<{ success: boolean; job_id?: string; error?: string }> {
  if (!dbInstance) {
    await initDbLogging();
  }
  
  if (!dbInstance) {
    return { success: false, error: 'Database not available' };
  }
  
  try {
    const db = dbInstance.getDatabases();
    const logDoc = await db.getDocument(
      dbInstance.DATABASE_ID,
      dbInstance.EMAIL_LOGS_COLLECTION_ID,
      logId
    ) as unknown as EmailLogDocument & { $id: string };
    
    if (logDoc.status !== 'failed') {
      return { success: false, error: 'Can only retry failed emails' };
    }
    
    await db.updateDocument(
      dbInstance.DATABASE_ID,
      dbInstance.EMAIL_LOGS_COLLECTION_ID,
      logId,
      { status: 'pending', error_message: null }
    );
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retry multiple emails from database logs
 */
export async function retryMultipleFromLogs(
  logIds: string[]
): Promise<{ queued: number; failed: number; batch_id?: string }> {
  let queued = 0;
  let failed = 0;
  
  for (const logId of logIds) {
    const result = await retryEmailFromLog(logId);
    if (result.success) {
      queued++;
    } else {
      failed++;
    }
  }
  
  const batchId = queued > 0 ? `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : undefined;
  
  return { queued, failed, batch_id: batchId };
}
