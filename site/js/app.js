// ShortPlanet: the planet, its camera, the walk, the landing and the stars. Text lives in content.js, shapes
// in paint.js, the buildings in buildings.js.
import { EMAIL, PLACES, NB, UI, FR } from "./content.js";
import { ctx, useCanvas, T, rect, poly, circle, rrect, line, lit, clear, halo, still, hash, segs, grain, jit, hpoly, bands } from "./paint.js";
import { DRAW } from "./buildings.js";
import { initSound, setScene, rocket, chime, step, thump, world } from "./sound.js";

const N = PLACES.length, STEP = Math.PI * 2 / N;

const stored = (() => { try { return localStorage.getItem("shortplanet-lang"); } catch { return null; } })();
let lang = stored === "fr" || stored === "en" ? stored
  : (navigator.languages || [navigator.language || ""]).some((l) => /^fr\b/i.test(l)) ? "fr" : "en";
const t = (key, n) => { const v = UI[lang][key]; return typeof v === "function" ? v(n) : v; };
function loc(p) {
  const f = lang === "fr" && FR[p.key];
  if (!f) return p;
  return { ...p, ...f, projects: p.projects.map((q, k) => {
    const g = f.projects?.[k] || {};
    return { ...q, ...g,
      links: q.links && q.links.map(([l, u], j) => [g.links?.[j] ?? l, u]),
      mods: q.mods && q.mods.map(([n, k, d, dl], j) => [n, g.kinds?.[j] ?? k, g.mods?.[j] ?? d, g.dl?.[j] ?? dl]),
      modsLink: q.modsLink && [g.modsLink ?? q.modsLink[0], q.modsLink[1]] };
  }) };
}
let PL = PLACES.map(loc);   // the places in the current language; all text reads from here

/* ---------- elements ---------- */
const $ = (id) => document.getElementById(id);
const app = $("app"), canvas = $("world");
useCanvas(canvas);
const top = $("top"), card = $("card"), cardBody = $("cardBody"), tip = $("tip"), ledger = $("ledger");
const plain = $("plain"), dock = $("dock"), zoomBtn = $("zoomBtn");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const linkList = (links) => `<p class="links">${links.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join("")}</p>`;
const emailRow = () => `<div class="copyrow"><span>${t("email")}</span><code>${EMAIL}</code><button type="button" data-copy="${EMAIL}">${t("copy")}</button></div>`;
function projHTML(p) {
  let html = `<article class="proj"><h3>${esc(p.title)}</h3>`;
  if (p.shot) {   // a real screenshot of the project; a click enlarges it in place
    const [src, w, h] = p.shot;
    html += `<a class="shot" href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" width="${w}" height="${h}" alt="${esc(p.alt)}" loading="lazy" decoding="async"></a>`;
  }
  if (p.tagline) html += `<p class="tagline">${lang === "fr" ? `«${NB}${esc(p.tagline)}${NB}»` : `“${esc(p.tagline)}”`}</p>`;
  html += `<p>${esc(p.body)}</p><p class="meta mono">${esc(p.meta)}</p>`;
  if (p.links) html += linkList(p.links);
  if (p.email) html += emailRow();
  if (p.mods) {
    html += `<ul class="mods">${p.mods.map(([n, k, d, dl]) => `<li><div class="mod-text"><strong>${esc(n)}</strong><p>${esc(d)}</p></div><div class="dl">${esc(dl)}<small>${esc(k)}</small></div></li>`).join("")}</ul>`;
    html += linkList([p.modsLink]);
  }
  return html + `</article>`;
}

/* ---------- card ---------- */
$("dots").innerHTML = PLACES.map((p, i) => `<button type="button" data-place="${i}"></button>`).join("");
const dotBtns = [...$("dots").children];
const nameDots = () => dotBtns.forEach((b, i) => b.setAttribute("aria-label", `${PL[i].name}: ${PL[i].short}`));
let shown = -1;
function renderCard(i) {
  if (i === shown) return;
  shown = i;
  const p = PL[i];
  dotBtns.forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
  cardBody.innerHTML = `
    <h2 class="place-name">${esc(p.name)}</h2>
    <p class="onplanet">${esc(p.see)}</p>
    <div class="ask"><span class="label">${t("asks")}</span><p>${esc(p.ask)}</p></div>
    <div class="projects">${p.projects.map(projHTML).join("")}</div>`;
  cardBody.classList.remove("swap"); void cardBody.offsetWidth; cardBody.classList.add("swap");
  card.scrollTop = 0;
}
document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) { goTo(focus() + Number(go.dataset.go)); walked(); }
  const lb = e.target.closest("[data-lang]");
  if (lb) setLang(lb.dataset.lang);
  const pl = e.target.closest("[data-place]");
  if (pl) { goTo(Number(pl.dataset.place), true); walked(); }
  const cp = e.target.closest("[data-copy]");
  if (cp) {
    const done = () => { cp.textContent = t("copied"); setTimeout(() => (cp.textContent = t("copy")), 1600); };
    const code = cp.parentElement.querySelector("code");
    try { navigator.clipboard.writeText(cp.dataset.copy).then(done, () => selectText(code)); }
    catch { selectText(code); }
  }
});
function selectText(el) {
  const r = document.createRange(); r.selectNodeContents(el);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}

/* ---------- plain view ---------- */
function renderPlain() {
  const groups = [["null", "atlas", "git", "broadcast"], ["portals"], ["bench"], ["airfield"]].map((keys, k) => [t("groups")[k], keys]);
  const home = PL[0].projects[0];
  plain.innerHTML = `<div class="plain-inner">
    <div class="plain-top">
      <div><span class="label">ShortPlanet</span><h1>Finn Vignon</h1><p class="lede">${t("lede")} ${esc(home.body)}</p></div>
      <div class="plain-actions"><button class="btn primary" type="button" id="backBtn">${t("back")}</button>${langSwitch()}</div>
    </div>
    <section><span class="label">${t("contact")}</span>${linkList(home.links)}${emailRow()}</section>
    ${groups.map(([g, keys]) => `<section><h2>${g}</h2>${keys.flatMap((k) => PL.find((p) => p.key === k).projects).map(projHTML).join("")}</section>`).join("")}
  </div>`;
  $("backBtn").addEventListener("click", () => setPlain(false));
}
function setPlain(on) {
  plain.hidden = !on; app.hidden = on;
  document.body.classList.toggle("is-plain", on);
  if (on) { renderPlain(); window.scrollTo(0, 0); $("backBtn").focus(); }
  else { requestAnimationFrame(layout); canvas.focus({ preventScroll: true }); }
}
$("plainBtn").addEventListener("click", () => setPlain(true));

/* ---------- layout and camera ----------
   The world is the planet at (0, 0) with radius R; buildings use unit U = R * .065.
   The camera blends three framings: "near" stands on the surface with the place on top big and
   centred, "far" fits the whole planet, "title" is the front page, the planet small under the name.
   z = 0 is near, 1 is far, 2 is title. mode is "title", "landing" or "surface". */
let W = 0, H = 0, DPR = 1, R = 400, U = 30;
const near = { x: 0, y: 0, s: 1 }, far = { x: 0, y: 0, s: .4 }, title = { x: 0, y: 0, s: .2 }, cam = { x: 0, y: 0, s: 1 };
let z = 2, zView = false, mode = "title";
function moveCam() {
  const [a, b, k] = z <= 1 ? [near, far, z] : [far, title, z - 1];
  cam.s = a.s * Math.pow(b.s / a.s, k);
  cam.x = a.x + (b.x - a.x) * k;
  cam.y = a.y + (b.y - a.y) * k;
}
function layout() {
  if (app.hidden) return;
  const a = app.getBoundingClientRect();
  W = a.width; H = a.height; DPR = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  // offsets, not bounding boxes: the entrance animation moves these by a few pixels
  const tb = top.offsetTop + top.offsetHeight;
  const wide = W >= 860;
  const right = wide ? card.offsetLeft - 8 : W;
  const t = tb + 8, b = wide ? H - 20 : card.offsetTop - 6;
  const sh = Math.max(80, b - t);
  U = Math.max(6, Math.min(sh * .07, right * .06));   // narrow stages zoom out so the rocket beside Home stays in view
  R = U / .065;
  near.x = far.x = right / 2;
  near.y = t + sh * (wide ? .7 : .74) + R;
  // on phones the card slides down to its header in the whole-planet view, so the planet gets that room
  const fh = wide ? sh : Math.max(80, H - 60 - t);
  far.y = t + fh / 2; far.s = Math.min(right, fh) / 2 * .94 / (R * 1.55);
  title.x = W / 2; title.y = H * (wide ? .74 : .72); title.s = Math.min(W, H) * (wide ? .13 : .19) / R;
  dock.style.top = wide ? "" : (tb + 4) + "px";
  moveCam();
  if (T.planet) draw(performance.now() / 1000, 0);
}
new ResizeObserver(layout).observe(app);
new ResizeObserver(layout).observe(top);

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = rng(3058);
const SKY = Array.from({ length: 240 }, () => ({ x: rand(), y: rand(), r: .4 + rand() * 1.1, p: rand() * 6.28, s: .4 + rand() * 1.4 }));

/* ---------- visitors' stars ----------
   The sky's own stars are small round dots; a star a visitor lit is a warm four-point sparkle with
   shorter rays between the long ones and a bright core, so the two never read as the same thing. */
