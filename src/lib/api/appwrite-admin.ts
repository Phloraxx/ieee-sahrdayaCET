import { Client, Databases, Users, ID, Query } from "node-appwrite";
import { logger } from "./logger";
import {
  DATABASE_ID as CANONICAL_DATABASE_ID,
  EVENTS_COLLECTION_ID as CANONICAL_EVENTS_COLLECTION_ID,
  REGISTRATIONS_COLLECTION_ID as CANONICAL_REGISTRATIONS_COLLECTION_ID,
  SOCIETIES_COLLECTION_ID as CANONICAL_SOCIETIES_COLLECTION_ID,
} from "@/lib/constants/collections";

// Environment variables
const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const API_KEY = process.env.APPWRITE_API_KEY || "";

// Database and collection IDs
export const DATABASE_ID = CANONICAL_DATABASE_ID;

// Core collections (post-migration)
export const EVENTS_COLLECTION_ID = CANONICAL_EVENTS_COLLECTION_ID;
export const REGISTRATIONS_COLLECTION_ID = CANONICAL_REGISTRATIONS_COLLECTION_ID;
export const SOCIETIES_COLLECTION_ID = CANONICAL_SOCIETIES_COLLECTION_ID;

// Backwards compatibility aliases
export const EVENT_REGISTRATIONS_COLLECTION_ID = REGISTRATIONS_COLLECTION_ID;

// Singleton admin client
let adminClient: Client | null = null;

function getAdminClient(): Client {
  if (!adminClient) {
    if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
      throw new Error(
        "Missing Appwrite configuration. Check APPWRITE_API_KEY, NEXT_PUBLIC_APPWRITE_ENDPOINT, and NEXT_PUBLIC_APPWRITE_PROJECT_ID.",
      );
    }
    adminClient = new Client()
      .setEndpoint(ENDPOINT)
      .setProject(PROJECT_ID)
      .setKey(API_KEY);
  }
  return adminClient;
}

export function getDatabases(): Databases {
  return new Databases(getAdminClient());
}

export function getUsers(): Users {
  return new Users(getAdminClient());
}

export { ID, Query };

// ============================================================================
// Consolidated Event Document Type (post-migration)
// Includes fields merged from event_metadata
// ============================================================================

export interface EventDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  
  // Basic info
  title: string;
  description?: string;
  date: string;
  start_date?: string;
  venue?: string;
  price: number;
  banner_url?: string;
  society_id: string;
  status: "draft" | "published" | "archived" | "completed" | "cancelled";
  
  // Capacity (consolidated)
  max_capacity?: number;
  registered_count?: number; // Renamed from current_registrations
  checked_in_count?: number; // Renamed from total_checked_in
  
  // Legacy fields (for backwards compatibility)
  current_registrations?: number;
  
  // Registration settings (merged from event_metadata)
  registration_start?: string;
  registration_deadline?: string;
  registration_open?: boolean;
  form_template?: string;
  form_template_id?: string;
  
  // Pricing (merged from event_metadata)
  is_paid?: boolean; // Renamed from requires_payment
  requires_payment?: boolean; // Legacy
  ieee_member_price?: number;
  non_member_price?: number;
  early_bird_price?: number;
  early_bird_deadline?: string;
  pricing_tiers?: string;
  currency?: string;
  
  // Waitlist (merged from event_metadata)
  enable_waitlist?: boolean;
  allow_waitlist?: boolean; // Alias
  waitlist_limit?: number;
  waitlist_count?: number;
  
  // Timing (merged from event_metadata)
  end_date?: string;
  timezone?: string;
  
  // Check-in settings (merged from event_metadata)
  check_in_enabled?: boolean;
  self_check_in?: boolean;
  
  // Contact (merged from event_metadata)
  contact_email?: string;
  contact_phone?: string;
  external_link?: string;
  
  // Content (merged from event_metadata)
  tags?: string;
  category?: string;
  speakers?: string; // JSON string
  schedule?: string; // JSON string
  faqs?: string; // JSON string
  
  // Soft delete
  is_deleted?: boolean;
  deleted_at?: string;

  // Team association
  team_id?: string;
}

// ============================================================================
// Embedded Ticket Type (replaces separate tickets collection)
// ============================================================================

export interface EmbeddedTicket {
  ticket_id: string;
  ticket_code: string;
  qr_code: string;
  qr_data?: string;
  qr_image_url?: string;
  issued_at: string;
  expires_at?: string;
  is_scanned?: boolean;
  scanned_at?: string;
}

// ============================================================================
// Consolidated Registration Document Type (post-migration)
// Includes embedded ticket
// ============================================================================

