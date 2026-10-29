// The family's children's characters, for Asal's World and the app (members only).
// GET  /api/kids                         -> { kids: [{ id, nick, traits }], active }
// POST /api/kids { kids, active }        -> saves (up to 6 children)
// Privacy by design: only a first name or nickname and the choices from the character builder are stored.
// No photos, no birthdays, no last names. Nothing here is shared with other families.
import { json, clean, getUser, hasAccess, sameOrigin, readJson } from '../_lib/auth.js';

const HAIR = ['curls', 'tightcurls', 'straight', 'wavy', 'bob', 'ponytail', 'braids', 'buns', 'short', 'scarf'];
const MAX_KIDS = 6;
const isColor = v => Number.isInteger(v) && v >= 0 && v <= 0xffffff;

function cleanTraits(t) {
  t = t && typeof t === 'object' ? t : {};
  const out = {};
  for (const k of ['skin', 'hairColor', 'eyes', 'shirt', 'bottom', 'bead']) if (isColor(t[k])) out[k] = t[k];
  out.hair = HAIR.includes(t.hair) ? t.hair : 'curls';
  for (const f of ['freckles', 'lashes', 'glasses', 'longSleeves', 'pants']) if (t[f] === true) out[f] = true;
  return out;
}
// A first name or nickname only: letters, spaces, apostrophes and hyphens, up to 16 characters.
const cleanNick = n => clean(n, 16).replace(/[^\p{L}\p{M} '\-]/gu, '').trim();

async function load(env, email) {
  return (await env.NECTARA_INTEREST.get('kids:' + email, 'json')) || { kids: [], active: null };
}

export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!hasAccess(user)) return json({ error: 'members only' }, 401);
  return json(await load(env, user.email));
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  const user = await getUser(env, request);
  if (!hasAccess(user)) return json({ error: 'members only' }, 401);
  const data = (await readJson(request)) || {};
  if (!Array.isArray(data.kids)) return json({ error: 'kids must be a list' }, 400);
  const kids = data.kids.slice(0, MAX_KIDS).map(k => ({
    id: k && typeof k.id === 'string' && /^[a-z0-9]{6,12}$/.test(k.id) ? k.id : Math.random().toString(36).slice(2, 10),
    nick: cleanNick(k && k.nick) || 'Little bee',
    traits: cleanTraits(k && k.traits),
  }));
  const active = kids.some(k => k.id === data.active) ? data.active : (kids[0] ? kids[0].id : null);
  const saved = { kids, active };
  await env.NECTARA_INTEREST.put('kids:' + user.email, JSON.stringify(saved));
  return json(saved);
}

export const onRequest = () => json({ error: 'use GET or POST' }, 405);
