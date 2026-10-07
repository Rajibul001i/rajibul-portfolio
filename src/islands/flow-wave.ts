// Flow Wave: the dark theme's background. A wide sea of glowing particle hills rolling
// under two octaves of Simplex noise. Scrolling the page dives the camera from a high view
// to skim low over the field while the swell grows and the hills stream toward you; the
// cursor parallaxes the view and parts the surface where it points. A faint corner haze
// and drifting motes wrap the frame.
//
// Ported from the standalone Flow Wave scene (Three.js r143), recoloured to the site's
// cyan-on-deep-blue palette. Two adaptations for a page that must also stay light:
//  - The original rendered two extra composers (a "torus" and a "bloom" pass) that only
//    ever drew objects on layers nothing is placed on, so they added black. They are left
//    out; the composite still samples those textures (now empty) and looks the same.
//  - Pixel ratio is capped at 2, and phones use a lighter sheet (fewer points).
//
// js/main.js imports the built file (islands/flow-wave.js) while the dark theme is on.
// The light theme, the pause button, reduced motion and a hidden tab all stop it.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Fog,
  Group,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGL1Renderer,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

/* ── Fixed parameters (the scene's own values; colours in the site's palette) ── */
const bgColor = "#08111A"; //      composite background tint (site --bg)
const flameColor = "#0AFFE0"; //   corner haze A
const flameColor2 = "#AEF0EA"; //  corner haze B
const flameAmt = 0.2;
const atmoColor = "#7AFFEF"; //    ambient motes
const atmoCount = 300;
const atmoSize = 24;
const atmoSpeed = 1.2000000000000002;
const colorLow = "#08111A"; //     points, low
const colorHigh = "#00DEC8"; //    points, high (site accent)
const opacity = 0.26;
const pointSize = 5.5;
const brightness = 0.45;
const waveHeight = 3;
const flow = 1;
const tilt = -0.24;
const scale = 0.275;
const scrollRise = 1;
const camStartY = 7, camStartZ = 16;
const camEndY = 0.8, camEndZ = -2;
const lookStartZ = 2, lookEndZ = -16;
const parallax = 1.2;
const pointerRadius = 7;
const pointerStrength = 0.9;

const Lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function hexToVec3(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const SNOISE = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const POINTS_VERT = /* glsl */ `
uniform float uTime; uniform float uStream; uniform float uSize; uniform float uWaveHeight; uniform float uFlow; uniform float uScale;
uniform vec3 uColLow; uniform vec3 uColHigh;
uniform vec3 uCursor; uniform float uRepelRadius; uniform float uRepelStrength; uniform float uActivity;
varying float vFade; varying vec3 vColor;
${SNOISE}
void main() {
  vec3 wp = vec3(position.x * 13.0, 0.0, position.z * 25.0);
  wp.x += position.y * 6.0;
  // uStream slides the sampled hills toward the camera (forward flight).
  float zc = wp.z + uStream;
  float wn = snoise(vec3(wp.x * 0.08, zc * 0.08, uTime * 0.15 * uFlow)) * 2.0;
  wn += snoise(vec3(wp.x * 0.16, zc * 0.16, uTime * 0.3 * uFlow)) * 0.8;
  wp.y += wn * uWaveHeight;

  vec3 finalPos = wp * uScale;
  vec4 modelPosition = modelMatrix * vec4(finalPos, 1.0);
  vec3 toP = modelPosition.xyz - uCursor;
  float cd = length(toP);
  float fall = smoothstep(uRepelRadius, 0.0, cd);
  modelPosition.xyz += normalize(toP + vec3(0.0001)) * fall * uRepelStrength * uActivity;
  vec4 mvPosition = viewMatrix * modelPosition;

  float colMix = smoothstep(-3.0, 3.0, position.y + position.x * 0.5);
  vColor = mix(uColLow, uColHigh, clamp(colMix, 0.0, 1.0));
  vFade = 1.0;

  gl_PointSize = uSize * (10.0 / -mvPosition.z);
  gl_PointSize = max(gl_PointSize, 1.5);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const POINTS_FRAG = /* glsl */ `
uniform float uOpacity; uniform float uBrightness; uniform float uAppear;
varying float vFade; varying vec3 vColor;
void main() {
  vec2 xy = gl_PointCoord - 0.5;
  float ll = length(xy);
  if (ll > 0.5) discard;
  float a = smoothstep(0.5, 0.1, ll);
  gl_FragColor = vec4(vColor * uBrightness, vFade * a * uOpacity * uAppear);
}
`;

const FINAL_VERT = /* glsl */ `
varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const FINAL_FRAG = /* glsl */ `
uniform float iTime; uniform sampler2D tDiffuse; uniform sampler2D bloomTexture; uniform sampler2D torusTexture; uniform sampler2D haloTexture;
uniform vec3 uBg; uniform vec3 uFlameA; uniform vec3 uFlameB; uniform float uFlameAmt;
varying vec2 vUv;
vec3 warp3d(vec3 pos, float t){ float curv=.8,a=1.9,b=0.7; pos*=2.;
  pos.x+=curv*sin(t+a*pos.y)+t*b; pos.y+=curv*cos(t+a*pos.x);
  pos.y+=curv*sin(t+a*pos.z)+t*b; pos.z+=curv*cos(t+a*pos.y);
  pos.z+=curv*sin(t+a*pos.x)+t*b; pos.x+=curv*cos(t+a*pos.z);
  return 0.5+0.5*cos(pos.xyz+vec3(1,2,4)); }
void main(){
  vec2 uv = 2.*vUv - 1.;
  vec3 w = pow(warp3d(vec3(uv.x, sin(uv.y), uv.y), iTime*1.5), vec3(1.5));
  vec3 flame = 1.5*uFlameA*w.x; flame*=w.y; flame += uFlameB*w.z;
  flame *= smoothstep(0.25, 1., abs(uv.y));
  float md = smoothstep(-0.7, 1., -uv.y*uv.x); flame *= md*md;
  vec3 bg = uBg * (1.0 - 0.4 * length(uv));
  vec3 halo = texture2D(haloTexture, vUv).xyz;
  gl_FragColor = vec4(bg + flame*uFlameAmt + texture2D(bloomTexture, vUv).xyz + texture2D(torusTexture, vUv).xyz + texture2D(tDiffuse, vUv).xyz + halo, 1.);
}
`;

const ATMO_VERT = /* glsl */ `
attribute float size; attribute float seed; uniform float uTime; uniform vec2 uRes;
varying float vA;
vec3 warp(vec3 p, float t){ float c=0.9,a=1.9,b=0.02,s=0.05; p*=2.;
  p.x+=c*sin(s*t+a*p.y)+t*b; p.y+=c*cos(s*t+a*p.x); p.y+=c*sin(s*t+a*p.z)+t*b;
  p.z+=c*cos(s*t+a*p.y); p.z+=c*sin(s*t+a*p.x)+t*b; p.x+=c*cos(s*t+a*p.z);
  return cos(p+vec3(1,2,4)); }
void main(){
  vec3 v = position*4.0 + warp(position, uTime)*1.2;
  vec4 mv = modelViewMatrix * vec4(v, 1.0);
  float r = length(v); float farF = 1.0 - smoothstep(5.0, 6.5, r); float nearF = smoothstep(0.0, 0.5, -mv.z);
  vA = farF * nearF;
  gl_PointSize = size * uRes.y / 900.0 / -mv.z; gl_PointSize = max(gl_PointSize, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const ATMO_FRAG = /* glsl */ `
uniform vec3 uColor; varying float vA;
void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
  float tex = smoothstep(0.5, 0.0, l); gl_FragColor = vec4(uColor * tex, tex * vA * 0.6); }
