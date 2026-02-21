import React from 'react';
import { databases, DATABASE_ID, EVENTS_COLLECTION_ID, SOCIETIES_COLLECTION_ID } from '@/lib/appwrite';
import EventsHero from '@/components/EventsHero';
import EventCard from '@/components/EventCard';
import Navbar from '@/components/Navbar';
import { GridBackground } from '@/components/GridBackground';
import { FloatingIcons } from '@/components/FloatingIcons';
import { TechnicalDetails } from '@/components/TechnicalDetails';
import { Event, Society } from '@/types';
import { Query } from 'appwrite';

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
            societiesResponse.documents.map((s: any) => [s.$id, s as Society])
        );

        // Attach society data to events and filter only published/completed
        // Serialize to plain objects to avoid Next.js serialization errors
        const eventsWithSocieties = eventsResponse.documents
            .filter((event: any) => event.status === 'published' || event.status === 'completed')
            .map((event: any) => {
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
        (event) => event.status === 'completed'
    );

    // Get flagship event (next upcoming event)
    const flagshipEvent = upcomingEvents[0];

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

            {/* Upcoming Events Section */}
            <section className="relative z-10 py-20 px-6 max-w-7xl mx-auto">
                <div className="mb-12">
                    <h2 className="font-pixel text-3xl md:text-4xl text-gray-900 mb-4">
                        UPCOMING EVENTS
                    </h2>
                    {params.society && (
                        <p className="text-gray-600">
                            Filtered by society
                        </p>
                    )}
                </div>

                {upcomingEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {upcomingEvents.map((event) => (
                            <EventCard key={event.$id} event={event} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📅</div>
                        <p className="text-gray-600 text-lg">
                            No upcoming events at the moment. Check back soon!
                        </p>
                    </div>
                )}
            </section>

            {/* Past Events - Hall of Fame */}
            {pastEvents.length > 0 && (
                <section className="relative z-10 py-20 px-6 bg-gradient-to-b from-white via-gray-50/50 to-white">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-12 text-center">
                            <h2 className="font-pixel text-3xl md:text-5xl text-gray-900 mb-4">
                                PAST EVENTS
                            </h2>
                            <p className="text-gray-600 text-lg">
                                Successfully Completed Events
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pastEvents.map((event) => (
                                <EventCard key={event.$id} event={event} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Footer Spacer */}
            <div className="h-20" />
        </div>
    );
}
