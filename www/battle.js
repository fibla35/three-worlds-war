// ===== combate =====
'use strict';
let BAT = null;
const TARGETABLE = t => !['wall', 'deco', 'obst', 'trap1', 'trap2'].includes(t);
const COUNTS = t => !['wall', 'deco', 'obst', 'trap1', 'trap2'].includes(t);

function genEnemyBase(fac, core, seed, soft = 0) {
  const r = rng(seed * 7919 + 13); const list = []; let id = 1;
  const occ = new Int32Array(N * N);
  const put = (t, x, y, lv, extra = {}) => { const s = SIZE[t]; for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) occ[(y + j) * N + x + i] = id; list.push(Object.assign({ id: id++, t, lv, x, y }, extra)); };
  const free = (t, x, y, gap = 1) => { const s = SIZE[t]; if (x < BORDER || y < BORDER || x + s > N - BORDER || y + s > N - BORDER) return false; for (let i = -gap; i < s + gap; i++) for (let j = -gap; j < s + gap; j++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < N && yy < N && occ[yy * N + xx]) return false; } return true; };
  const c = N / 2 - 2; put('core', c, c, core);
  const lvl = t => { const m = BT[t][4][core - 1]; return Math.max(1, m - Math.floor(r() * 2) - soft); };
  const place = (t, rmin, rmax, extra) => {
    for (let k = 0; k < 1500; k++) { const a = r() * 6.283, d = rmin + r() * (rmax - rmin); const x = snapC(N / 2 + Math.cos(a) * d - SIZE[t] / 2), y = snapC(N / 2 + Math.sin(a) * d - SIZE[t] / 2); if (free(t, x, y)) { put(t, x, y, lvl(t), extra ? extra() : {}); return; } }
  };
  const ring = 6 + Math.min(9, core);
  for (const t of ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'ult', 'radar', 'weather', 'patrol']) for (let i = 0; i < BT[t][3][core - 1]; i++) place(t, 3, ring - 1, () => ({ br1: r() < .5 ? 'A' : 'B', br2: r() < .5 ? 'A' : 'B', route: [[N / 2 - ring, N / 2 - ring], [N / 2 + ring, N / 2 - ring], [N / 2 + ring, N / 2 + ring], [N / 2 - ring, N / 2 + ring]] }));
  for (const t of ['storA', 'storB']) for (let i = 0; i < BT[t][3][core - 1]; i++) place(t, 2, ring + 3);
  for (const t of ['prodA', 'prodB', 'prodC', 'camp', 'barracks', 'lab', 'support', 'comms', 'hero']) for (let i = 0; i < BT[t][3][core - 1]; i++) place(t, ring + 2, ring + 9);
  for (const t of ['trap1', 'trap2']) for (let i = 0; i < BT[t][3][core - 1]; i++) place(t, 2, ring + 4);
  // muros en anillo
  const nW = WALLS.count[core - 1], wl = Math.max(1, WALLS.max[core - 1] - (r() < .5 ? 1 : 0) - soft); let placed = 0;
  for (const rr of [ring + 1, Math.round(ring / 2) + 1, ring + 5, Math.round(ring * .75) + 1]) {
    const R0 = Math.round(N / 2 - rr), R1 = Math.round(N / 2 + rr - 1); const ringTiles = [];
    for (let x = R0; x <= R1; x++) { ringTiles.push([x, R0], [x, R1]); }
    for (let y = R0 + 1; y < R1; y++) { ringTiles.push([R0, y], [R1, y]); }
    for (const [x, y] of ringTiles) { if (placed >= nW) break; if (x < BORDER || y < BORDER || x >= N - BORDER || y >= N - BORDER) continue; if (free('wall', x, y, 0)) { put('wall', x, y, wl); placed++; } }
  }
  return list;
}

function startBattle(opt) {
  // opt: {mode:'attack'|'defend', defFac, attFac, base, army, hero, weather, core, loot, campaign}
  const base = opt.base.filter(b => b.t !== 'obst' && b.lv > 0).map(b => Object.assign({}, b, { hp: bHP(b.t, b.lv), max: bHP(b.t, b.lv), dead: false, cd: Math.random(), hidden: b.t.startsWith('trap'), dmgT: 0, infect: 0 }));
  BAT = {
    mode: opt.mode, defFac: opt.defFac, attFac: opt.attFac, base, units: [], proj: [], later: [], t: 0, dur: 180, over: false, speed: 1,
    avail: Object.assign({}, opt.army), heroAvail: !!opt.hero, heroUnit: null, heroUsed: false, sel: null,
    wx: opt.weather || 'clear', core: opt.core, loot: opt.loot || { A: 0, B: 0 }, campaign: opt.campaign, nextId: 1,
    total: base.filter(b => COUNTS(b.t)).length, destroyed: 0, coreDead: false, fields: new Map(), grid: null, wxT: 0, ai: opt.ai || null, deployed: 0,
    heroKey: opt.heroKey || 'HERO', seeTraps: !!opt.atkRadar, abils: (opt.abil ? ABIL[opt.attFac].map(a => Object.assign({ left: opt.abil >= 5 ? 2 : 1, pow: Math.pow(1.15, opt.abil - 1) }, a)) : []), selAbil: null, tmul: opt.tmul || {}, tlv: opt.tlv || {}, aiLv: opt.aiLv || Math.min(12, (opt.core || 1) + 1), xp: {}, redFlash: 0, started: false,
  };
  BAT.byId = byIdFactory(); rebuildGrid(); setWeather(BAT.wx);
  for (const b of BAT.base) if (b.t === 'patrol') { const u = spawnUnit('def', BAT.defFac, 'PATROL', b.route ? b.route[0][0] : b.x, b.route ? b.route[0][1] : b.y); if (u) { const ps = Math.pow(DEF_STEP, b.lv - 1); u.hp = u.max = u.d.hp * Math.pow(HP_STEP, b.lv - 1); u.dmgMul = ps; u.patrol = { b, route: b.route || defaultRoute(b), t: Math.random() * 20 }; } } FX = []; FLOAT = [];
  const [cx, cy] = iso(N / 2, N / 2); cam.x = cx; cam.y = cy; cam.z = Math.min(1.1, Math.max(.5, Math.min(W, H) / (N * TW * .36)));
  MODE = 'battle'; buildBattleHUD();
  const W_ = WEATHERS.find(w => w.id === BAT.wx); banner(`${W_.icon} ${W_.name}`, W_.fx);
}
function rebuildGrid() {
  const g = new Int32Array(N * N);
  for (const b of BAT.base) { if (b.dead || b.t === 'deco' || b.t.startsWith('trap')) continue; const s = SIZE[b.t]; for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) g[(b.y + j) * N + b.x + i] = b.id; }
  BAT.grid = g; BAT.fields.clear();
}
function field(target, jump, range) {
  const key = target.id + '|' + (jump ? 1 : 0) + '|' + Math.ceil(range);
  let f = BAT.fields.get(key); if (f) return f;
  f = new Float32Array(N * N).fill(1e9); const q = []; const s = SIZE[target.t]; const g = BAT.grid;
  const pass = i => !g[i] || (jump && BAT.byId(g[i]).t === 'wall');
  const R = Math.max(1, range);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = Math.max(target.x - (x + .5), 0, (x + .5) - (target.x + s)), dy = Math.max(target.y - (y + .5), 0, (y + .5) - (target.y + s));
    if (Math.hypot(dx, dy) <= R + .2 && pass(y * N + x)) { f[y * N + x] = 0; q.push(y * N + x); }
  }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % N, y = (i / N) | 0, d = f[i];
    for (const [ox, oy, c] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]]) {
      const nx = x + ox, ny = y + oy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx;
      if (!pass(j)) continue; if (c > 1 && (!pass(y * N + nx) || !pass(ny * N + x))) continue;
      if (f[j] > d + c) { f[j] = d + c; q.push(j); }
    }
  }
  BAT.fields.set(key, f); return f;
}
function rectDist(u, b) { const s = SIZE[b.t]; const dx = Math.max(b.x - u.x, 0, u.x - (b.x + s)), dy = Math.max(b.y - u.y, 0, u.y - (b.y + s)); return Math.hypot(dx, dy); }
function bCenter(b) { const s = SIZE[b.t]; return [b.x + s / 2, b.y + s / 2]; }

