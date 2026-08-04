export {
  MOTIONPROOF_CERTIFICATION,
  MOTIONPROOF_SCHEMA_VERSION,
  MotionProofRequestSchema,
  MotionProofThemeSchema,
  type CreateMotionOptions,
  type MotionCandidate,
  type MotionProvider,
  type MotionProviderInput,
  type MotionProofArtifact,
  type MotionProofCertification,
  type MotionProofFailure,
  type MotionProofIssue,
  type MotionProofRequest,
  type MotionProofRequestInput,
  type MotionProofResult,
  type MotionProofSuccess,
  type MotionProofTheme,
} from './contracts.ts';
export {
  CHOREOGRAPHY_GUIDANCE,
  EMOTION_MOTION_REFERENCE,
  evaluateMotionQuality,
  MOTION_PATTERNS,
  MOTION_PHILOSOPHY,
  MOTION_QUALITY_POLICY,
  MOTION_QUALITY_THRESHOLDS,
  MOTION_QUALITY_WEIGHTS,
  PROPERTY_SELECTION_GUIDANCE,
  TIMING_EASING_GUIDANCE,
  type MotionProperty,
  type MotionQualityBreakdown,
  type MotionQualityReport,
} from './motion-knowledge/index.ts';
export { createMotion } from './create-motion.ts';
export {
  createCandidateProvider,
  defineMotionProvider,
  normalizeMotionCandidate,
  type MotionProviderFunction,
} from './provider.ts';
export {
  buildRecipeCandidate,
  createRecipeProvider,
  listBuiltInRecipes,
  selectBuiltInRecipe,
  type BuiltInRecipe,
  type BuiltInRecipeId,
} from './recipes.ts';