function sparkle(x, y, r, spin, bright) {
  halo(x, y, r * 3.2, T.glow, .32 * bright);
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
  const ray = (len, waist) => {
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const ang = k * Math.PI / 4, d = k % 2 ? waist : len;
      ctx[k ? "lineTo" : "moveTo"](Math.sin(ang) * d, -Math.cos(ang) * d);
    }
    ctx.closePath(); ctx.fill();
  };
  ctx.fillStyle = T.glow; ctx.globalAlpha = .55 * bright; ctx.rotate(Math.PI / 4); ray(r * .55, r * .14);
  ctx.globalAlpha = bright; ctx.rotate(-Math.PI / 4); ray(r, r * .2);
  ctx.fillStyle = "#fffaf2"; circle(0, 0, r * .2);
  ctx.restore();
}

/* ---------- small things on the surface ---------- */
// a lumpy blob, cut out by hand: a polygon whose corners sit a little in or out, the same way every time
function blob(path, x, y, r, seed) {
  for (let k = 0; k < 24; k++) {
    const th = k / 24 * Math.PI * 2, rr = r * (.93 + hash(seed * 13.1 + k) * .07 + Math.sin(th * 3 + seed) * .04);
    k ? path.lineTo(x + Math.cos(th) * rr, y + Math.sin(th) * rr) : path.moveTo(x + Math.cos(th) * rr, y + Math.sin(th) * rr);
  }
  path.closePath();
}
// light on a shape, from the upper left wherever it stands on the planet: a lit side and a shaded side
function shapeLight(path, ang, cx, cy, r) {
  const lx = Math.cos(-ang) * -.6 - Math.sin(-ang) * -.8, ly = Math.sin(-ang) * -.6 + Math.cos(-ang) * -.8;
  ctx.save(); ctx.clip(path);
  lit(T["planet-shade"], .4, () => circle(cx - lx * r * 1.1, cy - ly * r * 1.1, r * 1.25));
  lit(T.rim, .12, () => circle(cx + lx * r * 1.05, cy + ly * r * 1.05, r * .95));
  ctx.restore();
}
// trees: roots in the soil, a trunk that leans a little, and either a leafy crown or a pine; they sway in the wind
function tree(s, i, ang, t) {
  const sway = still() ? 0 : Math.sin(t * .9 + i * 1.7) * .035;
  ctx.save(); ctx.scale(s, s);
  segs([[-.05, .05, -.32, .42], [.04, .05, .22, .5], [0, .05, -.04, .58]], T["planet-shade"], .05, .6);
  ctx.fillStyle = T.planet;
  if (i % 3 === 2) {
    rect(-.06, -.55, .12, .67);
    ctx.rotate(sway);
    const crown = new Path2D();
    for (let k = 0; k < 3; k++) { const y = -.38 - k * .4, w = .6 - k * .14; crown.moveTo(-w + jit(i, k, .04), y); crown.lineTo(jit(i, k + 3, .05), y - .72); crown.lineTo(w + jit(i, k + 6, .04), y); crown.closePath(); }
    ctx.fill(crown); shapeLight(crown, ang, 0, -1, .75);
  } else {
    poly([-.1, .12, .1, .12, .06, -.85, .02, -1.05, -.05, -1.05, -.07, -.85]);
    line([.03, -.7, .26, -.95], T.planet, .06);
    ctx.rotate(sway);
    const crown = new Path2D();
    for (const [x, y, r, k] of [[0, -1.32, .46, 1], [.3, -1.06, .32, 2], [-.3, -1.08, .3, 3], [.1, -1.62, .3, 4]]) blob(crown, x, y, r, i * 5 + k);
    ctx.fill(crown); shapeLight(crown, ang, 0, -1.28, .6);
  }
  ctx.restore();
}
// a tuft of grass: thin blades of different heights, leaning their own way, now and then a flower and a stone
function tufts(i, ang, t) {
  const n = 7 + (i % 3), sway = still() ? 0 : Math.sin(t * 1.3 + i * 2.1) * .05;
  ctx.fillStyle = T.planet; hpoly([.34, .08, .44, -.06, .6, -.08, .66, .08], i * 9, .02);
  for (let k = 0; k < n; k++) {
    const x = -.5 + k / (n - 1) * .9, h = .22 + hash(i * 5 + k) * .42, lean = (hash(i * 3 + k) - .5) * .32 + sway * h;
    lit(k % 3 === 1 ? T.rim : T.planet, k % 3 === 1 ? .2 : 1, () => poly([x - .035, .1, x + lean * .45, .1 - h * .55, x + lean, .1 - h, x + .035, .1]));
    if (k % 3 === 1) { ctx.fillStyle = T.planet; poly([x - .03, .1, x + lean * .45 + .005, .1 - h * .55, x + lean, .1 - h, x + .005, .1]); }
  }
  if (i % 2 === 0) { segs([[-.12, .1, -.1 + sway * .5, -.62]], T.planet, .03); lit(i % 4 ? T["door-b"] : T.glow, .75, () => circle(-.1 + sway * .5, -.66, .06)); }
}
const PEBBLES = Array.from({ length: 110 }, (_, k) => {
  const h = hash(k + 1);
  return { a: (k + (hash(k) - .5) * .6) / 110 * Math.PI * 2, d: h < .5 ? .4 + h * .9 : 1.9 + h * 1.6, r: .07 + hash(k + 2) * .13 };
});
// grass all along the surface, a few crystals in the deep rock, and the wavy edges of the soil and rock layers
const GRASS = Array.from({ length: 640 }, (_, k) => {
  const a = (k + hash(k + 300) * .8) / 640 * Math.PI * 2, patch = Math.max(0, Math.sin(a * 17) + Math.sin(a * 41 + 1) * .6 + .2);   // it grows in patches
  return { a, h: .04 + patch * (.08 + hash(k + 310) ** 2 * .22), l: (hash(k + 320) - .5) * .18 };
});
const CRYSTALS = Array.from({ length: 9 }, (_, k) => ({ a: (k + .5 + hash(k + 400) * .5) / 9 * Math.PI * 2, d: 2.6 + hash(k + 410) * 1.4, r: .12 + hash(k + 420) * .1, c: ["door-b", "door-c", "glow"][k % 3] }));
const layerEdge = (depth, wave, seed) => Array.from({ length: 180 }, (_, k) => depth + Math.sin(k * .7 + seed) * wave * .5 + Math.sin(k * .23 + seed * 2) * wave + (hash(k + seed * 50) - .5) * wave * .4);
const SOIL = layerEdge(.55, .1, 1), ROCK = layerEdge(1.75, .16, 3);
function ring(edge) { ctx.beginPath(); edge.forEach((d, k) => { const th = k / edge.length * Math.PI * 2, r = R - d * U; k ? ctx.lineTo(Math.sin(th) * r, -Math.cos(th) * r) : ctx.moveTo(Math.sin(th) * r, -Math.cos(th) * r); }); ctx.closePath(); }
const CLOUDS = Array.from({ length: 7 }, (_, k) => ({ a: k * .9 + hash(k + 20) * .5, h: 6.6 + hash(k + 30) * 2.2, s: .7 + hash(k + 40) * .7, v: .01 + hash(k + 50) * .025 }));
function cloud(s) {
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.6 * s, .45 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(-.45 * s, -.3 * s, .6 * s, .45 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(.4 * s, -.4 * s, .75 * s, .55 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}
function groundLabel(name, a) {
  ctx.save(); ctx.globalAlpha *= (.3 + .6 * a) * Math.max(0, 1 - z * 2.5);
  ctx.scale(1 / 40, 1 / 40); ctx.fillStyle = T.rim; ctx.font = `500 15px ${T["f-mono"]}`; ctx.textAlign = "center";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
  ctx.fillText(name.toUpperCase(), 0, 54); ctx.restore();
}

/* ---------- rotation ---------- */
let rot = 0, target = 0, dragging = false, vel = 0, prevRot = 0, spin = 0;
let hasWalked = false;
const awake = PLACES.map((_, i) => (i === 0 ? 1 : 0));
const mod = (a, n) => ((a % n) + n) % n;
const selected = () => mod(Math.round(-rot / STEP), N);
// the place the walk is heading to: where the planet will settle, or what is on top mid-drag
const focus = () => (dragging ? selected() : mod(Math.round(-target / STEP), N));
function goTo(i, land) {
  const cur = Math.round(-target / STEP);
  let d = mod(i - mod(cur, N), N); if (d > N / 2) d -= N;
  target = -(cur + d) * STEP;
  if (still()) rot = target;
  if (land) setView(false);
}
function walked() { hasWalked = true; }
function syncFar() { app.classList.toggle("is-far", zView || placing); dock.hidden = placing; }
function setView(whole) {
  zView = whole; syncFar();
  zoomBtn.textContent = t(whole ? "surface" : "whole");
  zoomBtn.setAttribute("aria-pressed", String(whole));
}
zoomBtn.addEventListener("click", () => setView(!zView));

/* ---------- visitor stars ---------- */
let stars = [];
let placing = false, pending = null, litAt = -9;
function toScreen(ang, d) { return [cam.x + Math.sin(ang) * d * cam.s, cam.y - Math.cos(ang) * d * cam.s]; }
function placePos(i, out) { return toScreen(rot + i * STEP, R + out); }
// a star is an angle around the planet and a height h (0 just above the ground, 1 the top of the sky);
// the sky's depth follows the camera, so a star keeps its place in the sky on every screen and view
const skyDepth = () => Math.max(Math.min(W, H) * .3, cam.y - cam.s * R * 1.1 - 16);
function starPos(s) {
  const ang = s.a + rot * .25, d = cam.s * R * 1.12 + s.h * skyDepth();
  return [cam.x + Math.sin(ang) * d, cam.y - Math.cos(ang) * d];
}
function skyAt(x, y) {
  const dx = x - cam.x, dy = y - cam.y, h = (Math.hypot(dx, dy) - cam.s * R * 1.12) / skyDepth();
  return h < .04 || h > 1.05 ? null : { a: Math.atan2(dx, -dy) - rot * .25, h: Math.min(1, h) };
}

/* ---------- walker (world frame, stands in the gap left of the place on top) ---------- */
const WALK_ANGLE = -STEP * .36;
// The walker is jointed: hips, knees, shoulders and elbows, worked out each frame from one stride phase.
// Speed blends a walk into a run (longer strides, bent arms, a forward lean, knees that give on landing),
// and the lowest foot always rests on the ground, so the body rises and falls on its own. Standing still
// it breathes, shifts its weight and now and then looks up at the sky; the lantern swings on its handle.
const gait = { phase: 0, facing: 1, face: 1, speed: 0, run: 0, swing: 0, swingV: 0, flow: 0, ripple: 0 };
function limb(x, y, a1, l1, a2, l2) {   // two segments from (x, y); angles from straight down, forward is +
  const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
  return [x, y, kx, ky, kx + Math.sin(a2) * l2, ky + Math.cos(a2) * l2];
}
function drawWalker(t, dt, dRot, ang = WALK_ANGLE, alpha = 1) {
  const s = U * .4, g = gait;
  const v = dt ? Math.abs(dRot) * R / s / dt : 0, was = g.speed;   // ground speed, in walker heights / 3.5 per second
  if (v > .4) g.facing = dRot < 0 ? 1 : -1;   // only a real step the other way turns the walker round
  g.speed += (v - g.speed) * (1 - Math.pow(.002, dt));
  const run = (g.run += (smooth((g.speed - 3.2) / 4) - g.run) * (1 - Math.pow(.01, dt)));
  const moving = clamp01(g.speed / 1.2);
  g.face += (g.facing - g.face) * (still() ? 1 : 1 - Math.pow(1e-5, dt));   // turning round squeezes the figure for a moment
  // one step per half turn of the phase; longer steps when running, and never more than about four a second
  const step0 = Math.floor(g.phase / Math.PI);
  g.phase += Math.min(g.speed * dt / (1.15 + 1.35 * run), 4.4 * dt) * Math.PI;
  if (moving > .3 && Math.floor(g.phase / Math.PI) !== step0) step();
  const p = g.phase, idle = still() ? 0 : 1 - moving;

  // legs: the thigh swings, the knee folds while the foot comes through, and gives a little on landing
  const amp = (.42 + .3 * run) * moving;
  const leg = (q) => {
    const th = amp * Math.sin(q), c = Math.cos(q);
    const bend = (.06 + .1 * run) * moving + (.55 + .7 * run) * moving * Math.max(0, c) ** 2 + .3 * run * moving * Math.max(0, -c) * Math.max(0, Math.sin(q + .6));
    return limb(0, 0, th, .7, th - bend, .68);
  };
  const near = leg(p), far = leg(p + Math.PI);
  const sway = idle * Math.sin(t * .8) * .03, breath = idle * Math.sin(t * 1.7) * .02;
  const hipY = -Math.max(near[5], far[5]) - .07 - (run * moving * .12 * Math.abs(Math.sin(p)));
  // leaning into the run, and a little more while speeding up
  const lean = (.05 + .2 * run) * moving + Math.max(-.12, Math.min(.12, dt ? (g.speed - was) / dt * .02 : 0));
  const lookUp = still() ? 0 : idle * smooth(Math.sin(t * .7) * 4 - 3.2) * .4;   // every nine seconds or so, a look at the sky
  const hx = sway, hy = hipY;
  const up = (d) => [hx + Math.sin(lean) * d, hy - Math.cos(lean) * d];
  const [nx, ny] = up(1.12 + breath), [sx, sy] = up(.95), [hdx, hdy] = up(1.62 + breath);
  // arms swing against the legs and bend when running; the near hand carries the lantern and swings less
  const armA = (.32 + .4 * run) * moving, elbow = .2 + 1.05 * run * moving;
  const farArm = limb(sx - .05, sy, -armA * Math.sin(p) + lean, .52, -armA * Math.sin(p) + lean + elbow, .48);
  const nearArm = limb(sx + .05, sy, armA * .45 * Math.sin(p) + lean + .35, .52, armA * .45 * Math.sin(p) + lean + .35 + .55 + elbow * .5, .46);
  // the lantern hangs from the hand and swings: pushed back as the walker speeds up, nudged by each step
  const accel = dt ? (g.speed - was) / dt : 0;
  g.swingV += (-38 * g.swing - 3.2 * g.swingV - accel * .9 - moving * Math.cos(p * 2) * 1.6 + idle * Math.sin(t * 1.3) * .5) * dt;
  g.swing += g.swingV * dt; g.swing = Math.max(-.9, Math.min(.9, g.swing));

  ctx.save(); ctx.globalAlpha *= alpha; ctx.rotate(ang); ctx.translate(0, -R + U * .1); ctx.scale(s * g.face, s);
  const shade = (pts, w) => { line(pts, T.walker, w); line(pts, T["planet-shade"], w, .38); };
  const foot = (l, w) => { const [, , , , ax, ay] = l; line([ax - .06, ay, ax + .24, ay + .02], T.walker, w); };
  // far side first, a shade darker, so the figure has depth
  shade([farArm[0], farArm[1], farArm[2], farArm[3], farArm[4], farArm[5]], .19);
  ctx.save(); ctx.translate(hx, hy); shade(far, .27); foot(far, .2); lit(T["planet-shade"], .38, () => foot(far, .2)); ctx.restore();
  // the scarf: a tapered ribbon from the back of the neck. It hangs and stirs when standing, lifts as the walker
  // speeds up and streams out behind at a run, with a ripple running down it. The ripple keeps its own phase,
  // so a change of pace changes how fast it ripples without making it jump.
  {
    g.flow += (clamp01(g.speed / 7) - g.flow) * (1 - Math.pow(.05, dt));
    g.ripple += dt * (2.2 + 9 * g.flow);
    const f = still() ? 0 : g.flow, n = 10, len = .75 + .4 * f;
    const ox = nx - .26 * Math.cos(lean), oy = ny + .14;
    const mid = [], wid = [];
    let x = ox, y = oy;
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      // angle from straight down, towards the back: hanging (a little back) to streaming (nearly level, drooping at the tip)
      const dir = .5 + .15 * u * (1 - f) + (1.05 - .4 * u) * f + (still() ? 0 : Math.sin(g.ripple - u * 4.2) * (.05 + .16 * f) * u);
      if (k) { x -= Math.sin(dir) * len / n; y += Math.cos(dir) * len / n; }
      mid.push([x, y, dir]); wid.push(.15 - .07 * u);
    }
    const edge = (side) => mid.map(([mx, my, d], k) => [mx + Math.cos(d) * wid[k] / 2 * side, my + Math.sin(d) * wid[k] / 2 * side]);
    const left = edge(1), right = edge(-1).reverse(), rim = left.concat(right);
    const path = new Path2D(); path.moveTo(...rim[0]);
    for (let k = 1; k < rim.length - 1; k++) path.quadraticCurveTo(...rim[k], (rim[k][0] + rim[k + 1][0]) / 2, (rim[k][1] + rim[k + 1][1]) / 2);
    path.lineTo(...rim[rim.length - 1]); path.closePath();
    ctx.fillStyle = T.signal; ctx.fill(path);
    lit(T["planet-shade"], .25, () => { ctx.save(); ctx.clip(path); line(right.flat(), T["planet-shade"], .07); ctx.restore(); });
  }
  // body, breathing; then the head in its helmet, with a visor looking where the walker looks
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(lean); ctx.fillStyle = T.walker;
  rrect(-.4, -1.24 - breath, .8, 1.32 + breath, .38);
  lit(T["planet-shade"], .22, () => rrect(-.4, -1.24 - breath, .22, 1.32 + breath, [.38, 0, 0, .38]));
  lit(T.signal, .85, () => rrect(-.4, -1.18 - breath, .8, .16, .06));
  ctx.restore();
  ctx.save(); ctx.translate(hdx, hdy); ctx.rotate(lean * .6 - lookUp); ctx.fillStyle = T.walker; circle(0, 0, .44);
  lit(T["planet-shade"], .7, () => rrect(.04, -.2, .38, .3, .14));
  lit(T.rim, .55, () => rrect(.1, -.16, .12, .06, .03));
  ctx.restore();
  ctx.save(); ctx.translate(hx, hy); line(near, T.walker, .27); foot(near, .2); ctx.restore();
  line(nearArm, T.walker, .19);
  // the lantern: a handle, a cap, glass in a frame, a base, and a flame that flickers
  const [lx, ly] = [nearArm[4], nearArm[5]];
  ctx.save(); ctx.translate(lx, ly); ctx.rotate(g.swing);
  const fl = still() ? 1 : .85 + .15 * Math.sin(t * 17) * Math.sin(t * 7.3);
  bands(0, .38, 1.25, T.glow, .32 * fl);
  ctx.strokeStyle = T.roof; ctx.lineWidth = .045; ctx.beginPath(); ctx.arc(0, .08, .1, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = T.roof; poly([-.12, .08, .12, .08, .17, .2, -.17, .2]); rect(-.03, .02, .06, .06);
  lit(T.glow, .75 + .25 * fl, () => rect(-.13, .2, .26, .3));
  lit(T.rim, .9 * fl, () => { ctx.beginPath(); ctx.ellipse(0, .37, .045, .085 * fl, 0, 0, Math.PI * 2); ctx.fill(); });
  segs([[-.13, .2, -.13, .5], [.13, .2, .13, .5], [0, .2, 0, .25]], T.roof, .035);
  ctx.fillStyle = T.roof; rrect(-.16, .49, .32, .07, .03);
  ctx.restore();
  ctx.restore();
}function drawWalkHint() {
  const a = Math.max(0, 1 - z * 3);
  if (hasWalked || a <= 0 || mode !== "surface") return;
  const [x, y] = toScreen(WALK_ANGLE, R + U * 2.7);
  ctx.save(); ctx.fillStyle = T.ink; ctx.globalAlpha = .8 * a; ctx.font = `13px ${T["f-body"]}`; ctx.textAlign = "center";
  const half = ctx.measureText(t("walk")).width / 2 + 10;   // keep the whole line on screen
  ctx.fillText(t("walk"), Math.max(half, Math.min(W - half, x)), y); ctx.restore();
}

/* ---------- plane and duck ---------- */
const planeAngle = (t) => (still() ? .9 : t * .11);   // the plane circles the sky; straight overhead at 0
function drawPlane(t) {
  const ang = planeAngle(t), r = R + U * 7.4, s = U * .45;
  ctx.save(); ctx.rotate(ang); ctx.translate(0, -r); ctx.scale(s, s);
  ctx.fillStyle = T.planet;
  rrect(-1.4, -.22, 2.8, .44, .22); poly([-.3, 0, .35, 0, -.5, -1.3, -.85, -1.3]); poly([-.3, 0, .35, 0, -.5, 1.3, -.85, 1.3]); poly([-1.4, 0, -1.05, 0, -1.55, -.7]);
  lit(T.signal, still() ? 1 : (Math.sin(t * 5) > .4 ? 1 : .15), () => circle(-1.45, -.1, .14));
  ctx.restore();
}
function drawDuck(t, a) {
  if (a < .02) return;
  const ang = -t * .3 + 1.2, r = R + U * 5.8, s = U * .4;
  const flap = still() ? 0 : Math.sin(t * 9) * .7;
  ctx.save(); ctx.globalAlpha *= a; ctx.rotate(ang); ctx.translate(0, -r); ctx.rotate(Math.PI); ctx.scale(s, s);
  ctx.fillStyle = T.planet;
  ctx.beginPath(); ctx.ellipse(0, 0, 1, .45, 0, 0, Math.PI * 2); ctx.fill();
  circle(1, -.35, .32); poly([1.25, -.4, 1.75, -.3, 1.25, -.2]);
  poly([-.3, -.1, .4, -.1, -.1, -1.1 * (flap + .3)]);
  ctx.restore();
}

/* ---------- the rocket: how every visit arrives ----------
   Timeline in seconds after "Land": it streaks in from the top right while the camera dives, flips to
   point its engine at the ground, brakes down beside Home, touches down, and the walker steps out. */
const LAND_ANGLE = -STEP * .5, ROCKET = .85;    // where it parks (left of Home), and its size in U
const LT = { start: .25, flip: 2.85, touch: 4.05, out: 4.5, end: 5.9 };
let landT = 0, rot0 = 0, landed = false, walkerWas = LAND_ANGLE, travelV = 0;
const follow = { x: 0, y: 0 };   // how far the camera has panned to ride with the rocket
const puffs = [];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const turnTo = (a, b, k) => a + (mod(b - a + Math.PI, Math.PI * 2) - Math.PI) * k;

function startLanding() {
  if (mode !== "title") return;
  if (placing) stopPlacing();
  mode = "landing"; landT = 0; tip.hidden = true; dragging = false; canvas.classList.remove("dragging", "over-place");
  rot0 = mod(rot + Math.PI, Math.PI * 2) - Math.PI; rot = prevRot = target = rot0;
  app.classList.replace("is-title", "is-landing");
  if (still()) finishLanding(); else rocket(LT.touch - LT.start + .3, false);
}
function finishLanding() {
  mode = "surface"; landed = true; target = 0;
  app.classList.remove("is-title", "is-landing"); setScene("planet");
  canvas.focus({ preventScroll: true });
}
$("landBtn").addEventListener("click", startLanding);

// leaving runs the landing backwards: home on top, the walker boards, the engine lights, the rocket
// climbs away and the camera pulls back out to the front page
const TT = { walk: .45, board: 1.85, ignite: 1.9, lift: 2.45, gone: 4.15 };
let takeT = 0;
function startTakeoff() {
  if (mode !== "surface") return;
  if (placing) stopPlacing();
  setView(false);
  mode = "takeoff"; takeT = 0; tip.hidden = true; dragging = false; walkerWas = WALK_ANGLE;
  canvas.classList.remove("dragging", "over-place");
  rot0 = mod(rot + Math.PI, Math.PI * 2) - Math.PI; rot = prevRot = target = rot0;
  app.classList.add("is-landing"); setScene("space");
  if (still()) finishTakeoff(); else setTimeout(() => { if (mode === "takeoff") rocket(TT.gone - TT.ignite, true); }, TT.ignite * 1000);
}
function finishTakeoff() {
  mode = "title"; landed = false; landT = 0; target = rot; walkerWas = LAND_ANGLE;
  app.classList.remove("is-landing"); app.classList.add("is-title");
  $("landBtn").focus({ preventScroll: true });
}
$("leaveBtn").addEventListener("click", startTakeoff);
// the rocket once it has left the ground, in the world frame
function rocketUp(tt) {
  if (tt < TT.lift) return null;
  const s = (tt - TT.lift) / (TT.gone - TT.lift), alt = ROCKET * .5 + 70 * Math.pow(s, 2.2);
  const ang = rot + LAND_ANGLE + .8 * s * s;
  return { x: Math.sin(ang) * (R + alt * U), y: -Math.cos(ang) * (R + alt * U), ang: ang + .6 * s,
    flame: 1, legs: 1 - smooth(s / .12), alt };
}
const parkedFlame = () => (mode === "takeoff" ? .9 * smooth((takeT - TT.ignite) / .45) : 0);

// where the rocket is at landing time tl, in the world frame
function rocketAt(tl) {
  const site = rot + LAND_ANGLE, ux = Math.sin(site), uy = -Math.cos(site);
  if (tl < LT.flip) {
    const x = clamp01((tl - LT.start) / (LT.flip - LT.start)), p = 1 - Math.pow(1 - x, 2.4);
    const P0 = [7 * R, -5.6 * R], C = [1.6 * R, -3.4 * R], P2 = [ux * (R + 4 * U), uy * (R + 4 * U)];
    const b = (i) => (1 - p) ** 2 * P0[i] + 2 * p * (1 - p) * C[i] + p * p * P2[i];
    const v = (i) => 2 * (1 - p) * (C[i] - P0[i]) + 2 * p * (P2[i] - C[i]);
    const flip = smooth((x - .6) / .35);
    return { x: b(0), y: b(1), ang: turnTo(Math.atan2(v(0), -v(1)), site, flip),
      flame: Math.max(x < .45 ? 1 - x * .6 : 0, flip * .9), legs: 0, alt: 9 };
  }
  const q = clamp01((tl - LT.flip) / (LT.touch - LT.flip)), alt = 4 - (4 - ROCKET * .5) * smooth(q);
  return { x: ux * (R + alt * U), y: uy * (R + alt * U), ang: site, flame: q < 1 ? .9 - .5 * smooth(q) : 0,
    legs: smooth((q - .1) / .5), alt };
}

// drawn nose up with the nozzle at y = 0 and the feet at y = .5 once the legs are out (unit: U * ROCKET)
function drawRocket(flame, legs, door, t) {
  if (flame > .01) {
    const f = flame * (still() ? 1 : .85 + .15 * Math.sin(t * 47) + .05 * Math.sin(t * 31));
    halo(0, .5, 1.4 + f * 1.4, T.glow, .55 * flame);
    lit(T.glow, .95, () => { ctx.beginPath(); ctx.moveTo(-.36, -.05); ctx.quadraticCurveTo(-.3, .9 * f, 0, 1 + 2.4 * f); ctx.quadraticCurveTo(.3, .9 * f, .36, -.05); ctx.fill(); });
    lit(T.rim, .9, () => { ctx.beginPath(); ctx.moveTo(-.18, -.05); ctx.quadraticCurveTo(-.14, .5 * f, 0, .45 + 1.3 * f); ctx.quadraticCurveTo(.14, .5 * f, .18, -.05); ctx.fill(); });
  }
  const lx = .5 + .6 * legs, ly = .5 * legs;
  segs([[-.45, -1, -lx, ly], [.45, -1, lx, ly]], T.roof, .12);
  ctx.fillStyle = T.roof; rect(-lx - .2, ly - .06, .4, .1); rect(lx - .2, ly - .06, .4, .1);
  poly([-.58, -1.55, -1.05, -.5, -1, -.05, -.58, -.6]); poly([.58, -1.55, 1.05, -.5, 1, -.05, .58, -.6]);
  poly([-.32, -.5, .32, -.5, .42, 0, -.42, 0]);
  // body, with a painted nose and band, shaded on the right
  ctx.fillStyle = T.wall; ctx.beginPath();
  ctx.moveTo(0, -3.7); ctx.bezierCurveTo(.55, -3.3, .68, -2.5, .62, -1.4); ctx.lineTo(.55, -.45);
  ctx.lineTo(-.55, -.45); ctx.lineTo(-.62, -1.4); ctx.bezierCurveTo(-.68, -2.5, -.55, -3.3, 0, -3.7); ctx.fill();
  ctx.save(); ctx.clip();
  lit(T.signal, .9, () => { rect(-.8, -3.8, 1.6, .62); rect(-.8, -1.42, 1.6, .16); });
  lit(T.roof, .35, () => rect(.22, -3.8, .7, 3.4));
  ctx.restore();
  segs([[-.6, -2.9, -.62, -1.5]], T.rim, .05, .4);
  ctx.fillStyle = T.roof; circle(0, -2.35, .3);
  lit(T.glow, .85, () => circle(0, -2.35, .2));
  ctx.fillStyle = T.roof; rect(-.24, -1.2, .48, .66);
  if (door > 0) { halo(0, -.87, 1, T.glow, .4 * door); lit(T.glow, door, () => rect(-.18, -1.15, .36, .58)); }
}

// dust thrown sideways along the ground, then a little smoke rising after touchdown (site frame, unit U)
function updatePuffs(dt, r) {
  if ((mode === "landing" || mode === "takeoff") && dt && !still()) {
    const near = r.alt < 3 && r.flame > .05 ? (1 - r.alt / 3) : 0, after = mode === "landing" && landT > LT.touch && landT < LT.touch + 1.2;
    for (let n = dt * (near * 70 + (after ? 12 : 0)); n > 0; n--) {
      if (n < 1 && Math.random() > n) break;
      const side = Math.random() < .5 ? -1 : 1;
      puffs.push(after && !near
        ? { x: (Math.random() - .5) * .5, y: -.2, vx: (Math.random() - .5) * .4, vy: -.6 - Math.random() * .5, age: 0, life: 1.4 + Math.random(), r: .25 }
        : { x: side * (.3 + Math.random() * .5), y: -.15, vx: side * (2 + Math.random() * 3), vy: -Math.random() * .7, age: 0, life: .8 + Math.random() * .7, r: .2 + Math.random() * .3 });
    }
  }
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i]; p.age += dt; if (p.age > p.life) { puffs.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(.15, dt);
  }
}
function drawPuffs() {
  for (const p of puffs) { const k = p.age / p.life; lit(T.rim, .3 * (1 - k), () => circle(p.x, p.y, p.r + k * .8)); }
}

/* ---------- frame ---------- */
let last = performance.now(), shoot = null, nextShoot = 6;
// To save battery, once nothing is moving and nobody has touched the page for a few seconds, the ambient
// life (twinkling, clouds, the plane) is drawn 30 times a second instead of 60, or twice with reduced motion.
let lastInput = 0;
for (const ev of ["pointerdown", "pointermove", "keydown", "wheel"]) addEventListener(ev, () => (lastInput = performance.now()), { passive: true });
function settled(now) {
  return !dragging && !placing && (mode === "title" || mode === "surface") && now - lastInput > 3000 && now / 1000 - litAt > 2
    && (mode === "title" || Math.abs(target - rot) < 1e-3) && Math.abs(z - (mode === "title" ? 2 : zView ? 1 : 0)) < .003;
}
function frame(now) {
  requestAnimationFrame(frame);
  if (settled(now) && now - last < (still() ? 500 : 1000 / 30) - 2) return;
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!app.hidden) {
    if (mode === "landing") {
      // the planet turns Home toward the incoming rocket
      if (landT < LT.touch && landT + dt >= LT.touch) thump();
      landT += dt;
      rot = target = rot0 * (1 - smooth(landT / LT.flip));
      if (landT >= LT.out) app.classList.remove("is-landing");
      if (landT >= LT.end) finishLanding();
    } else if (mode === "takeoff") {
      // Home comes back on top so the rocket is in view, then it leaves
      takeT += dt;
      rot = target = rot0 * (1 - smooth(takeT / 1));
      if (takeT >= TT.gone) finishTakeoff();
    } else if (!dragging) {
      if (mode === "title" && !still()) target -= dt * .06;   // the front page planet turns slowly
      if (mode === "title") { rot += (target - rot) * (1 - Math.pow(.004, dt)); travelV = 0; }
      else {
        // walking or running to a place: speed builds up, holds at a pace the walker's legs can keep, and eases
        // off on arrival; longer trips go faster, since the camera pulls back for them
        const d = target - rot, top = U * (5.5 + 6 * Math.max(0, Math.abs(d) / STEP - 1)) / R;
        const want = Math.sign(d) * Math.min(top, Math.abs(d) * 2.6);
        // speed up gradually, but slow down exactly as the distance asks, so it never overshoots and turns back
        travelV = Math.abs(want) < Math.abs(travelV) && Math.sign(want) === Math.sign(travelV) ? want : travelV + (want - travelV) * (1 - Math.pow(.015, dt));
        rot += travelV * dt;
        if ((target - rot) * d < 0) { rot = target; travelV = 0; }
      }
      if (Math.abs(target - rot) < 1e-4 && Math.abs(travelV) < 2e-3) { rot = target; travelV = 0; }
    }
    renderCard(focus());
    draw(now / 1000, dt);
  }
  // each place's sounds follow how awake it is; off the planet, or in the plain view, they fade away
  world(mode === "surface" && !app.hidden ? Object.fromEntries(PLACES.map((p, i) => [p.key, awake[i]])) : null, now / 1000, planeAngle(now / 1000));
}

