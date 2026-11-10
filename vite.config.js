import { defineConfig } from 'vite';

export default defineConfig({
  base: '/codebot-quest/',
  worker: {
    format: 'es'
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 600, // Three.js is legitimately large
  }
});
