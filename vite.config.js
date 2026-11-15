import { defineConfig } from 'vite';

// BASE lets GitHub Pages serve the site from /<repo>/; default './' works for any static host.
export default defineConfig({
  base: process.env.BASE ?? './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
});
