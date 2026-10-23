// POST /api/tv/poll { code, poll } → { status: 'pending' | 'approved' | 'expired' }
// When the code has been approved, this signs the TV in (sets the session cookie) and retires the code.
import { json, clean, sha256, safeEqual, createSession, publicUser, hasAccess, sameOrigin, readJson } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  if (!env.NECTARA_INTEREST) return json({ error: 'accounts are not connected yet' }, 503);
  const data = (await readJson(request)) || {};
  const code = clean(data.code, 12).toUpperCase();
  const poll = typeof data.poll === 'string' ? data.poll : '';
  if (!/^[A-Z0-9]{6}$/.test(code) || !/^[0-9a-f]{64}$/.test(poll)) return json({ status: 'expired' });

  const pair = await env.NECTARA_INTEREST.get('pair:' + code, 'json');
  if (!pair || !safeEqual(pair.pollHash, await sha256(poll))) return json({ status: 'expired' });
  if (pair.status !== 'approved' || !pair.email) return json({ status: 'pending' });

  const user = await env.NECTARA_INTEREST.get('user:' + pair.email, 'json');
  await env.NECTARA_INTEREST.delete('pair:' + code); // one use only
  if (!user || !hasAccess(user)) return json({ status: 'expired' });
  const cookie = await createSession(env, user.email);
  return json({ status: 'approved', user: publicUser(user) }, 200, { 'Set-Cookie': cookie });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
