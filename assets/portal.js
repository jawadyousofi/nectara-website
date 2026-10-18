// Members sign-in page: sign in, create an account, redeem an invite code, sign out.
(function () {
  'use strict';
  var msg = document.getElementById('portal-msg');
  if (!msg) return;
  var params = new URLSearchParams(location.search);
  var nextPath = params.get('next') || '/app/';
  if (!/^\/app\//.test(nextPath)) nextPath = '/app/';

  function show(panel) {
    ['signin', 'signup', 'forgot', 'waiting', 'in'].forEach(function (p) { document.getElementById('panel-' + p).hidden = p !== panel; });
  }
  function say(text, isErr) {
    msg.hidden = !text; msg.textContent = text || ''; msg.className = 'status' + (isErr ? ' err' : '');
    if (text) msg.focus();
  }
  function post(path, body) {
    return fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then(function (r) {
        if (r.status === 404 || r.status === 405) throw new Error('accounts aren’t switched on in this preview');
        return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'something went wrong'); return j; });
      });
  }
  function afterAuth(user) {
    if (user.hasAccess) { location.href = nextPath; return; }
    say(''); show('waiting');
  }
  function busy(form, on, label) {
    var b = form.querySelector('button[type="submit"]');
    if (!b.dataset.label) b.dataset.label = b.textContent;
    b.disabled = on; b.textContent = on ? label : b.dataset.label;
  }
  function data(form) { return Object.fromEntries(new FormData(form).entries()); }

  document.querySelectorAll('[data-show]').forEach(function (b) {
    b.addEventListener('click', function () { say(''); show(b.getAttribute('data-show')); var f = document.querySelector('#panel-' + b.getAttribute('data-show') + ' input'); if (f) f.focus(); });
  });
  document.querySelectorAll('[data-signout]').forEach(function (b) {
    b.addEventListener('click', function () { post('/api/auth/logout').finally(function () { show('signin'); say('You’re signed out.'); }); });
  });

  var signin = document.getElementById('signin-form');
  signin.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!signin.reportValidity()) return;
    busy(signin, true, 'Signing in…');
    post('/api/auth/login', data(signin)).then(function (j) { afterAuth(j.user); })
      .catch(function (err) { say('Couldn’t sign in: ' + err.message + '.', true); })
      .finally(function () { busy(signin, false); });
  });

  var signup = document.getElementById('signup-form');
  signup.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!signup.reportValidity()) return;
    var d = data(signup);
    busy(signup, true, 'Creating…');
    post('/api/auth/signup', d).then(function (j) {
      if (d.code && !j.codeAccepted) { show('waiting'); say('Your account is ready, but that invite code didn’t match. Check it and try again below.', true); return; }
      afterAuth(j.user);
    })
      .catch(function (err) { say('Couldn’t create the account: ' + err.message + '.', true); })
      .finally(function () { busy(signup, false); });
  });

  var forgot = document.getElementById('forgot-form');
  forgot.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!forgot.reportValidity()) return;
    busy(forgot, true, 'Sending…');
    post('/api/auth/forgot', data(forgot)).then(function (j) {
      if (j.emailEnabled === false) { say('Email resets aren’t switched on yet. Send Nectara a note through the join page and we’ll send you a reset link.', true); return; }
      forgot.reset(); show('signin');
      say('If there’s an account for that email, a reset link is on its way. Check your inbox (and spam folder). The link expires in an hour.');
    })
      .catch(function (err) { say('Couldn’t send the link: ' + err.message + '.', true); })
      .finally(function () { busy(forgot, false); });
  });

  var codeForm = document.getElementById('code-form');
  codeForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!codeForm.reportValidity()) return;
    busy(codeForm, true, 'Checking…');
    post('/api/auth/code', data(codeForm)).then(function () { location.href = nextPath; })
      .catch(function (err) { say(err.message.charAt(0).toUpperCase() + err.message.slice(1) + '.', true); })
      .finally(function () { busy(codeForm, false); });
  });

  // Starting state
  if (params.get('signedout')) say('You’re signed out.');
  if (params.get('forgot')) show('forgot');
  fetch('/api/auth/me', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.signedIn) { if (params.get('new')) show('signup'); return; }
    if (j.user.hasAccess) {
      var first = (j.user.name || '').split(' ')[0];
      document.getElementById('in-hello').textContent = first ? 'Welcome back, ' + first : 'You’re signed in';
      show('in');
    } else { show('waiting'); }
  }).catch(function () {});
})();
