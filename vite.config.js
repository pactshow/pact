import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Source-map upload only runs when SENTRY_AUTH_TOKEN is set — typically
// during Vercel production builds. Without the token (local dev, CI
// without secrets), the plugin is a no-op and builds succeed unchanged.
const sentryToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const enableSentryUpload = !!(sentryToken && sentryOrg && sentryProject);

export default defineConfig({
  plugins: [
    react(),
    enableSentryUpload && sentryVitePlugin({
      authToken: sentryToken,
      org: sentryOrg,
      project: sentryProject,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Always emit source maps so production stack traces are debuggable
    // (Lighthouse flags missing maps as a best-practices issue). Upload
    // to Sentry only runs when SENTRY_AUTH_TOKEN is configured.
    sourcemap: true,
  },
});
