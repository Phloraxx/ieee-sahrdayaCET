'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    ChevronUp,
    ChevronDown,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Trash2,
    Mail,
    Download,
    MoreVertical,
    CheckSquare,
    Square,
} from 'lucide-react';
import type { Registration } from './EventAnalytics';

interface RegistrationTableProps {
    registrations: Registration[];
    eventId: string;
    isPaidEvent: boolean;
    onBulkAction?: (action: string, selectedIds: string[]) => void;
    showBulkActions?: boolean;
}

type SortField = 'user_name' | 'user_email' | 'registration_date' | 'payment_status' | 'checked_in';
type SortDirection = 'asc' | 'desc';

const STATUS_STYLES = {
    paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    free: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
    failed: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    refunded: { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertCircle },
};

export function RegistrationTable({
    registrations,
    eventId,
    isPaidEvent,
    onBulkAction,
    showBulkActions = false,
}: RegistrationTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('registration_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkMenu, setShowBulkMenu] = useState(false);

    // Sort and filter registrations
    const filteredRegistrations = useMemo(() => {
        let result = [...registrations];

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (r) =>
                    r.user_name.toLowerCase().includes(query) ||
                    r.user_email.toLowerCase().includes(query) ||
                    r.ticket_id?.toLowerCase().includes(query) ||
                    r.user_phone?.includes(query)
            );
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            
            switch (sortField) {
                case 'user_name':
                    comparison = a.user_name.localeCompare(b.user_name);
                    break;
                case 'user_email':
                    comparison = a.user_email.localeCompare(b.user_email);
                    break;
                case 'registration_date':
                    comparison = new Date(a.registration_date).getTime() - new Date(b.registration_date).getTime();
                    break;
                case 'payment_status':
                    comparison = a.payment_status.localeCompare(b.payment_status);
                    break;
                case 'checked_in':
                    comparison = (a.checked_in ? 1 : 0) - (b.checked_in ? 1 : 0);
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [registrations, searchQuery, sortField, sortDirection]);

    const handleSort = useCallback((field: SortField) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    }, [sortField]);

    const handleSelectAll = useCallback(() => {
        if (selectedIds.size === filteredRegistrations.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRegistrations.map((r) => r.id)));
        }
    }, [filteredRegistrations, selectedIds.size]);

    const handleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleBulkAction = useCallback((action: string) => {
        if (selectedIds.size === 0) return;
        onBulkAction?.(action, Array.from(selectedIds));
        setShowBulkMenu(false);
    }, [selectedIds, onBulkAction]);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
        ) : (
            <ChevronDown className="w-4 h-4" />
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusStyle = (status: string) => {
        return STATUS_STYLES[status as keyof typeof STATUS_STYLES] || STATUS_STYLES.pending;
    };

    if (registrations.length === 0) {
        return (
            <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No registrations yet</h3>
                <p className="text-gray-500">
                    Registrations will appear here once students start signing up.
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Search and Bulk Actions */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, ticket ID, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ieee-blue/20 focus:border-ieee-blue text-sm"
                    />
                </div>

                {showBulkActions && selectedIds.size > 0 && (
                    <div className="relative">
                        <button
                            onClick={() => setShowBulkMenu(!showBulkMenu)}
                            className="flex items-center gap-2 px-4 py-2 bg-ieee-blue text-white rounded-lg hover:bg-ieee-blue/90 transition-colors text-sm font-medium"
                        >
                            <span>{selectedIds.size} selected</span>
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        <AnimatePresence>
                            {showBulkMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                                >
                                    <button
                                        onClick={() => handleBulkAction('email')}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <Mail className="w-4 h-4" />
                                        Send Email
                                    </button>
                                    <button
                                        onClick={() => handleBulkAction('export')}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export Selected
                                    </button>
                                    <button
                                        onClick={() => handleBulkAction('checkin')}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <CheckSquare className="w-4 h-4" />
                                        Mark as Checked In
                                    </button>
                                    <hr className="my-1" />
                                    <button
                                        onClick={() => handleBulkAction('delete')}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Selected
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Results count */}
            <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50">
                Showing {filteredRegistrations.length} of {registrations.length} registrations
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            {showBulkActions && (
                                <th className="px-4 py-3 text-left">
                                    <button
                                        onClick={handleSelectAll}
                                        className="p-1 hover:bg-gray-200 rounded"
                                    >
                                        {selectedIds.size === filteredRegistrations.length ? (
                                            <CheckSquare className="w-4 h-4 text-ieee-blue" />
                                        ) : (
                                            <Square className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                </th>
                            )}
                            <th
                                onClick={() => handleSort('user_name')}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            >
                                <div className="flex items-center gap-1">
                                    Name
                                    <SortIcon field="user_name" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('user_email')}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            >
                                <div className="flex items-center gap-1">
                                    Email
                                    <SortIcon field="user_email" />
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('registration_date')}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            >
                                <div className="flex items-center gap-1">
                                    Registered
                                    <SortIcon field="registration_date" />
                                </div>
                            </th>
                            {isPaidEvent && (
                                <th
                                    onClick={() => handleSort('payment_status')}
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                >
                                    <div className="flex items-center gap-1">
                                        Payment
                                        <SortIcon field="payment_status" />
                                    </div>
                                </th>
                            )}
                            <th
                                onClick={() => handleSort('checked_in')}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            >
                                <div className="flex items-center gap-1">
                                    Check-in
                                    <SortIcon field="checked_in" />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRegistrations.map((registration, index) => {
                            const statusStyle = getStatusStyle(registration.payment_status);
                            const StatusIcon = statusStyle.icon;

                            return (
                                <motion.tr
                                    key={registration.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.02 }}
                                    className="hover:bg-gray-50"
                                >
                                    {showBulkActions && (
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleSelect(registration.id)}
                                                className="p-1 hover:bg-gray-200 rounded"
                                            >
                                                {selectedIds.has(registration.id) ? (
                                                    <CheckSquare className="w-4 h-4 text-ieee-blue" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-gray-400" />
                                                )}
                                            </button>
                                        </td>
                                    )}
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {registration.user_name}
                                            </p>
                                            {registration.ticket_id && (
                                                <p className="text-xs text-gray-500 font-mono">
                                                    {registration.ticket_id}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="text-sm text-gray-600">{registration.user_email}</p>
                                            {registration.user_phone && (
                                                <p className="text-xs text-gray-400">{registration.user_phone}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-sm text-gray-600">
                                            {formatDate(registration.registration_date)}
                                        </p>
                                    </td>
                                    {isPaidEvent && (
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                                            >
                                                <StatusIcon className="w-3 h-3" />
                                                {registration.payment_status}
                                            </span>
                                        </td>
                                    )}
                                    <td className="px-4 py-3">
                                        {registration.checked_in ? (
                                            <div className="flex items-center gap-1 text-green-600">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="text-xs">
                                                    {registration.check_in_time
                                                        ? formatDate(registration.check_in_time)
                                                        : 'Yes'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">Not checked in</span>
                                        )}
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filteredRegistrations.length === 0 && searchQuery && (
                <div className="p-8 text-center">
                    <p className="text-gray-500">No registrations match your search.</p>
                    <button
                        onClick={() => setSearchQuery('')}
                        className="mt-2 text-ieee-blue hover:text-ieee-blue/80 text-sm font-medium"
                    >
                        Clear search
                    </button>
                </div>
            )}
        </div>
    );
}
