// Asal's World: an open, living world children explore freely (garden, pond, hive, sky).
// Works with touch, a mouse, keyboard arrows and TV remotes (arrows + OK, Back; LG Magic Remote pointer).
// Written in plain ES5 so older smart-TV browsers can run it.
(function () {
  'use strict';
  var W = window.NECTARA_WORLD;
  if (!W) return;
  var root = document.getElementById('root');
  var VW = 1600, VH = 900;
  var DAY = 86400000;
  // Asal with moving parts (wings flap, arm waves, eyes blink); falls back to the plain picture.
  function asalArt(cls) {
    return '<div class="asal-art ' + (cls || '') + '"><div class="a-float"><div class="a-pose">' +
      (window.ASAL_SVG || '<img src="/assets/asal.svg" alt="" width="300" height="400">') + '</div></div></div>';
  }

  var S = {
    active: false, place: null, items: [], focus: -1, mode: 'world', // world | panel | move | bye
    sound: true, found: {}, seedAt: 0, audio: null, ctx: null, ambient: null, ambientTimer: null,
    sessionStart: 0, limitMin: 20, tick: null, cloudShape: 0, lastSpot: null
  };

  // ---------- 3D Asal (loaded on demand; the drawn Asal stays as a fallback) ----------
  function load3D() {
    if (S.a3dTried) return; S.a3dTried = true;
    if (!(window.WebGLRenderingContext)) return;
    function add(src, cb) { var sc = document.createElement('script'); sc.src = src; sc.onload = cb; sc.onerror = function () {}; document.head.appendChild(sc); }
    add('/assets/three.min.js', function () {
      add('/app/asal3d.js', function () {
        if (!window.Asal3D || !window.Asal3D.supported()) return;
        try {
          S.a3dCanvas = document.createElement('canvas'); S.a3dCanvas.className = 'w-asal3d';
          S.a3d = new window.Asal3D(S.a3dCanvas);
          attach3D(true);
        } catch (e) { S.a3d = null; }
      });
    });
  }
  function attach3D(fresh) {
    var stage = document.getElementById('w-stage'); if (!S.a3d || !stage) return;
    stage.insertBefore(S.a3dCanvas, document.getElementById('w-panel'));
    document.getElementById('w-wrap').classList.add('has3d');
    fit();
    if (S.lastTarget) { var lt = S.lastTarget; S.lastTarget = null; asalTo(lt[0], lt[1], true); }
    if (S.mode === 'bye') S.a3d.setMood('sleepy');
  }

  // ---------- Storage ----------
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem('nx_world') || '{}');
      S.found = d.found || {}; S.seedAt = d.seedAt || 0; S.sound = d.sound !== false;
      var m = parseInt(localStorage.getItem('nx_world_minutes') || '', 10); if (m >= 5 && m <= 60) S.limitMin = m;
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem('nx_world', JSON.stringify({ found: S.found, seedAt: S.seedAt, sound: S.sound })); } catch (e) {}
  }
  function syncFromServer() {
    var x = new XMLHttpRequest();
    x.open('GET', '/api/progress'); x.withCredentials = true;
    x.onload = function () {
      try {
        var done = JSON.parse(x.responseText).done || {};
        Object.keys(done).forEach(function (k) {
          if (k.indexOf('w-') !== 0) return;
          if (k === 'w-seed-planted') { var t = Date.parse(done[k]); if (t && (!S.seedAt || t < S.seedAt)) S.seedAt = t; }
          else if (!S.found[k.slice(2)]) S.found[k.slice(2)] = done[k];
        });
        save(); updateJar(); if (S.place && S.place.id === 'garden') setSeedStage();
      } catch (e) {}
    };
    x.send();
  }
  function remember(key) {
    var x = new XMLHttpRequest();
    x.open('POST', '/api/progress'); x.withCredentials = true; x.setRequestHeader('Content-Type', 'application/json');
    x.send(JSON.stringify({ lesson: key }));
  }

  // ---------- Time of day ----------
  function phase() { var h = new Date().getHours(); return (h >= 19 || h < 6) ? 'night' : (h >= 17 ? 'dusk' : 'day'); }
  function isNight() { return phase() === 'night'; }

  // ---------- Sound (Web Audio for little sounds, files for Asal's voice) ----------
  function ctx() {
    if (!S.ctx) { try { S.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { S.ctx = null; } }
    if (S.ctx && S.ctx.state === 'suspended') S.ctx.resume();
    return S.ctx;
  }
  function tone(freq, start, dur, type, vol, glideTo) {
    var c = ctx(); if (!c || !S.sound) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (start || 0);
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq) {
    var c = ctx(); if (!c || !S.sound) return;
    var b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = 'lowpass'; f.frequency.value = freq || 900; g.gain.value = vol || 0.08;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  }
  var SFX = {
    chime: function () { tone(784, 0, 0.5, 'sine', 0.07); tone(1175, 0.12, 0.6, 'sine', 0.06); tone(1568, 0.24, 0.7, 'sine', 0.04); },
    pop: function () { tone(520, 0, 0.12, 'sine', 0.08, 900); },
    plop: function () { tone(700, 0, 0.25, 'sine', 0.1, 180); },
    ribbit: function () { tone(160, 0, 0.12, 'square', 0.04, 120); tone(170, 0.16, 0.14, 'square', 0.04, 110); },
    buzz: function () { tone(210, 0, 0.7, 'sawtooth', 0.025, 240); },
    whoosh: function () { noise(0.8, 0.12, 700); },
    sparkle: function () { [1319, 1568, 2093, 2637].forEach(function (f, i) { tone(f, i * 0.07, 0.3, 'sine', 0.03); }); },
    step: function () { tone(660, 0, 0.06, 'sine', 0.03); }
  };
  function sfx(n) { if (SFX[n]) try { SFX[n](); } catch (e) {} }

  function stopAmbient() {
    clearInterval(S.ambientTimer); S.ambientTimer = null;
    if (S.ambient) { try { S.ambient.stop(); } catch (e) {} S.ambient = null; }
  }
  function startAmbient(id) {
    stopAmbient(); if (!S.sound) return;
    var c = ctx(); if (!c) return;
    if (id === 'hive') {  // a soft, far-away hum
      var o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = 196; f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = 0.012;
      o.connect(f); f.connect(g); g.connect(c.destination); o.start(); S.ambient = o;
    }
    S.ambientTimer = setInterval(function () {
      if (!S.sound || S.mode === 'bye') return;
      var r = Math.random();
      if (id === 'inside') { tone(72, 0, 0.14, 'sine', 0.06, 52); tone(72, 0.28, 0.14, 'sine', 0.045, 52); }
      else if (id === 'garden' || id === 'map' || id === 'orchard') { var f0 = 2200 + r * 1200; tone(f0, 0, 0.12, 'sine', 0.018, f0 * 1.3); tone(f0 * 1.1, 0.16, 0.1, 'sine', 0.014, f0 * 0.9); }
      else if (id === 'pond') { tone(500 + r * 400, 0, 0.2, 'sine', 0.025, 220); }
      else if (id === 'sky') { noise(1.6, 0.03, 500); }
    }, 3500);
  }

  function speak(id, text, done) {
    stopVoice();
    var finished = false;
    function end() { if (finished) return; finished = true; if (done) done(); }
    if (!S.sound) { setTimeout(end, Math.min(9000, 1200 + text.length * 45)); return; }
    var a = new Audio('/assets/world/audio/' + id + '.mp3');
    S.audio = a;
    if (S.a3d) { window.__nxWorldCtx = ctx(); S.a3d.talk(a); }
    a.onended = function () { if (S.a3d) S.a3d.talk(null); end(); };
    a.onerror = function () { setTimeout(end, 1500 + text.length * 40); };
    var p = a.play(); if (p && p.catch) p.catch(function () { setTimeout(end, 1500 + text.length * 40); });
  }
  function stopVoice() { if (S.audio) { try { S.audio.pause(); } catch (e) {} S.audio = null; } if (S.a3d) S.a3d.talk(null); }

  // ---------- Small drawing helpers ----------
  function cloud(x, y, s, cls) {
    return '<g class="' + (cls === undefined ? 'w-drift' : cls) + '"><g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><g fill="#FFFFFF" opacity="0.95">' +
      '<ellipse cx="0" cy="0" rx="90" ry="44"/><circle cx="-45" cy="-18" r="40"/><circle cx="18" cy="-38" r="52"/><circle cx="65" cy="-10" r="38"/></g></g></g>';
  }
  function daisy(x, y, c, s) {
    var p = '';
    for (var i = 0; i < 8; i++) p += '<ellipse cx="0" cy="-12" rx="6" ry="12" fill="' + c + '" transform="rotate(' + (i * 45) + ')"/>';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')"><g class="w-sway"><path d="M0 0 V40" stroke="#5E9E4E" stroke-width="4"/>' + p + '<circle r="7" fill="#F2C14E"/></g></g>';
  }
  function tuft(x, y) {
    return '<path class="w-sway" d="M' + x + ' ' + y + ' q-6 -26 -14 -34 M' + x + ' ' + y + ' q2 -30 4 -40 M' + x + ' ' + y + ' q8 -24 18 -30" stroke="#6FAE55" stroke-width="5" fill="none" stroke-linecap="round"/>';
  }
  function bee(x, y, s, cls) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')"><g class="' + (cls || '') + '">' +
      '<ellipse cx="-4" cy="-14" rx="9" ry="13" fill="#FFFFFF" opacity="0.85" class="w-wing"/><ellipse cx="8" cy="-14" rx="9" ry="13" fill="#FFFFFF" opacity="0.85" class="w-wing"/>' +
      '<ellipse cx="0" cy="0" rx="18" ry="12" fill="#F2C14E" stroke="#2A2118" stroke-width="2"/><path d="M-6 -11 V11 M3 -11 V11" stroke="#2A2118" stroke-width="5"/>' +
      '<circle cx="15" cy="-3" r="2.4" fill="#2A2118"/></g></g>';
  }
  function skyAndSun(sunX, sunY) {
    var stars = '';
    for (var i = 0; i < 40; i++) { var sx = (i * 397) % 1600, sy = (i * 151) % 420; stars += '<circle cx="' + sx + '" cy="' + (sy + 10) + '" r="' + (1.5 + (i % 3)) + '" fill="#FFFBE6" class="w-twinkle" style="animation-delay:' + (i % 7) * 0.4 + 's"/>'; }
    return '<rect width="1600" height="900" fill="url(#wsky)"/>' +
      '<g class="night-only">' + stars + '</g>' +
      '<g class="day-only"><circle cx="' + sunX + '" cy="' + sunY + '" r="150" fill="url(#wsun)"/><circle cx="' + sunX + '" cy="' + sunY + '" r="58" fill="#F7C948"/></g>' +
      '<g class="night-only"><circle cx="' + sunX + '" cy="' + sunY + '" r="120" fill="url(#wmoonglow)"/><g transform="translate(' + sunX + ' ' + sunY + ') scale(0.75)"><circle r="70" fill="#F4F1DE" mask="url(#wcres)"/></g></g>';
  }
  var DEFS = '<defs>' +
    '<linearGradient id="wsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky-a"/><stop offset="1" class="sky-b"/></linearGradient>' +
    '<radialGradient id="wsun"><stop offset="0" stop-color="#FFF3B0" stop-opacity="0.9"/><stop offset="1" stop-color="#FFF3B0" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="wmoonglow"><stop offset="0" stop-color="#F4F1DE" stop-opacity="0.35"/><stop offset="1" stop-color="#F4F1DE" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="wwater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A8D4EE"/><stop offset="1" stop-color="#3E7CA8"/></linearGradient>' +
    '<linearGradient id="wwax" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE3A0"/><stop offset="1" stop-color="#F2C14E"/></linearGradient>' +
    '<mask id="wcres" maskContentUnits="userSpaceOnUse"><rect x="-200" y="-200" width="400" height="400" fill="#000"/><circle r="70" fill="#FFF"/><circle cx="34" cy="-20" r="62" fill="#000"/></mask>' +
    '<clipPath id="whiveclip"><circle cx="800" cy="470" r="318"/></clipPath>' +
    '</defs>';
  function svg(body) { return '<svg class="w-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + DEFS + body + '</svg>'; }

  // ---------- Scenes ----------
  function sceneMap() {
    var b = skyAndSun(1420, 130);
    b += cloud(260, 150, 0.9) + cloud(1180, 120, 0.7, 'w-drift w-slow');
    b += '<path d="M0 600 Q400 470 800 520 T1600 560 V900 H0Z" fill="#CFE3B8"/>';
    b += '<path d="M60 900 Q120 640 460 600 Q800 560 1150 590 Q1500 620 1560 900Z" fill="#A9CF8E"/>';
    b += '<path d="M380 560 C560 640 640 700 800 690 S1060 600 1210 545 M800 690 C760 520 760 380 800 240" fill="none" stroke="#E9A23B" stroke-width="7" stroke-linecap="round" stroke-dasharray="0 22"/>';
    // garden
    b += '<g transform="translate(380 560)"><ellipse cx="0" cy="40" rx="150" ry="40" fill="#8DC26F"/>' +
      '<path d="M-120 30 V-10 M-90 30 V-10 M-60 30 V-10 M60 30 V-10 M90 30 V-10 M120 30 V-10 M-130 0 H130" stroke="#E8D2A8" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="M0 30 V-110" stroke="#5E9E4E" stroke-width="9"/><g transform="translate(0 -125)">' + petals(16, 14, 34, 34) + '<circle r="26" fill="#6B4423"/></g>' +
      daisy(-50, 0, '#F4A6C0', 1.2) + daisy(50, 4, '#FFFFFF', 1.2) + '</g>';
    // pond
    b += '<g transform="translate(800 690)"><ellipse rx="190" ry="60" fill="url(#wwater)"/><ellipse cx="-50" cy="-6" rx="40" ry="14" fill="#6DB25A"/>' +
      '<ellipse cx="60" cy="10" rx="34" ry="12" fill="#6DB25A"/><circle cx="60" cy="2" r="10" fill="#F4A6C0"/>' +
      '<g transform="translate(-50 -22)"><ellipse rx="24" ry="17" fill="#7BC25A"/><circle cx="-10" cy="-14" r="8" fill="#7BC25A"/><circle cx="10" cy="-14" r="8" fill="#7BC25A"/><circle cx="-10" cy="-15" r="3.5" fill="#2A2118"/><circle cx="10" cy="-15" r="3.5" fill="#2A2118"/></g></g>';
    // hive
    b += '<g transform="translate(1210 545)"><path d="M70 60 C60 -40 80 -110 60 -170" stroke="#8A5A3B" stroke-width="26" fill="none" stroke-linecap="round"/>' +
      '<circle cx="40" cy="-190" r="110" fill="#7FB86A"/><circle cx="120" cy="-150" r="80" fill="#8FC57A"/>' +
      '<g transform="translate(-20 -70)"><path d="M0 -50 C45 -50 60 -10 55 40 H-55 C-60 -10 -45 -50 0 -50Z" fill="#F2C14E" stroke="#C9822A" stroke-width="5"/>' +
      '<path d="M-52 0 H52 M-55 22 H55 M-45 -24 H45" stroke="#C9822A" stroke-width="5"/><ellipse cx="0" cy="30" rx="10" ry="8" fill="#6B4423"/></g>' +
      bee(-110, -120, 1.1, 'w-fly1') + bee(-60, -10, 0.9, 'w-fly2') + '</g>';
    // sky
    b += '<g transform="translate(800 215)"><g opacity="0.85">' + rainbowArcs(0, 80, 150, 12) + '</g>' + cloud(-40, 40, 1.1, '') + cloud(100, 70, 0.7, '') + '</g>';
    // orange tree
    b += '<path d="M185 365 C220 420 300 520 380 560" fill="none" stroke="#E9A23B" stroke-width="7" stroke-linecap="round" stroke-dasharray="0 22"/>';
    b += '<g transform="translate(185 365)"><path d="M-8 70 L-6 -10 L6 -10 L8 70Z" fill="#8A5A3B"/><circle cx="0" cy="-50" r="70" fill="#5E9E4E"/><circle cx="-40" cy="-20" r="46" fill="#6DB25A"/><circle cx="40" cy="-24" r="46" fill="#6DB25A"/>' +
      '<g fill="#F28C28"><circle cx="-30" cy="-50" r="11"/><circle cx="20" cy="-70" r="11"/><circle cx="30" cy="-20" r="11"/><circle cx="-10" cy="-10" r="10"/><circle cx="-50" cy="-14" r="9"/></g></g>';
    // inside me
    b += '<path d="M1440 335 C1400 420 1320 480 1250 520" fill="none" stroke="#E9A23B" stroke-width="7" stroke-linecap="round" stroke-dasharray="0 22"/>';
    b += '<g transform="translate(1440 335)"><circle r="78" fill="#FDF1E3" stroke="#F2C9A8" stroke-width="5"/>' + child(0, 6, 0.8, '#FFE3CF') +
      '<path d="M-4 18 c-8 -6 -14 -11 -14 -17 c0 -4 3 -7 7 -7 c3 0 5 2 7 5 c2 -3 4 -5 7 -5 c4 0 7 3 7 7 c0 6 -6 11 -14 17z" fill="#E0503A"/></g>';
    b += bee(560, 420, 1, 'w-fly3');
    return svg(b);
  }
  function petals(n, rx, ry, dist, fill, stroke) {
    var p = '';
    for (var i = 0; i < n; i++) p += '<ellipse cx="0" cy="' + (-dist) + '" rx="' + rx + '" ry="' + ry + '" fill="' + (fill || '#F2C14E') + '" stroke="' + (stroke || '#E0A92E') + '" stroke-width="2" transform="rotate(' + (i * 360 / n) + ')"/>';
    return p;
  }
  function rainbowArcs(cx, cy, r, w) {
    var cols = ['#E2725B', '#F2A541', '#F2C14E', '#7BC25A', '#7FB3D5', '#9C7FC9'], s = '';
    cols.forEach(function (c, i) { var rr = r - i * w; s += '<path d="M' + (cx - rr) + ' ' + cy + ' A' + rr + ' ' + rr + ' 0 0 1 ' + (cx + rr) + ' ' + cy + '" fill="none" stroke="' + c + '" stroke-width="' + w + '"/>'; });
    return s;
  }

  function sceneGarden() {
    var b = skyAndSun(1430, 130);
    b += cloud(330, 150, 0.8) + cloud(1000, 110, 0.6, 'w-drift w-slow');
    b += '<path d="M0 520 Q300 420 620 500 T1240 470 T1600 500 V900 H0Z" fill="#CFE3B8"/>';
    b += '<path d="M0 610 Q400 530 820 600 T1600 580 V900 H0Z" fill="#A9CF8E"/>';
    var fence = '';
    for (var x = 30; x < 1600; x += 74) fence += '<rect x="' + x + '" y="545" width="26" height="80" rx="11" fill="#EAD6AE"/>';
    b += '<g>' + fence + '<rect x="0" y="568" width="1600" height="10" rx="5" fill="#DCC394"/><rect x="0" y="600" width="1600" height="10" rx="5" fill="#DCC394"/></g>';
    b += '<rect x="0" y="640" width="1600" height="180" fill="#8DC26F"/>';
    b += '<path d="M0 800 Q200 784 400 798 T800 794 T1200 800 T1600 792 V900 H0Z" fill="#8A5A3B"/>';
    b += '<g fill="#A57452"><ellipse cx="140" cy="860" rx="16" ry="9"/><ellipse cx="980" cy="870" rx="20" ry="10"/><ellipse cx="1420" cy="850" rx="14" ry="8"/><ellipse cx="300" cy="880" rx="12" ry="7"/></g>';
    for (var t = 0; t < 14; t++) b += tuft(60 + t * 117, 700 + (t % 3) * 30);
    b += daisy(620, 650, '#FFFFFF', 1.3) + daisy(960, 680, '#F4A6C0', 1.2) + daisy(1180, 650, '#FFFFFF', 1.1) + daisy(1520, 690, '#F4A6C0', 1.3) + daisy(120, 660, '#FFFFFF', 1.2);
    // worm, under the ground
    b += '<g id="w-worm"><path d="M520 840 q20 -22 40 0 t40 0 t40 0" fill="none" stroke="#E89A9A" stroke-width="18" stroke-linecap="round"/><circle cx="642" cy="836" r="3.5" fill="#2A2118"/></g>';
    // sunflower
    b += '<path d="M230 795 C218 650 246 520 230 370" fill="none" stroke="#5E9E4E" stroke-width="16" stroke-linecap="round"/>' +
      '<ellipse cx="200" cy="560" rx="48" ry="18" fill="#6DB25A" transform="rotate(-28 200 560)"/><ellipse cx="264" cy="480" rx="48" ry="18" fill="#6DB25A" transform="rotate(25 264 480)"/>' +
      '<g transform="translate(230 330)"><g id="w-sunflower">' + petals(16, 17, 46, 56) + '<circle r="46" fill="#6B4423"/>' +
      '<g fill="#8B5A2B"><circle cx="-14" cy="-12" r="4"/><circle cx="10" cy="-18" r="4"/><circle cx="18" cy="6" r="4"/><circle cx="-6" cy="12" r="4"/><circle cx="-22" cy="8" r="4"/><circle cx="2" cy="-2" r="4"/></g></g></g>';
    // mint
    var mint = '';
    [[-40, 10, -30], [0, -18, 0], [38, 6, 28], [-18, -40, -12], [22, -44, 16]].forEach(function (l) {
      mint += '<ellipse cx="' + l[0] + '" cy="' + l[1] + '" rx="22" ry="32" fill="#5FA36A" transform="rotate(' + l[2] + ' ' + l[0] + ' ' + l[1] + ')"/><path d="M' + l[0] + ' ' + (l[1] + 26) + ' V' + (l[1] - 24) + '" stroke="#3F7F4A" stroke-width="2.5" transform="rotate(' + l[2] + ' ' + l[0] + ' ' + l[1] + ')"/>';
    });
    b += '<g transform="translate(470 705)"><g id="w-mint">' + mint + '<g class="w-scent" fill="none" stroke="#9AD6A6" stroke-width="5" stroke-linecap="round"><path d="M-30 -70 q-12 -20 4 -36 t0 -34"/><path d="M10 -78 q-12 -20 4 -36 t0 -34"/><path d="M44 -66 q-12 -20 4 -36 t0 -34"/></g></g></g>';
    // seed bed
    b += '<g transform="translate(800 715)"><rect x="-115" y="-12" width="230" height="74" rx="12" fill="#A8754E" stroke="#7A5235" stroke-width="5"/>' +
      '<ellipse cx="0" cy="-12" rx="108" ry="18" fill="#6B4423"/>' +
      '<g id="w-seed" class="sp"><g class="st st-none"><path d="M70 -14 V-80" stroke="#A8754E" stroke-width="6"/><rect x="40" y="-120" width="64" height="44" rx="6" fill="#FFF6E0" stroke="#C9822A" stroke-width="3"/><circle cx="72" cy="-98" r="8" fill="#F2C14E"/><path d="M72 -110 V-86 M60 -98 H84" stroke="#E0A92E" stroke-width="3"/></g>' +
      '<g class="st st-0"><ellipse cx="0" cy="-18" rx="34" ry="12" fill="#8A5A3B"/><ellipse cx="0" cy="-22" rx="8" ry="5" fill="#C9A06A"/></g>' +
      '<g class="st st-1"><ellipse cx="0" cy="-18" rx="34" ry="12" fill="#8A5A3B"/><path d="M0 -18 V-46" stroke="#6DB25A" stroke-width="6" stroke-linecap="round"/><ellipse cx="-10" cy="-48" rx="10" ry="6" fill="#7BC25A"/><ellipse cx="10" cy="-50" rx="10" ry="6" fill="#7BC25A"/></g>' +
      '<g class="st st-2"><path d="M0 -18 V-100" stroke="#5E9E4E" stroke-width="8" stroke-linecap="round"/><ellipse cx="-24" cy="-60" rx="24" ry="10" fill="#6DB25A" transform="rotate(-20 -24 -60)"/><ellipse cx="24" cy="-80" rx="24" ry="10" fill="#6DB25A" transform="rotate(20 24 -80)"/></g>' +
      '<g class="st st-3"><path d="M0 -18 V-150" stroke="#5E9E4E" stroke-width="9" stroke-linecap="round"/><ellipse cx="-28" cy="-70" rx="28" ry="11" fill="#6DB25A" transform="rotate(-20 -28 -70)"/><ellipse cx="28" cy="-100" rx="28" ry="11" fill="#6DB25A" transform="rotate(20 28 -100)"/><ellipse cx="0" cy="-166" rx="14" ry="20" fill="#7BC25A"/><path d="M-6 -178 Q0 -190 6 -178" stroke="#E9A23B" stroke-width="5" fill="none"/></g>' +
      '<g class="st st-4"><path d="M0 -18 V-160" stroke="#5E9E4E" stroke-width="9" stroke-linecap="round"/><ellipse cx="-28" cy="-70" rx="28" ry="11" fill="#6DB25A" transform="rotate(-20 -28 -70)"/><ellipse cx="28" cy="-104" rx="28" ry="11" fill="#6DB25A" transform="rotate(20 28 -104)"/><g transform="translate(0 -180)">' + petals(10, 16, 30, 34, '#F4A6C0', '#E07FA0') + '<circle r="22" fill="#F2C14E"/></g></g>' +
      '</g></g>';
    // ladybug on a leaf
    b += '<path d="M940 640 C980 560 1100 540 1180 580 C1120 640 1020 660 940 640Z" fill="#6DB25A"/><path d="M950 636 C1030 600 1100 588 1170 584" stroke="#4F8F45" stroke-width="4" fill="none"/>';
    b += '<g transform="translate(1060 590)"><g id="w-ladybug"><path d="M22 -10 q10 -14 22 -12 M22 6 q12 6 20 2" stroke="#2A2118" stroke-width="3" fill="none"/><circle cx="24" cy="-2" r="13" fill="#2A2118"/>' +
      '<ellipse cx="0" cy="0" rx="30" ry="24" fill="#D9412B"/><path d="M-30 0 H22" stroke="#2A2118" stroke-width="3"/>' +
      '<g fill="#2A2118"><circle cx="-14" cy="-10" r="5"/><circle cx="-14" cy="10" r="5"/><circle cx="2" cy="-14" r="4.5"/><circle cx="2" cy="14" r="4.5"/><circle cx="-24" cy="0" r="3.5"/><circle cx="12" cy="-7" r="3.5"/><circle cx="12" cy="7" r="3.5"/></g></g></g>';
    // mushrooms
    b += '<g transform="translate(1300 700)"><g id="w-mushroom">' +
      '<rect x="-48" y="-10" width="26" height="58" rx="10" fill="#F5EBDD"/><path d="M-80 -8 Q-35 -80 10 -8Z" fill="#E2725B"/><g fill="#FFF6E0"><circle cx="-52" cy="-30" r="7"/><circle cx="-26" cy="-22" r="5"/><circle cx="-38" cy="-48" r="5"/></g>' +
      '<rect x="22" y="10" width="20" height="40" rx="8" fill="#F5EBDD"/><path d="M-4 12 Q32 -42 68 12Z" fill="#E2725B"/><g fill="#FFF6E0"><circle cx="24" cy="-6" r="5"/><circle cx="44" cy="0" r="4"/></g>' +
      '<g class="w-spores" fill="#F7E7B4"><circle cx="-40" cy="-70" r="4"/><circle cx="-20" cy="-90" r="3"/><circle cx="-56" cy="-96" r="3.5"/><circle cx="30" cy="-40" r="3"/><circle cx="10" cy="-70" r="3.5"/></g></g></g>';
    b += '<g class="w-butterfly"><g transform="translate(700 420)"><ellipse cx="-12" cy="0" rx="14" ry="20" fill="#F4A6C0"/><ellipse cx="12" cy="0" rx="14" ry="20" fill="#F4A6C0"/><rect x="-3" y="-16" width="6" height="32" rx="3" fill="#6B4423"/></g></g>';
    b += bee(1420, 420, 0.9, 'w-fly1') + bee(880, 470, 0.8, 'w-fly2');
    return svg(b);
  }

  function scenePond() {
    var b = skyAndSun(1440, 130);
    b += cloud(420, 140, 0.8) + cloud(1050, 100, 0.55, 'w-drift w-slow');
    b += '<path d="M0 470 Q260 400 560 450 T1100 430 T1600 460 V900 H0Z" fill="#CFE3B8"/>';
    var trees = '';
    [[90, 420, 70], [210, 400, 90], [1320, 400, 85], [1450, 420, 70], [1560, 410, 60]].forEach(function (t) { trees += '<rect x="' + (t[0] - 8) + '" y="' + t[1] + '" width="16" height="60" fill="#8A5A3B"/><circle cx="' + t[0] + '" cy="' + t[1] + '" r="' + t[2] + '" fill="#8FBF7A"/>'; });
    b += trees;
    b += '<rect x="0" y="520" width="1600" height="380" fill="#9CCB7F"/>';
    b += '<ellipse cx="800" cy="690" rx="720" ry="205" fill="#7FA866"/><ellipse cx="800" cy="690" rx="700" ry="192" fill="url(#wwater)"/>';
    b += '<g class="w-shimmer" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.55"><path d="M330 640 h80"/><path d="M640 700 h120"/><path d="M1060 660 h90"/><path d="M880 800 h70"/><path d="M1220 760 h60"/></g>';
    // fish under the water
    b += '<g transform="translate(960 760)"><g id="w-fish"><path d="M-40 0 Q0 -30 40 0 Q0 30 -40 0Z" fill="#F2A541"/><path d="M38 0 L70 -22 L66 0 L70 22Z" fill="#E2725B"/><circle cx="-22" cy="-4" r="4" fill="#2A2118"/>' +
      '<g class="w-bubbles" fill="none" stroke="#FFFFFF" stroke-width="3"><circle cx="-56" cy="-20" r="6"/><circle cx="-64" cy="-44" r="4"/><circle cx="-58" cy="-64" r="3"/></g></g></g>';
    // lily pads
    function pad(x, y, r) { return '<path d="M' + x + ' ' + y + ' m' + r + ' 0 a' + r + ' ' + (r * 0.38) + ' 0 1 1 -' + (r * 0.2) + ' -' + (r * 0.3) + ' L' + x + ' ' + y + 'Z" fill="#6DB25A" stroke="#4F8F45" stroke-width="3"/>'; }
    b += pad(500, 590, 80) + pad(1150, 640, 60) + pad(680, 760, 50);
    b += '<g transform="translate(830 610)"><path d="M70 0 a70 24 0 1 1 -14 -20 L0 0Z" fill="#6DB25A" stroke="#4F8F45" stroke-width="3"/><g id="w-lily" transform="translate(0 -10)">' + petals(8, 12, 28, 22, '#F4A6C0', '#E07FA0') + petals(6, 9, 20, 12, '#FBD3E0', '#F4A6C0') + '<circle r="10" fill="#F2C14E"/></g></g>';
    // frog
    b += '<g transform="translate(500 548)"><g id="w-frog"><ellipse cx="0" cy="20" rx="58" ry="40" fill="#7BC25A"/><ellipse cx="0" cy="30" rx="34" ry="22" fill="#B9E29A"/>' +
      '<circle cx="-26" cy="-14" r="20" fill="#7BC25A"/><circle cx="26" cy="-14" r="20" fill="#7BC25A"/><circle cx="-26" cy="-16" r="11" fill="#FFFFFF"/><circle cx="26" cy="-16" r="11" fill="#FFFFFF"/>' +
      '<circle cx="-24" cy="-15" r="6" fill="#2A2118"/><circle cx="28" cy="-15" r="6" fill="#2A2118"/><path d="M-18 8 Q0 20 18 8" stroke="#2A2118" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="-50" cy="54" rx="22" ry="9" fill="#6AAE4C"/><ellipse cx="50" cy="54" rx="22" ry="9" fill="#6AAE4C"/></g></g>';
    // reeds and the little drop
    var reeds = '';
    [[120, 700], [150, 690], [185, 705], [1430, 600], [1470, 610], [1510, 595]].forEach(function (r, i) {
      reeds += '<g class="w-sway"><path d="M' + r[0] + ' ' + (r[1] + 120) + ' V' + (r[1] - 120) + '" stroke="#6E9E52" stroke-width="7"/>' + (i % 2 ? '<ellipse cx="' + r[0] + '" cy="' + (r[1] - 110) + '" rx="10" ry="30" fill="#8A5A3B"/>' : '') + '</g>';
    });
    b += reeds + '<path d="M1360 640 C1340 600 1330 570 1300 552" stroke="#6E9E52" stroke-width="12" fill="none" stroke-linecap="round"/>';
    b += '<g transform="translate(1360 520)"><g id="w-drop"><path d="M0 -44 C22 -12 30 6 30 20 A30 30 0 0 1 -30 20 C-30 6 -22 -12 0 -44Z" fill="#7FB3D5" stroke="#3E7CA8" stroke-width="3"/>' +
      '<ellipse cx="-10" cy="4" rx="5" ry="9" fill="#FFFFFF" opacity="0.7"/><circle cx="-8" cy="18" r="3.5" fill="#2A2118"/><circle cx="10" cy="18" r="3.5" fill="#2A2118"/><path d="M-6 28 Q1 34 8 28" stroke="#2A2118" stroke-width="3" fill="none" stroke-linecap="round"/></g></g>';
    // pebbles and ripple rings
    b += '<g transform="translate(300 770)"><g id="w-ripple"><ellipse cx="-30" cy="10" rx="34" ry="20" fill="#B8B2A6"/><ellipse cx="22" cy="18" rx="28" ry="16" fill="#CFC9BD"/><ellipse cx="4" cy="-8" rx="22" ry="14" fill="#A39D91"/></g></g>';
    b += '<g transform="translate(470 690)"><g id="w-rings" fill="none" stroke="#FFFFFF" stroke-width="4"><ellipse rx="40" ry="12"/><ellipse rx="40" ry="12"/><ellipse rx="40" ry="12"/></g></g>';
    // dragonfly
    b += '<g transform="translate(1180 300)"><g id="w-dragonfly" class="w-hover"><g class="w-wingbeat" fill="#DCEBF5" stroke="#7FB3D5" stroke-width="2" opacity="0.85">' +
      '<ellipse cx="-30" cy="-14" rx="40" ry="10" transform="rotate(-12 -30 -14)"/><ellipse cx="30" cy="-14" rx="40" ry="10" transform="rotate(12 30 -14)"/>' +
      '<ellipse cx="-28" cy="6" rx="34" ry="9" transform="rotate(10 -28 6)"/><ellipse cx="28" cy="6" rx="34" ry="9" transform="rotate(-10 28 6)"/></g>' +
      '<rect x="-5" y="-24" width="10" height="80" rx="5" fill="#3E9C9C"/><circle cx="0" cy="-28" r="10" fill="#3E7CA8"/></g></g>';
    return svg(b);
  }

  function sceneHive() {
    var b = skyAndSun(1440, 120);
    b += cloud(260, 130, 0.7) + cloud(1200, 110, 0.5, 'w-drift w-slow');
    b += '<path d="M0 560 Q400 480 800 540 T1600 520 V900 H0Z" fill="#A9CF8E"/>';
    b += '<rect x="0" y="720" width="1600" height="180" fill="#8DC26F"/>';
    for (var t = 0; t < 12; t++) b += tuft(40 + t * 140, 770 + (t % 2) * 40);
    b += daisy(1180, 720, '#FFFFFF', 1.3) + daisy(1500, 760, '#F4A6C0', 1.3) + daisy(120, 690, '#F4A6C0', 1.2) + daisy(1540, 650, '#FFFFFF', 1.1);
    // the hive window: honeycomb inside
    var hex = '', r = 30, w = r * Math.sqrt(3);
    for (var row = 0; row < 14; row++) {
      for (var col = 0; col < 14; col++) {
        var cx = 470 + col * w + (row % 2) * w / 2, cy = 150 + row * r * 1.5;
        var dh = Math.sqrt(Math.pow(cx - 610, 2) + Math.pow(cy - 600, 2)), db = Math.sqrt(Math.pow(cx - 930, 2) + Math.pow(cy - 575, 2));
        var cls = dh < 95 ? 'hc honey' : (db < 85 ? 'hc baby' : 'hc');
        var pts = [];
        for (var k = 0; k < 6; k++) { var a = Math.PI / 180 * (60 * k - 30); pts.push((cx + (r - 2) * Math.cos(a)).toFixed(1) + ',' + (cy + (r - 2) * Math.sin(a)).toFixed(1)); }
        hex += '<polygon class="' + cls + '" points="' + pts.join(' ') + '"/>' + (cls === 'hc baby' ? '<path class="larva" d="M' + (cx - 8) + ' ' + (cy - 4) + ' a9 9 0 1 0 12 -6" stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round"/>' : '') +
          (cls === 'hc honey' ? '<ellipse cx="' + (cx - 7) + '" cy="' + (cy - 8) + '" rx="5" ry="3" fill="#FFF3B0" opacity="0.8"/>' : '');
      }
    }
    b += '<circle cx="800" cy="470" r="340" fill="#A8754E"/><circle cx="800" cy="470" r="326" fill="#C9822A"/>';
    b += '<g clip-path="url(#whiveclip)"><rect x="470" y="140" width="660" height="660" fill="url(#wwax)"/><g id="w-comb">' + hex + '</g>' +
      '<g id="w-honey"><path class="w-drip" d="M610 640 q0 30 -6 46 a8 8 0 1 0 12 0 q-6 -16 -6 -46Z" fill="#E9A23B"/></g>' +
      '<g id="w-baby"></g>' +
      bee(700, 300, 1.4, 'w-walk1') + bee(880, 700, 1.3, 'w-walk2') +
      '<g transform="translate(1010 300)"><g id="w-dance">' + bee(0, 0, 1.8, '') + '</g></g></g>';
    b += '<circle cx="800" cy="470" r="318" fill="none" stroke="#7A5235" stroke-width="6"/>';
    // flower with a visiting bee
    b += '<g transform="translate(1360 650)"><path d="M0 0 V120" stroke="#5E9E4E" stroke-width="10"/><ellipse cx="-30" cy="70" rx="30" ry="12" fill="#6DB25A" transform="rotate(-25 -30 70)"/>' +
      '<g>' + petals(9, 24, 44, 46, '#F4A6C0', '#E07FA0') + '<circle r="30" fill="#F2C14E"/><g fill="#E9A23B"><circle cx="-8" cy="-6" r="4"/><circle cx="8" cy="4" r="4"/><circle cx="0" cy="10" r="3"/></g></g>' +
      '<g id="w-flower">' + bee(-150, -120, 1.2, '') + '</g></g>';
    // water dish
    b += '<g transform="translate(290 770)"><ellipse cx="0" cy="20" rx="110" ry="34" fill="#E8E0CC"/><ellipse cx="0" cy="12" rx="96" ry="26" fill="#9BC7E4"/>' +
      '<g fill="#B8B2A6"><ellipse cx="-40" cy="12" rx="18" ry="10"/><ellipse cx="20" cy="8" rx="20" ry="11"/><ellipse cx="54" cy="16" rx="12" ry="7"/></g>' +
      '<g id="w-water">' + bee(20, -6, 1.2, '') + '</g></g>';
    b += bee(1230, 320, 1, 'w-fly1') + bee(330, 360, 0.9, 'w-fly2') + bee(1460, 480, 0.8, 'w-fly3');
    return svg(b);
  }

  function sceneSky() {
    var b = '<rect width="1600" height="900" fill="url(#wsky)"/>';
    var stars = '', lines = '';
    for (var i = 0; i < 60; i++) { var sx = (i * 263) % 1600, sy = (i * 97) % 470; stars += '<circle cx="' + sx + '" cy="' + (sy + 20) + '" r="' + (1.6 + (i % 3)) + '" fill="#FFFBE6" class="w-twinkle" style="animation-delay:' + (i % 9) * 0.35 + 's"/>'; }
    var cons = [[880, 90], [940, 130], [1010, 110], [1050, 170], [990, 200], [930, 185]];
    cons.forEach(function (p, i) { stars += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6" fill="#FFF3B0"/>'; if (i) lines += '<path d="M' + cons[i - 1][0] + ' ' + cons[i - 1][1] + ' L' + p[0] + ' ' + p[1] + '"/>'; });
    b += '<g id="w-stars"><g class="w-starfield">' + stars + '</g><g class="w-cons" stroke="#FFF3B0" stroke-width="3" stroke-dasharray="6 8">' + lines + '</g></g>';
    b += '<g transform="translate(1310 200)"><g id="w-sun" class="day-only"><circle r="170" fill="url(#wsun)"/><circle r="82" fill="#F7C948"/>' +
      '<circle cx="-24" cy="-8" r="6" fill="#C9822A"/><circle cx="24" cy="-8" r="6" fill="#C9822A"/><path d="M-22 18 Q0 34 22 18" stroke="#C9822A" stroke-width="5" fill="none" stroke-linecap="round"/></g>' +
      '<g id="w-moon" class="night-only"><circle r="140" fill="url(#wmoonglow)"/><circle r="70" fill="#F4F1DE" mask="url(#wcres)"/></g></g>';
    b += '<g id="w-rainbow" opacity="0.18">' + rainbowArcs(1000, 720, 330, 16) + '</g>';
    b += cloud(1150, 420, 0.7) + cloud(180, 160, 0.6, 'w-drift w-slow');
    // the shape-changing cloud
    b += '<g transform="translate(600 270)"><g id="w-cloud" class="cs-0" fill="#FFFFFF">' +
      '<g class="cs cs0"><ellipse rx="150" ry="62"/><circle cx="-70" cy="-30" r="62"/><circle cx="20" cy="-62" r="80"/><circle cx="100" cy="-20" r="58"/></g>' +
      '<g class="cs cs1"><ellipse cx="0" cy="10" rx="120" ry="70"/><circle cx="90" cy="-30" r="50"/><ellipse cx="80" cy="-110" rx="16" ry="54"/><ellipse cx="112" cy="-104" rx="16" ry="50"/><circle cx="-120" cy="20" r="26"/></g>' +
      '<g class="cs cs2"><ellipse cx="0" cy="0" rx="170" ry="70"/><path d="M150 -10 L230 -60 L215 0 L230 60Z"/><path d="M-60 -70 q0 -50 20 -60 M-50 -70 q30 -40 50 -40" stroke="#FFFFFF" stroke-width="10" fill="none"/><circle cx="-110" cy="-10" r="8" fill="#7FB3D5"/></g>' +
      '<g class="cs cs3"><path d="M0 70 C-160 -20 -110 -130 0 -60 C110 -130 160 -20 0 70Z"/></g></g></g>';
    // birds in a V
    var birds = '';
    [[0, 0], [-50, -36], [-100, -72], [-50, 36], [-100, 72], [-150, -108], [-150, 108]].forEach(function (p) { birds += '<path class="w-flap" d="M' + (p[0] - 18) + ' ' + p[1] + ' q9 -12 18 0 q9 -12 18 0" stroke="#2F4A35" stroke-width="5" fill="none" stroke-linecap="round"/>'; });
    b += '<g transform="translate(330 400)"><g id="w-birds">' + birds + '</g></g>';
    b += '<path d="M0 760 Q400 680 800 740 T1600 720 V900 H0Z" fill="#A9CF8E"/><path d="M0 820 Q500 770 1000 820 T1600 810 V900 H0Z" fill="#8DC26F"/>';
    b += '<g class="w-sway"><rect x="1392" y="700" width="16" height="70" fill="#8A5A3B"/><circle cx="1400" cy="690" r="54" fill="#7FB86A"/></g><g class="w-sway"><rect x="1492" y="720" width="14" height="60" fill="#8A5A3B"/><circle cx="1500" cy="712" r="44" fill="#8FC57A"/></g>';
    // kite
    b += '<path d="M430 690 Q380 790 300 880" stroke="#5B4C3A" stroke-width="2.5" fill="none"/>';
    b += '<g transform="translate(430 640)"><g id="w-wind" class="w-kite"><path d="M0 -60 L44 0 L0 60 L-44 0Z" fill="#E2725B"/><path d="M0 -60 L44 0 L0 0Z" fill="#F2C14E"/><path d="M0 0 L-44 0 L0 60Z" fill="#F2C14E"/>' +
      '<path d="M0 60 q14 20 0 40 q-14 20 0 40" stroke="#5B4C3A" stroke-width="2.5" fill="none"/><path d="M-10 92 l20 8 M-10 132 l20 8" stroke="#7FB3D5" stroke-width="8" stroke-linecap="round"/></g></g>';
    return svg(b);
  }

  // ---------- The Orange Tree: from seed to fruit, and back to the soil ----------
  function orange(x, y, r) {
    return '<g transform="translate(' + x + ' ' + y + ')"><circle r="' + r + '" fill="#F28C28"/><circle cx="' + (-r * 0.35) + '" cy="' + (-r * 0.35) + '" r="' + (r * 0.28) + '" fill="#FFB766" opacity="0.8"/>' +
      '<path d="M0 ' + (-r) + ' q' + (r * 0.5) + ' ' + (-r * 0.6) + ' ' + (r * 1.1) + ' ' + (-r * 0.35) + '" fill="#5E9E4E" stroke="#4F8F45" stroke-width="2"/></g>';
  }
  function blossom(x, y, s) {
    var p = '';
    for (var i = 0; i < 5; i++) p += '<ellipse cx="0" cy="-9" rx="6" ry="9" fill="#FFFFFF" transform="rotate(' + (i * 72) + ')"/>';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')">' + p + '<circle r="4.5" fill="#F2C14E"/></g>';
  }
  function child(x, y, s, shirt) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')">' +
      '<path d="M-26 40 L-34 92 M26 40 L34 92" stroke="#8A5A3B" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="M-30 -6 C-60 -20 -70 -46 -66 -60 M30 -6 C60 -20 70 -46 66 -60" stroke="#E8B48C" stroke-width="12" fill="none" stroke-linecap="round"/>' +
      '<rect x="-34" y="-20" width="68" height="70" rx="26" fill="' + (shirt || '#7FB3D5') + '"/>' +
      '<circle cx="0" cy="-50" r="30" fill="#E8B48C"/><path d="M-30 -58 C-28 -86 28 -86 30 -58 C20 -70 -20 -70 -30 -58Z" fill="#3B2A1E"/>' +
      '<circle cx="-10" cy="-50" r="3.5" fill="#2A2118"/><circle cx="10" cy="-50" r="3.5" fill="#2A2118"/><path d="M-9 -38 Q0 -31 9 -38" stroke="#2A2118" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="-18" cy="-42" r="5" fill="#F4A6A6" opacity="0.6"/><circle cx="18" cy="-42" r="5" fill="#F4A6A6" opacity="0.6"/></g>';
  }
  function sceneOrchard() {
    var b = skyAndSun(1440, 130);
    b += cloud(300, 140, 0.8) + cloud(1120, 110, 0.6, 'w-drift w-slow');
    b += '<path d="M0 540 Q360 450 760 520 T1600 500 V900 H0Z" fill="#CFE3B8"/>';
    b += '<path d="M0 640 Q420 580 840 630 T1600 610 V900 H0Z" fill="#A9CF8E"/>';
    b += '<path d="M0 790 Q260 772 520 788 T1040 784 T1600 790 V900 H0Z" fill="#8A5A3B"/>';
    b += '<g fill="#A57452"><ellipse cx="120" cy="850" rx="16" ry="9"/><ellipse cx="760" cy="870" rx="20" ry="10"/><ellipse cx="1300" cy="855" rx="14" ry="8"/></g>';
    for (var t = 0; t < 13; t++) b += tuft(40 + t * 125, 700 + (t % 3) * 28);
    b += daisy(150, 690, '#FFFFFF', 1.1) + daisy(1270, 680, '#F4A6C0', 1.1) + daisy(860, 720, '#FFFFFF', 1);
    // the big orange tree
    b += '<path d="M612 800 C620 700 616 600 628 500 L652 500 C664 600 660 700 668 800Z" fill="#8A5A3B"/>' +
      '<path d="M636 560 C600 520 560 500 520 470 M644 540 C690 500 730 480 770 460" stroke="#8A5A3B" stroke-width="18" stroke-linecap="round" fill="none"/>';
    b += '<g fill="#5E9E4E"><circle cx="640" cy="330" r="175"/><circle cx="480" cy="380" r="128"/><circle cx="800" cy="380" r="128"/></g>' +
      '<g fill="#6DB25A"><circle cx="560" cy="230" r="118"/><circle cx="730" cy="230" r="118"/><circle cx="640" cy="300" r="120"/></g>';
    b += '<g id="w-orange">' + orange(560, 300, 24) + orange(705, 270, 24) + orange(625, 405, 26) + orange(770, 385, 23) + orange(495, 405, 22) + orange(655, 195, 21) + orange(810, 300, 21) + orange(450, 320, 20) + '</g>';
    b += '<g id="w-blossom">' + blossom(880, 290, 1.3) + blossom(912, 322, 1.1) + blossom(862, 332, 1.2) + blossom(902, 260, 1) + bee(950, 250, 1, '') + '</g>';
    b += orange(560, 805, 20) + orange(720, 812, 18);
    // seed in the soil
    b += '<g transform="translate(250 770)"><g id="w-oseed"><ellipse cx="0" cy="18" rx="80" ry="22" fill="#6B4423"/><path d="M-70 14 Q0 -26 70 14" fill="#7A5235"/>' +
      '<ellipse cx="0" cy="8" rx="16" ry="10" fill="#F5E6C4" stroke="#C9A06A" stroke-width="3"/><path d="M0 18 q-6 14 -2 26" stroke="#E8D2A8" stroke-width="3" fill="none" stroke-linecap="round"/></g></g>';
    // sprout
    b += '<g transform="translate(455 735)"><g id="w-sprout"><ellipse cx="0" cy="40" rx="64" ry="18" fill="#7A5235"/><path d="M0 40 C-4 10 4 -20 0 -50" stroke="#5E9E4E" stroke-width="8" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="-22" cy="-30" rx="22" ry="10" fill="#7BC25A" transform="rotate(-25 -22 -30)"/><ellipse cx="22" cy="-50" rx="22" ry="10" fill="#7BC25A" transform="rotate(25 22 -50)"/></g></g>';
    // you are a seed: a child beside a young orange tree, with a heart
    b += '<g transform="translate(1000 610)"><g id="w-youseed">' +
      '<path d="M70 110 V20" stroke="#8A5A3B" stroke-width="10"/><circle cx="70" cy="10" r="36" fill="#6DB25A"/>' + orange(58, 4, 9) + orange(84, 18, 8) +
      child(-10, 30, 0.95, '#F2C14E') +
      '<path d="M-10 -78 c-10 -14 -30 -4 -20 10 l20 18 l20 -18 c10 -14 -10 -24 -20 -10z" fill="#E76F9A"/></g></g>';
    // compost
    b += '<g transform="translate(1150 735)"><g id="w-peel"><rect x="-80" y="-30" width="160" height="90" rx="10" fill="#A8754E" stroke="#7A5235" stroke-width="5"/>' +
      '<path d="M-80 0 H80 M-80 28 H80" stroke="#7A5235" stroke-width="4"/><ellipse cx="0" cy="-30" rx="76" ry="16" fill="#5B3A22"/>' +
      '<path d="M-44 -40 q14 -20 30 -4 q-16 4 -30 4z" fill="#F28C28"/><path d="M6 -44 q18 -14 30 2 q-16 2 -30 -2z" fill="#F7A440"/><path d="M-12 -36 q4 -16 16 -12" stroke="#7BC25A" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="40" cy="-34" rx="7" ry="4" fill="#F5E6C4"/><path d="M-60 -24 q10 -12 20 0 t20 0" stroke="#E89A9A" stroke-width="8" fill="none" stroke-linecap="round"/></g></g>';
    // soil or not: two bins
    b += '<g transform="translate(1410 700)"><g id="w-sort">' +
      '<path d="M-100 -20 H-12 L-20 80 H-92Z" fill="#8A5A3B" stroke="#5B3A22" stroke-width="4"/><rect x="-106" y="-30" width="100" height="14" rx="5" fill="#6B4423"/>' +
      '<path d="M-56 30 c-18 -4 -24 -24 -6 -34 c4 18 14 24 6 34z" fill="#7BC25A"/>' +
      '<path d="M12 -20 H100 L92 80 H20Z" fill="#3E7CA8" stroke="#245A82" stroke-width="4"/><rect x="6" y="-30" width="100" height="14" rx="5" fill="#2F6A96"/>' +
      '<g fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"><path d="M44 18 l12 -16 l12 16"/><path d="M76 34 l-8 18 h-24"/><path d="M38 52 l-6 -20"/></g>' +
      '<path d="M-90 -60 q20 -30 40 -6" stroke="#F2C14E" stroke-width="12" fill="none" stroke-linecap="round"/>' +
      '<rect x="40" y="-92" width="22" height="50" rx="8" fill="#BFE3F5" stroke="#7FB3D5" stroke-width="3"/><rect x="45" y="-100" width="12" height="10" rx="3" fill="#7FB3D5"/></g></g>';
    b += bee(1300, 420, 0.9, 'w-fly1') + bee(260, 470, 0.8, 'w-fly2');
    return svg(b);
  }

  // ---------- Inside Me: the journey of food and water ----------
  function sceneInside() {
    var b = '<rect width="1600" height="900" fill="#FDF1E3"/>' +
      '<circle cx="1180" cy="160" r="260" fill="#FCE6CF"/><circle cx="160" cy="760" r="220" fill="#FBE9D6"/>';
    // the outside world on the right: rain cloud, river, cleaning plant, farm
    b += cloud(1380, 170, 0.75, 'w-drift w-slow') + '<g class="w-rain" fill="#7FB3D5"><ellipse cx="1340" cy="250" rx="4" ry="9"/><ellipse cx="1380" cy="270" rx="4" ry="9"/><ellipse cx="1420" cy="245" rx="4" ry="9"/></g>';
    b += '<path d="M900 760 Q1150 700 1600 730 V900 H900Z" fill="#A9CF8E"/>';
    b += '<path d="M1330 740 C1400 760 1480 790 1600 790 V830 C1480 830 1400 810 1320 780Z" fill="url(#wwater)"/>';
    for (var f = 0; f < 4; f++) b += '<g transform="translate(' + (1430 + f * 42) + ' ' + (700 - f * 6) + ')"><path d="M0 10 V-24" stroke="#5E9E4E" stroke-width="5"/><ellipse cx="-8" cy="-18" rx="9" ry="5" fill="#7BC25A"/><ellipse cx="8" cy="-26" rx="9" ry="5" fill="#7BC25A"/></g>';
    // toilet, pipe and the water-cleaning plant with its tiny helpers
    b += '<g id="w-toilet">' +
      '<path d="M1030 760 C1040 800 1120 800 1160 760 C1180 740 1190 700 1200 680" stroke="#B8B2A6" stroke-width="16" fill="none" stroke-linecap="round"/>' +
      '<g transform="translate(1000 700)"><rect x="-40" y="-90" width="80" height="56" rx="10" fill="#FFFFFF" stroke="#C9C2B3" stroke-width="4"/><path d="M-50 -30 H50 C50 10 30 30 0 30 C-30 30 -50 10 -50 -30Z" fill="#FFFFFF" stroke="#C9C2B3" stroke-width="4"/><rect x="-22" y="28" width="44" height="34" rx="6" fill="#FFFFFF" stroke="#C9C2B3" stroke-width="4"/></g>' +
      '<g transform="translate(1250 620)"><rect x="-90" y="20" width="180" height="70" rx="12" fill="#D8D2C4"/><ellipse cx="-40" cy="20" rx="46" ry="16" fill="#7FB3D5" stroke="#5B8FB8" stroke-width="4"/><ellipse cx="45" cy="20" rx="40" ry="14" fill="#9BCBE6" stroke="#5B8FB8" stroke-width="4"/>' +
      '<g class="w-bubble" fill="#7BC25A"><circle cx="-56" cy="14" r="7"/><circle cx="-30" cy="22" r="6"/><circle cx="-44" cy="6" r="5"/><circle cx="40" cy="16" r="6"/><circle cx="58" cy="22" r="5"/></g>' +
      '<g fill="#2A2118"><circle cx="-58" cy="12" r="1.6"/><circle cx="-54" cy="12" r="1.6"/><circle cx="38" cy="14" r="1.4"/><circle cx="42" cy="14" r="1.4"/></g>' +
      '<path d="M90 50 C120 60 120 100 140 120" stroke="#7FB3D5" stroke-width="12" fill="none" stroke-linecap="round"/></g></g>';
    // a glass of water on a little table
    b += '<g transform="translate(880 430)"><rect x="-60" y="70" width="120" height="12" rx="6" fill="#C9A06A"/><path d="M-44 82 V170 M44 82 V170" stroke="#A8754E" stroke-width="8"/>' +
      '<g id="w-glass"><path d="M-32 -60 L-24 64 H24 L32 -60Z" fill="#EAF5FB" stroke="#9BC7E4" stroke-width="4"/><path d="M-29 -20 L-24 60 H24 L29 -20Z" fill="#7FB3D5" opacity="0.85"/>' +
      '<ellipse cx="-10" cy="10" rx="5" ry="16" fill="#FFFFFF" opacity="0.6"/></g></g>';
    // the body
    b += '<rect x="520" y="300" width="80" height="50" fill="#F3C9A0"/>';
    b += '<rect x="370" y="330" width="380" height="460" rx="130" fill="#FFE3CF" stroke="#E8B48C" stroke-width="6"/>';
    b += '<circle cx="560" cy="195" r="118" fill="#F3C9A0" stroke="#E8B48C" stroke-width="6"/><path d="M446 170 C450 60 670 60 674 170 C640 120 480 120 446 170Z" fill="#3B2A1E"/>';
    b += '<circle cx="520" cy="200" r="9" fill="#2A2118"/><circle cx="600" cy="200" r="9" fill="#2A2118"/><circle cx="496" cy="232" r="14" fill="#F4A6A6" opacity="0.6"/><circle cx="624" cy="232" r="14" fill="#F4A6A6" opacity="0.6"/>';
    b += '<g id="w-mouth"><path d="M520 245 Q560 290 600 245 Z" fill="#B8434D"/><path d="M528 248 h64" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/><ellipse cx="560" cy="268" rx="16" ry="7" fill="#F28C9A"/></g>';
    b += '<g id="w-blood" opacity="0.9"><g stroke="#E2725B" stroke-width="5" fill="none" opacity="0.55" stroke-linecap="round"><path d="M470 430 C430 480 410 560 412 700"/><path d="M470 430 C520 360 650 350 720 420"/><path d="M470 430 C500 520 600 560 700 760"/></g>' +
      '<path d="M470 452 c-30 -24 -54 -42 -54 -64 c0 -16 12 -26 26 -26 c12 0 22 8 28 18 c6 -10 16 -18 28 -18 c14 0 26 10 26 26 c0 22 -24 40 -54 64z" fill="#E0503A" stroke="#B83A28" stroke-width="3"/></g>';
    b += '<g id="w-tube"><path d="M560 290 C560 340 570 380 610 425" stroke="#E9A0A0" stroke-width="24" fill="none" stroke-linecap="round"/></g>';
    b += '<g id="w-tummy"><path d="M600 420 C650 395 720 420 712 470 C704 515 640 520 610 498 C590 484 600 460 620 462 C640 466 650 470 660 460" fill="#F4A6A6" stroke="#D97C7C" stroke-width="5"/></g>';
    b += '<g id="w-poop"><path d="M440 720 V555 Q440 535 460 535 H670 Q690 535 690 555 V700 Q690 720 670 722" stroke="#D99A6C" stroke-width="34" fill="none" stroke-linecap="round"/></g>';
    b += '<g id="w-twisty"><path d="M485 580 C520 560 600 560 630 580 C660 600 620 620 590 610 C550 598 500 600 495 630 C490 660 560 660 600 650 C640 640 660 670 620 690 C580 705 520 700 500 680" stroke="#F2B8A0" stroke-width="16" fill="none" stroke-linecap="round"/></g>';
    b += '<path d="M370 420 C320 470 300 540 310 600 M750 420 C800 470 820 540 810 600" stroke="#F3C9A0" stroke-width="44" fill="none" stroke-linecap="round"/>';
    return svg(b);
  }
  var SCENES = { map: sceneMap, garden: sceneGarden, pond: scenePond, hive: sceneHive, sky: sceneSky, orchard: sceneOrchard, inside: sceneInside };

  // ---------- Layout ----------
  function fit() {
    var stage = document.getElementById('w-stage'); if (!stage) return;
    var vw = window.innerWidth, vh = window.innerHeight, w = Math.min(vw, vh * 16 / 9), h = w * 9 / 16;
    stage.style.width = w + 'px'; stage.style.height = h + 'px';
    stage.style.left = ((vw - w) / 2) + 'px'; stage.style.top = ((vh - h) / 2) + 'px';
    stage.style.fontSize = (w / 100) + 'px';   // 1em = 1% of the stage width
    if (S.a3d) S.a3d.resize(Math.round(w), Math.round(h));
  }
  function pct(x, y) { return 'left:' + (x / VW * 100) + '%;top:' + (y / VH * 100) + '%'; }

  // ---------- Building a view ----------
  function allSpots() { var n = 0; W.places.forEach(function (p) { n += p.spots.filter(function (s) { return !s.nightOnly; }).length; }); return n; }
  function foundCount() { return Object.keys(S.found).length; }
  function placeSpots(p) {
    var night = isNight();
    return p.spots.filter(function (s) { return night ? !(s.night || s.dayOnly) : !s.nightOnly; });
  }

  function shell(view) {
    var night = phase();
    var h = new Date().getHours();
    root.innerHTML = '<div class="w-wrap t-' + night + (h >= 19 ? ' w-evening' : '') + '" id="w-wrap"><div class="w-stage" id="w-stage">' +
      SCENES[view]() +
      '<div class="w-spots" id="w-spots"></div>' +
      '<div class="w-asal" id="w-asal">' + asalArt() + '</div>' +
      '<div class="w-top"><button class="w-btn w-nav" id="w-back" type="button"></button>' +
      '<button type="button" class="w-jar" id="w-jar" aria-label="Memory jar"></button>' +
      '<button class="w-btn w-nav" id="w-sound" type="button"></button></div>' +
      '<div class="w-panel" id="w-panel" hidden></div><div class="w-over" id="w-over" hidden></div>' +
      '</div><div class="w-rotate"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="14" y="6" width="20" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="M8 30 a18 18 0 0 0 10 12 M40 18 a18 18 0 0 0 -10 -12" stroke="#E9A23B" stroke-width="3" fill="none" stroke-linecap="round"/></svg>Turn your screen sideways to fly bigger!</div></div>';
    fit();
    document.getElementById('w-back').addEventListener('click', goBack);
    document.getElementById('w-sound').addEventListener('click', toggleSound);
    document.getElementById('w-jar').addEventListener('click', function () { if (S.mode === 'world') openJar(); });
    soundLabel(); updateJar();
    if (S.a3d) attach3D();
  }
  function soundLabel() {
    var b = document.getElementById('w-sound'); if (!b) return;
    b.innerHTML = S.sound ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    b.setAttribute('aria-label', S.sound ? 'Sound on' : 'Sound off');
  }
  function toggleSound() {
    S.sound = !S.sound; save(); soundLabel();
    if (!S.sound) { stopVoice(); stopAmbient(); } else startAmbient(S.place ? S.place.id : 'map');
  }
  // The memory jar holds one little drop for every discovery, in the color of the place it came from. No number, no score.
  function spotPlace(id) { var r = null; W.places.forEach(function (p) { p.spots.forEach(function (x) { if (x.id === id) r = p; }); }); return r; }
  function spotDef(id) { var r = null; W.places.forEach(function (p) { p.spots.forEach(function (x) { if (x.id === id) r = x; }); }); return r; }
  function foundIds() { return Object.keys(S.found).filter(spotDef).sort(function (a, b) { return S.found[a] < S.found[b] ? -1 : 1; }); }
  function updateJar() {
    var j = document.getElementById('w-jar'); if (!j) return;
    var ids = foundIds(), drops = '';
    ids.slice(0, 25).forEach(function (id, i) {
      var c = i % 5, r = Math.floor(i / 5), pl = spotPlace(id);
      drops += '<circle cx="' + (11 + c * 4.5) + '" cy="' + (43 - r * 5.6) + '" r="2.3" fill="' + (pl ? pl.color : '#E9A23B') + '"/>';
    });
    j.innerHTML = '<svg viewBox="0 0 40 50" aria-hidden="true"><path d="M8 10 h24 v4 q6 4 6 12 v14 q0 8 -8 8 h-20 q-8 0 -8 -8 v-14 q0 -8 6 -12z" fill="#FFFDF5" stroke="#C9822A" stroke-width="2.5"/>' +
      drops + '<rect x="7" y="5" width="26" height="6" rx="2" fill="#C9822A"/><path d="M12 19 q-2 6 0 14" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/></svg>' +
      '<span>Memory jar</span>';
  }
  function petalsGrown() {
    var g = {}; foundIds().forEach(function (id) { (W.spotPetals[id] || []).forEach(function (p) { g[p] = true; }); }); return g;
  }
  function flowerArt(grown) {
    var out = '<svg class="r-flower" viewBox="-100 -100 200 200" aria-hidden="true">';
    W.petals.forEach(function (p, i) {
      var a = i * 360 / W.petals.length, on = grown[p.id];
      out += '<g transform="rotate(' + a + ')"><ellipse cx="0" cy="-52" rx="24" ry="40" fill="' + (on ? p.color : '#FFFFFF') + '" fill-opacity="' + (on ? 0.95 : 0.25) + '" stroke="' + (on ? '#FFFFFF' : 'rgba(255,255,255,0.7)') + '" stroke-width="3"' + (on ? '' : ' stroke-dasharray="6 6"') + '/></g>';
    });
    return out + '<circle r="26" fill="#F2C14E" stroke="#FFFFFF" stroke-width="4"/><circle r="10" fill="#E9A23B"/></svg>';
  }
  function openJar() {
    var o = document.getElementById('w-over'); if (!o) return;
    S.mode = 'jar';
    var ids = foundIds(), grown = petalsGrown(), byPlace = '';
    W.places.forEach(function (pl) {
      var mine = ids.filter(function (id) { return spotPlace(id) === pl; });
      if (!mine.length) return;
      byPlace += mine.map(function (id) {
        return '<button type="button" class="w-act chip" data-place="' + pl.id + '"><i style="background:' + pl.color + '"></i>' + spotDef(id).name + '</button>';
      }).join('');
    });
    var legend = W.petals.map(function (p) { return '<span class="j-pet' + (grown[p.id] ? ' on' : '') + '"><i style="background:' + p.color + '"></i>' + p.name + '</span>'; }).join('');
    o.innerHTML = '<div class="w-jarview"><h2>Our memory jar</h2><div class="j-row">' + flowerArt(grown) +
      '<div class="j-side"><div class="j-legend">' + legend + '</div>' +
      (ids.length ? '<div class="j-chips">' + byPlace + '</div>' : '<p class="j-empty">Our jar is waiting for its first memory. Tap something in Asal’s World to discover it!</p>') +
      '</div></div><button type="button" class="w-act fun honey" id="w-jar-close"><span class="w-act-ico">' + ICONS.explore + '</span><span>Keep exploring</span></button></div>';
    o.hidden = false;
    function shut() { stopVoice(); o.hidden = true; o.innerHTML = ''; S.mode = 'world'; focusItem(S.focus >= 0 ? S.focus : 0); }
    S.jarClose = shut;
    [].forEach.call(o.querySelectorAll('.chip'), function (b) { b.addEventListener('click', function () { shut(); location.hash = '#/world/' + b.getAttribute('data-place'); }); });
    document.getElementById('w-jar-close').addEventListener('click', shut);
    document.getElementById('w-jar-close').focus();
    speak(W.jar.id, W.jar.text);
  }

  function addSpot(def, opts) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'w-spot' + (opts && opts.cls ? ' ' + opts.cls : '') + (S.found[def.id] ? ' found' : '');
    b.setAttribute('style', pct(def.x, def.y));
    b.setAttribute('aria-label', def.name);
    b.innerHTML = '<span class="w-ring"></span><span class="w-label">' + def.name + '</span>';
    b.addEventListener('click', function () { opts.onPick(def, b); });
    b.addEventListener('focus', function () { S.focus = S.items.indexOf(b); if (opts.onFocus) opts.onFocus(def); });
    b.addEventListener('mouseenter', function () { if (S.mode === 'world') b.focus(); });
    document.getElementById('w-spots').appendChild(b);
    b._x = def.x; b._y = def.y;
    return b;
  }
  function collectItems() {
    S.items = [].slice.call(document.querySelectorAll('#w-spots .w-spot'));
    var back = document.getElementById('w-back'), snd = document.getElementById('w-sound'), jar = document.getElementById('w-jar');
    back._x = 80; back._y = 50; snd._x = 1520; snd._y = 50; jar._x = 1330; jar._y = 50;
    S.items.push(back, jar, snd);
    jar.onfocus = function () { S.focus = S.items.indexOf(jar); };
  }
  // Asal flies: wings beat fast, she leans and turns toward where she is going, then turns to face us and waves.
  function asalTo(x, y, quick) {
    if (S.a3d) {
      var side = x > 1150 ? -1 : 1, tx = Math.max(140, Math.min(1460, x + side * 230)), ty = Math.max(250, Math.min(740, y - 60));
      if (y > 430 && ty < 520) ty = 520;   // stay clear of the speech box at the top
      S.a3d.moveTo(tx, ty, quick); return;
    }
    S.lastTarget = [x, y];
    var a = document.getElementById('w-asal'); if (!a) return;
    var ax = Math.max(60, Math.min(VW - 220, x + (x > 1200 ? -230 : 90))), ay = Math.max(60, Math.min(VH - 360, y - 260));
    if (quick || S.ax === undefined) {
      clearTimeout(S.flyT); clearTimeout(S.landT);
      a.className = 'w-asal'; a.setAttribute('style', pct(ax, ay) + ';transition:none');
      S.ax = ax; S.ay = ay; return;
    }
    var dx = ax - S.ax, dy = ay - S.ay, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 12) return;   // already there, or already on the way
    clearTimeout(S.flyT); clearTimeout(S.landT);
    var dur = Math.max(0.7, Math.min(1.8, dist / 650));
    var dir = Math.abs(dx) < 30 ? (S.dir || 'dir-right') : (dx < 0 ? 'dir-left' : 'dir-right');
    S.dir = dir; S.ax = ax; S.ay = ay;
    a.className = 'w-asal flying ' + dir;   // turn and lean first, then take off
    S.flyT = setTimeout(function () {
      a.setAttribute('style', pct(ax, ay) + ';transition-duration:' + dur + 's');
      S.landT = setTimeout(function () {
        a.className = 'w-asal landing ' + dir;
        S.landT = setTimeout(function () { a.className = 'w-asal'; }, 1300);
      }, dur * 1000);
    }, 220);
  }

  // ---------- Map ----------
  function openMap() {
    S.place = null; S.mode = 'world';
    shell('map');
    document.getElementById('w-back').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Home</span>';
    W.places.forEach(function (p) {
      addSpot({ id: 'place-' + p.id, name: p.name, x: p.x, y: p.y }, {
        cls: 'w-place', onPick: function () { sfx('whoosh'); location.hash = '#/world/' + p.id; },
        onFocus: function () { asalTo(p.x, p.y); sfx('step'); }
      });
    });
    collectItems();
    asalTo(800, 470, true);
    startAmbient('map');
    var greeted = false; try { greeted = sessionStorage.getItem('nx_world_hi') === '1'; sessionStorage.setItem('nx_world_hi', '1'); } catch (e) {}
    if (!greeted) showPanel({ name: 'Asal', text: W.intro.text, audio: W.intro.id, acts: [{ label: 'Let’s go!', icon: 'explore', fn: function () { closePanel(); maybeOpen(); } }] });
    else if (!maybeOpen()) focusItem(0);
  }

  // ---------- A place ----------
  function openPlace(id) {
    var p = W.places.filter(function (x) { return x.id === id; })[0];
    if (!p) { openMap(); return; }
    S.place = p; S.mode = 'world';
    shell(p.id);
    document.getElementById('w-back').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Map</span>';
    placeSpots(p).forEach(function (s) {
      addSpot(s, { onPick: discover, onFocus: function () { asalTo(s.x, s.y); } });
    });
    collectItems();
    if (p.id === 'garden') setSeedStage();
    asalTo(800, 520, true);
    startAmbient(p.id);
    var key = 'nx_world_seen_' + p.id, seen = false;
    try { seen = sessionStorage.getItem(key) === '1'; sessionStorage.setItem(key, '1'); } catch (e) {}
    var afterOpen = function () {
      var done = null; try { done = sessionStorage.getItem('nx_found_done'); sessionStorage.removeItem('nx_found_done'); } catch (e) {}
      if (done) { var fs = null; p.spots.forEach(function (x) { if (x.id === done) fs = x; }); sfx('sparkle'); showPanel({ name: 'Growth Garden', text: W.foundDone.text, audio: W.foundDone.id, spotY: fs ? fs.y : 500, acts: [{ label: 'Explore', icon: 'explore', fn: closePanel }] }); return; }
      if (!seen) showPanel({ name: p.name, text: p.intro.text, audio: p.intro.id, acts: [{ label: 'Let’s look!', icon: 'explore', fn: closePanel }] });
      else focusItem(0);
    };
    if (!maybeOpen(afterOpen)) afterOpen();
    hint();
  }

  // Gently sparkle something not yet found, so children know what to try.
  function hint() {
    clearTimeout(S.hintTimer);
    S.hintTimer = setTimeout(function () {
      if (!S.active || S.mode !== 'world') { hint(); return; }
      var todo = S.items.filter(function (b) { return b.classList.contains('w-spot') && !b.classList.contains('found') && !b.classList.contains('w-place'); });
      if (todo.length) { var b = todo[Math.floor(Math.random() * todo.length)]; b.classList.add('sparkle'); setTimeout(function () { b.classList.remove('sparkle'); }, 2400); }
      hint();
    }, 9000);
  }

  // ---------- Seed that grows over real days ----------
  function seedDays() {
    if (!S.seedAt) return -1;
    var a = new Date(S.seedAt), b = new Date(); a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / DAY);
  }
  function seedStage() {
    var d = seedDays(); if (d < 0) return null;
    var st = W.seedStages[0], i;
    for (i = 0; i < W.seedStages.length; i++) if (d >= W.seedStages[i].days) st = W.seedStages[i];
    return st;
  }
  function setSeedStage() {
    var g = document.getElementById('w-seed'); if (!g) return;
    var st = seedStage(), n = st ? W.seedStages.indexOf(st) : 'none';
    g.setAttribute('class', 'sp sp-' + n);
  }

  // ---------- Discovering ----------
  function react(id) {
    var el = document.getElementById('w-' + id); if (!el) return;
    if (id === 'cloud') { S.cloudShape = (S.cloudShape + 1) % 4; el.setAttribute('class', 'cs-' + S.cloudShape); }
    el.classList.remove('play'); void el.getBoundingClientRect(); el.classList.add('play');
    if (id === 'baby') { var cb = document.getElementById('w-comb'); cb.classList.remove('larva-play'); void cb.getBoundingClientRect(); cb.classList.add('larva-play'); }
    if (id === 'ripple') { var r = document.getElementById('w-rings'); r.classList.remove('play'); void r.getBoundingClientRect(); r.classList.add('play'); }
    if (id === 'wind') { var wr = document.getElementById('w-wrap'); wr.classList.add('windy'); setTimeout(function () { wr.classList.remove('windy'); }, 4000); }
    var sounds = { frog: 'ribbit', ripple: 'plop', fish: 'plop', drop: 'plop', dance: 'buzz', water: 'buzz', flower: 'buzz', wind: 'whoosh', birds: 'whoosh', stars: 'sparkle', rainbow: 'sparkle', seed: 'pop', worm: 'pop', mushroom: 'pop', oseed: 'pop', sprout: 'pop', blossom: 'buzz', orange: 'pop', youseed: 'sparkle', glass: 'plop', toilet: 'plop', tube: 'whoosh', blood: 'step' };
    sfx(sounds[id] || 'chime');
  }
  function discover(s, btn) {
    react(s.id); asalTo(s.x, s.y);
    var first = !S.found[s.id];
    var text = s.say, audio = 'd-' + s.id;
    if (s.grows) {
      if (!S.seedAt) { S.seedAt = Date.now(); remember('w-seed-planted'); setSeedStage(); }
      else { var st = seedStage(); text = st.text; audio = st.id; }
    }
    if (first) {
      S.found[s.id] = new Date().toISOString(); save(); remember('w-' + s.id);
      btn.classList.add('found');
      setTimeout(function () { flyNectar(s); }, 400);
    }
    showPanel({ name: s.name, text: text, audio: audio, acts: spotActs(s, {}), wonder: true, spotY: s.y });
  }
  // The buttons that pop up when Asal is done: try it for real (move, outside), then keep exploring or go back.
  // Activities already done in this visit drop away, so the row only ever offers something new.
  function spotActs(s, used) {
    var acts = [];
    if (s.move && !used.move) acts.push({ label: 'Move with me', icon: 'move', cls: 'rose', fn: function () { startMove(s, used); } });
    if (s.mission && !used.outside) acts.push({ label: 'Try it outside', icon: 'outside', cls: 'leaf', fn: function () { used.outside = true; showMission(s, used); } });
    // After the mission: the child goes and finds it for real, then adds a photo or drawing to the Growth Garden.
    if (s.mission && used.outside && !used.found && window.NectaraGarden && !IS_TV) acts.unshift({ label: 'I found it!', icon: 'found', cls: 'leaf', fn: function () { used.found = true; foundIt(s, used); } });
    acts.push({ label: 'Explore', icon: 'explore', fn: closePanel });
    acts.push({ label: 'Go back', icon: 'back', cls: 'sky', fn: function () { closePanel(); goBack(); } });
    return acts;
  }
  function flyNectar(s) {
    var stage = document.getElementById('w-stage'); if (!stage) return;
    var d = document.createElement('div'); d.className = 'w-nectar'; d.setAttribute('style', pct(s.x, s.y));
    stage.appendChild(d);
    setTimeout(function () { d.setAttribute('style', 'left:76%;top:5%;transform:scale(0.4);opacity:0.2'); }, 30);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); updateJar(); sfx('sparkle'); var j = document.getElementById('w-jar'); if (j) { j.classList.remove('bump'); void j.offsetWidth; j.classList.add('bump'); } }, 1300);
  }
  var IS_TV = /Web0S|webOS|SmartTV|Tizen|NetCast|BRAVIA|HbbTV/i.test(navigator.userAgent);
  function foundIt(s, used) {
    function go(kind) {
      try { sessionStorage.setItem('nx_found_back', JSON.stringify({ place: S.place ? S.place.id : '', spot: s.id })); } catch (e) {}
      closePanel();
      location.hash = '#/garden/add/' + kind + '/' + encodeURIComponent('mission:' + s.id);
    }
    showPanel({ name: 'I found it!', text: W.foundAsk.text, audio: W.foundAsk.id, spotY: s.y, acts: [
      { label: 'Take a photo', icon: 'camera', cls: 'leaf', fn: function () { go('photo'); } },
      { label: 'Draw it', icon: 'draw', cls: 'rose', fn: function () { go('drawing'); } },
      { label: 'Not yet', icon: 'back', cls: 'sky', fn: function () { used.found = false; closePanel(); } }] });
  }
  function showMission(s, used) {
    showPanel({ name: 'Try it outside', text: s.mission, audio: 'm-' + s.id, acts: spotActs(s, used || { outside: true }), leaf: true, spotY: s.y });
  }

  // ---------- Panel (what Asal says) ----------
  var ICONS = {
    explore: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 L27 9.5 L27 22.5 L16 29 L5 22.5 L5 9.5 Z" fill="#FFF3B0" stroke="#2A2118" stroke-width="2.2"/><circle cx="14.5" cy="14.5" r="5" fill="none" stroke="#2A2118" stroke-width="2.6"/><path d="M18 18 L22.5 22.5" stroke="#2A2118" stroke-width="3" stroke-linecap="round"/></svg>',
    found: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#FFF3B0" stroke="#2F5E36" stroke-width="2.2"/><path d="M16 7l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7z" fill="#F2B23A" stroke="#2F5E36" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    camera: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#E4F5DD" stroke="#2F5E36" stroke-width="2.2"/><rect x="8" y="12" width="16" height="11" rx="2.5" fill="#FFFFFF" stroke="#2F5E36" stroke-width="2"/><path d="M12.5 12l1.5-2.5h4l1.5 2.5" fill="none" stroke="#2F5E36" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="17.5" r="3" fill="#BFE3F5" stroke="#2F5E36" stroke-width="1.8"/></svg>',
    draw: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#FFE1EA" stroke="#8A2E4E" stroke-width="2.2"/><path d="M10 23l1.6-4.8 8-8 3.2 3.2-8 8z" fill="#FFF3B0" stroke="#8A2E4E" stroke-width="1.8" stroke-linejoin="round"/><path d="M18 11.8l3.2 3.2" stroke="#8A2E4E" stroke-width="1.8"/></svg>',
    move: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#FFE1EA" stroke="#8A2E4E" stroke-width="2.2"/><circle cx="16" cy="9" r="2.6" fill="#8A2E4E"/><path d="M16 12 L16 19 M9.5 12.5 L16 14.5 L22.5 11 M16 19 L11.5 25 M16 19 L21 24.5" fill="none" stroke="#8A2E4E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    outside: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#E4F5DD" stroke="#2F5E36" stroke-width="2.2"/><circle cx="21.5" cy="10.5" r="3" fill="#F2B23A"/><path d="M10 24 C10 17 13 13 17 12 C16.5 17 14 21 10 24 Z" fill="#5FA36A" stroke="#2F5E36" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 24 L14.5 17.5" stroke="#2F5E36" stroke-width="1.6" stroke-linecap="round"/></svg>',
    back: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#FFFFFF" stroke="#1F4E73" stroke-width="2.2"/><path d="M18.5 9.5 L11.5 16 L18.5 22.5" fill="none" stroke="#1F4E73" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  // Asal's words appear one by one as he says them, fade when he is done, then the buttons pop in.
  function showPanel(o) {
    S.mode = 'panel';
    var p = document.getElementById('w-panel'); if (!p) return;
    clearTimeout(S.capT); cancelAnimationFrame(S.capRaf);
    p.className = 'w-panel w-cap' + (o.spotY > 430 ? ' top' : '');
    var words = o.text.split(/\s+/);
    p.innerHTML = '<div class="w-cap-text" id="w-cap-text" tabindex="-1" role="status">' +
      words.map(function (w) { return '<span' + (/^wonder,?$/i.test(w) || w === 'I' && false ? ' class="wonder"' : '') + '>' + w + '</span>'; }).join(' ') + '</div>' +
      '<div class="w-acts' + (o.acts.length > 2 ? ' many' : '') + '" id="w-acts" hidden>' + o.acts.map(function (a, i) {
        return '<button type="button" class="w-act fun ' + (a.cls || 'honey') + '" data-i="' + i + '" style="animation-delay:' + (i * 0.12) + 's"><span class="w-act-ico">' + (ICONS[a.icon] || '') + '</span><span>' + a.label + '</span></button>';
      }).join('') + '</div>';
    p.hidden = false;
    var spans = [].slice.call(p.querySelectorAll('.w-cap-text span')), cap = document.getElementById('w-cap-text');
    var chars = [], total = 0;
    words.forEach(function (w) { total += w.length + 1; chars.push(total); });
    var shown = 0, done = false, t0 = Date.now();
    function reveal(frac) {
      var n = 0; while (n < spans.length && chars[n] <= frac * total + 2) n++;
      for (; shown < n; shown++) spans[shown].className += ' on';
    }
    function tick() {
      if (done) return;
      var a = S.audio, frac;
      if (a && a.duration && !isNaN(a.duration) && a.currentTime > 0) frac = Math.min(1, a.currentTime / (a.duration * 0.94));
      else frac = Math.min(1, (Date.now() - t0) / (Math.max(1500, total * 58)));
      reveal(frac);
      S.capRaf = requestAnimationFrame(tick);
    }
    function finish() {
      if (done) return; done = true; cancelAnimationFrame(S.capRaf); reveal(1);
      S.capT = setTimeout(function () {
        cap.className += ' fade';
        var acts = document.getElementById('w-acts'); if (!acts) return;
        acts.hidden = false;
        [].forEach.call(acts.querySelectorAll('.w-act'), function (b) { b.addEventListener('click', function () { var a = o.acts[+b.getAttribute('data-i')]; sfx('sparkle'); b.className += ' pressed'; setTimeout(a.fn, 160); }); });
        var first = acts.querySelector('.w-act'); if (first) first.focus();
      }, 900);
    }
    S.capSkip = finish;
    cap.addEventListener('click', finish);
    cap.focus();
    tick();
    if (o.audio) speak(o.audio, o.text, finish); else setTimeout(finish, total * 58);
  }
  function closePanel() {
    stopVoice(); clearTimeout(S.capT); cancelAnimationFrame(S.capRaf); S.capSkip = null;
    var p = document.getElementById('w-panel'); if (p) { p.hidden = true; p.innerHTML = ''; }
    S.mode = 'world';
    focusItem(S.focus >= 0 && S.focus < S.items.length ? S.focus : 0);
  }

  // ---------- Move with me ----------
  function startMove(s, used) {
    used = used || {}; used.move = true;
    var o = document.getElementById('w-over'); if (!o) return;
    var p = document.getElementById('w-panel'); if (p) p.hidden = true;
    S.mode = 'move';
    o.innerHTML = '<div class="w-move">' + asalArt('w-move-asal excited') + '<p>' + s.move.text + '</p><div class="w-count"><i></i></div><button type="button" class="w-act first" id="w-move-done">We did it!</button></div>';
    o.hidden = false;
    var done = function () {
      clearTimeout(S.moveTimer); stopVoice(); o.hidden = true; o.innerHTML = ''; sfx('chime'); S.mode = 'world';
      // After moving, Asal cheers and the next choices pop up.
      showPanel({ name: s.name, text: W.cheer.text, audio: W.cheer.id, acts: spotActs(s, used), spotY: s.y });
    };
    document.getElementById('w-move-done').addEventListener('click', done);
    document.getElementById('w-move-done').focus();
    speak(s.move.id, s.move.text);
    S.moveTimer = setTimeout(done, 20000);
  }

  // ---------- Gentle ending ----------
  function startSession() {
    var now = Date.now(), st = 0;
    try { st = parseInt(sessionStorage.getItem('nx_world_start') || '0', 10); } catch (e) {}
    if (!st || now - st > S.limitMin * 60000 * 3) { st = now; try { sessionStorage.setItem('nx_world_start', String(st)); } catch (e) {} }
    S.sessionStart = st;
    clearInterval(S.tick);
    S.tick = setInterval(function () {
      if (!S.active || S.mode === 'bye') return;
      if (Date.now() - S.sessionStart > S.limitMin * 60000) goodbye();
    }, 10000);
  }
  // ---------- Opening and closing rituals: Breath, Gratitude, Food, Rest ----------
  // A shuffled bag, so all four pillars come round before any repeats, across openings and closings alike.
  function pickPillar() {
    var bag = [], last = '';
    try { bag = JSON.parse(localStorage.getItem('nx_pillar_bag') || '[]'); last = localStorage.getItem('nx_pillar_last') || ''; } catch (e) {}
    bag = bag.filter(function (id) { return W.pillars.some(function (p) { return p.id === id; }); });
    if (!bag.length) {
      bag = W.pillars.map(function (p) { return p.id; });
      for (var i = bag.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = bag[i]; bag[i] = bag[j]; bag[j] = t; }
      if (bag[0] === last) bag.push(bag.shift());
    }
    var id = bag.shift();
    try { localStorage.setItem('nx_pillar_bag', JSON.stringify(bag)); localStorage.setItem('nx_pillar_last', id); } catch (e) {}
    return W.pillars.filter(function (p) { return p.id === id; })[0];
  }
  var PILLAR_ART = {
    breath: '<svg viewBox="0 0 200 200" aria-hidden="true"><circle class="r-breath-ring" cx="100" cy="100" r="70" fill="#BFE3F5" fill-opacity="0.5" stroke="#FFFFFF" stroke-width="5"/><circle class="r-breath-core" cx="100" cy="100" r="42" fill="#FFFFFF" fill-opacity="0.85"/></svg>',
    gratitude: '<svg viewBox="0 0 200 200" aria-hidden="true"><g class="r-heart"><path d="M100 168 C40 124 22 92 34 64 C46 38 82 36 100 62 C118 36 154 38 166 64 C178 92 160 124 100 168 Z" fill="#F7A8C0" stroke="#FFFFFF" stroke-width="6"/></g><g class="r-rise"><path d="M40 60 c-6 -8 4 -14 8 -6 c4 -8 14 -2 8 6 l-8 8z" fill="#FFFFFF"/><path d="M150 40 c-6 -8 4 -14 8 -6 c4 -8 14 -2 8 6 l-8 8z" fill="#FFFFFF"/></g></svg>',
    food: '<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="104" r="80" fill="#FFFFFF" stroke="#E8E1D0" stroke-width="5"/><circle cx="100" cy="104" r="62" fill="#FFFBF2"/><g class="r-bob"><circle cx="72" cy="80" r="16" fill="#E0503A"/><circle cx="114" cy="72" r="15" fill="#F28C28"/><circle cx="138" cy="106" r="14" fill="#F2C14E"/><ellipse cx="120" cy="140" rx="20" ry="11" fill="#5FA36A" transform="rotate(-25 120 140)"/><circle cx="80" cy="132" r="8" fill="#4A6FD1"/><circle cx="92" cy="138" r="8" fill="#4A6FD1"/><circle cx="66" cy="112" r="9" fill="#8E5BB8"/><circle cx="78" cy="108" r="9" fill="#8E5BB8"/></g></svg>',
    rest: '<svg viewBox="0 0 200 200" aria-hidden="true"><defs><mask id="r-moon-m"><rect width="200" height="200" fill="#FFFFFF"/><circle cx="124" cy="82" r="56" fill="#000000"/></mask></defs><circle cx="96" cy="104" r="62" fill="#FFF3B0" mask="url(#r-moon-m)"/><g class="r-twinkle"><circle cx="150" cy="140" r="5" fill="#FFFFFF"/><circle cx="168" cy="60" r="4" fill="#FFFFFF"/><circle cx="40" cy="40" r="4" fill="#FFFFFF"/></g><g class="r-twinkle b"><circle cx="152" cy="30" r="3" fill="#FFFFFF"/><circle cx="30" cy="150" r="3" fill="#FFFFFF"/></g></svg>'
  };
  // kind: 'open' or 'close'. opts.acts: buttons shown after Asal finishes. Returns nothing.
  function ritual(kind, opts) {
    var o = document.getElementById('w-over'); if (!o) return;
    var p = document.getElementById('w-panel'); if (p) { p.hidden = true; p.innerHTML = ''; }
    var pil = pickPillar(), lines = pil[kind], line = lines[Math.floor(Math.random() * lines.length)];
    S.mode = kind === 'open' ? 'ritual' : 'bye';
    o.innerHTML = '<div class="w-move w-ritual r-' + pil.id + '"><div class="r-tag" style="background:' + pil.color + '">' + pil.name + '</div>' +
      '<div class="r-row">' + asalArt('w-move-asal ' + (kind === 'open' ? 'excited' : 'sleepy')) + '<div class="r-art">' + PILLAR_ART[pil.id] + '</div></div>' +
      '<p>' + line.text + '</p><div class="r-acts" id="r-acts"></div></div>';
    o.hidden = false;
    var shown = false;
    function showActs() {
      if (shown || !document.getElementById('r-acts')) return; shown = true;
      var box = document.getElementById('r-acts');
      opts.acts.forEach(function (a, i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'w-act ' + (a.cls || 'fun honey'); b.id = a.id || '';
        b.style.animationDelay = (i * 0.12) + 's';
        b.innerHTML = (a.icon ? '<span class="w-act-ico">' + ICONS[a.icon] + '</span>' : '') + '<span>' + a.label + '</span>';
        if (a.fn) b.addEventListener('click', function () { sfx('sparkle'); a.fn(); });
        box.appendChild(b); if (a.setup) a.setup(b);
      });
      var f = box.querySelector('.w-act'); if (f) f.focus();
    }
    S.ritualSkip = showActs;
    speak(line.id, line.text, showActs);
  }
  // The opening ritual plays once per visit. Returns true if it is playing; then() runs after.
  function maybeOpen(then) {
    var opened = false; try { opened = sessionStorage.getItem('nx_world_open') === '1'; sessionStorage.setItem('nx_world_open', '1'); } catch (e) {}
    if (opened) return false;
    ritual('open', { acts: [{ label: 'I’m ready!', icon: 'explore', fn: function () {
      var o = document.getElementById('w-over'); if (o) { o.hidden = true; o.innerHTML = ''; }
      S.mode = 'world'; if (then) then(); else focusItem(0);
    } }] });
    return true;
  }
  // Every visit ends calmly with a closing ritual: when time is up (timed) or when the child heads home.
  function goodbye(timed) {
    if (timed === undefined) timed = true;
    stopVoice(); clearTimeout(S.hintTimer); stopAmbient(); if (S.a3d) S.a3d.setMood('sleepy');
    var wrap = document.getElementById('w-wrap'); if (wrap) wrap.classList.add('w-sleepy');
    var leave = function () { try { sessionStorage.removeItem('nx_world_open'); } catch (e) {} stopAll(); location.hash = '#/'; };
    S.leave = leave;
    var acts = [{ id: 'w-bye-home', label: 'Goodbye, Asal!', cls: 'fun honey', fn: leave }];
    if (timed) acts.push({ id: 'w-bye-more', label: 'Grown-ups: hold for 10 more minutes', cls: 'grown', setup: function (more) {
      var holdT = null, o = document.getElementById('w-over');
      function startHold() { more.classList.add('holding'); holdT = setTimeout(function () { S.sessionStart = Date.now() - (S.limitMin - 10) * 60000; o.hidden = true; o.innerHTML = ''; if (wrap) wrap.classList.remove('w-sleepy'); S.mode = 'world'; if (S.a3d) S.a3d.setMood('idle'); startAmbient(S.place ? S.place.id : 'map'); focusItem(0); }, 2500); }
      function endHold() { more.classList.remove('holding'); clearTimeout(holdT); }
      more.addEventListener('mousedown', startHold); more.addEventListener('touchstart', startHold, { passive: true });
      more.addEventListener('mouseup', endHold); more.addEventListener('mouseleave', endHold); more.addEventListener('touchend', endHold);
      more.addEventListener('keydown', function (e) { if ((e.keyCode === 13 || e.key === ' ') && !holdT) { e.preventDefault(); startHold(); } });
      more.addEventListener('keyup', function () { endHold(); holdT = null; });
    } });
    ritual('close', { acts: acts });
  }

  // ---------- Remote / keyboard navigation ----------
  function focusItem(i) { var b = S.items[i]; if (b) { b.focus(); S.focus = i; } }
  function moveFocus(dir) {
    var cur = S.items[S.focus] || S.items[0]; if (!cur) return;
    var best = -1, bestScore = 1e9;
    S.items.forEach(function (b, i) {
      if (b === cur) return;
      var dx = b._x - cur._x, dy = b._y - cur._y, main, side;
      if (dir === 'left') { main = -dx; side = Math.abs(dy); } else if (dir === 'right') { main = dx; side = Math.abs(dy); }
      else if (dir === 'up') { main = -dy; side = Math.abs(dx); } else { main = dy; side = Math.abs(dx); }
      if (main <= 10) return;
      var score = main + side * 2;
      if (score < bestScore) { bestScore = score; best = i; }
    });
    if (best >= 0) { focusItem(best); sfx('step'); }
  }
  function panelButtons() { var o = document.getElementById(S.mode === 'panel' ? 'w-panel' : 'w-over'); return o ? [].slice.call(o.querySelectorAll('.w-act')) : []; }
  function isBack(e) { return e.keyCode === 461 || e.keyCode === 27 || e.key === 'GoBack' || e.key === 'BrowserBack' || (e.keyCode === 8 && !/INPUT|TEXTAREA/.test(e.target.tagName)); }
  function onKey(e) {
    if (!S.active) return;
    var k = e.keyCode;
    if (isBack(e)) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (S.mode === 'bye') { if (S.leave) S.leave(); else { stopAll(); location.hash = '#/'; } }
      else if (S.mode === 'ritual') { var r = document.querySelector('#r-acts .w-act'); if (r) r.click(); else if (S.ritualSkip) S.ritualSkip(); }
      else if (S.mode === 'jar') { if (S.jarClose) S.jarClose(); }
      else if (S.mode === 'panel') closePanel();
      else if (S.mode === 'move') { var d = document.getElementById('w-move-done'); if (d) d.click(); }
      else goBack();
      return;
    }
    if (k === 13 && S.mode === 'panel' && S.capSkip && document.activeElement && document.activeElement.id === 'w-cap-text') { e.preventDefault(); S.capSkip(); return; }
    var dirs = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' };
    if (dirs[k]) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (S.mode === 'world') moveFocus(dirs[k]);
      else {
        var bs = panelButtons(), i = bs.indexOf(document.activeElement);
        if (k === 37 || k === 38) i = Math.max(0, i - 1); else i = Math.min(bs.length - 1, i + 1);
        if (bs[i]) bs[i].focus();
      }
    }
  }
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', fit);

  // ---------- Open / close ----------
  function goBack() { stopVoice(); if (S.place) location.hash = '#/world'; else if (S.mode !== 'bye') goodbye(false); else if (S.leave) S.leave(); }
  function stopAll() { stopVoice(); stopAmbient(); clearTimeout(S.hintTimer); clearTimeout(S.moveTimer); }
  window.NectaraWorld = {
    open: function (placeId) {
      if (!S.active) { load(); syncFromServer(); S.active = true; startSession(); }
      load3D();
      stopAll();
      if (placeId) openPlace(placeId); else openMap();
      if (S.mode !== 'bye' && Date.now() - S.sessionStart > S.limitMin * 60000) goodbye();
    },
    close: function () { if (!S.active) return; S.active = false; stopAll(); clearInterval(S.tick); },
    isActive: function () { return S.active; },
    preview: function () { return '<span class="wc-art t-' + phase() + '">' + sceneMap() + '</span>'; },
    foundCount: function () { load(); return foundCount(); },
    memories: function () { load(); return foundIds().slice(-3).reverse().map(function (id) { return spotDef(id).name; }); },
    total: allSpots
  };
})();
