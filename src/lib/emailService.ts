/**
 * Email Service - Core email sending functionality
 * Uses Nodemailer for SMTP communication
 */

import nodemailer from 'nodemailer';
import { logger } from './api/logger';

// SMTP Configuration from environment
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
};

const SMTP_FROM = process.env.SMTP_FROM || 'IEEE Sahrdaya Events <events@ieeesahrdaya.com>';

// Rate limiting for email sending
const EMAIL_RATE_LIMIT = {
  maxPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT_PER_MINUTE || '10', 10),
  maxPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || '100', 10),
};

// Track email sends for rate limiting
const emailSendLog: { timestamp: number }[] = [];

// Singleton transporter instance
let transporter: nodemailer.Transporter | null = null;

/**
 * Get or create the nodemailer transporter
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
      throw new Error('SMTP credentials not configured. Set SMTP_USER and SMTP_PASSWORD environment variables.');
    }

    transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: SMTP_CONFIG.auth,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: EMAIL_RATE_LIMIT.maxPerMinute,
    });

    logger.info('Email transporter initialized', {
      host: SMTP_CONFIG.host,
      port: String(SMTP_CONFIG.port),
    });
  }

  return transporter;
}

/**
 * Check rate limits before sending
 */
function checkRateLimit(): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  // Clean old entries
  while (emailSendLog.length > 0 && emailSendLog[0].timestamp < oneHourAgo) {
    emailSendLog.shift();
  }

  // Count sends in last minute
  const sendsLastMinute = emailSendLog.filter(e => e.timestamp > oneMinuteAgo).length;
  if (sendsLastMinute >= EMAIL_RATE_LIMIT.maxPerMinute) {
    return { allowed: false, reason: `Rate limit exceeded: ${EMAIL_RATE_LIMIT.maxPerMinute} emails per minute` };
  }

  // Count sends in last hour
  const sendsLastHour = emailSendLog.length;
  if (sendsLastHour >= EMAIL_RATE_LIMIT.maxPerHour) {
    return { allowed: false, reason: `Rate limit exceeded: ${EMAIL_RATE_LIMIT.maxPerHour} emails per hour` };
  }

  return { allowed: true };
}

/**
 * Record an email send for rate limiting
 */
