// Thin Zod wrapper for Edge Function input validation.
import { z } from 'npm:zod@3.24.2';

export async function validateBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; error: string }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, error: 'Invalid JSON body' };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    const path = first?.path?.join('.') || 'body';
    return { ok: false, error: `${path}: ${first?.message ?? 'invalid'}` };
  }
  return { ok: true, data: parsed.data };
}

export { z };
