export const PROPERTY_SELECTION_GUIDANCE = {
  preferred: ['position', 'scale', 'rotation', 'opacity'] as const,
  entrance: ['position', 'opacity'] as const,
  stateChange: ['scale', 'opacity'] as const,
  rule: 'Opacity supplements a meaningful transform; it should not be the only signal for an important state change.',
} as const;

export type MotionProperty = 'p' | 's' | 'r' | 'o';
