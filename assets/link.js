// Phone side of TV sign-in: a signed-in parent approves the code showing on the TV.
(function () {
  'use strict';
  var form = document.getElementById('link-form');
  if (!form) return;
  var msg = document.getElementById('link-msg');
  var input = document.getElementById('lk-code');
  var params = new URLSearchParams(location.search);
  var preset = (params.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (preset) input.value = preset;

  function say(t, err) { msg.hidden = !t; msg.textContent = t || ''; msg.className = 'status' + (err ? ' err' : ''); if (t) msg.focus(); }
  function show(id) { ['link-form', 'link-signin', 'link-done'].forEach(function (f) { document.getElementById(f).hidden = f !== id; }); }

  fetch('/api/auth/me', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.signedIn) {
      document.getElementById('lk-signin').href = 'login.html?next=' + encodeURIComponent('/link.html' + (preset ? '?code=' + preset : ''));
      show('link-signin'); return;
    }
    if (!j.user.hasAccess) { say('Your account doesn’t have app access yet. Add your invite code on the sign-in page first.', true); return; }
    document.getElementById('lk-who').textContent = 'Signed in as ' + j.user.email + '.';
    if (!preset) input.focus();
  }).catch(function () {});

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) { say('The TV code has 6 letters and numbers.', true); return; }
    var b = form.querySelector('button[type="submit"]'); b.disabled = true; b.textContent = 'Letting it in…';
    fetch('/api/tv/approve', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'something went wrong'); return j; }); })
      .then(function () { say(''); show('link-done'); })
      .catch(function (err) { say(err.message.charAt(0).toUpperCase() + err.message.slice(1) + '.', true); })
      .finally(function () { b.disabled = false; b.textContent = 'Allow this TV'; });
  });
})();
