/**
 * Simple in-memory rate limiter for API routes
 * Tracks requests per user ID and IP address
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory stores for rate limiting
const userLimits = new Map<string, RateLimitEntry>();
const ipLimits = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  
  for (const [key, entry] of userLimits) {
    if (entry.resetAt < now) userLimits.delete(key);
  }
  
  for (const [key, entry] of ipLimits) {
    if (entry.resetAt < now) ipLimits.delete(key);
  }
}

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limitType?: 'user' | 'ip';
}

// Default limits
export const REGISTRATION_LIMITS = {
  perUser: { windowMs: 60 * 60 * 1000, maxRequests: 5 },  // 5 per user per hour
  perIP: { windowMs: 60 * 60 * 1000, maxRequests: 20 },   // 20 per IP per hour
};

/**
 * Check rate limit for a given key
 */
function checkLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  
  const now = Date.now();
  const entry = store.get(key);
  
  // No entry or expired entry
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }
  
  // Entry exists and not expired
  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  
  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Check rate limits for registration endpoint
 * Returns combined result from user and IP checks
 */
export function checkRegistrationRateLimit(
  userId: string | null,
  ip: string
): RateLimitResult {
  // Check IP limit first
  const ipKey = `reg:${ip}`;
  const ipResult = checkLimit(ipLimits, ipKey, REGISTRATION_LIMITS.perIP);
  
  if (!ipResult.allowed) {
    return { ...ipResult, limitType: 'ip' };
  }
  
  // Check user limit if authenticated
  if (userId) {
    const userKey = `reg:${userId}`;
    const userResult = checkLimit(userLimits, userKey, REGISTRATION_LIMITS.perUser);
    
    if (!userResult.allowed) {
      return { ...userResult, limitType: 'user' };
    }
    
    // Return the more restrictive remaining count
    return {
      allowed: true,
      remaining: Math.min(ipResult.remaining, userResult.remaining),
      resetAt: Math.max(ipResult.resetAt, userResult.resetAt),
    };
  }
  
  return ipResult;
}

/**
 * Get client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  // Check common proxy headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback
  return 'unknown';
}


