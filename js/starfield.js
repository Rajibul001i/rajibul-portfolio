// Starfield: twinkling stars at three depths that drift with scrolling, a few
// constellation lines, and the odd shooting star. Pauses when the tab is hidden,
// and draws a single still frame for visitors who ask for reduced motion.
(function () {
  var cv = document.getElementById('sky');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W, H, stars = [], shots = [], raf = null, last = 0, nextShot = 0, mobile;
  var DARK = ['#FFFFFF', '#FFFFFF', '#D6F0EC', '#D6F0EC', '#00DEC8', '#00DEC8', '#FF9A5C'];
  var LIGHT = ['#00897C', '#3F6966', '#C8571B'];
  function isLight() { return document.documentElement.dataset.theme === 'light'; }

  function build() {
    W = window.innerWidth; H = window.innerHeight; mobile = W < 760;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var n = Math.round(Math.min(mobile ? 110 : 240, (W * H) / 6000));
    stars = [];
    for (var i = 0; i < n; i++) {
      var z = Math.pow(Math.random(), 1.6); // most stars far away, a few close
      stars.push({
        x: Math.random() * W, y: Math.random() * H, z: z,
        r: 0.25 + z * 1.15,
        tw: Math.random() * 6.283, sp: 0.4 + Math.random() * 1.4,
        vx: (Math.random() - 0.5) * 0.006 * (0.4 + z),
        c: Math.floor(Math.random() * 1000)
      });
    }
  }

  function draw(t) {
    var dt = last ? Math.min(48, t - last) : 16; last = t;
    var light = isLight(), sy = window.scrollY, pal = light ? LIGHT : DARK;
    ctx.clearRect(0, 0, W, H);
    var near = [];
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (!still) { s.x += s.vx * dt; s.tw += s.sp * dt * 0.0016; }
      if (s.x < -4) s.x = W + 4; else if (s.x > W + 4) s.x = -4;
      var y = ((s.y - sy * (0.04 + s.z * 0.22)) % H + H) % H; // parallax
      var a = (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(s.tw))) * (0.35 + s.z * 0.65);
      ctx.globalAlpha = light ? a * 0.4 : a;
      ctx.fillStyle = pal[s.c % pal.length];
      ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 6.283); ctx.fill();
      if (s.z > 0.45) near.push(s.x, y);
    }
    if (!mobile) { // faint constellation lines between nearby close stars
      ctx.strokeStyle = light ? '#00897C' : '#00DEC8'; ctx.lineWidth = 0.6;
      for (var p = 0; p < near.length; p += 2) {
        for (var q = p + 2; q < near.length; q += 2) {
          var dx = near[p] - near[q], dy = near[p + 1] - near[q + 1], d2 = dx * dx + dy * dy;
          if (d2 < 11000) {
            ctx.globalAlpha = (light ? 0.05 : 0.07) * (1 - d2 / 11000);
            ctx.beginPath(); ctx.moveTo(near[p], near[p + 1]); ctx.lineTo(near[q], near[q + 1]); ctx.stroke();
          }
        }
      }
    }
    if (!still && !light) {
      if (!nextShot) nextShot = t + 2500;
      if (t > nextShot) {
        var ang = 0.35 + Math.random() * 0.35, spd = 0.9 + Math.random() * 0.6;
        shots.push({ x: Math.random() * W * 0.8 + W * 0.1, y: Math.random() * H * 0.4, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0, max: 700 + Math.random() * 500 });
        nextShot = t + 9000 + Math.random() * 9000;
      }
      for (var k = shots.length - 1; k >= 0; k--) {
        var sh = shots[k]; sh.life += dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt;
        var f = sh.life / sh.max; if (f >= 1) { shots.splice(k, 1); continue; }
        var tail = 70 * (1 - f * 0.5), tx = sh.x - sh.vx * tail / 1.2, ty = sh.y - sh.vy * tail / 1.2;
        var g = ctx.createLinearGradient(sh.x, sh.y, tx, ty);
        g.addColorStop(0, 'rgba(214,240,236,' + (0.7 * (1 - f)) + ')');
        g.addColorStop(1, 'rgba(0,222,200,0)');
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(tx, ty); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    if (!still) raf = requestAnimationFrame(draw);
  }

  build();
  if (still) { draw(0); } else { raf = requestAnimationFrame(draw); }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); if (still) draw(0); }, 200); });
  if (still) {
    window.addEventListener('scroll', function () { draw(0); }, { passive: true });
    window.addEventListener('themechange', function () { draw(0); });
  }
  document.addEventListener('visibilitychange', function () {
    if (still) return;
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else if (!raf) { last = 0; raf = requestAnimationFrame(draw); }
  });
})();
