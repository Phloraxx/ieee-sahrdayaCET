/**
 * Email Service - Core email sending functionality
 * Uses Nodemailer for SMTP or native Resend API
 */

import nodemailer from "nodemailer";
import { Resend } from "resend";
import { logger } from "./api/logger";

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();

// SMTP Configuration from environment
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASSWORD || "",
  },
};

const SMTP_FROM =
  process.env.SMTP_FROM || "IEEE Sahrdaya Events <events@ieeesahrdaya.com>";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM = process.env.RESEND_FROM || SMTP_FROM;

// Rate limiting for email sending
const EMAIL_RATE_LIMIT = {
  maxPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT_PER_MINUTE || "30", 10),
  maxPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || "2000", 10),
};

// Track email sends for rate limiting
const emailSendLog: { timestamp: number }[] = [];

// Singleton transporter instance
let transporter: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;

/**
 * Get or create the nodemailer transporter
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
      throw new Error(
        "SMTP credentials not configured. Set SMTP_USER and SMTP_PASSWORD environment variables.",
      );
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

    logger.info("Email transporter initialized", {
      host: SMTP_CONFIG.host,
      port: String(SMTP_CONFIG.port),
    });
  }

  return transporter;
}

function getResendClient(): Resend {
  if (!resendClient) {
    if (!RESEND_API_KEY) {
      throw new Error(
        "Resend credentials not configured. Set RESEND_API_KEY environment variable.",
      );
    }
    resendClient = new Resend(RESEND_API_KEY);
    logger.info("Resend client initialized");
  }
  return resendClient;
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
  const sendsLastMinute = emailSendLog.filter(
    (e) => e.timestamp > oneMinuteAgo,
  ).length;
  if (sendsLastMinute >= EMAIL_RATE_LIMIT.maxPerMinute) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${EMAIL_RATE_LIMIT.maxPerMinute} emails per minute`,
    };
  }

  // Count sends in last hour
  const sendsLastHour = emailSendLog.length;
  if (sendsLastHour >= EMAIL_RATE_LIMIT.maxPerHour) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${EMAIL_RATE_LIMIT.maxPerHour} emails per hour`,
    };
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
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const { to, subject, html, text, attachments, replyTo } = options;

  // Check rate limits
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    logger.warn("Email rate limit exceeded", {
      to: String(to),
      reason: rateCheck.reason,
    });
    return { success: false, error: rateCheck.reason };
  }

  try {
    let messageId: string | undefined;

    if (EMAIL_PROVIDER === "resend") {
      const resend = getResendClient();
      const resendResult = await resend.emails.send({
        from: RESEND_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || stripHtml(html),
        replyTo: replyTo ? [replyTo] : undefined,
        attachments: attachments?.map((attachment) => ({
          filename: attachment.filename,
          content:
            typeof attachment.content === "string"
              ? attachment.content
              : attachment.content.toString("base64"),
          contentType: attachment.contentType,
          contentId: attachment.cid,
        })),
      });
      messageId = resendResult.data?.id;
    } else {
      const transport = getTransporter();

      const mailOptions: nodemailer.SendMailOptions = {
        from: SMTP_FROM,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        html,
        text: text || stripHtml(html),
        replyTo,
        attachments,
      };

      const result = await transport.sendMail(mailOptions);
      messageId = result.messageId;
    }

    recordEmailSend();

    logger.info("Email sent successfully", {
      to: String(to),
      subject,
      messageId: messageId || "",
      provider: EMAIL_PROVIDER,
    });

    return { success: true, messageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error(
      "Failed to send email",
      error instanceof Error ? error : new Error(errorMessage),
      {
        to: String(to),
        subject,
      },
    );

    return { success: false, error: errorMessage };
  }
}

/**
 * Simple HTML to plain text converter
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Template variable substitution
 * Replaces {{variable_name}} with actual values
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Verify SMTP connection
 */
export async function verifyConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (EMAIL_PROVIDER === "resend") {
      getResendClient();
      logger.info("Resend connection verified successfully");
      return { success: true };
    }

    const transport = getTransporter();
    await transport.verify();
    logger.info("SMTP connection verified successfully");
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(
      "SMTP connection verification failed",
      error instanceof Error ? error : new Error(errorMessage),
    );
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
    logger.info("Email transporter connection closed");
  }
  resendClient = null;
}

