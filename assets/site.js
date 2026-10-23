// Mobile menu
(function () {
  var btn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
})();

// Interest form: posts to the Cloudflare Pages Function at /api/interest
(function () {
  var form = document.getElementById('interest-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var params = new URLSearchParams(location.search);
  var preset = params.get('as');
  if (preset) { var r = form.querySelector('input[name="role"][value="' + preset + '"]'); if (r) r.checked = true; }

  function show(msg, isErr) {
    status.hidden = false;
    status.textContent = msg;
    status.className = 'status' + (isErr ? ' err' : '');
    status.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var data = Object.fromEntries(new FormData(form).entries());
    data.ages = Array.from(form.querySelectorAll('input[name="ages"]:checked')).map(function (i) { return i.value; });
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch('/api/interest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (res) {
        if (res.status === 404 || res.status === 405) throw new Error('preview');
        return res.json().then(function (j) { if (!res.ok) throw new Error(j.error || 'failed'); return j; });
      })
      .then(function () {
        form.reset();
        show('Thank you! You’re on the founding list. We’ll write to you as soon as dates, location and details are ready.');
      })
      .catch(function (err) {
        if (err.message === 'preview') show('This is a preview. The form starts saving sign-ups once the site is live on nectaraschool.org.', true);
        else show('That didn’t go through: ' + err.message + '. Please check your details and try again.', true);
      })
      .finally(function () { btn.disabled = false; btn.textContent = 'Join the founding list'; });
  });
})();

// Show/hide button on every password box, so typos (especially with a TV remote) are easy to spot.
(function () {
  document.querySelectorAll('input[type="password"]').forEach(function (input) {
    var wrap = document.createElement('div');
    wrap.className = 'pw-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'pw-toggle'; b.textContent = 'Show';
    b.setAttribute('aria-label', 'Show password'); b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      b.textContent = showing ? 'Show' : 'Hide';
      b.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      b.setAttribute('aria-pressed', showing ? 'false' : 'true');
      input.focus();
    });
    wrap.appendChild(b);
  });
})();

// TV remote Back button on the website pages (LG webOS keyCode 461): go back a page, or exit the TV app.
document.addEventListener('keydown', function (e) {
  if (e.keyCode !== 461) return;
  e.preventDefault();
  if (history.length > 1) history.back(); else { try { window.close(); } catch (err) {} }
});
