// Choose a new password from a one-time reset link (reset.html?token=…).
(function () {
  'use strict';
  var form = document.getElementById('reset-form');
  if (!form) return;
  var msg = document.getElementById('reset-msg');
  var token = new URLSearchParams(location.search).get('token') || '';
  function say(t, err) { msg.hidden = !t; msg.textContent = t || ''; msg.className = 'status' + (err ? ' err' : ''); if (t) msg.focus(); }
  if (!/^[0-9a-f]{64}$/.test(token)) say('This reset link isn’t complete. Open the link from your email again, or ask for a new one from the sign-in page.', true);
  // Keep the token out of the address bar (and out of browser history) once it's read.
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var d = Object.fromEntries(new FormData(form).entries());
    if (d.password !== d.confirm) { say('The two passwords don’t match. Please type them again.', true); return; }
    var btn = form.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Saving…';
    fetch('/api/auth/reset', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token, password: d.password }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'something went wrong'); return j; }); })
      .then(function (j) {
        say('Your new password is saved. Opening the garden…');
        setTimeout(function () { location.href = j.user && j.user.hasAccess ? '/app/' : '/login.html'; }, 900);
      })
      .catch(function (err) { say(err.message.charAt(0).toUpperCase() + err.message.slice(1) + '.', true); btn.disabled = false; btn.textContent = 'Save and sign in'; });
  });
})();
