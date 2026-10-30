// Guards everything under /app: only signed-in parents with access may open the members app.
import { getUser, hasAccess } from '../_lib/auth.js';

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const user = await getUser(env, request);
  if (!user) {
    return Response.redirect(`${url.origin}/login.html?next=${encodeURIComponent(url.pathname + url.search)}`, 302);
  }
  if (!hasAccess(user)) {
    return Response.redirect(`${url.origin}/login.html?state=waiting`, 302);
  }
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'private, no-store');
  out.headers.set('X-Robots-Tag', 'noindex');
  return out;
}
