'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { databases } from '@/lib/appwrite';
import { DATABASE_ID, EVENTS_COLLECTION_ID, SOCIETIES_COLLECTION_ID } from '@/lib/constants/collections';
import { Query } from 'appwrite';
import { Event, Society } from '@/types';
import { AdminLayout, AdminEventCard, ConfirmDialog } from '@/components/admin';
import {
    Plus,
    Search,
    Filter,
    Calendar,
    Loader2,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | 'upcoming' | 'past' | 'draft';

export default function AdminEventsPage() {
    const { userTeams } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<(Event & { society?: Society })[]>([]);
    const [societies, setSocieties] = useState<Society[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [societyFilter, setSocietyFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; eventId: string | null }>({
        isOpen: false,
        eventId: null,
    });
    const [deleting, setDeleting] = useState(false);

    // Get user's society slugs
    const getUserSocietySlugs = useCallback(() => {
        // Check if user is in admins team (global admin)
        const isGlobalAdmin = userTeams.some(team => 
            team.$id === 'admins' || team.name?.toLowerCase() === 'admins'
        );
        
        // Global admins get access to all societies
        if (isGlobalAdmin) {
            return null; // null means "all societies"
        }
        
        // Otherwise, get chair teams
        return userTeams
            .filter(team => team.$id?.startsWith('chair_') || team.name?.toLowerCase().startsWith('chair_'))
            .map(team => {
                const id = team.$id || team.name || '';
                return id.replace('chair_', '');
            });
    }, [userTeams]);

    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true);
            const societySlugs = getUserSocietySlugs();

            // Fetch all societies
            const societiesRes = await databases.listDocuments(
                DATABASE_ID,
                SOCIETIES_COLLECTION_ID,
                [Query.limit(100)]
            );
            const allSocieties = societiesRes.documents as unknown as Society[];
            
            // If societySlugs is null (global admin), show all societies
            // Otherwise filter societies user is chair of
            const userSocieties = societySlugs === null 
                ? allSocieties 
                : allSocieties.filter(s => societySlugs.includes(s.slug));
            setSocieties(userSocieties);

            const societyIds = userSocieties.map(s => s.$id);

            // For global admins, don't filter by society if no societies loaded yet
            if (societyIds.length === 0 && societySlugs !== null) {
                setEvents([]);
                setLoading(false);
                return;
            }

            // Build query based on filters
            const queries: string[] = [
                Query.equal('is_deleted', false), // Filter out soft-deleted events
                Query.orderDesc('date'),
                Query.limit(100),
            ];
            
            // Only filter by society_id if not global admin or if specific society selected
            if (societyIds.length > 0 && societySlugs !== null) {
                queries.unshift(Query.equal('society_id', societyIds));
            }

            // Fetch events
            const eventsRes = await databases.listDocuments(
                DATABASE_ID,
                EVENTS_COLLECTION_ID,
                queries
            );
            const eventsData = eventsRes.documents as unknown as Event[];

            // Attach society data
            const eventsWithSociety = eventsData.map(event => ({
                ...event,
                society: allSocieties.find(s => s.$id === event.society_id),
            }));

            setEvents(eventsWithSociety);
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error('Failed to load events');
        } finally {
            setLoading(false);
        }
    }, [getUserSocietySlugs]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Filter events based on search and filters
    const filteredEvents = events.filter(event => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesTitle = event.title.toLowerCase().includes(query);
            const matchesSociety = event.society?.name.toLowerCase().includes(query);
            if (!matchesTitle && !matchesSociety) return false;
        }

        // Status filter
        const now = new Date();
        const eventDate = new Date(event.date);
        
        if (statusFilter === 'upcoming' && (eventDate < now || event.status === 'draft')) return false;
        if (statusFilter === 'past' && eventDate > now) return false;
        if (statusFilter === 'draft' && event.status !== 'draft') return false;

        // Society filter
        if (societyFilter !== 'all' && event.society_id !== societyFilter) return false;

        return true;
    });

    const handleDelete = async () => {
        if (!deleteDialog.eventId) return;

        try {
            setDeleting(true);
            // Archive via admin API so server-side auth and soft-delete fields are applied consistently
            const response = await fetch(`/api/admin/events/${deleteDialog.eventId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.message || 'Failed to archive event');
            }
             
            toast.success('Event archived successfully');
            setDeleteDialog({ isOpen: false, eventId: null });
            fetchEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            toast.error('Failed to archive event');
        } finally {
            setDeleting(false);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setSocietyFilter('all');
    };

    const hasActiveFilters = searchQuery || statusFilter !== 'all' || societyFilter !== 'all';

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
                        <p className="text-gray-500 mt-1">
                            Manage your society events
                        </p>
                    </div>
                    <Link
                        href="/admin/events/create"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-ieee-blue text-white font-medium rounded-xl hover:bg-ieee-blue/90 transition-colors shadow-lg shadow-ieee-blue/20"
                    >
                        <Plus className="w-5 h-5" />
                        Create Event
                    </Link>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search events..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue transition-colors"
                            />
                        </div>

                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-colors ${
                                showFilters || hasActiveFilters
                                    ? 'border-ieee-blue bg-ieee-blue/5 text-ieee-blue'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Filter className="w-5 h-5" />
                            <span className="font-medium">Filters</span>
                            {hasActiveFilters && (
                                <span className="w-2 h-2 bg-ieee-blue rounded-full" />
                            )}
                        </button>
                    </div>

                    {/* Filter Options */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-4 mt-4 border-t border-gray-100 flex flex-wrap gap-4">
                                    {/* Status Filter */}
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Status
                                        </label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue"
                                        >
                                            <option value="all">All Events</option>
                                            <option value="upcoming">Upcoming</option>
                                            <option value="past">Past</option>
                                            <option value="draft">Draft</option>
                                        </select>
                                    </div>

                                    {/* Society Filter */}
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Society
                                        </label>
                                        <select
                                            value={societyFilter}
                                            onChange={(e) => setSocietyFilter(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue"
                                        >
                                            <option value="all">All Societies</option>
                                            {societies.map((society) => (
                                                <option key={society.$id} value={society.$id}>
                                                    {society.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Clear Filters */}
                                    {hasActiveFilters && (
                                        <div className="flex items-end">
                                            <button
                                                onClick={clearFilters}
                                                className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                                Clear
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Results Count */}
                {!loading && (
                    <p className="text-sm text-gray-500">
                        Showing {filteredEvents.length} of {events.length} events
                    </p>
                )}

                {/* Events List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-ieee-blue animate-spin" />
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {hasActiveFilters ? 'No matching events' : 'No events yet'}
                        </h3>
                        <p className="text-gray-500 mb-6">
                            {hasActiveFilters
                                ? 'Try adjusting your filters or search query'
                                : 'Create your first event to get started'}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                onClick={clearFilters}
                                className="inline-flex items-center gap-2 px-4 py-2 text-ieee-blue hover:bg-ieee-blue/5 rounded-xl transition-colors font-medium"
                            >
                                Clear Filters
                            </button>
                        ) : (
                            <Link
                                href="/admin/events/create"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-ieee-blue text-white font-medium rounded-xl hover:bg-ieee-blue/90 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Create Event
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredEvents.map((event, index) => (
                            <motion.div
                                key={event.$id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <AdminEventCard
                                    event={event}
                                    registrationCount={0}
                                    onEdit={() => router.push(`/admin/events/${event.$id}/edit`)}
                                    onViewRegistrations={() => router.push(`/admin/events/${event.$id}/registrations`)}
                                    onCheckin={() => router.push(`/admin/events/${event.$id}/check-in`)}
                                    onDelete={() => setDeleteDialog({ isOpen: true, eventId: event.$id })}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteDialog.isOpen}
                onClose={() => setDeleteDialog({ isOpen: false, eventId: null })}
                onConfirm={handleDelete}
                title="Archive Event"
                message="Are you sure you want to archive this event? The event will be hidden from the public but registration data will be preserved."
                confirmText="Archive Event"
                variant="warning"
                loading={deleting}
            />
        </AdminLayout>
    );
}
