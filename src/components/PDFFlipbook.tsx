'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { createLogger } from '@/lib/api/logger';

const log = createLogger({ action: 'PDFFlipbook' });

interface PDFFlipbookProps {
  pdfUrl: string;
  isEmbed?: boolean;
}

type FlipCorner = 'top' | 'bottom';

interface PageFlipApi {
  getCurrentPageIndex?: () => number;
  getPageCount?: () => number;
  turnToPage?: (pageNum: number) => void;
  turnToNextPage?: () => void;
  turnToPrevPage?: () => void;
  flip?: (pageNum: number, corner?: FlipCorner) => void;
  flipNext?: (corner?: FlipCorner) => void;
  flipPrev?: (corner?: FlipCorner) => void;
}

interface FlipBookHandle {
  pageFlip: () => PageFlipApi | undefined;
}

interface PdfViewport {
  width: number;
  height: number;
}

interface PdfRenderTask {
  promise: Promise<void>;
}

interface PdfPageProxy {
  getViewport: (params: { scale: number }) => PdfViewport;
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
    intent?: 'display';
  }) => PdfRenderTask;
  cleanup?: () => void;
}

interface PdfDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  cleanup?: () => void;
  destroy?: () => void | Promise<void>;
}

interface PdfLoadingTask {
  promise: Promise<PdfDocumentProxy>;
  destroy?: () => void | Promise<void>;
}

interface PdfJsLib {
  getDocument: (src: { url: string }) => PdfLoadingTask;
  GlobalWorkerOptions: {
    workerSrc: string;
  };
}

interface WindowWithPdfJs extends Window {
  pdfjsLib?: PdfJsLib;
  __adssscPdfJsLoadingPromise?: Promise<PdfJsLib>;
}

interface BookSize {
  width: number;
  height: number;
}

interface PageCache {
  url: string;
  pageNumber: number;
  lastAccessed: number;
}

const FALLBACK_PAGE_WIDTH = 595;
const FALLBACK_PAGE_HEIGHT = 842;
const PDFJS_SCRIPT_ID = 'adsssc-pdfjs-runtime';
const MAX_RENDER_SCALE = 2.6;
const MIN_RENDER_SCALE = 1.9;

// Optimization constants
const INITIAL_PAGES_TO_RENDER = 4; // Show flipbook after this many pages
const MAX_CACHE_SIZE = 24; // Keep this many pages in memory
const PRELOAD_AHEAD = 3; // Preload this many pages ahead of current
const PRELOAD_BEHIND = 1; // Keep this many pages behind current

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const waitForImageDecode = (src: string, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';

    const fail = () => reject(new Error('Failed to decode rendered PDF page image.'));
    const done = () => resolve();

    if (signal?.aborted) {
      reject(new Error('Loading aborted'));
      return;
    }

    image.onload = done;
    image.onerror = fail;
    image.src = src;
  });

const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to convert rendered page to image.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });

const computeBookSize = (viewportWidth: number, viewportHeight: number, pageAspectRatio: number): BookSize => {
  const mobile = viewportWidth < 768;
  const sidePadding = mobile ? 8 : 24;
  const topPadding = mobile ? 8 : 12;
  const availableWidth = Math.max(240, viewportWidth - sidePadding * 2);
  const availableHeight = Math.max(280, viewportHeight - topPadding * 2);

  const maxPageWidth = mobile ? availableWidth : availableWidth / 2;
  const width = Math.floor(clamp(Math.min(maxPageWidth, availableHeight * pageAspectRatio), 180, 1400));
  const height = Math.floor(clamp(width / pageAspectRatio, 240, 2000));

  return { width, height };
};

