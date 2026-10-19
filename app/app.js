// Nectara members app: home (Asal's garden + this month's series) and the lesson player (Watch → Do → Share).
// Works on phones, tablets, computers and TVs: tap, swipe, keyboard arrows and TV-remote OK/arrow keys all move the lesson.
(function () {
  'use strict';
  var DATA = window.NECTARA;
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
  var voice = null;
  var aloudOn = function () { try { return localStorage.getItem('nx_aloud') !== 'off'; } catch (e) { return true; } };
  function setAloud(on) { try { localStorage.setItem('nx_aloud', on ? 'on' : 'off'); } catch (e) {} }
  function stopVoice() { if (voice) { voice.pause(); } }
  function aloudButton() {
    var b = document.getElementById('aloud'); if (!b) return;
    var on = aloudOn();
    b.innerHTML = (on ? ICON.speaker : ICON.mute) + '<span class="aloud-label">' + (on ? 'Reading aloud' : 'Read to me') + '</span>';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function playPage(st, i) {
    stopVoice();
    if (!st.audio || !aloudOn()) return;
    if (!voice) { voice = new Audio(); voice.preload = 'auto'; }
    voice.onended = function () { var n = document.getElementById('next'); if (n) n.classList.add('nudge'); };
    voice.src = '/assets/stories/' + st.id + '/audio/' + (i < 9 ? '0' : '') + (i + 1) + '.mp3';
    var pr = voice.play();
    if (pr && pr.catch) pr.catch(function () { setAloud(false); aloudButton(); }); // the browser wants a tap first
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
    stopLesson();
    var series = DATA.series.filter(function (s) { return s.ready; })[0];
    var grown = series.lessons.filter(function (l) { return state.done[l.id]; }).length;
    var next = series.lessons.filter(function (l) { return !state.done[l.id]; })[0] || series.lessons[0];
    var first = (state.user && state.user.name || '').split(' ')[0];
    var child = state.user && state.user.children && state.user.children[0] && state.user.children[0].name;
    document.title = 'Nectara · Little Scientists';
    root.innerHTML =
      '<div class="home">' +
      '<header class="topbar"><a class="brand" href="#/"><img src="/assets/logo-mark.svg" alt="" width="52" height="37"><span><b>nectara</b><small>Little Scientists</small></span></a>' +
      '<div class="who"><span>' + (first ? 'Hi, ' + esc(first) : '') + '</span><button class="btn ghost" id="signout" type="button" style="min-height:44px;padding:0 16px">Sign out</button></div></header>' +
      '<section class="garden-card"><div><h1>' + (child ? esc(child) + '&rsquo;s garden' : 'Asal&rsquo;s garden') + '</h1>' +
      '<p>Every lesson you finish grows a flower. ' + (grown === series.lessons.length ? 'The whole garden is blooming! Lessons can be done again any time.' : grown + ' of ' + series.lessons.length + ' flowers grown this month.') + '</p>' +
      '<button class="btn" type="button" data-open="' + next.id + '">' + (grown ? 'Next: ' : 'Start: ') + esc(next.title) + '</button></div>' +
      '<div>' + gardenSvg(series) + '</div></section>' +
      (DATA.stories && DATA.stories.length ? '<div class="section-title"><h2>Story time</h2><span>A new story each month, read together</span></div><div class="lesson-grid stories">' + DATA.stories.map(function (st) {
        return '<button class="lesson-card story-card" type="button" data-open="' + st.id + '">' +
          (state.done[st.id] ? '<span class="done-badge">' + ICON.check + 'Read</span>' : '') +
          '<img src="/assets/stories/' + st.id + '/01.webp" alt="" width="1440" height="900" loading="lazy">' +
          '<span class="body"><span class="wk">' + esc(st.month) + ' story &middot; ' + st.pages.length + ' pages</span><h3>' + esc(st.title) + '</h3><span class="soft" style="font-size:0.95rem">' + esc(st.blurb) + '</span>' +
          '<span class="go">' + (state.done[st.id] ? 'Read it again &rarr;' : 'Read the story &rarr;') + '</span></span></button>';
      }).join('') + '</div>' : '') +
      '<div class="section-title"><h2>' + esc(series.title) + '</h2><span>' + esc(series.month) + ' &middot; ' + esc(series.idea) + '</span></div>' +
      '<div class="lesson-grid">' + series.lessons.map(function (l) {
        return '<button class="lesson-card" type="button" data-open="' + l.id + '">' +
          (state.done[l.id] ? '<span class="done-badge">' + ICON.check + 'Done</span>' : '') +
          '<img src="/assets/lessons/' + l.img + '.webp" alt="" width="1200" height="750" loading="lazy">' +
          '<span class="body"><span class="wk">Week ' + l.week + ' &middot; 30 min</span><h3>' + esc(l.title) + '</h3><span class="soft" style="font-size:0.95rem">' + esc(l.bigIdea) + '</span>' +
          '<span class="go">' + (state.done[l.id] ? 'Do it again &rarr;' : 'Start lesson &rarr;') + '</span></span></button>';
      }).join('') + '</div>' +
      '<div class="section-title"><h2>Coming next</h2><span>A new series each month</span></div>' +
      '<div class="coming">' + DATA.series.filter(function (s) { return !s.ready; }).map(function (s) {
        return '<div><small>' + esc(s.month) + '</small><b>' + esc(s.title) + '</b><p>' + esc(s.idea) + '</p></div>';
      }).join('') + '</div>' +
      '<div class="tips"><div class="tip"><b>On a TV</b>Open a lesson and tap the full-screen button. Arrow keys and a TV remote&rsquo;s arrows and OK button move the lesson along.</div>' +
      '<div class="tip"><b>On a phone or iPad</b>Swipe or tap Next. Add Nectara to your home screen from your browser&rsquo;s share menu, and it opens like an app.</div>' +
      '<div class="tip"><b>For grown-ups</b>Every lesson has a Grown-ups button with the materials list, setup and safety notes. Gather materials before you start.</div></div>' +
      '</div>';
    root.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { location.hash = '#/lesson/' + b.getAttribute('data-open'); }); });
    document.getElementById('signout').addEventListener('click', function () {
      api('/api/auth/logout', { method: 'POST' }).finally(function () { location.href = '/login.html?signedout=1'; });
    });
    window.scrollTo(0, 0);
  }

  // ---------- Lesson slides ----------
  function buildStorySlides(st) {
    var n = st.pages.length;
    return st.pages.map(function (lines, i) {
      var img = '<div class="story-frame"><img class="story-art" src="/assets/stories/' + st.id + '/' + (i < 9 ? '0' : '') + (i + 1) + '.webp" alt="" width="1440" height="900"></div>';
      var words = i === 0
        ? '<span class="phase watch">Story time</span><h1 class="big">' + esc(lines[0]) + '</h1><p class="mid">' + esc(lines[1] || '') + '</p><p class="soft">A children&rsquo;s story from the Grand series book <i>' + esc(st.from) + '</i>.</p>'
        : '<div class="story-text">' + lines.map(function (t, k) {
            var say = t.charAt(0) === '*';
            return '<p class="story-line' + (say ? ' say' : '') + '" style="animation-delay:' + (0.25 + k * 0.45) + 's">' + esc(say ? t.slice(1) : t) + '</p>';
          }).join('') + '</div>';
      return { visual: img, words: words, kind: i === n - 1 ? 'finish' : '', next: i === 0 ? 'Open the book' : i === n - 1 ? 'The end' : 'Turn the page' };
    });
  }

  function buildSlides(s, l) {
    var asal = '<img class="asal" src="/assets/asal.svg" alt="Asal the bee kid" width="300" height="400">';
    var asalSmall = '<img class="asal asal-small" src="/assets/asal.svg" alt="Asal the bee kid" width="300" height="400">';
    var hero = '<img class="art" src="/assets/lessons/' + l.img + '.webp" alt="" width="1200" height="750">';
    var steps = '<img class="art" src="/assets/lessons/' + l.img + '-steps.webp" alt="" width="1200" height="465">';
    return [
      { next: 'Let&rsquo;s begin', visual: hero, words: '<span class="soft">' + esc(s.title) + ' &middot; Week ' + l.week + '</span><h1 class="big">' + esc(l.title) + '</h1><p class="mid">Today, Asal has a big question for us.</p>' },
      { phase: 'watch', visual: asal, words: '<p class="soft">Sit in a circle and breathe with Asal.</p><div class="song">' + DATA.song.map(function (line, i) { return '<span style="animation-delay:' + (0.4 + i * 1.1) + 's">' + esc(line) + '</span>'; }).join('') + '</div>' },
      { phase: 'watch', visual: asal, words: '<div class="bubble"><p class="soft">Asal wonders&hellip;</p><p class="big">' + esc(l.question) + '</p></div><p class="mid">What do you think? Everyone shares a guess. Scientists start with a guess!</p>' },
      { phase: 'watch', visual: steps, words: '<p class="soft">Here&rsquo;s what we&rsquo;ll do:</p><ol class="steps-list">' + l.steps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' },
      { phase: 'do', next: 'We did it!', kind: 'do', visual: asalSmall + '<p class="rest" style="margin-top:14px">Screens rest. Hands work.</p>', words: '<h2 class="big" style="font-size:clamp(1.5rem,0.9rem + 2.4vw,3.2rem)">' + esc(l.doIntro) + '</h2><ul class="do-list">' + l.doSteps.map(function (t, i) { return '<li><button type="button" aria-pressed="false" data-tick="' + i + '"><span class="box"></span><span>' + esc(t) + '</span></button></li>'; }).join('') + '</ul>' +
          '<div class="timer"><button class="btn quiet" type="button" id="timer-btn">Start a ' + l.minutes + '-minute timer</button><span class="clock" id="clock" hidden></span><span class="bar" id="bar" hidden><i></i></span></div>' },
      { phase: 'share', visual: asal, words: '<p class="soft">Notice</p><p class="big">' + esc(l.notice) + '</p>' },
      { phase: 'share', visual: asal, words: '<p class="soft">Feel</p><p class="big">' + esc(l.feel) + '</p>' },
      { phase: 'share', visual: asal, words: '<p class="soft">Body</p><p class="big">' + esc(l.body) + '</p>' },
      { phase: 'share', visual: hero, words: '<p class="soft">What we found out</p><p class="big" style="font-size:clamp(1.5rem,0.9rem + 2.4vw,3.4rem)">' + esc(l.answer) + '</p><p class="mid challenge"><b>Big kid challenge</b>' + esc(l.challenge) + '</p>' },
      { next: 'Back to the garden', kind: 'finish', visual: '<svg class="flower-grow" viewBox="0 0 200 230" role="img" aria-label="A new flower grows"><ellipse cx="100" cy="212" rx="70" ry="14" fill="#A9C98E"/><path class="stem" d="M100 210 C92 160 108 120 100 74" stroke="#5E9A43" stroke-width="8" fill="none" stroke-linecap="round"/><g class="petals">' + [0, 60, 120, 180, 240, 300].map(function (r) { return '<ellipse cx="100" cy="44" rx="16" ry="27" fill="' + PETALS[(l.week - 1) % PETALS.length] + '" transform="rotate(' + r + ' 100 70)"/>'; }).join('') + '<circle cx="100" cy="70" r="17" fill="#2A2118"/><circle cx="95" cy="65" r="7" fill="#F7E7B4"/></g></svg>',
        words: '<h1 class="big">A flower grew in your garden!</h1><p class="mid">' + esc(l.bigIdea) + '</p><div class="bubble"><p class="soft">Take it home</p><p class="mid">' + esc(l.takeHome) + '</p></div>' },
    ];
  }

  function renderLesson(id, index) {
    var found = findLesson(id);
    if (!found) { location.hash = '#/'; return; }
    if (!state.lesson || state.lesson.l.id !== id) {
      state.lesson = found; state.slides = found.story ? buildStorySlides(found.l) : buildSlides(found.s, found.l); requestWake();
    }
    state.i = Math.max(0, Math.min(state.slides.length - 1, index || 0));
    var sl = state.slides[state.i], l = found.l, n = state.slides.length;
    document.title = l.title + ' · Nectara';
    clearTimer();
    var phaseLabel = { watch: 'Watch', do: 'Do', share: 'Share' }[sl.phase];
    root.innerHTML =
      '<div class="player">' +
      '<div class="p-top"><button class="icon-btn" type="button" id="exit" aria-label="Close lesson">' + ICON.close + '</button>' +
      '<div class="p-title">' + esc(l.title) + '</div><div class="dots" aria-hidden="true">' + state.slides.map(function (_, k) { return '<i class="' + (k === state.i ? 'on' : k < state.i ? 'past' : '') + '"></i>'; }).join('') + '</div>' +
      (found.story && l.audio ? '<button class="icon-btn aloud" type="button" id="aloud" aria-pressed="false"></button>' : '') +
      '<button class="icon-btn" type="button" id="gu-open">Grown-ups</button>' +
      (document.fullscreenEnabled ? '<button class="icon-btn" type="button" id="fs" aria-label="Full screen">' + ICON.full + '</button>' : '') + '</div>' +
      '<main class="stage' + (found.story ? ' story' : '') + '" id="stage"><div class="visual">' + sl.visual + '</div><div class="words">' + (phaseLabel ? '<span class="phase ' + sl.phase + '">' + phaseLabel + '</span>' : '') + sl.words + '</div></main>' +
      '<div class="p-bottom"><button class="btn ghost" type="button" id="back"' + (state.i === 0 ? ' disabled' : '') + '>Back</button>' +
      '<span class="soft" style="font-size:0.95rem">' + (state.i + 1) + ' of ' + n + '</span>' +
      '<button class="btn" type="button" id="next">' + (sl.next || 'Next') + ' &rarr;</button></div></div>';

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
      ab.addEventListener('click', function () { var on = !aloudOn(); setAloud(on); aloudButton(); if (on) playPage(l, state.i); else stopVoice(); });
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
        '<div><h3>After the story</h3><p>Ask: What did the little seed need to grow? What helps you grow? Then try this month&rsquo;s lessons.</p></div></div>';
      dialog.showModal();
      document.getElementById('gu-close').addEventListener('click', function () { dialog.close(); });
      return;
    }
    dialog.innerHTML = '<div class="gu"><header><h2 id="gu-title">For grown-ups</h2><button class="icon-btn" type="button" id="gu-close" aria-label="Close">' + ICON.close + '</button></header>' +
      '<p><b>' + esc(l.title) + '</b> &middot; 30 minutes &middot; ages 4&ndash;7 (younger children with a parent helping)</p>' +
      '<div><h3>Materials</h3><ul>' + l.materials.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>' +
      '<div><h3>Before you start</h3><p>' + esc(l.setup) + '</p></div>' +
      '<div><h3>Safety</h3><ul>' + l.safety.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>' +
      '<div><h3>The big idea</h3><p>' + esc(l.bigIdea) + '</p></div>' +
      '<div><h3>Leading tips</h3><ul><li>Slow is the point: waiting is part of the lesson.</li><li>Every guess is welcome. Repeat children&rsquo;s words back to them.</li><li>During &ldquo;Do,&rdquo; the screen can rest. Use Next when everyone is ready.</li></ul></div></div>';
    dialog.showModal();
    document.getElementById('gu-close').addEventListener('click', function () { dialog.close(); });
  }
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });

  // ---------- Input: keys, TV remotes, swipes ----------
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
    var m = location.hash.match(/^#\/lesson\/([a-z0-9-]+)(?:\/(\d+))?/);
    if (m) renderLesson(m[1], m[2] ? parseInt(m[2], 10) : 0); else renderHome();
  }
  window.addEventListener('hashchange', route);

  Promise.all([api('/api/auth/me'), api('/api/progress').catch(function () { return { done: {} }; })])
    .then(function (r) { state.user = r[0].user; state.done = (r[1] && r[1].done) || {}; route(); })
    .catch(function (e) {
      if (e.status === 401) location.href = '/login.html?next=/app/';
      else root.innerHTML = '<p class="loading">We couldn&rsquo;t open the garden. Please check your connection and refresh.</p>';
    });
})();
