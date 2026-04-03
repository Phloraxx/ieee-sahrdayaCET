'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLayout, StatsCard } from '@/components/admin';
import {
    CheckSquare,
    Calendar,
    Users,
    TrendingUp,
    Search,
    ChevronDown,
    ChevronUp,
    Clock,
    User,
    Mail,
    Ticket,
    ExternalLink,
    RefreshCw,
    Loader2,
    X,
    MapPin,
    AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { account } from '@/lib/appwrite';

// Types
interface CheckInEntry {
    id: string;
    registrationId: string;
    studentName: string;
    email: string;
    ticketId: string;
    checkedInAt: string;
    location?: string;
}

interface EventWithCheckIns {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    societyId: string;
    societyName?: string;
    totalRegistered: number;
    totalCheckedIn: number;
    recentCheckIns: CheckInEntry[];
    lastCheckInAt?: string;
}

interface OverviewStats {
    totalCheckInsToday: number;
    totalCheckInsAllTime: number;
    eventsWithCheckIns: number;
    mostRecentCheckIn?: {
        eventTitle: string;
        studentName: string;
        checkedInAt: string;
    };
}

interface SearchResult {
    registrationId: string;
    ticketId: string;
    studentName: string;
    email: string;
    isCheckedIn: boolean;
    checkedInAt?: string;
    lastLocation?: string;
    eventId: string;
    eventTitle: string;
}

export default function CheckinsPage() {
    const [events, setEvents] = useState<EventWithCheckIns[]>([]);
    const [stats, setStats] = useState<OverviewStats>({
        totalCheckInsToday: 0,
        totalCheckInsAllTime: 0,
        eventsWithCheckIns: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    
    // Expanded event details
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
    
    // Auto-refresh
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    // Fetch check-in overview
    const fetchOverview = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Add JWT headers for authentication
            const headers: HeadersInit = {};
            
            try {
                const jwt = await account.createJWT();
                if (jwt?.jwt) {
                    headers['x-appwrite-jwt'] = jwt.jwt;
                }
            } catch (error) {
                console.error('Failed to generate JWT:', error);
            }

            const response = await fetch('/api/admin/check-in/overview', {
                headers,
                credentials: 'include',
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to fetch check-in data');
            }

            const data = await response.json();
            setEvents(data.events || []);
            setStats(data.stats || {
                totalCheckInsToday: 0,
                totalCheckInsAllTime: 0,
                eventsWithCheckIns: 0,
            });
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Error fetching overview:', err);
            setError(err instanceof Error ? err.message : 'Failed to load check-in data');
        } finally {
            setLoading(false);
        }
    }, []);

    // Search across all events
    const performSearch = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        try {
            setSearchLoading(true);
            setIsSearching(true);

            // Add JWT headers for authentication
            const headers: HeadersInit = {};
            
            try {
                const jwt = await account.createJWT();
                if (jwt?.jwt) {
                    headers['x-appwrite-jwt'] = jwt.jwt;
                }
            } catch (error) {
                console.error('Failed to generate JWT:', error);
            }

            const response = await fetch(`/api/admin/check-in/search-all?q=${encodeURIComponent(query)}`, {
                headers,
                credentials: 'include',
            });
            
            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            setSearchResults(data.results || []);
        } catch (err) {
            console.error('Search error:', err);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, performSearch]);

    // Initial fetch
    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    // Auto-refresh every 30 seconds if enabled
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchOverview();
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefresh, fetchOverview]);

    // Toggle event expansion
    const toggleEvent = (eventId: string) => {
        setExpandedEventId(expandedEventId === eventId ? null : eventId);
    };

    // Clear search
    const clearSearch = () => {
        setSearchTerm('');
        setSearchResults([]);
        setIsSearching(false);
    };

    // Format date
    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    // Format time
    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Format relative time
    const formatRelativeTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(isoString);
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Check-in Activity</h1>
                        <p className="text-gray-500 mt-1">
                            View check-in activity across all your events
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                                autoRefresh
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                        >
                            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                            <span className="text-sm font-medium">
                                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                            </span>
                        </button>
                        <button
                            onClick={fetchOverview}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-ieee-blue text-white rounded-lg hover:bg-ieee-blue/90 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="text-sm font-medium">Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Check-ins Today"
                        value={stats.totalCheckInsToday}
                        subtitle="Since midnight"
                        icon={CheckSquare}
                        loading={loading}
                    />
                    <StatsCard
                        title="Total Check-ins"
                        value={stats.totalCheckInsAllTime}
                        subtitle="All time"
                        icon={Users}
                        loading={loading}
                    />
                    <StatsCard
                        title="Events Active"
                        value={stats.eventsWithCheckIns}
                        subtitle="With check-ins"
                        icon={Calendar}
                        loading={loading}
                    />
                    <StatsCard
                        title="Most Recent"
                        value={stats.mostRecentCheckIn?.studentName.split(' ')[0] || '—'}
                        subtitle={stats.mostRecentCheckIn 
                            ? formatRelativeTime(stats.mostRecentCheckIn.checkedInAt)
                            : 'No check-ins yet'}
                        icon={TrendingUp}
                        loading={loading}
                    />
                </div>

                {/* Global Search */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Search className="w-5 h-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900">Search Attendees</h3>
                    </div>
                    
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or ticket ID across all events..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue"
                        />
                        {searchTerm && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        )}
                    </div>

                    {/* Search Results */}
                    <AnimatePresence>
                        {isSearching && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4"
                            >
                                {searchLoading ? (
                                    <div className="py-8 text-center">
                                        <Loader2 className="w-6 h-6 text-ieee-blue mx-auto mb-2 animate-spin" />
                                        <p className="text-sm text-gray-500">Searching...</p>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">
                                            {searchTerm.length < 2 
                                                ? 'Enter at least 2 characters to search'
                                                : 'No attendees found matching your search'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                        <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Attendee
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Event
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                    {searchResults.map((result) => (
                                                        <tr key={result.registrationId} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-medium text-gray-900">
                                                                        {result.studentName}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        {result.email}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                                {result.eventTitle}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {result.isCheckedIn ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                                        <CheckSquare className="w-3 h-3" />
                                                                        Checked In
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                                                        <Clock className="w-3 h-3" />
                                                                        Pending
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Link
                                                                    href={`/admin/events/${result.eventId}/check-in`}
                                                                    className="text-ieee-blue hover:underline text-sm"
                                                                >
                                                                    Go to Check-in
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
                                            Showing {searchResults.length} results
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Events with Check-ins */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Events with Check-ins</h3>
                        {lastRefresh && (
                            <span className="text-sm text-gray-500">
                                Last updated: {formatTime(lastRefresh.toISOString())}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <Loader2 className="w-8 h-8 text-ieee-blue mx-auto mb-4 animate-spin" />
                            <p className="text-gray-500">Loading check-in data...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
                            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <X className="w-8 h-8 text-red-600" />
                            </div>
                            <p className="text-red-600 font-medium">{error}</p>
                            <button
                                onClick={fetchOverview}
                                className="mt-4 px-4 py-2 bg-ieee-blue text-white rounded-lg hover:bg-ieee-blue/90 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <CheckSquare className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No check-ins yet
                            </h3>
                            <p className="text-gray-500 max-w-md mx-auto">
                                Check-in data will appear here once attendees start checking in to your events.
                            </p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {events.map((event, index) => (
                                <motion.div
                                    key={event.eventId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                                >
                                    {/* Event Header */}
                                    <div
                                        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => toggleEvent(event.eventId)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                                                        {event.eventTitle}
                                                    </h3>
                                                    {event.societyName && (
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                            {event.societyName}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        <span>{formatDate(event.eventDate)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-gray-400" />
                                                        <span>{event.totalCheckedIn} / {event.totalRegistered} checked in</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                        <span>
                                                            {event.lastCheckInAt 
                                                                ? formatRelativeTime(event.lastCheckInAt)
                                                                : 'No check-ins'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4 text-gray-400" />
                                                        <span>
                                                            {Math.round((event.totalCheckedIn / Math.max(event.totalRegistered, 1)) * 100)}% attendance
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="mt-3">
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                                                            style={{ 
                                                                width: `${Math.min((event.totalCheckedIn / Math.max(event.totalRegistered, 1)) * 100, 100)}%` 
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {expandedEventId === event.eventId ? (
                                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap items-center gap-3 mt-4">
                                            <Link
                                                href={`/admin/events/${event.eventId}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                View Event
                                            </Link>
                                            <Link
                                                href={`/admin/events/${event.eventId}/check-in`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-ieee-blue text-white rounded-lg hover:bg-ieee-blue/90 transition-colors text-sm"
                                            >
                                                <CheckSquare className="w-3 h-3" />
                                                Open Check-in
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Expanded Event Details */}
                                    <AnimatePresence>
                                        {expandedEventId === event.eventId && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="border-t border-gray-200 overflow-hidden"
                                            >
                                                <div className="p-6 bg-gray-50">
                                                    <h4 className="font-semibold text-gray-900 mb-4">
                                                        Recent Check-ins ({event.recentCheckIns.length})
                                                    </h4>

                                                    {event.recentCheckIns.length === 0 ? (
                                                        <div className="py-8 text-center">
                                                            <Ticket className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                            <p className="text-sm text-gray-500">No check-ins yet</p>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                            <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                                                <table className="w-full">
                                                                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                                                        <tr>
                                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                                Attendee
                                                                            </th>
                                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                                Email
                                                                            </th>
                                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                                Ticket ID
                                                                            </th>
                                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                                Location
                                                                            </th>
                                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                                Check-in Time
                                                                            </th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-200">
                                                                        {event.recentCheckIns.map((checkIn) => (
                                                                            <tr key={checkIn.id} className="hover:bg-gray-50">
                                                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <User className="w-4 h-4 text-gray-400" />
                                                                                        {checkIn.studentName}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Mail className="w-4 h-4 text-gray-400" />
                                                                                        {checkIn.email || 'N/A'}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                                                                                    {checkIn.ticketId?.slice(0, 12) || 'N/A'}...
                                                                                </td>
                                                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                                                        {checkIn.location || 'entrance'}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                                                        {formatRelativeTime(checkIn.checkedInAt)}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
