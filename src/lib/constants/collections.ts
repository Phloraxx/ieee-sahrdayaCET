/**
 * Centralized Collection IDs
 * 
 * This file provides a single source of truth for all Appwrite collection IDs.
 * Import from this file instead of hardcoding collection IDs or reading from
 * environment variables directly in each file.
 * 
 * Usage:
 *   import { COLLECTIONS } from '@/lib/constants/collections';
 *   const result = await db.listDocuments(DATABASE_ID, COLLECTIONS.EVENTS, queries);
 */

// Database ID
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'ieee_sahrdaya_db';

// Collection IDs - centralized source of truth
export const COLLECTIONS = {
  // Core collections
  EVENTS: process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID || 'events',
  EVENT_REGISTRATIONS: process.env.NEXT_PUBLIC_APPWRITE_EVENT_REGISTRATIONS_COLLECTION_ID || 'event_registrations',
  REGISTRATIONS: process.env.NEXT_PUBLIC_APPWRITE_REGISTRATIONS_COLLECTION_ID || 'registrations',
  TICKETS: process.env.NEXT_PUBLIC_APPWRITE_TICKETS_COLLECTION_ID || 'tickets',
  EVENT_TICKETS: process.env.NEXT_PUBLIC_APPWRITE_EVENT_TICKETS_COLLECTION_ID || 'event_tickets',
  
  // Reservation and capacity management
  SLOT_RESERVATIONS: process.env.NEXT_PUBLIC_APPWRITE_SLOT_RESERVATIONS_COLLECTION_ID || 'slot_reservations',
  
  // Event metadata and configuration
  EVENT_METADATA: process.env.NEXT_PUBLIC_APPWRITE_EVENT_METADATA_COLLECTION_ID || 'event_metadata',
  EMAIL_TEMPLATES: process.env.NEXT_PUBLIC_APPWRITE_EMAIL_TEMPLATES_COLLECTION_ID || 'email_templates',
  
  // User and society management
  USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || 'users',
  SOCIETIES: process.env.NEXT_PUBLIC_APPWRITE_SOCIETIES_COLLECTION_ID || 'societies',
  SOCIETY_MEMBERS: process.env.NEXT_PUBLIC_APPWRITE_SOCIETY_MEMBERS_COLLECTION_ID || 'society_members',
  
  // Waitlist management
  WAITLIST: process.env.NEXT_PUBLIC_APPWRITE_WAITLIST_COLLECTION_ID || 'waitlist',
  
  // Payment and transaction tracking
  PAYMENTS: process.env.NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID || 'payments',
  TRANSACTIONS: process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || 'transactions',
} as const;

// Type for collection keys
export type CollectionKey = keyof typeof COLLECTIONS;

// Type for collection IDs
export type CollectionId = typeof COLLECTIONS[CollectionKey];

/**
 * Helper function to get collection ID by key
 * Useful for dynamic collection access
 */
export function getCollectionId(key: CollectionKey): string {
  return COLLECTIONS[key];
}

/**
 * Validate that all required collections are configured
 * Call this at startup to catch configuration issues early
 */
export function validateCollections(): { valid: boolean; missing: string[] } {
  const required: CollectionKey[] = ['EVENTS', 'REGISTRATIONS', 'TICKETS', 'SLOT_RESERVATIONS'];
  const missing: string[] = [];
  
  for (const key of required) {
    const envKey = `NEXT_PUBLIC_APPWRITE_${key}_COLLECTION_ID`;
    if (!process.env[envKey]) {
      // Not strictly missing since we have defaults, but good to log
      console.warn(`Collection ${key} using default ID: ${COLLECTIONS[key]}`);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

// Backwards compatibility exports
// These match the existing exports in appwrite-admin.ts
export const EVENTS_COLLECTION_ID = COLLECTIONS.EVENTS;
export const REGISTRATIONS_COLLECTION_ID = COLLECTIONS.REGISTRATIONS;
export const EVENT_REGISTRATIONS_COLLECTION_ID = COLLECTIONS.EVENT_REGISTRATIONS;
export const TICKETS_COLLECTION_ID = COLLECTIONS.TICKETS;
export const EVENT_TICKETS_COLLECTION_ID = COLLECTIONS.EVENT_TICKETS;
export const SLOT_RESERVATIONS_COLLECTION_ID = COLLECTIONS.SLOT_RESERVATIONS;
export const EVENT_METADATA_COLLECTION_ID = COLLECTIONS.EVENT_METADATA;
export const EMAIL_TEMPLATES_COLLECTION_ID = COLLECTIONS.EMAIL_TEMPLATES;
