/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      // Edge-function shared helpers are deliberately Deno-import-free for
      // logic like with-timeout / industry bias / scoring; vitest can run
      // them in jsdom for fast unit feedback.
      'supabase/functions/_shared/**/*.{test,spec}.{js,ts}',
      // Pure decision-engine helpers (reliability scoring) are Deno-import-free
      // too, so vitest can pin their formulas.
      'supabase/functions/decision-engine/**/*.{test,spec}.{js,ts}',
    ],
    exclude: ['src/__tests__/e2e/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});


