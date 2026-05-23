'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        An unexpected error occurred in the admin panel. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-[#00629B] text-white rounded-lg hover:bg-[#004D7A] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
