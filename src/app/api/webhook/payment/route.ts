/**
 * Payment Webhook Handler
 * 
 * Handles payment confirmation webhooks from the payment gateway.
 * This endpoint is called when a payment is completed.
 * 
 * Flow:
 * 1. Verify webhook signature/secret
 * 2. Parse payment data from the webhook payload
 * 3. Find registration by ticket_id or registration_id
 * 4. Update registration: payment_status = 'completed', registration_status = 'confirmed'
 * 5. Convert reservation to confirmed registration (decrement reserved_slots, increment current_registrations)
 * 6. Generate ticket and QR code
 * 7. Send confirmation email
 * 8. Return 200 OK
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getDatabases, 
  getUsers,
  DATABASE_ID, 
  REGISTRATIONS_COLLECTION_ID,
  EVENTS_COLLECTION_ID,
  SLOT_RESERVATIONS_COLLECTION_ID,
  TICKETS_COLLECTION_ID,
  Query,
  ID,
} from '@/lib/api/appwrite-admin';
import { logger } from '@/lib/api/logger';
import { queuePaymentEmail } from '@/lib/emailQueue';
import QRCode from 'qrcode';

export const runtime = 'nodejs';

// Webhook payload types based on the payment docs
interface PaymentWebhookPayload {
  // Standard fields from payment gateway
  ticketId?: string;         // Human-readable ticket ID (e.g., TICKET1709123456789)
  registration_id?: string;  // Internal registration ID
  amount: number;
  status: 'paid' | 'failed' | 'pending';
  senderName?: string;
  paidAt?: string;
  transactionId?: string;
  
  // SMS-based payment detection (legacy format)
  sms?: string;
  body?: string;
  message?: string;
}

/**
 * Verify webhook secret for security
 */
function verifyWebhookSecret(request: NextRequest): boolean {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn('WEBHOOK_SECRET not configured');
    return false;
  }

  // Check query param
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  if (querySecret === webhookSecret) {
    return true;
  }

  // Check header
  const headerSecret = request.headers.get('x-webhook-secret');
  if (headerSecret === webhookSecret) {
    return true;
  }

  // Check authorization header
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.replace('Bearer ', '');
  if (bearerToken === webhookSecret) {
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
  
  // Verify webhook secret
  if (!verifyWebhookSecret(request)) {
    logger.warn('Unauthorized webhook attempt', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload: PaymentWebhookPayload = await request.json();
    
    logger.info('Payment webhook received', {
      ticketId: payload.ticketId || 'N/A',
      registrationId: payload.registration_id || 'N/A',
      status: payload.status,
      amount: String(payload.amount),
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
      // Find by ticket_id field
      const result = await db.listDocuments(
        DATABASE_ID,
        REGISTRATIONS_COLLECTION_ID,
        [
          Query.equal('ticket_id', ticketId),
          Query.limit(1),
        ]
      );
      
      if (result.documents.length === 0) {
        // Also check in tickets collection
        const ticketResult = await db.listDocuments(
          DATABASE_ID,
          TICKETS_COLLECTION_ID,
          [
            Query.equal('$id', ticketId),
            Query.limit(1),
          ]
        );
        
        if (ticketResult.documents.length > 0) {
          const ticket = ticketResult.documents[0];
          registration = await db.getDocument(
            DATABASE_ID,
            REGISTRATIONS_COLLECTION_ID,
            ticket.registration_id as string
          );
        } else {
          return NextResponse.json(
            { error: 'Registration not found for ticket' },
            { status: 404 }
          );
        }
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
        payment_status: 'completed',
        registration_status: 'confirmed',
      }
    );

    logger.info('Registration updated to confirmed', { 
      registrationId: registration.$id,
      eventId,
    });

    // Convert any active reservation to confirmed
    const reservations = await db.listDocuments(
      DATABASE_ID,
      SLOT_RESERVATIONS_COLLECTION_ID,
      [
        Query.equal('event_id', eventId),
        Query.equal('user_id', userId),
        Query.equal('status', 'active'),
        Query.limit(1),
      ]
    );

    if (reservations.documents.length > 0) {
      const reservation = reservations.documents[0];
      
      // Mark reservation as converted
      await db.updateDocument(
        DATABASE_ID,
        SLOT_RESERVATIONS_COLLECTION_ID,
        reservation.$id,
        { status: 'converted' }
      );
      
      // Update event counters: decrement reserved_slots, increment current_registrations
      const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
      const currentReserved = (event.reserved_slots as number) || 0;
      const currentRegistrations = (event.current_registrations as number) || 0;
      
      await db.updateDocument(
        DATABASE_ID,
        EVENTS_COLLECTION_ID,
        eventId,
        {
          reserved_slots: Math.max(0, currentReserved - 1),
          current_registrations: currentRegistrations + 1,
        }
      );
      
      logger.info('Reservation converted and counters updated', {
        reservationId: reservation.$id,
        eventId,
      });
    } else {
      // No reservation found, just increment current_registrations
      const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
      const currentRegistrations = (event.current_registrations as number) || 0;
      
      await db.updateDocument(
        DATABASE_ID,
        EVENTS_COLLECTION_ID,
        eventId,
        { current_registrations: currentRegistrations + 1 }
      );
    }

    // Generate ticket and QR code if not already exists
    let ticketDoc = registration.ticket_id 
      ? await db.getDocument(DATABASE_ID, TICKETS_COLLECTION_ID, registration.ticket_id as string).catch(() => null)
      : null;

    if (!ticketDoc) {
      const newTicketId = ID.unique();
      const qrCodeBase64 = await generateQRCode(newTicketId, registration.$id, eventId);
      
      const qrData = JSON.stringify({
        ticket_id: newTicketId,
        registration_id: registration.$id,
        event_id: eventId,
        timestamp: new Date().toISOString(),
      });
      
      ticketDoc = await db.createDocument(
        DATABASE_ID,
        TICKETS_COLLECTION_ID,
        newTicketId,
        {
          registration_id: registration.$id,
          user_id: userId,
          event_id: eventId,
          qr_data: qrData,
          qr_code_base64: qrCodeBase64,
          is_scanned: false,
        }
      );
      
      // Update registration with ticket_id
      await db.updateDocument(
        DATABASE_ID,
        REGISTRATIONS_COLLECTION_ID,
        registration.$id,
        { ticket_id: newTicketId }
      );
      
      logger.info('Ticket created', { ticketId: newTicketId, registrationId: registration.$id });
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
          ticket_id: ticketDoc.$id,
          ticket_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/ticket/${ticketDoc.$id}`,
          amount_paid: amount || (event.price as number) || 0,
          transaction_id: payload.transactionId || 'N/A',
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
      ticketId: ticketDoc.$id,
      duration: String(duration),
    });

    return NextResponse.json({
      success: true,
      registration_id: registration.$id,
      ticket_id: ticketDoc.$id,
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
