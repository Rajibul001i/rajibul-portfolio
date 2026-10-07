// Apply the saved theme (and a paused background) before the first paint, so the page never
// flashes the wrong one, and mark that JavaScript is running (the scroll-reveal and entry
// styles depend on it).
(function () {
  try {
    if (localStorage.getItem('theme') === 'light') document.documentElement.dataset.theme = 'light';
    if (localStorage.getItem('sky') === 'paused') document.documentElement.dataset.sky = 'paused';
  } catch (e) {}
  document.documentElement.classList.add('js');
})();