function spawnUnit(side, fac, key, x, y, opts = {}) {
  const d = unitDef(fac, key); if (!d) return null;
  const mine = (side === 'att' && BAT.mode === 'attack') || !!opts.own;
  const lv = mine ? (BAT.tlv[key] || 1) : Math.min(TROOP_MAX[Math.max(0, BAT.core - 1)], BAT.aiLv);
  const ts = mine ? (BAT.tmul[key] || { hp: 1, dmg: 1, spd: 1 }) : (() => { const v = Math.pow(TROOP_STEP, lv - 1); return { hp: v, dmg: v, spd: 1 }; })();
  const mul = ts.hp;
  const u = { id: BAT.nextId++, side, fac, d, x, y, hp: d.hp * ts.hp, max: d.hp * ts.hp, dmgMul: ts.dmg, spdMul: ts.spd, tgt: null, cd: Math.random() * .5, vx: 0, vy: 1, t: 0, spawnT: 0, shieldT: 0, frenzyT: 0, stealthT: d.ex.stealth || 0, blinkT: 3, life: opts.life || 0, dead: false, retarget: 0, lv };
  if (d.ex.turret && opts.turret) Object.assign(u, { turret: true }); if (opts.own) u.guard = true;
  BAT.units.push(u); return u;
}
function deployAt(tx, ty) {
  const B = BAT; if (B.over) return;
  const key = B.sel; if (!key) { toast('Elige una tropa abajo.'); return; }
  if (key === 'HERO') {
    if (B.heroUnit) { heroAbility(); return; }
    if (!B.heroAvail) return; if (!validDeploy(tx, ty, false)) { B.redFlash = 1; return; }
    B.heroUnit = spawnUnit('att', B.attFac, B.heroKey, tx, ty); B.heroAvail = false; B.xp[B.heroKey] = 999; B.started = true; refreshBattleHUD(); return;
  }
  if (!B.avail[key]) return;
  const d = unitDef(B.attFac, key); if (!validDeploy(tx, ty, d.ex.anywhere)) { B.redFlash = 1; return; }
  B.avail[key]--; B.deployed++; B.started = true; B.xp[key] = (B.xp[key] || 0) + d.space * (d.ex.count ? 1 : 1);
  const n = d.ex.count || 1; for (let i = 0; i < n; i++) spawnUnit('att', B.attFac, key, tx + (i ? .5 : 0), ty + (i ? .3 : 0));
  if (!B.avail[key]) { const left = Object.keys(B.avail).find(k => B.avail[k] > 0); B.sel = left || (B.heroAvail ? 'HERO' : null); }
  refreshBattleHUD();
}
function validDeploy(tx, ty, anywhere) {
  if (tx < 0 || ty < 0 || tx >= N || ty >= N) return false;
  const x = Math.floor(tx), y = Math.floor(ty);
  for (const b of BAT.base) {
    if (b.dead || b.t === 'deco' || b.t.startsWith('trap')) continue; const s = SIZE[b.t]; const m = anywhere ? 0 : 1;
    if (x >= b.x - m && x < b.x + s + m && y >= b.y - m && y < b.y + s + m) return false;
  }
  return true;
}
function patrolStep(u, dt) {
  const B = BAT, P = u.patrol; if (P.b.dead) { u.dead = true; fxAt(u.x, u.y, 'explosion_energia', .6, 80, 40); return; }
  let tgt = null, bd = 1e9; for (const v of B.units) if (v.side === 'att' && !v.dead && !(v.stealthT > 0)) { const dd = Math.hypot(v.x - u.x, v.y - u.y); if (dd < u.d.range && dd < bd) { bd = dd; tgt = v; } }
  P.t += dt * u.d.speed * (tgt ? .35 : 1); const p = routePos(P.route, P.t); u.x = p.x; u.y = p.y; u.vx = p.vx; u.vy = p.vy;
  if (tgt && u.cd <= 0) {
    u.cd = 1; u.atkT = performance.now(); const dmg = u.d.dps * u.dmgMul;
    if (B.defFac === 'nuw') { areaDamage(tgt.x, tgt.y, 1.2, dmg, 'att'); fxAt(tgt.x, tgt.y, 'acido', .4, 50, 0); }
    else { B.proj.push({ x: u.x, y: u.y, z: 2.2, tx: tgt.x, ty: tgt.y, u: tgt, dmg, splash: 0, sp: 16, col: PCOL[B.defFac], who: 'att' }); if (B.defFac === 'volt') tgt.markT = 3; }
  }
}
function castAbility(a, tx, ty) {
  const B = BAT; a.left--; B.selAbil = null; const R = 3, pw = a.pow, near = u => u.side === 'att' && !u.dead && Math.hypot(u.x - tx, u.y - ty) < R;
  if (a.id === 'bomb') { for (let i = 0; i < 5; i++) BAT.later.push({ t: BAT.t + i * .2, f: () => { if (!BAT) return; const x = tx + (Math.random() - .5) * 3, y = ty + (Math.random() - .5) * 3; for (const b of BAT.base) if (!b.dead && rectDist({ x, y }, b) < 1.6) damageBuilding(b, b.max * .09 * pw); fxAt(x, y, 'explosion_energia', .6, 110, 0); } }); }
  if (a.id === 'heal') { for (const u of B.units) if (near(u)) u.hp = Math.min(u.max, u.hp + u.max * .5 * pw); fxAt(tx, ty, 'aura_curacion', 1, 200, 0); fxAnim(tx, ty, 'cura', 200, 1, 0); }
  if (a.id === 'drop') { for (let i = 0; i < 4; i++) spawnUnit('att', B.attFac, 'marine', tx + (i % 2) * .6, ty + (i >> 1) * .6); fxAt(tx, ty, 'polvo_obra', .8, 120, 0); }
  if (a.id === 'emp') { for (const b of B.base) if (!b.dead && isDefLike(b.t) && rectDist({ x: tx, y: ty }, b) < R) b.stun = 4 * pw; fxAt(tx, ty, 'onda_emp', 1, 220, 0); }
  if (a.id === 'shield') { for (const u of B.units) if (near(u)) u.shieldT = 6 * pw; fxAt(tx, ty, 'impacto_escudo', 1, 180, 10); fxAnim(tx, ty, 'escudo', 190, 1, 0); }
  if (a.id === 'over' || a.id === 'frenzy') { for (const u of B.units) if (near(u)) u.frenzyT = 6 * pw; fxAt(tx, ty, a.id === 'over' ? 'rayo_cadena' : 'fuego', 1, 160, 10); fxAnim(tx, ty, 'furia', 180, 1, 0); }
  if (a.id === 'regen') { for (const u of B.units) if (near(u)) u.regenT = 6 * pw; fxAt(tx, ty, 'aura_curacion', 1, 200, 0); }
  if (a.id === 'plague') { for (const b of B.base) if (!b.dead && rectDist({ x: tx, y: ty }, b) < R) b.infect = 8 * pw; fxAt(tx, ty, 'nube_toxica', 1.4, 220, 0); }
  B.started = true; refreshBattleHUD();
}
function heroAbility() {
  const B = BAT, h = B.heroUnit; if (!h || h.dead || B.heroUsed) return; B.heroUsed = true;
  if (B.heroKey === 'HERO2') {
    if (B.attFac === 'res') { for (const u of B.units) if (u.side === 'att' && !u.dead) u.hp = Math.min(u.max, u.hp + u.max * .6); fxAt(h.x, h.y, 'aura_curacion', 1.2, 300, 0); banner('💉 Curación masiva', 'Todas tus tropas recuperan vida'); }
    else if (B.attFac === 'volt') { h.stealthT = 5; h.frenzyT = 5; banner('🗡️ Golpe invisible', 'La asesina se vuelve invisible y pega +50 %'); }
    else { for (let i = 0; i < 8; i++) spawnUnit('att', 'nuw', 'cria_enjambre', h.x + (i % 3 - 1) * .5, h.y + (Math.floor(i / 3) - 1) * .5); fxAt(h.x, h.y, 'acido', .8, 150, 0); banner('🥚 Eclosión', '8 crías salen del saco'); }
    refreshBattleHUD(); return;
  }
  if (B.attFac === 'res') { for (let i = 0; i < 6; i++) BAT.later.push({ t: BAT.t + i * .18, f: () => { if (!BAT) return; const tx = h.x + (Math.random() - .5) * 6, ty = h.y + (Math.random() - .5) * 6; areaDamage(tx, ty, 1.8, 350 * ((B.tmul.HERO && B.tmul.HERO.dmg) || 1), 'def'); fxAnim(tx, ty, 'orbital', 150, .8, 0); } }); banner('🚀 Bombardeo orbital', ''); }
  else if (B.attFac === 'volt') { for (const u of B.units) if (u.side === 'att') u.shieldT = 7; banner('🛡️ Escudo para todos', 'Daño recibido −60 % durante 7 s'); }
  else { for (const u of B.units) if (u.side === 'att') u.frenzyT = 7; banner('🔥 Frenesí', 'Velocidad y daño +50 % durante 7 s'); }
  refreshBattleHUD();
}
function byIdFactory() { const m = new Map(BAT.base.map(b => [b.id, b])); return id => m.get(id); }

