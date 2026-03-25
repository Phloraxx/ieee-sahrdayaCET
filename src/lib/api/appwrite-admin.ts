import { Client, Databases, Users, ID, Query } from "node-appwrite";

// Environment variables
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const API_KEY = process.env.APPWRITE_API_KEY || "";

// Database and collection IDs
export const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "ieee_sahrdaya_db";
export const EVENTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID || "events";
export const REGISTRATIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_REGISTRATIONS_COLLECTION_ID ||
  "registrations";
export const EVENT_REGISTRATIONS_COLLECTION_ID = REGISTRATIONS_COLLECTION_ID; // Alias for backwards compatibility
export const TICKETS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_TICKETS_COLLECTION_ID || "tickets";
export const SLOT_RESERVATIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_SLOT_RESERVATIONS_COLLECTION_ID ||
  "slot_reservations";
export const EMAIL_TEMPLATES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_EMAIL_TEMPLATES_COLLECTION_ID ||
  "email_templates";
export const EVENT_METADATA_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_EVENT_METADATA_COLLECTION_ID ||
  "event_metadata";

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

// Event document type
export interface EventDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  title: string;
  description?: string;
  date: string;
  venue?: string;
  price: number;
  banner_url?: string;
  society_id: string;
  status: "draft" | "published" | "archived" | "completed";
  max_capacity?: number;
  current_registrations?: number;
  reserved_slots?: number;
  registration_deadline?: string;
  form_template?: string; // JSON string of form questions
}

// Event metadata document type (stored in separate collection)
export interface EventMetadataDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  event_id: string;
  registration_start?: string;
  registration_deadline?: string;
  registration_open?: boolean;
  max_capacity?: number;
  current_registrations?: number;
  reserved_slots?: number;
  total_registrations?: number;
  total_checked_in?: number;
  enable_waitlist?: boolean;
  waitlist_limit?: number;
  waitlist_count?: number;
  price?: number;
  requires_payment?: boolean;
  early_bird_price?: number;
  early_bird_deadline?: string;
  pricing_tiers?: string;
  form_template_id?: string;
  end_date?: string;
  check_in_enabled?: boolean;
  self_check_in?: boolean;
  contact_email?: string;
  contact_phone?: string;
  tags?: string;
  external_link?: string;
  is_deleted?: boolean;
  deleted_at?: string;
}

// Combined event with metadata
export interface EventWithMetadata extends EventDocument {
  metadata?: EventMetadataDocument;
}

// Registration document type
export interface RegistrationDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  user_id: string;
  event_id: string;
  form_data: string; // JSON string
  payment_status: "pending" | "completed" | "failed" | "refunded";
  registration_status: "reserved" | "confirmed" | "cancelled" | "expired";
  ticket_id?: string;
  reservation_expires_at?: string;
  // Check-in fields
  checked_in?: boolean;
  checked_in_at?: string;
  checked_in_by?: string;
}

// Ticket document type
export interface TicketDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  registration_id: string;
  user_id: string;
  event_id: string;
  qr_data: string;
  qr_code_base64?: string; // Base64 PNG image
  is_scanned: boolean;
  scanned_at?: string;
}

