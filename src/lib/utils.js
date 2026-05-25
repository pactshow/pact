import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

export function formatTime(value) {
  if (!value || typeof value !== 'string') return value || '';
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value;
  const h = parseInt(match[1], 10);
  const m = match[2];
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

// Substitute {{key}} placeholders in `template` with `values[key]`.
// Unfilled keys remain as literal `{{key}}` so the user can spot them.
export function substituteTemplate(template, values) {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, key) => {
    const v = values?.[key];
    return v === undefined || v === null || v === '' ? m : String(v);
  });
}

// Pull all unique {{var_name}} keys from a template string (in order).
export function extractTemplateKeys(template) {
  if (!template) return [];
  const keys = [];
  const seen = new Set();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(template)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      keys.push(m[1]);
    }
  }
  return keys;
}
