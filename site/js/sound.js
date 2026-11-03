import { still } from "./paint.js";

// Sound: off until the visitor turns it on, and the choice is remembered. Two music loops, one for space
// (the front page, the landing, leaving) and one for the planet, cross-fade as you come and go. Every other
// sound is synthesized on the spot, so it needs no files: the rocket, footsteps, a newly lit star, the plane
// passing over, and a little soundscape for each place that fades in as you arrive.
// Nothing is downloaded until sound is turned on, and a missing track simply stays silent.

// Each file runs a few seconds past its loop point. Two copies take turns: as one reaches the loop point the
// other starts from the top and they blend, so the music never stops for the gap a plain loop leaves.
// The loop points sit on the start of a phrase (both tracks move in six-second phrases).
const TRACKS = {
  space: { src: "audio/space.mp3", loop: 150, blend: 3 },
  planet: { src: "audio/planet.mp3", loop: 138, blend: 3 },
};
const MUSIC = .55;   // music level under the master gain, so the effects sit a little above it

let ac = null, master = null, on = false, scene = "space", watch = 0;
const music = {};   // name -> { gain, voices: [{ el, gain, want }], active, blending }

const read = () => { try { return localStorage.getItem("shortplanet-sound"); } catch { return null; } };
const keep = (v) => { try { localStorage.setItem("shortplanet-sound", v); } catch {} };

function context() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ac = new AC(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
  return ac;
}
function ramp(param, to, secs) {
  const now = ac.currentTime;
  param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); param.linearRampToValueAtTime(to, now + secs);
}
const play = (v) => { v.want = true; v.el.play().catch(() => {}); };
const stop = (v) => { v.want = false; v.el.pause(); };
// both copies of every track are made, and started then paused, during the click that turns sound on:
// phones only let a sound start from a tap, and the planet track has to start by itself after the landing
function tracks() {
  for (const [name, t] of Object.entries(TRACKS)) {
    if (music[name]) continue;
    const gain = ac.createGain(); gain.gain.value = 0; gain.connect(master);
    const voices = [0, 1].map((k) => {
      const el = new Audio(t.src); el.preload = "auto";
      const v = { el, gain: ac.createGain(), want: false };
      v.gain.gain.value = k ? 0 : 1;
      ac.createMediaElementSource(el).connect(v.gain); v.gain.connect(gain);
      el.play().then(() => { if (!v.want) el.pause(); }).catch(() => {});
      // if the hand-over was missed (a background tab slows timers down), start again from the top
      el.addEventListener("ended", () => { if (v.want) { el.currentTime = 0; play(v); } });
      return v;
    });
    music[name] = { gain, voices, active: 0, blending: false, stopAt: 0 };
  }
}
// near the loop point, start the other copy on the beat and blend the two
function handOver() {
  for (const [name, m] of Object.entries(music)) {
    const t = TRACKS[name], v = m.voices[m.active];
    if (!v.want || m.blending || v.el.currentTime < t.loop - .3) continue;
    m.blending = true;
    setTimeout(() => {
      const next = m.voices[1 - m.active];
      next.el.currentTime = 0; play(next);
      ramp(next.gain.gain, 1, t.blend); ramp(v.gain.gain, 0, t.blend);
      setTimeout(() => { if (m.voices[m.active] !== v) stop(v); }, t.blend * 1000 + 200);
      m.active = 1 - m.active; m.blending = false;
    }, Math.max(0, (t.loop - v.el.currentTime) * 1000));
  }
}
// fade the scene's track in and the others out; a faded-out track pauses so it costs nothing
function mix(secs) {
  for (const [name, m] of Object.entries(music)) {
    const want = name === scene ? MUSIC : 0, v = m.voices[m.active];
    ramp(m.gain.gain, want, secs);
    clearTimeout(m.stopAt);
    if (want) { if (!v.want) { ramp(v.gain.gain, 1, .05); play(v); } }
    else m.stopAt = setTimeout(() => { if (scene !== name || !on) m.voices.forEach(stop); }, secs * 1000 + 100);
  }
}
const pauseAll = () => { for (const m of Object.values(music)) { m.voices.forEach(stop); m.blending = false; } };