const getPdfJs = async (): Promise<PdfJsLib> => {
  if (typeof window === 'undefined') {
    throw new Error('PDF viewer is only available in the browser.');
  }

  const typedWindow = window as WindowWithPdfJs;

  if (typedWindow.pdfjsLib) {
    typedWindow.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    return typedWindow.pdfjsLib;
  }

  if (!typedWindow.__adssscPdfJsLoadingPromise) {
    typedWindow.__adssscPdfJsLoadingPromise = new Promise<PdfJsLib>((resolve, reject) => {
      const existingScript = document.getElementById(PDFJS_SCRIPT_ID) as HTMLScriptElement | null;

      const handleReady = () => {
        if (!typedWindow.pdfjsLib) {
          reject(new Error('PDF.js runtime did not initialize correctly.'));
          return;
        }
        typedWindow.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        resolve(typedWindow.pdfjsLib);
      };

      if (existingScript) {
        if (typedWindow.pdfjsLib) {
          handleReady();
          return;
        }
        existingScript.addEventListener('load', handleReady, { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load PDF.js runtime.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = PDFJS_SCRIPT_ID;
      script.src = '/pdf.min.js';
      script.async = true;
      script.onload = handleReady;
      script.onerror = () => reject(new Error('Failed to load PDF.js runtime.'));
      document.head.appendChild(script);
    });
  }

  return typedWindow.__adssscPdfJsLoadingPromise;
};

// Page cache class with LRU eviction
class PageImageCache {
  private cache: Map<number, PageCache> = new Map();
  private maxSize: number;
  private protectedPages: Set<number>;

  constructor(maxSize: number, protectedPages: number[] = []) {
    this.maxSize = maxSize;
    this.protectedPages = new Set(protectedPages);
  }

  get(pageNumber: number): string | null {
    const entry = this.cache.get(pageNumber);
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.url;
    }
    return null;
  }

  set(pageNumber: number, url: string): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(pageNumber)) {
      this.evictLRU();
    }

    this.cache.set(pageNumber, {
      url,
      pageNumber,
      lastAccessed: Date.now(),
    });
  }

  has(pageNumber: number): boolean {
    return this.cache.has(pageNumber);
  }

  private evictLRU(): void {
    let oldestTime = Infinity;
    let oldestPage: number | null = null;

    for (const [pageNum, entry] of this.cache) {
      // Don't evict protected pages (first few pages)
      if (this.protectedPages.has(pageNum)) continue;
      
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestPage = pageNum;
      }
    }

    if (oldestPage !== null) {
      const entry = this.cache.get(oldestPage);
      if (entry) {
        URL.revokeObjectURL(entry.url);
      }
      this.cache.delete(oldestPage);
    }
  }

  clear(): void {
    for (const entry of this.cache.values()) {
      URL.revokeObjectURL(entry.url);
    }
    this.cache.clear();
  }

  getAllUrls(): Map<number, string> {
    const urls = new Map<number, string>();
    for (const [pageNum, entry] of this.cache) {
      urls.set(pageNum, entry.url);
    }
    return urls;
  }

  updateProtectedPages(pages: number[]): void {
    this.protectedPages = new Set(pages);
  }
}

