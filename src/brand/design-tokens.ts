/**
 * Design tokens for Lottie generation.
 * Central source of truth for colors, motion presets, and design constraints.
 */

export const BRAND_COLORS = {
  // Primary palette
  navy: { r: 0.07, g: 0.13, b: 0.28, a: 1.0 },        // #121F47
  electricBlue: { r: 0.25, g: 0.56, b: 0.96, a: 1.0 }, // #408FF5
  white: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },           // #FFFFFF

  // Accent palette
  gold: { r: 1.0, g: 0.76, b: 0.25, a: 1.0 },          // #FFC240
  mint: { r: 0.25, g: 0.84, b: 0.67, a: 1.0 },         // #40D6AB
  coral: { r: 0.96, g: 0.38, b: 0.38, a: 1.0 },        // #F56161

  // Neutrals
  charcoal: { r: 0.20, g: 0.22, b: 0.27, a: 1.0 },     // #333844
  slate: { r: 0.45, g: 0.48, b: 0.55, a: 1.0 },        // #737A8C
  fog: { r: 0.92, g: 0.93, b: 0.95, a: 1.0 },          // #EAEDE2

  // Semantic
  transparent: { r: 0, g: 0, b: 0, a: 0 },
} as const;

export type BrandColor = keyof typeof BRAND_COLORS;

/**
 * Motion presets — personality archetypes tuned for polished brand animation.
 */
export const MOTION_PRESETS = {
  premium: {
    duration: 1.2,         // seconds
    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
    description: 'Smooth, confident, subtle. Executive polish.',
    fps: 60,
    scale: 1.0,
  },
  energetic: {
    duration: 0.6,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    description: 'Fast, decisive, attention-directing. Great for CTAs.',
    fps: 60,
    scale: 1.04,
  },
  subtle: {
    duration: 2.0,
    easing: 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
    description: 'Gentle, ambient, background-friendly. Loading states, idle animations.',
    fps: 30,
    scale: 1.0,
  },
  technical: {
    duration: 1.5,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    description: 'Data-forward, precise, chart-like. Perfect for dashboards and metrics.',
    fps: 60,
    scale: 1.0,
  },
} as const;

export type MotionPreset = keyof typeof MOTION_PRESETS;

/**
 * Default Lottie canvas settings.
 */
export const DEFAULT_CANVAS = {
  width: 512,
  height: 512,
  framerate: 60,
} as const;

/**
 * Helper to convert a BrandColor name to a Lottie-compatible RGBA array.
 */
export function colorToLottie(color: BrandColor): [number, number, number, number] {
  const c = BRAND_COLORS[color];
  return [c.r, c.g, c.b, c.a];
}

/**
 * Helper to convert hex to a Lottie RGBA array.
 */
export function hexToLottie(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return [r, g, b, 1];
}
