import type { MotionProofRequest } from './contracts.ts';

export function buildProviderPrompt(request: MotionProofRequest): string {
  return [
    'You are generating one production Lottie/Bodymovin animation for MotionProof.',
    'Return JSON only. Do not use Markdown.',
    '',
    'Hard requirements:',
    '- Strict Lottie JSON with v, fr, ip, op, w, h, and non-empty layers.',
    '- Every layer has numeric ty, ip, op, st, and a valid ks transform.',
    '- Every shape group includes a final tr transform item.',
    '- Use shape layers and transform/opacity keyframes; avoid raster assets.',
    '- Do not use expressions, scripts, image/audio layers, remote URLs, or external fonts.',
    '- Use exponential easing. No bounce or elastic motion.',
    '- Keep the animation between 0.25 and 10 seconds.',
    '- Ensure every sampled frame paints visible pixels.',
    '- Provide meaningful motion across the timeline and a stable poster frame.',
    '- Preserve a clear visual hierarchy and restrained layer count.',
    '',
    `User intent: ${request.prompt}`,
    `Motion preset: ${request.preset}`,
    request.description ? `Accessible description: ${request.description}` : '',
    request.theme ? `Theme colors: ${JSON.stringify(request.theme)}` : '',
    '',
    'A candidate that merely parses but fails browser rendering will be rejected.',
  ].filter(Boolean).join('\n');
}
