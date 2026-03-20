'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface EventsHeroSectionProps {
  upcomingEventCount: number;
  nextEventDate?: Date;
  onExploreClick?: () => void;
}

export function EventsHeroSection({
  upcomingEventCount,
  nextEventDate,
  onExploreClick
}: EventsHeroSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  // Fade out on scroll
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative w-full bg-white overflow-hidden pt-8 pb-20 sm:pb-32"
    >
      {/* Subtle background lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(0deg, transparent 24%, rgba(0, 98, 155, .05) 25%, rgba(0, 98, 155, .05) 26%, transparent 27%, transparent 74%, rgba(0, 98, 155, .05) 75%, rgba(0, 98, 155, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 98, 155, .05) 25%, rgba(0, 98, 155, .05) 26%, transparent 27%, transparent 74%, rgba(0, 98, 155, .05) 75%, rgba(0, 98, 155, .05) 76%, transparent 77%, transparent)',
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">

          {/* Left sidebar - Category navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="hidden lg:flex flex-col gap-6"
          >
            <div>
              <div className="text-[10px] font-mono tracking-[0.2em] text-gray-400 uppercase mb-4">Explore</div>
              <nav className="space-y-3">
                {['Committee Meetings', 'Events', 'Workshops', 'Recurring Events'].map((item, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ x: 4 }}
                    className="text-sm text-gray-600 hover:text-ieee-blue transition-colors text-left font-medium"
                  >
                    {item}
                  </motion.button>
                ))}
              </nav>
            </div>
          </motion.div>

          {/* Center - Main headline + trust message */}
          <div className="lg:col-span-2">
            {/* Main headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mb-12"
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight text-gray-900 mb-4">
                Where Events
                <br />
                <span className="text-gray-900">Begin, and</span>
                <br />
                <span className="text-gray-900">Memories</span>
              </h1>

              {/* Secondary line with accent color */}
              <div className="mt-6 flex items-center gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-ieee-blue">Get Made</span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900">with IEEE</span>

                {/* Decorative icon */}
                <motion.div
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-ieee-blue/10 flex items-center justify-center"
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-ieee-blue" />
                </motion.div>
              </div>
            </motion.div>

            {/* Trust message + CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-8"
            >
              {/* Trust/credibility badge */}
              <div className="flex-1">
                <div className="flex items-start gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm sm:text-base text-gray-800 font-semibold leading-relaxed">
                      <span className="text-ieee-blue font-bold">Trusted by {upcomingEventCount}+ events</span>
                      {' '}— from tech talks, workshops, hackathons, and bootcamps hosted by our vibrant community.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <motion.button
                onClick={onExploreClick}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-ieee-blue hover:bg-ieee-light-blue text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-xl flex-shrink-0 whitespace-nowrap"
              >
                Explore Events
                <ArrowUpRight className="w-5 h-5" />
              </motion.button>
            </motion.div>

            {/* Quick stats - Optional */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-10 pt-8 border-t border-gray-100"
            >
              <div className="flex flex-wrap gap-6 sm:gap-8">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-gray-900">{upcomingEventCount}</div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Upcoming Events</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-gray-900">1000+</div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Students Registered</div>
                </div>
                {nextEventDate && (
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-gray-900">
                      {nextEventDate.getDate()}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
                      {nextEventDate.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll indicator - Subtle */}
      <motion.div
        style={{ opacity }}
        className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
      >
        <span className="text-xs text-gray-400 font-medium">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center"
        >
          <div className="w-5 h-8 border-2 border-gray-300 rounded-full flex justify-center p-1">
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-0.5 h-1.5 bg-gray-400 rounded-full"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
