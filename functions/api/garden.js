// The Growth Garden: a family's private journal of drawings, photos, voice notes and notes, sorted by the Seven Petals.
// GET  /api/garden                                         → { entries: [...] } newest first
// POST /api/garden { kind, title, text, petals, source, media (base64), mime }  → saves a new entry
// POST /api/garden { id, delete: true }                    → removes an entry and its media
// Entries live in KV as gg:<email> (the list) and ggm:<email>:<id> (the picture or sound).
import { json, clean, getUser, hasAccess, sameOrigin, readJson, shortCode } from '../_lib/auth.js';

const KINDS = ['drawing', 'photo', 'voice', 'note'];
const PETALS = ['body', 'heart', 'mind', 'voice', 'earth', 'world', 'spirit'];
const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac'];
const MAX_MEDIA = 3 * 1024 * 1024; // 3 MB after decoding
const MAX_ENTRIES = 500;

async function load(env, email) {
  return (await env.NECTARA_INTEREST.get('gg:' + email, 'json')) || { entries: [] };
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
  const data = await readJson(request);
  if (!data) return json({ error: 'that could not be read' }, 400);
  const garden = await load(env, user.email);

  if (data.delete) {
    const id = clean(data.id, 40);
    const before = garden.entries.length;
    garden.entries = garden.entries.filter(e => e.id !== id);
    if (garden.entries.length === before) return json({ error: 'not found' }, 404);
    await env.NECTARA_INTEREST.put('gg:' + user.email, JSON.stringify(garden));
    await env.NECTARA_INTEREST.delete('ggm:' + user.email + ':' + id);
    return json(garden);
  }

  const kind = KINDS.includes(data.kind) ? data.kind : '';
  if (!kind) return json({ error: 'unknown kind' }, 400);
  if (garden.entries.length >= MAX_ENTRIES) return json({ error: 'the garden is full; remove a few old entries first' }, 400);
  const petals = Array.isArray(data.petals) ? [...new Set(data.petals.filter(p => PETALS.includes(p)))] : [];
  const entry = {
    id: Date.now().toString(36) + shortCode(4).toLowerCase(),
    kind,
    title: clean(data.title, 80),
    text: clean(data.text, 2000),
    petals,
    source: clean(data.source, 80), // e.g. "world:frog", "story:little-drop", "mission:worm"
    created: new Date().toISOString(),
    by: clean(data.by, 20) === 'child' ? 'child' : 'grown-up',
  };
  if (kind !== 'note') {
    const mime = MIMES.includes(data.mime) ? data.mime : '';
    if (!mime || typeof data.media !== 'string') return json({ error: 'the picture or sound is missing' }, 400);
    let bytes;
    try { bytes = Uint8Array.from(atob(data.media), c => c.charCodeAt(0)); } catch { return json({ error: 'the picture or sound could not be read' }, 400); }
    if (bytes.length > MAX_MEDIA) return json({ error: 'that file is too big (3 MB at most)' }, 400);
    entry.mime = mime;
    entry.size = bytes.length;
    await env.NECTARA_INTEREST.put('ggm:' + user.email + ':' + entry.id, bytes, { metadata: { mime } });
  } else if (!entry.text) {
    return json({ error: 'write a few words first' }, 400);
  }
  garden.entries.unshift(entry);
  await env.NECTARA_INTEREST.put('gg:' + user.email, JSON.stringify(garden));
  return json({ ok: true, entry, entries: garden.entries });
}

export const onRequest = () => json({ error: 'use GET or POST' }, 405);
