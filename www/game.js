// ===== estado, economía y base =====
'use strict';
const SAVE_KEY = 'tww_profile_v1';
let PROFILE = null;     // { gems, name, speed, slots:{res,volt,nuw} }
let G = null;           // partida activa (slot)
let MODE = 'title';     // title | base | battle
const pad2 = n => String(n).padStart(2, '0');

function newSlot(fac) {
  const s = { fac, core: 1, A: 1500, B: 1500, C: 0, buildings: [], nextId: 1, army: {}, trophies: 0, campaign: {}, created: Date.now(), wx: 'clear', mapN: N, deco: 40, tlv: {}, txp: {}, research: null };
  const add = (t, x, y, lv = 1, extra = {}) => { s.buildings.push(Object.assign({ id: s.nextId++, t, lv, x, y, acc: 0, last: Date.now() }, extra)); };
  const c = N / 2 - 2;
  add('core', c, c);
  // distribución inicial en casillas (c = 26, el Núcleo ocupa 26-29)
  add('prodA', c - 4, c); add('prodB', c + 6, c); add('storA', c, c - 4); add('storB', c, c + 6);
  add('camp', c - 4, c + 6); add('barracks', c + 6, c + 6); add('d1', c - 4, c - 4); add('d1', c + 6, c - 4); add('hut', c + 4, c - 8);
  const r = rng(fac.length * 977 + Date.now() % 1000);
  const obst = [[7, 8], [45, 10], [9, 45], [47, 47], [16, 49], [49, 27], [5, 27], [33, 5], [22, 42], [42, 18], [11, 17], [40, 40], [26, 9], [9, 34], [48, 36], [30, 48]];
  for (const [x, y] of obst) add('obst', x, y, 1, { k: OBST[Math.floor(r() * OBST.length)] });
  normalizeLayout(s.buildings);
  const decos = DECOS[fac]; let di = 0;
  for (const [x, y] of [[c - 8, c - 6], [c + 10, c - 6], [c - 8, c + 10], [c + 10, c + 10], [c + 2, c - 10], [c - 10, c + 2]]) {
    const g = occupied(s.buildings); let ok = true; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (g[(y + j) * N + x + i]) ok = false;
    if (ok) add('deco', x, y, 1, { k: decos[di++ % 4] });
  }
  normalizeLayout(s.buildings);
  return s;
}
function loadProfile() {
  try { PROFILE = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { PROFILE = null; }
  if (!PROFILE) PROFILE = { gems: 500, name: 'Comandante', speed: 60, slots: {} };
}
function saveProfile() { try { if (G) PROFILE.slots[G.fac] = G; localStorage.setItem(SAVE_KEY, JSON.stringify(PROFILE)); } catch (e) { } }

// ---------- reglas de economía ----------
function tierOf(t, L) { if (t === 'core') return L - 1; const mx = BT[t][4]; for (let h = 0; h < 10; h++) if (mx[h] >= L) return h; return 9; }
function firstLvOfTier(t, tier) { return tier > 0 ? BT[t][4][tier - 1] + 1 : 1; }
function facCostMul(f) { return f === 'volt' ? 1.10 : f === 'nuw' ? 1.05 : 1; }
function facTimeMul(f) { return f === 'nuw' ? 0.85 : 1; }
function costOf(t, L) { // coste para llegar al nivel L
  if (t === 'core') return { r: 'A', n: Math.round(HQC[L - 1] * facCostMul(G.fac)) };
  if (t === 'wall') return { r: 'A', n: Math.round(40 * Math.pow(2.05, L - 1)) };
  if (t === 'deco') return { r: 'A', n: 250 * G.core };
  if (t === 'hut') return { r: 'A', n: 0 };
  const tier = tierOf(t, L), b = BT[t];
  return { r: b[0], n: Math.round(CC[tier] * b[1] * (1 + 0.15 * (L - firstLvOfTier(t, tier))) * facCostMul(G.fac) * (b[0] === 'C' ? 0.1 : 1)) };
}
function timeOf(t, L) { // segundos
  let h;
  if (t === 'core') h = HQT[L - 1];
  else if (t === 'wall' || t === 'deco' || t === 'hut') return 0;
  else { const tier = tierOf(t, L), b = BT[t]; h = TT[tier] * b[2] * (1 + 0.15 * (L - firstLvOfTier(t, tier))); }
  return h * 3600 * facTimeMul(G.fac) / PROFILE.speed;
}
function maxLevel(t, core = G.core) { if (t === 'core') return 10; if (t === 'wall') return WALLS.max[core - 1]; if (t === 'hut' || t === 'deco' || t === 'obst') return 1; return BT[t][4][core - 1]; }
function maxCount(t, core = G.core) { if (t === 'core') return 1; if (t === 'wall') return WALLS.count[core - 1]; if (t === 'hut') return 1; if (t === 'deco') return 40; return BT[t][3][core - 1]; }
function countOf(t) { return G.buildings.filter(b => b.t === t).length; }
function unlockCore(t) { if (t === 'wall') return 2; if (t === 'deco' || t === 'hut') return 1; for (let h = 0; h < 10; h++) if (BT[t][3][h] > 0) return h + 1; return 11; }
function builders() { return BUILDERS[G.core - 1] + (G.fac === 'res' && G.core >= 5 ? 1 : 0); }
function busyCount() { return G.buildings.filter(b => b.busy).length; }
// cámara acorazada del Núcleo: esta parte nunca se puede robar
function protCap(r) { return Math.round(storeCap(r) * (0.10 + 0.015 * G.core + (hasB('silo') ? 0.10 : 0))); }
function hasB(t) { return !!(G && G.buildings.some(b => b.t === t && b.lv > 0)); }
function shieldLeft() { return Math.max(0, ((G.shield || 0) - Date.now()) / 1000); }
function storeCap(r) {
  if (r === 'C') return Math.round(storeCap('A') * 0.12);
  let cap = 1500 * Math.pow(2, G.core - 1);
  for (const b of G.buildings) if (b.t === (r === 'A' ? 'storA' : 'storB') && !(b.busy && b.lv === 0)) cap += 2500 * Math.pow(1.8, Math.max(1, b.lv) - 1);
  return cap;
}
function prodRate(b) { // por segundo
  const mul = (G.fac === 'volt' ? 1.15 : 1) * (b.t === 'prodC' ? 0.1 : 1);
  return 150 * Math.pow(1.32, b.lv - 1) * mul * PROFILE.speed / 3600;
}
function prodCap(b) { return prodRate(b) * 3600 * 2.5 / PROFILE.speed * Math.max(1, PROFILE.speed / 60); }
function campCap() { let c = 0; for (const b of G.buildings) if (b.t === 'camp' && b.lv > 0) c += 10 + b.lv * 5; return c; }
function armyUsed() { let u = 0; for (const k in G.army) { const d = unitDef(G.fac, k); if (d) u += d.space * G.army[k]; } return u; }
// ---------- niveles y maestría de tropas ----------
function troopLv(k) { G.tlv = G.tlv || {}; return k === 'HERO' ? heroLevel() : (G.tlv[k] || 1); }
function heroLevel() { const b = G.buildings.find(b => b.t === 'hero'); return b ? Math.max(1, b.lv) : 1; }
function troopMax(k) { if (k === 'HERO') return 5; return Math.min(TROOP_MAX[G.core - 1], labLevel() + 2); }
function rank(k) { G.txp = G.txp || {}; const xp = G.txp[k] || 0; let r = 0; for (let i = 0; i < MASTERY.length; i++) if (xp >= MASTERY[i].xp) r = i; return r; }
function perks(k) { G.tperk = G.tperk || {}; return G.tperk[k] || []; }
function troopStats(k) { // multiplicadores {hp,dmg,spd}
  const base = Math.pow(k === 'HERO' ? 1.15 : TROOP_STEP, troopLv(k) - 1); const m = { hp: base, dmg: base, spd: 1 };
  for (const p of perks(k)) { if (p === 'spd') m.spd += PERKS.spd.v; else m[p] *= 1 + PERKS[p].v; }
  if (rank(k) >= 4) { m.hp *= 1.05; m.dmg *= 1.05; m.spd += .05; }
  return m;
}
function troopMul(k) { const s = troopStats(k); return Math.sqrt(s.hp * s.dmg); }
function pendingPerk(k) { const r = rank(k); return Math.min(r, 3) > perks(k).length; }
function choosePerk(k, p) { if (!pendingPerk(k)) return; G.tperk[k] = perks(k).concat(p); saveProfile(); }
function researchCost(L) { const n = Math.round(CC[Math.min(9, L - 1)] * 0.6 * facCostMul(G.fac)); return L >= 7 ? { r: 'C', n: Math.round(n * 0.1) } : { r: 'B', n }; }
function researchTime(L) { return TT[Math.min(9, L - 1)] * 1.1 * 3600 * (G.fac === 'nuw' ? 0.85 : 1) / PROFILE.speed; }
function startResearch(k) {
  if (!labLevel()) { toast('Construye el laboratorio primero.'); return; }
  if (G.research) { toast('El laboratorio ya está investigando.'); return; }
  const to = troopLv(k) + 1; if (to > troopMax(k)) { toast(`Mejora el laboratorio o el ${bName(G.fac, 'core')} para subir más.`); return; }
  const c = researchCost(to); if (!pay(c)) { toast(`Te faltan ${fmtN(c.n - G[c.r])} de ${resName(c.r)}.`); return; }
  const t = researchTime(to) * 1000; G.research = { k, to, until: Date.now() + t, total: t }; saveProfile(); refreshHUD(); openLab();
}
function finishResearch() { const R = G.research; if (!R) return; G.tlv[R.k] = R.to; G.research = null; const d = unitDef(G.fac, R.k); toast(`🧪 ${d.name} → nivel ${R.to}`, 'gold'); saveProfile(); if ($('#panel').classList.contains('open') && $('#panel').dataset.view === 'lab') openLab(); }
function addXP(k, n) {
  if (hasB('arena')) n = Math.round(n * 1.5);
  G.txp = G.txp || {}; const r0 = rank(k); G.txp[k] = (G.txp[k] || 0) + n; const r1 = rank(k);
  if (r1 > r0) { const M = MASTERY[r1]; PROFILE.gems += M.gems; return `${M.icon} ${k === 'HERO' ? HEROES[G.fac].name : unitDef(G.fac, k).name}: rango ${M.name} (+${M.gems} 💎)${r1 <= 3 ? ' · elige especialización en el Laboratorio' : ' · +5 % a todo'}`; }
  return null;
}
function labLevel() { const b = G.buildings.find(b => b.t === 'lab'); return b ? b.lv : 0; }
function heroAvailable() { return G.buildings.some(b => b.t === 'hero' && b.lv > 0); }

// skin activo: 0 normal, 1 élite, 2 élite variante de color
function skinSpr(fac, key, spr) {
  const v = typeof G !== 'undefined' && G && G.fac === fac && G.skins ? +G.skins[key] || 0 : 0; if (!v) return spr;
  const p = v === 3 ? 'elite3_' : v === 2 ? 'elite2_' : 'elite_'; return S(`${FACTIONS[fac].atlas}/tropas/${p}${spr}_frente`) ? p + spr : spr;
}
function unitDef(fac, key) {
  if (key === 'HERO2') { const h = HEROES2[fac]; return { key: 'HERO2', sprite: skinSpr(fac, 'HERO2', h.sprite), name: h.name, role: 'Héroe', space: 0, hp: h.hp, dps: h.dps, speed: h.speed, range: h.range, air: false, tgt: 'any', ex: {}, core: 9, hero: true }; }
  if (key === 'PATROL') { const p = PATROL[fac]; return { key: 'PATROL', sprite: 'nave_patrulla', name: p.name, role: 'Patrulla', space: 0, hp: p.hp, dps: p.dps, speed: p.speed, range: p.range, air: true, tgt: 'any', ex: {}, core: 6 }; }
  if (key === 'HERO') { const h = HEROES[fac]; return { key: 'HERO', sprite: skinSpr(fac, 'HERO', h.sprite), name: h.name, role: 'Héroe', space: 0, hp: h.hp, dps: h.dps, speed: h.speed, range: h.range, air: false, tgt: 'any', ex: {}, core: 7, hero: true }; }
  const u = UNITS[fac].find(u => u[0] === key); if (!u) return null;
  return { key: u[0], sprite: skinSpr(fac, u[0], u[0]), name: u[1], role: u[2], space: u[3], hp: u[4], dps: u[5], speed: u[6], range: u[7], air: u[8], tgt: u[9], ex: u[10], core: u[11] };
}
function bName(fac, t) { if (t === 'core') return { res: 'Cuartel General', volt: 'Reactor Central', nuw: 'Corazón de la Colmena' }[fac]; if (t === 'wall') return 'Muro'; if (t === 'deco') return 'Decoración'; if (t === 'obst') return 'Obstáculo'; return BNAMES[fac][t][1]; }
function bSprite(fac, b) {
  const F = FACTIONS[fac], at = F.atlas, lv = Math.max(1, b.lv);
  if (typeof G !== 'undefined' && G && fac === G.fac && G.bskin && G.bskin[b.t] && ED_MAP[fac] && ED_MAP[fac][b.t]) return `${at}/economia/ed_${ED_MAP[fac][b.t]}`;
  if (b.t === 'core') return `${F.coreBase}_n${pad2(lv)}`;
  if (b.t === 'wall') return `comun/muros/muro${pad2(lv)}_${WALL_MAT[lv - 1]}`;
  if (b.t === 'deco' && b.k && b.k.startsWith('liga:')) { const i = +b.k.slice(5); return S(`comun/ligas/bandera_${i}`) ? `comun/ligas/bandera_${i}` : 'comun/temporada/bandera_victoria'; }
  if (b.t === 'deco') return b.k && b.k.includes('/') ? b.k : `${at}/decoracion/${b.k}`;
  if (b.t === 'obst') return `comun/obstaculos/${b.k}`;
  let base = BNAMES[fac][b.t][0]; const st = LVSTYLE[b.t]; if (b.t === 'prodC' && S(`${at}/economia/extractor_n01`)) base = 'extractor';
  const pick = arr => arr.filter(x => x <= lv).pop();
  if (st === 'L4') return `${at}/economia/${base}_n${pad2(pick([1, 5, 10, 15]))}`;
  if (st === 'L3') return `${at}/economia/${base}_n${pad2(pick([1, 5, 10]))}`;
  if (st === 'L2') return `${at}/economia/${base}_n${pad2(pick([1, 5]))}`;
  if (st === 'L1') return (b.t.startsWith('trap') ? `${at}/defensas/` : `${at}/economia/`) + base;
  if (st === 'L3p') return `${at}/defensas/${base}_n${lv >= 5 ? '10' : lv >= 3 ? '05' : '01'}`;
  if (st === 'L2d') return `${at}/defensas/${base}_n${pad2(pick([1, 5]))}`;
  if (st === 'L1d') return `${at}/defensas/${base}`;
  if (st === 'U') return `${at}/defensas/${base}_n${lv < 3 ? '01' : lv < 5 ? '03' : '05'}`;
  if (st === 'D') {
    if (lv < 5) return `${at}/defensas/${base}_n01`;
    if (lv < 10) return `${at}/defensas/${base}_n05${b.br1 || 'A'}`;
    if (lv < 15) return `${at}/defensas/${base}_n10${b.br2 || b.br1 || 'A'}`;
    return `${at}/defensas/${base}_n15${b.br2 || b.br1 || 'A'}`;
  }
}
function isDefense(t) { return /^d\d$|^ult$/.test(t); }
function isDefLike(t) { return isDefense(t) || t === 'patrol' || t === 'radar' || t === 'weather'; }
let HP_STEP = 1.15, DEF_STEP = 1.14;
function bHP(t, lv) { const base = (DEFSTAT[t] && DEFSTAT[t].hp) || (ECOSTAT[t] && ECOSTAT[t].hp) || 300; return base * Math.pow(t === 'wall' ? 1.45 : HP_STEP, lv - 1); }

// ---------- ocupación / colocación ----------
function occupied(list, skipId) {
  const g = new Int32Array(N * N);
  for (const b of list) { if (b.id === skipId) continue; const s = SIZE[b.t]; for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) { const x = b.x + i, y = b.y + j; if (x >= 0 && y >= 0 && x < N && y < N) g[y * N + x] = b.id; } }
  return g;
}
function canPlace(t, x, y, skipId) {
  const s = SIZE[t]; if (x < BORDER || y < BORDER || x + s > N - BORDER || y + s > N - BORDER) return false;
  const g = occupied(G.buildings, skipId);
  for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) if (g[(y + j) * N + x + i]) return false;
  return true;
}
// coloca todo en la rejilla de casillas y separa lo que se solape (partidas nuevas y antiguas)
function normalizeLayout(list) {
  const keep = [], isBig = b => b.t === 'core';
  const rank = b => b.t === 'core' ? 0 : b.t === 'wall' ? 2 : b.t === 'deco' || b.t === 'obst' ? 3 : 1; const sorted = [...list].sort((a, b) => rank(a) - rank(b));
  const g = new Int32Array(N * N); const fits = (b, x, y) => { const s = SIZE[b.t]; if (x < BORDER || y < BORDER || x + s > N - BORDER || y + s > N - BORDER) return false; for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) if (g[(y + j) * N + x + i]) return false; return true; };
  for (const b of sorted) {
    const st = b.t === 'wall' ? 1 : CELL; let x0 = b.t === 'wall' ? Math.round(b.x) : snapC(b.x), y0 = b.t === 'wall' ? Math.round(b.y) : snapC(b.y), done = false;
    for (let r = 0; r < N && !done; r += st) for (let dx = -r; dx <= r && !done; dx += st) for (let dy = -r; dy <= r && !done; dy += st) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = x0 + dx, y = y0 + dy;
      if (fits(b, x, y)) { b.x = x; b.y = y; const s = SIZE[b.t]; for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) g[(y + j) * N + x + i] = 1; done = true; }
    }
    if (done) keep.push(b);
  }
  list.length = 0; list.push(...keep); return list;
}
function findSpot(t) {
  const s = SIZE[t], c = N / 2;
  for (let r = 0; r < N; r++) for (let k = 0; k < 64; k++) {
    const a = k / 64 * Math.PI * 2; const x = snapC(c + Math.cos(a) * r - s / 2), y = snapC(c + Math.sin(a) * r - s / 2);
    if (canPlace(t, x, y)) return [x, y];
  }
  return null;
}

