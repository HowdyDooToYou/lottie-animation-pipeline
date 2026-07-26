import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/motionproof/index.ts',
    cli: 'src/motionproof/bin.ts',
  },
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  treeshake: true,
});
