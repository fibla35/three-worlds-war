// Three Worlds War · sonido y música generados por código (Web Audio, sin archivos)
const SND = (() => {
  let ac = null, master, musBus, sfxBus, noiseBuf;
  const st = (() => { try { return JSON.parse(localStorage.getItem('tww_snd')) || {}; } catch (e) { return {}; } })();
  if (st.mus == null) st.mus = true; if (st.sfx == null) st.sfx = true;
  const save = () => { try { localStorage.setItem('tww_snd', JSON.stringify(st)); } catch (e) {} };

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    ac = new C(); master = ac.createGain(); master.gain.value = .8;
    const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
    musBus = ac.createGain(); musBus.gain.value = st.mus ? .32 : 0; musBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = st.sfx ? .55 : 0; sfxBus.connect(master);
    const ir = ac.createBuffer(2, ac.sampleRate * 1.6, ac.sampleRate); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
    const verb = ac.createConvolver(); verb.buffer = ir; const vg = ac.createGain(); vg.gain.value = .9; verb.connect(vg); vg.connect(master);
    const sS = ac.createGain(); sS.gain.value = .16; sfxBus.connect(sS); sS.connect(verb); const mS = ac.createGain(); mS.gain.value = .28; musBus.connect(mS); mS.connect(verb);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, init, { passive: true }));

  // ---------- piezas básicas ----------
  function tone(f, t, dur, { type = 'sine', vol = .3, a = .005, f2 = null, bus, det = 0, q = null } = {}) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = det;
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    let n = o; if (q) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = q; o.connect(fl); n = fl; }
    n.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + .05);
  }
  function noise(t, dur, { vol = .3, type = 'lowpass', f = 1200, f2 = null, bus } = {}) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    s.connect(fl); fl.connect(g); g.connect(bus || sfxBus); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }
  const last = {}; const ok = (k, gap) => { const n = performance.now(); if (last[k] && n - last[k] < gap) return false; last[k] = n; return true; };
  const ready = () => ac && st.sfx;

  // ---------- efectos ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  const bell = (f, t, dur, vol) => { tone(f, t, dur, { type: 'sine', vol }); tone(f * 2.76, t, dur * .5, { type: 'sine', vol: vol * .35 }); tone(f * 5.4, t, dur * .25, { type: 'sine', vol: vol * .12 }); };
  const FX = {
    click() { const t = ac.currentTime, r = rnd(.94, 1.06); tone(1500 * r, t, .035, { type: 'triangle', vol: .09, f2: 1000 * r }); noise(t, .02, { vol: .05, type: 'highpass', f: 5000 }); },
    pop() { const t = ac.currentTime; tone(420, t, .12, { type: 'sine', vol: .14, f2: 980 }); tone(1300, t + .05, .1, { type: 'triangle', vol: .04 }); },
    whoosh() { const t = ac.currentTime; noise(t, .22, { vol: .1, type: 'bandpass', f: 350, f2: 2600 }); },
    deny() { const t = ac.currentTime; tone(190, t, .09, { type: 'square', vol: .07, q: 900 }); tone(140, t + .1, .14, { type: 'square', vol: .07, q: 900 }); },
    coin() { const t = ac.currentTime; bell(1568, t, .35, .1); bell(2093, t + .07, .45, .09); noise(t + .05, .25, { vol: .04, type: 'highpass', f: 8000 }); },
    tick(i = 0) { const t = ac.currentTime; bell(1760 * Math.pow(1.06, i % 8), t, .18, .05); },
    build() { const t = ac.currentTime; for (let i = 0; i < 3; i++) { const u = t + i * .13, r = rnd(.92, 1.08); noise(u, .05, { vol: .3, type: 'bandpass', f: 2600 * r }); tone(880 * r, u, .14, { type: 'triangle', vol: .06, f2: 840 * r }); tone(130, u, .09, { type: 'sine', vol: .18, f2: 70 }); } },
    done(big) { const t = ac.currentTime; noise(t, .4, { vol: .1, type: 'highpass', f: 5000, f2: 9000 });
      (big ? [392, 523, 659, 784, 1047, 1319] : [659, 784, 1047]).forEach((f, i) => { tone(f, t + i * .09, .5, { type: 'triangle', vol: .13 }); bell(f * 2, t + i * .09, .4, .03); });
      if (big) { tone(131, t, 1.4, { type: 'sawtooth', vol: .1, q: 900 }); tone(65, t, 1.4, { type: 'sine', vol: .25 }); } },
    up() { const t = ac.currentTime; [523, 659, 784, 1047].forEach((f, i) => { tone(f, t + i * .08, .25, { type: 'triangle', vol: .14 }); bell(f * 2, t + i * .08, .3, .03); }); },
    place() { const t = ac.currentTime; tone(150, t, .16, { type: 'sine', vol: .4, f2: 52 }); noise(t, .3, { vol: .14, f: 700, f2: 150 }); noise(t, .03, { vol: .1, type: 'highpass', f: 3000 }); },
    deploy(fac) { const t = ac.currentTime, r = rnd(.9, 1.1);
      if (fac === 'volt') { tone(320 * r, t, .12, { type: 'square', vol: .06, f2: 900 * r, q: 2500 }); noise(t, .05, { vol: .05, type: 'highpass', f: 4000 }); }
      else if (fac === 'nuw') { tone(260 * r, t, .14, { type: 'sine', vol: .12, f2: 700 * r }); noise(t, .1, { vol: .06, type: 'bandpass', f: 900, f2: 300 }); }
      else { noise(t, .07, { vol: .12, type: 'bandpass', f: 900 * r }); tone(220 * r, t, .08, { type: 'triangle', vol: .08, f2: 330 * r }); } },
    shot(fac) {
      const t = ac.currentTime, r = rnd(.88, 1.12);
      if (fac === 'volt') { tone(1900 * r, t, .14, { type: 'sawtooth', vol: .05, f2: 260, q: 4500 }); tone(1910 * r, t, .14, { type: 'sawtooth', vol: .04, f2: 250, q: 3000, det: 15 }); noise(t, .04, { vol: .06, type: 'highpass', f: 5000 }); }
      else if (fac === 'nuw') { tone(500 * r, t, .18, { type: 'sine', vol: .1, f2: 1700 * r }); tone(240 * r, t + .02, .12, { type: 'sine', vol: .07, f2: 90 }); noise(t, .12, { vol: .05, type: 'bandpass', f: 1200, f2: 400 }); }
      else { noise(t, .02, { vol: .25, type: 'highpass', f: 2500 }); noise(t, .16, { vol: .18, type: 'bandpass', f: 1100 * r, f2: 300 }); tone(150, t, .09, { type: 'sine', vol: .14, f2: 55 }); }
    },
    hit() { const t = ac.currentTime; noise(t, .04, { vol: .08, type: 'bandpass', f: rnd(1400, 2400) }); },
    die(fac) { const t = ac.currentTime, r = rnd(.9, 1.1);
      if (fac === 'volt') { for (let i = 0; i < 4; i++) tone((700 - i * 140) * r, t + i * .04, .05, { type: 'square', vol: .05, q: 2000 }); noise(t, .2, { vol: .08, type: 'highpass', f: 3000, f2: 800 }); }
      else if (fac === 'nuw') { tone(450 * r, t, .22, { type: 'sine', vol: .1, f2: 120 }); noise(t, .2, { vol: .1, type: 'bandpass', f: 700, f2: 200 }); }
      else { tone(330 * r, t, .2, { type: 'sawtooth', vol: .05, f2: 140, q: 1200 }); noise(t, .1, { vol: .06, f: 900 }); } },
    boom(big) { const t = ac.currentTime, d = big ? 1.6 : .7;
      tone(big ? 75 : 95, t, d, { type: 'sine', vol: .55, f2: 28 }); noise(t, d, { vol: big ? .65 : .4, f: 1600, f2: 60 }); noise(t, .06, { vol: .3, type: 'highpass', f: 2500 });
      for (let i = 0; i < (big ? 9 : 4); i++) noise(t + .08 + Math.random() * d * .6, .03, { vol: .07, type: 'highpass', f: rnd(2000, 6000) }); },
    crumble() { const t = ac.currentTime; for (let i = 0; i < 6; i++) noise(t + i * rnd(.03, .07), .07, { vol: .12, type: 'bandpass', f: rnd(500, 1300) }); tone(110, t, .25, { type: 'sine', vol: .2, f2: 50 }); },
    star(n = 1) { const t = ac.currentTime; const seq = [[784, 988, 1175], [880, 1109, 1319], [1047, 1319, 1568, 2093]][Math.min(2, n - 1)];
      seq.forEach((f, i) => { bell(f, t + i * .09, .6, .09); tone(f / 2, t + i * .09, .4, { type: 'triangle', vol: .05 }); }); noise(t, .6, { vol: .06, type: 'highpass', f: 6000, f2: 10000 }); },
    chest() { const t = ac.currentTime; for (let i = 0; i < 5; i++) { noise(t + i * .12, .05, { vol: .14, type: 'bandpass', f: 1800 + i * 200 }); tone(200 + i * 30, t + i * .12, .06, { type: 'triangle', vol: .06 }); }
      const t2 = t + .7; tone(110, t2, .4, { type: 'sine', vol: .35, f2: 55 }); noise(t2, .9, { vol: .12, type: 'highpass', f: 4000, f2: 10000 });
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => { bell(f, t2 + .05 + i * .06, .7, .07); }); [262, 330, 392].forEach(f => tone(f, t2 + .1, 1.1, { type: 'sawtooth', vol: .035, q: 2200, a: .03 })); },
    power() { const t = ac.currentTime; tone(200, t, .6, { type: 'sawtooth', vol: .12, f2: 1600, q: 2500 }); noise(t, .5, { vol: .2, type: 'bandpass', f: 400, f2: 4000 }); tone(60, t, .7, { type: 'sine', vol: .3 }); },
    alert() { const t = ac.currentTime; [0, .22, .44].forEach(o => { tone(880, t + o, .16, { type: 'square', vol: .06, q: 3000 }); tone(660, t + o + .1, .1, { type: 'square', vol: .05, q: 3000 }); }); },
    win() {
      // fanfarria de victoria: I–IV–V–I con batería, metales y final sostenido (~5 s)
      const t0 = ac.currentTime + .05, q = .25; duck(5.5);
      const kick = t => tone(120, t, .2, { type: 'sine', vol: .45, f2: 40 }), snare = t => noise(t, .15, { vol: .25, type: 'bandpass', f: 1900 }), hat = t => noise(t, .04, { vol: .07, type: 'highpass', f: 7000 });
      for (let i = 0; i < 16; i++) { const t = t0 + i * q; if (i % 4 === 0 || i % 8 === 6) kick(t); if (i % 4 === 2) snare(t); hat(t + q / 2); }
      const mel = [[0, 523, 1], [1, 523, .5], [1.5, 523, .5], [2, 659, 1], [3, 784, 1], [4, 698, 1], [5, 880, 1], [6, 784, 1.5], [7.5, 698, .5], [8, 784, 1], [9, 988, 1], [10, 1047, 1], [11, 1175, 1], [12, 1047, 3.5]];
      for (const [b, f, d] of mel) { const t = t0 + b * q * 2; tone(f, t, d * q * 2, { type: 'square', vol: .07, q: 3200 }); tone(f / 2, t, d * q * 2, { type: 'sawtooth', vol: .05, q: 1800 }); }
      const ch = [[0, [262, 330, 392]], [2, [349, 440, 523]], [4, [392, 494, 587]], [6, [523, 659, 784]]];
      for (const [b, fs] of ch) fs.forEach(f => tone(f / 2, t0 + b * q * 4 / 2 * 2, q * 8, { type: 'triangle', vol: .05, a: .05 }));
      const tEnd = t0 + 12 * q * 2; [131, 262, 330, 392, 523].forEach(f => tone(f, tEnd, 2.2, { type: 'sawtooth', vol: .045, a: .02, q: 2500 }));
      noise(tEnd, 1.8, { vol: .25, type: 'highpass', f: 4000, f2: 9000 }); kick(tEnd); snare(tEnd);
    },
    lose() { const t = ac.currentTime; duck(3); [[392, 0], [370, .3], [349, .6], [262, .9]].forEach(([f, o]) => tone(f, t + o, .5, { type: 'sawtooth', vol: .09, q: 1400 })); },
  };
  function play(name, ...a) { if (!ready() || !FX[name]) return; try { FX[name](...a); } catch (e) {} }

  function duck(sec) { if (!musBus || !st.mus) return; const t = ac.currentTime; musBus.gain.cancelScheduledValues(t); musBus.gain.setTargetAtTime(.04, t, .08); musBus.gain.setTargetAtTime(.32, t + sec, .6); }
  // ---------- música ----------
  // cada facción: escala, timbre y ritmo propios; la batalla va más rápida y con percusión
  const THEMES = {
    title: { bpm: 70, root: 45, prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], lead: 'triangle', pad: 'sawtooth', arp: 0, drums: 0 },
    res:   { bpm: 92, root: 45, prog: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-2, 2, 5]], lead: 'triangle', pad: 'sawtooth', arp: 1, drums: 1 },
    volt:  { bpm: 104, root: 40, prog: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 1, 5]], lead: 'square', pad: 'square', arp: 2, drums: 2 },
    nuw:   { bpm: 84, root: 47, prog: [[0, 4, 8], [2, 6, 10], [-2, 2, 6], [0, 4, 10]], lead: 'sine', pad: 'sine', arp: 3, drums: 1 },
  };
  const mid = n => 440 * Math.pow(2, (n - 69) / 12);
  let cur = null, nextT = 0, step = 0, timer = null, battle = false;
  function setMusic(key, isBattle) {
    if (!ac) return; const k = key + (isBattle ? '!' : ''); if (cur === k) return; cur = k; battle = !!isBattle; step = 0; nextT = ac.currentTime + .1;
    if (!timer) timer = setInterval(sched, 60);
  }
  function sched() {
    if (!ac || !cur || !st.mus) return; const th = THEMES[cur.replace('!', '')] || THEMES.title;
    const bpm = th.bpm * (battle ? 1.25 : 1), s16 = 60 / bpm / 4;
    while (nextT < ac.currentTime + .25) {
      const bar = Math.floor(step / 16) % th.prog.length, i = step % 16, ch = th.prog[bar], t = nextT, R = th.root;
      if (i === 0) ch.forEach((n, j) => tone(mid(R + 12 + n), t, s16 * 16, { type: th.pad, vol: .045, a: .4, q: 900, det: j * 6 - 6, bus: musBus }));
      if (i % 8 === 0 || (battle && i % 4 === 2)) tone(mid(R - 12 + ch[0]), t, s16 * 3.5, { type: 'triangle', vol: .22, q: 600, bus: musBus });
      if (th.arp && (i % 2 === 0)) {
        const seq = th.arp === 3 ? [0, 2, 1, 2] : th.arp === 2 ? [0, 0, 2, 1] : [0, 1, 2, 1];
        const n = ch[seq[(i / 2) % 4]] + 24 + (th.arp === 3 && i % 8 === 6 ? 12 : 0);
        if (!(th.arp === 3 && Math.random() < .3)) tone(mid(R + n), t, s16 * 1.6, { type: th.lead, vol: battle ? .05 : .035, q: th.arp === 2 ? 2200 : 4000, bus: musBus });
      }
      if (th.drums && (battle || th.drums === 2)) {
        if (i % 4 === 0) tone(110, t, .18, { type: 'sine', vol: .35, f2: 40, bus: musBus });
        if (i % 8 === 4) noise(t, .14, { vol: .16, type: 'bandpass', f: 1800, bus: musBus });
        if (i % 2 === 1) noise(t, .03, { vol: .05, type: 'highpass', f: 7000, bus: musBus });
      } else if (th.drums && i === 8) noise(t, .6, { vol: .03, type: 'bandpass', f: 500, f2: 2500, bus: musBus });
      nextT += s16; step++;
    }
  }
  function toggle(which) {
    init(); st[which] = !st[which]; save();
    if (which === 'mus') musBus.gain.setTargetAtTime(st.mus ? .32 : 0, ac.currentTime, .1);
    else sfxBus.gain.setTargetAtTime(st.sfx ? .55 : 0, ac.currentTime, .05);
    renderBtn(); if (st[which]) play('click');
  }
  function renderBtn() {
    let b = document.getElementById('sndBtn');
    if (!b) { b = document.createElement('div'); b.id = 'sndBtn'; document.body.appendChild(b); }
    b.innerHTML = `<button onclick="SND.toggle('mus')" title="Música">${st.mus ? '🎵' : '🔇'}</button><button onclick="SND.toggle('sfx')" title="Efectos">${st.sfx ? '🔊' : '🔈'}</button>`;
  }
  return { init, play, setMusic, toggle, renderBtn, st };
})();

