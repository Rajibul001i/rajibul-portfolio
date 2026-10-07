// 3D tilt for a mouse or trackpad: the portrait turns toward the pointer, and cards
// marked data-tilt lean toward it with a soft light that follows the pointer.
// Touch screens and reduced-motion visitors get none of this.
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function track(el, onMove, onLeave) {
    var frame = 0, last;
    el.addEventListener('pointermove', function (e) {
      last = e;
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        var b = el.getBoundingClientRect();
        onMove((last.clientX - b.left) / b.width - 0.5, (last.clientY - b.top) / b.height - 0.5);
      });
    });
    el.addEventListener('pointerleave', function () {
      cancelAnimationFrame(frame); frame = 0; onLeave();
    });
  }

  // Portrait: the card, photo and award badge sit at different depths, so they separate.
  var wrap = document.getElementById('portrait'), stage = document.getElementById('p3d');
  if (wrap && stage) {
    track(wrap, function (x, y) {
      stage.classList.add('tilting');
      stage.style.setProperty('--ry', (x * 18).toFixed(2) + 'deg');
      stage.style.setProperty('--rx', (-y * 12).toFixed(2) + 'deg');
    }, function () {
      stage.classList.remove('tilting');
      stage.style.setProperty('--ry', '0deg'); stage.style.setProperty('--rx', '0deg');
    });
  }

  // Cards: wide cards lean less than small ones, so text never skews much.
  Array.prototype.forEach.call(document.querySelectorAll('[data-tilt]'), function (el) {
    track(el, function (x, y) {
      var max = el.offsetWidth > 700 ? 2.5 : el.offsetWidth > 420 ? 4 : 7;
      el.classList.add('tilting');
      el.style.setProperty('--tilt-y', (x * max * 2).toFixed(2) + 'deg');
      el.style.setProperty('--tilt-x', (-y * max * 2).toFixed(2) + 'deg');
      el.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
    }, function () {
      el.classList.remove('tilting');
      el.style.setProperty('--tilt-y', '0deg'); el.style.setProperty('--tilt-x', '0deg');
    });
  });
})();
