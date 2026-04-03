'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CapacityIndicatorProps {
  capacityLimit: number;
  currentRegistrations: number;
  seatsLeft: number;
}

export function CapacityIndicator({
  capacityLimit,
  currentRegistrations,
  seatsLeft,
}: CapacityIndicatorProps) {
  const percentage = (currentRegistrations / capacityLimit) * 100;

  // Determine color based on seats available
  const getColor = () => {
    if (seatsLeft <= 2) return { bar: 'bg-red-500', text: 'text-red-600' };
    if (seatsLeft <= 5) return { bar: 'bg-yellow-500', text: 'text-yellow-600' };
    return { bar: 'bg-green-500', text: 'text-green-600' };
  };

  const colors = getColor();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-600">Capacity</span>
        <span className={`text-xs font-bold ${colors.text}`}>
          {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} left
        </span>
      </div>
      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full ${colors.bar} rounded-full transition-colors duration-300`}
        />
      </div>
      <span className="text-[10px] text-gray-500">
        {currentRegistrations} / {capacityLimit} registered
      </span>
    </div>
  );
}
