// Light theme background, "sunny": a bright sun in the top corner with a warm glow, slow,
// soft light rays and a faint lens flare, and specks of warm light floating upward at
// different depths, like dust in a sunbeam (near ones out of focus). The camera drifts
// forward slowly, flies forward or back as the page scrolls and leans toward the mouse.
// The dark theme has its own scene (islands/flow-wave.js); this one stops and clears
// whenever the dark theme is on.
// Pauses when the tab is hidden. Reduced-motion visitors get one still frame, and anyone
// can stop it with the pause button in the header (main.js sets html[data-sky="paused"]).
(function () {
  var cv = document.getElementById('sky');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var SUNNY = ['#E9A23B', '#F0B455', '#E07B4F', '#F5C46A', '#E9A23B', '#5FB3A8'];
  var RISE = 0.000008;      // world units per ms the specks float upward

  // Depth runs from NEAR (just in front of the camera) to FAR. Specks wrap around in
  // depth, which keeps them evenly spread however far the camera travels.
  var NEAR = 0.12, FAR = 1.7, DEPTH = FAR - NEAR;
  var DRIFT = 0.000012;     // depth units per ms when idle: a speck takes about 2 minutes to pass
  var SCROLL = 0.0006;      // depth units per scrolled pixel

  var W, H, F, SX, SY, mobile, specks = [];
  var raf = null, last = 0;
  var lastScroll = window.scrollY, push = 0;           // depth still to travel from scrolling
  var lookX = 0, lookY = 0, aimX = 0, aimY = 0;        // camera offset, eased toward the mouse

  function isLight() { return root.dataset.theme === 'light'; }
  function isStill() { return reduced || root.dataset.sky === 'paused'; }

  // Soft round "bokeh" sprites, one per colour, drawn once.
  var sprites = {};
  function sprite(color) {
    if (sprites[color]) return sprites[color];
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, color); rg.addColorStop(0.35, color + 'CC'); rg.addColorStop(1, color + '00');
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    return (sprites[color] = c);
  }

  // The sun just past the top-right corner: a bright core, a warm glow, a fan of soft rays
  // that sway and breathe very slowly, and a faint lens flare. It sits below the floating
  // nav pill, so its bright core is never hidden behind it.
  function sunPos() { return [W * (mobile ? 0.88 : 0.91), mobile ? 104 : 122]; }

  function drawSun(t) {
    var p = sunPos(), sx = p[0], sy = p[1], reach = Math.hypot(W, H) * 1.05;
    var breathe = 0.92 + 0.08 * Math.sin(t * 0.0006);

    var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(W, H) * 0.75);
    glow.addColorStop(0, 'rgba(255, 214, 140, 0.62)');
    glow.addColorStop(0.2, 'rgba(255, 198, 118, 0.26)');
    glow.addColorStop(1, 'rgba(255, 198, 118, 0)');
    ctx.globalAlpha = 1; ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    var beam = ctx.createRadialGradient(sx, sy, 0, sx, sy, reach);
    beam.addColorStop(0, 'rgba(255, 224, 165, 0.42)');
    beam.addColorStop(0.5, 'rgba(255, 224, 165, 0.13)');
    beam.addColorStop(1, 'rgba(255, 224, 165, 0)');
    ctx.fillStyle = beam;
    for (var i = 0; i < 9; i++) {
      // rays fan down and to the left, across the page
      var a = 1.62 + i * 0.17 + Math.sin(t * 0.00012 + i * 1.3) * 0.04;
      var w = 0.03 + 0.028 * (0.5 + 0.5 * Math.sin(i * 2.1 + 1));
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.00025 + i * 1.7);
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(a - w) * reach, sy + Math.sin(a - w) * reach);
      ctx.lineTo(sx + Math.cos(a + w) * reach, sy + Math.sin(a + w) * reach);
      ctx.closePath(); ctx.fill();
    }

    // the sun itself: a small, very bright core that blooms out
    var core = (mobile ? 46 : 70) * breathe;
    var disc = ctx.createRadialGradient(sx, sy, 0, sx, sy, core * 2.4);
    disc.addColorStop(0, 'rgba(255, 252, 240, 0.98)');
    disc.addColorStop(0.28, 'rgba(255, 238, 196, 0.85)');
    disc.addColorStop(0.55, 'rgba(255, 214, 140, 0.35)');
    disc.addColorStop(1, 'rgba(255, 214, 140, 0)');
    ctx.globalAlpha = 1; ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(sx, sy, core * 2.4, 0, 6.283); ctx.fill();
  }

  // Lens flare: faint discs on the line from the sun through the middle of the screen. The
  // line pivots as the camera leans toward the mouse, like turning a camera near the sun.
  var FLARE = [[0.32, 26, '#FFD27A', 0.22], [0.55, 12, '#FFE3A8', 0.3], [0.78, 44, '#F5B66A', 0.12],
               [1.05, 18, '#9FD8CF', 0.16], [1.32, 64, '#FFD9A0', 0.08]];
  function drawFlare() {
    var p = sunPos(), sx = p[0], sy = p[1];
    var cx = W / 2 - lookX * F * 2.2, cy = H / 2 - lookY * F * 2.2;
    for (var i = 0; i < FLARE.length; i++) {
      var f = FLARE[i], x = sx + (cx - sx) * f[0] * 2, y = sy + (cy - sy) * f[0] * 2, d = f[1] * (mobile ? 1.3 : 2);
      ctx.globalAlpha = f[3];
      ctx.drawImage(sprite(f[2]), x - d / 2, y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
  }

  function place(s, z) {
    s.x = (Math.random() * 2 - 1) * SX;
    s.y = (Math.random() * 2 - 1) * SY;
    s.z = z;
  }

  function build() {
    W = window.innerWidth; H = window.innerHeight; mobile = W < 760;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    F = Math.max(W, H) * 0.5;
    // the box is as wide as the view at the far end (plus room for leaning), so every part
    // of the screen has specks at every depth
    var half = Math.hypot(W, H) / 2 / F * FAR * 1.08;
    SX = half; SY = half;
    // only about a third of the box is on screen at once
    var n = Math.round(Math.min(mobile ? 330 : 720, (W * H) / 2000));
    specks = [];
    for (var i = 0; i < n; i++) {
      var s = { tw: Math.random() * 6.283, sp: 0.4 + Math.random() * 1.4, c: Math.floor(Math.random() * 1000) };
      place(s, NEAR + Math.random() * DEPTH);
      specks.push(s);
    }
  }

  function draw(t) {
    var dt = last ? Math.min(48, t - last) : 16; last = t;
    var still = isStill();

    // camera movement
    var dz = 0;
    if (!still) {
      var sy = window.scrollY;
      push += (sy - lastScroll) * SCROLL; lastScroll = sy;
      var step = push * Math.min(1, dt / 220);        // ease the scroll travel over ~0.2 s
      push -= step;
      dz = DRIFT * dt + step;
      lookX += (aimX - lookX) * Math.min(1, dt / 500);
      lookY += (aimY - lookY) * Math.min(1, dt / 500);
    }
    var cx = W / 2, cy = H / 2, rise = still ? 0 : RISE * dt;

    ctx.clearRect(0, 0, W, H);
    drawSun(t);
    for (var i = 0; i < specks.length; i++) {
      var s = specks[i];
      if (!still) {
        s.z -= dz; s.tw += s.sp * dt * 0.0016; s.y -= rise;
        if (s.y < -SY) s.y += 2 * SY;
        if (s.z < NEAR) place(s, s.z + DEPTH);
        else if (s.z > FAR) place(s, s.z - DEPTH);
      }
      // lean the camera, then project
      var k = F / s.z, X = cx + (s.x - lookX) * k, Y = cy + (s.y - lookY) * k;
      if (X < -20 || X > W + 20 || Y < -20 || Y > H + 20) continue;

      var close = (FAR - s.z) / DEPTH;                  // 0 far away, 1 right in front
      var fadeIn = Math.min(1, (FAR - s.z) / 0.25);     // appear gently in the distance
      var fadeOut = Math.min(1, (s.z - NEAR) / 0.12);   // and leave gently up close
      var tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(s.tw));
      // a soft warm speck; near ones are larger and blurrier, like bokeh
      var d = Math.min(38, 3.5 + 4.2 / s.z);
      ctx.globalAlpha = Math.min(1, tw * (0.3 + close * 0.7) * fadeIn * fadeOut * 1.15) * (d > 16 ? 0.55 : 1);
      ctx.drawImage(sprite(SUNNY[s.c % SUNNY.length]), X - d / 2, Y - d / 2, d, d);
    }
    drawFlare();
    ctx.globalAlpha = 1;
    cv.dataset.frames = String((+cv.dataset.frames || 0) + 1);
    if (!still) raf = requestAnimationFrame(draw);
  }

  function start() { last = 0; lastScroll = window.scrollY; push = 0; if (!raf) raf = requestAnimationFrame(draw); }
  function stop() { cancelAnimationFrame(raf); raf = null; }

  // Draw only in the light theme: moving unless paused, reduced or hidden; otherwise one
  // still frame. In the dark theme the canvas is cleared and nothing runs.
  function sync() {
    if (!isLight()) { stop(); ctx.clearRect(0, 0, W, H); return; }
    if (isStill()) { stop(); draw(performance.now()); }
    else if (!document.hidden) start();
  }

  build();
  sync();
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { build(); if (isLight() && isStill()) draw(performance.now()); }, 200);
  });
  window.addEventListener('themechange', sync);
  window.addEventListener('skychange', sync);
  if (finePointer) {
    window.addEventListener('pointermove', function (e) {
      aimX = (e.clientX / W - 0.5) * 0.12;
      aimY = (e.clientY / H - 0.5) * 0.08;
    }, { passive: true });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else sync();
  });
})();
