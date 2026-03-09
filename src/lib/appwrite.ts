import { Client, Account, Databases, Storage, Teams } from 'appwrite';

// Initialize Appwrite Client
const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

// Services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const teams = new Teams(client);

// Collection IDs (will be set after Appwrite setup)
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
export const SOCIETIES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SOCIETIES_COLLECTION_ID || '';
export const EVENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID || '';
export const EXECOM_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EXECOM_COLLECTION_ID || '';
export const MEMBERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_MEMBERS_COLLECTION_ID || '';

// Storage Bucket IDs
export const SOCIETY_IMAGES_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_SOCIETY_IMAGES_BUCKET_ID || '';

export { client };
