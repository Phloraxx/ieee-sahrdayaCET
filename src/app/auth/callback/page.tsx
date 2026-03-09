'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { account, databases, DATABASE_ID, MEMBERS_COLLECTION_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        // After OAuth redirect, user is authenticated
        // Redirect back to the page they came from or homepage
        const returnTo = sessionStorage.getItem('auth_return_url') || '/';
        sessionStorage.removeItem('auth_return_url');

        // Small delay to ensure session is established
        setTimeout(() => {
            router.push(returnTo);
        }, 500);
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-white text-lg">Completing sign in...</p>
            </div>
        </div>
    );
}
