import React from 'react';
import { databases, DATABASE_ID, EVENTS_COLLECTION_ID, SOCIETIES_COLLECTION_ID } from '@/lib/appwrite';
import EventsHero from '@/components/EventsHero';
import Navbar from '@/components/Navbar';
import { GridBackground } from '@/components/GridBackground';
import { FloatingIcons } from '@/components/FloatingIcons';
import { TechnicalDetails } from '@/components/TechnicalDetails';
import { Event, Society } from '@/types';
import { Query } from 'appwrite';
import EventsPageClient from './components/EventsPageClient';
import Footer from '@/components/Footer';

async function getEvents() {
    try {
        // Fetch both published and completed events
        const eventsResponse = await databases.listDocuments(
            DATABASE_ID,
            EVENTS_COLLECTION_ID,
            [
                Query.orderDesc('date'),
                Query.limit(100)
            ]
        );

        // Fetch all societies for reference
        const societiesResponse = await databases.listDocuments(
            DATABASE_ID,
            SOCIETIES_COLLECTION_ID
        );

        const societiesMap = new Map(
            (societiesResponse.documents as unknown as Society[]).map((s) => [s.$id, s])
        );

        // Attach society data to events and filter only published/completed
        // Serialize to plain objects to avoid Next.js serialization errors
        const eventsWithSocieties = eventsResponse.documents
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
                        $createdAt: society.$createdAt,
                        $updatedAt: society.$updatedAt,
                        name: society.name,
                        slug: society.slug,
                        bio: society.bio,
                        logo_url: society.logo_url,
                        banner_url: society.banner_url,
                    } : undefined,
                } as Event & { society?: Society };
            });

        return eventsWithSocieties;
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
}

export default async function EventsPage({
    searchParams,
}: {
    searchParams: Promise<{ society?: string }>;
}) {
    const allEvents = await getEvents();
    const params = await searchParams;

    // Filter by society if query param exists
    const filteredEvents = params.society
        ? allEvents.filter((event) => event.society_id === params.society)
        : allEvents;

    // Separate upcoming and past events
    const now = new Date();
    const upcomingEvents = filteredEvents.filter(
        (event) => event.status === 'published' && new Date(event.date) >= now
    );
    const pastEvents = filteredEvents.filter(
        (event) => event.status === 'completed' || (event.status === 'published' && new Date(event.date) < now)
    );

    // Get flagship event (next upcoming event)
    const flagshipEvent = upcomingEvents[0];

    console.log('Events loaded:', {
        total: allEvents.length,
        filtered: filteredEvents.length,
        upcoming: upcomingEvents.length,
        past: pastEvents.length,
        societyFilter: params.society
    });

    return (
        <div className="relative w-full bg-white text-gray-900 font-sans min-h-screen">
            {/* Background Elements - Same as Hero */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <GridBackground />
                <FloatingIcons />
                <TechnicalDetails />
            </div>

            <Navbar />
            
            {/* Hero Section */}
            <div className="relative z-10">
                <EventsHero flagshipEvent={flagshipEvent} />
            </div>

            {/* Events Content - Client Component for Interactivity */}
            <EventsPageClient 
                upcomingEvents={upcomingEvents}
                pastEvents={pastEvents}
                hasSocietyFilter={!!params.society}
            />

            {/* Footer */}
            <Footer />
        </div>
    );
}
