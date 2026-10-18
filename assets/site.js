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
