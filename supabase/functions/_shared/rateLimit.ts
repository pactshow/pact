// Sliding-window rate limiter backed by Upstash Redis REST.
// No-ops if UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are unset,
// so deploys don't break before Upstash is configured.

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds
};

type RateLimitOptions = {
  key: string;        // logical bucket (e.g. "createPaymentIntent")
  identifier: string; // who/what we're limiting (e.g. user.id, ip)
  limit: number;      // max requests per window
  windowSec: number;  // window length in seconds
};

const URL_ENV = 'UPSTASH_REDIS_REST_URL';
const TOKEN_ENV = 'UPSTASH_REDIS_REST_TOKEN';

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const url = Deno.env.get(URL_ENV);
  const token = Deno.env.get(TOKEN_ENV);

  if (!url || !token) {
    return { ok: true, remaining: opts.limit, retryAfter: 0 };
  }

  const bucket = `rl:${opts.key}:${opts.identifier}`;
  const now = Date.now();
  const windowMs = opts.windowSec * 1000;
  const cutoff = now - windowMs;

  // Sliding-window via sorted set: drop expired entries, add current,
  // count, set TTL. Pipelined in one HTTP round trip.
  const pipeline = [
    ['ZREMRANGEBYSCORE', bucket, '0', String(cutoff)],
    ['ZADD', bucket, String(now), `${now}-${crypto.randomUUID()}`],
    ['ZCARD', bucket],
    ['EXPIRE', bucket, String(opts.windowSec)],
  ];

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    });

    if (!res.ok) {
      console.error('rateLimit upstash error', res.status, await res.text());
      return { ok: true, remaining: opts.limit, retryAfter: 0 };
    }

    const results = await res.json() as Array<{ result: number | string }>;
    const count = Number(results[2]?.result ?? 0);

    if (count > opts.limit) {
      return { ok: false, remaining: 0, retryAfter: opts.windowSec };
    }
    return { ok: true, remaining: Math.max(0, opts.limit - count), retryAfter: 0 };
  } catch (err) {
    // Fail-open: never block legitimate traffic because Redis is down.
    console.error('rateLimit threw', err);
    return { ok: true, remaining: opts.limit, retryAfter: 0 };
  }
}

export function rateLimitResponse(
  retryAfter: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down.' }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    },
  );
}

export function clientIdentifier(req: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const xff = req.headers.get('x-forwarded-for');
  const ip = xff?.split(',')[0]?.trim()
    ?? req.headers.get('cf-connecting-ip')
    ?? 'unknown';
  return `ip:${ip}`;
}
