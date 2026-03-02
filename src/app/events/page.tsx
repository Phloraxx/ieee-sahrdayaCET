import type { Metadata } from 'next';
import React from 'react';
import { databases, DATABASE_ID, EVENTS_COLLECTION_ID, SOCIETIES_COLLECTION_ID } from '@/lib/appwrite';

export const metadata: Metadata = {
  title: 'Events & Workshops',
  description:
    'Upcoming IEEE Sahrdaya events — workshops, hackathons, seminars and competitions at Sahrdaya College of Engineering, Thrissur, Kerala.',
  openGraph: {
    title: 'Events & Workshops | IEEE Sahrdaya',
    description:
      'Explore upcoming IEEE workshops, hackathons and seminars organised by IEEE Sahrdaya Student Branch, Sahrdaya College, Kerala.',
    url: 'https://ieeesahrdaya.com/events',
    images: [
      {
        url: '/AGM.webp',
        width: 1200,
        height: 630,
        alt: 'IEEE Sahrdaya Events',
      },
    ],
  },
  alternates: {
    canonical: 'https://ieeesahrdaya.com/events',
  },
};
import { Event, Society } from '@/types';
import { Query } from 'appwrite';
import Navbar from '@/components/Navbar';
import { GridBackground } from '@/components/GridBackground';
import { TechnicalDetails } from '@/components/TechnicalDetails';
import BentoLayout from './components/BentoLayout';
import AsymmetricHero from './components/AsymmetricHero';
import BentoEventCard from './components/BentoEventCard';
import ArchiveCarousel from './components/ArchiveCarousel';

async function getEvents() {
    try {
        const eventsResponse = await databases.listDocuments(
            DATABASE_ID,
            EVENTS_COLLECTION_ID,
            [Query.orderDesc('date'), Query.limit(100)]
        );

        const societiesResponse = await databases.listDocuments(
            DATABASE_ID,
            SOCIETIES_COLLECTION_ID
        );

        const societiesMap = new Map(
            (societiesResponse.documents as unknown as Society[]).map((s) => [s.$id, s])
        );

        return eventsResponse.documents
            .filter((event) => event.status === 'published' || event.status === 'completed')
            .map((event) => {
                const society = societiesMap.get(event.society_id);
                return {
                    $id: event.$id,
                    $createdAt: event.$createdAt,
                    $updatedAt: event.$updatedAt,
                    title: event.title,
                    description: event.description,
                    date: event.date,
                    venue: event.venue,
                    price: event.price,
                    banner_url: event.banner_url,
                    society_id: event.society_id,
                    status: event.status,
                    max_capacity: event.max_capacity,
                    society: society ? {
                        $id: society.$id,
                        name: society.name,
                        logo_url: society.logo_url,
                    } : undefined,
                } as Event & { society?: Society };
            });
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
}

export default async function Events1Page({
    searchParams,
}: {
    searchParams: Promise<{ society?: string }>;
}) {
    const allEvents = await getEvents();
    const params = await searchParams;

    const filteredEvents = params.society
        ? allEvents.filter((event) => event.society_id === params.society)
        : allEvents;

    const now = new Date();
    const upcomingEvents = filteredEvents.filter(
        (event) => event.status === 'published' && new Date(event.date) >= now
    );
    const pastEvents = filteredEvents.filter(
        (event) => event.status === 'completed'
    );

    const flagshipEvent = upcomingEvents[0];

    return (
        <div className="relative w-full bg-[#f9fafb] text-gray-900 font-sans min-h-[100dvh]">
            {/* Ambient Background Grid (Static) */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-80">
                <GridBackground />
                <TechnicalDetails />
            </div>

            <Navbar />

            <main className="relative z-10 pt-24 pb-32 px-4 md:px-8 max-w-[1400px] mx-auto min-h-screen">
                <AsymmetricHero flagshipEvent={flagshipEvent} />

                {/* Main Bento Grid Areas */}
                <div className="mt-32">
                    <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-200 pb-8">
                        <div>
                            <h2 className="text-4xl md:text-6xl tracking-tighter leading-none font-medium custom-font-geist">
                                Upcoming <span className="text-gray-400">Events</span>
                            </h2>
                            <p className="text-gray-500 mt-4 text-lg max-w-[65ch]">
                                {params.society ? `Filtered by ${params.society} society` : 'Discover our next workshops, hackathons, and seminars.'}
                            </p>
                        </div>
                        {/* Example metric or secondary info (Cockpit dense style) */}
                        <div className="flex gap-8 text-sm">
                            <div className="flex flex-col">
                                <span className="text-gray-400 uppercase tracking-widest text-[10px] font-bold">Active Count</span>
                                <span className="font-mono text-2xl text-gray-900">{upcomingEvents.length.toString().padStart(2, '0')}</span>
                            </div>
                        </div>
                    </div>

                    {upcomingEvents.length > 0 ? (
                        <BentoLayout>
                            {upcomingEvents.map((event, index) => (
                                <BentoEventCard key={event.$id} event={event} index={index} />
                            ))}
                        </BentoLayout>
                    ) : (
                        <div className="py-32 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-[2.5rem] bg-white/50 backdrop-blur-sm">
                            <div className="text-6xl mb-6 opacity-50 grayscale transition-all duration-700 hover:grayscale-0">🎯</div>
                            <h3 className="text-2xl font-medium tracking-tight">No Active Events</h3>
                            <p className="text-gray-500 mt-2">Our calendar is currently resetting. Check back soon.</p>
                        </div>
                    )}
                </div>

                {/* Past Events Hall of Fame */}
                {pastEvents.length > 0 && (
                    <div className="mt-40">
                        <div className="mb-10 flex items-end justify-between border-b border-gray-200 pb-6">
                            <h2 className="text-3xl md:text-5xl tracking-tighter leading-none font-medium custom-font-geist">
                                Past <span className="text-gray-400">Archive</span>
                            </h2>
                        </div>
                        <ArchiveCarousel>
                            {pastEvents.map((event, index) => (
                                <BentoEventCard key={`archive-${event.$id}-${index}`} event={event} index={index} isArchived />
                            ))}
                        </ArchiveCarousel>
                    </div>
                )}
            </main>
        </div>
    );
}
