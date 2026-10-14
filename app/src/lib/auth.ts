// ============================================================
// Uphar CRM — session + password helpers (Web Crypto, edge-safe)
// One login, one cookie. The role inside the session decides which
// product (CRM / challan entry / books) the user lands in.
// ============================================================

export type Role = 'admin' | 'manager' | 'telecaller' | 'data_entry' | 'rep' | 'books';

// Which user table the account lives in.
export type AccountSource = 'staff' | 'books' | 'env';

export interface Session {
  uid: string;
  src: AccountSource;
  role: Role;
  name: string;
  email: string;
  exp: number; // unix seconds
}

export const SESSION_COOKIE = 'uphar_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

// Cookies from the old three-portal login. Cleared on login/logout.
export const LEGACY_COOKIES = ['crm_auth', 'de_auth', 'book_auth', 'app_auth'];

const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
  return 'dev-only-session-secret';
};

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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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

export async function signSession(data: Omit<Session, 'exp'>): Promise<string> {
  const session: Session = { ...data, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const payload = JSON.stringify(session);
  const sig = await hmacHex(payload);
  return `${b64Encode(payload)}.${sig}`;
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  try {
    const payload = b64Decode(token.slice(0, dot));
    const expected = await hmacHex(payload);
    if (!timingSafeEqual(token.slice(dot + 1), expected)) return null;
    const session = JSON.parse(payload) as Session;
    if (!session?.uid || !session.role || typeof session.exp !== 'number') return null;
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
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
  if (storedHash.length !== derived.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= storedHash[i] ^ derived[i];
  return diff === 0;
}

export { timingSafeEqual };

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
};
