// Documents: Jawad's private library of Nectara documents. Shown only to the owner account (access "owner");
// the server refuses everyone else. Links (Google Docs, Claude docs, Drive) and uploaded files, sorted by
// category. Deleting moves a document to the Archive, where it can be restored or removed for good.
// Written in ES5 like the rest of the app. Route: #/docs
(function () {
  'use strict';
  var root = document.getElementById('root');
  var S = { docs: null, cats: [], filter: '', showArchive: false, busy: false, msg: '' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var day = function (iso) { try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; } };
  var size = function (n) { return !n ? '' : n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB'; };
  var where = function (u) { return /docs\.google\.com|drive\.google\.com/.test(u) ? 'Google Drive' : /claude\.ai/.test(u) ? 'Claude doc' : 'Link'; };

  function api(method, body) {
    return fetch('/api/docs', { method: method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Something went wrong'); return j; }); });
  }
  function load() {
    return api('GET').then(function (j) { S.docs = j.docs; S.cats = j.categories; render(); })
      .catch(function (e) { S.docs = []; S.msg = e.message; render(); });
  }
  function act(body, note) {
    S.busy = true; render();
    return api('POST', body).then(function () { S.msg = note || ''; S.busy = false; return load(); })
      .catch(function (e) { S.busy = false; S.msg = e.message; render(); });
  }

  function row(d) {
    var open = d.kind === 'file' ? '/api/docs/file?id=' + encodeURIComponent(d.id) : d.url;
    var meta = d.kind === 'file' ? (d.type || 'File') + ' · ' + size(d.size) : where(d.url);
    return '<li class="dc-row">' +
      '<a class="dc-main" href="' + esc(open) + '" target="_blank" rel="noopener noreferrer"><b>' + esc(d.title) + '</b>' +
      (d.note ? '<span class="dc-note">' + esc(d.note) + '</span>' : '') +
      '<small>' + esc(d.category) + ' · ' + esc(meta) + ' · added ' + day(d.created) + (d.archived ? ' · archived ' + day(d.archived) : '') + '</small></a>' +
      '<span class="dc-acts">' +
      (d.kind === 'file' && !d.archived ? '<a class="btn ghost small" href="' + esc(open) + '&download=1">Download</a>' : '') +
      (d.archived
        ? '<button class="btn ghost small" type="button" data-restore="' + esc(d.id) + '">Restore</button><button class="linkbtn" type="button" data-forever="' + esc(d.id) + '">Delete for good</button>'
        : '<button class="linkbtn" type="button" data-edit="' + esc(d.id) + '">Edit</button><button class="linkbtn" type="button" data-archive="' + esc(d.id) + '">Archive</button>') +
      '</span></li>';
  }

  function render() {
    if (!S.active) return;
    var all = S.docs || [];
    var live = all.filter(function (d) { return !d.archived; }), archived = all.filter(function (d) { return d.archived; });
    var shown = live.filter(function (d) { return !S.filter || d.category === S.filter; });
    var groups = {};
    shown.forEach(function (d) { (groups[d.category] = groups[d.category] || []).push(d); });
    var opts = S.cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    root.innerHTML =
      '<div class="home dc">' +
      '<header class="topbar"><a class="brand" href="#/"><img src="/assets/logo-mark.svg" alt="" width="52" height="37"><span><b>nectara</b><small>Documents</small></span></a>' +
      '<div class="who"><a class="btn ghost" href="#/" style="min-height:44px;padding:0 16px">Back to the app</a></div></header>' +
      '<section class="dc-head"><h1>Documents</h1><p>Your private Nectara library: plans, curriculum, partners and legal papers. Only you can see this page; families and staff can&rsquo;t.</p></section>' +
      (S.msg ? '<p class="dc-msg" role="status">' + esc(S.msg) + '</p>' : '') +
      '<div class="dc-filter">' + ['', ].concat(S.cats).map(function (c) {
        var n = c ? live.filter(function (d) { return d.category === c; }).length : live.length;
        return (c && !n) ? '' : '<button type="button" class="dc-chip' + (S.filter === c ? ' on' : '') + '" data-filter="' + esc(c) + '">' + (c ? esc(c) : 'All') + ' (' + n + ')</button>';
      }).join('') + '</div>' +
      (S.docs === null ? '<p class="loading">Loading…</p>' : !shown.length ? '<p class="dc-empty">No documents here yet.</p>' :
        Object.keys(groups).map(function (c) { return '<h2 class="dc-cat">' + esc(c) + '</h2><ul class="dc-list">' + groups[c].map(row).join('') + '</ul>'; }).join('')) +
      '<section class="dc-add"><h2>Add a document</h2>' +
      '<form id="dc-link" class="dc-form"><b>A link</b><input name="url" type="url" placeholder="https://docs.google.com/…" required>' +
      '<input name="title" placeholder="Title (optional)" maxlength="120"><select name="category">' + opts + '</select>' +
      '<input name="note" placeholder="Note (optional)" maxlength="500"><button class="btn" type="submit"' + (S.busy ? ' disabled' : '') + '>Add link</button></form>' +
      '<form id="dc-file" class="dc-form"><b>A file</b><input name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.pptx,.jpg,.jpeg,.png,.webp,.txt,.csv" required>' +
      '<input name="title" placeholder="Title (optional)" maxlength="120"><select name="category">' + opts + '</select>' +
      '<input name="note" placeholder="Note (optional)" maxlength="500"><button class="btn" type="submit"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Saving…' : 'Upload') + '</button>' +
      '<small>PDF, Word, Excel, PowerPoint, images or text, up to 20 MB.</small></form></section>' +
      '<section class="dc-archive"><button type="button" class="linkbtn" id="dc-toggle">' + (S.showArchive ? 'Hide the Archive' : 'Archive (' + archived.length + ')') + '</button>' +
      (S.showArchive ? (archived.length ? '<p class="dc-note">Archived documents are kept until you delete them for good, and can be restored any time.</p><ul class="dc-list">' + archived.map(row).join('') + '</ul>' : '<p class="dc-empty">Nothing archived.</p>') : '') +
      '</section></div>';
    wire();
  }

  function wire() {
    [].forEach.call(root.querySelectorAll('[data-filter]'), function (b) { b.addEventListener('click', function () { S.filter = b.getAttribute('data-filter'); render(); }); });
    [].forEach.call(root.querySelectorAll('[data-archive]'), function (b) { b.addEventListener('click', function () { act({ id: b.getAttribute('data-archive'), archive: true }, 'Moved to the Archive. You can restore it any time.'); }); });
    [].forEach.call(root.querySelectorAll('[data-restore]'), function (b) { b.addEventListener('click', function () { act({ id: b.getAttribute('data-restore'), restore: true }, 'Restored.'); }); });
    [].forEach.call(root.querySelectorAll('[data-forever]'), function (b) {
      b.addEventListener('click', function () { if (window.confirm('Delete this document for good? This can’t be undone.')) act({ id: b.getAttribute('data-forever'), deleteForever: true }, 'Deleted for good.'); });
    });
    [].forEach.call(root.querySelectorAll('[data-edit]'), function (b) {
      b.addEventListener('click', function () {
        var d = (S.docs || []).filter(function (x) { return x.id === b.getAttribute('data-edit'); })[0]; if (!d) return;
        var t = window.prompt('Title', d.title); if (t === null) return;
        var n = window.prompt('Note (optional)', d.note || ''); if (n === null) return;
        var c = window.prompt('Category: ' + S.cats.join(', '), d.category); if (c === null) return;
        act({ id: d.id, title: t, note: n, category: c }, 'Saved.');
      });
    });
    var tg = document.getElementById('dc-toggle'); if (tg) tg.addEventListener('click', function () { S.showArchive = !S.showArchive; render(); });
    var fl = document.getElementById('dc-link');
    if (fl) fl.addEventListener('submit', function (e) {
      e.preventDefault();
      act({ kind: 'link', url: fl.url.value.trim(), title: fl.title.value.trim(), category: fl.category.value, note: fl.note.value.trim() }, 'Link added.');
    });
    var ff = document.getElementById('dc-file');
    if (ff) ff.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = ff.file.files && ff.file.files[0]; if (!f) return;
      if (f.size > 20 * 1024 * 1024) { S.msg = 'That file is over 20 MB.'; render(); return; }
      var meta = { title: ff.title.value.trim(), category: ff.category.value, note: ff.note.value.trim() };
      var rd = new FileReader();
      rd.onload = function () {
        var b64 = String(rd.result).split(',')[1] || '';
        act({ kind: 'file', name: f.name, mime: f.type || '', media: b64, title: meta.title, category: meta.category, note: meta.note }, 'Uploaded.');
      };
      rd.onerror = function () { S.msg = 'That file could not be read.'; render(); };
      rd.readAsDataURL(f);
    });
  }

  function open() { S.active = true; S.msg = ''; document.title = 'Documents · Nectara'; render(); load(); window.scrollTo(0, 0); }
  function close() { S.active = false; }
  window.NectaraDocs = { open: open, close: close };
})();
