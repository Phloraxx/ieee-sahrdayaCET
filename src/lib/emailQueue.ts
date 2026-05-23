/**
 * Email Queue Service - DEPRECATED
 *
 * This module previously contained in-memory queue infrastructure and
 * admin monitoring stubs. Those were removed because they cannot persist
 * on serverless and no queue worker processes emails.
 *
 * For production email queuing, use a persistent solution:
 * - Redis with Bull/BullMQ
 * - Database-backed queue using Appwrite documents
 * - Cloud-native solutions like AWS SQS or Vercel KV
 *
 * @deprecated Email queue stubs removed. Use database-backed email logging
 *             in emailSender.ts and admin route handlers directly.
 */

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
