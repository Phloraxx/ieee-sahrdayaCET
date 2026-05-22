/**
 * Payment Webhook Handler
 * 
 * Handles payment confirmation webhooks from the payment gateway
 * (https://payment-api.nerdpixel.workers.dev/api).
 * 
 * Headers expected:
 *   Content-Type: application/json
 *   X-Webhook-Secret: YOUR_PAYMENT_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getDatabases,
  DATABASE_ID,
  REGISTRATIONS_COLLECTION_ID,
  EVENTS_COLLECTION_ID,
  Query,
} from '@/lib/api/appwrite-admin';
import { logger } from '@/lib/api/logger';
import { sendRegistrationConfirmation, sendPaymentReceipt } from '@/lib/emailIntegration';
import { randomUUID, timingSafeEqual as cryptoTimingSafeEqual } from 'crypto';
import { PAYMENT_API_URL } from '@/lib/constants/endpoints';
import { handleError } from '@/lib/errorHandler';

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
function verifyWebhookSecret(request: NextRequest): boolean {
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn('PAYMENT_WEBHOOK_SECRET not configured - rejecting all webhooks');
    return false;
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

  return false;
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  let payload: PaymentWebhookPayload;
  
  try {
    payload = await request.json();
  } catch {
    logger.warn('Invalid JSON in webhook payload');
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
  
  // Verify webhook secret (headers only, never from body)
  if (!verifyWebhookSecret(request)) {
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

    const ticketId = payload.ticketId;

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

    const eventId = registration.event_id as string;
    const userId = registration.user_id as string;
    const alreadyProcessedPayment =
      registration.payment_status === 'paid' ||
      registration.payment_status === 'completed';

    if (alreadyProcessedPayment) {
      logger.info('Payment already processed, skipping duplicate webhook side-effects', {
        registrationId: registration.$id,
        paymentStatus: registration.payment_status,
      });
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        registration_id: registration.$id,
        ticket_id: registration.ticket_id,
        status: 'confirmed',
      });
    }

    // Fetch detailed payment information from Payment API
    let paymentApiDetails: {
      amount?: number;
      rrn?: string;
      senderName?: string;
      paidAt?: string;
      transactionId?: string;
      upiId?: string;
    } = {};

    if (ticketId) {
      try {
        const statusResponse = await fetch(`${PAYMENT_API_URL}/status/${ticketId}`);
        
        if (statusResponse.ok) {
          const paymentData = await statusResponse.json();
          
          if (paymentData.status === 'paid') {
            paymentApiDetails = {
              amount: paymentData.amount || payload.amount,
              rrn: paymentData.rrn || payload.rrn,
              senderName: paymentData.senderName || payload.senderName,
              paidAt: paymentData.paidAt || payload.paidAt,
              transactionId: paymentData.transactionId || payload.transactionId,
              upiId: paymentData.upiId || payload.upiId,
            };
            logger.info('Payment details fetched from Payment API', paymentApiDetails);
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch payment details from Payment API', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with webhook payload data
        paymentApiDetails = {
          amount: payload.amount,
          rrn: payload.rrn,
          senderName: payload.senderName,
          paidAt: payload.paidAt,
          transactionId: payload.transactionId,
          upiId: payload.upiId,
        };
      }
    } else {
      // Fallback to webhook payload
      paymentApiDetails = {
        amount: payload.amount,
        rrn: payload.rrn,
        senderName: payload.senderName,
        paidAt: payload.paidAt,
        transactionId: payload.transactionId,
        upiId: payload.upiId,
      };
    }

    // Update registration to confirmed with payment details
    const updateData: Record<string, unknown> = {
      payment_status: 'paid',
      registration_status: 'confirmed',
      payment_date: paymentApiDetails.paidAt || new Date().toISOString(),
    };

    // Store payment details for idempotency tracking
    if (paymentApiDetails.amount) {
      updateData.amount_paid = paymentApiDetails.amount;
    }
    if (paymentApiDetails.rrn) {
      updateData.utr_number = paymentApiDetails.rrn;
    }

    await db.updateDocument(
      DATABASE_ID,
      REGISTRATIONS_COLLECTION_ID,
      registration.$id,
      updateData
    );

    logger.info('Registration updated to confirmed', {
      registrationId: registration.$id,
      eventId,
    });

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

    // Send payment receipt email FIRST (with PDF attachment)
    try {
      sendPaymentReceipt(
        {
          $id: registration.$id,
          user_id: userId,
          event_id: eventId,
          ticket_id: ticketIdForResponse,
        },
        event as unknown as { $id: string; title: string; start_date?: string; date?: string; venue?: string; price?: number },
        {
          amount: paymentApiDetails.amount || payload.amount,
          paidAt: paymentApiDetails.paidAt,
          transactionId: paymentApiDetails.transactionId,
          rrn: paymentApiDetails.rrn,
          utr: paymentApiDetails.rrn,
          senderName: paymentApiDetails.senderName,
          upiId: paymentApiDetails.upiId,
          paymentReference: ticketId,
        }
      ).catch(emailError => {
        // Don't fail webhook if email fails
        logger.error('Failed to send payment receipt email',
          emailError instanceof Error ? emailError : new Error(String(emailError)),
          { registrationId: registration.$id }
        );
      });
      logger.info('Payment receipt email queued', { registrationId: registration.$id });
    } catch (emailError) {
      // Log but don't fail the webhook
      logger.error('Failed to queue payment receipt email',
        emailError instanceof Error ? emailError : new Error(String(emailError)),
        { registrationId: registration.$id }
      );
    }

    // Send registration confirmation email SECOND (with ticket/QR code)
    try {
      sendRegistrationConfirmation(
        {
          $id: registration.$id,
          user_id: userId,
          event_id: eventId,
          ticket_id: ticketIdForResponse,
        },
        event as unknown as { $id: string; title: string; start_date?: string; date?: string; venue?: string; price?: number }
      ).catch(emailError => {
        // Don't fail webhook if email fails
        logger.error('Failed to send confirmation email',
          emailError instanceof Error ? emailError : new Error(String(emailError)),
          { registrationId: registration.$id }
        );
      });
      logger.info('Confirmation email queued', { registrationId: registration.$id });
    } catch (emailError) {
      // Log but don't fail the webhook
      logger.error('Failed to queue confirmation email',
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
    return handleError(error);
  }
}

/**
 * Handle GET requests (for webhook verification/health check)
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
