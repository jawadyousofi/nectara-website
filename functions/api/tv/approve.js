// POST /api/tv/approve { code } → a signed-in parent (with app access) lets the TV showing this code in.
import { json, clean, getUser, hasAccess, sameOrigin, readJson } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  const user = await getUser(env, request);
  if (!user) return json({ error: 'please sign in first' }, 401);
  if (!hasAccess(user)) return json({ error: 'your account doesn’t have app access yet' }, 403);

  const failKey = 'tvfail:' + user.email;
  const fails = parseInt((await env.NECTARA_INTEREST.get(failKey)) || '0', 10);
  if (fails >= 10) return json({ error: 'too many tries. Please wait 15 minutes' }, 429);

  const data = (await readJson(request)) || {};
  const code = clean(data.code, 20).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const pair = code.length === 6 ? await env.NECTARA_INTEREST.get('pair:' + code, 'json') : null;
  if (!pair || pair.status !== 'pending') {
    await env.NECTARA_INTEREST.put(failKey, String(fails + 1), { expirationTtl: 900 });
    return json({ error: 'that code didn’t match. Check the TV and try again (codes change every 10 minutes)' }, 400);
  }
  pair.status = 'approved';
  pair.email = user.email;
  const left = Math.max(60, Math.round((pair.created + 600000 - Date.now()) / 1000));
  await env.NECTARA_INTEREST.put('pair:' + code, JSON.stringify(pair), { expirationTtl: left });
  return json({ ok: true });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