// Email template types
export type EmailTemplateType =
  | "registration_confirmation"
  | "payment_confirmation"
  | "payment_receipt"
  | "custom";

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
export function getDefaultTemplate(type: EmailTemplateType): {
  subject: string;
  body: string;
} {
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
    /* Minimal - all styling inline for Gmail */
    body { margin: 0; padding: 0; }
  `;

  const templates: Record<
    EmailTemplateType,
    { subject: string; body: string }
  > = {
    registration_confirmation: {
      subject: "Your Ticket for {{event_name}}",
      body: `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
          <tr>
            <td align="center" style="padding:32px 16px;">

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:400px;">

                <!-- Org Header -->
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#71717a;font-weight:bold;">IEEE SAHRDAYA STUDENT BRANCH</span>
                  </td>
                </tr>

                <!-- Greeting Card -->
                <tr>
                  <td style="background-color:#ffffff;padding:24px;border-radius:12px;border:1px solid #e4e4e7;">
                    <h1 style="margin:0 0 8px 0;font-size:22px;color:#18181b;font-weight:bold;line-height:1.3;">You're registered, {{student_name}}!</h1>
                    <p style="margin:0;font-size:14px;color:#52525b;line-height:1.6;">Your spot at <strong style="color:#18181b;">{{event_name}}</strong> is confirmed. Present this QR code at the venue for check-in.</p>
                  </td>
                </tr>

                <tr><td style="height:16px;"></td></tr>

                <!-- TICKET with shadow simulation via border -->
                <tr>
                  <td>
                    <!-- Outer shadow wrapper (creates depth) -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #d4d4d8;border-radius:16px;">
                      <tr>
                        <td style="padding:6px 6px 12px 6px;background-color:#e4e4e7;border-radius:16px;">
                          <!-- Inner ticket -->
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:14px;overflow:hidden;">

                            <!-- Dark Header -->
                            <tr>
                              <td style="background-color:#18181b;padding:22px 20px;">
                                <p style="margin:0 0 10px 0;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#a1a1aa;">IEEE SAHRDAYA SB · {{event_year}}</p>
                                <h2 style="margin:0;font-size:16px;color:#ffffff;font-weight:bold;line-height:1.4;">{{event_name}}</h2>
                              </td>
                            </tr>

                              <!-- Tear Line with punch-holes -->
                              <tr>
                                <td style="background-color:#ffffff;padding:0;">
                                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                      <!-- Left punch hole -->
                                      <td width="16" style="width:16px;height:28px;background-color:#e4e4e7;border-top-right-radius:14px;border-bottom-right-radius:14px;font-size:0;line-height:0;">&nbsp;</td>

                                      <!-- Centered dashed line -->
                                      <td style="height:28px;vertical-align:middle;background-color:#ffffff;padding:0;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                          <tr>
                                            <td style="border-top:2px dashed #d4d4d8;height:0;line-height:0;font-size:0;">&nbsp;</td>
                                          </tr>
                                        </table>
                                      </td>

                                      <!-- Right punch hole -->
                                      <td width="16" style="width:16px;height:28px;background-color:#e4e4e7;border-top-left-radius:14px;border-bottom-left-radius:14px;font-size:0;line-height:0;">&nbsp;</td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>


                            <!-- Ticket Body -->
                            <tr>
                              <td style="background-color:#ffffff;padding:16px 20px 24px;">

                                <!-- Event Details -->
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
                                      <p style="margin:0 0 2px 0;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#a1a1aa;font-weight:bold;">Date</p>
                                      <p style="margin:0;font-size:13px;color:#18181b;font-weight:600;">{{event_date}}</p>
                                    </td>
                                    <td width="50%" style="padding:0 0 12px 0;vertical-align:top;">
                                      <p style="margin:0 0 2px 0;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#a1a1aa;font-weight:bold;">Time</p>
                                      <p style="margin:0;font-size:13px;color:#18181b;font-weight:600;">{{event_time}}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colspan="2" style="padding-bottom:16px;">
                                      <p style="margin:0 0 2px 0;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#a1a1aa;font-weight:bold;">Venue</p>
                                      <p style="margin:0;font-size:13px;color:#18181b;font-weight:600;">{{event_venue}}</p>
                                    </td>
                                  </tr>
                                </table>

                                <!-- Attendee Box -->
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa;border-radius:8px;border:1px solid #f4f4f5;">
                                  <tr>
                                    <td style="padding:12px 14px;">
                                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                          <td valign="middle">
                                            <p style="margin:0 0 2px 0;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#a1a1aa;font-weight:bold;">Attendee</p>
                                            <p style="margin:0;font-size:15px;color:#18181b;font-weight:bold;">{{student_name}}</p>
                                          </td>
                                          <td align="right" valign="middle">
                                            <span style="display:inline-block;background-color:#dbeafe;padding:4px 10px;border-radius:4px;font-size:10px;color:#1e40af;font-weight:bold;text-transform:uppercase;">PAID</span>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>

                                <!-- QR Section -->
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
                                  <tr>
                                    <td align="center" style="padding:16px;background-color:#fafafa;border-radius:10px;border:1px solid #f4f4f5;">

                                      <!-- QR Image -->
                                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:8px;border:1px solid #e4e4e7;">
                                        <tr>
                                          <td style="padding:10px;">
                                            <img src="cid:qrcode" alt="QR Code" width="140" height="140" style="display:block;border-radius:4px;" />
                                          </td>
                                        </tr>
                                      </table>

                                      <!-- Pass ID -->
                                      <p style="margin:14px 0 4px 0;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:#a1a1aa;font-weight:bold;">Pass ID</p>
                                      <p style="margin:0 0 12px 0;font-size:12px;color:#3f3f46;font-weight:600;font-family:monospace;letter-spacing:1px;background-color:#f4f4f5;display:inline-block;padding:4px 10px;border-radius:4px;border:1px solid #e4e4e7;">{{ticket_id}}</p>

                                      <!-- Valid Badge -->
                                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                          <td style="background-color:#dcfce7;padding:6px 14px;border-radius:20px;border:1px solid #bbf7d0;">
                                            <span style="font-size:11px;color:#166534;font-weight:bold;text-transform:uppercase;">Valid Pass</span>
                                          </td>
                                        </tr>
                                      </table>

                                      <!-- View Button -->
                                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
                                        <tr>
                                          <td style="background-color:#eff6ff;padding:10px 18px;border-radius:6px;border:1px solid #dbeafe;">
                                            <a href="{{ticket_url}}" style="font-size:13px;color:#2563eb;font-weight:600;text-decoration:none;">View E-Ticket</a>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>

                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr><td style="height:16px;"></td></tr>

                <!-- Note -->
                <tr>
                  <td style="background-color:#ffffff;padding:16px 18px;border-radius:8px;border-left:3px solid #3b82f6;border:1px solid #e4e4e7;border-left:3px solid #3b82f6;">
                    <p style="margin:0;font-size:13px;color:#52525b;line-height:1.5;">Arrive early for smooth check-in. Keep this email handy and don't share your QR code.</p>
                  </td>
                </tr>

                <tr><td style="height:24px;"></td></tr>

                <!-- Footer -->
                <tr>
                  <td align="center">
                    <p style="margin:0 0 2px 0;font-size:13px;color:#18181b;font-weight:600;">IEEE Sahrdaya SB</p>
                    <p style="margin:0;font-size:11px;color:#a1a1aa;">Advancing Technology for Humanity</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`,
    },
    payment_confirmation: {
      subject: "Payment Receipt: {{event_name}}",
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
    payment_receipt: {
      subject: "Payment Receipt: {{event_name}}",
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      margin: 0;
      padding: 40px 20px;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 16px;
      color: #374151;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .amount-box {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .amount-label {
      font-size: 12px;
      font-weight: 600;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .amount-value {
      font-size: 42px;
      font-weight: 700;
      color: #1e3a8a;
      margin: 0;
    }
    .status-badge {
      display: inline-block;
      background-color: #dcfce7;
      color: #166534;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 12px;
    }
    .info-section {
      margin: 24px 0;
    }
    .info-section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .info-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-size: 13px;
      color: #6b7280;
      flex: 0 0 140px;
    }
    .info-value {
      font-size: 13px;
      color: #111827;
      font-weight: 600;
    }
    .attachment-note {
      background-color: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 16px;
      margin: 24px 0;
    }
    .attachment-note p {
      margin: 0;
      font-size: 13px;
      color: #92400e;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 4px 0;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>Payment Receipt</h1>
      <p>IEEE Sahrdaya Student Branch</p>
    </div>

    <div class="content">
      <div class="greeting">
        <p><strong>Dear {{student_name}},</strong></p>
        <p>Thank you for your payment. This email confirms that we have successfully received your payment for <strong>{{event_name}}</strong>.</p>
      </div>

      <div class="amount-box">
        <div class="amount-label">Amount Paid</div>
        <div class="amount-value">₹{{amount}}</div>
        <div class="status-badge">✓ Payment Completed</div>
      </div>

      <div class="info-section">
        <div class="info-section-title">Event Details</div>
        <div class="info-row">
          <div class="info-label">Event Name:</div>
          <div class="info-value">{{event_name}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Date & Time:</div>
          <div class="info-value">{{event_date}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Venue:</div>
          <div class="info-value">{{event_venue}}</div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-section-title">Transaction Details</div>
        <div class="info-row">
          <div class="info-label">Ticket/Pass ID:</div>
          <div class="info-value">{{ticket_id}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Payment Date:</div>
          <div class="info-value">{{payment_date}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Payment Reference:</div>
          <div class="info-value">{{payment_reference}}</div>
        </div>
        <div class="info-row">
          <div class="info-label">UTR/RRN:</div>
          <div class="info-value">{{utr_number}}</div>
        </div>
      </div>

      <div class="attachment-note">
        <p><strong>📎 Receipt Attached:</strong> A detailed PDF receipt is attached to this email for your records.</p>
      </div>

      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 13px; color: #6b7280; line-height: 1.6;">
          Your registration ticket with QR code will be sent separately in another email. Please keep both emails for your records.
        </p>
      </div>
    </div>

    <div class="footer">
      <p><strong>IEEE Sahrdaya Student Branch</strong></p>
      <p>Sahrdaya College of Engineering & Technology, Kodakara</p>
      <p>For queries: events@ieeesahrdaya.com</p>
    </div>
  </div>
</body>
</html>`,
    },
    custom: {
      subject: "",
      body: "",
    },
  };

  return templates[type] || templates.custom;
}
