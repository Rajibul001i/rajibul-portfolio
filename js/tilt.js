// 3D tilt for a mouse or trackpad: the portrait turns toward the pointer, and cards
// marked data-tilt lean toward it with a soft light that follows the pointer.
// The lean runs on springs (Motion's springValue), so it keeps its momentum when the
// pointer changes direction and settles like a real object. Motion is only downloaded
// here, on devices with a mouse; if it fails to load, CSS transitions do the easing.
// Touch screens and reduced-motion visitors get none of this.
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var SPRING = { stiffness: 170, damping: 18, mass: 1 };
  var Motion = null;

  // One property of one element, eased by a spring when Motion is available.
  function axis(el, prop) {
    var spring = null;
    return function (value) {
      if (Motion && !spring) {
        spring = Motion.springValue(parseFloat(el.style.getPropertyValue(prop)) || 0, SPRING);
        spring.on('change', function (v) { el.style.setProperty(prop, v.toFixed(2) + 'deg'); });
        el.classList.add('sprung');
      }
      if (spring) spring.set(value);
      else el.style.setProperty(prop, value.toFixed(2) + 'deg');
    };
  }

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
    var ry = axis(stage, '--ry'), rx = axis(stage, '--rx');
    track(wrap, function (x, y) {
      stage.classList.add('tilting');
      ry(x * 18); rx(-y * 12);
    }, function () {
      stage.classList.remove('tilting');
      ry(0); rx(0);
    });
  }

  // Cards: wide cards lean less than small ones, so text never skews much.
  Array.prototype.forEach.call(document.querySelectorAll('[data-tilt]'), function (el) {
    var ty = axis(el, '--tilt-y'), tx = axis(el, '--tilt-x');
    track(el, function (x, y) {
      var max = el.offsetWidth > 700 ? 2.5 : el.offsetWidth > 420 ? 4 : 7;
      el.classList.add('tilting');
      ty(x * max * 2); tx(-y * max * 2);
      el.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
    }, function () {
      el.classList.remove('tilting');
      ty(0); tx(0);
    });
  });

  var script = document.createElement('script');
  script.src = 'js/vendor/motion.js';
  script.async = true;
  script.onload = function () { if (window.Motion && window.Motion.springValue) Motion = window.Motion; };
  document.head.appendChild(script);
})();
