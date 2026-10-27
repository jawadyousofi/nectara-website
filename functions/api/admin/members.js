// Admin: manage who can open the app. Requires the ADMIN_TOKEN secret, sent as "Authorization: Bearer <token>".
// GET  /api/admin/members                    → every account (no passwords)
// POST /api/admin/members { email, access }  → set access: waiting | founding | member | staff | owner | paused
import { json, clean, safeEqual } from '../../_lib/auth.js';

const ACCESS = ['waiting', 'founding', 'member', 'staff', 'owner', 'paused'];

function authorized(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return !!env.ADMIN_TOKEN && !!token && safeEqual(token, env.ADMIN_TOKEN);
}

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ error: 'not allowed' }, 401);
  const members = [];
  let cursor;
  do {
    const page = await env.NECTARA_INTEREST.list({ prefix: 'user:', cursor });
    for (const k of page.keys) {
      const u = await env.NECTARA_INTEREST.get(k.name, 'json');
      if (u) members.push({ email: u.email, name: u.name, access: u.access, created: u.created, children: u.children || [] });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  members.sort((a, b) => (a.created < b.created ? 1 : -1));
  const lastMailError = await env.NECTARA_INTEREST.get('mail:last-error', 'json');
  return json({ members, lastMailError });
}

export async function onRequestPost({ request, env }) {
  if (!authorized(request, env)) return json({ error: 'not allowed' }, 401);
  let data;
  try { data = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  const email = clean(data.email, 200).toLowerCase();
  if (!ACCESS.includes(data.access)) return json({ error: 'unknown access level' }, 400);
  const user = await env.NECTARA_INTEREST.get('user:' + email, 'json');
  if (!user) return json({ error: 'no account with that email' }, 404);
  user.access = data.access;
  await env.NECTARA_INTEREST.put('user:' + email, JSON.stringify(user));
  return json({ ok: true, email, access: user.access });
}

export const onRequest = () => json({ error: 'use GET or POST' }, 405);
