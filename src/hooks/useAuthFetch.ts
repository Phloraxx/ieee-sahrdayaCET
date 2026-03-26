'use client';

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook that provides an authenticated fetch function.
 * Automatically adds JWT authorization header for cross-origin auth.
 * 
 * Usage:
 *   const authFetch = useAuthFetch();
 *   const response = await authFetch('/api/endpoint', { method: 'POST', body: JSON.stringify(data) });
 */
export function useAuthFetch() {
    const { getJWT } = useAuth();

    const authFetch = useCallback(async (
        url: string,
        options: RequestInit = {}
    ): Promise<Response> => {
        // Get JWT token
        const jwt = await getJWT();
        
        if (!jwt) {
            console.error('[useAuthFetch] No JWT available for request to:', url);
        } else {
            console.log('[useAuthFetch] Making authenticated request to:', url);
        }
        
        // Merge headers
        const headers = new Headers(options.headers);
        
        // Add authorization header if we have a JWT
        if (jwt) {
            headers.set('Authorization', `Bearer ${jwt}`);
        }
        
        // Always include credentials as fallback
        return fetch(url, {
            ...options,
            headers,
            credentials: 'include',
        });
    }, [getJWT]);

    return authFetch;
}

/**
 * Standalone function for getting auth headers (useful in callbacks)
 * Must be called with getJWT from useAuth
 */
export async function getAuthHeaders(
    getJWT: () => Promise<string | null>,
    additionalHeaders: Record<string, string> = {}
): Promise<Record<string, string>> {
    const jwt = await getJWT();
    const headers: Record<string, string> = { ...additionalHeaders };
    
    if (jwt) {
        headers['Authorization'] = `Bearer ${jwt}`;
    }
    
    return headers;
}
