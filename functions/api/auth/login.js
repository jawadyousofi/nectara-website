// POST /api/auth/login  { email, password }
import { json, clean, hashPassword, safeEqual, createSession, publicUser, sameOrigin, readJson } from '../../_lib/auth.js';

const MAX_FAILS = 8; // per email, per 15 minutes

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  if (!env.NECTARA_INTEREST) return json({ error: 'accounts are not connected yet' }, 503);
  const data = await readJson(request);
  if (!data) return json({ error: 'the form could not be read' }, 400);

  const email = clean(data.email, 200).toLowerCase();
  const password = typeof data.password === 'string' ? data.password : '';
  if (!email || !password) return json({ error: 'please enter your email and password' }, 400);

  const failKey = 'fail:' + email;
  const fails = parseInt((await env.NECTARA_INTEREST.get(failKey)) || '0', 10);
  if (fails >= MAX_FAILS) return json({ error: 'too many tries. Please wait 15 minutes and try again' }, 429);

  const user = await env.NECTARA_INTEREST.get('user:' + email, 'json');
  // Hash even when the account doesn't exist, so timing doesn't reveal which emails have accounts.
  const { hash } = await hashPassword(password, user ? user.salt : '00000000000000000000000000000000');
  if (!user || !safeEqual(hash, user.hash)) {
    await env.NECTARA_INTEREST.put(failKey, String(fails + 1), { expirationTtl: 900 });
    return json({ error: 'that email and password don’t match' }, 401);
  }
  if (fails) await env.NECTARA_INTEREST.delete(failKey);

  const cookie = await createSession(env, email);
  return json({ ok: true, user: publicUser(user) }, 200, { 'Set-Cookie': cookie });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
