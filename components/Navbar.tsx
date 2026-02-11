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
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleScrollEvent = () => {
            setIsVisible(false);
            
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            
            timeoutRef.current = setTimeout(() => {
                setIsVisible(true);
            }, 2000);
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
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            const startPosition = window.scrollY;
            const distance = elementPosition - startPosition;
            const duration = 1000; // longer duration for smoother feel
            let start: number | null = null;

            function animation(currentTime: number) {
                if (start === null) start = currentTime;
                const timeElapsed = currentTime - start;
                const progress = Math.min(timeElapsed / duration, 1);
                
                // easeInOutCubic
                const ease = progress < 0.5 
                    ? 4 * progress * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

                window.scrollTo({
                    top: startPosition + distance * ease,
                    behavior: 'auto' // ensure instant jump for each frame of animation
                });

                if (timeElapsed < duration) {
                    requestAnimationFrame(animation);
                }
            }

            requestAnimationFrame(animation);
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
            <div className="pointer-events-auto bg-white/70 backdrop-blur-md border border-white/20 shadow-lg shadow-black/5 rounded-full px-2 py-1.5 flex items-center gap-1">
                {navItems.map((item) => (
                    <a
                        key={item.label}
                        href={item.href}
                        onClick={(e) => handleScroll(e, item.href)}
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