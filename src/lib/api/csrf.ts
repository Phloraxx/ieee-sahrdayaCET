import { NextRequest } from 'next/server';

export function validateCSRF(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const allowedDomains = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'https://ieeesahrdaya.com',
    'https://www.ieeesahrdaya.com',
  ];

  // Allow requests with no origin/referer (server-to-server, curl, etc.)
  if (!origin && !referer) return true;

  // Check origin
  if (origin) {
    return allowedDomains.some(domain => origin === domain || origin === domain.replace('https://', 'http://'));
  }

  // Check referer with exact match to prevent subdomain spoofing
  if (referer) {
    return allowedDomains.some(domain =>
      referer === domain || referer.startsWith(domain + '/')
    );
  }

  return false;
}
