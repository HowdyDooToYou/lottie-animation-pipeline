import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import generateApi from './vite-plugin-api.ts';

export default defineConfig({
  plugins: [react(), generateApi()],
  server: {
    port: 3300,
    open: false,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        qualityReview: resolve(process.cwd(), 'quality-review.html'),
      },
    },
  },
});