// Slot reservation document type
export interface SlotReservationDocument {
  $id: string;
  $createdAt: string;
  event_id: string;
  user_id: string;
  expires_at: string;
  status: "active" | "converted" | "expired";
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
  payment_status: "pending" | "completed";
  registration_status: "reserved" | "confirmed";
  reservation_expires_at?: string;
}): Promise<RegistrationDocument> {
  const db = getDatabases();
  const doc = await db.createDocument(
    DATABASE_ID,
    REGISTRATIONS_COLLECTION_ID,
    ID.unique(),
    {
      ...data,
      form_data: JSON.stringify(data.form_data),
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
    reservation_expires_at: string;
  }>,
): Promise<RegistrationDocument> {
  const db = getDatabases();
  const updateData: Record<string, unknown> = { ...data };

  if (data.form_data) {
    updateData.form_data = JSON.stringify(data.form_data);
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
 */
export async function createTicket(data: {
  registration_id: string;
  user_id: string;
  event_id: string;
  qr_code_base64?: string;
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

  const doc = await db.createDocument(
    DATABASE_ID,
    TICKETS_COLLECTION_ID,
    ticketId,
    {
      registration_id: data.registration_id,
      user_id: data.user_id,
      event_id: data.event_id,
      qr_data: qrData,
      qr_code_base64: data.qr_code_base64 || "",
      is_scanned: false,
    },
  );

  return doc as unknown as TicketDocument;
}

/**
 * Get ticket by registration ID
 */
export async function getTicketByRegistration(
  registrationId: string,
): Promise<TicketDocument | null> {
  const db = getDatabases();
  const result = await db.listDocuments(DATABASE_ID, TICKETS_COLLECTION_ID, [
    Query.equal("registration_id", registrationId),
    Query.limit(1),
  ]);

  return result.documents.length > 0
    ? (result.documents[0] as unknown as TicketDocument)
    : null;
}

/**
 * Get available capacity for an event
 * Takes into account current registrations and active slot reservations
 */
export async function getEventCapacity(event: EventDocument): Promise<{
  max_capacity: number;
  current_registrations: number;
  reserved_slots: number;
  available: number;
  is_full: boolean;
}> {
  const maxCapacity = event.max_capacity || 0;

  // Unlimited capacity
  if (maxCapacity === 0) {
    return {
      max_capacity: 0,
      current_registrations: event.current_registrations || 0,
      reserved_slots: 0,
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

  // Count active slot reservations (not expired)
  const now = new Date().toISOString();
  const reservationsResult = await db.listDocuments(
    DATABASE_ID,
    SLOT_RESERVATIONS_COLLECTION_ID,
    [
      Query.equal("event_id", event.$id),
      Query.equal("status", "active"),
      Query.greaterThan("expires_at", now),
      Query.limit(1),
    ],
  );
  const reservedSlots = reservationsResult.total;

  const available = maxCapacity - currentRegistrations - reservedSlots;

  return {
    max_capacity: maxCapacity,
    current_registrations: currentRegistrations,
    reserved_slots: reservedSlots,
    available: Math.max(0, available),
    is_full: available <= 0,
  };
}

/**
 * Reserve a slot for an event (with optimistic locking to prevent race conditions)
 * Uses retry mechanism if concurrent modification is detected
 * Returns the reservation document if successful
 */
export async function reserveSlot(
  eventId: string,
  userId: string,
  expiresInMinutes: number = 5,
  maxRetries: number = 3,
): Promise<SlotReservationDocument | null> {
  const db = getDatabases();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  // Check for existing active reservation
  const existingResult = await db.listDocuments(
    DATABASE_ID,
    SLOT_RESERVATIONS_COLLECTION_ID,
    [
      Query.equal("event_id", eventId),
      Query.equal("user_id", userId),
      Query.equal("status", "active"),
      Query.greaterThan("expires_at", now.toISOString()),
      Query.limit(1),
    ],
  );

  if (existingResult.documents.length > 0) {
    return existingResult.documents[0] as unknown as SlotReservationDocument;
  }

  // Get event to check capacity - capture current reserved_slots for optimistic locking
  const event = await getEvent(eventId);
  if (!event) return null;

  const capacity = await getEventCapacity(event);
  if (capacity.is_full) return null;

  // Store the current reserved_slots value for optimistic locking
  const expectedReservedSlots = event.reserved_slots || 0;

  try {
    // Atomically increment reserved_slots on the event with optimistic locking
    // This ensures we don't create a reservation if another request modified the count
    const updatedEvent = await db.updateDocument(
      DATABASE_ID,
      EVENTS_COLLECTION_ID,
      eventId,
      {
        reserved_slots: expectedReservedSlots + 1,
      },
    );

    // Verify the update was successful (reserved_slots should be what we set)
    if ((updatedEvent.reserved_slots as number) !== expectedReservedSlots + 1) {
      // Concurrent modification detected, retry
      if (maxRetries > 0) {
        // Small delay before retry to reduce contention
        await new Promise((resolve) =>
          setTimeout(resolve, 50 + Math.random() * 100),
        );
        return reserveSlot(eventId, userId, expiresInMinutes, maxRetries - 1);
      }
      return null; // Max retries exceeded
    }

    // Create reservation document
    const doc = await db.createDocument(
      DATABASE_ID,
      SLOT_RESERVATIONS_COLLECTION_ID,
      ID.unique(),
      {
        event_id: eventId,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
        status: "active",
      },
    );

    return doc as unknown as SlotReservationDocument;
  } catch (error) {
    // If update failed due to concurrent modification or other error, retry
    const appwriteError = error as { code?: number; message?: string };

    // Check if it's a conflict error or document was modified
    if (
      maxRetries > 0 &&
      (appwriteError.code === 409 ||
        appwriteError.message?.includes("conflict"))
    ) {
      // Small delay before retry to reduce contention
      await new Promise((resolve) =>
        setTimeout(resolve, 50 + Math.random() * 100),
      );
      return reserveSlot(eventId, userId, expiresInMinutes, maxRetries - 1);
    }

    throw error;
  }
}

/**
 * Convert a slot reservation to confirmed registration
 */
export async function convertReservation(reservationId: string): Promise<void> {
  const db = getDatabases();
  await db.updateDocument(
    DATABASE_ID,
    SLOT_RESERVATIONS_COLLECTION_ID,
    reservationId,
    {
      status: "converted",
    },
  );
}

/**
 * Expire a slot reservation
 */
export async function expireReservation(reservationId: string): Promise<void> {
  const db = getDatabases();
  await db.updateDocument(
    DATABASE_ID,
    SLOT_RESERVATIONS_COLLECTION_ID,
    reservationId,
    {
      status: "expired",
    },
  );
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
      console.log("Appwrite Error:", memberships),
    );
  } catch {
    const users = getUsers();
    const memberships = await users.listMemberships(userId);
    console.log("Appwrite Error:", memberships.memberships);
    return false;
  }
}

/**
 * Get ticket by ID
 */
export async function getTicket(
  ticketId: string,
): Promise<TicketDocument | null> {
  try {
    const db = getDatabases();
    const doc = await db.getDocument(
      DATABASE_ID,
      TICKETS_COLLECTION_ID,
      ticketId,
    );
    return doc as unknown as TicketDocument;
  } catch (error) {
    const appwriteError = error as { code?: number };
    if (appwriteError.code === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get event metadata by event ID
 */
export async function getEventMetadata(
  eventId: string,
): Promise<EventMetadataDocument | null> {
  try {
    const db = getDatabases();
    const result = await db.listDocuments(
      DATABASE_ID,
      EVENT_METADATA_COLLECTION_ID,
      [Query.equal("event_id", eventId), Query.limit(1)],
    );

    return result.documents.length > 0
      ? (result.documents[0] as unknown as EventMetadataDocument)
      : null;
  } catch (error) {
    const appwriteError = error as { code?: number };
    if (appwriteError.code === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get event with metadata combined
 * Fetches both the event document and its metadata, merging them
 */
export async function getEventWithMetadata(
  eventId: string,
): Promise<EventWithMetadata | null> {
  const event = await getEvent(eventId);
  if (!event) return null;

  const metadata = await getEventMetadata(eventId);

  // Merge event with metadata, using metadata values where they exist
  return {
    ...event,
    metadata: metadata || undefined,
    // Override event fields with metadata if available
    max_capacity: metadata?.max_capacity ?? event.max_capacity,
    current_registrations:
      metadata?.current_registrations ?? event.current_registrations,
    reserved_slots: metadata?.reserved_slots ?? event.reserved_slots,
    registration_deadline:
      metadata?.registration_deadline ?? event.registration_deadline,
    price: metadata?.price ?? event.price,
  };
}

/**
 * Create event metadata
 */
export async function createEventMetadata(data: {
  event_id: string;
  registration_deadline?: string;
  max_capacity?: number;
  current_registrations?: number;
  reserved_slots?: number;
  price?: number;
  requires_payment?: boolean;
  enable_waitlist?: boolean;
  waitlist_limit?: number;
  form_template_id?: string;
  check_in_enabled?: boolean;
  self_check_in?: boolean;
  contact_email?: string;
  contact_phone?: string;
  tags?: string;
  external_link?: string;
}): Promise<EventMetadataDocument> {
  const db = getDatabases();
  const doc = await db.createDocument(
    DATABASE_ID,
    EVENT_METADATA_COLLECTION_ID,
    ID.unique(),
    data,
  );

  return doc as unknown as EventMetadataDocument;
}

/**
 * Update event metadata
 */
export async function updateEventMetadata(
  eventId: string,
  data: Partial<
    Omit<
      EventMetadataDocument,
      "$id" | "$createdAt" | "$updatedAt" | "event_id"
    >
  >,
): Promise<EventMetadataDocument | null> {
  const db = getDatabases();

  // Find existing metadata
  const existing = await getEventMetadata(eventId);

  if (existing) {
    // Update existing
    const doc = await db.updateDocument(
      DATABASE_ID,
      EVENT_METADATA_COLLECTION_ID,
      existing.$id,
      data,
    );
    return doc as unknown as EventMetadataDocument;
  } else {
    // Create new metadata if doesn't exist
    return createEventMetadata({ event_id: eventId, ...data });
  }
}

/**
 * Get event capacity using metadata collection
 * Takes into account current registrations and active slot reservations
 */
export async function getEventCapacityWithMetadata(
  event: EventWithMetadata,
): Promise<{
  max_capacity: number;
  current_registrations: number;
  reserved_slots: number;
  available: number;
  is_full: boolean;
}> {
  // Prefer metadata values over event values
  const maxCapacity = event.metadata?.max_capacity ?? event.max_capacity ?? 0;

  // Unlimited capacity
  if (maxCapacity === 0) {
    return {
      max_capacity: 0,
      current_registrations:
        event.metadata?.current_registrations ??
        event.current_registrations ??
        0,
      reserved_slots: 0,
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

  // Count active slot reservations (not expired)
  const now = new Date().toISOString();
  const reservationsResult = await db.listDocuments(
    DATABASE_ID,
    SLOT_RESERVATIONS_COLLECTION_ID,
    [
      Query.equal("event_id", event.$id),
      Query.equal("status", "active"),
      Query.greaterThan("expires_at", now),
      Query.limit(1),
    ],
  );
  const reservedSlots = reservationsResult.total;

  const available = maxCapacity - currentRegistrations - reservedSlots;

  return {
    max_capacity: maxCapacity,
    current_registrations: currentRegistrations,
    reserved_slots: reservedSlots,
    available: Math.max(0, available),
    is_full: available <= 0,
  };
}
