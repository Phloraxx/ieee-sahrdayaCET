'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import TransitionLink from '@/components/PageTransition/TransitionLink';
import { motion } from 'framer-motion';
import { databases, DATABASE_ID, SOCIETIES_COLLECTION_ID } from '@/lib/appwrite';
import type { Society } from '@/types';

const LogoItem: React.FC<{ society: Society }> = ({ society }) => (
    <TransitionLink href="/societies" className="flex-shrink-0 flex items-center justify-center group mx-6 md:mx-10">
        <div className="relative flex items-center justify-center h-10 md:h-12 w-auto transition-all duration-300 group-hover:scale-110 cursor-pointer">
            <Image
                src={society.logo_url}
                alt={society.name}
                width={60}
                height={48}
                style={{ width: 'auto', height: '100%' }}
                className="opacity-40 group-hover:opacity-90 transition-opacity duration-500 grayscale group-hover:grayscale-0"
                draggable={false}
            />
        </div>
    </TransitionLink>
);

export const SocietyStrip: React.FC = () => {
    const [societies, setSocieties] = useState<Society[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSocieties();
    }, []);

    const fetchSocieties = async () => {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                SOCIETIES_COLLECTION_ID
            );
            setSocieties(response.documents as unknown as Society[]);
        } catch (error) {
            console.error('Error fetching societies:', error);
            // Fallback to some default societies if fetch fails
            setSocieties([]);
        } finally {
            setLoading(false);
        }
    };

    // If loading or no societies, show placeholder
    if (loading) {
        return (
            <div className="relative mt-12 md:mt-16">
                <div className="flex items-center gap-3 mb-5 px-4 md:px-0">
                    <div className="font-mono text-[10px] tracking-[0.3em] text-gray-400 uppercase whitespace-nowrap">
                        OUR SOCIETIES
                    </div>
                    <div className="h-px flex-grow bg-gray-200" />
                </div>
                <div className="py-8 text-center text-gray-400 text-sm">
                    Loading societies...
                </div>
            </div>
        );
    }

    if (societies.length === 0) {
        return null; // Don't show section if no societies
    }

    // Duplicate the list for seamless loop (4x for safety on wide screens)
    const repeated = [...societies, ...societies, ...societies, ...societies];

    return (
        <div className="relative mt-12 md:mt-16">
            {/* Label */}
            <div className="flex items-center gap-3 mb-5 px-4 md:px-0">
                <div className="font-mono text-[10px] tracking-[0.3em] text-gray-400 uppercase whitespace-nowrap">
                    OUR SOCIETIES
                </div>
                <div className="h-px flex-grow bg-gray-200" />
                <div className="font-mono text-[10px] tracking-[0.2em] text-gray-300">
                    {societies.length}
                </div>
            </div>

            {/* Marquee container */}
            <div className="relative overflow-hidden py-4">
                {/* Fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

                {/* Scrolling track */}
                <motion.div
                    className="flex items-center w-max"
                    animate={{ x: ['0%', '-25%'] }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: 'loop',
                            duration: 40,
                            ease: 'linear',
                        },
                    }}
                >
                    {repeated.map((society, i) => (
                        <LogoItem key={`${society.$id}-${i}`} society={society} />
                    ))}
                </motion.div>
            </div>

            {/* Subtle bottom border */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </div>
    );
};
