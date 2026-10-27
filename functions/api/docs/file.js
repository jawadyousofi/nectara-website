// GET /api/docs/file?id=<doc id>[&download=1] → one uploaded document from the owner's private library.
import { json, clean, getUser, isOwner } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!isOwner(user)) return json({ error: 'not found' }, 404);
  const u = new URL(request.url);
  const id = clean(u.searchParams.get('id') || '', 40);
  if (!/^[a-z0-9]+$/.test(id)) return json({ error: 'not found' }, 404);
  const { value, metadata } = await env.NECTARA_INTEREST.getWithMetadata('docf:' + id, 'arrayBuffer');
  if (!value) return json({ error: 'not found' }, 404);
  const name = String((metadata && metadata.name) || 'document').replace(/["\r\n]/g, '');
  return new Response(value, { headers: {
    'Content-Type': (metadata && metadata.mime) || 'application/octet-stream',
    'Content-Disposition': (u.searchParams.get('download') ? 'attachment' : 'inline') + '; filename="' + name + '"',
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex',
  } });
}

export const onRequest = () => json({ error: 'use GET' }, 405);
