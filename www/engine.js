// ===== motor: sprites, cámara isométrica, suelo, clima, entrada =====
'use strict';
// TH ajustado a la perspectiva de los dibujos (0,58). Casilla visible = 2×2 unidades lógicas.
const TW = 64, TH = 37, N = 56, BORDER = 4, CELL = 2;
const snapC = (v, s = CELL) => Math.round(v / Math.min(CELL, s)) * Math.min(CELL, s), floorC = v => Math.floor(v / CELL) * CELL;
const IMG = {};
let cv, ctx, W = 0, H = 0, DPR = 1;
const cam = { x: 0, y: N * TH / 2, z: 1 };

function loadAtlas(k) {
  if (IMG[k] && IMG[k]._p) return IMG[k]._p;
  const files = Array.isArray(ATLAS[k].img) ? ATLAS[k].img : [ATLAS[k].img]; const arr = IMG[k] = [];
  arr._p = Promise.all(files.map((f, i) => new Promise((ok, ko) => { const im = new Image(); im.onload = () => { arr[i] = im; ok(); }; im.onerror = ko; im.src = f; })));
  return arr._p;
}
// al arrancar solo se carga lo común y la última facción jugada; el resto se descarga en segundo plano
function loadAtlases() {
  let last = null; try { last = localStorage.getItem('tww_lastfac'); } catch (e) {}
  const first = ['comun']; if (last && ATLAS[last]) first.push(last);
  const p = Promise.all(first.map(loadAtlas));
  p.then(() => { let q = Promise.resolve(); for (const k in ATLAS) if (!first.includes(k)) q = q.then(() => loadAtlas(k)); });
  return p;
}
function S(key) { // 'voltempire/defensas/x' -> sprite
  const a = key.split('/')[0]; const at = ATLAS[a]; if (!at) return null;
  const r = at.rects[key]; if (!r) return null; const pw = r[4] || 0, py = r[5] || 0, pb = r[7] || 0; let fy = 1; if (pw > 10 && pb > py) fy = Math.max(.84, Math.min(1.16, (TH / TW) / ((pb - py) / (pw / 2))));
  const img = IMG[a] && IMG[a][r[8] || 0]; if (!img) return null;
  return { img, x: r[0], y: r[1], w: r[2], h: r[3], pw, py, pcx: r[6] || 0, pb, fy };
}
const _urlCache = {};
function spriteURL(key, size = 64) {
  const ck = key + '@' + size; if (_urlCache[ck]) return _urlCache[ck];
  const s = S(key); if (!s) return '';
  const c = document.createElement('canvas'); const sc = Math.min(size / s.w, size / s.h);
  c.width = Math.max(1, Math.round(s.w * sc)); c.height = Math.max(1, Math.round(s.h * sc));
  c.getContext('2d').drawImage(s.img, s.x, s.y, s.w, s.h, 0, 0, c.width, c.height);
  return (_urlCache[ck] = c.toDataURL());
}
function iso(x, y) { return [(x - y) * TW / 2, (x + y) * TH / 2]; }
function unIso(px, py) { const a = px / (TW / 2), b = py / (TH / 2); return [(a + b) / 2, (b - a) / 2]; }
function toScreen(px, py) { return [(px - cam.x) * cam.z + W / 2, (py - cam.y) * cam.z + H / 2]; }
function toWorld(sx, sy) { return [(sx - W / 2) / cam.z + cam.x, (sy - H / 2) / cam.z + cam.y]; }
function screenToTile(sx, sy) { const [px, py] = toWorld(sx, sy); return unIso(px, py); }

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.imageSmoothingQuality = 'high';
}

