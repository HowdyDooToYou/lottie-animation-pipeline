export const EMOTION_MOTION_REFERENCE = {
  calm: { character: 'smooth and restrained', durationMs: [500, 1_000] as const },
  confidence: { character: 'direct and decisive', durationMs: [200, 400] as const },
  success: { character: 'clear with controlled settle', durationMs: [200, 400] as const },
  urgency: { character: 'fast and direct', durationMs: [100, 200] as const },
} as const;

// This reference is available to hosts and recipe authors; the evaluator does
// not infer an emotion from arbitrary Lottie JSON.
