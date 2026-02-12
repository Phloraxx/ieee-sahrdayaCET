import React, { useState, useEffect, useRef } from 'react';
import { NavItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const navItems: NavItem[] = [
    { label: 'HOME', href: '#home', isActive: true },
    { label: 'EVENTS', href: '#events' },
    { label: 'EXECOM', href: '#execom' },
    { label: 'ABOUT', href: '#about' },
];

export const Navbar: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [activeSection, setActiveSection] = useState('#home');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleScrollEvent = () => {
            setIsVisible(false);
            
            const scrollY = window.scrollY;
            const viewportHeight = window.innerHeight;
            
            // Special case for Home/Hero section which occupies the first viewport
            if (scrollY < viewportHeight * 0.8) {
                setActiveSection('#home');
            } else {
                // Check other sections
                // We start checking from the bottom up or top down?
                // Top down check for sections in the document flow
                ['#events', '#execom', '#about'].forEach(href => {
                    const id = href.replace('#', '');
                    const element = document.getElementById(id);
                    if (element) {
                        const rect = element.getBoundingClientRect();
                        const elementTop = rect.top + scrollY;
                        const elementBottom = elementTop + rect.height;
                        
                        // If the middle of the viewport is within this element
                        const viewMiddle = scrollY + (viewportHeight / 2);
                        
                        if (viewMiddle >= elementTop && viewMiddle < elementBottom) {
                            setActiveSection(href);
                        }
                    }
                });
            }

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            
            timeoutRef.current = setTimeout(() => {
                setIsVisible(true);
            }, 500);
        };

        window.addEventListener('scroll', handleScrollEvent);
        return () => {
            window.removeEventListener('scroll', handleScrollEvent);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        const targetId = href.replace('#', '');
        const element = document.getElementById(targetId);
        
        if (element) {
            // Use native smooth scrolling for better performance and native feel
            window.scrollTo({
                top: element.getBoundingClientRect().top + window.scrollY,
                behavior: 'smooth'
            });
        }
    };

    return (
        <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ 
                y: isVisible ? 0 : -100, 
                opacity: isVisible ? 1 : 0 
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-6 left-0 right-0 z-[100] flex justify-center pointer-events-none"
        >
            <div className="pointer-events-auto bg-white/70 backdrop-blur-md border border-white/20 shadow-lg shadow-black/5 rounded-full px-1.5 py-1.5 md:px-2 flex items-center gap-0.5 md:gap-1 overflow-x-auto max-w-[95vw] no-scrollbar">
                {navItems.map((item) => (
                    <a
                        key={item.label}
                        href={item.href}
                        onClick={(e) => handleScroll(e, item.href)}
                        className={`relative px-3 md:px-5 py-2 rounded-full text-[10px] md:text-xs font-bold tracking-wide transition-all duration-300 whitespace-nowrap ${
                            activeSection === item.href 
                                ? 'text-gray-900 bg-white shadow-sm' 
                                : 'text-gray-500 hover:text-ieee-blue hover:bg-white/50'
                        }`}
                    >
                        {item.label}
                    </a>
                ))}
                <div className="w-px h-4 bg-gray-300 mx-0.5 md:mx-1 flex-shrink-0" />
                <a
                    href="#join"
                    className="px-3 md:px-5 py-2 rounded-full text-[10px] md:text-xs font-bold tracking-wide text-ieee-blue hover:bg-ieee-blue/10 transition-all duration-300 whitespace-nowrap"
                >
                    JOIN
                </a>
            </div>
        </motion.div>
    );
};