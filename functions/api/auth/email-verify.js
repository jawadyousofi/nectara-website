// POST /api/auth/email-verify { email, code } → signs in with the 6-digit code from /api/auth/email-code.
import { json, clean, sha256, safeEqual, createSession, publicUser, sameOrigin, readJson } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  if (!env.NECTARA_INTEREST) return json({ error: 'accounts are not connected yet' }, 503);
  const data = (await readJson(request)) || {};
  const email = clean(data.email, 200).toLowerCase();
  const code = clean(data.code, 20).replace(/\D/g, '');
  if (!email || code.length !== 6) return json({ error: 'please enter the 6-digit code from the email' }, 400);

  const key = 'ecode:' + email;
  const rec = await env.NECTARA_INTEREST.get(key, 'json');
  if (!rec) return json({ error: 'that code has expired. Please ask for a new one' }, 400);
  if (!safeEqual(rec.hash, await sha256(email + ':' + code))) {
    rec.tries = (rec.tries || 0) + 1;
    if (rec.tries >= 5) await env.NECTARA_INTEREST.delete(key);
    else await env.NECTARA_INTEREST.put(key, JSON.stringify(rec), { expirationTtl: 900 });
    return json({ error: rec.tries >= 5 ? 'too many wrong tries. Please ask for a new code' : 'that code doesn’t match. Check the newest email and try again' }, 400);
  }
  await env.NECTARA_INTEREST.delete(key); // one use only
  const user = await env.NECTARA_INTEREST.get('user:' + email, 'json');
  if (!user) return json({ error: 'this account no longer exists' }, 404);
  await env.NECTARA_INTEREST.delete('fail:' + email);
  const cookie = await createSession(env, email);
  return json({ ok: true, user: publicUser(user) }, 200, { 'Set-Cookie': cookie });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
