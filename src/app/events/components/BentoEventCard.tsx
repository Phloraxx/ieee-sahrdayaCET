'use client';

import React from 'react';
import { Event, Society } from '@/types';
import { Calendar, MapPin, IndianRupee, ArrowUpRight } from 'lucide-react';
import { motion, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion';

interface BentoEventCardProps {
    event: Event & { society?: Society };
    index: number;
    isArchived?: boolean;
}

export default function BentoEventCard({ event, index, isArchived = false }: BentoEventCardProps) {
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
    });

    // Mouse tracking for subtle "Liquid Glass" Spotlight
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    const background = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, rgba(14, 165, 233, 0.05), transparent 80%)`;

    // All cards should be vertical, adhering to the 16:9 image structure
    // We remove the massive 2-column featured override to keep them as neat posters.

    return (
        <motion.div
            layout
            layoutId={`event-${event.$id}`}
            variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1 },
            }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onMouseMove={onMouseMove}
            className={`
                group relative bg-white overflow-hidden 
                border border-slate-200/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]
                flex flex-col shrink-0
                ${isArchived
                    ? 'rounded-2xl w-[260px] h-[360px] sm:w-[300px] sm:h-[400px] opacity-90 hover:opacity-100 grayscale-[0%] hover:grayscale-0'
                    : 'rounded-[2.5rem] col-span-1 h-full'
                }
            `}
        >
            {/* Dynamic Spotlight Effect on Hover */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-[2.4rem] opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10"
                style={{ background }}
            />

            {isArchived ? (
                <>
                    {/* Archived Event: Picture as the main part with text on top */}
                    <div className="absolute inset-0 z-0">
                        {event.banner_url ? (
                            <img
                                src={event.banner_url}
                                alt={event.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                <Calendar className="w-12 h-12 text-gray-400 opacity-50" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                        <div className="absolute top-4 right-4 bg-emerald-500/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 backdrop-blur-md">
                            <span>✓</span> Completed
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col justify-end h-full p-6 text-white pb-8">
                        {event.society && (
                            <span className="text-ieee-light-blue text-[10px] font-bold mb-1 uppercase tracking-widest">
                                {event.society.name}
                            </span>
                        )}
                        <h3 className="font-bold text-xl md:text-2xl leading-tight line-clamp-3 mb-2 drop-shadow-lg">
                            {event.title}
                        </h3>
                        <div className="flex items-center gap-2 text-white/80 text-xs font-mono">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formattedDate}</span>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Active Event layout */}
                    {/* Image Section */}
                    <div className="relative w-full aspect-video overflow-hidden bg-gray-100 shrink-0">
                        {event.banner_url ? (
                            <img
                                src={event.banner_url}
                                alt={event.title}
                                className="w-full h-full object-cover origin-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-300">
                                <Calendar className="w-12 h-12 mb-2 opacity-50" />
                                <span className="text-xs uppercase tracking-widest font-mono">No Image</span>
                            </div>
                        )}

                        {/* Inner shadow/glass border purely for aesthetics */}
                        <div className="absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] pointer-events-none" />

                        {/* Society Overlay */}
                        {event.society?.logo_url && (
                            <div className="absolute top-6 left-6 w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl p-2 flex items-center justify-center shadow-sm border border-white/20">
                                <img
                                    src={event.society.logo_url}
                                    alt={event.society.name}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="relative flex flex-col flex-1 p-8 md:p-10 bg-white z-20 justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="font-mono text-xs uppercase tracking-widest text-gray-400 font-semibold">
                                    {formattedDate}
                                </span>
                                {event.price === 0 && (
                                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                                        FREE
                                    </span>
                                )}
                                {event.price > 0 && (
                                    <span className="font-mono text-sm font-medium text-gray-600 flex items-center gap-1">
                                        <IndianRupee className="w-3 h-3" />
                                        {event.price}
                                    </span>
                                )}
                            </div>

                            <h3 className="font-semibold tracking-tight text-gray-900 leading-snug group-hover:text-ieee-blue transition-colors duration-300 line-clamp-2 text-xl md:text-2xl">
                                {event.title}
                            </h3>
                        </div>

                        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                            <div className="flex items-center gap-2 text-gray-500">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm truncate max-w-[150px]">{event.venue || 'TBA'}</span>
                            </div>

                            <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 group-hover:bg-ieee-blue group-hover:border-ieee-blue group-hover:text-white transition-all duration-300">
                                <ArrowUpRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </motion.div>
    );
}
