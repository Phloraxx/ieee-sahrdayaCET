'use client';

import React from 'react';
import { Event, Society } from '@/types';
import { Calendar, MapPin, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface EventsHeroProps {
    flagshipEvent?: Event & { society?: Society };
}

export default function EventsHero({ flagshipEvent }: EventsHeroProps) {
    if (!flagshipEvent) {
        return (
            <section className="relative min-h-[60vh] flex items-center justify-center pt-20">
                <motion.div 
                    className="text-center"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="font-pixel text-4xl md:text-6xl text-gray-900 mb-4"
                        style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}>
                        UPCOMING EVENTS
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Check back soon for exciting events!
                    </p>
                </motion.div>
            </section>
        );
    }

    const eventDate = new Date(flagshipEvent.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });

    return (
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden pt-20 pb-12">
            {/* Background Image with Overlay */}
            {flagshipEvent.banner_url && (
                <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${flagshipEvent.banner_url})` }}
                >
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm" />
                </div>
            )}
            
            {/* Content */}
            <motion.div 
                className="relative z-10 max-w-4xl mx-auto px-6 text-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                {/* Society Badge */}
                {flagshipEvent.society && (
                    <motion.div 
                        className="inline-flex items-center gap-2 bg-ieee-blue/10 border-2 border-ieee-blue rounded-full px-4 py-2 mb-6"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                    >
                        {flagshipEvent.society.logo_url && (
                            <img 
                                src={flagshipEvent.society.logo_url} 
                                alt={flagshipEvent.society.name}
                                className="w-5 h-5 object-contain"
                            />
                        )}
                        <span className="text-ieee-blue text-sm font-bold">
                            {flagshipEvent.society.name}
                        </span>
                    </motion.div>
                )}

                {/* Title */}
                <motion.h1 
                    className="font-pixel text-3xl md:text-5xl lg:text-6xl text-gray-900 mb-6 leading-tight"
                    style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.05)' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    {flagshipEvent.title}
                </motion.h1>

                {/* Description */}
                {flagshipEvent.description && (
                    <motion.p 
                        className="text-gray-700 text-lg md:text-xl mb-8 max-w-2xl mx-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        {flagshipEvent.description.substring(0, 200)}
                        {flagshipEvent.description.length > 200 && '...'}
                    </motion.p>
                )}

                {/* Event Details */}
                <motion.div 
                    className="flex flex-wrap justify-center gap-6 mb-8 text-gray-700"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                >
                    <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-lg border border-gray-200">
                        <Calendar className="w-5 h-5 text-ieee-blue" />
                        <span className="font-semibold">{formattedDate} • {formattedTime}</span>
                    </div>
                    {flagshipEvent.venue && (
                        <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-lg border border-gray-200">
                            <MapPin className="w-5 h-5 text-ieee-blue" />
                            <span className="font-semibold">{flagshipEvent.venue}</span>
                        </div>
                    )}
                    {flagshipEvent.max_capacity && flagshipEvent.max_capacity > 0 && (
                        <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-lg border border-gray-200">
                            <Users className="w-5 h-5 text-ieee-blue" />
                            <span className="font-semibold">{flagshipEvent.max_capacity} seats</span>
                        </div>
                    )}
                </motion.div>

                {/* CTA Buttons */}
                <motion.div 
                    className="flex gap-4 justify-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <button className="bg-gradient-to-r from-ieee-blue to-blue-700 hover:from-blue-700 hover:to-ieee-blue text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
                        Register Now {flagshipEvent.price > 0 && `• ₹${flagshipEvent.price}`}
                    </button>
                    <button className="bg-white hover:bg-gray-50 text-gray-900 font-bold py-3 px-8 rounded-lg border-2 border-gray-300 hover:border-ieee-blue transition-all duration-200">
                        Learn More
                    </button>
                </motion.div>
            </motion.div>
        </section>
    );
}
