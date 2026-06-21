import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import generateApi from './vite-plugin-api.ts';

export default defineConfig({
  plugins: [react(), generateApi()],
  server: {
    port: 3300,
    open: false,
  },
});
