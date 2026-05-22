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
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';

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
type CollectionKey = keyof typeof COLLECTIONS;

// Collection exports
export const EVENTS_COLLECTION_ID = COLLECTIONS.EVENTS;
export const EVENT_REGISTRATIONS_COLLECTION_ID = COLLECTIONS.EVENT_REGISTRATIONS;
export const REGISTRATIONS_COLLECTION_ID = COLLECTIONS.EVENT_REGISTRATIONS;
export const SOCIETIES_COLLECTION_ID = COLLECTIONS.SOCIETIES;
export const MEMBERS_COLLECTION_ID = COLLECTIONS.MEMBERS;
export const EXECOM_COLLECTION_ID = COLLECTIONS.EXECOM;
export const EMAIL_LOGS_COLLECTION_ID = COLLECTIONS.EMAIL_LOGS;

