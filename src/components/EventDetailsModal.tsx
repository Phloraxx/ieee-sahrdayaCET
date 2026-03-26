'use client';

import React, { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Event, Society } from '@/types';
import { 
    X, 
    Calendar, 
    Clock, 
    MapPin, 
    IndianRupee, 
    Users, 
    ExternalLink,
    Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EventDetailsModalProps {
    event: (Event & { society?: Society }) | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function EventDetailsModal({ 
    event, 
    isOpen, 
    onClose 
}: EventDetailsModalProps) {
    // Handle escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, handleKeyDown]);

    if (!event) return null;

    const eventDate = new Date(event.date);
    
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
    
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    const isPastEvent = event.status === 'completed';

    const handleRegister = () => {
        if (event.registration_url) {
            window.open(event.registration_url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: event.title,
            text: `Check out this event: ${event.title}`,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch {
                // Share cancelled by user - this is expected behavior
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal - Bottom Sheet Style */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ 
                            type: 'spring', 
                            damping: 30, 
                            stiffness: 300 
                        }}
                        className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] bg-white rounded-t-3xl overflow-hidden shadow-2xl"
                    >
                        {/* Drag Handle */}
                        <div className="sticky top-0 z-10 bg-white pt-3 pb-2">
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto" />
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto max-h-[calc(90vh-60px)] pb-24">
                            {/* Event Image */}
                            <div className="relative aspect-[16/9] bg-gradient-to-br from-ieee-blue to-ieee-light-blue">
                                {event.banner_url ? (
                                    <Image
                                        src={event.banner_url}
                                        alt={event.title}
                                        fill
                                        sizes="100vw"
                                        className="object-cover"
                                        unoptimized
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Calendar className="w-20 h-20 text-white/40" />
                                    </div>
                                )}

                                {/* Close Button */}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onClose}
                                    className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </motion.button>

                                {/* Share Button */}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleShare}
                                    className="absolute top-4 right-16 w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                                >
                                    <Share2 className="w-5 h-5" />
                                </motion.button>

                                {/* Status Badge */}
                                {isPastEvent && (
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-gray-800/80 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-full">
                                            Past Event
                                        </span>
                                    </div>
                                )}

                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                            </div>

                            {/* Content */}
                            <div className="px-6 -mt-8 relative">
                                {/* Society Badge */}
                                {event.society && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="flex items-center gap-3 bg-white rounded-2xl shadow-lg border border-gray-100 p-3 mb-4 w-fit"
                                    >
                                        {event.society.logo_url && (
                                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-50">
                                                <Image
                                                    src={event.society.logo_url}
                                                    alt={event.society.name}
                                                    fill
                                                    sizes="40px"
                                                    className="object-contain p-1"
                                                    unoptimized
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-xs text-gray-500">Organized by</p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {event.society.name}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Title */}
                                <motion.h1
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 }}
                                    className="text-2xl md:text-3xl font-bold text-gray-900 mb-6"
                                >
                                    {event.title}
                                </motion.h1>

                                {/* Info Cards */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="grid grid-cols-2 gap-3 mb-6"
                                >
                                    {/* Date */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-ieee-blue mb-1">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-xs font-semibold uppercase">Date</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900">
                                            {formattedDate}
                                        </p>
                                    </div>

                                    {/* Time */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-ieee-blue mb-1">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-xs font-semibold uppercase">Time</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900">
                                            {formattedTime}
                                        </p>
                                    </div>

                                    {/* Venue */}
                                    {event.venue && (
                                        <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                                            <div className="flex items-center gap-2 text-ieee-blue mb-1">
                                                <MapPin className="w-4 h-4" />
                                                <span className="text-xs font-semibold uppercase">Venue</span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-900">
                                                {event.venue}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>

                                {/* Price & Capacity */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                    className="flex items-center gap-4 mb-6"
                                >
                                    {/* Price */}
                                    <div className={`
                                        flex items-center gap-2 px-4 py-2 rounded-full font-bold
                                        ${event.price === 0 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-ieee-blue/10 text-ieee-blue'
                                        }
                                    `}>
                                        {event.price === 0 ? (
                                            <span>🎉 FREE Entry</span>
                                        ) : (
                                            <>
                                                <IndianRupee className="w-4 h-4" />
                                                <span>{event.price}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Capacity */}
                                    {event.max_capacity && (
                                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                                            <Users className="w-4 h-4" />
                                            <span>{event.max_capacity} seats</span>
                                        </div>
                                    )}
                                </motion.div>

                                {/* Description / About */}
                                {event.description && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="mb-8"
                                    >
                                        <h2 className="text-lg font-bold text-gray-900 mb-3">
                                            About This Event
                                        </h2>
                                        <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                                            {event.description}
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Fixed CTA Button */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-white/80">
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleRegister}
                                disabled={isPastEvent || !event.registration_url}
                                className={`
                                    w-full py-4 rounded-2xl font-bold text-lg
                                    flex items-center justify-center gap-2
                                    transition-all duration-300
                                    ${isPastEvent 
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-ieee-blue to-ieee-light-blue text-white shadow-lg shadow-ieee-blue/30 hover:shadow-xl hover:shadow-ieee-blue/40'
                                    }
                                `}
                            >
                                {isPastEvent ? (
                                    'Event Ended'
                                ) : (
                                    <>
                                        Register Now
                                        <ExternalLink className="w-5 h-5" />
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
