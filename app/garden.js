// The Growth Garden: a family's private journal of what their child explored, made and noticed,
// sorted by the Seven Petals (Nectara Whole-Child Framework). Drawings, photos, voice notes and grown-up notes.
// No scores and no numbers: each petal simply blooms a little more as the child explores it.
// Written in ES5 so it runs on older TV browsers. Routes: #/garden, #/garden/add/<kind>[/<source>].
(function () {
  'use strict';
  var root = document.getElementById('root');
  var PETALS = (window.NECTARA_WORLD && window.NECTARA_WORLD.petals) || [
    { id: 'body', name: 'Body', color: '#E07A5F' }, { id: 'heart', name: 'Heart', color: '#E76F9A' },
    { id: 'mind', name: 'Mind', color: '#5B8DEF' }, { id: 'voice', name: 'Voice', color: '#F2B23A' },
    { id: 'earth', name: 'Earth', color: '#5FA36A' }, { id: 'world', name: 'World', color: '#3E9CA8' },
    { id: 'spirit', name: 'Spirit', color: '#9B7FD4' }];
  var INVITE = {
    body: 'Move together: dance, hop or stretch, then draw how your body felt.',
    heart: 'Name a feeling together, then draw what it looks like.',
    mind: 'Ask "I wonder…" about something at home, guess, then test it.',
    voice: 'Ask your child to tell you a story, and record it as a voice note.',
    earth: 'Go outside and find one living thing. Take a photo or draw it.',
    world: 'Help someone at home together, then record what you did.',
    spirit: 'Sit still together for one minute. What did you hear? Write it down.'
  };
  var KIND = {
    drawing: { label: 'Draw', title: 'A drawing', icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 26l3-9L21 5l6 6-12 12z" fill="#FFF3B0" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M18 8l6 6M6 26l5-1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' },
    photo: { label: 'Photo', title: 'A photo', icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="9" width="24" height="17" rx="4" fill="#DDEFF8" stroke="currentColor" stroke-width="2.2"/><path d="M11 9l2-3h6l2 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="17.5" r="4.5" fill="#fff" stroke="currentColor" stroke-width="2.2"/></svg>' },
    voice: { label: 'Voice', title: 'A voice note', icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="11" y="4" width="10" height="16" rx="5" fill="#FBE0E9" stroke="currentColor" stroke-width="2.2"/><path d="M7 15a9 9 0 0 0 18 0M16 24v4M11 28h10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' },
    note: { label: 'Note', title: 'A note', icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 4h13l5 5v19H7z" fill="#E8F4E2" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M11 14h10M11 19h10M11 24h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' }
  };
  var IS_TV = /Web0S|webOS|SmartTV|Tizen|NetCast|BRAVIA|HbbTV/i.test(navigator.userAgent);
  var S = { active: false, entries: null, filter: '', extra: {}, user: null };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function petal(id) { for (var i = 0; i < PETALS.length; i++) if (PETALS[i].id === id) return PETALS[i]; return null; }
  function api(method, url, body) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open(method, url); x.withCredentials = true;
      if (body) x.setRequestHeader('Content-Type', 'application/json');
      x.onload = function () {
        var j = {}; try { j = JSON.parse(x.responseText); } catch (e) {}
        if (x.status >= 200 && x.status < 300) resolve(j); else { var err = new Error(j.error || 'failed'); err.status = x.status; reject(err); }
      };
      x.onerror = function () { reject(new Error('no connection')); };
      x.send(body ? JSON.stringify(body) : null);
    });
  }
  function fmtDate(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  }

  // How much each petal has grown: journal entries, Asal's World discoveries, finished lessons and stories.
  function growth() {
    var g = {}; PETALS.forEach(function (p) { g[p.id] = 0; });
    (S.entries || []).forEach(function (e) { (e.petals || []).forEach(function (p) { if (p in g) g[p] += 2; }); });
    var W = window.NECTARA_WORLD;
    if (W && W.spotPetals) {
      var found = {}; try { found = (JSON.parse(localStorage.getItem('nx_world') || '{}').found) || {}; } catch (e) {}
      Object.keys(found).forEach(function (id) { (W.spotPetals[id] || []).forEach(function (p) { if (p in g) g[p] += 1; }); });
    }
    var grows = window.NECTARA_GROWS || {}, done = S.extra.done || {};
    Object.keys(done).forEach(function (id) { (grows[id] || []).forEach(function (p) { if (p in g) g[p] += 1; }); });
    return g;
  }
  function flower(g, cls) {
    var out = '<svg class="' + (cls || 'gg-flower') + '" viewBox="-110 -110 220 220" aria-hidden="true">';
    PETALS.forEach(function (p, i) {
      var v = Math.min(1, (g[p.id] || 0) / 8), on = v > 0;
      var ry = 30 + 18 * v, rx = 16 + 9 * v, cy = -(34 + ry * 0.9);
      out += '<g transform="rotate(' + (i * 360 / PETALS.length) + ')"><ellipse class="gg-petal" cx="0" cy="' + cy.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="' + p.color + '" fill-opacity="' + (on ? (0.45 + 0.55 * v).toFixed(2) : 0.12) + '" stroke="' + (on ? '#FFFFFF' : p.color) + '" stroke-width="3"' + (on ? '' : ' stroke-dasharray="5 6" stroke-opacity="0.6"') + '/></g>';
    });
    return out + '<circle r="30" fill="#F2C14E" stroke="#FFFFFF" stroke-width="5"/><circle r="12" fill="#E9A23B"/></svg>';
  }

  // ---------- The garden page ----------
  function render() {
    var child = S.user && S.user.children && S.user.children[0] && S.user.children[0].name;
    var g = growth(), quiet = PETALS.filter(function (p) { return !g[p.id]; });
    var invite = quiet.length ? quiet[Math.floor(Date.now() / 86400000) % quiet.length] : null;
    var list = (S.entries || []).filter(function (e) { return !S.filter || (e.petals || []).indexOf(S.filter) >= 0; });
    document.title = 'Growth Garden · Nectara';
    root.innerHTML = '<div class="home gg">' +
      '<header class="topbar"><a class="brand" href="#/"><img src="/assets/logo-mark.svg" alt="" width="52" height="37"><span><b>nectara</b><small>Growth Garden</small></span></a>' +
      '<a class="btn ghost" href="#/" style="min-height:44px;padding:0 18px">Home</a></header>' +
      '<section class="gg-hero">' + flower(g) + '<div><h1>' + (child ? esc(child) + '&rsquo;s' : 'Our') + ' Growth Garden</h1>' +
      '<p>Everything your child explores, makes and notices, kept here for your family. Each petal blooms a little more as it grows. A quiet petal is simply an invitation.</p>' +
      '<div class="gg-legend" role="group" aria-label="Show one petal">' + '<button type="button" class="gg-chip' + (S.filter ? '' : ' on') + '" data-filter="">All</button>' +
      PETALS.map(function (p) { return '<button type="button" class="gg-chip' + (S.filter === p.id ? ' on' : '') + (g[p.id] ? '' : ' quiet') + '" data-filter="' + p.id + '" style="--pc:' + p.color + '">' + p.name + '</button>'; }).join('') + '</div></div></section>' +
      (IS_TV ? '<p class="gg-tvnote">Add drawings, photos and voice notes from a phone, tablet or computer. They appear here on the TV.</p>' :
        '<div class="gg-add"><h2>Add to the garden</h2><div class="gg-add-row">' + ['drawing', 'photo', 'voice', 'note'].map(function (k) { return '<a class="gg-add-btn" href="#/garden/add/' + k + '">' + KIND[k].icon + '<span>' + KIND[k].label + '</span></a>'; }).join('') + '</div></div>') +
      (invite ? '<div class="gg-invite" style="--pc:' + invite.color + '"><b>The ' + invite.name + ' petal is waiting.</b> ' + esc(INVITE[invite.id]) + '</div>' : '') +
      (S.entries === null ? '<p class="loading">Opening the garden&hellip;</p>' :
        list.length ? '<div class="gg-grid">' + list.map(card).join('') + '</div>' :
        '<p class="gg-empty">' + (S.filter ? 'Nothing in this petal yet.' : 'The garden is ready for its first memory. Add a drawing, a photo of something found outside, or a voice note of your child telling a story.') + '</p>') +
      '</div><div class="gg-sheet" id="gg-sheet" hidden></div>';
    [].forEach.call(root.querySelectorAll('[data-filter]'), function (b) { b.addEventListener('click', function () { S.filter = b.getAttribute('data-filter'); render(); }); });
    [].forEach.call(root.querySelectorAll('[data-entry]'), function (b) { b.addEventListener('click', function () { openEntry(b.getAttribute('data-entry')); }); });
  }
  function card(e) {
    var media = e.kind === 'drawing' || e.kind === 'photo' ? '<img src="/api/garden/media?id=' + e.id + '" alt="" loading="lazy">' :
      e.kind === 'voice' ? '<span class="gg-voice">' + KIND.voice.icon + '</span>' : '<span class="gg-note">' + esc((e.text || '').slice(0, 140)) + '</span>';
    return '<button type="button" class="gg-card k-' + e.kind + '" data-entry="' + e.id + '"><span class="gg-media">' + media + '</span>' +
      '<span class="gg-meta"><b>' + esc(e.title || KIND[e.kind].title) + '</b><small>' + fmtDate(e.created) + '</small>' +
      '<span class="gg-dots">' + (e.petals || []).map(function (id) { var p = petal(id); return p ? '<i style="background:' + p.color + '" title="' + p.name + '"></i>' : ''; }).join('') + '</span></span></button>';
  }
  function openEntry(id) {
    var e = null; (S.entries || []).forEach(function (x) { if (x.id === id) e = x; });
    if (!e) return;
    var sheet = document.getElementById('gg-sheet');
    var media = e.kind === 'drawing' || e.kind === 'photo' ? '<img class="gg-big" src="/api/garden/media?id=' + e.id + '" alt="">' :
      e.kind === 'voice' ? '<audio controls src="/api/garden/media?id=' + e.id + '" class="gg-audio"></audio>' : '';
    sheet.innerHTML = '<div class="gg-panel" role="dialog" aria-modal="true" aria-label="' + esc(e.title || KIND[e.kind].title) + '">' +
      '<div class="gg-panel-head"><h2>' + esc(e.title || KIND[e.kind].title) + '</h2><button type="button" class="btn quiet" data-close>Close</button></div>' +
      media + (e.text ? '<p class="gg-text">' + esc(e.text) + '</p>' : '') +
      '<div class="gg-petals-row">' + (e.petals || []).map(function (id) { var p = petal(id); return p ? '<span class="gg-chip on" style="--pc:' + p.color + '">' + p.name + '</span>' : ''; }).join('') + '</div>' +
      '<p class="gg-when">Added ' + fmtDate(e.created) + '</p>' +
      '<button type="button" class="linklike gg-del" data-del>Remove from the garden</button></div>';
    sheet.hidden = false;
    sheet.querySelector('[data-close]').addEventListener('click', closeSheet);
    sheet.querySelector('[data-close]').focus();
    var del = sheet.querySelector('[data-del]');
    del.addEventListener('click', function () {
      if (del.getAttribute('data-sure') !== '1') { del.setAttribute('data-sure', '1'); del.textContent = 'Tap again to remove it for good'; return; }
      del.textContent = 'Removing…';
      api('POST', '/api/garden', { id: e.id, 'delete': true }).then(function (j) { S.entries = j.entries; closeSheet(); render(); })
        .catch(function (err) { del.textContent = 'Couldn’t remove it: ' + err.message; });
    });
  }
  function closeSheet() {
    var sheet = document.getElementById('gg-sheet'); if (!sheet) return;
    stopRecording(); sheet.hidden = true; sheet.innerHTML = '';
    if (/^#\/garden\/add/.test(location.hash)) location.hash = '#/garden';
  }

  // ---------- Adding: capture, then petals ----------
  var REC = { rec: null, stream: null, chunks: [], timer: null };
  function stopRecording() {
    clearInterval(REC.timer);
    if (REC.rec && REC.rec.state !== 'inactive') { try { REC.rec.stop(); } catch (e) {} }
    if (REC.stream) { REC.stream.getTracks().forEach(function (t) { t.stop(); }); REC.stream = null; }
  }
  function openAdd(kind, source) {
    if (!KIND[kind]) { location.hash = '#/garden'; return; }
    var sheet = document.getElementById('gg-sheet');
    var draft = { kind: kind, blob: null, mime: '', source: source || '', petals: suggestPetals(source) };
    var capture = {
      drawing: '<div class="gg-draw"><canvas id="gg-canvas" width="1200" height="900" aria-label="Drawing space"></canvas>' +
        '<div class="gg-tools"><div class="gg-colors">' + ['#2A2118', '#E0503A', '#F28C28', '#F2C14E', '#5FA36A', '#3E7CA8', '#8E5BB8', '#E76F9A', '#8A5A2B', '#FFFFFF'].map(function (c, i) { return '<button type="button" class="gg-color' + (i === 0 ? ' on' : '') + '" data-color="' + c + '" style="background:' + c + '" aria-label="Color"></button>'; }).join('') + '</div>' +
        '<div class="gg-sizes"><button type="button" class="gg-size" data-size="6">Thin</button><button type="button" class="gg-size on" data-size="14">Medium</button><button type="button" class="gg-size" data-size="30">Thick</button>' +
        '<button type="button" class="gg-size" data-undo>Undo</button><button type="button" class="gg-size" data-clear>Clear</button></div></div></div>',
      photo: '<label class="gg-pick"><input type="file" id="gg-file" accept="image/*" capture="environment" hidden>' + KIND.photo.icon + '<span>Take or choose a photo</span></label><img id="gg-preview" class="gg-big" alt="" hidden>',
      voice: '<div class="gg-rec"><button type="button" class="gg-recbtn" id="gg-recbtn"><span class="gg-dot"></span><span id="gg-rectext">Start recording</span></button><span class="gg-clock" id="gg-clock">0:00 / 1:00</span><audio id="gg-play" controls hidden></audio>' +
        '<p class="hint">Ask your child to tell you what they found, sing a song, or tell a story. Up to one minute.</p></div>',
      note: '<textarea id="gg-text" rows="6" maxlength="2000" placeholder="What did you notice today? What did your child say or wonder about?"></textarea>'
    }[kind];
    sheet.innerHTML = '<div class="gg-panel gg-adding" role="dialog" aria-modal="true" aria-label="Add ' + KIND[kind].title + '">' +
      '<div class="gg-panel-head"><h2>' + KIND[kind].icon + ' ' + KIND[kind].title + '</h2><button type="button" class="btn quiet" data-close>Cancel</button></div>' +
      capture +
      '<div class="field"><label for="gg-title">What is it? <span class="hint">(optional)</span></label><input id="gg-title" maxlength="80" placeholder="' + ({ drawing: 'e.g. Me as a frog', photo: 'e.g. A snail on the path', voice: 'e.g. The story of the brave seed', note: 'e.g. First time she noticed the moon' })[kind] + '"></div>' +
      '<fieldset class="gg-pick-petals"><legend>Which petals did it grow?</legend>' + PETALS.map(function (p) { return '<button type="button" class="gg-chip' + (draft.petals.indexOf(p.id) >= 0 ? ' on' : '') + '" data-petal="' + p.id + '" aria-pressed="' + (draft.petals.indexOf(p.id) >= 0) + '" style="--pc:' + p.color + '">' + p.name + '</button>'; }).join('') + '</fieldset>' +
      '<div class="gg-save-row"><button type="button" class="btn" id="gg-save">Add to the garden</button><span class="gg-status" id="gg-status" role="status"></span></div></div>';
    sheet.hidden = false;
    sheet.querySelector('[data-close]').addEventListener('click', closeSheet);
    [].forEach.call(sheet.querySelectorAll('[data-petal]'), function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-petal'), i = draft.petals.indexOf(id);
        if (i >= 0) draft.petals.splice(i, 1); else draft.petals.push(id);
        b.className = 'gg-chip' + (i >= 0 ? '' : ' on'); b.setAttribute('aria-pressed', String(i < 0));
      });
    });
    var setup = { drawing: setupDraw, photo: setupPhoto, voice: setupVoice, note: function () { document.getElementById('gg-text').focus(); } }[kind];
    setup(draft);
    document.getElementById('gg-save').addEventListener('click', function () { save(draft); });
  }
  function suggestPetals(source) {
    if (!source) return [];
    var m = source.split(':'), W = window.NECTARA_WORLD, grows = window.NECTARA_GROWS || {};
    if ((m[0] === 'world' || m[0] === 'mission') && W && W.spotPetals && W.spotPetals[m[1]]) return W.spotPetals[m[1]].slice();
    if (grows[m[1]]) return grows[m[1]].slice();
    return [];
  }
  function status(t, err) { var s = document.getElementById('gg-status'); if (s) { s.textContent = t; s.className = 'gg-status' + (err ? ' err' : ''); } }

  function setupDraw(draft) {
    var cv = document.getElementById('gg-canvas'), ctx = cv.getContext('2d');
    var color = '#2A2118', size = 14, drawing = false, last = null, history = [];
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    function pos(e) {
      var r = cv.getBoundingClientRect(), t = e.touches ? e.touches[0] : e;
      return { x: (t.clientX - r.left) * cv.width / r.width, y: (t.clientY - r.top) * cv.height / r.height };
    }
    function start(e) {
      e.preventDefault(); drawing = true; draft.dirty = true;
      try { history.push(ctx.getImageData(0, 0, cv.width, cv.height)); if (history.length > 20) history.shift(); } catch (x) {}
      last = pos(e); dot(last);
    }
    function dot(p) { ctx.beginPath(); ctx.fillStyle = color; ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2); ctx.fill(); }
    function move(e) {
      if (!drawing) return; e.preventDefault();
      var p = pos(e); ctx.strokeStyle = color; ctx.lineWidth = size;
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p;
    }
    function end() { drawing = false; }
    if (window.PointerEvent) {
      cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); start(e); });
      cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    } else {
      cv.addEventListener('mousedown', start); window.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
      cv.addEventListener('touchstart', start); cv.addEventListener('touchmove', move); cv.addEventListener('touchend', end);
    }
    [].forEach.call(document.querySelectorAll('[data-color]'), function (b) {
      b.addEventListener('click', function () { color = b.getAttribute('data-color'); [].forEach.call(document.querySelectorAll('[data-color]'), function (x) { x.classList.remove('on'); }); b.classList.add('on'); });
    });
    [].forEach.call(document.querySelectorAll('[data-size]'), function (b) {
      b.addEventListener('click', function () { size = +b.getAttribute('data-size'); [].forEach.call(document.querySelectorAll('[data-size]'), function (x) { x.classList.remove('on'); }); b.classList.add('on'); });
    });
    document.querySelector('[data-undo]').addEventListener('click', function () { var h = history.pop(); if (h) ctx.putImageData(h, 0, 0); });
    document.querySelector('[data-clear]').addEventListener('click', function () { history.push(ctx.getImageData(0, 0, cv.width, cv.height)); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, cv.width, cv.height); draft.dirty = false; });
    draft.collect = function () {
      return new Promise(function (resolve, reject) {
        if (!draft.dirty) { reject(new Error('Draw something first')); return; }
        cv.toBlob(function (b) { draft.mime = 'image/jpeg'; resolve(b); }, 'image/jpeg', 0.85);
      });
    };
  }
  function setupPhoto(draft) {
    var input = document.getElementById('gg-file'), prev = document.getElementById('gg-preview');
    input.addEventListener('change', function () {
      var f = input.files && input.files[0]; if (!f) return;
      status('Getting the photo ready…');
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { draft.blob = b; draft.mime = 'image/jpeg'; prev.src = URL.createObjectURL(b); prev.hidden = false; status(''); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { status('That photo couldn’t be opened. Try another one.', true); };
      img.src = url;
    });
    draft.collect = function () { return draft.blob ? Promise.resolve(draft.blob) : Promise.reject(new Error('Take or choose a photo first')); };
  }
  function setupVoice(draft) {
    var btn = document.getElementById('gg-recbtn'), txt = document.getElementById('gg-rectext'), clock = document.getElementById('gg-clock'), play = document.getElementById('gg-play');
    var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg'];
    if (!navigator.mediaDevices || !window.MediaRecorder) { btn.disabled = true; txt.textContent = 'Recording isn’t available in this browser'; }
    function tick(t0) { var s = Math.floor((Date.now() - t0) / 1000); clock.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2) + ' / 1:00'; if (s >= 60) stopRecording(); }
    btn.addEventListener('click', function () {
      if (REC.rec && REC.rec.state === 'recording') { stopRecording(); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        REC.stream = stream; REC.chunks = [];
        var type = ''; for (var i = 0; i < types.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(types[i])) { type = types[i]; break; }
        REC.rec = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
        REC.rec.ondataavailable = function (e) { if (e.data && e.data.size) REC.chunks.push(e.data); };
        REC.rec.onstop = function () {
          var mime = (REC.rec.mimeType || type || 'audio/webm').split(';')[0];
          draft.blob = new Blob(REC.chunks, { type: mime }); draft.mime = mime;
          play.src = URL.createObjectURL(draft.blob); play.hidden = false;
          btn.classList.remove('on'); txt.textContent = 'Record again';
        };
        REC.rec.start(); btn.classList.add('on'); txt.textContent = 'Stop';
        var t0 = Date.now(); REC.timer = setInterval(function () { tick(t0); }, 250);
      }).catch(function () { status('The microphone is off. Allow microphone access in your browser to record.', true); });
    });
    draft.collect = function () { return draft.blob ? Promise.resolve(draft.blob) : Promise.reject(new Error('Record something first')); };
  }
  function blobToBase64(b) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { reject(new Error('could not read the file')); };
      r.readAsDataURL(b);
    });
  }
  function save(draft) {
    var btn = document.getElementById('gg-save');
    var body = { kind: draft.kind, title: document.getElementById('gg-title').value, petals: draft.petals, source: draft.source, by: draft.kind === 'note' ? 'grown-up' : 'child' };
    var go;
    if (draft.kind === 'note') {
      body.text = document.getElementById('gg-text').value;
      if (!body.text.trim()) { status('Write a few words first', true); return; }
      go = Promise.resolve();
    } else {
      go = draft.collect().then(function (blob) {
        if (blob.size > 3 * 1024 * 1024) throw new Error('That’s too big to save (3 MB at most). Try a shorter recording or another photo.');
        body.mime = draft.mime;
        return blobToBase64(blob).then(function (b64) { body.media = b64; });
      });
    }
    btn.disabled = true; status('Planting it in the garden…');
    go.then(function () { return api('POST', '/api/garden', body); })
      .then(function (j) {
        S.entries = j.entries; stopRecording();
        var sheet = document.getElementById('gg-sheet'); sheet.hidden = true; sheet.innerHTML = '';
        location.hash = '#/garden';
        render();
        var first = root.querySelector('.gg-card'); if (first) { first.classList.add('gg-new'); first.focus(); }
      })
      .catch(function (err) { btn.disabled = false; status(err.message, true); });
  }

  // ---------- Open / close ----------
  function open(sub, extra) {
    S.active = true; S.extra = extra || {}; S.user = S.extra.user || S.user;
    var m = (sub || '').match(/^add\/([a-z]+)(?:\/(.+))?$/);
    render();
    var after = function () { if (m) openAdd(m[1], m[2] ? decodeURIComponent(m[2]) : ''); };
    if (S.entries === null) {
      api('GET', '/api/garden').then(function (j) { S.entries = j.entries || []; if (S.active) { render(); after(); } })
        .catch(function () { S.entries = []; if (S.active) { render(); after(); } });
    } else after();
  }
  function close() { if (!S.active) return; S.active = false; stopRecording(); }
  document.addEventListener('keydown', function (e) {
    if (!S.active) return;
    var sheet = document.getElementById('gg-sheet');
    var back = e.keyCode === 461 || e.keyCode === 27 || e.key === 'GoBack';
    if (back && sheet && !sheet.hidden) { e.preventDefault(); e.stopImmediatePropagation(); closeSheet(); }
  }, true);

  window.NectaraGarden = {
    open: open, close: close, isActive: function () { return S.active; },
    flower: function () { return flower(growth(), 'gg-flower-mini'); },
    count: function () { return S.entries ? S.entries.length : null; },
    preload: function () { if (S.entries === null) api('GET', '/api/garden').then(function (j) { S.entries = j.entries || []; }).catch(function () {}); }
  };
})();
