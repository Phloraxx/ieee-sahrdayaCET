'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function ArchiveCarousel({ children }: { children: React.ReactNode }) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const accumulatedScroll = useRef(0);

    useEffect(() => {
        let animationFrameId: number;

        const scroll = () => {
            if (scrollContainerRef.current && !isHovered) {
                // Scroll extremely slowly, using accumulated floats
                accumulatedScroll.current += 0.3; // Very slow scrolling

                if (accumulatedScroll.current >= 1) {
                    const scrollAmount = Math.floor(accumulatedScroll.current);
                    accumulatedScroll.current -= scrollAmount;
                    scrollContainerRef.current.scrollLeft += scrollAmount;
                }

                // If we reach near the end, snap back to start (seamless loop)
                const maxScrollLeft = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
                if (scrollContainerRef.current.scrollLeft >= maxScrollLeft - 10) {
                    // Snap back to 1/3rd of the way assuming we rendered 3 identical sets
                    scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth / 3;
                }
            }
            animationFrameId = requestAnimationFrame(scroll);
        };

        animationFrameId = requestAnimationFrame(scroll);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isHovered]);

    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        isDragging.current = true;
        setIsHovered(true); // Pause auto-scroll
        startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
        scrollLeft.current = scrollContainerRef.current.scrollLeft;
        scrollContainerRef.current.style.cursor = 'grabbing';
    };

    const handleMouseLeave = () => {
        isDragging.current = false;
        setIsHovered(false);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.cursor = 'auto';
        }
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        setIsHovered(false);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.cursor = 'auto';
            // Optional: Snap to nearest item logic could go here
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX.current) * 2; // Scroll-fast multiplier
        scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
    };

    return (
        <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-4 md:gap-6 pb-8 py-4 -mx-4 px-4 md:-mx-8 md:px-8 scrollbar-hide will-change-scroll select-none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={() => setIsHovered(true)}
            onTouchEnd={() => setIsHovered(false)}
            style={{ WebkitOverflowScrolling: 'touch', cursor: 'grab' }}
        >
            {/* Render children 3 times to allow infinite seamless scroll loops */}
            {children}
            {children}
            {children}
        </div>
    );
}
