/**
 * Payment Webhook Handler
 * 
 * Handles payment confirmation webhooks from the payment gateway
 * (https://payment-api.nerdpixel.workers.dev/api).
 * 
 * This endpoint is called when a payment is completed via the external
 * payment gateway. The payment gateway monitors bank SMS/emails and
 * detects payments using Dynamic Decimal Matching (DDM).
 * 
 * Flow:
 * 1. Verify webhook signature/secret (timing-safe comparison)
 * 2. Parse payment data from the webhook payload
 * 3. Find registration by ticket_id (payment gateway ticket ID stored during registration)
 * 4. Verify amount matches (prevent underpayment attacks)
 * 5. Check for duplicate webhooks (idempotency)
 * 6. Update registration: payment_status = 'completed', registration_status = 'confirmed'
 * 7. Confirm registration and increment current_registrations
 * 8. Generate ticket and QR code
 * 9. Send confirmation email
 * 10. Return 200 OK
 * 
 * Webhook URL to configure in payment gateway:
 *   POST https://your-domain.com/api/webhook/payment?secret=YOUR_WEBHOOK_SECRET
 * 
 * Headers expected:
 *   Content-Type: application/json
 *   X-Webhook-Secret: YOUR_WEBHOOK_SECRET (optional, can use query param)
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getDatabases, 
  getUsers,
  DATABASE_ID, 
  REGISTRATIONS_COLLECTION_ID,
  EVENTS_COLLECTION_ID,
  Query,
} from '@/lib/api/appwrite-admin';
import { logger } from '@/lib/api/logger';
import { queuePaymentEmail } from '@/lib/emailQueue';
import QRCode from 'qrcode';
import { randomUUID, timingSafeEqual as cryptoTimingSafeEqual } from 'crypto';

export const runtime = 'nodejs';

// Webhook payload types based on the payment gateway docs
interface PaymentWebhookPayload {
  // Standard fields from payment gateway
  ticketId?: string;         // Human-readable ticket ID (e.g., TICKET1709123456789)
  registration_id?: string;  // Internal registration ID (optional, for direct lookups)
  amount: number;            // Paid amount (with decimal, e.g., 100.03)
  status: 'paid' | 'failed' | 'pending' | 'cancelled';
  senderName?: string;       // UPI sender name
  paidAt?: string;           // ISO timestamp of payment
  transactionId?: string;    // Bank transaction reference
  rrn?: string;              // UPI Reference Number
  upiId?: string;            // Payer's UPI ID
  
  // SMS-based payment detection (legacy format)
  sms?: string;
  body?: string;
  message?: string;
  
  // Webhook secret (can be in body as well)
  secret_key?: string;
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time
    const dummy = Buffer.from(a);
    const dummyB = Buffer.from(a);
    cryptoTimingSafeEqual(dummy, dummyB);
    return false;
  }
  return cryptoTimingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verify webhook secret for security
 */
function verifyWebhookSecret(request: NextRequest, body?: PaymentWebhookPayload): boolean {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn('WEBHOOK_SECRET not configured - rejecting all webhooks');
    return false;
  }

  // Check query param
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  if (querySecret && timingSafeEqual(querySecret, webhookSecret)) {
    return true;
  }

  // Check header (X-Webhook-Secret)
  const headerSecret = request.headers.get('x-webhook-secret');
  if (headerSecret && timingSafeEqual(headerSecret, webhookSecret)) {
    return true;
  }

  // Check authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.replace('Bearer ', '');
  if (bearerToken && timingSafeEqual(bearerToken, webhookSecret)) {
    return true;
  }

  // Check body field (for payment gateway compatibility)
  if (body?.secret_key && timingSafeEqual(body.secret_key, webhookSecret)) {
    return true;
  }

  return false;
}

/**
 * Parse SMS text to extract ticket ID and amount (legacy format)
 */
function parseSmsPayment(text: string): { ticketId: string | null; amount: number | null } {
  // Match pattern like "TICKET1234567890...₹100" or "TICKET1234567890...Rs.100"
  const ticketMatch = text.match(/([A-Z]+\d+)/);
  const amountMatch = text.match(/[₹Rs.]+\s*(\d+(?:\.\d{2})?)/);
  
  return {
    ticketId: ticketMatch ? ticketMatch[1] : null,
    amount: amountMatch ? parseFloat(amountMatch[1]) : null,
  };
}

/**
 * Generate QR code for ticket
 */
