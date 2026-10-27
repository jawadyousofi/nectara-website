// GET /api/docs/shared?t=<token> → an uploaded document the owner chose to email. The link works for 7 days.
import { json } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const t = new URL(request.url).searchParams.get('t') || '';
  if (!/^[A-Z0-9]{20}$/.test(t)) return json({ error: 'this link is not valid' }, 404);
  const share = await env.NECTARA_INTEREST.get('docshare:' + t, 'json');
  if (!share) return json({ error: 'this link has expired. Ask Nectara for a new one.' }, 404);
  const { value, metadata } = await env.NECTARA_INTEREST.getWithMetadata('docf:' + share.id, 'arrayBuffer');
  if (!value) return json({ error: 'this document is no longer available' }, 404);
  const name = String((metadata && metadata.name) || 'document').replace(/["\r\n]/g, '');
  return new Response(value, { headers: {
    'Content-Type': (metadata && metadata.mime) || 'application/octet-stream',
    'Content-Disposition': 'inline; filename="' + name + '"',
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex',
  } });
}

export const onRequest = () => json({ error: 'use GET' }, 405);