function draw(t, dt) {
  const dRot = rot - prevRot; prevRot = rot;
  const sel = focus();
  const ease = still() ? 1 : 1 - Math.pow(.02, dt);
  awake.forEach((v, i) => { awake[i] = dt ? v + ((i === sel ? 1 : 0) - v) * ease : v; });

  // camera: the front page sits far out, the landing dives in, and on the surface it rises while you
  // drag or travel far and pulls out for the whole planet
  const rocket = mode === "landing" ? rocketAt(landT) : mode === "takeoff" ? rocketUp(takeT) : null;
  if (dt) {
    if (mode === "landing") z = still() ? 0 : 2 * (1 - smooth((landT - .35) / 3.25));
    else if (mode === "takeoff") z = still() ? 2 : 2 * smooth((takeT - (TT.lift - .15)) / 1.95);
    else {
      const travel = Math.min(.75, Math.max(0, (Math.abs(target - rot) - STEP * 1.2) / (STEP * 2.5)));
      const zt = mode === "title" ? 2 : Math.max(zView || placing ? 1 : 0, dragging && moved ? .35 : 0, travel);
      z = still() ? zt : z + (zt - z) * (1 - Math.pow(.06, dt));
    }
    spin += ((dRot / dt) - spin) * Math.min(1, dt * 8);
    moveCam();
    // during the landing the camera rides with the rocket: it glides after it, a little behind, keeping it
    // near the middle, then lets go over the last stretch of the descent and settles on Home
    let fx = 0, fy = 0;
    if (rocket && !still()) {
      const w = mode === "landing" ? smooth((landT - LT.start) / .9) * (1 - smooth((landT - LT.flip + .5) / 2))
        : smooth((takeT - TT.lift) / .6) * (1 - smooth((takeT - (TT.lift + .9)) / .7));
      fx = (W * .5 - (cam.x + rocket.x * cam.s)) * w * .85;
      fy = (H * .45 - (cam.y + rocket.y * cam.s)) * w * .85;
      const lim = Math.min(W, H) * .38, m = Math.hypot(fx, fy);   // never far enough to lose the planet
      if (m > lim) { fx *= lim / m; fy *= lim / m; }
    }
    const lag = 1 - Math.pow(.03, dt);
    follow.x += (fx - follow.x) * lag; follow.y += (fy - follow.y) * lag;
    cam.x += follow.x; cam.y += follow.y;
    const shake = mode === "landing" && !still() ? 1 - clamp01((landT - LT.touch) / .45) : 0;
    if (shake > 0 && landT > LT.touch) { cam.x += Math.sin(landT * 95) * 3.5 * shake; cam.y += Math.cos(landT * 71) * 2.5 * shake; }
    const rumble = mode === "takeoff" && !still() ? parkedFlame() * (1 - smooth((takeT - TT.lift) / .5)) : 0;
    if (rumble > 0) { cam.x += Math.sin(t * 83) * 2 * rumble; cam.y += Math.cos(t * 67) * 1.5 * rumble; }
  }
  updatePuffs(dt, rocket || (mode === "takeoff" ? { alt: ROCKET * .5, flame: parkedFlame() } : { alt: 9, flame: 0 }));
  const lean = still() ? 0 : Math.max(-.16, Math.min(.16, spin * .07));

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // background stars drift a little as the planet turns
  ctx.fillStyle = T.star;
  for (const s of SKY) {
    const tw = still() ? .75 : .55 + .45 * Math.sin(t * s.s + s.p);
    ctx.globalAlpha = T.starAlpha * tw * (.35 + s.r / 2);
    circle(mod(s.x + rot * .012 * s.r, 1) * W, s.y * H, s.r);
  }
  ctx.globalAlpha = 1;

  // a shooting star now and then
  if (!still()) {
    nextShoot -= dt;
    if (nextShoot <= 0 && !shoot) { shoot = { x: Math.random() * W * .7, y: Math.random() * H * .3, life: 0 }; nextShoot = 9 + Math.random() * 10; }
    if (shoot) {
      shoot.life += dt;
      const p = shoot.life / .9, x = shoot.x + p * 220, y = shoot.y + p * 90;
      const g = ctx.createLinearGradient(x - 90, y - 37, x, y);
      g.addColorStop(0, clear(T.star)); g.addColorStop(1, T.star);
      ctx.save(); ctx.globalAlpha = T.starAlpha * Math.sin(Math.min(1, p) * Math.PI);
      ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 90, y - 37); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
      if (p >= 1) shoot = null;
    }
  }

  // visitor stars
  const all = stars.slice();
  // your own star is drawn even when the owner hid it from everyone else
  if (mine) { const k = all.findIndex((s) => s.id === mine.id); k >= 0 ? (all[k] = { ...mine, mine: true }) : all.push({ ...mine, mine: true }); }
  if (pending) all.push({ ...pending, mine: true });
  for (const s of all) {
    const [x, y] = starPos(s), own = !!s.mine;
    const seed = hash(s.a * 1000 + s.h * 77);   // each star keeps its own size and tilt
    const tw = still() ? 1 : .86 + .14 * Math.sin(t * (1.2 + seed) + seed * 40);
    const born = own && !still() ? clamp01((t - litAt) / 1.4) : 1;   // your star pops in when you light it
    const r = (6 + seed * 3 + (hasText(s) ? 1.5 : 0) + (own ? 1.5 : 0)) * tw * (1 + .7 * (1 - born) ** 2);
    sparkle(x, y, r, seed * .8 - .4 + (still() ? 0 : Math.sin(t * .3 + seed * 9) * .12), tw);
    if (born < 1) {
      ctx.save(); ctx.strokeStyle = T.glow; ctx.globalAlpha = 1 - born; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r * (1 + born * 5), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (own) { ctx.save(); ctx.strokeStyle = T.glow; ctx.globalAlpha = .55; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  }

  // everything below lives in the world frame
  ctx.save(); ctx.translate(cam.x, cam.y); ctx.scale(cam.s, cam.s);

  // atmosphere
  const atm = ctx.createRadialGradient(0, 0, R * .9, 0, 0, R * 1.5);
  atm.addColorStop(0, T.rim); atm.addColorStop(1, clear(T.rim));
  ctx.globalAlpha = .26; ctx.fillStyle = atm; circle(0, 0, R * 1.5); ctx.globalAlpha = 1;

  // warm light behind the place on top
  ctx.save(); ctx.rotate(rot + sel * STEP); halo(0, -R - U * 2.4, U * 7, T.glow, .26 * awake[sel]); ctx.restore();

  // clouds drift around the planet a little faster than it turns
  ctx.fillStyle = T.rim;
  for (const c of CLOUDS) {
    ctx.save(); ctx.globalAlpha = T.cloudAlpha; ctx.rotate(rot * 1.15 + c.a + (still() ? 0 : t * c.v)); ctx.translate(0, -R - c.h * U);
    cloud(c.s * U); ctx.restore();
  }
  drawPlane(t);

  // planet body
  const body = ctx.createRadialGradient(-R * .35, -R * .45, R * .1, 0, 0, R);
  body.addColorStop(0, T.planet); body.addColorStop(1, T["planet-shade"]);
  ctx.fillStyle = body; circle(0, 0, R);
  ctx.strokeStyle = T.rim; ctx.globalAlpha = .35; ctx.lineWidth = 1.2 / cam.s; ctx.beginPath(); ctx.arc(0, 0, R - .6 / cam.s, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke(); ctx.globalAlpha = 1;

  ctx.save(); ctx.rotate(rot);
  // a band of soil under the surface, then rock with pebbles, craters deep down, and a few crystals
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ring(SOIL); lit(T.planet, .6, () => ctx.fill("evenodd")); ctx.restore();
  ctx.save(); ctx.strokeStyle = T["planet-shade"]; ctx.lineWidth = U * .06; ctx.globalAlpha = .55; ring(SOIL); ctx.stroke();
  ctx.lineWidth = U * .1; ctx.globalAlpha = .35; ring(ROCK); ctx.stroke(); ctx.restore();
  for (const [ang, d, r] of [[.4, .55, .12], [1.9, .35, .08], [2.8, .62, .1], [4.1, .5, .14], [5.3, .25, .06], [3.5, .15, .07]]) {
    const cx = Math.sin(ang) * R * d, cy = -Math.cos(ang) * R * d, crater = new Path2D();
    blob(crater, cx, cy, R * r, ang * 10);
    lit(T["planet-shade"], .5, () => ctx.fill(crater));
    // the far wall of a crater catches the light
    const lx = Math.cos(-rot) * -.6 - Math.sin(-rot) * -.8, ly = Math.sin(-rot) * -.6 + Math.cos(-rot) * -.8;
    ctx.save(); ctx.clip(crater); lit(T.rim, .07, () => circle(cx - lx * R * r * .35, cy - ly * R * r * .35, R * r * .8)); lit(T["planet-shade"], .3, () => circle(cx + lx * R * r * .3, cy + ly * R * r * .3, R * r * .85)); ctx.restore();
  }
  ctx.fillStyle = T["planet-shade"]; ctx.globalAlpha = .55;
  PEBBLES.forEach((p, k) => {
    const d = R - p.d * U, x = Math.sin(p.a) * d, y = -Math.cos(p.a) * d, r = p.r * U, pts = [];
    for (let j = 0; j < 6; j++) { const th = j / 6 * Math.PI * 2 + k, rr = r * (.75 + hash(k * 7 + j) * .45); pts.push(x + Math.cos(th) * rr, y + Math.sin(th) * rr * .8); }
    poly(pts);
  });
  ctx.globalAlpha = 1;
  for (const c of CRYSTALS) {
    const d = R - c.d * U, x = Math.sin(c.a) * d, y = -Math.cos(c.a) * d, r = c.r * U;
    ctx.save(); ctx.translate(x, y); ctx.rotate(c.a + .5);
    lit(T[c.c], .4, () => poly([0, -r * 1.4, r * .6, 0, 0, r * .9, -r * .6, 0]));
    lit(T.rim, .3, () => poly([0, -r * 1.4, r * .6, 0, 0, -r * .1]));
    ctx.restore();
  }
  ctx.restore();

  // the far side of the planet in a flat band of shade, as if printed; the light comes from the upper left
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip();
  ctx.beginPath(); ctx.arc(0, 0, R * 1.2, 0, Math.PI * 2); ctx.arc(-R * .2, -R * .26, R * 1.04, 0, Math.PI * 2, true);
  lit(T["planet-shade"], .42, () => ctx.fill()); ctx.restore();

  ctx.save(); ctx.rotate(rot);
  // grass along the whole edge, swaying a little
  {
    const wind = still() ? 0 : Math.sin(t * 1.1) * .04, blades = [];
    for (const g of GRASS) {
      const sn = Math.sin(g.a), cs = -Math.cos(g.a), lean = g.l + wind, r0 = R - U * .04, r1 = R + g.h * U;
      blades.push([sn * r0, cs * r0, sn * r1 + Math.cos(g.a) * lean * U, cs * r1 + Math.sin(g.a) * lean * U]);
    }
    segs(blades, T.planet, U * .045);
  }

  // two small things in every gap between places
  for (let i = 0; i < N; i++) {
    ctx.save(); ctx.rotate((i + .34) * STEP); ctx.translate(0, -R + U * .12); ctx.scale(U, U); tree(i % 2 ? .95 : 1.2, i, rot + (i + .34) * STEP, t); ctx.restore();
    ctx.save(); ctx.rotate((i + .7) * STEP); ctx.translate(0, -R + U * .12); ctx.scale(U, U); tufts(i, rot + (i + .7) * STEP, t); ctx.restore();
  }
  // buildings lean against the turn and pop a little as they wake
  PLACES.forEach((p, i) => {
    const a = awake[i], pop = still() || i !== sel ? 1 : 1 + .06 * Math.sin(Math.PI * a);
    ctx.save(); ctx.rotate(i * STEP); ctx.translate(0, -R + U * .15);
    ctx.save(); ctx.scale(U, U); groundLabel(PL[i].name, a); ctx.restore();
    ctx.scale(U * pop, U * pop);
    lit(T["planet-shade"], .5, () => { ctx.beginPath(); ctx.ellipse(0, .04, 2.9, .2, 0, 0, Math.PI * 2); ctx.fill(); });
    ctx.transform(1, 0, lean, 1, 0, 0);
    DRAW[p.key](a, t);
    ctx.restore();
  });
  // once down, the rocket stays parked beside Home, and its dust settles there
  const down = (landed && !(mode === "takeoff" && takeT >= TT.lift)) || (mode === "landing" && landT >= LT.touch);
  ctx.save(); ctx.rotate(LAND_ANGLE); ctx.translate(0, -R);
  if (down) {
    const door = mode === "landing" ? smooth((landT - LT.touch - .2) / .3)
      : mode === "takeoff" ? (takeT < TT.board ? .35 + .65 * smooth((takeT - TT.walk) / .3) : 1 - smooth((takeT - TT.board) / .25)) : .35;
    ctx.save(); ctx.translate(0, -ROCKET * U * .5); ctx.scale(ROCKET * U, ROCKET * U);
    drawRocket(parkedFlame(), 1, door, t); ctx.restore();
  }
  ctx.scale(U, U); drawPuffs(); ctx.restore();
  ctx.restore();

  if (rocket && !down && (mode === "takeoff" || landT > LT.start)) {
    ctx.save(); ctx.translate(rocket.x, rocket.y); ctx.rotate(rocket.ang); ctx.scale(ROCKET * U, ROCKET * U);
    drawRocket(rocket.flame, rocket.legs, 0, t); ctx.restore();
  }
  drawDuck(t, awake[7]);
  if (mode === "surface") drawWalker(t, dt, dRot);
  else if (mode === "landing" && landT > LT.out) {
    // the walker steps out of the rocket and walks over to its usual spot
    const k = smooth((landT - LT.out) / (LT.end - LT.out)), ang = LAND_ANGLE + (WALK_ANGLE - LAND_ANGLE) * k;
    drawWalker(t, dt, walkerWas - ang, ang, clamp01((landT - LT.out) / .15)); walkerWas = ang;
  } else if (mode === "takeoff" && takeT < TT.board) {
    // and walks back to the rocket and climbs in when leaving
    const k = smooth((takeT - TT.walk) / (TT.board - TT.walk)), ang = WALK_ANGLE + (LAND_ANGLE - WALK_ANGLE) * k;
    drawWalker(t, dt, walkerWas - ang, ang, clamp01((TT.board - takeT) / .15)); walkerWas = ang;
  }
  ctx.restore();
  drawWalkHint();
}

/* ---------- input ---------- */
let startX = 0, startY = 0, lastX = 0, lastT = 0, moved = false;
canvas.addEventListener("pointerdown", (e) => {
  startX = lastX = e.clientX; startY = e.clientY; lastT = performance.now(); moved = false; vel = 0;
  // once the walker is stepping out, the controls are back: a drag ends the landing and starts walking
  if (mode === "landing" && landT >= LT.out) finishLanding();
  else if (mode === "landing" || mode === "takeoff") {   // a click during the landing or takeoff skips it
    mode === "landing" ? finishLanding() : finishTakeoff(); moved = true; return;
  }
  if (placing) return;
  dragging = true; canvas.classList.add("dragging"); canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (dragging) {
    const dx = e.clientX - lastX, now = performance.now();
    if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 5) { moved = true; if (mode === "surface") walked(); }
    rot += dx / (R * cam.s); vel = dx / (R * cam.s) / Math.max(8, now - lastT) * 16;
    lastX = e.clientX; lastT = now; target = rot; tip.hidden = true;
  } else if (e.pointerType === "mouse") hover(e);
});
function endDrag() {
  if (!dragging) return;
  dragging = false; canvas.classList.remove("dragging");
  target = -Math.round(-(rot + vel * 10) / STEP) * STEP;
  travelV = vel * 62.5;   // carry on at the speed of the drag (vel is per 16 ms)
  if (still()) rot = target;
}
canvas.addEventListener("pointerup", (e) => {
  const wasMoved = moved; endDrag();
  if (!wasMoved) clickAt(e);
});
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("pointerleave", () => { if (!dragging) { tip.hidden = true; canvas.classList.remove("over-place"); } });

function local(e) { const a = canvas.getBoundingClientRect(); return [e.clientX - a.left, e.clientY - a.top]; }
function starAt(x, y) {
  const all = mine ? [...stars.filter((s) => s.id !== mine.id), { ...mine, mine: true }] : stars;
  let best = null, bd = 18 * 18;
  for (const s of all) { const [sx, sy] = starPos(s), d = (sx - x) ** 2 + (sy - y) ** 2; if (d < bd) { bd = d; best = s; } }
  return best;
}
function placeAt(x, y) {
  for (let i = 0; i < N; i++) {
    const [px, py] = placePos(i, U * 2.4);
    if (Math.hypot(px - x, py - y) < U * 3.2 * cam.s) return i;
  }
  return -1;
}
function showTip(text, x, y) {
  if (!text) { tip.hidden = true; return; }
  tip.textContent = text; tip.style.left = x + "px"; tip.style.top = y + "px"; tip.hidden = false;
}
// what a star says on hover: "“hello from Lyon” — Léa · Capgemini"; only entries that pass the checker and
// are not hidden by the owner show their text, except to the visitor who wrote it
function entryText(s) {
  const who = [s.name, s.org].filter(Boolean).join(" · ");
  const msg = s.word ? (lang === "fr" ? `«${NB}${s.word}${NB}»` : `“${s.word}”`) : "";
  return [msg, who].filter(Boolean).join(" — ");
}
function starText(s) {
  if (s.mine) return !hasText(s) ? t("yourStar") : s.hidden ? t("yourHidden") : entryText(s);
  return hasText(s) ? entryText(s) : t("wordless");
}
function hover(e) {
  const [x, y] = local(e);
  const s = starAt(x, y);
  if (s) { canvas.classList.remove("over-place"); return showTip(starText(s), ...starPos(s)); }
  if (mode === "title") {
    const onPlanet = !placing && Math.hypot(x - cam.x, y - cam.y) < R * cam.s * 1.25;
    canvas.classList.toggle("over-place", onPlanet);
    return onPlanet ? showTip(t("land"), cam.x, cam.y - R * cam.s * 1.3) : showTip(null);
  }
  const i = placing || mode !== "surface" ? -1 : placeAt(x, y);
  canvas.classList.toggle("over-place", i >= 0);
  if (i >= 0) { const [px, py] = placePos(i, U * 6.2); return showTip(`${PL[i].name} · ${PL[i].short}`, px, py); }
  showTip(null);
}
// where a star may go: in the sky, clear of the planet and the header, and never on top of another star;
// a click too close to one moves the new star to the nearest free spot instead
const STAR_GAP = 30;
function skySpot(x, y) {
  if (Math.hypot(x - cam.x, y - cam.y) < R * cam.s * 1.25 || y < top.getBoundingClientRect().bottom - app.getBoundingClientRect().top) return null;
  return skyAt(x, y);
}
function freeSpot(x, y) {
  const others = stars.filter((s) => s.id !== mine?.id).map(starPos);
  const clear = (cx, cy) => others.every(([sx, sy]) => Math.hypot(sx - cx, sy - cy) >= STAR_GAP);
  if (!skySpot(x, y)) return null;
  if (clear(x, y)) return skySpot(x, y);
  for (let r = 8; r <= 160; r += 6)
    for (let k = 0; k < 24; k++) {
      const th = k / 24 * Math.PI * 2, cx = x + Math.cos(th) * r, cy = y + Math.sin(th) * r;
      if (clear(cx, cy) && skySpot(cx, cy)) return skySpot(cx, cy);
    }
  return null;
}
function clickAt(e) {
  const [x, y] = local(e);
  if (placing) {
    const at = freeSpot(x, y);
    if (!at) return;
    pending = at;
    setStarMsg("starThere");
    $("starForm").hidden = false; $("starRow").hidden = true; $("starWord").focus();
    return;
  }
  const s = starAt(x, y);
  if (s) return showTip(starText(s), ...starPos(s));
  if (mode === "title") { if (Math.hypot(x - cam.x, y - cam.y) < R * cam.s * 1.25) startLanding(); return; }
  const i = placeAt(x, y);
  if (i >= 0) { goTo(i, true); walked(); tip.hidden = true; return; }
  showTip(null);
}
let wheelAcc = 0, wheelLock = 0;
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (mode !== "surface") { if (mode === "title" && e.deltaY > 20 && !placing) startLanding(); return; }
  const now = performance.now(); if (now < wheelLock) return;
  wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (Math.abs(wheelAcc) > 50) { goTo(focus() + Math.sign(wheelAcc)); walked(); wheelAcc = 0; wheelLock = now + 380; }
}, { passive: false });
document.addEventListener("keydown", (e) => {
  if (app.hidden || e.target.closest("input, textarea, dialog")) return;
  if (mode === "landing" && landT >= LT.out) finishLanding();   // the walker is stepping out: keys work again
  else if (mode === "landing" || mode === "takeoff") {
    if (["Enter", " ", "Escape"].includes(e.key)) { mode === "landing" ? finishLanding() : finishTakeoff(); e.preventDefault(); }
    return;
  }
  if (mode === "title") {
    if (e.key === "Escape" && placing) stopPlacing();
    else if (["Enter", " ", "ArrowDown"].includes(e.key) && !e.target.closest("button, a") && !placing) { startLanding(); e.preventDefault(); }
    return;
  }
  if (e.key === "ArrowRight") { goTo(focus() + 1); walked(); e.preventDefault(); }
  else if (e.key === "ArrowLeft") { goTo(focus() - 1); walked(); e.preventDefault(); }
  else if (/^[1-8]$/.test(e.key)) { goTo(Number(e.key) - 1, true); walked(); }
  else if (e.key === "Escape") placing ? stopPlacing() : setView(false);
});

