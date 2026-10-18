// Cloudflare Pages Function: POST /api/interest
// Saves a founding-list sign-up to the KV namespace bound as NECTARA_INTEREST.
// Optional email alert through Resend when RESEND_API_KEY and NOTIFY_EMAIL are set.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); } catch { return json({ error: 'the form data could not be read' }, 400); }

  if (clean(data.website, 200)) return json({ ok: true }); // honeypot: quietly ignore bots

  const entry = {
    role: data.role === 'partner' ? 'partner' : 'family',
    name: clean(data.name, 120),
    email: clean(data.email, 200).toLowerCase(),
    phone: clean(data.phone, 40),
    city: clean(data.city, 120),
    ages: Array.isArray(data.ages) ? data.ages.filter(a => ['2-3', '4-5', '6-7', 'under-2'].includes(a)) : [],
    interest: clean(data.interest, 40),
    notes: clean(data.notes, 2000),
    created: new Date().toISOString(),
    country: request.cf && request.cf.country ? request.cf.country : '',
  };

  if (!entry.name) return json({ error: 'please add your name' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) return json({ error: 'please use a valid email address' }, 400);
  if (!entry.city) return json({ error: 'please add your city or area' }, 400);
  if (!env.NECTARA_INTEREST) return json({ error: 'sign-ups are not connected yet' }, 503);

  const key = `${entry.created}_${crypto.randomUUID()}`;
  await env.NECTARA_INTEREST.put(key, JSON.stringify(entry));

  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    const lines = Object.entries(entry).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.FROM_EMAIL || 'Nectara <hello@nectaraschool.org>',
          to: [env.NOTIFY_EMAIL],
          subject: `New Nectara ${entry.role}: ${entry.name}`,
          text: lines,
        }),
      });
    } catch { /* the sign-up is already saved; an alert failure never blocks it */ }
  }

  return json({ ok: true });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
