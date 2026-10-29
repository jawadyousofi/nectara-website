// Documents: Jawad's private library of school documents (plans, legal, partners, curriculum).
// Only accounts with access "owner" can see or change it; everyone else gets "not found".
// GET  /api/docs                                                   → { docs: [...] } newest first
// POST /api/docs { kind: 'link', title, url, category, note }      → add a link (Google Doc, Claude doc, Drive file...)
// POST /api/docs { kind: 'file', title, category, note, name, mime, media (base64) }  → upload a file (up to 20 MB)
// POST /api/docs { id, title?, category?, note? }                  → edit the details
// POST /api/docs { id, archive: true } / { id, restore: true }     → move to or from the Archive (nothing is lost)
// POST /api/docs { id, deleteForever: true }                       → only for archived items: removes it for good
// POST /api/docs { id, share: true }                                → a 7-day link anyone can open, for emailing an uploaded file
// Stored in KV: docs:index (the list) and docf:<id> (each file's bytes).
import { json, clean, getUser, isOwner, sameOrigin, readJson, shortCode } from '../_lib/auth.js';

const MAX_FILE = 20 * 1024 * 1024;
const MIMES = {
  'application/pdf': 'PDF', 'application/msword': 'Word', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-excel': 'Excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'image/jpeg': 'Image', 'image/png': 'Image', 'image/webp': 'Image', 'text/plain': 'Text', 'text/csv': 'CSV',
};
const CATEGORIES = ['Plans', 'Curriculum', 'Partners', 'Legal & business', 'Families', 'Other'];

// The documents made so far, so the library isn't empty on first open.
const STARTERS = [
  ['Nectara Pilot: The First Month', 'Plans', 'https://claude.ai/artifact/8ajdsXQzGmwR7k8RmY4mU4', 'Four-week pilot, Nov 9 to Dec 4. Backup in Google Drive.'],
  ['Nectara Pilot (Google Drive copy)', 'Plans', 'https://docs.google.com/document/d/19yZKG4UXQ6TOFFxIgpLwS6rE8iR6rvxF4yDo5IHfx8g/edit', ''],
  ['Nectara Garden Partners', 'Partners', 'https://claude.ai/artifact/352zu4VzjfGE5qRnL7bh8P', 'Nursery partnership pitch and the five nurseries to approach.'],
  ['Nectara Garden Partners (Google Drive copy)', 'Partners', 'https://docs.google.com/document/d/1rAIAY2C-GfI5XC9u76v-Cn-imkyUgtAGuZKprAGx72E/edit', ''],
  ['Whole-Child Framework (v3)', 'Curriculum', 'https://docs.google.com/document/d/1YC6-6spY5oH_SwtdPC6BNlRS5wleZX8nyYeO-rolPgY/edit', 'The Seven Petals and the four roots.'],
  ['Legal & business action list', 'Legal & business', 'https://docs.google.com/document/d/1XE2IEtyQV6jgqoUFc_HQcBU779fMH9vyHUHaoO5P3vE/edit', 'Trademark first, corporation on Jan 4, 2027.'],
  ['NECTARA trademark prep', 'Legal & business', 'https://docs.google.com/document/d/1a33sdjrJLaFg2cSDEuGnxRgDk_ZNWg6dedo5N7RWRks/edit', ''],
  ['NECTARA trademark filing package', 'Legal & business', 'https://claude.ai/artifact/R17pz9rEAKmgCU3JSif17B', 'Filed Oct 29, 2026, serial 50189307 (Classes 41 and 9). Clearance search, every form answer, classes and fees.'],
  ['NECTARA trademark filed: serial 50189307 (Google Drive)', 'Legal & business', 'https://docs.google.com/document/d/1hxhOFPDWftWsPrMH2LGStaaZYzfOHrriO5BGxmd64Qo/edit', 'Filed Oct 29, 2026. What was filed, public contact details, and what to do next.'],
  ['NECTARA trademark filing package (Google Drive copy)', 'Legal & business', 'https://docs.google.com/document/d/12YHRV6C5Ri2dNxiHX8sM4ui4P6bRYdeKWhNMRyEidOM/edit', ''],
  ['The Nectara Morning: a guide for teachers and parents', 'Curriculum', 'https://claude.ai/artifact/Ajv76eiPgX82Zf71FfGwVi', 'How to run a morning the Nectara way: rhythm, rituals, mixed ages, what to do when it goes sideways.'],
  ['The Nectara Morning (Google Drive copy)', 'Curriculum', 'https://docs.google.com/document/d/1v24QFjmEweiU1E-DGDz0AajoN7JuhBJISiyh8H_7KwY/edit', ''],
  ['Where did your child learn all of this? (one-pager for families)', 'Families', 'https://claude.ai/artifact/Sg8JGvCsMrCGc2Fj2zbTHy', 'Seven things Nectara children do, what parents notice at home, and what we never do.'],
  ['Where did your child learn all of this? (Google Drive copy)', 'Families', 'https://docs.google.com/document/d/1Aoxp1GVvqJX4mRMo2GWKWPa3rBlro-qP0g-ducGiXwY/edit', ''],
  ['Garden Partners flyer (to leave with nursery owners)', 'Partners', 'https://claude.ai/artifact/BiwWBDdEoqfqb7XutDSM8x', 'One printable page: what a garden morning is, what the nursery gets, what we ask, and how to reach you. Export as PDF to print.'],
  ['Garden Partners flyer (Google Drive copy)', 'Partners', 'https://docs.google.com/document/d/1mukJLPk7Q009JBPsPg7ESEyVrKZi22JDOA1c8y0RCGE/edit', ''],
];

