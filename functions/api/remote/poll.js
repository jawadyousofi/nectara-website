// GET /api/remote/poll?after=<id> → the TV waits here (up to about 14 seconds) for button presses from the phone.
// Without `after`, it just learns where the queue stands, so old presses are never replayed.
import { json, getUser, hasAccess } from '../../_lib/auth.js';
import { db } from '../../_lib/remote.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!hasAccess(user)) return json({ error: 'members only' }, 401);
  const d = await db(env);
  if (!d) return json({ off: true });
  const now = Date.now();
  await d.prepare('INSERT INTO screens (email, seen) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET seen = excluded.seen').bind(user.email, now).run();
  const q = new URL(request.url).searchParams.get('after');
  if (q === null || !/^\d+$/.test(q)) {
    const r = await d.prepare('SELECT MAX(id) AS last FROM remote WHERE email = ?').bind(user.email).first();
    return json({ last: (r && r.last) || 0, cmds: [] });
  }
  const after = parseInt(q, 10);
  const stmt = d.prepare('SELECT id, cmd FROM remote WHERE email = ? AND id > ? AND at > ? ORDER BY id LIMIT 20');
  for (let i = 0; i < 40; i++) {                      // D1 allows 50 queries per request on the free plan
    const { results } = await stmt.bind(user.email, after, Date.now() - 30000).all();
    if (results.length) return json({ last: results[results.length - 1].id, cmds: results.map(r => r.cmd) });
    await sleep(350);
  }
  return json({ last: after, cmds: [] });
}

export const onRequest = () => json({ error: 'use GET' }, 405);
