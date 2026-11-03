// The eight buildings, one per place. Each draws itself in its own frame: unit U, y < 0 is up, the ground
// at y = 0, light from the upper left. a is how awake it is (0 asleep, 1 on top), t the time in seconds.
import { ctx, T, rect, poly, circle, rrect, line, lit, on, still, hash, segs, wall, edgeLight, shadeRight, blinkOn, arcPts, jit, hpoly, hrect, bands, pool } from "./paint.js";

export const DRAW = {
  home(a, t) {
    // mailbox, leaning a touch
    ctx.fillStyle = T.planet; hpoly([-2.52, -.8, -2.42, -.8, -2.41, .05, -2.51, .05], 11, .02);
    ctx.fillStyle = T.roof; rrect(-2.74, -1.1, .55, .32, .14);
    lit(T.signal, .45 + .55 * a, () => rect(-2.24, -1.3, .05, .3));
    // flag, with a hem along the pole
    ctx.fillStyle = T.planet; rect(-1.98, -3.7, .11, 3.75); circle(-1.925, -3.76, .09);
    const w1 = still() ? 0 : Math.sin(t * 3) * .12, w2 = still() ? 0 : Math.sin(t * 3 - 1.2) * .16;
    lit(T.glow, on(a), () => poly([-1.87, -3.68, -1.35, -3.6 + w1, -.8, -3.5 + w2, -.84, -3.28 + w2, -.8, -3.05 + w2, -1.35, -3.15 + w1, -1.87, -3.1]));
    lit(T.roof, .3, () => rect(-1.87, -3.68, .1, .58));
    // chimney: bricks, a cap, a slight lean; it sits behind the roof
    ctx.fillStyle = T.wall; hpoly([.45, -2.75, .81, -2.77, .81, -1.85, .45, -1.85], 12, .02);
    lit(T.roof, .35, () => { for (let k = 0; k < 4; k++) rect(.5 + (k % 2) * .14, -2.62 + k * .17, .14, .05); });
    ctx.fillStyle = T.roof; hpoly([.38, -2.86, .88, -2.88, .88, -2.74, .38, -2.73], 13, .015);
    // house: clapboard walls, light from the left, shade under the eaves
    wall(-1.6, -1.6, 2.6, 1.6);
    lit(T.roof, .22, () => { for (let k = 0; k < 8; k++) { const y = -1.42 + k * .18; hpoly([-1.6, y, 1, y + jit(14, k, .015), 1, y + .028, -1.6, y + .028], 15 + k, .008); } });
    edgeLight(-1.6, -1.55, 1.5); shadeRight(-1.6, -1.6, 2.6, 1.6);
    lit(T.roof, .5, () => rect(-1.6, -1.6, 2.6, .16));
    // roof: shingles in staggered rows, a lit edge on the left, a heavier one on the right
    ctx.fillStyle = T.roof; hpoly([-2, -1.52, -.3, -2.98, 1.4, -1.52], 16, .03);
    [-1.78, -2.04, -2.3, -2.55].forEach((y, r) => {
      const hw = (y + 2.98) / 1.46 * 1.7 - .12;
      segs([[-.3 - hw, y, -.3 + hw, y]], T.wall, .035, .3);
      const gaps = []; for (let x = -.3 - hw + (r % 2 ? .14 : .28); x < -.3 + hw - .1; x += .28) gaps.push([x, y, x + .01, y + .24]);
      segs(gaps, T.wall, .03, .22);
    });
    segs([[-2, -1.52, -.3, -2.98]], T.rim, .07, .45); segs([[-.3, -2.98, 1.4, -1.52]], T.rim, .05, .12);
    // the round attic window, lit
    bands(-.3, -2.08, .4, T.glow, .2 * a);
    lit(T.glow, on(a), () => circle(-.3, -2.08, .19));
    segs([[-.49, -2.08, -.11, -2.08], [-.3, -2.27, -.3, -1.89]], T.roof, .04);
    // door: planks, a small window, a lamp beside it that lights the step
    ctx.fillStyle = T.roof; rrect(-.32, -1.12, .5, 1.12, .1);
    segs([[-.15, -1.02, -.15, -.05], [.02, -1.02, .02, -.05]], T.wall, .025, .35);
    lit(T.glow, on(a) * .8, () => rrect(-.22, -.98, .3, .2, .06));
    lit(T.glow, on(a), () => circle(.1, -.56, .045));
    ctx.fillStyle = T.planet; hpoly([-.44, -.09, .3, -.08, .3, .03, -.44, .03], 17, .012);
    pool(-.07, .55, T.glow, .2 * a);
    bands(.26, -1.24, .34, T.glow, .26 * a);
    ctx.fillStyle = T.roof; rect(.2, -1.36, .12, .05); lit(T.glow, on(a), () => rrect(.22, -1.32, .08, .14, .03));
    // windows: frames, sills, curtains on one, a plant on the other, and light spilling below
    const lamp = on(a), dim = on(a) * .82;
    bands(-1, -1, .62, T.glow, .16 * a); bands(.61, -1, .52, T.glow, .12 * a);
    pool(-1, .5, T.glow, .16 * a); pool(.61, .4, T.glow, .12 * a);
    lit(T.glow, lamp, () => rect(-1.32, -1.26, .64, .52)); lit(T.glow, dim, () => rect(.36, -1.26, .5, .52));
    lit(T["door-b"], .55 + .3 * a, () => { poly([-1.32, -1.26, -1.12, -1.26, -1.2, -.74, -1.32, -.74]); poly([-.68, -1.26, -.88, -1.26, -.8, -.74, -.68, -.74]); });
    ctx.fillStyle = T.roof; poly([.68, -.74, .7, -.92, .76, -.98, .79, -.88, .82, -.74]); circle(.74, -.98, .06); circle(.8, -.93, .05);
    segs([[-1, -1.26, -1, -.74], [-1.32, -1, -.68, -1], [.61, -1.26, .61, -.74], [.36, -1, .86, -1]], T.wall, .05);
    segs([[-1.32, -1.26, -1.32, -.74], [-1.32, -1.26, -.68, -1.26], [.36, -1.26, .36, -.74], [.36, -1.26, .86, -1.26]], T.rim, .03, .25);
    ctx.fillStyle = T.roof; rect(-1.38, -1.32, .76, .06); rect(.3, -1.32, .62, .06);
    hrect(-1.4, -.74, .8, .12, 18, .01); hrect(.28, -.74, .66, .12, 19, .01);
    [[-1.27, "door-b", .06], [-1.12, "door-c", .045], [-.98, "door-b", .05], [-.82, "door-c", .065], [.44, "door-c", .05], [.6, "door-b", .065], [.79, "door-c", .045]]
      .forEach(([x, c, r]) => { lit(T.roof, .8, () => rect(x - .01, -.8, .02, .07)); lit(T[c], .5 + .5 * a, () => circle(x, -.8 - r * .6, r)); });
    // home server: a little rack with vents, LEDs and an antenna, wired to the house
    line([1, -.42, 1.1, -.28, 1.2, -.34], T.roof, .05);
    ctx.fillStyle = T.roof; rrect(1.2, -1.42, .92, 1.47, .06); edgeLight(1.2, -1.38, 1.35);
    segs([-.42, -.3, -.18].map((y) => [1.32, y, 2, y]), T.wall, .04, .5);
    for (let k = 0; k < 3; k++) {
      const blink = still() ? 1 : (Math.sin(t * (2.6 + k * 1.7) + k * 2) > -.3 ? 1 : .2);
      lit(k === 1 ? T["door-c"] : T.glow, on(a) * blink, () => rect(1.36, -1.25 + k * .3, .5, .09));
      lit(T.rim, .35, () => circle(1.98, -1.2 + k * .3, .04));
    }
    segs([[1.98, -1.42, 1.98, -1.82]], T.roof, .05);
    lit(T["door-c"], blinkOn(t, 4) ? on(a) : .2, () => circle(1.98, -1.86, .065));
    if (!still() && a > .05) for (let k = 0; k < 3; k++) {
      const p = (t * .35 + k / 3) % 1;
      lit(T.rim, a * .4 * (1 - p), () => circle(.63 + p * .5, -2.95 - p * 1.4, .14 + p * .22));
    }
  },
  null(a, t) {
    // crates stacked by the wall
    ctx.fillStyle = T.roof; hrect(-2.62, -.62, .62, .62, 21, .02); hrect(-2.5, -1.12, .5, .5, 22, .02);
    segs([[-2.6, -.31, -2.02, -.31], [-2.31, -.6, -2.31, -.02], [-2.48, -.87, -2.02, -.87]], T.wall, .03, .35);
    // the workshop: corrugated metal under a shed roof that falls to the right
    ctx.fillStyle = T.wall; hpoly([-1.9, 0, -1.9, -2.55, 2, -2, 2, 0], 23, .02);
    ctx.fillStyle = T.planet; rect(-1.94, -.06, 3.98, .36);
    lit(T.roof, .2, () => { const ribs = []; for (let x = -1.78; x < 1.95; x += .16) ribs.push([x, -.08, x, -2.47 + (x + 1.9) * .141]); segs(ribs, T.roof, .03, 1); });
    edgeLight(-1.9, -2.5, 2.42); lit(T.roof, .45, () => poly([1.3, -2.1, 2, -2, 2, 0, 1.3, 0]));
    ctx.fillStyle = T.roof; hpoly([-2.12, -2.67, 2.18, -2.06, 2.18, -1.88, -2.12, -2.5], 24, .02);
    segs([[-2.12, -2.67, 2.18, -2.06]], T.rim, .05, .4);
    lit(T.roof, .45, () => poly([-1.9, -2.5, 2, -1.95, 2, -1.83, -1.9, -2.38]));
    // a sign with the editor's name
    ctx.fillStyle = T.roof; rrect(-.98, -2.22, 1.1, .25, .05);
    lit(T.glow, on(a) * .9, () => { ctx.save(); ctx.scale(1 / 40, 1 / 40); ctx.font = `600 10px ${T["f-mono"]}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("null", -17, -83.5); ctx.restore(); });
    // the big window, true black inside, with a desk, a lamp and the editor on a screen
    const wx = -1.6, wy = -1.95, ww = 2.6, wh = 1.4;
    ctx.fillStyle = T.void; rect(wx, wy, ww, wh);
    bands(.72, -1.4, .9, T.glow, .22 * a, 3);
    lit(T.glow, .35 * on(a), () => poly([.6, -1.58, .84, -1.58, 1, -.97, .42, -.97]));
    ctx.fillStyle = T.roof; rect(-1.45, -.97, 2.4, .07); rect(-1.35, -.9, .06, .35); rect(.84, -.9, .06, .35);
    lit(T.rim, .5, () => { segs([[.9, -.98, .95, -1.42], [.95, -1.42, .74, -1.62]], T.rim, .035, .6); });
    lit(T.glow, on(a), () => poly([.6, -1.58, .84, -1.58, .79, -1.67, .65, -1.67]));
    lit(T.rim, .55, () => { rect(-1.22, -1.1, .14, .13); }); lit(T.rim, .25, () => rect(-1.08, -1.06, .04, .06));
    // the screen and its code, typed one line at a time
    const sx = -.85, sy = -1.85, sw = 1.25, sh = .7;
    bands(sx + sw / 2, sy + sh / 2, .95, T["door-b"], .1 * a, 3);
    ctx.fillStyle = T.roof; rect(-.3, -1.15, .13, .18); rect(-.46, -1.0, .45, .04);
    segs([[sx, sy, sx + sw, sy], [sx, sy, sx, sy + sh]], T.rim, .025, .45); segs([[sx + sw, sy, sx + sw, sy + sh], [sx, sy + sh, sx + sw, sy + sh]], T.rim, .02, .2);
    const rows = [
      [0, [[.5, "door-b"], [.9, "rim"]]],
      [.3, [[.4, "rim"], [.55, "glow"]]],
      [.3, [[.6, "door-c"], [.3, "rim"], [.5, "rim"]]],
      [.6, [[.5, "rim"], [.25, "door-b"]]],
      [.3, [[.35, "door-b"], [.75, "glow"]]],
      [0, [[.2, "rim"]]],
      [0, [[.45, "door-b"], [.55, "door-c"]]]
    ];
    const shownRows = still() || a < .5 ? rows.length : Math.min(rows.length, Math.floor((t * 2.2) % 10));
    const cx = sx + .2, k0 = .4, rh = .045, step = .08;
    let endX = cx, endRow = 0;
    rows.forEach(([ind, toks], k) => {
      const y = sy + .07 + k * step;
      lit(T.rim, .18, () => rect(sx + .06, y, .06, rh));
      if (k >= shownRows) return;
      let x = cx + ind * k0;
      for (const [w, c] of toks) { lit(T[c], c === "rim" ? .45 : .3 + .55 * a, () => rect(x, y, w * k0, rh)); x += (w + .1) * k0; }
      endX = x; endRow = k;
    });
    const blink = still() ? 1 : Math.floor(t * 2.2) % 2;
    lit(T.glow, a * blink, () => rect(endX, sy + .055 + endRow * step, .035, .08));
    lit(T.rim, .08, () => rect(sx, sy + sh - .09, sw, .09));
    lit(T.glow, on(a), () => rect(sx + .06, sy + sh - .06, .1, .035));
    // window bars over everything inside, then the glass catching the light from the left
    segs([[-1.02, wy, -1.02, wy + wh], [.5, wy, .5, wy + wh], [wx, -.97, wx + ww, -.97]], T.wall, .07);
    segs([[wx, wy, wx + ww, wy], [wx, wy, wx, wy + wh], [wx + ww, wy, wx + ww, wy + wh], [wx, wy + wh, wx + ww, wy + wh]], T.wall, .09);
    segs([[wx + .05, wy + .05, wx + ww - .05, wy + .05], [wx + .05, wy + .05, wx + .05, wy + wh - .05]], T.rim, .025, .3);
    lit(T.rim, .07, () => { poly([-1.52, -1.2, -1.13, -1.9, -1.06, -1.9, -1.45, -1.2]); poly([.56, -1.05, .9, -1.9, .96, -1.9, .62, -1.05]); });
    ctx.fillStyle = T.roof; hrect(wx - .1, -.55, ww + .2, .11, 25, .01);
    pool(-.2, 1.3, T.glow, .1 * a);
    // a cat on the sill, its tail swinging now and then
    const tail = still() ? 0 : Math.max(0, Math.sin(t * 1.3)) * .12;
    ctx.fillStyle = T.roof;
    poly([.62, -.55, .66, -.78, .76, -.86, .9, -.84, .96, -.7, .96, -.55]); circle(.8, -.92, .1);
    poly([.72, -.99, .74, -1.08, .79, -1.0]); poly([.82, -1.0, .87, -1.08, .89, -.98]);
    line([.95, -.6, 1.08, -.62, 1.12 + tail * .5, -.78 - tail], T.roof, .045);
    lit(T.glow, .6 * on(a), () => { circle(.77, -.93, .018); circle(.84, -.93, .018); });
    // door, with a lamp and a plant beside it
    ctx.fillStyle = T.roof; rrect(1.18, -1.2, .6, 1.2, .06);
    segs([[1.38, -1.12, 1.38, -.05], [1.58, -1.12, 1.58, -.05]], T.wall, .025, .35);
    lit(T.glow, on(a), () => circle(1.68, -.6, .04));
    bands(1.48, -1.38, .4, T.glow, .26 * a); pool(1.48, .5, T.glow, .2 * a);
    ctx.fillStyle = T.roof; rect(1.42, -1.46, .12, .05); lit(T.glow, on(a), () => rrect(1.44, -1.42, .08, .12, .03));
    ctx.fillStyle = T.roof; hpoly([2.08, -.36, 2.44, -.36, 2.38, 0, 2.14, 0], 26, .015);
    lit(T["door-c"], .55 + .3 * a, () => { poly([2.26, -.36, 2.12, -.78, 2.2, -.8, 2.28, -.4]); poly([2.26, -.36, 2.4, -.86, 2.48, -.82, 2.3, -.38]); poly([2.26, -.38, 2.27, -.98, 2.34, -.96, 2.3, -.38]); });
  },
  atlas(a, t) {
    // the mast's lines run down to a pole on each side; every light hung on them is a device, and the red one has a problem
    const top = [0, -6.3], ends = [[-2.6, -3.05], [2.55, -3.3]];
    const along = (e, u) => [top[0] + (e[0] - top[0]) * u, top[1] + (e[1] - top[1]) * u + Math.sin(u * Math.PI) * .42];
    ctx.fillStyle = T.planet;
    for (const [x, y] of ends) { hpoly([x - .06, y - .1, x + .06, y - .1, x + .07, .05, x - .07, .05], x * 3, .015); rect(x - .22, y + .02, .44, .06); }
    for (const e of ends) { const pts = []; for (let k = 0; k <= 16; k++) pts.push(...along(e, k / 16)); line(pts, T.rim, .035, .2 + .3 * a); }
    const lamps = [[0, .2], [0, .42], [0, .64], [0, .85], [1, .3], [1, .55], [1, .8]];
    lamps.forEach(([side, u], k) => {
      const [x, y0] = along(ends[side], u), red = k === 5, c = red ? T.signal : T.glow, y = y0 + .22;
      segs([[x, y0, x, y - .1]], T.rim, .025, .4);
      const pulse = red && !still() ? .7 + .3 * Math.sin(t * 4) : 1;
      bands(x, y + .04, red ? .62 : .42, c, (red ? .36 : .16) * on(a) * pulse);
      lit(c, on(a), () => {
        if (k % 3 === 0) { rrect(x - .17, y - .1, .34, .22, .04); }
        else if (k % 3 === 1) rrect(x - .08, y - .12, .16, .3, .04);
        else circle(x, y + .04, .13);
      });
      lit(T.roof, .8, () => rect(x - .06, y - .14, .12, .05));
      if (red) lit(T.void, .85, () => { rect(x - .022, y - .04, .044, .12); rect(x - .022, y + .1, .044, .04); });
    });
    // lattice tower, a little crooked from the weather
    const xAt = (y) => .9 - .58 * (-y / 3.25);
    const lat = [[-.9, 0, -.32, -3.25], [.9, 0, .32, -3.25]];
    for (let k = 0; k < 4; k++) {
      const y0 = -k * .81, y1 = -(k + 1) * .81;
      lat.push([-xAt(y0), y0, xAt(y1), y1], [xAt(y0), y0, -xAt(y1), y1], [-xAt(y1), y1, xAt(y1), y1]);
    }
    segs(lat.slice(0, 2), T.planet, .15); segs(lat.slice(2), T.planet, .06);
    segs([[-.9, 0, -.32, -3.25]], T.rim, .04, .25);
    ctx.fillStyle = T.planet; rect(-1.02, -.1, .26, .14); rect(.76, -.1, .26, .14);
    // cabin with a railed balcony, the mast above it
    wall(-.75, -3.9, 1.5, .68);
    lit(T.roof, .25, () => segs([-3.72, -3.56, -3.4].map((y) => [-.75, y, .75, y]), T.roof, .025, 1));
    edgeLight(-.75, -3.86, .6); shadeRight(-.75, -3.9, 1.5, .68);
    bands(0, -3.6, 1.05, T.glow, .2 * a);
    lit(T.glow, on(a), () => rect(-.6, -3.76, 1.2, .3));
    segs([[-.2, -3.76, -.2, -3.46], [.2, -3.76, .2, -3.46]], T.wall, .05);
    ctx.fillStyle = T.roof; hpoly([-.95, -3.86, 0, -4.32, .95, -3.86], 31, .02); rect(-.92, -3.26, 1.84, .1);
    segs([[-.95, -3.86, 0, -4.32]], T.rim, .05, .4);
    segs([[-.92, -3.55, .92, -3.55], ...[-.84, -.5, -.16, .16, .5, .84].map((x) => [x, -3.55, x, -3.26])], T.planet, .035);
    ctx.fillStyle = T.planet; rect(-.04, -6.3, .08, 2.0); rect(-.2, -5.1, .4, .05);
    segs([[-.18, -4.3, -.04, -5.6], [.18, -4.3, .04, -5.6]], T.planet, .03);
    lit(T.signal, blinkOn(t, 3) ? 1 : .25, () => circle(0, -6.34, .08));
    // hut at the foot: planks, a lit window, a lamp over the door
    wall(1.08, -1, 1, 1);
    lit(T.roof, .22, () => segs([1.28, 1.48, 1.68, 1.88].map((x) => [x, -.95, x, -.05]), T.roof, .025, 1));
    edgeLight(1.08, -.96, .9);
    ctx.fillStyle = T.roof; hpoly([.95, -.98, 1.58, -1.4, 2.21, -.98], 32, .02);
    segs([[.95, -.98, 1.58, -1.4]], T.rim, .04, .35);
    bands(1.6, -.4, .5, T.glow, .18 * a); pool(1.6, .4, T.glow, .16 * a);
    lit(T.glow, on(a), () => rect(1.45, -.66, .3, .66));
    segs([[1.6, -.66, 1.6, 0]], T.wall, .03);
    if (!still() && a > .05) {
      const [rx, ry] = along(ends[1], .55), p = (t * 1.1) % 1;
      line([rx + .4 + p * .45, ry + .26, ...arcPts(rx, ry + .26, .4 + p * .45)], T.signal, .04, a * (1 - p));
      const q = (t * .5) % 1;
      ctx.save(); ctx.strokeStyle = T.glow; ctx.lineWidth = .05; ctx.globalAlpha *= a * .4 * (1 - q);
      ctx.beginPath(); ctx.arc(top[0], top[1], .2 + q * 2.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  },
  git(a, t) {
    // side wing: a reading room full of books
    wall(1, -1.8, 1.05, 1.8);
    lit(T.roof, .22, () => { for (let r = 0; r < 4; r++) { const y = -1.8 + (r + 1) * .45; segs([[1, y, 2.05, y], [1.3 + (r % 2) * .35, y - .45, 1.3 + (r % 2) * .35, y], [1.65 + (r % 2) * .2, y - .45, 1.65 + (r % 2) * .2, y]], T.roof, .025, 1); } });
    shadeRight(1, -1.8, 1.05, 1.8);
    ctx.fillStyle = T.roof; hrect(.95, -1.95, 1.18, .16, 41, .015);
    bands(1.53, -1.1, .85, T.glow, .14 * a); pool(1.53, .5, T.glow, .12 * a);
    ctx.fillStyle = T.void; rect(1.18, -1.5, .7, .78);
    lit(T.glow, on(a) * .45, () => rect(1.18, -1.5, .7, .78));
    const books = ["door-b", "door-c", "signal", "rim", "door-b", "glow", "door-c"];
    for (let row = 0; row < 2; row++) {
      books.forEach((c, k) => { const h = .2 + hash(k + row * 9) * .12, lean = k === 6 && row === 0 ? .05 : 0;
        lit(T[c], on(a), () => poly([1.22 + k * .09, -1.13 + row * .38, 1.285 + k * .09, -1.13 + row * .38, 1.285 + k * .09 + lean, -1.13 + row * .38 - h, 1.22 + k * .09 + lean, -1.13 + row * .38 - h])); });
      lit(T.roof, 1, () => rect(1.18, -1.13 + row * .38, .7, .04));
    }
    segs([[1.18, -1.5, 1.88, -1.5], [1.18, -1.5, 1.18, -.72], [1.88, -1.5, 1.88, -.72]], T.roof, .06);
    ctx.fillStyle = T.roof; rect(1.12, -.74, .82, .08);
    // tower of stone blocks in staggered courses, a slate roof, a finial
    wall(-1.05, -4.5, 2.1, 4.5);
    lit(T.roof, .24, () => {
      const j = [];
      for (let r = 0; r < 10; r++) { const y = -r * .45; j.push([-1.05, y - .45, 1.05, y - .45]); for (let x = -1.05 + (r % 2 ? .35 : .7); x < 1.05; x += .7) j.push([x, y - .45, x, y]); }
      segs(j, T.roof, .028, 1);
    });
    for (let k = 0; k < 9; k++) { const r = Math.floor(hash(k * 3.1) * 10), c = Math.floor(hash(k * 5.7) * 3); lit(T.roof, .14, () => rect(-1.05 + c * .7 + (r % 2 ? .35 : 0), -r * .45 - .45, .35, .45)); }
    shadeRight(-1.05, -4.5, 2.1, 4.5); edgeLight(-1.05, -4.45, 4.4);
    ctx.fillStyle = T.roof; hpoly([-1.32, -4.45, 0, -5.48, 1.32, -4.45], 42, .025); hrect(-1.22, -4.58, 2.44, .13, 43, .012);
    segs([-4.7, -4.95, -5.2].map((y) => { const hw = (y + 5.48) / 1.03 * 1.3 - .1; return [-hw, y, hw, y]; }), T.wall, .03, .3);
    segs([[-1.32, -4.45, 0, -5.48]], T.rim, .05, .4);
    segs([[0, -5.48, 0, -5.85]], T.roof, .07); ctx.fillStyle = T.roof; circle(0, -5.9, .08);
    // the clock shows the visitor's own time
    const d = new Date(), hA = ((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2, mA = (d.getMinutes() + d.getSeconds() / 60) / 60 * Math.PI * 2;
    ctx.fillStyle = T.roof; circle(0, -4.88, .37);
    lit(T.rim, .3 + .55 * a, () => circle(0, -4.88, .3));
    segs(Array.from({ length: 12 }, (_, k) => { const th = k / 12 * Math.PI * 2, r0 = k % 3 ? .25 : .21; return [Math.sin(th) * r0, -4.88 - Math.cos(th) * r0, Math.sin(th) * .28, -4.88 - Math.cos(th) * .28]; }), T.roof, .025, .7);
    segs([[0, -4.88, Math.sin(hA) * .15, -4.88 - Math.cos(hA) * .15], [0, -4.88, Math.sin(mA) * .23, -4.88 - Math.cos(mA) * .23]], T.roof, .05);
    // arched door of planks, a lamp beside it
    ctx.fillStyle = T.roof; rect(.22, -.72, .56, .72); circle(.5, -.72, .28);
    segs([[.4, -.95, .4, -.04], [.6, -.95, .6, -.04]], T.wall, .025, .35);
    lit(T.glow, on(a), () => circle(.68, -.4, .04));
    bands(.92, -1.05, .32, T.glow, .24 * a); pool(.55, .5, T.glow, .16 * a);
    ctx.fillStyle = T.roof; rect(.86, -1.16, .12, .05); lit(T.glow, on(a), () => rrect(.88, -1.12, .08, .13, .03));
    // ivy climbs the facade as a git history: main goes straight up, a branch leaves it and merges back
    const vine = (pts, w) => line(pts, T["door-c"], w, .45 + .3 * a);
    const main = []; for (let y = -.15; y > -4.12; y -= .2) main.push(-.35 + Math.sin(y * 5.3) * .04, y);
    vine(main, .07);
    vine([-.35, -1.8, .05, -1.98, .4, -2.25, .47, -2.6, .42, -2.95, .05, -3.22, -.35, -3.4], .06);
    lit(T["door-c"], .4 + .3 * a, () => { for (let k = 0; k < 16; k++) { const y = -.35 - k * .24, s = k % 2 ? 1 : -1; ctx.beginPath(); ctx.ellipse(-.35 + s * .12, y, .09, .05, s * .6, 0, Math.PI * 2); ctx.fill(); } });
    // each commit is a round window
    const commits = [[-.35, -1.1], [-.35, -1.8], [.45, -2.35], [-.35, -2.5], [.45, -2.85], [-.35, -3.1], [-.35, -3.5], [-.35, -4]];
    const n = still() || a < .5 ? commits.length : Math.floor((t * 3) % (commits.length + 4));
    commits.forEach(([x, y], k) => {
      if (k === n - 1 && a > .5) bands(x, y, .55, T.glow, .3 * a);
      ctx.fillStyle = T.roof; circle(x, y, .22);
      lit(x > 0 ? T["door-b"] : T.glow, k < n ? on(a) : .25, () => circle(x, y, .16));
      lit(T.rim, k < n ? .35 * a : .1, () => { ctx.beginPath(); ctx.arc(x, y, .11, Math.PI * 1.05, Math.PI * 1.55); ctx.lineTo(x, y); ctx.fill(); });
      ctx.fillStyle = T.roof; rect(x - .2, y + .2, .4, .05);
    });
  },
  broadcast(a, t) {
    const cols = [T.glow, T["door-b"], T["door-c"]];
    const c = cols[still() || a < .5 ? 0 : Math.floor(t / 1.4) % 3];
    // every screen shows the same little picture, with scanlines and a glassy corner
    const pic = (x, y, w, h) => {
      lit(c, on(a), () => rect(x, y, w, h));
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      lit(T.rim, .6 * on(a), () => circle(x + w * .72, y + h * .38, h * .17));
      lit(T.roof, .55, () => { ctx.beginPath(); ctx.ellipse(x + w * .3, y + h * 1.08, w * .55, h * .48, 0, 0, Math.PI * 2); ctx.fill(); });
      const lines = []; for (let k = 1; k < 9; k++) lines.push([x, y + h * k / 9, x + w, y + h * k / 9]);
      segs(lines, T.void, .02, .15);
      lit(T.void, .18, () => { rect(x, y, w, h * .08); rect(x, y + h * .92, w, h * .08); rect(x, y, w * .05, h); rect(x + w * .95, y, w * .05, h); });
      lit(T.rim, .12, () => poly([x, y, x + w * .35, y, x, y + h * .5]));
      ctx.restore();
    };
    bands(-1.37, -1.95, 1.3, c, .09 * a, 2); pool(-1.37, 1.1, c, .12 * a);
    // a wooden TV set on splayed legs, rabbit ears on top, the stick plugged into its side
    ctx.fillStyle = T.planet; poly([-2.2, .05, -2.05, .05, -1.9, -1.15, -2.02, -1.15]); poly([-.55, .05, -.7, .05, -.85, -1.15, -.73, -1.15]);
    segs([[-1.37, -2.8, -1.95, -3.5], [-1.37, -2.8, -.8, -3.45]], T.planet, .07);
    ctx.fillStyle = T.planet; circle(-1.95, -3.5, .07); circle(-.8, -3.45, .07); rrect(-1.55, -2.92, .36, .14, .05);
    ctx.fillStyle = T.wall; hpoly([-2.55, -2.8, -.2, -2.82, -.2, -1.05, -2.55, -1.05], 51, .015);
    lit(T.roof, .2, () => { for (let k = 0; k < 4; k++) { const y = -2.72 + k * .5; line([-2.5, y, -1.8, y + .02, -1, y - .02, -.25, y + .01], T.roof, .02); } });
    edgeLight(-2.55, -2.7, 1.55);
    ctx.fillStyle = T.void; rrect(-2.43, -2.68, 2.11, 1.46, .14);
    pic(-2.36, -2.61, 1.97, 1.32);
    lit(T.signal, .4 + .6 * a, () => circle(-.42, -1.13, .04));
    ctx.fillStyle = T.roof; circle(-.7, -1.13, .05); circle(-.85, -1.13, .05);
    ctx.fillStyle = T.roof; rect(-.22, -1.78, .3, .13); lit(T["door-c"], on(a), () => rect(.0, -1.75, .05, .05));
    // remote, standing up: power, d-pad, rubber buttons, the infrared window on top
    ctx.fillStyle = T.wall; rrect(.25, -2.2, .62, 2.25, .28); edgeLight(.25, -2, 1.9);
    lit(T.roof, .4, () => rect(.75, -2.05, .1, 1.95));
    lit(T.void, .7, () => rrect(.43, -2.16, .26, .1, .05));
    lit(T.glow, on(a), () => circle(.56, -1.86, .12));
    ctx.fillStyle = T.roof; circle(.56, -1.35, .21); lit(T.wall, 1, () => circle(.56, -1.35, .08));
    segs([[.56, -1.53, .56, -1.47], [.56, -1.23, .56, -1.17], [.38, -1.35, .44, -1.35], [.68, -1.35, .74, -1.35]], T.wall, .03, .8);
    ctx.fillStyle = T.roof; for (let r = 0; r < 3; r++) for (let q = 0; q < 2; q++) rrect(.39 + q * .24, -.93 + r * .22, .1, .1, .04);
    if (!still() && a > .05) for (let k = 0; k < 3; k++) {
      const p = (t * .9 + k / 3) % 1;
      lit(T.glow, a * Math.sin(p * Math.PI), () => circle(.56 + (-.48 - .56) * p, -2.2 + (.48) * p - Math.sin(p * Math.PI) * .45, .05));
    }
    // lattice mast holding two screens, their cables running down it
    const mast = [[1.45, 0, 1.52, -3.95], [1.75, 0, 1.68, -3.95]];
    for (let k = 0; k < 6; k++) mast.push([1.47 + (k % 2) * .26, -k * .66, 1.73 - (k % 2) * .26, -(k + 1) * .66]);
    segs(mast.slice(0, 2), T.planet, .1); segs(mast.slice(2), T.planet, .05); segs([[1.45, 0, 1.52, -3.95]], T.rim, .03, .25);
    line([2.05, -3.11, 1.82, -3, 1.8, -.1], T.roof, .03); line([2.05, -1.91, 1.86, -1.8, 1.84, -.1], T.roof, .03);
    ctx.fillStyle = T.planet; rect(1.6, -3.5, .45, .08); rect(1.6, -2.3, .45, .08); rect(1.36, -.08, .48, .12);
    ctx.fillStyle = T.wall; rrect(2, -3.85, 1.05, .74, .08); rrect(2, -2.65, 1.05, .74, .08);
    pic(2.07, -3.78, .91, .6); pic(2.07, -2.58, .91, .6);
    line([-.6, .02, -.1, .07, .6, .06, 1.1, .08, 1.45, .02], T.roof, .045);
    if (!still() && a > .05) for (let k = 0; k < 2; k++) {
      const p = (t * .7 + k * .5) % 1;
      ctx.save(); ctx.strokeStyle = T.glow; ctx.lineWidth = .06; ctx.globalAlpha *= a * (1 - p);
      ctx.beginPath(); ctx.arc(1.6, -3.95, .3 + p * .9, -Math.PI * .85, -Math.PI * .15); ctx.stroke(); ctx.restore();
    }
  },
  portals(a, t) {
    const B = .32;
    const portal = (x, w, h, inner, ph) => {
      const x0 = x - w / 2, x1 = x + w / 2;
      ctx.fillStyle = T.planet; rect(x0 - .04, -.06, w + .08, .36);
      const ix = x0 + B, iy = -h + B, iw = w - 2 * B, ih = h - B;
      ctx.fillStyle = T.void; rect(ix, iy, iw, ih);
      const shimmer = still() ? 0 : Math.sin(t * 2 + x) * .08;
      lit(inner, .25 + .6 * a + shimmer, () => rect(ix, iy, iw, ih));
      // the surface swirls slowly
      ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
      const off = still() ? 0 : (t * .35 + ph) % .4, sw = [];
      for (let xx = ix - ih - .4 + off; xx < ix + iw; xx += .4) sw.push([xx, iy + ih, xx + ih * .7, iy]);
      segs(sw, T.rim, .07, .08 + .2 * a);
      ctx.restore();
      // the frame, block by block: each stone its own shade, moss on some
      const cells = [];
      for (let y = -h; y < 0; y += B) { const hh = Math.min(B, -y); cells.push([x0, y, hh], [x1 - B, y, hh]); }
      for (let xx = x0 + B; xx < x1 - B - .01; xx += B) cells.push([xx, -h, B]);
      cells.forEach(([cx, cy, hh], k) => {
        const s = hash(cx * 7.1 + cy * 3.3 + x);
        ctx.fillStyle = T.wall; rect(cx, cy, B, hh);
        lit(s > .5 ? T.roof : T.rim, s > .5 ? (s - .5) * .5 : (.5 - s) * .16, () => rect(cx, cy, B, hh));
        if (cy === -h && s < .35) lit(T["door-c"], .55, () => { rect(cx, cy - .04, B * (.4 + s), .08); rect(cx + .05, cy + .04, .06, .08); });
        if (k % 2 === 0 && cx === x0) lit(T.rim, .18, () => rect(cx, cy, .04, hh));
      });
      segs(cells.map(([cx, cy]) => [cx, cy, cx + B, cy]).concat(cells.map(([cx, cy, hh]) => [cx, cy, cx, cy + hh])), T.roof, .035, .7);
    };
    portal(-2.15, 1.4, 2.4, T.glow, 0);
    portal(2.15, 1.4, 2, T["door-c"], .2);
    portal(0, 1.92, 3.6, T["door-b"], .1);
    ctx.fillStyle = T.roof; rect(-.9, -.14, 1.8, .14);
    // stepping stones and flowers in the grass between the portals
    lit(T.roof, .7, () => { for (const x of [-1.55, -.15, .35, 1.6]) rrect(x - .14, -.05, .28, .07, .03); });
    for (const [x, h, col] of [[-1.42, .3, "door-b"], [-1.0, .22, "glow"], [.98, .26, "door-c"], [1.38, .34, "door-b"], [1.52, .2, "glow"]]) {
      segs([[x, 0, x, -h]], T["door-c"], .025, .6); lit(T[col], .5 + .45 * a, () => circle(x, -h, .05));
    }
    // torches on posts, their flames flickering
    for (const x of [-1.2, 1.2]) {
      ctx.fillStyle = T.planet; hpoly([x - .045, -.75, x + .045, -.75, x + .05, .03, x - .05, .03], x, .01); rect(x - .08, -.8, .16, .07);
      const fl = still() ? 1 : .8 + .2 * Math.sin(t * 13 + x * 5), sway = still() ? 0 : Math.sin(t * 7 + x) * .025;
      bands(x, -.9, .6, T.glow, (.2 + .3 * a) * fl);
      lit(T.glow, .6 + .4 * a, () => { circle(x, -.88, .09 * fl); poly([x - .08, -.88, x + sway, -1.1 * fl, x + .08, -.88]); });
      lit(T.rim, .5 + .4 * a, () => circle(x, -.9, .035));
    }
    // the seven Endless
    const lit7 = still() || a < .5 ? 7 : Math.floor((t * 1.6) % 10);
    for (let k = 0; k < 7; k++) {
      const th = Math.PI * (.95 - .9 * k / 6), sx = Math.cos(th) * 1.25, sy = -3.95 - Math.sin(th) * .85 + (still() ? 0 : Math.sin(t * 1.2 + k) * .04);
      if (k < lit7 && a > .5) bands(sx, sy, .34, T.glow, .26 * a);
      lit(T.glow, k < lit7 ? on(a) : .2, () => rect(sx - .11, sy - .11, .22, .22));
      lit(T.rim, k < lit7 ? .35 * a : 0, () => rect(sx - .11, sy - .11, .07, .07));
    }
    if (!still() && a > .05) {
      const src = [[-2.15, T.glow], [0, T["door-b"]], [2.15, T["door-c"]]];
      for (let k = 0; k < 15; k++) {
        const [sx, col] = src[k % 3], p = (t * .4 + hash(k + 7)) % 1;
        lit(col, a * (1 - p), () => rect(sx + (hash(k) - .5) * .8, -.6 - p * 3.4, .13, .13));
      }
    }
  },
  bench(a, t) {
    // a column on worn steps: three drums, fluting, a cracked capital, moss at the foot, a chipped corner
    ctx.fillStyle = T.planet; hrect(-2.7, -.18, 1.54, .25, 61, .02); hrect(-2.57, -.37, 1.28, .21, 62, .015);
    ctx.fillStyle = T.wall; hpoly([-2.28, -.36, -2.25, -3, -1.59, -3, -1.56, -.36], 63, .012);
    segs([-2.12, -1.92, -1.72].map((x) => [x, -2.92, x + .01, -.42]), T.roof, .05, .5);
    segs([[-2.27, -1.24, -1.57, -1.24], [-2.26, -2.1, -1.58, -2.1]], T.roof, .03, .4);
    edgeLight(-2.27, -2.95, 2.55); lit(T.roof, .35, () => rect(-1.72, -2.98, .14, 2.6));
    line([-1.62, -2.5, -1.78, -2.2, -1.68, -1.95, -1.76, -1.75, -1.7, -1.6], T.roof, .035);
    lit(T["door-c"], .45, () => { ctx.beginPath(); ctx.ellipse(-2.15, -.38, .22, .06, 0, 0, Math.PI * 2); ctx.fill(); circle(-1.68, -.42, .07); });
    ctx.fillStyle = T.wall; rect(-2.42, -3.24, 1, .26); circle(-2.42, -3.1, .15); circle(-1.42, -3.1, .15);
    ctx.fillStyle = T.roof; circle(-2.42, -3.1, .06); circle(-1.42, -3.1, .06);
    hpoly([-2.52, -3.42, -1.48, -3.42, -1.36, -3.31, -1.32, -3.24, -2.52, -3.24], 64, .01);
    // bench: wooden slats on curled iron legs, a book left open on it
    line([-.7, .05, -.66, -.5, -.74, -.82, -.62, -.9], T.roof, .09); line([1.16, .05, 1.12, -.5, 1.2, -.82, 1.08, -.9], T.roof, .09);
    line([-.7, -.9, -.72, -1.4, -.66, -1.66], T.roof, .08); line([1.16, -.9, 1.18, -1.4, 1.12, -1.66], T.roof, .08);
    ctx.fillStyle = T.wall;
    hrect(-.9, -.92, 2.3, .13, 65, .01); hrect(-.88, -1.66, 2.25, .13, 66, .01); hrect(-.88, -1.39, 2.25, .12, 67, .01);
    lit(T.roof, .2, () => segs([[-.85, -.86, 1.35, -.85], [-.83, -1.6, 1.3, -1.59], [-.83, -1.33, 1.3, -1.34]], T.roof, .02, 1));
    lit(T.rim, .2, () => rect(-.88, -1.66, 2.25, .03));
    lit(T.rim, .5 + .4 * a, () => poly([.55, -.92, .78, -1.04, 1, -.92]));
    lit(T["door-b"], .5 + .5 * a, () => rect(.53, -.96, .5, .05));
    // a lamp with glass panes, and an owl that keeps watch from its cap
    ctx.fillStyle = T.planet; rect(2.06, -2.9, .12, 2.95); hpoly([1.9, -.16, 2.34, -.16, 2.3, .04, 1.94, .04], 68, .01); rect(1.98, -.5, .28, .08);
    bands(2.12, -3.04, .8, T.glow, .3 * a); pool(2.12, .7, T.glow, .18 * a);
    lit(T.glow, on(a), () => poly([1.98, -3.22, 2.26, -3.22, 2.22, -2.88, 2.02, -2.88]));
    segs([[2.12, -3.22, 2.12, -2.88], [1.98, -3.22, 2.02, -2.88], [2.26, -3.22, 2.22, -2.88]], T.roof, .035);
    ctx.fillStyle = T.roof; poly([1.86, -3.22, 2.38, -3.22, 2.12, -3.45]); rect(1.94, -2.9, .36, .06);
    ctx.beginPath(); ctx.ellipse(2.12, -3.72, .2, .27, 0, 0, Math.PI * 2); ctx.fill();
    lit(T.wall, .8, () => { ctx.beginPath(); ctx.ellipse(2.12, -3.62, .11, .15, 0, 0, Math.PI * 2); ctx.fill(); });
    lit(T.roof, .6, () => segs([[2.07, -3.62, 2.1, -3.58], [2.14, -3.62, 2.17, -3.58], [2.1, -3.52, 2.13, -3.48]], T.roof, .02, 1));
    poly([1.95, -3.86, 2.0, -4.06, 2.08, -3.92]); poly([2.29, -3.86, 2.24, -4.06, 2.16, -3.92]);
    const blink = !still() && (t % 5) < .15;
    if (blink) segs([[1.98, -3.8, 2.08, -3.8], [2.16, -3.8, 2.26, -3.8]], T.glow, .035, on(a));
    else lit(T.glow, on(a), () => { circle(2.04, -3.8, .055); circle(2.2, -3.8, .055); });
    // fireflies: they drift about, and over the bench they gather into a question that won't go away
    const qs = [];
    for (let k = 0; k < 11; k++) { const th = Math.PI + k / 10 * Math.PI * 1.3; qs.push([.25 + Math.cos(th) * .38, -3.05 + Math.sin(th) * .38]); }
    qs.push([.31, -2.55], [.27, -2.4], [.26, -2.1]);
    const form = Math.min(1, Math.max(0, (a - .3) / .6));
    qs.forEach(([qx, qy], k) => {
      const sx = -.7 + hash(k * 4.7) * 2.1, sy = -3.5 + hash(k * 9.1) * 1.7;
      const wob = still() ? 0 : .05 + .25 * (1 - form), ph = t * (.6 + hash(k) * .5) + k * 2;
      const x = sx + (qx - sx) * form + Math.sin(ph) * wob, y = sy + (qy - sy) * form + Math.cos(ph * 1.3) * wob;
      const tw = still() ? 1 : .6 + .4 * Math.sin(t * 3 + k * 1.7);
      bands(x, y, .16, T.glow, (.25 + .3 * a) * tw, 2);
      lit(T.glow, (.35 + .6 * a) * tw, () => circle(x, y, k === qs.length - 1 ? .05 : .035));
    });
  },
  airfield(a, t) {
    // control tower: concrete panels, small lit windows, a glass cab with a railing
    wall(-1.75, -2.6, .55, 2.6);
    lit(T.roof, .22, () => segs([-.65, -1.3, -1.95].map((y) => [-1.75, y, -1.2, y]), T.roof, .025, 1));
    edgeLight(-1.75, -2.55, 2.5); shadeRight(-1.75, -2.6, .55, 2.6);
    for (let k = 0; k < 3; k++) { bands(-1.48, -.63 - k * .6, .3, T.glow, .14 * a); lit(T.glow, on(a) * (k === 1 ? .7 : 1), () => rect(-1.56, -.75 - k * .6, .16, .24)); }
    ctx.fillStyle = T.roof; hpoly([-2.2, -2.6, -.75, -2.6, -.95, -3.3, -2, -3.3], 71, .015);
    bands(-1.45, -2.96, 1.05, T.glow, .2 * a);
    lit(T.glow, on(a), () => poly([-1.98, -3.15, -.92, -3.15, -1.0, -2.77, -1.9, -2.77]));
    segs([-1.72, -1.45, -1.18].map((x) => [x, -3.15, x + .02, -2.77]), T.roof, .05);
    lit(T.rim, .15, () => poly([-1.95, -3.15, -1.8, -3.15, -1.9, -2.77, -1.94, -2.77]));
    ctx.fillStyle = T.roof; rect(-2.3, -3.45, 1.65, .16); rect(-1.5, -4, .06, .55);
    segs([[-2.25, -2.6, -2.25, -2.4], [-.7, -2.6, -.7, -2.4], [-2.25, -2.4, -.7, -2.4]], T.planet, .03);
    lit(T.signal, blinkOn(t, 3.4, 1) ? 1 : .2, () => circle(-1.47, -4.04, .075));
    if (blinkOn(t, 3.4, 1)) bands(-1.47, -4.04, .3, T.signal, .25);
    // runway: tarmac, a dashed centre line, edge lights chasing towards the end
    ctx.fillStyle = T.roof; hrect(-.8, -.06, 3.2, .1, 72, .008);
    lit(T.rim, .25, () => { for (let k = 0; k < 5; k++) rect(-.5 + k * .62, -.02, .26, .025); });
    for (let k = 0; k < 5; k++) {
      const chase = still() || a < .5 ? 1 : (Math.floor(t * 5) % 5 === k ? 1 : .3);
      if (chase === 1 && a > .5) bands(-.5 + k * .62, -.12, .22, T.glow, .3 * a);
      ctx.fillStyle = T.planet; rect(-.52 + k * .62, -.12, .04, .1);
      lit(T.glow, on(a) * chase, () => rrect(-.56 + k * .62, -.2, .12, .09, .03));
    }
    // radar dish turning on a braced pedestal
    segs([[.62, .05, 1.0, -1.3], [1.58, .05, 1.2, -1.3], [.75, -.4, 1.45, -.4], [.88, -.85, 1.32, -.85], [.75, -.4, 1.32, -.85], [1.45, -.4, .88, -.85]], T.wall, .08);
    ctx.fillStyle = T.wall; rect(.92, -1.38, .36, .14);
    ctx.save(); ctx.translate(1.1, -1.45); ctx.rotate(still() ? -.25 : Math.sin(t * .5) * .5);
    ctx.fillStyle = T.planet; ctx.beginPath(); ctx.ellipse(0, 0, 1.4, .6, 0, 0, Math.PI); ctx.fill();
    lit(T.rim, .18, () => { ctx.beginPath(); ctx.ellipse(0, 0, 1.4, .6, 0, Math.PI * .5, Math.PI); ctx.lineTo(0, 0); ctx.fill(); });
    segs([.6, 1.57, 2.55].map((th) => [0, 0, Math.cos(th) * 1.3, Math.sin(th) * .55]), T.roof, .05, .7);
    ctx.save(); ctx.strokeStyle = T.roof; ctx.lineWidth = .04; ctx.globalAlpha *= .5; ctx.beginPath(); ctx.ellipse(0, 0, .8, .34, 0, 0, Math.PI); ctx.stroke(); ctx.restore();
    segs([[0, 0, -.25, -.95], [0, 0, .25, -.95]], T.planet, .04); line([0, 0, 0, -1.05], T.planet, .12);
    bands(0, -1.12, .45, T.glow, .22 * a);
    lit(T.glow, on(a), () => circle(0, -1.12, .17));
    ctx.restore();
    // windsock on a guyed pole, its stripes narrowing as it fills with wind
    ctx.fillStyle = T.planet; rect(2.3, -2.3, .07, 2.35); segs([[2.33, -1.6, 2.75, .02]], T.planet, .025);
    ctx.save(); ctx.translate(2.34, -2.2); ctx.rotate(.15 + (still() ? 0 : Math.sin(t * 2) * .12));
    segs([[0, -.2, 0, .2]], T.roof, .05);
    for (let k = 0; k < 4; k++) {
      const x0 = k * .24, h0 = .2 - k * .035, fl = still() ? 0 : Math.sin(t * 6 - k) * .02 * k;
      lit(k % 2 ? T.rim : T.signal, .55 + .45 * a, () => poly([x0, -h0 + fl, x0 + .24, -(h0 - .035) + fl, x0 + .24, h0 - .035 + fl, x0, h0 + fl]));
    }
    ctx.restore();
  }
};