// ---------- tick de la base ----------
function baseTick() {
  if (!G) return;
  const now = Date.now();
  for (const b of G.buildings) {
    if (b.busy && now >= b.busy.until) finishBusy(b);
    if (G.research && now >= G.research.until) finishResearch();
    if ((b.t === 'prodA' || b.t === 'prodB' || b.t === 'prodC') && b.lv > 0 && !b.busy) {
      const dt = (now - (b.last || now)) / 1000; b.acc = Math.min(prodCap(b), (b.acc || 0) + prodRate(b) * dt);
    }
    b.last = now;
  }
}
function finishBusy(b) {
  const to = b.busy.to; b.busy = null; b.lv = to;
  if (b.t === 'patrol' && !b.route) b.route = defaultRoute(b);
  if (b.t === 'core') { G.core = to; toast(`¡${bName(G.fac, 'core')} nivel ${to}! Nuevos edificios desbloqueados.`, 'gold'); fxAt(b.x + 2, b.y + 2, 'subida_nivel'); }
  else { toast(`${bName(G.fac, b.t)} → nivel ${to}`); fxAt(b.x + SIZE[b.t] / 2, b.y + SIZE[b.t] / 2, 'subida_nivel'); }
  saveProfile(); refreshHUD();
  if (b.t.match(/^d\d$/) && (to === 5 && !b.br1 || to === 10 && !b.br2)) openBranch(b);
}
function collect(b) {
  const r = b.t === 'prodA' ? 'A' : b.t === 'prodC' ? 'C' : 'B'; const cap = storeCap(r);
  const n = Math.min(Math.floor(b.acc || 0), Math.max(0, cap - G[r]));
  if (n <= 0) { if ((b.acc || 0) >= 1) toast('Almacenes llenos: mejora o construye almacenes.'); return false; }
  G[r] += n; b.acc -= n; floatText(b, '+' + fmtN(n), FACTIONS[G.fac]['col' + r]); refreshHUD(); saveProfile(); return true;
}
function pay(c) { if (G[c.r] < c.n) return false; G[c.r] -= c.n; return true; }
function startUpgrade(b) {
  const to = b.lv + 1; if (to > maxLevel(b.t)) { toast(`Mejora el ${bName(G.fac, 'core')} para subir más.`); return; }
  if (b.t !== 'wall' && busyCount() >= builders()) { toast('Todos los constructores están ocupados.'); return; }
  const c = costOf(b.t, to); if (!pay(c)) { toast(`Te faltan ${fmtN(c.n - G[c.r])} de ${resName(c.r)}.`); return; }
  const t = timeOf(b.t, to);
  if (t <= 0) { b.lv = to; fxAt(b.x + .5, b.y + .5, 'subida_nivel'); if (b.t.match(/^d\d$/) && (to === 5 || to === 10)) openBranch(b); }
  else b.busy = { until: Date.now() + t * 1000, to, total: t * 1000 };
  saveProfile(); refreshHUD(); if (!$("#modal").classList.contains("show")) openBuilding(b);
}
function speedUp(b) { if (!b.busy) return; const g = Math.max(1, Math.ceil((b.busy.until - Date.now()) / 60000)); if (PROFILE.gems < g) { toast('No tienes gemas suficientes.'); return; } PROFILE.gems -= g; finishBusy(b); if (!$("#modal").classList.contains("show")) openBuilding(b); }
function resName(r) { return FACTIONS[G.fac]['res' + r]; }
function buildNew(t, x, y, k) {
  if (t === 'deco' && k && k.startsWith('liga:')) { if (G.buildings.some(x => x.k === k)) { toast('Ya tienes esa bandera colocada'); return false; } G.buildings.push({ id: G.nextId++, t, lv: 1, x, y, k, acc: 0, last: Date.now() }); saveProfile(); return true; }
  if (t === 'deco' && k && k.includes('/')) { if (PROFILE.gems < 60) { toast('Necesitas 60 💎'); return false; } PROFILE.gems -= 60; G.buildings.push({ id: G.nextId++, t, lv: 1, x, y, k, acc: 0, last: Date.now() }); saveProfile(); refreshHUD(); return true; }
  const c = costOf(t, 1); if (!pay(c)) { toast(`Te faltan ${fmtN(c.n - G[c.r])} de ${resName(c.r)}.`); return false; }
  const tm = timeOf(t, 1);
  if (t !== 'wall' && t !== 'deco' && tm > 0 && busyCount() >= builders()) { G[c.r] += c.n; toast('Todos los constructores están ocupados.'); return false; }
  const b = { id: G.nextId++, t, lv: tm > 0 ? 0 : 1, x, y, acc: 0, last: Date.now() }; if (k) b.k = k;
  if (tm > 0) b.busy = { until: Date.now() + tm * 1000, to: 1, total: tm * 1000 };
  G.buildings.push(b); fxAt(x + SIZE[t] / 2, y + SIZE[t] / 2, 'polvo_obra'); saveProfile(); refreshHUD(); return true;
}
function removeObstacle(b) {
  const c = { r: 'B', n: 100 * G.core }; if (!pay(c)) { toast('Te falta ' + resName('B')); return; }
  const gems = 3 + Math.floor(Math.random() * 8); PROFILE.gems += gems;
  G.buildings = G.buildings.filter(x => x !== b); fxAt(b.x + 1, b.y + 1, 'polvo_obra'); toast(`Obstáculo retirado: +${gems} 💎`, 'gold'); saveProfile(); refreshHUD(); closePanel();
}

