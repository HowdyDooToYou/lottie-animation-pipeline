export const CHOREOGRAPHY_GUIDANCE = {
  maxUiStaggerMs: 500,
  sharedEventWindowMs: 50,
  sequence: ['setup', 'action', 'resolution'] as const,
  rule: 'Multi-element UI motion should use a bounded stagger and preserve a clear focal hierarchy.',
} as const;
