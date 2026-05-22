'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Download, 
    Calendar, 
    Share2, 
    CheckCircle,
    Loader2,
} from 'lucide-react';
import { Event, Society } from '@/types';
import { Ticket } from '@/types/registration';
import ConfettiExplosion from './ConfettiExplosion';
import AnimatedTick from './AnimatedTick';

interface TicketDisplayProps {
    ticket: Ticket;
    event: Event & { society?: Society };
    onClose: () => void;
}

// QR Code component
const TicketQRCode: React.FC<{
    data: string;
    size?: number;
}> = ({ data, size = 160 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const generateQR = async () => {
            if (!canvasRef.current || !data) return;
            
            try {
                const QRCode = (await import('qrcode')).default;
                await QRCode.toCanvas(canvasRef.current, data, {
                    width: size,
                    margin: 2,
                    color: {
                        dark: '#00629B',
                        light: '#FFFFFF',
                    },
                });
                setLoaded(true);
            } catch (err) {
                console.error('QR generation error:', err);
                // Fallback: use QR code API
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const ctx = canvasRef.current?.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, size, size);
                        setLoaded(true);
                    }
                };
                img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&color=00629B`;
            }
        };

        generateQR();
    }, [data, size]);

    return (
        <div className="relative bg-white p-3 rounded-xl shadow-inner">
            <canvas 
                ref={canvasRef} 
                width={size} 
                height={size}
                className="rounded-lg"
            />
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl">
                    <Loader2 className="w-8 h-8 text-ieee-blue animate-spin" />
                </div>
            )}
        </div>
    );
};

export default function TicketDisplay({
    ticket,
    event,
    onClose,
}: TicketDisplayProps) {
    const ticketRef = useRef<HTMLDivElement>(null);
    const [showConfetti, setShowConfetti] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    // Hide confetti after animation
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowConfetti(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    // Save ticket to localStorage
    useEffect(() => {
        try {
            const tickets = JSON.parse(localStorage.getItem('ieee_tickets') || '[]');
            const existingIndex = tickets.findIndex((t: Ticket) => t.ticketId === ticket.ticketId);
            if (existingIndex >= 0) {
                tickets[existingIndex] = ticket;
            } else {
                tickets.push(ticket);
            }
            localStorage.setItem('ieee_tickets', JSON.stringify(tickets));
        } catch (err) {
            console.error('Failed to save ticket to localStorage:', err);
        }
    }, [ticket]);

    // Download the rendered ticket card as PNG
    const handleDownload = async () => {
        if (!ticketRef.current) return;
        
        setIsDownloading(true);
        
        try {
            const html2canvas = (await import('html2canvas')).default;
            if ('fonts' in document) {
                await (document as Document & { fonts: FontFaceSet }).fonts.ready;
            }

            await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
            const target = ticketRef.current;
            
            const FIXED_WIDTH = 340;

            const canvas = await html2canvas(target, {
                backgroundColor: null, // Critical for transparent PNG
                scale: 3, // High-res capture
                logging: false,
                useCORS: true,
                allowTaint: true,
                width: FIXED_WIDTH,
                x: 0,
                y: 0,
                windowWidth: 1024,
                onclone: (clonedDoc) => {
                    const clonedTarget = clonedDoc.querySelector('[data-ticket="true"]') as HTMLElement;
                    if (clonedTarget) {
                        // Isolate the ticket from any responsive modal/grid parents
                        clonedDoc.body.innerHTML = '';
                        clonedDoc.body.style.background = 'transparent';
                        
                        clonedTarget.style.transform = 'none';
                        clonedTarget.style.width = `${FIXED_WIDTH}px`;
                        clonedTarget.style.minWidth = `${FIXED_WIDTH}px`;
                        clonedTarget.style.maxWidth = `${FIXED_WIDTH}px`;
                        clonedTarget.style.margin = '0';
                        clonedTarget.style.position = 'absolute';
                        clonedTarget.style.top = '0';
                        clonedTarget.style.left = '0';
                        
                        clonedDoc.body.appendChild(clonedTarget);
                    }
                }
            });

            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, 'image/png', 1);
            });
            if (!blob) throw new Error('PNG generation failed');

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `ticket-${ticket.ticketId}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download ticket:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    // Add to calendar
    const handleAddToCalendar = () => {
        const startDate = eventDate.toISOString().replace(/-|:|\.\d{3}/g, '');
        const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000) // +2 hours
            .toISOString().replace(/-|:|\.\d{3}/g, '');
        
        const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate}/${endDate}&location=${encodeURIComponent(event.venue || '')}&details=${encodeURIComponent(`Ticket ID: ${ticket.ticketId}\n\n${event.description || ''}`)}`;
        
        window.open(calendarUrl, '_blank');
    };

    // Share ticket
    const handleShare = async () => {
        const shareData = {
            title: `My ticket for ${event.title}`,
            text: `I'm attending ${event.title}! 🎉\nTicket ID: ${ticket.ticketId}`,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    console.error('Share failed:', err);
                }
            }
        } else {
            // Fallback: share via WhatsApp
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareData.text}\n${shareData.url}`)}`;
            window.open(whatsappUrl, '_blank');
        }
    };    return (
        <div className="relative w-full flex flex-col items-center pb-2">
            {/* Confetti */}
            {showConfetti && <ConfettiExplosion />}

            {/* Success Animation */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="flex flex-col items-center pt-8 pb-4 px-4 w-full"
            >
                {/* Success Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200, delay: 0.1 }}
                    className="mb-5 relative"
                >
                    <div className="absolute inset-0 bg-green-400/20 rounded-full blur-xl animate-pulse" />
                    <AnimatedTick size={72} />
                </motion.div>

                <h3 className="text-[22px] font-bold tracking-tight text-gray-900 mb-2 text-center">
                    You&apos;re In!
                </h3>
                <p className="text-[14px] text-gray-500 mb-8 text-center max-w-[260px] leading-relaxed">
                    Your registration is confirmed. Please present this pass at the venue.
                </p>

                {/* Ticket Card - Wallet Style */}
                <motion.div
                    initial={{ opacity: 0, y: 40, rotateX: -10 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ delay: 0.2, type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-full max-w-[340px] perspective-1000 transform-gpu"
                >
                    <div
                        ref={ticketRef}
                        data-ticket="true"
                        className="rounded-[32px] flex flex-col relative w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)]"
                        style={{ background: 'transparent' }}
                    >
                        {/* Ticket Header Area */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-6 pt-7 pb-6 text-white relative overflow-hidden rounded-t-[32px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-ieee-blue/20 rounded-full blur-xl translate-y-1/3 -translate-x-1/3" />
                            
                            <div className="relative z-10 flex items-center gap-2.5 mb-5 opacity-90">
                                {event.society?.logo_url ? (
                                    <div className="p-1.5 bg-white/10 backdrop-blur-sm rounded-lg">
                                        <img 
                                            src={event.society.logo_url} 
                                            alt={event.society.name}
                                            className="w-6 h-6 object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-9 h-9 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                        <span className="text-xs font-bold tracking-wider text-white">IEEE</span>
                                    </div>
                                )}
                                <span className="text-[11px] font-semibold text-white/80 uppercase tracking-widest leading-tight w-20">
                                    {event.society?.name || 'Sahrdaya SB'}
                                </span>
                            </div>
                            <h4 className="relative z-10 text-[20px] font-bold leading-tight tracking-tight pr-2">
                                {event.title}
                            </h4>
                        </div>

                        {/* Cutout / Perforation Row (Foolproof HTML2Canvas approach using box-shadow inverse drawing) */}
                        <div className="relative h-8 w-full z-10 flex px-0">
                            {/* Left Hole */}
                            <div className="relative w-4 h-8 overflow-hidden flex-shrink-0 bg-transparent">
                                <div className="absolute left-[-16px] top-0 w-8 h-8 rounded-full bg-transparent shadow-[0_0_0_50px_#ffffff]" />
                                <div className="absolute left-[-16px] top-0 w-8 h-8 rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)] pointer-events-none" />
                            </div>

                            {/* Middle Cutout Connection */}
                            <div className="flex-1 bg-white h-8 relative flex items-center">
                                <div className="w-full border-t-2 border-dashed border-gray-200" />
                            </div>

                            {/* Right Hole */}
                            <div className="relative w-4 h-8 overflow-hidden flex-shrink-0 bg-transparent">
                                <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-transparent shadow-[0_0_0_50px_#ffffff]" />
                                <div className="absolute left-0 top-0 w-8 h-8 rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)] pointer-events-none" />
                            </div>
                        </div>

                        {/* Ticket Body / QR */}
                        <div className="bg-white px-6 pt-2 pb-6 relative z-10 rounded-b-[32px]">
                            {/* Date & Location */}
                            <div className="grid grid-cols-2 gap-4 mb-6 pt-2">
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Date & Time</p>
                                    <p className="font-bold text-gray-900 text-[13px] leading-snug">{formattedDate.split(',')[0]}<span className="text-ieee-blue opacity-50 mx-1">/</span>{formattedDate.split(',')[1]}</p>
                                    <p className="text-gray-500 text-[12px] font-medium mt-0.5">{formattedTime}</p>
                                </div>
                                {event.venue && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Location</p>
                                        <p className="font-bold text-gray-900 text-[13px] leading-snug line-clamp-2">{event.venue}</p>
                                    </div>
                                )}
                            </div>

                            {/* Ticket Info Box */}
                            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100 flex justify-between items-center w-full">
                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Attendee / Name</p>
                                    <p className="font-bold text-gray-900 text-[14px] mb-0.5 truncate">{ticket.userName}</p>
                                    <p className="text-[12px] text-gray-500 truncate">{ticket.userEmail}</p>
                                </div>
                                <div className="text-right border-l border-gray-200 pl-4 py-1 shrink-0">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Type</p>
                                    <div className={`inline-flex items-center justify-center px-2 py-1 rounded font-bold text-[11px] ${event.price === 0 ? 'bg-green-100 text-green-700' : 'bg-ieee-blue/10 text-ieee-blue'}`}>
                                        {event.price === 0 ? 'FREE' : 'PAID'}
                                    </div>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="flex flex-col items-center justify-center">
                                <TicketQRCode data={ticket.qrCodeData} size={160} />
                                <div className="mt-4 text-center">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Pass ID</p>
                                    <p className="font-mono text-[14px] font-bold tracking-widest text-gray-800 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                                        {ticket.ticketId.replace(/(.{4})/g, '$1 ').trim()}
                                    </p>
                                </div>
                                <div className="mt-8 flex items-center justify-center gap-1.5 text-green-600 bg-green-50 px-4 py-2 flex-nowrap shrink-0 whitespace-nowrap rounded-full border border-green-100/50">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-[12px] font-bold tracking-wide uppercase">Valid Pass</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Action Buttons */}
                <div className="w-full max-w-[340px] mt-8 space-y-3 z-10 relative">
                    <div className="flex gap-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="flex-1 flex items-center justify-center gap-2.5 py-3.5 bg-gray-900 hover:bg-black text-white rounded-[20px] font-semibold text-[14px] transition-all shadow-[0_8px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] disabled:opacity-50 border border-gray-800"
                        >
                            {isDownloading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : (
                                <Download className="w-4 h-4 text-white" />
                            )}
                            Save Pass
                        </motion.button>
                        
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleAddToCalendar}
                            className="flex items-center justify-center w-[54px] h-[54px] bg-white text-gray-700 hover:text-ieee-blue hover:bg-gray-50 rounded-[20px] transition-all border border-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] bg-opacity-90 backdrop-blur-sm"
                            aria-label="Add to Calendar"
                        >
                            <Calendar className="w-[20px] h-[20px]" />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleShare}
                            className="flex items-center justify-center w-[54px] h-[54px] bg-white text-gray-700 hover:text-ieee-blue hover:bg-gray-50 rounded-[20px] transition-all border border-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] bg-opacity-90 backdrop-blur-sm"
                            aria-label="Share Ticket"
                        >
                            <Share2 className="w-[20px] h-[20px]" />
                        </motion.button>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-4 text-[14px] font-semibold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider bg-white/50 backdrop-blur-sm rounded-full mt-2"
                    >
                        Close Window
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
