// Three Worlds War · sistemas extra: tienda, ligas, misiones, logros, distribuciones, tutorial, edificios especiales
(() => {
  const wrap = (name, fn) => { const o = window[name]; if (typeof o !== 'function') return; window[name] = function (...a) { return fn(o, this, a); }; };
  const ui = (k, s = 40) => { try { return spriteURL('comun/ui/' + k, s); } catch (e) { return ''; } };
  const today = () => new Date().toISOString().slice(0, 10);

  // ---------- ligas ----------
  window.league = tr => { let L = LEAGUES[0]; for (const l of LEAGUES) if (tr >= l.t) L = l; return L; };
  window.lootMul = () => 1 + league(G.trophies || 0).loot + (hasB('hall') ? 0.10 : 0);
  window.openLeague = () => {
    const tr = G.trophies || 0, cur = league(tr);
    openModal(`<h2>🏆 Ligas</h2><p>Gana trofeos atacando para subir de liga. Cada liga da más botín.</p>
      <div class="lglist">${LEAGUES.map(l => `<div class="lg ${l === cur ? 'on' : ''}"><img src="${ui(l.k, 64)}" style="filter:${l.fl || 'none'}"><div><b>${l.n}</b><small>desde ${l.t} 🏆 · botín +${Math.round(l.loot * 100)} %</small></div></div>`).join('')}</div>
      <p>Tienes <b>${tr} 🏆</b>${hasB('hall') ? ' · Sala de trofeos: +10 % botín extra' : ''}</p><button class="btn" onclick="closeModal()">Cerrar</button>`);
  };

  // ---------- estadísticas, misiones diarias y logros ----------
  const ST = () => (PROFILE.stats = PROFILE.stats || {});
  function daily() {
    const D = PROFILE.daily;
    if (D && D.day === today()) return D;
    const pool = [...MISSION_POOL].sort(() => Math.random() - .5).slice(0, 3);
    return (PROFILE.daily = { day: today(), list: pool.map(m => ({ id: m.id, d: m.d, goal: m.n[Math.floor(Math.random() * m.n.length)], g: m.g, p: 0, ok: false })) });
  }
  window.track = (id, n = 1) => {
    if (typeof PROFILE === 'undefined' || !PROFILE) return;
    const s = ST(); s[id] = (s[id] || 0) + n;
    for (const m of daily().list) if (m.id === id && !m.ok) m.p = Math.min(m.goal, m.p + n);
    if (typeof refreshMissBadge === 'function') refreshMissBadge(); saveProfile();
  };
  window.missionsPending = () => daily().list.filter(m => m.p >= m.goal && !m.ok).length + ACHIEVEMENTS.filter((a, i) => achVal(a) >= a.n && !(PROFILE.ach || {})[i]).length;
  const achVal = a => a.id === 'core' ? Math.max(...Object.values(PROFILE.slots).map(s => s.core || 1)) : a.id === 'troph' ? Math.max(0, ...Object.values(PROFILE.slots).map(s => s.trophies || 0)) : (ST()[a.id] || 0);
  window.claimMission = i => { const m = daily().list[i]; if (m.p < m.goal || m.ok) return; m.ok = true; PROFILE.gems += m.g; SND && SND.play('coin'); toast(`+${m.g} 💎`, 'gold'); saveProfile(); refreshHUD(); openMissions(); };
  window.claimAch = i => { PROFILE.ach = PROFILE.ach || {}; const a = ACHIEVEMENTS[i]; if (PROFILE.ach[i] || achVal(a) < a.n) return; PROFILE.ach[i] = 1; PROFILE.gems += a.g; SND && SND.play('up'); toast(`🏅 ${a.d} · +${a.g} 💎`, 'gold'); saveProfile(); refreshHUD(); openMissions(); };
  window.openMissions = () => {
    const D = daily(), A = PROFILE.ach || {};
    const ms = D.list.map((m, i) => `<div class="dmis"><div><b>${m.d.replace('{n}', fmtN(m.goal)).replace(' 1 veces', ' 1 vez')}</b><div class="bar"><span style="width:${m.p / m.goal * 100}%"></span></div><small>${fmtN(m.p)} / ${fmtN(m.goal)}</small></div>
      ${m.ok ? '<span class="ok">✓</span>' : `<button class="btn ${m.p >= m.goal ? 'gold' : 'off'}" onclick="claimMission(${i})">💎 ${m.g}</button>`}</div>`).join('');
    const as = ACHIEVEMENTS.map((a, i) => { const v = Math.min(achVal(a), a.n); return `<div class="dmis"><div><b>🏅 ${a.d}</b><div class="bar"><span style="width:${v / a.n * 100}%"></span></div><small>${fmtN(v)} / ${fmtN(a.n)}</small></div>
      ${A[i] ? '<span class="ok">✓</span>' : `<button class="btn ${v >= a.n ? 'gold' : 'off'}" onclick="claimAch(${i})">💎 ${a.g}</button>`}</div>`; }).join('');
    openPanel(`<h3>📋 Misiones diarias</h3><p style="margin:0 0 4px;opacity:.7;font-size:12px">Se renuevan cada día</p>${ms}<h3 style="margin-top:12px">🏅 Logros</h3>${as}`);
  };
  window.refreshMissBadge = () => { const b = document.getElementById('missB'); if (b) { const n = missionsPending(); b.dataset.n = n || ''; } };

  wrap('collect', (o, th, a) => { const r = a[0].t === 'prodA' ? 'A' : a[0].t === 'prodC' ? 'C' : 'B', g0 = G[r]; const res = o.apply(th, a); if (res) track('collect', G[r] - g0); tut('collect'); return res; });
  wrap('startUpgrade', (o, th, a) => { const b = a[0], busy0 = !!b.busy; const r = o.apply(th, a); if (!busy0 && b.busy) track('upgrade'); return r; });
  wrap('spawnUnit', (o, th, a) => { const r = o.apply(th, a); if (a[0] === 'att' && typeof BAT !== 'undefined' && BAT && BAT.mode === 'attack' && !BAT._sim) { track('deploy'); if (!window._dfx || performance.now() - window._dfx > 120) { window._dfx = performance.now(); typeof fxAnim === 'function' && fxAnim(a[3], a[4], 'despliegue', 60, .5, 0); } } return r; });
  wrap('endBattle', (o, th, a) => {
    const B = BAT, done = B && B.over; const r = o.apply(th, a);
    if (B && !done) {
      const st = stars();
      if (B.mode === 'attack') { if (st > 0) track('win'); track('stars', st); if (st === 3) track('star3'); track('destroy', B.destroyed || 0); }
      else if (st === 0) track('defend');
      tut('battle');
    }
    return r;
  });

  // ---------- tienda ----------
  const OWN = () => (PROFILE.owned = PROFILE.owned || {});
  let STAB = 'gems';
  const buy = (key, price, after) => { if (OWN()[key]) return after && after(); if (PROFILE.gems < price) { toast(`Necesitas ${price} 💎`); return; } PROFILE.gems -= price; OWN()[key] = 1; SND && SND.play('up'); toast('¡Comprado!', 'gold'); saveProfile(); refreshHUD(); after && after(); };
  window.storeBuy = (key, price, kind, arg) => buy(key, price, () => {
    if (kind === 'skin') { G.skins = G.skins || {}; G.skins[arg] = true; }
    if (kind === 'ed') { G.bskin = G.bskin || {}; G.bskin[arg] = true; }
    if (kind === 'floor') { G[arg.slot] = arg.k; }
    saveProfile(); openStore();
  });
  window.storeGems = n => { PROFILE.gems += n; SND && SND.play('coin'); toast(`+${n} 💎 (compra de prueba)`, 'gold'); saveProfile(); refreshHUD(); openStore(); };
  window.openStore = tab => {
    if (tab) STAB = tab; const F = FACTIONS[G.fac], atl = F.atlas, own = OWN();
    const tabs = [['gems', '💎 Gemas'], ['skins', '🎨 Skins'], ['ed', '✨ Ediciones'], ['season', '🎃 Temporada'], ['floor', '🟫 Suelos']].map(([k, n]) => `<button class="tab ${k === STAB ? 'on' : ''}" onclick="openStore('${k}')">${n}</button>`).join('');
    let items = '';
    if (STAB === 'gems') items = [[500, '0,99 €'], [1200, '1,99 €'], [2600, '3,99 €'], [7000, '9,99 €'], [15000, '19,99 €']].map(([n, p]) => `<div class="item" onclick="storeGems(${n})"><div class="gemico">💎</div><b>${fmtN(n)} gemas</b><small>${p}</small></div>`).join('') + '<p class="note">Prototipo: las compras son de prueba y no cobran nada.</p>';
    if (STAB === 'skins') items = UNITS[G.fac].filter(u => S(`${atl}/tropas/elite_${u[0]}_frente`)).map(u => { const k = `skin_${G.fac}_${u[0]}`, on = G.skins && G.skins[u[0]];
      return `<div class="item ${on ? 'sel' : ''}" onclick="${own[k] ? `G.skins=G.skins||{};G.skins['${u[0]}']=!G.skins['${u[0]}'];saveProfile();openStore()` : `storeBuy('${k}',150,'skin','${u[0]}')`}"><img src="${spriteURL(`${atl}/tropas/elite_${u[0]}_frente`, 80)}"><b>${u[1]} élite</b><small>${own[k] ? (on ? '✓ Activa' : 'Toca para activar') : '💎 150'}</small></div>`; }).join('');
    if (STAB === 'ed') items = Object.entries(ED_MAP[G.fac]).map(([t, n]) => { const k = `ed_${G.fac}_${t}`, on = G.bskin && G.bskin[t];
      return `<div class="item ${on ? 'sel' : ''}" onclick="${own[k] ? `G.bskin=G.bskin||{};G.bskin['${t}']=!G.bskin['${t}'];saveProfile();openStore()` : `storeBuy('${k}',300,'ed','${t}')`}"><img src="${spriteURL(`${atl}/economia/ed_${n}`, 80)}"><b>${bName(G.fac, t)}</b><small>Edición ${ED_NAME[G.fac]} · ${own[k] ? (on ? '✓ Activa' : 'Toca para activar') : '💎 300'}</small></div>`; }).join('');
    if (STAB === 'season') items = SEASON.map(k => `<div class="item" onclick="closePanel();startPlace('deco','comun/temporada/${k}')"><img src="${spriteURL('comun/temporada/' + k, 80)}"><b>${k.replace(/_/g, ' ')}</b><small>💎 60 al colocar</small></div>`).join('');
    if (STAB === 'floor') { const fl = FLOORS[G.fac];
      const row = (slot, label, def) => `<h4>${label}</h4><div class="items">${fl.map((k, i) => { const key = `floor_${k}`, free = i < 3, on = (G[slot] || def) === 'comun/suelos/' + k;
        return `<div class="item ${on ? 'sel' : ''}" onclick="${free || own[key] ? `G.${slot}='comun/suelos/${k}';saveProfile();openStore()` : `storeBuy('${key}',100,'floor',{slot:'${slot}',k:'comun/suelos/${k}'})`}"><img src="${spriteURL('comun/suelos/' + k, 64)}"><small>${on ? '✓' : free || own[key] ? 'Usar' : '💎 100'}</small></div>`; }).join('')}</div>`;
      items = row('floor', 'Suelo exterior', F.ground) + row('floor2', 'Suelo central', F.ground2); }
    openPanel(`<h3>🛒 Tienda <small>💎 ${fmtN(PROFILE.gems)}</small></h3><div class="tabs">${tabs}</div><div class="items">${items}</div>`);
  };

  // ---------- distribuciones de base ----------
  window.saveLayout = i => { G.layouts = G.layouts || []; const L = {}; for (const b of G.buildings) if (b.t !== 'obst') L[b.id] = [b.x, b.y, b.face || 0, b.rot || 0]; G.layouts[i] = L; saveProfile(); toast(`Distribución ${i + 1} guardada`, 'gold'); openLayouts(); };
  window.loadLayout = i => { const L = (G.layouts || [])[i]; if (!L) return; for (const b of G.buildings) { const p = L[b.id]; if (p) { b.x = p[0]; b.y = p[1]; b.face = p[2]; b.rot = p[3]; } } normalizeLayout(G.buildings); saveProfile(); closeModal(); toast(`Distribución ${i + 1} cargada`, 'gold'); };
  window.openLayouts = () => openModal(`<h2>🗺️ Distribuciones de base</h2><p>Guarda hasta 3 colocaciones (por ejemplo, una para defender recursos y otra para trofeos) y cámbialas cuando quieras.</p>
    <div class="col">${[0, 1, 2].map(i => { const has = G.layouts && G.layouts[i]; return `<div class="mis"><b>Distribución ${i + 1}</b><div style="display:flex;gap:6px"><button class="btn ghost" onclick="saveLayout(${i})">💾 Guardar</button><button class="btn ${has ? '' : 'off'}" onclick="loadLayout(${i})">📂 Cargar</button></div></div>`; }).join('')}
    <button class="btn ghost" onclick="closeModal()">Cerrar</button></div>`);
  wrap('openMenu', (o, th, a) => { const r = o.apply(th, a); const col = document.querySelector('#modal .col'); if (col) col.insertAdjacentHTML('afterbegin', `<button class="btn" onclick="openLayouts()">🗺️ Distribuciones de base</button><button class="btn" onclick="closeModal();openLeague()">🏆 Ligas</button><button class="btn ghost" onclick="G.tut=0;saveProfile();closeModal();tut()">🎓 Repetir tutorial</button>`); return r; });

  // ---------- edificios especiales y ediciones en el panel ----------
  const INFO = { clan: '🎁 Regalo diario del clan: 25 💎 (los clanes en línea llegarán en una actualización).', market: '⚖️ Cambia recursos: 1000 de uno por 500 del otro.', arena: '🎯 Tus tropas ganan +50 % de experiencia de maestría.',
    hall: '🏆 +10 % de botín en todos los ataques.', spec: '⭐ Permite entrenar las tropas especiales.', silo: '🛡️ +10 % de recursos protegidos si te atacan.' };
  window.clanGift = () => { if (G.clanDay === today()) { toast('Vuelve mañana'); return; } G.clanDay = today(); PROFILE.gems += 25; SND && SND.play('coin'); toast('+25 💎 del clan', 'gold'); saveProfile(); refreshHUD(); openBuilding(SEL); };
  window.trade = (from, to) => { if (G[from] < 1000) { toast('Te faltan recursos'); return; } if (G[to] + 500 > storeCap(to)) { toast('Almacén lleno'); return; } G[from] -= 1000; G[to] += 500; SND && SND.play('coin'); refreshHUD(); saveProfile(); openBuilding(SEL); };
  wrap('openBuilding', (o, th, a) => {
    const r = o.apply(th, a), b = a[0], acts = document.querySelector('#panel .acts'); if (!b || !acts) return r;
    let h = '';
    if (INFO[b.t]) acts.insertAdjacentHTML('beforebegin', `<p class="note">${INFO[b.t]}</p>`);
    if (b.t === 'clan' && b.lv > 0) h += `<button class="btn ${G.clanDay === today() ? 'off' : 'gold'}" onclick="clanGift()">🎁 Regalo del clan</button>`;
    if (b.t === 'market' && b.lv > 0) h += `<button class="btn" onclick="trade('A','B')">${resIcon('A')} 1000 → ${resIcon('B')} 500</button><button class="btn" onclick="trade('B','A')">${resIcon('B')} 1000 → ${resIcon('A')} 500</button>`;
    const ed = ED_MAP[G.fac] && ED_MAP[G.fac][b.t];
    if (ed) { const k = `ed_${G.fac}_${b.t}`, own = OWN()[k], on = G.bskin && G.bskin[b.t];
      h += own ? `<button class="btn ghost" onclick="G.bskin=G.bskin||{};G.bskin['${b.t}']=!G.bskin['${b.t}'];saveProfile();openBuilding(SEL)">🎨 ${on ? 'Color normal' : 'Edición ' + ED_NAME[G.fac]}</button>`
        : `<button class="btn ghost" onclick="storeBuy('${k}',300,'ed','${b.t}');openBuilding(SEL)">✨ Edición ${ED_NAME[G.fac]} · 💎 300</button>`; }
    if (h) acts.insertAdjacentHTML('beforeend', h);
    return r;
  });

  // ---------- tutorial ----------
  const STEPS = [
    { on: 'shop', t: '¡Bienvenido, comandante! Toca <b>🏗️ Construir</b> para levantar tu base.' },
    { on: 'build', t: 'Elige un <b>recolector</b> en Economía y colócalo donde quieras. Produce recursos sin parar.' },
    { on: 'army', t: 'Mientras se construye, abre <b>⚔️ Ejército</b>.' },
    { on: 'unit', t: 'Toca las tropas para añadirlas a tu ejército (o pulsa «Llenar»).' },
    { on: 'attack', t: '¡Listo! Pulsa <b>🗡️ Atacar</b> y elige tu primera misión.' },
    { on: 'battle', t: 'Toca el <b>borde del mapa</b> para desplegar tropas. Destruye el Núcleo enemigo para ganar.' },
    { on: 'end', t: '¡Bien hecho! Mejora tu Núcleo para desbloquear edificios, cumple las <b>📋 misiones</b> diarias y visita la <b>🛒 tienda</b>.' },
  ];
  window.tut = ev => {
    let el = document.getElementById('tutb');
    if (!G || G.tut == null || G.tut >= STEPS.length) { if (el) el.remove(); return; }
    if (ev && STEPS[G.tut] && STEPS[G.tut].on === ev) { G.tut++; saveProfile(); }
    if (G.tut >= STEPS.length) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'tutb'; document.body.appendChild(el); }
    const last = G.tut === STEPS.length - 1;
    el.innerHTML = `<span>🎓</span><div>${STEPS[G.tut].t}</div><button onclick="${last ? 'G.tut=99;saveProfile();tut()' : 'G.tut=99;saveProfile();tut()'}">${last ? 'Entendido' : 'Saltar'}</button>`;
  };
  wrap('openShop', (o, th, a) => { const r = o.apply(th, a); tut('shop'); return r; });
  wrap('buildNew', (o, th, a) => { const r = o.apply(th, a); if (r && /^prod/.test(a[0])) tut('build'); return r; });
  wrap('openArmy', (o, th, a) => { const r = o.apply(th, a); tut('army'); return r; });
  wrap('addUnit', (o, th, a) => { const r = o.apply(th, a); tut('unit'); return r; });
  wrap('fillArmy', (o, th, a) => { const r = o.apply(th, a); tut('unit'); return r; });
  wrap('launchAttack', (o, th, a) => { const r = o.apply(th, a); tut('attack'); return r; });
  wrap('showBattleEnd', (o, th, a) => { const r = o.apply(th, a); if (G && G.tut === 6) {} return r; });
  wrap('newSlot', (o, th, a) => { const s = o.apply(th, a); s.tut = 0; return s; });

  // ---------- interfaz con imágenes ----------
  wrap('buildHUD', (o, th, a) => { const r = o.apply(th, a); decorateHUD(); return r; });
  window.decorateHUD = () => {
    const bt = document.querySelectorAll('#hud .bottom button'); const map = ['btn_construir', 'btn_ejercito', 'btn_atacar', 'btn_defender', null, 'btn_menu'];
    bt.forEach((b, i) => { const k = map[i]; if (k && !b.querySelector('img')) { const u = ui(k, 64); if (u) b.firstChild.replaceWith(Object.assign(document.createElement('img'), { src: u, className: 'bi' })); } });
    const bot = document.querySelector('#hud .bottom');
    if (bot && !document.getElementById('storeB')) {
      bot.insertAdjacentHTML('beforeend', `<button id="storeB" onclick="openStore()">🛒<span>Tienda</span></button><button id="missB" onclick="openMissions()">📋<span>Misiones</span></button>`);
    }
    refreshMissBadge();
  };
  wrap('refreshHUD', (o, th, a) => { const r = o.apply(th, a); if (G && MODE === 'base') { const h = document.getElementById('hcore'); if (h) { const L = league(G.trophies || 0); h.innerHTML = `Núcleo ${G.core} · <span class="lgb" onclick="openLeague()"><img src="${ui(L.k, 32)}" style="filter:${L.fl || 'none'}">${G.trophies}</span>`; } if (!document.getElementById('storeB')) decorateHUD(); } return r; });
  wrap('enterFaction', (o, th, a) => { const r = o.apply(th, a); setTimeout(() => { decorateHUD(); tut(); }, 50); return r; });
  wrap('showTitle', (o, th, a) => { const r = o.apply(th, a); const tb = document.getElementById('tutb'); if (tb) tb.remove();
    document.querySelectorAll('.fcard').forEach((c, i) => { const f = FAC_IDS[i]; c.style.backgroundImage = `linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.75)),url(fondos/fondo_${f}.jpg)`; c.style.backgroundSize = 'cover'; c.style.backgroundPosition = 'center'; });
    return r; });
})();
// combates: asegurar que todas las imágenes de facciones estén cargadas antes de empezar
(() => {
  const ready = () => Object.keys(ATLAS).every(k => IMG[k] && IMG[k].length && IMG[k].every(Boolean));
  for (const n of ['launchAttack', 'startDefense', 'startRTS']) {
    const o = window[n]; if (typeof o !== 'function') continue;
    window[n] = function (...a) { if (ready()) return o.apply(this, a); toast('Cargando imágenes…'); Promise.all(Object.keys(ATLAS).map(loadAtlas)).then(() => window[n](...a)); };
  }
})();
// ---------- recompensas de liga: auras y skins desbloqueables ----------
(() => {
  const AURAS = [
    { n: 'Sin aura', c: null },
    { n: 'Aura de plata', c: '#cfe3ff', lg: 1 },
    { n: 'Aura de oro', c: '#ffcf3a', lg: 2 },
    { n: 'Aura de diamante', c: '#5fd8ff', lg: 3 },
    { n: 'Aura legendaria', c: 'rainbow', lg: 4 },
  ];
  const REWARDS = [null,
    { skins: [], txt: 'Aura de plata + bandera' },
    { skins: [0], txt: 'Aura de oro + skin élite + bandera' },
    { skins: [1, 2], txt: 'Aura de platino + 2 skins élite + bandera' },
    { skins: [3, 4, 5], txt: 'Aura de diamante con reflejos + 3 skins élite + bandera' },
    { skins: 'all', txt: 'Aura iridiscente con chispas + todas las skins élite + bandera' },
    { skins: 'all2', txt: 'Aura de obsidiana roja en llamas + todas las skins élite 2 y 3 + bandera' }];
  window.AURAS = AURAS; window.LG_REWARDS = REWARDS;
  const lgIdx = tr => { let i = 0; LEAGUES.forEach((l, k) => { if (tr >= l.t) i = k; }); return i; };
  window.auraColor = () => { const a = AURAS[G && G.aura || 0]; if (!a || !a.c) return null; return a.c === 'rainbow' ? `hsl(${(performance.now() / 8) % 360},100%,65%)` : a.c; };
  function grant(i) {
    const R = REWARDS[i]; if (!R) return; PROFILE.owned = PROFILE.owned || {};
    const units = UNITS[G.fac].filter(u => S(`${FACTIONS[G.fac].atlas}/tropas/elite_${u[0]}_frente`));
    if (R.skins === 'all') { for (const u of units) PROFILE.owned[`skin_${G.fac}_${u[0]}`] = 1; } else if (R.skins === 'all2') { for (const u of units) { PROFILE.owned[`skin_${G.fac}_${u[0]}`] = 1; PROFILE.owned[`skin_${G.fac}_${u[0]}_2`] = 1; PROFILE.owned[`skin_${G.fac}_${u[0]}_3`] = 1; } } else for (const k of R.skins) if (units[k]) PROFILE.owned[`skin_${G.fac}_${units[k][0]}`] = 1;
    openModal(`<h2>🏆 ¡Nueva liga: ${LEAGUES[i].n}!</h2><img src="${spriteURL('comun/ui/' + LEAGUES[i].k, 120)}" style="width:110px;display:block;margin:6px auto;filter:${LEAGUES[i].fl || 'none'}">
      <p style="text-align:center"><b>Recompensa:</b> ${R.txt}.</p><button class="btn gold" onclick="G.finish=${i + 1};G.aura=0;saveProfile();closeModal()">✨ Equipar el aura nueva</button><button class="btn ghost" onclick="closeModal()">Ahora no</button><p class="note" style="text-align:center">Puedes cambiarla cuando quieras en ⚔️ Ejército o en 🏆 Ligas.</p>`);
    SND && SND.play('win');
  }
  window.checkLeague = () => { if (!G) return; G.maxTr = Math.max(G.maxTr || 0, G.trophies || 0); const i = lgIdx(G.trophies || 0), best = G.bestLg || 0; if (i > best) { G.bestLg = i; for (let k = best + 1; k <= i; k++) if (k === i) grant(k); else { const R = REWARDS[k]; if (R) { PROFILE.owned = PROFILE.owned || {}; const units = UNITS[G.fac].filter(u => S(`${FACTIONS[G.fac].atlas}/tropas/elite_${u[0]}_frente`)); for (const s of (Array.isArray(R.skins) ? R.skins : [])) if (units[s]) PROFILE.owned[`skin_${G.fac}_${units[s][0]}`] = 1; } } saveProfile(); } };
  const o = window.showBattleEnd; window.showBattleEnd = function (...a) { const r = o.apply(this, a); const btn = document.querySelector('#modal .btn'); if (btn && G && lgIdx(G.trophies || 0) > (G.bestLg || 0)) { const f = btn.onclick; btn.onclick = null; btn.setAttribute('onclick', ''); btn.addEventListener('click', () => setTimeout(checkLeague, 50)); } return r; };
  window.setAura = i => { if ((G.bestLg || 0) < (AURAS[i].lg || 0)) { toast(`Se desbloquea en liga ${LEAGUES[AURAS[i].lg].n}`); return; } G.aura = i; saveProfile(); if (document.querySelector('#panel.open .units')) openArmy(); else openLeague(); };
  const ol = window.openLeague; window.openLeague = function () {
    ol(); const best = G.bestLg || 0, box = document.querySelector('#modal .lglist'); if (!box) return;
    box.querySelectorAll('.lg').forEach((el, i) => { if (REWARDS[i]) el.querySelector('div').insertAdjacentHTML('beforeend', `<small>🎁 ${REWARDS[i].txt}${i <= best ? ' ✓' : ''}</small>`); });
    if (0) box.insertAdjacentHTML('afterend', `<h3>✨ Aura de tus tropas</h3><div class="auras">${AURAS.map((a, i) => { const lock = best < (a.lg || 0); return `<button class="aurab ${G.aura === i || (!G.aura && !i) ? 'on' : ''} ${lock ? 'off' : ''}" onclick="setAura(${i})"><i style="background:${a.c === 'rainbow' ? 'conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)' : a.c || '#333'}"></i>${a.n}${lock ? ' 🔒' : ''}</button>`; }).join('')}</div>`);
  };
  // aura en el Núcleo de tu base
  const ao = window.animOpts; window.animOpts = function (b, o, ...r) { const res = ao.call(this, b, o, ...r); if (b.t === 'core' && MODE === 'base' && G && G.aura) { const c = auraColor(); if (c) o.filter = ((o.filter || '') + ` drop-shadow(0 0 ${8 + 4 * Math.sin(performance.now() / 500)}px ${c})`).trim(); } return res; };
})();

