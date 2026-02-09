import React from 'react';
import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export const FloatingAction: React.FC = () => {
    return (
        <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 3, type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center text-ieee-blue border border-gray-100 group hover:scale-105 transition-transform"
        >
            <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span className="absolute right-full mr-4 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Chat with us
            </span>
        </motion.button>
    );
};