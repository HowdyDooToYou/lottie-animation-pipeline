/**
 * Generator pipeline index.
 * Handles prompt → Lottie JSON → validate → output flow.
 */

export { buildSystemPrompt, FEW_SHOT_EXAMPLES, LOTTIE_CHEATSHEET } from './system-prompt.ts';
export { validateLottie, isLottieJson, autoFixLottie, LottieSchema } from './schema.ts';
export type { LottieAnimation, LottieLayer } from './schema.ts';
export { generateLottie, generateToFile } from './client.ts';
