import React from 'react';
import { NavItem } from '../types';
import { motion } from 'framer-motion';

const navItems: NavItem[] = [
    { label: 'HOME', href: '#home', isActive: true },
    { label: 'EVENTS', href: '#events' },
    { label: 'PROJECTS', href: '#projects' },
    { label: 'ABOUT', href: '#about' },
];

export const Navbar: React.FC = () => {
    return (
        <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none"
        >
            <div className="pointer-events-auto bg-white/70 backdrop-blur-md border border-white/20 shadow-lg shadow-black/5 rounded-full px-2 py-1.5 flex items-center gap-1">
                {navItems.map((item) => (
                    <a
                        key={item.label}
                        href={item.href}
                        className={`relative px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${
                            item.isActive 
                                ? 'text-gray-900 bg-white shadow-sm' 
                                : 'text-gray-500 hover:text-ieee-blue hover:bg-white/50'
                        }`}
                    >
                        {item.label}
                    </a>
                ))}
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <a
                    href="#join"
                    className="px-5 py-2 rounded-full text-xs font-bold tracking-wide text-ieee-blue hover:bg-ieee-blue/10 transition-all duration-300"
                >
                    JOIN
                </a>
            </div>
        </motion.div>
    );
};