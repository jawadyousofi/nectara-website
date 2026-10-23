// POST /api/tv/start → { code, poll }
// The TV asks for a short pairing code to show on screen. A signed-in parent approves it from their phone
// (/link.html), and the TV, polling /api/tv/poll with its secret poll token, is signed in. Codes last 10 minutes.
import { json, sha256, shortCode, randomToken, sameOrigin } from '../../_lib/auth.js';

const PAIR_SECONDS = 600;

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  if (!env.NECTARA_INTEREST) return json({ error: 'accounts are not connected yet' }, 503);
  let code = '';
  for (let i = 0; i < 5 && !code; i++) {
    const c = shortCode(6);
    if (!(await env.NECTARA_INTEREST.get('pair:' + c))) code = c;
  }
  if (!code) return json({ error: 'please try again' }, 503);
  const poll = randomToken();
  await env.NECTARA_INTEREST.put('pair:' + code, JSON.stringify({ pollHash: await sha256(poll), status: 'pending', created: Date.now() }),
    { expirationTtl: PAIR_SECONDS });
  return json({ ok: true, code, poll, expiresIn: PAIR_SECONDS });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
