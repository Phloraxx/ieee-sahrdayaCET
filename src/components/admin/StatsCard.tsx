'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    loading?: boolean;
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend, loading }: StatsCardProps) {
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24" />
                        <div className="h-8 bg-gray-200 rounded w-16" />
                        <div className="h-3 bg-gray-100 rounded w-20" />
                    </div>
                    <div className="w-12 h-12 bg-gray-100 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
            className="bg-white rounded-xl border border-gray-200 p-6 transition-all"
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        {title}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="mt-1 text-sm text-gray-500">
                            {subtitle}
                        </p>
                    )}
                    {trend && (
                        <p className={`mt-2 text-sm font-medium flex items-center gap-1 ${
                            trend.isPositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                            <span>{trend.isPositive ? '↑' : '↓'}</span>
                            <span>{Math.abs(trend.value)}%</span>
                            <span className="text-gray-400 font-normal">vs last month</span>
                        </p>
                    )}
                </div>
                <div className="p-3 bg-ieee-blue/10 rounded-xl">
                    <Icon className="w-6 h-6 text-ieee-blue" />
                </div>
            </div>
        </motion.div>
    );
}
