// Apply the saved theme before the first paint, so the page never flashes the wrong one,
// and mark that JavaScript is running (the scroll-reveal styles depend on it).
(function () {
  try {
    if (localStorage.getItem('theme') === 'light') document.documentElement.dataset.theme = 'light';
  } catch (e) {}
  document.documentElement.classList.add('js');
})();
