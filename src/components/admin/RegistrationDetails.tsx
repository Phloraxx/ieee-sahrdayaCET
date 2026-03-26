'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    User,
    Mail,
    Phone,
    GraduationCap,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    Ticket,
    Hash,
    FileText,
} from 'lucide-react';

interface Registration {
    id: string;
    ticket_id: string;
    user_name: string;
    user_email: string;
    user_phone?: string;
    department?: string;
    semester?: string;
    section?: string;
    roll_number?: string;
    registration_date: string;
    payment_status: string;
    checked_in: boolean;
    check_in_time?: string;
    form_responses?: Record<string, unknown>;
}

interface RegistrationDetailsProps {
    registration: Registration;
    onClose: () => void;
    onUpdate?: () => Promise<void>;
    onResendEmail?: (registrationId: string) => Promise<void>;
    onDelete?: (registrationId: string) => Promise<void>;
}

export function RegistrationDetails({ registration, onClose, onUpdate, onResendEmail, onDelete }: RegistrationDetailsProps) {
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getPaymentStatusBadge = (status: string) => {
        const styles = {
            paid: 'bg-green-100 text-green-800',
            completed: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            free: 'bg-blue-100 text-blue-800',
            failed: 'bg-red-100 text-red-800',
            expired: 'bg-gray-100 text-gray-800',
        };
        return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Registration Details</h2>
                            <p className="text-sm text-gray-500 mt-1">Ticket ID: {registration.ticket_id}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/50 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                        {/* Student Info */}
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                                Student Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <User className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Name</p>
                                        <p className="font-medium text-gray-900">{registration.user_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Mail className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Email</p>
                                        <p className="font-medium text-gray-900">{registration.user_email}</p>
                                    </div>
                                </div>
                                {registration.user_phone && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <Phone className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-xs text-gray-500">Phone</p>
                                            <p className="font-medium text-gray-900">{registration.user_phone}</p>
                                        </div>
                                    </div>
                                )}
                                {registration.roll_number && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <Hash className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-xs text-gray-500">Roll Number</p>
                                            <p className="font-medium text-gray-900">{registration.roll_number}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Academic Info */}
                        {(registration.department || registration.semester || registration.section) && (
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                                    Academic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {registration.department && (
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <GraduationCap className="w-5 h-5 text-gray-400" />
                                            <div>
                                                <p className="text-xs text-gray-500">Department</p>
                                                <p className="font-medium text-gray-900">{registration.department}</p>
                                            </div>
                                        </div>
                                    )}
                                    {registration.semester && (
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <FileText className="w-5 h-5 text-gray-400" />
                                            <div>
                                                <p className="text-xs text-gray-500">Semester</p>
                                                <p className="font-medium text-gray-900">{registration.semester}</p>
                                            </div>
                                        </div>
                                    )}
                                    {registration.section && (
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <FileText className="w-5 h-5 text-gray-400" />
                                            <div>
                                                <p className="text-xs text-gray-500">Section</p>
                                                <p className="font-medium text-gray-900">{registration.section}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Registration Status */}
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                                Registration Status
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Registered On</p>
                                        <p className="font-medium text-gray-900">
                                            {formatDate(registration.registration_date)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Ticket className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Payment Status</p>
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusBadge(registration.payment_status)}`}>
                                            {registration.payment_status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    {registration.checked_in ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-gray-400" />
                                    )}
                                    <div>
                                        <p className="text-xs text-gray-500">Check-in Status</p>
                                        <p className={`font-medium ${registration.checked_in ? 'text-green-600' : 'text-gray-600'}`}>
                                            {registration.checked_in ? 'Checked In' : 'Not Checked In'}
                                        </p>
                                    </div>
                                </div>
                                {registration.check_in_time && (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <Clock className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-xs text-gray-500">Check-in Time</p>
                                            <p className="font-medium text-gray-900">
                                                {formatDate(registration.check_in_time)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Custom Form Responses */}
                        {registration.form_responses && Object.keys(registration.form_responses).length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                                    Form Responses
                                </h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    {Object.entries(registration.form_responses).map(([key, value]) => (
                                        <div key={key} className="flex flex-col">
                                            <p className="text-xs text-gray-500 capitalize">
                                                {key.replace(/_/g, ' ')}
                                            </p>
                                            <p className="font-medium text-gray-900">
                                                {Array.isArray(value) 
                                                    ? value.join(', ') 
                                                    : String(value || '-')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
