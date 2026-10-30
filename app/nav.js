// Moving between screens. On phones and computers this is the usual #/ address, so Back and links work.
// On a TV (signed in with a code, see assets/tv.js) the address stays nectaraschool.org/app/ the whole time:
// TV browsers save every address they visit as its own tile or history entry, so a lesson with 12 pages
// left 12 "copies". Here the screens change but the address never does, so the TV keeps just one.
// Written in ES5 like the rest of the app.
(function () {
  'use strict';
  var tv = false;
  try { tv = localStorage.getItem('nx_tv') === '1' || /[?&]tv=1/.test(location.search); } catch (e) {}
  var cur = location.hash || '#/';
  function fire() { var e = document.createEvent('Event'); e.initEvent('hashchange', false, false); window.dispatchEvent(e); }
  var NX = {
    tv: tv,
    hash: function () { return tv ? cur : location.hash; },
    go: function (h) {
      if (!tv) { location.hash = h; return; }
      if (h === cur) return;
      cur = h; fire();
    }
  };
  window.NX = NX;
  if (tv) {
    if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
    // Links like <a href="#/world"> change the screen, not the address.
    document.addEventListener('click', function (e) {
      var a = e.target;
      while (a && a.tagName !== 'A') a = a.parentNode;
      if (!a || !a.getAttribute) return;
      var h = a.getAttribute('href');
      if (h && h.charAt(0) === '#') { e.preventDefault(); NX.go(h); }
    }, true);
  }
})();
