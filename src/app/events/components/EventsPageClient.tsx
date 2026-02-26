'use client';

import React, { useState, useMemo } from 'react';
import { Event, Society } from '@/types';
import EventCard from '@/components/EventCard';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Users, MapPin } from 'lucide-react';

interface EventsPageClientProps {
    upcomingEvents: (Event & { society?: Society })[];
    pastEvents: (Event & { society?: Society })[];
    hasSocietyFilter: boolean;
}

export default function EventsPageClient({ upcomingEvents, pastEvents, hasSocietyFilter }: EventsPageClientProps) {
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    // Memoized event counts for debugging
    const eventCounts = useMemo(() => ({
        upcoming: upcomingEvents.length,
        past: pastEvents.length,
        total: upcomingEvents.length + pastEvents.length
    }), [upcomingEvents.length, pastEvents.length]);

    console.log('Event counts:', eventCounts);

    return (
        <>
            {/* Upcoming Events Section */}
            <section className="relative z-10 py-20 px-6 max-w-7xl mx-auto">
                <div className="mb-12">
                    <h2 className="font-pixel text-3xl md:text-4xl text-gray-900 mb-4">
                        UPCOMING EVENTS
                    </h2>
                    {hasSocietyFilter && (
                        <p className="text-gray-600">
                            Filtered by society
                        </p>
                    )}
                </div>

                {upcomingEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {upcomingEvents.map((event, index) => (
                            <EventCard 
                                key={event.$id} 
                                event={event}
                                index={index}
                                onClick={setSelectedEvent}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📅</div>
                        <p className="text-gray-600 text-lg">
                            No upcoming events at the moment. Check back soon!
                        </p>
                    </div>
                )}
            </section>

            {/* Past Events - Hall of Fame */}
            <section className="relative z-10 py-20 px-6 bg-gradient-to-b from-white via-gray-50/50 to-white">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="font-pixel text-3xl md:text-5xl text-gray-900 mb-4">
                            PAST EVENTS
                        </h2>
                        <p className="text-gray-600 text-lg">
                            Successfully Completed Events ({pastEvents.length})
                        </p>
                    </div>

                    {pastEvents.length > 0 ? (
                        <>
                            {/* Horizontal Scrolling Carousel */}
                            <div className="relative">
                                <div className="overflow-x-auto pb-4 scrollbar-hide">
                                    <div className="flex gap-4 min-w-min px-2">
                                        {pastEvents.map((event, idx) => (
                                            <EventCard 
                                                key={event.$id}
                                                event={event}
                                                variant="compact"
                                                index={Math.min(idx, 6)}
                                                onClick={setSelectedEvent}
                                            />
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Scroll Hint - Only show on larger screens */}
                                {pastEvents.length > 3 && (
                                    <div className="hidden md:flex justify-center mt-6">
                                        <p className="text-gray-400 text-sm font-medium flex items-center gap-2">
                                            <span>←</span>
                                            <span>Scroll to explore</span>
                                            <span>→</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">📚</div>
                            <p className="text-gray-600 text-lg">
                                No past events to display yet. Check back after events are completed!
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Event Detail Modal */}
            <AnimatePresence>
                {selectedEvent && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedEvent(null)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                        >
                            {/* Event Detail Card */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
                            >
                                {/* Close Button */}
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                {/* Scrollable Content */}
                                <div className="overflow-y-auto max-h-[90vh]">
                                    {/* Event Banner */}
                                    <div className="relative h-64 bg-gradient-to-br from-ieee-blue to-purple-600">
                                        {selectedEvent.banner_url ? (
                                            <img 
                                                src={selectedEvent.banner_url} 
                                                alt={selectedEvent.title}
                                                className="w-full h-full object-cover object-center"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Calendar className="w-24 h-24 text-white/30" />
                                            </div>
                                        )}
                                        
                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        
                                        {/* Status Badge */}
                                        <div className="absolute top-4 left-4">
                                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-lg ${
                                                selectedEvent.status === 'completed' ? 'bg-green-500 text-white' :
                                                selectedEvent.status === 'published' ? 'bg-blue-500 text-white' :
                                                'bg-gray-500 text-white'
                                            }`}>
                                                {selectedEvent.status.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 md:p-8">
                                        {/* Title */}
                                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                                            {selectedEvent.title}
                                        </h2>

                                        {/* Meta Info */}
                                        <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-gray-200">
                                            <div className="flex items-center gap-2 text-gray-700">
                                                <Calendar className="w-5 h-5 text-ieee-blue" />
                                                <span className="font-semibold">
                                                    {new Date(selectedEvent.date).toLocaleDateString('en-US', { 
                                                        weekday: 'long',
                                                        month: 'long', 
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                            
                                            {selectedEvent.venue && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <MapPin className="w-5 h-5 text-ieee-blue" />
                                                    <span className="font-semibold">{selectedEvent.venue}</span>
                                                </div>
                                            )}
                                            
                                            {selectedEvent.price !== undefined && selectedEvent.price > 0 && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <span className="text-ieee-blue">💰</span>
                                                    <span className="font-semibold">₹{selectedEvent.price}</span>
                                                </div>
                                            )}

                                            {selectedEvent.max_capacity !== undefined && selectedEvent.max_capacity > 0 && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <Users className="w-5 h-5 text-ieee-blue" />
                                                    <span className="font-semibold">{selectedEvent.max_capacity} seats</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Description */}
                                        <div className="mb-6">
                                            <h3 className="text-lg font-bold text-gray-900 mb-3">About This Event</h3>
                                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                                {selectedEvent.description || 'No description available.'}
                                            </p>
                                        </div>

                                        {/* Action Button */}
                                        {selectedEvent.status === 'published' && (
                                            <a
                                                href="https://pay.ieeesahrdaya.com"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full bg-gradient-to-r from-ieee-blue to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl text-center"
                                            >
                                                Register for Event
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
