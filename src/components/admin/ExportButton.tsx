'use client';

import React, { useState, useCallback, RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download,
    FileSpreadsheet,
    FileText,
    Users,
    UserCheck,
    Phone,
    ChevronDown,
    Loader2,
    Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ExportButtonProps {
    eventId: string;
    eventTitle: string;
    chartContainerRef?: RefObject<HTMLDivElement | null>;
}

type ExportType = 'csv_all' | 'csv_checked_in' | 'csv_contacts' | 'pdf';

interface ExportOption {
    id: ExportType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    type: 'csv' | 'pdf';
}

const EXPORT_OPTIONS: ExportOption[] = [
    {
        id: 'csv_all',
        label: 'All Registrations',
        description: 'Export full data with all fields',
        icon: FileSpreadsheet,
        type: 'csv',
    },
    {
        id: 'csv_checked_in',
        label: 'Attendance Report',
        description: 'Only checked-in students',
        icon: UserCheck,
        type: 'csv',
    },
    {
        id: 'csv_contacts',
        label: 'Contact List',
        description: 'Names, emails, and phones only',
        icon: Phone,
        type: 'csv',
    },
    {
        id: 'pdf',
        label: 'PDF Report',
        description: 'Full analytics report with charts',
        icon: FileText,
        type: 'pdf',
    },
];

export function ExportButton({ eventId, eventTitle, chartContainerRef }: ExportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [exporting, setExporting] = useState<ExportType | null>(null);
    const [exportComplete, setExportComplete] = useState<ExportType | null>(null);

    const handleExport = useCallback(async (option: ExportOption) => {
        setExporting(option.id);
        
        try {
            if (option.type === 'csv') {
                // CSV Export via API
                const filter = option.id === 'csv_checked_in' 
                    ? 'checked_in' 
                    : option.id === 'csv_contacts' 
                    ? 'contacts' 
                    : 'all';
                
                const response = await fetch(
                    `/api/admin/events/${eventId}/export?type=csv&filter=${filter}`
                );

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Export failed');
                }

                // Get the filename from Content-Disposition header
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_${filter}.csv`;
                if (contentDisposition) {
                    const match = contentDisposition.match(/filename="?([^"]+)"?/);
                    if (match) filename = match[1];
                }

                // Download the file
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                setExportComplete(option.id);
                toast.success(`${option.label} exported successfully!`);
            } else {
                // PDF Export using jspdf + html2canvas
                const { default: jsPDF } = await import('jspdf');
                const { default: html2canvas } = await import('html2canvas');

                // Fetch event data for PDF
                const response = await fetch(`/api/admin/events/${eventId}/analytics`);
                if (!response.ok) throw new Error('Failed to fetch analytics data');
                
                const data = await response.json();

                // Create PDF
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4',
                });

                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const margin = 15;
                let yPosition = margin;

                // Header with IEEE branding
                pdf.setFillColor(0, 98, 155); // IEEE blue
                pdf.rect(0, 0, pageWidth, 40, 'F');
                
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(24);
                pdf.setFont('helvetica', 'bold');
                pdf.text('IEEE Sahrdaya', margin, 20);
                
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'normal');
                pdf.text('Event Analytics Report', margin, 30);

                yPosition = 50;

                // Event Details
                pdf.setTextColor(0, 0, 0);
                pdf.setFontSize(18);
                pdf.setFont('helvetica', 'bold');
                pdf.text(data.event.title, margin, yPosition);
                yPosition += 10;

                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(100, 100, 100);
                
                const eventDate = new Date(data.event.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
                pdf.text(`Date: ${eventDate}`, margin, yPosition);
                yPosition += 5;
                
                if (data.event.venue) {
                    pdf.text(`Venue: ${data.event.venue}`, margin, yPosition);
                    yPosition += 5;
                }
                
                pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                })}`, margin, yPosition);
                yPosition += 15;

                // Summary Statistics Box
                pdf.setFillColor(248, 250, 252);
                pdf.roundedRect(margin, yPosition, pageWidth - margin * 2, 35, 3, 3, 'F');
                
                pdf.setTextColor(0, 0, 0);
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.text('Summary Statistics', margin + 5, yPosition + 8);

                const stats = [
                    { label: 'Total Registrations', value: data.overview.total_registrations.toString() },
                    { label: 'Checked In', value: `${data.overview.check_in_count} (${data.overview.check_in_rate}%)` },
                    { label: 'Capacity Used', value: `${data.overview.capacity_utilization}%` },
                ];
                
                if (data.event.is_paid_event) {
                    stats.push({ label: 'Revenue', value: `₹${data.overview.total_revenue.toLocaleString()}` });
                }

                const statWidth = (pageWidth - margin * 2 - 10) / stats.length;
                stats.forEach((stat, index) => {
                    const xPos = margin + 5 + index * statWidth;
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(stat.label, xPos, yPosition + 18);
                    
                    pdf.setFontSize(14);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(0, 98, 155);
                    pdf.text(stat.value, xPos, yPosition + 28);
                });

                yPosition += 45;

                // Capture charts as images if container ref is available
                if (chartContainerRef?.current) {
                    try {
                        const charts = chartContainerRef.current.querySelectorAll('.recharts-wrapper');
                        let chartIndex = 0;

                        for (const chart of Array.from(charts).slice(0, 4)) {
                            const canvas = await html2canvas(chart as HTMLElement, {
                                scale: 2,
                                backgroundColor: '#ffffff',
                                logging: false,
                            });

                            const imgData = canvas.toDataURL('image/png');
                            const imgWidth = (pageWidth - margin * 2) / 2 - 5;
                            const imgHeight = 50;

                            const xPos = margin + (chartIndex % 2) * (imgWidth + 10);
                            
                            if (yPosition + imgHeight > pageHeight - margin) {
                                pdf.addPage();
                                yPosition = margin;
                            }

                            pdf.addImage(imgData, 'PNG', xPos, yPosition, imgWidth, imgHeight);
                            
                            if (chartIndex % 2 === 1) {
                                yPosition += imgHeight + 10;
                            }
                            
                            chartIndex++;
                        }
                    } catch (err) {
                        console.warn('Could not capture charts:', err);
                    }
                }

                // Add new page for attendee list
                pdf.addPage();
                yPosition = margin;

                // Attendee List Header
                pdf.setFillColor(0, 98, 155);
                pdf.rect(0, 0, pageWidth, 25, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.text('Attendee List', margin, 16);

                yPosition = 35;

                // Table header
                pdf.setFillColor(248, 250, 252);
                pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F');
                pdf.setTextColor(100, 100, 100);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                
                const columns = [
                    { label: '#', width: 10 },
                    { label: 'Name', width: 45 },
                    { label: 'Email', width: 60 },
                    { label: 'Status', width: 25 },
                    { label: 'Check-in', width: 25 },
                ];
                
                let xPos = margin;
                columns.forEach(col => {
                    pdf.text(col.label, xPos + 2, yPosition + 5);
                    xPos += col.width;
                });

                yPosition += 10;

                // Table rows
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(0, 0, 0);
                
                const registrations = data.recent_registrations || [];
                registrations.slice(0, 40).forEach((reg: {
                    user_name: string;
                    user_email: string;
                    payment_status: string;
                    checked_in: boolean;
                }, index: number) => {
                    if (yPosition > pageHeight - margin - 10) {
                        pdf.addPage();
                        yPosition = margin;
                    }

                    if (index % 2 === 0) {
                        pdf.setFillColor(252, 252, 253);
                        pdf.rect(margin, yPosition - 4, pageWidth - margin * 2, 8, 'F');
                    }

                    xPos = margin;
                    pdf.setFontSize(8);
                    
                    pdf.text((index + 1).toString(), xPos + 2, yPosition);
                    xPos += columns[0].width;
                    
                    pdf.text(reg.user_name.substring(0, 25), xPos + 2, yPosition);
                    xPos += columns[1].width;
                    
                    pdf.text(reg.user_email.substring(0, 35), xPos + 2, yPosition);
                    xPos += columns[2].width;
                    
                    // Payment status with color
                    const statusColor = reg.payment_status === 'paid' || reg.payment_status === 'free' 
                        ? [16, 185, 129] 
                        : reg.payment_status === 'pending' 
                        ? [245, 158, 11] 
                        : [107, 114, 128];
                    pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
                    pdf.text(reg.payment_status, xPos + 2, yPosition);
                    xPos += columns[3].width;
                    
                    // Check-in status
                    pdf.setTextColor(reg.checked_in ? 16 : 107, reg.checked_in ? 185 : 114, reg.checked_in ? 129 : 128);
                    pdf.text(reg.checked_in ? 'Yes' : 'No', xPos + 2, yPosition);
                    
                    pdf.setTextColor(0, 0, 0);
                    yPosition += 8;
                });

                // Footer
                const totalPages = pdf.internal.pages.length - 1;
                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);
                    pdf.setFontSize(8);
                    pdf.setTextColor(150, 150, 150);
                    pdf.text(
                        `Page ${i} of ${totalPages} | IEEE Sahrdaya - Event Analytics`,
                        pageWidth / 2,
                        pageHeight - 10,
                        { align: 'center' }
                    );
                }

                // Save PDF
                const filename = `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_Report.pdf`;
                pdf.save(filename);

                setExportComplete(option.id);
                toast.success('PDF report generated successfully!');
            }
        } catch (error) {
            console.error('Export error:', error);
            toast.error(error instanceof Error ? error.message : 'Export failed');
        } finally {
            setExporting(null);
            setTimeout(() => setExportComplete(null), 2000);
        }
    }, [eventId, eventTitle, chartContainerRef]);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-ieee-blue text-white rounded-lg hover:bg-ieee-blue/90 transition-colors font-medium"
            >
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown Menu */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20"
                        >
                            <div className="px-4 py-2 border-b border-gray-100">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Export Options
                                </p>
                            </div>

                            <div className="py-1">
                                {EXPORT_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    const isExporting = exporting === option.id;
                                    const isComplete = exportComplete === option.id;

                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => handleExport(option)}
                                            disabled={exporting !== null}
                                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className={`p-2 rounded-lg ${
                                                option.type === 'csv' 
                                                    ? 'bg-green-100 text-green-600'
                                                    : 'bg-red-100 text-red-600'
                                            }`}>
                                                {isExporting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : isComplete ? (
                                                    <Check className="w-4 h-4" />
                                                ) : (
                                                    <Icon className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {option.label}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {option.description}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                                                option.type === 'csv'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {option.type.toUpperCase()}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
