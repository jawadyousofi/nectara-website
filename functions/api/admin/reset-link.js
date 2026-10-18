// Admin: POST /api/admin/reset-link { email } → a one-time password-reset link (valid 24 hours) to send a parent yourself.
// Requires the ADMIN_TOKEN secret, sent as "Authorization: Bearer <token>".
import { json, clean, safeEqual, createResetToken, resetLink } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!env.ADMIN_TOKEN || !token || !safeEqual(token, env.ADMIN_TOKEN)) return json({ error: 'not allowed' }, 401);
  let data;
  try { data = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  const email = clean(data.email, 200).toLowerCase();
  if (!(await env.NECTARA_INTEREST.get('user:' + email))) return json({ error: 'no account with that email' }, 404);
  const link = resetLink(request, await createResetToken(env, email, 60 * 60 * 24));
  return json({ ok: true, email, link, expires: '24 hours' });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
