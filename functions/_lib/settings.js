// Family settings shared by every screen (see functions/api/settings.js). Not a route.

export const DEFAULTS = {
  worldMinutes: 20,        // daily time in Asal's World before Asal gets sleepy and says goodbye
  quietFrom: '',           // "19:30": no Asal's World from this time until 6:00 (empty = off)
  aloud: true,             // lessons and stories read aloud by default
  sound: true,             // music and sounds in Asal's World
  weeklyNote: true,        // the Weekly Wonder note for grown-ups
};
export const MINUTES = [10, 15, 20, 30, 45, 60];
export const QUIET = ['', '18:30', '19:00', '19:30', '20:00', '20:30'];

export function cleanSettings(d) {
  d = d && typeof d === 'object' ? d : {};
  const s = { ...DEFAULTS };
  if (MINUTES.includes(d.worldMinutes)) s.worldMinutes = d.worldMinutes;
  if (QUIET.includes(d.quietFrom)) s.quietFrom = d.quietFrom;
  for (const k of ['aloud', 'sound', 'weeklyNote']) if (typeof d[k] === 'boolean') s[k] = d[k];
  return s;
}

export async function loadSettings(env, email) {
  const raw = await env.NECTARA_INTEREST.get('set:' + email, 'json');
  const s = cleanSettings(raw);
  if (raw && typeof raw.updated === 'string') s.updated = raw.updated;   // devices re-apply sound/read-aloud when this changes
  return s;
}