export const soundOn = () => on;
export function setSound(next, button) {
  if (next && !context()) return;
  on = next; keep(on ? "on" : "off");
  if (button) button.setAttribute("aria-pressed", String(on));
  if (!ac) return;
  clearInterval(watch);
  if (on) { ac.resume(); tracks(); ramp(master.gain, 1, .8); mix(1.5); watch = setInterval(handOver, 100); }
  else { ramp(master.gain, 0, .5); setTimeout(() => { if (!on) { pauseAll(); ac.suspend(); } }, 600); }
}
// "space" or "planet"; cross-fades if sound is on
export function setScene(next) {
  if (next === scene) return;
  scene = next;
  if (on && ac) mix(2.5);
}
// a visitor who turned sound on last time hears it again from their first click or key, since
// browsers only allow sound after one
export function initSound(button) {
  button.setAttribute("aria-pressed", "false");
  // the button says what the visitor chose, even before the first click has woken the sound up
  button.addEventListener("click", () => setSound(button.getAttribute("aria-pressed") !== "true", button));
  if (read() === "on") {
    const wake = () => { removeEventListener("pointerdown", wake, true); removeEventListener("keydown", wake, true); if (!on) setSound(true, button); };
    addEventListener("pointerdown", wake, true); addEventListener("keydown", wake, true);
    button.setAttribute("aria-pressed", "true");
  }
  // a hidden tab goes quiet, and picks up where it was when it comes back
  document.addEventListener("visibilitychange", () => {
    if (!ac || !on) return;
    if (document.hidden) { pauseAll(); ac.suspend(); }
    else { ac.resume(); for (const m of Object.values(music)) m.voices.forEach((v, k) => v.gain.gain.value = k === m.active ? 1 : 0); mix(.6); }
  });
}

/* ---------- effects ---------- */
let noise = null;
function noiseBuffer() {
  if (noise) return noise;
  noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noise.getChannelData(0); let last = 0;
  for (let i = 0; i < d.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }   // brown noise: a deep rush
  return noise;
}
// the engine: a low rush that swells and fades; rising pitch when leaving, falling when landing
export function rocket(secs, leaving) {
  if (!on || !ac) return;
  const now = ac.currentTime, src = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuffer(); src.loop = true;
  lp.type = "lowpass"; lp.Q.value = .7;
  lp.frequency.setValueAtTime(leaving ? 180 : 900, now); lp.frequency.exponentialRampToValueAtTime(leaving ? 1100 : 160, now + secs);
  g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(.28, now + Math.min(.6, secs * .3));
  g.gain.setValueAtTime(.28, now + secs * .6); g.gain.linearRampToValueAtTime(0, now + secs);
  src.connect(lp); lp.connect(g); g.connect(master); src.start(now); src.stop(now + secs + .1);
}
// a newly lit star: a soft bell, two notes a fifth apart
export function chime() {
  if (!on || !ac) return;
  const now = ac.currentTime;
  [[880, 0, .16], [1318.5, .09, .12], [1760, .09, .04]].forEach(([f, at, level]) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0, now + at); g.gain.linearRampToValueAtTime(level, now + at + .015); g.gain.exponentialRampToValueAtTime(.0001, now + at + 1.8);
    o.connect(g); g.connect(master); o.start(now + at); o.stop(now + at + 1.9);
  });
}

