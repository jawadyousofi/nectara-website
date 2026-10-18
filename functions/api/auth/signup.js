// POST /api/auth/signup  { name, email, password, code?, childName?, childAge? }
// Creates a parent account. A valid founding invite code (FOUNDING_CODE secret) gives app access straight away;
// without one the account is created as 'waiting' until access is granted (or a paid membership starts).
import { json, clean, validEmail, hashPassword, createSession, publicUser, codeMatches, sameOrigin, readJson } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  if (!env.NECTARA_INTEREST) return json({ error: 'accounts are not connected yet' }, 503);
  const data = await readJson(request);
  if (!data) return json({ error: 'the form could not be read' }, 400);
  if (clean(data.website, 200)) return json({ ok: true }); // honeypot

  const name = clean(data.name, 120);
  const email = clean(data.email, 200).toLowerCase();
  const password = typeof data.password === 'string' ? data.password : '';
  if (!name) return json({ error: 'please add your name' }, 400);
  if (!validEmail(email)) return json({ error: 'please use a valid email address' }, 400);
  if (password.length < 8 || password.length > 200) return json({ error: 'please choose a password of at least 8 characters' }, 400);

  if (await env.NECTARA_INTEREST.get('user:' + email)) {
    return json({ error: 'an account with this email already exists. Try signing in instead' }, 409);
  }

  const children = [];
  const childName = clean(data.childName, 60);
  const childAge = ['2-3', '4-5', '6-7'].includes(data.childAge) ? data.childAge : '';
  if (childName || childAge) children.push({ name: childName, age: childAge });

  const { salt, hash } = await hashPassword(password);
  const user = {
    email, name, salt, hash, children,
    access: codeMatches(env, data.code) ? 'founding' : 'waiting',
    created: new Date().toISOString(),
  };
  await env.NECTARA_INTEREST.put('user:' + email, JSON.stringify(user));

  const cookie = await createSession(env, email);
  return json({ ok: true, user: publicUser(user), codeAccepted: user.access === 'founding' }, 200, { 'Set-Cookie': cookie });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