// selector de aura también en el panel del ejército
(() => { const o = window.openArmy; window.openArmy = function (...a) { const r = o.apply(this, a); const u = document.querySelector('#panel .units'); if (false) { const best = G.bestLg || 0;
  u.insertAdjacentHTML('beforebegin', `<div class="auras"><b style="align-self:center">✨ Aura:</b>${AURAS.map((x, i) => { const lock = best < (x.lg || 0); return `<button class="aurab ${(G.aura || 0) === i ? 'on' : ''} ${lock ? 'off' : ''}" onclick="setAura(${i})"><i style="background:${x.c === 'rainbow' ? 'conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)' : x.c || '#333'}"></i>${x.n.replace('Aura ', '')}${lock ? ' 🔒' : ''}</button>`; }).join('')}</div>`); } return r; }; })();

// ---------- acabados (bronce, plata, oro, diamante, platino) y banderas de liga ----------
(() => {
  window.finLocked = i => (G.bestLg || 0) < FINISH[i].lg;
  window.setFinish = i => { if (finLocked(i)) { toast(FINISH[i].tr ? `Se desbloquea al llegar a ${FINISH[i].tr} 🏆` : `Se desbloquea en liga ${LEAGUES[FINISH[i].lg].n}`); return; } G.finish = i; saveProfile(); if (document.querySelector('#panel.open .units')) openArmy(); else openLeague(); };
  window.finishFilter = () => (G && G.finish && FINISH[G.finish].f !== 'IRID' ? FINISH[G.finish].f : '');
  const row = () => { const best = G.bestLg || 0; return `<div class="auras"><b style="align-self:center">💫 Aura de rango:</b>${FINISH.map((f, i) => { const lock = finLocked(i); return `<button class="aurab ${(G.finish || 0) === i ? 'on' : ''} ${lock ? 'off' : ''}" onclick="setFinish(${i})"><i style="background:${f.halo === 'IRID' ? 'conic-gradient(#b86bff,#ff8fd8,#8fd0ff,#b86bff)' : f.fx === 'flames' ? 'radial-gradient(#ffd24a,#ff2a12 55%,#2a0505)' : f.halo || '#333'};box-shadow:0 0 6px ${f.halo === 'IRID' ? '#b86bff' : f.halo || 'transparent'}"></i>${f.n}${lock ? ' 🔒' : ''}</button>`; }).join('')}</div>`; };
  const flags = () => { const best = G.bestLg || 0; return `<h3>🚩 Banderas de liga para tu base</h3><div class="auras">${LEAGUES.map((l, i) => { const lock = best < i, placed = G.buildings.some(b => b.k === 'liga:' + i);
    return `<button class="aurab ${lock ? 'off' : ''}" onclick="${lock ? `toast('Llega a liga ${l.n}')` : placed ? `toast('Ya está en tu base')` : `closeModal();startPlace('deco','liga:${i}')`}"><img src="${spriteURL('comun/ui/' + l.k, 32)}" style="width:20px;filter:${l.fl || 'none'}">${l.n}${lock ? ' 🔒' : placed ? ' ✓' : ''}</button>`; }).join('')}</div>`; };
  const oa = window.openArmy; window.openArmy = function (...a) { const r = oa.apply(this, a); const u = document.querySelector('#panel .units'); if (u) { u.insertAdjacentHTML('beforebegin', row());
    if (G.finish) { const F = FINISH[G.finish]; if (F.halo) u.querySelectorAll('.unit img').forEach(im => im.style.filter = (im.style.filter || '') + ` drop-shadow(0 0 4px ${F.halo === 'IRID' ? '#b86bff' : F.halo})`); } } return r; };
  const ol = window.openLeague; window.openLeague = function () { ol(); const box = document.querySelector('#modal .lglist'); if (box) { box.insertAdjacentHTML('afterend', row() + flags()); } };
  const sp = window.startPlace; window.startPlace = function (t, k) { if (t === 'deco' && k && k.startsWith('liga:')) { closePanel(); const spot = findSpot('deco') || [N / 2, N / 2]; PLACING = { t, k, x: spot[0], y: spot[1] }; showPlaceBar(); return; } return sp.apply(this, arguments); };
})();

