// SVG path data for the page transition curtain overlay.
//
// viewBox: 0 0 1440 540  (matches the overlay SVG element)
// Each style contains 5 <path> variants.
// All paths must cover the ENTIRE 1440×540 area (they stack as colored layers).
// The "wave" on the bottom edge is purely decorative and creates the ripple look.
//
// Layer stacking: all 5 paths overlap the full canvas.  GSAP staggers
// their scaleY animation so they appear/disappear one-by-one like a wave curtain.

export type SvgStyle = 'waves' | 'slash' | 'blobs' | 'zigzag' | 'sine' | 'step';

export const SVG_PATHS: Record<SvgStyle, string[]> = {
  // ── Smooth horizontal waves (Home / default — blue) ─────────────────────────
  waves: [
    // Layer 0 — deepest wave
    'M0,0 L1440,0 L1440,540 Q1080,480 720,510 Q360,540 0,500 Z',
    // Layer 1
    'M0,0 L1440,0 L1440,540 Q1100,460 720,500 Q340,540 0,480 Z',
    // Layer 2
    'M0,0 L1440,0 L1440,540 Q1000,470 720,505 Q440,540 0,490 Z',
    // Layer 3
    'M0,0 L1440,0 L1440,540 Q1060,455 720,495 Q380,535 0,475 Z',
    // Layer 4 — top layer (flattest, fills last)
    'M0,0 L1440,0 L1440,540 Q1020,490 720,515 Q420,540 0,505 Z',
  ],

  // ── Sharp diagonal slash (Events — orange) ───────────────────────────────────
  slash: [
    'M0,0 L1440,0 L1440,540 L1440,420 L0,100 Z',
    'M0,0 L1440,0 L1440,540 L1440,460 L0,60  Z',
    'M0,0 L1440,0 L1440,540 L1440,380 L0,140 Z',
    'M0,0 L1440,0 L1440,540 L1440,500 L0,20  Z',
    'M0,0 L1440,0 L1440,540 L1440,440 L0,80  Z',
  ],

  // ── Organic blob curves (Societies — green) ──────────────────────────────────
  blobs: [
    'M0,0 L1440,0 L1440,540 C1200,480 900,520 720,500 C540,480 240,540 0,510 Z',
    'M0,0 L1440,0 L1440,540 C1100,460 800,510 600,490 C400,470 200,540 0,505 Z',
    'M0,0 L1440,0 L1440,540 C1300,470 1000,495 720,485 C440,475 200,540 0,495 Z',
    'M0,0 L1440,0 L1440,540 C1200,450 900,500 720,480 C540,460 300,540 0,490 Z',
    'M0,0 L1440,0 L1440,540 C1100,480 800,520 550,500 C300,480 150,540 0,520 Z',
  ],

  // ── Geometric zigzag (Execom — purple) ───────────────────────────────────────
  zigzag: [
    'M0,0 L1440,0 L1440,540 L1440,400 L1200,480 L960,400 L720,480 L480,400 L240,480 L0,400 Z',
    'M0,0 L1440,0 L1440,540 L1440,440 L1080,360 L720,440 L360,360 L0,440 Z',
    'M0,0 L1440,0 L1440,540 L1440,380 L1300,460 L1080,380 L860,460 L640,380 L420,460 L200,380 L0,460 Z',
    'M0,0 L1440,0 L1440,540 L1440,420 L1200,500 L960,420 L720,500 L480,420 L240,500 L0,420 Z',
    'M0,0 L1440,0 L1440,540 L1440,460 L1100,380 L770,460 L440,380 L0,460 Z',
  ],

  // ── Smooth sine wave (Auth — red) ────────────────────────────────────────────
  sine: [
    'M0,0 L1440,0 L1440,540 C1320,520 1260,480 1080,480 C900,480 840,520 720,520 C600,520 540,480 360,480 C180,480 120,520 0,520 Z',
    'M0,0 L1440,0 L1440,540 C1260,510 1200,460 1020,460 C840,460 780,510 720,510 C660,510 540,460 360,460 C180,460 120,510 0,510 Z',
    'M0,0 L1440,0 L1440,540 C1320,530 1200,490 1080,490 C960,490 840,530 720,530 C600,530 480,490 360,490 C240,490 120,530 0,530 Z',
    'M0,0 L1440,0 L1440,540 C1200,505 1100,465 900,465 C700,465 620,505 720,505 C820,505 760,465 540,465 C320,465 180,505 0,505 Z',
    'M0,0 L1440,0 L1440,540 C1300,515 1220,475 1020,475 C820,475 740,515 720,515 C700,515 580,475 380,475 C180,475 90,515 0,515 Z',
  ],

  // ── Staircase steps (Setup profile — teal) ────────────────────────────────────
  step: [
    'M0,0 L1440,0 L1440,540 L1440,440 L1200,440 L1200,480 L960,480 L960,440 L720,440 L720,480 L480,480 L480,440 L240,440 L240,480 L0,480 Z',
    'M0,0 L1440,0 L1440,540 L1440,460 L1320,460 L1320,500 L1080,500 L1080,460 L840,460 L840,500 L600,500 L600,460 L360,460 L360,500 L120,500 L120,460 L0,460 Z',
    'M0,0 L1440,0 L1440,540 L1440,420 L1200,420 L1200,500 L960,500 L960,420 L720,420 L720,500 L480,500 L480,420 L240,420 L240,500 L0,500 Z',
    'M0,0 L1440,0 L1440,540 L1440,450 L1100,450 L1100,510 L880,510 L880,450 L660,450 L660,510 L440,510 L440,450 L220,450 L220,510 L0,510 Z',
    'M0,0 L1440,0 L1440,540 L1440,470 L1250,470 L1250,510 L950,510 L950,470 L650,470 L650,510 L350,510 L350,470 L0,470 Z',
  ],
};

// Map route labels → svg styles
export const ROUTE_SVG_STYLE: Record<string, SvgStyle> = {
  home:    'waves',
  events:  'slash',
  societies: 'blobs',
  execom:  'zigzag',
  auth:    'sine',
  setup:   'step',
  default: 'waves',
};
