const getSecret = () => process.env.SESSION_SECRET ?? 'dev-secret-change-in-production';

async function hmacHex(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function b64Encode(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode(parseInt(p, 16))));
}

function b64Decode(str: string): string {
  return decodeURIComponent(
    Array.from(atob(str))
      .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
}

export async function signCookie(payload: string): Promise<string> {
  const sig = await hmacHex(payload);
  return `${b64Encode(payload)}.${sig}`;
}

export async function verifyCookie(token: string): Promise<string | null> {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  try {
    const payload = b64Decode(token.slice(0, dot));
    const sig = token.slice(dot + 1);
    const expected = await hmacHex(payload);
    if (sig !== expected) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
    key,
    256
  );
  const out = new Uint8Array(48);
  out.set(salt, 0);
  out.set(new Uint8Array(bits), 16);
  return Array.from(out).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const enc = new TextEncoder();
  const bytes = Uint8Array.from((stored.match(/.{2}/g) ?? []).map(h => parseInt(h, 16)));
  const salt = bytes.slice(0, 16);
  const storedHash = bytes.slice(16);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
    key,
    256
  );
  const derived = new Uint8Array(bits);
  return storedHash.length === derived.length && storedHash.every((v, i) => v === derived[i]);
}

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
};
