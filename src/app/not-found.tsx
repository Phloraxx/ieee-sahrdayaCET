import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Page Not Found',
};

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <span className="text-6xl font-bold mb-4" role="presentation">404</span>
      <h1 className="text-2xl font-semibold mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go Home
      </Link>
    </main>
  );
}