function recordEmailSend(): void {
  emailSendLog.push({ timestamp: Date.now() });
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
    cid?: string;
  }>;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text, attachments, replyTo } = options;

  // Check rate limits
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    logger.warn('Email rate limit exceeded', { to: String(to), reason: rateCheck.reason });
    return { success: false, error: rateCheck.reason };
  }

  try {
    const transport = getTransporter();

    const mailOptions: nodemailer.SendMailOptions = {
      from: SMTP_FROM,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || stripHtml(html),
      replyTo,
      attachments,
    };

    const result = await transport.sendMail(mailOptions);

    recordEmailSend();

    logger.info('Email sent successfully', {
      to: String(to),
      subject,
      messageId: result.messageId,
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Failed to send email', error instanceof Error ? error : new Error(errorMessage), {
      to: String(to),
      subject,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Simple HTML to plain text converter
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Template variable substitution
 * Replaces {{variable_name}} with actual values
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Verify SMTP connection
 */
export async function verifyConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = getTransporter();
    await transport.verify();
    logger.info('SMTP connection verified successfully');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('SMTP connection verification failed', error instanceof Error ? error : new Error(errorMessage));
    return { success: false, error: errorMessage };
  }
}

/**
 * Close the transporter connection
 */
export function closeConnection(): void {
  if (transporter) {
    transporter.close();
    transporter = null;
    logger.info('Email transporter connection closed');
  }
}

// Email template types
export type EmailTemplateType = 
  | 'registration_confirmation'
  | 'payment_confirmation'
  | 'event_reminder_24h'
  | 'event_reminder_1h'
  | 'custom';

// Template variables interface
export interface TemplateVariables {
  student_name?: string;
  event_name?: string;
  event_date?: string;
  event_time?: string;
  event_venue?: string;
  ticket_id?: string;
  ticket_url?: string;
  qr_code_data_url?: string;
  amount?: number | string;
  [key: string]: string | number | undefined;
}

/**
 * Get default email templates
 */
export function getDefaultTemplate(type: EmailTemplateType): { subject: string; body: string } {
  const baseTheme = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      margin: 0;
      padding: 40px 20px;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper {
      max-width: 400px;
      margin: 0 auto;
    }
    .intro-text {
      text-align: center;
      margin-bottom: 32px;
      background: #ffffff;
      padding: 24px;
      border-radius: 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      border: 1px solid #e5e7eb;
    }
    .intro-text h2 {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 8px 0;
    }
    .intro-text p {
      font-size: 14px;
      color: #4b5563;
      margin: 0;
      line-height: 1.5;
    }
    .ticket-card {
      background-color: #ffffff;
      border-radius: 32px;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.15);
      border: 1px solid rgba(243, 244, 246, 0.5);
      overflow: hidden;
      margin-bottom: 24px;
      max-width: 340px;
      margin-left: auto;
      margin-right: auto;
    }
    .ticket-header {
      background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
      padding: 28px 24px 32px 24px;
      color: #ffffff;
      position: relative;
    }
    .ticket-header-society-wrap {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.1);
      padding: 6px 12px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .ticket-header-society {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin: 0;
    }
    .ticket-header-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .cutout-row {
      height: 24px;
      background-color: #ffffff;
      margin-top: -12px;
      position: relative;
      z-index: 10;
      padding: 0 16px;
    }
    .cutout-dashed-line {
      border-top: 2px dashed #e5e7eb;
      width: 100%;
      height: 2px;
      margin: 0;
    }
    .hole-left, .hole-right {
      width: 32px;
      height: 32px;
      background-color: #f3f4f6;
      border-radius: 50%;
      position: absolute;
      top: -4px;
      box-shadow: inset 0 -2px 4px rgba(0,0,0,0.1);
    }
    .hole-left { left: -16px; }
    .hole-right { right: -16px; }

    .ticket-body {
      background-color: #ffffff;
      padding: 8px 24px 24px 24px;
    }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; }
    .label {
      font-size: 10px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 4px 0;
    }
    .value {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      line-height: 1.4;
    }
    .value-sub {
      font-size: 12px;
      font-weight: 500;
      color: #6b7280;
      margin: 2px 0 0 0;
    }
    .info-box {
      background-color: #f9fafb;
      border-radius: 16px;
      padding: 16px;
      border: 1px solid #f3f4f6;
      margin: 24px 0;
    }
    .info-box-label {
      font-size: 10px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 2px 0;
    }
    .info-box-val {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 2px 0;
    }
    .qr-container {
      text-align: center;
      margin: 0 auto;
    }
    .qr-box {
      background: #ffffff;
      padding: 12px;
      border-radius: 12px;
      box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
      display: inline-block;
    }
    .qr-box img {
      width: 160px;
      height: 160px;
      border-radius: 8px;
    }
    .pass-id {
      margin: 16px auto 0 auto;
      font-size: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      color: #1f2937;
      letter-spacing: 0.1em;
      background-color: #f9fafb;
      padding: 4px 12px;
      border-radius: 8px;
      border: 1px solid #f3f4f6;
      display: inline-block;
    }
    .valid-pass {
      margin: 32px auto 0 auto;
      color: #16a34a;
      background-color: #f0fdf4;
      border: 1px solid rgba(22, 163, 74, 0.5);
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: inline-block;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
    }
    .footer p {
      color: #6b7280;
      font-size: 12px;
      margin: 4px 0;
    }
  `;

  const templates: Record<EmailTemplateType, { subject: string; body: string }> = {
    registration_confirmation: {
      subject: 'Your Ticket for {{event_name}}',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseTheme}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="intro-text">
      <h2>Registration Confirmed! 🎉</h2>
      <p>Hello <b>{{student_name}}</b>,</p>
      <p style="margin-top: 8px;">Your registration for <b>{{event_name}}</b> is officially confirmed. This email contains your digital entry pass. Please save this email and present the QR code below at the venue for check-in.</p>
    </div>

    <div class="ticket-card">
      <div class="ticket-header">
        <div class="ticket-header-society-wrap">
          <p class="ticket-header-society">IEEE Sahrdaya SB</p>
        </div>
        <h4 class="ticket-header-title">{{event_name}}</h4>
      </div>

      <!-- Cutout Row -->
      <div style="position: relative; height: 24px; background-color: #ffffff; margin-top: -12px; z-index: 10;">
        <div style="position: absolute; left: -16px; top: -4px; width: 32px; height: 32px; background-color: #f3f4f6; border-radius: 50%;"></div>
        <div style="position: absolute; right: -16px; top: -4px; width: 32px; height: 32px; background-color: #f3f4f6; border-radius: 50%;"></div>
        <div style="padding-top: 11px;">
           <div class="cutout-dashed-line"></div>
        </div>
      </div>

      <div class="ticket-body">
        <table style="margin-top: 8px;">
          <tr>
            <td style="width: 50%; padding-right: 8px;">
              <p class="label">Date & Time</p>
              <p class="value">{{event_date}}</p>
              <p class="value-sub">{{event_time}}</p>
            </td>
            <td style="width: 50%; padding-left: 8px;">
              <p class="label">Location</p>
              <p class="value">{{event_venue}}</p>
            </td>
          </tr>
        </table>

        <div class="info-box">
          <table>
            <tr>
              <td style="width: 70%; border-right: 1px solid #e5e7eb; padding-right: 16px;">
                <p class="info-box-label">Attendee / Name</p>
                <p class="info-box-val">{{student_name}}</p>
              </td>
              <td style="width: 30%; text-align: right; padding-left: 16px; vertical-align: middle;">
                <p class="info-box-label">Type</p>
                <div style="display: inline-block; background-color: #dbeafe; color: #1e3a8a; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px;">PAID</div>
              </td>
            </tr>
          </table>
        </div>

        <div class="qr-container">
          <div class="qr-box">
            <img src="cid:qrcode" alt="Ticket QR Code" />
          </div>
          <div style="text-align: center;">
            <p class="label" style="margin-top: 16px;">Pass ID</p>
            <div class="pass-id">{{ticket_id}}</div>
          </div>
          <div style="text-align: center;">
            <div class="valid-pass">✓ Valid Pass</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p style="font-weight: 600; color: #111827;">IEEE Sahrdaya SB</p>
      <p>Advancing Technology for Humanity</p>
    </div>
  </div>
</body>
</html>`,
    },
    payment_confirmation: {
      subject: 'Payment Receipt: {{event_name}}',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseTheme}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="intro-text">
      <h2>Payment Successful! 💳</h2>
      <p>Hello <b>{{student_name}}</b>,</p>
      <p style="margin-top: 8px;">We've successfully received your payment for <b>{{event_name}}</b>. Keep this receipt and digital pass handy for the event day.</p>
    </div>

    <div class="ticket-card" style="box-shadow: 0 20px 40px -15px rgba(5, 150, 105, 0.15);">
      <div class="ticket-header" style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);">
        <div class="ticket-header-society-wrap">
          <p class="ticket-header-society">IEEE Sahrdaya SB</p>
        </div>
        <h4 class="ticket-header-title">Receipt for {{event_name}}</h4>
      </div>

      <div style="position: relative; height: 24px; background-color: #ffffff; margin-top: -12px; z-index: 10;">
        <div style="position: absolute; left: -16px; top: -4px; width: 32px; height: 32px; background-color: #f3f4f6; border-radius: 50%; box-shadow: inset 0 -2px 4px rgba(0,0,0,0.1);"></div>
        <div style="position: absolute; right: -16px; top: -4px; width: 32px; height: 32px; background-color: #f3f4f6; border-radius: 50%; box-shadow: inset 0 -2px 4px rgba(0,0,0,0.1);"></div>
        <div style="padding-top: 11px;">
           <div class="cutout-dashed-line"></div>
        </div>
      </div>

      <div class="ticket-body">
        <div style="text-align: center; padding: 16px 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 24px;">
          <p class="label">Amount Paid</p>
          <h2 style="font-size: 36px; font-weight: 700; color: #111827; margin: 8px 0 0 0;">₹{{amount}}</h2>
        </div>

        <div class="qr-container">
          <div class="qr-box">
            <img src="cid:qrcode" alt="Ticket QR Code" />
          </div>
          <div style="text-align: center;">
            <p class="label" style="margin-top: 16px;">Pass ID</p>
            <div class="pass-id">{{ticket_id}}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p style="font-weight: 600; color: #111827;">IEEE Sahrdaya SB</p>
      <p>Advancing Technology for Humanity</p>
    </div>
  </div>
