// Shared helpers for Nectara member accounts (not a route: exports no onRequest handlers).
// Storage: the NECTARA_INTEREST KV namespace, with prefixed keys kept apart from founding-list entries:
//   user:<email>          account { email, name, salt, hash, access, created, children }
//   sess:<sha256(token)>  session { email, created }  (expires after 30 days)
//   prog:<email>          lesson progress { done: { lessonId: isoDate } }
//   fail:<email>          failed sign-in counter (expires after 15 minutes)
// access: 'waiting' (signed up, no access yet) | 'founding' (invite code) | 'member' (paid) | 'staff' | 'paused'

export const KV_PREFIXES = ['user:', 'sess:', 'prog:', 'fail:'];
export const COOKIE = 'nx_session';
const SESSION_DAYS = 30;
const enc = new TextEncoder();

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

export const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const fromHex = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));

export async function sha256(s) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

// PBKDF2-SHA256, 100,000 rounds (the most Cloudflare Workers allows), 16-byte random salt.
export async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return { salt: hex(salt), hash: hex(bits) };
}

export function safeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export async function createSession(env, email) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.NECTARA_INTEREST.put('sess:' + (await sha256(token)), JSON.stringify({ email, created: Date.now() }), {
    expirationTtl: 60 * 60 * 24 * SESSION_DAYS,
  });
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * SESSION_DAYS}`;
}

export async function endSession(env, request) {
  const token = getCookie(request, COOKIE);
  if (token && /^[0-9a-f]{64}$/.test(token)) await env.NECTARA_INTEREST.delete('sess:' + (await sha256(token)));
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function getUser(env, request) {
  if (!env.NECTARA_INTEREST) return null;
  const token = getCookie(request, COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const session = await env.NECTARA_INTEREST.get('sess:' + (await sha256(token)), 'json');
  if (!session) return null;
  return env.NECTARA_INTEREST.get('user:' + session.email, 'json');
}

export const hasAccess = u => !!u && ['founding', 'member', 'staff'].includes(u.access);

export const publicUser = u => ({
  email: u.email,
  name: u.name,
  access: u.access,
  hasAccess: hasAccess(u),
  children: u.children || [],
});

export function codeMatches(env, code) {
  const want = clean(env.FOUNDING_CODE || '', 100).toUpperCase();
  const got = clean(code || '', 100).toUpperCase();
  return !!want && !!got && safeEqual(got, want);
}

// Same-origin check for state-changing requests (blocks cross-site form posts).
export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // non-browser clients
  return origin === new URL(request.url).origin;
}

export async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}