function pickTarget(u) {
  const B = BAT, d = u.d;
  if (u.side === 'def') { let best = null, bd = 1e9; for (const v of B.units) if (v.side === 'att' && !v.dead && !(v.stealthT > 0)) { const dd = Math.hypot(v.x - u.x, v.y - u.y); if (dd < bd) { bd = dd; best = v; } } if (u.guard && bd > 11) return null; return best ? { unit: best } : null; }
  if (d.tgt === 'heal') { let best = null, bd = 1e9; for (const v of B.units) if (v.side === 'att' && v !== u && !v.dead && !v.d.air && v.d.tgt !== 'heal') { const dd = Math.hypot(v.x - u.x, v.y - u.y) - (v.hp < v.max ? 5 : 0); if (dd < bd) { bd = dd; best = v; } } return best ? { unit: best, heal: true } : null; }
  const live = B.base.filter(b => !b.dead && TARGETABLE(b.t));
  if (!live.length) return null;
  let pool = live;
  if (d.tgt === 'def') { const p = live.filter(b => isDefense(b.t)); if (p.length) pool = p; }
  if (d.tgt === 'res') { const p = live.filter(b => /^(prod|stor)/.test(b.t)); if (p.length) pool = p; }
  if (d.tgt === 'air') { const p = live.filter(b => ['d3', 'd4', 'd6', 'ult'].includes(b.t)); if (p.length) pool = p; else { const q = live.filter(b => isDefense(b.t)); if (q.length) pool = q; } }
  if (d.tgt === 'wall' && !d.air) { const walls = B.base.filter(b => !b.dead && b.t === 'wall' && rectDist(u, b) < 7); if (walls.length) pool = walls; }
  let best = null, bd = 1e9; for (const b of pool) { const dd = rectDist(u, b); if (dd < bd) { bd = dd; best = b; } }
  return best ? { b: best } : null;
}
function damageBuilding(b, dmg) {
  if (b.dead) return; const B = BAT;
  // escudo de Voltempire
  if (B.defFac === 'volt') for (const s of B.base) if (!s.dead && s.t === 'd6' && Math.hypot(...bCenter(s).map((v, i) => v - bCenter(b)[i])) < 4.5) { dmg *= .7; break; }
  b.hp -= dmg; b.dmgT = 3;
  if (b.hp <= 0) {
    b.dead = true; b.hp = 0;
    if (COUNTS(b.t)) B.destroyed++;
    if (b.t === 'core') { B.coreDead = true; banner('⭐ ¡Núcleo destruido!', ''); }
    const [cx, cy] = bCenter(b); fxAt(cx, cy, 'explosion_energia', .7, SIZE[b.t] * 50, 10);
    if (B.defFac === 'nuw' && TARGETABLE(b.t) && b.t !== 'wall') for (let i = 0; i < 2; i++) spawnUnit('def', 'nuw', 'cria_enjambre', cx + (i - .5), cy + .5);
    rebuildGrid(); BAT.byId = byIdFactory();
    const pct = B.destroyed / B.total; if (pct >= .5 && !B.half) { B.half = true; banner('⭐ 50 % destruido', ''); }
    refreshBattleHUD();
  }
}
function damageUnit(v, dmg) {
  if (v.dead) return; if (v.shieldT > 0) dmg *= .4; if (v.markT > 0) dmg *= 1.25;
  for (const s of BAT.units) if (!s.dead && s !== v && s.side === v.side && s.d.ex.shield && Math.hypot(s.x - v.x, s.y - v.y) < 1.5) { dmg *= 1 - s.d.ex.shield; break; }
  v.hp -= dmg; if (v.hp <= 0) { v.dead = true; if (S('comun/fx/muerte_' + v.fac + '_0')) fxAnim(v.x, v.y, 'muerte_' + v.fac, 70, .7, 0); else fxAt(v.x, v.y, v.fac === 'nuw' ? 'acido' : 'explosion_energia', .5, 50, 0); }
}
function areaDamage(x, y, r, dmg, who) { // who: 'def' daña edificios, 'att' daña atacantes, 'all'
  const B = BAT;
  if (who !== 'att') for (const b of B.base) if (!b.dead && TARGETABLE(b.t) || (!b.dead && b.t === 'wall')) { const s = SIZE[b.t]; const dx = Math.max(b.x - x, 0, x - (b.x + s)), dy = Math.max(b.y - y, 0, y - (b.y + s)); if (Math.hypot(dx, dy) < r) damageBuilding(b, dmg); }
  if (who !== 'def') for (const u of B.units) if (!u.dead && u.side === 'att' && Math.hypot(u.x - x, u.y - y) < r) damageUnit(u, dmg);
}
function defStats(b) {
  const B = BAT, st = DEFSTAT[b.t]; const lvm = Math.pow(DEF_STEP, b.lv - 1);
  let dps = st.dps * lvm, range = st.range, splash = st.splash || 0;
  for (const br of [b.lv >= 5 ? b.br1 : null, b.lv >= 10 ? b.br2 : null]) { if (br === 'A') dps *= 1.2; else if (br === 'B') { range += 1; splash = splash ? splash * 1.3 : 0.5; } }
  if (B.wx === 'fog') range *= .75; if (B.wx === 'sand') range *= .85;
  if (B.wx === 'rain') { if (B.defFac === 'volt' && (b.t === 'd3' || b.t === 'd4')) dps *= 1.25; if (B.defFac === 'res' && b.t === 'd4') dps *= .75; }
  return { dps, range, splash, rate: st.rate, air: st.air, ground: st.ground, min: st.min || 0 };
}
const PCOL = { res: '#ffd34d', volt: '#33e6ff', nuw: '#9dff4a' };

