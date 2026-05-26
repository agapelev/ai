import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [],
  test: {
    globals: true,
    environment: 'miniflare',
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
