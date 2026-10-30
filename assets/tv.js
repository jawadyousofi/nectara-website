// TV sign-in: shows a short code + QR code, then waits for a signed-in parent to approve it from their phone.
(function () {
  'use strict';
  var codeEl = document.getElementById('tv-code');
  if (!codeEl) return;
  // On the sign-in page the QR box is embedded: shown only on big screens (TVs, computers), never on phones.
  var embed = document.querySelector('[data-tv-embed]');
  if (embed && !window.matchMedia('(min-width: 900px)').matches) return;
  var qrEl = document.getElementById('tv-qr');
  var statusEl = document.getElementById('tv-status');
  var timerEl = document.getElementById('tv-timer');
  var current = null, expiresAt = 0, pollTimer = null, tickTimer = null;

  function pretty(c) { return c.slice(0, 3) + ' ' + c.slice(3); }
  function post(path, body) {
    return fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'something went wrong'); return j; }); });
  }
  function start() {
    clearTimeout(pollTimer);
    statusEl.textContent = 'Getting a code…';
    post('/api/tv/start').then(function (j) {
      current = j;
      expiresAt = Date.now() + (j.expiresIn || 600) * 1000 - 15000;
      codeEl.textContent = pretty(j.code);
      var url = location.origin + '/link.html?code=' + j.code;
      if (window.qrcode) {
        var qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
        qrEl.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
      }
      statusEl.textContent = 'Waiting for your phone…';
      poll();
    }).catch(function (e) {
      statusEl.textContent = 'Couldn’t get a code (' + e.message + '). Trying again…';
      pollTimer = setTimeout(start, 5000);
    });
  }
  function poll() {
    if (!current) return;
    if (Date.now() > expiresAt) { start(); return; }
    post('/api/tv/poll', { code: current.code, poll: current.poll }).then(function (j) {
      if (j.status === 'approved') {
        statusEl.textContent = 'You’re in! Opening Asal’s garden…';
        try { localStorage.setItem('nx_tv', '1'); } catch (e) {}   // this screen listens for the phone remote
        location.replace('/app/');
        return;
      }
      if (j.status === 'expired') { start(); return; }
      pollTimer = setTimeout(poll, 3000);
    }).catch(function () { pollTimer = setTimeout(poll, 5000); });
  }
  function tick() {
    if (!current) return;
    var s = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
    timerEl.textContent = 'A new code appears in ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  // Already signed in on this TV? Go straight to the app.
  fetch('/api/auth/me', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (j && j.signedIn && j.user.hasAccess) { if (!embed) location.replace('/app/'); return; }
      if (embed) { embed.hidden = false; var link = document.querySelector('.tv-card-link'); if (link) link.hidden = true; }
      start();
    })
    .catch(function () { if (embed) embed.hidden = false; start(); });
  tickTimer = setInterval(tick, 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && current && Date.now() > expiresAt) start(); });
})();
