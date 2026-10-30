// Phone remote for TVs. Button presses go through Cloudflare D1 (binding NECTARA_DB), which is fast and consistent;
// KV can take up to a minute to pass a value along, far too slow for a remote.
// Tables are made on first use. Rows older than 2 minutes are cleared now and then.
export const COMMANDS = ['up', 'down', 'left', 'right', 'ok', 'back', 'next', 'prev', 'home', 'read', 'world', 'scrollup', 'scrolldown', 'hello', 'tap'];
// Pointer moves from the phone's touchpad or tilt: mv:<dx>,<dy> in TV pixels.
export function validCommand(cmd) {
  if (COMMANDS.includes(cmd)) return true;
  if (cmd === 'enter') return true;
  if (typeof cmd === 'string' && cmd.indexOf('set:') === 0) return cmd.length <= 404;          // typing from the phone
  if (typeof cmd === 'string' && /^go:[^\s]{4,400}$/.test(cmd)) return true;                    // open a web address on the TV
  const m = /^mv:(-?\d{1,4}),(-?\d{1,4})$/.exec(String(cmd || ''));
  return !!m && Math.abs(+m[1]) <= 4000 && Math.abs(+m[2]) <= 4000;
}

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