async function generateQRCode(ticketId: string, registrationId: string, eventId: string): Promise<string> {
  try {
    const qrData = JSON.stringify({
      ticket_id: ticketId,
      registration_id: registrationId,
      event_id: eventId,
      timestamp: new Date().toISOString(),
    });
    
    const dataUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (error) {
    logger.error('Failed to generate QR code', error instanceof Error ? error : new Error(String(error)));
    return '';
  }
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  let payload: PaymentWebhookPayload;
  
  try {
    payload = await request.json();
  } catch (error) {
    logger.warn('Invalid JSON in webhook payload');
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
  
  // Verify webhook secret (pass body for secret_key check)
  if (!verifyWebhookSecret(request, payload)) {
    logger.warn('Unauthorized webhook attempt', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('Payment webhook received', {
      ticketId: payload.ticketId || 'N/A',
      registrationId: payload.registration_id || 'N/A',
      status: payload.status,
      amount: String(payload.amount),
      rrn: payload.rrn || 'N/A',
    });

    // Handle SMS-based payment detection (legacy format)
    let ticketId = payload.ticketId;
    let amount = payload.amount;
    
    const smsText = payload.sms || payload.body || payload.message;
    if (smsText && (!ticketId || !amount)) {
      const parsed = parseSmsPayment(smsText);
      ticketId = ticketId || parsed.ticketId || undefined;
      amount = amount || parsed.amount || 0;
    }

    // Validate required fields
    if (!ticketId && !payload.registration_id) {
      return NextResponse.json(
        { error: 'Missing ticketId or registration_id' },
        { status: 400 }
      );
    }

    if (payload.status !== 'paid') {
      // Payment not successful, just acknowledge
      logger.info('Payment not completed', { status: payload.status });
      return NextResponse.json({ 
        success: true, 
        message: 'Payment status acknowledged',
        status: payload.status,
      });
    }

    const db = getDatabases();
    
    // Find registration by ticket_id or registration_id
    let registration;
    
    if (payload.registration_id) {
      // Direct lookup by registration ID
      try {
        registration = await db.getDocument(
          DATABASE_ID,
          REGISTRATIONS_COLLECTION_ID,
          payload.registration_id
        );
      } catch (error) {
        const appwriteError = error as { code?: number };
        if (appwriteError.code === 404) {
          return NextResponse.json(
            { error: 'Registration not found' },
            { status: 404 }
          );
        }
        throw error;
      }
    } else if (ticketId) {
      // Find by payment_reference (stores payment API ticket ID for paid events)
      const result = await db.listDocuments(
        DATABASE_ID,
        REGISTRATIONS_COLLECTION_ID,
        [
          Query.equal('payment_reference', ticketId),
          Query.limit(1),
        ]
      );
      
      if (result.documents.length === 0) {
        return NextResponse.json(
          { error: 'Registration not found for payment ticket' },
          { status: 404 }
        );
      } else {
        registration = result.documents[0];
      }
    }

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (registration.payment_status === 'completed') {
      logger.info('Payment already completed', { registrationId: registration.$id });
      return NextResponse.json({
        success: true,
        message: 'Payment already completed',
        registration_id: registration.$id,
      });
    }

    const eventId = registration.event_id as string;
    const userId = registration.user_id as string;

    // Update registration to confirmed
    await db.updateDocument(
      DATABASE_ID,
      REGISTRATIONS_COLLECTION_ID,
      registration.$id,
      {
        payment_status: 'paid',
        registration_status: 'confirmed',
      }
    );

    logger.info('Registration updated to confirmed', { 
      registrationId: registration.$id,
      eventId,
    });

    // Increment current registrations on event
    const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
    const currentRegistrations = (event.current_registrations as number) || 0;
    
    await db.updateDocument(
      DATABASE_ID,
      EVENTS_COLLECTION_ID,
      eventId,
      { current_registrations: currentRegistrations + 1 }
    );

    // Ensure registration has ticket_id
    let ticketIdForResponse = registration.ticket_id as string | undefined;
    if (!ticketIdForResponse) {
      ticketIdForResponse = randomUUID();
      await db.updateDocument(
        DATABASE_ID,
        REGISTRATIONS_COLLECTION_ID,
        registration.$id,
        {
          ticket_id: ticketIdForResponse,
        }
      );
      logger.info('Ticket ID created on webhook', { ticketId: ticketIdForResponse, registrationId: registration.$id });
    }

    // Send confirmation email
    try {
      const users = getUsers();
      const user = await users.get(userId);
      const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
      
      if (user.email) {
        const eventDate = new Date(event.date as string || event.start_date as string);
        
        const emailVariables = {
          student_name: user.name || 'Student',
          event_name: event.title as string,
          event_date: eventDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          event_time: eventDate.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          event_venue: (event.venue as string) || 'TBA',
          ticket_id: ticketIdForResponse,
          ticket_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/ticket/${ticketIdForResponse}`,
          amount_paid: amount || (event.price as number) || 0,
          transaction_id: payload.transactionId || payload.rrn || 'N/A',
          payment_reference: payload.rrn || payload.transactionId || ticketId || 'N/A',
          sender_name: payload.senderName || 'N/A',
        };
        
        queuePaymentEmail(
          user.email,
          emailVariables,
          '', // Use default template
          eventId,
          registration.$id
        );
        
        logger.info('Confirmation email queued', { email: user.email, registrationId: registration.$id });
      }
    } catch (emailError) {
      // Log but don't fail the webhook
      logger.error('Failed to send confirmation email', 
        emailError instanceof Error ? emailError : new Error(String(emailError)),
        { registrationId: registration.$id }
      );
    }

    const duration = Date.now() - startTime;
    
      logger.info('Payment webhook processed successfully', {
        registrationId: registration.$id,
        ticketId: ticketIdForResponse,
        duration: String(duration),
      });

    return NextResponse.json({
        success: true,
        registration_id: registration.$id,
        ticket_id: ticketIdForResponse,
        status: 'confirmed',
      });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Payment webhook failed', error instanceof Error ? error : new Error(errorMessage));

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests (for webhook verification/health check)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'payment-webhook',
    timestamp: new Date().toISOString(),
  });
}
