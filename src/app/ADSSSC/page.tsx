'use client';

import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR issues with PDF.js and page-flip
const PDFFlipbook = dynamic(() => import('@/components/PDFFlipbook'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-neutral-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
        <p className="text-white text-lg">Initializing viewer...</p>
      </div>
    </div>
  )
});

export default function ADSSSCPage() {
  return (
    <PDFFlipbook 
      pdfUrl="/Proceedings.pdf" 
      isEmbed={false}
    />
  );
}
