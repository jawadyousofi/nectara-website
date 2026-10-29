// Family settings for grown-ups, shared by every screen the family signs in on (phone, tablet, TV).
// GET  /api/settings          -> settings (defaults filled in)
// POST /api/settings {...}    -> saves the known fields only
import { json, getUser, hasAccess, sameOrigin, readJson } from '../_lib/auth.js';
import { cleanSettings, loadSettings } from '../_lib/settings.js';

export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!hasAccess(user)) return json({ error: 'members only' }, 401);
  return json(await loadSettings(env, user.email));
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  const user = await getUser(env, request);
  if (!hasAccess(user)) return json({ error: 'members only' }, 401);
  const merged = cleanSettings({ ...(await loadSettings(env, user.email)), ...((await readJson(request)) || {}) });
  merged.updated = new Date().toISOString();
  await env.NECTARA_INTEREST.put('set:' + user.email, JSON.stringify(merged));
  return json(merged);
}

export const onRequest = () => json({ error: 'use GET or POST' }, 405);
