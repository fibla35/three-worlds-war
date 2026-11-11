// ===== Modo Conquista: estrategia en tiempo real (obreros, recolección, tropas) =====
'use strict';
let RTS = null;
const RCFG = {
  worker: { A: 50, B: 0, t: 6 }, barracks: { A: 150, B: 60, t: 18, hp: 900 }, tower: { A: 120, B: 90, t: 16, hp: 700, dps: 20, range: 6 },
  coreHp: 2000, coreDps: 30, coreRange: 6.5, tech: [{ A: 0, B: 0 }, { A: 250, B: 150, t: 25 }, { A: 550, B: 380, t: 35 }], techCore: [3, 6, 10],
  carry: 10, gatherT: 1.2, wSpeed: 1.7, supply: [24, 40, 60], aggro: 5,
};
const WORKER_SPR = { res: 'ingeniero', volt: 'reparador', nuw: 'cria_enjambre' };
const START = [[13, 43], [43, 13]];

const RDIFF = { easy: { inc: .8, first: 270, n: 'Fácil' }, normal: { inc: 1, first: 200, n: 'Normal' }, hard: { inc: 1.2, first: 130, n: 'Difícil' } };
function startRTS(fac, efac, auto, diff) {
  closeModal(); closePanel(); $('#title').style.display = 'none'; $('#hud').style.display = 'none'; $('#bhud').style.display = 'none';
  const S = [mkSide(0, fac), mkSide(1, efac)];
  RTS = { sides: S, ents: [], nextId: 1, t: 0, over: false, speed: 1, auto: !!auto, proj: [], rally: null, msg: 0, diff: RDIFF[diff || 'normal'] };
  S[1].inc = auto ? 1 : RTS.diff.inc; S[0].inc = 1;
  for (const sd of S) {
    const [cx, cy] = START[sd.i];
    addEnt({ side: sd.i, kind: 'core', x: cx - 2, y: cy - 2, s: 4, hp: RCFG.coreHp, max: RCFG.coreHp, done: 1 });
    for (let k = 0; k < 3; k++) addEnt(mkWorker(sd.i, sd.i ? cx - 2 - k * .5 : cx + 2 + k * .5, sd.i ? cy - 2 : cy + 2));
  }
  // nodos de recursos: junto a cada base y en el centro
  // nodos definidos por su centro y colocados en espejo exacto respecto al centro del mapa
  const node = (cx, cy, r, amt) => addEnt({ side: -1, kind: 'node', r, x: cx - 1, y: cy - 1, s: 2, amt, max: amt });
  const pair = (cx, cy, r, amt) => { node(cx, cy, r, amt); node(N - cx, N - cy, r, amt); };
  const [bx, by] = START[0];
  pair(bx + 6, by - 2, 'A', 3000); pair(bx + 6, by + 2, 'A', 3000); pair(bx - 2, by - 7, 'B', 2500); pair(bx + 2, by - 7, 'B', 2500);
  node(N / 2, N / 2, 'A', 4000); pair(N / 2 - 3, N / 2 + 3, 'B', 3000); pair(N / 2 - 7, N / 2 - 7, 'A', 2500);
  const [px, py] = iso(START[0][0], START[0][1]); cam.x = px; cam.y = py - 60; cam.z = Math.min(1, Math.max(.55, W / 1100));
  MODE = 'rts'; setWeather('clear'); FX = []; FLOAT = []; buildRtsHUD();
  banner('⚔️ Conquista', 'Obreros → recursos → cuartel → tropas → ¡destruye el Núcleo enemigo!');
}
function mkSide(i, fac) { return { i, fac, A: 300, B: 180, tech: 0, techT: 0, queue: [], army: 0, wave: 0, aiT: 0, attackAt: 10, building: 0, lost: 0, kills: 0 }; }
function mkWorker(side, x, y) { return { side, kind: 'worker', x, y, hp: 140, max: 140, carry: 0, state: 'go', node: null, gt: 0, vx: 0, vy: 1 }; }
function addEnt(e) { e.id = RTS.nextId++; e.cd = Math.random(); RTS.ents.push(e); return e; }
function sideOf(i) { return RTS.sides[i]; }
function ents(side, kind) { return RTS.ents.filter(e => !e.dead && e.side === side && (!kind || e.kind === kind)); }
function supplyUsed(i) { return ents(i, 'unit').reduce((a, e) => a + e.d.space, 0) + ents(i, 'worker').length + sideOf(i).queue.filter(q => q.k !== 'worker').reduce((a, q) => a + unitDef(sideOf(i).fac, q.k).space, 0); }
function supplyCap(i) { return RCFG.supply[sideOf(i).tech] + ents(i, 'barracks').filter(b => b.done >= 1).length * 10; }
function rtsUnits(i) { const sd = sideOf(i); return UNITS[sd.fac].map(u => unitDef(sd.fac, u[0])).filter(d => d.core <= RCFG.techCore[sd.tech]); }
const RFAC = { res: .97, volt: .9, nuw: 1.09 };
function unitCost(d, fac) { const m = RFAC[fac || (RTS && sideOf(0).fac)] || 1; return { A: Math.round((25 * d.space + 15) * m), B: Math.round(15 * d.space * m) }; }
function canPay(sd, c) { return sd.A >= (c.A || 0) && sd.B >= (c.B || 0); }
function payC(sd, c) { sd.A -= c.A || 0; sd.B -= c.B || 0; }
function rFindSpot(i, s) {
  const [cx, cy] = START[i];
  for (let r = 4; r < 14; r++) for (let k = 0; k < 40; k++) {
    const a = k / 40 * 6.283, m = i ? -1 : 1; const x = Math.round(cx + m * Math.cos(a) * r - s / 2), y = Math.round(cy + m * Math.sin(a) * r - s / 2);
    if (x < BORDER || y < BORDER || x + s > N - BORDER || y + s > N - BORDER) continue;
    if (RTS.ents.some(e => !e.dead && e.s && x < e.x + e.s + 1 && x + s + 1 > e.x && y < e.y + e.s + 1 && y + s + 1 > e.y)) continue;
    return [x, y];
  }
  return null;
}
// ---------- órdenes (jugador e IA) ----------
function rOrder(i, what, arg) {
  const sd = sideOf(i);
  if (what === 'worker') { const c = RCFG.worker; if (supplyUsed(i) >= supplyCap(i)) return 'Población al máximo'; if (!canPay(sd, c)) return 'Faltan recursos'; payC(sd, c); sd.queue.push({ k: 'worker', t: c.t }); return null; }
  if (what === 'barracks' || what === 'tower') {
    const c = RCFG[what]; if (!canPay(sd, c)) return 'Faltan recursos'; const sp = rFindSpot(i, 3); if (!sp) return 'No hay sitio';
    payC(sd, c); addEnt({ side: i, kind: what, x: sp[0], y: sp[1], s: 3, hp: c.hp * .2, max: c.hp, done: 0, bt: c.t }); return null;
  }
  if (what === 'tech') { if (sd.tech >= 2 || sd.techT > 0) return 'Ya al máximo'; const c = RCFG.tech[sd.tech + 1]; if (!canPay(sd, c)) return 'Faltan recursos'; payC(sd, c); sd.techT = c.t; return null; }
  if (what === 'unit') {
    const d = unitDef(sd.fac, arg); if (!ents(i, 'barracks').some(b => b.done >= 1)) return 'Necesitas un cuartel';
    if (supplyUsed(i) + d.space > supplyCap(i)) return 'Población al máximo'; const c = unitCost(d, sd.fac); if (!canPay(sd, c)) return 'Faltan recursos';
    payC(sd, c); sd.queue.push({ k: arg, t: 2 + d.space * 1.6 }); return null;
  }
  if (what === 'attack') { const tgt = ents(1 - i, 'core')[0]; for (const u of ents(i, 'unit')) u.order = tgt ? [tgt.x + 2, tgt.y + 2] : null; return null; }
  if (what === 'home') { const [cx, cy] = START[i]; for (const u of ents(i, 'unit')) u.order = [cx + (i ? -3 : 3), cy + (i ? 3 : -3)]; return null; }
  if (what === 'move') { for (const u of ents(i, 'unit')) u.order = arg; return null; }
}
// ---------- IA ----------
function rAI(i, dt) {
  const sd = sideOf(i); sd.aiT -= dt; if (sd.aiT > 0) return; sd.aiT = .8 + Math.random() * .6;
  const nW = ents(i, 'worker').length + sd.queue.filter(q => q.k === 'worker').length;
  const nB = ents(i, 'barracks').length, nT = ents(i, 'tower').length;
  if (nW < 6 + sd.tech * 2 && sd.queue.length < 2) { rOrder(i, 'worker'); return; }
  if (nB < 1 + sd.tech) { rOrder(i, 'barracks'); return; }
  if (RTS.t > 90 && nT < 1 + sd.tech) { if (!rOrder(i, 'tower')) return; }
  if (RTS.t > 100 * (sd.tech + 1) && sd.tech < 2 && Math.random() < .6) { if (!rOrder(i, 'tech')) return; }
  if (sd.queue.length < 3) { const av = rtsUnits(i); const pick = av[Math.floor(Math.random() * av.length)]; rOrder(i, 'unit', pick.key); }
  const army = ents(i, 'unit').reduce((a, e) => a + e.d.space, 0);
  // defensa: si hay enemigos cerca del núcleo
  const core = ents(i, 'core')[0]; if (!core) return;
  const near = ents(1 - i, 'unit').filter(e => Math.hypot(e.x - core.x - 2, e.y - core.y - 2) < 12).reduce((a, e) => a + e.d.space, 0);
  const threat = near > 0 && (near >= army * .6 || near >= 8);
  if (threat) { for (const u of ents(i, 'unit')) u.order = [core.x + 2, core.y + 2]; return; }
  if (!RTS.auto && i === 1 && RTS.t < RTS.diff.first) return;
  if (army >= sd.attackAt) { rOrder(i, 'attack'); sd.wave++; sd.attackAt = Math.min(supplyCap(i) - 4, 10 + sd.wave * 5); if (i === 1 && !RTS.auto) toast('⚠️ ¡El enemigo ataca!'); }
}
// ---------- simulación ----------
function rtsStep(dt) {
  const R = RTS; if (!R || R.over) return; R.t += dt;
  for (const sd of R.sides) {
    if (ents(sd.i, 'core').length) { sd.A += 2 * dt * sd.inc; sd.B += 1.2 * dt * sd.inc; }
    if (sd.techT > 0) { sd.techT -= dt; if (sd.techT <= 0) { sd.tech++; if (sd.i === 0) { toast(`⬆️ Tecnología ${sd.tech + 1}: nuevas tropas`, 'gold'); buildRtsHUD(); } } }
    const q = sd.queue[0]; const core = ents(sd.i, 'core')[0];
    if (q && core) {
      const fromB = q.k !== 'worker'; const src = fromB ? ents(sd.i, 'barracks').find(b => b.done >= 1) : core;
      if (src) { q.t -= dt; if (q.t <= 0) { sd.queue.shift(); const x = sd.i ? src.x - .3 : src.x + src.s + .3, y = sd.i ? src.y + src.s / 2 : src.y + src.s / 2;
        if (q.k === 'worker') addEnt(mkWorker(sd.i, x, y));
        else { const d = unitDef(sd.fac, q.k); const u = addEnt({ side: sd.i, kind: 'unit', d, fac: sd.fac, x, y, hp: d.hp, max: d.hp, vx: 0, vy: 1, order: R.rally && sd.i === 0 ? R.rally.slice() : null }); u.dmg = d.dps; } } }
    }
    if (sd.i === 1 || R.auto) rAI(sd.i, dt);
  }
  for (const e of R.ents) {
    if (e.dead) continue; e.cd -= dt;
    if ((e.kind === 'barracks' || e.kind === 'tower') && e.done < 1) { e.done = Math.min(1, e.done + dt / e.bt); e.hp = Math.min(e.max, e.hp + e.max * .8 * dt / e.bt); continue; }
    if (e.kind === 'worker') workerStep(e, dt);
    else if (e.kind === 'unit') unitStep(e, dt);
    else if (e.kind === 'tower' || e.kind === 'core') shooterStep(e, dt);
  }
  // separación
  const mob = R.ents.filter(e => !e.dead && (e.kind === 'unit' || e.kind === 'worker') && !(e.d && e.d.air));
  for (let a = 0; a < mob.length; a++) for (let b = a + 1; b < mob.length; b++) { const p = mob[a], q = mob[b]; const dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy; if (d2 < .12 && d2 > 1e-6) { const d = Math.sqrt(d2), k = (.35 - d) * .5 / d; p.x -= dx * k; p.y -= dy * k; q.x += dx * k; q.y += dy * k; } }
  // proyectiles
  R.proj = R.proj.filter(p => { const dx = p.tx - p.x, dy = p.ty - p.y, L = Math.hypot(dx, dy), st = 14 * dt; if (L <= st) { hitEnt(p.tgt, p.dmg, p.from); return false; } p.x += dx / L * st; p.y += dy / L * st; return true; });
  R.ents = R.ents.filter(e => !e.dead || e.kind === 'node');
  for (const i of [0, 1]) if (!ents(i, 'core').length) { R.over = true; rtsEnd(1 - i); }
  if (R.t > 1500 && !R.over) { R.over = true; const s0 = ents(0).reduce((a, e) => a + e.hp, 0), s1 = ents(1).reduce((a, e) => a + e.hp, 0); rtsEnd(s0 >= s1 ? 0 : 1); }
}
function moveTo(e, tx, ty, sp, dt) { const dx = tx - e.x, dy = ty - e.y, L = Math.hypot(dx, dy) || 1; const m = Math.min(L, sp * dt); e.x += dx / L * m; e.y += dy / L * m; e.vx = dx; e.vy = dy; return L; }
function workerStep(w, dt) {
  const sd = sideOf(w.side), core = ents(w.side, 'core')[0]; if (!core) return;
  // huir si hay enemigos encima
  if (!w.node || w.node.amt <= 0) { const ws = ents(w.side, 'worker'); const onB = ws.filter(o => o.node && o.node.r === 'B').length, onA = ws.filter(o => o.node && o.node.r === 'A').length;
    const wantR = (sd.B + 1) * 1.7 < sd.A ? 'B' : sd.A < (sd.B + 1) * 1.2 ? 'A' : (onB < (onA + onB) * .4 ? 'B' : 'A');
    let best = null, bd = 1e9; for (const n of RTS.ents) if (n.kind === 'node' && n.amt > 0) { const pref = wantR === n.r ? 0 : 8; const d = Math.hypot(n.x + 1 - core.x - 2, n.y + 1 - core.y - 2) + pref; if (d < bd) { bd = d; best = n; } } w.node = best; if (!best) return; }
  if (w.carry >= RCFG.carry || (w.carry > 0 && w.node.amt <= 0)) {
    const L = moveTo(w, core.x + 2, core.y + 2, RCFG.wSpeed, dt); if (L < 2.6) { sd[w.cr] += w.carry * sd.inc; w.node = null; if (w.side === 0 && Math.random() < .25) FLOAT.push({ x: core.x + 2, y: core.y + 2, txt: '+' + w.carry, col: w.cr === 'A' ? '#7ff3ff' : '#ffb347', t: 0 }); w.carry = 0; }
    return;
  }
  const n = w.node, L = moveTo(w, n.x + 1, n.y + 1, RCFG.wSpeed, L0(w, n) < 1.6 ? 0 : dt);
  if (L0(w, n) < 1.6) { w.gt += dt; if (w.gt >= RCFG.gatherT) { w.gt = 0; const g = Math.min(RCFG.carry, n.amt); n.amt -= g; w.carry = g; w.cr = n.r; } }
}
function L0(a, n) { return Math.hypot(a.x - n.x - 1, a.y - n.y - 1); }
function enemiesNear(e, r) {
  let best = null, bd = 1e9;
  for (const o of RTS.ents) { if (o.dead || o.side === e.side || o.side < 0) continue; if (e.d && !e.d.air && o.d && o.d.air && e.d.range < 2) continue;
    const d = o.s ? rectD(e, o) : Math.hypot(o.x - e.x, o.y - e.y); const pr = o.kind === 'unit' ? 0 : o.kind === 'tower' ? 1 : o.kind === 'worker' ? 2 : 3; const sc = d + pr * 1.2;
    if (d < r && sc < bd) { bd = sc; best = o; } }
  return best;
}
function rectD(e, o) { const dx = Math.max(o.x - e.x, 0, e.x - (o.x + o.s)), dy = Math.max(o.y - e.y, 0, e.y - (o.y + o.s)); return Math.hypot(dx, dy); }
function unitStep(u, dt) {
  const d = u.d; let tgt = u.tgt && !u.tgt.dead ? u.tgt : null;
  if (!tgt || Math.random() < .05) tgt = u.tgt = enemiesNear(u, RCFG.aggro + d.range);
  if (d.tgt === 'heal') { const f = ents(u.side, 'unit').find(o => o !== u && o.hp < o.max && Math.hypot(o.x - u.x, o.y - u.y) < 4); if (f && u.cd <= 0) { u.cd = 1; f.hp = Math.min(f.max, f.hp + d.ex.heal); } if (u.order) moveTo(u, u.order[0], u.order[1], d.speed, dt); return; }
  if (tgt) {
    const dist = tgt.s ? rectD(u, tgt) : Math.hypot(tgt.x - u.x, tgt.y - u.y);
    if (dist <= d.range + .3) { if (u.cd <= 0) { u.cd = 1; const tx = tgt.s ? tgt.x + tgt.s / 2 : tgt.x, ty = tgt.s ? tgt.y + tgt.s / 2 : tgt.y;
        if (d.range > 1.5) RTS.proj.push({ x: u.x, y: u.y, tx, ty, tgt, dmg: u.dmg, from: u, col: PCOL[u.fac] }); else hitEnt(tgt, u.dmg, u);
        if (d.ex.splash) for (const o of RTS.ents) if (!o.dead && o.side === tgt.side && o !== tgt && Math.hypot((o.s ? o.x + o.s / 2 : o.x) - tx, (o.s ? o.y + o.s / 2 : o.y) - ty) < d.ex.splash) hitEnt(o, u.dmg * .6, u);
        if (d.ex.kamikaze) { for (const o of RTS.ents) if (!o.dead && o.side === tgt.side && Math.hypot((o.s ? o.x + o.s / 2 : o.x) - u.x, (o.s ? o.y + o.s / 2 : o.y) - u.y) < 1.8) hitEnt(o, d.ex.kamikaze, u); u.dead = true; fxAt(u.x, u.y, 'acido', .6, 90, 0); } }
      return; }
    moveTo(u, tgt.s ? tgt.x + tgt.s / 2 : tgt.x, tgt.s ? tgt.y + tgt.s / 2 : tgt.y, d.speed, dt); return;
  }
  if (u.order) { if (moveTo(u, u.order[0], u.order[1], d.speed, dt) < .5) u.order = null; }
}
function shooterStep(e, dt) {
  const range = e.kind === 'core' ? RCFG.coreRange : RCFG.tower.range, dps = e.kind === 'core' ? RCFG.coreDps : RCFG.tower.dps;
  if (e.cd > 0) return; const c = { x: e.x + e.s / 2, y: e.y + e.s / 2 }; let best = null, bd = 1e9;
  for (const o of RTS.ents) if (!o.dead && o.side === 1 - e.side && (o.kind === 'unit' || o.kind === 'worker')) { const d = Math.hypot(o.x - c.x, o.y - c.y); if (d < range && d < bd) { bd = d; best = o; } }
  if (!best) return; e.cd = 1; RTS.proj.push({ x: c.x, y: c.y, tx: best.x, ty: best.y, tgt: best, dmg: dps * (1 + .3 * sideOf(e.side).tech), from: e, col: PCOL[sideOf(e.side).fac] });
}
function hitEnt(o, dmg, from) {
  if (!o || o.dead) return; if (o.s && from && from.kind === 'unit') dmg *= 2; o.hp -= dmg;
  if (o.hp <= 0) { o.dead = true; if (from && from.side >= 0) sideOf(from.side).kills++; if (o.side >= 0) sideOf(o.side).lost++;
    const cx = o.s ? o.x + o.s / 2 : o.x, cy = o.s ? o.y + o.s / 2 : o.y; fxAt(cx, cy, 'explosion_energia', .6, o.s ? o.s * 50 : 50, 0);
    if (o.kind === 'core' && o.side === 1 && !RTS.auto) banner('⭐ ¡Núcleo enemigo destruido!', ''); }
}
function rtsEnd(win) {
  RTS.winner = win; if (RTS.auto) return;
  const reward = win === 0 ? 30 : 5; PROFILE.gems += reward; saveProfile();
  const S0 = sideOf(0);
  openModal(`<h2>${win === 0 ? '¡Victoria!' : 'Derrota'}</h2><div class="bigstars">${win === 0 ? '🏆' : '💥'}</div>
    <p>Duración ${fmtT(RTS.t)} · bajas enemigas ${S0.kills} · tus bajas ${S0.lost}</p><div class="rew"><span>💎 +${reward}</span></div>
    <button class="btn big" onclick="closeModal();RTS=null;showTitle()">Volver</button>`);
}
// ---------- dibujo ----------
function drawRTS(dt) {
  const R = RTS; drawGround(sideOf(0).fac);
  const list = R.ents.filter(e => !e.dead || e.kind === 'node').slice().sort((a, b) => (a.x + a.y + (a.s || 0) * 1.5 + (a.d && a.d.air ? 60 : 0)) - (b.x + b.y + (b.s || 0) * 1.5 + (b.d && b.d.air ? 60 : 0)));
  const now = performance.now();
  if (R.rally) { const [a, b] = iso(R.rally[0], R.rally[1]); const [sx, sy] = toScreen(a, b); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy, 16 * cam.z, 8 * cam.z, 0, 0, 7); ctx.stroke(); }
  for (const e of list) {
    if (e.kind === 'node') { if (e.amt <= 0) continue; const k = .55 + .45 * e.amt / e.max; drawSprite(`comun/obstaculos/${e.r === 'A' ? 'roca_cristal' : 'chatarra'}`, e.x + 1.5, e.y + 1.5, 110 * k); continue; }
    const fac = e.side >= 0 ? sideOf(e.side).fac : 'res';
    if (e.s) {
      const key = e.kind === 'core' ? `${FACTIONS[fac].coreBase}_n${pad2([1, 4, 7][sideOf(e.side).tech])}` : bSprite(fac, { t: e.kind === 'tower' ? 'd1' : 'barracks', lv: e.kind === 'tower' ? 1 + sideOf(e.side).tech * 4 : 1 + sideOf(e.side).tech * 4 });
      const r = drawOnTile(key, e.x, e.y, e.s, { alpha: e.done < 1 ? .5 : 1, filter: e.side === 1 ? 'drop-shadow(0 0 4px #f33)' : null });
      if (r) { if (e.done < 1) hpBar(r[0] + r[2] / 2, r[1] - 6, 50, e.done, '#4ec3ff'); else if (e.hp < e.max) hpBar(r[0] + r[2] / 2, r[1] - 6, 60, e.hp / e.max, e.side ? '#ff5d5d' : null); }
      continue;
    }
    const spr = e.kind === 'worker' ? WORKER_SPR[fac] : e.d.sprite; const front = (e.vx + e.vy) >= -0.05;
    const key = `${FACTIONS[fac].atlas}/tropas/${spr}_${front ? 'frente' : 'espalda'}`; const s = S(key); if (!s) continue;
    const hgt = e.kind === 'worker' ? 40 : e.d.space >= 10 ? 96 : e.d.space >= 5 ? 72 : e.d.space >= 3 ? 60 : 48;
    const air = e.d && e.d.air; const bob = air ? 44 : Math.abs(Math.sin(now / 120 + e.id)) * 3;
    const rr = drawSprite(key, e.x, e.y, Math.min(hgt * s.w / s.h, hgt * 1.6), { flip: (e.vx - e.vy) < 0, lift: bob, filter: e.side === 1 ? 'drop-shadow(0 0 3px #f33)' : 'drop-shadow(0 0 3px #4ec3ff)' });
    if (rr && e.kind === 'worker' && e.carry) { ctx.font = '14px system-ui'; ctx.textAlign = 'center'; ctx.fillText(e.cr === 'A' ? '💎' : '⚙️', rr[0] + rr[2] / 2, rr[1]); }
    if (rr && e.hp < e.max) hpBar(rr[0] + rr[2] / 2, rr[1] - 4, 22, e.hp / e.max, e.side ? '#ff5d5d' : null);
  }
  for (const p of R.proj) { const [a, b] = iso(p.x, p.y); const [sx, sy] = toScreen(a, b); ctx.fillStyle = p.col; ctx.shadowColor = p.col; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(sx, sy - 20 * cam.z, 3.5 * cam.z, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
  drawFX(dt);
}
// ---------- HUD ----------
function buildRtsHUD() {
  const sd = sideOf(0), F = FACTIONS[sd.fac], h = $('#bhud'); h.style.display = 'block';
  const units = rtsUnits(0).map(d => { const c = unitCost(d, sd.fac); return `<button class="card" onclick="rtsCmd('unit','${d.key}')" title="${d.name}"><img src="${spriteURL(`${F.atlas}/tropas/${d.sprite}_frente`, 56)}"><em>💎${c.A} ⚙️${c.B}</em></button>`; }).join('');
  h.innerHTML = `<div class="btop"><div class="bst"><b id="rRes"></b><small id="rPop"></small></div><div class="btime" id="rTime">0:00</div>
    <div class="bloot"><span id="rEnemy"></span><button class="btn ghost" style="pointer-events:auto" onclick="RTS.speed=RTS.speed===1?2:RTS.speed===2?4:1;this.textContent='⏩ x'+RTS.speed">⏩ x1</button><button class="btn ghost" style="pointer-events:auto" onclick="RTS.over=true;RTS=null;showTitle()">🏳️ Salir</button></div></div>
    <div class="bbot" style="flex-direction:column;align-items:stretch">
      <div class="cards">
        <button class="card" onclick="rtsCmd('worker')"><img src="${spriteURL(`${F.atlas}/tropas/${WORKER_SPR[sd.fac]}_frente`, 56)}"><em>Obrero 💎50</em></button>
        <button class="card" onclick="rtsCmd('barracks')"><img src="${spriteURL(bSprite(sd.fac, { t: 'barracks', lv: 1 }), 56)}"><em>Cuartel</em></button>
        <button class="card" onclick="rtsCmd('tower')"><img src="${spriteURL(bSprite(sd.fac, { t: 'd1', lv: 1 }), 56)}"><em>Torre</em></button>
        <button class="card" onclick="rtsCmd('tech')"><span style="font-size:30px">⬆️</span><em id="rTech">Tecno</em></button>
        ${units}</div>
      <div class="cards" style="justify-content:center"><button class="btn" onclick="rtsCmd('attack')">⚔️ Atacar núcleo</button><button class="btn ghost" onclick="rtsCmd('home')">🛡️ Volver a casa</button><button class="btn ghost" onclick="RTS.rally=null;toast('Toca el mapa para mover el ejército')">📍 Mover</button></div></div>`;
}
function rtsCmd(w, a) { const e = rOrder(0, w, a); if (e) toast(e); else if (w === 'attack') toast('⚔️ ¡Al ataque!'); }
function updateRtsHUD() {
  const sd = sideOf(0), e = sideOf(1); if (!$('#rRes')) return;
  $('#rRes').textContent = `💎 ${Math.floor(sd.A)}   ⚙️ ${Math.floor(sd.B)}`;
  $('#rPop').textContent = `👥 ${supplyUsed(0)}/${supplyCap(0)} · 👷 ${ents(0, 'worker').length} · cola ${sd.queue.length}`;
  $('#rTime').textContent = Math.floor(RTS.t / 60) + ':' + pad2(Math.floor(RTS.t % 60));
  $('#rEnemy').textContent = `${FACTIONS[e.fac].name}: ⚔️ ${ents(1, 'unit').length}`;
  const c = RCFG.tech[sd.tech + 1]; $('#rTech').textContent = sd.techT > 0 ? `⏱️ ${Math.ceil(sd.techT)}s` : c ? `💎${c.A} ⚙️${c.B}` : 'Máx';
}
function rtsTap(tx, ty) { if (!RTS || RTS.over) return; RTS.rally = [tx, ty]; rOrder(0, 'move', [tx, ty]); }
function openConquest() {
  openModal(`<h2>⚔️ Conquista</h2><p>Partida en tiempo real contra la IA: tus obreros recogen 💎 cristal y ⚙️ chatarra, construyes cuarteles y torres, entrenas tropas y destruyes el Núcleo enemigo.</p>
    <h3>Tu facción</h3><div class="opts">${FAC_IDS.map(f => `<div class="opt" onclick="CQ_F='${f}';openConquest2()"><img src="${spriteURL(FACTIONS[f].emblem, 100)}"><b>${FACTIONS[f].name}</b></div>`).join('')}</div>
    <button class="btn ghost" onclick="closeModal()">Cerrar</button>`, 'wide');
}
let CQ_F = 'res', CQ_E = 'volt';
function openConquest3() { openModal(`<h2>Dificultad</h2><div class="opts">${Object.entries(RDIFF).map(([k, d]) => `<div class="opt" onclick="startRTS(CQ_F,CQ_E,false,'${k}')"><span style="font-size:40px">${k === 'easy' ? '🙂' : k === 'normal' ? '😠' : '💀'}</span><b>${d.n}</b><small>Primer ataque enemigo hacia el minuto ${Math.round(d.first / 60 * 10) / 10}</small></div>`).join('')}</div><button class="btn ghost" onclick="openConquest2()">Atrás</button>`, 'wide'); }
function openConquest2() {
  openModal(`<h2>Rival</h2><div class="opts">${FAC_IDS.filter(f => f !== CQ_F).map(f => `<div class="opt" onclick="CQ_E='${f}';openConquest3()"><img src="${spriteURL(FACTIONS[f].emblem, 100)}"><b>${FACTIONS[f].name}</b></div>`).join('')}</div><button class="btn ghost" onclick="openConquest()">Atrás</button>`, 'wide');
}
