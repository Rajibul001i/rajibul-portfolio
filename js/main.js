// Page behaviour: footer year, theme toggle, phone menu, reveal on scroll, and
// highlighting the menu item for the section in view.
(function () {
  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Theme toggle: dark by default; remembers the visitor's choice.
  var root = document.documentElement;
  document.getElementById('theme-btn').addEventListener('click', function () {
    var light = root.dataset.theme === 'light';
    if (light) delete root.dataset.theme; else root.dataset.theme = 'light';
    try { localStorage.setItem('theme', light ? 'dark' : 'light'); } catch (e) {}
    window.dispatchEvent(new Event('themechange'));
  });

  // Mobile menu
  var menuBtn = document.getElementById('menu-btn');
  var links = document.getElementById('nav-links');
  function setMenu(open) {
    links.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!links.classList.contains('open')); });
  links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Reveal on scroll. Without JavaScript everything is simply visible.
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }


  // React islands: load the PulseHR screens carousel (islands/, built from src/) only
  // when its section comes within a screen or so, so the first load stays small. Until
  // then, and if it fails or JavaScript is off, the plain screenshot grid shows.
  var island = document.querySelector('[data-island="pulsehr-gallery"]');
  if (island && 'IntersectionObserver' in window) {
    var load = new IntersectionObserver(function (entries) {
      if (!entries.some(function (en) { return en.isIntersecting; })) return;
      load.disconnect();
      import(new URL('islands/pulsehr-gallery.js', document.baseURI).href).catch(function () {});
    }, { rootMargin: '900px 0px' });
    load.observe(island);
  }

  // Highlight the section in view
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });
  }
})();
