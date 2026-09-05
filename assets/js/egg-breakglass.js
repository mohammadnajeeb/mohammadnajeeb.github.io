/* Break Glass — a hidden block game behind File ▸ Break Glass…
   Lazy-loaded by ide.js on first activation, so a normal page view never
   pays for it. Self-contained: this file injects its own CSS, so build.py's
   shell() needs no <link> and no <script> for it.

   Two house rules are deliberately broken here, both on purpose:
   1. Colour is hardcoded. Everything else in this repo draws from the
      themes.css tokens; this overlay is matrix neon on black in all six
      themes, because that is the joke. Do not "fix" it.
   2. Nothing user-visible says Tetris. The title is BLOCK RAIN.

   Style matches ide.js: ES5 syntax (var / function, no arrows, no let,
   no template literals) so there is still no build step. Modern DOM APIs
   are fine — ide.js already uses CSS.escape and String#padStart. */
(function () {
  'use strict';

  /* ====================================================== tunables */

  var COLS = 10, ROWS = 22, TOP = 2;      /* rows 0–1 are a hidden spawn buffer */
  var DAS = 150, ARR = 33, SDR = 25;      /* delayed auto-shift · auto-repeat · soft drop */
  var LOCK_MS = 500, LOCK_RESETS = 15, CLEAR_MS = 180;
  var SPOKES = 11, RINGS = 4, BLEED = 18; /* crack web · shake bleed, must match the CSS */
  var TAP_SLOP = 12, TAP_MS = 260, STEP_X = 26, STEP_Y = 30;

  var C = {
    bg: '#000704', grid: '#0b2f18', dim: '#0f5c2b', mid: '#23c552',
    neon: '#39ff6a', hot: '#b6ffcf', white: '#eafff1', amber: '#ffd166', red: '#ff4d5e'
  };
  /* Piece fills stay in the green family so it reads as one palette; they are
     separated by lightness, not hue. Seven greens alone is a colour-vision
     problem, so each cell also carries its index digit — a non-colour channel. */
  var PC = [null, '#6bff9c', '#2fe06a', '#8dff5a', '#39ff6a', '#17b04a', '#a6ff7a', '#0e8f3c'];

  var MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
  var GLYPHS = '01<>[]{}/\\|=+*#$%&@ABCDEFGHJKLMNPQRSTUVWXYZ';

  var REDUCE = false;
  try { REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ======================================================== pieces
     4×4 bitmasks, one per rotation. Bit 0x8000 is (row 0, col 0), read
     MSB-first left→right then top→bottom. No matrix transposition, so no
     transpose off-by-ones. `k` selects the wall-kick table. */
  var PIECES = [null,
    { n: 'I', c: [0x0F00, 0x2222, 0x00F0, 0x4444], k: 'I' },
    { n: 'J', c: [0x8E00, 0x6440, 0x0E20, 0x44C0], k: 'J' },
    { n: 'L', c: [0x2E00, 0x4460, 0x0E80, 0xC440], k: 'J' },
    { n: 'O', c: [0x6600, 0x6600, 0x6600, 0x6600], k: 'O' },
    { n: 'S', c: [0x6C00, 0x4620, 0x06C0, 0x8C40], k: 'J' },
    { n: 'T', c: [0x4E00, 0x4640, 0x0E40, 0x4C40], k: 'J' },
    { n: 'Z', c: [0xC600, 0x2640, 0x0C60, 0x4C80], k: 'J' }];

  /* SRS wall kicks, [dx, dy] with dy ALREADY NEGATED for a y-down board.
     SRS is specified y-up; forgetting the flip is the classic silent bug in
     every from-scratch implementation, and the smoke test's wall-kick
     assertion is what catches it. */
  var KICK_J = {
    '01': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '10': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '12': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '21': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '23': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '32': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '30': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '03': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]
  };
  var KICK_I = {
    '01': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '10': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '12': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '21': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '23': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '32': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '30': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '03': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]]
  };
  var KICK_O = [[0, 0]];

  function eachCell(mask, fn) {
    for (var i = 0; i < 16; i++) if (mask & (0x8000 >> i)) fn(i >> 2, i & 3);
  }

  /* =========================================================== CSS
     Injected once as a <style>. One request, and no script/stylesheet race. */
  var CSS = [
    '#egg{position:fixed;left:0;top:0;right:0;bottom:0;z-index:200;overflow:hidden;',
    '  overscroll-behavior:none;font-family:' + MONO + ';color:' + C.white + ';',
    '  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;',
    '  -webkit-tap-highlight-color:transparent;font-size:12px;line-height:1.4;}',
    '#egg *,#egg *::before,#egg *::after{box-sizing:border-box;}',
    '#egg button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;}',
    '#egg :focus-visible{outline:1px solid ' + C.neon + ';outline-offset:2px;}',

    '.egg-shake{position:absolute;left:-18px;top:-18px;right:-18px;bottom:-18px;',
    '  animation:eggShake 420ms cubic-bezier(.2,.8,.3,1) both;}',
    '.egg-scrim{position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0);',
    '  transition:background .16s linear;}',
    '#egg.is-on .egg-scrim{background:rgba(0,0,0,.82);}',
    '.egg-rain{position:absolute;left:0;top:0;width:100%;height:100%;opacity:.4;',
    '  mix-blend-mode:screen;pointer-events:none;}',
    '.egg-webhost{position:absolute;left:18px;top:18px;right:18px;bottom:18px;}',
    '.egg-web{position:absolute;left:0;top:0;width:100%;height:100%;}',
    '.egg-flash{position:absolute;width:520px;height:520px;margin:-260px 0 0 -260px;',
    '  border-radius:50%;pointer-events:none;animation:eggFlash 110ms ease-out both;',
    '  background:radial-gradient(circle,rgba(214,255,230,.95) 0%,rgba(57,255,106,.45) 35%,rgba(57,255,106,0) 70%);}',

    '.egg-shard{animation:eggPop 260ms ease-out both;}',
    '.egg-crackline{fill:none;stroke-linecap:round;stroke-linejoin:round;',
    '  stroke-dasharray:1;animation:eggCrack 220ms linear both;}',

    '.egg-game{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;',
    '  flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;',
    '  animation:eggRise 260ms cubic-bezier(.2,.9,.3,1) both;animation-delay:380ms;}',
    '.egg-bar{display:flex;align-items:center;gap:16px;}',
    '.egg-title{letter-spacing:.28em;font-weight:700;color:' + C.neon + ';font-size:13px;}',
    '#egg .egg-x{border:1px solid rgba(57,255,106,.5);border-radius:4px;padding:3px 10px;',
    '  color:' + C.mid + ';font-size:11px;}',
    '#egg .egg-x:hover{color:' + C.white + ';border-color:' + C.neon + ';}',

    '.egg-main{display:flex;gap:14px;align-items:flex-start;}',
    '.egg-stage{position:relative;touch-action:none;background:rgba(0,7,4,.94);',
    '  border:1px solid rgba(57,255,106,.55);border-radius:6px;padding:4px;',
    '  box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 34px rgba(57,255,106,.18),inset 0 0 40px rgba(0,0,0,.85);}',
    '.egg-stage canvas{display:block;border-radius:3px;}',
    '.egg-side{display:flex;flex-direction:column;gap:10px;}',
    '.egg-box{border:1px solid rgba(57,255,106,.28);border-radius:5px;padding:6px 8px;',
    '  background:rgba(0,7,4,.9);display:flex;flex-direction:column;gap:5px;align-items:flex-start;}',
    '.egg-k{font-size:9.5px;letter-spacing:.18em;color:' + C.mid + ';}',
    '.egg-stats{margin:0;border:1px solid rgba(57,255,106,.28);border-radius:5px;',
    '  padding:7px 9px;background:rgba(0,7,4,.9);display:flex;flex-direction:column;gap:2px;}',
    '.egg-stats>div{display:flex;gap:14px;align-items:baseline;justify-content:space-between;}',
    '.egg-stats dt{font-size:9.5px;letter-spacing:.18em;color:' + C.mid + ';}',
    '.egg-stats dd{margin:0;text-align:right;font-variant-numeric:tabular-nums;font-weight:700;}',
    '.egg-stats dd.egg-v{color:' + C.amber + ';}',

    '.egg-veil{position:absolute;left:4px;top:4px;right:4px;bottom:4px;display:flex;',
    '  flex-direction:column;align-items:center;justify-content:center;gap:12px;',
    '  background:rgba(0,7,4,.86);border-radius:3px;text-align:center;padding:14px;}',
    '.egg-veil[hidden]{display:none;}',
    '.egg-veil p{margin:0;color:' + C.neon + ';letter-spacing:.16em;font-weight:700;}',
    '.egg-veil small{display:block;margin-top:6px;color:' + C.mid + ';letter-spacing:.04em;font-weight:400;}',
    '.egg-veil.is-over p{color:' + C.red + ';}',
    '#egg .egg-veil button{border:1px solid ' + C.neon + ';border-radius:4px;padding:6px 16px;',
    '  color:' + C.neon + ';letter-spacing:.14em;font-size:11px;}',
    '#egg .egg-veil button:hover{background:rgba(57,255,106,.14);}',

    '.egg-pad{display:none;gap:8px;touch-action:none;}',
    '#egg .egg-pad button{width:52px;height:44px;border:1px solid rgba(57,255,106,.45);',
    '  border-radius:6px;color:' + C.neon + ';font-size:16px;background:rgba(0,7,4,.75);}',
    '#egg .egg-pad button:active{background:rgba(57,255,106,.2);}',
    '.egg-hint{margin:0;color:' + C.mid + ';font-size:10.5px;letter-spacing:.05em;text-align:center;}',

    '#egg.is-tight .egg-hint,#egg.is-tight .egg-box{display:none;}',
    '#egg.is-tight .egg-game{gap:5px;padding:5px;}',
    '#egg.is-tight .egg-pad button{height:34px;}',
    '.egg-live{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;',
    '  clip:rect(0 0 0 0);white-space:nowrap;border:0;}',

    '@media (max-width:820px){',
    '  .egg-main{flex-direction:column;align-items:center;gap:8px;width:100%;}',
    '  .egg-side{flex-direction:column;align-items:stretch;order:-1;gap:6px;width:100%;',
    '    max-width:min(96vw,420px);}',
    '  .egg-box{flex-direction:row;align-items:center;gap:10px;padding:5px 8px;}',
    '  .egg-stats{flex-direction:row;flex-wrap:wrap;justify-content:space-around;gap:2px 10px;}',
    '  .egg-stats>div{gap:7px;}',
    '  .egg-pad{display:flex;gap:6px;}',
    '  #egg .egg-pad button{width:15vw;max-width:56px;background:rgba(6,32,16,.92);',
    '    border-color:rgba(57,255,106,.6);font-size:18px;line-height:1;}',
    '  .egg-hint{max-width:340px;}}',

    '@keyframes eggFlash{from{opacity:1;transform:scale(.2);}to{opacity:0;transform:scale(1.5);}}',
    '@keyframes eggShake{0%{transform:translate(-7px,4px);}20%{transform:translate(6px,-5px);}',
    '  40%{transform:translate(-4px,3px);}60%{transform:translate(3px,-2px);}',
    '  80%{transform:translate(-2px,1px);}100%{transform:translate(0,0);}}',
    '@keyframes eggPop{from{opacity:0;}to{opacity:1;}}',
    '@keyframes eggCrack{from{stroke-dashoffset:1;}to{stroke-dashoffset:0;}}',
    '@keyframes eggRise{from{opacity:0;transform:translateY(10px) scale(.97);}',
    '  to{opacity:1;transform:none;}}',

    /* Reduced motion: the global !important rule in ide.css already collapses
       every animation above (they all use fill-mode: both, so each element
       snaps to its end keyframe). This belt-and-braces class covers the case
       where that rule is not in play, e.g. the styles fail to load. */
    '#egg.is-still .egg-shake,#egg.is-still .egg-shard,',
    '#egg.is-still .egg-crackline,#egg.is-still .egg-game{animation:none;}',
    '#egg.is-still .egg-crackline{stroke-dasharray:none;}'
  ].join('\n');

  function injectStyle() {
    if (document.getElementById('eggStyle')) return;
    var s = document.createElement('style');
    s.id = 'eggStyle';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ======================================================== helpers */

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* mulberry32 — a seeded PRNG, so the crack web can be regenerated
     identically after a resize instead of re-shattering differently. */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rrect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  function inPoly(px, py, poly) {
    var hit = false, i, j;
    for (i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }

  /* ====================================================== crack web
     A radial fracture from the impact point. Every vertex is shared with its
     neighbours, so shards provably cannot gap. Displacement is baked into the
     coordinates rather than animated — SVG children do not take reliable 3D
     transforms, and a settled web is what makes the extrusion readable. */
  function buildWeb(px, py, w, h, seed) {
    var rnd = mulberry32(seed), i, j, k;

    /* Outer radius past the farthest corner. The union of shards is then a
       disc containing the viewport rect, and the viewBox clips the overhang —
       no corner special-casing needed. */
    var cs = [[0, 0], [w, 0], [0, h], [w, h]], Rout = 0;
    for (i = 0; i < 4; i++) {
      var d0 = Math.sqrt((cs[i][0] - px) * (cs[i][0] - px) + (cs[i][1] - py) * (cs[i][1] - py));
      if (d0 > Rout) Rout = d0;
    }
    Rout *= 1.06;

    /* Spokes. Jitter is capped at ±0.34 of the base step so spokes can never
       cross or reorder. 11 is odd, which avoids accidental symmetry. */
    var b = Math.PI * 2 / SPOKES, th = [];
    for (i = 0; i < SPOKES; i++) th.push(i * b + (rnd() * 2 - 1) * 0.34 * b);
    th.push(th[0] + Math.PI * 2);

    /* Rings, super-linear: tiny shards at the impact, large ones at the rim. */
    var r = [10];
    for (j = 1; j <= RINGS; j++) r.push(Rout * Math.pow(j / RINGS, 1.65));

    var V = [], M = [];
    for (i = 0; i < SPOKES; i++) {
      V[i] = [];
      for (j = 0; j <= RINGS; j++) {
        /* Outer ring jitters outward only, so coverage can never break. */
        var jit = (j === RINGS) ? rnd() * 0.05 : (rnd() * 2 - 1) * 0.10;
        var rad = r[j] * (1 + jit);
        V[i][j] = [px + rad * Math.cos(th[i]), py + rad * Math.sin(th[i])];
      }
    }
    V[SPOKES] = V[0];

    /* One shared mid-arc vertex per spoke gap bows the ring edges. Straight
       edges read as a spiderweb; bowed ones read as glass. */
    for (i = 0; i < SPOKES; i++) {
      M[i] = [];
      var mu = (th[i] + th[i + 1]) / 2;
      for (j = 0; j <= RINGS; j++) {
        var bow = (j === RINGS) ? rnd() * 0.06 : (rnd() * 0.12 - 0.05);
        var rb = r[j] * (1 + bow);
        M[i][j] = [px + rb * Math.cos(mu), py + rb * Math.sin(mu)];
      }
    }

    function pts(poly, ox, oy) {
      var s = '';
      for (var n = 0; n < poly.length; n++) {
        s += (n ? ' ' : '') + (poly[n][0] + ox).toFixed(1) + ',' + (poly[n][1] + oy).toFixed(1);
      }
      return s;
    }

    var out = [];
    out.push('<svg class="egg-web" id="eggWeb" viewBox="0 0 ' + w.toFixed(0) + ' ' + h.toFixed(0) +
             '" preserveAspectRatio="none" aria-hidden="true" focusable="false">');
    out.push('<defs><linearGradient id="eggSheen" x1="0" y1="0" x2="1" y2="1">' +
             '<stop offset="0" stop-color="#39ff6a" stop-opacity=".14"/>' +
             '<stop offset=".55" stop-color="#39ff6a" stop-opacity=".02"/>' +
             '<stop offset="1" stop-color="#b6ffcf" stop-opacity=".10"/></linearGradient></defs>');

    /* Rings outermost-first. Offsets point away from the impact, so an inner
       shard's side band overlaps the outer shard already painted — which reads
       as the inner shards lifted toward the viewer. Reverse this and every
       band gets covered. */
    var nFace = 0;
    for (j = RINGS - 1; j >= 0; j--) {
      for (i = 0; i < SPOKES; i++) {
        var poly = [V[i][j], M[i][j], V[i + 1][j], V[i + 1][j + 1], M[i][j + 1], V[i][j + 1]];
        var cx = 0, cy = 0;
        for (k = 0; k < 6; k++) { cx += poly[k][0]; cy += poly[k][1]; }
        cx /= 6; cy /= 6;
        var dx = cx - px, dy = cy - py, dd = Math.sqrt(dx * dx + dy * dy) || 1;
        var kk = 4 + 14 * (j / RINGS);            /* 4px at the core … 18px at the rim */
        var ox = dx / dd * kk, oy = dy / dd * kk;
        var fo = (0.90 + rnd() * 0.07).toFixed(2);
        var delay = (j * 55 + rnd() * 40).toFixed(0);
        var sheen = rnd() < 0.25
          ? '<polygon class="egg-sheen" fill="url(#eggSheen)" points="' + pts(poly, 0, 0) + '"/>'
          : '';

        out.push('<g class="egg-shard" style="animation-delay:' + delay + 'ms">' +
          '<polygon class="egg-deep" fill="#02120a" points="' + pts(poly, ox, oy) + '"/>' +
          '<polygon class="egg-bevel" fill="#0a3f1d" points="' + pts(poly, ox * 0.45, oy * 0.45) + '"/>' +
          '<polygon class="egg-face" fill="#030f08" fill-opacity="' + fo + '" points="' +
          pts(poly, 0, 0) + '"/>' + sheen + '</g>');
        nFace++;
      }
    }

    /* Cracks: one path per ring band, stroked three times at falling width and
       rising opacity. Stacked strokes fake the bloom with no SVG <filter> — no
       filter-region clipping surprises, no extra offscreen surface. */
    var W3 = [4, 2, 0.9], O3 = [0.18, 0.40, 1], K3 = ['#0f0', C.neon, '#d8ffe6'];
    for (j = 0; j < RINGS; j++) {
      var d = '';
      for (i = 0; i < SPOKES; i++) {
        d += 'M' + V[i][j][0].toFixed(1) + ',' + V[i][j][1].toFixed(1) +
             'L' + V[i][j + 1][0].toFixed(1) + ',' + V[i][j + 1][1].toFixed(1);
      }
      for (i = 0; i < SPOKES; i++) {
        d += 'M' + V[i][j + 1][0].toFixed(1) + ',' + V[i][j + 1][1].toFixed(1) +
             'L' + M[i][j + 1][0].toFixed(1) + ',' + M[i][j + 1][1].toFixed(1) +
             'L' + V[i + 1][j + 1][0].toFixed(1) + ',' + V[i + 1][j + 1][1].toFixed(1);
      }
      for (k = 0; k < 3; k++) {
        /* pathLength="1" lets the dash animation run without getTotalLength(),
           which would force a synchronous layout during mount. */
        out.push('<path class="egg-crackline" pathLength="1" d="' + d + '" stroke="' + K3[k] +
                 '" stroke-width="' + W3[k] + '" stroke-opacity="' + O3[k] +
                 '" style="animation-delay:' + (40 + j * 55) + 'ms"/>');
      }
    }
    out.push('</svg>');

    /* The outer boundary, kept for debug.covers(). */
    var outer = [];
    for (i = 0; i < SPOKES; i++) { outer.push(V[i][RINGS]); outer.push(M[i][RINGS]); }

    return { svg: out.join(''), outer: outer, faces: nFace, w: w, h: h };
  }

  /* ====================================================== sprites
     shadowBlur per cell per frame allocates and blurs a temporary surface per
     draw — at ~200 visible cells that reliably drops below 60fps on mid-range
     mobile. Bake the glow into an atlas once instead; every frame after is a
     plain drawImage. */
  function bakeSprites(cell, dpr) {
    var pad = Math.round(cell * 0.4), tw = cell + pad * 2, i;
    var cv = document.createElement('canvas');
    cv.width = Math.round(tw * 8 * dpr);
    cv.height = Math.round(tw * dpr);
    var g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (i = 1; i <= 7; i++) {
      g.save();
      g.translate((i - 1) * tw + pad, pad);
      g.shadowColor = PC[i];
      g.shadowBlur = cell * 0.55;
      g.fillStyle = PC[i];
      rrect(g, 0, 0, cell - 1, cell - 1, 2);
      g.fill(); g.fill();                       /* twice — a stronger bloom, still one shape */
      g.shadowBlur = 0;
      g.strokeStyle = 'rgba(255,255,255,.30)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(1.5, cell - 2); g.lineTo(1.5, 1.5); g.lineTo(cell - 2, 1.5);
      g.stroke();
      /* The index digit: the Matrix look and a non-colour differentiator at once. */
      g.fillStyle = 'rgba(0,7,4,.26)';
      g.font = 'bold ' + Math.round(cell * 0.42) + 'px ' + MONO;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(i), cell / 2, cell / 2 + 1);
      g.restore();
    }
    g.save();
    g.translate(7 * tw + pad, pad);
    g.strokeStyle = 'rgba(57,255,106,.42)';
    g.lineWidth = 1;
    rrect(g, 0.5, 0.5, cell - 2, cell - 2, 2);
    g.stroke();
    g.restore();

    return { cv: cv, tw: tw, pad: pad, cell: cell, dpr: dpr };
  }

  function blit(g, atlas, tile, x, y) {
    var s = tile * atlas.tw * atlas.dpr;
    g.drawImage(atlas.cv, s, 0, atlas.tw * atlas.dpr, atlas.tw * atlas.dpr,
                x - atlas.pad, y - atlas.pad, atlas.tw, atlas.tw);
  }

  /* ================================================== digital rain */
  function Rain(cv) {
    this.cv = cv;
    this.g = cv.getContext('2d');
    this.drops = [];
    this.w = 0; this.h = 0;
  }
  Rain.prototype.size = function (w, h) {
    /* Capped at DPR 1.5 whatever the device reports: a full-screen canvas at
       DPR 3 on a modern phone is ~3.6 Mpx, real memory and fill-rate cost for
       deliberately blurry glyphs. Only the board gets full DPR. */
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.w = w; this.h = h;
    this.cv.width = Math.max(1, Math.round(w * dpr));
    this.cv.height = Math.max(1, Math.round(h * dpr));
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.g.fillStyle = C.bg;
    this.g.fillRect(0, 0, w, h);
    this.cols = Math.max(1, Math.floor(w / 14));
    this.drops = [];
    for (var i = 0; i < this.cols; i++) this.drops.push(Math.random() * (h / 16));
    this.g.font = '13px ' + MONO;
  };
  Rain.prototype.step = function () {
    var g = this.g, i, ch;
    g.fillStyle = 'rgba(0,7,4,.09)';
    g.fillRect(0, 0, this.w, this.h);
    g.font = '13px ' + MONO;
    for (i = 0; i < this.cols; i++) {
      ch = GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      g.fillStyle = C.hot;
      g.fillText(ch, i * 14, this.drops[i] * 16);
      g.fillStyle = C.neon;
      g.fillText(GLYPHS.charAt((Math.random() * GLYPHS.length) | 0), i * 14, (this.drops[i] - 1) * 16);
      this.drops[i]++;
      if (this.drops[i] * 16 > this.h && Math.random() > 0.975) this.drops[i] = 0;
    }
  };
  Rain.prototype.still = function () {
    /* Reduced motion: one static field, drawn once, never animated. */
    for (var n = 0; n < 26; n++) this.step();
  };

  /* ======================================================== state */

  var open_ = false, root = null, prevFocus = null;
  var webHost, stage, boardCv, bg, nextCv, ng, rainCv, rain, veil, veilMsg, liveEl;
  var elScore, elLines, elLevel, elBest, hintEl;
  var impact = null, seed = 0, web = null, atlas = null, cell = 24, nextHoriz = false;
  var listeners = [], timers = [], raf = 0, resizeRaf = 0;

  var board, cur, bag = [], holdId = 0, holdUsed = false;
  var score = 0, lines = 0, level = 1, combo = -1, best = 0, locked = 0;
  var mode = 'ready', paused = false, dirty = true, started = false;
  var acc = 0, lockTimer = LOCK_MS, lockResets = 0, lowestY = -99;
  var clearRows = [], clearT = 0;
  var held = { left: false, right: false, down: false };
  var dasT = 0, arrT = 0, sdT = 0, dir = 0;
  var last = 0, rainTick = 0, ptr = null, lastAnn = 0;

  function on(t, type, fn, opts) {
    t.addEventListener(type, fn, opts);
    listeners.push([t, type, fn, opts]);
  }
  function offAll() {
    for (var i = 0; i < listeners.length; i++) {
      listeners[i][0].removeEventListener(listeners[i][1], listeners[i][2], listeners[i][3]);
    }
    listeners.length = 0;
  }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  /* ======================================================= engine */

  function newBoard() {
    board = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) row.push(0);
      board.push(row);
    }
  }

  function refill() {
    var b = [1, 2, 3, 4, 5, 6, 7], i, j, t;
    for (i = b.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = b[i]; b[i] = b[j]; b[j] = t;
    }
    bag = bag.concat(b);
  }
  function pull() { while (bag.length < 8) refill(); return bag.shift(); }

  function collides(id, rot, x, y) {
    var mask = PIECES[id].c[rot];
    for (var i = 0; i < 16; i++) {
      if (!(mask & (0x8000 >> i))) continue;
      var r = y + (i >> 2), c = x + (i & 3);
      if (c < 0 || c >= COLS || r >= ROWS) return true;
      if (r >= 0 && board[r][c]) return true;
    }
    return false;
  }

  function newPiece(id) {
    cur = { id: id, rot: 0, x: 3, y: 1 };
    lockTimer = LOCK_MS; lockResets = 0; lowestY = cur.y; acc = 0;
    if (collides(id, 0, cur.x, cur.y)) gameOver();
    dirty = true;
  }
  function spawn() { newPiece(pull()); }

  function grounded() { return !cur || collides(cur.id, cur.rot, cur.x, cur.y + 1); }

  function touchLock() {
    if (grounded() && lockResets < LOCK_RESETS) { lockTimer = LOCK_MS; lockResets++; }
  }

  function move(d) {
    if (mode !== 'play' || !cur) return false;
    if (collides(cur.id, cur.rot, cur.x + d, cur.y)) return false;
    cur.x += d; touchLock(); dirty = true;
    return true;
  }

  function tryRotate(d) {
    if (mode !== 'play' || !cur) return false;
    var to = (cur.rot + d + 4) % 4;
    var kind = PIECES[cur.id].k;
    var tbl = kind === 'O' ? KICK_O : (kind === 'I' ? KICK_I : KICK_J)[String(cur.rot) + String(to)];
    for (var i = 0; i < tbl.length; i++) {
      var nx = cur.x + tbl[i][0], ny = cur.y + tbl[i][1];
      if (!collides(cur.id, to, nx, ny)) {
        cur.rot = to; cur.x = nx; cur.y = ny;
        touchLock(); dirty = true;
        return true;
      }
    }
    return false;
  }

  function softStep() {
    if (mode !== 'play' || !cur) return false;
    if (collides(cur.id, cur.rot, cur.x, cur.y + 1)) return false;
    cur.y++;
    if (cur.y > lowestY) { lowestY = cur.y; lockResets = 0; }
    dirty = true;
    return true;
  }

  function stepDown() { softStep(); }

  function hardDrop() {
    if (mode !== 'play' || !cur) return;
    var n = 0;
    while (!collides(cur.id, cur.rot, cur.x, cur.y + 1)) { cur.y++; n++; }
    score += n * 2;
    lockPiece();
  }

  function hold() {
    if (mode !== 'play' || holdUsed || !cur) return;
    var h = holdId;
    holdId = cur.id;
    holdUsed = true;
    if (h) newPiece(h); else spawn();
    dirty = true;
  }

  function gravityMs(lv) {
    var L = Math.min(lv, 20);
    return Math.max(16, Math.pow(0.8 - (L - 1) * 0.007, L - 1) * 1000);
  }

  function lockPiece() {
    if (!cur) return;
    var mask = PIECES[cur.id].c[cur.rot], i, k, top = ROWS;
    for (i = 0; i < 16; i++) {
      if (!(mask & (0x8000 >> i))) continue;
      var r = cur.y + (i >> 2), c = cur.x + (i & 3);
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = cur.id;
      if (r < top) top = r;
    }
    locked++;
    holdUsed = false;

    var full = [];
    for (i = 0; i < ROWS; i++) {
      var ok = true;
      for (k = 0; k < COLS; k++) if (!board[i][k]) { ok = false; break; }
      if (ok) full.push(i);
    }

    if (full.length) {
      var n = full.length;
      /* Clamped: normal play tops out at 4, but an out-of-range index here
         would make score NaN and then persist NaN as the best score. */
      score += [0, 100, 300, 500, 800][Math.min(n, 4)] * level;
      combo++;
      if (combo > 0) score += 50 * combo * level;
      lines += n;
      level = 1 + Math.floor(lines / 10);
      clearRows = full;
      clearT = REDUCE ? 0 : CLEAR_MS;
      mode = 'clear';
      announce(n === 4 ? 'Four lines cleared.' : n + (n === 1 ? ' line cleared.' : ' lines cleared.'), true);
      if (clearT === 0) finishClear();
    } else {
      combo = -1;
      if (top < TOP) { gameOver(); return; }
      spawn();
    }
    stats();
    dirty = true;
  }

  function finishClear() {
    for (var i = 0; i < clearRows.length; i++) {
      board.splice(clearRows[i], 1);
      var row = [];
      for (var c = 0; c < COLS; c++) row.push(0);
      board.unshift(row);
    }
    clearRows = [];
    mode = 'play';
    spawn();
    dirty = true;
  }

  function gameOver() {
    mode = 'over';
    cur = null;
    if (isFinite(score) && score > best) {
      best = score;
      try { localStorage.setItem('glass.best', String(best)); } catch (e) {}
    }
    stats();
    showVeil('GAME OVER', 'Score ' + score + ' · press Enter to play again', true, 'Play again');
    announce('Game over. Score ' + score + '. Press Enter to play again, or Escape to return.', true);
    dirty = true;
  }

  function reset() {
    newBoard();
    bag = []; holdId = 0; holdUsed = false;
    score = 0; lines = 0; level = 1; combo = -1; locked = 0;
    clearRows = []; clearT = 0; acc = 0;
    held.left = held.right = held.down = false;
    paused = false;
    mode = 'play';
    spawn();
    stats();
    hideVeil();
    dirty = true;
  }

  function restart() { reset(); }

  function togglePause() {
    if (mode === 'over' || mode === 'ready') return;
    paused = !paused;
    if (paused) showVeil('PAUSED', 'press P to resume', false, 'Resume');
    else hideVeil();
  }

  /* ======================================================= chrome */

  function stats() {
    if (!elScore) return;
    elScore.textContent = String(score);
    elLines.textContent = String(lines);
    elLevel.textContent = String(level);
    elBest.textContent = String(Math.max(best, score));
  }

  function announce(msg, force) {
    if (!liveEl) return;
    var now = Date.now();
    if (!force && now - lastAnn < 2000) return;
    lastAnn = now;
    liveEl.textContent = msg;
  }

  function showVeil(title, sub, over, btn) {
    if (!veil) return;
    veilMsg.innerHTML = '';
    veilMsg.appendChild(document.createTextNode(title));
    var s = document.createElement('small');
    s.textContent = sub;
    veilMsg.appendChild(s);
    veil.className = 'egg-veil' + (over ? ' is-over' : '');
    veil.querySelector('button').textContent = btn;
    veil.hidden = false;
  }
  function hideVeil() { if (veil) veil.hidden = true; }

  /* ====================================================== drawing */

  function drawBoard() {
    if (!bg) return;
    var w = COLS * cell, h = (ROWS - TOP) * cell, r, c, i;
    bg.setTransform(1, 0, 0, 1, 0, 0);
    bg.clearRect(0, 0, boardCv.width, boardCv.height);
    var dpr = atlas ? atlas.dpr : 1;
    bg.setTransform(dpr, 0, 0, dpr, 0, 0);

    bg.fillStyle = C.bg;
    bg.fillRect(0, 0, w, h);

    /* Grid as one path, one stroke call. */
    bg.strokeStyle = C.grid;
    bg.lineWidth = 1;
    bg.beginPath();
    for (c = 1; c < COLS; c++) { bg.moveTo(c * cell + .5, 0); bg.lineTo(c * cell + .5, h); }
    for (r = 1; r < ROWS - TOP; r++) { bg.moveTo(0, r * cell + .5); bg.lineTo(w, r * cell + .5); }
    bg.stroke();

    /* Ghost. */
    if (cur && mode === 'play' && !paused) {
      var gy = cur.y;
      while (!collides(cur.id, cur.rot, cur.x, gy + 1)) gy++;
      if (gy !== cur.y) {
        eachCell(PIECES[cur.id].c[cur.rot], function (dr, dc) {
          var rr = gy + dr - TOP, cc = cur.x + dc;
          if (rr >= 0) blit(bg, atlas, 7, cc * cell, rr * cell);
        });
      }
    }

    /* Settled cells. */
    for (r = TOP; r < ROWS; r++) {
      for (c = 0; c < COLS; c++) {
        if (board[r][c]) blit(bg, atlas, board[r][c] - 1, c * cell, (r - TOP) * cell);
      }
    }

    /* Active piece, plus a cheap extra bloom on its four tiles only. */
    if (cur) {
      var mask = PIECES[cur.id].c[cur.rot];
      eachCell(mask, function (dr, dc) {
        var rr = cur.y + dr - TOP, cc = cur.x + dc;
        if (rr >= 0) blit(bg, atlas, cur.id - 1, cc * cell, rr * cell);
      });
      bg.save();
      bg.globalCompositeOperation = 'lighter';
      bg.globalAlpha = 0.35;
      eachCell(mask, function (dr, dc) {
        var rr = cur.y + dr - TOP, cc = cur.x + dc;
        if (rr >= 0) blit(bg, atlas, cur.id - 1, cc * cell, rr * cell);
      });
      bg.restore();
    }

    /* Line-clear flash. */
    if (mode === 'clear' && clearRows.length) {
      var a = 1 - (clearT / CLEAR_MS);
      bg.fillStyle = 'rgba(234,255,241,' + (0.25 + a * 0.6).toFixed(2) + ')';
      for (i = 0; i < clearRows.length; i++) {
        var y = (clearRows[i] - TOP) * cell;
        if (y >= 0) bg.fillRect(0, y, w, cell);
      }
    }

    drawNext();
  }

  function drawNext() {
    if (!ng || !nextCv) return;
    var nc = Math.max(6, Math.round(cell * 0.55));
    var dpr = atlas ? atlas.dpr : 1;
    ng.setTransform(1, 0, 0, 1, 0, 0);
    ng.clearRect(0, 0, nextCv.width, nextCv.height);
    ng.setTransform(dpr, 0, 0, dpr, 0, 0);
    ng.fillStyle = 'rgba(0,7,4,.9)';
    ng.fillRect(0, 0, (nextHoriz ? 12 : 4) * nc, (nextHoriz ? 3 : 9) * nc);
    while (bag.length < 8) refill();
    for (var n = 0; n < 3; n++) {
      var id = bag[n];
      var ox = nextHoriz ? n * 4 : 0, oy = nextHoriz ? 0 : n * 3;
      eachCell(PIECES[id].c[0], function (dr, dc) {
        ng.fillStyle = PC[id];
        ng.fillRect((ox + dc) * nc + 1, (oy + dr) * nc + 1, nc - 2, nc - 2);
      });
    }
  }

  /* ======================================================== input */

  function pressDir(which) {
    if (held[which]) return;
    held.left = which === 'left';
    held.right = which === 'right';
    dir = which === 'left' ? -1 : 1;
    move(dir);
    dasT = DAS; arrT = 0;
  }

  function onKey(ev) {
    if (!open_) return;
    ev.stopPropagation();                       /* keeps ide.js's bubble-phase chain out of the way */
    var k = ev.key;
    if (k === 'Escape') { ev.preventDefault(); close(); return; }
    if (k === 'Tab') { ev.preventDefault(); trapTab(ev.shiftKey); return; }
    if (ev.metaKey || ev.altKey) return;        /* leave OS combos alone */
    if (ev.repeat) { ev.preventDefault(); return; }   /* our own DAS drives repeat */

    switch (k) {
      case 'ArrowLeft': ev.preventDefault(); pressDir('left'); break;
      case 'ArrowRight': ev.preventDefault(); pressDir('right'); break;
      case 'ArrowDown': ev.preventDefault(); held.down = true; sdT = 0; break;
      case 'ArrowUp': case 'x': case 'X': ev.preventDefault(); tryRotate(1); break;
      case 'z': case 'Z': case 'Control': ev.preventDefault(); tryRotate(-1); break;
      case ' ': ev.preventDefault(); hardDrop(); break;
      case 'c': case 'C': case 'Shift': ev.preventDefault(); hold(); break;
      case 'p': case 'P': ev.preventDefault(); togglePause(); break;
      case 'Enter':
        ev.preventDefault();
        if (mode === 'over' || mode === 'ready') restart();
        break;
    }
  }

  function onKeyUp(ev) {
    if (!open_) return;
    ev.stopPropagation();
    if (ev.key === 'ArrowLeft') held.left = false;
    else if (ev.key === 'ArrowRight') held.right = false;
    else if (ev.key === 'ArrowDown') held.down = false;
  }

  function clearHeld() { held.left = held.right = held.down = false; }

  function onDown(ev) {
    if (!ev.isPrimary) return;
    if (ev.target && ev.target.closest && ev.target.closest('button')) return;
    ev.preventDefault();
    ptr = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, t0: Date.now(), moved: 0, lx: 0, ly: 0 };
    try { stage.setPointerCapture(ev.pointerId); } catch (e) {}
  }

  function onMove(ev) {
    if (!ptr || ev.pointerId !== ptr.id) return;
    ev.preventDefault();
    var dx = ev.clientX - ptr.x0, dy = ev.clientY - ptr.y0;
    var m = Math.abs(dx) + Math.abs(dy);
    if (m > ptr.moved) ptr.moved = m;
    /* Stepped, continuous dragging. Swipe-per-cell is unplayable past level 6. */
    var cx = (dx / STEP_X) | 0;
    if (cx !== ptr.lx) {
      var n = cx - ptr.lx;
      ptr.lx = cx;
      while (n > 0) { move(1); n--; }
      while (n < 0) { move(-1); n++; }
    }
    if (dy > 0) {
      var cy = (dy / STEP_Y) | 0;
      if (cy !== ptr.ly) { ptr.ly = cy; if (softStep()) score += 1; }
    }
  }

  function onUp(ev) {
    if (!ptr || ev.pointerId !== ptr.id) return;
    var dx = ev.clientX - ptr.x0, dy = ev.clientY - ptr.y0;
    var dt = Math.max(1, Date.now() - ptr.t0);
    if (ptr.moved <= TAP_SLOP && dt <= TAP_MS) tryRotate(1);
    else if (dy > 60 && Math.abs(dy) > 2 * Math.abs(dx) && dy / dt > 1.1) hardDrop();
    else if (dy < -55 && Math.abs(dy) > 2 * Math.abs(dx)) hold();
    try { stage.releasePointerCapture(ptr.id); } catch (e) {}
    ptr = null;
  }

  function padDown(ev) {
    var b = ev.target.closest ? ev.target.closest('[data-egg]') : null;
    if (!b) return;
    ev.preventDefault();
    var a = b.getAttribute('data-egg');
    if (a === 'close') { close(); return; }
    if (a === 'start') { if (mode === 'over' || mode === 'ready') restart(); else togglePause(); return; }
    if (a === 'left') pressDir('left');
    else if (a === 'right') pressDir('right');
    else if (a === 'down') { held.down = true; sdT = 0; }
    else if (a === 'rotcw') tryRotate(1);
    else if (a === 'rotccw') tryRotate(-1);
    else if (a === 'drop') hardDrop();
  }

  function focusables() {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll('button,[tabindex="0"]'))
      .filter(function (el) { return el.offsetWidth > 0 || el.offsetHeight > 0; });
  }
  function trapTab(back) {
    var f = focusables();
    if (!f.length) return;
    var i = f.indexOf(document.activeElement);
    var n = back ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 || i < 0 ? 0 : i + 1);
    f[n].focus();
  }

  /* ========================================================= loop */

  function tick(dt) {
    if (paused || mode === 'over' || mode === 'ready') return;

    if (held.left || held.right) {
      dasT -= dt;
      if (dasT <= 0) {
        arrT -= dt;
        while (arrT <= 0) { move(held.left ? -1 : 1); arrT += ARR; }
      }
    }

    if (mode === 'clear') {
      clearT -= dt;
      dirty = true;
      if (clearT <= 0) finishClear();
      return;
    }

    if (held.down) {
      sdT -= dt;
      while (sdT <= 0) { if (softStep()) score += 1; sdT += SDR; }
    }

    acc += dt;
    var g = gravityMs(level);
    while (acc >= g) { acc -= g; stepDown(); }

    if (grounded()) {
      lockTimer -= dt;
      if (lockTimer <= 0) lockPiece();
    } else {
      lockTimer = LOCK_MS;
    }
  }

  function frame(now) {
    if (!open_) return;
    raf = requestAnimationFrame(frame);
    var dt = now - last;
    last = now;
    if (dt > 250) dt = 250;                     /* a tab-switch must not avalanche */
    if (dt < 0) dt = 0;
    tick(dt);
    if (dirty) { drawBoard(); dirty = false; }
    if (!REDUCE && rain && ((++rainTick & 3) === 0)) rain.step();
  }

  function startLoop() {
    if (raf) return;
    last = (window.performance && performance.now) ? performance.now() : Date.now();
    raf = requestAnimationFrame(frame);
  }
  function stopLoop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  /* ======================================================= layout */

  function isNarrow() { return window.innerWidth <= 820; }

  /* Sets only the CSS box sizes, so the fit loop below can iterate cheaply.
     Backing stores and the sprite atlas are done once, after the size settles. */
  function applyCellSize() {
    boardCv.style.width = (COLS * cell) + 'px';
    boardCv.style.height = ((ROWS - TOP) * cell) + 'px';
    var nc = Math.max(5, Math.round(cell * 0.55));
    nextCv.style.width = (nextHoriz ? 12 : 4) * nc + 'px';
    nextCv.style.height = (nextHoriz ? 3 : 9) * nc + 'px';
    return nc;
  }

  function layout(animate) {
    if (!open_ || !root) return;
    var vv = window.visualViewport;
    var W = Math.round(vv ? vv.width : window.innerWidth);
    var H = Math.round(vv ? vv.height : window.innerHeight);
    if (W < 40 || H < 40) return;               /* orientation-change transient */
    /* 100dvh shifts on iOS as the URL bar collapses; visualViewport is the
       only reliable report of it. */
    root.style.height = H + 'px';

    web = buildWeb(clamp(impact.x, 0, W), clamp(impact.y, 0, H), W, H, seed);
    webHost.innerHTML = web.svg;
    if (!animate) {
      var g = webHost.querySelectorAll('.egg-shard,.egg-crackline');
      for (var i = 0; i < g.length; i++) g[i].style.animation = 'none';
    }

    var narrow = isNarrow();
    nextHoriz = narrow;                         /* the NEXT box lies on its side on a phone */
    /* Decided before the fit loop below, so the loop measures the real chrome:
       on a very short viewport (a phone in landscape) the ornaments go rather
       than the playfield. */
    root.classList.toggle('is-tight', H < 560);

    var c = Math.floor(Math.min((H - (H < 560 ? 62 : 100) - (narrow ? 76 : 0)) / (ROWS - TOP),
                                (W - (narrow ? 28 : 230)) / COLS));
    cell = clamp(c, 8, 34);
    var nc = applyCellSize();

    /* #egg never scrolls, and a phone in landscape can be ~380px tall, so the
       estimate above is not enough on its own. Shrink until the panel really
       fits. Each pass is one reflow and only happens on open and on resize. */
    var gameEl = root.querySelector('.egg-game');
    var guard = 0;
    while (gameEl.scrollHeight > H && cell > 8 && guard++ < 20) {
      cell--;
      nc = applyCellSize();
    }
    var dpr = window.devicePixelRatio || 1;
    boardCv.width = Math.round(COLS * cell * dpr);
    boardCv.height = Math.round((ROWS - TOP) * cell * dpr);
    nextCv.width = Math.round((nextHoriz ? 12 : 4) * nc * dpr);
    nextCv.height = Math.round((nextHoriz ? 3 : 9) * nc * dpr);

    atlas = bakeSprites(cell, dpr);

    var rb = rainCv.getBoundingClientRect();
    rain.size(Math.max(1, Math.round(rb.width)), Math.max(1, Math.round(rb.height)));
    if (REDUCE) rain.still();

    dirty = true;
    drawBoard();
  }

  function resizeSoon() {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () {
      resizeRaf = 0;
      layout(false);
    });
  }

  /* ======================================================= markup */

  function markup() {
    var pad = '', keys = [['left', '◀'], ['rotccw', '↺'], ['down', '▼'], ['rotcw', '↻'],
                          ['right', '▶'], ['drop', '⇓']];
    var labels = { left: 'Move left', rotccw: 'Rotate left', down: 'Soft drop',
                   rotcw: 'Rotate right', right: 'Move right', drop: 'Hard drop' };
    for (var i = 0; i < keys.length; i++) {
      pad += '<button type="button" data-egg="' + keys[i][0] + '" aria-label="' +
             labels[keys[i][0]] + '">' + keys[i][1] + '</button>';
    }
    return '' +
      '<h2 class="egg-live" id="eggTitle">BLOCK RAIN — a hidden game</h2>' +
      '<p class="egg-live" id="eggHelp">A decorative falling-blocks game. Arrow keys to move and ' +
        'rotate, space to drop. Press Escape, or use the Close button, to return to the site.</p>' +
      '<div class="egg-shake">' +
        '<div class="egg-scrim"></div>' +
        '<div class="egg-webhost" id="eggWebHost"></div>' +
        '<canvas class="egg-rain" id="eggRain" aria-hidden="true"></canvas>' +
        (REDUCE ? '' : '<div class="egg-flash" id="eggFlash"></div>') +
      '</div>' +
      '<div class="egg-game">' +
        '<div class="egg-bar">' +
          '<span class="egg-title">BLOCK RAIN</span>' +
          '<button class="egg-x" type="button" data-egg="close">Close (Esc)</button>' +
        '</div>' +
        '<div class="egg-main">' +
          '<div class="egg-stage" id="eggStage" tabindex="0">' +
            '<canvas id="eggBoard" role="img" aria-label="Playfield"></canvas>' +
            '<div class="egg-veil" id="eggVeil" hidden><p id="eggVeilMsg"></p>' +
              '<button type="button" data-egg="start">Start</button></div>' +
          '</div>' +
          '<div class="egg-side">' +
            '<div class="egg-box"><span class="egg-k">NEXT</span>' +
              '<canvas id="eggNext" aria-hidden="true"></canvas></div>' +
            '<dl class="egg-stats">' +
              '<div><dt>SCORE</dt><dd class="egg-v" id="eggScore">0</dd></div>' +
              '<div><dt>LINES</dt><dd id="eggLines">0</dd></div>' +
              '<div><dt>LEVEL</dt><dd id="eggLevel">1</dd></div>' +
              '<div><dt>BEST</dt><dd id="eggBest">0</dd></div>' +
            '</dl>' +
          '</div>' +
        '</div>' +
        '<div class="egg-pad">' + pad + '</div>' +
        '<p class="egg-hint" id="eggHint">← → move · ↑ rotate · space drop · C hold · P pause · Esc exit</p>' +
        '<p class="egg-live" role="status" aria-live="polite" aria-atomic="true" id="eggLive"></p>' +
      '</div>';
  }

  /* ==================================================== lifecycle */

  function isOpen() { return open_; }

  function open(pt) {
    if (open_) return;
    open_ = true;
    prevFocus = document.activeElement;
    injectStyle();

    impact = pt && typeof pt.x === 'number'
      ? { x: pt.x, y: pt.y }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    seed = (Math.random() * 0x7ffffff) | 0;

    try { best = parseInt(localStorage.getItem('glass.best') || '0', 10) || 0; } catch (e) { best = 0; }

    root = document.createElement('div');
    root.id = 'egg';
    root.className = REDUCE ? 'is-still' : '';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'eggTitle');
    root.setAttribute('aria-describedby', 'eggHelp');
    root.innerHTML = markup();
    document.body.appendChild(root);

    webHost = root.querySelector('#eggWebHost');
    stage = root.querySelector('#eggStage');
    boardCv = root.querySelector('#eggBoard');
    bg = boardCv.getContext('2d');
    nextCv = root.querySelector('#eggNext');
    ng = nextCv.getContext('2d');
    rainCv = root.querySelector('#eggRain');
    rain = new Rain(rainCv);
    veil = root.querySelector('#eggVeil');
    veilMsg = root.querySelector('#eggVeilMsg');
    liveEl = root.querySelector('#eggLive');
    elScore = root.querySelector('#eggScore');
    elLines = root.querySelector('#eggLines');
    elLevel = root.querySelector('#eggLevel');
    elBest = root.querySelector('#eggBest');
    hintEl = root.querySelector('#eggHint');

    var fl = root.querySelector('#eggFlash');
    if (fl) { fl.style.left = (impact.x + BLEED) + 'px'; fl.style.top = (impact.y + BLEED) + 'px'; }

    /* The workbench must be both inert and hidden from AT while the modal is
       up — and close() must undo both, or the site is unusable afterwards. */
    var vsc = document.getElementById('vsc');
    if (vsc) { vsc.setAttribute('aria-hidden', 'true'); vsc.setAttribute('inert', ''); }

    newBoard();
    layout(true);
    reset();

    on(document, 'keydown', onKey, true);
    on(document, 'keyup', onKeyUp, true);
    on(window, 'blur', clearHeld);
    on(document, 'visibilitychange', onVisibility);
    on(stage, 'pointerdown', onDown);
    on(stage, 'pointermove', onMove);
    on(stage, 'pointerup', onUp);
    on(stage, 'pointercancel', onUp);
    on(root, 'pointerdown', padDown);
    on(document, 'pointerup', clearHeld);
    if (window.visualViewport) on(window.visualViewport, 'resize', resizeSoon);
    on(window, 'resize', resizeSoon);
    on(window, 'orientationchange', resizeSoon);

    requestAnimationFrame(function () { if (root) root.classList.add('is-on'); });

    if (REDUCE) {
      /* Nothing moves until the visitor opts in. */
      mode = 'ready';
      showVeil('BLOCK RAIN', 'reduced motion is on — press Start when ready', false, 'Start');
      started = true;
      stage.focus();
      startLoop();
    } else {
      started = false;
      later(function () {
        started = true;
        if (!open_) return;
        stage.focus();
        startLoop();
      }, 640);
    }
    announce('Screen broken. Block Rain started.', true);
  }

  function onVisibility() {
    if (document.hidden) {
      clearHeld();
      stopLoop();
      if (mode === 'play' && !paused) togglePause();
    } else if (open_ && started) {
      last = (window.performance && performance.now) ? performance.now() : Date.now();
      startLoop();
    }
  }

  function close() {
    if (!open_) return;
    open_ = false;
    stopLoop();
    if (resizeRaf) { cancelAnimationFrame(resizeRaf); resizeRaf = 0; }
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers.length = 0;
    offAll();
    if (root && root.parentNode) root.parentNode.removeChild(root);

    var vsc = document.getElementById('vsc');
    if (vsc) { vsc.removeAttribute('aria-hidden'); vsc.removeAttribute('inert'); }

    root = webHost = stage = boardCv = nextCv = rainCv = veil = veilMsg = null;
    bg = ng = rain = atlas = web = liveEl = null;
    elScore = elLines = elLevel = elBest = hintEl = null;
    cur = null; board = null; ptr = null;
    clearHeld();
    started = false;

    /* body is not focusable, so restoring to it would strand keyboard users at
       the top of the tab order. #main carries tabindex="-1" for exactly this. */
    if (prevFocus && prevFocus !== document.body &&
        document.contains(prevFocus) && prevFocus.focus) {
      prevFocus.focus();
    } else {
      var m = document.getElementById('main');
      if (m) m.focus();
    }
    prevFocus = null;
  }

  /* ======================================================== debug
     Exposed so the smoke test can assert on engine state instead of pixels —
     Chrome's --virtual-time-budget makes animation timing meaningless there. */
  var DBG = {
    state: function () {
      return {
        id: cur ? cur.id : 0, x: cur ? cur.x : -1, y: cur ? cur.y : -1, rot: cur ? cur.rot : -1,
        score: score, lines: lines, level: level, locked: locked, mode: mode, cell: cell
      };
    },
    place: function (name, x, y, rot) {
      for (var i = 1; i <= 7; i++) {
        if (PIECES[i].n === name) {
          cur = { id: i, rot: rot || 0, x: x, y: y };
          lockTimer = LOCK_MS; lockResets = 0; lowestY = y;
          mode = 'play'; paused = false; dirty = true;
          return true;
        }
      }
      return false;
    },
    fillRow: function (r) {
      for (var c = 0; c < COLS; c++) board[r][c] = 1;
      dirty = true;
    },
    step: function () { lockPiece(); },
    covers: function () {
      if (!web) return false;
      var w = web.w, h = web.h, cs = [[1, 1], [w - 1, 1], [1, h - 1], [w - 1, h - 1]];
      for (var i = 0; i < 4; i++) if (!inPoly(cs[i][0], cs[i][1], web.outer)) return false;
      return true;
    },
    faces: function () { return web ? web.faces : 0; }
  };

  window.__GLASS = { open: open, close: close, isOpen: isOpen, debug: DBG };
})();
