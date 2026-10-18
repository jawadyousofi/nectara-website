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
  function load() {
    say('Loading…');
    call('GET').then(function (j) {
      try { sessionStorage.setItem('nx_admin', input.value.trim()); } catch (e) {}
      var counts = {};
      j.members.forEach(function (m) { counts[m.access] = (counts[m.access] || 0) + 1; });
      say(j.members.length + ' accounts · ' + LEVELS.filter(function (l) { return counts[l]; }).map(function (l) { return counts[l] + ' ' + l; }).join(' · '));
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
