// Drawing on the planet canvas: the theme colours, the shapes everything is made of, and the building kit.
// app.js hands over the canvas with useCanvas(); ctx is a live binding, so every module sees it.

export let ctx = null;
export function useCanvas(canvas) { ctx = canvas.getContext("2d"); }
export const reduced = matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- theme tokens for the canvas ---------- */
export const T = {};
export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of ["planet", "planet-shade", "rim", "glow", "door-b", "door-c", "signal", "void", "walker", "star", "ink", "f-body", "f-mono", "wall", "roof"]) T[k] = cs.getPropertyValue("--" + k).trim();
  T.starAlpha = parseFloat(cs.getPropertyValue("--star-alpha")) || .8;
  T.cloudAlpha = parseFloat(cs.getPropertyValue("--cloud-alpha")) || .3;
}
readTokens();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readTokens);
new MutationObserver(readTokens).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

/* ---------- helpers ---------- */
export const hash = (k) => { const s = Math.sin(k * 12.9898) * 43758.5453; return s - Math.floor(s); };
export const still = () => reduced.matches;

export function rect(x, y, w, h) { ctx.fillRect(x, y, w, h); }
export function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); }
export function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
export function rrect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); }
export function line(pts, color, width, alpha = 1) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha *= alpha; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); ctx.restore();
}
export function lit(color, alpha, f) { ctx.save(); ctx.fillStyle = color; ctx.globalAlpha *= Math.max(0, Math.min(1, alpha)); f(); ctx.restore(); }
// fade a colour to its own transparent version, not to transparent black, which greys glows on a light sky
export const clear = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? c + "00" : "rgba(0,0,0,0)");
export function halo(x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, clear(color));
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = g; circle(x, y, r); ctx.restore();
}
export const on = (a) => .28 + .72 * a;

/* ---------- a drawn look: hand-set corners, light in flat bands, grain ---------- */
// each corner moves a little off true, always the same way for the same seed, so nothing shimmers
export const jit = (seed, k, amt = .03) => (hash(seed * 31.7 + k * 7.31) - .5) * 2 * amt;
export function hpoly(pts, seed, amt) { poly(pts.map((v, k) => v + jit(seed, k, amt))); }
export const hrect = (x, y, w, h, seed, amt) => hpoly([x, y, x + w, y, x + w, y + h, x, y + h], seed, amt);
// light as a few flat bands instead of a smooth blur, like a print; together they add up to alpha
export function bands(x, y, r, color, alpha, n = 3) {
  if (alpha <= .005) return;
  ctx.save(); ctx.fillStyle = color; ctx.globalAlpha *= 1 - Math.pow(1 - Math.min(1, alpha), 1 / n);
  for (let k = 0; k < n; k++) circle(x, y, r * (1 - k / n));
  ctx.restore();
}
// the same light falling on the ground: flat ellipses just below y = 0
export function pool(x, w, color, alpha, n = 3) {
  if (alpha <= .005) return;
  ctx.save(); ctx.fillStyle = color; ctx.globalAlpha *= 1 - Math.pow(1 - Math.min(1, alpha), 1 / n);
  for (let k = 0; k < n; k++) { const f = 1 - k / n; ctx.beginPath(); ctx.ellipse(x, .1, w * f, .13 * f, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// a tile of fine specks, light and dark, laid once over the whole scene as a still layer (drawing it into
// every frame would cost more than the scene itself)
export function grain() {
  const c = document.createElement("canvas"); c.width = c.height = 160;
  const g = c.getContext("2d"), img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const r = hash(i * .37 + 1.3), v = hash(i * .91 + 7.7) > .5 ? 255 : 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = r < .55 ? 0 : (r - .55) * 60;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}   // window brightness: asleep 0.28, awake 1

/* ---------- building kit (local frame: unit U, y < 0 is up, ground at y = 0, light from the upper left) ---------- */
export function wall(x, y, w, h, c = T.wall) {
  ctx.fillStyle = c; rect(x, y, w, h);
  if (y + h > -.05) { ctx.fillStyle = T.planet; rect(x - .04, -.06, w + .08, .36); }   // footing, so walls meet the curved ground
}
export function segs(list, color, width, alpha = 1) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha *= alpha; ctx.lineCap = "round"; ctx.beginPath();
  for (const [x1, y1, x2, y2] of list) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
  ctx.stroke(); ctx.restore();
}
export const edgeLight = (x, y, h) => segs([[x, y, x, y + h]], T.rim, .05, .35);
export const shadeRight = (x, y, w, h) => lit(T.roof, .45, () => rect(x + w * .82, y, w * .18, h));
export function win(x, y, w, h, color, a, glowR) {
  if (glowR && a > .05) halo(x + w / 2, y + h / 2, glowR, color, .3 * a);
  lit(color, on(a), () => rect(x, y, w, h));
}
export const blinkOn = (t, rate, phase = 0) => still() || Math.sin(t * rate + phase) > 0;

export function arcPts(x, y, r) { const pts = []; for (let k = 1; k <= 24; k++) { const th = k / 24 * Math.PI * 2; pts.push(x + Math.cos(th) * r, y + Math.sin(th) * r); } return pts; }
