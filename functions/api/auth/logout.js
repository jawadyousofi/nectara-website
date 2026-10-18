// POST /api/auth/logout
import { json, endSession, sameOrigin } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  const cookie = env.NECTARA_INTEREST ? await endSession(env, request) : 'nx_session=; Path=/; Max-Age=0';
  return json({ ok: true }, 200, { 'Set-Cookie': cookie });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
