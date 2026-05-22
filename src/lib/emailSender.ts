/**
 * Direct Email Sender for Serverless (Vercel-compatible)
 * 
 * This module bypasses the in-memory queue and sends emails synchronously.
 * Use this for production on Vercel where background processing doesn't work.
 * 
 * The in-memory queue (emailQueue.ts) only works in local development with
 * long-running Node.js processes. On Vercel, each function invocation is
 * isolated and terminates after the response is sent.
 */

import { sendEmail, SendEmailOptions, renderTemplate } from './emailService';
import { getInlineQrAttachment, getDefaultTemplate } from './emailTemplates';
import { logger } from './api/logger';

/**
 * Send email immediately (synchronous, no queuing)
 * Returns success/error immediately
 */
export async function sendEmailDirect(
  options: SendEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const result = await sendEmail(options);
    
    if (result.success) {
      logger.info('Email sent successfully (direct)', {
        to: String(options.to),
        subject: options.subject,
        messageId: result.messageId,
      });
      return { success: true, messageId: result.messageId };
    } else {
      logger.error(
        'Failed to send email (direct)',
        new Error(result.error || 'Unknown error'),
        {
          to: String(options.to),
          subject: options.subject,
        }
      );
      return { success: false, error: result.error };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Email send exception (direct)', error instanceof Error ? error : new Error(errorMsg), {
      to: String(options.to),
      subject: options.subject,
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Send registration email directly (no queue)
 */
export async function sendRegistrationEmailDirect(
  to: string,
  variables: Record<string, string | number | undefined>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = getDefaultTemplate('registration_confirmation');
    const html = renderTemplate(template.body, variables);
    const subject = renderTemplate(template.subject, variables);
    const qrAttachment = getInlineQrAttachment(variables);

    const result = await sendEmailDirect({
      to,
      subject,
      html,
      attachments: qrAttachment,
    });

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to send registration email (direct)', error instanceof Error ? error : new Error(errorMsg));
    return { success: false, error: errorMsg };
  }
}

/**
 * Send receipt email directly (no queue)
 */
export async function sendReceiptEmailDirect(
  to: string,
  variables: Record<string, string | number | undefined>,
  eventId: string,
  registrationId: string,
  pdfBase64: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = getDefaultTemplate('payment_receipt');
    const html = renderTemplate(template.body, variables);
    const subject = renderTemplate(template.subject, variables);

    const result = await sendEmailDirect({
      to,
      subject,
      html,
      attachments: [
        {
          filename,
          content: Buffer.from(pdfBase64, 'base64'),
          contentType: 'application/pdf',
        },
      ],
    });

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to send receipt email (direct)', error instanceof Error ? error : new Error(errorMsg));
    return { success: false, error: errorMsg };
  }
}
