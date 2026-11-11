// ===== interfaz =====
'use strict';
const $ = s => document.querySelector(s);
const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstElementChild; };
function toast(msg, cls = '') { const box = $('#toasts'); for (const o of box.children) if (o.dataset.m === msg) o.remove(); while (box.children.length >= 3) box.firstChild.remove(); const t = el(`<div class="toast ${cls}">${msg}</div>`); t.dataset.m = msg; box.appendChild(t); setTimeout(() => t.classList.add('out'), 2300); setTimeout(() => t.remove(), 2800); }
function banner(a, b) { const bn = $('#banner'); bn.innerHTML = `<b>${a}</b>${b ? `<span>${b}</span>` : ''}`; bn.classList.remove('show'); void bn.offsetWidth; bn.classList.add('show'); }
function closePanel() { WSEL = null; $('#panel').classList.remove('open'); $('#panel').dataset.view = ''; SEL = null; }
function openPanel(html) { const p = $('#panel'); p.innerHTML = `<button class="x" onclick="closePanel()">✕</button>` + html; p.classList.add('open'); }
function openModal(html, cls = '') { const m = $('#modal'); m.className = 'show ' + cls; m.innerHTML = `<div class="box">${html}</div>`; }
function closeModal() { $('#modal').className = ''; $('#modal').innerHTML = ''; }
const resImg = (r, fac) => spriteURL('comun/iconos/' + (fac || (G && G.fac) || 'res') + '_' + r, 64);
const resIcon = r => { const u = resImg(r); return u ? `<img class="ri" src="${u}">` : (r === 'A' ? '💰' : r === 'C' ? '⚡' : '💧'); };

