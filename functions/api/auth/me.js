// GET /api/auth/me  → the signed-in parent, or 401
import { json, getUser, publicUser } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!user) return json({ signedIn: false }, 401);
  return json({ signedIn: true, user: publicUser(user) });
}

export const onRequest = () => json({ error: 'use GET' }, 405);
