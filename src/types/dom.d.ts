/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */

interface MediaTrackConstraintSet {
  torch?: boolean;
  focusMode?: 'continuous' | 'manual' | 'single-shot';
  exposureMode?: 'continuous' | 'manual' | 'single-shot';
  exposureCompensation?: number;
  brightness?: number;
  contrast?: number;
  focusDistance?: number;
}

interface MediaTrackCapabilities {
  torch?: boolean;
  focusMode?: string[];
  exposureMode?: string[];
  exposureCompensation?: { min: number; max: number; step: number };
  brightness?: { min: number; max: number; step: number };
  contrast?: { min: number; max: number; step: number };
  focusDistance?: { min: number; max: number; step: number };
}
