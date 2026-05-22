'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { Event, Society } from '@/types';
import { Calendar, MapPin, Users, Edit, Eye, CheckSquare, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminEventCardProps {
    event: Event & { society?: Society };
    registrationCount?: number;
    onEdit?: () => void;
    onViewRegistrations?: () => void;
    onCheckin?: () => void;
    onDelete?: () => void;
}

export const AdminEventCard = memo(function AdminEventCard({
    event,
    registrationCount = 0,
    onEdit,
    onViewRegistrations,
    onCheckin,
    onDelete,
}: AdminEventCardProps) {
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });

    const isPast = eventDate < new Date();
    const capacityPercentage = event.max_capacity 
        ? Math.round((registrationCount / event.max_capacity) * 100) 
        : 0;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-700';
            case 'draft':
                return 'bg-yellow-100 text-yellow-700';
            case 'completed':
                return 'bg-blue-100 text-blue-700';
            case 'archived':
                return 'bg-gray-100 text-gray-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
        >
            <div className="flex flex-col sm:flex-row">
                {/* Event Image */}
                <div className="relative w-full sm:w-48 h-32 sm:h-auto bg-gray-100 flex-shrink-0">
                    {event.banner_url ? (
                            <Image
                                src={event.banner_url}
                                alt={event.title}
                                fill
                                className="object-cover"
                            />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-12 h-12 text-gray-300" />
                        </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-2 left-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(event.status)}`}>
                            {event.status}
                        </span>
                    </div>
                </div>

                {/* Event Info */}
                <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            {/* Society */}
                            {event.society && (
                                <p className="text-xs font-medium text-ieee-blue mb-1 uppercase tracking-wide">
                                    {event.society.name}
                                </p>
                            )}

                            {/* Title */}
                            <h3 className="font-bold text-gray-900 text-lg truncate">
                                {event.title}
                            </h3>

                            {/* Details */}
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{formattedDate} • {formattedTime}</span>
                                </div>
                                {event.venue && (
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        <span className="truncate max-w-[150px]">{event.venue}</span>
                                    </div>
                                )}
                            </div>

                            {/* Registrations */}
                            <div className="mt-3 flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">
                                        {registrationCount}
                                        {event.max_capacity && ` / ${event.max_capacity}`}
                                    </span>
                                </div>
                                {event.max_capacity && (
                                    <div className="flex-1 max-w-[120px]">
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    capacityPercentage >= 90
                                                        ? 'bg-red-500'
                                                        : capacityPercentage >= 70
                                                        ? 'bg-yellow-500'
                                                        : 'bg-green-500'
                                                }`}
                                                style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                            {event.price === 0 ? (
                                <span className="text-green-600 font-bold text-lg">FREE</span>
                            ) : (
                                <span className="font-bold text-lg text-gray-900">₹{event.price}</span>
                            )}
                            {isPast && (
                                <p className="text-xs text-gray-400 mt-1">Past event</p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                        <button
                            onClick={onEdit}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                            Edit
                        </button>
                        <button
                            onClick={onViewRegistrations}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ieee-blue bg-ieee-blue/10 hover:bg-ieee-blue/20 rounded-lg transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                            Registrations
                        </button>
                        <button
                            onClick={onCheckin}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                        >
                            <CheckSquare className="w-4 h-4" />
                            Check-in
                        </button>
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
});
