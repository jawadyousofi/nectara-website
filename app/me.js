// My character: grown-up and child make the child's own Nectara character together, from choices only (no photos).
// The character then stands in Asal's World on every device: phone, tablet, computer and TV.
// Saved privately per family at /api/kids. Rendered pictures are cached on each device (localStorage 'nx_me').
// Written in ES5 like the rest of the app. Route: #/me
(function () {
  'use strict';
  var root = document.getElementById('root');
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var hex = function (n) { return '#' + ('000000' + n.toString(16)).slice(-6); };
  var S = { open: false, data: null, sel: null, draft: null, msg: '', busy: false, ready3d: false, timer: null, pic: '' };

  var HAIR_LABEL = { curls: 'Curls', tightcurls: 'Tight curls', straight: 'Straight', wavy: 'Wavy', bob: 'Bob', ponytail: 'Ponytail', braids: 'Braids', buns: 'Two buns', short: 'Short', scarf: 'Headscarf' };
  var TOGGLES = [['glasses', 'Glasses'], ['freckles', 'Freckles'], ['lashes', 'Long lashes'], ['longSleeves', 'Long sleeves'], ['pants', 'Long pants']];

  function api(method, body) {
    return fetch('/api/kids', { method: method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Something went wrong'); return j; }); });
  }

  // ---------- 3D (three.js loaded on demand; kid3d.js comes with the app) ----------
  var waiting = [];
  function load3D(cb) {
    if (S.ready3d) return cb(true);
    waiting.push(cb); if (waiting.length > 1) return;
    function done(ok) { S.ready3d = ok; var w = waiting; waiting = []; w.forEach(function (f) { f(ok); }); }
    function add(src, next) { var sc = document.createElement('script'); sc.src = src; sc.onload = next; sc.onerror = function () { done(false); }; document.head.appendChild(sc); }
    var go = function () { done(!!window.NectaraKid && window.NectaraKid.supported()); };   // kid3d.js is in index.html
    if (window.THREE) go(); else add('/assets/three.min.js', go);
  }
  function picture(traits, inside) {
    try { return window.NectaraKid.render(traits, { inside: inside, format: 'image/webp' }).png; } catch (e) { return ''; }
  }
  var keyOf = function (k) { return k ? k.id + ':' + JSON.stringify(k.traits) : ''; };

  // ---------- the device cache Asal's World reads ----------
  function cache() { try { return JSON.parse(localStorage.getItem('nx_me') || 'null'); } catch (e) { return null; } }
  function remember(k, img, inside) {
    try { localStorage.setItem('nx_me', JSON.stringify({ key: keyOf(k), nick: k.nick, img: img, inside: inside || '' })); } catch (e) { /* storage full: World keeps the cast */ }
  }
  function activeKid(d) { d = d || S.data; if (!d || !d.kids) return null; for (var i = 0; i < d.kids.length; i++) if (d.kids[i].id === d.active) return d.kids[i]; return d.kids[0] || null; }
  // Make sure this device has pictures of the child who is playing (runs quietly when the app opens).
  function sync(d) {
    var k = activeKid(d), c = cache();
    if (!k) { try { localStorage.removeItem('nx_me'); } catch (e) {} return; }
    if (c && c.key === keyOf(k) && c.inside) return;
    load3D(function (ok) {
      if (!ok) return;
      var img = picture(k.traits, false); remember(k, img, '');
      setTimeout(function () { var c2 = cache(); if (c2 && c2.key === keyOf(k)) remember(k, img, picture(k.traits, true)); }, 400);
    });
  }

  // ---------- screen ----------
  function blank() { return { id: '', nick: '', traits: JSON.parse(JSON.stringify(window.NectaraKid ? window.NectaraKid.DEFAULT : { hair: 'curls' })) }; }
  function surprise() {
    var O = window.NectaraKid.OPTIONS, any = function (a) { return a[Math.floor(Math.random() * a.length)]; };
    var t = { skin: any(O.skin), hair: any(O.hair), hairColor: any(O.hairColor.slice(0, 7)), eyes: any(O.eyes), shirt: any(O.shirt), bottom: any(O.bottom) };
    TOGGLES.forEach(function (x) { t[x[0]] = Math.random() < 0.25; });
    return t;
  }
  function swatches(name, label) {
    var O = window.NectaraKid.OPTIONS[name], cur = S.draft.traits[name];
    return '<fieldset class="me-row"><legend>' + label + '</legend><div class="me-sw">' + O.map(function (c) {
      return '<button type="button" class="me-dot' + (c === cur ? ' on' : '') + '" data-set="' + name + '" data-val="' + c + '" style="background:' + hex(c) + '" aria-label="' + label + ' ' + hex(c) + '" aria-pressed="' + (c === cur) + '"></button>';
    }).join('') + '</div></fieldset>';
  }
  function render() {
    if (!S.open) return;
    var d = S.data, kids = (d && d.kids) || [];
    var html = '<div class="home me"><header class="topbar"><a class="brand" href="#/"><img src="/assets/logo-mark.svg" alt="" width="52" height="37"><span><b>nectara</b><small>My character</small></span></a>' +
      '<a class="btn ghost" href="#/" style="min-height:44px;padding:0 16px">Back</a></header>';
    if (!d) { root.innerHTML = html + '<p class="loading">Opening the character maker…</p></div>'; return; }
    html += '<div class="me-head"><h1>Make your character</h1><p>Choose together how you look. Your character joins Asal in Asal&rsquo;s World on the phone, tablet and TV.</p></div>';
    html += '<div class="me-kids" role="tablist" aria-label="Your children">' + kids.map(function (k) {
      return '<button type="button" class="dc-chip' + (S.draft && S.draft.id === k.id ? ' on' : '') + '" data-kid="' + k.id + '">' + esc(k.nick) + (d.active === k.id ? ' &#9733;' : '') + '</button>';
    }).join('') + (kids.length < 6 ? '<button type="button" class="dc-chip" data-kid="new">+ Add a child</button>' : '') + '</div>';
    if (!S.ready3d) { root.innerHTML = html + '<p class="loading">' + (S.no3d ? 'This screen can&rsquo;t draw 3D characters. Try a phone, tablet or computer, and your character will show up here too.' : 'Getting the paints ready…') + '</p></div>'; bind(); return; }
    var t = S.draft.traits;
    html += '<div class="me-grid"><div class="me-stage"><div class="me-pic">' + (S.pic ? '<img src="' + S.pic + '" alt="Your character" width="320" height="480">' : '') + '</div>' +
      '<button type="button" class="btn quiet" id="me-surprise">Surprise me</button></div>' +
      '<div class="me-controls">' +
      '<label class="me-row"><span>First name or nickname</span><input id="me-nick" maxlength="16" autocomplete="off" value="' + esc(S.draft.nick) + '" placeholder="e.g. Turaan"></label>' +
      '<fieldset class="me-row"><legend>Hair</legend><div class="me-chips">' + window.NectaraKid.OPTIONS.hair.map(function (h) {
        return '<button type="button" class="dc-chip' + (t.hair === h ? ' on' : '') + '" data-set="hair" data-val="' + h + '" aria-pressed="' + (t.hair === h) + '">' + HAIR_LABEL[h] + '</button>';
      }).join('') + '</div></fieldset>' +
      swatches('hairColor', t.hair === 'scarf' ? 'Scarf color' : 'Hair color') + swatches('skin', 'Skin') + swatches('eyes', 'Eyes') +
      swatches('shirt', 'Shirt') + swatches('bottom', t.pants ? 'Pants' : 'Shorts') +
      '<fieldset class="me-row"><legend>Extras</legend><div class="me-chips">' + TOGGLES.map(function (x) {
        return '<button type="button" class="dc-chip' + (t[x[0]] ? ' on' : '') + '" data-toggle="' + x[0] + '" aria-pressed="' + !!t[x[0]] + '">' + x[1] + '</button>';
      }).join('') + '</div></fieldset>' +
      '<div class="me-acts"><button type="button" class="btn" id="me-save"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Saving…' : 'Save my character') + '</button>' +
      (S.draft.id && d.active !== S.draft.id ? '<button type="button" class="btn ghost" id="me-play">Make ' + esc(S.draft.nick || 'them') + ' the one playing</button>' : '') +
      (S.draft.id ? '<button type="button" class="btn ghost" id="me-del">Remove</button>' : '') + '</div>' +
      (S.msg ? '<p class="dc-msg" role="status">' + esc(S.msg) + '</p>' : '') +
      '<p class="me-note"><b>For grown-ups:</b> we save only the name or nickname you type and the choices above. No photos, no last names, no birthdays, and nothing is shared with other families.</p>' +
      '</div></div></div>';
    root.innerHTML = html; bind();
  }
  function redraw() { clearTimeout(S.timer); S.timer = setTimeout(function () { S.pic = picture(S.draft.traits, false); var p = root.querySelector('.me-pic'); if (p) p.innerHTML = '<img src="' + S.pic + '" alt="Your character" width="320" height="480">'; }, 60); }
  function bind() {
    var q = function (s) { return root.querySelector(s); };
    Array.prototype.forEach.call(root.querySelectorAll('[data-kid]'), function (b) { b.addEventListener('click', function () { choose(b.getAttribute('data-kid')); }); });
    if (!S.ready3d) return;
    Array.prototype.forEach.call(root.querySelectorAll('[data-set]'), function (b) {
      b.addEventListener('click', function () { var n = b.getAttribute('data-set'), v = b.getAttribute('data-val'); S.draft.traits[n] = n === 'hair' ? v : parseInt(v, 10); keepNick(); S.msg = ''; render(); redraw(); refocus(n, v); });
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-toggle]'), function (b) {
      b.addEventListener('click', function () { var n = b.getAttribute('data-toggle'); S.draft.traits[n] = !S.draft.traits[n]; keepNick(); S.msg = ''; render(); redraw(); refocus(null, null, n); });
    });
    q('#me-surprise').addEventListener('click', function () { keepNick(); S.draft.traits = surprise(); render(); redraw(); var b = q('#me-surprise'); if (b) b.focus(); });
    q('#me-save').addEventListener('click', save);
    if (q('#me-play')) q('#me-play').addEventListener('click', function () { keepNick(); persist(S.draft.id, 'Now ' + (S.draft.nick || 'they') + ' is playing in Asal’s World.'); });
    if (q('#me-del')) q('#me-del').addEventListener('click', function () {
      if (!window.confirm('Remove ' + (S.draft.nick || 'this character') + '?')) return;
      var id = S.draft.id; S.data.kids = S.data.kids.filter(function (k) { return k.id !== id; });
      S.draft = null; persist(null, 'Removed.');
    });
  }
  function refocus(n, v, toggle) {
    var el = toggle ? root.querySelector('[data-toggle="' + toggle + '"]') : root.querySelector('[data-set="' + n + '"][data-val="' + v + '"]');
    if (el) el.focus();
  }
  function keepNick() { var i = root.querySelector('#me-nick'); if (i && S.draft) S.draft.nick = i.value; }
  function choose(id) {
    keepNick();
    if (id === 'new') S.draft = blank();
    else S.data.kids.forEach(function (k) { if (k.id === id) S.draft = JSON.parse(JSON.stringify(k)); });
    S.msg = ''; S.pic = S.ready3d ? picture(S.draft.traits, false) : ''; render();
  }
  function save() {
    keepNick();
    var nick = (S.draft.nick || '').trim();
    if (!nick) { S.msg = 'Type a first name or nickname first.'; render(); var i = root.querySelector('#me-nick'); if (i) i.focus(); return; }
    var kids = S.data.kids.slice(), found = false;
    kids = kids.map(function (k) { if (S.draft.id && k.id === S.draft.id) { found = true; return S.draft; } return k; });
    if (!found) { S.draft.id = Math.random().toString(36).slice(2, 10); kids.push(S.draft); }
    S.data.kids = kids;
    persist(S.data.active || S.draft.id, 'Saved! ' + nick + ' is ready for Asal’s World.');
  }
  function persist(active, note) {
    S.busy = true; render();
    api('POST', { kids: S.data.kids, active: active || (S.draft && S.draft.id) }).then(function (d) {
      S.data = d; S.busy = false; S.msg = note || '';
      var keep = S.draft && S.draft.id; S.draft = null;
      d.kids.forEach(function (k) { if (k.id === keep) S.draft = JSON.parse(JSON.stringify(k)); });
      if (!S.draft) S.draft = d.kids[0] ? JSON.parse(JSON.stringify(d.kids[0])) : blank();
      S.pic = picture(S.draft.traits, false);
      try { localStorage.removeItem('nx_me'); } catch (e) {}
      sync(d); render();
    }).catch(function (e) { S.busy = false; S.msg = e.message; render(); });
  }

  function open() {
    S.open = true; S.msg = ''; document.title = 'Nectara · My character'; window.scrollTo(0, 0);
    render();
    api('GET').then(function (d) {
      S.data = d; var k = activeKid(d);
      load3D(function (ok) {
        S.no3d = !ok;
        S.draft = k ? JSON.parse(JSON.stringify(k)) : blank();
        if (ok) S.pic = picture(S.draft.traits, false);
        render();
      });
      render();
    }).catch(function (e) { S.data = { kids: [], active: null }; S.msg = e.message; render(); });
  }
  function close() { S.open = false; clearTimeout(S.timer); }

  // When the app starts: fetch the family's characters and make sure this device has the pictures.
  function start() { api('GET').then(function (d) { S.data = S.data || d; sync(d); }).catch(function () {}); }

  window.NectaraMe = {
    open: open, close: close, start: start,
    img: function () { var c = cache(); return c && c.img || ''; },
    insideImg: function () { var c = cache(); return c && c.inside || ''; },
    nick: function () { var c = cache(); return c && c.nick || ''; }
  };
})();
