// Admin: founding-family codes. Requires the ADMIN_TOKEN secret, sent as "Authorization: Bearer <token>".
// GET  /api/admin/invites                         → every code, newest first
// POST /api/admin/invites { label, max }          → make a new code for a family (max = how many accounts it can open, 1–10)
// POST /api/admin/invites { code, revoke: true }  → turn a code off (accounts already made with it keep their access)
import { json, clean, safeEqual, shortCode, normCode, showCode } from '../../_lib/auth.js';

function authorized(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return !!env.ADMIN_TOKEN && !!token && safeEqual(token, env.ADMIN_TOKEN);
}
const view = inv => ({ code: showCode(inv.code), label: inv.label, max: inv.max || 1, used: inv.used || [], created: inv.created, revoked: !!inv.revoked });

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ error: 'not allowed' }, 401);
  const invites = [];
  let cursor;
  do {
    const page = await env.NECTARA_INTEREST.list({ prefix: 'invite:', cursor });
    for (const k of page.keys) {
      const inv = await env.NECTARA_INTEREST.get(k.name, 'json');
      if (inv) invites.push(view(inv));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  invites.sort((a, b) => (a.created < b.created ? 1 : -1));
  return json({ invites });
}

export async function onRequestPost({ request, env }) {
  if (!authorized(request, env)) return json({ error: 'not allowed' }, 401);
  let data;
  try { data = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  if (data.revoke) {
    const key = normCode(data.code);
    const inv = key && await env.NECTARA_INTEREST.get('invite:' + key, 'json');
    if (!inv) return json({ error: 'no such code' }, 404);
    inv.revoked = true;
    await env.NECTARA_INTEREST.put('invite:' + key, JSON.stringify(inv));
    return json({ ok: true, invite: view(inv) });
  }
  const label = clean(data.label, 80);
  if (!label) return json({ error: 'add the family’s name so you know who the code is for' }, 400);
  const max = Math.min(10, Math.max(1, parseInt(data.max, 10) || 1));
  let key;
  for (let i = 0; i < 5; i++) {
    key = 'BEE' + shortCode(6);
    if (!(await env.NECTARA_INTEREST.get('invite:' + key))) break;
  }
  const inv = { code: key, label, max, used: [], created: new Date().toISOString() };
  await env.NECTARA_INTEREST.put('invite:' + key, JSON.stringify(inv));
  return json({ ok: true, invite: view(inv) });
}

export const onRequest = () => json({ error: 'use GET or POST' }, 405);
