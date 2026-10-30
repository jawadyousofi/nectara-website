// Weekly Wonder: a short note for grown-ups, shown at the top of the Grown-ups page (app/settings.js).
// What the child discovered this week (Asal's World, lessons, stories, Wonder Garden), one thing to try together
// outside, a question for dinner, and a moment for one of the four pillars. Built on the device from data the
// family already has; nothing new is collected or sent anywhere. Grown-ups can switch it off in settings.
// Written in ES5 like the rest of the app.
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var DAY = 86400000;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  // Which corner of Asal's World matches each month's series, for the outdoor idea on a quiet week.
  var MONTH_PLACES = { 8: ['pond'], 9: ['garden', 'orchard'], 10: ['orchard', 'inside'], 11: ['shadow', 'sky'], 0: ['inside', 'meadow'], 1: ['meadow'], 2: ['sky'], 3: ['hive'], 4: ['garden', 'pond', 'hive', 'sky'], 5: ['sky'], 6: ['pond', 'garden'], 7: ['sky', 'orchard'] };
  // A question just for the grown-up, different each week: Nectara is for the whole family's wonder.
  var FOR_YOU = [
    'What surprised you this week?',
    'When did you feel like a child again this week?',
    'What did your child notice that you would have walked past?',
    'What would you love to learn alongside your child next?',
    'What did you wonder about at your child’s age? Tell them the story.',
    'Where did you feel calm this week, and could you take your child there?'
  ];
  var PILLARS = [
    ['Breath', 'Before bed one night, lie side by side and breathe like bees: in through the nose, hum it out. Three hums each. Let your child lead the last one.'],
    ['Gratitude', 'At dinner, go around the table: one thing from today you are thankful for. Small things count. A warm sock is a fine answer.'],
    ['Food', 'Let your child wash, tear or stir one thing for a meal this week. Name where it grew: in the ground, on a tree, on a vine.'],
    ['Rest', 'Pick one evening for a slow wind-down: lights low, screens away, a story or a quiet song. Notice together how the body feels sleepy.']
  ];

  function weekStart(offset) {             // Monday 00:00 local time, offset weeks back
    var d = new Date(); d.setHours(0, 0, 0, 0);
    var day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day - 7 * (offset || 0));
    return d.getTime();
  }
  function weekNo(t) { var d = new Date(t), j = new Date(d.getFullYear(), 0, 1); return Math.floor((t - j.getTime()) / (7 * DAY)); }
  function spotIndex() {
    var W = window.NECTARA_WORLD, map = {};
    if (!W) return map;
    W.places.forEach(function (p) { (p.spots || []).forEach(function (s) { map[s.id] = { spot: s, place: p }; }); });
    return map;
  }
  function itemsOf() {
    var N = window.NECTARA || {}, map = {};
    (N.series || []).forEach(function (s) { (s.lessons || []).forEach(function (l) { map[l.id] = { kind: 'lesson', title: l.title, q: l.question }; }); });
    (N.stories || []).forEach(function (st) { map[st.id] = { kind: 'story', title: st.title }; });
    return map;
  }
  function askOf(say) {                    // the last question in what Asal says at a spot
    var m = String(say || '').match(/[^.!?]*\?/g);
    return m ? m[m.length - 1].replace(/^\s*(I wonder,?\s*)/i, '').trim().replace(/^./, function (c) { return c.toUpperCase(); }) : '';
  }
  function list(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

  // data: { done: {key: iso}, garden: [entries], nick }
  function build(data, offset) {
    var from = weekStart(offset), to = from + 7 * DAY, spots = spotIndex(), items = itemsOf();
    var found = [], lessons = [], stories = [], plant = false;
    Object.keys(data.done || {}).forEach(function (k) {
      var t = Date.parse(data.done[k]); if (!(t >= from && t < to)) return;
      if (k === 'w-seed-planted') { plant = true; return; }
      if (k.indexOf('w-') === 0) { var s = spots[k.slice(2)]; if (s) found.push({ t: t, s: s }); return; }
      var it = items[k]; if (!it) return;
      (it.kind === 'story' ? stories : lessons).push({ t: t, it: it });
    });
    found.sort(function (a, b) { return b.t - a.t; }); lessons.sort(function (a, b) { return b.t - a.t; });
    var garden = (data.garden || []).filter(function (e) { var t = Date.parse(e.created); return t >= from && t < to; });

    // One thing to try outside: from the newest discovery this week, otherwise from this month's corner of the world.
    var pick = null, wk = weekNo(from);
    for (var i = 0; i < found.length && !pick; i++) if (found[i].s.spot.mission) pick = found[i].s;
    if (!pick) {
      var places = MONTH_PLACES[new Date(from).getMonth()] || ['garden'], pool = [];
      places.forEach(function (pid) { for (var k in spots) if (spots[k].place.id === pid && spots[k].spot.mission) pool.push(spots[k]); });
      pick = pool.length ? pool[wk % pool.length] : null;
    }
    var ask = (lessons[0] && lessons[0].it.q) || (pick && askOf(pick.spot.say)) || '';
    return { forYou: FOR_YOU[wk % FOR_YOU.length], from: from, found: found, lessons: lessons, stories: stories, plant: plant, garden: garden, pick: pick, ask: ask, pillar: PILLARS[wk % 4], nick: data.nick };
  }

  function html(data, offset) {
    var w = build(data, offset || 0), d = new Date(w.from), who = esc(w.nick || 'your little ones');
    var bits = [];
    if (w.found.length) {
      var byPlace = {}, order = [];
      w.found.forEach(function (f) { var n = f.s.place.name.replace(/^The /, 'the '); if (!byPlace[n]) { byPlace[n] = []; order.push(n); } byPlace[n].push(f.s.spot.name.toLowerCase()); });
      bits.push('In Asal&rsquo;s World, ' + who + ' discovered ' + list(order.map(function (n) { return 'the ' + esc(list(byPlace[n])) + ' at ' + esc(n); })) + '.');
    }
    if (w.plant) bits.push('A seed was planted in Asal&rsquo;s garden. It grows a little each day.');
    if (w.lessons.length) bits.push('Lessons finished: ' + esc(list(w.lessons.map(function (l) { return l.it.title; }))) + '.');
    if (w.stories.length) bits.push('Stories read: ' + esc(list(w.stories.map(function (s) { return s.it.title; }))) + '.');
    if (w.garden.length) bits.push(w.garden.length + (w.garden.length === 1 ? ' new treasure' : ' new treasures') + ' saved in your Wonder Garden.');
    var quiet = !bits.length;
    return '<section class="wonder" aria-labelledby="wonder-h">' +
      '<div class="wonder-top"><div><p class="wonder-kicker">Weekly Wonder &middot; week of ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + '</p>' +
      '<h2 id="wonder-h">' + (quiet ? 'A quiet week' : 'What ' + who + ' explored') + '</h2></div>' +
      '<div class="me-chips"><button type="button" class="dc-chip' + (!offset ? ' on' : '') + '" data-week="0" aria-pressed="' + !offset + '">This week</button>' +
      '<button type="button" class="dc-chip' + (offset ? ' on' : '') + '" data-week="1" aria-pressed="' + !!offset + '">Last week</button></div></div>' +
      (quiet ? '<p>Nothing new on the screen ' + (offset ? 'that' : 'this') + ' week, and that is just fine. The best wonder happens outside.</p>' : '<ul class="wonder-list">' + bits.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>') +
      '<div class="wonder-grid">' +
      (w.pick ? '<div class="wonder-box out"><h3>Try together outside</h3><p>' + esc(w.pick.spot.mission) + '</p><small>From ' + esc(w.pick.spot.name) + ' at ' + esc(w.pick.place.name.replace(/^The /, 'the ')) + '</small></div>' : '') +
      (w.ask ? '<div class="wonder-box ask"><h3>Ask at dinner</h3><p>&ldquo;' + esc(w.ask) + '&rdquo;</p><small>No right answers. Just listen and wonder with them.</small></div>' : '') +
      '<div class="wonder-box pil"><h3>A moment for ' + w.pillar[0] + '</h3><p>' + esc(w.pillar[1]) + '</p></div>' +
      '<div class="wonder-box you"><h3>Just for you</h3><p>' + esc(w.forYou) + '</p><small>A quiet question for the grown-up. Families grow together.</small></div>' +
      '</div></section>';
  }

  window.NectaraWonder = { html: html, build: build };
})();
