import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`          -> dist/     (normal build, for hosting)
// `npm run build:preview`  -> preview/  (one self-contained index.html you can double-click)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'singlefile' ? [viteSingleFile()] : [])],
  build: mode === 'singlefile' ? { outDir: 'preview', emptyOutDir: true } : {},
}));
