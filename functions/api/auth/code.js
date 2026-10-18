// POST /api/auth/code  { code }  → a signed-in parent redeems a founding invite code
import { json, getUser, publicUser, codeMatches, sameOrigin, readJson } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  const user = await getUser(env, request);
  if (!user) return json({ error: 'please sign in first' }, 401);
  const data = (await readJson(request)) || {};
  if (!codeMatches(env, data.code)) return json({ error: 'that code doesn’t match. Check it and try again' }, 400);
  if (user.access === 'waiting' || user.access === 'paused') user.access = 'founding';
  await env.NECTARA_INTEREST.put('user:' + user.email, JSON.stringify(user));
  return json({ ok: true, user: publicUser(user) });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
