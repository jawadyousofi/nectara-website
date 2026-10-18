// POST /api/auth/reset  { token, password }
// Sets a new password from a one-time reset link, signs out every other device, and signs this one in.
import { json, sha256, hashPassword, createSession, publicUser, sameOrigin, readJson } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  if (!env.NECTARA_INTEREST) return json({ error: 'accounts are not connected yet' }, 503);
  const data = (await readJson(request)) || {};
  const token = typeof data.token === 'string' ? data.token : '';
  const password = typeof data.password === 'string' ? data.password : '';
  if (!/^[0-9a-f]{64}$/.test(token)) return json({ error: 'this reset link isn’t valid. Please ask for a new one' }, 400);
  if (password.length < 8 || password.length > 200) return json({ error: 'please choose a password of at least 8 characters' }, 400);

  const key = 'reset:' + (await sha256(token));
  const reset = await env.NECTARA_INTEREST.get(key, 'json');
  if (!reset) return json({ error: 'this reset link has expired or was already used. Please ask for a new one' }, 400);
  const user = await env.NECTARA_INTEREST.get('user:' + reset.email, 'json');
  if (!user) return json({ error: 'this account no longer exists' }, 404);

  await env.NECTARA_INTEREST.delete(key); // one use only
  const { salt, hash } = await hashPassword(password);
  user.salt = salt; user.hash = hash; user.pwChanged = Date.now();
  await env.NECTARA_INTEREST.put('user:' + user.email, JSON.stringify(user));
  await env.NECTARA_INTEREST.delete('fail:' + user.email);

  // pwChanged makes older sessions invalid; this new one starts just after it.
  await new Promise(r => setTimeout(r, 2));
  const cookie = await createSession(env, user.email);
  return json({ ok: true, user: publicUser(user) }, 200, { 'Set-Cookie': cookie });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
