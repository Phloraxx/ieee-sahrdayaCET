/**
 * PDF Receipt Generator
 * Generates professional payment receipt PDFs with payment and event details
 */

import jsPDF from 'jspdf';
import { logger } from './api/logger';

interface PaymentDetails {
  amount: number;
  paidAt?: string;
  transactionId?: string;
  rrn?: string;
  utr?: string;
  senderName?: string;
  upiId?: string;
  paymentReference?: string;
}

interface EventDetails {
  title: string;
  venue?: string;
  start_date?: string;
  date?: string;
}

interface UserDetails {
  name: string;
  email: string;
}

interface ReceiptData {
  ticketId: string;
  registrationId: string;
  user: UserDetails;
  event: EventDetails;
  payment: PaymentDetails;
}

/**
 * Generate a PDF receipt for a payment
 * Returns base64-encoded PDF data
 */
export async function generatePaymentReceipt(data: ReceiptData): Promise<string> {
  try {
    const doc = new jsPDF();
    
    // Page margins and dimensions
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPos = margin;

    // Header - Organization name
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('IEEE Sahrdaya SB', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Advancing Technology for Humanity', margin, yPos);
    yPos += 15;

    // Receipt title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Receipt', margin, yPos);
    yPos += 5;
    
    // Horizontal line
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Receipt metadata (right-aligned)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const receiptDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Receipt Generated: ${receiptDate}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 5;
    doc.text(`Receipt ID: ${data.ticketId}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 10;

    // Section: Payer Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Payer Information', margin, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${data.user.name}`, margin + 5, yPos);
    yPos += 5;
    doc.text(`Email: ${data.user.email}`, margin + 5, yPos);
    yPos += 10;

    // Section: Event Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Event Details', margin, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Event: ${data.event.title}`, margin + 5, yPos);
    yPos += 5;
    
    if (data.event.venue) {
      doc.text(`Venue: ${data.event.venue}`, margin + 5, yPos);
      yPos += 5;
    }
    
    const eventDate = data.event.start_date || data.event.date;
    if (eventDate) {
      const formattedDate = new Date(eventDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Date & Time: ${formattedDate}`, margin + 5, yPos);
      yPos += 5;
    }
    
    doc.text(`Registration ID: ${data.registrationId}`, margin + 5, yPos);
    yPos += 10;

    // Section: Payment Details (Highlighted Box)
    const boxY = yPos;
    const boxHeight = 40;
    
    // Draw box background
    doc.setFillColor(240, 248, 255); // Light blue
    doc.rect(margin, boxY, pageWidth - 2 * margin, boxHeight, 'F');
    
    // Draw box border
    doc.setDrawColor(59, 130, 246); // Blue
    doc.setLineWidth(0.5);
    doc.rect(margin, boxY, pageWidth - 2 * margin, boxHeight);
    
    yPos = boxY + 8;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Details', margin + 5, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Amount (Large and bold)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Amount Paid: ₹${data.payment.amount.toFixed(2)}`, margin + 5, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Status: Completed', margin + 5, yPos);
    yPos += 5;
    
    if (data.payment.paidAt) {
      const paidDate = new Date(data.payment.paidAt).toLocaleString('en-IN');
      doc.text(`Payment Date: ${paidDate}`, margin + 5, yPos);
      yPos += 5;
    }
    
    yPos = boxY + boxHeight + 10;

    // Section: Transaction Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction Details', margin, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (data.payment.paymentReference) {
      doc.text(`Payment Reference: ${data.payment.paymentReference}`, margin + 5, yPos);
      yPos += 5;
    }
    
    if (data.payment.rrn || data.payment.utr) {
      const refNumber = data.payment.rrn || data.payment.utr;
      doc.text(`UTR/RRN: ${refNumber}`, margin + 5, yPos);
      yPos += 5;
    }
    
    if (data.payment.transactionId) {
      doc.text(`Transaction ID: ${data.payment.transactionId}`, margin + 5, yPos);
      yPos += 5;
    }
    
    if (data.payment.senderName) {
      doc.text(`Payer Name (from bank): ${data.payment.senderName}`, margin + 5, yPos);
      yPos += 5;
    }
    
    if (data.payment.upiId) {
      doc.text(`UPI ID: ${data.payment.upiId}`, margin + 5, yPos);
      yPos += 5;
    }
    
    yPos += 10;

    // Footer section
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }
    
    // Divider line
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer-generated receipt and does not require a signature.', margin, yPos);
    yPos += 5;
    doc.text('For any queries, please contact events@ieeesahrdaya.com', margin, yPos);
    yPos += 10;
    
    // Organization footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('IEEE Sahrdaya Student Branch', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    doc.text('Sahrdaya College of Engineering & Technology, Kodakara', pageWidth / 2, yPos, { align: 'center' });

    // Generate base64 PDF
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    
    logger.info('Payment receipt PDF generated', {
      ticketId: data.ticketId,
      registrationId: data.registrationId,
    });
    
    return pdfBase64;
  } catch (error) {
    logger.error('Failed to generate payment receipt PDF', 
      error instanceof Error ? error : new Error(String(error)),
      {
        ticketId: data.ticketId,
        registrationId: data.registrationId,
      }
    );
    throw error;
  }
}

/**
 * Generate receipt filename
 */
export function getReceiptFilename(ticketId: string, eventTitle: string): string {
  const sanitizedTitle = eventTitle
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30);
  const date = new Date().toISOString().split('T')[0];
  return `Receipt_${sanitizedTitle}_${ticketId}_${date}.pdf`;
}
