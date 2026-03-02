'use client';

import React from 'react';
import { Event, Society } from '@/types';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CalendarIcon, MapPinIcon, UsersIcon, ArrowRightIcon } from 'lucide-react';

interface AsymmetricHeroProps {
    flagshipEvent?: Event & { society?: Society };
}

export default function AsymmetricHero({ flagshipEvent }: AsymmetricHeroProps) {
    const { scrollY } = useScroll();
    // Smooth zoom in effect for the entire section on scroll
    const sectionScale = useTransform(scrollY, [0, 600], [1, 1.05]);

    // Use a placeholder if no flagship image exists, using picsum as per rules
    const fallbackImage = 'https://backend.mulearnscet.in/v1/storage/buckets/6995847d002df5a82b49/files/69959e7d000ca2de65c2/view?project=69947a65000687b9d761&mode=admin';

    return (
        <section className="relative w-full mb-10 md:mb-20 px-0 md:px-4">
            <motion.div style={{ scale: sectionScale }} className="origin-top w-full">
                {/* The massive bounded container with round edges */}
                <motion.div
                    className="relative w-full h-[80vh] rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200/50 bg-slate-900 mx-auto max-w-[1400px]"
                    initial={{ opacity: 0, y: 300, scale: 0.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 3, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Image Base Layer */}
                    <div className="absolute inset-0 w-full h-full">
                        <img
                            src={flagshipEvent?.banner_url || fallbackImage}
                            alt={flagshipEvent ? `${flagshipEvent.title} — IEEE Sahrdaya event banner` : 'IEEE Sahrdaya Events'}
                            className="w-full h-full object-cover"
                            fetchPriority="high"
                        />
                        {/* Dark Gradients to ensure text legibility overlaying the image */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>

                    {/* Content Overlay */}
                    <div className="absolute inset-0 p-8 md:p-16 lg:p-24 flex flex-col justify-center z-10 w-full h-full">

                        {/* Small Status Badge */}
                        <div className="mb-6 inline-flex border border-white/20 rounded-full px-4 py-1.5 bg-black/40 backdrop-blur-md items-center gap-2 w-fit shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-mono uppercase tracking-widest text-white/90 font-semibold">
                                {flagshipEvent ? "Next Event" : "Live Calendar"}
                            </span>
                        </div>

                        {/* Massive Typography */}
                        <div className="flex flex-col items-start gap-1 md:gap-2 mb-6 uppercase">
                            <motion.h1
                                className="font-pixel text-5xl md:text-7xl lg:text-[7rem] text-ieee-blue tracking-tighter"
                                style={{ textShadow: '0px 10px 30px rgba(0,0,0,0.8)' }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            >
                                IEEE
                            </motion.h1>
                            <motion.h2
                                className="font-pixel text-4xl md:text-6xl lg:text-[6rem] text-white tracking-tighter"
                                style={{ textShadow: '0px 10px 30px rgba(0,0,0,0.8)' }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            >
                                EVENTS
                            </motion.h2>
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.7 }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="flex items-center gap-4 mb-8"
                        >
                            <div className="h-px bg-white/40 w-12 hidden sm:block" />
                            <div className="flex gap-4 font-sans text-[10px] md:text-xs font-bold tracking-[0.2em] md:tracking-[0.4em] text-white/80 drop-shadow-md">
                                {["INNOVATE", "CONNECT", "INSPIRE"].map((word, i) => (
                                    <motion.span
                                        key={word}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 + i * 0.2 }}
                                    >
                                        {word}.
                                    </motion.span>
                                ))}
                            </div>
                            <div className="h-px bg-white/40 w-12 hidden sm:block" />
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8, duration: 1 }}
                            className="text-lg md:text-xl text-slate-200 max-w-[45ch] font-light leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] mb-12"
                        >
                            {flagshipEvent
                                ? `Join us for ${flagshipEvent.title}. A curated technical experience designed to break assumptions and build real-world software.`
                                : `A curated archive of high-agency workshops, hackathons, and technical summits designed to break assumptions and build real-world software.`
                            }
                        </motion.p>

                        {/* Event Registration & Details Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            className="flex flex-col md:flex-row gap-4 p-5 md:p-6 rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_20px_40px_-10px_rgba(0,0,0,0.5)] w-fit"
                        >
                            {flagshipEvent ? (
                                <>
                                    <div className="flex flex-wrap items-center gap-4 md:gap-8 pr-0 md:pr-6 border-b md:border-b-0 md:border-r border-white/20 pb-4 md:pb-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 text-white/90">
                                                <CalendarIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white/60 text-xs font-semibold tracking-wider uppercase">Date & Time</span>
                                                <span className="text-white font-medium text-sm">
                                                    {new Date(flagshipEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 text-white/90">
                                                <MapPinIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white/60 text-xs font-semibold tracking-wider uppercase">Location</span>
                                                <span className="text-white font-medium text-sm max-w-[150px] truncate">
                                                    {flagshipEvent.venue || 'TBA'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 text-white/90">
                                                <UsersIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white/60 text-xs font-semibold tracking-wider uppercase">Availability</span>
                                                <span className="text-white font-medium text-sm">
                                                    {flagshipEvent.max_capacity ? `${flagshipEvent.max_capacity} Slots` : 'Limited Slots'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center pt-2 md:pt-0 pl-0 md:pl-2">
                                        <a 
                                            href="https://pay.ieeesahrdaya.com" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-ieee-blue text-white font-bold tracking-wide hover:bg-ieee-blue/90 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg group"
                                        >
                                            Register Now
                                            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </a>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <span className="text-white/80 font-medium text-sm drop-shadow-sm">No flagship event active.</span>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>
        </section>
    );
}
