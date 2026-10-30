// POST /api/remote/send { cmd } → passes one button press from a family's phone to their TV.
import { json, getUser, hasAccess, sameOrigin, readJson } from '../../_lib/auth.js';
import { db, validCommand } from '../../_lib/remote.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  const user = await getUser(env, request);
  if (!hasAccess(user)) return json({ error: 'members only' }, 401);
  const d = await db(env);
  if (!d) return json({ error: 'the remote isn’t switched on yet' }, 503);
  const data = (await readJson(request)) || {};
  if (!validCommand(data.cmd)) return json({ error: 'unknown button' }, 400);
  const now = Date.now();
  await d.prepare('INSERT INTO remote (email, cmd, at) VALUES (?, ?, ?)').bind(user.email, data.cmd, now).run();
  if (Math.random() < 0.05) await d.prepare('DELETE FROM remote WHERE at < ?').bind(now - 120000).run();
  const s = await d.prepare('SELECT seen FROM screens WHERE email = ?').bind(user.email).first();
  // tv: listening right now; ago: seconds since this account's TV last checked in (null = no TV signed in yet).
  return json({ ok: true, tv: !!(s && now - s.seen < 45000), ago: s ? Math.round((now - s.seen) / 1000) : null, account: user.email });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