</body>
</html>`,
    },
    event_reminder_24h: {
      subject: 'Reminder: {{event_name}} is Tomorrow',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseTheme}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="intro-text">
      <h2>Event Tomorrow! ⏰</h2>
      <p>Hello <b>{{student_name}}</b>,</p>
      <p style="margin-top: 8px;">Just a quick reminder that <b>{{event_name}}</b> is happening tomorrow! Please have your digital pass (below) ready on your phone for a smooth check-in process.</p>
    </div>

    <div class="ticket-card">
      <div class="ticket-header" style="background: linear-gradient(135deg, #111827 0%, #374151 100%);">
        <div class="ticket-header-society-wrap" style="background-color: rgba(245, 158, 11, 0.2);">
          <p class="ticket-header-society" style="color: #fce68a;">Event Tomorrow</p>
        </div>
        <h4 class="ticket-header-title">{{event_name}}</h4>
      </div>

      <div style="position: relative; height: 24px; background-color: #ffffff; margin-top: -12px; z-index: 10;">
        <div style="position: absolute; left: -16px; top: -4px; width: 32px; height: 32px; background-color: #f3f4f6; border-radius: 50%; box-shadow: inset 0 -2px 4px rgba(0,0,0,0.1);"></div>
        <div style="position: absolute; right: -16px; top: -4px; width: 32px; height: 32px; background-color: #f3f4f6; border-radius: 50%; box-shadow: inset 0 -2px 4px rgba(0,0,0,0.1);"></div>
        <div style="padding-top: 11px;">
           <div class="cutout-dashed-line"></div>
        </div>
      </div>

      <div class="ticket-body">
        <table style="margin-top: 8px; margin-bottom: 24px;">
          <tr>
            <td style="width: 50%; padding-right: 8px;">
              <p class="label">Date & Time</p>
              <p class="value">{{event_date}}</p>
              <p class="value-sub">{{event_time}}</p>
            </td>
            <td style="width: 50%; padding-left: 8px;">
              <p class="label">Location</p>
              <p class="value">{{event_venue}}</p>
            </td>
          </tr>
        </table>
        
        <div class="qr-container">
          <div class="qr-box">
            <img src="cid:qrcode" alt="Ticket QR Code" />
          </div>
          <div style="text-align: center;">
            <p class="label" style="margin-top: 16px;">Pass ID</p>
            <div class="pass-id">{{ticket_id}}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p style="font-weight: 600; color: #111827;">IEEE Sahrdaya SB</p>
    </div>
  </div>
</body>
</html>`,
    },
    event_reminder_1h: {
      subject: 'Starting Soon: {{event_name}}',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseTheme}</style>
