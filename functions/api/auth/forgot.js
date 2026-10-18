// POST /api/auth/forgot  { email }
// Emails a one-time reset link (valid 1 hour) when an account exists. Always answers the same way,
// so the form never reveals which emails have accounts. Needs RESEND_API_KEY (and FROM_EMAIL) to send.
import { json, clean, validEmail, createResetToken, resetLink, sendEmail, emailEnabled, sameOrigin, readJson } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'not allowed' }, 403);
  if (!env.NECTARA_INTEREST) return json({ error: 'accounts are not connected yet' }, 503);
  const data = (await readJson(request)) || {};
  const email = clean(data.email, 200).toLowerCase();
  if (!validEmail(email)) return json({ error: 'please use a valid email address' }, 400);
  if (!emailEnabled(env)) return json({ ok: true, emailEnabled: false });

  const limitKey = 'rlim:' + email;
  const sent = parseInt((await env.NECTARA_INTEREST.get(limitKey)) || '0', 10);
  const user = await env.NECTARA_INTEREST.get('user:' + email, 'json');

  if (user && sent < 3) {
    await env.NECTARA_INTEREST.put(limitKey, String(sent + 1), { expirationTtl: 3600 });
    const link = resetLink(request, await createResetToken(env, email, 3600));
    const first = (user.name || '').split(' ')[0] || 'there';
    const text = `Hi ${first},\n\nSomeone (hopefully you) asked to reset the password for your Nectara account.\n\nChoose a new password here (this link works once and expires in 1 hour):\n${link}\n\nIf you didn't ask for this, you can ignore this email. Your password won't change.\n\nWith care,\nNectara\nnectaraschool.org`;
    const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#2A2118;max-width:520px">
<p>Hi ${first.replace(/[<>&"]/g, '')},</p>
<p>Someone (hopefully you) asked to reset the password for your Nectara account.</p>
<p><a href="${link}" style="display:inline-block;background:#E9A23B;color:#2A2118;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:999px">Choose a new password</a></p>
<p style="color:#5B4C3A;font-size:14px">This link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email. Your password won't change.</p>
<p>With care,<br>Nectara</p></div>`;
    try { await sendEmail(env, { to: email, subject: 'Reset your Nectara password', text, html }); } catch { /* answer stays the same */ }
  }
  return json({ ok: true, emailEnabled: true });
}

export const onRequest = () => json({ error: 'use POST' }, 405);
