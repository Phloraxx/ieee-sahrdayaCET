'use client';

import React, { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { 
    Calendar, 
    MapPin, 
    Clock, 
    Download, 
    CheckCircle2, 
    AlertCircle,
    Ticket,
    ArrowLeft,
    Share2,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface TicketData {
    ticket: {
        id: string;
        qr_data?: string;
        is_scanned: boolean;
        scanned_at?: string;
        created_at: string;
    } | null;
    event: {
        id: string;
        title: string;
        description?: string;
        date: string;
        venue?: string;
        banner_url?: string;
        society_id?: string;
    } | null;
    registration: {
        id: string;
        payment_status: string;
        registration_status: string;
        form_data?: Record<string, unknown>;
    };
}

interface PageProps {
    params: Promise<{ ticketId: string }>;
}

export default function TicketPage({ params }: PageProps) {
    const { ticketId } = use(params);
    const [ticketData, setTicketData] = useState<TicketData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    useEffect(() => {
        async function fetchTicket() {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/ticket/${ticketId}`);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        setError('Ticket not found');
                    } else {
                        setError('Failed to load ticket');
                    }
                    return;
                }

                const data = await response.json();
                setTicketData(data);

                // Generate QR code
                const ticketUrl = `${window.location.origin}/ticket/${ticketId}`;
                const qr = await QRCode.toDataURL(ticketUrl, {
                    width: 400,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF',
                    },
                });
                setQrDataUrl(qr);
            } catch (err) {
                console.error('Failed to fetch ticket:', err);
                setError('Failed to load ticket');
            } finally {
                setLoading(false);
            }
        }

        fetchTicket();
    }, [ticketId]);

    const downloadQR = () => {
        if (!qrDataUrl || !ticketData?.event) return;
        
        const link = document.createElement('a');
        link.download = `ticket-${ticketData.event.title.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = qrDataUrl;
        link.click();
    };

    const shareTicket = async () => {
        if (!ticketData?.event) return;
        
        const shareData = {
            title: `Ticket for ${ticketData.event.title}`,
            text: `My ticket for ${ticketData.event.title}`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
            }
        } catch (err) {
            console.error('Share failed:', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <Navbar />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-ieee-blue animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">Loading ticket...</p>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    if (error || !ticketData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <Navbar />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center max-w-md mx-auto px-4">
                        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Ticket Not Found</h1>
                        <p className="text-gray-600 mb-6">
                            {error || 'The ticket you are looking for does not exist or has been removed.'}
                        </p>
                        <Link
                            href="/events"
                            className="inline-flex items-center gap-2 bg-ieee-blue text-white px-6 py-3 rounded-xl font-semibold hover:bg-ieee-blue/90 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Events
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const { ticket, event, registration } = ticketData;
    const eventDate = event ? new Date(event.date) : new Date();
    const isPast = eventDate < new Date();
    const isConfirmed = registration.registration_status === 'confirmed';
    const isCheckedIn = ticket?.is_scanned;
    const isPending = registration.payment_status === 'pending';

    const getStatusInfo = () => {
        if (isCheckedIn) {
            return {
                icon: CheckCircle2,
                text: 'Checked In',
                color: 'bg-green-100 text-green-700 border-green-200',
                description: ticket?.scanned_at 
                    ? `Checked in on ${new Date(ticket.scanned_at).toLocaleString('en-IN')}`
                    : 'You have been checked in to this event',
            };
        }
        if (isPast) {
            return {
                icon: Clock,
                text: 'Past Event',
                color: 'bg-gray-100 text-gray-600 border-gray-200',
                description: 'This event has already concluded',
            };
        }
        if (isPending) {
            return {
                icon: AlertCircle,
                text: 'Payment Pending',
                color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                description: 'Complete your payment to confirm registration',
            };
        }
        if (isConfirmed) {
            return {
                icon: Ticket,
                text: 'Confirmed',
                color: 'bg-ieee-blue/10 text-ieee-blue border-ieee-blue/20',
                description: 'Show this QR code at the event for check-in',
            };
        }
        return {
            icon: AlertCircle,
            text: 'Unknown Status',
            color: 'bg-gray-100 text-gray-600 border-gray-200',
            description: '',
        };
    };

    const status = getStatusInfo();
    const StatusIcon = status.icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />
            
            <main className="py-12 px-4">
                <div className="max-w-lg mx-auto">
                    {/* Back Link */}
                    <Link
                        href="/events"
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Events
                    </Link>

                    {/* Ticket Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Header with gradient */}
                        <div className="bg-gradient-to-br from-ieee-blue via-blue-600 to-blue-700 p-8 text-white text-center relative overflow-hidden">
                            {/* Background pattern */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute inset-0" style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                                }} />
                            </div>
                            
                            <div className="relative">
                                <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-4">
                                    <Ticket className="w-4 h-4" />
                                    <span className="text-sm font-medium">Event Ticket</span>
                                </div>
                                <h1 className="text-2xl font-bold mb-2">{event?.title}</h1>
                                {event?.description && (
                                    <p className="text-white/80 text-sm line-clamp-2">{event.description}</p>
                                )}
                            </div>
                        </div>

                        {/* Status Banner */}
                        <div className={`px-6 py-4 border-b ${status.color} flex items-center gap-3`}>
                            <StatusIcon className="w-5 h-5 shrink-0" />
                            <div>
                                <p className="font-semibold">{status.text}</p>
                                <p className="text-sm opacity-80">{status.description}</p>
                            </div>
                        </div>

                        {/* QR Code Section */}
                        <div className="p-8 bg-gray-50 flex flex-col items-center">
                            {qrDataUrl ? (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="relative"
                                >
                                    <div className="bg-white p-4 rounded-2xl shadow-lg">
                                        <img 
                                            src={qrDataUrl} 
                                            alt="Ticket QR Code" 
                                            className="w-56 h-56"
                                        />
                                    </div>
                                    {isCheckedIn && (
                                        <div className="absolute inset-0 bg-green-500/20 rounded-2xl flex items-center justify-center">
                                            <div className="bg-green-500 text-white p-3 rounded-full">
                                                <CheckCircle2 className="w-8 h-8" />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="w-56 h-56 bg-gray-200 rounded-2xl animate-pulse" />
                            )}
                            <p className="text-gray-500 text-sm mt-4 text-center">
                                {isCheckedIn ? 'You have been checked in' : 'Scan this QR code at the event venue'}
                            </p>
                        </div>

                        {/* Event Details */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>Date</span>
                                    </div>
                                    <p className="font-semibold text-gray-900">
                                        {eventDate.toLocaleDateString('en-IN', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                        <Clock className="w-4 h-4" />
                                        <span>Time</span>
                                    </div>
                                    <p className="font-semibold text-gray-900">
                                        {eventDate.toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                </div>
                            </div>

                            {event?.venue && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>Venue</span>
                                    </div>
                                    <p className="font-semibold text-gray-900">{event.venue}</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={downloadQR}
                                    disabled={!qrDataUrl}
                                    className="flex-1 flex items-center justify-center gap-2 bg-ieee-blue text-white py-3.5 rounded-xl font-semibold hover:bg-ieee-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download className="w-5 h-5" />
                                    Download QR
                                </button>
                                <button
                                    onClick={shareTicket}
                                    className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-5 py-3.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    <Share2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Ticket ID Footer */}
                        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Ticket ID</span>
                                <code className="font-mono text-sm text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                                    {ticket?.id || registration.id}
                                </code>
                            </div>
                        </div>
                    </motion.div>

                    {/* Additional Info */}
                    <div className="mt-8 text-center text-sm text-gray-500">
                        <p>Keep this ticket handy for the event.</p>
                        <p>For any issues, contact the event organizers.</p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
