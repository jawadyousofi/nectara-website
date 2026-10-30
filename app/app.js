// Nectara members app: home (Asal's garden + this month's series) and the lesson player (Watch → Do → Share).
// Works on phones, tablets, computers and TVs: tap, swipe, keyboard arrows and TV-remote OK/arrow keys all move the lesson.
(function () {
  'use strict';
  var DATA = window.NECTARA;
  // The Seven Petals each lesson and story grows (Nectara Whole-Child Framework), shown for grown-ups.
  var GROW_PETALS = { body: ['Body', '#E07A5F'], heart: ['Heart', '#E76F9A'], mind: ['Mind', '#5B8DEF'], voice: ['Voice', '#F2B23A'], earth: ['Earth', '#5FA36A'], world: ['World', '#3E9CA8'], spirit: ['Spirit', '#9B7FD4'] };
  var GROWS = {
    'little-drop': ['earth', 'mind', 'spirit'], 'little-seed': ['earth', 'spirit', 'body'], 'little-leaf': ['earth', 'body', 'world'],
    'day-and-night': ['mind', 'spirit'], 'i-am-grand': ['spirit', 'body', 'heart'], 'little-light': ['heart', 'voice'],
    'little-breath': ['body', 'spirit'], 'one-little-bee': ['earth', 'world'], 'one-circle': ['world', 'heart'], 'still-water': ['spirit', 'heart'],
    'rain-cloud': ['mind', 'earth', 'voice'], 'seeds-drink': ['earth', 'mind', 'body'], 'float-sink': ['mind', 'body', 'voice'], 'puddles': ['earth', 'mind', 'world'],
    'inside-seed': ['earth', 'mind', 'spirit'], 'seed-window': ['earth', 'mind', 'heart'], 'soil-safari': ['earth', 'body', 'mind'], 'worm-hotel': ['earth', 'world', 'heart'],
    'which-part': ['body', 'earth', 'mind'], 'regrow': ['earth', 'mind', 'heart'], 'rainbow-plate': ['body', 'world', 'voice'], 'food-journey': ['body', 'mind', 'earth']
  };
  window.NECTARA_GROWS = GROWS;
  function petalTags(id) {
    var g = GROWS[id]; if (!g) return '';
    return '<span class="grows">' + g.map(function (p) { return '<i style="--pc:' + GROW_PETALS[p][1] + '">' + GROW_PETALS[p][0] + '</i>'; }).join('') + '</span>';
  }
  var root = document.getElementById('root');
  var dialog = document.getElementById('grownups');
  var state = { user: null, done: {}, lesson: null, slides: [], i: 0, timer: null, wake: null };

  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var api = function (path, opts) {
    opts = opts || {};
    return fetch(path, { method: opts.method || 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || 'failed'); e.status = r.status; throw e; } return j; }); });
  };
  var allLessons = function () { var out = []; DATA.series.forEach(function (s) { (s.lessons || []).forEach(function (l) { out.push({ s: s, l: l }); }); }); return out; };
  var findLesson = function (id) {
    var st = (DATA.stories || []).filter(function (x) { return x.id === id; })[0];
    if (st) return { s: { title: 'Story time' }, l: st, story: true };
    return allLessons().filter(function (x) { return x.l.id === id; })[0];
  };

  var ICON = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" fill="currentColor"/><path d="M16 10l4 4M20 10l-4 4"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  };
  // ---------- Read-aloud (story narration) ----------
  var voice = null, voiceBlocked = false;
  var aloudOn = function () { try { return localStorage.getItem('nx_aloud') !== 'off'; } catch (e) { return true; } };
  function setAloud(on) { try { localStorage.setItem('nx_aloud', on ? 'on' : 'off'); } catch (e) {} }
  function stopVoice() { if (voice) { voice.pause(); } }
  function aloudButton() {
    var b = document.getElementById('aloud'); if (!b) return;
    var on = aloudOn() && !voiceBlocked;
    b.innerHTML = (on ? ICON.speaker : ICON.mute) + '<span class="aloud-label">' + (on ? 'Reading aloud' : 'Read to me') + '</span>';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function playPage(st, i) {
    stopVoice();
    if (state.lesson && !state.lesson.story) return playSlide(st, i);
    if (!st.audio) return;
    loadTiming(st.id);
    if (!aloudOn()) return;
    if (!voice) { voice = new Audio(); voice.preload = 'auto'; }
    voice.onended = function () { var n = document.getElementById('next'); if (n) n.classList.add('nudge'); };
    voice.src = '/assets/stories/' + st.id + '/audio/' + (i < 9 ? '0' : '') + (i + 1) + '.mp3';
    voice.ontimeupdate = null;
    var t = storyTiming[st.id] || {};
    followReading([].slice.call(document.querySelectorAll('.story-line')), t[(i < 9 ? '0' : '') + (i + 1)]);
    var pr = voice.play();
    if (pr && pr.then) pr.then(function () { voiceBlocked = false; aloudButton(); }, function () { voiceBlocked = true; aloudButton(); }); // the browser wants a tap first; keep the saved choice
  }

  // Lessons are read aloud slide by slide (words from app/lesson-script.js, recorded by tools/lesson_voice.py).
  function playSlide(l, i) {
    if (!aloudOn()) return;
    if (!voice) { voice = new Audio(); voice.preload = 'auto'; }
    voice.onended = function () { var n = document.getElementById('next'); if (n) n.classList.add('nudge'); };
    voice.ontimeupdate = null;
    voice.src = '/assets/lessons/audio/' + l.id + '/' + (i < 9 ? '0' : '') + (i + 1) + '.mp3';
    var pr = voice.play();
    if (pr && pr.then) pr.then(function () { voiceBlocked = false; aloudButton(); }, function () { voiceBlocked = true; aloudButton(); });
  }

  var PETALS = ['#E9A23B', '#F29BB5', '#7FB3D5', '#F4C25B', '#C9A0DC', '#F39A2B'];

  function flower(x, y, color, grown, n) {
    if (!grown) {
      return '<g transform="translate(' + x + ',' + y + ')"><ellipse cx="0" cy="6" rx="26" ry="9" fill="#8A6A48"/><ellipse cx="0" cy="2" rx="9" ry="6" fill="#B08A5E"/></g>';
    }
    var petals = '';
    for (var k = 0; k < 6; k++) { petals += '<ellipse cx="0" cy="-17" rx="9" ry="15" fill="' + color + '" transform="rotate(' + (k * 60) + ')"/>'; }
    return '<g transform="translate(' + x + ',' + y + ')"><ellipse cx="0" cy="6" rx="26" ry="9" fill="#8A6A48"/>' +
      '<path d="M0 4 C-4 -30 4 -50 0 -78" stroke="#5E9A43" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<path d="M0 -30 C-22 -40 -30 -30 -32 -22 C-20 -18 -8 -22 0 -30Z" fill="#78B85A"/>' +
      '<g transform="translate(0,-96)">' + petals + '<circle r="10" fill="#2A2118" opacity="0.85"/><circle r="5" cx="-3" cy="-3" fill="#F7E7B4"/></g>' +
      '<text x="0" y="40" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="700" font-size="18" fill="#2F4A35">' + n + '</text></g>';
  }

  function gardenSvg(series) {
    var ls = series.lessons;
    var w = 640, gap = w / (ls.length + 1);
    var plants = ls.map(function (l, i) { return flower(gap * (i + 1), 210, PETALS[i % PETALS.length], !!state.done[l.id], 'Week ' + l.week); }).join('');
    var grown = ls.filter(function (l) { return state.done[l.id]; }).length;
    var bee = grown ? '<image href="/assets/asal.svg" x="' + (gap * grown - 40) + '" y="6" width="66" height="88"/>' : '<image href="/assets/asal.svg" x="540" y="10" width="66" height="88"/>';
    return '<svg class="garden-svg" viewBox="0 0 640 270" role="img" aria-label="Asal&rsquo;s garden: ' + grown + ' of ' + ls.length + ' flowers grown">' +
      '<rect x="0" y="200" width="640" height="70" rx="18" fill="#C7DDB0"/><path d="M0 214 Q160 196 320 212 T640 206 L640 270 L0 270Z" fill="#A9C98E"/>' +
      '<path d="M40 70 Q200 10 360 60 T600 40" fill="none" stroke="#E9A23B" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round"/>' +
      plants + bee + '</svg>';
  }

  // ---------- Home ----------
  function renderHome() {
    stopLesson(); if (window.NectaraGarden) window.NectaraGarden.preload();
    // This month's series first; earlier months stay one tap away (chips under the series title).
    var ready = DATA.series.filter(function (s) { return s.ready; });
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var nowMonth = MONTHS[new Date().getMonth()];
    var series = ready.filter(function (s) { return s.id === state.seriesId; })[0] || ready.filter(function (s) { return s.month === nowMonth; })[0] || ready[ready.length - 1];
    var grown = series.lessons.filter(function (l) { return state.done[l.id]; }).length;
    var next = series.lessons.filter(function (l) { return !state.done[l.id]; })[0] || series.lessons[0];
    var first = (state.user && state.user.name || '').split(' ')[0];
    var child = state.user && state.user.children && state.user.children[0] && state.user.children[0].name;
    document.title = 'Nectara · Little Scientists';
    root.innerHTML =
      '<div class="home">' +
      '<header class="topbar"><a class="brand" href="#/"><img src="/assets/logo-mark.svg" alt="" width="52" height="37"><span><b>nectara<sup class="tm">&trade;</sup></b><small>Little Scientists</small></span></a>' +
      '<div class="who"><span>' + (first ? 'Hi, ' + esc(first) : '') + '</span>' + (state.user && state.user.access === 'owner' && window.NectaraDocs ? '<a class="btn ghost" href="#/docs" style="min-height:44px;padding:0 16px">Documents</a>' : '') + (window.NectaraSettings ? '<a class="btn ghost" href="#/settings" style="min-height:44px;padding:0 16px">Grown-ups</a>' : '') + '<button class="btn ghost" id="signout" type="button" style="min-height:44px;padding:0 16px">Sign out</button></div></header>' +
      (window.NectaraWorld ? '<button type="button" class="world-card" id="world-card" aria-label="Explore Asal&rsquo;s World">' + window.NectaraWorld.preview() +
        '<span class="wc-text"><h2>Asal&rsquo;s World</h2><p>Fly to the garden, the pond, the hive and the sky. Tap anything to discover something new. ' +
        (function () { var m = window.NectaraWorld.memories ? window.NectaraWorld.memories() : []; return m.length ? 'Your memory jar remembers the ' + m.join(', the ').replace(/, the ([^,]*)$/, ' and the $1') + '.' : ''; })() + '</p><span class="btn">Explore</span></span></button>' : '') +
      (window.NectaraWonder && (function () { try { return JSON.parse(localStorage.getItem('nx_settings') || '{}').weeklyNote !== false; } catch (e) { return true; } })() ?
        '<a class="wonder-home" href="#/settings"><span class="wonder-kicker">For grown-ups</span><b>This week&rsquo;s Weekly Wonder is ready</b><span>What your child explored, and one thing to try together outside &rarr;</span></a>' : '') +
      (window.NectaraMe ? (function () {
        var pic = window.NectaraMe.img(), nick = window.NectaraMe.nick();
        return '<a class="me-home" href="#/me">' + (pic ? '<img src="' + pic + '" alt="" width="160" height="240">' : '<img src="/assets/world/kids/eli.webp" alt="" width="160" height="240" class="me-ghost">') +
          '<span class="gg-home-text"><h2>' + (nick ? esc(nick) + '&rsquo;s character' : 'Make your character') + '</h2><p>' + (nick ? 'Change hair, colors and glasses any time. ' + esc(nick) + ' joins Asal in Asal&rsquo;s World on every screen.' : 'Pick hair, skin, eyes and clothes together, and your child joins Asal in Asal&rsquo;s World on the phone, tablet and TV.') + '</p><span class="btn">' + (nick ? 'Change my character' : 'Make my character') + '</span></span></a>';
      })() : '') +
      (window.NectaraGarden ? '<a class="gg-home" href="#/garden">' + window.NectaraGarden.flower() +
        '<span class="gg-home-text"><h2>Growth Garden</h2><p>' + (child ? esc(child) + '&rsquo;s' : 'Your child&rsquo;s') + ' drawings, photos and voice notes from every adventure, kept for your family and sorted by petal.</p><span class="btn">Open the garden</span></span></a>' : '') +
      '<section class="garden-card"><div><h1>' + (child ? esc(child) + '&rsquo;s garden' : 'Asal&rsquo;s garden') + '</h1>' +
      '<p>Every lesson you finish grows a flower. ' + (grown === series.lessons.length ? 'The whole garden is blooming! Lessons can be done again any time.' : grown + ' of ' + series.lessons.length + ' flowers grown this month.') + '</p>' +
      '<button class="btn" type="button" data-open="' + next.id + '">' + (grown ? 'Next: ' : 'Start: ') + esc(next.title) + '</button></div>' +
      '<div>' + gardenSvg(series) + '</div></section>' +
      (DATA.stories && DATA.stories.length ? '<div class="section-title"><h2>Story time</h2><span>A new story each month, read together</span></div><div class="lesson-grid stories">' + DATA.stories.map(function (st) {
        return '<button class="lesson-card story-card" type="button" data-open="' + st.id + '">' +
          (state.done[st.id] ? '<span class="done-badge">' + ICON.check + 'Read</span>' : '') +
          '<img src="/assets/stories/' + st.id + '/01.webp" alt="" width="1440" height="900" loading="lazy">' +
          '<span class="body"><span class="wk">' + esc(st.month) + ' story &middot; ' + st.pages.length + ' pages</span><h3>' + esc(st.title) + '</h3><span class="soft" style="font-size:0.95rem">' + esc(st.blurb) + '</span>' +
          petalTags(st.id) +
          '<span class="go">' + (state.done[st.id] ? 'Read it again &rarr;' : 'Read the story &rarr;') + '</span></span></button>';
      }).join('') + '</div>' : '') +
      '<div class="section-title"><h2>' + esc(series.title) + '</h2><span>' + esc(series.month) + ' &middot; ' + esc(series.idea) + '</span></div>' +
      (ready.length > 1 ? '<div class="series-chips" role="group" aria-label="Choose a month">' + ready.map(function (s) {
        var on = s.id === series.id;
        return '<button type="button" class="series-chip' + (on ? ' on' : '') + '" data-series="' + s.id + '" aria-pressed="' + on + '"><small>' + esc(s.month) + (s.month === nowMonth ? ' &middot; now' : '') + '</small>' + esc(s.title) + '</button>';
      }).join('') + '</div>' : '') +
      '<div class="lesson-grid">' + series.lessons.map(function (l) {
        return '<button class="lesson-card" type="button" data-open="' + l.id + '">' +
          (state.done[l.id] ? '<span class="done-badge">' + ICON.check + 'Done</span>' : '') +
          '<img src="/assets/lessons/' + l.img + '.webp" alt="" width="1200" height="750" loading="lazy">' +
          '<span class="body"><span class="wk">Week ' + l.week + ' &middot; 30 min</span><h3>' + esc(l.title) + '</h3><span class="soft" style="font-size:0.95rem">' + esc(l.bigIdea) + '</span>' +
          petalTags(l.id) +
          '<span class="go">' + (state.done[l.id] ? 'Do it again &rarr;' : 'Start lesson &rarr;') + '</span></span></button>';
      }).join('') + '</div>' +
      '<div class="section-title"><h2>Coming next</h2><span>A new series each month</span></div>' +
      '<div class="coming">' + DATA.series.filter(function (s) { return !s.ready; }).map(function (s) {
        return '<div><small>' + esc(s.month) + '</small><b>' + esc(s.title) + '</b><p>' + esc(s.idea) + '</p></div>';
      }).join('') + '</div>' +
      '<div class="tips"><div class="tip"><b>On a TV</b>Open <b>nectaraschool.org/tv</b> on the TV and approve its code from your phone (<a href="/link.html">enter a TV code</a>). Then <a href="#/remote">use your phone as the remote</a>. Then open a lesson and tap full screen; the remote&rsquo;s arrows and OK button move it along.</div>' +
      '<div class="tip"><b>On a phone or iPad</b>Swipe or tap Next. Add Nectara to your home screen from your browser&rsquo;s share menu, and it opens like an app.</div>' +
      '<div class="tip"><b>For grown-ups</b>Every lesson has a Grown-ups button with the materials list, setup and safety notes. Gather materials before you start.</div></div>' +
      '</div>';
    var wc = document.getElementById('world-card'); if (wc) wc.addEventListener('click', function () { location.hash = '#/world'; });
    root.querySelectorAll('[data-series]').forEach(function (b) {
      b.addEventListener('click', function () { state.seriesId = b.getAttribute('data-series'); var y = window.scrollY; renderHome(); window.scrollTo(0, y); });
    });
    root.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { location.hash = '#/lesson/' + b.getAttribute('data-open'); }); });
    document.getElementById('signout').addEventListener('click', function () {
      api('/api/auth/logout', { method: 'POST' }).finally(function () { location.href = '/login.html?signedout=1'; });
    });
    window.scrollTo(0, 0);
  }

  // ---------- Lesson slides ----------
  // ---------- Living story pictures ----------
  // Each story gets its own gentle motion over the illustration (rain, leaves, bees, fireflies…).
  var FX = {
    'little-drop': 'rain', 'little-seed': 'seeds', 'little-leaf': 'leaves', 'day-and-night': 'stars', 'i-am-grand': 'sparkles',
    'little-light': 'glow', 'little-breath': 'bubbles', 'one-little-bee': 'bees', 'one-circle': 'orbit', 'still-water': 'fireflies'
  };
  var LEAF = '<svg viewBox="0 0 20 20"><path d="M2 18 C2 8 8 2 18 2 C18 12 12 18 2 18Z" fill="#E9A23B"/><path d="M2 18 L14 6" stroke="#C9822A" stroke-width="1.5"/></svg>';
  var MINIBEE = '<svg viewBox="0 0 40 30"><ellipse cx="16" cy="8" rx="7" ry="9" fill="#fff" opacity=".85" class="fx-wing"/><ellipse cx="24" cy="8" rx="7" ry="9" fill="#fff" opacity=".85" class="fx-wing"/><ellipse cx="20" cy="18" rx="13" ry="9" fill="#F2C14E" stroke="#2A2118" stroke-width="2"/><path d="M16 10 V26 M23 10 V26" stroke="#2A2118" stroke-width="4"/><circle cx="31" cy="16" r="2" fill="#2A2118"/></svg>';
  function rnd(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
  function storyFx(id, page) {
    var kind = FX[id]; if (!kind) return '';
    var n = { rain: 18, seeds: 10, leaves: 8, stars: 14, sparkles: 12, glow: 9, bubbles: 10, bees: 3, orbit: 12, fireflies: 14 }[kind];
    var out = '';
    for (var k = 0; k < n; k++) {
      var r1 = rnd(k + page * 31), r2 = rnd(k * 7 + page * 13 + 1), r3 = rnd(k * 3 + page * 5 + 2);
      var style = 'left:' + (r1 * 96).toFixed(1) + '%;top:' + (r2 * 90).toFixed(1) + '%;animation-delay:-' + (r3 * 8).toFixed(2) + 's;animation-duration:' + (4 + r2 * 5).toFixed(2) + 's';
      if (kind === 'orbit') { var ang = k / n * Math.PI * 2; style = 'left:' + (50 + 30 * Math.cos(ang)).toFixed(1) + '%;top:' + (50 + 30 * Math.sin(ang)).toFixed(1) + '%;animation-delay:-' + (k * 0.3).toFixed(1) + 's;background:' + ['#E2725B', '#F2C14E', '#7BC25A', '#7FB3D5', '#9C7FC9', '#F4A6C0'][k % 6]; }
      out += '<i class="fx fx-' + kind + '" style="' + style + '">' + (kind === 'leaves' ? LEAF : kind === 'bees' ? MINIBEE : '') + '</i>';
    }
    return '<div class="story-fx fx-set-' + kind + '" aria-hidden="true">' + (kind === 'orbit' ? '<div class="fx-ring">' + out + '</div>' : out) + '</div>';
  }
  function sparkleAt(frame, e) {
    var r = frame.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
    var b = document.createElement('div'); b.className = 'fx-burst'; b.style.left = x + '%'; b.style.top = y + '%';
    for (var k = 0; k < 10; k++) b.innerHTML += '<i style="transform:rotate(' + (k * 36) + 'deg)"><b></b></i>';
    frame.appendChild(b); setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 1200);
    try {
      var c = window.__nxCtx || (window.__nxCtx = new (window.AudioContext || window.webkitAudioContext)());
      [1319, 1760, 2093].forEach(function (f, i) { var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.06; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.4); });
    } catch (err) {}
  }
  // Light up each line as it is read aloud (timed by line length across the recording).
  var storyTiming = {};   // id -> { '02': [start of each line in seconds], ... } from audio/timing.json
  function loadTiming(id) {
    if (storyTiming[id]) return;
    storyTiming[id] = {};
    fetch('/assets/stories/' + id + '/audio/timing.json').then(function (r) { return r.ok ? r.json() : {}; }).then(function (t) { storyTiming[id] = t || {}; }).catch(function () {});
  }
  function followReading(lines, starts) {
    if (!voice || !lines.length) return;
    if (starts && starts.length === lines.length) {   // real start times: the light follows her voice exactly
      voice.ontimeupdate = function () {
        var at = voice.currentTime, cur = -1;
        for (var k = 0; k < starts.length; k++) if (at >= starts[k] - 0.1) cur = k;
        lines.forEach(function (p, k) { p.classList.toggle('reading', k === cur); p.classList.toggle('read', k < cur); });
      };
      voice.addEventListener('ended', function () { lines.forEach(function (p) { p.classList.remove('reading'); p.classList.add('read'); }); }, { once: true });
      return;
    }
    var weights = lines.map(function (p) { return Math.max(8, p.textContent.length); }), total = weights.reduce(function (a, b) { return a + b; }, 0);
    function tick() {
      if (!voice.duration || isNaN(voice.duration)) return;
      var at = voice.currentTime / voice.duration * total, sum = 0, cur = -1;
      for (var k = 0; k < weights.length; k++) { sum += weights[k]; if (at < sum) { cur = k; break; } }
      lines.forEach(function (p, k) { p.classList.toggle('reading', k === cur); p.classList.toggle('read', k < cur); });
    }
    voice.ontimeupdate = tick;
    voice.addEventListener('ended', function () { lines.forEach(function (p) { p.classList.remove('reading'); p.classList.add('read'); }); }, { once: true });
  }

  function buildStorySlides(st) {
    var n = st.pages.length;
    return st.pages.map(function (lines, i) {
      var sq = st.id === 'i-am-grand';   // the picture book's pages are square: show them whole, no side bands
      var img = '<div class="story-frame' + (sq ? ' sq' : '') + '" id="story-frame"><img class="story-art" src="/assets/stories/' + st.id + '/' + (i < 9 ? '0' : '') + (i + 1) + '.webp" alt="" width="' + (sq ? 896 : 1440) + '" height="' + (sq ? 896 : 900) + '">' + storyFx(st.id, i) + '</div>';
      var words = i === 0
        ? '<span class="phase watch">Story time</span><h1 class="big">' + esc(lines[0]) + '</h1><p class="mid">' + esc(lines[1] || '') + '</p><p class="soft">' + (st.id === 'i-am-grand' ? 'The Grand series picture book by Jawad Yousofi.' : 'A children&rsquo;s story from the Grand series book <i>' + esc(st.from) + '</i>.') + '</p>'
        : '<div class="story-text">' + lines.map(function (t, k) {
            var say = t.charAt(0) === '*', doit = t.charAt(0) === '>';
            return '<p class="story-line' + (say ? ' say' : '') + (doit ? ' doit' : '') + '" style="animation-delay:' + (0.25 + k * 0.45) + 's">' + (doit ? '<b>Do it!</b> ' : '') + esc(say || doit ? t.slice(1) : t) + '</p>';
          }).join('') + '</div>';
      return { visual: img, words: words, kind: i === n - 1 ? 'finish' : '', next: i === 0 ? 'Open the book' : i === n - 1 ? 'The end' : 'Turn the page' };
    });
  }

  function buildSlides(s, l) {
    var asal = '<img class="asal" src="/assets/asal.svg" alt="Asal the bee kid" width="300" height="400">';
    var asalSmall = '<img class="asal asal-small" src="/assets/asal.svg" alt="Asal the bee kid" width="300" height="400">';
    var hero = '<img class="art" src="/assets/lessons/' + l.img + '.webp" alt="" width="1200" height="750">';
    var steps = '<img class="art" src="/assets/lessons/' + l.img + '-steps.webp" alt="" width="1200" height="465">';
    return slidesOf([
      { next: 'Let&rsquo;s begin', visual: hero, words: '<span class="soft">' + esc(s.title) + ' &middot; Week ' + l.week + '</span><h1 class="big">' + esc(l.title) + '</h1><p class="mid">Today, Asal has a big question for us.</p>' },
      { phase: 'watch', visual: asal, words: '<p class="soft">Sit in a circle and breathe with Asal.</p><div class="song">' + DATA.song.map(function (line, i) { return '<span style="animation-delay:' + (0.4 + i * 1.1) + 's">' + esc(line) + '</span>'; }).join('') + '</div>' },
      { phase: 'watch', visual: asal, words: '<div class="bubble"><p class="soft">Asal wonders&hellip;</p><p class="big">' + esc(l.question) + '</p></div><p class="mid">What do you think? Everyone shares a guess. Scientists start with a guess!</p>' },
      { phase: 'watch', visual: steps, words: '<p class="soft">Here&rsquo;s what we&rsquo;ll do:</p><ol class="steps-list">' + l.steps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' },
      { phase: 'do', next: 'We did it!', kind: 'do', visual: asalSmall + '<p class="rest" style="margin-top:14px">Screens rest. Hands work.</p>', words: '<h2 class="big" style="font-size:clamp(1.5rem,0.9rem + 2.4vw,3.2rem)">' + esc(l.doIntro) + '</h2><ul class="do-list">' + l.doSteps.map(function (t, i) { return '<li><button type="button" aria-pressed="false" data-tick="' + i + '"><span class="box"></span><span>' + esc(t) + '</span></button></li>'; }).join('') + '</ul>' +
          '<div class="timer"><button class="btn quiet" type="button" id="timer-btn">Start a ' + l.minutes + '-minute timer</button><span class="clock" id="clock" hidden></span><span class="bar" id="bar" hidden><i></i></span></div>' },
      l.makeIt ? { phase: 'make', next: 'I made it!', visual: asalSmall + '<p class="rest" style="margin-top:14px">Your way is the right way.</p>', words: '<h2 class="big" style="font-size:clamp(1.5rem,0.9rem + 2.4vw,3.2rem)">Make it yours</h2><p class="mid">' + esc(l.makeIt) + '</p><p class="soft">Show someone what you made. Every idea is welcome.</p>' } : null,
      { phase: 'share', visual: asal, words: '<p class="soft">Notice</p><p class="big">' + esc(l.notice) + '</p>' },
      { phase: 'share', visual: asal, words: '<p class="soft">Feel</p><p class="big">' + esc(l.feel) + '</p>' },
      { phase: 'share', visual: asal, words: '<p class="soft">Body</p><p class="big">' + esc(l.body) + '</p>' },
      { phase: 'share', visual: asal, words: '<div class="bubble"><p class="soft">Your ideas first</p><p class="big">What do you think happened, and why?</p></div><p class="mid">Everyone shares an idea. Scientists share their ideas before anyone knows for sure.</p>' },
      { phase: 'share', visual: hero, words: '<p class="soft">What scientists think so far</p><p class="big" style="font-size:clamp(1.5rem,0.9rem + 2.4vw,3.4rem)">' + esc(l.answer) + '</p><p class="mid challenge"><b>Big kid challenge</b>' + esc(l.challenge) + '</p>' },
      { next: 'Back to the garden', kind: 'finish', visual: '<svg class="flower-grow" viewBox="0 0 200 230" role="img" aria-label="A new flower grows"><ellipse cx="100" cy="212" rx="70" ry="14" fill="#A9C98E"/><path class="stem" d="M100 210 C92 160 108 120 100 74" stroke="#5E9A43" stroke-width="8" fill="none" stroke-linecap="round"/><g class="petals">' + [0, 60, 120, 180, 240, 300].map(function (r) { return '<ellipse cx="100" cy="44" rx="16" ry="27" fill="' + PETALS[(l.week - 1) % PETALS.length] + '" transform="rotate(' + r + ' 100 70)"/>'; }).join('') + '<circle cx="100" cy="70" r="17" fill="#2A2118"/><circle cx="95" cy="65" r="7" fill="#F7E7B4"/></g></svg>',
        words: '<h1 class="big">A flower grew in your garden!</h1><p class="mid">' + esc(l.bigIdea) + '</p><div class="bubble"><p class="soft">Take it home</p><p class="mid">' + esc(l.takeHome) + '</p></div>' },
    ]);
  }
  function slidesOf(list) { return list.filter(function (x) { return !!x; }); }

  function renderLesson(id, index) {
    var found = findLesson(id);
    if (!found) { location.hash = '#/'; return; }
    if (!state.lesson || state.lesson.l.id !== id) {
      state.lesson = found; state.slides = found.story ? buildStorySlides(found.l) : buildSlides(found.s, found.l); requestWake();
    }
    var lastI = state.lastI; state.i = Math.max(0, Math.min(state.slides.length - 1, index || 0)); state.lastI = state.i;
    var turn = found.story && lastI !== undefined && lastI !== state.i ? (state.i > lastI ? ' turn-fwd' : ' turn-back') : '';
    var sl = state.slides[state.i], l = found.l, n = state.slides.length;
    document.title = l.title + ' · Nectara';
    clearTimer();
    var phaseLabel = { watch: 'Watch', do: 'Do', make: 'Make', share: 'Share' }[sl.phase];
    root.innerHTML =
      '<div class="player">' +
      '<div class="p-top"><button class="icon-btn" type="button" id="exit" aria-label="Close lesson">' + ICON.close + '</button>' +
      '<div class="p-title">' + esc(l.title) + '</div><div class="dots" aria-hidden="true">' + state.slides.map(function (_, k) { return '<i class="' + (k === state.i ? 'on' : k < state.i ? 'past' : '') + '"></i>'; }).join('') + '</div>' +
      ((found.story ? l.audio : l.makeIt && window.NectaraLessonScript) ? '<button class="icon-btn aloud" type="button" id="aloud" aria-pressed="false"></button>' : '') +
      '<button class="icon-btn" type="button" id="gu-open">Grown-ups</button>' +
      (document.fullscreenEnabled ? '<button class="icon-btn" type="button" id="fs" aria-label="Full screen">' + ICON.full + '</button>' : '') + '</div>' +
      '<main class="stage' + (found.story ? ' story' : '') + '" id="stage"><div class="visual">' + sl.visual + '</div><div class="words">' + (phaseLabel ? '<span class="phase ' + sl.phase + '">' + phaseLabel + '</span>' : '') + sl.words + '</div></main>' +
      '<div class="p-bottom"><button class="btn ghost" type="button" id="back"' + (state.i === 0 ? ' disabled' : '') + '>Back</button>' +
      '<span class="soft" style="font-size:0.95rem">' + (state.i + 1) + ' of ' + n + '</span>' +
      '<button class="btn" type="button" id="next">' + (sl.next || 'Next') + ' &rarr;</button></div></div>';

    var sf = document.getElementById('story-frame');
    if (sf) { if (turn) sf.className += turn; sf.addEventListener('click', function (e) { sparkleAt(sf, e); }); }
    document.getElementById('exit').addEventListener('click', function () { location.hash = '#/'; });
    document.getElementById('back').addEventListener('click', prev);
    document.getElementById('next').addEventListener('click', next);
    document.getElementById('gu-open').addEventListener('click', openGrownups);
    var fs = document.getElementById('fs');
    if (fs) fs.addEventListener('click', toggleFull);
    root.querySelectorAll('[data-tick]').forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }); });
    var ab = document.getElementById('aloud');
    if (ab) {
      aloudButton();
      ab.addEventListener('click', function () { if (voiceBlocked && aloudOn()) { voiceBlocked = false; playPage(l, state.i); aloudButton(); return; } var on = !aloudOn(); setAloud(on); aloudButton(); if (on) playPage(l, state.i); else stopVoice(); });
      playPage(l, state.i);
    }
    var tb = document.getElementById('timer-btn');
    if (tb) tb.addEventListener('click', function () { startTimer(l.minutes); });
    if (sl.kind === 'finish' && !state.done[l.id]) {
      state.done[l.id] = new Date().toISOString();
      api('/api/progress', { method: 'POST', body: { lesson: l.id } }).then(function (p) { state.done = p.done || state.done; }).catch(function () {});
    }
    document.getElementById('next').focus({ preventScroll: true });
  }

  function go(k) { state.i = k; location.hash = '#/lesson/' + state.lesson.l.id + '/' + k; } // state.i moves now so quick double-presses each count
  function next() { if (state.i >= state.slides.length - 1) { location.hash = '#/'; } else { go(state.i + 1); } }
  function prev() { if (state.i > 0) go(state.i - 1); }

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () {});
  }
  function requestWake() {
    if ('wakeLock' in navigator && !state.wake) navigator.wakeLock.request('screen').then(function (w) { state.wake = w; w.addEventListener('release', function () { state.wake = null; }); }).catch(function () {});
  }
  function stopLesson() {
    state.lastI = undefined;
    clearTimer(); stopVoice(); state.lesson = null;
    if (state.wake) { state.wake.release().catch(function () {}); state.wake = null; }
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
  }

  function clearTimer() { if (state.timer) { clearInterval(state.timer); state.timer = null; } }
  function startTimer(minutes) {
    clearTimer();
    var total = minutes * 60, left = total;
    var clock = document.getElementById('clock'), bar = document.getElementById('bar'), btn = document.getElementById('timer-btn');
    clock.hidden = false; bar.hidden = false; btn.textContent = 'Restart timer';
    var tick = function () {
      var m = Math.floor(left / 60), s = left % 60;
      clock.textContent = m + ':' + (s < 10 ? '0' : '') + s;
      bar.firstChild.style.width = ((total - left) / total * 100) + '%';
      if (left <= 0) { clearTimer(); clock.textContent = 'Time!'; chime(); return; }
      left--;
    };
    tick(); state.timer = setInterval(tick, 1000);
  }
  function chime() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523.25, 659.25, 783.99].forEach(function (f, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f; o.type = 'sine'; o.connect(g); g.connect(ctx.destination);
        var t = ctx.currentTime + i * 0.25; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        o.start(t); o.stop(t + 1);
      });
    } catch (e) { /* sound is optional */ }
  }

  function openGrownups() {
    var l = state.lesson.l;
    if (state.lesson.story) {
      dialog.innerHTML = '<div class="gu"><header><h2 id="gu-title">Reading together</h2><button class="icon-btn" type="button" id="gu-close" aria-label="Close">' + ICON.close + '</button></header>' +
        '<p><b>' + esc(l.title) + '</b> &middot; about 5 minutes &middot; ages 2&ndash;7. This month&rsquo;s story for ' + esc(l.series) + '.</p>' +
        '<div><h3>Tips</h3><ul>' + l.tips.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>' +
        '<div><h3>After the story</h3><p>' + esc(l.after || 'Ask: What did you notice in the story?') + ' Then try this month&rsquo;s lessons.</p></div></div>';
      dialog.showModal();
      document.getElementById('gu-close').addEventListener('click', function () { dialog.close(); });
      return;
    }
    dialog.innerHTML = '<div class="gu"><header><h2 id="gu-title">For grown-ups</h2><button class="icon-btn" type="button" id="gu-close" aria-label="Close">' + ICON.close + '</button></header>' +
      '<p><b>' + esc(l.title) + '</b> &middot; 30 minutes &middot; ages ' + (l.seeds ? '2&ndash;7' : '4&ndash;7 (younger children with a parent helping)') + '</p>' +
      (l.grownWonder ? '<div class="gu-wonder"><h3>Your own wonder</h3><p>' + esc(l.grownWonder) + '</p><p class="soft">Children learn wonder by watching grown-ups wonder. This one is just for you.</p></div>' : '') +
      '<div><h3>Materials</h3><ul>' + l.materials.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>' +
      '<div><h3>Before you start</h3><p>' + esc(l.setup) + '</p></div>' +
      '<div><h3>Safety</h3><ul>' + l.safety.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>' +
      '<div><h3>The big idea</h3><p>' + esc(l.bigIdea) + '</p></div>' +
      (l.seeds || l.blossoms ? '<div><h3>For every age</h3><ul>' + (l.seeds ? '<li><b>Seeds (2&ndash;3):</b> ' + esc(l.seeds) + '</li>' : '') + '<li><b>Sprouts (4&ndash;5):</b> the lesson as it is.</li>' + (l.blossoms ? '<li><b>Blossoms (6&ndash;7):</b> ' + esc(l.blossoms) + '</li>' : '') + '</ul></div>' : '') +
      '<div><h3>Leading tips</h3><ul><li>Slow is the point: waiting is part of the lesson.</li><li>Every guess is welcome. Repeat children&rsquo;s words back to them.</li><li>During &ldquo;Do,&rdquo; the screen can rest. Use Next when everyone is ready.</li></ul></div></div>';
    dialog.showModal();
    document.getElementById('gu-close').addEventListener('click', function () { dialog.close(); });
  }
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });

  // ---------- Input: keys, TV remotes, swipes ----------
  // TV remote Back button (LG webOS sends keyCode 461; others send GoBack/BrowserBack):
  // closes the grown-ups panel, leaves a lesson for the home screen, and on the home screen exits the TV app.
  document.addEventListener('keydown', function (e) {
    if (!(e.keyCode === 461 || e.key === 'GoBack' || e.key === 'BrowserBack')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (dialog.open) { dialog.close(); return; }
    if (state.lesson) { location.hash = '#/'; return; }
    if (/Web0S|webOS/i.test(navigator.userAgent)) { try { window.close(); } catch (err) {} }
    else if (history.length > 1) history.back();
  });
  document.addEventListener('keydown', function (e) {
    if (!state.lesson || dialog.open) return;
    var tag = (e.target && e.target.tagName) || '';
    if (['ArrowRight', 'PageDown', 'MediaTrackNext'].indexOf(e.key) > -1) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'MediaTrackPrevious'].indexOf(e.key) > -1) { e.preventDefault(); prev(); }
    else if (e.key === ' ' && tag !== 'BUTTON') { e.preventDefault(); next(); }
    else if (e.key === 'f' || e.key === 'F') { toggleFull(); }
    else if (e.key === 'Escape' && !document.fullscreenElement) { location.hash = '#/'; }
  });
  var touchX = null;
  document.addEventListener('touchstart', function (e) { touchX = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!state.lesson || touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 70) { if (dx < 0) next(); else prev(); }
  }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && state.lesson) requestWake(); });

  // ---------- Routing ----------
  function route() {
    var w = location.hash.match(/^#\/world(?:\/([a-z]+))?/);
    if (w && window.NectaraWorld) { stopLesson(); state.lesson = null; window.NectaraWorld.open(w[1]); return; }
    if (window.NectaraWorld) window.NectaraWorld.close();
    var gm = location.hash.match(/^#\/garden(?:\/(.+))?$/);
    if (gm && window.NectaraGarden) { stopLesson(); state.lesson = null; window.NectaraGarden.open(gm[1], { user: state.user, done: state.done }); return; }
    if (window.NectaraGarden) window.NectaraGarden.close();
    if (/^#\/remote/.test(location.hash) && window.NectaraRemote) { stopLesson(); state.lesson = null; window.NectaraRemote.open(); return; }
    if (window.NectaraRemote) window.NectaraRemote.close();
    if (/^#\/settings/.test(location.hash) && window.NectaraSettings) { stopLesson(); state.lesson = null; window.NectaraSettings.open(); return; }
    if (window.NectaraSettings) window.NectaraSettings.close();
    if (/^#\/me/.test(location.hash) && window.NectaraMe) { stopLesson(); state.lesson = null; window.NectaraMe.open(); return; }
    if (window.NectaraMe) window.NectaraMe.close();
    if (/^#\/docs/.test(location.hash) && window.NectaraDocs && state.user && state.user.access === 'owner') { stopLesson(); state.lesson = null; window.NectaraDocs.open(); return; }
    if (window.NectaraDocs) window.NectaraDocs.close();
    var m = location.hash.match(/^#\/lesson\/([a-z0-9-]+)(?:\/(\d+))?/);
    if (m) renderLesson(m[1], m[2] ? parseInt(m[2], 10) : 0); else renderHome();
  }
  window.addEventListener('hashchange', route);

  // ---------- Staying up to date ----------
  // A TV or tablet can keep Nectara open for days. Every few minutes (and whenever the screen wakes) the app asks
  // whether a new version is out, and reloads itself at a calm moment: on the home screen, never mid-lesson or mid-story.
  var myVersion = (document.querySelector('meta[name="nx-version"]') || {}).content || '', updateReady = false;
  function calmMoment() { return !state.lesson && (!location.hash || location.hash === '#/' || location.hash === '#'); }
  function checkVersion() {
    if (!myVersion) return;
    var x = new XMLHttpRequest();
    x.open('GET', '/app/version.json?t=' + Date.now());
    x.onload = function () {
      try { var v = JSON.parse(x.responseText).v; if (v && v !== myVersion) { updateReady = true; if (calmMoment()) location.reload(); } } catch (e) {}
    };
    x.send();
  }
  setInterval(checkVersion, 5 * 60000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') checkVersion(); });
  window.addEventListener('hashchange', function () { if (updateReady && calmMoment()) location.reload(); });

  Promise.all([api('/api/auth/me'), api('/api/progress').catch(function () { return { done: {} }; })])
    .then(function (r) { state.user = r[0].user; state.done = (r[1] && r[1].done) || {}; route(); if (window.NectaraMe) window.NectaraMe.start(); if (window.NectaraSettings) window.NectaraSettings.start(); if (window.NectaraRemote) window.NectaraRemote.start(); })
    .catch(function (e) {
      if (e.status === 401) location.href = '/login.html?next=/app/';
      else root.innerHTML = '<p class="loading">We couldn&rsquo;t open the garden. Please check your connection and refresh.</p>';
    });
})();
