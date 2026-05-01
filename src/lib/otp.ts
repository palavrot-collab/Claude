// One-time-code store.
// MVP uses an in-memory map. Swap for Redis/DB in production.

import bcrypt from 'bcryptjs';

type Entry = { hash: string; expiresAt: number };

const store = new Map<string, Entry>();
const TTL_MS = 10 * 60 * 1000;

export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function issueOtp(email: string): Promise<string> {
  const code = generateCode();
  const hash = await bcrypt.hash(code, 8);
  store.set(email.toLowerCase(), { hash, expiresAt: Date.now() + TTL_MS });
  return code;
}

export async function consumeOtp(email: string, code: string): Promise<boolean> {
  const key = email.toLowerCase();
  const entry = store.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return false;
  }
  const ok = await bcrypt.compare(code, entry.hash);
  if (ok) store.delete(key);
  return ok;
}
