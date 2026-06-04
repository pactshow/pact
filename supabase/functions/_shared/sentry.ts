// Centralized Sentry init + error reporting for edge functions.
// No-op when SENTRY_DSN_EDGE_FUNCTIONS is unset, so dev deploys
// without secrets don't fail.
import * as Sentry from 'npm:@sentry/deno@8';

const dsn = Deno.env.get('SENTRY_DSN_EDGE_FUNCTIONS');

if (dsn) {
  Sentry.init({
    dsn,
    environment: Deno.env.get('SENTRY_ENVIRONMENT') ?? 'production',
    // Edge functions are short-lived; keep tracing conservative so we
    // don't blow through the free-tier quota once volume picks up.
    tracesSampleRate: 0.1,
  });
}

/**
 * Report an error to Sentry + console. Drop-in replacement for the
 * existing `console.error(name, err)` calls in each edge function's
 * catch block.
 */
export function reportError(
  name: string,
  err: unknown,
  extra?: Record<string, unknown>,
) {
  console.error(`${name} error:`, err, extra ?? '');
  if (dsn) {
    Sentry.captureException(err, {
      tags: { function: name },
      extra,
    });
  }
}
