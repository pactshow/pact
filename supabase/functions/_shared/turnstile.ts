// Server-side verification for Cloudflare Turnstile tokens.
// No-ops if TURNSTILE_SECRET_KEY is unset so deploys don't break
// before Turnstile is configured.

const SECRET_ENV = 'TURNSTILE_SECRET_KEY';
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = Deno.env.get(SECRET_ENV);
  if (!secret) return { ok: true };

  if (!token) return { ok: false, reason: 'missing_token' };

  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (remoteIp) form.append('remoteip', remoteIp);

  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body: form });
    if (!res.ok) {
      console.error('turnstile verify http error', res.status);
      return { ok: false, reason: 'verify_failed' };
    }
    const data = await res.json() as { success: boolean; 'error-codes'?: string[] };
    if (data.success) return { ok: true };
    return { ok: false, reason: data['error-codes']?.join(',') ?? 'unknown' };
  } catch (err) {
    console.error('turnstile verify threw', err);
    return { ok: false, reason: 'verify_threw' };
  }
}
