// GET  /api/progress            → { done: { lessonId: isoDate } }
// POST /api/progress { lesson }  → marks a lesson finished (grows a flower in Asal's garden)
import { json, clean, getUser, hasAccess, sameOrigin, readJson } from '../_lib/auth.js';

async function load(env, email) {
  return (await env.NECTARA_INTEREST.get('prog:' + email, 'json')) || { done: {} };
}

export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!hasAccess(user)) return json({ error: 'members only' }, 401);
  return json(await load(env, user.email));
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  const user = await getUser(env, request);
  if (!hasAccess(user)) return json({ error: 'members only' }, 401);
  const data = (await readJson(request)) || {};
  const lesson = clean(data.lesson, 60);
  if (!/^[a-z0-9-]+$/.test(lesson)) return json({ error: 'unknown lesson' }, 400);
  const prog = await load(env, user.email);
  if (!prog.done[lesson]) prog.done[lesson] = new Date().toISOString();
  await env.NECTARA_INTEREST.put('prog:' + user.email, JSON.stringify(prog));
  return json(prog);
}

export const onRequest = () => json({ error: 'use GET or POST' }, 405);
