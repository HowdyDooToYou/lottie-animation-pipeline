import { Plugin } from 'vite';
import { generateLottie } from './src/generator/client.ts';

/**
 * Vite plugin that adds a /api/generate endpoint for browser-based generation.
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

          const result = await generateLottie(
            prompt,
            preset as 'premium' | 'energetic' | 'subtle' | 'technical' | undefined,
          );

          if (result.success) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              animation: result.animation,
              provider: result.provider,
              model: result.model,
            }));
          } else {
            res.statusCode = 500;
            res.end(JSON.stringify({
              success: false,
              error: result.error,
            }));
          }
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