/* ---------- small sounds ---------- */
let white = null;
function whiteBuffer() {
  if (white) return white;
  white = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = white.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return white;
}
const live = () => on && ac && ac.state === "running";
const out = (pan) => { if (!pan || !ac.createStereoPanner) return master; const p = ac.createStereoPanner(); p.pan.value = pan; p.connect(master); return p; };
// a puff of noise through a filter: steps, clicks, ticks, crackles
function burst({ at = 0, dur = .05, freq = 2000, q = 1, type = "bandpass", level = .1, pan = 0, brown = false }) {
  const t0 = ac.currentTime + at, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = brown ? noiseBuffer() : whiteBuffer(); src.playbackRate.value = .8 + Math.random() * .4;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(level, t0 + .004); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(out(pan)); src.start(t0, Math.random() * .5); src.stop(t0 + dur + .02);
}
// a single note, optionally gliding: pings, bells, hoots, quacks
function tone({ at = 0, freq = 880, to = 0, dur = .5, level = .1, type = "sine", attack = .01, pan = 0, filter = 0, q = 1 }) {
  const t0 = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(level, t0 + attack); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  let head = o;
  if (filter) { const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = filter; f.Q.value = q; o.connect(f); head = f; }
  head.connect(g); g.connect(out(pan)); o.start(t0); o.stop(t0 + dur + .05);
}

// a footstep in the grass, a little different every time
export function step() {
  if (!live()) return;
  burst({ dur: .09, freq: 700 + Math.random() * 500, q: .8, type: "lowpass", level: .16, brown: true });
  burst({ at: .01, dur: .04, freq: 3200, q: 1.5, level: .025 });
}
// the rocket's legs touching down
export function thump() {
  if (!live()) return;
  tone({ freq: 90, to: 38, dur: .45, level: .32, attack: .005 });
  burst({ dur: .35, freq: 260, type: "lowpass", level: .22, brown: true });
}

/* ---------- beds: sounds that run on and only change in level ---------- */
const beds = {};
function bed(name, build) {
  if (beds[name]) return beds[name];
  const g = ac.createGain(); g.gain.value = 0; g.connect(master);
  build(g);
  return (beds[name] = { g, level: 0 });
}
function noiseInto(g, { brown = true, type = "lowpass", freq = 400, q = .7 }) {
  const src = ac.createBufferSource(), f = ac.createBiquadFilter();
  src.buffer = brown ? noiseBuffer() : whiteBuffer(); src.loop = true;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  src.connect(f); f.connect(g); src.start();
  return f;
}
const BEDS = {
  // wind over the whole planet, in slow gusts
  wind: (g) => {
    const f = noiseInto(g, { freq: 520, q: .5 }), lfo = ac.createOscillator(), depth = ac.createGain();
    lfo.frequency.value = .11; depth.gain.value = 260; lfo.connect(depth); depth.connect(f.frequency); lfo.start();
  },
  hum: (g) => noiseInto(g, { freq: 180, q: 4, type: "bandpass" }),                      // the home server's fan
  fire: (g) => noiseInto(g, { freq: 900, q: .6 }),                                       // the stove under the chimney
  hiss: (g) => noiseInto(g, { brown: false, freq: 5200, q: .9, type: "bandpass" }),      // the TV between pictures
  magic: (g) => { for (const f of [146.8, 147.5, 220.2]) { const o = ac.createOscillator(); o.frequency.value = f; o.connect(g); o.start(); } },
  // the plane: two detuned engines, panned as it crosses
  plane: (g) => {
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420; f.connect(g);
    for (const fr of [86, 88.5]) { const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; o.connect(f); o.start(); }
  },
};
const BED_LEVEL = { wind: .05, hum: .05, fire: .035, hiss: .012, magic: .007, plane: .016 };
function setBed(name, level, pan) {
  const b = bed(name, BEDS[name]);
  if (Math.abs(b.level - level) > .003 || (level === 0 && b.level)) { b.g.gain.setTargetAtTime(level * BED_LEVEL[name], ac.currentTime, .25); b.level = level; }
  if (pan != null) {
    if (!b.pan && ac.createStereoPanner) { b.pan = ac.createStereoPanner(); b.g.disconnect(); b.g.connect(b.pan); b.pan.connect(master); }
    if (b.pan) b.pan.pan.setTargetAtTime(pan, ac.currentTime, .2);
  }
}

/* ---------- the soundscape of each place, kept in step with what it shows ---------- */
const last = {};   // the last beat each place made a sound on
const beat = (key, n) => { const was = last[key]; last[key] = n; return was !== undefined && was !== n; };
const PENTA = [587.3, 659.3, 740, 880, 987.8, 1174.7, 1318.5];   // D major pentatonic, the music's key

