'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { account } from '@/lib/appwrite';
import {
    createPasskeyForSignedInUser,
    getPasskeyStatus,
    isPasskeySupported,
    PasskeyClientError,
} from '@/lib/passkeys/client';

export default function AuthCallback() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [needsPasskeySetup, setNeedsPasskeySetup] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const returnToRef = useRef('/');
    const autoPromptedRef = useRef(false);

    const goBack = useCallback(() => {
        router.replace(returnToRef.current || '/');
    }, [router]);

    const handleCreatePasskey = useCallback(async () => {
        setCreating(true);
        setError(null);

        try {
            await createPasskeyForSignedInUser();
            goBack();
            return;
        } catch (err) {
            console.error('Passkey setup error:', err);

            if (err instanceof PasskeyClientError) {
                if (err.code === 'ABORTED') {
                    setError('Passkey setup cancelled. You can create it now or later.');
                } else if (err.code === 'NOT_SIGNED_IN') {
                    goBack();
                    return;
                } else {
                    setError('Could not create passkey right now. You can try again.');
                }
            } else {
                setError('Could not create passkey right now. You can try again.');
            }
        } finally {
            setCreating(false);
            setLoading(false);
        }
    }, [goBack]);

    useEffect(() => {
        const returnTo = sessionStorage.getItem('auth_return_url') || '/';
        sessionStorage.removeItem('auth_return_url');
        returnToRef.current = returnTo;

        let isCancelled = false;

        const initialize = async () => {
            try {
                await account.get();
            } catch {
                goBack();
                return;
            }

            if (!isPasskeySupported()) {
                goBack();
                return;
            }

            try {
                const status = await getPasskeyStatus();
                if (!status.signedIn) {
                    goBack();
                    return;
                }

                if (status.hasPasskey) {
                    goBack();
                    return;
                }

                if (!isCancelled) {
                    setNeedsPasskeySetup(true);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Passkey status check error:', err);
                if (!isCancelled) {
                    setLoading(false);
                    setNeedsPasskeySetup(true);
                }
            }
        };

        void initialize();

        return () => {
            isCancelled = true;
        };
    }, [goBack]);

    useEffect(() => {
        if (!needsPasskeySetup || loading || creating || autoPromptedRef.current) return;

        autoPromptedRef.current = true;
        void handleCreatePasskey();
    }, [creating, handleCreatePasskey, loading, needsPasskeySetup]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-black px-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-7 text-center backdrop-blur-sm">
                {(loading || creating) && (
                    <>
                        <div className="w-14 h-14 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-white text-lg font-semibold">
                            {creating ? 'Creating your passkey...' : 'Completing sign in...'}
                        </p>
                        <p className="text-white/70 text-sm mt-2">
                            {creating ? 'This keeps future sign-ins and payments more secure.' : 'Just a moment.'}
                        </p>
                    </>
                )}

                {!loading && !creating && needsPasskeySetup && (
                    <>
                        <h1 className="text-white text-xl font-semibold">Secure your account with a passkey</h1>
                        <p className="text-white/70 text-sm mt-3">
                            You just signed in with Google. Create a passkey for faster, safer sign-ins and payment verification.
                        </p>

                        {error && (
                            <p className="mt-4 text-xs text-red-300" role="alert">
                                {error}
                            </p>
                        )}

                        <div className="mt-6 flex flex-col gap-3">
                            <button
                                onClick={() => void handleCreatePasskey()}
                                className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition-colors"
                            >
                                Create Passkey
                            </button>
                            <button
                                onClick={goBack}
                                className="w-full rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                            >
                                Skip for now
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
