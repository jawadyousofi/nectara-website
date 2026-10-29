// Admin: manage who can open the app. Requires the ADMIN_TOKEN secret, sent as "Authorization: Bearer <token>".
// GET  /api/admin/members                    → every account (no passwords)
// POST /api/admin/members { email, access }  → set access: waiting | founding | member | staff | owner | paused
// POST /api/admin/members { email, newEmail } → move the account to a new email (progress and Growth Garden come along)
import { json, clean, validEmail, safeEqual } from '../../_lib/auth.js';

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
  if (data.newEmail !== undefined) return changeEmail(env, email, clean(data.newEmail, 200).toLowerCase());
  if (!ACCESS.includes(data.access)) return json({ error: 'unknown access level' }, 400);
  const user = await env.NECTARA_INTEREST.get('user:' + email, 'json');
  if (!user) return json({ error: 'no account with that email' }, 404);
  user.access = data.access;
  await env.NECTARA_INTEREST.put('user:' + email, JSON.stringify(user));
  return json({ ok: true, email, access: user.access });
}

// Move an account to a new email: the account, lesson progress, children's characters, Growth Garden and its pictures and sounds all
// come along. Old sign-ins stop working, so the person signs in again with the new email and the same password.
async function changeEmail(env, from, to) {
  const KV = env.NECTARA_INTEREST;
  if (!validEmail(to)) return json({ error: 'please enter a valid new email' }, 400);
  if (to === from) return json({ error: 'that is already the email on the account' }, 400);
  const user = await KV.get('user:' + from, 'json');
  if (!user) return json({ error: 'no account with that email' }, 404);
  if (await KV.get('user:' + to)) return json({ error: 'another account already uses that email' }, 409);
  user.email = to;
  await KV.put('user:' + to, JSON.stringify(user));
  for (const pre of ['prog:', 'gg:', 'kids:']) {
    const v = await KV.get(pre + from);
    if (v !== null) { await KV.put(pre + to, v); await KV.delete(pre + from); }
  }
  let cursor;
  do {
    const page = await KV.list({ prefix: 'ggm:' + from + ':', cursor });
    for (const k of page.keys) {
      const { value, metadata } = await KV.getWithMetadata(k.name, 'arrayBuffer');
      if (value) await KV.put('ggm:' + to + k.name.slice(('ggm:' + from).length), value, metadata ? { metadata } : {});
      await KV.delete(k.name);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  cursor = undefined;
  do {   // founding codes remember who used them
    const page = await KV.list({ prefix: 'invite:', cursor });
    for (const k of page.keys) {
      const inv = await KV.get(k.name, 'json');
      if (inv && (inv.used || []).includes(from)) { inv.used = inv.used.map(e => (e === from ? to : e)); await KV.put(k.name, JSON.stringify(inv)); }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  await KV.delete('user:' + from);
  return json({ ok: true, email: to, access: user.access });
}

export const onRequest = () => json({ error: 'use GET or POST' }, 405);