// called every frame: how awake each place is (null when not on the planet), the time, and where the plane is
export function world(levels, t, planeAng) {
  if (!ac || !on) return;
  if (!levels) { for (const name of Object.keys(beds)) setBed(name, 0); return; }
  if (!live()) return;
  const L = (k) => levels[k] || 0, moving = !still();
  setBed("wind", .6 + .4 * L("airfield"));
  setBed("hum", L("home")); setBed("fire", L("home") * .8);
  setBed("hiss", L("broadcast")); setBed("magic", L("portals"));
  const over = moving ? Math.pow((1 + Math.cos(planeAng)) / 2, 6) : 0;
  setBed("plane", over, Math.sin(planeAng) * .8);

  // home: the stove crackles now and then
  if (L("home") > .3 && Math.random() < .04) burst({ dur: .03, freq: 2400 + Math.random() * 2000, q: 2, level: .05 * L("home"), pan: .2 });
  // the workshop: keys while the code types itself out
  if (moving && L("null") > .5 && (t * 2.2) % 10 < 7 && Math.random() < .3) burst({ dur: .025, freq: 3800 + Math.random() * 1500, q: 3, level: .045 * L("null") });
  // the watchtower: a ping each time the red device calls out, a lower one for the tower's own ring
  if (moving && beat("atlasRed", Math.floor(t * 1.1))) tone({ freq: 1320, dur: .35, level: .05 * L("atlas"), pan: .4 });
  if (moving && beat("atlasRing", Math.floor(t * .5))) tone({ freq: 523, dur: .9, level: .04 * L("atlas") });
  // the archive: the clock ticks with the real seconds
  if (beat("git", new Date().getSeconds()) && L("git") > .05) burst({ dur: .03, freq: new Date().getSeconds() % 2 ? 2600 : 2100, q: 6, level: .09 * L("git") });
  // the broadcast yard: a blip each time the picture changes, a click as the remote sends
  if (moving && beat("tv", Math.floor(t / 1.4))) tone({ freq: 1900, to: 1500, dur: .08, level: .03 * L("broadcast"), type: "square", filter: 1700, q: 2 });
  if (moving && beat("remote", Math.floor(t * .9 * 3))) burst({ dur: .02, freq: 5000, q: 4, level: .02 * L("broadcast"), pan: .3 });
  // the portal garden: a bell for each of the Endless as they light, rising
  if (moving) {
    const n = Math.floor((t * 1.6) % 10);
    if (beat("endless", n) && n >= 1 && n <= 7 && L("portals") > .3) tone({ freq: PENTA[n - 1], dur: 1.6, level: .05 * L("portals"), attack: .005, pan: (n - 4) * .12 });
    if (L("portals") > .3 && Math.random() < .03) burst({ dur: .04, freq: 1800, q: 1.5, level: .03 * L("portals"), pan: Math.random() < .5 ? -.3 : .3 });
  }
  // Socrates' bench: crickets, and the owl now and then
  if (L("bench") > .05) {
    if (beat("cricket", Math.floor(t * 1.15))) for (let k = 0; k < 3; k++) tone({ at: k * .07, freq: 4400, dur: .05, level: .025 * L("bench"), pan: -.4, attack: .004 });
    if (beat("owl", Math.floor(t / 9))) { tone({ freq: 392, to: 370, dur: .45, level: .09 * L("bench"), attack: .06, pan: .35 }); tone({ at: .55, freq: 370, to: 349, dur: .7, level: .08 * L("bench"), attack: .08, pan: .35 }); }
  }
  // the airfield: the windsock flutters, and the duck quacks as it flies by
  if (L("airfield") > .3 && Math.random() < .05) burst({ dur: .06, freq: 900, q: 1, level: .03 * L("airfield"), pan: .4 });
  if (L("airfield") > .5 && beat("duck", Math.floor(t / 6.5))) for (let k = 0; k < 2; k++) tone({ at: k * .22, freq: 560, to: 400, dur: .16, level: .08 * L("airfield"), type: "sawtooth", filter: 1150, q: 3, attack: .01, pan: -.3 });
}
