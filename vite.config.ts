import { defineConfig } from 'vite';


export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    minify: 'esbuild',
  },

  test: {
    globals: true,
    environment: 'miniflare',
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