export interface RegistrationDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  user_id: string;
  event_id: string;
  
  // User info (denormalized)
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  
  // Form data - supports both old and new field names
  form_responses: string; // JSON string (new schema)
  form_data?: string; // JSON string (legacy alias for backward compatibility)
  
  // Status
  payment_status: "pending" | "paid" | "completed" | "failed" | "refunded" | "not_required";
  registration_status: "pending" | "confirmed" | "cancelled" | "expired" | "waitlisted";
  
  // Embedded ticket (NEW - merged from tickets collection)
  ticket?: string; // JSON string of EmbeddedTicket
  ticket_id?: string; // Legacy reference, now points to embedded ticket ID
  
  registration_date?: string;
  
  // Check-in fields (all check-in state stored here, no separate check_in_logs)
  checked_in?: boolean;
  checked_in_at?: string;
  checked_in_by?: string;
  last_check_in_location?: string; // Optional; only if collection has this attribute
  
  /** Legacy check-in timestamp field available in current production schema. */
  check_in_time?: string;
  
  /**
   * JSON string storing multi-location check-in timeline.
   * Format: CheckInHistoryEntry[] serialized as JSON.
   * Enables tracking check-ins at different locations (entrance, food-court-1, workshop-1, etc.)
   */
  check_in_history?: string;
  
  // Payment details
  payment_ticket_id?: string;
  payment_reference?: string;
}

/**
 * Normalized ticket shape for consistent consumption
 * Works regardless of whether ticket is embedded or from legacy collection
 */
export interface NormalizedTicket {
  id: string;
  code: string;
  qr_data: string;
  registration_id: string;
  user_id: string;
  event_id: string;
  issued_at: string;
  expires_at?: string;
  is_scanned: boolean;
  scanned_at?: string;
  source: 'embedded';
}

/**
 * @deprecated Tickets are now embedded in RegistrationDocument as 'ticket' field
 */
export interface TicketDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  registration_id: string;
  user_id: string;
  event_id: string;
  ticket_code?: string;
  qr_data: string;
  qr_code_base64?: string;
  is_scanned: boolean;
  scanned_at?: string;
  issued_at?: string;
}

/**
 * Get event by ID
 */
