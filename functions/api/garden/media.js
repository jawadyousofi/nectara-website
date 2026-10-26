// GET /api/garden/media?id=<entry id> → the picture or sound for one of the signed-in family's Growth Garden entries.
import { json, clean, getUser, hasAccess } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!hasAccess(user)) return json({ error: 'members only' }, 401);
  const id = clean(new URL(request.url).searchParams.get('id') || '', 40);
  if (!/^[a-z0-9]+$/.test(id)) return json({ error: 'not found' }, 404);
  const { value, metadata } = await env.NECTARA_INTEREST.getWithMetadata('ggm:' + user.email + ':' + id, 'arrayBuffer');
  if (!value) return json({ error: 'not found' }, 404);
  return new Response(value, { headers: { 'Content-Type': (metadata && metadata.mime) || 'application/octet-stream', 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
}

export const onRequest = () => json({ error: 'use GET' }, 405);