export default function PDFFlipbook({ pdfUrl, isEmbed = false }: PDFFlipbookProps) {
  const flipBookRef = useRef<FlipBookHandle | null>(null);
  const lastRequestedPageRef = useRef<number | null>(null);
  const pageCacheRef = useRef<PageImageCache | null>(null);
  const pdfDocRef = useRef<PdfDocumentProxy | null>(null);
  const renderingPagesRef = useRef<Set<number>>(new Set());
  const backgroundRenderAbortRef = useRef<AbortController | null>(null);
  const totalPagesRef = useRef(0);

  const [pageAspectRatio, setPageAspectRatio] = useState(FALLBACK_PAGE_WIDTH / FALLBACK_PAGE_HEIGHT);
  const [bookSize, setBookSize] = useState<BookSize>({ width: 420, height: 594 });
  const [isMobileViewport, setIsMobileViewport] = useState(true);
  const [pageImages, setPageImages] = useState<(string | null)[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingPages, setLoadingPages] = useState<Set<number>>(new Set());

  const recalculateBookSize = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    setIsMobileViewport(window.innerWidth < 768);
    setBookSize(computeBookSize(window.innerWidth, window.innerHeight, pageAspectRatio));
  }, [pageAspectRatio]);

  const getRenderScale = useCallback(() => {
    if (typeof window === 'undefined') {
      return MIN_RENDER_SCALE;
    }
    const dpr = window.devicePixelRatio || 1;
    return clamp(dpr * 1.25, MIN_RENDER_SCALE, MAX_RENDER_SCALE);
  }, []);

  useEffect(() => {
    recalculateBookSize();
    window.addEventListener('resize', recalculateBookSize);
    return () => window.removeEventListener('resize', recalculateBookSize);
  }, [recalculateBookSize]);

  // Main boot effect - stable dependencies only
  useEffect(() => {
    const abortController = new AbortController();

    // Helper: Render a single page
    const renderPageInternal = async (
      pageNumber: number,
      pdf: PdfDocumentProxy,
      scale: number,
      signal?: AbortSignal
    ): Promise<string | null> => {
      const cached = pageCacheRef.current?.get(pageNumber);
      if (cached) return cached;

      if (renderingPagesRef.current.has(pageNumber)) return null;

      renderingPagesRef.current.add(pageNumber);
      setLoadingPages(prev => new Set(prev).add(pageNumber));

      try {
        if (signal?.aborted) return null;

        const page = await pdf.getPage(pageNumber);
        if (signal?.aborted) {
          page.cleanup?.();
          return null;
        }

        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });

        if (!context) {
          throw new Error('Unable to create rendering surface.');
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: context, viewport, intent: 'display' }).promise;

        if (signal?.aborted) {
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup?.();
          return null;
        }

        const blob = await canvasToPngBlob(canvas);
        const objectUrl = URL.createObjectURL(blob);
        await waitForImageDecode(objectUrl, signal);

        canvas.width = 0;
        canvas.height = 0;
        page.cleanup?.();

        pageCacheRef.current?.set(pageNumber, objectUrl);
        return objectUrl;
      } catch (error) {
        if (signal?.aborted) return null;
        log.error(`Failed to render page ${pageNumber}`, error instanceof Error ? error : new Error(String(error)));
        return null;
      } finally {
        renderingPagesRef.current.delete(pageNumber);
        setLoadingPages(prev => {
          const next = new Set(prev);
          next.delete(pageNumber);
          return next;
        });
      }
    };

    // Helper: Sync page images from cache
    const syncFromCache = () => {
      if (!pageCacheRef.current || totalPagesRef.current === 0) return;
      
      const newImages: (string | null)[] = [];
      for (let i = 1; i <= totalPagesRef.current; i++) {
        newImages.push(pageCacheRef.current.get(i));
      }
      setPageImages(newImages);
      setPagesLoaded(newImages.filter(Boolean).length);
    };

    // Helper: Background render remaining pages
    const backgroundRender = async (
      pdf: PdfDocumentProxy,
      scale: number,
      startFrom: number,
      signal: AbortSignal
    ) => {
      for (let pageNum = startFrom; pageNum <= pdf.numPages; pageNum++) {
        if (signal.aborted) break;
        
        if (!pageCacheRef.current?.has(pageNum) && !renderingPagesRef.current.has(pageNum)) {
          await new Promise<void>(resolve => {
            if ('requestIdleCallback' in window) {
              (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => resolve());
            } else {
              setTimeout(resolve, 50);
            }
          });
          
          if (signal.aborted) break;
          
          await renderPageInternal(pageNum, pdf, scale, signal);
          syncFromCache();
          setLoadingProgress(Math.round((pageCacheRef.current?.getAllUrls().size || 0) / pdf.numPages * 100));
        }
      }
    };

    const boot = async () => {
      setIsLoaded(false);
      setLoadError(null);
      setLoadingProgress(0);
      setPagesLoaded(0);
      setCurrentPage(0);
      setTotalPages(0);
      totalPagesRef.current = 0;
      setPageImages([]);
      setLoadingPages(new Set());

      pageCacheRef.current?.clear();
      backgroundRenderAbortRef.current?.abort();

      try {
        const pdfjs = await getPdfJs();
        if (abortController.signal.aborted) {
          return;
        }

        const loadingTask = pdfjs.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;

        if (abortController.signal.aborted) {
          await loadingTask.destroy?.();
          await pdf.destroy?.();
          return;
        }

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        totalPagesRef.current = pdf.numPages;

        const protectedPages = Array.from({ length: Math.min(INITIAL_PAGES_TO_RENDER, pdf.numPages) }, (_, i) => i + 1);
        pageCacheRef.current = new PageImageCache(MAX_CACHE_SIZE, protectedPages);

        const scale = getRenderScale();
        
        const firstPage = await pdf.getPage(1);
        if (abortController.signal.aborted) {
          firstPage.cleanup?.();
          return;
        }
        const firstViewport = firstPage.getViewport({ scale: 1 });
        setPageAspectRatio(firstViewport.width / firstViewport.height);
        firstPage.cleanup?.();

        setPageImages(Array(pdf.numPages).fill(null));

        const initialPagesToRender = Math.min(INITIAL_PAGES_TO_RENDER, pdf.numPages);
        
        for (let pageNum = 1; pageNum <= initialPagesToRender; pageNum++) {
          if (abortController.signal.aborted) {
            break;
          }
          
          await renderPageInternal(pageNum, pdf, scale, abortController.signal);
          syncFromCache();
          setLoadingProgress(Math.round((pageNum / pdf.numPages) * 100));
        }

        if (abortController.signal.aborted) {
          return;
        }

        setIsLoaded(true);
        setCurrentPage(0);

        backgroundRenderAbortRef.current = new AbortController();
        void backgroundRender(pdf, scale, initialPagesToRender + 1, backgroundRenderAbortRef.current.signal);

      } catch (error) {
        if (!abortController.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load proceedings viewer.');
          setIsLoaded(false);
        }
      }
    };

    void boot();

    return () => {
      abortController.abort();
      backgroundRenderAbortRef.current?.abort();
    };
  }, [pdfUrl, reloadKey, getRenderScale]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pageCacheRef.current?.clear();
      backgroundRenderAbortRef.current?.abort();
      if (pdfDocRef.current) {
        pdfDocRef.current.cleanup?.();
        void pdfDocRef.current.destroy?.();
      }
    };
  }, []);

  // Preload pages when current page changes
  useEffect(() => {
    if (!isLoaded || !pdfDocRef.current || totalPages === 0) return;

    const pdf = pdfDocRef.current;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const scale = clamp(dpr * 1.25, MIN_RENDER_SCALE, MAX_RENDER_SCALE);

    const preloadAroundPage = async () => {
      const pagesToLoad: number[] = [];
      const currentPageNum = currentPage + 1;
      
      pagesToLoad.push(currentPageNum);
      if (!isMobileViewport && currentPageNum + 1 <= totalPages) {
        pagesToLoad.push(currentPageNum + 1);
      }

      for (let i = 1; i <= PRELOAD_AHEAD; i++) {
        const ahead = currentPageNum + (isMobileViewport ? i : i * 2);
        if (ahead <= totalPages && !pageCacheRef.current?.has(ahead)) {
          pagesToLoad.push(ahead);
        }
      }

      for (let i = 1; i <= PRELOAD_BEHIND; i++) {
        const behind = currentPageNum - (isMobileViewport ? i : i * 2);
        if (behind >= 1 && !pageCacheRef.current?.has(behind)) {
          pagesToLoad.push(behind);
        }
      }

      for (const pageNum of pagesToLoad) {
        if (!pageCacheRef.current?.has(pageNum) && !renderingPagesRef.current.has(pageNum)) {
          const cached = pageCacheRef.current?.get(pageNum);
          if (cached) continue;

          renderingPagesRef.current.add(pageNum);
          setLoadingPages(prev => new Set(prev).add(pageNum));

          try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { alpha: false });

            if (context) {
              canvas.width = Math.ceil(viewport.width);
              canvas.height = Math.ceil(viewport.height);
              context.fillStyle = '#ffffff';
              context.fillRect(0, 0, canvas.width, canvas.height);

              await page.render({ canvasContext: context, viewport, intent: 'display' }).promise;

              const blob = await canvasToPngBlob(canvas);
              const objectUrl = URL.createObjectURL(blob);
              await waitForImageDecode(objectUrl);

              canvas.width = 0;
              canvas.height = 0;
              page.cleanup?.();

              pageCacheRef.current?.set(pageNum, objectUrl);

              // Update page images
              if (pageCacheRef.current && totalPagesRef.current > 0) {
                const newImages: (string | null)[] = [];
                for (let i = 1; i <= totalPagesRef.current; i++) {
                  newImages.push(pageCacheRef.current.get(i));
                }
                setPageImages(newImages);
                setPagesLoaded(newImages.filter(Boolean).length);
              }
            }
          } catch (error) {
            log.error(`Failed to preload page ${pageNum}`, error instanceof Error ? error : new Error(String(error)));
          } finally {
            renderingPagesRef.current.delete(pageNum);
            setLoadingPages(prev => {
              const next = new Set(prev);
              next.delete(pageNum);
              return next;
            });
          }
        }
      }
    };

    void preloadAroundPage();
  }, [currentPage, isLoaded, totalPages, isMobileViewport]);

  const getPageFlipApi = useCallback(() => flipBookRef.current?.pageFlip?.(), []);
  const isSpreadViewport = !isMobileViewport;

  const goToPage = useCallback((pageNumber: number) => {
    const api = getPageFlipApi();
    if (!api || totalPages <= 0) {
      return;
    }

    const requestedPage = clamp(Math.floor(pageNumber), 1, totalPages);
    const requestedIndex = requestedPage - 1;
    const targetIndex = isSpreadViewport
      ? Math.max(0, requestedIndex - (requestedIndex % 2))
      : requestedIndex;

    lastRequestedPageRef.current = requestedPage;

    if (typeof api.turnToPage === 'function') {
      api.turnToPage(targetIndex);
    } else if (typeof api.flip === 'function') {
      api.flip(targetIndex, 'top');
    }

    setPageInput(String(requestedPage));
  }, [getPageFlipApi, isSpreadViewport, totalPages]);

  const goToNextPage = useCallback(() => {
    const api = getPageFlipApi();
    if (!api) {
      return;
    }
    if (typeof api.flipNext === 'function') {
      api.flipNext('top');
      return;
    }
    api.turnToNextPage?.();
  }, [getPageFlipApi]);

  const goToPrevPage = useCallback(() => {
    const api = getPageFlipApi();
    if (!api) {
      return;
    }
    if (typeof api.flipPrev === 'function') {
      api.flipPrev('top');
      return;
    }
    api.turnToPrevPage?.();
  }, [getPageFlipApi]);

  const handlePageJump = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number.parseInt(pageInput, 10);

    if (Number.isNaN(parsed)) {
      setPageInput(String(Math.min(currentPage + 1, Math.max(totalPages, 1))));
      return;
    }

    goToPage(parsed);
  }, [currentPage, goToPage, pageInput, totalPages]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextPage();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage, isLoaded]);

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < Math.max(totalPages - 1, 0);
  const flipbookKey = `${bookSize.width}x${bookSize.height}-${pageImages.length}-${isMobileViewport ? 'mobile' : 'spread'}`;
  const pageStatusText = isMobileViewport
    ? `${Math.min(currentPage + 1, totalPages)} / ${totalPages}`
    : `${Math.min(currentPage + 1, totalPages)}-${Math.min(currentPage + 2, totalPages)} / ${totalPages}`;

  return (
    <div className={`relative w-full overflow-hidden bg-neutral-950 text-white ${isEmbed ? 'h-[100dvh]' : 'h-[100dvh]'}`}>
      {!isLoaded && !loadError && (
        <div className="absolute inset-0 z-30">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/AGM.webp')" }}
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 text-center">
            <h1 className="text-4xl font-semibold tracking-[0.35em] text-white drop-shadow-lg sm:text-5xl">IEEE</h1>
            <h2 className="mt-2 text-4xl font-semibold tracking-[0.2em] text-white drop-shadow-lg sm:text-5xl">ADSSSC</h2>

            <div className="mt-8 w-full max-w-md">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(loadingProgress, (pagesLoaded / Math.max(totalPages, 1)) * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-sm font-medium tracking-wide text-white/95">
                {totalPages > 0 
                  ? `Loading page ${Math.min(pagesLoaded + 1, totalPages)} of ${totalPages}...`
                  : 'Initializing viewer...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Background loading indicator when flipbook is shown but still loading pages */}
      {isLoaded && pagesLoaded < totalPages && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs backdrop-blur-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{pagesLoaded}/{totalPages} pages</span>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center px-2 py-2 sm:px-4">
        {loadError ? (
          <div className="w-full max-w-md rounded-xl border border-red-400/35 bg-black/70 p-6 text-center">
            <p className="text-sm text-red-200">{loadError}</p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="mx-auto mt-4 inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" />
              Reload viewer
            </button>
          </div>
        ) : null}

        {isLoaded && !loadError && pageImages.length > 0 ? (
          <div className="adsssc-flipbook flex h-full w-full items-center justify-center overflow-hidden">
            <HTMLFlipBook
              key={flipbookKey}
              ref={flipBookRef}
              className="mx-auto"
              style={{ margin: '0 auto' }}
              width={bookSize.width}
              height={bookSize.height}
              size="fixed"
              minWidth={bookSize.width}
              maxWidth={bookSize.width}
              minHeight={bookSize.height}
              maxHeight={bookSize.height}
              drawShadow={true}
              flippingTime={780}
              usePortrait={isMobileViewport}
              startZIndex={0}
              autoSize={false}
              maxShadowOpacity={0.35}
              showCover={false}
              mobileScrollSupport={false}
              clickEventForward={true}
              useMouseEvents={true}
              swipeDistance={24}
              showPageCorners={true}
              disableFlipByClick={false}
              startPage={Math.min(currentPage, Math.max(totalPages - 1, 0))}
              onFlip={(event: { data: number }) => {
                if (typeof event?.data === 'number') {
                  const nextIndex = event.data;
                  setCurrentPage(nextIndex);

                  const requestedPage = lastRequestedPageRef.current;
                  if (requestedPage !== null) {
                    const leftVisible = nextIndex + 1;
                    const rightVisible = Math.min(nextIndex + (isMobileViewport ? 1 : 2), totalPages);
                    const visibleRequestedPage = requestedPage >= leftVisible && requestedPage <= rightVisible;
                    setPageInput(String(visibleRequestedPage ? requestedPage : leftVisible));
                    lastRequestedPageRef.current = null;
                  } else {
                    setPageInput(String(nextIndex + 1));
                  }
                }
              }}
            >
              {pageImages.map((imageSrc, index) => (
                <div key={`adsssc-page-${index + 1}`} className="h-full w-full bg-white">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={`Proceedings page ${index + 1}`}
                      className="h-full w-full select-none object-contain"
                      draggable={false}
                      style={{
                        imageRendering: 'auto',
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(0)',
                      }}
                    />
                  ) : (
                    // Placeholder for pages not yet rendered
                    <div className="flex h-full w-full items-center justify-center bg-gray-100">
                      {loadingPages.has(index + 1) ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                          <span className="text-xs text-gray-500">Loading page {index + 1}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <div className="h-8 w-8 rounded border-2 border-dashed border-gray-300" />
                          <span className="text-xs">Page {index + 1}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </HTMLFlipBook>
          </div>
        ) : null}
      </div>

      {isLoaded && !loadError ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 sm:bottom-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/20 bg-black/70 px-2 py-2 backdrop-blur-sm sm:gap-3 sm:px-3">
            <button
              type="button"
              onClick={goToPrevPage}
              disabled={!canGoPrevious}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <span className="min-w-[98px] text-center text-sm font-medium">
              {pageStatusText}
            </span>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={!canGoNext}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <form onSubmit={handlePageJump} className="ml-1 flex items-center gap-1 rounded-lg bg-white/10 px-1.5 py-1">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={Math.max(totalPages, 1)}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                className="w-14 border-0 bg-transparent px-1 text-center text-sm text-white outline-none [appearance:textfield]"
                aria-label="Page number"
              />
              <button
                type="submit"
                className="rounded-md bg-white/15 px-2 py-1 text-xs font-medium transition hover:bg-white/25"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .adsssc-flipbook .stf__parent {
          margin: 0 auto;
        }

        .adsssc-flipbook .stf__item {
          background: #ffffff;
        }
      `}</style>
    </div>
  );
}