export async function getEvent(eventId: string): Promise<EventDocument | null> {
  try {
    const db = getDatabases();
    const doc = await db.getDocument(
      DATABASE_ID,
      EVENTS_COLLECTION_ID,
      eventId,
    );
    return doc as unknown as EventDocument;
  } catch (error) {
    const appwriteError = error as { code?: number };
    if (appwriteError.code === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get registration by ID
 */
export async function getRegistration(
  registrationId: string,
): Promise<RegistrationDocument | null> {
  try {
    const db = getDatabases();
    const doc = await db.getDocument(
      DATABASE_ID,
      REGISTRATIONS_COLLECTION_ID,
      registrationId,
    );
    return doc as unknown as RegistrationDocument;
  } catch (error) {
    const appwriteError = error as { code?: number };
    if (appwriteError.code === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Check if user already has a registration for an event
 */
export async function getUserRegistrationForEvent(
  userId: string,
  eventId: string,
): Promise<RegistrationDocument | null> {
  const db = getDatabases();
  const result = await db.listDocuments(
    DATABASE_ID,
    REGISTRATIONS_COLLECTION_ID,
    [
      Query.equal("user_id", userId),
      Query.equal("event_id", eventId),
      Query.notEqual("registration_status", "cancelled"),
      Query.notEqual("registration_status", "expired"),
      Query.limit(1),
    ],
  );

  return result.documents.length > 0
    ? (result.documents[0] as unknown as RegistrationDocument)
    : null;
}

/**
 * Get user's registrations
 */
export async function getUserRegistrations(
  userId: string,
): Promise<RegistrationDocument[]> {
  const db = getDatabases();
  const result = await db.listDocuments(
    DATABASE_ID,
    REGISTRATIONS_COLLECTION_ID,
    [Query.equal("user_id", userId), Query.orderDesc("$createdAt")],
  );

  return result.documents as unknown as RegistrationDocument[];
}

/**
 * Create a new registration
 */
export async function createRegistration(data: {
  user_id: string;
  event_id: string;
  form_data: Record<string, unknown>;
  payment_status: "pending" | "paid" | "completed" | "failed" | "refunded" | "not_required";
  registration_status: "pending" | "confirmed";
}): Promise<RegistrationDocument> {
  const db = getDatabases();
  
  // Map form_data API payload to Appwrite schema fields
  const userName = String(data.form_data.name || "Unknown");
  const userEmail = String(data.form_data.email || "");
  const userPhone = String(data.form_data.phone || "");
  
  const doc = await db.createDocument(
    DATABASE_ID,
    REGISTRATIONS_COLLECTION_ID,
    ID.unique(),
    {
      user_id: data.user_id,
      event_id: data.event_id,
      user_name: userName,
      user_email: userEmail,
      user_phone: userPhone,
      form_responses: JSON.stringify(data.form_data), // Use form_responses to match schema
      payment_status: data.payment_status,
      registration_status: data.registration_status,
      registration_date: new Date().toISOString()
    },
  );

  return doc as unknown as RegistrationDocument;
}

/**
 * Update registration
 */
export async function updateRegistration(
  registrationId: string,
  data: Partial<{
    form_data: Record<string, unknown>;
    payment_status: string;
    registration_status: string;
    ticket_id: string;
    payment_ticket_id: string;
  }>,
): Promise<RegistrationDocument> {
  const db = getDatabases();
  const updateData: Record<string, unknown> = { ...data };

  if (data.form_data) {
    updateData.form_responses = JSON.stringify(data.form_data); // Use form_responses to match schema
    delete updateData.form_data; // Remove form_data from update payload
  }

  const doc = await db.updateDocument(
    DATABASE_ID,
    REGISTRATIONS_COLLECTION_ID,
    registrationId,
    updateData,
  );

  return doc as unknown as RegistrationDocument;
}

/**
 * Create ticket for a registration
 * Post-migration: Embeds ticket in registration only (no legacy collection)
 */
export async function createTicket(data: {
  registration_id: string;
  user_id: string;
  event_id: string;
  qr_code_base64?: string; // Not stored in DB - generated on-demand
}): Promise<TicketDocument> {
  const db = getDatabases();
  const ticketId = ID.unique();

  // Generate QR data with ticket info
  const qrData = JSON.stringify({
    ticket_id: ticketId,
    registration_id: data.registration_id,
    event_id: data.event_id,
    timestamp: new Date().toISOString(),
  });

  // Generate a random 8-character ticket code
  const ticketCode = "TKT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  const issuedAt = new Date().toISOString();

  // Store ticket_id in registration (schema expects ticket_id field only)
  await db.updateDocument(
    DATABASE_ID,
    REGISTRATIONS_COLLECTION_ID,
    data.registration_id,
    {
      ticket_id: ticketId,
    }
  );

  // Return TicketDocument-compatible shape from embedded data
  return {
    $id: ticketId,
    $createdAt: issuedAt,
    $updatedAt: issuedAt,
    registration_id: data.registration_id,
    user_id: data.user_id,
    event_id: data.event_id,
    ticket_code: ticketCode,
    qr_data: qrData,
    is_scanned: false,
    issued_at: issuedAt,
  };
}

/**
 * Get ticket by registration ID
 * Post-migration: Reads from registration.ticket only (no legacy fallback)
 */
export async function getTicketByRegistration(
  registrationId: string,
): Promise<TicketDocument | null> {
  const db = getDatabases();
  
  // Get embedded ticket from registration (only source)
  try {
    const registration = await db.getDocument(
      DATABASE_ID,
      REGISTRATIONS_COLLECTION_ID,
      registrationId
    );
    
    const ticketJson = registration.ticket as string | undefined;
    if (ticketJson) {
      const embedded = JSON.parse(ticketJson) as EmbeddedTicket;
      // Convert embedded ticket to TicketDocument format
      return {
        $id: embedded.ticket_id,
        $createdAt: embedded.issued_at,
        $updatedAt: embedded.issued_at,
        registration_id: registrationId,
        user_id: registration.user_id as string,
        event_id: registration.event_id as string,
        ticket_code: embedded.ticket_code,
        qr_data: embedded.qr_code,
        is_scanned: embedded.is_scanned || false,
        scanned_at: embedded.scanned_at,
        issued_at: embedded.issued_at,
      };
    }

    // Legacy fallback: registration may only have denormalized ticket_id
    const legacyTicketId = registration.ticket_id as string | undefined;
    if (legacyTicketId) {
      const issuedAt = (registration.registration_date as string | undefined) || registration.$createdAt;
      const ticketCode = `TKT-${legacyTicketId.slice(-8).toUpperCase()}`;
      return {
        $id: legacyTicketId,
        $createdAt: issuedAt,
        $updatedAt: issuedAt,
        registration_id: registrationId,
        user_id: registration.user_id as string,
        event_id: registration.event_id as string,
        ticket_code: ticketCode,
        qr_data: legacyTicketId,
        is_scanned: Boolean(registration.checked_in),
        scanned_at: registration.checked_in_at || registration.check_in_time || undefined,
        issued_at: issuedAt,
      };
    }
  } catch (error) {
    const appwriteError = error as { code?: number };
    if (appwriteError.code !== 404) {
      throw error;
    }
  }
  
  return null;
}

/**
 * Get available capacity for an event
 */
export async function getEventCapacity(event: EventDocument): Promise<{
  max_capacity: number;
  current_registrations: number;
  available: number;
  is_full: boolean;
}> {
  const maxCapacity = event.max_capacity || 0;

  // Unlimited capacity
  if (maxCapacity === 0) {
    return {
      max_capacity: 0,
      current_registrations: event.current_registrations || 0,
      available: Infinity,
      is_full: false,
    };
  }

  const db = getDatabases();

  // Count confirmed registrations
  const registrationsResult = await db.listDocuments(
    DATABASE_ID,
    REGISTRATIONS_COLLECTION_ID,
    [
      Query.equal("event_id", event.$id),
      Query.equal("registration_status", "confirmed"),
      Query.limit(1),
    ],
  );
  const currentRegistrations = registrationsResult.total;

  const available = maxCapacity - currentRegistrations;

  return {
    max_capacity: maxCapacity,
    current_registrations: currentRegistrations,
    available: Math.max(0, available),
    is_full: available <= 0,
  };
}

/**
 * Check if user is admin (belongs to admin team)
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const users = getUsers();
    const memberships = await users.listMemberships(userId);
    return memberships.memberships.some(
      (m) => m.teamId === "admins" || m.teamName?.toLowerCase() === "admins",
    );
  } catch (error) {
    logger.error("Error checking admin status", error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// ============================================================================
// New Consolidated Schema Helper Functions (Post-Migration)
// ============================================================================

/**
 * Parse embedded ticket from registration document
 */
export function parseEmbeddedTicket(registration: RegistrationDocument): EmbeddedTicket | null {
  if (!registration.ticket) return null;
  try {
    return JSON.parse(registration.ticket) as EmbeddedTicket;
  } catch (e) {
    console.error('Failed to parse embedded ticket JSON', e);
    return null;
  }
}

// ============================================================================
// Check-in History Helpers (multi-location timeline support)
// ============================================================================

/**
 * Single check-in entry in the timeline
 */
export interface CheckInHistoryEntry {
  location: string;
  checked_in_at: string;
  checked_in_by?: string;
}

/**
 * Location recency metadata for UI display
 */
export interface LocationRecencyInfo {
  location: string;
  checkedInAt: string;
  timeAgo: string;
}

/**
 * Parse check-in history from registration
 * Returns empty array if missing or malformed
 */
export function parseCheckInHistory(registration: RegistrationDocument): CheckInHistoryEntry[] {
  if (!registration.check_in_history) return [];
  try {
    const parsed = JSON.parse(registration.check_in_history);
    if (!Array.isArray(parsed)) return [];
    // Validate entries have required fields
    return parsed.filter(
      (entry): entry is CheckInHistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof entry.location === 'string' &&
        typeof entry.checked_in_at === 'string'
    );
  } catch (e) {
    console.error('Failed to parse check-in history JSON', e);
    return [];
  }
}

/**
 * Append a new check-in entry to history
 * Safe: handles missing/malformed existing history
 */
export function appendCheckInHistory(
  existingHistoryJson: string | undefined,
  newEntry: CheckInHistoryEntry
): string {
  let history: CheckInHistoryEntry[] = [];
  
  if (existingHistoryJson) {
    try {
      const parsed = JSON.parse(existingHistoryJson);
      if (Array.isArray(parsed)) {
        history = parsed.filter(
          (entry): entry is CheckInHistoryEntry =>
            typeof entry === 'object' &&
            entry !== null &&
            typeof entry.location === 'string' &&
            typeof entry.checked_in_at === 'string'
        );
      }
    } catch (e) {
      console.error('Failed to parse existing check-in history', e);
    }
  }
  
  history.push(newEntry);
  return JSON.stringify(history);
}

/**
 * Format time ago string for human-readable display
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (secondsAgo < 60) {
    return `${secondsAgo} second${secondsAgo !== 1 ? 's' : ''} ago`;
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else {
    const hours = Math.floor(secondsAgo / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Get location recency info from check-in history
 * Returns per-location latest check-in timestamp with human-readable time
 */
export function getLocationRecency(
  registration: RegistrationDocument
): LocationRecencyInfo[] {
  const history = parseCheckInHistory(registration);
  
  // Build map of latest check-in per location
  const locationMap = new Map<string, string>();
  for (const entry of history) {
    const existing = locationMap.get(entry.location);
    if (!existing || entry.checked_in_at > existing) {
      locationMap.set(entry.location, entry.checked_in_at);
    }
  }
  
  // Convert to recency info array sorted by most recent first
  const result: LocationRecencyInfo[] = [];
  Array.from(locationMap.entries()).forEach(([location, checkedInAt]) => {
    result.push({
      location,
      checkedInAt,
      timeAgo: formatTimeAgo(new Date(checkedInAt)),
    });
  });
  
  return result.sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt));
}

/**
 * Build schema-safe check-in update payload
 * Includes history append with fallback if attribute doesn't exist
 */
export function buildCheckInUpdatePayload(
  registration: RegistrationDocument,
  location: string,
  checkedInBy: string
): Record<string, unknown> {
  const now = new Date().toISOString();
  const effectiveLocation = location?.trim() || 'entrance';
  
  // Always-safe fields from current schema
  const payload: Record<string, unknown> = {
    checked_in: true,
    check_in_time: now,
    checked_in_by: checkedInBy,
    last_check_in_location: effectiveLocation,
  };
  
  // Build new history entry
  const newEntry: CheckInHistoryEntry = {
    location: effectiveLocation,
    checked_in_at: now,
    checked_in_by: checkedInBy,
  };
  
  // Append to existing history (safe even if field doesn't exist in schema)
  payload.check_in_history = appendCheckInHistory(registration.check_in_history, newEntry);
  
  return payload;
}

/**
 * Increment event check-in count (denormalized counter)
 */
export async function incrementEventCheckInCount(eventId: string): Promise<void> {
  const db = getDatabases();
  const event = await getEvent(eventId);
  if (!event) return;
  const eventRecord = event as unknown as Record<string, unknown>;

  if ('checked_in_count' in eventRecord) {
    const currentCount = Number(eventRecord.checked_in_count || 0);
    await db.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId, {
      checked_in_count: currentCount + 1,
    });
    return;
  }

  if ('total_checked_in' in eventRecord) {
    const currentCount = Number(eventRecord.total_checked_in || 0);
    await db.updateDocument(DATABASE_ID, EVENTS_COLLECTION_ID, eventId, {
      total_checked_in: currentCount + 1,
    });
  }
}

/**
 * Get normalized ticket by ticket ID
 * Searches embedded tickets via registrations
 */
export async function getNormalizedTicketById(
  ticketId: string
): Promise<{ ticket: NormalizedTicket; registration: RegistrationDocument } | null> {
  const db = getDatabases();
  
  // Search registrations for embedded ticket with this ID
  try {
    // Query registrations by denormalized ticket_id field
    const result = await db.listDocuments(
      DATABASE_ID,
      REGISTRATIONS_COLLECTION_ID,
      [
        Query.equal('ticket_id', ticketId),
        Query.limit(1),
      ]
    );
    
    if (result.documents.length > 0) {
      const registration = result.documents[0] as unknown as RegistrationDocument;
      const embedded = parseEmbeddedTicket(registration);
      
      if (embedded && embedded.ticket_id === ticketId) {
        return {
          ticket: {
            id: embedded.ticket_id,
            code: embedded.ticket_code,
            qr_data: embedded.qr_data || embedded.qr_code,
            registration_id: registration.$id,
            user_id: registration.user_id,
            event_id: registration.event_id,
            issued_at: embedded.issued_at,
            expires_at: embedded.expires_at,
            is_scanned: embedded.is_scanned || false,
            scanned_at: embedded.scanned_at,
            source: 'embedded',
          },
          registration,
        };
      }

      // Legacy fallback: ticket exists only as registration.ticket_id
      if ((registration.ticket_id as string | undefined) === ticketId) {
        const issuedAt = (registration.registration_date as string | undefined) || registration.$createdAt;
        return {
          ticket: {
            id: ticketId,
            code: `TKT-${ticketId.slice(-8).toUpperCase()}`,
            qr_data: ticketId,
            registration_id: registration.$id,
            user_id: registration.user_id,
            event_id: registration.event_id,
            issued_at: issuedAt,
            is_scanned: Boolean(registration.checked_in),
            scanned_at: registration.check_in_time || registration.checked_in_at || undefined,
            source: 'embedded',
          },
          registration,
        };
      }
    }
  } catch (error) {
    logger.error('Ticket query failed', error instanceof Error ? error : new Error(String(error)));
  }

  return null;
}




