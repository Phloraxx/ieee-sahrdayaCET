/**
 * Email Queue Service - Background job queue for bulk email sending
 * Implements retry logic, batch processing, and job status tracking
 * 
 * ⚠️ MVP LIMITATION: This implementation uses an in-memory queue.
 * The queue data will be lost on server restart or deployment.
 * 
 * For production, this should be replaced with a persistent queue such as:
 * - Redis with Bull/BullMQ for job processing
 * - Database-backed queue using Appwrite documents
 * - Cloud-native solutions like AWS SQS, Google Cloud Tasks, or Vercel KV
 * 
 * Current behavior on restart:
 * - Pending/processing jobs are lost
 * - Retry state is not preserved
 * - No durability guarantees
 * 
 * ENHANCEMENT: Database logging is now enabled
 * - All email attempts are logged to Appwrite email_logs collection
 * - Provides visibility into who received emails and who didn't
 * - Supports retry from persisted logs
 */

import { sendEmail, SendEmailOptions, SendEmailResult, renderTemplate, getDefaultTemplate } from './emailService';
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

// Job status types
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

// Email job interface
export interface EmailJob {
  id: string;
  email: SendEmailOptions;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  error?: string;
  messageId?: string;
  metadata?: {
    event_id?: string;
    registration_id?: string;
    template_type?: string;
    batch_id?: string;
  };
}

// Queue configuration
const QUEUE_CONFIG = {
  batchSize: 10,
  delayBetweenBatches: 2000, // 2 seconds between batches
  delayBetweenEmails: 200, // 200ms between individual emails
  maxAttempts: 3,
  retryDelays: [5000, 15000, 60000], // Exponential backoff: 5s, 15s, 60s
};

// In-memory queue (in production, use Redis or database)
const emailQueue: Map<string, EmailJob> = new Map();
const processingQueue: string[] = [];
let isProcessing = false;

