export const MOTION_PATTERNS = {
  entrance: { properties: ['position', 'opacity'] as const, durationMs: [200, 350] as const },
  stateFeedback: { properties: ['scale', 'opacity'] as const, durationMs: [150, 400] as const },
  ambient: { properties: ['rotation', 'opacity'] as const, durationMs: [2_000, 20_000] as const },
  multiElement: { staggerMs: [20, 500] as const },
} as const;
