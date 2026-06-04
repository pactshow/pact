import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // No PII on events — keeps our Privacy Policy claim honest that
    // error telemetry is not tied to identifying information. Disables
    // automatic IP + user-agent capture by Sentry.
    sendDefaultPii: false,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        // Mask all text + media. Contracts include signatures, payment
        // amounts, emails — never let Replay capture them in clear.
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Pre-launch: 100% tracing is fine, no traffic to burn quota on.
    // Dial down to 0.1 in prod once users arrive.
    tracesSampleRate: 1.0,
    // Don't record sessions normally — only when an error fires, so the
    // replay context is attached to the error.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

export { Sentry };
