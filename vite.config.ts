/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// ── Content Security Policy (security annex: "Tighten CSP") ──────────
// Single source of truth. vercel.json carries the same policy as an HTTP
// header; any other host (nginx on RISA) must send it too, because a
// <meta> tag cannot enforce frame-ancestors.
//   - no 'unsafe-eval', no inline scripts (the app has none)
//   - style 'unsafe-inline' kept: components use inline styles
//   - only the origins the app actually calls: Supabase, GBIF, RBIS, Google Fonts
//   - frame-src Supabase: evidence PDFs are previewed from signed storage URLs
export const PRODUCTION_CSP =
  [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co",
    "media-src 'self' data:",
    'frame-src https://*.supabase.co',
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.gbif.org https://rbis.ur.ac.rw",
    "worker-src 'self' blob:",
  ].join('; ') + ';';

// The dev server injects an inline React Fast Refresh preamble and uses a
// websocket for HMR; development needs exactly these two relaxations.
const DEV_CSP = PRODUCTION_CSP.replace(
  "script-src 'self'",
  "script-src 'self' 'unsafe-inline'"
).replace("connect-src 'self'", "connect-src 'self' ws://localhost:* ws://127.0.0.1:*");

/** Injects the strict policy as a <meta> tag into production builds only. */
function cspMetaTag(): Plugin {
  return {
    name: 'nbsap-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: PRODUCTION_CSP },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export default defineConfig({
  plugins: [react(), cspMetaTag()],
  // @ts-ignore
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Each database test file runs a full Postgres (PGlite) in memory;
    // more than a few at once exhausts memory and crashes workers.
    maxWorkers: 3,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // security annex: source maps must not ship to production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    headers: { 'Content-Security-Policy': DEV_CSP, ...SECURITY_HEADERS },
  },
  preview: {
    headers: {
      'Content-Security-Policy': PRODUCTION_CSP,
      'X-Frame-Options': 'DENY',
      ...SECURITY_HEADERS,
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});
