import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev` for local work; `npm run build` writes the hostable site to dist/.
export default defineConfig({
  base: './',
  plugins: [react()],
});