// ---------- enganches con el juego ----------
(() => {
  const wrap = (name, fn) => { const o = window[name]; if (typeof o !== 'function') return; window[name] = function (...a) { return fn(o, this, a); }; };
  wrap('collect', (o, th, a) => { const r = o.apply(th, a); SND.play('coin'); return r; });
  wrap('startUpgrade', (o, th, a) => { const r = o.apply(th, a); SND.play('build'); return r; });
  wrap('buildNew', (o, th, a) => { const r = o.apply(th, a); SND.play('place'); return r; });
  wrap('finishBusy', (o, th, a) => { const big = a[0] && a[0].t === 'core'; const r = o.apply(th, a); if (MODE === 'base' && (big || !window._fbT || performance.now() - window._fbT > 400)) { window._fbT = performance.now(); SND.play('done', big); } return r; });
  wrap('finishResearch', (o, th, a) => { const r = o.apply(th, a); SND.play('up'); return r; });
  wrap('castAbility', (o, th, a) => { const r = o.apply(th, a); SND.play('power'); return r; });
  wrap('heroAbility', (o, th, a) => { const r = o.apply(th, a); SND.play('power'); return r; });
  wrap('spawnUnit', (o, th, a) => { const r = o.apply(th, a); if (a[0] === 'att' && MODE === 'battle' && SND.st.sfx) { const k = 'dp'; if (!window._dpT || performance.now() - window._dpT > 70) { window._dpT = performance.now(); SND.play('deploy', a[1]); } } return r; });
  wrap('hitEnt', (o, th, a) => { const e = a[0], was = e.hp > 0; const r = o.apply(th, a); if (was && e.hp <= 0 && (e.kind !== 'unit' || Math.random() < .5)) SND.play('boom', e.kind === 'core'); return r; });
  wrap('endBattle', (o, th, a) => { const done = BAT && BAT.over; const r = o.apply(th, a); if (!done && BAT) SND.play((stars() > 0) === (BAT.mode !== 'defend') ? 'win' : 'lose'); return r; });
  wrap('rtsEnd', (o, th, a) => { const r = o.apply(th, a); if (RTS && !RTS.auto) SND.play(a[0] ? 'win' : 'lose'); return r; });
  wrap('startDefense', (o, th, a) => { const r = o.apply(th, a); SND.play('alert'); return r; });
  document.addEventListener('click', e => { if (e.target.closest('.btn, button, .slot, .tab, .card')) SND.play('click'); }, true);

  // disparos: se detectan los proyectiles nuevos de cada fotograma (como máximo ~14 sonidos por segundo)
  let nB = 0, nR = 0, lastShot = 0;
  function poll() {
    const now = performance.now();
    if (MODE === 'battle' && BAT) { const L = BAT.proj.length; if (L > nB && now - lastShot > 70) { lastShot = now; const p = BAT.proj[L - 1]; SND.play('shot', p.who === 'def' ? BAT.attFac : BAT.defFac); } nB = L; }
    if (MODE === 'rts' && RTS && !RTS.auto) { const L = RTS.proj.length; if (L > nR && now - lastShot > 90) { lastShot = now; const p = RTS.proj[L - 1]; SND.play('shot', p.from && p.from.fac || (p.from && RTS.sides && RTS.sides[p.from.side] && RTS.sides[p.from.side].fac) || 'res'); } nR = L; }
    // música según la pantalla
    if (MODE === 'title') SND.setMusic('title');
    else if (MODE === 'base' && G) SND.setMusic(G.fac);
    else if (MODE === 'battle' && BAT) SND.setMusic((BAT.mode === 'defend' ? BAT.defFac : BAT.attFac) || 'res', true);
    else if (MODE === 'rts' && RTS) SND.setMusic((RTS.sides && RTS.sides[0] && RTS.sides[0].fac) || 'res', true);
    requestAnimationFrame(poll);
  }
  requestAnimationFrame(poll);
  SND.renderBtn();
})();
(function fav() { let u = ''; try { const s = S('comun/logo/icono_app'); if (s && s.img && s.img.complete && s.img.naturalWidth) u = spriteURL('comun/logo/icono_app', 64); } catch (e) {} if (u) { let l = document.querySelector('link[rel=icon]'); if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); } l.href = u; } else setTimeout(fav, 400); })();
