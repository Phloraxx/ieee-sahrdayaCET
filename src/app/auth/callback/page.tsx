'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { account, databases, DATABASE_ID, MEMBERS_COLLECTION_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const currentUser = await account.get();
                const res = await databases.listDocuments(DATABASE_ID, MEMBERS_COLLECTION_ID, [
                    Query.equal('userID', currentUser.$id),
                    Query.limit(1),
                ]);

                if (res.documents.length > 0 && res.documents[0].profileCompleted === true) {
                    const returnTo = sessionStorage.getItem('auth_return_url') || '/';
                    sessionStorage.removeItem('auth_return_url');
                    router.replace(returnTo);
                } else {
                    sessionStorage.removeItem('auth_return_url');
                    router.replace('/setup-profile');
                }
            } catch {
                // If we can't verify, send to home and let AuthContext handle it
                router.replace('/');
            }
        };

        // Small delay to ensure Appwrite session is established
        setTimeout(handleCallback, 500);
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
