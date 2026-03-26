'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'default';
    loading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default',
    loading = false,
}: ConfirmDialogProps) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: 'bg-red-100 text-red-600',
                    button: 'bg-red-600 hover:bg-red-700 text-white',
                };
            case 'warning':
                return {
                    icon: 'bg-yellow-100 text-yellow-600',
                    button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
                };
            default:
                return {
                    icon: 'bg-ieee-blue/10 text-ieee-blue',
                    button: 'bg-ieee-blue hover:bg-ieee-blue/90 text-white',
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden m-4">
                            {/* Header */}
                            <div className="p-6 pb-0 flex items-start gap-4">
                                <div className={`p-3 rounded-full ${styles.icon}`}>
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {title}
                                    </h3>
                                    <p className="mt-2 text-sm text-gray-600">
                                        {message}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="p-6 flex gap-3 justify-end">
                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={loading}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${styles.button}`}
                                >
                                    {loading ? 'Processing...' : confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