initSound($("soundBtn"));

// a fine grain over the whole scene, so it reads as printed rather than rendered
document.querySelector(".grain").style.backgroundImage = `url(${grain()})`;

/* ---------- screenshot viewer ---------- */
// screenshots open over the page instead of in a new tab; a modified click still opens the file itself
const viewer = $("viewer"), viewerImg = $("viewerImg");
document.addEventListener("click", (e) => {
  const shot = e.target.closest("a.shot");
  if (!shot || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  const img = shot.querySelector("img");
  viewerImg.src = img.src; viewerImg.width = img.getAttribute("width"); viewerImg.height = img.getAttribute("height"); viewerImg.alt = img.alt;
  $("viewerCap").textContent = img.alt;
  viewer.showModal();
});
viewer.addEventListener("click", () => viewer.close());   // anywhere, the picture included, closes it

/* ---------- star placing ---------- */
const starBtn = $("starBtn"), starbar = $("starbar");
const FIELDS = { name: $("starName"), org: $("starOrg"), word: $("starWord") };
starBtn.addEventListener("click", () => {
  placing = true; pending = null; canvas.classList.add("placing"); syncFar();
  setStarMsg("starTap");
  $("starRemove").hidden = !mine;
  $("starForm").hidden = true; $("starRow").hidden = false; starbar.hidden = false;
});
function stopPlacing() {
  placing = false; pending = null; canvas.classList.remove("placing"); starbar.hidden = true; syncFar();
  for (const el of Object.values(FIELDS)) { el.value = ""; el.removeAttribute("aria-invalid"); }
}
$("starCancel").addEventListener("click", stopPlacing);
$("starCancel2").addEventListener("click", stopPlacing);
$("starForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!pending) return;
  const send = e.submitter || $("starForm").querySelector('[type="submit"]');
  const entry = {};
  for (const [k, el] of Object.entries(FIELDS)) { entry[k] = el.value.replace(/\s+/g, " ").trim(); el.removeAttribute("aria-invalid"); }
  send.disabled = true;
  const { status, data } = await api("/stars/mine", { method: "PUT", body: { a: pending.a, h: pending.h, ...entry } });
  send.disabled = false;
  if (status === 422 && FIELDS[data?.field]) {   // the checker said no: say which field and why, and let them fix it
    setStarMsg(UI.en[data.reason] ? data.reason : "notKind");
    FIELDS[data.field].setAttribute("aria-invalid", "true"); FIELDS[data.field].focus();
    return;
  }
  if (status !== 200 || !data?.star) return setStarMsg(status === 429 ? "tooMany" : status === 409 ? "tooClose" : "saveFailed");
  if (data.token) { token = data.token; keep("shortplanet-token", token); }
  mine = clean(data.star);
  stars = [...(mine.hidden ? [] : [mine]), ...stars.filter((s) => s.id !== mine.id)];
  markStarMoved(); stopPlacing();
  setLedger(...countText(stars.length)); flashLedger("litShared");
  litAt = performance.now() / 1000; chime();
});
$("starRemove").addEventListener("click", async () => {
  const { status } = await api("/stars/mine", { method: "DELETE" });
  if (status !== 204) return setStarMsg("saveFailed");
  stars = stars.filter((s) => s.id !== mine?.id); mine = null;
  starMoved = false; starBtn.textContent = t("star");
  stopPlacing(); setLedger(...countText(stars.length)); flashLedger("removed");
});

