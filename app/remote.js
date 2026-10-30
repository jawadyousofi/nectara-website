// Phone remote for the TV.
// On the phone: #/remote has two modes.
//   Buttons: big buttons (arrows, OK, back, next/previous page, read aloud, home, Asal's World).
//   Pointer: like a magic remote. Slide a finger on the touchpad (or tilt the phone) and a pointer moves on the TV;
//   tap to select whatever it is over.
// On the TV (a screen signed in with a code, see assets/tv.js, which sets localStorage nx_tv): the app waits for
// presses at /api/remote/poll and acts them out. It also keeps the screen awake while people are using it, and
// reconnects by itself after the TV has been asleep or lost its Wi-Fi.
// Written in ES5 like the rest of the app.
(function () {
  'use strict';
  var root = document.getElementById('root');
  var S = { open: false, tv: null, msg: '', mode: 'buttons', tilt: false };
  function isTV() { try { return localStorage.getItem('nx_tv') === '1' || /[?&]tv=1/.test(location.search); } catch (e) { return false; } }
  function hashNow() { return window.NX ? NX.hash() : location.hash; }
  function goTo(h) { if (window.NX) NX.go(h); else location.hash = h; }

  // ---------- On the TV ----------
  var KEYS = { up: ['ArrowUp', 38], down: ['ArrowDown', 40], left: ['ArrowLeft', 37], right: ['ArrowRight', 39], ok: ['Enter', 13], back: ['GoBack', 461] };
  function key(name) {
    var k = KEYS[name], target = document.activeElement || document.body, e = document.createEvent('Event');
    e.initEvent('keydown', true, true); e.key = k[0]; e.keyCode = k[1]; e.which = k[1]; e.fromRemote = true;
    target.dispatchEvent(e);
    return e.defaultPrevented;
  }
  function visible(el) {
    var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (el.offsetParent !== null || getComputedStyle(el).position === 'fixed') && getComputedStyle(el).visibility !== 'hidden';
  }
  function focusables() {
    return [].slice.call(document.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select')).filter(visible);
  }
  // Move focus to the nearest button in that direction (TV browsers do this for their own remote, but not for ours).
  function moveFocus(dir) {
    var list = focusables(), cur = document.activeElement;
    if (!list.length) return;
    if (!cur || list.indexOf(cur) < 0) { list[0].focus(); return; }
    var a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bestD = 1e9;
    list.forEach(function (el) {
      if (el === cur) return;
      var b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2, dx = bx - ax, dy = by - ay;
      var ok = dir === 'up' ? dy < -4 : dir === 'down' ? dy > 4 : dir === 'left' ? dx < -4 : dx > 4;
      if (!ok) return;
      var main = (dir === 'up' || dir === 'down') ? Math.abs(dy) : Math.abs(dx), side = (dir === 'up' || dir === 'down') ? Math.abs(dx) : Math.abs(dy);
      var d = main + side * 2.5;
      if (d < bestD) { bestD = d; best = el; }
    });
    if (best) { best.focus(); if (best.scrollIntoView) best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  function click(id) { var b = document.getElementById(id); if (b && !b.disabled) { b.click(); return true; } return false; }

  // The pointer: a soft honey dot that floats over everything, like the LG magic remote's.
  var P = { x: 0, y: 0, el: null, hideT: null, over: null };
  function pointerEl() {
    if (P.el) return P.el;
    P.el = document.createElement('div'); P.el.className = 'nx-pointer'; P.el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(P.el);
    P.x = window.innerWidth / 2; P.y = window.innerHeight / 2;
    return P.el;
  }
  function showPointer() {
    var el = pointerEl();
    el.className = 'nx-pointer on';
    el.style.transform = 'translate(' + Math.round(P.x) + 'px,' + Math.round(P.y) + 'px)';
    clearTimeout(P.hideT); P.hideT = setTimeout(function () { el.className = 'nx-pointer'; }, 7000);
  }
  function tappable(el) {      // the nearest thing under the pointer that can be pressed
    while (el && el !== document.body) {
      var t = el.tagName;
      if (t === 'A' || t === 'BUTTON' || t === 'INPUT' || t === 'SELECT' || (el.getAttribute && el.getAttribute('tabindex') !== null && el.getAttribute('tabindex') !== '-1')) return el;
      el = el.parentNode;
    }
    return null;
  }
  function underPointer() { var el = P.el; if (el) el.style.display = 'none'; var hit = document.elementFromPoint(P.x, P.y); if (el) el.style.display = ''; return hit; }
  function movePointer(dx, dy) {
    var W = window.innerWidth, H = window.innerHeight;
    if (!P.el || P.el.className.indexOf('on') < 0) pointerEl();
    P.x = Math.max(0, Math.min(W - 2, P.x + dx)); P.y = Math.max(0, Math.min(H - 2, P.y + dy));
    if (P.y >= H - 3 && dy > 0) window.scrollBy(0, dy * 2);      // push past the bottom or top edge to scroll
    if (P.y <= 2 && dy < 0) window.scrollBy(0, dy * 2);
    showPointer();
    var t = tappable(underPointer());
    if (t !== P.over) { P.over = t; if (t && t.focus) { try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } } }
  }
  function tapPointer() {
    showPointer();
    var hit = underPointer(); if (!hit) return;
    var t = tappable(hit);
    if (P.el) { P.el.className = 'nx-pointer on press'; setTimeout(function () { if (P.el) P.el.className = 'nx-pointer on'; }, 220); }
    if (t) { if (t.focus) t.focus(); if (t.click) { t.click(); return; } }
    var e = document.createEvent('MouseEvents');            // a drawing, a picture or a spot in Asal's World
    e.initMouseEvent('click', true, true, window, 1, P.x, P.y, P.x, P.y, false, false, false, false, 0, null);
    (t || hit).dispatchEvent(e);
  }

  // Keep the TV awake while the family is using Nectara; let it sleep after 20 quiet minutes.
  var W = { lock: null, quietT: null };
  function stayAwake() {
    clearTimeout(W.quietT);
    W.quietT = setTimeout(function () { if (W.lock) { W.lock.release().catch(function () {}); W.lock = null; } }, 20 * 60000);
    if (W.lock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (l) { W.lock = l; l.addEventListener('release', function () { W.lock = null; }); }).catch(function () {});
  }

  function act(cmd) {
    if (S.open) return;                                       // a screen showing the remote never obeys it
    stayAwake();
    if (cmd === 'hello') { toast('Phone remote connected'); return; }
    var mv = /^mv:(-?\d+),(-?\d+)$/.exec(cmd);
    if (mv) { movePointer(parseInt(mv[1], 10), parseInt(mv[2], 10)); return; }
    if (cmd === 'tap') { tapPointer(); return; }
    if (KEYS[cmd]) {
      if (P.el) P.el.className = 'nx-pointer';                // arrow keys put the pointer away, like the LG remote
      if (key(cmd)) return;                                   // the app handled it (lessons, Asal's World, back)
      if (cmd === 'ok') { var el = document.activeElement; if (el && el !== document.body && el.click) el.click(); return; }
      if (cmd === 'back') { var h = hashNow(); if (h && h !== '#/') goTo('#/'); return; }
      moveFocus(cmd); return;
    }
    if (cmd === 'next') { if (!click('next')) key('right'); return; }
    if (cmd === 'prev') { if (!click('back')) key('left'); return; }
    if (cmd === 'read') { click('aloud'); return; }
    if (cmd === 'home') { goTo('#/'); return; }
    if (cmd === 'world') { goTo('#/world'); return; }
    if (cmd === 'scrollup') { window.scrollBy(0, -window.innerHeight * 0.6); return; }
    if (cmd === 'scrolldown') { window.scrollBy(0, window.innerHeight * 0.6); }
  }
  var toastT = null;
  function toast(text) {
    var t = document.getElementById('remote-toast');
    if (!t) { t = document.createElement('div'); t.id = 'remote-toast'; t.className = 'remote-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text; t.className = 'remote-toast on';
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = 'remote-toast'; }, 3500);
  }
  var last = null, waiting = false, greeted = false, x = null, lastOk = 0;
  function listen() {
    if (waiting || document.visibilityState === 'hidden') return;
    waiting = true;
    x = new XMLHttpRequest();
    var req = x;
    req.open('GET', '/api/remote/poll' + (last === null ? '' : '?after=' + last)); req.timeout = 20000;
    function again(ms) { if (x !== req) return; waiting = false; setTimeout(listen, ms); }
    req.onload = function () {
      var j = {}; try { j = JSON.parse(req.responseText); } catch (e) {}
      if (req.status !== 200 || j.off) { again(req.status === 401 ? 60000 : 5000); return; }
      lastOk = Date.now();
      if (typeof j.last === 'number') last = j.last;
      (j.cmds || []).forEach(function (c) { if (!greeted && c !== 'hello' && c.indexOf('mv:') !== 0) { greeted = true; toast('Phone remote connected'); } if (c === 'hello') greeted = true; act(c); });
      again(30);
    };
    req.onerror = req.ontimeout = function () { again(2000); };
    req.send();
  }
  // After sleep or a Wi-Fi drop, a waiting request can hang with no answer. Start a fresh one.
  function wake() {
    if (document.visibilityState === 'hidden') return;
    if (waiting && Date.now() - lastOk > 25000 && x) { try { x.abort(); } catch (e) {} x = null; waiting = false; }
    listen();
  }
  function startTV() {
    lastOk = Date.now();
    listen(); stayAwake();
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { lastOk = 0; wake(); stayAwake(); } });
    window.addEventListener('online', function () { lastOk = 0; wake(); });
    window.addEventListener('pageshow', function () { lastOk = 0; wake(); });
    window.addEventListener('focus', wake);
    setInterval(wake, 10000);
    document.addEventListener('keydown', stayAwake, true);
  }

  // ---------- On the phone ----------
  var ICO = {
    up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>'
  };
  function svg(p) { return '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  function buzz(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  // Presses go out one at a time, in order. Pointer movement is added up while a press is on its way and sent as one.
  var Q = { list: [], busy: false, dx: 0, dy: 0 };
  function queue(cmd) { flushMove(); Q.list.push(cmd); pump(); }
  function flushMove() {
    var dx = Math.round(Q.dx), dy = Math.round(Q.dy);
    if (!dx && !dy) return;
    Q.dx -= dx; Q.dy -= dy;
    var lastCmd = Q.list[Q.list.length - 1], m = lastCmd && /^mv:(-?\d+),(-?\d+)$/.exec(lastCmd);
    if (m) Q.list[Q.list.length - 1] = 'mv:' + (parseInt(m[1], 10) + dx) + ',' + (parseInt(m[2], 10) + dy);
    else Q.list.push('mv:' + dx + ',' + dy);
  }
  function pump() {
    if (Q.busy || !Q.list.length) return;
    Q.busy = true;
    var cmd = Q.list.shift(), x = new XMLHttpRequest();
    x.open('POST', '/api/remote/send'); x.setRequestHeader('Content-Type', 'application/json');
    x.onload = function () {
      var j = {}; try { j = JSON.parse(x.responseText); } catch (e) {}
      var tv = x.status === 200 ? !!j.tv : null, msg = x.status === 200 ? '' : (j.error || 'Something went wrong');
      if (tv !== S.tv || msg !== S.msg) { S.tv = tv; S.msg = msg; status(); }
      Q.busy = false; setTimeout(function () { flushMove(); pump(); }, 0);
    };
    x.onerror = function () { Q.busy = false; S.msg = 'No connection. Check your phone’s Wi-Fi.'; status(); };
    x.send(JSON.stringify({ cmd: cmd }));
  }
  function send(cmd, btn) {
    buzz(12);
    if (btn) { btn.classList.add('hit'); setTimeout(function () { btn.classList.remove('hit'); }, 160); }
    queue(cmd);
  }
  setInterval(function () { if (S.open && (Math.abs(Q.dx) >= 1 || Math.abs(Q.dy) >= 1)) { flushMove(); pump(); } }, 70);

  function status() {
    var el = document.getElementById('rm-status'); if (!el) return;
    el.className = 'rm-status' + (S.tv ? ' on' : '');
    el.textContent = S.msg ? S.msg : S.tv === null ? 'Connecting to your TV…' : S.tv ? 'Connected to your TV' :
      'Can’t find the TV. If it’s asleep, wake it with its own remote, then press any button here.';
  }
  function modeTabs() {
    return '<div class="rm-modes" role="tablist">' +
      '<button type="button" role="tab" class="rm-mode' + (S.mode === 'buttons' ? ' on' : '') + '" data-mode="buttons" aria-selected="' + (S.mode === 'buttons') + '">Buttons</button>' +
      '<button type="button" role="tab" class="rm-mode' + (S.mode === 'pointer' ? ' on' : '') + '" data-mode="pointer" aria-selected="' + (S.mode === 'pointer') + '">Pointer</button></div>';
  }
  function render() {
    if (!S.open) return;
    stopTilt();
    var b = function (cmd, label, inner, cls) { return '<button type="button" class="rm-btn ' + (cls || '') + '" data-cmd="' + cmd + '" aria-label="' + label + '">' + inner + '</button>'; };
    var body;
    if (S.mode === 'pointer') {
      body = '<div class="rm-touch" id="rm-touch" aria-label="Touchpad: slide to move the pointer on the TV, tap to select"><span>Slide to move<br>Tap to select</span></div>' +
        '<div class="rm-row">' + b('back', 'Back', 'Back', 'soft') + b('home', 'Home', 'Home', 'soft') + b('world', 'Asal’s World', 'Asal&rsquo;s World', 'soft') + '</div>' +
        '<div class="rm-row">' + b('prev', 'Previous page', '&larr; Page', 'soft small') + b('read', 'Read aloud on or off', 'Read aloud', 'soft small') + b('next', 'Next page', 'Page &rarr;', 'soft small') + '</div>' +
        '<button type="button" class="rm-btn soft small" id="rm-tilt">' + (S.tilt ? 'Tilt pointing is on: hold the button and point' : 'Point by tilting the phone') + '</button>' +
        (S.tilt ? '<button type="button" class="rm-btn ok-big" id="rm-aim">Hold to point &middot; let go to select</button>' : '');
    } else {
      body = '<div class="rm-row">' + b('prev', 'Previous page', '&larr; Page') + b('read', 'Read aloud on or off', 'Read aloud', 'soft') + b('next', 'Next page', 'Page &rarr;') + '</div>' +
        '<div class="rm-pad">' + b('up', 'Up', svg(ICO.up), 'u') + b('left', 'Left', svg(ICO.left), 'l') + b('ok', 'OK', 'OK', 'ok') + b('right', 'Right', svg(ICO.right), 'r') + b('down', 'Down', svg(ICO.down), 'd') + '</div>' +
        '<div class="rm-row">' + b('back', 'Back', 'Back', 'soft') + b('home', 'Home', 'Home', 'soft') + b('world', 'Asal’s World', 'Asal&rsquo;s World', 'soft') + '</div>' +
        '<div class="rm-row">' + b('scrollup', 'Scroll up', 'Scroll up', 'soft small') + b('scrolldown', 'Scroll down', 'Scroll down', 'soft small') + '</div>';
    }
    root.innerHTML = '<div class="remote">' +
      '<header class="rm-top"><a class="btn ghost" href="#/" style="min-height:44px;padding:0 16px">Done</a><b>TV remote</b><span></span></header>' +
      '<p class="rm-status" id="rm-status" role="status"></p>' + modeTabs() + body +
      '<p class="rm-note">Use the TV&rsquo;s own remote for volume and to turn the TV on.</p></div>';
    [].forEach.call(root.querySelectorAll('[data-cmd]'), function (btn) {
      btn.addEventListener('click', function () { send(btn.getAttribute('data-cmd'), btn); });
    });
    [].forEach.call(root.querySelectorAll('[data-mode]'), function (btn) {
      btn.addEventListener('click', function () { S.mode = btn.getAttribute('data-mode'); try { localStorage.setItem('nx_remote_mode', S.mode); } catch (e) {} render(); });
    });
    if (S.mode === 'pointer') setupPointer();
    status();
  }

  // Touchpad: slide to move, tap to select. Faster slides move farther, like a laptop trackpad.
  function setupPointer() {
    var pad = document.getElementById('rm-touch'), t = null;
    function pt(e) { var p = e.touches ? e.touches[0] || e.changedTouches[0] : e; return { x: p.clientX, y: p.clientY }; }
    function down(e) { e.preventDefault(); var p = pt(e); t = { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: Date.now(), at: Date.now(), moved: 0 }; pad.classList.add('touching'); }
    function move(e) {
      if (!t) return; e.preventDefault();
      var p = pt(e), dx = p.x - t.x, dy = p.y - t.y, now = Date.now(), dt = Math.max(8, now - t.at);
      var speed = Math.sqrt(dx * dx + dy * dy) / dt, gain = 1.8 + Math.min(3.2, speed * 2.2);
      Q.dx += dx * gain; Q.dy += dy * gain; t.moved += Math.abs(dx) + Math.abs(dy);
      t.x = p.x; t.y = p.y; t.at = now;
    }
    function up(e) {
      if (!t) return; e.preventDefault(); pad.classList.remove('touching');
      if (t.moved < 10 && Date.now() - t.t0 < 350) { buzz(15); queue('tap'); }
      t = null;
    }
    if ('ontouchstart' in window) {
      pad.addEventListener('touchstart', down, { passive: false }); pad.addEventListener('touchmove', move, { passive: false });
      pad.addEventListener('touchend', up, { passive: false }); pad.addEventListener('touchcancel', function () { t = null; pad.classList.remove('touching'); });
    } else {
      pad.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    }
    document.getElementById('rm-tilt').addEventListener('click', function () {
      if (S.tilt) { S.tilt = false; render(); return; }
      var DM = window.DeviceMotionEvent;
      var turnOn = function () { S.tilt = true; render(); };
      if (DM && typeof DM.requestPermission === 'function') {        // iPhone asks first
        DM.requestPermission().then(function (r) { if (r === 'granted') turnOn(); else { S.msg = 'Tilt pointing needs motion access. You can turn it on in Safari settings.'; status(); } }).catch(function () {});
      } else if (DM) turnOn();
      else { S.msg = 'This phone can’t point by tilting. Use the touchpad.'; status(); }
    });
    var aim = document.getElementById('rm-aim');
    if (aim) {
      var aiming = false;
      var startAim = function (e) { e.preventDefault(); aiming = true; aim.classList.add('hit'); startTilt(); };
      var endAim = function (e) { if (!aiming) return; e.preventDefault(); aiming = false; aim.classList.remove('hit'); stopTilt(); buzz(15); queue('tap'); };
      aim.addEventListener('touchstart', startAim, { passive: false }); aim.addEventListener('touchend', endAim, { passive: false });
      aim.addEventListener('mousedown', startAim); aim.addEventListener('mouseup', endAim);
    }
  }
  // Tilt pointing: hold the phone like a remote, pointing at the TV. Turning it left or right moves the pointer
  // sideways; tipping the top up or down moves it up or down.
  var T = { on: false };
  function onMotion(e) {
    var r = e.rotationRate; if (!r || !T.on) return;
    var dt = (e.interval || 16) > 1 ? (e.interval || 16) / 1000 : e.interval;    // some phones give seconds, some milliseconds
    var k = 26;                                                                    // TV pixels per degree turned
    Q.dx += -(r.alpha || 0) * dt * k; Q.dy += -(r.beta || 0) * dt * k;
  }
  function startTilt() { if (T.on) return; T.on = true; window.addEventListener('devicemotion', onMotion); }
  function stopTilt() { if (!T.on) return; T.on = false; window.removeEventListener('devicemotion', onMotion); }

  function open() {
    S.open = true; document.title = 'Nectara · TV remote'; window.scrollTo(0, 0);
    try { S.mode = localStorage.getItem('nx_remote_mode') === 'pointer' ? 'pointer' : 'buttons'; } catch (e) {}
    render(); send('hello');
  }
  function close() { S.open = false; stopTilt(); }

  window.NectaraRemote = { open: open, close: close, isTV: isTV, start: function () { if (isTV()) startTV(); } };
})();
