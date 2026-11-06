/* Diwali Wishes — router, scenes, particle engine, creator page */
(() => {
'use strict';

/* ------------------------------------------------------------------ config */
// If you own a domain with wildcard DNS (e.g. diwali.example), set it here and
// https://aarav.diwali.example will greet "Aarav" (template from the path: /doors).
const BASE_DOMAIN = '';

const TEMPLATES = {
  lantern:  { name: 'Lantern Night',  blurb: 'Crimson sky, rising lanterns, a mandala that draws itself.' },
  doors:    { name: 'Open Doors',     blurb: 'Carved doors swing open, marigolds drop, diyas light the steps.' },
  midnight: { name: 'Midnight Glow',  blurb: 'A diya ignites, a lotus blooms, gold coins and light-seeds drift.' },
};
const KEYS = Object.keys(TEMPLATES);

/* ----------------------------------------------------------------- helpers */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = s => s.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 30);
const prettify = s => s.replace(/-/g, ' ').replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const rnd = (a, b) => a + Math.random() * (b - a);
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const letters = (txt, extra = '') => [...txt].map((c, i) =>
  `<span class="ch ${extra}" style="--i:${i}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); };

/* ------------------------------------------------------------------- sound */
let actx = null, soundOn = false;
const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
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
let timers = [];
const at = (ms, fn) => timers.push(setTimeout(fn, ms));
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

/* ----------------------------------------------------------- particle engine */
const FX = {
  c: $('#fx'), ps: [], raf: 0, emit: null, t0: 0, last: 0, click: null,
  init() {
    this.x = this.c.getContext('2d');
    const rs = () => { const d = Math.min(devicePixelRatio || 1, 2); this.w = innerWidth; this.h = innerHeight; this.c.width = this.w * d; this.c.height = this.h * d; this.x.setTransform(d, 0, 0, d, 0, 0); };
    rs(); addEventListener('resize', rs);
    this.c.addEventListener('pointerdown', e => this.click && this.click(e.clientX, e.clientY));
  },
  start(emit, click) {
    this.stop(); this.emit = emit; this.click = click; this.t0 = performance.now(); this.last = this.t0;
    const loop = now => { this.raf = requestAnimationFrame(loop); this.step(now); };
    this.raf = requestAnimationFrame(loop);
  },
  stop() { cancelAnimationFrame(this.raf); this.ps = []; this.emit = this.click = null; this.x && this.x.clearRect(0, 0, this.w, this.h); },
  add(p) { this.ps.push({ x: 0, y: 0, vx: 0, vy: 0, g: 0, age: 0, max: 3, size: 4, rot: 0, vr: 0, type: 'spark', color: '#fff', sway: 0, ...p }); },
  step(now) {
    const dt = Math.min((now - this.last) / 1000, 0.05); this.last = now;
    const t = (now - this.t0) / 1000;
    this.emit && this.emit(dt, t, this);
    const x = this.x; x.clearRect(0, 0, this.w, this.h);
    this.ps = this.ps.filter(p => p.age < p.max && p.y < this.h + 40 && p.y > -80);
    for (const p of this.ps) {
      p.age += dt; p.vy += p.g * dt; p.x += (p.vx + (p.sway ? Math.sin(p.age * 2 + p.rot) * p.sway : 0)) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const k = p.age / p.max, a = Math.sin(Math.PI * Math.min(1, k * 1.0));
      x.save(); x.translate(p.x, p.y); x.rotate(p.type === 'coin' ? 0 : p.rot); x.globalAlpha = Math.max(0, Math.min(1, a * 1.6));
      this.draw(x, p); x.restore();
    }
  },
  draw(x, p) {
    const s = p.size;
    if (p.type === 'spark') {
      const tw = 0.6 + 0.4 * Math.sin(p.age * 9 + p.rot * 3); x.fillStyle = p.color; x.globalCompositeOperation = 'lighter';
      x.beginPath(); x.moveTo(0, -s * tw * 2); x.quadraticCurveTo(0, 0, s * tw * 2, 0); x.quadraticCurveTo(0, 0, 0, s * tw * 2); x.quadraticCurveTo(0, 0, -s * tw * 2, 0); x.quadraticCurveTo(0, 0, 0, -s * tw * 2); x.fill();
      x.beginPath(); x.arc(0, 0, s * 0.35, 0, 7); x.fill();
    } else if (p.type === 'dot') {
      x.fillStyle = p.color; x.beginPath(); x.arc(0, 0, s, 0, 7); x.fill();
    } else if (p.type === 'petal') {
      x.fillStyle = p.color; x.beginPath(); x.ellipse(0, 0, s, s * 0.5 * (0.5 + 0.5 * Math.abs(Math.cos(p.age * 2 + p.rot))), 0, 0, 7); x.fill();
    } else if (p.type === 'coin') {
      const w = Math.abs(Math.cos(p.rot)) * s + 0.8;
      x.fillStyle = '#f9b92e'; x.strokeStyle = '#c97b12'; x.lineWidth = 1.2;
      x.beginPath(); x.ellipse(0, 0, w, s, 0, 0, 7); x.fill(); x.stroke();
      x.beginPath(); x.ellipse(0, 0, w * 0.6, s * 0.6, 0, 0, 7); x.stroke();
    } else if (p.type === 'seed') {
      x.strokeStyle = p.color; x.fillStyle = p.color; x.lineWidth = 1.2; x.lineCap = 'round';
      x.beginPath(); x.moveTo(0, 0); x.lineTo(0, s); x.moveTo(0, s); x.lineTo(-s * .35, s * 1.35); x.moveTo(0, s); x.lineTo(s * .35, s * 1.35); x.stroke();
      x.beginPath(); x.arc(0, 0, 1.6, 0, 7); x.fill();
    }
  },
  sparks(x, y, n, colors, speed = 160) {
    for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(speed * .2, speed); this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 60, size: rnd(1.5, 4), max: rnd(1, 2.2), color: colors[i % colors.length], rot: rnd(0, 6) }); }
  },
};

/* -------------------------------------------------------------- scene: T1 */
function mandala() {
  const cx = 200, cy = 400; let out = '', n = 0;
  const petals = (count, r0, r1, w) => {
    for (let i = 0; i < count; i++) {
      const a = (360 / count) * i;
      out += `<path class="draw" pathLength="1" style="--i:${n++ % 14}" transform="translate(${cx} ${cy}) rotate(${a})" d="M0 ${-r0} C ${w} ${-r0 - (r1 - r0) * .3} ${w} ${-r1 + 10} 0 ${-r1} C ${-w} ${-r1 + 10} ${-w} ${-r0 - (r1 - r0) * .3} 0 ${-r0}Z"/>`;
    }
  };
  out += `<circle class="draw" pathLength="1" style="--i:0" cx="${cx}" cy="${cy}" r="132"/>`;
  out += `<circle class="draw" pathLength="1" style="--i:2" cx="${cx}" cy="${cy}" r="150"/>`;
  out += `<circle class="dots" cx="${cx}" cy="${cy}" r="141"/>`;
  petals(18, 152, 188, 15); petals(12, 100, 130, 12); petals(9, 60, 86, 10);
  return out;
}
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
      <div class="t1-name" style="--d:2.1s">${letters(name)}</div>
      <div class="t1-wish">wishes you a</div>
      <div class="t1-happy">Happy</div>
      <div class="t1-diwali">Diwali</div>
      ${msg ? `<p class="t1-msg">${esc(msg)}</p>` : ''}
    </div>
  </section>`;
}
function runLantern() {
  [[2000, 2], [2700, 4], [3300, 6], [3900, 5]].forEach(([ms, n]) => at(ms, () => bell(n, .11)));
  let burst = false;
  FX.start((dt, t, fx) => {
    if (Math.random() < dt * 22) fx.add({ x: rnd(0, fx.w), y: rnd(0, fx.h), vy: -rnd(4, 18), size: rnd(1.2, 3.4), max: rnd(2, 4), color: Math.random() < .5 ? '#ffe9a8' : '#ffb3c1', rot: rnd(0, 6) });
    if (t > 3.9 && !burst) { burst = true; fx.sparks(fx.w / 2, fx.h * .5, 70, ['#ffe45a', '#ffc23d', '#ffffff'], 330); }
  }, (x, y) => { FX.sparks(x, y, 26, ['#ffe45a', '#ffc23d', '#fff'], 220); bell((Math.random() * 6) | 0, .06); });
}

/* -------------------------------------------------------------- scene: T2 */
function sample(d, step) {
  const p = $('#measp'); p.setAttribute('d', d); const L = p.getTotalLength(), pts = [];
  for (let l = 0; l <= L; l += step) { const q = p.getPointAtLength(l); pts.push({ x: q.x, y: q.y, k: l / L }); }
  return pts;
}
function garland() {
  const pts = sample('M92 255 V195 C92 152 148 132 176 106 C190 93 196 86 200 80 C204 86 210 93 224 106 C252 132 308 152 308 195 V255', 11);
  return pts.map((p, i) => {
    const dl = (2.5 + Math.abs(p.k - .5) * 2 * 1.3 + (i % 3) * .03).toFixed(2);
    const leaf = i % 3 === 1 ? `<path class="lf" style="--dl:${dl}s" transform="translate(${p.x.toFixed(1)} ${(p.y + 3).toFixed(1)}) rotate(${i % 2 ? 18 : -18})" d="M0 0 C5 6 5 13 0 18 C-5 13 -5 6 0 0Z"/>` : '';
    return leaf + `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><g class="mg" style="--dl:${dl}s"><circle r="6.6" fill="#f39c12"/><circle r="4.8" fill="#ffc531"/><circle r="2.1" fill="#e8780c"/></g></g>`;
  }).join('');
}
function diyas() {
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
function doorSvg(side) {
  const x = side === 'l' ? 95 : 200, hinge = side === 'l' ? 95 : 305, dir = side === 'l' ? 1 : -1;
  const cx = x + 52.5;
  return `<g class="door door-${side}" style="transform-origin:${hinge}px 275px">
    <rect x="${x}" y="190" width="105" height="170" fill="#7d1d2c"/>
    <rect x="${x + 8}" y="198" width="89" height="154" rx="2" fill="none" stroke="#a63a47" stroke-width="1.4"/>
    <g fill="none" stroke="#e5b878" stroke-width="1.3" stroke-linecap="round"><path d="M${cx} 214 V250 M${cx} 232 q-8 -4 -9 -12 M${cx} 232 q8 -4 9 -12 M${cx} 244 q-8 -4 -9 -12 M${cx} 244 q8 -4 9 -12"/><path d="M${cx} 288 V328 M${cx} 304 q-8 -4 -9 -12 M${cx} 304 q8 -4 9 -12 M${cx} 318 q-8 -4 -9 -12 M${cx} 318 q8 -4 9 -12"/></g>
    <circle cx="${side === 'l' ? x + 94 : x + 11}" cy="272" r="8" fill="none" stroke="#e5a63b" stroke-width="2.4"/><circle cx="${side === 'l' ? x + 94 : x + 11}" cy="264" r="2.2" fill="#e5a63b"/>
    ${[0, 1, 2, 3, 4].map(i => `<circle cx="${x + (side === 'l' ? 14 : 91)}" cy="${222 + i * 28}" r="1.4" fill="#e5b878"/>`).join('')}
  </g>`;
}
function sceneDoors(name, msg) {
  return `<section class="sc t2"><div class="col">
    <div class="t2-text">
      <div class="t2-name">${letters(name)}</div>
      <div class="t2-wish">wishes you a</div>
      <div class="t2-happy">${letters('HAPPY', 'h')}</div>
      <div class="t2-diwali">${letters('Diwali', 'd')}</div>
      <p class="t2-tag">${msg ? esc(msg) : 'May every home glow with joy.'}</p>
    </div>
    <svg viewBox="0 0 400 470" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id="room" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9b0"/><stop offset="1" stop-color="#f6b24a"/></linearGradient>
        <radialGradient id="glow"><stop offset="0" stop-color="#ffd36a" stop-opacity=".85"/><stop offset="1" stop-color="#ffd36a" stop-opacity="0"/></radialGradient>
        <linearGradient id="spill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe29a" stop-opacity=".8"/><stop offset="1" stop-color="#ffe29a" stop-opacity="0"/></linearGradient>
      </defs>
      <g class="arch">
        <path d="M70 362 V190 C70 140 140 120 170 90 C185 75 195 62 200 55 C205 62 215 75 230 90 C260 120 330 140 330 190 V362Z" fill="#f4dcc6"/>
        <path d="M70 362 V190 C70 140 140 120 170 90 C185 75 195 62 200 55 C205 62 215 75 230 90 C260 120 330 140 330 190 V362Z" fill="none" stroke="#e5c4a8" stroke-width="3"/>
        <path d="M95 362 V195 C95 155 150 135 178 108 C190 96 196 88 200 82 C204 88 210 96 222 108 C250 135 305 155 305 195 V362Z" fill="url(#room)"/>
        <g opacity=".8"><path d="M140 362 V240 C140 215 175 205 200 175 C225 205 260 215 260 240 V362Z" fill="#ffd689"/><rect x="168" y="332" width="64" height="22" fill="#a9552e"/><ellipse cx="200" cy="332" rx="14" ry="3" fill="#7d3a1c"/><path d="M200 126 V142" stroke="#7d3a1c"/><path d="M193 142 H207 L205 158 H195Z" fill="#7d3a1c"/><circle cx="200" cy="150" r="4" fill="#ffe29a"/></g>
        <path class="dark" d="M95 362 V195 C95 155 150 135 178 108 C190 96 196 88 200 82 C204 88 210 96 222 108 C250 135 305 155 305 195 V362Z" fill="#4a1520"/>
      </g>
      ${doorSvg('l')}${doorSvg('r')}
      <g class="garl">${garland()}</g>
      <g class="steps">
        <path d="M70 362 H330 V384 H70Z" fill="#c26b55"/><path d="M52 384 H348 V406 H52Z" fill="#b95f4a"/><path d="M34 406 H366 V430 H34Z" fill="#ad5441"/>
        <path d="M70 362 H330 V366 H70Z M52 384 H348 V388 H52Z M34 406 H366 V410 H34Z" fill="#e8977f" opacity=".7"/>
      </g>
      <path class="spill" d="M95 362 H305 L350 430 H50Z" fill="url(#spill)"/>
      ${diyas()}
      ${rangoli()}
    </svg></div></section>`;
}
function runDoors() {
  [[1500, 0], [2600, 3], [3300, 4], [3550, 5], [3800, 6], [4400, 2], [5100, 5]].forEach(([ms, n]) => at(ms, () => bell(n, .09)));
  FX.start((dt, t, fx) => {
    if (t > 4.6 && Math.random() < dt * 5) fx.add({ type: 'petal', x: rnd(0, fx.w), y: -10, vy: rnd(40, 80), sway: rnd(15, 40), size: rnd(5, 9), max: 14, vr: rnd(-2, 2), rot: rnd(0, 6), color: Math.random() < .5 ? '#f39c12' : '#ffc531' });
    if (t > 2 && Math.random() < dt * 6) fx.add({ x: rnd(fx.w * .2, fx.w * .8), y: fx.h * rnd(.5, .95), vy: -rnd(8, 22), size: rnd(1, 2.6), max: rnd(1.5, 3), color: '#ffe29a', rot: rnd(0, 6) });
  }, (x, y) => {
    for (let i = 0; i < 18; i++) FX.add({ type: 'petal', x, y, vx: rnd(-120, 120), vy: rnd(-200, -60), g: 220, size: rnd(5, 9), max: rnd(2, 3.5), vr: rnd(-6, 6), rot: rnd(0, 6), color: Math.random() < .5 ? '#f39c12' : '#ffc531' });
    bell((Math.random() * 6) | 0, .05);
  });
}

/* -------------------------------------------------------------- scene: T3 */
function lotus(x, y, s, dl) {
  const cols = ['#d93a3a', '#e8503f', '#f26a4a'];
  const pet = a => `<g transform="rotate(${a})"><path class="lp" style="--i:${Math.abs(a) / 30}" fill="${cols[Math.abs(a) / 30 % 3 | 0]}" d="M0 0 C-17 -14 -15 -40 0 -54 C15 -40 17 -14 0 0Z"/></g>`;
  return `<g transform="translate(${x} ${y}) scale(${s})" style="--dl:${dl}s">
    <path class="stem" pathLength="1" d="M0 120 C-10 90 10 60 0 8" fill="none" stroke="#9a2c45" stroke-width="4" stroke-linecap="round"/>
    <g transform="translate(0 4)">${pet(-72)}${pet(72)}${pet(-42)}${pet(42)}${pet(0)}</g></g>`;
}
function dandelion() {
  let out = '';
  for (let i = 0; i < 18; i++) {
    const a = (360 / 18) * i;
    out += `<g transform="rotate(${a})"><g class="spoke" style="--i:${i}"><path d="M0 -10 V-44" stroke="#f6edc4" stroke-width="1.6" stroke-linecap="round"/><path d="M0 -44 l-5 -8 M0 -44 l5 -8" stroke="#f6edc4" stroke-width="1.6" stroke-linecap="round"/></g></g>`;
  }
  return out;
}
function sceneMidnight(name, msg) {
  return `<section class="sc t3"><div class="col">
    <div class="t3-text">
      <div class="t3-name">${letters(name)}</div>
      <div class="t3-wish">wishes you a</div>
      <div class="t3-happy">${letters('Happy Diwali', 'h')}</div>
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
      <g class="flame-g"><path class="flame" d="M187 352 C184 305 196 245 200 170 C204 245 216 305 213 352Z" fill="url(#flame)"/></g>
      <g transform="translate(200 160)" class="dand"><circle class="tip" r="1" fill="none"/>${dandelion()}</g>
      ${lotus(318, 262, 1, 2.5)}${lotus(84, 300, .72, 2.9)}
    </svg></div></section>`;
}
function runMidnight() {
  [[1100, 0], [1900, 3], [2600, 5], [3000, 4], [3600, 6]].forEach(([ms, n]) => at(ms, () => bell(n, .1)));
  FX.start((dt, t, fx) => {
    if (t > 2.6 && Math.random() < dt * 3.2) fx.add({ type: 'coin', x: rnd(0, fx.w), y: -20, vy: rnd(110, 200), size: rnd(6, 11), max: 12, vr: rnd(3, 7), rot: rnd(0, 6), sway: rnd(0, 12) });
    if (t > 1.2 && Math.random() < dt * 14) fx.add({ x: rnd(0, fx.w), y: rnd(0, fx.h), vy: -rnd(3, 14), size: rnd(1, 2.6), max: rnd(2, 4), color: '#ffd36a', rot: rnd(0, 6) });
    if (t > 3.2 && Math.random() < dt * 3) {
      const tip = $('.tip'); if (tip) { const r = tip.getBoundingClientRect(); fx.add({ type: 'seed', x: r.x + rnd(-12, 12), y: r.y + rnd(-12, 12), vx: rnd(-12, 24), vy: -rnd(14, 44), size: rnd(6, 9), max: rnd(4, 7), vr: rnd(-1, 1), rot: rnd(-.6, .6), color: '#f6edc4', sway: 10 }); }
    }
  }, (x, y) => {
    for (let i = 0; i < 12; i++) FX.add({ type: 'coin', x, y, vx: rnd(-140, 140), vy: rnd(-260, -80), g: 420, size: rnd(6, 10), max: rnd(1.6, 2.6), vr: rnd(4, 9), rot: rnd(0, 6) });
    FX.sparks(x, y, 14, ['#ffd36a', '#fff3b0'], 200); bell((Math.random() * 6) | 0, .05);
  });
}

const SCENES = { lantern: [sceneLantern, runLantern], doors: [sceneDoors, runDoors], midnight: [sceneMidnight, runMidnight] };

/* -------------------------------------------------------------- greeting */
function greet(name, key, msg, embed) {
  document.body.className = 'greet' + (embed ? ' embed' : '');
  document.title = `${name} wishes you a Happy Diwali 🪔`;
  const root = $('#app'), ctrl = $('#ctrl');
  const play = () => {
    clearTimers(); ctrl.classList.remove('show');
    root.innerHTML = SCENES[key][0](name, msg);
    SCENES[key][1]();
    if (!embed) at(6500, () => ctrl.classList.add('show'));
  };
  const url = location.href;
  ctrl.innerHTML = embed ? '' : `
    <button data-a="replay" title="Replay">↻ <span>Replay</span></button>
    <button data-a="sound" title="Toggle sound">${soundOn ? '🔔' : '🔕'} <span>Sound</span></button>
    <button data-a="share" title="Share">⤴ <span>Share</span></button>
    <a href="/" class="make">✨ <span>Make your own</span></a>`;
  ctrl.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'replay') play();
    if (b.dataset.a === 'sound') {
      soundOn = !soundOn; if (soundOn) { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); bell(3, .1); }
      b.firstChild.textContent = soundOn ? '🔔 ' : '🔕 ';
    }
    if (b.dataset.a === 'share') {
      const data = { title: `${name} wishes you a Happy Diwali`, text: `${name} sent you a Diwali greeting 🪔`, url };
      try { if (navigator.share) await navigator.share(data); else throw 0; } catch { try { await navigator.clipboard.writeText(url); toast('Link copied!'); } catch { prompt('Copy this link', url); } }
    }
  };
  play();
}

