// ===== Muros: selección de fila / muro entero, puertas, y tropas paseando por la base =====
let WSEL = null;           // muros seleccionados para mejora conjunta
const BASE_TROOPS = { sig: '', list: [] };

const wallAt = (x, y, list = G.buildings) => list.find(w => w.t === 'wall' && w.x === x && w.y === y && !w.dead);
function wallAxis(b) { const L = wallAt(b.x - 1, b.y), R = wallAt(b.x + 1, b.y), U = wallAt(b.x, b.y - 1), D = wallAt(b.x, b.y + 1);
  if (L || R) return (U || D) && !(L || R) ? 1 : 0; if (U || D) return 1; return b.rot ? 1 : 0; }
function wallRow(b) {
  const ax = wallAxis(b), dx = ax ? 0 : 1, dy = ax ? 1 : 0, out = [b];
  for (const s of [-1, 1]) { let x = b.x + dx * s, y = b.y + dy * s, w; while ((w = wallAt(x, y)) && w.lv === b.lv) { out.push(w); x += dx * s; y += dy * s; } }
  return out;
}
function wallGroup(b) {
  const out = [b], seen = new Set([b.id]);
  for (let i = 0; i < out.length; i++) { const c = out[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const w = wallAt(c.x + dx, c.y + dy); if (w && w.lv === b.lv && !seen.has(w.id)) { seen.add(w.id); out.push(w); } } }
  return out;
}
function selWalls(mode) {
  const b = SEL; if (!b || b.t !== 'wall') return; const ws = mode === 'row' ? wallRow(b) : wallGroup(b), keep = b;
  WSEL = ws; const to = b.lv + 1, mx = maxLevel('wall'), one = costOf('wall', to), tot = one.n * ws.length, can = Math.floor(G[one.r] / one.n);
  let acts = '';
  if (to > mx) acts = `<button class="btn off">🔒 Necesita ${bName(G.fac, 'core')} ${nextCoreFor('wall', to)}</button>`;
  else { acts = `<button class="btn ${G[one.r] >= tot ? '' : 'off'}" onclick="upgradeWSel()">⬆️ Mejorar ${ws.length} a nivel ${to} · ${resIcon(one.r)} ${fmtN(tot)}</button>`;
    if (G[one.r] < tot && can > 0) acts += `<button class="btn ghost" onclick="upgradeWSel(${can})">⬆️ Mejorar ${can} (lo que te llega)</button>`; }
  acts += `<button class="btn ghost" onclick="SEL=WSEL&&WSEL[0];selWalls('${mode === 'row' ? 'all' : 'row'}')">${mode === 'row' ? '🔗 Todo el muro conectado' : '🧱 Solo la fila'}</button>`;
  acts += `<button class="btn ghost" onclick="WSEL=null;openBuilding(SEL)">↩️ Volver</button>`;
  openPanel(`<div class="ph"><img src="${spriteURL(bSprite(G.fac, b), 110)}"><div><h3>${ws.length} muros seleccionados</h3><p>${mode === 'row' ? 'Fila recta' : 'Muro conectado'} · nivel ${b.lv}</p><div class="stats"><span>Se mejoran todos a la vez, al instante</span></div></div></div><div class="acts">${acts}</div>`);
  SEL = keep; WSEL = ws;
}
function upgradeWSel(limit) {
  if (!WSEL || !WSEL.length) return; const to = WSEL[0].lv + 1; if (to > maxLevel('wall')) return;
  const one = costOf('wall', to), list = WSEL.filter(w => w.lv === to - 1).slice(0, limit || 1e9), tot = one.n * list.length;
  if (G[one.r] < tot) { toast(`Te faltan ${fmtN(tot - G[one.r])} de ${resName(one.r)}.`); return; }
  G[one.r] -= tot; for (const w of list) { w.lv = to; fxAt(w.x + .5, w.y + .5, 'subida_nivel'); }
  SND && SND.play && SND.play('done'); toast(`🧱 ${list.length} muros a nivel ${to}`, 'gold');
  const first = WSEL[0]; WSEL = null; saveProfile(); refreshHUD(); SEL = first; openBuilding(first);
}
// ---- puertas ----
const gateMax = () => 1 + Math.floor(G.core / 3);
const gateCount = () => G.buildings.filter(w => w.t === 'wall' && w.gate).length;
function toggleGate(b) {
  if (!b.gate && gateCount() >= gateMax()) { toast(`Máximo ${gateMax()} puertas con tu ${bName(G.fac, 'core')} actual.`); return; }
  b.gate = !b.gate; b.hold = false; const r = wallAxis(b); b.rot = r; saveProfile(); toast(b.gate ? '🚪 Puerta colocada: se abre cuando pasan tus tropas' : '🧱 Vuelve a ser muro'); openBuilding(b);
}
const GATE_COL = ['#8a5a2b', '#6e4520', '#8d8d8d', '#a59c86', '#5f646b', '#9fb2c4', '#2a1f33', '#7fe3ff', '#c45cff', '#ff4fd8'];
function drawGate(list, b, key, o, openAmt) {
  const x = b.x, y = b.y, ax = wallAxis(b), col = GATE_COL[(b.lv || 1) - 1] || '#777', oo = { alpha: o.alpha, filter: o.filter };
  // postes en los dos extremos
  const post = (cx, cy) => drawRect(key, cx - .26, cy - .26, cx + .26, cy + .26, oo);
  const pA = ax ? [x + .5, y + .05] : [x + .05, y + .5], pB = ax ? [x + .5, y + .95] : [x + .95, y + .5];
  const hS = 30 * cam.z * (1 + Math.min(.6, (b.lv - 1) * .05));
  const leaf = (hx, hy, dir) => { // hoja de puerta con bisagra en (hx,hy)
    const ang = openAmt * Math.PI / 2 * .9, L = .44, ux = ax ? 0 : dir, uy = ax ? dir : 0, qx = ax ? -1 : 0, qy = ax ? 0 : -1;
    const vx = ux * Math.cos(ang) + qx * Math.sin(ang), vy = uy * Math.cos(ang) + qy * Math.sin(ang);
    const [ax0, ay0] = toScreen(...iso(hx, hy)), [bx0, by0] = toScreen(...iso(hx + vx * L, hy + vy * L));
    ctx.save(); if (o.alpha != null) ctx.globalAlpha = o.alpha; ctx.beginPath(); ctx.moveTo(ax0, ay0); ctx.lineTo(bx0, by0); ctx.lineTo(bx0, by0 - hS); ctx.lineTo(ax0, ay0 - hS); ctx.closePath();
    const g = ctx.createLinearGradient(ax0, ay0 - hS, bx0, by0); g.addColorStop(0, col); g.addColorStop(1, shade(col, -.35)); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.4 * cam.z; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; for (const f of [.3, .7]) { ctx.beginPath(); ctx.moveTo(ax0, ay0 - hS * f); ctx.lineTo(bx0, by0 - hS * f); ctx.stroke(); }
    if (b.lv >= 8) { ctx.shadowColor = col; ctx.shadowBlur = 8 * cam.z; ctx.strokeStyle = col; ctx.stroke(); }
    ctx.restore(); };
  const depthFirst = ax ? [[pA, 1], [pB, -1]] : [[pA, 1], [pB, -1]];
  post(...pA); for (const [p, d] of depthFirst) leaf(p[0], p[1], d); const r = post(...pB);
  const [px, py] = toScreen(...iso(x + .5, y + .5));
  return r || [px - 14 * cam.z, py - 40 * cam.z, 28 * cam.z, 40 * cam.z];
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(v * (1 + k)))); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function gateOpenAmt(b, dt) {
  let want = b.hold ? 1 : 0;
  if (!want) for (const t of BASE_TROOPS.list) if (Math.abs(t.x - (b.x + .5)) + Math.abs(t.y - (b.y + .5)) < 2.2) { want = 1; break; }
  b._op = (b._op || 0) + Math.sign(want - (b._op || 0)) * Math.min(Math.abs(want - (b._op || 0)), (dt || 16) / 450);
  return b._op;
}
// ---- tropas paseando junto a los campamentos ----
function baseTroopsSync() {
  const camps = G.buildings.filter(b => b.t === 'camp' && b.lv > 0), sig = JSON.stringify(G.army) + '|' + camps.map(c => c.id + ':' + c.x + ',' + c.y).join(';');
  if (sig === BASE_TROOPS.sig) return; BASE_TROOPS.sig = sig;
  const units = []; for (const k in G.army) for (let i = 0; i < G.army[k]; i++) units.push(k);
  const old = BASE_TROOPS.list; BASE_TROOPS.list = [];
  if (!camps.length) return;
  const per = 10, maxN = camps.length * per; units.sort(() => Math.random() - .5);
  units.slice(0, maxN).forEach((k, i) => { const c = camps[i % camps.length], d = unitDef(G.fac, k); if (!d) return;
    const prev = old.find(t => t.k === k && t.camp === c.id && !BASE_TROOPS.list.includes(t));
    const t = prev || { k, camp: c.id, x: c.x + 1 + (Math.random() - .5) * 3, y: c.y + 2.6 + Math.random() * .8, tx: 0, ty: 0, wait: Math.random() * 3000, id: Math.random() * 1000 };
    t.d = d; BASE_TROOPS.list.push(t); });
}
function baseTroopsStep(dt) {
  baseTroopsSync(); if (!BASE_TROOPS.list.length) return;
  const occ = occupied(G.buildings);
  const free = (x, y) => { const i = Math.floor(y) * N + Math.floor(x); return x > BORDER && y > BORDER && x < N - BORDER && y < N - BORDER && !occ[i]; };
  const gateAt = (x, y) => { const w = wallAt(Math.floor(x), Math.floor(y)); return w && w.gate; };
  for (const t of BASE_TROOPS.list) {
    const c = G.buildings.find(b => b.id === t.camp); if (!c) continue;
    if (t.wait > 0) { t.wait -= dt; t.moving = false; continue; }
    if (!t.tx) { for (let k = 0; k < 12; k++) { const a = Math.random() * 6.28, r = 1.6 + Math.random() * 1.9, x = c.x + 1 + Math.cos(a) * r, y = c.y + 1 + Math.sin(a) * r;
        const mx = (x + t.x) / 2, my = (y + t.y) / 2; if (free(x, y) && (free(mx, my) || gateAt(mx, my))) { t.tx = x; t.ty = y; break; } }
      if (!t.tx) { t.wait = 800; continue; } }
    const dx = t.tx - t.x, dy = t.ty - t.y, dd = Math.hypot(dx, dy), sp = .0011 * dt * Math.min(1.4, Math.max(.6, (t.d.speed || 1)));
    if (dd < sp) { t.x = t.tx; t.y = t.ty; t.tx = 0; t.wait = 1500 + Math.random() * 4000; t.moving = false; }
    else { t.vx = dx / dd; t.vy = dy / dd; t.x += t.vx * sp; t.y += t.vy * sp; t.moving = true; }
  }
}
function drawBaseTroop(t, now) {
  const atl = FACTIONS[G.fac].atlas, d = t.d, vx = t.vx || 0, vy = t.vy || .5;
  const front = (vx + vy) * .5 >= -0.05, flip = (vx - vy) < 0;
  let key = `${atl}/tropas/${d.sprite}_${front ? 'frente' : 'espalda'}`; if (!S(key)) key = `${atl}/tropas/${d.sprite}_frente`; const s = S(key); if (!s) return;
  const hgt = (d.space >= 10 ? 84 : d.space >= 5 ? 64 : d.space >= 3 ? 54 : 44) * cam.z, wid = hgt * s.w / s.h;
  const [px, py] = toScreen(...iso(t.x, t.y)); const bob = t.moving ? Math.abs(Math.sin(t._ph || 0)) * 3 * cam.z : 0, air = d.air ? 30 * cam.z + Math.sin(now / 300 + t.id) * 4 * cam.z : 0;
  ctx.save(); ctx.globalAlpha = PLACING ? .4 : 1; ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(px, py, wid * .28, wid * .12, 0, 0, 7); ctx.fill();
  t._ph = (t._ph || t.id) + (t.moving ? .22 : 0); const tl = d.air ? 0 : t.moving ? Math.sin(t._ph) * .085 : Math.sin(now / 900 + t.id) * .015, q = t.moving ? 1 - Math.abs(Math.cos(t._ph)) * .07 : 1 + Math.sin(now / 520 + t.id) * .018;
  ctx.translate(px, py - bob - air); ctx.rotate(tl); ctx.scale(1 + (1 - q) * .6, q); if (flip) ctx.scale(-1, 1); ctx.drawImage(s.img, s.x, s.y, s.w, s.h, -wid / 2, -hgt, wid, hgt); ctx.restore();
}