// ---------- efectos y textos flotantes (compartidos con el combate) ----------
let FX = [], FLOAT = [];
function fxAt(x, y, key, dur = 0.8, size = 90, lift = 20) { FX.push({ x, y, key: 'comun/efectos/' + key, t: 0, dur, size, lift }); }
function floatText(b, txt, col) { FLOAT.push({ x: b.x + SIZE[b.t] / 2, y: b.y + SIZE[b.t] / 2, txt, col, t: 0 }); }
// efectos animados de 8 fotogramas (se suman como luz)
let FXA = [];
function fxAnim(x, y, name, size = 90, dur = .45, lift = 0) { if (S('comun/fx/' + name + '_0')) FXA.push({ x, y, name, size, dur, lift, t: 0 }); }
function drawFXA(dt) {
  FXA = FXA.filter(f => (f.t += dt) < f.dur);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const f of FXA) { const i = Math.min(7, Math.floor(f.t / f.dur * 8)); drawSprite(`comun/fx/${f.name}_${i}`, f.x, f.y, f.size, { lift: f.lift, sink: f.size * .25 }); }
  ctx.restore();
}
function drawFX(dt) {
  drawFXA(dt);
  FX = FX.filter(f => (f.t += dt) < f.dur);
  for (const f of FX) { const k = f.t / f.dur; drawSprite(f.key, f.x, f.y, f.size * (0.6 + k * 0.6), { alpha: 1 - k * k, lift: f.lift + k * 20 }); }
  FLOAT = FLOAT.filter(f => (f.t += dt) < 1.4);
  ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center';
  for (const f of FLOAT) { const [px, py] = iso(f.x, f.y); const [sx, sy] = toScreen(px, py); ctx.globalAlpha = 1 - f.t / 1.4; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.strokeText(f.txt, sx, sy - 60 - f.t * 40); ctx.fillStyle = f.col; ctx.fillText(f.txt, sx, sy - 60 - f.t * 40); ctx.globalAlpha = 1; }
}

