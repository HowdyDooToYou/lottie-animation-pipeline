import { Plugin } from 'vite';
import { generateLottie } from './src/generator/client.ts';
import { qualityGate, refinePrompt, QUALITY_THRESHOLD, MAX_ITERATIONS, summarizeAnimationPreview } from './src/generator/quality-gate.ts';

/**
 * Vite plugin that adds a /api/generate endpoint for browser-based generation.
 * Runs quality-gated loop (same logic as CLI).
 */
export default function generateApi(): Plugin {
  return {
    name: 'vite-plugin-generate-api',
    configureServer(server) {
      server.middlewares.use('/api/generate', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        try {
          const { prompt, preset } = JSON.parse(body);

          if (!prompt || typeof prompt !== 'string') {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing or invalid prompt' }));
            return;
          }

          console.log(`[api/generate] Request: "${prompt}" (preset: ${preset || 'default'})`);

          let currentPrompt = prompt;
          let bestAnimation: Record<string, unknown> | null = null;
          let bestScore = 0;
          let bestReport: ReturnType<typeof qualityGate> | null = null;
          let bestProvider: string | undefined;
          let bestModel: string | undefined;

          for (let i = 1; i <= MAX_ITERATIONS; i++) {
            console.log(`[api/generate] Iteration ${i}/${MAX_ITERATIONS}...`);

            const result = await generateLottie(
              currentPrompt,
              preset as 'premium' | 'energetic' | 'subtle' | 'technical' | undefined,
            );

            if (result.success && result.animation) {
              const report = qualityGate(result.animation);

              if (report.score > bestScore) {
                bestScore = report.score;
                bestAnimation = result.animation;
                bestReport = report;
                bestProvider = result.provider;
                bestModel = result.model;
              }

              if (report.passed) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  animation: result.animation,
                  provider: result.provider,
                  model: result.model,
                  score: report.score,
                  iterations: i,
                  passed: true,
                  report,
                  preview: summarizeAnimationPreview(result.animation),
                }));
                return;
              }

              currentPrompt = refinePrompt(currentPrompt, report, i);
            }
          }

          // Max iterations hit — return best
          if (bestAnimation) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              animation: bestAnimation,
              provider: bestProvider,
              model: bestModel,
              score: bestScore,
              iterations: MAX_ITERATIONS,
              passed: false,
              report: bestReport,
              preview: summarizeAnimationPreview(bestAnimation),
            }));
            return;
          }

          res.statusCode = 500;
          res.end(JSON.stringify({
            success: false,
            error: 'No valid animation produced',
            qualityThreshold: QUALITY_THRESHOLD,
          }));
        } catch (err) {
          console.error('[api/generate] Error:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({
            error: 'Internal server error',
            details: (err as Error).message,
          }));
        }
      });
    },
  };
}