// ---- suelo cacheado por facción ----
const groundCache = {};
function groundCanvas(fac) {
  const fl1 = (typeof G !== 'undefined' && G && G.fac === fac && G.floor) || null, fl2 = (typeof G !== 'undefined' && G && G.fac === fac && G.floor2) || null, ck = fac + '|' + fl1 + '|' + fl2;
  if (groundCache[ck]) return groundCache[ck];
  const F = Object.assign({}, FACTIONS[fac]); if (fl1) F.ground = fl1; if (fl2) F.ground2 = fl2;
  const pad = 6, w = (N + pad * 2) * TW, h = (N + pad * 2) * TH;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const ox = w / 2, oy = pad * TH; // tile (0,0) arriba
  const tex = (key) => { const s = S(key); const t = document.createElement('canvas'); t.width = s.w; t.height = s.h; t.getContext('2d').drawImage(s.img, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h); return t; };
  const t1 = tex(F.ground), t2 = tex(F.ground2);
  const tilesPerTex = 8, sc = tilesPerTex / t1.width;
  g.save(); g.setTransform(TW / 2 * sc, TH / 2 * sc, -TW / 2 * sc, TH / 2 * sc, ox, oy);
  g.fillStyle = g.createPattern(t1, 'repeat'); g.fillRect(-pad / sc, -pad / sc, (N + pad * 2) / sc, (N + pad * 2) / sc);
  g.fillStyle = fac === 'nuw' ? 'rgba(10,12,30,.42)' : 'rgba(10,12,30,.14)'; g.fillRect(-pad / sc, -pad / sc, (N + pad * 2) / sc, (N + pad * 2) / sc);
  g.restore();
  // zona central con el segundo suelo, bordes suaves
  g.save(); g.setTransform(TW / 2 * sc, TH / 2 * sc, -TW / 2 * sc, TH / 2 * sc, ox, oy);
  g.globalAlpha = 0.85; g.fillStyle = g.createPattern(t2, 'repeat');
  const a = (N / 2 - 10) / sc, b = 20 / sc; g.beginPath(); g.roundRect ? g.roundRect(a, a, b, b, 2 / sc) : g.rect(a, a, b, b); g.fill();
  g.globalAlpha = 1; g.fillStyle = fac === 'nuw' ? 'rgba(22,8,44,.6)' : 'rgba(10,12,30,.14)'; g.fill();
  g.restore();
  // oscurecer fuera del mapa
  g.save(); g.setTransform(TW / 2, TH / 2, -TW / 2, TH / 2, ox, oy);
  g.fillStyle = 'rgba(0,0,0,0.38)';
  g.beginPath(); g.rect(-pad, -pad, N + pad * 2, N + pad * 2); g.rect(N, 0, -N, N); g.fill('evenodd');
  // franja de despliegue (no edificable)
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.rect(0, 0, N, N); g.rect(N - BORDER, BORDER, -(N - BORDER * 2), N - BORDER * 2); g.fill('evenodd');
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.06; g.setLineDash([0.4, 0.3]); g.strokeRect(BORDER, BORDER, N - BORDER * 2, N - BORDER * 2); g.setLineDash([]);
  // rejilla suave
  g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 0.03;
  g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 0.035;
  for (let i = BORDER; i <= N - BORDER; i += CELL) { g.beginPath(); g.moveTo(i, BORDER); g.lineTo(i, N - BORDER); g.moveTo(BORDER, i); g.lineTo(N - BORDER, i); g.stroke(); }
  g.restore();
  return (groundCache[ck] = { c, ox: -ox, oy: -oy });
}
function drawGround(fac) {
  const G = groundCanvas(fac);
  const [sx, sy] = toScreen(G.ox, G.oy);
  ctx.drawImage(G.c, sx, sy, G.c.width * cam.z, G.c.height * cam.z);
}
// máscara de luces: solo los píxeles que parecen luz o energía (muy brillantes y de color saturado)
const _lm = {};
function lightMask(key) {
  if (key in _lm) return _lm[key]; const s = S(key); if (!s || !s.img.complete || !s.img.naturalWidth) return null;
  const c = document.createElement('canvas'); c.width = s.w; c.height = s.h; const g = c.getContext('2d'); g.drawImage(s.img, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);
  let d; try { d = g.getImageData(0, 0, s.w, s.h); } catch (e) { return (_lm[key] = null); }
  const p = d.data, A = new Uint8Array(s.w * s.h); for (let i = 0; i < A.length; i++) A[i] = p[i * 4 + 3];
  const W2 = s.w, inner = j => { const x = j % W2, y = (j / W2) | 0; for (const [ox, oy] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, -2], [2, -2], [-2, 2]]) { const xx = x + ox, yy = y + oy; if (xx < 0 || yy < 0 || xx >= W2 || yy >= s.h || A[yy * W2 + xx] < 200) return false; } return true; };
  let n = 0, op = 0; const volt = key.startsWith('voltempire/');
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 30) continue; op++;
    if (!inner(i >> 2)) { p[i + 3] = 0; continue; } // fuera el contorno del dibujo
    const r = p[i], gg = p[i + 1], b = p[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0;
    let hue = 0; if (mx !== mn) { hue = mx === r ? ((gg - b) / (mx - mn)) % 6 : mx === gg ? (b - r) / (mx - mn) + 2 : (r - gg) / (mx - mn) + 4; hue = (hue * 60 + 360) % 360; }
    // luz/energía: cian, azul, violeta o rosa brillantes; verdes y amarillos solo si son de neón (casi blancos de brillo)
    const lit = sat > .4 && ((hue >= 165 && hue <= 335 && mx > 170) || (mx > 238 && sat > .55 && hue > 60 && hue < 165) || (mx > 250 && gg > 235 && sat > .5));
    if (lit) { n++; if (hue >= 160 && hue <= 260) { const v = mx / 255; if (volt) { p[i] = 4 * v; p[i + 1] = 28 * v; p[i + 2] = 170 * v; } else { p[i] = 20 * v; p[i + 1] = 80 * v; p[i + 2] = 255 * v; } } } // energía azul → azul eléctrico
    else p[i + 3] = 0;
  }
  if (!op || n / op < .012) return (_lm[key] = null);
  g.putImageData(d, 0, 0); g.filter = 'blur(1.5px)'; g.drawImage(c, 0, 0);
  return (_lm[key] = c);
}
function drawGlow(key, dx, dy, w, h, ph, alpha) {
  const m = lightMask(key); if (!m) return;
  if (!m.dark) { const d = document.createElement('canvas'); d.width = m.width; d.height = m.height; const g = d.getContext('2d'); g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#05060c'; g.fillRect(0, 0, d.width, d.height); m.dark = d; }
  // ciclo de ~4,5 s: se enciende con fuerza y luego casi se apaga
  const k = (Math.sin(performance.now() / 720 + ph) + 1) / 2, a0 = alpha != null ? alpha : 1;
  ctx.save();
  if (k > .45 && key.startsWith('voltempire/')) { const f = (k - .45) / .55; ctx.globalAlpha = a0 * f * .7; ctx.drawImage(m, dx, dy, w, h); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a0 * f * .18; ctx.drawImage(m, dx, dy, w, h); }
  else if (k > .45) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a0 * Math.min(1, (k - .45) / .55 * .5); ctx.drawImage(m, dx, dy, w, h); }
  else { ctx.globalAlpha = a0 * (.45 - k) / .45 * .6; ctx.drawImage(m.dark, dx, dy, w, h); }
  ctx.restore();
}
// recoloreado a dos tonos (iridiscente: sombras moradas, luces blancas), cacheado por sprite
const _rc = {};
function recolSprite(key, kind) {
  const ck = key + '|' + kind; if (_rc[ck] !== undefined) return _rc[ck];
  const s = S(key); if (!s || !s.img.complete) return null;
  const c = document.createElement('canvas'); c.width = s.w; c.height = s.h; const g = c.getContext('2d'); g.drawImage(s.img, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);
  let d; try { d = g.getImageData(0, 0, s.w, s.h); } catch (e) { return (_rc[ck] = null); }
  const p = d.data, A = [92, 32, 168], B = [250, 246, 255];
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; let L = (p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) / 255; L = Math.min(1, Math.max(0, (L - .18) / .62)); const t = L * L * (3 - 2 * L);
    p[i] = A[0] + (B[0] - A[0]) * t; p[i + 1] = A[1] + (B[1] - A[1]) * t; p[i + 2] = A[2] + (B[2] - A[2]) * t; }
  g.putImageData(d, 0, 0); return (_rc[ck] = { img: c, x: 0, y: 0, w: s.w, h: s.h });
}
function recolURL(key, size, kind) { const r = recolSprite(key, kind); if (!r) return spriteURL(key, size); const c = document.createElement('canvas'), sc = Math.min(size / r.w, size / r.h); c.width = r.w * sc; c.height = r.h * sc; c.getContext('2d').drawImage(r.img, 0, 0, c.width, c.height); return c.toDataURL(); }
function drawSprite(key, tx, ty, width, opts = {}) {
  // tx,ty: punto del suelo (coordenadas de casilla) donde apoya el sprite (centro inferior)
  const s = S(key); if (!s) return;
  const [px, py] = iso(tx, ty); let [sx, sy] = toScreen(px, py); sx += opts.sdx || 0;
  const w = width * cam.z, h = w * s.h / s.w;
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  if (opts.filter) ctx.filter = opts.filter;
  const lift = (opts.lift || 0) * cam.z;
  let src = s; if (opts.recolor) { const r = recolSprite(key, opts.recolor); if (r) src = r; }
  const yy = sy - h - lift + (opts.sink || 0) * cam.z, f0 = ctx.filter;
  if (opts.tilt || opts.sq) { const py0 = sy - lift + (opts.sink || 0) * cam.z, q = opts.sq || 1; ctx.translate(sx, py0); ctx.rotate(opts.tilt || 0); ctx.scale(1 + (1 - q) * .6, q); ctx.translate(-sx, -py0); }
  if (opts.flip) { ctx.translate(sx, 0); ctx.scale(-1, 1); }
  const X = opts.flip ? -w / 2 : sx - w / 2;
  // aura: silueta oscura con resplandor detrás; el personaje se dibuja encima sin filtros de brillo
  const T = performance.now() / 1000 + (opts.seed || 0);
  if (opts.halo) {
    let hf = `brightness(0) drop-shadow(0 0 ${3 * cam.z}px ${opts.halo}) drop-shadow(0 0 ${2 * cam.z}px ${opts.halo})`;
    if (opts.haloFx === 'shine') { const a = T * 2.2, r = 2.5 * cam.z; hf = `brightness(0) drop-shadow(${Math.cos(a) * r}px ${Math.sin(a) * r}px ${2.5 * cam.z}px ${opts.halo}) drop-shadow(0 0 ${2 + 2 * (Math.sin(T * 3) + 1)}px ${opts.halo}) drop-shadow(${-Math.cos(a) * r}px ${-Math.sin(a) * r}px ${2 * cam.z}px #ffffff)`; }
    if (opts.haloFx === 'flames') { const k = Math.sin(T * 13) * .5 + Math.sin(T * 7.3) * .5; hf = `brightness(0) drop-shadow(0 ${-2 * cam.z}px ${(4 + k * 1.5) * cam.z}px #ff2a12) drop-shadow(0 ${-4 * cam.z}px ${(3 + k) * cam.z}px #ff8a1a) drop-shadow(0 0 ${2 * cam.z}px #ff0000)`; }
    ctx.filter = hf; ctx.drawImage(src.img, src.x, src.y, src.w, src.h, X, yy, w, h); ctx.filter = f0;
  }
  ctx.drawImage(src.img, src.x, src.y, src.w, src.h, X, yy, w, h);
  if (opts.haloFx === 'sparks' || opts.haloFx === 'flames') {
    const n = opts.haloFx === 'sparks' ? 7 : 14, cx = X + w / 2, cy = yy + h * .55; ctx.save(); ctx.filter = 'none'; ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      if (opts.haloFx === 'sparks') { const a = T * 1.6 + i * 6.283 / n, rr = w * (.48 + .08 * Math.sin(T * 3 + i)), px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * .55 - Math.sin(T * 2 + i) * 6 * cam.z, tw = (Math.sin(T * 9 + i * 2) + 1) / 2;
        ctx.globalAlpha = .4 + .6 * tw; ctx.fillStyle = i % 2 ? '#d9a6ff' : '#9b4dff'; ctx.beginPath(); ctx.arc(px, py, (1 + 1.4 * tw) * cam.z, 0, 7); ctx.fill();
        ctx.fillRect(px - .4 * cam.z, py - 3 * tw * cam.z, .8 * cam.z, 6 * tw * cam.z); }
      else { const ph = (T * 1.4 + i / n) % 1, px = cx + (((i * 37) % 13) / 13 - .5) * w * 1.05 + Math.sin(T * 5 + i) * 2 * cam.z, py = yy + h * (.95 - ph * .9);
        ctx.globalAlpha = (1 - ph) * .85; ctx.fillStyle = ph < .4 ? '#ffd24a' : ph < .7 ? '#ff6a1a' : '#ff1a0a'; ctx.beginPath(); ctx.ellipse(px, py, (4.5 - ph * 3) * cam.z, (8 - ph * 5) * cam.z, 0, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
  ctx.restore();
  if (opts.glow && !opts.flip) drawGlow(key, sx - w / 2, sy - h - lift + (opts.sink || 0) * cam.z, w, h, opts.anim || 0, opts.alpha);
  return [sx, sy - h - lift, w, h];
}
// dibuja un edificio con su rombo base encajado exactamente en la huella (x,y,tamaño)
function drawOnTile(key, x, y, size, opts = {}) {
  // torretas con varias vistas: se funden la vista anterior y la nueva durante el giro
  if (opts.dirSet) { let r = null; const a0 = opts.alpha != null ? opts.alpha : 1;
    for (const [k, mir, a] of opts.dirSet) { if (a <= .01) continue; r = drawOnTile(k, x, y, size, Object.assign({}, opts, { dirSet: null, mirror: mir ? 1 : null, alpha: a0 * a, glow: a > .5 ? opts.glow : 0 })); }
    return r; }
  let s = S(key); if (!s) return null;
  // fotogramas 2 y 3: misma base que el 1 para que no boten
  if (/_f[23]$/.test(key)) { const b0 = S(key.slice(0, -3)); if (b0 && b0.w === s.w && b0.h === s.h) s = Object.assign({}, s, { pw: b0.pw, py: b0.py, pcx: b0.pcx, pb: b0.pb, fy: b0.fy }); }
  if (s.pw < 10) return drawSprite(key, x + size, y + size, size * TW, opts);
  // margen FIJO en casillas (igual para 1, 2, 3 o 4 casillas) + plataforma uniforme bajo cada edificio
  const M = opts.margin != null ? opts.margin : 0.16, fit = (size - 2 * M) / size;
  if (opts.pad) padDiamond(x + .06, y + .06, size - .12, opts.pad);
  const [px, py] = iso(x + size / 2, y + size / 2); const [cx] = toScreen(px, py);
  const [bx, by] = iso(x + size - M, y + size - M); const [, bottomY] = toScreen(bx, by);
  const k = size * TW * fit / s.pw * cam.z, ky = k * (s.fy || 1); let w = s.w * k, h = s.h * ky;
  // movimiento: respiración suave anclada a la base (cada edificio con su fase)
  const sy = 1;
  const baseOff = (s.pb || (s.py + s.pw / 4)) * ky;
  const dx = cx - s.pcx * k, dy = bottomY - baseOff - (opts.lift || 0) * cam.z;
  ctx.save(); if (opts.alpha != null) ctx.globalAlpha = opts.alpha; if (opts.filter) ctx.filter = opts.filter;
  if (opts.mirror != null && opts.mirror > .01) {
    const m = Math.min(1, opts.mirror), pv = dx + s.pcx * k, a1 = ctx.globalAlpha;
    if (m < .99) { ctx.globalAlpha = a1 * (1 - m); ctx.drawImage(s.img, s.x, s.y, s.w, s.h, dx, dy, w, h); }
    ctx.globalAlpha = a1 * m; ctx.save(); ctx.translate(pv, 0); ctx.scale(-1, 1); ctx.drawImage(s.img, s.x, s.y, s.w, s.h, -s.pcx * k, dy, w, h); ctx.restore(); ctx.globalAlpha = a1;
  } else if (opts.sway) {
    // parte de abajo fija y parte de arriba (cabezal) que gira un poco sobre su eje y retrocede al disparar
    const sp = Math.max(s.h * .2, Math.min(s.h * .7, s.py - s.pw * (opts.sway.cut || .32))) | 0, k2 = h / s.h;
    ctx.drawImage(s.img, s.x, s.y + sp, s.w, s.h - sp, dx, dy + sp * k2, w, (s.h - sp) * k2);
    const pvx = dx + s.pcx * k, pvy = dy + sp * k2, kk = opts.sway.kick || 0;
    ctx.save(); ctx.translate(pvx + (opts.sway.sx < 0 ? 1 : -1) * kk * 3 * cam.z, pvy + kk * 1.5 * cam.z); ctx.rotate(opts.sway.a || 0); if (opts.sway.dy) ctx.translate(0, opts.sway.dy * cam.z); const syy = opts.sway.sy || 1, sxx = (opts.sway.sx == null ? 1 : opts.sway.sx) * (2 - syy); if (sxx !== 1 || syy !== 1) ctx.scale(sxx, syy);
    ctx.drawImage(s.img, s.x, s.y, s.w, sp + 2, -s.pcx * k, -sp * k2, w, (sp + 2) * k2);
    ctx.restore();
  } else ctx.drawImage(s.img, s.x, s.y, s.w, s.h, dx, dy, w, h);
  ctx.restore();
  if (opts.glow) { if (opts.mirror > .5) { ctx.save(); ctx.translate(2 * (dx + s.pcx * k), 0); ctx.scale(-1, 1); drawGlow(key, dx, dy, w, h, opts.anim || 0, opts.alpha); ctx.restore(); } else drawGlow(key, dx, dy, w, h, opts.anim || 0, opts.alpha); }
  return [dx, dy, w, h];
}
// dibuja un sprite cuya base es un rectángulo del suelo (x0,y0)-(x1,y1): tramos de muro y postes
function drawRect(key, x0, y0, x1, y1, opts = {}) {
  const s = S(key); if (!s || s.pw < 10) return null;
  const [lx] = toScreen(...iso(x0, y1)), [rx] = toScreen(...iso(x1, y0)), [, by] = toScreen(...iso(x1, y1));
  const k = (rx - lx) / s.pw, w = s.w * k, h = s.h * k, dx = (lx + rx) / 2 - s.pcx * k, dy = by - s.pb * k;
  ctx.save(); if (opts.alpha != null) ctx.globalAlpha = opts.alpha; if (opts.filter) ctx.filter = opts.filter;
  ctx.drawImage(s.img, s.x, s.y, s.w, s.h, dx, dy, w, h); ctx.restore(); return [dx, dy, w, h];
}
function padDiamond(x, y, sz, col) {
  const p = [iso(x, y), iso(x + sz, y), iso(x + sz, y + sz), iso(x, y + sz)].map(q => toScreen(q[0], q[1]));
  ctx.save(); ctx.beginPath(); ctx.moveTo(...p[0]); for (let i = 1; i < 4; i++) ctx.lineTo(...p[i]); ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,.30)'; ctx.fill(); ctx.strokeStyle = col; ctx.globalAlpha = .55; ctx.lineWidth = 1.5 * cam.z; ctx.stroke(); ctx.restore();
}
function diamond(x, y, sz, fill, stroke) {
  const p = [iso(x, y), iso(x + sz, y), iso(x + sz, y + sz), iso(x, y + sz)].map(q => toScreen(q[0], q[1]));
  ctx.beginPath(); ctx.moveTo(...p[0]); for (let i = 1; i < 4; i++) ctx.lineTo(...p[i]); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}
function hpBar(sx, sy, w, f, col) {
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(sx - w / 2 - 1, sy - 1, w + 2, 6);
  ctx.fillStyle = col || (f > .5 ? '#6ee06e' : f > .25 ? '#f0c23c' : '#ff4d4d'); ctx.fillRect(sx - w / 2, sy, w * Math.max(0, f), 4);
}

// ================= CLIMA (partículas) =================
const WX = { id: 'clear', parts: [], t: 0, flash: 0, bolts: [], meteors: [] };
function setWeather(id) { WX.id = id; WX.parts = []; WX.bolts = []; WX.meteors = []; }
function weatherUpdate(dt) {
  WX.t += dt; const id = WX.id; const P = WX.parts;
  const want = { rain: 260, acid: 220, snow: 160, fog: 14, toxic: 16, sand: 220, ion: 120, meteor: 0, aurora: 0, clear: 0 }[id] || 0;
  while (P.length < want) P.push(newPart(id, true));
  if (P.length > want) P.length = want;
  for (const p of P) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.y > H + 40 || p.x < -200 || p.x > W + 200 || p.life < 0) Object.assign(p, newPart(id, false));
  }
  if (WX.flash > 0) WX.flash -= dt * 2.5;
  WX.bolts = WX.bolts.filter(b => (b.t -= dt) > 0);
}
function newPart(id, init) {
  const r = Math.random;
  const p = { x: r() * (W + 200) - 100, y: init ? r() * H : -20 - r() * 60, vx: 0, vy: 0, life: 99, s: 1 };
  if (id === 'rain' || id === 'ion') { p.vx = -120; p.vy = 900 + r() * 300; p.s = 14 + r() * 10; }
  else if (id === 'acid') { p.vx = -60; p.vy = 600 + r() * 200; p.s = 10 + r() * 8; }
  else if (id === 'snow') { p.vx = -20 + r() * 40; p.vy = 40 + r() * 60; p.s = 1.5 + r() * 2.5; }
  else if (id === 'fog' || id === 'toxic') { p.x = r() * W; p.y = r() * H; p.vx = 10 + r() * 25; p.vy = 0; p.s = 160 + r() * 220; p.life = 40; }
  else if (id === 'sand') { p.x = init ? r() * W : -50; p.y = r() * H; p.vx = 500 + r() * 400; p.vy = 40 + r() * 40; p.s = 8 + r() * 18; }
  return p;
}
function weatherDraw() {
  const id = WX.id; const P = WX.parts; ctx.save();
  if (id === 'rain' || id === 'ion' || id === 'acid') {
    ctx.strokeStyle = id === 'acid' ? 'rgba(150,255,80,.55)' : 'rgba(190,215,255,.5)'; ctx.lineWidth = 1.3; ctx.beginPath();
    for (const p of P) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 0.015, p.y + p.s); } ctx.stroke();
    ctx.fillStyle = id === 'acid' ? 'rgba(60,120,20,.12)' : id === 'ion' ? 'rgba(20,25,60,.28)' : 'rgba(20,40,80,.15)'; ctx.fillRect(0, 0, W, H);
  } else if (id === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (const p of P) { ctx.beginPath(); ctx.arc(p.x + Math.sin(WX.t * 2 + p.y * 0.02) * 8, p.y, p.s, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(200,225,255,.12)'; ctx.fillRect(0, 0, W, H);
  } else if (id === 'fog' || id === 'toxic') {
    const col = id === 'toxic' ? [120, 255, 90] : [225, 230, 240];
    for (const p of P) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
      g.addColorStop(0, `rgba(${col},${id === 'toxic' ? .28 : .32})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.fillRect(p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
      if (p.x - p.s > W) p.x = -p.s;
    }
    ctx.fillStyle = id === 'toxic' ? 'rgba(60,140,30,.16)' : 'rgba(210,215,225,.18)'; ctx.fillRect(0, 0, W, H);
  } else if (id === 'sand') {
    ctx.fillStyle = 'rgba(210,150,70,.22)'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(240,200,130,.5)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (const p of P) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.s * 2, p.y + p.s * 0.15); } ctx.stroke();
  } else if (id === 'aurora') {
    for (let i = 0; i < 3; i++) {
      const g = ctx.createLinearGradient(0, 0, W, 0); const hue = (WX.t * 20 + i * 70) % 360;
      g.addColorStop(0, `hsla(${hue},90%,60%,0)`); g.addColorStop(.5, `hsla(${hue + 40},90%,60%,.22)`); g.addColorStop(1, `hsla(${hue + 80},90%,60%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 40 + i * 40);
      for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 60 + i * 45 + Math.sin(x * 0.01 + WX.t + i) * 30);
      ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.fill();
    }
    ctx.fillStyle = 'rgba(30,10,60,.12)'; ctx.fillRect(0, 0, W, H);
  } else if (id === 'meteor') { ctx.fillStyle = 'rgba(60,20,10,.15)'; ctx.fillRect(0, 0, W, H); }
  // rayos
  for (const b of WX.bolts) {
    ctx.strokeStyle = `rgba(200,230,255,${Math.min(1, b.t * 4)})`; ctx.lineWidth = 3; ctx.shadowColor = '#9cf'; ctx.shadowBlur = 16;
    ctx.beginPath(); let x = b.x + (Math.random() - .5) * 60, y = -10; ctx.moveTo(x, y);
    while (y < b.y) { y += 30 + Math.random() * 30; x += (Math.random() - .5) * 50; if (y > b.y) { y = b.y; x = b.x; } ctx.lineTo(x, y); } ctx.stroke(); ctx.shadowBlur = 0;
  }
  if (WX.flash > 0) { ctx.fillStyle = `rgba(220,235,255,${WX.flash * .5})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
function lightningAt(sx, sy) { WX.bolts.push({ x: sx, y: sy, t: .35 }); WX.flash = 1; }

// ================= ENTRADA (arrastrar, pellizcar, tocar) =================
const INPUT = { ptrs: new Map(), moved: false, start: null, pinch: null, onTap: null, onDrag: null, onHold: null, holdT: 0, dragMode: null };
function setupInput() {
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); INPUT.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (INPUT.ptrs.size === 1) { INPUT.start = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, t: performance.now() }; INPUT.moved = false; INPUT.dragMode = INPUT.onDragStart ? INPUT.onDragStart(e.clientX, e.clientY) : null; INPUT.holding = { x: e.clientX, y: e.clientY }; }
    else if (INPUT.ptrs.size === 2) { const [a, b] = [...INPUT.ptrs.values()]; INPUT.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z }; INPUT.moved = true; INPUT.holding = null; }
  });
  cv.addEventListener('pointermove', e => {
    if (!INPUT.ptrs.has(e.pointerId)) return; INPUT.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (INPUT.ptrs.size === 2 && INPUT.pinch) { const [a, b] = [...INPUT.ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); cam.z = clamp(INPUT.pinch.z * d / INPUT.pinch.d, .25, 2.2); return; }
    const s = INPUT.start; if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.hypot(dx, dy) > 8) INPUT.moved = true;
    if (INPUT.holding) INPUT.holding = { x: e.clientX, y: e.clientY };
    if (INPUT.dragMode && INPUT.onDrag) { INPUT.onDrag(e.clientX, e.clientY); return; }
    if (INPUT.moved && !INPUT.holdDeploy) { cam.x = s.cx - dx / cam.z; cam.y = s.cy - dy / cam.z; clampCam(); }
  });
  const up = e => {
    if (!INPUT.ptrs.has(e.pointerId)) return; INPUT.ptrs.delete(e.pointerId);
    if (INPUT.ptrs.size < 2) INPUT.pinch = null;
    if (INPUT.ptrs.size === 0) {
      if (!INPUT.moved && INPUT.onTap) INPUT.onTap(e.clientX, e.clientY);
      if (INPUT.dragMode && INPUT.onDragEnd) INPUT.onDragEnd(e.clientX, e.clientY);
      INPUT.start = null; INPUT.dragMode = null; INPUT.holding = null;
    }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); cam.z = clamp(cam.z * (e.deltaY > 0 ? .9 : 1.1), .25, 2.2); }, { passive: false });
}
function clampCam() { const [cx, cy] = iso(N / 2, N / 2); const r = N * TW * .55; cam.x = clamp(cam.x, cx - r, cx + r); cam.y = clamp(cam.y, cy - r * .6, cy + r * .6); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
function fmtN(n) { n = Math.floor(n); if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'; if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'; if (n >= 1e4) return Math.floor(n / 1e3) + 'k'; return n.toLocaleString('es-ES'); }
function fmtT(s) { s = Math.max(0, Math.ceil(s)); if (s < 60) return s + 's'; const m = Math.floor(s / 60); if (m < 60) return m + 'm ' + (s % 60) + 's'; const h = Math.floor(m / 60); if (h < 24) return h + 'h ' + (m % 60) + 'm'; return Math.floor(h / 24) + 'd ' + (h % 24) + 'h'; }
