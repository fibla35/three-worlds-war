// ===== Three Worlds War · extras: combate determinista, repeticiones, "juice", bienvenida, cofre diario, pase de temporada =====
(() => {
  const wrap = (name, fn) => { const o = window[name]; if (typeof o !== 'function') return; window[name] = function (...a) { return fn(o, this, a); }; };
  const now = () => performance.now();
  // ---------- 1. combate determinista (misma semilla + mismas órdenes = mismo resultado) ----------
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const withRng = (rng, fn) => { const R = Math.random; Math.random = rng; try { return fn(); } finally { Math.random = R; } };
  wrap('startBattle', (o, th, a) => {
    const opt = a[0]; if (opt.seed == null) opt.seed = Math.floor(Math.random() * 2147483647);
    const rng = mulberry(opt.seed); const r = withRng(rng, () => o.apply(th, a));
    if (BAT) { BAT.rng = rng; BAT.seed = opt.seed; BAT.later = BAT.later || []; BAT._stars = 0; }
    return r;
  });
  wrap('battleStep', (o, th, a) => {
    const B = BAT; if (!B || !B.rng) return o.apply(th, a);
    return withRng(B.rng, () => {
      if (B.later.length) { const due = B.later.filter(x => x.t <= B.t); if (due.length) { B.later = B.later.filter(x => x.t > B.t); for (const x of due) x.f(); } }
      const r = o.apply(th, a);
      if (B.mode === 'attack' && !B.over) { const st = stars(); if (st > B._stars) { B._stars = st; starPop(st); } }
      return r;
    });
  });
  // ---------- 2. repeticiones de defensa ----------
  wrap('endBattle', (o, th, a) => {
    const B = BAT;
    if (B && B.replay) { if (B.over) return; B.over = true; const pct = Math.round(100 * B.destroyed / Math.max(1, B.total));
      openModal(`<h2>▶️ Fin de la repetición</h2><p>Destruyeron el <b>${pct} %</b> de tu base.</p><div class="col"><button class="btn" onclick="closeModal();startDefense(G.replays[${B.repIdx || 0}])">🔁 Verla otra vez</button><button class="btn ghost" onclick="closeModal();backToBase()">Volver a la base</button></div>`); return; }
    const was = B && B.over; const r = o.apply(th, a);
    if (B && !was && B.mode === 'defend' && B.opt) {
      G.replays = G.replays || []; const pct = B.destroyed / Math.max(1, B.total);
      G.replays.unshift({ when: Date.now(), ef: B.attFac, pct, opts: B.opt }); G.replays = G.replays.slice(0, 5); saveProfile();
      setTimeout(() => { const box = document.querySelector('#modal .box .col, #modal .box'); if (box && !document.getElementById('repB')) box.insertAdjacentHTML('beforeend', `<button id="repB" class="btn ghost" style="margin-top:8px" onclick="closeModal();startDefense(G.replays[0])">▶️ Ver repetición</button>`); }, 60);
    }
    return r;
  });
  wrap('startDefense', (o, th, a) => { const r = o.apply(th, a); if (a[0] && BAT) BAT.repIdx = (G.replays || []).indexOf(a[0]); return r; });
  window.openDefendMenu = () => {
    closePanel(); const R = G.replays || [];
    const list = R.length ? R.map((r, i) => `<div class="dmis"><div><b>${FACTIONS[r.ef].name}</b><small> · ${agoTxt(r.when)}</small><div class="bar"><span style="width:${Math.round(r.pct * 100)}%;background:${r.pct >= .5 ? '#ff5d5d' : '#5fd17a'}"></span></div><small>${r.pct >= .5 ? 'Derrota' : 'Defendida'} · ${Math.round(r.pct * 100)} % destruido</small></div><button class="btn" onclick="closeModal();startDefense(G.replays[${i}])">▶️ Ver</button></div>`).join('') : '<p style="opacity:.7">Aún no te han invadido.</p>';
    openModal(`<h2>🛡️ Defensa</h2><p>Pon a prueba tu base contra una invasión. Tus tropas de los campamentos salen a defender.</p><button class="btn gold" onclick="closeModal();startDefense()">⚔️ Simular invasión</button><h3>Repeticiones</h3>${list}<button class="btn ghost" style="margin-top:10px" onclick="closeModal()">Cerrar</button>`);
  };
  const agoTxt = t => { const s = (Date.now() - t) / 1000; return s < 90 ? 'hace un momento' : s < 3600 ? `hace ${Math.round(s / 60)} min` : s < 86400 ? `hace ${Math.round(s / 3600)} h` : `hace ${Math.round(s / 86400)} d`; };
  window.agoTxt = agoTxt;
  // ---------- 3. "juice": temblor, destellos, números, monedas, vibración ----------
  let shakeA = 0, shakeT = 0;
  window.shake = (amp, ms = 260) => { if (amp > shakeA * (1 - (now() - shakeT) / 300)) { shakeA = amp; shakeT = now(); } };
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  (function shakeLoop() { const cv = document.getElementById('cv'); if (cv) { const k = Math.max(0, 1 - (now() - shakeT) / 300), a = shakeA * k * k; cv.style.transform = a > .3 ? `translate(${(Math.random() - .5) * 2 * a}px,${(Math.random() - .5) * 2 * a}px)` : ''; } requestAnimationFrame(shakeLoop); })();
  const FL = []; // números flotantes
  const addFloat = (x, y, txt, col, sz = 15) => { FL.push({ x, y, txt, col, sz, t0: now() }); if (FL.length > 60) FL.shift(); };
  window.addFloat = addFloat;
  wrap('damageBuilding', (o, th, a) => {
    const b = a[0], was = b.hp > 0; const r = o.apply(th, a);
    if (BAT && was) { b._hitT = now(); b._acc = (b._acc || 0) + a[1];
      if (b.t !== 'wall' && (now() - (b._flT || 0) > 380 || b.hp <= 0)) { const s = SIZE[b.t]; addFloat(b.x + s / 2, b.y + s / 2, '-' + fmtN(Math.round(b._acc)), '#ffe066', b.hp <= 0 ? 18 : 14); b._acc = 0; b._flT = now(); }
      if (b.hp <= 0) { const big = b.t === 'core'; shake(big ? 11 : b.t === 'wall' ? 1.5 : 4); if (big || isDefense(b.t)) buzz(big ? 60 : 25); SND.play(b.t === 'wall' ? 'crumble' : 'boom', big); } }
    return r;
  });
  wrap('damageUnit', (o, th, a) => {
    const v = a[0], was = v.hp > 0; const r = o.apply(th, a);
    if (BAT && was) { v._hitT = now(); v._acc = (v._acc || 0) + a[1];
      if (now() - (v._flT || 0) > 450 || v.hp <= 0) { addFloat(v.x, v.y, '-' + fmtN(Math.round(v._acc)), v.side === 'att' ? '#ff7b6b' : '#7fd6ff', 12); v._acc = 0; v._flT = now(); }
      if (v.hp <= 0) SND.play('die', v.fac); else if (Math.random() < .25) SND.play('hit'); }
    return r;
  });
  wrap('castAbility', (o, th, a) => { const r = o.apply(th, a); shake(5); buzz(30); return r; });
  wrap('heroAbility', (o, th, a) => { const r = o.apply(th, a); shake(6); buzz(30); return r; });
  wrap('deployAt', (o, th, a) => { const r = o.apply(th, a); buzz(8); return r; });
  wrap('drawBattle', (o, th, a) => {
    const r = o.apply(th, a); const t = now();
    for (let i = FL.length - 1; i >= 0; i--) { const f = FL[i], k = (t - f.t0) / 900; if (k >= 1) { FL.splice(i, 1); continue; }
      const [px, py] = toScreen(...iso(f.x, f.y)); const y = py - 40 * cam.z - k * 34, sc = k < .15 ? .6 + k / .15 * .5 : 1.1 - Math.min(.1, (k - .15));
      ctx.save(); ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1; ctx.font = `900 ${f.sz * sc * Math.max(.8, cam.z)}px Nunito,system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(f.txt, px, y); ctx.fillStyle = f.col; ctx.fillText(f.txt, px, y); ctx.restore(); }
    return r;
  });
  window.starPop = st => {
    SND.play('star', st); buzz(40); shake(3);
    const d = document.createElement('div'); d.className = 'starpop'; d.innerHTML = '★'.repeat(st) + `<small>${['', '¡50 % destruido!', '¡Núcleo destruido!', '¡Base arrasada!'][st] || ''}</small>`; document.body.appendChild(d); setTimeout(() => d.remove(), 1600);
  };
  // monedas que vuelan al marcador
  window.flyCoins = (sx, sy, r, n = 7) => {
    const tgt = document.getElementById('h' + r); if (!tgt) return; const pill = tgt.closest('.pill') || tgt; const q = pill.getBoundingClientRect(); const ex = q.left + 22, ey = q.top + q.height / 2; const src = resImg(r);
    for (let i = 0; i < n; i++) { const im = document.createElement('img'); im.src = src; im.className = 'flycoin'; document.body.appendChild(im);
      const ox = (Math.random() - .5) * 60, oy = -20 - Math.random() * 40;
      const an = im.animate([{ transform: `translate(${sx - 13}px,${sy - 13}px) scale(.4)`, opacity: 0 }, { transform: `translate(${sx + ox - 13}px,${sy + oy - 13}px) scale(1.1)`, opacity: 1, offset: .3 }, { transform: `translate(${ex - 13}px,${ey - 13}px) scale(.7)`, opacity: 1 }], { duration: 650 + i * 45, easing: 'cubic-bezier(.5,0,.6,1)', delay: i * 35 });
      an.onfinish = () => { im.remove(); if (i === n - 1) { pill.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }], { duration: 260 }); } if (i % 2 === 0) SND.play('tick', i); }; }
  };
  wrap('collect', (o, th, a) => {
    const b = a[0], before = b && b.acc; const r = o.apply(th, a);
    if (b && before >= 1 && b.acc < before) { const s = SIZE[b.t]; const [px, py] = toScreen(...iso(b.x + s / 2, b.y + s / 2)); flyCoins(px, py - 30, b.t === 'prodA' ? 'A' : b.t === 'prodC' ? 'C' : 'B'); }
    return r;
  });
  wrap('finishBusy', (o, th, a) => { const b = a[0]; const r = o.apply(th, a); if (MODE === 'base' && b) { shake(b.t === 'core' ? 6 : 1.5); buzz(15); } return r; });
  wrap('toast', (o, th, a) => { const m = String(a[0] || ''); if (/Te faltan|ocupados|Máximo|Necesita|No tienes|lleno/i.test(m)) { SND.play('deny'); const p = document.getElementById('panel'); if (p && p.classList.contains('open')) p.animate([{ transform: 'translate(-50%,0)' }, { transform: 'translate(calc(-50% - 7px),0)' }, { transform: 'translate(calc(-50% + 7px),0)' }, { transform: 'translate(-50%,0)' }], { duration: 220 }); } return o.apply(th, a); });
  wrap('openPanel', (o, th, a) => { const was = document.getElementById('panel').classList.contains('open'); const r = o.apply(th, a); if (!was) SND.play('whoosh'); return r; });
  wrap('openModal', (o, th, a) => { const r = o.apply(th, a); SND.play('pop'); return r; });

  // ---------- 4. bienvenida al volver + cofre diario ----------
  const today = () => new Date().toISOString().slice(0, 10);
  const durTxt = s => s < 3600 ? `${Math.round(s / 60)} min` : s < 86400 ? `${Math.floor(s / 3600)} h ${Math.round(s % 3600 / 60)} min` : `${Math.floor(s / 86400)} d ${Math.round(s % 86400 / 3600)} h`;
  window.chestReady = () => (PROFILE.chest || {}).day !== today();
  wrap('enterFaction', (o, th, a) => {
    const f = a[0], S0 = PROFILE.slots[f], t = Date.now();
    const pre = S0 ? { seen: S0.seen || 0, done: S0.buildings.filter(b => b.busy && b.busy.until <= t).map(b => `${bName(f, b.t)} → nivel ${b.busy.to}`) } : null;
    const r = o.apply(th, a);
    if (MODE === 'base' && G && G.fac === f && !G._welcomed) {
      G._welcomed = 1; G.seen = t; refreshChestBtn();
      const away = pre && pre.seen ? (t - pre.seen) / 1000 : 0, ready = { A: 0, B: 0, C: 0 };
      for (const b of G.buildings) if (/^prod/.test(b.t) && b.acc >= 1) ready[b.t === 'prodA' ? 'A' : b.t === 'prodC' ? 'C' : 'B'] += b.acc;
      const hasRes = ready.A + ready.B + ready.C >= 1;
      if ((away > 180 && (pre.done.length || hasRes)) || (chestReady() && G.tut >= 7)) setTimeout(() => welcome(away, pre ? pre.done : [], ready), 500);
    }
    return r;
  });
  setInterval(() => { if (G && MODE === 'base') G.seen = Date.now(); }, 15000);
  wrap('showTitle', (o, th, a) => { if (G) delete G._welcomed; return o.apply(th, a); });
  function welcome(away, done, ready) {
    const res = ['A', 'B', 'C'].filter(r => ready[r] >= 1).map(r => `<span class="wpill">${resIcon(r)} ${fmtN(ready[r])}</span>`).join('');
    openModal(`<h2>👋 ¡Hola, comandante!</h2>${away > 180 ? `<p style="opacity:.8">Has estado fuera ${durTxt(away)}.</p>` : ''}
      ${done.length ? `<h3>🔨 Obras terminadas</h3><div class="wlist">${done.slice(0, 6).map(d => `<div>✅ ${d}</div>`).join('')}${done.length > 6 ? `<div>… y ${done.length - 6} más</div>` : ''}</div>` : ''}
      ${res ? `<h3>🧺 Listo para recoger</h3><div class="wres">${res}</div><button class="btn" onclick="collectAll()">🧺 Recoger todo</button>` : ''}
      ${chestReady() ? chestHTML() : ''}
      <button class="btn ghost" style="margin-top:10px" onclick="closeModal()">¡A jugar!</button>`, 'welcome');
  }
  window.collectAll = () => { let n = 0; for (const b of G.buildings) if (/^prod/.test(b.t) && b.acc >= 1) { collect(b); n++; } refreshHUD(); const btn = document.querySelector('#modal .btn'); if (btn) { btn.textContent = '✓ Recogido'; btn.classList.add('off'); } return n; };
  const chestStreak = () => { const c = PROFILE.chest || {}; const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10); return c.day === y ? (c.streak || 0) + 1 : 1; };
  function chestHTML() { const s = chestStreak(); return `<h3>🎁 Cofre diario</h3><p style="font-size:13px;opacity:.8">Racha: día ${s} de 7${s >= 7 ? ' · ¡premio gordo!' : ''}</p><div class="chestbox" onclick="openChest(this)"><img src="${spriteURL('comun/obstaculos/cofre_gemas', 140)}"><b>Toca para abrir</b></div>`; }
  window.openChest = el => {
    if (!chestReady()) return; const s = chestStreak(), big = s % 7 === 0;
    const gems = big ? 100 : 10 + s * 5, ra = Math.round(storeCap('A') * (.05 + s * .01)), rb = Math.round(storeCap('B') * (.05 + s * .01));
    PROFILE.chest = { day: today(), streak: s }; PROFILE.gems += gems; const ga = Math.min(ra, storeCap('A') - G.A), gb = Math.min(rb, storeCap('B') - G.B); G.A += Math.max(0, ga); G.B += Math.max(0, gb);
    track && track('chest'); saveProfile(); SND.play('chest'); buzz([20, 40, 60]);
    if (el) { el.classList.add('opening'); const q = el.getBoundingClientRect(); setTimeout(() => { el.classList.remove('opening'); el.classList.add('opened');
      el.innerHTML = `<div class="burst"></div><div class="loot"><span>💎 +${gems}</span>${ga > 0 ? `<span>${resIcon('A')} +${fmtN(ga)}</span>` : ''}${gb > 0 ? `<span>${resIcon('B')} +${fmtN(gb)}</span>` : ''}</div>`;
      flyCoins(q.left + q.width / 2, q.top + q.height / 2, 'A', 6); setTimeout(() => flyCoins(q.left + q.width / 2, q.top + q.height / 2, 'B', 6), 150); refreshHUD(); refreshChestBtn(); }, 700); }
    else { toast(`🎁 +${gems} 💎`, 'gold'); refreshHUD(); refreshChestBtn(); }
  };
  window.refreshChestBtn = () => { let b = document.getElementById('chestB'); if (MODE !== 'base' || !chestReady()) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('button'); b.id = 'chestB'; b.onclick = () => openModal(`<h2>🎁 Cofre diario</h2>${chestHTML()}<button class="btn ghost" style="margin-top:10px" onclick="closeModal()">Cerrar</button>`); document.body.appendChild(b); }
    b.innerHTML = `<img src="${spriteURL('comun/obstaculos/cofre_gemas', 64)}"><span>¡Gratis!</span>`; };
  wrap('buildHUD', (o, th, a) => { const r = o.apply(th, a); refreshChestBtn(); passChip(); return r; });
  wrap('backToBase', (o, th, a) => { const r = o.apply(th, a); setTimeout(() => { refreshChestBtn(); passChip(); }, 50); return r; });
  ['launchAttack', 'startDefense', 'startRTS', 'showTitle'].forEach(n => wrap(n, (o, th, a) => { const b = document.getElementById('chestB'); if (b) b.remove(); return o.apply(th, a); }));

  // ---------- 5. primeros minutos ----------
  wrap('launchAttack', (o, th, a) => {
    const m = a[0]; const first = m === 1 && !(G.campaign && G.campaign[1]);
    const r = o.apply(th, a);
    if (first && BAT && BAT.mode === 'attack') { BAT.firstWin = true; for (const k in BAT.tmul) BAT.tmul[k] = { hp: (BAT.tmul[k].hp || 1) * 1.8, dmg: (BAT.tmul[k].dmg || 1) * 1.8, spd: BAT.tmul[k].spd || 1 }; for (const u of UNITS[G.fac]) if (!BAT.tmul[u[0]]) BAT.tmul[u[0]] = { hp: 1.8, dmg: 1.8, spd: 1 }; }
    return r;
  });
  window.tutReward = () => {
    if (PROFILE.tutGift) return; PROFILE.tutGift = 1; PROFILE.gems += 250; G.A = Math.min(storeCap('A'), G.A + 3000); G.B = Math.min(storeCap('B'), G.B + 3000); saveProfile(); refreshHUD();
    openModal(`<h2>🎖️ ¡Entrenamiento completado!</h2><p>Recompensa de comandante:</p><div class="chestbox opened"><div class="burst"></div><div class="loot"><span>💎 +250</span><span>${resIcon('A')} +3000</span><span>${resIcon('B')} +3000</span></div></div><p style="font-size:13px;opacity:.8">Vuelve cada día a por tu 🎁 cofre gratis y sube el 🎟️ pase de temporada.</p><button class="btn gold" onclick="closeModal()">¡Vamos!</button>`, 'welcome'); SND.play('chest');
  };
  wrap('tut', (o, th, a) => { const r = o.apply(th, a); const el = document.getElementById('tutb'); if (el && G && G.tut === 6) { const b = el.querySelector('button'); if (b && !b._gift) { b._gift = 1; b.textContent = '🎁 Recompensa'; b.onclick = () => { G.tut = 99; saveProfile(); tut(); tutReward(); }; } } return r; });

  // ---------- 6. pase de temporada ----------
  const TIERS = 30, XPT = 100;
  const seasonId = () => new Date().toISOString().slice(0, 7);
  const seasonName = () => 'Temporada de ' + new Date().toLocaleString('es-ES', { month: 'long' });
  const daysLeft = () => { const d = new Date(); const e = new Date(d.getFullYear(), d.getMonth() + 1, 1); return Math.ceil((e - d) / 864e5); };
  const P = () => { let p = PROFILE.pass; if (!p || p.id !== seasonId()) p = PROFILE.pass = { id: seasonId(), xp: 0, prem: false, got: {} }; return p; };
  window.passXP = (n, why) => { if (!PROFILE || !G) return; const p = P(), lv0 = Math.floor(p.xp / XPT); p.xp = Math.min(TIERS * XPT, p.xp + n); const lv1 = Math.floor(p.xp / XPT); saveProfile(); passChip();
    if (lv1 > lv0) { SND.play('up'); toast(`🎟️ ¡Pase nivel ${lv1}! Tienes premios esperando`, 'gold'); } };
  const reward = (i, prem) => { // i = 1..30
    const fac = G.fac, units = UNITS[fac].filter(u => !u[0].startsWith('x_')), u = units[(i * 3) % units.length][0];
    if (!prem) { if (i % 5 === 0) return { k: 'deco', v: SEASON[i % SEASON.length], n: 'Decoración' }; if (i % 2) return { k: 'gems', v: 10 + Math.floor(i / 3) * 2, n: 'Gemas' }; return { k: 'res', v: i, n: 'Recursos' }; }
    if (i % 6 === 0) return { k: 'skin', v: u, n: 'Skin élite' }; if (i % 4 === 0) return { k: 'deco', v: SEASON[(i * 7) % SEASON.length], n: 'Decoración' }; if (i % 3 === 0) return { k: 'res', v: i * 2, n: 'Recursos ×2' }; return { k: 'gems', v: 20 + i * 2, n: 'Gemas' };
  };
  const rwIcon = w => w.k === 'gems' ? `<b class="rwi">💎</b><small>${w.v}</small>` : w.k === 'res' ? `<b class="rwi">${resIcon('A')}</b><small>${fmtN(Math.round(storeCap('A') * .02 * Math.min(w.v, 30) / 3))}</small>` : w.k === 'deco' ? `<img src="${spriteURL('comun/temporada/' + w.v, 64)}"><small>Deco</small>` : `<img src="${spriteURL(`${FACTIONS[G.fac].atlas}/tropas/elite_${w.v}_frente`, 64)}"><small>Skin</small>`;
  window.claimPass = (i, prem) => {
    const p = P(), key = (prem ? 'p' : 'f') + i; if (p.got[key] || p.xp < i * XPT || (prem && !p.prem)) return;
    const w = reward(i, prem); p.got[key] = 1;
    if (w.k === 'gems') PROFILE.gems += w.v;
    else if (w.k === 'res') { const n = Math.round(storeCap('A') * .02 * Math.min(w.v, 30) / 3); G.A = Math.min(storeCap('A'), G.A + n); G.B = Math.min(storeCap('B'), G.B + n); }
    else if (w.k === 'deco') { PROFILE.freeDeco = PROFILE.freeDeco || {}; PROFILE.freeDeco[w.v] = (PROFILE.freeDeco[w.v] || 0) + 1; }
    else if (w.k === 'skin') { PROFILE.owned = PROFILE.owned || {}; PROFILE.owned['skin_' + G.fac + '_' + w.v] = 1; }
    SND.play('coin'); saveProfile(); refreshHUD(); openPass(i);
  };
  window.buyPremium = () => { const p = P(); if (p.prem) return; if (PROFILE.gems < 500) { toast('No tienes gemas suficientes (500 💎).'); return; } PROFILE.gems -= 500; p.prem = true; SND.play('chest'); saveProfile(); refreshHUD(); openPass(); };
  window.openPass = focus => {
    closePanel(); const p = P(), lv = Math.floor(p.xp / XPT), inLv = p.xp % XPT;
    let cols = ''; for (let i = 1; i <= TIERS; i++) { const f = reward(i, false), pr = reward(i, true), open = p.xp >= i * XPT;
      const cell = (w, prem) => { const key = (prem ? 'p' : 'f') + i, got = p.got[key], can = open && !got && (!prem || p.prem);
        return `<div class="pc ${prem ? 'prem' : ''} ${got ? 'got' : ''} ${can ? 'can' : ''} ${prem && !p.prem ? 'lock' : ''}" onclick="claimPass(${i},${prem})">${rwIcon(w)}${got ? '<i>✓</i>' : prem && !p.prem ? '<i>🔒</i>' : ''}</div>`; };
      cols += `<div class="pcol ${open ? 'open' : ''}" id="pcol${i}"><span class="pn">${i}</span>${cell(f, false)}${cell(pr, true)}</div>`; }
    openModal(`<h2>🎟️ ${seasonName()}</h2><p style="margin:0 0 6px;opacity:.8">Quedan ${daysLeft()} días · Nivel <b>${lv}</b> / ${TIERS}</p>
      <div class="pbar"><span style="width:${lv >= TIERS ? 100 : inLv}%"></span><em>${lv >= TIERS ? '¡Completo!' : `${inLv} / ${XPT} XP`}</em></div>
      <div class="prow-l"><span>Gratis</span><span>Premium ${p.prem ? '✓' : ''}</span></div><div class="pass">${cols}</div>
      ${p.prem ? '' : `<button class="btn gold" onclick="buyPremium()">⭐ Activar Premium · 💎 500</button>`}
      <p style="font-size:12px;opacity:.7;margin:8px 0">Ganas XP atacando, defendiendo, mejorando y con las misiones diarias.</p><button class="btn ghost" onclick="closeModal()">Cerrar</button>`, 'passm');
    setTimeout(() => { const el = document.getElementById('pcol' + Math.max(1, focus || lv)); if (el) el.scrollIntoView({ inline: 'center', block: 'nearest' }); }, 30);
  };
  window.passChip = () => { const ch = document.querySelector('#hud .chips'); if (!ch || !G) return; let c = document.getElementById('passC'); const p = P(), lv = Math.floor(p.xp / XPT);
    let pend = 0; for (let i = 1; i <= Math.min(lv, TIERS); i++) { if (!p.got['f' + i]) pend++; if (p.prem && !p.got['p' + i]) pend++; }
    if (!c) { c = document.createElement('span'); c.id = 'passC'; c.style.cursor = 'pointer'; c.style.pointerEvents = 'auto'; c.onclick = () => openPass(); ch.prepend(c); }
    c.innerHTML = `🎟️ Pase nv ${lv}${pend ? ` <b class="dot">${pend}</b>` : ''}`; };
  // XP del pase
  wrap('endBattle', (o, th, a) => { const B = BAT, was = B && B.over; const r = o.apply(th, a); if (B && !was && !B.replay) { const st = stars(); if (B.mode === 'attack') passXP(15 + st * 15); else if (B.mode === 'defend') passXP(B.destroyed / Math.max(1, B.total) < .5 ? 30 : 10); } return r; });
  wrap('finishBusy', (o, th, a) => { const r = o.apply(th, a); if (MODE === 'base') passXP(a[0] && a[0].t === 'core' ? 40 : 8); return r; });
  wrap('claimMission', (o, th, a) => { const r = o.apply(th, a); passXP(25); return r; });
  wrap('rtsEnd', (o, th, a) => { const r = o.apply(th, a); if (RTS && !RTS.auto && a[0]) passXP(40); return r; });
  // decoraciones del pase: se colocan gratis
  wrap('buildNew', (o, th, a) => { const [t, , , k] = a; const nm = t === 'deco' && k && k.startsWith('comun/temporada/') ? k.split('/').pop() : null;
    if (nm && PROFILE.freeDeco && PROFILE.freeDeco[nm] > 0) { PROFILE.gems += 60; const r = o.apply(th, a); if (r) PROFILE.freeDeco[nm]--; else PROFILE.gems -= 60; return r; }
    return o.apply(th, a); });
  // pestaña del pase en la tienda y botón Defender con repeticiones
  wrap('decorateHUD', (o, th, a) => { const r = o.apply(th, a); const d = [...document.querySelectorAll('#hud .bottom button')].find(b => /Defender/.test(b.textContent)); if (d) d.setAttribute('onclick', 'openDefendMenu()'); return r; });
})();