// ---------- dibujo de la base ----------
const CFILTER = { res: 'hue-rotate(70deg) saturate(1.6)', volt: 'hue-rotate(270deg) saturate(1.5)', nuw: 'hue-rotate(160deg) saturate(1.4)' };
function hasRealC() { return !!S(`${FACTIONS[G.fac].atlas}/economia/extractor_n01`); }
// movimiento y plataforma: fase propia por edificio; brillo pulsante en los que tienen energía
// partes con movimiento: la mitad superior de torres y antenas se balancea; recolectores echan humo/chispas/esporas
const SWAY = new Set(['d1', 'd2', 'd3', 'd5', 'ult', 'radar']);
function puffs(r, b, fac) {
  const [x, y, w, h] = r, t = performance.now() / 1000, ph = (b.x * 3 + b.y * 5) % 7;
  const col = fac === 'volt' ? [255, 220, 90] : fac === 'nuw' ? [170, 255, 120] : [215, 215, 215];
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const a = (t * .45 + i / 4 + ph * .13) % 1, px = x + w * (.42 + .12 * Math.sin(i * 2.1 + ph)) + Math.sin(a * 6 + i) * 4 * cam.z, py = y + h * .18 - a * 34 * cam.z;
    ctx.globalAlpha = (1 - a) * (fac === 'res' ? .45 : .8); ctx.fillStyle = `rgb(${col})`;
    ctx.beginPath(); ctx.arc(px, py, (fac === 'res' ? 3 + a * 7 : fac === 'volt' ? 1.6 : 2.2 + a * 1.5) * cam.z, 0, 7); ctx.fill();
  }
  ctx.restore();
}
const GLOWY = new Set(['core', 'support', 'ult', 'weather', 'radar', 'prodC', 'hero', 'lab', 'd6']);
// tipo de movimiento según lo que se ve en el dibujo
const MOVE = [
  [/desguace|fabrica|forja|centro_id/, 'arm'],          // brazos mecánicos visibles
  [/mina_creditos|extractor/, 'drill'],                 // perforadoras
  [/^(hangar|bateria|compactador|generador|estacion_drones|banco|deposito|campamento|cuartel|laboratorio|taller|centro_mando|barracon|satelite|antena|torre_comunicaciones|bunker|generador_escudo|control_clima|patrulla)/, null],
];
const BEAT = /corazon|incubadora|nido|glandula|camara_evolucion|mente_colmena/;
const SPARK = /generador|bateria|bobina|tesla|reactor|canon_plasma|canon_riel|torreta_laser|satelite|antena|titan/;
function canFace(b) { return b.t !== 'wall' && b.t !== 'obst' && !b.t.startsWith('trap') && (b.lv > 0 || b.t === 'deco'); }
function faceCount(b) { return moveMode(bSprite(G.fac, b), b.t) === 'dir4' ? 4 : 2; }
function moveMode(key, t) {
  const n = key.split('/').pop();
  if (S(key + '_right') && S(key + '_back')) return 'dir4';
  if (key.startsWith('nuwoks/') && BEAT.test(n)) return 'beat';
  for (const [re, m] of MOVE) if (re.test(n)) return m;
  if (key.startsWith('nuwoks/')) return null;
  if (/radar|satelite/.test(n)) return 'spin';
  return SWAY.has(t) ? 'turret' : null;
}
// chispas eléctricas pequeñas (Voltempire): aparecen un instante en la parte alta
function sparks(r, b) {
  const [x, y, w, h] = r, t = performance.now() / 1000, ph = (b.x * 13 + b.y * 7) % 11;
  for (let i = 0; i < 2; i++) {
    const cyc = t * (.11 + i * .05) + ph * .37 + i * .5, n = Math.floor(cyc), f = cyc - n; if (f > .16) continue;
    const rnd = k => { const v = Math.sin((n + 1) * 12.9898 + k * 78.233 + ph * 3.1 + i * 9.7) * 43758.5; return v - Math.floor(v); };
    let px = x + w * (.25 + .5 * rnd(1)), py = y + h * (.08 + .35 * rnd(2));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#7fb4ff'; ctx.shadowColor = '#2a5cff'; ctx.shadowBlur = 6; ctx.lineWidth = 1.8 * cam.z; ctx.globalAlpha = 1 - f / .16;
    ctx.beginPath(); ctx.moveTo(px, py); const ang = rnd(20) * 6.28; for (let s = 0; s < 5; s++) { const zz = (s % 2 ? 1 : -1) * (2 + rnd(3 + s) * 3) * cam.z; px += Math.cos(ang) * 5 * cam.z - Math.sin(ang) * zz; py += Math.sin(ang) * 4 * cam.z + Math.cos(ang) * zz; ctx.lineTo(px, py); } ctx.stroke();
    ctx.fillStyle = '#d8e6ff'; ctx.beginPath(); ctx.arc(px, py, 2 * cam.z, 0, 7); ctx.fill(); ctx.restore();
  }
}
function animOpts(b, o, col, fac) {
  const r0 = animOpts0(b, o, col, fac); if (b.t === 'deco') { o.flip = (b.face || 0) % 2 === 1; return r0; } if (b.face && o.mirror == null && !o.dirSet && moveMode(bSprite(fac || (G && G.fac) || 'res', b), b.t) !== 'turret') o.mirror = (b.face % 2) ? 1 : null; return r0;
}
function animOpts0(b, o, col, fac) {
  if (b.t === 'deco') { o.glow = 1; o.anim = ((b.x * 7 + b.y * 13) % 10) * .63;
    if (b.k && b.k.startsWith('liga:')) { const i = +b.k.slice(5), key = `comun/ligas/bandera_${i}`;
      if (S(key + '_f2')) o.frame = key + ['', '_f2', '_f3', '_f2'][Math.floor(performance.now() / 260 + o.anim * 3) % 4];
      else o.filter = ((LEAGUES[i] && LEAGUES[i].fl) || ['sepia(1) saturate(2.2) hue-rotate(-12deg) brightness(.9)', 'grayscale(1) brightness(1.25)', '', '', 'grayscale(1) sepia(1) hue-rotate(165deg) saturate(3.5) brightness(1.2)'][i] || ''); }
    return o; }
  if (b.t === 'wall' || b.t === 'obst' || b.t === 'trap1' || b.t === 'trap2') { if (b.t === 'wall') o.margin = 0; return o; }
  const ph = ((b.x * 7 + b.y * 13) % 10) * .63;
  if (b.lv > 0) { o.anim = ph; o.glow = 1; }
  const key = b.lv > 0 && !b.dead ? bSprite(fac || (G && G.fac) || 'res', b) : ''; const mode = key ? moveMode(key, b.t) : null;
  // edificios con 3 fotogramas: bucle 1-2-3-2, cada uno con su propio ritmo
  if (key && S(key + '_f2') && S(key + '_f3')) { const hh = ((b.x * 73 + b.y * 151 + (b.id | 0) * 7) % 997) / 997, spd = 340 + hh * 220, cyc = performance.now() / spd + hh * 40;
    // cada edificio con su velocidad y, de vez en cuando, una pausa en el primer fotograma (cada uno en momentos distintos)
    const blk = Math.floor(cyc / 12), rest = ((blk * 31 + hh * 977) % 10) < 3 && (cyc % 12) < 5;
    const f = rest ? '' : [ '', '_f2', '_f3', '_f2' ][Math.floor(cyc) % 4]; o.frame = key + f; if (key && (fac === 'volt') && SPARK.test(key.split('/').pop())) o.spark = 1; return o; }
  if (key && (fac === 'volt') && SPARK.test(key.split('/').pop())) o.spark = 1;
  if (mode === 'dir4') {
    // 0 frente (abajo) · 1 derecha · 2 espalda (arriba) · 3 izquierda (espejo de la derecha)
    const aiming = b.aim && performance.now() - (b.aimT || 0) < 2500; let d = (b.face || 0) % 4;
    if (aiming) { const sx = b.aim[0] - b.aim[1], sy = b.aim[0] + b.aim[1]; d = Math.abs(sx) > Math.abs(sy) * 1.2 ? (sx > 0 ? 1 : 3) : (sy > 0 ? 0 : 2); }
    const now = performance.now(); if (b._d == null) { b._d = d; b._dp = d; b._dt = 0; }
    if (d !== b._d) { b._dp = b._d; b._d = d; b._dt = now; }
    const p = Math.min(1, (now - b._dt) / 450), e = p * p * (3 - 2 * p);
    const kk = i => [i === 0 ? key : i === 2 ? key + '_back' : key + '_right', i === 3];
    o.dirSet = e >= 1 || b._dp === b._d ? [[...kk(b._d), 1]] : [[...kk(b._dp), 1 - e], [...kk(b._d), e]];
    return o;
  }
  if (mode) {
    const T = performance.now() / 1000 + ph; let a = 0, kick = 0, dy = 0, sy = 1, sx = 1, cut = .32;
    if (mode === 'turret' || mode === 'spin') {
      // copia espejo: mira a un lado y, cada pocos segundos (o hacia el enemigo), se refleja con un fundido rápido
      const aiming = b.aim && performance.now() - (b.aimT || 0) < 2500;
      // en la base mira hacia donde la orientó el jugador (b.face); en combate, hacia el enemigo
      let want = aiming ? ((b.aim[0] - b.aim[1]) > 0 ? 1 : 0) : mode === 'spin' ? (Math.floor(T / 3) % 2) : ((b.face || 0) % 2);
      // transición lenta (~0,7 s) con aceleración suave al principio y al final
      const now = performance.now(); if (b._mw == null) { b._mw = want; b._mf = want; b._mt = 0; }
      if (want !== b._mw) { b._mf = b._mir != null ? b._mir : b._mw; b._mw = want; b._mt = now; }
      const p = Math.min(1, (now - b._mt) / 700), e = p * p * (3 - 2 * p); b._mir = b._mf + (b._mw - b._mf) * e;
      o.mirror = b._mir; return o;
    } else if (mode === 'arm') {
      // brazo trabajando: sube, baja con un golpe y descansa
      const c = (T * .55) % 1; a = (c < .5 ? Math.sin(c * 2 * Math.PI) : 0) * .055 * (b.x % 4 < 2 ? 1 : -1); dy = c > .45 && c < .55 ? 1.2 : 0; cut = .45;
    } else if (mode === 'drill') {
      // vibración de la perforadora a ratos
      const on = Math.sin(T * .9) > -.2; dy = on ? Math.sin(T * 55) * .9 : 0; a = on ? Math.sin(T * 41) * .006 : 0; cut = .45;
    } else if (mode === 'beat') {
      // latido doble (pum-pum… pausa)
      // cada estructura con su ritmo, fuerza y separación entre los dos golpes
      const h = (b.x * 31 + b.y * 17) % 97 / 97, rate = .5 + h * .4, gap = .13 + ((h * 7) % 1) * .1, amp = .009 + ((h * 13) % 1) * .008;
      const c = ((performance.now() / 1000) * rate + h * 5) % 1, g = v => Math.exp(-v * v * 260); sy = 1 + amp * (g(c - .08) + .6 * g(c - .08 - gap)); cut = .12;
    }
    o.sway = { a, kick, dy, sy, sx, cut };
  }
  return o;
}
// los muros vecinos se unen con un tramo intermedio (se dibuja antes, queda detrás)
const _wallIdx = new WeakMap();
function wallLinks(list, b, key, o) {
  let m = _wallIdx.get(list); if (!m || m.n !== list.length || m.t !== (performance.now() / 500 | 0)) { m = { n: list.length, t: performance.now() / 500 | 0, s: new Set() }; m.g = new Set(); for (const w of list) if (w.t === 'wall' && !w.dead) { m.s.add(w.x + ',' + w.y); if (w.gate) m.g.add(w.x + ',' + w.y); } _wallIdx.set(list, m); }
  const oo = Object.assign({}, o, { margin: .1, glow: 0 }), has = (x, y) => m.s.has(x + ',' + y);
  const L = has(b.x - 1, b.y), R = has(b.x + 1, b.y), U = has(b.x, b.y - 1), D = has(b.x, b.y + 1);
  if (L) drawOnTile(key, b.x - .5, b.y, 1, oo);
  if (U) drawOnTile(key, b.x, b.y - .5, 1, oo);
  // orientación: automática si tiene vecinos; si está suelto o es un extremo, manda su giro (b.rot)
  const rot = (L || R) && !(U || D) ? 0 : (U || D) && !(L || R) ? 1 : (b.rot || 0);
  if (L || R || U || D) { if ((L && R) || (U && D) || ((L || R) && (U || D))) return null; }
  // tramo corto en su dirección (hacia los lados libres)
  const dx = rot ? 0 : .3, dy = rot ? .3 : 0;
  if (!(rot ? U : L)) drawOnTile(key, b.x - dx, b.y - dy, 1, oo);
  return (rot ? D : R) ? null : () => drawOnTile(key, b.x + dx, b.y + dy, 1, oo);
}
// muros con piezas (tramo ↘ «_x», tramo ↗ «_y» y poste): poste en esquinas y extremos, tramos entre vecinos
function wallDraw(list, b, key, o) {
  let m = _wallIdx.get(list); if (!m || m.n !== list.length || m.t !== (performance.now() / 500 | 0)) { m = { n: list.length, t: performance.now() / 500 | 0, s: new Set() }; m.g = new Set(); for (const w of list) if (w.t === 'wall' && !w.dead) { m.s.add(w.x + ',' + w.y); if (w.gate) m.g.add(w.x + ',' + w.y); } _wallIdx.set(list, m); }
  const has = (x, y) => m.s.has(x + ',' + y), x = b.x, y = b.y;
  const L = has(x - 1, y), R = has(x + 1, y), U = has(x, y - 1), D = has(x, y + 1), n = L + R + U + D;
  const oo = { alpha: o.alpha, filter: o.filter }; let r;
  if (!n) r = (b.rot || 0) ? drawRect(key + '_y', x + .25, y, x + .75, y + 1, oo) : drawRect(key + '_x', x, y + .25, x + 1, y + .75, oo);
  else if ((L && R && !U && !D) || (U && D && !L && !R)) r = null;   // tramo recto: lo cubren las uniones
  else r = drawRect(key, x + .18, y + .18, x + .82, y + .82, oo);    // esquina, cruce o extremo: poste
  const gR = m.g.has((x + 1) + ',' + y), gD = m.g.has(x + ',' + (y + 1));
  const after = () => { if (R) drawRect(key + '_x', x + .5, y + .25, gR ? x + 1.1 : x + 1.5, y + .75, oo); if (D) drawRect(key + '_y', x + .25, y + .5, x + .75, gD ? y + 1.1 : y + 1.5, oo); };
  if (b.gate) { const gr = drawGate(list, b, key, o, o.gateOpen || 0); return { r: gr, after: () => { if (R) drawRect(key + '_x', x + .95, y + .25, gR ? x + 1.05 : x + 1.5, y + .75, oo); if (D) drawRect(key + '_y', x + .25, y + .95, x + .75, gD ? y + 1.05 : y + 1.5, oo); } }; }
  if (!r) { const [px, py] = toScreen(...iso(x + .5, y + .5)); r = [px - 14 * cam.z, py - 40 * cam.z, 28 * cam.z, 40 * cam.z]; }
  return { r, after };
}
function wallAutoRot(x, y) { const has = (a, c) => G.buildings.some(w => w.t === 'wall' && w.x === a && w.y === c); if (has(x - 1, y) || has(x + 1, y)) return 0; if (has(x, y - 1) || has(x, y + 1)) return 1; return null; }
let SEL = null, PLACING = null;  // PLACING = {t,k,x,y,move:b}
function drawBase(dt) {
  drawGround(G.fac);
  const list = [...G.buildings].sort((a, b) => (a.x + a.y + SIZE[a.t]) - (b.x + b.y + SIZE[b.t]));
  const now = Date.now();
  if (SEL) diamond(SEL.x, SEL.y, SIZE[SEL.t], 'rgba(255,255,255,.12)', 'rgba(255,255,255,.8)');
  if (WSEL) for (const w of WSEL) diamond(w.x, w.y, 1, 'rgba(120,255,140,.25)', 'rgba(150,255,160,.9)');
  baseTroopsStep((dt || .016) * 1000); const troops = [...BASE_TROOPS.list].sort((a, b) => (a.x + a.y) - (b.x + b.y)); let ti = 0;
  for (const b of list) {
    while (ti < troops.length && troops[ti].x + troops[ti].y < b.x + b.y + SIZE[b.t] * (b.t === 'wall' ? .5 : .9)) drawBaseTroop(troops[ti++], now);
    if (PLACING && PLACING.move === b) continue;
    const s = SIZE[b.t]; const cx = b.x + s / 2, cy = b.y + s / 2;
    const bob = (b === SEL) ? Math.sin(now / 150) * 2 : 0;
    const key = b.lv === 0 ? bSprite(G.fac, { ...b, lv: 1 }) : bSprite(G.fac, b);
    const o = { lift: bob, alpha: PLACING ? .45 : b.lv === 0 ? .55 : 1, filter: b.lv === 0 ? 'grayscale(.7)' : b.t === 'prodC' && !hasRealC() ? CFILTER[G.fac] : null };
    animOpts(b, o, FACTIONS[G.fac].color, G.fac); if (b.gate) o.gateOpen = gateOpenAmt(b, (dt || .016) * 1000);
    const wd = b.t === 'wall' && S(key + '_x') ? wallDraw(G.buildings, b, key, o) : null;
    const after = wd ? wd.after : b.t === 'wall' ? wallLinks(G.buildings, b, key, o) : null;
    const r = wd ? wd.r : (b.t === 'deco' || b.t === 'obst') ? drawSprite(o.frame || key, b.x + s * .75, b.y + s * .75, s * TW * .75, o) : drawOnTile(o.frame || key, b.x, b.y, s, o);
    if (after) after();
    if (!r) continue;
    if (b.lv > 0 && (b.t === 'prodA' || b.t === 'prodB' || b.t === 'prodC') && !PLACING) puffs(r, b, G.fac);
    if (o.spark && !PLACING) sparks(r, b);
    const [sx, sy, w] = r;
    if (b.busy) {
      const k = 1 - (b.busy.until - now) / b.busy.total; hpBar(sx + w / 2, sy - 8, Math.min(90, w * .7), k, '#4ec3ff');
      ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      const tx = '🔨 ' + fmtT((b.busy.until - now) / 1000); ctx.strokeText(tx, sx + w / 2, sy - 12); ctx.fillText(tx, sx + w / 2, sy - 12);
    } else if ((b.t === 'prodA' || b.t === 'prodB' || b.t === 'prodC') && b.acc >= Math.max(b.t === 'prodC' ? 1 : 10, prodCap(b) * 0.04)) {
      const r = b.t === 'prodA' ? 'A' : b.t === 'prodC' ? 'C' : 'B', s = S(`comun/iconos/${G.fac}_${r}`), sz = (30 + Math.sin(now / 200) * 2) * Math.max(.7, cam.z);
      if (s) ctx.drawImage(s.img, s.x, s.y, s.w, s.h, sx + w / 2 - sz / 2, sy - sz - 2, sz, sz * s.h / s.w); else { ctx.font = '24px system-ui'; ctx.textAlign = 'center'; ctx.fillText(r === 'B' ? '💧' : '💰', sx + w / 2, sy - 2); }
    }
  }
  while (ti < troops.length) drawBaseTroop(troops[ti++], now);
  if (PLACING) drawPlacementGrid();
  if (PLACING) { const s = SIZE[PLACING.t]; const tmp = Object.assign({ lv: 1, br1: 'A' }, PLACING.move || {}, { t: PLACING.t, k: PLACING.k, x: PLACING.x, y: PLACING.y }); (PLACING.t === 'deco' ? drawSprite(bSprite(G.fac, tmp), PLACING.x + s * .75, PLACING.y + s * .75, s * TW * .75, { alpha: .8 }) : drawOnTile(bSprite(G.fac, tmp), PLACING.x, PLACING.y, s, { alpha: .8, filter: PLACING.ok ? 'drop-shadow(0 0 6px #4f8)' : 'sepia(1) saturate(5) hue-rotate(-40deg) drop-shadow(0 0 6px #f44)' }));
    const ok = PLACING.ok, [lx, ly] = PLACING.lbl; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = ok ? '#bfffc8' : '#ffbcbc'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
    const tag = ok ? '✓ Cabe aquí' : '✕ Ocupado'; ctx.strokeText(tag, lx, ly); ctx.fillText(tag, lx, ly); }
  if (shieldLeft() > 0) { const c = G.buildings.find(b => b.t === 'core'); if (c) { const [px, py] = iso(c.x + 2, c.y + 2); const [sx, sy] = toScreen(px, py); const r = 150 * cam.z; ctx.save(); ctx.globalAlpha = .25 + Math.sin(now / 400) * .08; ctx.fillStyle = '#6cf'; ctx.beginPath(); ctx.ellipse(sx, sy - r * .35, r, r * .75, 0, 0, 7); ctx.fill(); ctx.globalAlpha = .7; ctx.strokeStyle = '#9df'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); } }
  drawPatrolsBase(now);
  drawFX(dt);
}
function drawPlacementGrid() {
  const P = PLACING, s = SIZE[P.t], skip = P.move && P.move.id;
  const occ = occupied(G.buildings, skip);
  // zona edificable y huellas del resto de edificios
  ctx.save(); ctx.globalAlpha = .9;
  diamond(BORDER, BORDER, N - BORDER * 2, null, 'rgba(255,255,255,.35)');
  for (const b of G.buildings) { if (b.id === skip) continue; const z = SIZE[b.t]; diamond(b.x, b.y, z, 'rgba(255,80,80,.10)', 'rgba(255,120,120,.45)'); }
  ctx.restore();
  // casillas de la pieza: verde libre / rojo ocupado
  let ok = true;
  const C = Math.min(CELL, s); for (let i = 0; i < s; i += C) for (let j = 0; j < s; j += C) {
    const x = P.x + i, y = P.y + j; let bad = x < BORDER || y < BORDER || x + C > N - BORDER || y + C > N - BORDER;
    for (let a = 0; a < C && !bad; a++) for (let c = 0; c < C; c++) if (occ[(y + c) * N + x + a]) bad = true;
    if (bad) ok = false;
    diamond(x + .1, y + .1, C - .2, bad ? 'rgba(255,50,50,.55)' : 'rgba(70,255,120,.45)', null);
  }
  diamond(P.x, P.y, s, null, ok ? '#5f5' : '#f55'); ctx.lineWidth = 3;
  // alcance de las defensas
  if (DEFSTAT[P.t] && DEFSTAT[P.t].range) {
    const [px, py] = iso(P.x + s / 2, P.y + s / 2); const [cx, cy] = toScreen(px, py); const r = (DEFSTAT[P.t].range + s / 2) * TW / Math.SQRT2 * cam.z * 0.707 * 1.41;
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, r, r / 2, 0, 0, 7); ctx.stroke(); ctx.restore();
  }
  // flechas para indicar que se puede arrastrar
  const [ax, ay] = iso(P.x + s / 2, P.y + s / 2); const [sx, sy] = toScreen(ax, ay);
  P.ok = ok; P.lbl = [sx, sy + s * TH / 2 * cam.z + 24];
}
function defaultRoute(b) { const c = N / 2, r = 9; return [[c - r, c - r], [c + r, c - r], [c + r, c + r], [c - r, c + r]]; }
function heroKey() { return G.heroSel === 'HERO2' && hero2Available() ? 'HERO2' : 'HERO'; }
function hero2Available() { return G.core >= 9 && heroAvailable(); }
function supportLevel() { const b = G.buildings.find(b => b.t === 'support'); return b ? b.lv : 0; }
// patrulla visible en la base
function drawPatrolsBase(now) {
  for (const b of G.buildings) {
    if (b.t !== 'patrol' || b.lv < 1) continue; const R = b.route || defaultRoute(b);
    if (SEL === b || ROUTE) { ctx.save(); ctx.strokeStyle = 'rgba(120,220,255,.8)'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]); ctx.beginPath(); R.concat([R[0]]).forEach((p, i) => { const [a, c] = iso(p[0], p[1]); const [sx, sy] = toScreen(a, c); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.stroke(); ctx.setLineDash([]);
      R.forEach((p, i) => { const [a, c] = iso(p[0], p[1]); const [sx, sy] = toScreen(a, c); ctx.fillStyle = '#4ec3ff'; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#012'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(i + 1, sx, sy + 4); }); ctx.restore(); }
    const pos = routePos(R, now / 1000 * PATROL[G.fac].speed * .8 + b.id);
    const key = `${FACTIONS[G.fac].atlas}/tropas/nave_patrulla_${pos.vy >= 0 ? 'frente' : 'espalda'}`; const s = S(key);
    if (s) { const [px, py] = iso(pos.x, pos.y); const [sx, sy] = toScreen(px, py); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(sx, sy, 16 * cam.z, 7 * cam.z, 0, 0, 7); ctx.fill();
      drawSprite(key, pos.x, pos.y, 70, { lift: 70 + Math.sin(now / 300) * 6, flip: pos.vx < 0 }); }
  }
}
function routePos(R, t) {
  let L = 0; const seg = []; for (let i = 0; i < R.length; i++) { const a = R[i], b = R[(i + 1) % R.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push([a, b, l]); L += l; }
  let d = ((t % L) + L) % L; for (const [a, b, l] of seg) { if (d <= l) { const k = d / l; const vx = b[0] - a[0], vy = b[1] - a[1]; return { x: a[0] + vx * k, y: a[1] + vy * k, vx: vx - vy, vy: vx + vy }; } d -= l; }
  return { x: R[0][0], y: R[0][1], vx: 0, vy: 1 };
}
let ROUTE = null;  // edición de ruta: {b, pts}
function hitBuilding(sx, sy) {
  const [tx, ty] = screenToTile(sx, sy);
  // primero por huella, luego por sprite (los altos)
  let best = null;
  for (const b of G.buildings) { const s = SIZE[b.t]; if (tx >= b.x && tx < b.x + s && ty >= b.y && ty < b.y + s) best = b; }
  if (best) return best;
  const sorted = [...G.buildings].sort((a, b) => (b.x + b.y + SIZE[b.t]) - (a.x + a.y + SIZE[a.t]));
  for (const b of sorted) {
    const s = SIZE[b.t]; const [px, py] = iso(b.x + s, b.y + s); const [bx, by] = toScreen(px, py); const w = s * TW * cam.z;
    if (sx > bx - w * .35 && sx < bx + w * .35 && sy < by - w * .15 && sy > by - w * 1.0) return b;
  }
  return null;
}
