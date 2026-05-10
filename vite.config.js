/**
 * RO:WHAT — Vite 8/Rolldown build config for CrabLink legacy + React refactor entries.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES/PERF; keeps the proven page.html lane intact while compiling the React route-owned app separately.
 * RO:INTERACTS — extensions/chrome/src/page.html, extensions/chrome/src/react.html, extensions/chrome/src/page.js, extensions/chrome/src/app/main.jsx.
 * RO:INVARIANTS — browser-only bundle; legacy lane remains preserved; React lane is refactor-only until migration parity; no secrets embedded.
 * RO:METRICS — none.
 * RO:CONFIG — explicit Vite HTML entries: page.html for legacy, react.html for React refactor.
 * RO:SECURITY — no private keys, tokens, wallet authority, or backend secrets embedded at build time.
 * RO:TEST — npm run build; scripts/check-chrome.sh; scripts/package-chrome.sh; scripts/make_codebundle.sh.
 */

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const chromeSrcRoot = resolve(process.cwd(), 'extensions/chrome/src');

export default defineConfig({
  plugins: [react()],
  root: chromeSrcRoot,
  build: {
    outDir: resolve(process.cwd(), 'dist/chrome-src'),
    emptyOutDir: true,
    sourcemap: true,

    // Temporary: the legacy page.js prototype is intentionally still bundled while
    // we migrate route owners. The React lane should split; the legacy lane can be
    // reduced later when page.html is switched to app/main.jsx.
    chunkSizeWarningLimit: 700,

    rolldownOptions: {
      input: {
        page: resolve(chromeSrcRoot, 'page.html'),
        react: resolve(chromeSrcRoot, 'react.html'),
      },
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        codeSplitting: {
          minSize: 1,
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 100,
            },
            {
              name: 'shared-shell',
              test: /extensions[\\/]chrome[\\/]src[\\/]app[\\/]shell[\\/]/,
              priority: 90,
            },
            {
              name: 'shared-components',
              test: /extensions[\\/]chrome[\\/]src[\\/]shared[\\/]components[\\/]/,
              priority: 85,
            },
            {
              name: 'shared-manifest',
              test: /extensions[\\/]chrome[\\/]src[\\/]shared[\\/]manifest[\\/]/,
              priority: 80,
            },
            {
              name: 'shared-embed',
              test: /extensions[\\/]chrome[\\/]src[\\/]shared[\\/]embed[\\/]/,
              priority: 75,
            },
            {
              name: 'page-site',
              test: /extensions[\\/]chrome[\\/]src[\\/]pages[\\/]site[\\/]/,
              priority: 70,
            },
            {
              name: 'page-image',
              test: /extensions[\\/]chrome[\\/]src[\\/]pages[\\/]image[\\/]/,
              priority: 69,
            },
            {
              name: 'page-profile',
              test: /extensions[\\/]chrome[\\/]src[\\/]pages[\\/]profile[\\/]/,
              priority: 68,
            },
            {
              name: 'page-asset',
              test: /extensions[\\/]chrome[\\/]src[\\/]pages[\\/]asset[\\/]/,
              priority: 67,
            },
            {
              name: 'page-media',
              test: /extensions[\\/]chrome[\\/]src[\\/]pages[\\/](music|video|stream|podcast)[\\/]/,
              priority: 60,
            },
            {
              name: 'page-social',
              test: /extensions[\\/]chrome[\\/]src[\\/]pages[\\/](post|comment|article|lyrics)[\\/]/,
              priority: 55,
            },
            {
              name: 'page-builder-stubs',
              test: /extensions[\\/]chrome[\\/]src[\\/]pages[\\/](ad|algo|code|game)[\\/]/,
              priority: 50,
            },
          ],
        },
      },
    },
  },
});