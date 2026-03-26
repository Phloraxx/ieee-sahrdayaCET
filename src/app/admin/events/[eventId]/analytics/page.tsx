'use client';

import React, { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, 
    Calendar, 
    MapPin, 
    Users, 
    Loader2,
    ExternalLink,
    Settings,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { AdminLayout } from '@/components/admin';
import { EventAnalytics } from '@/components/admin/EventAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { databases, DATABASE_ID, EVENTS_COLLECTION_ID, SOCIETIES_COLLECTION_ID } from '@/lib/appwrite';
import { Event, Society } from '@/types';
import toast from 'react-hot-toast';

interface PageProps {
    params: Promise<{ eventId: string }>;
}

export default function EventAnalyticsPage({ params }: PageProps) {
    const { eventId } = use(params);
    const router = useRouter();
    const { userTeams, loading: authLoading } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [society, setSociety] = useState<Society | null>(null);
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    // Get user's chair society slugs
    const getUserSocietySlugs = useCallback(() => {
        return userTeams
            .filter(team => team.$id?.startsWith('chair_') || team.name?.toLowerCase().startsWith('chair_'))
            .map(team => {
                const id = team.$id || team.name || '';
                return id.replace('chair_', '');
            });
    }, [userTeams]);

    // Fetch event and verify authorization
    useEffect(() => {
        const fetchEventData = async () => {
            try {
                setLoading(true);
                
                // Fetch event
                const eventDoc = await databases.getDocument(
                    DATABASE_ID,
                    EVENTS_COLLECTION_ID,
                    eventId
                ) as unknown as Event;
                setEvent(eventDoc);

                // Fetch society
                const societyDoc = await databases.getDocument(
                    DATABASE_ID,
                    SOCIETIES_COLLECTION_ID,
                    eventDoc.society_id
                ) as unknown as Society;
                setSociety(societyDoc);

                // Check if user is chair of this society
                const userSlugs = getUserSocietySlugs();
                const isChair = userSlugs.includes(societyDoc.slug);
                
                if (!isChair) {
                    toast.error('You are not authorized to view analytics for this event');
                    router.push('/admin/events');
                    return;
                }

                setAuthorized(true);
            } catch (error) {
                console.error('Error fetching event:', error);
                toast.error('Failed to load event');
                router.push('/admin/events');
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            fetchEventData();
        }
    }, [eventId, authLoading, getUserSocietySlugs, router]);

    // Loading state
    if (loading || authLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 text-ieee-blue animate-spin mx-auto" />
                        <p className="mt-4 text-gray-600">Loading analytics...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    // Not authorized
    if (!authorized || !event) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <p className="text-gray-600">Redirecting...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });

    const isPast = eventDate < new Date();

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Back Button */}
                <Link
                    href="/admin/events"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back to Events</span>
                </Link>

                {/* Event Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                    <div className="flex flex-col md:flex-row">
                        {/* Event Banner */}
                        <div className="relative w-full md:w-64 h-40 md:h-auto bg-gray-100 flex-shrink-0">
                            {event.banner_url ? (
                                <Image
                                    src={event.banner_url}
                                    alt={event.title}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Calendar className="w-12 h-12 text-gray-300" />
                                </div>
                            )}
                            {/* Status Badge */}
                            <div className="absolute top-3 left-3">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                    isPast 
                                        ? 'bg-gray-100 text-gray-700'
                                        : event.status === 'published'
                                        ? 'bg-green-100 text-green-700'
                                        : event.status === 'draft'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {isPast ? 'Past Event' : event.status}
                                </span>
                            </div>
                        </div>

                        {/* Event Info */}
                        <div className="flex-1 p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    {/* Society */}
                                    {society && (
                                        <p className="text-xs font-medium text-ieee-blue uppercase tracking-wide mb-1">
                                            {society.name}
                                        </p>
                                    )}

                                    {/* Title */}
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {event.title}
                                    </h1>

                                    {/* Details */}
                                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span>{formattedDate} at {formattedTime}</span>
                                        </div>
                                        {event.venue && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                <span>{event.venue}</span>
                                            </div>
                                        )}
                                        {event.max_capacity && (
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-gray-400" />
                                                <span>Capacity: {event.max_capacity}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Price */}
                                    <div className="mt-3">
                                        {event.price === 0 ? (
                                            <span className="text-green-600 font-bold">FREE EVENT</span>
                                        ) : (
                                            <span className="font-bold text-gray-900">
                                                Entry: ₹{event.price}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        href={`/admin/events/${eventId}/registrations`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ieee-blue bg-ieee-blue/10 hover:bg-ieee-blue/20 rounded-lg transition-colors"
                                    >
                                        <Users className="w-4 h-4" />
                                        Registrations
                                    </Link>
                                    <Link
                                        href={`/admin/events/${eventId}/check-in`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Check-in
                                    </Link>
                                    <Link
                                        href={`/admin/events/${eventId}/edit`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Edit
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Analytics Component */}
                <EventAnalytics eventId={eventId} />
            </div>
        </AdminLayout>
    );
}
