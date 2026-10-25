// Members admin: list accounts and change who can open the app. Uses the ADMIN_TOKEN secret as a bearer key.
(function () {
  'use strict';
  var form = document.getElementById('admin-login');
  if (!form) return;
  var list = document.getElementById('admin-list');
  var msg = document.getElementById('admin-msg');
  var input = document.getElementById('ad-token');
  var LEVELS = ['waiting', 'founding', 'member', 'staff', 'paused'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  try { input.value = sessionStorage.getItem('nx_admin') || ''; } catch (e) {}

  function say(t, err) { msg.hidden = !t; msg.textContent = t || ''; msg.className = 'status' + (err ? ' err' : ''); }
  function call(method, body) {
    return fetch('/api/admin/members', { method: method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + input.value.trim() }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'failed'); return j; }); });
  }
  // ---------- Founding-family codes ----------
  var inviteArea = document.getElementById('invite-area');
  function callInv(method, body) {
    return fetch('/api/admin/invites', { method: method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + input.value.trim() }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'failed'); return j; }); });
  }
  function inviteMessage(inv) {
    return 'Hi! Here is your Nectara founding family code: ' + inv.code + '\n\nTo join: go to ' + location.origin + '/login.html, choose "Create account", and enter it as your invite code. On a TV, open ' + location.origin + '/tv and scan the code with your phone.\n\nWelcome to the hive!';
  }
  function copyText(text, btn) {
    var done = function () { var t = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = t; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    else fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); done(); }
  }
  function loadInvites() {
    callInv('GET').then(function (j) {
      inviteArea.innerHTML = '<section class="invite-card"><h2>Founding family codes</h2>' +
        '<p>Make one code per family. Send it to them, and they enter it when they create their account. Each code works for the number of accounts you choose (one per family is best), then stops.</p>' +
        '<form id="invite-form" class="invite-form" novalidate><div class="field"><label for="inv-label">Family name</label><input id="inv-label" maxlength="80" required placeholder="e.g. The Rahimi family"></div>' +
        '<div class="field"><label for="inv-max">Accounts</label><select id="inv-max"><option value="1">1 (one parent)</option><option value="2">2 (both parents)</option><option value="3">3</option><option value="5">5</option><option value="10">10</option></select></div>' +
        '<button class="btn" type="submit">Make a code</button></form>' +
        '<div id="inv-new" class="invite-new" hidden></div>' +
        (j.invites.length ? '<div class="admin-wrap"><table class="admin-table"><thead><tr><th>Family</th><th>Code</th><th>Used</th><th>Made</th><th></th></tr></thead><tbody>' +
          j.invites.map(function (v) {
            var state = v.revoked ? '<span class="pill off">Turned off</span>' : (v.used.length >= v.max ? '<span class="pill done">Used</span>' : '<span class="pill">' + (v.max - v.used.length) + ' left</span>');
            return '<tr><td>' + esc(v.label) + '</td><td><code>' + esc(v.code) + '</code></td><td>' + state + (v.used.length ? '<br><small>' + v.used.map(esc).join(', ') + '</small>' : '') + '</td><td>' + esc((v.created || '').slice(0, 10)) + '</td><td>' +
              (v.revoked ? '' : '<button class="linklike" type="button" data-copy="' + esc(v.code) + '" data-label="' + esc(v.label) + '">Copy message</button> &middot; <button class="linklike" type="button" data-revoke="' + esc(v.code) + '">Turn off</button>') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<p class="hint">No codes yet.</p>') + '</section>';
      document.getElementById('invite-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var lab = document.getElementById('inv-label');
        if (!lab.value.trim()) { lab.focus(); return; }
        callInv('POST', { label: lab.value.trim(), max: document.getElementById('inv-max').value }).then(function (r) {
          var inv = r.invite;
          loadInvites();
          setTimeout(function () {
            var box = document.getElementById('inv-new'); if (!box) return;
            box.hidden = false;
            box.innerHTML = '<p>Code for <b>' + esc(inv.label) + '</b>:</p><div class="big-code">' + esc(inv.code) + '</div>' +
              '<textarea readonly rows="5" aria-label="Message to send">' + esc(inviteMessage(inv)) + '</textarea>' +
              '<div class="row-btns"><button class="btn" type="button" id="inv-copy-msg">Copy message</button><button class="btn quiet" type="button" id="inv-copy-code">Copy code only</button></div>';
            document.getElementById('inv-copy-msg').addEventListener('click', function () { copyText(inviteMessage(inv), this); });
            document.getElementById('inv-copy-code').addEventListener('click', function () { copyText(inv.code, this); });
            box.scrollIntoView({ block: 'nearest' });
          }, 400);
        }).catch(function (err) { say('Couldn’t make a code: ' + err.message, true); });
      });
      [].forEach.call(inviteArea.querySelectorAll('[data-copy]'), function (b) {
        b.addEventListener('click', function () { copyText(inviteMessage({ code: b.getAttribute('data-copy'), label: b.getAttribute('data-label') }), b); });
      });
      [].forEach.call(inviteArea.querySelectorAll('[data-revoke]'), function (b) {
        b.addEventListener('click', function () {
          if (b.getAttribute('data-sure') !== '1') { b.setAttribute('data-sure', '1'); b.textContent = 'Tap again to turn off'; return; }
          callInv('POST', { code: b.getAttribute('data-revoke'), revoke: true }).then(loadInvites).catch(function (err) { say('Couldn’t turn it off: ' + err.message, true); });
        });
      });
    }).catch(function (err) { inviteArea.innerHTML = '<p class="status err">Couldn’t load founding codes: ' + esc(err.message) + '</p>'; });
  }

  function load() {
    say('Loading…');
    call('GET').then(function (j) {
      try { sessionStorage.setItem('nx_admin', input.value.trim()); } catch (e) {}
      loadInvites();
      var counts = {};
      j.members.forEach(function (m) { counts[m.access] = (counts[m.access] || 0) + 1; });
      var mailNote = j.lastMailError ? ' · Last email problem (' + j.lastMailError.at.slice(0, 16).replace('T', ' ') + ' UTC): ' + (j.lastMailError.status || '') + ' ' + j.lastMailError.detail : '';
      say(j.members.length + ' accounts · ' + LEVELS.filter(function (l) { return counts[l]; }).map(function (l) { return counts[l] + ' ' + l; }).join(' · ') + mailNote, !!j.lastMailError);
      list.innerHTML = '<div class="admin-wrap"><table class="admin-table"><thead><tr><th>Parent</th><th>Email</th><th>Child</th><th>Joined</th><th>Access</th><th>Password</th></tr></thead><tbody>' +
        j.members.map(function (m) {
          var kid = (m.children || []).map(function (c) { return esc(c.name || '') + (c.age ? ' (' + esc(c.age) + ')' : ''); }).join(', ');
          return '<tr><td>' + esc(m.name) + '</td><td>' + esc(m.email) + '</td><td>' + kid + '</td><td>' + esc((m.created || '').slice(0, 10)) + '</td><td><select data-email="' + esc(m.email) + '" aria-label="Access for ' + esc(m.email) + '">' +
            LEVELS.map(function (l) { return '<option' + (l === m.access ? ' selected' : '') + '>' + l + '</option>'; }).join('') + '</select></td>' +
            '<td><button class="linklike" type="button" data-reset="' + esc(m.email) + '">Reset link</button></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div id="reset-box" class="status" hidden style="margin-top:16px;display:grid;gap:10px"><p></p><div style="display:flex;gap:10px;flex-wrap:wrap"><input readonly aria-label="Reset link" style="flex:1 1 280px"><button class="btn" type="button" id="copy-reset">Copy</button></div></div>';
      var copy = document.getElementById('copy-reset');
      copy.addEventListener('click', function () {
        var f = document.querySelector('#reset-box input'); f.select();
        (navigator.clipboard ? navigator.clipboard.writeText(f.value) : Promise.reject()).then(function () { copy.textContent = 'Copied'; }, function () { document.execCommand('copy'); copy.textContent = 'Copied'; });
        setTimeout(function () { copy.textContent = 'Copy'; }, 2000);
      });
      list.querySelectorAll('[data-reset]').forEach(function (b) {
        b.addEventListener('click', function () {
          var email = b.getAttribute('data-reset');
          fetch('/api/admin/reset-link', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + input.value.trim() }, body: JSON.stringify({ email: email }) })
            .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'failed'); return j; }); })
            .then(function (j) {
              var box = document.getElementById('reset-box');
              box.hidden = false;
              box.querySelector('p').textContent = 'Reset link for ' + j.email + ' (works once, expires in 24 hours). Send it to them by email or text:';
              var field = box.querySelector('input'); field.value = j.link; field.select();
              box.scrollIntoView({ block: 'nearest' });
            })
            .catch(function (e) { say('Couldn’t make a link: ' + e.message, true); });
        });
      });
      list.querySelectorAll('select[data-email]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          call('POST', { email: sel.getAttribute('data-email'), access: sel.value })
            .then(function (r) { say('Saved: ' + r.email + ' is now ' + r.access + '.'); })
            .catch(function (e) { say('Couldn’t save: ' + e.message, true); });
        });
      });
    }).catch(function (e) { list.innerHTML = ''; say(e.message === 'not allowed' ? 'That admin key isn’t right (or the ADMIN_TOKEN secret isn’t set yet).' : 'Couldn’t load: ' + e.message, true); });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); if (form.reportValidity()) load(); });
  if (input.value) load();
})();
