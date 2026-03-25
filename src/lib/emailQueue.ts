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
 * TODO: Implement persistent queue before production deployment
 */

import { sendEmail, SendEmailOptions, SendEmailResult } from './emailService';
import { logger } from './api/logger';

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
let processingPromise: Promise<void> | null = null;

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

/**
 * Process a single email job
 */
async function processJob(job: EmailJob): Promise<SendEmailResult> {
  job.status = 'processing';
  job.attempts++;
  job.processedAt = new Date();

  const result = await sendEmail(job.email);

  if (result.success) {
    job.status = 'completed';
    job.completedAt = new Date();
    job.messageId = result.messageId;
    
    logger.info('Email job completed', {
      jobId: job.id,
      messageId: result.messageId,
      attempts: String(job.attempts),
    });
  } else {
    job.error = result.error;

    if (job.attempts < job.maxAttempts) {
      job.status = 'retrying';
      
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
  const { renderTemplate, getDefaultTemplate } = require('./emailService');
  
  const defaultTemplate = getDefaultTemplate('registration_confirmation');
  const html = renderTemplate(templateHtml || defaultTemplate.body, variables);
  const subject = renderTemplate(defaultTemplate.subject, variables);

  const jobId = queueEmail(
    { to, subject, html },
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
  const { renderTemplate, getDefaultTemplate } = require('./emailService');
  
  const defaultTemplate = getDefaultTemplate('payment_confirmation');
  const html = renderTemplate(templateHtml || defaultTemplate.body, variables);
  const subject = renderTemplate(defaultTemplate.subject, variables);

  const jobId = queueEmail(
    { to, subject, html },
    { event_id: eventId, registration_id: registrationId, template_type: 'payment_confirmation' }
  );

  return { job_id: jobId, status: 'pending' };
}

/**
 * Queue event reminder email
 */
export function queueReminderEmail(
  to: string,
  variables: Record<string, string | number | undefined>,
  templateHtml: string,
  templateType: 'event_reminder_24h' | 'event_reminder_1h',
  eventId: string,
  registrationId: string
): QueueEmailResult {
  const { renderTemplate, getDefaultTemplate } = require('./emailService');
  
  const defaultTemplate = getDefaultTemplate(templateType);
  const html = renderTemplate(templateHtml || defaultTemplate.body, variables);
  const subject = renderTemplate(defaultTemplate.subject, variables);

  const jobId = queueEmail(
    { to, subject, html },
    { event_id: eventId, registration_id: registrationId, template_type: templateType }
  );

  return { job_id: jobId, status: 'pending' };
}
