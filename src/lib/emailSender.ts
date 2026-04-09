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

import { sendEmail, SendEmailOptions, renderTemplate, getDefaultTemplate } from './emailService';
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
 * Send multiple emails synchronously with delay between each
 * For bulk operations on serverless
 */
export async function sendBulkEmailsDirect(
  emails: SendEmailOptions[],
  options: {
    delayBetweenEmails?: number; // ms delay between sends (default: 100ms)
    stopOnError?: boolean; // stop on first error (default: false)
  } = {}
): Promise<{
  total: number;
  sent: number;
  failed: number;
  results: Array<{ email: string; success: boolean; error?: string }>;
}> {
  const { delayBetweenEmails = 100, stopOnError = false } = options;
  const results: Array<{ email: string; success: boolean; error?: string }> = [];
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const result = await sendEmailDirect(email);
    
    results.push({
      email: String(email.to),
      success: result.success,
      error: result.error,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
      if (stopOnError) {
        logger.warn('Stopping bulk email send due to error', {
          failed,
          sent,
          remaining: emails.length - results.length,
        });
        break;
      }
    }

    // Delay between emails to avoid rate limiting
    if (delayBetweenEmails > 0 && results.length < emails.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
    }
  }

  logger.info('Bulk email send completed (direct)', {
    total: emails.length,
    sent,
    failed,
  });

  return { total: emails.length, sent, failed, results };
}

/**
 * Helper to generate QR code inline attachment
 */
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
 * Send registration email directly (no queue)
 */
export async function sendRegistrationEmailDirect(
  to: string,
  variables: Record<string, string | number | undefined>,
  templateBody: string,
  eventId?: string,
  registrationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = getDefaultTemplate('registration_confirmation');
    const html = renderTemplate(templateBody, variables);
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
 * Send payment email directly (no queue)
 */
export async function sendPaymentEmailDirect(
  to: string,
  variables: Record<string, string | number | undefined>,
  templateBody: string,
  eventId?: string,
  registrationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = getDefaultTemplate('payment_confirmation');
    const html = renderTemplate(templateBody, variables);
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
    logger.error('Failed to send payment email (direct)', error instanceof Error ? error : new Error(errorMsg));
    return { success: false, error: errorMsg };
  }
}

/**
 * Send receipt email directly (no queue)
 */
export async function sendReceiptEmailDirect(
  to: string,
  variables: Record<string, string | number | undefined>,
  templateBody: string,
  eventId: string,
  registrationId: string,
  pdfBase64: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = getDefaultTemplate('payment_receipt');
    const html = renderTemplate(templateBody, variables);
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