// ---------- skins: normal → élite → élite 2 (variante de color) ----------
(() => {
  const own = (k, v) => v === 0 || (PROFILE.owned || {})[`skin_${G.fac}_${k}${v > 1 ? '_' + v : ''}`];
  window.cycleSkin = k => { G.skins = G.skins || {}; let v = +G.skins[k] || 0; for (let i = 0; i < 4; i++) { v = (v + 1) % 4; if (own(k, v)) break; }
    if (!own(k, v)) v = 0; G.skins[k] = v; saveProfile(); openArmy(); if (v === 0 && !own(k, 1)) toast('Consigue skins en la 🛒 Tienda o subiendo de liga'); };
  // los héroes también pueden llevar skin (fila extra en el ejército)
  const oa = window.openArmy; window.openArmy = function (...a) { const r = oa.apply(this, a); const atl = FACTIONS[G.fac].atlas; const u = document.querySelector('#panel .units'); if (!u) return r;
    const hs = [['HERO', HEROES[G.fac]], ['HERO2', HEROES2[G.fac]]].filter(([, h]) => S(`${atl}/tropas/elite_${h.sprite}_frente`));
    if (hs.length) u.insertAdjacentHTML('beforebegin', `<div class="auras"><b style="align-self:center">🦸 Skin de héroes:</b>${hs.map(([k, h]) => `<button class="aurab" onclick="cycleSkin('${k}')"><img src="${spriteURL(`${atl}/tropas/${skinSpr(G.fac, k, h.sprite)}_frente`, 40)}" style="width:26px">${h.name} · ${['normal', 'élite', 'élite 2', 'élite 3'][+(G.skins && G.skins[k]) || 0]}</button>`).join('')}</div>`);
    return r; };
  // tienda: élite y élite 2 de todas las tropas y héroes
  const os = window.openStore; window.openStore = function (tab) { os.apply(this, arguments); if ((tab || '') !== 'skins' && !document.querySelector('#panel .tab.on')?.textContent.includes('Skins')) return;
    const atl = FACTIONS[G.fac].atlas, O = PROFILE.owned || {}, it = document.querySelector('#panel .items'); if (!it) return;
    const list = [...UNITS[G.fac].map(u => [u[0], u[1], u[0]]), ['HERO', HEROES[G.fac].name, HEROES[G.fac].sprite], ['HERO2', HEROES2[G.fac].name, HEROES2[G.fac].sprite]];
    it.innerHTML = list.flatMap(([k, n, spr]) => [1, 2, 3].filter(v => S(`${atl}/tropas/${v > 1 ? 'elite' + v + '_' : 'elite_'}${spr}_frente`)).map(v => { const key = `skin_${G.fac}_${k}${v > 1 ? '_' + v : ''}`, on = (+(G.skins || {})[k] || 0) === v, price = v === 3 ? 250 : v === 2 ? 200 : 150;
      return `<div class="item ${on ? 'sel' : ''}" onclick="${O[key] ? `G.skins=G.skins||{};G.skins['${k}']=${on ? 0 : v};saveProfile();openStore('skins')` : `storeBuy('${key}',${price},'x','');G.skins=G.skins||{};if((PROFILE.owned||{})['${key}'])G.skins['${k}']=${v};saveProfile();openStore('skins')`}"><img src="${spriteURL(`${atl}/tropas/${v > 1 ? 'elite' + v + '_' : 'elite_'}${spr}_frente`, 80)}"><b>${n}</b><small>${v > 1 ? 'Élite ' + v : 'Élite'} · ${O[key] ? (on ? '✓ Activa' : 'Toca para activar') : '💎 ' + price}</small></div>`; })).join(''); };
})();
// ---------- campaña con historia: 3 capítulos por facción, jefes y recompensas ----------
(() => {
  const STORY = {
    res: { ch: ['Capítulo 1 · La chispa', 'Capítulo 2 · Tierra quemada', 'Capítulo 3 · El último bastión'],
      txt: ['Los robots de Voltempire han tomado las minas del sur. Recupera los puestos de avanzada.', 'Los Nuwok brotan del subsuelo. Corta sus nidos antes de que se extiendan.', 'Las dos amenazas se han unido. Golpea sus fortalezas y libera el planeta.'],
      boss: ['Coloso de chatarra', 'Reina de la plaga', 'Alianza oscura'] },
    volt: { ch: ['Capítulo 1 · Protocolo de expansión', 'Capítulo 2 · Infección orgánica', 'Capítulo 3 · Optimización final'],
      txt: ['Los humanos resisten en sus bunkers. Calcula la ruta más eficiente y aplástalos.', 'La biomasa Nuwok corrompe nuestros circuitos. Purga la infección.', 'Eliminar toda resistencia es la única solución lógica.'],
      boss: ['General de acero', 'Corazón infecto', 'Núcleo rebelde'] },
    nuw: { ch: ['Capítulo 1 · El despertar', 'Capítulo 2 · Metal y carne', 'Capítulo 3 · La gran colmena'],
      txt: ['La colmena tiene hambre. Los humanos son presas débiles: devóralos.', 'Las máquinas no se pueden comer… pero se pueden romper.', 'Que todo el planeta se convierta en colmena.'],
      boss: ['Fortaleza humana', 'Titán de acero', 'Último refugio'] } };
  window.STORY = STORY;
  const chOf = m => Math.min(2, Math.floor((m - 1) / 10)), isBoss = m => m % 10 === 0;
  const ol = window.launchAttack;
  window.launchAttack = function (m, ok) {
    if (!m || ok) { const r = ol.call(this, m); if (m && BAT && isBoss(m)) { BAT.dur = 240; for (const b of BAT.base) if (b.t === 'core') { b.max *= 2; b.hp = b.max; } banner('👑 ' + STORY[G.fac].boss[chOf(m) ] , 'Jefe: el Núcleo enemigo tiene el doble de vida'); } return r; }
    const S0 = STORY[G.fac], c = chOf(m), first = (m - 1) % 10 === 0 && !(G.campaign[m]);
    openModal(`<h2>${isBoss(m) ? '👑 Jefe · ' + S0.boss[c] : (first ? S0.ch[c] : 'Misión ' + m)}</h2>
      ${first || isBoss(m) ? `<p style="font-style:italic">«${S0.txt[c]}»</p>` : ''}
      <p>Misión <b>${m}</b> de 30 · enemigo nivel ${Math.min(10, 1 + Math.floor((m - 1) / 3))}${isBoss(m) ? ' · <b>Núcleo con doble vida</b>' : ''}</p>
      <p>🎁 Primera victoria: <b>💎 ${isBoss(m) ? 50 : 10}</b>${isBoss(m) && m === 30 ? ' + skin élite' : ''}</p>
      <button class="btn gold big" onclick="launchAttack(${m}, true)">⚔️ ¡Al ataque!</button><button class="btn ghost" onclick="openAttack()">Volver</button>`);
  };
  // recompensa de primera victoria
  const oe = window.endBattle;
  window.endBattle = function (...a) { const B = BAT, m = B && B.campaign, prev = m ? (G.campaign[m] || 0) : 0, done = B && B.over; const r = oe.apply(this, a);
    if (m && !done && !prev && (G.campaign[m] || 0) > 0) { const g = isBoss(m) ? 50 : 10; PROFILE.gems += g; toast(`🎁 Primera victoria: +${g} 💎`, 'gold');
      if (m === 30) { const u = UNITS[G.fac].find(x => !(PROFILE.owned || {})[`skin_${G.fac}_${x[0]}`]); if (u) { PROFILE.owned = PROFILE.owned || {}; PROFILE.owned[`skin_${G.fac}_${u[0]}`] = 1; toast(`🎨 Skin élite: ${u[1]}`, 'gold'); } }
      if (m % 10 === 0 && m < 30) setTimeout(() => toast(`📖 Desbloqueado: ${STORY[G.fac].ch[m / 10]}`, 'gold'), 1200);
      saveProfile(); }
    return r; };
  // lista de campaña por capítulos
  const oa = window.openAttack;
  window.openAttack = function () { oa.apply(this, arguments); const box = document.querySelector('#modal .missions'); if (!box) return;
    const btns = [...box.children]; box.innerHTML = '';
    for (let c = 0; c < 3; c++) { box.insertAdjacentHTML('beforeend', `<div class="chap"><b>${STORY[G.fac].ch[c]}</b></div>`); btns.slice(c * 10, c * 10 + 10).forEach((bt, i) => { if (i === 9) bt.classList.add('boss'); box.appendChild(bt); }); }
    const h = document.querySelector('#modal h3'); if (h) h.textContent = '📖 Campaña · ' + Object.keys(G.campaign).filter(k => G.campaign[k] > 0).length + '/30'; };
})();