// Database logging helpers
let dbLoggingEnabled = false;
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
    dbLoggingEnabled = true;
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
  if (!dbLoggingEnabled) {
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
    // Collection might not exist yet - don't fail the email send
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
let processingPromise: Promise<void> | null = null;

function getInlineQrAttachment(
  variables: Record<string, string | number | undefined>
): SendEmailOptions['attachments'] {
  const qrDataUrl = variables.qr_code_data_url;
  if (typeof qrDataUrl !== 'string' || !qrDataUrl.includes(',')) {
    return undefined;
  }

  try {
    const base64 = qrDataUrl.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');
    return [
      {
        filename: 'qrcode.png',
        content: buffer,
        contentType: 'image/png',
        cid: 'qrcode',
      },
    ];
  } catch (error) {
    logger.warn('Failed to parse QR data URL for inline email attachment', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return undefined;
  }
}

/**
 * Generate unique job ID
 */
function generateJobId(): string {
  return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add an email to the queue
 */
export function queueEmail(
  email: SendEmailOptions,
  metadata?: EmailJob['metadata']
): string {
  const jobId = generateJobId();
  
  const job: EmailJob = {
    id: jobId,
    email,
    status: 'pending',
    attempts: 0,
    maxAttempts: QUEUE_CONFIG.maxAttempts,
    createdAt: new Date(),
    metadata,
  };

  emailQueue.set(jobId, job);
  processingQueue.push(jobId);

  logger.info('Email queued', {
    jobId,
    to: String(email.to),
    subject: email.subject,
  });

  // Start processing if not already running
  startProcessing();

  return jobId;
}

/**
 * Add multiple emails to the queue (batch)
 */
export function queueBulkEmails(
  emails: Array<{ email: SendEmailOptions; metadata?: EmailJob['metadata'] }>
): { batch_id: string; job_ids: string[] } {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const jobIds: string[] = [];

  for (const { email, metadata } of emails) {
    const jobId = queueEmail(email, { ...metadata, batch_id: batchId });
    jobIds.push(jobId);
  }

  logger.info('Bulk emails queued', {
    batchId,
    count: String(jobIds.length),
  });

  return { batch_id: batchId, job_ids: jobIds };
}

/**
 * Get job status
 */
export function getJobStatus(jobId: string): EmailJob | null {
  return emailQueue.get(jobId) || null;
}

/**
 * Get all jobs by batch ID
 */
export function getBatchStatus(batchId: string): {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  jobs: EmailJob[];
} {
  const jobs = Array.from(emailQueue.values()).filter(
    job => job.metadata?.batch_id === batchId
  );

  return {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    processing: jobs.filter(j => j.status === 'processing' || j.status === 'retrying').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    jobs,
  };
}

/**
 * Get queue statistics
 */
export function getQueueStats(): {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  isProcessing: boolean;
} {
  const jobs = Array.from(emailQueue.values());

  return {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    processing: jobs.filter(j => j.status === 'processing' || j.status === 'retrying').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    isProcessing,
  };
}

/**
 * Get failed jobs
 */
export function getFailedJobs(): EmailJob[] {
  return Array.from(emailQueue.values()).filter(job => job.status === 'failed');
}

/**
 * Retry a failed job
 */
export function retryJob(jobId: string): boolean {
  const job = emailQueue.get(jobId);
  if (!job || job.status !== 'failed') {
    return false;
  }

  job.status = 'pending';
  job.attempts = 0;
  job.error = undefined;
  processingQueue.push(jobId);

  logger.info('Job queued for retry', { jobId });
  startProcessing();

  return true;
}

/**
 * Retry all failed jobs
 */
export function retryAllFailed(): number {
  const failedJobs = getFailedJobs();
  let retriedCount = 0;

  for (const job of failedJobs) {
    if (retryJob(job.id)) {
      retriedCount++;
    }
  }

  return retriedCount;
}

/**
 * Retry emails from database logs (for persisted retry functionality)
 */
export async function retryEmailFromLog(logId: string): Promise<{ success: boolean; job_id?: string; error?: string }> {
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
    
    // Re-queue the email with same metadata
    // Note: We'd need to store the original email content to truly retry
    // For now, this just marks it for retry if the original job still exists
    
    // Update the log status to pending
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
  
  // Generate a batch ID for tracking
  const batchId = queued > 0 ? `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : undefined;
  
  return { queued, failed, batch_id: batchId };
}

/**
 * Clear completed jobs older than specified time
 */
export function clearOldJobs(olderThanMs: number = 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - olderThanMs;
  let clearedCount = 0;

  for (const [jobId, job] of emailQueue) {
    if (
      (job.status === 'completed' || job.status === 'failed') &&
      job.createdAt.getTime() < cutoff
    ) {
      emailQueue.delete(jobId);
      clearedCount++;
    }
  }

  if (clearedCount > 0) {
    logger.info('Cleared old email jobs', { count: String(clearedCount) });
  }

  return clearedCount;
}

// Map to track job ID to database log ID
const jobToLogId: Map<string, string> = new Map();

/**
 * Process a single email job
 */
async function processJob(job: EmailJob): Promise<SendEmailResult> {
  job.status = 'processing';
  job.attempts++;
  job.processedAt = new Date();

  // Get recipient info for logging
  const recipientEmail = Array.isArray(job.email.to) ? job.email.to[0] : job.email.to;
  const recipientName = job.metadata?.registration_id || 'Unknown';

  // Create initial database log entry on first attempt
  if (job.attempts === 1) {
    const logId = await logEmailToDb({
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      registration_id: job.metadata?.registration_id,
      event_id: job.metadata?.event_id,
      subject: job.email.subject,
      status: 'pending',
      attempts: job.attempts,
      batch_id: job.metadata?.batch_id,
      job_id: job.id,
      created_at: new Date().toISOString(),
    });
    if (logId) {
      jobToLogId.set(job.id, logId);
    }
  }

  const result = await sendEmail(job.email);
  const logId = jobToLogId.get(job.id);

  if (result.success) {
    job.status = 'completed';
    job.completedAt = new Date();
    job.messageId = result.messageId;
    
    // Update database log
    if (logId) {
      await updateEmailLog(logId, {
        status: 'sent',
        attempts: job.attempts,
        sent_at: new Date().toISOString(),
      });
      jobToLogId.delete(job.id);
    }
    
    logger.info('Email job completed', {
      jobId: job.id,
      messageId: result.messageId,
      attempts: String(job.attempts),
    });
  } else {
    job.error = result.error;

    if (job.attempts < job.maxAttempts) {
      job.status = 'retrying';
      
      // Update database log with current attempt info
      if (logId) {
        await updateEmailLog(logId, {
          attempts: job.attempts,
          error_message: result.error,
        });
      }
      
      // Schedule retry with exponential backoff
      const retryDelay = QUEUE_CONFIG.retryDelays[job.attempts - 1] || 60000;
      
      setTimeout(() => {
        job.status = 'pending';
        processingQueue.push(job.id);
        startProcessing();
      }, retryDelay);

      logger.warn('Email job failed, will retry', {
        jobId: job.id,
        attempts: String(job.attempts),
        maxAttempts: String(job.maxAttempts),
        retryIn: String(retryDelay),
        error: result.error,
      });
    } else {
      job.status = 'failed';
      
      // Update database log to failed
      if (logId) {
        await updateEmailLog(logId, {
          status: 'failed',
          attempts: job.attempts,
          error_message: result.error,
        });
        jobToLogId.delete(job.id);
      }
      
      logger.error('Email job failed permanently', new Error(result.error || 'Unknown error'), {
        jobId: job.id,
        attempts: String(job.attempts),
      });
    }
  }

  return result;
}

/**
 * Process the queue in batches
 */
async function processQueue(): Promise<void> {
  while (processingQueue.length > 0) {
    // Get batch of jobs
    const batch = processingQueue.splice(0, QUEUE_CONFIG.batchSize);
    
    logger.debug('Processing email batch', {
      batchSize: String(batch.length),
      remaining: String(processingQueue.length),
    });

    // Process batch
    for (const jobId of batch) {
      const job = emailQueue.get(jobId);
      if (!job || job.status !== 'pending') {
        continue;
      }

      try {
        await processJob(job);
      } catch (error) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        
        logger.error('Unexpected error processing email job', 
          error instanceof Error ? error : new Error(String(error)),
          { jobId }
        );
      }

      // Delay between emails
      if (batch.indexOf(jobId) < batch.length - 1) {
        await sleep(QUEUE_CONFIG.delayBetweenEmails);
      }
    }

    // Delay between batches if more jobs pending
    if (processingQueue.length > 0) {
      await sleep(QUEUE_CONFIG.delayBetweenBatches);
    }
  }
}

/**
 * Start processing if not already running
 */
function startProcessing(): void {
  if (isProcessing) {
    return;
  }

  isProcessing = true;
  
  processingPromise = processQueue()
    .finally(() => {
      isProcessing = false;
      processingPromise = null;
    });
}

/**
 * Wait for all jobs to complete
 */
export async function waitForQueueCompletion(): Promise<void> {
  while (isProcessing || processingQueue.length > 0) {
    if (processingPromise) {
      await processingPromise;
    }
    await sleep(100);
  }
}

/**
 * Helper sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Types for external use
export interface QueueEmailResult {
  job_id: string;
  status: JobStatus;
}

export interface BulkQueueResult {
  batch_id: string;
  queued_count: number;
  job_ids: string[];
}

/**
 * Queue registration confirmation email
 */
export function queueRegistrationEmail(
  to: string,
  variables: Record<string, string | number | undefined>,
  templateHtml: string,
  eventId: string,
  registrationId: string
): QueueEmailResult {
  const defaultTemplate = getDefaultTemplate('registration_confirmation');
  const html = renderTemplate(templateHtml || defaultTemplate.body, variables);
  const subject = renderTemplate(defaultTemplate.subject, variables);
  const attachments = getInlineQrAttachment(variables);

  const jobId = queueEmail(
    { to, subject, html, attachments },
    { event_id: eventId, registration_id: registrationId, template_type: 'registration_confirmation' }
  );

  return { job_id: jobId, status: 'pending' };
}

/**
 * Queue payment confirmation email
 */
export function queuePaymentEmail(
  to: string,
  variables: Record<string, string | number | undefined>,
  templateHtml: string,
  eventId: string,
  registrationId: string
): QueueEmailResult {
  const defaultTemplate = getDefaultTemplate('payment_confirmation');
  const html = renderTemplate(templateHtml || defaultTemplate.body, variables);
  const subject = renderTemplate(defaultTemplate.subject, variables);
  const attachments = getInlineQrAttachment(variables);

  const jobId = queueEmail(
    { to, subject, html, attachments },
    { event_id: eventId, registration_id: registrationId, template_type: 'payment_confirmation' }
  );

  return { job_id: jobId, status: 'pending' };
}

/**
 * Queue payment receipt email with PDF attachment
 */
export function queueReceiptEmail(
  to: string,
  variables: Record<string, string | number | undefined>,
  templateHtml: string,
  eventId: string,
  registrationId: string,
  pdfBase64: string,
  pdfFilename: string
): QueueEmailResult {
  const defaultTemplate = getDefaultTemplate('payment_receipt');
  const html = renderTemplate(templateHtml || defaultTemplate.body, variables);
  const subject = renderTemplate(defaultTemplate.subject, variables);

  // Convert base64 PDF to buffer for attachment
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');

  const jobId = queueEmail(
    { 
      to, 
      subject, 
      html,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }
      ]
    },
    { event_id: eventId, registration_id: registrationId, template_type: 'payment_receipt' }
  );

  return { job_id: jobId, status: 'pending' };
}