// ---------- pantalla de inicio ----------
function showTitle() {
  MODE = 'title'; G = null; BAT = null; RTS = null; $('#hud').style.display = 'none'; $('#bhud').style.display = 'none'; closePanel(); closeModal();
  const cards = FAC_IDS.map(f => {
    const F = FACTIONS[f], s = PROFILE.slots[f];
    return `<div class="fcard" style="--c:${F.color};--d:${F.dark}" onclick="enterFaction('${f}')">
      <img src="${spriteURL(F.emblem, 140)}"><div class="fn">${F.name}</div><div class="fs">${F.strong}</div><div class="fd">${F.desc}</div>
      <div class="fst">${s ? `Núcleo ${s.core} · 🏆 ${s.trophies}` : 'Nueva partida'}</div><button class="btn">${s ? 'Continuar' : 'Empezar'}</button></div>`;
  }).join('');
  $('#title').innerHTML = `<div class="tlogo"><img src="${spriteURL('comun/logo/logo_three_worlds_war', 900)}"></div>
    <div class="tsub">Elige tu mundo · cada facción tiene su propia partida</div>
    <div class="fcards">${cards}</div>
    <button class="btn big" style="margin-top:10px" onclick="openConquest()">⚔️ Modo Conquista (tiempo real)</button>
    <div class="tfoot"><span>💎 ${PROFILE.gems}</span>
      <label>Velocidad de prueba <select onchange="PROFILE.speed=+this.value;saveProfile()">
        ${[[1, 'Real (x1)'], [60, 'Prueba (x60)'], [600, 'Turbo (x600)']].map(([v, n]) => `<option value="${v}" ${PROFILE.speed == v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <button class="btn ghost" onclick="if(confirmReset())resetAll()">Borrar partidas</button></div>`;
  $('#title').style.display = 'flex'; setWeather('aurora');
}
let _resetArm = 0; function confirmReset() { if (Date.now() - _resetArm < 3000) return true; _resetArm = Date.now(); toast('Pulsa otra vez para borrar las 3 partidas.'); return false; }
function resetAll() { PROFILE = { gems: 500, name: 'Comandante', speed: PROFILE.speed, slots: {} }; G = null; saveProfile(); showTitle(); }
function enterFaction(f) {
  const at = FACTIONS[f].atlas; try { localStorage.setItem('tww_lastfac', at); } catch (e) {}
  if (!(IMG[at] && IMG[at].length && IMG[at].every(Boolean))) { $('#title').style.opacity = .6; loadAtlas(at).then(() => { $('#title').style.opacity = 1; enterFaction(f); }); return; }
  G = PROFILE.slots[f] || newSlot(f); if (G.mapN !== N) { const d = (N - (G.mapN || 40)) / 2; for (const b of G.buildings) { b.x += d; b.y += d; } G.mapN = N; }
  if (G.grid !== 2) { normalizeLayout(G.buildings); G.grid = 2; } PROFILE.slots[f] = G; saveProfile();
  $('#title').style.display = 'none'; MODE = 'base'; const [cx, cy] = iso(N / 2, N / 2); cam.x = cx; cam.y = cy; cam.z = Math.min(1, Math.max(.5, W / 1150));
  setWeather(G.wx || 'clear'); buildHUD(); baseTick();
}

// ---------- HUD de la base ----------
function buildHUD() {
  const F = FACTIONS[G.fac]; const h = $('#hud'); h.style.display = 'block'; $('#bhud').style.display = 'none';
  h.innerHTML = `<div class="top">
    <div class="who"><img src="${spriteURL(F.icon, 64)}"><div><b>${F.name}</b><small id="hcore"></small></div></div>
    <div class="res"><div class="pill" style="--c:${F.colA}" title="${RES_USE.A}"><i>${resIcon('A')}</i><div><b id="hA"></b><small>${F.resA}</small><div class="bar"><span id="bA"></span></div></div></div>
      <div class="pill" style="--c:${F.colB}" title="${RES_USE.B}"><i>${resIcon('B')}</i><div><b id="hB"></b><small>${F.resB}</small><div class="bar"><span id="bB"></span></div></div></div>
      <div class="pill" id="pC" style="--c:${F.colC}" title="${RES_USE.C}"><i>${resIcon('C')}</i><div><b id="hC"></b><small>${F.resC}</small><div class="bar"><span id="bC"></span></div></div></div>
      <div class="pill gem"><i>💎</i><div><b id="hG"></b><small>Gemas</small></div></div></div></div>
    <div class="chips"><span id="hBld"></span><span id="hWx"></span></div>
    <div class="bottom">
      <button onclick="openShop()">🏗️<span>Construir</span></button>
      <button onclick="openArmy()">⚔️<span>Ejército</span></button>
      <button class="big" onclick="openAttack()">🗡️<span>Atacar</span></button>
      <button onclick="startDefense()">🛡️<span>Defender</span></button>
      <button onclick="openWeather()">⛅<span>Clima</span></button>
      <button onclick="openMenu()">☰<span>Menú</span></button></div>`;
  refreshHUD();
}
function refreshHUD() {
  if (!G || MODE !== 'base') return;
  const cA = storeCap('A'), cB = storeCap('B');
  $('#hA').textContent = fmtN(G.A) + ' / ' + fmtN(cA); $('#hB').textContent = fmtN(G.B) + ' / ' + fmtN(cB); $('#hG').textContent = PROFILE.gems;
  G.C = G.C || 0; const cC = storeCap('C'); $('#pC').style.display = G.core >= 5 || G.C > 0 ? '' : 'none'; $('#hC').textContent = fmtN(G.C) + ' / ' + fmtN(cC); $('#bC').style.width = Math.min(100, G.C / cC * 100) + '%';
  $('#bA').style.width = Math.min(100, G.A / cA * 100) + '%'; $('#bB').style.width = Math.min(100, G.B / cB * 100) + '%';
  $('#hcore').textContent = `Núcleo ${G.core} · 🏆 ${G.trophies}`;
  $('#hBld').textContent = `🔨 ${builders() - busyCount()}/${builders()} constructores libres · ⚔️ ${armyUsed()}/${campCap()}` + (G.research ? ` · 🧪 ${fmtT((G.research.until - Date.now()) / 1000)}` : '');
  const w = WEATHERS.find(w => w.id === (G.wx || 'clear')); $('#hWx').textContent = `${w.icon} ${w.name}` + (shieldLeft() > 0 ? ` · 🛡️ Escudo ${fmtT(shieldLeft())}` : '');
}

// ---------- panel de edificio ----------
function openBuilding(b) {
  SEL = b; const t = b.t, F = FACTIONS[G.fac], name = bName(G.fac, t);
  if (t === 'obst') { openPanel(`<div class="ph"><img src="${spriteURL(bSprite(G.fac, b), 96)}"><div><h3>Obstáculo</h3><p>Retíralo para hacer sitio. Da gemas.</p></div></div>
      <div class="acts"><button class="btn" onclick="removeObstacle(SEL)">Retirar · 💧 ${fmtN(100 * G.core)}</button></div>`); return; }
  if (t === 'deco') { openPanel(`<div class="ph"><img src="${spriteURL(bSprite(G.fac, b), 96)}"><div><h3>Decoración</h3><p>Puedes moverla o quitarla.</p></div></div>
      <div class="acts"><button class="btn" onclick="startMove(SEL)">↔️ Mover</button><button class="btn ghost" onclick="sellDeco(SEL)">🗑️ Quitar</button></div>`); return; }
  const lines = [];
  if (b.lv > 0) {
    if (isDefense(t)) { const st = DEFSTAT[t]; const lm = Math.pow(DEF_STEP, b.lv - 1); lines.push(`❤️ ${fmtN(bHP(t, b.lv))}`, t === 'd6' && G.fac === 'volt' ? '🛡️ Protege edificios cercanos (−30 % daño)' : `💥 ${fmtN(st.dps * lm)}/s`, `🎯 ${st.range} casillas`, `${st.air && st.ground ? '✈️+🚶' : st.air ? '✈️ Solo aire' : '🚶 Solo tierra'}`); if (t === 'd6' && G.fac === 'nuw') lines.push('🟢 Ralentiza al enemigo'); }
    else if (t === 'prodA' || t === 'prodB' || t === 'prodC') lines.push(`Sirve para: ${RES_USE[t.slice(-1)]}`,`⏱️ ${fmtN(prodRate(b) * 3600 / PROFILE.speed)}/h`, `📦 ${fmtN(b.acc || 0)} / ${fmtN(prodCap(b))}`);
    else if (t === 'storA' || t === 'storB') lines.push(`📦 Capacidad ${fmtN(2500 * Math.pow(1.8, b.lv - 1))}`);
    else if (t === 'camp') lines.push(`⚔️ ${10 + b.lv * 5} plazas`);
    else if (t === 'lab') lines.push(`🧪 Tropas hasta nivel ${Math.min(TROOP_MAX[G.core - 1], b.lv + 2)}`);
    else if (t === 'hero') lines.push(`🦸 Héroe nivel ${b.lv} (+${Math.round((Math.pow(1.15, b.lv - 1) - 1) * 100)} %)`);
    else if (t === 'patrol') { const P = PATROL[G.fac]; lines.push(`✈️ ${P.name}`, `💥 ${fmtN(P.dps * Math.pow(DEF_STEP, b.lv - 1))}/s`, `🎯 ${P.range} casillas`, P.fx); }
    else if (t === 'radar') lines.push(`📡 Alcance ${(6 + b.lv * .5).toFixed(1)} casillas`, 'Descubre tropas invisibles', 'Al atacar ves las trampas enemigas');
    else if (t === 'weather') lines.push(`⛅ Clima defensivo: ${(WEATHERS.find(w => w.id === G.defWx) || { name: 'sin elegir' }).name}`, 'Las invasiones contra tu base usan este clima');
    else if (t === 'core') lines.push(`❤️ ${fmtN(bHP('core', b.lv))}`, `🔨 ${builders()} constructores`, `🔒 Cámara acorazada: protege ${Math.round((0.10 + 0.015 * G.core) * 100)} % del almacén (${resIcon('A')} ${fmtN(protCap('A'))} · 💧 ${fmtN(protCap('B'))})`);
    else if (t.startsWith('trap')) lines.push(`💥 ${fmtN(DEFSTAT[t].dmg * Math.pow(1.15, b.lv - 1))}`, 'Invisible para el enemigo');
    else lines.push(`❤️ ${fmtN(bHP(t, b.lv))}`);
  }
  const next = b.lv + 1, mx = maxLevel(t);
  let acts = '';
  if (b.busy) { const g = Math.max(1, Math.ceil((b.busy.until - Date.now()) / 60000)); acts += `<button class="btn gold" onclick="speedUp(SEL)">⚡ Terminar ya · 💎 ${g}</button>`; }
  else if (next <= mx) { const c = costOf(t, next), tm = timeOf(t, next); const can = G[c.r] >= c.n; acts += `<button class="btn ${can ? '' : 'off'}" onclick="startUpgrade(SEL)">⬆️ Nivel ${next} · ${resIcon(c.r)} ${fmtN(c.n)}${tm ? ' · ⏱️ ' + fmtT(tm) : ''}</button>`; }
  else if (b.lv < 15 && t !== 'core' && (BT[t] || t === 'wall')) acts += `<button class="btn off">🔒 Necesita ${bName(G.fac, 'core')} ${nextCoreFor(t, next)}</button>`;
  if ((t === 'prodA' || t === 'prodB' || t === 'prodC') && (b.acc || 0) >= 1) acts += `<button class="btn" onclick="collect(SEL);openBuilding(SEL)">🧺 Recoger ${fmtN(b.acc)}</button>`;
  if (t.match(/^d\d$/) && b.lv >= 5) acts += `<button class="btn ghost" onclick="openBranch(SEL,true)">🔀 Cambiar versión</button>`;
  if (t === 'barracks' || t === 'camp') acts += `<button class="btn ghost" onclick="openArmy()">⚔️ Ejército</button>`;
  if (t === 'patrol' && b.lv > 0) acts += `<button class="btn gold" onclick="startRoute(SEL)">✏️ Dibujar ruta</button>`;
  if (t === 'weather' && b.lv > 0) acts += `<button class="btn gold" onclick="openDefWeather()">⛅ Elegir clima defensivo</button>`;
  if (t === 'lab' && b.lv > 0) acts += `<button class="btn gold" onclick="openLab()">🧪 Mejorar tropas</button>`;
  if (canFace(b)) acts += `<button class="btn ghost" onclick="SEL.face=((SEL.face||0)+1)%faceCount(SEL);saveProfile();toast(faceCount(SEL)===4?['Apunta al frente ↓','Apunta a la derecha →','Apunta atrás ↑','Apunta a la izquierda ←'][SEL.face]:(SEL.face?'Apunta ↘':'Apunta ↙'))">🔄 Orientar</button>`;
  if (t === 'wall') { const nr = wallRow(b).length, ng = wallGroup(b).length;
    if (nr > 1) acts += `<button class="btn gold" onclick="selWalls('row')">🧱 Seleccionar fila (${nr})</button>`;
    if (ng > nr) acts += `<button class="btn gold" onclick="selWalls('all')">🔗 Muro entero (${ng})</button>`;
    acts += `<button class="btn ghost" onclick="toggleGate(SEL)">${b.gate ? '🧱 Quitar puerta' : `🚪 Poner puerta (${gateCount()}/${gateMax()})`}</button>`;
    if (b.gate) acts += `<button class="btn ghost" onclick="SEL.hold=!SEL.hold;saveProfile();openBuilding(SEL)">${b.hold ? '🔒 Cerrar puerta' : '🔓 Dejar abierta'}</button>`;
    else acts += `<button class="btn ghost" onclick="SEL.rot=SEL.rot?0:1;saveProfile();toast(SEL.rot?'Muro ↗':'Muro ↘')">🔄 Girar</button>`; }
  if (t !== 'core') acts += `<button class="btn ghost" onclick="startMove(SEL)">↔️ Mover</button>`;
  else acts += `<button class="btn ghost" onclick="startMove(SEL)">↔️ Mover</button>`;
  const br = t.match(/^d\d$/) && b.br1 ? `<p class="br">Versión: ${BNAMES[G.fac].branch[t][b.br1 === 'A' ? 0 : 1]}${b.br2 ? ' → ' + BNAMES[G.fac].branch[t][b.br2 === 'A' ? 0 : 1] : ''}</p>` : '';
  openPanel(`<div class="ph"><img src="${spriteURL(bSprite(G.fac, b.lv ? b : { ...b, lv: 1 }), 110)}"><div><h3>${name}</h3><p>Nivel ${b.lv} / ${mx}${b.busy ? ' · 🔨 mejorando' : ''}</p>${br}<div class="stats">${lines.map(l => `<span>${l}</span>`).join('')}</div></div></div><div class="acts">${acts}</div>`);
}
function nextCoreFor(t, L) { if (t === 'wall') { for (let h = 0; h < 10; h++) if (WALLS.max[h] >= L) return h + 1; return 10; } for (let h = 0; h < 10; h++) if (BT[t][4][h] >= L) return h + 1; return 10; }
function sellDeco(b) { G.buildings = G.buildings.filter(x => x !== b); saveProfile(); closePanel(); }
function openBranch(b, change) {
  const t = b.t, tier = b.lv >= 10 ? 10 : 5, names = BNAMES[G.fac].branch[t];
  const opt = v => { const tmp = Object.assign({}, b, tier === 5 ? { br1: v, lv: 5 } : { br2: v, lv: 10 }); return `<div class="opt" onclick="chooseBranch(${b.id},'${v}',${tier})"><img src="${spriteURL(bSprite(G.fac, tmp), 150)}"><b>${names[v === 'A' ? 0 : 1]}</b><small>${v === 'A' ? 'Dispara más rápido: +20 % de daño' : '+1 de alcance y más daño en área'}</small></div>`; };
  openModal(`<h2>${change ? 'Cambiar versión' : '¡Nivel ' + tier + '! Elige versión'}</h2><p>${bName(G.fac, t)}: elige cómo evoluciona. ${change ? 'Cambiar cuesta 💎 10.' : ''}</p><div class="opts">${opt('A')}${opt('B')}</div><button class="btn ghost" onclick="closeModal()">Más tarde</button>`);
}
function chooseBranch(id, v, tier) {
  const b = G.buildings.find(x => x.id === id); if (!b) return;
  const had = tier === 5 ? b.br1 : b.br2; if (had && had !== v) { if (PROFILE.gems < 10) { toast('Necesitas 💎 10.'); return; } PROFILE.gems -= 10; }
  if (tier === 5) b.br1 = v; else b.br2 = v; closeModal(); saveProfile(); refreshHUD(); fxAt(b.x + SIZE[b.t] / 2, b.y + SIZE[b.t] / 2, 'subida_nivel'); if (SEL === b) openBuilding(b);
}

// ---------- tienda ----------
let SHOP_TAB = 'eco';
function openShop(tab) {
  if (tab) SHOP_TAB = tab; const tabs = Object.entries(CATS).map(([k, c]) => `<button class="tab ${k === SHOP_TAB ? 'on' : ''}" onclick="openShop('${k}')">${c.name}</button>`).join('');
  let items = '';
  if (SHOP_TAB === 'deco') items = DECOS[G.fac].map(k => { const c = costOf('deco', 1); return `<div class="item" onclick="startPlace('deco','${k}')"><img src="${spriteURL(`${FACTIONS[G.fac].atlas}/decoracion/${k}`, 80)}"><b>${k.replace(/_/g, ' ')}</b><small>${resIcon('A')} ${fmtN(c.n)}</small></div>`; }).join('');
  else for (const t of CATS[SHOP_TAB].items) {
    const unl = unlockCore(t), have = countOf(t), mx = maxCount(t), locked = G.core < unl, full = have >= mx;
    const spr = t === 'wall' ? `comun/muros/muro01_madera` : bSprite(G.fac, { t, lv: 1 }); const c = costOf(t, 1);
    items += `<div class="item ${locked || full ? 'dim' : ''}" onclick="${locked ? `toast('Se desbloquea con ${bName(G.fac, 'core')} ${unl}')` : full ? `toast('Máximo para tu nivel: ${mx}. Mejora el ${bName(G.fac, 'core')}.')` : `startPlace('${t}')`}">
      <img src="${spriteURL(spr, 80)}"><b>${t === 'wall' ? 'Muro de ' + WALL_NAME[0].toLowerCase() : bName(G.fac, t)}</b>
      <small>${locked ? '🔒 Núcleo ' + unl : `${have}/${mx} · ${resIcon(c.r)} ${fmtN(c.n)}`}</small></div>`;
  }
  openPanel(`<h3>Construir</h3><div class="tabs">${tabs}</div><div class="items">${items}</div>`);
}
function startPlace(t, k) {
  closePanel(); const spot = findSpot(t) || [N / 2, N / 2]; PLACING = { t, k, x: spot[0], y: spot[1] }; if (t === 'wall') toast('Toca las casillas donde quieras muros');
  if (t !== 'wall') { const [px, py] = iso(spot[0] + 1, spot[1] + 1); cam.x = px; cam.y = py; }
  showPlaceBar();
}
function startMove(b) { closePanel(); PLACING = { t: b.t, k: b.k, x: b.x, y: b.y, move: b }; showPlaceBar(); }
function showPlaceBar() {
  const wall = PLACING.t === 'wall';
  $('#placebar').innerHTML = wall ? `<span>Toca las casillas para poner muros · ${resIcon('A')} ${fmtN(costOf('wall', 1).n)} cada uno</span><button class="btn ghost" id="rotB" onclick="PLACING.rot=PLACING.rot?0:1;this.textContent=PLACING.rot?'🔄 Muro ↗':'🔄 Muro ↘'">${PLACING.rot ? '🔄 Muro ↗' : '🔄 Muro ↘'}</button><button class="btn" onclick="endPlace()">✓ Hecho</button>`
    : `<span>Arrastra en cualquier parte para mover · toca una casilla para ponerlo ahí</span><button class="btn ghost" onclick="nudge(-1,0)">↖</button><button class="btn ghost" onclick="nudge(0,-1)">↗</button><button class="btn ghost" onclick="nudge(0,1)">↙</button><button class="btn ghost" onclick="nudge(1,0)">↘</button><button class="btn" onclick="confirmPlace()">✓ Colocar</button><button class="btn ghost" onclick="endPlace()">✕</button>`;
  $('#placebar').classList.add('show');
}
function startRoute(b) { closePanel(); ROUTE = { b, pts: [] }; SEL = b; $('#placebar').innerHTML = `<span id="rtxt">Toca el mapa para marcar la ruta (hasta 8 puntos)</span><button class="btn ghost" onclick="ROUTE.pts=[];updRoute()">↺</button><button class="btn" onclick="saveRoute()">✓ Guardar</button><button class="btn ghost" onclick="ROUTE=null;$('#placebar').classList.remove('show')">✕</button>`; $('#placebar').classList.add('show'); }
function updRoute() { const t = $('#rtxt'); if (t) t.textContent = `Ruta: ${ROUTE.pts.length}/8 puntos`; ROUTE.b.route = ROUTE.pts.length >= 2 ? ROUTE.pts.slice() : (ROUTE.b.route || defaultRoute(ROUTE.b)); }
function saveRoute() { if (ROUTE.pts.length < 2) { toast('Marca al menos 2 puntos.'); return; } ROUTE.b.route = ROUTE.pts.slice(); ROUTE = null; $('#placebar').classList.remove('show'); saveProfile(); toast('Ruta de patrulla guardada', 'gold'); }
function openDefWeather() { closePanel(); openModal(`<h2>⛅ Clima defensivo</h2><p>Las invasiones contra tu base usarán este clima. Elige el que más te favorezca.</p><div class="wxgrid">${WEATHERS.filter(w => w.id !== 'aurora').map(w => `<button class="wxc ${G.defWx === w.id ? 'on' : ''}" onclick="G.defWx='${w.id}';saveProfile();closeModal();toast('Clima defensivo: ${w.name}','gold')"><span>${w.icon}</span><b>${w.name}</b><small>${w.fx}</small></button>`).join('')}</div><button class="btn ghost" onclick="closeModal()">Cerrar</button>`, 'wide'); }
function nudge(dx, dy) { if (!PLACING) return; const s = SIZE[PLACING.t]; PLACING.x = clamp(PLACING.x + dx * Math.min(CELL, s), BORDER, N - BORDER - s); PLACING.y = clamp(PLACING.y + dy * Math.min(CELL, s), BORDER, N - BORDER - s); }
function endPlace() { PLACING = null; $('#placebar').classList.remove('show'); refreshHUD(); }
function confirmPlace() {
  const P = PLACING; if (!P) return;
  if (!canPlace(P.t, P.x, P.y, P.move && P.move.id)) { toast('No cabe ahí.'); return; }
  if (P.move) { P.move.x = P.x; P.move.y = P.y; saveProfile(); endPlace(); return; }
  if (countOf(P.t) >= maxCount(P.t)) { toast('Has llegado al máximo.'); endPlace(); return; }
  if (buildNew(P.t, P.x, P.y, P.k)) endPlace();
}

// ---------- ejército ----------
function openArmy() {
  closePanel(); const cap = campCap(), used = armyUsed(); const lab = labLevel();
  const cards = UNITS[G.fac].map(u => {
    const d = unitDef(G.fac, u[0]), needSpec = d.key.startsWith('x_') && !hasB('spec'), locked = G.core < d.core || needSpec, n = G.army[d.key] || 0;
    return `<div class="unit ${locked ? 'dim' : ''}" onclick="${locked ? (needSpec && G.core >= d.core ? `toast('Construye el ${BNAMES[G.fac].spec[1]} (Especiales) para entrenarla')` : `toast('Se desbloquea con Núcleo ${d.core}')`) : `addUnit('${d.key}')`}">
      <img src="${spriteURL(`${FACTIONS[G.fac].atlas}/tropas/${d.sprite}_frente`, 80)}"><b>${d.name}</b><small>${d.role}</small>
      <small>${locked ? (needSpec && G.core >= d.core ? '🔒 ' + BNAMES[G.fac].spec[1] : '🔒 Núcleo ' + d.core) : `Nv ${troopLv(d.key)} ${MASTERY[rank(d.key)].icon}${pendingPerk(d.key) ? '❗' : ''} · 👥 ${d.space} · ❤️ ${fmtN(d.hp * troopMul(d.key))} · 💥 ${fmtN(d.dps * troopMul(d.key))}${d.air ? ' · ✈️' : ''}`}</small>
      ${S(`${FACTIONS[G.fac].atlas}/tropas/elite_${d.key}_frente`) ? `<button class="skinb" onclick="event.stopPropagation();cycleSkin('${d.key}')" title="Cambiar skin">${['🎨', '🎨 Élite', '🎨 Élite 2', '🎨 Élite 3'][+(G.skins && G.skins[d.key]) || 0]}</button>` : ''}
      ${n ? `<em>${n}</em><button class="minus" onclick="event.stopPropagation();subUnit('${d.key}')">−</button>` : ''}</div>`;
  }).join('');
  const h = HEROES[G.fac], h2 = HEROES2[G.fac], hk = heroKey(), atl = FACTIONS[G.fac].atlas;
  const heroRow = hero2Available() ? `<div class="hero"><div style="display:flex;gap:6px">${[['HERO', h, 'HEROE_' + h.sprite.split('_').slice(1).join('_')], ['HERO2', h2]].map(([k, H]) => `<button class="card ${hk === k ? 'on' : ''}" style="height:auto;width:auto;padding:4px 8px" onclick="G.heroSel='${k}';saveProfile();openArmy()"><img src="${spriteURL(`${atl}/tropas/${H.sprite}_frente`, 56)}"><div style="font-size:11px;font-weight:800">${H.name}</div></button>`).join('')}</div><div><b>Elige héroe</b><small>Activo: ${(hk === 'HERO2' ? h2 : h).name} · Habilidad: ${(hk === 'HERO2' ? h2 : h).ability}</small></div></div>` : '';
  openPanel(`<h3>Ejército <small>${used}/${cap} plazas · entrenamiento instantáneo</small></h3>
    <div class="bar wide"><span style="width:${cap ? Math.min(100, used / cap * 100) : 0}%"></span></div>
    ${cap ? '' : '<p>Construye un campamento para tener tropas.</p>'}
    <div class="hero ${heroAvailable() ? '' : 'dim'}"><img src="${spriteURL(`${FACTIONS[G.fac].atlas}/tropas/${h.sprite}_frente`, 70)}"><div><b>Héroe: ${h.name}</b><small>${heroAvailable() ? 'Listo para el combate. Habilidad: ' + h.ability : '🔒 Construye el ' + BNAMES[G.fac].hero[1] + ' (Núcleo 7)'}</small></div></div>
    ${heroRow}<div class="units">${cards}</div>
    <div class="acts"><button class="btn" onclick="fillArmy()">⚡ Llenar campamentos</button><button class="btn ghost" onclick="openLab()">🧪 Laboratorio</button><button class="btn ghost" onclick="G.army={};saveProfile();openArmy()">Vaciar</button></div>`);
}
function addUnit(k) { const d = unitDef(G.fac, k); if (armyUsed() + d.space > campCap()) { toast('Campamentos llenos.'); return; } G.army[k] = (G.army[k] || 0) + 1; saveProfile(); openArmy(); refreshHUD(); }
function subUnit(k) { if (G.army[k]) G.army[k]--; if (!G.army[k]) delete G.army[k]; saveProfile(); openArmy(); refreshHUD(); }
function fillArmy() {
  const av = UNITS[G.fac].map(u => unitDef(G.fac, u[0])).filter(d => d.core <= G.core && (!d.key.startsWith('x_') || hasB('spec'))); let guard = 500;
  while (guard-- > 0) { const d = av[Math.floor(Math.random() * av.length)]; if (armyUsed() + d.space > campCap()) { if (!av.some(x => armyUsed() + x.space <= campCap())) break; continue; } G.army[d.key] = (G.army[d.key] || 0) + 1; }
  saveProfile(); openArmy(); refreshHUD();
}

function allMuls() { const m = { HERO: troopStats('HERO'), HERO2: troopStats('HERO') }; for (const x of UNITS[G.fac]) m[x[0]] = troopStats(x[0]); return m; }
// ---------- laboratorio ----------
function openLab() {
  closePanel(); const R = G.research, lab = labLevel(), atl = FACTIONS[G.fac].atlas;
  let head = '';
  if (!lab) head = `<p>🔒 Construye el ${BNAMES[G.fac].lab[1]} (Núcleo 3) para mejorar tropas.</p>`;
  else if (R) { const d = unitDef(G.fac, R.k), left = (R.until - Date.now()) / 1000, g = Math.max(1, Math.ceil(left / 60)); head = `<div class="hero"><img src="${spriteURL(`${atl}/tropas/${d.sprite}_frente`, 64)}"><div><b>Investigando: ${d.name} → nivel ${R.to}</b><small>⏱️ ${fmtT(left)}</small><div class="bar wide"><span style="width:${(1 - left * 1000 / R.total) * 100}%"></span></div></div><button class="btn gold" onclick="if(PROFILE.gems>=${g}){PROFILE.gems-=${g};finishResearch();openLab()}else toast('Faltan gemas')">⚡ 💎${g}</button></div>`; }
  const cards = UNITS[G.fac].map(x => {
    const d = unitDef(G.fac, x[0]), k = d.key, lv = troopLv(k), mx = troopMax(k), locked = G.core < d.core, r = rank(k), M = MASTERY[r], nx = MASTERY[r + 1];
    const c = researchCost(lv + 1), can = !locked && !R && lab && lv < mx;
    const xp = (G.txp && G.txp[k]) || 0;
    return `<div class="unit ${locked ? 'dim' : ''}" onclick="${can ? `startResearch('${k}')` : locked ? `toast('Se desbloquea con Núcleo ${d.core}')` : lv >= mx ? `toast('Nivel máximo ahora: ${mx}. Mejora el laboratorio o el Núcleo.')` : `toast('El laboratorio está ocupado')`}">
      <img src="${spriteURL(`${atl}/tropas/${d.sprite}_frente`, 80)}" style="${lv >= 5 ? `filter:drop-shadow(0 0 ${lv >= 10 ? 7 : 3}px ${FACTIONS[G.fac].color})` : ''}"><b>${d.name}</b>
      <small>Nivel <b>${lv}</b>/${mx} · ${Math.round((troopMul(k) - 1) * 100)} % más fuerte</small>
      <small style="color:${M.col}">${M.icon} ${M.name}${nx ? ` · ${xp}/${nx.xp} xp` : ' · máx.'} ${perks(k).map(p => PERKS[p].n.split(' ')[0]).join('')}</small>
      ${pendingPerk(k) ? `<div class="perks" onclick="event.stopPropagation()">${Object.entries(PERKS).map(([pk, P]) => `<button onclick="choosePerk('${k}','${pk}');openLab()" title="${P.d}">${P.n.split(' ')[0]}<small>${P.d}</small></button>`).join('')}</div>` : ''}
      ${!locked && lv < mx ? `<small>⬆️ 💧 ${fmtN(c.n)} · ⏱️ ${fmtT(researchTime(lv + 1))}</small>` : ''}</div>`;
  }).join('');
  const hl = heroLevel(), h = HEROES[G.fac];
  openPanel(`<h3>🧪 Laboratorio <small>+12 % de vida y daño por nivel · una tropa a la vez</small></h3>${head}
    <div class="hero"><img src="${spriteURL(`${atl}/tropas/${h.sprite}_frente`, 60)}"><div><b>Héroe ${h.name}: nivel ${hl}/5</b><small>Sube mejorando el ${BNAMES[G.fac].hero[1]} (+15 % por nivel)</small></div></div>
    <p style="font-size:12px;opacity:.8;margin:4px 0 8px">🎖️ <b>Maestría:</b> cada tropa que usas (al menos un 10 % del ejército) gana experiencia. En Bronce, Plata y Oro eliges una especialización (❤️ +5 % vida, 💥 +5 % daño o 👟 +6 % velocidad). En Diamante, +5 % a todo y un aura. Cada rango da gemas.</p>
    <div class="units">${cards}</div>`);
  $('#panel').dataset.view = 'lab';
}
// ---------- ataque / defensa / clima ----------
let WX_PICK = 'random';
function wxPick() { return WX_PICK === 'random' ? WEATHERS[Math.floor(Math.random() * WEATHERS.length)].id : WX_PICK; }
function openAttack() {
  closePanel(); const used = armyUsed();
  const others = FAC_IDS.filter(f => f !== G.fac);
  let camp = ''; let unlocked = true;
  for (let i = 1; i <= 30; i++) {
    const st = G.campaign[i] || 0; const core = Math.min(10, 1 + Math.floor((i - 1) / 3)); const ef = campEnemy(i);
    camp += `<button class="mis ${unlocked ? '' : 'dim'}" ${unlocked ? `onclick="launchAttack(${i})"` : ''}><img src="${spriteURL(FACTIONS[ef].icon, 30)}"><b>${i}</b><small>N${core}</small><span>${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span></button>`;
    if (!st) unlocked = false;
  }
  openModal(`<h2>🗡️ Atacar</h2>
    <p>Tropas listas: <b>${used}/${campCap()}</b> plazas${heroAvailable() ? ' + héroe' : ''}. ${used ? '' : '⚠️ Entrena tropas en Ejército.'}</p>
    <div class="row"><button class="btn big" onclick="launchAttack(0)">🔎 Buscar rival (IA) · 💧 ${fmtN(50 * G.core)}</button></div>
    ${wxRow()}
    <h3>Campaña</h3><div class="missions">${camp}</div>
    <button class="btn ghost" onclick="closeModal()">Cerrar</button>`, 'wide');
}
function wxRow() { return `<div class="wxrow"><span>Clima:</span><button class="wx ${WX_PICK === 'random' ? 'on' : ''}" onclick="WX_PICK='random';this.parentNode.outerHTML=wxRow()">🎲</button>${WEATHERS.map(w => `<button class="wx ${WX_PICK === w.id ? 'on' : ''}" title="${w.name}" onclick="WX_PICK='${w.id}';this.parentNode.outerHTML=wxRow()">${w.icon}</button>`).join('')}<small>${WX_PICK === 'random' ? 'Aleatorio' : WEATHERS.find(w => w.id === WX_PICK).name + ': ' + WEATHERS.find(w => w.id === WX_PICK).fx}</small></div>`; }
// dificultad de campaña: a partir del capítulo 2 las defensas van algo por debajo de su máximo (los jefes menos)
let CAMP_MODE = 'normal';
function weekNum() { return Math.floor((Date.now() / 86400000 + 3) / 7); }
function campCore(m) { const c = Math.min(10, 1 + Math.floor((m - 1) / 3)); return CAMP_MODE === 'heroic' ? Math.min(10, c + 2) : CAMP_MODE === 'weekly' ? Math.max(1, Math.min(10, G.core)) : c; }
function campSoft(m) { if (CAMP_MODE !== 'normal') return 0; return m <= 12 ? 0 : m <= 18 ? (m % 10 === 0 ? 1 : 2) : (m % 10 === 0 ? 2 : 3); }
function campEnemy(m) { const o = { res: ['volt', 'nuw'], volt: ['res', 'nuw'], nuw: ['res', 'volt'] }[G.fac], c = Math.floor((m - 1) / 10); return c < 2 ? o[c] : o[m % 2]; }
function launchAttack(mission) {
  if (!armyUsed() && !heroAvailable()) { toast('No tienes tropas. Ve a Ejército.'); return; }
  if (!mission && shieldLeft() > 0) { G.shield = 0; toast('Al buscar rival pierdes el escudo.'); }
  const others = FAC_IDS.filter(f => f !== G.fac); let core, ef, seed;
  if (mission) { core = campCore(mission); ef = others[mission % 2]; seed = mission * 31 + 7 + (CAMP_MODE === 'heroic' ? 5000 : CAMP_MODE === 'weekly' ? weekNum() * 97 : 0); ef = campEnemy(mission); }
  else { const c = { r: 'B', n: 50 * G.core }; if (!pay(c)) { toast('Te falta ' + resName('B')); return; } core = Math.max(1, Math.min(10, G.core + (Math.random() < .3 ? 1 : Math.random() < .3 ? -1 : 0))); ef = others[Math.floor(Math.random() * 2)]; seed = Date.now() % 100000; }
  closeModal();
  const loot = { A: CC[core - 1] * 2.2 + 800, B: CC[core - 1] * 2.2 + 800, C: core >= 5 ? CC[core - 1] * 0.22 : 0 };
  const eb = genEnemyBase(ef, core, seed, mission ? campSoft(mission) : 0); const ewx = eb.some(b => b.t === 'weather') ? ['toxic', 'fog', 'ion', 'acid', 'snow', 'sand'][seed % 6] : wxPick();
  startBattle({ mode: 'attack', defFac: ef, attFac: G.fac, base: eb, army: Object.assign({}, G.army), hero: heroAvailable(), weather: ewx, core, loot, campaign: mission || 0, tmul: allMuls(), tlv: Object.assign({}, G.tlv, { HERO: heroLevel(), HERO2: heroLevel() }), heroKey: heroKey(), abil: supportLevel(), atkRadar: G.buildings.some(b => b.t === 'radar' && b.lv > 0) });
}
function startDefense(rep) {
  closePanel(); let opts;
  if (rep) opts = Object.assign(JSON.parse(JSON.stringify(rep.opts)), { replay: true });
  else {
    if (shieldLeft() > 0) { toast(`🛡️ Tienes escudo ${fmtT(shieldLeft())}: nadie puede invadirte.`, 'gold'); return; } const others = FAC_IDS.filter(f => f !== G.fac); const ef = others[Math.floor(Math.random() * 2)];
    const defs = G.buildings.filter(b => isDefense(b.t) && b.lv > 0), dLv = defs.length ? defs.reduce((a, b) => a + b.lv, 0) / defs.length : 1;
    const cap = (4 + G.core * 2 + defs.length * .5) * (ef === 'nuw' ? .7 : 1);
    const av = UNITS[ef].map(u => unitDef(ef, u[0])).filter(d => d.core <= G.core); const waves = []; let used = 0, t = 1.5;
    const edges = () => { const s = Math.floor(Math.random() * 4), k = 2 + Math.random() * (N - 4); return s === 0 ? [k, 1] : s === 1 ? [k, N - 2] : s === 2 ? [1, k] : [N - 2, k]; };
    let [ex, ey] = edges(); let guard = 400;
    while (used < cap && guard-- > 0) { const d = av[Math.floor(Math.random() * av.length)]; if (used + d.space > cap) continue; used += d.space; waves.push({ t, key: d.key, x: ex + (Math.random() - .5) * 2, y: ey + (Math.random() - .5) * 2 }); t += .25; if (Math.random() < .12) { [ex, ey] = edges(); t += 4; } }
    const camps = G.buildings.filter(b => b.t === 'camp' && b.lv > 0), garrison = []; let n = 0;
    if (camps.length) for (const k in G.army) for (let i = 0; i < G.army[k]; i++) { const c = camps[n++ % camps.length]; garrison.push([k, c.x + 1 + (Math.random() - .5) * 2.4, c.y + 2.4 + Math.random() * .8]); }
    const base = JSON.parse(JSON.stringify(G.buildings.filter(b => b.t !== 'deco' && b.t !== 'obst'), (k, v) => k === '_op' || k === 'acc' || k === 'busy' ? undefined : v));
    opts = { mode: 'defend', defFac: G.fac, attFac: ef, base, army: {}, hero: false, weather: G.buildings.some(b => b.t === 'weather' && b.lv > 0) && G.defWx ? G.defWx : wxPick(), core: G.core, aiLv: Math.max(1, Math.min(G.core, Math.round(dLv))), ai: waves, tmul: allMuls(), tlv: Object.assign({}, G.tlv), garrison, seed: Math.floor(Math.random() * 2147483647), finish: G.finish || 0 };
  }
  const saved = JSON.parse(JSON.stringify(opts)); delete saved.replay;
  startBattle(opts);
  const g = opts.garrison || [], R = Math.random; if (BAT && BAT.rng) Math.random = BAT.rng;
  try { for (const [k, x, y] of g) spawnUnit('def', opts.defFac, k, x, y, { own: true }); } finally { Math.random = R; }
  BAT.replay = !!opts.replay; BAT.opt = saved;
  if (opts.replay) banner('▶️ Repetición', `Invasión de ${FACTIONS[opts.attFac].name}`);
  else banner(`🛡️ ¡Invasión de ${FACTIONS[opts.attFac].name}!`, g.length ? `Tus defensas y ${g.length} tropas salen a defender` : 'Tus defensas luchan solas');
}
function openWeather() {
  closePanel();
  openModal(`<h2>⛅ Clima de la base</h2><p>Cambia el clima que se ve en tu base. En los combates cada clima cambia las reglas.</p>
    <div class="wxgrid">${WEATHERS.map(w => `<button class="wxc ${G.wx === w.id ? 'on' : ''}" onclick="G.wx='${w.id}';setWeather('${w.id}');saveProfile();refreshHUD();closeModal()"><span>${w.icon}</span><b>${w.name}</b><small>${w.fx}</small></button>`).join('')}</div>
    <button class="btn ghost" onclick="closeModal()">Cerrar</button>`, 'wide');
}
function openMenu() {
  closePanel();
  openModal(`<h2>☰ Menú</h2>
    <div class="col"><button class="btn" onclick="saveProfile();closeModal();showTitle()">🏠 Salir al menú inicial</button>
    <button class="btn ghost" onclick="G.A=storeCap('A');G.B=storeCap('B');G.C=storeCap('C');PROFILE.gems+=500;saveProfile();refreshHUD();toast('Recursos de prueba añadidos','gold');closeModal()">🧪 Llenar recursos (+500 💎)</button>
    <button class="btn ghost" onclick="for(const b of G.buildings)if(b.busy)b.busy.until=Date.now();closeModal()">⏩ Terminar todas las obras</button>
    <label class="lbl">Velocidad <select onchange="PROFILE.speed=+this.value;saveProfile()">${[[1, 'Real (x1)'], [60, 'Prueba (x60)'], [600, 'Turbo (x600)']].map(([v, n]) => `<option value="${v}" ${PROFILE.speed == v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <button class="btn ghost" onclick="if(confirmReset()){delete PROFILE.slots[G.fac];G=null;saveProfile();showTitle();}">🗑️ Reiniciar esta facción</button>
    <button class="btn ghost" onclick="closeModal()">Cerrar</button></div>`);
}

// ---------- HUD de combate ----------
function buildBattleHUD() {
  $('#hud').style.display = 'none'; closePanel(); closeModal(); $('#placebar').classList.remove('show'); PLACING = null;
  const B = BAT; const h = $('#bhud'); h.style.display = 'block';
  const w = WEATHERS.find(x => x.id === B.wx); const EF = FACTIONS[B.defFac], AF = FACTIONS[B.attFac];
  h.innerHTML = `<div class="btop"><div class="bst"><span id="bStars">☆☆☆</span><b id="bPct">0 %</b><small>${B.mode === 'attack' ? 'contra ' + EF.name + ' · Núcleo ' + B.core : '¡' + AF.name + ' te ataca!'}</small></div>
    <div class="btime" id="bTime">3:00</div>
    <div class="bloot">${B.mode === 'attack' ? `<span>${resIcon('A')} ${fmtN(B.loot.A)}</span><span>${resIcon('B')} ${fmtN(B.loot.B)}</span>${B.loot.C ? `<span>${resIcon('C')} ${fmtN(B.loot.C)}</span>` : ''}` : ''}<span class="wxchip">${w.icon} ${w.name}</span></div></div>
    <div class="bbot"><div class="cards" id="bCards"></div>
    <div class="bbtn"><button onclick="BAT.speed=BAT.speed===1?2:BAT.speed===2?4:1;this.textContent='⏩ x'+BAT.speed">⏩ x1</button><button onclick="endBattle(true)">🏳️ ${B.mode === 'attack' ? 'Terminar' : 'Saltar'}</button></div></div>
    ${B.mode === 'attack' ? '<div class="hint" id="bHint">Elige tropa y toca fuera de la zona roja. Mantén pulsado para soltar varias.</div>' : ''}`;
  if (B.mode === 'attack') B.sel = Object.keys(B.avail).find(k => B.avail[k] > 0) || (B.heroAvail ? 'HERO' : null);
  refreshBattleHUD();
}
function refreshBattleHUD() {
  const B = BAT; if (!B) return; const atl = FACTIONS[B.attFac].atlas;
  if (B.mode === 'attack') {
    let c = Object.keys(B.avail).map(k => { const d = unitDef(B.attFac, k); return `<button class="card ${B.sel === k ? 'on' : ''} ${B.avail[k] ? '' : 'dim'}" onclick="BAT.sel='${k}';BAT.selAbil=null;refreshBattleHUD()"><img src="${spriteURL(`${atl}/tropas/${d.sprite}_frente`, 56)}"><em>x${B.avail[k]}</em></button>`; }).join('');
    const h = B.heroKey === 'HERO2' ? HEROES2[B.attFac] : HEROES[B.attFac];
    if (B.heroAvail || B.heroUnit) c += `<button class="card hero ${B.sel === 'HERO' ? 'on' : ''} ${B.heroUsed || (B.heroUnit && B.heroUnit.dead) ? 'dim' : ''}" onclick="${B.heroUnit ? 'heroAbility()' : `BAT.sel='HERO';refreshBattleHUD()`}"><img src="${spriteURL(`${atl}/tropas/${h.sprite}_frente`, 56)}"><em>${B.heroUnit ? h.icon : 'Héroe'}</em></button>`;
    c += B.abils.map((a, i) => `<button class="card abil ${B.selAbil === i ? 'on' : ''} ${a.left ? '' : 'dim'}" title="${a.d}" onclick="if(BAT.abils[${i}].left){BAT.selAbil=BAT.selAbil===${i}?null:${i};refreshBattleHUD();toast('${a.n}: toca el mapa')}"><span style="font-size:30px">${a.i}</span><em>${a.n} x${a.left}</em></button>`).join('');
    $('#bCards').innerHTML = c || '<span class="none">Sin tropas</span>';
  } else $('#bCards').innerHTML = '<span class="none">Mira cómo responden tus defensas</span>';
}
function updateBattleHUD() {
  const B = BAT; if (!B) return; const pct = Math.floor(B.destroyed / Math.max(1, B.total) * 100); const st = stars();
  $('#bPct').textContent = pct + ' %'; $('#bStars').textContent = '★'.repeat(st) + '☆'.repeat(3 - st);
  const left = Math.max(0, B.dur - B.t); $('#bTime').textContent = Math.floor(left / 60) + ':' + pad2(Math.floor(left % 60));
  if (B.started && $('#bHint')) $('#bHint').remove();
}
function showBattleEnd(r) {
  const B = BAT; const win = B.mode === 'attack' ? r.st > 0 : r.pct < .5;
  openModal(`<h2>${win ? '¡Victoria!' : 'Derrota'}</h2><div class="bigstars">${B.mode === 'attack' ? '★'.repeat(r.st) + '<span style="opacity:.22;filter:grayscale(1)">★</span>'.repeat(3 - r.st) : win ? '🛡️' : '💥'}</div>
    <p>${Math.floor(r.pct * 100)} % ${B.mode === 'attack' ? 'destruido' : 'de tu base destruida'}</p>
    ${r.shieldH ? `<p>🛡️ Escudo de ${r.shieldH} h: no te pueden invadir mientras dure.</p>` : ''}${B.mode === 'defend' && r.safeA != null ? `<p style="font-size:13px;opacity:.85">🔒 La cámara acorazada salvó ${resIcon('A')} ${fmtN(r.safeA)} · ${resIcon('B')} ${fmtN(r.safeB)}${r.safeC ? ' · ' + resIcon('C') + ' ' + fmtN(r.safeC) : ''}</p>` : ''}
    <div class="rew">${r.C ? `<span>${resIcon('C')} ${r.C > 0 ? '+' : ''}${fmtN(r.C)}</span>` : ''}${r.A ? `<span>${resIcon('A')} ${r.A > 0 ? '+' : ''}${fmtN(r.A)}</span>` : ''}${r.B ? `<span>${resIcon('B')} ${r.B > 0 ? '+' : ''}${fmtN(r.B)}</span>` : ''}<span>🏆 ${r.troph > 0 ? '+' : ''}${r.troph}</span>${r.gems ? `<span>💎 +${r.gems}</span>` : ''}</div>
    ${r.ups && r.ups.length ? `<div class="ups">${r.ups.map(x => `<div>🎖️ ${x}</div>`).join('')}</div>` : ''}
    <button class="btn big" onclick="backToBase()">Volver a la base</button>`);
}
function backToBase() { closeModal(); BAT = null; MODE = 'base'; FX = []; setWeather(G.wx || 'clear'); buildHUD(); const [cx, cy] = iso(N / 2, N / 2); cam.x = cx; cam.y = cy; }
