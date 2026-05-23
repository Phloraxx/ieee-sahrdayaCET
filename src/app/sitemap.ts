import { MetadataRoute } from 'next';
import { getDatabases, DATABASE_ID, EVENTS_COLLECTION_ID } from '@/lib/api/appwrite-admin';
import { Query } from 'node-appwrite';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ieeesahrdaya.com';

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/societies`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/full-execom`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },

  ];

  try {
    const db = getDatabases();
    const events = await db.listDocuments(
      DATABASE_ID,
      EVENTS_COLLECTION_ID,
      [Query.equal('status', 'published'), Query.limit(100)]
    );

    for (const event of events.documents) {
      entries.push({
        url: `${baseUrl}/events`,
        lastModified: new Date(event.$updatedAt || event.$createdAt),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch {
    // If Appwrite is unavailable, serve the static sitemap
  }

  return entries;
}