// the ledger and star texts keep their keys so a language switch can redraw them
let ledgerKey = ["looking"], flashKey = null, flashTimer = 0, starMsgKey = "starTap", starMoved = false;
const showLedger = () => (ledger.textContent = $("titleLedger").textContent = flashKey ? t(flashKey) : t(...ledgerKey));
function setLedger(...k) { ledgerKey = k; showLedger(); }
function flashLedger(k) {
  flashKey = k; showLedger(); clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { flashKey = null; showLedger(); }, 6000);
}
function setStarMsg(k) { starMsgKey = k; $("starMsg").textContent = t(k); }
function markStarMoved() { starMoved = true; starBtn.textContent = t("moveStar"); }

/* ---------- shared sky: the star API ----------
   Stars live behind a small API (api/ in this repository). There is no sign-in: this browser keeps a random
   token that proves which star is its own. The API runs every entry through its checker before storing it,
   so everything it lists can be shown. Its address is in <meta name="star-api">; on localhost, ?api= overrides it. */
const API = (() => {
  const meta = document.querySelector('meta[name="star-api"]')?.content || "";
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get("api");
  return (local || meta).replace(/\/$/, "");
})();
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const keep = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
let token = read("shortplanet-token"), mine = null;
async function api(path, { method = "GET", body, admin } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token && path.startsWith("/stars/mine")) headers.Authorization = `Bearer ${token}`;
  if (admin) headers["X-Admin-Key"] = admin;
  try {
    const res = await fetch(API + path, { method, headers, body: body && JSON.stringify(body) });
    return { status: res.status, data: res.status === 204 ? null : await res.json().catch(() => null) };
  } catch { return { status: 0, data: null }; }
}
const hasText = (s) => !!(s.name || s.org || s.word);
function clean(d) {
  const n = (v) => Math.min(1, Math.max(0, Number(v) || 0)), str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
  return { id: String(d?.id ?? ""), a: mod(Number(d?.a) || 0, Math.PI * 2), h: n(d?.h),
    name: str(d?.name, 24), org: str(d?.org, 40), word: str(d?.word, 32), lit: Number(d?.lit) || 0, hidden: Number(d?.hidden) || 0 };
}
function countText(n) {
  return !n ? ["none"] : n === 1 ? ["one"] : ["many", n];
}
async function loadStars() {
  const { status, data } = await api("/stars");
  if (status !== 200 || !Array.isArray(data?.stars)) return false;
  stars = data.stars.map(clean);
  setLedger(...countText(stars.length));
  return true;
}
async function initSky() {
  if (!API) return setLedger("unreachable");
  const slow = setTimeout(() => setLedger("slow"), 10000);
  const [ok, own] = await Promise.all([loadStars(), token ? api("/stars/mine") : null]);
  clearTimeout(slow);
  if (!ok) setLedger("unreachable");
  if (own?.data?.star) { mine = clean(own.data.star); markStarMoved(); }
  if (location.hash === "#admin") openMod();
  else if (read("shortplanet-admin")) loadAdmin(read("shortplanet-admin"));
  // new stars from other visitors turn up within a minute
  setInterval(() => { if (!document.hidden && mode !== "landing" && mode !== "takeoff") loadStars(); }, 60000);
}

