// Phone remote for TVs. Button presses go through Cloudflare D1 (binding NECTARA_DB), which is fast and consistent;
// KV can take up to a minute to pass a value along, far too slow for a remote.
// Tables are made on first use. Rows older than 2 minutes are cleared now and then.
export const COMMANDS = ['up', 'down', 'left', 'right', 'ok', 'back', 'next', 'prev', 'home', 'read', 'world', 'scrollup', 'scrolldown', 'hello'];

let ready = false;
export async function db(env) {
  const d = env.NECTARA_DB;
  if (!d) return null;
  if (!ready) {
    await d.batch([
      d.prepare('CREATE TABLE IF NOT EXISTS remote (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, cmd TEXT NOT NULL, at INTEGER NOT NULL)'),
      d.prepare('CREATE INDEX IF NOT EXISTS remote_email ON remote (email, id)'),
      d.prepare('CREATE TABLE IF NOT EXISTS screens (email TEXT PRIMARY KEY, seen INTEGER NOT NULL)'),
    ]);
    ready = true;
  }
  return d;
}
