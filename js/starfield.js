// Background in 3D, one scene per theme, sharing the same camera.
// Dark, "galactic": stars fill a box of space in front of a camera. The camera drifts
// forward slowly, flies forward or back as the page scrolls, leans toward the mouse,
// and the whole sky turns very slowly. Close stars are bigger, brighter and move more
// than far ones, which is what makes it read as depth. Also: twinkling, faint
// constellation lines between close stars, and the odd shooting star.
// Light, "sunny": a warm sun glow in the top corner with slow, soft light rays, and
// specks of warm light floating upward at the same depths, like dust in a sunbeam.
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
  var SUNNY = ['#E9A23B', '#F0B455', '#E07B4F', '#F5C46A', '#E9A23B', '#5FB3A8'];
  var RISE = 0.000008;      // light theme: world units per ms the specks float upward

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

  // Soft round "bokeh" sprites for the light theme, one per colour, drawn once.
  var sprites = {};
  function sprite(color) {
    if (sprites[color]) return sprites[color];
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, color); rg.addColorStop(0.35, color + 'CC'); rg.addColorStop(1, color + '00');
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    return (sprites[color] = c);
  }

  // Light theme: the sun just past the top-right corner, a warm glow, and a fan of soft
  // rays that sway and breathe very slowly.
  function drawSun(t) {
    var sx = W * (mobile ? 0.92 : 0.86), sy = -H * 0.06, reach = Math.hypot(W, H) * 1.05;
    var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(W, H) * 0.7);
    glow.addColorStop(0, 'rgba(255, 210, 130, 0.50)');
    glow.addColorStop(0.22, 'rgba(255, 196, 115, 0.20)');
    glow.addColorStop(1, 'rgba(255, 196, 115, 0)');
    ctx.globalAlpha = 1; ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    var beam = ctx.createRadialGradient(sx, sy, 0, sx, sy, reach);
    beam.addColorStop(0, 'rgba(255, 222, 160, 0.30)');
    beam.addColorStop(0.55, 'rgba(255, 222, 160, 0.08)');
    beam.addColorStop(1, 'rgba(255, 222, 160, 0)');
    ctx.fillStyle = beam;
    for (var i = 0; i < 7; i++) {
      // rays fan down and to the left, across the page
      var a = 1.75 + i * 0.2 + Math.sin(t * 0.00012 + i * 1.3) * 0.035;
      var w = 0.035 + 0.025 * Math.sin(i * 2.1 + 1);
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 0.00025 + i * 1.7);
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a - w) * reach, sy + Math.sin(a - w) * reach);
      ctx.lineTo(sx + Math.cos(a + w) * reach, sy + Math.sin(a + w) * reach);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

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
    var light = isLight(), pal = light ? SUNNY : DARK;

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
    if (light) drawSun(t);
    var near = [];
    // light theme: specks float straight up the screen whichever way the sky has turned
    var riseX = light && !still ? -RISE * sa * dt : 0, riseY = light && !still ? -RISE * ca * dt : 0;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (!still) {
        s.z -= dz; s.tw += s.sp * dt * 0.0016;
        s.x += riseX; s.y += riseY;
        if (s.y < -SY) s.y += 2 * SY; else if (s.y > SY) s.y -= 2 * SY;
        if (s.x < -SX) s.x += 2 * SX; else if (s.x > SX) s.x -= 2 * SX;
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
      ctx.globalAlpha = light ? Math.min(1, a * 1.15) : a;
      ctx.fillStyle = pal[s.c % pal.length];

      var mx = X - s.px, my = Y - s.py, len = Math.hypot(mx, my);
      if (light) { // a soft warm speck; near ones are larger and blurrier, like bokeh
        var d = Math.min(24, 3.5 + 3.4 / s.z);
        ctx.drawImage(sprite(ctx.fillStyle), X - d / 2, Y - d / 2, d, d);
      } else if (speed > 0.0005 && s.px !== null && len > r * 2) { // flying fast: a short, faint streak
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

    if (!mobile && !light) { // faint constellation lines between nearby close stars
      ctx.strokeStyle = '#00DEC8'; ctx.lineWidth = 0.6;
      for (var p = 0; p < near.length; p += 2) {
        for (var q = p + 2; q < near.length; q += 2) {
          var ex = near[p] - near[q], ey = near[p + 1] - near[q + 1], d2 = ex * ex + ey * ey;
          if (d2 < 11000) {
            ctx.globalAlpha = 0.08 * (1 - d2 / 11000);
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