/* ---------- who lit a star (owner only) ----------
   Opened with #admin and the API's admin key, which this browser then remembers. Not a queue: everything
   here is already in the sky. It is a guestbook, with a Hide for the rare miss. */
const modDialog = $("mod"), modList = $("modList");
let adminKey = null, adminStars = [];
async function loadAdmin(key) {
  const { status, data } = await api("/admin/stars", { admin: key });
  if (status === 401) { keep("shortplanet-admin", null); adminKey = null; $("modBtn").hidden = true; return "wrongKey"; }
  if (status === 429) return "adminLocked";
  if (status !== 200) return "saveFailed";
  adminKey = key; keep("shortplanet-admin", key);
  adminStars = (data?.stars || []).map(clean);
  $("modBtn").hidden = false; renderMod();
  return true;
}
function openMod() { renderMod(); if (!modDialog.open) modDialog.showModal(); if (!adminKey) $("modKeyInput").focus(); }
function renderMod() {
  $("modKey").hidden = !!adminKey; modList.hidden = !adminKey; $("modForget").hidden = !adminKey;
  if (!adminKey) return;
  const rows = adminStars.filter(hasText);
  const day = (at) => (at ? new Date(at).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" }) : "");
  modList.innerHTML = ["shown", "hidden"].map((st) => {
    const list = rows.filter((r) => (st === "hidden") === !!r.hidden);
    if (!list.length) return st === "shown" && !rows.length ? `<p class="mod-empty">${t("modNone")}</p>` : "";
    return `<section><span class="label">${t("mod_" + st)} · ${list.length}</span><ul>${list.map((r) => `<li data-id="${esc(r.id)}">
      <span class="mod-word">${esc(entryText(r))}<small>${day(r.lit)}</small></span>
      <span class="mod-actions"><button type="button" data-mod="${r.hidden ? "show" : "hide"}">${t(r.hidden ? "modShowAgain" : "modHide")}</button><button type="button" data-mod="remove">${t("modRemove")}</button></span>
    </li>`).join("")}</ul></section>`;
  }).join("");
}
modList.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-mod]");
  if (!b || !adminKey) return;
  const id = encodeURIComponent(b.closest("li").dataset.id), act = b.dataset.mod;
  if (act === "remove" && !b.dataset.sure) { b.dataset.sure = "1"; b.textContent = t("modSure"); return; }   // two clicks to remove
  b.disabled = true;
  const { status } = act === "remove" ? await api(`/admin/stars/${id}`, { method: "DELETE", admin: adminKey })
    : await api(`/admin/stars/${id}/${act}`, { method: "POST", admin: adminKey });
  if (status !== 204) { b.disabled = false; b.textContent = t("modFailed"); return; }
  await Promise.all([loadAdmin(adminKey), loadStars()]);
});
$("modKey").addEventListener("submit", async (e) => {
  e.preventDefault();
  const result = await loadAdmin($("modKeyInput").value.trim());
  $("modKeyMsg").textContent = result === true ? "" : t(result);
  if (result === true) $("modKeyInput").value = "";
});
$("modForget").addEventListener("click", () => { keep("shortplanet-admin", null); adminKey = null; $("modBtn").hidden = true; modDialog.close(); });
$("modBtn").addEventListener("click", openMod);
$("modClose").addEventListener("click", () => modDialog.close());
modDialog.addEventListener("click", (e) => { if (e.target === modDialog) modDialog.close(); });   // click outside closes

