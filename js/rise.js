// Spotlight entry cascade: every [data-rise] element (the nav pill, the name, the buttons)
// springs from 14px below and transparent to rest, 45 ms apart in data-rise order, on a
// { tension: 220, friction: 26 } spring. The spring is integrated rather than eased, so its
// small overshoot is real. Press R to replay it.
// Hidden-until-risen is CSS (.js [data-rise]), so nothing flashes before this runs; if this
// file never runs, a CSS fail-safe shows everything after 3 s. Reduced-motion visitors get
// everything in place at once.
(function () {
  var STEP_MS = 45;
  var FROM_Y = 14;
  var TENSION = 220;
  var FRICTION = 26;
  var MASS = 1;
  var PRECISION = 0.01;
  var SUBSTEP = 1 / 240;

  document.documentElement.classList.add('lk-js');
  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-rise]'));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var generation = 0;

  function rest(el) {
    el.style.transform = '';
    el.style.opacity = '1';
    el.style.willChange = '';
  }

  function rise(el, delayMs, gen) {
    el.style.opacity = '0';
    el.style.transform = 'translate3d(0,' + FROM_Y + 'px,0)';
    el.style.willChange = 'transform, opacity';

    var x = FROM_Y, v = 0, last = null;
    function frame(now) {
      if (gen !== generation) return;
      if (last === null) last = now;
      // clamp the step so a backgrounded tab never blows up the integration
      var dt = Math.min((now - last) / 1000, 0.064);
      last = now;
      var steps = Math.max(1, Math.ceil(dt / SUBSTEP)), h = dt / steps;
      for (var i = 0; i < steps; i++) {
        var a = (-TENSION * x - FRICTION * v) / MASS;
        v += a * h;
        x += v * h;
      }
      // opacity follows the same normalised path as y
      el.style.transform = 'translate3d(0,' + x.toFixed(3) + 'px,0)';
      el.style.opacity = String(Math.max(0, Math.min(1, 1 - x / FROM_Y)));
      if (Math.abs(x) < PRECISION && Math.abs(v) < PRECISION) { rest(el); delete el.dataset.rising; return; }
      requestAnimationFrame(frame);
    }
    el.dataset.rising = '';
    // the stagger is a timer, not a frame countdown
    setTimeout(function () { if (gen === generation) requestAnimationFrame(frame); }, delayMs);
  }

  function play() {
    var gen = ++generation;
    nodes.forEach(function (el) {
      if (reduced) { rest(el); return; }
      rise(el, (Number(el.dataset.rise) || 0) * STEP_MS, gen);
    });
  }

  play();

  window.addEventListener('keydown', function (e) {
    if (e.key !== 'r' && e.key !== 'R') return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    play();
  });
})();
