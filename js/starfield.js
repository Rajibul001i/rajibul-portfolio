// Starfield in 3D: stars fill a box of space in front of a camera. The camera drifts
// forward slowly, flies forward or back as the page scrolls, leans toward the mouse,
// and the whole sky turns very slowly. Close stars are bigger, brighter and move more
// than far ones, which is what makes it read as depth. Also: twinkling, faint
// constellation lines between close stars, and the odd shooting star.
// Pauses when the tab is hidden. Reduced-motion visitors get one still frame, and anyone
// can stop it with the pause button in the header (remembered for next time).
(function () {
  var cv = document.getElementById('sky');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var paused = false;
  try { paused = localStorage.getItem('sky') === 'paused'; } catch (e) {}
  var still = reduced || paused;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var DARK = ['#FFFFFF', '#FFFFFF', '#D6F0EC', '#D6F0EC', '#00DEC8', '#00DEC8', '#FF9A5C'];
  var LIGHT = ['#007A6E', '#3F6966', '#C8571B'];

  // Depth runs from NEAR (just in front of the camera) to FAR. Stars wrap around in
  // depth, which keeps them evenly spread however far the camera travels.
  var NEAR = 0.12, FAR = 1.7, DEPTH = FAR - NEAR;
  var DRIFT = 0.000012;     // depth units per ms when idle: a star takes about 2 minutes to pass
  var SCROLL = 0.0006;      // depth units per scrolled pixel
  var SPIN = 0.000018;      // radians per ms: one turn every 6 minutes

  var W, H, F, SX, SY, mobile, stars = [], shots = [];
  var raf = null, last = 0, nextShot = 0, angle = 0;
  var lastScroll = window.scrollY, push = 0;           // depth still to travel from scrolling
  var lookX = 0, lookY = 0, aimX = 0, aimY = 0;        // camera offset, eased toward the mouse

  function isLight() { return document.documentElement.dataset.theme === 'light'; }

  function place(s, z) {
    s.x = (Math.random() * 2 - 1) * SX;
    s.y = (Math.random() * 2 - 1) * SY;
    s.z = z;
    s.px = null;
  }

  function build() {
    W = window.innerWidth; H = window.innerHeight; mobile = W < 760;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    F = Math.max(W, H) * 0.5;
    // the box is as wide as the view at the far end (plus room for leaning and turning),
    // so every part of the screen has stars at every depth
    var half = Math.hypot(W, H) / 2 / F * FAR * 1.08;
    SX = half; SY = half;
    // only about a third of the box is on screen at once
    var n = Math.round(Math.min(mobile ? 330 : 720, (W * H) / 2000));
    stars = [];
    for (var i = 0; i < n; i++) {
      var s = { tw: Math.random() * 6.283, sp: 0.4 + Math.random() * 1.4, c: Math.floor(Math.random() * 1000) };
      place(s, NEAR + Math.random() * DEPTH);
      stars.push(s);
    }
  }

  function draw(t) {
    var dt = last ? Math.min(48, t - last) : 16; last = t;
    var light = isLight(), pal = light ? LIGHT : DARK;

    // camera movement
    var dz = 0;
    if (!still) {
      var sy = window.scrollY;
      push += (sy - lastScroll) * SCROLL; lastScroll = sy;
      var step = push * Math.min(1, dt / 220);        // ease the scroll travel over ~0.2 s
      push -= step;
      dz = DRIFT * dt + step;
      angle += SPIN * dt;
      lookX += (aimX - lookX) * Math.min(1, dt / 500);
      lookY += (aimY - lookY) * Math.min(1, dt / 500);
    }
    var speed = Math.abs(dz) / dt;                      // for light streaks while scrolling fast
    var ca = Math.cos(angle), sa = Math.sin(angle), cx = W / 2, cy = H / 2;

    ctx.clearRect(0, 0, W, H);
    var near = [];
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (!still) {
        s.z -= dz; s.tw += s.sp * dt * 0.0016;
        if (s.z < NEAR) place(s, s.z + DEPTH);
        else if (s.z > FAR) place(s, s.z - DEPTH);
      }
      // turn the sky, lean the camera, then project
      var x = s.x * ca - s.y * sa - lookX, y = s.x * sa + s.y * ca - lookY;
      var k = F / s.z, X = cx + x * k, Y = cy + y * k;
      if (X < -10 || X > W + 10 || Y < -10 || Y > H + 10) { s.px = null; continue; }

      var close = (FAR - s.z) / DEPTH;                  // 0 far away, 1 right in front
      var fadeIn = Math.min(1, (FAR - s.z) / 0.25);     // appear gently in the distance
      var fadeOut = Math.min(1, (s.z - NEAR) / 0.12);   // and leave gently up close
      var tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(s.tw));
      var a = tw * (0.3 + close * 0.7) * fadeIn * fadeOut;
      var r = Math.min(2.3, 0.22 + 0.32 / s.z);
      ctx.globalAlpha = light ? a * 0.45 : a;
      ctx.fillStyle = pal[s.c % pal.length];

      var mx = X - s.px, my = Y - s.py, len = Math.hypot(mx, my);
      if (speed > 0.0005 && s.px !== null && len > r * 2) { // flying fast: a short, faint streak
        var cut = Math.min(1, 18 / len);
        ctx.globalAlpha *= 0.7;
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = r * 1.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(X - mx * cut, Y - my * cut); ctx.lineTo(X, Y); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(X, Y, r, 0, 6.283); ctx.fill();
      }
      s.px = X; s.py = Y;
      if (close > 0.62 && fadeOut === 1) near.push(X, Y);
    }

    if (!mobile) { // faint constellation lines between nearby close stars
      ctx.strokeStyle = light ? '#007A6E' : '#00DEC8'; ctx.lineWidth = 0.6;
      for (var p = 0; p < near.length; p += 2) {
        for (var q = p + 2; q < near.length; q += 2) {
          var ex = near[p] - near[q], ey = near[p + 1] - near[q + 1], d2 = ex * ex + ey * ey;
          if (d2 < 11000) {
            ctx.globalAlpha = (light ? 0.05 : 0.08) * (1 - d2 / 11000);
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
      for (var j = shots.length - 1; j >= 0; j--) {
        var sh = shots[j]; sh.life += dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt;
        var f = sh.life / sh.max; if (f >= 1) { shots.splice(j, 1); continue; }
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

  function start() { last = 0; lastScroll = window.scrollY; push = 0; if (!raf) raf = requestAnimationFrame(draw); }
  function stop() { cancelAnimationFrame(raf); raf = null; }

  build();
  if (still) draw(0); else start();
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); if (still) draw(0); }, 200); });
  window.addEventListener('themechange', function () { if (still) draw(0); });
  if (finePointer) {
    window.addEventListener('pointermove', function (e) {
      aimX = (e.clientX / W - 0.5) * 0.12;
      aimY = (e.clientY / H - 0.5) * 0.08;
    }, { passive: true });
  }
  document.addEventListener('visibilitychange', function () {
    if (still) return;
    if (document.hidden) stop(); else start();
  });

  // Pause button. Hidden for reduced-motion visitors, whose sky never moves.
  var btn = document.getElementById('sky-btn');
  if (btn) {
    if (reduced) { btn.hidden = true; return; }
    var show = function () {
      btn.setAttribute('aria-pressed', String(paused));
      btn.setAttribute('aria-label', paused ? 'Play background animation' : 'Pause background animation');
    };
    show();
    btn.addEventListener('click', function () {
      paused = !paused; still = paused; show();
      try { localStorage.setItem('sky', paused ? 'paused' : 'playing'); } catch (e) {}
      if (paused) { stop(); draw(0); } else start();
    });
  }
})();
