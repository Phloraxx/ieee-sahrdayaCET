'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { Event, Society } from '@/types';
import { Calendar, MapPin, IndianRupee, Clock, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

interface EventCard1Props {
    event: Event & { society?: Society };
    onClick?: (event: Event & { society?: Society }) => void;
    index?: number;
}

const EventCard1 = memo(function EventCard1({
    event,
    onClick,
    index = 0,
}: EventCard1Props) {
    const eventDate = new Date(event.date);
    
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
    
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    const isClickable = !!onClick;
    const isPastEvent = event.status === 'completed';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                duration: 0.4, 
                delay: index * 0.08,
                ease: [0.25, 0.46, 0.45, 0.94]
            }}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick?.(event)}
            className={`
                group relative bg-white rounded-2xl overflow-hidden
                border border-gray-200 hover:border-ieee-light-blue
                shadow-md hover:shadow-xl
                transition-all duration-300
                ${isClickable ? 'cursor-pointer' : ''}
            `}
        >
            {/* Banner Image */}
            <div className="relative aspect-[16/10] bg-gradient-to-br from-ieee-blue/10 to-ieee-light-blue/10 overflow-hidden">
                {event.banner_url ? (
                    <Image
                        src={event.banner_url}
                        alt={event.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ieee-blue to-ieee-light-blue">
                        <Calendar className="w-12 h-12 text-white/50" />
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* Date Badge */}
                <div className="absolute top-3 left-3">
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
                        <div className="text-ieee-blue font-bold text-sm">
                            {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        <div className="text-gray-900 font-bold text-xl leading-none">
                            {eventDate.getDate()}
                        </div>
                    </div>
                </div>

                {/* Status Badge */}
                {isPastEvent && (
                    <div className="absolute top-3 right-3">
                        <span className="bg-gray-800/80 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                            Past Event
                        </span>
                    </div>
                )}

                {/* Society Tag */}
                {event.society && (
                    <div className="absolute bottom-3 left-3">
                        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
                            {event.society.logo_url && (
                                <div className="relative w-5 h-5">
                                    <Image
                                        src={event.society.logo_url}
                                        alt={event.society.name}
                                        fill
                                        sizes="20px"
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                            )}
                            <span className="text-xs font-semibold text-gray-700">
                                {event.society.name}
                            </span>
                        </div>
                    </div>
                )}

                {/* Price Tag */}
                <div className="absolute bottom-3 right-3">
                    <div className={`
                        flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-sm shadow-lg
                        ${event.price === 0 
                            ? 'bg-green-500 text-white' 
                            : 'bg-white/95 backdrop-blur-sm text-gray-900'
                        }
                    `}>
                        {event.price === 0 ? (
                            <span>FREE</span>
                        ) : (
                            <>
                                <IndianRupee className="w-3.5 h-3.5" />
                                <span>{event.price}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Title */}
                <h3 className="text-gray-900 font-bold text-lg mb-3 line-clamp-2 group-hover:text-ieee-blue transition-colors">
                    {event.title}
                </h3>

                {/* Details */}
                <div className="space-y-2">
                    {/* Date & Time */}
                    <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4 text-ieee-light-blue flex-shrink-0" />
                        <span className="text-sm">
                            {formattedDate} • {formattedTime}
                        </span>
                    </div>

                    {/* Venue */}
                    {event.venue && (
                        <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4 text-ieee-light-blue flex-shrink-0" />
                            <span className="text-sm line-clamp-1">{event.venue}</span>
                        </div>
                    )}
                </div>

                {/* Tags Row */}
                {event.society && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-medium text-ieee-blue bg-ieee-blue/10 px-2 py-1 rounded-full">
                                {event.society.name}
                            </span>
                        </div>
                    </div>
                )}

                {/* Hover CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 0, y: 10 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ieee-blue via-ieee-blue/95 to-transparent p-4 pt-8"
                >
                    <div className="text-white text-center font-semibold">
                        Tap to View Details →
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
});

export default EventCard1;
