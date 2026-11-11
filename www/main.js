// ===== arranque y bucle principal =====
'use strict';
let lastT = performance.now(), tickAcc = 0, hudAcc = 0, holdAcc = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b0f1a'; ctx.fillRect(0, 0, W, H);
  if (MODE === 'base' && G) {
    tickAcc += dt; if (tickAcc > .5) { tickAcc = 0; baseTick(); refreshHUD(); if (SEL && $('#panel').classList.contains('open') && (SEL.busy || SEL.t.startsWith('prod'))) openBuilding(SEL); if (G.research && $('#panel').dataset.view === 'lab') openLab(); }
    drawBase(dt);
  } else if (MODE === 'battle' && BAT) {
    const sp = BAT.speed || 1; BAT.acc = (BAT.acc || 0) + dt * sp; let k = 0; while (BAT && BAT.acc >= 1 / 30 && k++ < 60) { BAT.acc -= 1 / 30; battleStep(1 / 30); }
    // soltar tropas manteniendo pulsado
    if (INPUT.start && INPUT.ptrs.size === 1 && !INPUT.pinch && BAT.mode === 'attack') {
      if (!INPUT.holdDeploy && !INPUT.moved && performance.now() - INPUT.start.t > 350) { INPUT.holdDeploy = true; INPUT.moved = true; holdAcc = 1; }
      if (INPUT.holdDeploy && INPUT.holding) { holdAcc += dt; if (holdAcc > .13) { holdAcc = 0; const [tx, ty] = screenToTile(INPUT.holding.x, INPUT.holding.y); deployAt(tx, ty); } }
    }
    drawBattle(dt); hudAcc += dt; if (hudAcc > .25) { hudAcc = 0; updateBattleHUD(); }
  } else if (MODE === 'rts' && RTS) {
    const sp = RTS.speed || 1; let rem = dt * sp; while (rem > 0) { const s = Math.min(.05, rem); rtsStep(s); rem -= s; }
    if (RTS) { drawRTS(dt); hudAcc += dt; if (hudAcc > .25) { hudAcc = 0; updateRtsHUD(); } }
  } else if (MODE === 'title') { drawTitleBg(dt); }
  weatherUpdate(dt); weatherDraw();
  requestAnimationFrame(loop);
}
let titleT = 0;
function drawTitleBg(dt) {
  titleT += dt; const g = ctx.createRadialGradient(W / 2, H * .4, 50, W / 2, H / 2, Math.max(W, H));
  g.addColorStop(0, '#1a2550'); g.addColorStop(1, '#05070e'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) { const x = (i * 97.3 + titleT * (5 + i % 7)) % W, y = (i * 53.7) % H; ctx.fillStyle = `rgba(255,255,255,${.2 + (i % 5) * .12})`; ctx.fillRect(x, y, 1.5, 1.5); }
}
function setupHandlers() {
  INPUT.onTap = (sx, sy) => {
    if (MODE === 'base') {
      const [tx, ty] = screenToTile(sx, sy);
      if (ROUTE) { if (ROUTE.pts.length >= 8) { toast('Máximo 8 puntos'); return; } ROUTE.pts.push([clamp(tx, BORDER, N - BORDER), clamp(ty, BORDER, N - BORDER)]); updRoute(); return; }
      if (PLACING) {
        const s = SIZE[PLACING.t];
        if (PLACING.t === 'wall') { const x = Math.floor(tx), y = Math.floor(ty); if (countOf('wall') >= maxCount('wall')) { toast('Máximo de muros para tu nivel.'); return; } if (canPlace('wall', x, y) && buildNew('wall', x, y)) { const w = G.buildings[G.buildings.length - 1], ar = wallAutoRot(x, y); w.rot = ar != null ? ar : (PLACING.rot || 0); if (ar != null) PLACING.rot = ar; const rb = document.getElementById('rotB'); if (rb) rb.textContent = PLACING.rot ? '🔄 Muro ↗' : '🔄 Muro ↘'; saveProfile(); } PLACING.x = x; PLACING.y = y; return; }
        PLACING.x = clamp(snapC(tx - s / 2, s), BORDER, N - BORDER - s); PLACING.y = clamp(snapC(ty - s / 2, s), BORDER, N - BORDER - s); return;
      }
      const b = hitBuilding(sx, sy);
      if (!b) { closePanel(); return; }
      if ((b.t === 'prodA' || b.t === 'prodB') && (b.acc || 0) >= Math.max(10, prodCap(b) * .04) && !b.busy) { if (collect(b)) return; }
      openBuilding(b);
    } else if (MODE === 'rts') { const [tx, ty] = screenToTile(sx, sy); rtsTap(tx, ty);
    } else if (MODE === 'battle' && BAT && BAT.mode === 'attack') {
      if (INPUT.holdDeploy) return; const [tx, ty] = screenToTile(sx, sy); if (BAT.selAbil != null) { castAbility(BAT.abils[BAT.selAbil], tx, ty); return; } deployAt(tx, ty);
    }
  };
  INPUT.onDragStart = (sx, sy) => {
    if (MODE === 'base' && PLACING && PLACING.t === 'wall' && !PLACING.move) { const [tx, ty] = screenToTile(sx, sy); INPUT._w0 = [Math.floor(tx), Math.floor(ty)]; INPUT._wdone = new Set(); wallLineTo(Math.floor(tx), Math.floor(ty)); return 'wall'; }
    INPUT.holdDeploy = false;
    if (MODE === 'base' && PLACING && (PLACING.t !== 'wall' || PLACING.move)) { const [tx, ty] = screenToTile(sx, sy); INPUT._p0 = { tx, ty, x: PLACING.x, y: PLACING.y }; return 'place'; }
    return null;
  };
  INPUT.onDrag = (sx, sy) => {
    if (INPUT.dragMode === 'wall' && PLACING) { const [tx, ty] = screenToTile(sx, sy); wallLineTo(Math.floor(tx), Math.floor(ty)); return; }
    if (INPUT.dragMode === 'place' && PLACING) {
      const [tx, ty] = screenToTile(sx, sy); const p = INPUT._p0, s = SIZE[PLACING.t];
      PLACING.x = clamp(snapC(p.x + tx - p.tx, s), BORDER, N - BORDER - s); PLACING.y = clamp(snapC(p.y + ty - p.ty, s), BORDER, N - BORDER - s);
    }
  };
  INPUT.onDragEnd = () => { if (INPUT._wdone && INPUT._wdone.size) { saveProfile(); refreshHUD(); } INPUT._w0 = null; INPUT._wdone = null; };
}
// muro arrastrando: se construye en línea recta desde donde tocas, en la dirección del dedo
function wallLineTo(x1, y1) {
  const [x0, y0] = INPUT._w0, horiz = Math.abs(x1 - x0) >= Math.abs(y1 - y0), n = horiz ? x1 - x0 : y1 - y0, st = Math.sign(n) || 1;
  for (let i = 0; i <= Math.abs(n); i++) {
    const x = horiz ? x0 + i * st : x0, y = horiz ? y0 : y0 + i * st, k = x + ',' + y; if (INPUT._wdone.has(k)) continue;
    if (countOf('wall') >= maxCount('wall')) { if (!INPUT._wmax) { toast('Máximo de muros para tu nivel.'); INPUT._wmax = 1; setTimeout(() => INPUT._wmax = 0, 1500); } return; }
    INPUT._wdone.add(k);
    if (canPlace('wall', x, y) && buildNew('wall', x, y)) { const w = G.buildings[G.buildings.length - 1]; w.rot = horiz ? 0 : 1; PLACING.rot = w.rot; }
  }
}
async function boot() {
  cv = $('#cv'); ctx = cv.getContext('2d'); resize(); window.addEventListener('resize', resize);
  setupInput(); setupHandlers(); loadProfile();
  requestAnimationFrame(loop);
  try { await loadAtlases(); } catch (e) { $('#loading').textContent = 'No se pudieron cargar las imágenes.'; return; }
  $('#loading').remove(); showTitle();
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveProfile(); });
  setInterval(saveProfile, 15000);
}
boot();
