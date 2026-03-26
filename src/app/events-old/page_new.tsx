'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, QrCode, Users, Layout, Terminal, Share2, CheckCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.6 }
    }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15
        }
    }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
        opacity: 1, 
        scale: 1,
        transition: { duration: 0.5 }
    }
};

interface SectionProps {
    children: React.ReactNode;
    className?: string;
}

const AnimatedSection: React.FC<SectionProps> = ({ children, className = '' }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <motion.section
            ref={ref}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={fadeInUp}
            className={className}
        >
            {children}
        </motion.section>
    );
};

export default function EventsPage() {
    return (
        <main className="min-h-screen bg-[#f4f6ff] overflow-x-hidden">
            <Navbar />

            {/* Hero Section */}
            <AnimatedSection className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#006097] mb-8 font-sans font-semibold tracking-wide uppercase text-xs shadow-sm"
                    >
                        <span className="w-2 h-2 rounded-full bg-[#006855] animate-pulse"></span>
                        The Flagship Student Branch
                    </motion.div>

                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="font-sans font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[1.1] mb-8 max-w-5xl text-[#152f50]"
                    >
                        Empowering <span className="text-[#006097] italic">Innovation</span>, Shaping the Future at IEEE Sahrdaya
                    </motion.h1>

                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                        className="font-sans text-lg sm:text-xl text-[#455d7f] max-w-2xl mb-12 leading-relaxed"
                    >
                        Join a community of technical curators and visionaries. We bridge the gap between academic theory and industry-leading innovation.
                    </motion.p>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.6 }}
                        className="flex flex-col sm:flex-row gap-4 sm:gap-6"
                    >
                        <button className="group px-8 sm:px-10 py-4 sm:py-5 bg-[#006097] text-white rounded-full font-sans font-bold text-base sm:text-lg shadow-xl shadow-[#006097]/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                            Explore Events
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button className="px-8 sm:px-10 py-4 sm:py-5 bg-[#cbdeff] text-[#006097] rounded-full font-sans font-bold text-base sm:text-lg hover:scale-105 active:scale-95 transition-all">
                            Host With Us
                        </button>
                    </motion.div>
                </div>

                {/* Background Aesthetic Elements */}
                <div className="absolute -top-24 -right-24 w-64 sm:w-96 h-64 sm:h-96 bg-[#006097]/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 -left-24 w-48 sm:w-64 h-48 sm:h-64 bg-[#006855]/5 rounded-full blur-3xl pointer-events-none" />
            </AnimatedSection>

            {/* Logo Marquee */}
            <AnimatedSection className="py-12 bg-[#ebf1ff]/50">
                <div className="max-w-7xl mx-auto px-6">
                    <p className="text-center font-sans text-xs sm:text-sm font-semibold text-[#60789c] mb-10 tracking-[0.2em] uppercase">
                        Powered by Global Excellence
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all">
                        {/* Logo placeholders */}
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="w-20 h-10 bg-gray-300 rounded" />
                        ))}
                    </div>
                </div>
            </AnimatedSection>

            {/* Bento Grid Features Section */}
            <AnimatedSection className="py-20 sm:py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="mb-12 sm:mb-16"
                    >
                        <h2 className="font-sans font-bold text-3xl sm:text-4xl md:text-5xl mb-4">
                            Technical <span className="text-[#006855]">Curator</span> OS
                        </h2>
                        <p className="text-[#455d7f] font-sans text-base sm:text-lg">
                            Next-generation event management for the modern engineer.
                        </p>
                    </motion.div>

                    <motion.div 
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-auto md:h-auto"
                    >
                        {/* Main Feature Card - Instant Check-in */}
                        <motion.div 
                            variants={scaleIn}
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.3 }}
                            className="md:col-span-8 bg-white rounded-3xl p-8 sm:p-10 flex flex-col justify-between overflow-hidden relative group min-h-[400px]"
                        >
                            <div className="relative z-10">
                                <QrCode className="text-[#006097] w-12 h-12 mb-6" strokeWidth={1.5} />
                                <h3 className="font-sans font-bold text-2xl sm:text-3xl mb-4">Instant Event Check-in</h3>
                                <p className="text-[#455d7f] max-w-sm leading-relaxed">
                                    No more queues. Our lightning-fast QR system processes entries in under 0.5 seconds, integrated directly with your IEEE global ID.
                                </p>
                            </div>
                            <div className="absolute bottom-0 right-0 translate-y-12 translate-x-12 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <QrCode className="w-60 h-60" />
                            </div>
                            <div className="mt-8">
                                <button className="text-[#006097] font-bold font-sans flex items-center gap-2 group/btn hover:gap-3 transition-all">
                                    Learn about Check-in 
                                    <ArrowRight className="w-5 h-5 transition-transform" />
                                </button>
                            </div>
                        </motion.div>

                        {/* Networking Games Card */}
                        <motion.div 
                            variants={scaleIn}
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.3 }}
                            className="md:col-span-4 bg-[#72f9d8] rounded-3xl p-8 sm:p-10 flex flex-col justify-between text-[#005d4c] min-h-[400px]"
                        >
                            <div>
                                <Users className="w-10 h-10 mb-6" strokeWidth={1.5} />
                                <h3 className="font-sans font-bold text-xl sm:text-2xl mb-4">Networking Games</h3>
                                <p className="opacity-90">
                                    AI-powered icebreakers that match you with peers based on your technical interests.
                                </p>
                            </div>
                            <div className="mt-8 flex -space-x-3 overflow-hidden">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="inline-block h-12 w-12 rounded-full bg-[#006855] ring-4 ring-[#72f9d8]" />
                                ))}
                                <div className="h-12 w-12 rounded-full bg-[#006855] flex items-center justify-center text-white text-xs font-bold ring-4 ring-[#72f9d8]">
                                    +82
                                </div>
                            </div>
                        </motion.div>

                        {/* Event OS Card */}
                        <motion.div 
                            variants={scaleIn}
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.3 }}
                            className="md:col-span-4 bg-[#006097] text-white rounded-3xl p-8 sm:p-10 flex flex-col justify-between min-h-[350px]"
                        >
                            <div>
                                <Layout className="w-10 h-10 mb-6" strokeWidth={1.5} />
                                <h3 className="font-sans font-bold text-xl sm:text-2xl mb-4">Event OS</h3>
                                <p className="text-white/80">
                                    Manage registrations, certificates, and feedback in a single unified dashboard.
                                </p>
                            </div>
                            <button className="mt-6 w-full py-4 bg-white text-[#006097] rounded-full font-sans font-bold hover:bg-[#ecf3ff] transition-colors">
                                Open Dashboard
                            </button>
                        </motion.div>

                        {/* Seamless Integrations Card */}
                        <motion.div 
                            variants={scaleIn}
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.3 }}
                            className="md:col-span-8 bg-[#ebf1ff] rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 sm:gap-10 min-h-[350px]"
                        >
                            <div className="flex-1">
                                <h3 className="font-sans font-bold text-xl sm:text-2xl mb-3">Seamless Integrations</h3>
                                <p className="text-[#455d7f]">
                                    Connect your workshops with GitHub, LinkedIn, and IEEE Xplore for instant credentialing.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                                    <Terminal className="w-7 h-7 text-[#152f50]" />
                                </div>
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                                    <Share2 className="w-7 h-7 text-[#152f50]" />
                                </div>
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                                    <CheckCircle className="w-7 h-7 text-[#152f50]" />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </AnimatedSection>

            {/* Stats Section */}
            <AnimatedSection className="py-20 bg-[#006097] text-white">
                <motion.div 
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 text-center"
                >
                    {[
                        { value: '1200+', label: 'Active Members' },
                        { value: '45+', label: 'Annual Events' },
                        { value: '12', label: 'Tech Societies' },
                        { value: '150+', label: 'Project Grants' }
                    ].map((stat, index) => (
                        <motion.div key={index} variants={fadeInUp}>
                            <motion.div 
                                initial={{ scale: 0.5, opacity: 0 }}
                                whileInView={{ scale: 1, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="font-sans font-bold text-4xl sm:text-5xl mb-2"
                            >
                                {stat.value}
                            </motion.div>
                            <div className="font-sans text-xs sm:text-sm uppercase tracking-widest opacity-70">
                                {stat.label}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </AnimatedSection>

            {/* Call to Action */}
            <AnimatedSection className="py-20 sm:py-32 px-6 overflow-hidden">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="max-w-5xl mx-auto bg-white rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 md:p-24 text-center relative overflow-hidden shadow-xl"
                >
                    <div className="relative z-10">
                        <h2 className="font-sans font-bold text-3xl sm:text-4xl md:text-5xl lg:text-7xl mb-6 sm:mb-8 tracking-tight">
                            Ready to lead the next <span className="text-[#006097]">breakthrough</span>?
                        </h2>
                        <p className="text-[#455d7f] font-sans text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed">
                            Whether you&apos;re a freshman coder or a final-year researcher, IEEE Sahrdaya provides the platform to scale your impact.
                        </p>
                        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
                            <button className="px-8 sm:px-12 py-4 sm:py-6 bg-[#006097] text-white rounded-full font-sans font-bold text-lg sm:text-xl shadow-2xl shadow-[#006097]/30 hover:scale-105 active:scale-95 transition-all">
                                Become a Member
                            </button>
                            <button className="px-8 sm:px-12 py-4 sm:py-6 text-[#006097] font-sans font-bold text-lg sm:text-xl hover:bg-[#ebf1ff] rounded-full transition-all">
                                Contact Our Chair
                            </button>
                        </div>
                    </div>
                    {/* Decorative circle */}
                    <div className="absolute -bottom-24 -left-24 w-60 sm:w-80 h-60 sm:h-80 border-[30px] sm:border-[40px] border-[#ebf1ff] rounded-full opacity-50 pointer-events-none" />
                </motion.div>
            </AnimatedSection>

            <Footer />
        </main>
    );
}
