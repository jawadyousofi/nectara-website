// Phone remote for the TV.
// On the phone: #/remote shows big buttons (arrows, OK, back, next/previous page, read aloud, home, Asal's World).
// On the TV (a screen signed in with a code, see assets/tv.js, which sets localStorage nx_tv): the app waits for
// presses at /api/remote/poll and acts them out as if the TV's own remote had been pressed.
// Written in ES5 like the rest of the app.
(function () {
  'use strict';
  var root = document.getElementById('root');
  var S = { open: false, tv: null, msg: '' };
  function isTV() { try { return localStorage.getItem('nx_tv') === '1' || /[?&]tv=1/.test(location.search); } catch (e) { return false; } }

  // ---------- On the TV ----------
  var KEYS = { up: ['ArrowUp', 38], down: ['ArrowDown', 40], left: ['ArrowLeft', 37], right: ['ArrowRight', 39], ok: ['Enter', 13], back: ['GoBack', 461] };
  function key(name) {
    var k = KEYS[name], target = document.activeElement || document.body, e = document.createEvent('Event');
    e.initEvent('keydown', true, true); e.key = k[0]; e.keyCode = k[1]; e.which = k[1]; e.fromRemote = true;
    target.dispatchEvent(e);
    return e.defaultPrevented;
  }
  function focusables() {
    return [].slice.call(document.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select')).filter(function (el) {
      var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (el.offsetParent !== null || getComputedStyle(el).position === 'fixed') && getComputedStyle(el).visibility !== 'hidden';
    });
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
  function act(cmd) {
    if (S.open) return;                                       // a screen showing the remote never obeys it
    if (cmd === 'hello') { toast('Phone remote connected'); return; }
    if (KEYS[cmd]) {
      if (key(cmd)) return;                                   // the app handled it (lessons, Asal's World, back)
      if (cmd === 'ok') { var el = document.activeElement; if (el && el !== document.body && el.click) el.click(); return; }
      if (cmd === 'back') { if (location.hash && location.hash !== '#/') location.hash = '#/'; return; }
      moveFocus(cmd); return;
    }
    if (cmd === 'next') { if (!click('next')) key('right'); return; }
    if (cmd === 'prev') { if (!click('back')) key('left'); return; }
    if (cmd === 'read') { click('aloud'); return; }
    if (cmd === 'home') { location.hash = '#/'; return; }
    if (cmd === 'world') { location.hash = '#/world'; return; }
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
  var last = null, waiting = false, greeted = false;
  function listen() {
    if (waiting || document.visibilityState === 'hidden') return;
    waiting = true;
    var x = new XMLHttpRequest();
    x.open('GET', '/api/remote/poll' + (last === null ? '' : '?after=' + last)); x.timeout = 25000;
    function again(ms) { waiting = false; setTimeout(listen, ms); }
    x.onload = function () {
      var j = {}; try { j = JSON.parse(x.responseText); } catch (e) {}
      if (x.status !== 200 || j.off) { waiting = false; setTimeout(listen, 60000); return; }   // not switched on: look again later
      if (typeof j.last === 'number') last = j.last;
      (j.cmds || []).forEach(function (c) { if (!greeted && c !== 'hello') { greeted = true; toast('Phone remote connected'); } if (c === 'hello') greeted = true; act(c); });
      again(50);
    };
    x.onerror = x.ontimeout = function () { again(3000); };
    x.send();
  }
  function startTV() {
    listen();
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') listen(); });
  }

  // ---------- On the phone ----------
  var ICO = {
    up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>'
  };
  function svg(p) { return '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  function send(cmd, btn) {
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    if (btn) { btn.classList.add('hit'); setTimeout(function () { btn.classList.remove('hit'); }, 160); }
    var x = new XMLHttpRequest();
    x.open('POST', '/api/remote/send'); x.setRequestHeader('Content-Type', 'application/json');
    x.onload = function () {
      var j = {}; try { j = JSON.parse(x.responseText); } catch (e) {}
      var tv = x.status === 200 ? !!j.tv : null, msg = x.status === 200 ? '' : (j.error || 'Something went wrong');
      if (tv !== S.tv || msg !== S.msg) { S.tv = tv; S.msg = msg; status(); }
    };
    x.send(JSON.stringify({ cmd: cmd }));
  }
  function status() {
    var el = document.getElementById('rm-status'); if (!el) return;
    el.className = 'rm-status' + (S.tv ? ' on' : '');
    el.textContent = S.msg ? S.msg : S.tv === null ? 'Connecting to your TV…' : S.tv ? 'Connected to your TV' : 'Open Nectara on the TV (signed in with a code), then press any button.';
  }
  function render() {
    if (!S.open) return;
    var b = function (cmd, label, inner, cls) { return '<button type="button" class="rm-btn ' + (cls || '') + '" data-cmd="' + cmd + '" aria-label="' + label + '">' + inner + '</button>'; };
    root.innerHTML = '<div class="remote">' +
      '<header class="rm-top"><a class="btn ghost" href="#/" style="min-height:44px;padding:0 16px">Done</a><b>TV remote</b><span></span></header>' +
      '<p class="rm-status" id="rm-status" role="status"></p>' +
      '<div class="rm-row">' + b('prev', 'Previous page', '&larr; Page') + b('read', 'Read aloud on or off', 'Read aloud', 'soft') + b('next', 'Next page', 'Page &rarr;') + '</div>' +
      '<div class="rm-pad">' + b('up', 'Up', svg(ICO.up), 'u') + b('left', 'Left', svg(ICO.left), 'l') + b('ok', 'OK', 'OK', 'ok') + b('right', 'Right', svg(ICO.right), 'r') + b('down', 'Down', svg(ICO.down), 'd') + '</div>' +
      '<div class="rm-row">' + b('back', 'Back', 'Back', 'soft') + b('home', 'Home', 'Home', 'soft') + b('world', 'Asal’s World', 'Asal&rsquo;s World', 'soft') + '</div>' +
      '<div class="rm-row">' + b('scrollup', 'Scroll up', 'Scroll up', 'soft small') + b('scrolldown', 'Scroll down', 'Scroll down', 'soft small') + '</div>' +
      '<p class="rm-note">Use the TV&rsquo;s own remote for volume.</p></div>';
    [].forEach.call(root.querySelectorAll('[data-cmd]'), function (btn) {
      btn.addEventListener('click', function () { send(btn.getAttribute('data-cmd'), btn); });
    });
    status();
  }
  function open() { S.open = true; document.title = 'Nectara · TV remote'; window.scrollTo(0, 0); render(); send('hello'); }
  function close() { S.open = false; }

  window.NectaraRemote = { open: open, close: close, isTV: isTV, start: function () { if (isTV()) startTV(); } };
})();
