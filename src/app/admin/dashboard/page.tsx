'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { databases, DATABASE_ID, EVENTS_COLLECTION_ID, SOCIETIES_COLLECTION_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { Event, Society } from '@/types';
import { AdminLayout, StatsCard } from '@/components/admin';
import {
    Calendar,
    Users,
    DollarSign,
    Plus,
    ArrowRight,
    Clock,
    Loader2,
    Settings,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface DashboardStats {
    totalEvents: number;
    upcomingEvents: number;
    totalRegistrations: number;
    totalRevenue: number;
}

interface RegistrationItem {
    id: string;
    userName: string;
    eventName: string;
    date: string;
    status: 'confirmed' | 'pending' | 'cancelled';
}

export default function AdminDashboard() {
    const { userTeams } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        totalEvents: 0,
        upcomingEvents: 0,
        totalRegistrations: 0,
        totalRevenue: 0,
    });
    const [upcomingEvents, setUpcomingEvents] = useState<(Event & { society?: Society })[]>([]);
    const [recentRegistrations, setRecentRegistrations] = useState<RegistrationItem[]>([]);
    const [societies, setSocieties] = useState<Society[]>([]);
    const [loading, setLoading] = useState(true);

    // Get user's society IDs
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

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const societySlugs = getUserSocietySlugs();

                // Fetch societies
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

                // For global admins, continue even if no societies
                if (societyIds.length === 0 && societySlugs !== null) {
                    setLoading(false);
                    return;
                }

                // Fetch events for user's societies
                const queries: string[] = [
                    Query.equal('is_deleted', false), // Filter out soft-deleted events
                    Query.orderDesc('date'),
                    Query.limit(100),
                ];
                
                // Only filter by society_id if not global admin
                if (societyIds.length > 0 && societySlugs !== null) {
                    queries.unshift(Query.equal('society_id', societyIds));
                }
                
                const eventsRes = await databases.listDocuments(
                    DATABASE_ID,
                    EVENTS_COLLECTION_ID,
                    queries
                );
                const events = eventsRes.documents as unknown as Event[];

                // Calculate stats
                const now = new Date();
                const upcoming = events.filter(e => new Date(e.date) > now && e.status !== 'draft');

                setStats({
                    totalEvents: events.length,
                    upcomingEvents: upcoming.length,
                    totalRegistrations: 0, // Will be populated from registrations collection
                    totalRevenue: 0, // Will be populated from payments
                });

                // Set upcoming events (next 5)
                const upcomingWithSociety = upcoming.slice(0, 5).map(event => ({
                    ...event,
                    society: allSocieties.find(s => s.$id === event.society_id),
                }));
                setUpcomingEvents(upcomingWithSociety);

                // Mock recent registrations (replace with real data)
                setRecentRegistrations([
                    { id: '1', userName: 'John Doe', eventName: 'Web Dev Workshop', date: new Date().toISOString(), status: 'confirmed' },
                    { id: '2', userName: 'Jane Smith', eventName: 'AI Hackathon', date: new Date().toISOString(), status: 'pending' },
                    { id: '3', userName: 'Bob Wilson', eventName: 'Cloud Computing 101', date: new Date().toISOString(), status: 'confirmed' },
                ]);

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [getUserSocietySlugs]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-700';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'cancelled':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-8">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                        <p className="text-gray-500 mt-1">
                            Welcome back! Here&apos;s what&apos;s happening with your events.
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

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard
                        title="Total Events"
                        value={stats.totalEvents}
                        icon={Calendar}
                        loading={loading}
                    />
                    <StatsCard
                        title="Upcoming Events"
                        value={stats.upcomingEvents}
                        icon={Clock}
                        loading={loading}
                    />
                    <StatsCard
                        title="Total Registrations"
                        value={stats.totalRegistrations}
                        icon={Users}
                        trend={{ value: 12, isPositive: true }}
                        loading={loading}
                    />
                    <StatsCard
                        title="Total Revenue"
                        value={`₹${stats.totalRevenue.toLocaleString()}`}
                        icon={DollarSign}
                        loading={loading}
                    />
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Registrations */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-bold text-gray-900">Recent Registrations</h2>
                            <Link
                                href="/admin/events"
                                className="text-sm text-ieee-blue hover:text-ieee-blue/80 font-medium flex items-center gap-1"
                            >
                                View All <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center">
                                <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
                            </div>
                        ) : recentRegistrations.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p>No registrations yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                User
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Event
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {recentRegistrations.map((reg) => (
                                            <tr key={reg.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {reg.userName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {reg.eventName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(reg.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(reg.status)}`}>
                                                        {reg.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Upcoming Events */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-bold text-gray-900">Upcoming Events</h2>
                            <Link
                                href="/admin/events"
                                className="text-sm text-ieee-blue hover:text-ieee-blue/80 font-medium flex items-center gap-1"
                            >
                                View All <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center">
                                <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
                            </div>
                        ) : upcomingEvents.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p>No upcoming events</p>
                                <Link
                                    href="/admin/events/create"
                                    className="inline-flex items-center gap-1 mt-3 text-ieee-blue hover:text-ieee-blue/80 font-medium text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create your first event
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {upcomingEvents.map((event) => (
                                    <motion.div
                                        key={event.$id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
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
                                                        <Calendar className="w-6 h-6 text-gray-300" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-gray-900 truncate">
                                                    {event.title}
                                                </h3>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    {new Date(event.date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                                {event.society && (
                                                    <p className="text-xs text-ieee-blue font-medium mt-1">
                                                        {event.society.name}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-400">
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link
                            href="/admin/events/create"
                            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-ieee-blue hover:bg-ieee-blue/5 transition-colors group"
                        >
                            <div className="p-2 bg-ieee-blue/10 rounded-lg group-hover:bg-ieee-blue/20 transition-colors">
                                <Plus className="w-5 h-5 text-ieee-blue" />
                            </div>
                            <span className="font-medium text-gray-900">Create Event</span>
                        </Link>
                        <Link
                            href="/admin/events"
                            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-ieee-blue hover:bg-ieee-blue/5 transition-colors group"
                        >
                            <div className="p-2 bg-ieee-blue/10 rounded-lg group-hover:bg-ieee-blue/20 transition-colors">
                                <Calendar className="w-5 h-5 text-ieee-blue" />
                            </div>
                            <span className="font-medium text-gray-900">View All Events</span>
                        </Link>
                        <Link
                            href="/admin/checkins"
                            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-ieee-blue hover:bg-ieee-blue/5 transition-colors group"
                        >
                            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                                <Users className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="font-medium text-gray-900">View Check-ins</span>
                        </Link>
                        <Link
                            href="/admin/settings"
                            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-ieee-blue hover:bg-ieee-blue/5 transition-colors group"
                        >
                            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                                <Settings className="w-5 h-5 text-gray-600" />
                            </div>
                            <span className="font-medium text-gray-900">Settings</span>
                        </Link>
                    </div>
                </div>

                {/* Societies */}
                {societies.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="font-bold text-gray-900 mb-4">Your Societies</h2>
                        <div className="flex flex-wrap gap-3">
                            {societies.map((society) => (
                                <div
                                    key={society.$id}
                                    className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl"
                                >
                                    {society.logo_url && (
                                        <div className="relative w-8 h-8">
                                            <Image
                                                src={society.logo_url}
                                                alt={society.name}
                                                fill
                                                className="object-contain"
                                                unoptimized
                                            />
                                        </div>
                                    )}
                                    <span className="font-medium text-gray-900">{society.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