`;

const VEIL = 0.6; // how much of the surface the veil hides once past the hero
const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isDark = () => root.dataset.theme !== "light";
const isPaused = () => root.dataset.sky === "paused";
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

function start(canvas: HTMLCanvasElement) {
  canvas.dataset.started = "true";

  const renderer = new WebGL1Renderer({ canvas, antialias: true });
  renderer.setPixelRatio(dpr());

  const scene = new Scene();
  scene.background = new Color(0x000000);
  scene.fog = new Fog(0x000000, 0, 15);
  const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 400);
  camera.position.set(0, 7, 16);
  scene.add(camera);

  /* composite: the scene + background tint + corner haze */
  const finalPass = new ShaderPass({
    uniforms: {
      iTime: { value: 0 },
      tDiffuse: { value: null },
      torusTexture: { value: null },
      bloomTexture: { value: null },
      haloTexture: { value: null },
      uBg: { value: hexToVec3(bgColor) },
      uFlameA: { value: hexToVec3(flameColor) },
      uFlameB: { value: hexToVec3(flameColor2) },
      uFlameAmt: { value: flameAmt },
    },
    vertexShader: FINAL_VERT,
    fragmentShader: FINAL_FRAG,
  });
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(finalPass);

  /* the particle sheet */
  const uniforms = {
    uTime: { value: 0 },
    uStream: { value: 0 },
    uAppear: { value: reduced ? 1 : 0 },
    uColLow: { value: hexToVec3(colorLow) },
    uColHigh: { value: hexToVec3(colorHigh) },
    uOpacity: { value: opacity },
    uSize: { value: pointSize },
    uBrightness: { value: brightness },
    uWaveHeight: { value: waveHeight },
    uFlow: { value: flow },
    uScale: { value: scale },
    uCursor: { value: new Vector3() },
    uRepelRadius: { value: pointerRadius },
    uRepelStrength: { value: pointerStrength },
    uActivity: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: POINTS_VERT,
    fragmentShader: POINTS_FRAG,
  });
  // the original 200 × 600 sheet (~121k points); phones get ~59k
  const phone = innerWidth < 760;
  const points = new Points(new SphereGeometry(4.2, phone ? 140 : 200, phone ? 420 : 600), material);
  points.frustumCulled = false;
  const group = new Group();
  group.add(points);
  scene.add(group);

  /* ambient motes that travel with the camera */
  const N = Math.round(atmoCount);
  const positions = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    positions[i * 3] = 2 * Math.random() - 1;
    positions[i * 3 + 1] = 2 * Math.random() - 1;
    positions[i * 3 + 2] = 2 * Math.random() - 1;
    sizes[i] = atmoSize * (0.4 + Math.random());
    seeds[i] = Math.random();
  }
  const atmoGeo = new BufferGeometry();
  atmoGeo.setAttribute("position", new BufferAttribute(positions, 3));
  atmoGeo.setAttribute("size", new BufferAttribute(sizes, 1));
  atmoGeo.setAttribute("seed", new BufferAttribute(seeds, 1));
  const atmoMat = new ShaderMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: hexToVec3(atmoColor) },
      uRes: { value: new Vector2(innerWidth * dpr(), innerHeight * dpr()) },
    },
    vertexShader: ATMO_VERT,
    fragmentShader: ATMO_FRAG,
  });
  const motes = new Points(atmoGeo, atmoMat);
  motes.frustumCulled = false;
  motes.onBeforeRender = () => {
    const t = performance.now() / 1000;
    atmoMat.uniforms.uTime.value = t * atmoSpeed * 8.0;
    motes.position.copy(camera.position);
    finalPass.uniforms.iTime.value = t; // drives the corner haze
  };
  scene.add(motes);

  /* scroll: the whole page's progress, double-damped */
  let scrollTarget = 0, scrollSmooth = 0, scrollCurrent = 0;
  /* Past the hero a veil in the page colour dims the surface, so the text over it stays
     easy to read; the dive still shows through. Set straight from scroll, so it follows
     even while the scene is paused. */
  const veil = document.getElementById("wave-veil");
  const readScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollTarget = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    if (veil) veil.style.opacity = String(VEIL * clamp((scrollY - innerHeight * 0.3) / (innerHeight * 0.6), 0, 1));
  };
  addEventListener("scroll", readScroll, { passive: true });

  /* pointer */
  const mouseTarget = { x: 0, y: 0 };
  const mouse = { x: 0, y: 0 };
  const POINTER = { world: new Vector3(), activity: 0, active: false, lastMove: performance.now() };
  addEventListener("mousemove", (e) => {
    mouseTarget.x = (e.clientX / innerWidth) * 2 - 1;
    mouseTarget.y = -((e.clientY / innerHeight) * 2 - 1);
    POINTER.active = true;
    POINTER.lastMove = performance.now();
  }, { passive: true });
  document.addEventListener("mouseout", (e) => { if (!e.relatedTarget) POINTER.active = false; });

  const _ndc = new Vector3(), _dir = new Vector3(), _tgt = new Vector3();
  function updatePointerWorld() {
    _tgt.set(0, 0, 0);
    if (POINTER.active) {
      _ndc.set(mouse.x, mouse.y, 0.5).unproject(camera);
      _dir.copy(_ndc).sub(camera.position).normalize();
      const dn = _dir.z;
      if (Math.abs(dn) > 1e-4) {
        const tt = -camera.position.z / dn;
        if (tt > 0 && Number.isFinite(tt)) _tgt.copy(camera.position).addScaledVector(_dir, tt);
      }
    }
    POINTER.world.lerp(_tgt, 0.12);
    const idle = (performance.now() - POINTER.lastMove) / 1000;
    POINTER.activity += (((POINTER.active && idle < 3) ? 1 : 0) - POINTER.activity) * 0.06;
  }

  /* per-frame scene update */
  let stream = 0;
  let appearStart = performance.now();
  let t0 = performance.now() / 1000;
  function update(scroll: number, m: { x: number; y: number }) {
    const t = performance.now() / 1000;
    const dt = Math.min(0.05, t - t0); t0 = t;
    uniforms.uTime.value = t;

    // Stream the hills toward us at a constant rate; grow the swell with scroll.
    stream += dt * (flow * 2.0) * 4.0;
    uniforms.uStream.value = stream;
    uniforms.uWaveHeight.value = waveHeight * (1 + scroll * scrollRise);

    // Camera fly-path: smoothstep over the first 35% of scroll.
    const ea = Math.min(scroll / 0.35, 1.0);
    const e = ea * ea * (3 - 2 * ea);
    const camY = Lerp(camStartY, camEndY, e);
    const camZ = Lerp(camStartZ, camEndZ, e);
    camera.position.set(m.x * parallax, camY + m.y * parallax * 0.3, camZ);
    camera.lookAt(m.x * parallax * 0.5, Lerp(0.0, 0.6, e), Lerp(lookStartZ, lookEndZ, e));
    group.rotation.x = -tilt;
    group.rotation.y = 0;
    updatePointerWorld();

    uniforms.uCursor.value.copy(POINTER.world);
    uniforms.uActivity.value = POINTER.activity;
    if (!reduced) {
      const elapsed = (performance.now() - appearStart) / 1000;
      uniforms.uAppear.value = Math.max(0, Math.min(1, (elapsed - 0.2) / 1.4)); // 0.2s delay, 1.4s fade-in
    }
  }

  let frames = 0;
  function draw() {
    composer.render();
    canvas.dataset.frames = String(++frames);
    if (frames === 1) canvas.classList.add("on");
  }

  /* render loop: runs only while the dark theme is on, the sky isn't paused, motion is
     allowed and the tab is visible. Otherwise the last frame stays (or one still frame). */
  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    scrollSmooth = Lerp(scrollSmooth, scrollTarget, 0.10);
    scrollCurrent = Lerp(scrollCurrent, scrollSmooth, 0.06);
    mouse.x = Lerp(mouse.x, mouseTarget.x, 0.06);
    mouse.y = Lerp(mouse.y, mouseTarget.y, 0.06);
    update(scrollCurrent, mouse);
    draw();
  }
  // one frame, fully faded in (paused, reduced motion, or after a resize while stopped)
  function stillFrame() {
    update(scrollCurrent, mouse);
    uniforms.uAppear.value = 1;
    draw();
  }
  let shownBefore = false;
  function sync() {
    const moving = isDark() && !isPaused() && !reduced && !document.hidden;
    if (moving) {
      if (!raf) {
        t0 = performance.now() / 1000;
        if (!shownBefore) appearStart = performance.now();
        raf = requestAnimationFrame(loop);
      }
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
      if (isDark() && !document.hidden) stillFrame();
    }
    if (isDark()) shownBefore = true;
  }

  function resize() {
    const w = innerWidth, h = innerHeight, r = dpr();
    renderer.setPixelRatio(r);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    composer.setPixelRatio(r);
    composer.setSize(w, h);
    atmoMat.uniforms.uRes.value.set(w * r, h * r);
    // Point sizes are in device pixels; scale them so a phone or retina screen shows the
    // same dots as a standard one (the motes already scale through uRes).
    uniforms.uSize.value = pointSize * r;
    readScroll();
    if (!raf && isDark()) stillFrame(); // a resize clears the canvas
  }
  addEventListener("resize", resize);
  addEventListener("themechange", sync);
  addEventListener("skychange", sync);
  document.addEventListener("visibilitychange", sync);
  resize();
  sync();
}

const canvas = document.getElementById("wave") as HTMLCanvasElement | null;
if (canvas && !canvas.dataset.started) {
  try {
    start(canvas);
  } catch (err) {
    // No WebGL: the CSS background underneath stays, which is a fine fallback.
    console.warn("Flow Wave background could not start.", err);
  }
}