</head>
<body>
  <div class="email-wrapper">
    <div class="intro-text">
      <h2>Starting in 1 Hour! 🚀</h2>
      <p>Hello <b>{{student_name}}</b>,</p>
      <p style="margin-top: 8px;">The wait is almost over! <b>{{event_name}}</b> starts in just an hour. Please make your way to the venue and have your QR code pass open.</p>
    </div>

    <div class="ticket-card" style="box-shadow: 0 20px 40px -15px rgba(220, 38, 38, 0.15);">
      <div class="ticket-header" style="background: linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%);">
        <div class="ticket-header-society-wrap" style="background-color: rgba(254, 202, 202, 0.2);">
          <p class="ticket-header-society" style="color: #fecaca;">Urgent Reminder</p>
        </div>
        <h4 class="ticket-header-title">{{event_name}}</h4>
      </div>

      <div style="position: relative; height: 24px; background-color: #ffffff; margin-top: -12px; z-index: 10;">
        <div style="position: absolute; left: -16px; top: -4px; width: 32px; height: 32px; background-color: #f3f4f6; border-radius: 50%; box-shadow: inset 0 -2px 4px rgba(0,0,0,0.1);"></div>
        <div style="position: absolute; right: -16px; top: -4px; width: 32px; height: 32px; background-color: #f3f4f6; border-radius: 50%; box-shadow: inset 0 -2px 4px rgba(0,0,0,0.1);"></div>
        <div style="padding-top: 11px;">
           <div class="cutout-dashed-line"></div>
        </div>
      </div>

      <div class="ticket-body">
        <div style="text-align: center; margin-bottom: 24px;">
           <p class="label">Venue Location</p>
           <p class="value" style="font-size: 20px;">{{event_venue}}</p>
        </div>
        
        <div class="qr-container">
          <div class="qr-box">
            <img src="cid:qrcode" alt="Ticket QR Code" />
          </div>
          <div style="text-align: center;">
            <p class="label" style="margin-top: 16px;">Pass ID</p>
            <div class="pass-id">{{ticket_id}}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p style="font-weight: 600; color: #111827;">IEEE Sahrdaya SB</p>
    </div>
  </div>
</body>
</html>`,
    },
    custom: {
      subject: '',
      body: '',
    },
  };

  return templates[type] || templates.custom;
}
