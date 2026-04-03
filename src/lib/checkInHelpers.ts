/**
 * Helper functions for check-in system
 * - QR code verification
 * - Capacity checking
 * - Check-in history parsing
 * 
 * Check-in state is stored entirely in event_registrations (no separate check_in_logs).
 */

import { 
  getDatabases, 
  Query, 
  DATABASE_ID,
  EVENTS_COLLECTION_ID,
  EVENT_REGISTRATIONS_COLLECTION_ID,
  getNormalizedTicketById,
  getLocationRecency,
  formatTimeAgo,
  type RegistrationDocument,
  type NormalizedTicket,
  type LocationRecencyInfo,
} from './api/appwrite-admin';

// Query is used by checkEventCapacity below
void Query;

// Re-export for convenience
export { getLocationRecency, formatTimeAgo, type LocationRecencyInfo };

interface VerifyQRResult {
  valid: boolean;
  registration?: Record<string, unknown>;
  ticket?: NormalizedTicket;
  registrationId?: string;
  studentName?: string;
  error?: 'TICKET_NOT_FOUND' | 'WRONG_EVENT' | 'ALREADY_CHECKED_IN' | 'PAYMENT_PENDING' | 'INVALID_TICKET';
  timeAgo?: string;
  checkedInAt?: string;
  lastLocation?: string;
  locationHistory?: LocationRecencyInfo[];
}

/**
 * Check if registration is already checked in and return appropriate error
 * Uses registration fields only (no check_in_logs query)
 * Returns location history for duplicate check-in info
 */
function checkAlreadyCheckedIn(
  registration: RegistrationDocument,
  currentLocation?: string
): VerifyQRResult | null {
  if (registration.checked_in === true) {
    const effectiveLocation = currentLocation?.trim() || 'entrance';
    const locationHistory = getLocationRecency(registration);
    const normalizedHistory = locationHistory.length > 0
      ? locationHistory
      : [{
          location: registration.last_check_in_location || 'entrance',
          checkedInAt:
            registration.check_in_time ||
            registration.checked_in_at ||
            registration.$updatedAt ||
            new Date().toISOString(),
          timeAgo: formatTimeAgo(
            new Date(
              registration.check_in_time ||
              registration.checked_in_at ||
              registration.$updatedAt ||
              new Date().toISOString()
            )
          ),
        }];
    const sameLocationEntry = locationHistory.find(
      (entry) => entry.location.toLowerCase() === effectiveLocation.toLowerCase()
    );
    const effectiveSameLocationEntry =
      sameLocationEntry ||
      normalizedHistory.find(
        (entry) => entry.location.toLowerCase() === effectiveLocation.toLowerCase()
      );

    // Allow check-in if checked_in is true but this location has never been scanned.
    if (!effectiveSameLocationEntry) {
      return null;
    }

    // Use schema-compatible check-in timestamp or fallback to $updatedAt
    const checkedInAtRaw =
      effectiveSameLocationEntry.checkedInAt ||
      registration.check_in_time ||
      registration.checked_in_at ||
      registration.$updatedAt ||
      new Date().toISOString();
    const checkedInAt = new Date(checkedInAtRaw);
    
    let studentName = registration.user_name || 'Unknown';
    try {
      const formResponses = registration.form_responses
        ? JSON.parse(registration.form_responses)
        : {};
      if (typeof formResponses.name === 'string' && formResponses.name.trim().length > 0) {
        studentName = formResponses.name.trim();
      }
    } catch {
      // fall back to registration.user_name
    }
    
    return { 
      valid: false, 
      error: 'ALREADY_CHECKED_IN', 
      timeAgo: formatTimeAgo(checkedInAt),
      checkedInAt: checkedInAtRaw,
      studentName,
      lastLocation: registration.last_check_in_location || 'entrance',
      locationHistory: normalizedHistory,
    };
  }
  return null;
}

/**
 * Verify QR code for check-in using current embedded-ticket model
 * Uses registration fields only for duplicate-check (no check_in_logs)
 */
export async function verifyQRCode(
  ticketId: string,
  eventId: string,
  location?: string
): Promise<VerifyQRResult> {
  try {
    // Uses registration embedded ticket lookup
    const ticketResult = await getNormalizedTicketById(ticketId);
    
    if (ticketResult) {
      const { ticket, registration } = ticketResult;
      
      // Check if ticket belongs to this event
      if (ticket.event_id !== eventId) {
        return { valid: false, error: 'WRONG_EVENT' };
      }
      
      // Check if already checked in (uses registration fields only)
      const alreadyCheckedIn = checkAlreadyCheckedIn(registration, location);
      if (alreadyCheckedIn) return alreadyCheckedIn;
      
      // Check payment status
      if (registration.payment_status === 'pending') {
        return { valid: false, error: 'PAYMENT_PENDING' };
      }
      
      // All checks passed
      return { 
        valid: true, 
        registration: registration as unknown as Record<string, unknown>,
        ticket,
        registrationId: registration.$id,
      };
    }
    
    return { valid: false, error: 'TICKET_NOT_FOUND' };
  } catch (error) {
    console.error('Error verifying QR code:', error);
    return { valid: false, error: 'INVALID_TICKET' };
  }
}

interface CapacityResult {
  available: number;
  total: number;
  full: boolean;
  current_registrations: number;
}

/**
 * Check event capacity
 * Returns current capacity status
 */
export async function checkEventCapacity(eventId: string): Promise<CapacityResult> {
  try {
    const db = getDatabases();

    // Get event
    const event = await db.getDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId);
    const maxCapacity = (event.max_capacity as number) || 0;

    // Unlimited capacity
    if (maxCapacity === 0) {
      return {
        available: Infinity,
        total: 0,
        full: false,
        current_registrations: (event.current_registrations as number) || 0,
      };
    }

    // Count confirmed registrations
    const registrationsResult = await db.listDocuments(
      DATABASE_ID,
      EVENT_REGISTRATIONS_COLLECTION_ID,
      [
        Query.equal('event_id', eventId),
        Query.equal('registration_status', 'confirmed'),
        Query.limit(1),
      ]
    );
    const currentRegistrations = registrationsResult.total;

    const available = maxCapacity - currentRegistrations;

    return {
      available: Math.max(0, available),
      total: maxCapacity,
      full: available <= 0,
      current_registrations: currentRegistrations,
    };
  } catch (error) {
    console.error('Error checking capacity:', error);
    throw error;
  }
}