// New documents Claude makes are added to STARTERS; each is put on the shelf once (idx.seeded remembers which),
// so one you archive or delete for good never comes back.
async function load(env) {
  const idx = (await env.NECTARA_INTEREST.get('docs:index', 'json')) || { docs: [] };
  if (!idx.seeded) idx.seeded = idx.docs.filter(d => d.url).map(d => d.url);
  const now = new Date().toISOString();
  const fresh = STARTERS.filter(([, , url]) => !idx.seeded.includes(url));
  if (!fresh.length) return idx;
  fresh.forEach(([title, category, url, note]) => {
    idx.docs.push({ id: 's' + Date.now().toString(36) + shortCode(4).toLowerCase(), kind: 'link', title, category, url, note, created: now });
    idx.seeded.push(url);
  });
  await env.NECTARA_INTEREST.put('docs:index', JSON.stringify(idx));
  return idx;
}
const save = (env, idx) => env.NECTARA_INTEREST.put('docs:index', JSON.stringify(idx));
const cat = c => (CATEGORIES.includes(c) ? c : 'Other');

export async function onRequestGet({ request, env }) {
  const user = await getUser(env, request);
  if (!isOwner(user)) return json({ error: 'not found' }, 404);
  const idx = await load(env);
  return json({ docs: idx.docs.slice().sort((a, b) => (a.created < b.created ? 1 : -1)), categories: CATEGORIES });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  const user = await getUser(env, request);
  if (!isOwner(user)) return json({ error: 'not found' }, 404);
  const data = await readJson(request);
  if (!data) return json({ error: 'that could not be read' }, 400);
  const idx = await load(env);

  if (data.id) {
    const d = idx.docs.find(x => x.id === clean(data.id, 40));
    if (!d) return json({ error: 'not found' }, 404);
    if (data.share) {
      if (d.kind !== 'file') return json({ url: d.url });
      const token = shortCode(10) + shortCode(10);
      await env.NECTARA_INTEREST.put('docshare:' + token, JSON.stringify({ id: d.id, by: user.email }), { expirationTtl: 7 * 24 * 3600 });
      return json({ url: new URL(request.url).origin + '/api/docs/shared?t=' + token, days: 7 });
    }
    if (data.deleteForever) {
      if (!d.archived) return json({ error: 'move it to the Archive first' }, 409);
      idx.docs = idx.docs.filter(x => x !== d);
      if (d.kind === 'file') await env.NECTARA_INTEREST.delete('docf:' + d.id);
    } else if (data.archive) { d.archived = new Date().toISOString(); }
    else if (data.restore) { delete d.archived; }
    else {
      if (data.title !== undefined) d.title = clean(data.title, 120) || d.title;
      if (data.category !== undefined) d.category = cat(data.category);
      if (data.note !== undefined) d.note = clean(data.note, 500);
    }
    await save(env, idx);
    return json({ ok: true });
  }

  const title = clean(data.title, 120);
  const base = { id: Date.now().toString(36) + shortCode(4).toLowerCase(), title, category: cat(data.category), note: clean(data.note, 500), created: new Date().toISOString() };
  if (data.kind === 'link') {
    const url = clean(data.url, 1000);
    if (!/^https:\/\/\S+$/.test(url)) return json({ error: 'paste a full link starting with https://' }, 400);
    idx.docs.push({ ...base, kind: 'link', url, title: title || url.replace(/^https:\/\//, '').slice(0, 60) });
  } else if (data.kind === 'file') {
    const mime = MIMES[data.mime] ? data.mime : '';
    if (!mime) return json({ error: 'use a PDF, Word, Excel, PowerPoint, image or text file' }, 400);
    let bytes;
    try { bytes = Uint8Array.from(atob(String(data.media || '')), c => c.charCodeAt(0)); } catch { return json({ error: 'the file could not be read' }, 400); }
    if (!bytes.length || bytes.length > MAX_FILE) return json({ error: 'files can be up to 20 MB' }, 400);
    const name = clean(data.name, 160) || 'document';
    await env.NECTARA_INTEREST.put('docf:' + base.id, bytes, { metadata: { mime, name } });
    idx.docs.push({ ...base, kind: 'file', name, mime, type: MIMES[mime], size: bytes.length, title: title || name.replace(/\.[^.]+$/, '') });
  } else {
    return json({ error: 'unknown kind' }, 400);
  }
  if (idx.docs.length > 2000) return json({ error: 'the library is full' }, 400);
  await save(env, idx);
  return json({ ok: true });
}

export const onRequest = () => json({ error: 'use GET or POST' }, 405);
