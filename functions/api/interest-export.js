// Cloudflare Pages Function: GET /api/interest-export?token=YOUR_ADMIN_TOKEN
// Downloads every founding-list sign-up as a CSV. Protected by the ADMIN_TOKEN secret.

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return new Response('Not allowed', { status: 401 });
  if (!env.NECTARA_INTEREST) return new Response('Sign-ups are not connected yet', { status: 503 });

  const cols = ['created', 'role', 'name', 'email', 'phone', 'city', 'ages', 'interest', 'notes', 'country'];
  const esc = v => `"${String(Array.isArray(v) ? v.join(' ') : v ?? '').replace(/"/g, '""')}"`;
  const rows = [cols.join(',')];
  let cursor;
  do {
    const page = await env.NECTARA_INTEREST.list({ cursor });
    for (const k of page.keys) {
      const e = await env.NECTARA_INTEREST.get(k.name, 'json');
      if (e) rows.push(cols.map(c => esc(e[c])).join(','));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return new Response(rows.join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="nectara-founding-list.csv"' },
  });
}