function battleStep(dt) {
  const B = BAT; if (!B || B.over) return;
  if (!B.byId) B.byId = byIdFactory();
  if (B.started || B.mode === 'defend') B.t += dt;
  // IA atacante (modo defensa)
  if (B.ai) { for (const w of B.ai) if (!w.done && B.t >= w.t) { w.done = true; spawnUnit('att', B.attFac, w.key, w.x, w.y); B.deployed++; } }
  const spdW = B.wx === 'snow' ? .8 : B.wx === 'sand' ? .9 : 1;
  // ---- unidades ----
  for (const u of B.units) {
    if (u.dead) continue; u.t += dt; u.cd -= dt; u.shieldT -= dt; u.frenzyT -= dt; u.stealthT -= dt;
    if (u.life && u.t > u.life) { u.dead = true; continue; }
    if (u.markT > 0) u.markT -= dt; if (u.regenT > 0) { u.regenT -= dt; u.hp = Math.min(u.max, u.hp + u.max * .08 * dt); }
    if (u.patrol) { patrolStep(u, dt); continue; }
    if (u.side === 'att' && u.stealthT > 0) for (const r of B.base) if (!r.dead && r.t === 'radar' && Math.hypot(u.x - r.x - 1, u.y - r.y - 1) < 6 + r.lv * .5) { u.stealthT = 0; fxAt(u.x, u.y, 'onda_emp', .5, 50, 10); break; }
    if (B.wx === 'toxic') { if (u.fac === 'nuw') u.hp = Math.min(u.max, u.hp + u.max * .01 * dt); else u.hp -= u.max * .01 * dt; if (u.hp <= 0) { u.dead = true; continue; } }
    const d = u.d; const fr = u.frenzyT > 0 ? 1.5 : 1;
    // invocadores
    if (d.ex.spawn && u.side === 'att') { u.spawnT += dt; if (u.spawnT > d.ex.every) { u.spawnT = 0; spawnUnit('att', u.fac, d.ex.spawn, u.x + .3, u.y + .3); } }
    if (d.ex.blink && u.tgt && u.tgt.b) { u.blinkT -= dt; if (u.blinkT < 0 && rectDist(u, u.tgt.b) > 3) { u.blinkT = 5; const [cx, cy] = bCenter(u.tgt.b); const a = Math.atan2(cy - u.y, cx - u.x); fxAt(u.x, u.y, 'onda_psiquica', .4, 60, 10); u.x += Math.cos(a) * 3; u.y += Math.sin(a) * 3; } }
    // objetivo
    u.retarget -= dt;
    const tgtDead = !u.tgt || (u.tgt.b && u.tgt.b.dead) || (u.tgt.unit && u.tgt.unit.dead);
    if (tgtDead) { u.tgt = pickTarget(u); u.retarget = 1; }
    else if (u.retarget < 0) { u.retarget = 1; if (u.side === 'def' || d.tgt === 'heal') u.tgt = pickTarget(u) || u.tgt; }
    // pelea con defensores cercanos
    if (u.side === 'att' && !d.air && d.tgt !== 'heal') { for (const v of B.units) if (v.side === 'def' && !v.dead && Math.hypot(v.x - u.x, v.y - u.y) < 1.6) { u.tgt = { unit: v }; break; } }
    if (!u.tgt) { continue; }
    let inRange, tx, ty;
    if (u.tgt.b) { const b = u.tgt.b; inRange = rectDist(u, b) <= d.range + .15; [tx, ty] = bCenter(b); }
    else { const v = u.tgt.unit; const dd = Math.hypot(v.x - u.x, v.y - u.y); inRange = dd <= Math.max(.8, d.range); tx = v.x; ty = v.y; }
    if (inRange) {
      if (u.cd <= 0) {
        u.cd = 1; u.atkT = performance.now();
        const dmg = d.dps * u.dmgMul * fr * (u.side === 'att' && BAT.mode === 'attack' ? 1 : 1);
        if (u.tgt.heal) { const v = u.tgt.unit; for (const w of B.units) if (w.side === 'att' && !w.dead && Math.hypot(w.x - v.x, w.y - v.y) < 2) w.hp = Math.min(w.max, w.hp + d.ex.heal * u.dmgMul); fxAt(v.x, v.y, 'aura_curacion', .6, 60, 0); }
        else if (d.ex.kamikaze) { areaDamage(u.x, u.y, 1.8, d.ex.kamikaze * u.dmgMul, 'def'); fxAt(u.x, u.y, 'acido', .7, 110, 0); u.dead = true; continue; }
        else if (u.tgt.b) {
          const b = u.tgt.b; let dm = dmg * (b.t === 'wall' && d.ex.wallx ? d.ex.wallx : 1);
          if (d.ex.dot) b.infect = 5;
          if (d.ex.turret && !u.placedTurret && u.side === 'att') { u.placedTurret = true; const tu = spawnUnit('att', u.fac, 'francotirador', u.x + .4, u.y + .4, { life: 15 }); if (tu) { tu.d = Object.assign({}, tu.d, { speed: 0, range: 4.5, dps: 18, name: 'Torreta' }); tu.isTurret = true; } }
          if (d.range > 1.5 || d.air) B.proj.push({ x: u.x, y: u.y, z: d.air ? 1.2 : .4, tx, ty, b, dmg: dm, splash: d.ex.splash || 0, sp: 12, fac: u.fac, col: PCOL[u.fac], who: 'def' });
          else { if (d.ex.splash) areaDamage(tx, ty, d.ex.splash, dm, 'def'); else damageBuilding(b, dm); }
        } else if (u.tgt.unit) {
          const v = u.tgt.unit; if (u.side === 'def') damageUnit(v, dmg); else { v.hp -= dmg; if (v.hp <= 0) v.dead = true; }
        }
      }
      if (u.tgt.b) { const [cx, cy] = bCenter(u.tgt.b); u.vx = cx - u.x; u.vy = cy - u.y; }
      continue;
    }
    if (u.isTurret) continue;
    // movimiento
    let sp = d.speed * (u.spdMul || 1) * spdW * fr * dt * 1.15;
    if (u.side === 'att') for (const s of B.base) if (!s.dead && s.t === 'd6' && B.defFac === 'nuw' && Math.hypot(...bCenter(s).map((v, i) => v - [u.x, u.y][i])) < 5) { sp *= .65; break; }
    let mx = tx - u.x, my = ty - u.y;
    if (!d.air && u.tgt.b && u.side === 'att') {
      const f = field(u.tgt.b, d.ex.jump, d.range); const cx = Math.floor(u.x), cy = Math.floor(u.y);
      const ci = cy * N + cx; const here = (cx >= 0 && cy >= 0 && cx < N && cy < N) ? f[ci] : 1e9;
      if (here >= 1e8) {
        if (!B.grid[ci]) { // encerrado: romper el muro más cercano hacia el objetivo
          let best = null, bd = 1e9; for (const w of B.base) if (!w.dead && w.t === 'wall') { const dd = rectDist(u, w) + rectDist(w, u.tgt.b) * .6; if (dd < bd) { bd = dd; best = w; } }
          if (best) { u.tgt = { b: best }; continue; }
        }
      } else if (here > 0) {
        let bx = cx, by = cy, bv = here;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const nx = cx + ox, ny = cy + oy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const v = f[ny * N + nx]; if (v < bv) { bv = v; bx = nx; by = ny; } }
        mx = bx + .5 - u.x; my = by + .5 - u.y;
      }
    }
    const L = Math.hypot(mx, my) || 1; u.x += mx / L * Math.min(sp, L); u.y += my / L * Math.min(sp, L); u.vx = mx; u.vy = my;
  }
  // separación suave entre tropas
  const live = B.units.filter(u => !u.dead && !u.d.air);
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) { const a = live[i], b = live[j]; const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy; if (d2 < .09 && d2 > 1e-6) { const d = Math.sqrt(d2), p = (.3 - d) * .5 / d; a.x -= dx * p; a.y -= dy * p; b.x += dx * p; b.y += dy * p; } }
  // ---- defensas ----
  for (const b of B.base) {
    if (b.dead) continue;
    if (b.infect > 0) { b.infect -= dt; damageBuilding(b, Math.max(12 * B.core, b.max * .03) * dt); }
    if (b.stun > 0) { b.stun -= dt; continue; }
    if (B.wx === 'acid' && TARGETABLE(b.t)) damageBuilding(b, b.max * .0025 * dt);
    if (B.defFac === 'volt' && b.dmgT !== undefined) { b.dmgT -= dt; if (b.dmgT < 0 && b.hp < b.max) b.hp = Math.min(b.max, b.hp + b.max * .004 * dt); }
    if (b.t.startsWith('trap')) {
      const st = DEFSTAT[b.t]; for (const u of B.units) if (u.side === 'att' && !u.dead && (u.d.air ? st.air : st.ground) && Math.hypot(u.x - (b.x + .5), u.y - (b.y + .5)) < st.radius) {
        b.dead = true; b.hidden = false; fxAt(b.x + .5, b.y + .5, B.defFac === 'nuw' ? 'nube_toxica' : B.defFac === 'volt' ? 'onda_emp' : 'explosion_energia', .8, 110, 0);
        for (const v of B.units) if (v.side === 'att' && !v.dead && (v.d.air ? st.air : st.ground) && Math.hypot(v.x - (b.x + .5), v.y - (b.y + .5)) < st.radius + .4) damageUnit(v, st.dmg * Math.pow(1.15, b.lv - 1)); break;
      } continue;
    }
    if (!isDefense(b.t)) continue;
    if (b.t === 'd6' && B.defFac === 'volt') continue;  // el generador de escudo no dispara
    if (b.t === 'ult' && B.defFac === 'nuw') { b.cd -= dt; if (b.cd < 0) { b.cd = 4; if (B.units.some(u => u.side === 'att' && !u.dead && Math.hypot(u.x - b.x - 1.5, u.y - b.y - 1.5) < 11)) { spawnUnit('def', 'nuw', 'cria_enjambre', b.x + 1.5, b.y + 3.2); spawnUnit('def', 'nuw', 'escupidor', b.x + 3.2, b.y + 1.5); } } }
    const st = defStats(b); b.cd -= dt; if (b.cd > 0) continue;
    const [cx, cy] = bCenter(b); let tgt = null, bd = 1e9, taunt = false;
    for (const u of B.units) {
      if (u.side !== 'att' || u.dead || u.stealthT > 0) continue; if (u.d.air ? !st.air : !st.ground) continue;
      const dd = Math.hypot(u.x - cx, u.y - cy); if (dd > st.range + SIZE[b.t] / 2 || dd < st.min) continue;
      const tt = !!u.d.ex.taunt; if (tt && !taunt) { taunt = true; tgt = u; bd = dd; continue; } if (taunt && !tt) continue;
      if (dd < bd) { bd = dd; tgt = u; }
    }
    if (!tgt) continue;
    b.cd = st.rate; b.aim = [tgt.x - cx, tgt.y - cy]; b.aimT = performance.now(); b.kick = 1;
    const dmg = st.dps * st.rate;
    const kind = DEFSTAT[b.t].fx; const sp = kind === 'arc' ? 7 : kind === 'beam' || kind === 'zap' ? 60 : 14;
    if (kind === 'proj' || kind === 'big' || kind === 'missile') fxAnim(cx, cy, B.defFac === 'res' ? 'res_fogonazo' : B.defFac === 'volt' ? 'volt_impacto' : 'nuw_impacto', 34, .2, 40);
    B.proj.push({ x: cx, y: cy, z: 1.4, tx: tgt.x, ty: tgt.y, u: tgt, dmg, splash: st.splash, sp, col: PCOL[B.defFac], who: 'att', kind, t0: Math.hypot(tgt.x - cx, tgt.y - cy) / sp, t: 0 });
    if (b.t === 'd4' && B.defFac === 'nuw') { tgt.slowT = 1; }
  }
  // ---- proyectiles ----
  B.proj = B.proj.filter(p => {
    const tx = p.u ? p.u.x : p.tx, ty = p.u ? p.u.y : p.ty; const dx = tx - p.x, dy = ty - p.y, L = Math.hypot(dx, dy); p.t = (p.t || 0) + dt;
    const step = p.sp * dt;
    if (L <= step) {
      if (p.who === 'att') { if (p.splash) areaDamage(tx, ty, p.splash, p.dmg, 'att'); else if (p.u) damageUnit(p.u, p.dmg); }
      else { if (p.splash) areaDamage(tx, ty, p.splash, p.dmg, 'def'); else if (p.b) damageBuilding(p.b, p.dmg); }
      { const pf = p.fac || (p.who === 'att' ? BAT.defFac : BAT.attFac), big = p.kind === 'big' || p.splash > 1;
        if (S('comun/fx/res_impacto_0')) fxAnim(tx, ty, pf + (big ? (pf === 'nuw' ? '_esporas' : '_explosion') : '_impacto'), big ? 70 + p.splash * 30 : 40, big ? .6 : .3, 0);
        else if (big) fxAt(tx, ty, BAT.defFac === 'nuw' && p.who === 'att' ? 'acido' : 'explosion_energia', .5, 70 + p.splash * 20, 0); }
      return false;
    }
    p.x += dx / L * step; p.y += dy / L * step; return true;
  });
  // ---- clima con impacto ----
  B.wxT += dt;
  if ((B.wx === 'ion' && B.wxT > 3) || (B.wx === 'meteor' && B.wxT > 4)) {
    B.wxT = 0; const tx = 6 + Math.random() * (N - 12), ty = 6 + Math.random() * (N - 12);
    if (B.wx === 'ion') { const [px, py] = iso(tx, ty); const [sx, sy] = toScreen(px, py); lightningAt(sx, sy); fxAt(tx, ty, 'rayo_cadena', .5, 80, 30); }
    else { fxAt(tx, ty, 'meteoro', .6, 110, 60); setTimeout(() => BAT && fxAt(tx, ty, 'fuego', 1.2, 70, 0), 500); }
    areaDamage(tx, ty, 1.6, (B.wx === 'ion' ? 120 : 180) * B.core, 'all');
  }
  B.units = B.units.filter(u => !u.dead || (u.deadT = (u.deadT || 0) + dt) < .01);
  // ---- fin ----
  const pct = B.destroyed / Math.max(1, B.total);
  const left = Object.values(B.avail).reduce((a, b) => a + b, 0) + (B.heroAvail ? 1 : 0);
  const alive = B.units.some(u => u.side === 'att' && !u.dead && !u.isTurret);
  const abilLeft = B.abils.some(a => a.left > 0) && alive;
  const aiLeft = B.ai && B.ai.some(w => !w.done);
  if (B.t >= B.dur || pct >= 1 || (B.started && !alive && !left && !aiLeft) || (B.mode === 'defend' && !aiLeft && !alive && B.t > 3)) endBattle();
  if (B.redFlash > 0) B.redFlash -= dt * 2;
}
function stars() { const B = BAT; const pct = B.destroyed / Math.max(1, B.total); return (pct >= .5 ? 1 : 0) + (B.coreDead ? 1 : 0) + (pct >= 1 ? 1 : 0); }
function endBattle(surrender) {
  const B = BAT; if (B.over) return; B.over = true;
  const st = stars(), pct = B.destroyed / Math.max(1, B.total);
  let res = { st, pct, A: 0, B: 0, gems: 0, troph: 0 };
  if (B.mode === 'attack') {
    const mul = B.wx === 'aurora' ? 1.2 : 1;
    res.A = Math.floor(B.loot.A * pct * mul); res.B = Math.floor(B.loot.B * pct * mul);
    res.C = Math.floor((B.loot.C || 0) * pct * mul);
    { const lm = lootMul(); res.A = Math.round(res.A * lm); res.B = Math.round(res.B * lm); }
    res.A = Math.min(res.A, Math.max(0, storeCap('A') - G.A)); res.B = Math.min(res.B, Math.max(0, storeCap('B') - G.B)); res.C = Math.min(res.C, Math.max(0, storeCap('C') - (G.C || 0)));
    G.A += res.A; G.B += res.B; G.C = (G.C || 0) + res.C; res.troph = st ? st * 8 : -5; G.trophies = Math.max(0, G.trophies + res.troph);
    if (st === 3) { res.gems = 5; PROFILE.gems += 5; }
    if (B.campaign) { const k = B.campaign; G.campaign[k] = Math.max(G.campaign[k] || 0, st); }
    // experiencia: 1 por tropa soltada + bonus por estrellas
    res.ups = [];
    // cada tropa que participa con al menos el 10 % del ejército gana 3 + estrellas (menos si se usa poco)
    const armySp = Math.max(1, Object.entries(B.xp).filter(([k]) => !k.startsWith('HERO')).reduce((a, [, v]) => a + v, 0));
    for (const k in B.xp) { const share = k.startsWith('HERO') ? 1 : Math.min(1, B.xp[k] / (armySp * 0.1)); const n = Math.round((3 + st) * share); if (n > 0) { const up = addXP(k, n); if (up) res.ups.push(up); } }
    // tropas usadas se pierden
    for (const k in G.army) G.army[k] = B.avail[k] || 0;
  } else {
    // robo según lo destruido (hasta un 20 % de lo no protegido) y escudo si pierdes
    for (const r of ['A', 'B', 'C']) { const have = G[r] || 0, safe = Math.min(have, protCap(r)); res[r] = -Math.floor((have - safe) * 0.2 * pct); G[r] = have + res[r]; res['safe' + r] = safe; }
    if (pct >= .5) { res.troph = -8; const h = pct >= .9 ? 8 : pct >= .7 ? 6 : 4; G.shield = Date.now() + h * 3600 * 1000 / PROFILE.speed; res.shieldH = h; }
    else { res.gems = 4; PROFILE.gems += 4; res.troph = 6; }
    if (pct < .5) for (const r of ['A', 'B', 'C']) if (res[r] === 0) delete res[r];
    G.trophies = Math.max(0, G.trophies + res.troph);
  }
  saveProfile(); showBattleEnd(res);
}

