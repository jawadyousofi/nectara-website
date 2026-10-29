// Shared helpers for Nectara member accounts (not a route: exports no onRequest handlers).
// Storage: the NECTARA_INTEREST KV namespace, with prefixed keys kept apart from founding-list entries:
//   user:<email>          account { email, name, salt, hash, access, created, children }
//   sess:<sha256(token)>  session { email, created }  (expires after 30 days)
//   prog:<email>          lesson progress { done: { lessonId: isoDate } }
//   kids:<email>          the family's children's characters { kids: [{ id, nick, traits }], active } (choices only, never photos)
//   fail:<email>          failed sign-in counter (expires after 15 minutes)
//   reset:<sha256(token)> password-reset link { email } (expires after 1 hour, or 24 hours when made by an admin)
//   rlim:<email>          reset-email counter (max 3 an hour)
//   ecode:<email>         emailed 6-digit sign-in code { hash, tries } (expires after 15 minutes)
//   elim:<email>          sign-in-code email counter (max 5 an hour)
//   pair:<CODE>           TV pairing { pollHash, status: pending|approved, email } (expires after 10 minutes)
//   mail:last-error       the most recent email that failed to send { at, status, detail } (shown on the admin page)
// access: 'waiting' (signed up, no access yet) | 'founding' (invite code) | 'member' (paid) | 'staff' | 'paused'

export const KV_PREFIXES = ['user:', 'sess:', 'prog:', 'fail:', 'reset:', 'rlim:', 'ecode:', 'elim:', 'pair:', 'mail:', 'tvfail:', 'invite:', 'gg:', 'ggm:', 'kids:'];
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
  const user = await env.NECTARA_INTEREST.get('user:' + session.email, 'json');
  // A password change signs out every session that started before it.
  if (!user || (user.pwChanged && session.created < user.pwChanged)) return null;
  return user;
}

export async function createResetToken(env, email, ttlSeconds = 3600) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.NECTARA_INTEREST.put('reset:' + (await sha256(token)), JSON.stringify({ email, created: Date.now() }), {
    expirationTtl: ttlSeconds,
  });
  return token;
}

export const resetLink = (request, token) => `${new URL(request.url).origin}/reset.html?token=${token}`;

export const emailEnabled = env => !!env.RESEND_API_KEY;

// Sends one email through Resend (resend.com). Needs the RESEND_API_KEY secret; FROM_EMAIL must be on a verified domain.
// Returns true when Resend accepted the email. On failure it records why in mail:last-error (shown on the admin page).
export async function sendEmail(env, { to, subject, text, html }) {
  if (!env.RESEND_API_KEY) return false;
  let status = 0, detail = '';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.FROM_EMAIL || 'Nectara <hello@nectaraschool.org>', to: [to], subject, text, html }),
    });
    if (res.ok) return true;
    status = res.status;
    detail = (await res.text().catch(() => '')).slice(0, 400);
  } catch (e) {
    detail = String(e && e.message || e).slice(0, 400);
  }
  console.error('Nectara email failed', status, detail);
  if (env.NECTARA_INTEREST) {
    await env.NECTARA_INTEREST.put('mail:last-error', JSON.stringify({ at: new Date().toISOString(), status, detail, subject }),
      { expirationTtl: 60 * 60 * 24 * 30 }).catch(() => {});
  }
  return false;
}

// Short codes people read off a screen: no 0/O, 1/I/L, 2/Z, 5/S, 8/B lookalikes.
const CODE_CHARS = 'ACDEFGHJKMNPQRTUVWXY34679';
export function shortCode(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map(b => CODE_CHARS[b % CODE_CHARS.length]).join('');
}
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));

export const hasAccess = u => !!u && ['founding', 'member', 'staff', 'owner'].includes(u.access);
// The owner (Jawad) also sees the private Documents library. Set from the admin page.
export const isOwner = u => !!u && u.access === 'owner';

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

// Founding-family codes made on the admin page live in KV as invite:<CODE> (no dashes).
// A code can let in a set number of accounts (usually 1 family). The old FOUNDING_CODE secret still works too.
export const normCode = c => clean(c || '', 100).toUpperCase().replace(/[^A-Z0-9]/g, '');
export const showCode = k => k.length > 3 ? k.slice(0, 3) + '-' + k.slice(3, 6) + (k.length > 6 ? '-' + k.slice(6) : '') : k;
export async function redeemInvite(env, code, email) {
  if (codeMatches(env, code)) return true;
  const key = normCode(code);
  if (!key || !env.NECTARA_INTEREST) return false;
  const inv = await env.NECTARA_INTEREST.get('invite:' + key, 'json');
  if (!inv || inv.revoked) return false;
  inv.used = inv.used || [];
  if (inv.used.includes(email)) return true;
  if (inv.used.length >= (inv.max || 1)) return false;
  inv.used.push(email);
  inv.lastUsed = new Date().toISOString();
  await env.NECTARA_INTEREST.put('invite:' + key, JSON.stringify(inv));
  return true;
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
