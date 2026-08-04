export const TIMING_EASING_GUIDANCE = {
  minimumFeedbackMs: 120,
  maximumAmbientMs: 20_000,
  defaultUiRangeMs: [150, 1_200] as const,
  rules: {
    entrance: 'ease-out',
    exit: 'ease-in',
    onScreen: 'ease-in-out',
    continuousRotation: 'linear',
  },
  lottieEvidence: 'Bezier handles in Lottie keyframes (i/o) provide inspectable easing evidence.',
} as const;
