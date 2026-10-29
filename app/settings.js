// Grown-ups: family settings shared by every screen the family signs in on (phone, tablet, computer, TV).
// Behind a small grown-up check (a multiplication question) so little hands don't wander in.
// Saved at /api/settings and /api/kids; applied on each device through localStorage:
//   nx_settings (the family settings), nx_world_minutes (Asal's World play time), nx_aloud (read-aloud),
//   nx_world.sound (world music, set when a grown-up changes it).
// Written in ES5 like the rest of the app. Route: #/settings
(function () {
  'use strict';
  var root = document.getElementById('root');
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var MINUTES = [10, 15, 20, 30, 45, 60];
  var QUIET = [['', 'Off'], ['18:30', '6:30 pm'], ['19:00', '7:00 pm'], ['19:30', '7:30 pm'], ['20:00', '8:00 pm'], ['20:30', '8:30 pm']];
  var BANDS = [['seeds', 'Seeds', '2 to 3'], ['sprouts', 'Sprouts', '4 to 5'], ['blossoms', 'Blossoms', '6 to 7']];
  var S = { open: false, ok: false, q: null, set: null, kids: null, user: null, msg: '', saved: '', done: null, garden: null, week: 0 };

  function api(path, method, body) {
    return fetch(path, { method: method || 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Something went wrong'); return j; }); });
  }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---------- applying the settings on this device ----------
  // Play time and quiet hours always follow the family settings. Sound and read-aloud can still be switched on a
  // single device (the speaker buttons); a grown-up's change here is copied to every device the next time it opens.
  function apply(s) {
    if (!s) return;
    var prev = {}; try { prev = JSON.parse(get('nx_settings') || '{}'); } catch (e) {}
    put('nx_settings', JSON.stringify(s));
    put('nx_world_minutes', String(s.worldMinutes));
    if (prev.updated !== s.updated) {
      put('nx_aloud', s.aloud ? 'on' : 'off');
      var w = {}; try { w = JSON.parse(get('nx_world') || '{}'); } catch (e) {}
      w.sound = s.sound; put('nx_world', JSON.stringify(w));
    }
  }
  function start() { api('/api/settings').then(apply).catch(function () {}); }

  // ---------- the grown-up check ----------
  function question() {
    var a = 6 + Math.floor(Math.random() * 4), b = 3 + Math.floor(Math.random() * 6), ans = a * b, opts = [ans];
    while (opts.length < 4) { var o = ans + (Math.floor(Math.random() * 9) - 4) * (Math.random() < 0.5 ? 1 : a); if (o > 0 && opts.indexOf(o) < 0) opts.push(o); }
    opts.sort(function (x, y) { return x - y; });
    return { text: a + ' &times; ' + b, ans: ans, opts: opts };
  }
  function unlocked() { try { return sessionStorage.getItem('nx_grownup') === '1'; } catch (e) { return S.ok; } }

  // ---------- page ----------
  function chips(name, list, cur) {
    return '<div class="me-chips">' + list.map(function (o) {
      var v = o[0], on = v === cur;
      return '<button type="button" class="dc-chip' + (on ? ' on' : '') + '" data-k="' + name + '" data-v="' + esc(JSON.stringify(v)) + '" aria-pressed="' + on + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }
  function onOff(name, cur) { return chips(name, [[true, 'On'], [false, 'Off']], cur); }
  function section(title, note, body) {
    return '<section class="set-card"><h2>' + title + '</h2>' + (note ? '<p>' + note + '</p>' : '') + body + '</section>';
  }
  function render() {
    if (!S.open) return;
    var html = '<div class="home set"><header class="topbar"><a class="brand" href="#/"><img src="/assets/logo-mark.svg" alt="" width="52" height="37"><span><b>nectara<sup class="tm">&trade;</sup></b><small>Grown-ups</small></span></a>' +
      '<a class="btn ghost" href="#/" style="min-height:44px;padding:0 16px">Back</a></header>';
    if (!unlocked()) {
      S.q = S.q || question();
      root.innerHTML = html + '<div class="set-gate"><h1>Grown-ups only</h1><p>To open family settings, tap the answer.</p><p class="set-q">' + S.q.text + ' = ?</p>' +
        '<div class="set-opts">' + S.q.opts.map(function (o) { return '<button type="button" class="btn quiet" data-ans="' + o + '">' + o + '</button>'; }).join('') + '</div>' +
        (S.msg ? '<p class="set-msg" role="status">' + esc(S.msg) + '</p>' : '') + '</div></div>';
      bindGate(); return;
    }
    if (!S.set) { root.innerHTML = html + '<p class="loading">Opening family settings&hellip;</p></div>'; return; }
    var s = S.set, kids = (S.kids && S.kids.kids) || [];
    html += '<div class="me-head"><h1>Family settings</h1><p>These follow your family to every screen you sign in on: phone, tablet, computer and TV.</p></div>' +
      (s.weeklyNote && window.NectaraWonder && S.done ? window.NectaraWonder.html({ done: S.done, garden: S.garden, nick: activeNick() }, S.week) : '') +
      (S.saved ? '<p class="set-saved" role="status">' + esc(S.saved) + '</p>' : '') + (S.msg ? '<p class="set-msg" role="alert">' + esc(S.msg) + '</p>' : '') +
      '<div class="set-grid">' +
      section('Play time in Asal&rsquo;s World', 'After this long, Asal gets sleepy and says goodbye. A grown-up can hold the goodbye button for 10 more minutes.',
        chips('worldMinutes', MINUTES.map(function (m) { return [m, m + ' min']; }), s.worldMinutes)) +
      section('Quiet hours', 'From this time until 6:00 in the morning, Asal is asleep and the world stays closed. Lessons and stories still open.',
        chips('quietFrom', QUIET, s.quietFrom)) +
      section('Read aloud', 'Lessons and stories are read aloud when they open.', onOff('aloud', s.aloud)) +
      section('Sounds in Asal&rsquo;s World', 'Music, buzzing and Asal&rsquo;s voice. Each screen also has its own speaker button.', onOff('sound', s.sound)) +
      section('Age groups', kids.length ? 'This helps us choose the right activities for each child.' : 'Make a character for each child first, then choose their age group here.',
        kids.map(function (k) {
          return '<div class="set-kid"><b>' + esc(k.nick) + '</b>' + chips('band:' + k.id, BANDS.map(function (b) { return [b[0], b[1] + ' <small>' + b[2] + '</small>']; }), k.band || '') + '</div>';
        }).join('') + '<a class="btn ghost" href="#/me" style="min-height:44px;padding:0 16px;margin-top:6px">' + (kids.length ? 'Edit characters' : 'Make a character') + '</a>') +
      section('Weekly Wonder', 'A short note each week for grown-ups: what your child explored, and one thing to try together outside.', onOff('weeklyNote', s.weeklyNote)) +
      section('Your family&rsquo;s privacy', 'We keep only first names or nicknames, age groups, character choices and lesson progress. No photos, no birthdays, no last names, and nothing is shared with other families.',
        '<div class="me-acts"><button type="button" class="btn quiet" id="set-export">Download our family&rsquo;s data</button>' +
        '<a class="btn ghost" style="min-height:44px;padding:0 16px" href="mailto:hello@nectaraschool.org?subject=Please%20delete%20our%20Nectara%20data">Ask us to delete it</a></div>') +
      section('Account', S.user && S.user.email ? 'Signed in as ' + esc(S.user.email) + '.' : '',
        '<div class="me-acts"><button type="button" class="btn ghost" id="set-lock" style="min-height:44px;padding:0 16px">Lock settings</button>' +
        '<a class="btn ghost" style="min-height:44px;padding:0 16px" href="mailto:hello@nectaraschool.org">Contact Nectara</a></div>') +
      '</div></div>';
    root.innerHTML = html; bind();
  }

  function bindGate() {
    [].forEach.call(root.querySelectorAll('[data-ans]'), function (b) {
      b.addEventListener('click', function () {
        if (parseInt(b.getAttribute('data-ans'), 10) === S.q.ans) {
          S.ok = true; S.msg = ''; try { sessionStorage.setItem('nx_grownup', '1'); } catch (e) {}
          load();
        } else { S.msg = 'Not quite. Here is a new one.'; S.q = question(); }
        render();
      });
    });
  }
  function save(patch) {
    S.saved = ''; S.msg = '';
    for (var k in patch) S.set[k] = patch[k];
    render();
    api('/api/settings', 'POST', patch).then(function (s) { S.set = s; apply(s); S.saved = 'Saved for every screen.'; render(); })
      .catch(function (e) { S.msg = e.message; render(); });
  }
  function saveBand(id, band) {
    S.saved = ''; S.msg = '';
    (S.kids.kids || []).forEach(function (k) { if (k.id === id) k.band = band; });
    render();
    api('/api/kids', 'POST', S.kids).then(function (d) { S.kids = d; S.saved = 'Saved.'; render(); })
      .catch(function (e) { S.msg = e.message; render(); });
  }
  function exportData() {
    Promise.all([api('/api/auth/me'), api('/api/progress').catch(function () { return {}; }), api('/api/kids').catch(function () { return {}; }), api('/api/settings').catch(function () { return {}; })])
      .then(function (r) {
        var data = { exported: new Date().toISOString(), account: r[0].user, progress: r[1], children: r[2], settings: r[3] };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'nectara-family-data.json'; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1000);
      }).catch(function (e) { S.msg = e.message; render(); });
  }
  function activeNick() {
    var d = S.kids, ks = (d && d.kids) || [];
    if (ks.length > 1) return '';                       // more than one child: "your little ones"
    return ks[0] ? ks[0].nick : ((S.user && S.user.children && S.user.children[0] && S.user.children[0].name) || '');
  }
  function bind() {
    [].forEach.call(root.querySelectorAll('[data-week]'), function (b) {
      b.addEventListener('click', function () { S.week = parseInt(b.getAttribute('data-week'), 10) || 0; render(); });
    });
    [].forEach.call(root.querySelectorAll('[data-k]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-k'), v = JSON.parse(b.getAttribute('data-v')), p = {};
        if (k.indexOf('band:') === 0) return saveBand(k.slice(5), v);
        p[k] = v; save(p);
      });
    });
    var ex = document.getElementById('set-export'); if (ex) ex.addEventListener('click', exportData);
    var lk = document.getElementById('set-lock');
    if (lk) lk.addEventListener('click', function () { S.ok = false; S.q = null; try { sessionStorage.removeItem('nx_grownup'); } catch (e) {} location.hash = '#/'; });
  }
  function load() {
    Promise.all([api('/api/settings'), api('/api/kids').catch(function () { return { kids: [], active: null }; }), api('/api/auth/me').catch(function () { return {}; }),
      api('/api/progress').catch(function () { return { done: {} }; }), api('/api/garden').catch(function () { return { entries: [] }; })])
      .then(function (r) { S.set = r[0]; S.kids = r[1]; S.user = r[2].user; S.done = r[3].done || {}; S.garden = r[4].entries || []; apply(r[0]); render(); })
      .catch(function (e) { S.set = null; S.msg = e.message; render(); });
  }

  function open() {
    S.open = true; S.msg = ''; S.saved = ''; document.title = 'Nectara · Grown-ups'; window.scrollTo(0, 0);
    if (unlocked()) load();
    render();
  }
  function close() { S.open = false; }

  window.NectaraSettings = { open: open, close: close, start: start };
})();
