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

  // Every button on this page shares one shape: a soft colored pill with a little icon that lifts on hover.
  var I = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; };
  var ICO = {
    print: I('M7 9V4h10v5M6 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-2M7 14h10v6H7z'),
    email: I('M3 6h18v12H3zM3 7l9 7 9-7'),
    download: I('M12 4v11M7 10l5 5 5-5M5 20h14'),
    edit: I('M4 20l1-5L16 4l4 4L9 19zM14 6l4 4'),
    archive: I('M3 5h18v4H3zM5 9v10h14V9M10 13h4'),
    restore: I('M4 12a8 8 0 1 0 3-6.2M4 4v5h5'),
    trash: I('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3'),
    link: I('M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1'),
    upload: I('M12 20V9M7 14l5-5 5 5M5 4h14'),
    box: I('M3 5h18v4H3zM5 9v10h14V9')
  };
  function btn(kind, id, color, icon, label) { return '<button class="dc-btn ' + color + '" type="button" data-' + kind + '="' + esc(id) + '">' + icon + label + '</button>'; }

  function row(d) {
    var open = d.kind === 'file' ? '/api/docs/file?id=' + encodeURIComponent(d.id) : d.url;
    var meta = d.kind === 'file' ? (d.type || 'File') + ' · ' + size(d.size) : where(d.url);
    return '<li class="dc-row">' +
      '<a class="dc-main" href="' + esc(open) + '" target="_blank" rel="noopener noreferrer"><b>' + esc(d.title) + '</b>' +
      (d.note ? '<span class="dc-note">' + esc(d.note) + '</span>' : '') +
      '<small>' + esc(d.category) + ' · ' + esc(meta) + ' · added ' + day(d.created) + (d.archived ? ' · archived ' + day(d.archived) : '') + '</small></a>' +
      '<span class="dc-acts">' +
      (d.kind === 'file' && !d.archived ? '<a class="dc-btn c-leaf" href="' + esc(open) + '&download=1">' + ICO.download + 'Download</a>' : '') +
      (!d.archived ? btn('print', d.id, 'c-sky', ICO.print, 'Print') + btn('email', d.id, 'c-honey', ICO.email, 'Email') : '') +
      (d.archived
        ? btn('restore', d.id, 'c-leaf', ICO.restore, 'Restore') + btn('forever', d.id, 'c-red', ICO.trash, 'Delete for good')
        : btn('edit', d.id, 'c-lilac', ICO.edit, 'Edit') + btn('archive', d.id, 'c-rose', ICO.archive, 'Archive')) +
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
      '<div class="who"><a class="dc-btn c-sky" href="#/">Back to the app</a></div></header>' +
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
      '<input name="note" placeholder="Note (optional)" maxlength="500"><button class="dc-btn c-honey big" type="submit"' + (S.busy ? ' disabled' : '') + '>' + ICO.link + 'Add link</button></form>' +
      '<form id="dc-file" class="dc-form"><b>A file</b><input name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.pptx,.jpg,.jpeg,.png,.webp,.txt,.csv" required>' +
      '<input name="title" placeholder="Title (optional)" maxlength="120"><select name="category">' + opts + '</select>' +
      '<input name="note" placeholder="Note (optional)" maxlength="500"><button class="dc-btn c-honey big" type="submit"' + (S.busy ? ' disabled' : '') + '>' + ICO.upload + (S.busy ? 'Saving…' : 'Upload') + '</button>' +
      '<small>PDF, Word, Excel, PowerPoint, images or text, up to 20 MB.</small></form></section>' +
      '<section class="dc-archive"><button type="button" class="dc-btn c-rose" id="dc-toggle">' + ICO.box + '' + (S.showArchive ? 'Hide the Archive' : 'Archive (' + archived.length + ')') + '</button>' +
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
    [].forEach.call(root.querySelectorAll('[data-print]'), function (b) { b.addEventListener('click', function () { printDoc(find(b.getAttribute('data-print'))); }); });
    [].forEach.call(root.querySelectorAll('[data-email]'), function (b) { b.addEventListener('click', function () { emailDoc(find(b.getAttribute('data-email'))); }); });
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

  function find(id) { return (S.docs || []).filter(function (x) { return x.id === id; })[0]; }
  var PRINTABLE = /^(application\/pdf|image\/|text\/)/;
  // Print: PDFs, pictures and text print right here; Word, Excel and links open in a new tab to print from there.
  function printDoc(d) {
    if (!d) return;
    if (d.kind === 'file' && PRINTABLE.test(d.mime || '')) {
      var old = document.getElementById('dc-print'); if (old) old.parentNode.removeChild(old);
      var f = document.createElement('iframe');
      f.id = 'dc-print'; f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';
      f.onload = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { window.open(f.src, '_blank'); } };
      f.src = '/api/docs/file?id=' + encodeURIComponent(d.id);
      document.body.appendChild(f);
      S.msg = 'Opening the print window for “' + d.title + '”…'; render();
      return;
    }
    window.open(d.kind === 'file' ? '/api/docs/file?id=' + encodeURIComponent(d.id) : d.url, '_blank', 'noopener');
    S.msg = 'Opened “' + d.title + '” in a new tab. Print it from there (Cmd+P on a Mac, Ctrl+P on Windows).'; render();
  }
  // Email: opens your email app with the title and a link filled in; you choose who it goes to.
  // Uploaded files get a link that anyone can open for 7 days. Google Docs keep their own sharing settings.
  function emailDoc(d) {
    if (!d) return;
    var go = function (url, extra) {
      var body = d.title + (d.note ? '\n' + d.note : '') + '\n\n' + url + (extra ? '\n\n' + extra : '');
      window.location.href = 'mailto:?subject=' + encodeURIComponent(d.title) + '&body=' + encodeURIComponent(body);
    };
    if (d.kind !== 'file') { go(d.url, /docs\.google\.com|drive\.google\.com/.test(d.url) ? 'Make sure this Google Doc is shared with you.' : ''); return; }
    if (!window.confirm('Email “' + d.title + '”? This makes a link anyone with it can open for 7 days.')) return;
    api('POST', { id: d.id, share: true }).then(function (j) { go(j.url, 'This link works for 7 days.'); })
      .catch(function (e) { S.msg = e.message; render(); });
  }

  function open() { S.active = true; S.msg = ''; document.title = 'Documents · Nectara'; render(); load(); window.scrollTo(0, 0); }
  function close() { S.active = false; }
  window.NectaraDocs = { open: open, close: close };
})();