// ---------- dibujo del combate ----------
function drawBattle(dt) {
  const B = BAT; drawGround(B.defFac);
  if (B.redFlash > 0) { ctx.globalAlpha = Math.min(.5, B.redFlash); for (const b of B.base) { if (b.dead || b.t === 'deco' || b.t.startsWith('trap')) continue; const s = SIZE[b.t]; diamond(b.x - 1, b.y - 1, s + 2, 'rgba(255,40,40,.35)'); } ctx.globalAlpha = 1; }
  const ents = [];
  for (const b of B.base) { if (b.hidden && !b.dead && !B.seeTraps) continue; if (b.t.startsWith('trap') && b.dead) continue; ents.push({ z: b.x + b.y + SIZE[b.t] * 1.5, b }); }
  for (const u of B.units) if (!u.dead) ents.push({ z: u.x + u.y + (u.d.air ? 50 : .2), u });
  ents.sort((a, b) => a.z - b.z);
  const now = performance.now();
  for (const e of ents) {
    if (e.b) {
      const b = e.b, s = SIZE[b.t];
      if (b.dead) { if (b.t !== 'wall') drawSprite('comun/efectos/escombros', b.x + s / 2 + s * .25, b.y + s / 2 + s * .25, s * TW * .7, { alpha: .9 }); continue; }
      const o = { filter: b.infect > 0 ? 'hue-rotate(60deg) saturate(1.5)' : b.stun > 0 ? 'grayscale(1) brightness(.7) drop-shadow(0 0 6px #6cf)' : now - (b._hitT || 0) < 70 ? 'brightness(1.9) saturate(.6)' : null, alpha: b.hidden ? .55 : 1 };
      animOpts(b, o, FACTIONS[B.defFac].color, B.defFac); const wk = bSprite(B.defFac, b), wd = b.t === 'wall' && S(wk + '_x') ? wallDraw(B.base, b, wk, o) : null; const after = wd ? wd.after : b.t === 'wall' ? wallLinks(B.base, b, wk, o) : null;
      const r = wd ? wd.r : (b.t === 'deco') ? drawSprite(bSprite(B.defFac, b), b.x + s * .75, b.y + s * .75, s * TW * .75, o) : drawOnTile(o.frame || bSprite(B.defFac, b), b.x, b.y, s, o);
      if (after) after();
      if (r && o.spark) sparks(r, b);
      if (r && b.hp < b.max && TARGETABLE(b.t)) hpBar(r[0] + r[2] / 2, r[1] - 6, Math.min(60, r[2] * .5), b.hp / b.max);
      if (r && b.t === 'wall' && b.hp < b.max) hpBar(r[0] + r[2] / 2, r[1] - 4, 26, b.hp / b.max);
    } else {
      const u = e.u, d = u.d; const atl = FACTIONS[u.fac].atlas;
      const vsx = (u.vx - u.vy), vsy = (u.vx + u.vy) * .5; const front = vsy >= -0.05; const flip = vsx < 0;
      let key = `${atl}/tropas/${d.sprite}_${front ? 'frente' : 'espalda'}`; if (!S(key)) key = `${atl}/tropas/${d.sprite}_frente`; let s = S(key); if (!s) continue;
      const hgt = d.key === 'PATROL' ? 70 : d.hero ? 96 : d.space >= 10 ? 110 : d.space >= 5 ? 80 : d.space >= 3 ? 66 : 54; let wid = hgt * s.w / s.h;
      // pose de ataque un instante tras cada disparo (misma escala que la de frente; el efecto sale hacia delante)
      let atkDx = 0; const ak = `${atl}/tropas/${d.sprite}_ataque`, sa = front && u.atkT && now - u.atkT < 260 ? S(ak) : null;
      if (sa) { const sc = Math.min(wid, hgt * 1.6) / s.w; atkDx = (sa.w - s.w) / 2 * sc * cam.z * (flip ? -1 : 1); key = ak; wid = sa.w * sc; s = sa; }
      const mv = Math.hypot(u.x - (u._lx ?? u.x), u.y - (u._ly ?? u.y)); u._lx = u.x; u._ly = u.y; u._mvT = mv > .0005 ? now : (u._mvT || 0); const moving = now - u._mvT < 120; u._ph = (u._ph || u.id) + mv * 11;
      const step = Math.sin(u._ph), wTilt = d.air ? Math.sin(now / 400 + u.id) * .05 : moving ? step * .085 : Math.sin(now / 900 + u.id) * .015, wSq = d.air ? 1 : moving ? 1 - Math.abs(Math.cos(u._ph)) * .07 : 1 + Math.sin(now / 520 + u.id) * .018;
      const bob = (moving && !d.air ? Math.abs(step) * 4 : 0) + (d.air ? (u.patrol ? 70 : 46) + Math.sin(now / 300 + u.id) * 5 : 0);
      if (d.air) { const [px, py] = iso(u.x, u.y); const [sx, sy] = toScreen(px, py); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, 14 * cam.z, 6 * cam.z, 0, 0, 7); ctx.fill(); }
      const aur = null;
      const glow = aur ? '' : u.side === 'att' && u.lv >= 5 ? `drop-shadow(0 0 ${u.lv >= 10 ? 7 : 3}px ${FACTIONS[u.fac].color})` : '';
      const FN = u.side === 'att' && B.mode === 'attack' && G && G.finish ? FINISH[G.finish] : null, fin = FN && FN.f !== 'IRID' ? FN.f : '';
      const f = [now - (u._hitT || 0) < 70 ? 'brightness(2.3)' : '', fin, glow, u.stealthT > 0 ? 'opacity(.45)' : '', u.side === 'def' ? (u.guard ? 'drop-shadow(0 0 3px #4fd1ff)' : 'drop-shadow(0 0 3px #f33)') : '', u.shieldT > 0 ? 'drop-shadow(0 0 6px #6cf)' : '', u.frenzyT > 0 ? 'drop-shadow(0 0 6px #f60)' : ''].join(' ').trim();
      const r = drawSprite(key, u.x, u.y, sa ? wid : Math.min(wid, hgt * 1.6), { flip, lift: bob, tilt: sa ? 0 : wTilt * (flip ? -1 : 1), sq: sa ? 1 : wSq, filter: f || null, sdx: atkDx, halo: aur || (FN && FN.halo ? haloColor(FN.halo) : null), haloFx: !aur && FN ? FN.fx : null, seed: u.id * .37 });
      if (r && u.hp < u.max) hpBar(r[0] + (flip ? 0 : r[2] / 2), r[1] - 4, 22, u.hp / u.max, u.side === 'def' && !u.guard ? '#ff5d5d' : null);
    }
  }
  // proyectiles
  for (const p of B.proj) {
    const [a, b] = iso(p.x, p.y); const [sx, sy] = toScreen(a, b); const lift = (p.z || .5) * 30 * cam.z;
    if ((p.kind === 'beam' || p.kind === 'zap') && drawBeam(p, sx, sy - lift)) continue;
    if (p.kind === 'beam' || p.kind === 'zap') { const tx = p.u ? p.u.x : p.tx, ty = p.u ? p.u.y : p.ty; const [c, d] = iso(tx, ty); const [ex, ey] = toScreen(c, d); ctx.strokeStyle = p.col; ctx.lineWidth = 3 * cam.z; ctx.shadowColor = p.col; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(sx, sy - lift); ctx.lineTo(ex, ey - 14 * cam.z); ctx.stroke(); ctx.shadowBlur = 0; continue; }
    let arc = 0; if (p.kind === 'arc') { const k = Math.min(1, p.t / Math.max(.01, p.t0)); arc = Math.sin(k * Math.PI) * 80 * cam.z; }
    if (drawProj(p, sx, sy - lift - arc, arc)) continue;
    ctx.fillStyle = p.col; ctx.shadowColor = p.col; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(sx, sy - lift - arc, (p.kind === 'big' ? 7 : p.splash ? 5 : 3.2) * cam.z, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  drawFX(dt);
}

// ---------- proyectiles dibujados (8 direcciones) y rayos estirados ----------
const PSPR = { res: { proj: 'res_bala', arc: 'res_obus', missile: 'res_cohete', big: 'res_energia', beam: 'res_obus', splash: 'res_cohete' },
  volt: { proj: 'volt_laser', arc: 'volt_plasma', missile: 'volt_misil', big: 'volt_plasma', splash: 'volt_plasma', unit: 'volt_laser' },
  nuw: { proj: 'nuw_pua', arc: 'nuw_acido', missile: 'nuw_avispa', big: 'nuw_orbe', splash: 'nuw_acido', beam: 'nuw_orbe' } };
const BEAM = { volt: { beam: 'volt_rayo', zap: 'volt_tesla' }, res: { zap: 'res_llamas' }, nuw: { zap: 'nuw_chorro' } };
function drawProj(p, x, y, arc) {
  const fac = p.fac || (p.who === 'att' ? BAT.defFac : BAT.attFac), T = PSPR[fac]; if (!T) return false;
  const name = T[p.kind] || (p.splash ? T.splash : null) || T.proj; if (!S('comun/fx/' + name + '_0')) return false;
  const tx = p.u ? p.u.x : p.tx, ty = p.u ? p.u.y : p.ty; const [a, b] = iso(tx, ty); const [ex, ey] = toScreen(a, b);
  let dx = ex - x, dy = (ey - 30 * cam.z) - y; if (p.kind === 'arc') { const k = Math.min(1, p.t / Math.max(.01, p.t0)); dy -= Math.cos(k * Math.PI) * 60 * cam.z; }
  const i = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8, s = S(`comun/fx/${name}_${i}`); if (!s) return false;
  const w = (p.kind === 'big' ? 80 : p.splash ? 62 : 50) * cam.z, h = w * s.h / s.w;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(s.img, s.x, s.y, s.w, s.h, x - w / 2, y - h / 2, w, h); ctx.restore(); return true;
}
function drawBeam(p, x, y) {
  const fac = p.fac || (p.who === 'att' ? BAT.defFac : BAT.attFac), name = BEAM[fac] && BEAM[fac][p.kind]; if (!name || !S('comun/fx/' + name + '_0')) return false;
  if (p.ox == null) { p.ox = x; p.oy = y; }
  const tx = p.u ? p.u.x : p.tx, ty = p.u ? p.u.y : p.ty; const [a, b] = iso(tx, ty); const [ex, ey0] = toScreen(a, b), ey = ey0 - 20 * cam.z;
  const L = Math.hypot(ex - p.ox, ey - p.oy); if (L < 4) return true;
  const s = S(`comun/fx/${name}_${Math.floor(performance.now() / 50) % 8}`), th = (name === 'res_llamas' || name === 'nuw_chorro' ? 40 : 26) * cam.z;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(p.ox, p.oy); ctx.rotate(Math.atan2(ey - p.oy, ex - p.ox));
  ctx.drawImage(s.img, s.x, s.y, s.w, s.h, 0, -th / 2, L, th); ctx.restore(); return true;
}
