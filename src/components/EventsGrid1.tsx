'use client';

import React, { useState } from 'react';
import { Event, Society } from '@/types';
import { motion, Variants } from 'framer-motion';
import EventCard1 from './EventCard1';
import EventDetailsModal from './EventDetailsModal';
import { Calendar } from 'lucide-react';

interface EventsGrid1Props {
    events: (Event & { society?: Society })[];
    emptyMessage?: string;
}

// Animation variants for stagger effect
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
};

const itemVariants: Variants = {
    hidden: { 
        opacity: 0, 
        y: 30,
        scale: 0.95,
    },
    visible: { 
        opacity: 1, 
        y: 0,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 100,
            damping: 15,
        },
    },
};

export default function EventsGrid1({ 
    events, 
    emptyMessage = "No events found" 
}: EventsGrid1Props) {
    const [selectedEvent, setSelectedEvent] = useState<(Event & { society?: Society }) | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleEventClick = (event: Event & { society?: Society }) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        // Delay clearing the event to allow exit animation
        setTimeout(() => setSelectedEvent(null), 300);
    };

    // Empty state
    if (events.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 px-4"
            >
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <Calendar className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">
                    {emptyMessage}
                </h3>
                <p className="text-gray-500 text-center max-w-md">
                    Check back later for upcoming events or try adjusting your filters.
                </p>
            </motion.div>
        );
    }

    return (
        <>
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {events.map((event, index) => (
                    <motion.div
                        key={event.$id}
                        variants={itemVariants}
                        layout
                    >
                        <EventCard1
                            event={event}
                            onClick={handleEventClick}
                            index={index}
                        />
                    </motion.div>
                ))}
            </motion.div>

            {/* Event Details Modal */}
            <EventDetailsModal
                event={selectedEvent}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </>
    );
}
