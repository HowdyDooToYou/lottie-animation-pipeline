import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/soliddd/index.ts',
    cli: 'src/soliddd/bin.ts',
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
