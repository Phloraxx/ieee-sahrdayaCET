/**
 * Email Service - Core email sending functionality
 * Uses Nodemailer for SMTP or native Resend API
 */

import nodemailer from "nodemailer";
import { Resend } from "resend";
import { logger } from "./api/logger";
import { sanitizeUserInput } from "./utils/sanitize";

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
    return value !== undefined ? sanitizeUserInput(value) : match;
  });
}
