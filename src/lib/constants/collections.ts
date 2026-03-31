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
 * 
 * Active collections only.
 */

// Database ID
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '69958465003804b8fe9d';

// Collection IDs - centralized source of truth
export const COLLECTIONS = {
  // Core collections (post-migration)
  EVENTS: process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID || 'events',
  EVENT_REGISTRATIONS: process.env.NEXT_PUBLIC_APPWRITE_EVENT_REGISTRATIONS_COLLECTION_ID || 'event_registrations',
  
  // User and society management
  SOCIETIES: process.env.NEXT_PUBLIC_APPWRITE_SOCIETIES_COLLECTION_ID || 'societies',
  MEMBERS: process.env.NEXT_PUBLIC_APPWRITE_MEMBERS_COLLECTION_ID || 'members',
  EXECOM: process.env.NEXT_PUBLIC_APPWRITE_EXECOM_COLLECTION_ID || 'execom_members',
  
  // Email logging
  EMAIL_LOGS: process.env.NEXT_PUBLIC_APPWRITE_EMAIL_LOGS_COLLECTION_ID || 'email_logs',
  
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
  const required: CollectionKey[] = ['EVENTS', 'EVENT_REGISTRATIONS', 'SOCIETIES'];
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

// Collection exports
export const EVENTS_COLLECTION_ID = COLLECTIONS.EVENTS;
export const EVENT_REGISTRATIONS_COLLECTION_ID = COLLECTIONS.EVENT_REGISTRATIONS;
export const REGISTRATIONS_COLLECTION_ID = COLLECTIONS.EVENT_REGISTRATIONS;
export const SOCIETIES_COLLECTION_ID = COLLECTIONS.SOCIETIES;
export const MEMBERS_COLLECTION_ID = COLLECTIONS.MEMBERS;
export const EXECOM_COLLECTION_ID = COLLECTIONS.EXECOM;
export const EMAIL_LOGS_COLLECTION_ID = COLLECTIONS.EMAIL_LOGS;

