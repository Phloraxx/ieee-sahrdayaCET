'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

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

const FALLBACK_PAGE_WIDTH = 595;
const FALLBACK_PAGE_HEIGHT = 842;
const PDFJS_SCRIPT_ID = 'adsssc-pdfjs-runtime';
const MAX_RENDER_SCALE = 2.6;
const MIN_RENDER_SCALE = 1.9;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const waitForImageDecode = (src: string, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';

    const fail = () => reject(new Error('Failed to decode rendered PDF page image.'));
    const done = () => resolve();

    if (signal.aborted) {
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

export default function PDFFlipbook({ pdfUrl, isEmbed = false }: PDFFlipbookProps) {
  const flipBookRef = useRef<FlipBookHandle | null>(null);
  const imageUrlsRef = useRef<string[]>([]);
  const lastRequestedPageRef = useRef<number | null>(null);

  const [pageAspectRatio, setPageAspectRatio] = useState(FALLBACK_PAGE_WIDTH / FALLBACK_PAGE_HEIGHT);
  const [bookSize, setBookSize] = useState<BookSize>({ width: 420, height: 594 });
  const [isMobileViewport, setIsMobileViewport] = useState(true);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [loadingProgress, setLoadingProgress] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const revokeImageUrls = useCallback((urls: string[]) => {
    for (const url of urls) {
      URL.revokeObjectURL(url);
    }
  }, []);

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

  useEffect(() => {
    const abortController = new AbortController();

    const boot = async () => {
      setIsLoaded(false);
      setLoadError(null);
      setLoadingProgress(1);
      setCurrentPage(0);
      setTotalPages(0);

      revokeImageUrls(imageUrlsRef.current);
      imageUrlsRef.current = [];
      setPageImages([]);

      try {
        const pdfjs = await getPdfJs();
        const loadingTask = pdfjs.getDocument({ url: pdfUrl });
        const pdf = await loadingTask.promise;

        if (abortController.signal.aborted) {
          await loadingTask.destroy?.();
          await pdf.destroy?.();
          return;
        }

        setTotalPages(pdf.numPages);

        const scale = getRenderScale();
        const firstPage = await pdf.getPage(1);
        const firstViewport = firstPage.getViewport({ scale: 1 });
        setPageAspectRatio(firstViewport.width / firstViewport.height);

        const renderedUrls: string[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (abortController.signal.aborted) {
            revokeImageUrls(renderedUrls);
            await loadingTask.destroy?.();
            await pdf.destroy?.();
            return;
          }

          const page = pageNumber === 1 ? firstPage : await pdf.getPage(pageNumber);
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

          const blob = await canvasToPngBlob(canvas);
          const objectUrl = URL.createObjectURL(blob);
          await waitForImageDecode(objectUrl, abortController.signal);

          renderedUrls.push(objectUrl);

          canvas.width = 0;
          canvas.height = 0;
          page.cleanup?.();

          setLoadingProgress(Math.round((pageNumber / pdf.numPages) * 100));
        }

        if (abortController.signal.aborted) {
          revokeImageUrls(renderedUrls);
          await loadingTask.destroy?.();
          await pdf.destroy?.();
          return;
        }

        imageUrlsRef.current = renderedUrls;
        setPageImages(renderedUrls);
        setCurrentPage(0);
        setLoadingProgress(100);
        setIsLoaded(true);

        pdf.cleanup?.();
        await pdf.destroy?.();
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
    };
  }, [getRenderScale, pdfUrl, reloadKey, revokeImageUrls]);

  useEffect(() => {
    return () => {
      revokeImageUrls(imageUrlsRef.current);
      imageUrlsRef.current = [];
    };
  }, [revokeImageUrls]);

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
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="mt-3 text-sm font-medium tracking-wide text-white/95">
                Loading proceedings... {loadingProgress}%
              </p>
            </div>
          </div>
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