/* ------------------------------------------------------------- creator page */
function home() {
  document.body.className = 'home'; document.title = 'Diwali Wishes — send your own animated greeting';
  FX.stop(); clearTimers(); $('#ctrl').innerHTML = '';
  const tcards = KEYS.map((k, i) => `
    <label class="tcard"><input type="radio" name="tpl" value="${k}" ${i === 0 ? 'checked' : ''}>
      <span class="thumb th-${k}"></span><b>${TEMPLATES[k].name}</b><small>${TEMPLATES[k].blurb}</small></label>`).join('');
  $('#app').innerHTML = `
  <header class="hero">
    <div class="hdiyas" aria-hidden="true">${'<i></i>'.repeat(5)}</div>
    <p class="kicker">शुभ दीपावली</p>
    <h1>Light up someone's <em>Diwali</em></h1>
    <p class="sub">Pick a style, add your name, and share a link that opens with<br><b>“Your Name wishes you a Happy Diwali”</b> — animated.</p>
  </header>
  <main class="creator">
    <form class="card" id="f" autocomplete="off">
      <label class="fld"><span>Your name</span><input id="nm" maxlength="30" placeholder="e.g. Madhup" required></label>
      <fieldset class="tpls"><legend>Choose a style</legend>${tcards}</fieldset>
      <label class="fld"><span>Personal message <em>(optional)</em></span><input id="ms" maxlength="90" placeholder="May this Diwali bring you light and joy"></label>
      <div class="linkbox"><span id="lk"></span><button type="button" id="cp">Copy</button></div>
      <div class="actions"><a class="btn pri" id="go" target="_blank" rel="noopener">▶ Open greeting</a><a class="btn wa" id="wa" target="_blank" rel="noopener">Share on WhatsApp</a></div>
    </form>
    <aside class="phonewrap"><div class="phone"><iframe id="pv" title="Live preview" tabindex="-1"></iframe></div><p>Live preview</p></aside>
  </main>
  <footer>Made with 🪔 — Happy Diwali</footer>`;

  const nm = $('#nm'), ms = $('#ms'), lk = $('#lk'), pv = $('#pv'), phone = $('.phone');
  const state = () => {
    const slug = slugify(nm.value), tpl = $('input[name=tpl]:checked').value, m = ms.value.trim();
    const path = `/${encodeURIComponent(slug || 'your-name')}/${tpl}` + (m ? `?m=${encodeURIComponent(m)}` : '');
    return { slug, path, full: location.origin + path };
  };
  let deb;
  const update = (now) => {
    const s = state(); lk.textContent = s.full;
    $('#go').href = s.path; $('#wa').href = 'https://wa.me/?text=' + encodeURIComponent(`🪔 ${prettify(s.slug || 'Someone')} wishes you a Happy Diwali! Open: ${s.full}`);
    $('#go').classList.toggle('off', !s.slug); $('#wa').classList.toggle('off', !s.slug);
    clearTimeout(deb); deb = setTimeout(() => { pv.src = s.path + (s.path.includes('?') ? '&' : '?') + 'embed=1'; }, now ? 0 : 700);
  };
  $('#f').addEventListener('input', () => update(false));
  $('#f').addEventListener('submit', e => { e.preventDefault(); if (state().slug) window.open(state().path, '_blank'); });
  $('.actions').addEventListener('click', e => { if (e.target.closest('.off')) { e.preventDefault(); nm.focus(); toast('Enter your name first'); } });
  $('#cp').onclick = async () => { if (!state().slug) { nm.focus(); return toast('Enter your name first'); } try { await navigator.clipboard.writeText(state().full); toast('Link copied!'); } catch { prompt('Copy this link', state().full); } };
  const fit = () => { const w = phone.parentElement.clientWidth; phone.style.setProperty('--k', Math.min(1, w / 390)); };
  addEventListener('resize', fit); fit(); update(true);
}

/* ------------------------------------------------------------------ router */
function route() {
  const q = new URLSearchParams(location.search);
  const parts = location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  let name = '', tpl = null; const host = location.hostname;
  if (BASE_DOMAIN && host.endsWith('.' + BASE_DOMAIN) && host !== 'www.' + BASE_DOMAIN) { name = host.slice(0, -BASE_DOMAIN.length - 1); tpl = parts[0]; }
  else if (parts.length && !['create', 'index.html'].includes(parts[0])) { name = parts[0]; tpl = parts[1]; }
  if (!name) return home();
  const pretty = prettify(name.slice(0, 30)) || 'A friend';
  greet(pretty, TEMPLATES[tpl] ? tpl : KEYS[hash(name) % KEYS.length], (q.get('m') || '').slice(0, 90), q.has('embed'));
}

FX.init(); route();
})();
