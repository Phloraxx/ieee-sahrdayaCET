'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface BentoLayoutProps {
    children: React.ReactNode;
    isArchive?: boolean;
}

export default function BentoLayout({ children, isArchive = false }: BentoLayoutProps) {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2, // Let the hero section load first
            },
        },
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={`
                grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 auto-rows-auto
                ${isArchive ? 'opacity-90' : ''}
            `}
        >
            {children}
        </motion.div>
    );
}
