/* Diwali Wishes — router, scenes, particle engine, creator page */
(() => {
'use strict';

/* ------------------------------------------------------------------ config */
// If you own a domain with wildcard DNS (e.g. diwali.example), set it here and
// https://aarav.diwali.example will greet "Aarav" (template from the path: /doors).
const BASE_DOMAIN = '';

const TEMPLATES = {
  deepawali: { name: 'Shubh Deepawali', blurb: 'Marigold toran, fireworks and three glowing diyas — in Hindi & English.' },
  lantern:   { name: 'Lantern Night',   blurb: 'Crimson sky, rising lanterns, a mandala that draws itself.' },
  doors:     { name: 'Open Doors',      blurb: 'Carved doors swing open, marigolds drop, diyas light the steps.' },
  midnight:  { name: 'Midnight Glow',   blurb: 'A diya ignites, a lotus blooms, gold coins and light-seeds drift.' },
};
const KEYS = Object.keys(TEMPLATES);

/* ----------------------------------------------------------------- helpers */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = s => s.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 30);
const prettify = s => s.replace(/-/g, ' ').replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const rnd = (a, b) => a + Math.random() * (b - a);
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const isDeva = s => /[ऀ-ॿ]/.test(s);
const graphemes = s => (window.Intl && Intl.Segmenter) ? [...new Intl.Segmenter().segment(s)].map(x => x.segment) : [...s];
// Split text into animatable spans. Devanagari is split by word only, so conjuncts and matras stay intact.
const letters = (txt, extra = '') => (isDeva(txt) ? txt.split(/(\s+)/).filter(Boolean) : graphemes(txt)).map((c, i) =>
  `<span class="ch ${extra}" style="--i:${i}">${c.trim() === '' ? '&nbsp;' : esc(c)}</span>`).join('');
const hiLine = name => `आप सभी को <b class="nm">${esc(name)}</b> की तरफ से ढेर सारी शुभकामनाएं`;
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); };
const isTouch = matchMedia('(pointer:coarse)').matches;

/* ------------------------------------------------------------------- sound */
let actx = null, soundOn = false, noiseBuf = null;
const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
function enableSound() {
  soundOn = true;
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch { soundOn = false; }
}
function bell(i = 0, vol = 0.1) {
  if (!soundOn || !actx) return;
  const f = NOTES[i % NOTES.length], t = actx.currentTime;
  [1, 2.76, 5.4].forEach((m, k) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = f * m;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol / (k + 1), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2 / (k + 1));
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 2.4);
  });
}
function boom(vol = 0.22) {
  if (!soundOn || !actx) return;
  if (!noiseBuf) {
    const len = actx.sampleRate * 1.4; noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  }
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = rnd(500, 1100); g.gain.value = vol;
  s.connect(f).connect(g).connect(actx.destination); s.start();
}
let timers = [];
const at = (ms, fn) => timers.push(setTimeout(fn, ms));
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

/* ----------------------------------------------------------- particle engine */
const PALS = [['#ffd36a', '#fff1c1', '#ffb347'], ['#ff6b6b', '#ffd36a', '#ff9a3c'], ['#ff7ad9', '#ffd1f0', '#ffffff'], ['#7ef0c4', '#d6fff0', '#ffd36a'], ['#9ab6ff', '#ffffff', '#ffd36a']];
const FX = {
  c: $('#fx'), ps: [], raf: 0, emit: null, t0: 0, last: 0, click: null,
  init() {
    this.x = this.c.getContext('2d');
    const rs = () => {
      // fewer pixels on phones/tablets keeps the animation smooth
      const d = Math.min(devicePixelRatio || 1, isTouch ? 1.5 : 2);
      this.w = innerWidth; this.h = innerHeight; this.c.width = this.w * d; this.c.height = this.h * d; this.x.setTransform(d, 0, 0, d, 0, 0);
    };
    rs(); addEventListener('resize', rs); addEventListener('orientationchange', () => setTimeout(rs, 300));
    // taps anywhere (except on buttons, links and inputs) trigger the scene's burst; the canvas itself never blocks touches
    addEventListener('pointerdown', e => { if (!this.click || e.target.closest('button,a,input,label,#ctrl,.imgsheet')) return; this.click(e.clientX, e.clientY); });
    document.addEventListener('visibilitychange', () => { this.last = performance.now(); });
  },
  start(emit, click) {
    this.stop(); this.emit = emit; this.click = click; this.t0 = performance.now(); this.last = this.t0;
    const loop = now => { this.raf = requestAnimationFrame(loop); this.step(now); };
    this.raf = requestAnimationFrame(loop);
  },
  stop() { cancelAnimationFrame(this.raf); this.ps = []; this.emit = this.click = null; this.x && this.x.clearRect(0, 0, this.w, this.h); },
  add(p) { if (this.ps.length < (isTouch ? 700 : 1200)) this.ps.push({ x: 0, y: 0, vx: 0, vy: 0, g: 0, age: 0, max: 3, size: 4, rot: 0, vr: 0, type: 'spark', color: '#fff', sway: 0, ...p }); },
  step(now) {
    const dt = Math.min((now - this.last) / 1000, 0.05); this.last = now;
    const t = (now - this.t0) / 1000;
    this.emit && this.emit(dt, t, this);
    const x = this.x; x.clearRect(0, 0, this.w, this.h);
    const pops = [], trail = [];
    this.ps = this.ps.filter(p => p.age < p.max && p.y < this.h + 60 && p.y > -200 && p.x > -100 && p.x < this.w + 100);
    for (const p of this.ps) {
      p.age += dt;
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      p.vy += p.g * dt; p.x += (p.vx + (p.sway ? Math.sin(p.age * 2 + p.rot) * p.sway : 0)) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.type === 'rocket') {
        if (p.vy > -40) { p.age = p.max; pops.push(p); continue; }
        if (Math.random() < .8) trail.push({ type: 'ember', x: p.x, y: p.y, vx: rnd(-20, 20), vy: rnd(10, 40), g: 60, max: rnd(.25, .5), size: 1.2, color: '#ffb347', fade: 1, tr: .03 });
      }
      const k = p.age / p.max;
      let a = p.fade ? 1 - k * k : Math.sin(Math.PI * k) * 1.6;
      if (p.crackle && k > .55) a *= Math.random() < .5 ? 1 : .15;
      x.save(); x.translate(p.x, p.y); x.globalAlpha = Math.max(0, Math.min(1, a));
      this.draw(x, p, k); x.restore();
    }
    trail.forEach(p => this.add(p));
    pops.forEach(r => this.explode(r.x, r.y, r.kind, r.pal));
  },
  draw(x, p, k) {
    const s = p.size;
    switch (p.type) {
      case 'spark': {
        x.rotate(p.rot); const tw = 0.6 + 0.4 * Math.sin(p.age * 9 + p.rot * 3); x.fillStyle = p.color; x.globalCompositeOperation = 'lighter';
        x.beginPath(); x.moveTo(0, -s * tw * 2); x.quadraticCurveTo(0, 0, s * tw * 2, 0); x.quadraticCurveTo(0, 0, 0, s * tw * 2); x.quadraticCurveTo(0, 0, -s * tw * 2, 0); x.quadraticCurveTo(0, 0, 0, -s * tw * 2); x.fill();
        x.beginPath(); x.arc(0, 0, s * 0.35, 0, 7); x.fill(); break;
      }
      case 'ember': case 'rocket': {
        x.globalCompositeOperation = 'lighter'; x.strokeStyle = p.type === 'rocket' ? '#ffe2a0' : p.color; x.lineCap = 'round';
        x.lineWidth = p.type === 'rocket' ? 2.2 : s; const tr = p.tr || .05;
        x.beginPath(); x.moveTo(-p.vx * tr, -p.vy * tr); x.lineTo(0, 0); x.stroke(); break;
      }
      case 'flash': {
        x.globalCompositeOperation = 'lighter'; const r = s * (0.6 + k * .8), g = x.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill(); break;
      }
      case 'petal':
        x.rotate(p.rot); x.fillStyle = p.color; x.beginPath(); x.ellipse(0, 0, s, s * 0.5 * (0.5 + 0.5 * Math.abs(Math.cos(p.age * 2 + p.rot))), 0, 0, 7); x.fill(); break;
      case 'coin': {
        const w = Math.abs(Math.cos(p.rot)) * s + 0.8;
        x.fillStyle = '#f9b92e'; x.strokeStyle = '#c97b12'; x.lineWidth = 1.2;
        x.beginPath(); x.ellipse(0, 0, w, s, 0, 0, 7); x.fill(); x.stroke();
        x.beginPath(); x.ellipse(0, 0, w * 0.6, s * 0.6, 0, 0, 7); x.stroke(); break;
      }
      case 'seed':
        x.rotate(p.rot); x.strokeStyle = p.color; x.fillStyle = p.color; x.lineWidth = 1.2; x.lineCap = 'round';
        x.beginPath(); x.moveTo(0, 0); x.lineTo(0, s); x.moveTo(0, s); x.lineTo(-s * .35, s * 1.35); x.moveTo(0, s); x.lineTo(s * .35, s * 1.35); x.stroke();
        x.beginPath(); x.arc(0, 0, 1.6, 0, 7); x.fill(); break;
    }
  },
  sparks(x, y, n, colors, speed = 160) {
    for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(speed * .2, speed); this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 60, size: rnd(1.5, 4), max: rnd(1, 2.2), color: colors[i % colors.length], rot: rnd(0, 6) }); }
  },
  // Launch a rocket from (x0,y0) that bursts at (tx,ty)
  rocket(x0, y0, tx, ty, kind, pal) {
    const g = 600, h = Math.max(80, y0 - ty), v = Math.sqrt(2 * g * h), T = v / g;
    this.add({ type: 'rocket', x: x0, y: y0, vx: (tx - x0) / T, vy: -v, g, max: T + 1, fade: 1, kind: kind || ['peony', 'ring', 'willow'][(Math.random() * 3) | 0], pal });
  },
  explode(x, y, kind = 'peony', pal) {
    pal = pal || PALS[(Math.random() * PALS.length) | 0];
    const S = Math.min(1.2, Math.max(.55, Math.min(this.w, this.h) / 700)) * rnd(170, 240);
    const willow = kind === 'willow', ring = kind === 'ring', m = isTouch ? .7 : 1;
    this.add({ type: 'flash', x, y, size: S * .55, max: .35, fade: 1, color: willow ? '#ffcf6a' : pal[0] });
    const n = Math.round((ring ? 56 : willow ? 72 : 90) * m);
    for (let i = 0; i < n; i++) {
      const a = ring ? (i / n) * 6.283 : rnd(0, 6.283), v = ring ? S * rnd(.92, 1) : S * Math.cbrt(Math.random());
      this.add({ type: 'ember', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: willow ? 55 : 85, drag: willow ? 1.3 : 1.9, max: willow ? rnd(2.4, 3.2) : rnd(1.2, 1.9), size: rnd(1.3, 2.3), color: willow ? (Math.random() < .7 ? '#ffcf6a' : '#fff1c1') : pal[i % pal.length], fade: 1, tr: willow ? .1 : .05, crackle: Math.random() < .25 });
    }
    if (ring) for (let i = 0; i < 30 * m; i++) { const a = rnd(0, 6.283), v = S * .45 * Math.cbrt(Math.random()); this.add({ type: 'ember', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 80, drag: 2, max: rnd(1, 1.5), size: 1.6, color: pal[1], fade: 1 }); }
    boom();
  },
};
// Continuous sparkler (phuljhadi) at every visible .spk-tip element
function sparkler(fx, dt) {
  document.querySelectorAll('.spk-tip').forEach(el => {
    const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > fx.h) return;
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2, n = Math.round(dt * (isTouch ? 130 : 190) + Math.random());
    for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), v = rnd(50, 230); fx.add({ type: 'ember', x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 170, drag: 1, max: rnd(.12, .5), size: rnd(.8, 1.6), color: Math.random() < .6 ? '#fff6d8' : '#ffd36a', fade: 1, tr: .06 }); }
  });
}
const stars = (fx, dt, rate = 12, col = '#ffe9a8') => { if (Math.random() < dt * rate) fx.add({ x: rnd(0, fx.w), y: rnd(0, fx.h), vy: -rnd(2, 8), size: rnd(.8, 2.2), max: rnd(2, 4), color: col, rot: rnd(0, 6) }); };

