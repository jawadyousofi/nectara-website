// POST /api/auth/email-code { email } → emails a 6-digit sign-in code (valid 15 minutes).
// Unlike the old reset form, this tells the person what actually happened: no account, too many tries,
// or the email couldn't be sent (and records why for the admin page).
import { json, clean, validEmail, sha256, sendEmail, emailEnabled, sameOrigin, readJson } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  if (!env.NECTARA_INTEREST) return json({ error: 'accounts are not connected yet' }, 503);
  const data = (await readJson(request)) || {};
  const email = clean(data.email, 200).toLowerCase();
  if (!validEmail(email)) return json({ error: 'please use a valid email address' }, 400);
  if (!emailEnabled(env)) return json({ error: 'email codes aren’t switched on yet. Please contact Nectara through the join page' }, 503);

  const user = await env.NECTARA_INTEREST.get('user:' + email, 'json');
  if (!user) return json({ error: 'we couldn’t find an account with that email. Check the spelling, or create an account', noAccount: true }, 404);

  const limitKey = 'elim:' + email;
  const sent = parseInt((await env.NECTARA_INTEREST.get(limitKey)) || '0', 10);
  if (sent >= 5) return json({ error: 'we’ve sent several codes this hour. Please use the newest one, or wait a little and try again' }, 429);

  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
  const first = ((user.name || '').split(' ')[0] || 'there').replace(/[<>&"]/g, '');
  const text = `Hi ${first},\n\nYour Nectara sign-in code is: ${code}\n\nType it on the sign-in page. It works once and expires in 15 minutes.\n\nIf you didn't ask for this, you can ignore this email.\n\nWith care,\nNectara\nnectaraschool.org`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#2A2118;max-width:520px">
<p>Hi ${first},</p><p>Your Nectara sign-in code is:</p>
<p style="font-size:34px;font-weight:bold;letter-spacing:8px;background:#F7E7B4;display:inline-block;padding:10px 20px;border-radius:14px">${code}</p>
<p style="color:#5B4C3A;font-size:14px">Type it on the sign-in page. It works once and expires in 15 minutes. If you didn't ask for this, you can ignore this email.</p>
<p>With care,<br>Nectara</p></div>`;

  const ok = await sendEmail(env, { to: email, subject: `${code} is your Nectara sign-in code`, text, html });
  if (!ok) return json({ error: 'we couldn’t send the email just now. Please try again in a few minutes, or contact Nectara through the join page' }, 502);

  await env.NECTARA_INTEREST.put(limitKey, String(sent + 1), { expirationTtl: 3600 });
  await env.NECTARA_INTEREST.put('ecode:' + email, JSON.stringify({ hash: await sha256(email + ':' + code), tries: 0 }), { expirationTtl: 900 });
  return json({ ok: true });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