/* ---------- language switch ---------- */
function langSwitch() {
  return `<div class="lang" role="group" aria-label="Language · Langue">${["en", "fr"].map((l) =>
    `<button type="button" data-lang="${l}" lang="${l}" aria-pressed="${l === lang}">${l.toUpperCase()}</button>`).join("")}</div>`;
}
function setLang(l) {
  const refocus = plain.contains(document.activeElement);
  lang = l; PL = PLACES.map(loc);
  try { localStorage.setItem("shortplanet-lang", l); } catch {}
  document.documentElement.lang = l;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  document.querySelectorAll("[data-i18n-title]").forEach((el) => (el.title = t(el.dataset.i18nTitle)));
  document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === l)));
  nameDots(); showLedger(); setStarMsg(starMsgKey); setView(zView);
  starBtn.textContent = t(starMoved ? "moveStar" : "star");
  shown = -1; renderCard(focus()); renderMod();
  if (!plain.hidden) { renderPlain(); if (refocus) plain.querySelector(`[data-lang="${l}"]`)?.focus(); }
  layout();   // button widths change with the language, and so can the header height
}

/* ---------- start ---------- */
setLang(lang);
// the front page comes first; #surface or #plain skip it
if (location.hash === "#surface" || location.hash === "#plain") {
  app.classList.add("no-fade"); z = 0; finishLanding();
  requestAnimationFrame(() => requestAnimationFrame(() => app.classList.remove("no-fade")));
}
if (location.hash === "#plain") setPlain(true);
layout();
initSky();
requestAnimationFrame(frame);