/* ------------------------------------------------------- shared art pieces */
// Plum diya with gold rim, as in the reference. fd = delay before the flame lights.
function diya(cls = '', fd = 0) {
  return `<svg class="diya ${cls}" style="--fd:${fd}s" viewBox="0 0 120 130" aria-hidden="true">
    <ellipse cx="60" cy="120" rx="42" ry="5" fill="rgba(0,0,0,.45)"/>
    <circle class="dglow" cx="60" cy="44" r="50" fill="url(#gDiyaGlow)"/>
    <path d="M12 78 H108 C106 102 86 116 60 116 C34 116 14 102 12 78Z" fill="url(#gDiyaBowl)"/>
    <path d="M24 94 Q60 106 96 94" fill="none" stroke="#d9a441" stroke-width="2"/>
    <g fill="#e2b04f"><circle cx="40" cy="90" r="2.4"/><circle cx="60" cy="93" r="2.4"/><circle cx="80" cy="90" r="2.4"/></g>
    <ellipse cx="60" cy="78" rx="48" ry="9.5" fill="#5b1430" stroke="#d9a441" stroke-width="2.4"/>
    <ellipse cx="60" cy="79" rx="38" ry="5.5" fill="#2b0717"/>
    <path d="M60 78 V68" stroke="#241008" stroke-width="2.4" stroke-linecap="round"/>
    <g class="dfl"><g class="dfl2"><path d="M60 70 C45 62 47 44 60 20 C73 44 75 62 60 70Z" fill="url(#gFlame)"/><path d="M60 68 C53 63 54 52 60 38 C66 52 67 63 60 68Z" fill="#ffe7a3"/><ellipse cx="60" cy="62" rx="3.6" ry="5" fill="#fffbe8"/></g></g>
  </svg>`;
}
function marigold(orange) {
  const C = orange ? ['#ff6a13', '#ff8a24', '#ffab3d', '#b8360a'] : ['#ffa21a', '#ffbe3b', '#ffd970', '#c96a07'];
  let s = '';
  const ring = (n, r, rx, ry, col, off) => { for (let i = 0; i < n; i++) s += `<ellipse cx="0" cy="${-r}" rx="${rx}" ry="${ry}" fill="${col}" transform="rotate(${(360 / n) * i + off})"/>`; };
  ring(18, 31, 8, 15, C[0], 0); ring(14, 22, 7.5, 12, C[1], 10); ring(10, 13, 6.5, 9, C[2], 5);
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><g stroke="rgba(140,45,0,.25)" stroke-width=".8">${s}</g><circle r="7.5" fill="${C[3]}"/><circle r="4" fill="${C[2]}"/></svg>`;
}
// Garland of marigolds hanging from a sagging string across the top
function toranHTML(n = 11) {
  let f = '';
  for (let i = 0; i < n; i++) {
    const L = (i + .5) / n, t = (L * 1000 + 20) / 1040, y = (1 - t) ** 2 * 14 + 2 * (1 - t) * t * 106 + t * t * 14;
    f += `<div class="mf${i % 2 ? '' : ' lg'}" style="left:${(L * 100).toFixed(2)}%;top:${y.toFixed(1)}%;--i:${i};--sw:${rnd(2.6, 4).toFixed(2)}s"><div class="mf-in">${i % 4 === 2 ? '<i class="leaf"></i>' : ''}${marigold(i % 3 === 1)}</div></div>`;
  }
  return `<div class="toran" aria-hidden="true"><svg viewBox="0 0 1000 100" preserveAspectRatio="none"><path class="tstr" pathLength="1" d="M-20 14 Q500 106 1020 14"/></svg>${f}</div>`;
}
const divider = () => `<div class="divd" aria-hidden="true"><i></i>${marigold(false)}<svg viewBox="40 14 40 60"><path d="M60 70 C45 62 47 44 60 20 C73 44 75 62 60 70Z" fill="url(#gFlame)"/></svg>${marigold(false)}<i></i></div>`;
function mandala() {
  const cx = 200, cy = 400; let out = '', n = 0;
  const petals = (count, r0, r1, w) => {
    for (let i = 0; i < count; i++) {
      out += `<path class="draw" pathLength="1" style="--i:${n++ % 14}" transform="translate(${cx} ${cy}) rotate(${(360 / count) * i})" d="M0 ${-r0} C ${w} ${-r0 - (r1 - r0) * .3} ${w} ${-r1 + 10} 0 ${-r1} C ${-w} ${-r1 + 10} ${-w} ${-r0 - (r1 - r0) * .3} 0 ${-r0}Z"/>`;
    }
  };
  out += `<circle class="draw" pathLength="1" style="--i:0" cx="${cx}" cy="${cy}" r="132"/><circle class="draw" pathLength="1" style="--i:2" cx="${cx}" cy="${cy}" r="150"/><circle class="dots" cx="${cx}" cy="${cy}" r="141"/>`;
  petals(18, 152, 188, 15); petals(12, 100, 130, 12); petals(9, 60, 86, 10);
  return out;
}
// The big festive block shared by the home hero and the Shubh Deepawali template
function festive(nameHi, nameEn, msg, live) {
  return `
    <p class="badge">✦ दीपावली महोत्सव <span>· FESTIVAL OF LIGHTS</span></p>
    <div class="bigw"><h1 class="big">शुभ दीपावली</h1></div>
    <p class="happy">HAPPY DIWALI</p>
    <div class="hcard" id="wish">
      <p class="hl1">आप सभी को <b class="nm${live ? ' live-hi' : ''}">${esc(nameHi)}</b> की तरफ से</p>
      <p class="hl2">ढेर सारी शुभकामनाएं</p>
      ${divider()}
      <p class="en"><b class="${live ? 'live-en' : ''}">${esc(nameEn)}</b> wishes you a Happy Diwali — may your year sparkle with love, laughter &amp; light.</p>
      ${msg ? `<p class="msg">“${esc(msg)}”</p>` : ''}
    </div>
    <div class="drow">${diya('', 0)}${diya('mid', .45)}${diya('', .9)}<div class="sparkler"><i></i><b class="spk-tip"></b></div></div>`;
}

/* -------------------------------------------------- scene: Shubh Deepawali */
function sceneDeepawali(name, msg) {
  return `<section class="sc t4 fest">
    <svg class="bgm" viewBox="8 208 384 384" aria-hidden="true"><g class="rot">${mandala()}</g></svg>
    ${toranHTML(11)}
    <div class="col">${festive(name, name, msg)}</div>
  </section>`;
}
function runDeepawali() {
  [[1700, 4], [3300, 2], [4700, 0], [5150, 3], [5600, 5]].forEach(([ms, n]) => at(ms, () => bell(n, .09)));
  let next = .25, first = true, sp = false;
  at(5300, () => sp = true);
  FX.start((dt, t, fx) => {
    stars(fx, dt, 14);
    if (t > next) {
      if (first) { first = false; fx.rocket(fx.w / 2, fx.h + 10, fx.w / 2, fx.h * .26, 'peony', PALS[0]); next = 2.3; }
      else { const tx = rnd(.1, .9) * fx.w; fx.rocket(tx + rnd(-60, 60), fx.h + 10, tx, rnd(.08, .38) * fx.h); next = t + rnd(1.1, 2.3) * (isTouch ? 1.3 : 1); }
    }
    if (sp) sparkler(fx, dt);
  }, (x, y) => FX.rocket(x, FX.h + 10, x, y));
}

/* ----------------------------------------------------- scene: Lantern Night */
function lanternsHTML() {
  return Array.from({ length: 8 }, (_, i) => {
    const left = 6 + i * 12.2 + rnd(-3, 3), size = rnd(.8, 1.35), dur = rnd(13, 21), dl = i * 0.7 + rnd(0, 1.2);
    return `<div class="lantern" style="left:${left}%;--sz:${size.toFixed(2)};--dur:${dur.toFixed(1)}s;--dl:${dl.toFixed(1)}s"><div class="lan-in"><i></i></div></div>`;
  }).join('');
}
function sceneLantern(name, msg) {
  return `<section class="sc t1">
    <svg class="t1-art" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path class="draw frame" pathLength="1" style="--i:0" d="M200 70 C215 105 230 140 262 160 C310 190 345 215 345 270 V530 C345 585 310 610 262 640 C230 660 215 695 200 730 C185 695 170 660 138 640 C90 610 55 585 55 530 V270 C55 215 90 190 138 160 C170 140 185 105 200 70Z"/>
      <path class="draw frame f2" pathLength="1" style="--i:3" d="M200 52 C217 92 234 126 268 146 C322 176 364 205 364 270 V530 C364 595 322 624 268 654 C234 674 217 708 200 748 C183 708 166 674 132 654 C78 624 36 595 36 530 V270 C36 205 78 176 132 146 C166 126 183 92 200 52Z"/>
      <g class="rot">${mandala()}</g>
    </svg>
    <div class="lanterns">${lanternsHTML()}</div>
    <div class="t1-text">
      <div class="t1-shubh">शुभ दीपावली</div>
      <div class="t1-name" style="--d:2.1s">${letters(name)}</div>
      <div class="t1-wish">wishes you a</div>
      <div class="t1-happy">Happy</div>
      <div class="t1-diwali">Diwali</div>
      <p class="t1-hi">${hiLine(name)}</p>
      ${msg ? `<p class="t1-msg">${esc(msg)}</p>` : ''}
    </div>
  </section>`;
}
function runLantern() {
  [[2000, 2], [2700, 4], [3300, 6], [3900, 5], [5200, 3]].forEach(([ms, n]) => at(ms, () => bell(n, .11)));
  let burst = false, next = 3.4, side = 0;
  FX.start((dt, t, fx) => {
    if (Math.random() < dt * 22) fx.add({ x: rnd(0, fx.w), y: rnd(0, fx.h), vy: -rnd(4, 18), size: rnd(1.2, 3.4), max: rnd(2, 4), color: Math.random() < .5 ? '#ffe9a8' : '#ffb3c1', rot: rnd(0, 6) });
    if (t > 3.9 && !burst) { burst = true; fx.sparks(fx.w / 2, fx.h * .5, 70, ['#ffe45a', '#ffc23d', '#ffffff'], 330); }
    if (t > next) { const x = (side++ % 2 ? rnd(.72, .9) : rnd(.1, .28)) * fx.w; fx.rocket(x, fx.h + 10, x, rnd(.1, .3) * fx.h, null, Math.random() < .5 ? PALS[0] : PALS[2]); next = t + (t < 5 ? .5 : rnd(2.5, 4)); }
  }, (x, y) => { FX.sparks(x, y, 26, ['#ffe45a', '#ffc23d', '#fff'], 220); bell((Math.random() * 6) | 0, .06); });
}

/* -------------------------------------------------------- scene: Open Doors */
function sample(d, step) {
  const p = $('#measp'); p.setAttribute('d', d); const L = p.getTotalLength(), pts = [];
  for (let l = 0; l <= L; l += step) { const q = p.getPointAtLength(l); pts.push({ x: q.x, y: q.y, k: l / L }); }
  return pts;
}
function garland() {
  const pts = sample('M92 255 V195 C92 152 148 132 176 106 C190 93 196 86 200 80 C204 86 210 93 224 106 C252 132 308 152 308 195 V255', 11);
  return pts.map((p, i) => {
    const dl = (2.5 + Math.abs(p.k - .5) * 2 * 1.3 + (i % 3) * .03).toFixed(2);
    const leaf = i % 3 === 1 ? `<g transform="translate(${p.x.toFixed(1)} ${(p.y + 3).toFixed(1)}) rotate(${i % 2 ? 18 : -18})"><path class="lf" style="--dl:${dl}s" d="M0 0 C5 6 5 13 0 18 C-5 13 -5 6 0 0Z"/></g>` : '';
    return leaf + `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><g class="mg" style="--dl:${dl}s"><circle r="6.6" fill="#f39c12"/><circle r="4.8" fill="#ffc531"/><circle r="2.1" fill="#e8780c"/></g></g>`;
  }).join('');
}
function stepDiyas() {
  const spots = [[64, 371, .9], [336, 371, .9], [48, 393, 1.05], [352, 393, 1.05], [30, 418, 1.2], [370, 418, 1.2]];
  return spots.map(([x, y, s], i) => `<g transform="translate(${x} ${y}) scale(${s})">
    <circle class="dglow" style="--i:${i}" r="26" cy="-9" fill="url(#glow)"/>
    <path d="M-10 0 Q-10 10 0 10 Q10 10 10 0Z" fill="#7d2f17"/><ellipse rx="11" ry="3" fill="#b4572a"/>
    <g class="fl-on" style="--i:${i}"><path class="fl" d="M0 -2 C-6 -8 -2 -14 0 -21 C2 -14 6 -8 0 -2Z" fill="#ffc83d"/><path d="M0 -2 C-2.5 -5 -1 -8 0 -11 C1 -8 2.5 -5 0 -2Z" fill="#fff3b0"/></g></g>`).join('');
}
function rangoli() {
  const rings = [[56, 78, 15, '#f28c28', 9], [40, 60, 13, '#fffaf0', 7.5], [26, 44, 11, '#d6403a', 6], [12, 30, 9, '#ffc531', 5]];
  let n = 0, out = '';
  rings.forEach(([r0, r1, cnt, col, w]) => {
    for (let i = 0; i < cnt; i++) {
      const a = -84 + (168 / (cnt - 1)) * i;
      out += `<g transform="rotate(${a})"><path class="rg" style="--i:${n++}" fill="${col}" stroke="rgba(120,40,20,.25)" stroke-width=".6" d="M0 ${-r0} C ${w} ${-r0 - 5} ${w} ${-r1 + 6} 0 ${-r1} C ${-w} ${-r1 + 6} ${-w} ${-r0 - 5} 0 ${-r0}Z"/></g>`;
    }
  });
  return `<g transform="translate(200 452)">${out}<path d="M-88 0 A88 88 0 0 1 88 0" fill="none" stroke="#f9d27a" stroke-width="2" stroke-dasharray="1 5" stroke-linecap="round" class="rg" style="--i:30"/></g>`;
}
let STATIC = false; // true while building artwork for the downloadable image (doors drawn open, no dark overlay)
function doorSvg(side) {
  const x = side === 'l' ? 95 : 200, hinge = side === 'l' ? 95 : 305, cx = x + 52.5;
  return `<g class="door door-${side}" ${STATIC ? `transform="translate(${hinge} 0) scale(.17 1) translate(${-hinge} 0)"` : `style="transform-origin:${hinge}px 275px"`}>
    <rect x="${x}" y="190" width="105" height="170" fill="#7d1d2c"/>
    <rect x="${x + 8}" y="198" width="89" height="154" rx="2" fill="none" stroke="#a63a47" stroke-width="1.4"/>
    <g fill="none" stroke="#e5b878" stroke-width="1.3" stroke-linecap="round"><path d="M${cx} 214 V250 M${cx} 232 q-8 -4 -9 -12 M${cx} 232 q8 -4 9 -12 M${cx} 244 q-8 -4 -9 -12 M${cx} 244 q8 -4 9 -12"/><path d="M${cx} 288 V328 M${cx} 304 q-8 -4 -9 -12 M${cx} 304 q8 -4 9 -12 M${cx} 318 q-8 -4 -9 -12 M${cx} 318 q8 -4 9 -12"/></g>
    <circle cx="${side === 'l' ? x + 94 : x + 11}" cy="272" r="8" fill="none" stroke="#e5a63b" stroke-width="2.4"/><circle cx="${side === 'l' ? x + 94 : x + 11}" cy="264" r="2.2" fill="#e5a63b"/>
    ${[0, 1, 2, 3, 4].map(i => `<circle cx="${x + (side === 'l' ? 14 : 91)}" cy="${222 + i * 28}" r="1.4" fill="#e5b878"/>`).join('')}
  </g>`;
}
function sceneDoors(name, msg) {
  const OPEN = 'M95 362 V195 C95 155 150 135 178 108 C190 96 196 88 200 82 C204 88 210 96 222 108 C250 135 305 155 305 195 V362Z';
  const rays = Array.from({ length: 14 }, (_, i) => `<path d="M200 330 L${200 + Math.cos(i / 14 * 6.283) * 320} ${330 + Math.sin(i / 14 * 6.283) * 320} L${200 + Math.cos((i + .35) / 14 * 6.283) * 320} ${330 + Math.sin((i + .35) / 14 * 6.283) * 320}Z"/>`).join('');
  return `<section class="sc t2"><div class="col">
    <div class="t2-text">
      <div class="t2-name">${letters(name)}</div>
      <div class="t2-wish">wishes you a</div>
      <div class="t2-happy">${letters('HAPPY', 'h')}</div>
      <div class="t2-diwali">${letters('Diwali', 'd')}</div>
      <p class="t2-hi">${hiLine(name)}</p>
      <p class="t2-tag">${msg ? esc(msg) : 'May every home glow with joy.'}</p>
    </div>
    <svg viewBox="0 0 400 470" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id="room" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9b0"/><stop offset="1" stop-color="#f6b24a"/></linearGradient>
        <radialGradient id="glow"><stop offset="0" stop-color="#ffd36a" stop-opacity=".85"/><stop offset="1" stop-color="#ffd36a" stop-opacity="0"/></radialGradient>
        <linearGradient id="spill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe29a" stop-opacity=".8"/><stop offset="1" stop-color="#ffe29a" stop-opacity="0"/></linearGradient>
        <clipPath id="openclip"><path d="${OPEN}"/></clipPath>
      </defs>
      <g class="arch">
        <path d="M70 362 V190 C70 140 140 120 170 90 C185 75 195 62 200 55 C205 62 215 75 230 90 C260 120 330 140 330 190 V362Z" fill="#f4dcc6" stroke="#e5c4a8" stroke-width="3"/>
        <path d="${OPEN}" fill="url(#room)"/>
        <g opacity=".8"><path d="M140 362 V240 C140 215 175 205 200 175 C225 205 260 215 260 240 V362Z" fill="#ffd689"/><rect x="168" y="332" width="64" height="22" fill="#a9552e"/><ellipse cx="200" cy="332" rx="14" ry="3" fill="#7d3a1c"/><path d="M200 126 V142" stroke="#7d3a1c"/><path d="M193 142 H207 L205 158 H195Z" fill="#7d3a1c"/><circle class="lamp" cx="200" cy="150" r="4" fill="#ffe29a"/></g>
        <g clip-path="url(#openclip)"><g class="rays" fill="#fff6d0">${rays}</g></g>
        ${STATIC ? '' : `<path class="dark" d="${OPEN}" fill="#4a1520"/>`}
      </g>
      ${doorSvg('l')}${doorSvg('r')}
      <g class="garl">${garland()}</g>
      <g class="steps">
        <path d="M70 362 H330 V384 H70Z" fill="#c26b55"/><path d="M52 384 H348 V406 H52Z" fill="#b95f4a"/><path d="M34 406 H366 V430 H34Z" fill="#ad5441"/>
        <path d="M70 362 H330 V366 H70Z M52 384 H348 V388 H52Z M34 406 H366 V410 H34Z" fill="#e8977f" opacity=".7"/>
      </g>
      <path class="spill" d="M95 362 H305 L350 430 H50Z" fill="url(#spill)"/>
      ${stepDiyas()}
      ${rangoli()}
    </svg></div></section>`;
}
function runDoors() {
  [[1500, 0], [2600, 3], [3300, 4], [3550, 5], [3800, 6], [4400, 2], [5100, 5]].forEach(([ms, n]) => at(ms, () => bell(n, .09)));
  let shower = false;
  FX.start((dt, t, fx) => {
    if (t > 4.6 && Math.random() < dt * 5) fx.add({ type: 'petal', x: rnd(0, fx.w), y: -10, vy: rnd(40, 80), sway: rnd(15, 40), size: rnd(5, 9), max: 14, vr: rnd(-2, 2), rot: rnd(0, 6), color: Math.random() < .5 ? '#f39c12' : '#ffc531' });
    if (t > 2 && Math.random() < dt * 6) fx.add({ x: rnd(fx.w * .2, fx.w * .8), y: fx.h * rnd(.5, .95), vy: -rnd(8, 22), size: rnd(1, 2.6), max: rnd(1.5, 3), color: '#ffe29a', rot: rnd(0, 6) });
    // a celebratory shower of petals when the doors finish opening
    if (t > 3.1 && !shower) { shower = true; for (let i = 0; i < 60; i++) fx.add({ type: 'petal', x: fx.w / 2 + rnd(-60, 60), y: fx.h * .55, vx: rnd(-260, 260), vy: rnd(-420, -160), g: 380, drag: .6, size: rnd(5, 9), max: rnd(2.5, 4), vr: rnd(-6, 6), rot: rnd(0, 6), color: ['#f39c12', '#ffc531', '#e8503f', '#fffaf0'][i % 4] }); }
  }, (x, y) => {
    for (let i = 0; i < 18; i++) FX.add({ type: 'petal', x, y, vx: rnd(-120, 120), vy: rnd(-200, -60), g: 220, size: rnd(5, 9), max: rnd(2, 3.5), vr: rnd(-6, 6), rot: rnd(0, 6), color: Math.random() < .5 ? '#f39c12' : '#ffc531' });
    bell((Math.random() * 6) | 0, .05);
  });
}

/* ----------------------------------------------------- scene: Midnight Glow */
function lotus(x, y, s, dl) {
  const cols = ['#d93a3a', '#e8503f', '#f26a4a'];
  const pet = a => `<g transform="rotate(${a})"><path class="lp" style="--i:${Math.abs(a) / 30}" fill="${cols[Math.abs(a) / 30 % 3 | 0]}" d="M0 0 C-17 -14 -15 -40 0 -54 C15 -40 17 -14 0 0Z"/></g>`;
  return `<g transform="translate(${x} ${y}) scale(${s})" style="--dl:${dl}s">
    <path class="stem" pathLength="1" d="M0 120 C-10 90 10 60 0 8" fill="none" stroke="#9a2c45" stroke-width="4" stroke-linecap="round"/>
    <g transform="translate(0 4)">${pet(-72)}${pet(72)}${pet(-42)}${pet(42)}${pet(0)}</g></g>`;
}
function dandelion() {
  let out = '';
  for (let i = 0; i < 18; i++) out += `<g transform="rotate(${(360 / 18) * i})"><g class="spoke" style="--i:${i}"><path d="M0 -10 V-44 M0 -44 l-5 -8 M0 -44 l5 -8" stroke="#f6edc4" stroke-width="1.6" stroke-linecap="round" fill="none"/></g></g>`;
  return out;
}
function sceneMidnight(name, msg) {
  return `<section class="sc t3"><div class="col">
    <div class="t3-text">
      <div class="t3-shubh">शुभ दीपावली</div>
      <div class="t3-name">${letters(name)}</div>
      <div class="t3-wish">wishes you a</div>
      <div class="t3-happy">${letters('Happy Diwali', 'h')}</div>
      <p class="t3-hi">${hiLine(name)}</p>
      ${msg ? `<p class="t3-tag">${esc(msg)}</p>` : ''}
    </div>
    <svg viewBox="0 0 400 450" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <radialGradient id="halo"><stop offset="0" stop-color="#ffe45a" stop-opacity=".95"/><stop offset=".35" stop-color="#f5b73a" stop-opacity=".55"/><stop offset=".7" stop-color="#1f6a73" stop-opacity=".28"/><stop offset="1" stop-color="#1f6a73" stop-opacity="0"/></radialGradient>
        <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e8503f"/><stop offset=".45" stop-color="#ffa63d"/><stop offset="1" stop-color="#fff0a0"/></linearGradient>
        <linearGradient id="bowl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8403a"/><stop offset="1" stop-color="#8f1f2e"/></linearGradient>
      </defs>
      <circle class="halo" cx="200" cy="215" r="170" fill="url(#halo)"/>
      <g class="bowlg"><ellipse cx="200" cy="408" rx="125" ry="9" fill="#000" opacity=".25"/>
        <path d="M95 352 H305 C300 392 258 404 200 404 C142 404 100 392 95 352Z" fill="url(#bowl)"/>
        <ellipse cx="200" cy="352" rx="105" ry="10" fill="#f07a3d"/><ellipse cx="200" cy="353" rx="92" ry="6.5" fill="#7a1c2c"/>
        <path d="M118 372 Q200 392 282 372" fill="none" stroke="#f9b92e" stroke-width="3" stroke-linecap="round"/>
        <g fill="#f9b92e"><circle cx="150" cy="383" r="2.6"/><circle cx="175" cy="390" r="2.6"/><circle cx="200" cy="392" r="2.6"/><circle cx="225" cy="390" r="2.6"/><circle cx="250" cy="383" r="2.6"/></g></g>
      <g class="flame-g"><path class="flame" d="M191 352 C189 300 197 240 200 168 C203 240 211 300 209 352Z" fill="url(#flame)"/><path d="M196 350 C195 320 199 290 200 250 C201 290 205 320 204 350Z" fill="#fff4c0" opacity=".8"/></g>
      <g transform="translate(200 160)" class="dand"><circle class="tip" r="1" fill="none"/>${dandelion()}</g>
      ${lotus(318, 262, 1, 2.5)}${lotus(84, 300, .72, 2.9)}
    </svg></div></section>`;
}
function runMidnight() {
  [[1100, 0], [1900, 3], [2600, 5], [3000, 4], [3600, 6]].forEach(([ms, n]) => at(ms, () => bell(n, .1)));
  let next = 4.5;
  FX.start((dt, t, fx) => {
    if (t > 2.6 && Math.random() < dt * 3.2) fx.add({ type: 'coin', x: rnd(0, fx.w), y: -20, vy: rnd(110, 200), size: rnd(6, 11), max: 12, vr: rnd(3, 7), rot: rnd(0, 6), sway: rnd(0, 12) });
    if (t > 1.2) stars(fx, dt, 14, '#ffd36a');
    if (t > 3.2 && Math.random() < dt * 3) {
      const tip = $('.tip'); if (tip) { const r = tip.getBoundingClientRect(); fx.add({ type: 'seed', x: r.x + rnd(-12, 12), y: r.y + rnd(-12, 12), vx: rnd(-12, 24), vy: -rnd(14, 44), size: rnd(6, 9), max: rnd(4, 7), vr: rnd(-1, 1), rot: rnd(-.6, .6), color: '#f6edc4', sway: 10 }); }
    }
    // soft golden willows high in the sky
    if (t > next) { const x = rnd(.1, .9) * fx.w; fx.rocket(x, fx.h + 10, x, rnd(.06, .2) * fx.h, 'willow'); next = t + rnd(3, 5); }
  }, (x, y) => {
    for (let i = 0; i < 12; i++) FX.add({ type: 'coin', x, y, vx: rnd(-140, 140), vy: rnd(-260, -80), g: 420, size: rnd(6, 10), max: rnd(1.6, 2.6), vr: rnd(4, 9), rot: rnd(0, 6) });
    FX.sparks(x, y, 14, ['#ffd36a', '#fff3b0'], 200); bell((Math.random() * 6) | 0, .05);
  });
}

const SCENES = { deepawali: [sceneDeepawali, runDeepawali], lantern: [sceneLantern, runLantern], doors: [sceneDoors, runDoors], midnight: [sceneMidnight, runMidnight] };

/* ------------------------------------------- greeting image (1080×1350 PNG) */
const IW = 1080, IH = 1350;
const IMG_CSS = `.m path,.m circle{fill:none;stroke:rgba(255,170,90,.22);stroke-width:1.1}.t1-art .rot path,.t1-art .rot circle{fill:none;stroke:rgba(255,215,200,.45);stroke-width:1.1}.frame{fill:none;stroke:rgba(255,185,130,.65);stroke-width:1.6}.f2{stroke:rgba(255,185,130,.3);stroke-width:1}.dots{stroke-dasharray:1 9;stroke-linecap:round;stroke-width:2.4!important}.rays path{opacity:.32}.lf{fill:#3f7d4a}.tstr{fill:none;stroke:#b98a4a;stroke-width:3}.leafc{fill:#3f8a3f}`;
const IMG_FONTS = ['400 60px "Rozha One"', '400 60px "Tiro Devanagari Hindi"', '600 60px "Cormorant Garamond"', 'italic 500 60px "Cormorant Garamond"', '400 60px Yellowtail', '500 60px "Playfair Display"', 'italic 500 60px "Playfair Display"', '400 60px "DM Serif Display"', '300 60px Poppins'];
let sr = Math.random; // seeded per image so the same greeting always gives the same picture
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const place = (svg, x, y, w, h) => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
const firstSvg = html => html.match(/<svg[\s\S]*?<\/svg>/)[0];
function svgToImage(svg, w, h) {
  const defs = $('#gDiyaBowl').parentElement.outerHTML;
  const s = svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `).replace('>', `>${defs}<style>${IMG_CSS}</style>`);
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); });
}
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const gradX = (c, x0, x1, stops) => { const g = c.createLinearGradient(x0, 0, x1, 0); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
const GOLD = ['#c98a2a', '#f3c766', '#fff0c2', '#f3c766', '#c98a2a'];
function fitFont(c, text, font, size, maxW) { let s = size; c.font = font(s); while (c.measureText(text).width > maxW && s > 12) { s -= 2; c.font = font(s); } return s; }
// centred single line, shrunk to fit; fill can be a colour or (x0,x1)=>gradient
function cText(c, text, y, font, size, fill, maxW = IW - 140) {
  fitFont(c, text, font, size, maxW); const w = c.measureText(text).width, x = IW / 2 - w / 2;
  c.textAlign = 'left'; c.fillStyle = typeof fill === 'function' ? fill(x, x + w) : fill; c.fillText(text, x, y);
}
function spaced(c, text, y, font, sp, fill) {
  c.font = font; const ch = [...text], ws = ch.map(t => c.measureText(t).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1);
  let x = IW / 2 - tot / 2; c.textAlign = 'left'; c.fillStyle = fill; ch.forEach((t, i) => { c.fillText(t, x, y); x += ws[i] + sp; });
}
// Word-wrapped, centred text made of differently styled pieces. Returns the y after the last line.
function rich(c, segs, y, maxW, lh, dry) {
  const toks = []; segs.forEach(s => s.t.split(/( +)/).filter(Boolean).forEach(w => toks.push({ ...s, t: w })));
  const lines = [[]]; let w = 0;
  toks.forEach(tk => {
    c.font = tk.font; const tw = c.measureText(tk.t).width, line = lines[lines.length - 1];
    if (!tk.t.trim() && !line.length) return;
    if (w + tw > maxW && line.length && tk.t.trim()) { lines.push([]); w = 0; }
    lines[lines.length - 1].push({ ...tk, w: tw }); w += tw;
  });
  if (!dry) lines.forEach((ln, i) => {
    while (ln.length && !ln[ln.length - 1].t.trim()) ln.pop();
    const tot = ln.reduce((a, b) => a + b.w, 0); let x = IW / 2 - tot / 2; c.textAlign = 'left';
    ln.forEach(tk => { c.font = tk.font; c.fillStyle = typeof tk.fill === 'function' ? tk.fill(x, x + tk.w) : tk.fill; c.fillText(tk.t, x, y + i * lh); x += tk.w; });
  });
  return y + lines.length * lh;
}
function burst(c, x, y, r, cols) {
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * 6.283 + sr() * .06, r1 = r * (.2 + sr() * .25), r2 = r * (.72 + sr() * .32), col = cols[i % cols.length], droop = r2 * .1;
    const x1 = x + Math.cos(a) * r1, y1 = y + Math.sin(a) * r1, x2 = x + Math.cos(a) * r2, y2 = y + Math.sin(a) * r2 + droop;
    const g = c.createLinearGradient(x1, y1, x2, y2); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, col);
    c.strokeStyle = g; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 - droop * .3, x2, y2); c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(x2, y2, 2.8, 0, 7); c.fill();
  }
  const g = c.createRadialGradient(x, y, 0, x, y, r * .5); g.addColorStop(0, 'rgba(255,240,200,.35)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * .5, 0, 7); c.fill();
  c.restore();
}
function sparkle(c, x, y) {
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, 70); g.addColorStop(0, 'rgba(255,250,230,1)'); g.addColorStop(.15, 'rgba(255,226,150,.8)'); g.addColorStop(1, 'rgba(255,180,60,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 70, 0, 7); c.fill();
  c.lineCap = 'round';
  for (let i = 0; i < 70; i++) { const a = sr() * 6.283, r1 = 8 + sr() * 20, r2 = r1 + 15 + sr() * 70; c.strokeStyle = sr() < .6 ? '#fff6d8' : '#ffd36a'; c.globalAlpha = .4 + sr() * .6; c.lineWidth = 1 + sr() * 1.6; c.beginPath(); c.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); c.stroke(); }
  c.restore();
}
function dots(c, n, col, maxR = 2.2) { for (let i = 0; i < n; i++) { c.globalAlpha = .2 + sr() * .7; c.fillStyle = col; c.beginPath(); c.arc(sr() * IW, sr() * IH, .4 + sr() * maxR, 0, 7); c.fill(); } c.globalAlpha = 1; }
function bgRadial(c, cx, cy, stops) { const g = c.createRadialGradient(cx, cy, 30, cx, cy, 950); stops.forEach(([o, s]) => g.addColorStop(o, s)); c.fillStyle = g; c.fillRect(0, 0, IW, IH); }
function footer(c, col) { c.font = '300 24px Poppins'; c.fillStyle = col; c.textAlign = 'center'; c.fillText(`Make yours ✦ ${location.host}`, IW / 2, IH - 28); c.textAlign = 'left'; }
const glow = (c, col, blur) => { c.shadowColor = col; c.shadowBlur = blur; };
const noGlow = c => { c.shadowColor = 'transparent'; c.shadowBlur = 0; };

async function imgDeepawali(c, name, msg) {
  bgRadial(c, 540, 470, [[0, '#2e1334'], [.55, '#13081d'], [1, '#0b0614']]);
  dots(c, 150, '#ffe9a8');
  burst(c, 170, 340, 150, ['#ffd36a', '#fff1c1', '#ffb347']); burst(c, 930, 300, 125, ['#ff7ad9', '#ffd1f0', '#ffffff']);
  burst(c, 70, 975, 55, ['#7ef0c4', '#d6fff0', '#ffd36a']);
  // measure the message card first so the diyas can sit below it
  const F = { hi: '400 50px "Tiro Devanagari Hindi"', nm: '400 52px "Rozha One"', en: 'italic 500 31px "Cormorant Garamond"', enB: '600 31px "Cormorant Garamond"', msg: 'italic 500 33px "Cormorant Garamond"' };
  const nameGold = (x0, x1) => gradX(c, x0, x1, ['#e9a93a', '#ffd36a', '#fff2c8', '#ffd36a']);
  const line1 = [{ t: 'आप सभी को ', font: F.hi, fill: '#fff4e2' }, { t: name, font: F.nm, fill: nameGold }, { t: ' की\u00A0तरफ\u00A0से', font: F.hi, fill: '#fff4e2' }];
  const enSeg = [{ t: name, font: F.enB, fill: '#f3c766' }, { t: ' wishes you a Happy Diwali — may your year sparkle with love, laughter & light.', font: F.en, fill: 'rgba(255,236,210,.78)' }];
  const layout = dry => { let y = rich(c, line1, 650, 780, 70, dry); y = rich(c, [{ t: 'ढेर सारी शुभकामनाएं', font: F.hi, fill: '#fff4e2' }], y, 780, 70, dry); const dy = y + 6; y = rich(c, enSeg, y + 62, 760, 42, dry); if (msg) y = rich(c, [{ t: `“${msg}”`, font: F.msg, fill: '#ffd9a0' }], y + 8, 760, 44, dry); return [dy, y]; };
  const [divY, endY] = layout(true), cardB = endY + 6, shift = Math.min(70, Math.max(0, cardB + 25 - 1000));
  let art = `<svg viewBox="0 0 1080 1350"><g class="m" transform="translate(${540 - 200 * 2.4} ${650 - 400 * 2.4}) scale(2.4)">${mandala()}</g><path class="tstr" d="M-20 40 Q540 210 1100 40"/>`;
  for (let i = 0; i < 11; i++) {
    const x = (i + .5) / 11 * 1080, t = (x + 20) / 1120, y = (1 - t) ** 2 * 40 + 2 * (1 - t) * t * 210 + t * t * 40, s = i % 2 ? 66 : 88;
    if (i % 4 === 2) art += `<ellipse class="leafc" cx="${x - 13}" cy="${y - 2}" rx="12" ry="21" transform="rotate(-35 ${x - 13} ${y - 2})"/><ellipse class="leafc" cx="${x + 13}" cy="${y - 2}" rx="12" ry="21" transform="rotate(35 ${x + 13} ${y - 2})"/>`;
    art += place(marigold(i % 3 === 1), x - s / 2, y - s * .18, s, s);
  }
  art += place(diya(), 190, 1062 + shift, 170, 184) + place(diya(), 425, 1000 + shift, 230, 249) + place(diya(), 720, 1062 + shift, 170, 184);
  art += `<path d="M950 ${1250 + shift} L922 ${1118 + shift}" stroke="#5a5a5a" stroke-width="5" stroke-linecap="round"/></svg>`;
  c.drawImage(await svgToImage(art, IW, IH), 0, 0);
  sparkle(c, 921, 1114 + shift);
  // badge
  c.font = '400 25px "Tiro Devanagari Hindi"'; const bt = '✦  दीपावली महोत्सव  ·  FESTIVAL OF LIGHTS', bw = c.measureText(bt).width + 60;
  rrect(c, IW / 2 - bw / 2, 200, bw, 54, 27); c.fillStyle = 'rgba(20,8,20,.6)'; c.fill(); c.strokeStyle = 'rgba(243,199,102,.4)'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = '#f3c766'; c.fillText(bt, IW / 2 - bw / 2 + 30, 236);
  // title
  glow(c, 'rgba(255,160,50,.55)', 50); cText(c, 'शुभ दीपावली', 432, s => `400 ${s}px "Rozha One"`, 168, (a, b) => gradX(c, a, b, GOLD), 900); noGlow(c);
  spaced(c, 'HAPPY DIWALI', 508, '600 40px "Cormorant Garamond"', 18, '#f6dca0');
  // card
  rrect(c, 100, 555, 880, cardB - 555 + 34, 34); c.fillStyle = 'rgba(255,255,255,.06)'; c.fill(); c.strokeStyle = 'rgba(243,199,102,.3)'; c.lineWidth = 2; c.stroke();
  layout(false);
  c.strokeStyle = 'rgba(243,199,102,.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(380, divY + 14); c.lineTo(500, divY + 14); c.moveTo(580, divY + 14); c.lineTo(700, divY + 14); c.stroke();
  c.fillStyle = '#ffbe3b'; [510, 570].forEach(x => { c.beginPath(); c.arc(x, divY + 14, 9, 0, 7); c.fill(); }); c.fillStyle = '#ffd76a'; c.beginPath(); c.ellipse(540, divY + 10, 6, 13, 0, 0, 7); c.fill();
  footer(c, 'rgba(255,230,200,.45)');
}

function drawLantern(c, x, y, s) {
  const w = 62 * s, h = 84 * s; c.save(); c.translate(x, y); c.rotate((sr() - .5) * .2);
  glow(c, 'rgba(255,150,40,.9)', 45 * s);
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#ffcb45'); g.addColorStop(.7, '#ff8a1f'); g.addColorStop(1, '#e8631a');
  c.fillStyle = g; c.beginPath(); c.moveTo(-w * .38, -h / 2); c.quadraticCurveTo(0, -h * .62, w * .38, -h / 2); c.quadraticCurveTo(w * .55, 0, w * .4, h / 2); c.lineTo(-w * .4, h / 2); c.quadraticCurveTo(-w * .55, 0, -w * .38, -h / 2); c.fill();
  noGlow(c); const l = c.createRadialGradient(0, h * .3, 0, 0, h * .3, w * .35); l.addColorStop(0, '#fff6b8'); l.addColorStop(1, 'rgba(255,210,74,0)'); c.fillStyle = l; c.beginPath(); c.arc(0, h * .3, w * .35, 0, 7); c.fill();
  c.restore();
}
async function imgLantern(c, name, msg) {
  bgRadial(c, 540, 620, [[0, '#ee2c55'], [.42, '#cc1a45'], [1, '#7e0a28']]);
  dots(c, 130, '#ffe9a8', 2.6);
  burst(c, 190, 1080, 120, ['#ffe45a', '#ffc23d', '#ffffff']); burst(c, 900, 230, 100, ['#ffe45a', '#ffd1f0', '#ffffff']);
  const k = IH / 800; c.drawImage(await svgToImage(firstSvg(sceneLantern(name, msg)), 400 * k, IH), (IW - 400 * k) / 2, 0);
  [[95, 560, 1.2], [140, 880, .9], [70, 1240, 1.4], [985, 1180, 1.3], [945, 830, 1], [1010, 520, .8], [215, 210, .75], [870, 1290, .7], [60, 120, .7]].forEach(([x, y, s]) => drawLantern(c, x, y, s));
  glow(c, 'rgba(255,200,90,.5)', 20);
  cText(c, 'शुभ दीपावली', 440, s => `400 ${s}px "Rozha One"`, 48, '#ffe27a', 460);
  cText(c, name, 528, s => `400 ${s}px Yellowtail`, 84, '#fff4cf', 470); noGlow(c);
  spaced(c, 'WISHES YOU A', 578, '300 20px Poppins', 9, '#ffe0d0');
  cText(c, 'Happy', 668, s => `400 ${s}px Yellowtail`, 66, '#ffffff');
  glow(c, 'rgba(255,210,90,.6)', 30); cText(c, 'Diwali', 848, s => `400 ${s}px Yellowtail`, 205, (a, b) => gradX(c, a, b, ['#ffe95c', '#ffc23d', '#fff6c8', '#ffc23d', '#ff9f4a']), 520); noGlow(c);
  let y = rich(c, [{ t: 'आप सभी को ', font: '400 31px "Tiro Devanagari Hindi"', fill: '#ffeadf' }, { t: name, font: '400 33px "Rozha One"', fill: '#ffe45a' }, { t: ' की\u00A0तरफ\u00A0से ढेर\u00A0सारी\u00A0शुभकामनाएं', font: '400 31px "Tiro Devanagari Hindi"', fill: '#ffeadf' }], 918, 440, 48);
  if (msg) rich(c, [{ t: msg, font: 'italic 500 26px "Playfair Display"', fill: '#ffe9dc' }], y + 10, 420, 38);
  footer(c, 'rgba(255,230,220,.6)');
}

async function imgDoors(c, name, msg) {
  const g = c.createLinearGradient(0, 0, 0, IH); g.addColorStop(0, '#e6a08f'); g.addColorStop(.55, '#d27a6a'); g.addColorStop(1, '#b8594c'); c.fillStyle = g; c.fillRect(0, 0, IW, IH);
  for (let i = 0; i < 46; i++) { c.save(); c.translate(sr() * IW, sr() * IH); c.rotate(sr() * 6.3); c.globalAlpha = .55 + sr() * .4; c.fillStyle = ['#f39c12', '#ffc531', '#e8503f', '#fffaf0'][i % 4]; c.beginPath(); c.ellipse(0, 0, 9 + sr() * 6, 5 + sr() * 3, 0, 0, 7); c.fill(); c.restore(); }
  const ink = '#5a0f22';
  cText(c, name, 118, s => `500 ${s}px "Playfair Display"`, 56, ink);
  cText(c, 'wishes you a', 168, s => `italic 500 ${s}px "Playfair Display"`, 30, ink);
  spaced(c, 'HAPPY', 232, '500 32px "Playfair Display"', 20, ink);
  cText(c, 'Diwali', 400, s => `500 ${s}px "Playfair Display"`, 180, ink);
  let y = rich(c, [{ t: 'आप सभी को ', font: '400 33px "Tiro Devanagari Hindi"', fill: ink }, { t: name, font: '400 35px "Rozha One"', fill: '#7d1d2c' }, { t: ' की\u00A0तरफ\u00A0से ढेर\u00A0सारी\u00A0शुभकामनाएं', font: '400 33px "Tiro Devanagari Hindi"', fill: ink }], 466, 900, 48);
  y = rich(c, [{ t: msg || 'May every home glow with joy.', font: 'italic 500 30px "Playfair Display"', fill: ink }], y + 4, 880, 40);
  STATIC = true; const svg = firstSvg(sceneDoors(name, msg)); STATIC = false;
  const top = y + 10, h = IH - 60 - top, w = h * 400 / 470;
  c.drawImage(await svgToImage(svg, w, h), (IW - w) / 2, top);
  footer(c, 'rgba(90,15,34,.6)');
}

async function imgMidnight(c, name, msg) {
  bgRadial(c, 540, 880, [[0, '#2f2260'], [.55, '#1c1340'], [1, '#100a28']]);
  dots(c, 160, '#ffd36a', 2);
  for (let i = 0; i < 26; i++) { const x = sr() * IW, y = sr() * IH, s = 9 + sr() * 9, w = Math.abs(Math.cos(sr() * 6.3)) * s + 1; c.fillStyle = '#f9b92e'; c.strokeStyle = '#c97b12'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(x, y, w, s, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(x, y, w * .6, s * .6, 0, 0, 7); c.stroke(); }
  burst(c, 160, 230, 100, ['#ffcf6a', '#fff1c1']); burst(c, 930, 330, 85, ['#ffcf6a', '#fff1c1']);
  cText(c, 'शुभ दीपावली', 112, s => `400 ${s}px "Rozha One"`, 46, '#ffd36a');
  glow(c, 'rgba(255,140,60,.6)', 26); cText(c, name, 212, s => `400 ${s}px Yellowtail`, 96, '#ff9a4a'); noGlow(c);
  spaced(c, 'WISHES YOU A', 266, '300 22px Poppins', 10, '#cfc6ff');
  cText(c, 'Happy Diwali', 398, s => `400 ${s}px "DM Serif Display"`, 132, '#fdecc8');
  let y = rich(c, [{ t: 'आप सभी को ', font: '400 33px "Tiro Devanagari Hindi"', fill: '#e6dcff' }, { t: name, font: '400 35px "Rozha One"', fill: '#ff9a4a' }, { t: ' की\u00A0तरफ\u00A0से ढेर\u00A0सारी\u00A0शुभकामनाएं', font: '400 33px "Tiro Devanagari Hindi"', fill: '#e6dcff' }], 464, 900, 48);
  if (msg) y = rich(c, [{ t: msg, font: 'italic 500 29px "Playfair Display"', fill: '#d9d0ff' }], y + 4, 860, 40);
  const top = y + 10, h = IH - 60 - top, w = h * 400 / 450;
  c.drawImage(await svgToImage(firstSvg(sceneMidnight(name, msg)), w, h), (IW - w) / 2, top);
  footer(c, 'rgba(220,210,255,.5)');
}

const IMG_DRAW = { deepawali: imgDeepawali, lantern: imgLantern, doors: imgDoors, midnight: imgMidnight };
async function makeImage(name, key, msg) {
  await Promise.all(IMG_FONTS.map(f => document.fonts.load(f, 'शुभ दीपावली Aa ' + name).catch(() => {})));
  const cv = document.createElement('canvas'); cv.width = IW; cv.height = IH;
  const c = cv.getContext('2d'); c.textBaseline = 'alphabetic';
  sr = seeded(hash(name + key + msg));
  await IMG_DRAW[key](c, name, msg);
  sr = Math.random;
  return new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png'));
}

// Bottom sheet that shows the generated picture with Copy / Download / Share
function imageSheet(name, key, msg) {
  const slug = slugify(name) || 'greeting';
  const el = document.createElement('div'); el.className = 'imgsheet';
  el.innerHTML = `<div class="is-card" role="dialog" aria-modal="true" aria-label="Greeting image">
    <button class="is-x" type="button" aria-label="Close">✕</button>
    <p class="is-t">आपकी शुभकामना तस्वीर <span>Your greeting image · ${esc(TEMPLATES[key].name)}</span></p>
    <div class="is-img"><div class="is-spin"><i></i>तस्वीर बन रही है… <small>Creating your image</small></div><img alt="Diwali greeting image from ${esc(name)}"></div>
    <div class="is-act"><button type="button" data-i="copy" disabled>📋 Copy image</button><button type="button" data-i="save" disabled>⬇ Download</button><button type="button" data-i="share" disabled hidden>⤴ Share</button></div>
    <p class="is-hint">${isTouch ? 'Tip: you can also press and hold the image to save or copy it.' : 'Paste it straight into WhatsApp, Instagram or an email.'}</p></div>`;
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('open'));
  let url = null, file = null;
  const blobP = makeImage(name, key, msg);
  blobP.then(blob => {
    url = URL.createObjectURL(blob); const img = $('img', el); img.onload = () => el.classList.add('ready'); img.src = url;
    file = new File([blob], `diwali-${slug}.png`, { type: 'image/png' });
    el.querySelectorAll('[data-i]').forEach(b => b.disabled = false);
    if (navigator.canShare && navigator.canShare({ files: [file] })) $('[data-i=share]', el).hidden = false;
  }).catch(() => { $('.is-spin', el).textContent = 'Sorry, the image could not be created. Please try again.'; });
  const onKey = e => e.key === 'Escape' && close();
  const close = () => { el.classList.remove('open'); removeEventListener('keydown', onKey); setTimeout(() => { el.remove(); url && URL.revokeObjectURL(url); }, 300); };
  addEventListener('keydown', onKey);
  el.addEventListener('click', async e => {
    if (e.target === el || e.target.closest('.is-x')) return close();
    const b = e.target.closest('[data-i]'); if (!b || b.disabled) return;
    if (b.dataset.i === 'copy') {
      try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobP })]); toast('Image copied! Paste it anywhere 🪔'); }
      catch (err) { console.warn('Image copy failed:', err); toast(isTouch ? 'Press and hold the image to copy it' : 'Copying isn’t supported here — use Download'); }
    }
    if (b.dataset.i === 'save') { const a = document.createElement('a'); a.href = url; a.download = `diwali-${slug}.png`; document.body.appendChild(a); a.click(); a.remove(); }
    if (b.dataset.i === 'share') { try { await navigator.share({ files: [file], text: `🪔 ${name} की तरफ से दीपावली की शुभकामनाएं` }); } catch {} }
  });
}

/* ----------------------------------------------- opening: tap to light diya */
function gate(name, onDone) {
  const root = $('#app');
  root.innerHTML = `<section class="sc gate">
    <div class="g-in">
      <p class="g-kick">शुभ दीपावली</p>
      <div class="g-diya">${diya('', 0)}</div>
      <p class="g-hi"><b>${esc(name)}</b> ने आपके लिए दीपावली का संदेश भेजा है</p>
      <p class="g-en">${esc(name)} has sent you a Diwali greeting</p>
      <button class="g-btn" type="button">🪔 दीया जलाएं <span>· ${isTouch ? 'Tap' : 'Click'} to light the diya</span></button>
    </div></section>`;
  FX.start((dt, t, fx) => { if (Math.random() < dt * 8) fx.add({ type: 'ember', x: rnd(0, fx.w), y: fx.h + 5, vx: rnd(-8, 8), vy: -rnd(20, 60), max: rnd(4, 8), size: rnd(1, 2), color: '#ffb347', fade: 1, tr: .02 }); }, null);
  const g = $('.gate'); let lit = false;
  const light = tapped => {
    if (lit) return; lit = true;
    if (tapped) enableSound();
    g.classList.add('lit'); bell(4, .12); at(350, () => bell(6, .08));
    at(1300, () => {
      const f = document.createElement('div'); f.className = 'flash'; document.body.appendChild(f);
      setTimeout(() => f.remove(), 1800);
      setTimeout(onDone, 350);
    });
  };
  g.addEventListener('click', () => light(true));
  at(6000, () => light(false));
}

/* -------------------------------------------------------------- greeting */
function greet(name, key, msg, embed) {
  document.body.className = 'greet' + (embed ? ' embed' : '');
  document.title = `${name} wishes you a Happy Diwali 🪔 शुभ दीपावली`;
  const root = $('#app'), ctrl = $('#ctrl');
  const play = () => {
    clearTimers(); ctrl.classList.remove('show');
    root.innerHTML = SCENES[key][0](name, msg);
    SCENES[key][1]();
    syncSound();
    if (!embed) at(6800, () => ctrl.classList.add('show'));
  };
  const url = location.href.replace(/[?&]embed=1/, '');
  ctrl.innerHTML = embed ? '' : `
    <button data-a="replay" title="Replay" aria-label="Replay">↻ <span>Replay</span></button>
    <button data-a="sound" title="Toggle sound" aria-label="Toggle sound"><b>🔕</b> <span>Sound</span></button>
    <button data-a="image" title="Greeting image" aria-label="Greeting image">🖼 <span>Image</span></button>
    <button data-a="share" title="Share" aria-label="Share">⤴ <span>Share</span></button>
    <a href="/" class="make">✨ <span>Make your own</span></a>`;
  const syncSound = () => { const b = $('[data-a=sound] b', ctrl); if (b) b.textContent = soundOn ? '🔔' : '🔕'; };
  ctrl.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'replay') play();
    if (b.dataset.a === 'image') imageSheet(name, key, msg);
    if (b.dataset.a === 'sound') { if (soundOn) soundOn = false; else { enableSound(); bell(3, .1); } syncSound(); }
    if (b.dataset.a === 'share') {
      const data = { title: `${name} wishes you a Happy Diwali`, text: `🪔 ${name} ने आपको दीपावली की शुभकामनाएं भेजी हैं`, url };
      try { if (navigator.share) await navigator.share(data); else throw 0; } catch (err) { if (err && err.name === 'AbortError') return; try { await navigator.clipboard.writeText(url); toast('Link copied!'); } catch { prompt('Copy this link', url); } }
    }
  };
  if (embed) play(); else gate(name, play);
}

/* ------------------------------------------------------------- creator page */
function home() {
  document.body.className = 'home'; document.title = 'शुभ दीपावली — Diwali Wishes';
  clearTimers(); $('#ctrl').innerHTML = '';
  const tcards = KEYS.map((k, i) => `
    <label class="tcard${i === 0 ? ' sel' : ''}"><input type="radio" name="tpl" value="${k}" ${i === 0 ? 'checked' : ''}>
      <span class="thumb th-${k}"></span><b>${TEMPLATES[k].name}</b><small>${TEMPLATES[k].blurb}</small></label>`).join('');
  $('#app').innerHTML = `
  <nav class="nav"><a class="logo" href="/">${diya('', 0)}<span>शुभ <em>दीपावली</em></span></a>
    <div><a href="#wish">शुभकामनाएं</a><a href="#create">अपना लिंक</a></div></nav>
  <section class="hero fest">
    <svg class="bgm" viewBox="8 208 384 384" aria-hidden="true"><g class="rot">${mandala()}</g></svg>
    ${toranHTML(11)}
    <div class="col">${festive('आपके अपने', 'Your Name', '', true)}
      <a class="cta" href="#create">✦ अपने नाम का बनाएं</a></div>
  </section>
  <section class="create" id="create">
    <h2 class="rv">अपना लिंक बनाएं <small>Create your own greeting link</small></h2>
    <div class="creator">
      <form class="card rv" id="f" autocomplete="off">
        <label class="fld"><span>आपका नाम · Your name</span><input id="nm" maxlength="30" placeholder="e.g. Madhup or मधुप" autocapitalize="words" enterkeyhint="done" required></label>
        <fieldset class="tpls"><legend>Choose a style</legend>${tcards}</fieldset>
        <label class="fld"><span>Personal message <em>(optional)</em></span><input id="ms" maxlength="90" placeholder="May this Diwali bring you light and joy" enterkeyhint="done"></label>
        <div class="linkbox"><span id="lk"></span><button type="button" id="cp">Copy</button></div>
        <div class="actions"><a class="btn pri" id="go" target="_blank" rel="noopener">▶ Open greeting</a><a class="btn wa" id="wa" target="_blank" rel="noopener">Share on WhatsApp</a>
          <button type="button" class="btn img" id="mk">🖼 Get greeting image <small>Copy · Download · Share</small></button></div>
      </form>
      <aside class="phonewrap rv"><div class="phone"><iframe id="pv" title="Live preview" tabindex="-1"></iframe></div><p>Live preview</p></aside>
    </div>
  </section>
  <footer>दीपावली की हार्दिक शुभकामनाएं · Made with 🪔</footer>`;

  let sp = false; setTimeout(() => sp = true, 4700);
  FX.start((dt, t, fx) => {
    stars(fx, dt, 10);
    if (scrollY < innerHeight * .6 && t > (FX.nf || 1)) { const x = rnd(.1, .9) * fx.w; fx.rocket(x + rnd(-50, 50), fx.h + 10, x, rnd(.08, .35) * fx.h); FX.nf = t + rnd(1.8, 3.2) * (isTouch ? 1.3 : 1); }
    if (sp) sparkler(fx, dt);
  }, null);
  FX.nf = 1;

  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .1 });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  const nm = $('#nm'), ms = $('#ms'), lk = $('#lk'), pv = $('#pv'), phone = $('.phone');
  const state = () => {
    const slug = slugify(nm.value), tpl = $('input[name=tpl]:checked').value, m = ms.value.trim();
    const path = `/${encodeURIComponent(slug || 'your-name')}/${tpl}` + (m ? `?m=${encodeURIComponent(m)}` : '');
    return { slug, path, full: location.origin + path };
  };
  let deb;
  const update = now => {
    const s = state(), pretty = s.slug ? prettify(s.slug) : '';
    lk.textContent = s.full;
    $('.live-hi').textContent = pretty || 'आपके अपने'; $('.live-en').textContent = pretty || 'Your Name';
    document.querySelectorAll('.tcard').forEach(c => c.classList.toggle('sel', c.querySelector('input').checked));
    $('#go').href = s.path; $('#wa').href = 'https://wa.me/?text=' + encodeURIComponent(`🪔 ${pretty || 'Someone'} ने आपको दीपावली की शुभकामनाएं भेजी हैं! ${s.full}`);
    ['#go', '#wa', '#mk'].forEach(id => $(id).classList.toggle('off', !s.slug));
    // the live preview iframe is only shown on wide screens, so phones skip loading it
    if (getComputedStyle($('.phonewrap')).display !== 'none') { clearTimeout(deb); deb = setTimeout(() => { pv.src = s.path + (s.path.includes('?') ? '&' : '?') + 'embed=1'; }, now ? 0 : 700); }
  };
  $('#f').addEventListener('input', () => update(false));
  $('#f').addEventListener('change', () => update(false));
  $('#f').addEventListener('submit', e => { e.preventDefault(); document.activeElement && document.activeElement.blur(); });
  $('.actions').addEventListener('click', e => {
    if (e.target.closest('.off')) { e.preventDefault(); nm.focus(); toast('Enter your name first'); return; }
    if (e.target.closest('#mk')) imageSheet(prettify(state().slug), $('input[name=tpl]:checked').value, ms.value.trim().slice(0, 90));
  });
  $('#cp').onclick = async () => { if (!state().slug) { nm.focus(); return toast('Enter your name first'); } try { await navigator.clipboard.writeText(state().full); toast('Link copied!'); } catch { prompt('Copy this link', state().full); } };
  const fit = () => { const w = phone.parentElement.clientWidth; phone.style.setProperty('--k', Math.min(.8, w / 390)); update(true); };
  addEventListener('resize', fit); fit();
}

/* ------------------------------------------------------------------ router */
function route() {
  const q = new URLSearchParams(location.search);
  const parts = location.pathname.split('/').filter(Boolean).map(p => { try { return decodeURIComponent(p); } catch { return p; } });
  let name = '', tpl = null; const host = location.hostname;
  if (BASE_DOMAIN && host.endsWith('.' + BASE_DOMAIN) && host !== 'www.' + BASE_DOMAIN) { name = host.slice(0, -BASE_DOMAIN.length - 1); tpl = parts[0]; }
  else if (parts.length && !['create', 'index.html', '404.html'].includes(parts[0])) { name = parts[0]; tpl = parts[1]; }
  if (!name) return home();
  const pretty = prettify(name.slice(0, 30)) || 'A friend';
  greet(pretty, TEMPLATES[tpl] ? tpl : KEYS[hash(name) % KEYS.length], (q.get('m') || '').slice(0, 90), q.has('embed'));
}

FX.init(); route();
})();
