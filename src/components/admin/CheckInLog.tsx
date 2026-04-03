'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, User, AlertTriangle, Ticket } from 'lucide-react';

interface CheckInEntry {
    id: string;
    studentName: string;
    ticketId: string;
    checkedInAt: string;
    location?: string;
    locationHistory?: LocationRecencyItem[];
    isNew?: boolean;
    isDuplicate?: boolean;
    duplicateMessage?: string;
}

interface LocationRecencyItem {
    location: string;
    checkedInAt?: string;
    timeAgo?: string;
}

interface CheckInLogProps {
    entries: CheckInEntry[];
    loading?: boolean;
}

export function CheckInLog({ entries, loading }: CheckInLogProps) {
    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
    };

    const getTimeDiff = (isoString: string) => {
        const diff = Date.now() - new Date(isoString).getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes < 1) return `${seconds}s ago`;
        if (minutes < 60) return `${minutes}m ago`;
        return formatTime(isoString);
    };

    const getLocationRecencyText = (item: LocationRecencyItem) => {
        const when = item.timeAgo || (item.checkedInAt ? getTimeDiff(item.checkedInAt) : 'earlier');
        return `${item.location} last checked in ${when}`;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Recent Check-ins</h3>
                </div>
                <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="animate-pulse flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full" />
                            <div className="flex-1">
                                <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
                                <div className="h-3 bg-gray-50 rounded w-20" />
                            </div>
                            <div className="h-3 bg-gray-50 rounded w-16" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Recent Check-ins</h3>
                </div>
                <div className="p-8 text-center">
                    <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No check-ins yet</p>
                    <p className="text-gray-400 text-sm mt-1">
                        Scan a QR code to check in attendees
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Recent Check-ins</h3>
                <span className="text-sm text-gray-500">
                    {entries.length} total
                </span>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                    {entries.map((entry, index) => (
                        <motion.div
                            key={entry.id}
                            initial={entry.isNew ? { opacity: 0, x: -20, scale: 0.95 } : false}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className={`p-4 border-b border-gray-50 last:border-b-0 ${
                                entry.isNew 
                                    ? 'bg-green-50/50' 
                                    : entry.isDuplicate 
                                        ? 'bg-yellow-50/50' 
                                        : ''
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {/* Status icon */}
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                    entry.isDuplicate 
                                        ? 'bg-yellow-100' 
                                        : 'bg-green-100'
                                }`}>
                                    {entry.isDuplicate ? (
                                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                    ) : entry.isNew ? (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ 
                                                type: 'spring', 
                                                stiffness: 500, 
                                                damping: 30 
                                            }}
                                        >
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        </motion.div>
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    )}
                                </div>

                                {/* Name and ticket info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <p className="font-medium text-gray-900 truncate">
                                            {entry.studentName}
                                        </p>
                                        {entry.isNew && (
                                            <motion.span
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full"
                                            >
                                                NEW
                                            </motion.span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">
                                        <Ticket className="w-3 h-3 inline-block mr-1" />
                                        {entry.ticketId.slice(0, 12)}...
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Latest location: {entry.location || 'entrance'}
                                        {entry.checkedInAt ? ` • ${getTimeDiff(entry.checkedInAt)}` : ''}
                                    </p>
                                    {entry.locationHistory && entry.locationHistory.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                            {entry.locationHistory.slice(0, 3).map((history) => (
                                                <p
                                                    key={`${entry.id}-${history.location}-${history.checkedInAt || history.timeAgo}`}
                                                    className="text-xs text-gray-600"
                                                >
                                                    {getLocationRecencyText(history)}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                    {entry.isDuplicate && entry.duplicateMessage && (
                                        <p className="text-sm text-yellow-600 mt-1">
                                            {entry.duplicateMessage}
                                        </p>
                                    )}
                                </div>

                                {/* Time */}
                                <div className="flex-shrink-0 text-right">
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        <span>{getTimeDiff(entry.checkedInAt)}</span>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {formatTime(entry.checkedInAt)}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
