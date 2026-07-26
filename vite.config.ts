import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import generateApi from './vite-plugin-api.ts';

export default defineConfig({
  base: process.env.MOTIONPROOF_STUDIO_BASE ?? '/',
  plugins: [react(), generateApi()],
  server: {
    port: 3300,
    open: false,
  },
  build: {
    outDir: 'studio-dist',
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        qualityReview: resolve(process.cwd(), 'quality-review.html'),
      },
    },
  },
});
