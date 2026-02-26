'use client';

import React, { memo } from 'react';
import { Event, Society } from '@/types';
import { Calendar, MapPin, IndianRupee, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface EventCardProps {
    event: Event & { society?: Society };
    variant?: 'default' | 'compact';
    onClick?: (event: Event) => void;
    index?: number;
}

const EventCard = memo(function EventCard({ event, variant = 'default', onClick, index = 0 }: EventCardProps) {
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
    const year = eventDate.getFullYear();

    const isCompleted = event.status === 'completed';
    const isClickable = !!onClick;

    // Compact variant for carousels
    if (variant === 'compact') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.03, y: -4 }}
                onClick={() => onClick?.(event)}
                className={`flex-shrink-0 w-[240px] bg-white rounded-xl overflow-hidden border-2 border-gray-200 hover:border-ieee-blue shadow-md hover:shadow-xl transition-all group ${
                    isClickable ? 'cursor-pointer' : ''
                }`}
            >
                {/* Event Image - 9:16 aspect ratio */}
                <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    {event.banner_url ? (
                        <img 
                            src={event.banner_url} 
                            alt={event.title}
                            className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-16 h-16 text-gray-300" />
                        </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shadow-lg ${
                            event.status === 'completed' ? 'bg-green-500 text-white' :
                            event.status === 'published' ? 'bg-blue-500 text-white' :
                            'bg-gray-500 text-white'
                        }`}>
                            {event.status}
                        </span>
                    </div>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* Date Badge */}
                    <div className="absolute bottom-2 left-2">
                        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
                            <div className="text-xs font-bold text-ieee-blue">
                                {formattedDate}
                            </div>
                            <div className="text-[10px] text-gray-600 font-semibold">
                                {year}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Event Info */}
                <div className="p-3">
                    <h4 className="font-bold text-gray-900 text-xs mb-2 line-clamp-2 group-hover:text-ieee-blue transition-colors">
                        {event.title}
                    </h4>
                    
                    {isClickable && (
                        <div className="flex items-center gap-1 text-ieee-blue font-semibold text-[10px]">
                            <span>View Details</span>
                            <ChevronRight className="w-3 h-3" />
                        </div>
                    )}
                </div>
            </motion.div>
        );
    }

    // Default variant for grids
    return (
        <div 
            onClick={() => onClick?.(event)}
            className={`group relative bg-white border-2 border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-ieee-blue hover:shadow-2xl hover:transform hover:scale-105 ${
                isClickable ? 'cursor-pointer' : ''
            }`}
        >
                {/* Banner Image - 9:16 aspect ratio */}
                <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    {event.banner_url ? (
                        <img 
                            src={event.banner_url} 
                            alt={event.title}
                            className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-16 h-16 text-gray-400" />
                        </div>
                    )}
                    
                    {/* Status Badge */}
                    {event.status === 'completed' && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                            <span>✓</span> Completed
                        </div>
                    )}
                    
                    {/* Society Logo Overlay */}
                    {event.society?.logo_url && (
                        <div className="absolute bottom-3 left-3 bg-white p-2 rounded-lg shadow-lg border border-gray-200">
                            <img 
                                src={event.society.logo_url} 
                                alt={event.society.name}
                                className="w-8 h-8 object-contain"
                            />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-5 bg-white">
                    {/* Society Name */}
                    {event.society && (
                        <p className="text-ieee-blue text-xs font-bold mb-2 uppercase tracking-wide">
                            {event.society.name}
                        </p>
                    )}

                    {/* Title */}
                    <h3 className="text-gray-900 font-bold text-lg mb-3 line-clamp-2 group-hover:text-ieee-blue transition-colors">
                        {event.title}
                    </h3>

                    {/* Details */}
                    <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formattedDate} • {formattedTime}</span>
                        </div>
                        
                        {event.venue && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span className="line-clamp-1">{event.venue}</span>
                            </div>
                        )}
                    </div>

                    {/* Price / Status */}
                    {!isCompleted ? (
                        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-1 text-gray-900 font-bold">
                                {event.price === 0 ? (
                                    <span className="text-green-600">FREE</span>
                                ) : (
                                    <>
                                        <IndianRupee className="w-4 h-4" />
                                        <span>{event.price}</span>
                                    </>
                                )}
                            </div>
                            
                            <span className="text-ieee-blue text-sm font-semibold group-hover:translate-x-1 transition-transform">
                                View Details →
                            </span>
                        </div>
                    ) : (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-semibold">
                                <span>✓</span>
                                <span>Past Event</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
    );
});

export default EventCard;
