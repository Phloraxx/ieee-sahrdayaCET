/**
 * QR Code Generation Module
 * Generates QR codes for event tickets
 */

import QRCode from 'qrcode';
import { logger } from './api/logger';

export interface QRCodeOptions {
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate QR code from ticket ID
 * Returns a base64-encoded PNG image
 */
export async function generateQRCode(
  ticketId: string,
  options?: QRCodeOptions
): Promise<string> {
  const defaultOptions: QRCodeOptions = {
    size: 300,
    errorCorrectionLevel: 'M',
    margin: 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  };

  const finalOptions = { ...defaultOptions, ...options };

  try {
    // Generate QR code as base64 data URL
    const qrCodeDataUrl = await QRCode.toDataURL(ticketId, {
      width: finalOptions.size,
      errorCorrectionLevel: finalOptions.errorCorrectionLevel,
      margin: finalOptions.margin,
      color: finalOptions.color,
      type: 'image/png',
    });

    // Extract just the base64 string (remove "data:image/png;base64," prefix)
    const base64String = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');

    logger.info('QR code generated', {
      ticketId,
      size: finalOptions.size,
      length: base64String.length,
    });

    return base64String;
  } catch (error) {
    logger.error('Failed to generate QR code', error instanceof Error ? error : new Error(String(error)), {
      ticketId,
    });
    throw new Error('QR code generation failed');
  }
}

/**
 * Generate QR code as data URL (includes prefix)
 * Useful for direct embedding in HTML img tags
 */
export async function generateQRCodeDataUrl(
  ticketId: string,
  options?: QRCodeOptions
): Promise<string> {
  const base64 = await generateQRCode(ticketId, options);
  return `data:image/png;base64,${base64}`;
}

/**
 * Validate ticket ID format
 * Ticket IDs should be alphanumeric and reasonable length
 */
export function isValidTicketId(ticketId: string): boolean {
  // Allow alphanumeric, hyphens, underscores
  // Length between 10-50 characters
  const pattern = /^[a-zA-Z0-9_-]{10,50}$/;
  return pattern.test(ticketId);
}
