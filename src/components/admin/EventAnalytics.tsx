'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend,
} from 'recharts';
import {
    Users,
    DollarSign,
    TrendingUp,
    CheckSquare,
    Target,
    Calendar,
    RefreshCw,
    Loader2,
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { ExportButton } from './ExportButton';
import { RegistrationTable } from './RegistrationTable';

// Types
export interface AnalyticsData {
    overview: {
        total_registrations: number;
        confirmed_registrations: number;
        pending_registrations: number;
        cancelled_registrations: number;
        capacity: number;
        capacity_utilization: number;
        total_revenue: number;
        check_in_count: number;
        check_in_rate: number;
        completion_rate: number;
    };
    registrations_over_time: Array<{
        date: string;
        cumulative: number;
        daily: number;
    }>;
    payment_breakdown: Array<{
        status: string;
        count: number;
        amount: number;
    }>;
    department_distribution: Array<{
        department: string;
        count: number;
    }>;
    semester_distribution: Array<{
        semester: string;
        count: number;
    }>;
    check_in_status: {
        checked_in: number;
        not_checked_in: number;
    };
    recent_registrations: Array<Registration>;
    event: {
        id: string;
        title: string;
        date: string;
        venue: string;
        price: number;
        max_capacity: number;
        registration_deadline?: string;
        is_paid_event: boolean;
    };
}

export interface Registration {
    id: string;
    ticket_id: string;
    user_name: string;
    user_email: string;
    user_phone?: string;
    department?: string;
    semester?: string;
    section?: string;
    roll_number?: string;
    registration_date: string;
    payment_status: string;
    checked_in: boolean;
    check_in_time?: string;
    form_responses?: Record<string, unknown>;
}

interface EventAnalyticsProps {
    eventId: string;
    onRefresh?: () => void;
}

// Chart colors
const COLORS = {
    primary: '#00629B',
    secondary: '#0099D6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    gray: '#6B7280',
    purple: '#8B5CF6',
    pink: '#EC4899',
};

const PIE_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];
const BAR_COLORS = ['#00629B', '#0099D6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6'];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm text-gray-600">
                        {entry.name}: <span className="font-medium">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export function EventAnalytics({ eventId, onRefresh }: EventAnalyticsProps) {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [dateRange, setDateRange] = useState<'all' | '7d' | '30d'>('all');
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const fetchAnalytics = useCallback(async () => {
        try {
            setError(null);
            const response = await fetch(`/api/admin/events/${eventId}/analytics?range=${dateRange}`);
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to fetch analytics');
            }

            const data = await response.json();
            setAnalyticsData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [eventId, dateRange]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAnalytics();
        onRefresh?.();
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Stats skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                        <StatsCard
                            key={i}
                            title=""
                            value=""
                            icon={Users}
                            loading
                        />
                    ))}
                </div>

                {/* Charts skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 h-80 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
                            <div className="h-full bg-gray-100 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-600 font-medium">Error loading analytics</p>
                <p className="text-red-500 text-sm mt-1">{error}</p>
                <button
                    onClick={handleRefresh}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!analyticsData) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No data yet</h3>
                <p className="text-gray-500">Analytics will appear once registrations start.</p>
            </div>
        );
    }

    const { overview, event } = analyticsData;

    return (
        <div className="space-y-6" ref={chartContainerRef}>
            {/* Header with controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">Analytics Overview</h2>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {/* Date Range Filter */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        {[
                            { value: '7d', label: '7 Days' },
                            { value: '30d', label: '30 Days' },
                            { value: 'all', label: 'All Time' },
                        ].map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setDateRange(option.value as typeof dateRange)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    dateRange === option.value
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {/* Export Button */}
                    <ExportButton
                        eventId={eventId}
                        eventTitle={event.title}
                        chartContainerRef={chartContainerRef}
                    />
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatsCard
                    title="Total Registrations"
                    value={overview.total_registrations}
                    subtitle={`${overview.confirmed_registrations} confirmed`}
                    icon={Users}
                />
                <StatsCard
                    title="Capacity Utilization"
                    value={`${overview.capacity_utilization}%`}
                    subtitle={`${overview.total_registrations} / ${overview.capacity || '∞'}`}
                    icon={Target}
                />
                {event.is_paid_event && (
                    <StatsCard
                        title="Total Revenue"
                        value={`₹${overview.total_revenue.toLocaleString()}`}
                        subtitle={`${overview.confirmed_registrations} paid`}
                        icon={DollarSign}
                    />
                )}
                <StatsCard
                    title="Check-in Rate"
                    value={`${overview.check_in_rate}%`}
                    subtitle={`${overview.check_in_count} checked in`}
                    icon={CheckSquare}
                />
                <StatsCard
                    title="Completion Rate"
                    value={`${overview.completion_rate}%`}
                    subtitle="Registration completion"
                    icon={TrendingUp}
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Registrations Over Time */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-gray-200 p-6"
                >
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                        Registrations Over Time
                    </h3>
                    <div className="h-64">
                        {analyticsData.registrations_over_time.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analyticsData.registrations_over_time}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="cumulative"
                                        name="Total"
                                        stroke={COLORS.primary}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="daily"
                                        name="Daily"
                                        stroke={COLORS.secondary}
                                        strokeWidth={2}
                                        dot={false}
                                        strokeDasharray="5 5"
                                    />
                                    {/* Deadline marker if exists */}
                                    {event.registration_deadline && (
                                        <Line
                                            type="monotone"
                                            dataKey={() => null}
                                            stroke={COLORS.error}
                                            strokeWidth={2}
                                            strokeDasharray="10 5"
                                        />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                No registration data yet
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Payment Status (only for paid events) */}
                {event.is_paid_event && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-xl border border-gray-200 p-6"
                    >
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                            Payment Status Breakdown
                        </h3>
                        <div className="h-64">
                            {analyticsData.payment_breakdown.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={analyticsData.payment_breakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="count"
                                            nameKey="status"
                                            label={({ payload, percent }) => 
                                                `${payload?.status || ''}: ${payload?.count || 0} (${((percent || 0) * 100).toFixed(0)}%)`
                                            }
                                            labelLine={false}
                                        >
                                            {analyticsData.payment_breakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    No payment data yet
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Department Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl border border-gray-200 p-6"
                >
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                        Department Distribution
                    </h3>
                    <div className="h-64">
                        {analyticsData.department_distribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.department_distribution} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} />
                                    <YAxis
                                        type="category"
                                        dataKey="department"
                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                        width={100}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="Students" radius={[0, 4, 4, 0]}>
                                        {analyticsData.department_distribution.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                No department data yet
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Check-in Status */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl border border-gray-200 p-6"
                >
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                        Check-in Status
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Checked In', value: analyticsData.check_in_status.checked_in },
                                        { name: 'Not Checked In', value: analyticsData.check_in_status.not_checked_in },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, value, percent }) => 
                                        `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`
                                    }
                                    labelLine={false}
                                >
                                    <Cell fill={COLORS.success} />
                                    <Cell fill={COLORS.gray} />
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Semester Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2"
                >
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
                        Registrations by Semester
                    </h3>
                    <div className="h-64">
                        {analyticsData.semester_distribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.semester_distribution}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis dataKey="semester" tick={{ fontSize: 12, fill: '#6B7280' }} />
                                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="Students" fill={COLORS.primary} radius={[4, 4, 0, 0]}>
                                        {analyticsData.semester_distribution.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                No semester data yet
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Recent Registrations Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        Recent Activity
                    </h3>
                </div>
                <RegistrationTable
                    registrations={analyticsData.recent_registrations}
                    eventId={eventId}
                    isPaidEvent={event.is_paid_event}
                />
            </motion.div>
        </div>
    );
}