// ---------- vestuario: ver cada tropa con cualquier skin y aura (vista previa animada) ----------
(() => {
  let VS = null;
  const variants = (spr) => { const atl = FACTIONS[G.fac].atlas; return [['Normal', spr], ['Élite', 'elite_' + spr], ['Élite 2', 'elite2_' + spr], ['Élite 3', 'elite3_' + spr]].filter(([, s]) => S(`${atl}/tropas/${s}_frente`)); };
  window.openWardrobe = () => {
    const list = [...UNITS[G.fac].map(u => [u[0], u[1], u[0]]), ['HERO', HEROES[G.fac].name, HEROES[G.fac].sprite], ['HERO2', HEROES2[G.fac].name, HEROES2[G.fac].sprite]];
    VS = VS && VS.fac === G.fac ? VS : { fac: G.fac, i: 0, v: 1, a: G.finish || 0 };
    const [k, n, spr] = list[VS.i], vs = variants(spr); if (VS.v >= vs.length) VS.v = vs.length - 1;
    const own = vk => VS.v === 0 || (PROFILE.owned || {})[`skin_${G.fac}_${k}${VS.v > 1 ? '_' + VS.v : ''}`];
    openModal(`<h2>👕 Vestuario</h2><canvas id="wcv" width="560" height="230" style="width:100%;max-width:560px;display:block;margin:0 auto;border-radius:12px;background:radial-gradient(#2c3350,#141828)"></canvas>
      <div class="auras" style="justify-content:center"><button class="aurab" onclick="wardStep(-1)">◀</button><b style="align-self:center;min-width:180px;text-align:center">${n}</b><button class="aurab" onclick="wardStep(1)">▶</button></div>
      <div class="auras" style="justify-content:center">${vs.map(([vn], i) => `<button class="aurab ${VS.v === i ? 'on' : ''}" onclick="wardSet('v',${i})">${vn}</button>`).join('')}</div>
      <div class="auras" style="justify-content:center">${FINISH.map((f, i) => `<button class="aurab ${VS.a === i ? 'on' : ''}" onclick="wardSet('a',${i})"><i style="background:${f.halo === 'IRID' ? 'conic-gradient(#b86bff,#ff8fd8,#8fd0ff,#b86bff)' : f.fx === 'flames' ? 'radial-gradient(#ffd24a,#ff2a12 55%,#2a0505)' : f.halo || '#333'}"></i>${f.n}${finLocked(i) ? ' 🔒' : ''}</button>`).join('')}</div>
      <p class="note" style="text-align:center">${own() ? '' : '🔒 Skin no conseguida (vista previa). '}${finLocked(VS.a) ? '🔒 Aura de la liga ' + LEAGUES[FINISH[VS.a].lg].n + '.' : ''}</p>
      <div class="auras" style="justify-content:center">${own() && !finLocked(VS.a) ? `<button class="btn gold" onclick="G.skins=G.skins||{};G.skins['${k}']=${VS.v};G.finish=${VS.a};saveProfile();toast('Equipado','gold')">✓ Equipar</button>` : ''}<button class="btn ghost" onclick="VSoff();closeModal()">Cerrar</button></div>`, 'wide');
    VS.spr = vs[VS.v][1]; VS.on = true; requestAnimationFrame(wardDraw);
  };
  window.wardStep = d => { const n = UNITS[G.fac].length + 2; VS.i = (VS.i + d + n) % n; openWardrobe(); };
  window.wardSet = (p, i) => { VS[p] = i; openWardrobe(); };
  window.VSoff = () => { if (VS) VS.on = false; };
  function wardDraw() {
    const c = document.getElementById('wcv'); if (!c || !VS || !VS.on) return;
    const g = c.getContext('2d'), atl = FACTIONS[G.fac].atlas, F = FINISH[VS.a];
    const oc = ctx, ots = toScreen, oz = cam.z; ctx = g; cam.z = 1.5; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    ['frente', 'espalda', 'ataque'].forEach((pose, i) => { const key = `${atl}/tropas/${VS.spr}_${pose}`; if (!S(key)) return; const s = S(key), wd = Math.min(110, 120 * s.w / s.h);
      toScreen = () => [100 + i * 180, 205]; drawSprite(key, 0, 0, wd, { halo: F.halo ? haloColor(F.halo) : null, haloFx: F.fx, seed: i, lift: Math.abs(Math.sin(performance.now() / 300 + i)) * 4 }); });
    ctx = oc; toScreen = ots; cam.z = oz;
    requestAnimationFrame(wardDraw);
  }
  const ocm = window.closeModal; window.closeModal = function () { VSoff(); return ocm.apply(this, arguments); };
  // accesos: Ejército y Tienda
  const oa = window.openArmy; window.openArmy = function (...a) { const r = oa.apply(this, a); const h = document.querySelector('#panel h3'); if (h) h.insertAdjacentHTML('beforeend', ` <button class="btn ghost" style="padding:9px 12px;font-size:13px" onclick="closePanel();openWardrobe()">👕 Vestuario</button>`); return r; };
})();
// ---------- modo heroico, desafío semanal y capítulo 4 (preparado) ----------
(() => {
  const WEEKLY = [
    { n: 'Solo aire', d: 'Solo puedes llevar tropas aéreas.', rule: { air: true } },
    { n: 'Lluvia de meteoritos', d: 'Caen meteoritos todo el combate.', rule: { wx: 'meteor' } },
    { n: 'Sin héroe', d: 'Tu héroe descansa esta semana.', rule: { noHero: true } },
    { n: 'Núcleo blindado', d: 'El Núcleo enemigo tiene el triple de vida.', rule: { core: 3 } },
    { n: 'Tormenta de iones', d: 'Rayos aleatorios golpean el campo.', rule: { wx: 'ion' } },
    { n: 'Contrarreloj', d: 'Solo tienes 90 segundos.', rule: { time: 90 } },
    { n: 'Niebla tóxica', d: 'La niebla verde daña a todos menos a los Nuwoks.', rule: { wx: 'toxic' } },
    { n: 'Ejército mínimo', d: 'Solo la mitad de tus tropas entra en combate.', rule: { half: true } } ];
  window.weekly = () => WEEKLY[weekNum() % WEEKLY.length];
  const hero = () => (G.heroic = G.heroic || {});
  const heroUnlocked = () => (G.campaign[30] || 0) > 0;

  const ol = window.launchAttack;
  window.launchAttack = function (m, ok) {
    if (CAMP_MODE === 'normal' || !m) return ol.call(this, m, ok);
    if (!ok) { // pantalla previa
      const W = weekly(), isW = CAMP_MODE === 'weekly';
      openModal(`<h2>${isW ? '🗓️ Desafío semanal · ' + W.n : '💀 Heroico · misión ' + m}</h2>
        <p>${isW ? W.d : 'Enemigo 2 niveles más fuerte y defensas al máximo.'}</p>
        <p>🎁 ${isW ? (G.weekDone === weekNum() ? 'Ya conseguido esta semana' : 'Primera victoria de la semana: <b>💎 100</b>') : 'Primera victoria: <b>💎 ' + (m % 10 === 0 ? 100 : 25) + '</b>'}</p>
        <button class="btn gold big" onclick="launchAttack(${m}, true)">⚔️ ¡Al ataque!</button><button class="btn ghost" onclick="CAMP_MODE='normal';openAttack()">Volver</button>`);
      return;
    }
    const W = weekly(), isW = CAMP_MODE === 'weekly', saveArmy = Object.assign({}, G.army), saveWx = WX_PICK;
    if (isW) { if (W.rule.air) for (const k in G.army) { const d = unitDef(G.fac, k); if (d && !d.air) delete G.army[k]; }
      if (W.rule.half) for (const k in G.army) G.army[k] = Math.ceil(G.army[k] / 2);
      if (W.rule.wx) WX_PICK = W.rule.wx; if (!armyUsed() && !(heroAvailable() && !W.rule.noHero)) { G.army = saveArmy; toast(W.rule.air ? 'Necesitas tropas aéreas para este desafío' : 'No tienes tropas'); return; } }
    const r = ol.call(this, m, true); WX_PICK = saveWx;
    if (BAT) { BAT._mode = CAMP_MODE; BAT._armySave = saveArmy;
      if (isW) { if (W.rule.wx) BAT.wx = W.rule.wx; if (W.rule.noHero) { BAT.heroAvail = false; } if (W.rule.time) BAT.dur = W.rule.time; if (W.rule.core) for (const b of BAT.base) if (b.t === 'core') { b.max *= W.rule.core; b.hp = b.max; } banner('🗓️ ' + W.n, W.d); }
      else banner('💀 Heroico', 'Misión ' + m); }
    return r;
  };
  // resultados del modo especial: no tocan la campaña normal
  const oe = window.endBattle;
  window.endBattle = function (...a) {
    const B = BAT; if (!B || !B._mode || B.over) return oe.apply(this, a);
    const m = B.campaign, keep = G.campaign[m]; const r = oe.apply(this, a); const st = stars();
    if (keep === undefined) delete G.campaign[m]; else G.campaign[m] = keep;
    if (B._mode === 'heroic') { const prev = hero()[m] || 0; hero()[m] = Math.max(prev, st); if (!prev && st) { const g = m % 10 === 0 ? 100 : 25; PROFILE.gems += g; toast(`💀 Heroico: +${g} 💎`, 'gold'); } }
    if (B._mode === 'weekly' && st && G.weekDone !== weekNum()) { G.weekDone = weekNum(); PROFILE.gems += 100; toast('🗓️ Desafío semanal: +100 💎', 'gold'); }
    if (B._armySave && B._mode === 'weekly') { /* las tropas usadas se pierden como siempre */ }
    CAMP_MODE = 'normal'; saveProfile(); return r;
  };
  // pestañas en la pantalla de ataque
  const oa = window.openAttack;
  window.openAttack = function () {
    oa.apply(this, arguments); const h = document.querySelector('#modal h3'), box = document.querySelector('#modal .missions'); if (!h || !box) return;
    const W = weekly();
    h.insertAdjacentHTML('beforebegin', `<div class="mis" style="cursor:pointer" onclick="CAMP_MODE='weekly';launchAttack(${Math.min(30, 3 * G.core)})"><div><b>🗓️ Desafío semanal: ${W.n}</b><small style="display:block;opacity:.8">${W.d} · enemigo de tu nivel</small></div>${G.weekDone === weekNum() ? '<span class="ok">✓</span>' : '<span class="btn gold" style="pointer-events:none">💎 100</span>'}</div>`);
    if (heroUnlocked()) {
      let hb = ''; let un = true; for (let i = 1; i <= 30; i++) { const s = hero()[i] || 0; hb += `<button class="mis ${un ? '' : 'dim'} ${i % 10 === 0 ? 'boss' : ''}" ${un ? `onclick="CAMP_MODE='heroic';launchAttack(${i})"` : ''}><b>${i}</b><small>N${Math.min(10, 3 + Math.floor((i - 1) / 3))}</small><span>${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span></button>`; if (!s) un = false; }
      box.insertAdjacentHTML('afterend', `<h3>💀 Modo heroico · ${Object.values(hero()).filter(x => x > 0).length}/30</h3><div class="missions">${hb}</div>`);
    } else box.insertAdjacentHTML('afterend', `<p class="note">💀 Modo heroico: se desbloquea al superar la misión 30.</p>`);
    box.insertAdjacentHTML('beforeend', `<div class="chap" style="opacity:.6"><b>Capítulo 4 · Próximamente (con el Núcleo 15)</b></div>`);
  };
})();
