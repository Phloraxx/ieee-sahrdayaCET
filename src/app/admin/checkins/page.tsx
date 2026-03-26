'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLayout, StatsCard } from '@/components/admin';
import {
    CheckSquare,
    Calendar,
    Users,
    TrendingUp,
    Filter,
    Download,
    Search,
    ChevronDown,
    ChevronUp,
    Activity,
    Clock,
    User,
    Mail,
    Ticket,
    ExternalLink,
    RefreshCw,
    Loader2,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { account, databases, DATABASE_ID, SOCIETIES_COLLECTION_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { Society } from '@/types';

// Types
interface CheckInSession {
    $id: string;
    event_id: string;
    started_by: string;
    started_at: string;
    ended_at?: string;
    ended_by?: string;
    status: 'active' | 'completed';
    location?: string;
    check_in_count: number;
    event?: {
        $id: string;
        title: string;
        date: string;
        society_id: string;
    };
    started_by_user?: {
        $id: string;
        name: string;
        email: string;
    };
    ended_by_user?: {
        $id: string;
        name: string;
        email: string;
    };
}

interface CheckInLog {
    $id: string;
    registration_id: string;
    event_id: string;
    session_id: string;
    checked_in_by: string;
    checked_in_at: string;
    user_id: string;
    attendee_name?: string;
    attendee_email?: string;
    ticket_id?: string;
}

interface SessionStats {
    total_sessions: number;
    total_checkins: number;
    active_sessions: number;
    average_checkins: number;
    most_active_event?: {
        event_id: string;
        event_title: string;
        total_checkins: number;
    };
}

export default function CheckinsPage() {
    const { userTeams } = useAuth();
    const [sessions, setSessions] = useState<CheckInSession[]>([]);
    const [societies, setSocieties] = useState<Society[]>([]);
    const [stats, setStats] = useState<SessionStats>({
        total_sessions: 0,
        total_checkins: 0,
        active_sessions: 0,
        average_checkins: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalSessions, setTotalSessions] = useState(0);
    const limit = 20;
    
    // Expanded session details
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
    const [sessionLogs, setSessionLogs] = useState<Record<string, CheckInLog[]>>({});
    const [loadingLogs, setLoadingLogs] = useState<string | null>(null);
    const [logSearchTerm, setLogSearchTerm] = useState('');
    
    // Auto-refresh for active sessions
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Get user's society slugs for filtering
    const getUserSocietySlugs = useCallback((): string[] | null => {
        if (!userTeams || userTeams.length === 0) return null;
        
        // Global admin sees all
        if (userTeams.some(t => t.$id === 'admins' || t.name?.toLowerCase() === 'admins')) {
            return null; // null means no filtering
        }
        
        // Chair sees their societies
        return userTeams
            .filter(t => t.$id?.startsWith('chair_') || t.name?.toLowerCase().startsWith('chair_'))
            .map(t => {
                const id = t.$id || t.name || '';
                return id.replace(/^chair_/i, '');
            });
    }, [userTeams]);

    // Fetch sessions
    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
                status: statusFilter,
            });

            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

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

            const response = await fetch(`/api/admin/check-in/sessions?${params}`, {
                headers,
                credentials: 'include',
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch sessions');
            }

            const data = await response.json();
            
            // Client-side filtering as backup (API should already filter)
            let fetchedSessions = data.sessions || [];
            const societySlugs = getUserSocietySlugs();
            
            // Fetch societies to map society_id to slug if needed for filtering
            if (societySlugs && societySlugs.length > 0 && societies.length === 0) {
                try {
                    const societiesRes = await databases.listDocuments(
                        DATABASE_ID,
                        SOCIETIES_COLLECTION_ID,
                        [Query.limit(100)]
                    );
                    const fetchedSocieties = societiesRes.documents as unknown as Society[];
                    setSocieties(fetchedSocieties);
                    
                    // Filter sessions by society
                    const societyIds = fetchedSocieties
                        .filter(s => societySlugs.includes(s.slug))
                        .map(s => s.$id);
                    
                    fetchedSessions = fetchedSessions.filter((session: CheckInSession) => 
                        session.event?.society_id && societyIds.includes(session.event.society_id)
                    );
                } catch (err) {
                    console.error('Error fetching societies:', err);
                }
            } else if (societySlugs && societySlugs.length > 0 && societies.length > 0) {
                // Use cached societies
                const societyIds = societies
                    .filter(s => societySlugs.includes(s.slug))
                    .map(s => s.$id);
                
                fetchedSessions = fetchedSessions.filter((session: CheckInSession) => 
                    session.event?.society_id && societyIds.includes(session.event.society_id)
                );
            }
            
            setSessions(fetchedSessions);
            setStats(data.stats || {
                total_sessions: 0,
                total_checkins: 0,
                active_sessions: 0,
                average_checkins: 0,
            });
            setTotalSessions(data.total || 0);
        } catch (err) {
            console.error('Error fetching sessions:', err);
            setError(err instanceof Error ? err.message : 'Failed to load sessions');
        } finally {
            setLoading(false);
        }
    }, [currentPage, statusFilter, startDate, endDate, getUserSocietySlugs, societies]);

    // Fetch session logs
    const fetchSessionLogs = async (sessionId: string) => {
        if (sessionLogs[sessionId]) {
            return; // Already loaded
        }

        try {
            setLoadingLogs(sessionId);
            
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
            
            const response = await fetch(`/api/admin/check-in/sessions/${sessionId}`, {
                headers,
                credentials: 'include',
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }

            const data = await response.json();
            setSessionLogs(prev => ({
                ...prev,
                [sessionId]: data.logs || [],
            }));
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoadingLogs(null);
        }
    };

    // Toggle session expansion
    const toggleSession = async (sessionId: string) => {
        if (expandedSessionId === sessionId) {
            setExpandedSessionId(null);
        } else {
            setExpandedSessionId(sessionId);
            await fetchSessionLogs(sessionId);
        }
    };

    // Export session data
    const exportToCSV = (session: CheckInSession) => {
        const logs = sessionLogs[session.$id] || [];
        
        // Create CSV content
        const headers = ['Attendee Name', 'Email', 'Ticket ID', 'Check-in Time'];
        const rows = logs.map(log => [
            log.attendee_name || 'Unknown',
            log.attendee_email || '',
            log.ticket_id || '',
            new Date(log.checked_in_at).toLocaleString(),
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `checkin-${session.event?.title || 'session'}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Reopen ended session (if within 24 hours)
    const reopenSession = async (session: CheckInSession) => {
        if (!session.ended_at) return;
        
        const endedAt = new Date(session.ended_at);
        const now = new Date();
        const hoursAgo = (now.getTime() - endedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursAgo > 24) {
            alert('Cannot reopen sessions older than 24 hours');
            return;
        }

        try {
            // Add JWT headers for authentication
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            
            try {
                const jwt = await account.createJWT();
                if (jwt?.jwt) {
                    headers['x-appwrite-jwt'] = jwt.jwt;
                }
            } catch (error) {
                console.error('Failed to generate JWT:', error);
            }
            
            const response = await fetch('/api/admin/check-in/start-session', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({
                    event_id: session.event_id,
                    location: session.location,
                }),
            });

            if (response.ok) {
                await fetchSessions();
            } else {
                const data = await response.json();
                alert(data.message || 'Failed to reopen session');
            }
        } catch (err) {
            console.error('Error reopening session:', err);
            alert('Failed to reopen session');
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    // Auto-refresh every 30 seconds if there are active sessions
    useEffect(() => {
        if (!autoRefresh || stats.active_sessions === 0) return;

        const interval = setInterval(() => {
            fetchSessions();
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefresh, stats.active_sessions, fetchSessions]);

    // Filter sessions by search term
    const filteredSessions = sessions.filter(session => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            session.event?.title.toLowerCase().includes(search) ||
            session.started_by_user?.name.toLowerCase().includes(search) ||
            session.location?.toLowerCase().includes(search)
        );
    });

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

    // Calculate duration
    const calculateDuration = (startedAt: string, endedAt?: string) => {
        const start = new Date(startedAt);
        const end = endedAt ? new Date(endedAt) : new Date();
        const minutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
        
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    // Filter logs by search
    const getFilteredLogs = (logs: CheckInLog[]) => {
        if (!logSearchTerm) return logs;
        const search = logSearchTerm.toLowerCase();
        return logs.filter(log =>
            log.attendee_name?.toLowerCase().includes(search) ||
            log.attendee_email?.toLowerCase().includes(search) ||
            log.ticket_id?.toLowerCase().includes(search)
        );
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Check-in History</h1>
                        <p className="text-gray-500 mt-1">
                            View and manage check-in sessions across all events
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {stats.active_sessions > 0 && (
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                                    autoRefresh
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-600'
                                }`}
                            >
                                <Activity className={`w-4 h-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
                                <span className="text-sm font-medium">
                                    Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                                </span>
                            </button>
                        )}
                        <button
                            onClick={fetchSessions}
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
                        title="Total Sessions"
                        value={stats.total_sessions}
                        subtitle={`${stats.active_sessions} active now`}
                        icon={CheckSquare}
                        loading={loading}
                    />
                    <StatsCard
                        title="Total Check-ins"
                        value={stats.total_checkins}
                        subtitle="Across all sessions"
                        icon={Users}
                        loading={loading}
                    />
                    <StatsCard
                        title="Average Check-ins"
                        value={stats.average_checkins}
                        subtitle="Per session"
                        icon={TrendingUp}
                        loading={loading}
                    />
                    <StatsCard
                        title="Most Active Event"
                        value={stats.most_active_event?.total_checkins || 0}
                        subtitle={stats.most_active_event?.event_title.slice(0, 20) || 'No data'}
                        icon={Calendar}
                        loading={loading}
                    />
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900">Filters</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search sessions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value as 'all' | 'active' | 'completed');
                                setCurrentPage(1);
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                        </select>

                        {/* Start Date */}
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue"
                        />

                        {/* End Date */}
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue"
                        />
                    </div>

                    {(statusFilter !== 'all' || startDate || endDate || searchTerm) && (
                        <div className="mt-4 flex items-center gap-2">
                            <span className="text-sm text-gray-500">Active filters:</span>
                            {statusFilter !== 'all' && (
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                                >
                                    Status: {statusFilter}
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            {startDate && (
                                <button
                                    onClick={() => setStartDate('')}
                                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                                >
                                    From: {formatDate(startDate)}
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            {endDate && (
                                <button
                                    onClick={() => setEndDate('')}
                                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                                >
                                    To: {formatDate(endDate)}
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                                >
                                    Search: {searchTerm}
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Sessions List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <Loader2 className="w-8 h-8 text-ieee-blue mx-auto mb-4 animate-spin" />
                            <p className="text-gray-500">Loading sessions...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
                            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <X className="w-8 h-8 text-red-600" />
                            </div>
                            <p className="text-red-600 font-medium">{error}</p>
                            <button
                                onClick={fetchSessions}
                                className="mt-4 px-4 py-2 bg-ieee-blue text-white rounded-lg hover:bg-ieee-blue/90 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <CheckSquare className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No check-in sessions found
                            </h3>
                            <p className="text-gray-500 max-w-md mx-auto">
                                {searchTerm || statusFilter !== 'all' || startDate || endDate
                                    ? 'Try adjusting your filters to see more results.'
                                    : 'Start a check-in session for an event to see it here.'}
                            </p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredSessions.map((session, index) => (
                                <motion.div
                                    key={session.$id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                                >
                                    {/* Session Header */}
                                    <div
                                        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => toggleSession(session.$id)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                                                        {session.event?.title || 'Unknown Event'}
                                                    </h3>
                                                    {session.status === 'active' && (
                                                        <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                                            <Activity className="w-3 h-3 animate-pulse" />
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        <span>{formatDate(session.started_at)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                        <span>{formatTime(session.started_at)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-400" />
                                                        <span className="truncate">
                                                            {session.started_by_user?.name || 'Unknown'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-gray-400" />
                                                        <span>{session.check_in_count} check-ins</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 mt-3 text-sm">
                                                    <span className="text-gray-500">
                                                        Duration: <span className="font-medium text-gray-900">
                                                            {calculateDuration(session.started_at, session.ended_at)}
                                                        </span>
                                                    </span>
                                                    {session.location && (
                                                        <span className="text-gray-500">
                                                            Location: <span className="font-medium text-gray-900">
                                                                {session.location}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {expandedSessionId === session.$id ? (
                                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap items-center gap-3 mt-4">
                                            <Link
                                                href={`/admin/events/${session.event_id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                View Event
                                            </Link>
                                            
                                            {session.check_in_count > 0 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!sessionLogs[session.$id]) {
                                                            fetchSessionLogs(session.$id).then(() => {
                                                                exportToCSV(session);
                                                            });
                                                        } else {
                                                            exportToCSV(session);
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-ieee-blue text-white rounded-lg hover:bg-ieee-blue/90 transition-colors text-sm"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    Export CSV
                                                </button>
                                            )}

                                            {session.status === 'completed' && session.ended_at && (
                                                (() => {
                                                    const hoursAgo = (new Date().getTime() - new Date(session.ended_at).getTime()) / (1000 * 60 * 60);
                                                    return hoursAgo < 24 ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                reopenSession(session);
                                                            }}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                                                        >
                                                            <RefreshCw className="w-3 h-3" />
                                                            Reopen Session
                                                        </button>
                                                    ) : null;
                                                })()
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Session Details */}
                                    <AnimatePresence>
                                        {expandedSessionId === session.$id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="border-t border-gray-200 overflow-hidden"
                                            >
                                                <div className="p-6 bg-gray-50">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="font-semibold text-gray-900">
                                                            Check-in Logs ({sessionLogs[session.$id]?.length || 0})
                                                        </h4>
                                                        
                                                        {sessionLogs[session.$id] && sessionLogs[session.$id].length > 0 && (
                                                            <div className="relative">
                                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search attendees..."
                                                                    value={logSearchTerm}
                                                                    onChange={(e) => setLogSearchTerm(e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue text-sm"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {loadingLogs === session.$id ? (
                                                        <div className="py-8 text-center">
                                                            <Loader2 className="w-6 h-6 text-ieee-blue mx-auto mb-2 animate-spin" />
                                                            <p className="text-sm text-gray-500">Loading check-ins...</p>
                                                        </div>
                                                    ) : sessionLogs[session.$id]?.length === 0 ? (
                                                        <div className="py-8 text-center">
                                                            <Ticket className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                            <p className="text-sm text-gray-500">No check-ins yet</p>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
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
                                                                                Check-in Time
                                                                            </th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-200">
                                                                        {getFilteredLogs(sessionLogs[session.$id] || []).map((log) => (
                                                                            <tr key={log.$id} className="hover:bg-gray-50">
                                                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <User className="w-4 h-4 text-gray-400" />
                                                                                        {log.attendee_name || 'Unknown'}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Mail className="w-4 h-4 text-gray-400" />
                                                                                        {log.attendee_email || 'N/A'}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                                                                                    {log.ticket_id?.slice(0, 12) || 'N/A'}...
                                                                                </td>
                                                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                                                        {formatTime(log.checked_in_at)}
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

                {/* Pagination */}
                {!loading && filteredSessions.length > 0 && totalSessions > limit && (
                    <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-sm text-gray-600">
                            Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                            <span className="font-medium">
                                {Math.min(currentPage * limit, totalSessions)}
                            </span>{' '}
                            of <span className="font-medium">{totalSessions}</span> sessions
                        </p>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => p + 1)}
                                disabled={currentPage * limit >= totalSessions}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
