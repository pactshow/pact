// Shared CORS helper. Returns headers that echo back the request's Origin if
// it's in the allowlist, so prod (www.pact.show) and local dev
// (http://localhost:5173) can both call edge functions without per-function
// configuration. Browsers refuse responses where the Origin doesn't match
// the Access-Control-Allow-Origin value exactly, so the static
// single-origin pattern can't serve both.
//
// Configure the allowlist via the `ALLOWED_ORIGINS` env var (comma-separated).
// Falls back to a safe default that covers prod + the Vite dev server.

const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.pact.show',
  'https://pact.show',
  'http://localhost:5173',
  'https://localhost:5173',
];

function getAllowedOrigins(): string[] {
  const env = Deno.env.get('ALLOWED_ORIGINS');
  if (env) {
    return env
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = getAllowedOrigins();
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
