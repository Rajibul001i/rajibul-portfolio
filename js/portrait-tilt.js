// 3D tilt on the portrait, for a mouse or trackpad
(function () {
  var wrap = document.getElementById('portrait'), stage = document.getElementById('p3d');
  if (!wrap || !stage) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  wrap.addEventListener('pointermove', function (e) {
    var b = wrap.getBoundingClientRect();
    var x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
    stage.classList.add('tilting');
    stage.style.setProperty('--ry', (x * 18).toFixed(2) + 'deg');
    stage.style.setProperty('--rx', (-y * 12).toFixed(2) + 'deg');
  });
  wrap.addEventListener('pointerleave', function () {
    stage.classList.remove('tilting');
    stage.style.setProperty('--ry', '0deg'); stage.style.setProperty('--rx', '0deg');
  });
})();
