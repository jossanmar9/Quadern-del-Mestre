/*
 * Quadern del Mestre — música i sons d'ambient (pestanya del màster).
 * Els ambients es generen al navegador amb Web Audio (no cal cap fitxer). El màster també pot pujar
 * pistes pròpies (MP3, OGG…). Tot sona només a l'aparell del màster: connecta'l a uns altaveus.
 * Llicència GPL-3.0 o posterior.
 */
const AMBIENTS = [['pluja', L('Pluja')], ['tempesta', L('Tempesta')], ['vent', L('Vent')], ['foc', L('Foguera')], ['cova', L('Cova')], ['nit', L('Nit al bosc')]];
const snd = {ctx: null, master: null, amb: {}, vol: {}, tracks: {}, blobs: {}};
for (const [k] of AMBIENTS) snd.vol[k] = .6;

function audioCtx() {
  if (!snd.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    snd.ctx = new AC(); snd.master = snd.ctx.createGain(); snd.master.gain.value = .9; snd.master.connect(snd.ctx.destination);
  }
  if (snd.ctx.state === 'suspended') snd.ctx.resume();
  return snd.ctx;
}
/** Un buffer de soroll de 3 s: blanc, rosa (més suau) o marró (greu) */
const noiseCache = {};
function noise(ctx, color) {
  if (noiseCache[color]) return noiseCache[color];
  const n = ctx.sampleRate * 3, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (color === 'pink') {b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * .2}
    else if (color === 'brown') {last = (last + .02 * w) / 1.02; d[i] = last * 3.5}
    else d[i] = w;
  }
  return (noiseCache[color] = b);
}
function noiseSrc(ctx, color) {const s = ctx.createBufferSource(); s.buffer = noise(ctx, color); s.loop = true; s.loopStart = Math.random() * 2; s.start(0, Math.random() * 2); return s}
const filt = (ctx, type, f, q = .7) => {const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x};
const gainN = (ctx, v) => {const g = ctx.createGain(); g.gain.value = v; return g};
function chain(...nodes) {for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes.at(-1)}
/** Programa sons curts a l'atzar (gotes, espurnes, trons…) fins que es para l'ambient */
function every(minMs, maxMs, fn) {let tm, on = true; const go = () => {if (!on) return; fn(); tm = setTimeout(go, minMs + Math.random() * (maxMs - minMs))}; tm = setTimeout(go, Math.random() * maxMs); return () => {on = false; clearTimeout(tm)}}
function burst(ctx, out, {color = 'white', type = 'bandpass', f = 3000, q = 1, peak = .2, attack = .002, decay = .05}) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx, color); const g = gainN(ctx, 0), now = ctx.currentTime;
  g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(peak, now + attack); g.gain.exponentialRampToValueAtTime(.0001, now + attack + decay);
  chain(s, filt(ctx, type, f, q), g, out); s.start(now, Math.random() * 2, attack + decay + .05);
}
function lfo(ctx, param, rate, depth) {const o = ctx.createOscillator(); o.frequency.value = rate; const g = gainN(ctx, depth); o.connect(g); g.connect(param); o.start(); return o}

const AMB_MAKE = {
  pluja(ctx, out) {
    const a = chain(noiseSrc(ctx, 'pink'), filt(ctx, 'lowpass', 5200), filt(ctx, 'highpass', 300), gainN(ctx, .55)); a.connect(out);
    const b = chain(noiseSrc(ctx, 'white'), filt(ctx, 'highpass', 6000), gainN(ctx, .05)); b.connect(out);
    const stop = every(25, 110, () => burst(ctx, out, {f: 1800 + Math.random() * 4000, q: 2, peak: .04 + Math.random() * .08, decay: .03}));
    return () => {stop(); a.disconnect(); b.disconnect()};
  },
  tempesta(ctx, out) {
    const rain = AMB_MAKE.pluja(ctx, out);
    const w = chain(noiseSrc(ctx, 'brown'), filt(ctx, 'lowpass', 400), gainN(ctx, .35)); w.connect(out);
    const stop = every(9000, 26000, () => {
      const s = ctx.createBufferSource(); s.buffer = noise(ctx, 'brown'); const g = gainN(ctx, 0), now = ctx.currentTime, len = 3 + Math.random() * 3;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(1.2, now + .08); g.gain.linearRampToValueAtTime(.7, now + .5); g.gain.exponentialRampToValueAtTime(.001, now + len);
      chain(s, filt(ctx, 'lowpass', 110 + Math.random() * 150, 1.2), g, out); s.start(now, 0, len + .1);
    });
    return () => {rain(); stop(); w.disconnect()};
  },
  vent(ctx, out) {
    const bp = filt(ctx, 'bandpass', 500, 1.4), g = gainN(ctx, .45);
    chain(noiseSrc(ctx, 'pink'), bp, g); g.connect(out);
    const l1 = lfo(ctx, bp.frequency, .07, 260), l2 = lfo(ctx, g.gain, .11, .22);
    const hi = filt(ctx, 'bandpass', 1300, 6), g2 = gainN(ctx, .06); chain(noiseSrc(ctx, 'white'), hi, g2); g2.connect(out); const l3 = lfo(ctx, hi.frequency, .05, 500);
    return () => {g.disconnect(); g2.disconnect(); l1.stop(); l2.stop(); l3.stop()};
  },
  foc(ctx, out) {
    const r = chain(noiseSrc(ctx, 'brown'), filt(ctx, 'lowpass', 600), gainN(ctx, .7)); r.connect(out);
    const hiss = chain(noiseSrc(ctx, 'pink'), filt(ctx, 'bandpass', 2500, .8), gainN(ctx, .05)); hiss.connect(out);
    const stop = every(30, 240, () => burst(ctx, out, {type: 'highpass', f: 1500 + Math.random() * 3000, peak: .1 + Math.random() * .45, decay: .008 + Math.random() * .03}));
    return () => {stop(); r.disconnect(); hiss.disconnect()};
  },
  cova(ctx, out) {
    const echo = ctx.createDelay(1), fb = gainN(ctx, .42), wet = gainN(ctx, .5); echo.delayTime.value = .33; echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(out);
    const drone = gainN(ctx, .05); drone.connect(out); const oscs = [55, 82.4, 110.3].map(f => {const o = ctx.createOscillator(); o.frequency.value = f; o.detune.value = Math.random() * 8 - 4; chain(o, filt(ctx, 'lowpass', 300), drone); o.start(); return o});
    const air = chain(noiseSrc(ctx, 'brown'), filt(ctx, 'lowpass', 250), gainN(ctx, .25)); air.connect(out);
    const stop = every(900, 4200, () => {
      const o = ctx.createOscillator(), g = gainN(ctx, 0), now = ctx.currentTime, f = 900 + Math.random() * 1400;
      o.frequency.setValueAtTime(f, now); o.frequency.exponentialRampToValueAtTime(f * .45, now + .12);
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(.16, now + .004); g.gain.exponentialRampToValueAtTime(.0001, now + .35);
      o.connect(g); g.connect(out); g.connect(echo); o.start(now); o.stop(now + .4);
    });
    return () => {stop(); oscs.forEach(o => o.stop()); drone.disconnect(); air.disconnect(); wet.disconnect()};
  },
  nit(ctx, out) {
    const bed = chain(noiseSrc(ctx, 'pink'), filt(ctx, 'lowpass', 900), gainN(ctx, .12)); bed.connect(out);
    const cricket = () => {
      const now = ctx.currentTime, f = 4200 + Math.random() * 600, pulses = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < pulses; i++) {const o = ctx.createOscillator(), g = gainN(ctx, 0), t0 = now + i * .055; o.frequency.value = f;
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.035, t0 + .01); g.gain.linearRampToValueAtTime(0, t0 + .04); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + .05)}
    };
    const s1 = every(350, 900, cricket), s2 = every(500, 1300, cricket);
    const owl = every(14000, 32000, () => {
      const now = ctx.currentTime; [[0, .45], [.55, .3], [.95, .8]].forEach(([d, len]) => {const o = ctx.createOscillator(), g = gainN(ctx, 0); o.type = 'sine'; o.frequency.setValueAtTime(380, now + d); o.frequency.linearRampToValueAtTime(340, now + d + len);
        g.gain.setValueAtTime(0, now + d); g.gain.linearRampToValueAtTime(.09, now + d + .06); g.gain.linearRampToValueAtTime(0, now + d + len); o.connect(g); g.connect(out); o.start(now + d); o.stop(now + d + len + .05)});
    });
    return () => {s1(); s2(); owl(); bed.disconnect()};
  },
};
function ambStart(k) {
  const ctx = audioCtx(); if (!ctx) {toast(t('Aquest navegador no pot generar sons.')); return}
  if (snd.amb[k]) return;
  const out = gainN(ctx, 0); out.connect(snd.master); out.gain.linearRampToValueAtTime(snd.vol[k], ctx.currentTime + 2);
  snd.amb[k] = {out, stop: AMB_MAKE[k](ctx, out)};
}
function ambStop(k) {
  const a = snd.amb[k]; if (!a) return; delete snd.amb[k];
  const now = snd.ctx.currentTime; a.out.gain.cancelScheduledValues(now); a.out.gain.setValueAtTime(a.out.gain.value, now); a.out.gain.linearRampToValueAtTime(0, now + 1.5);
  setTimeout(() => {a.stop(); a.out.disconnect()}, 1700);
}

/* ---- pistes pròpies ---- */
const AUDIO_EXT = {mp3: 'audio/mpeg', ogg: 'audio/ogg', oga: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', webm: 'audio/webm'};
const dmTracks = () => col('dmaudio').sort((a, b) => (a.created || 0) - (b.created || 0));
async function uploadAudio(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase(), type = file.type || AUDIO_EXT[ext] || '';
  if (!/^audio\//.test(type)) {toast(t('Només es poden pujar sons MP3, OGG, WAV, M4A, WebM o FLAC.')); return null}
  if (file.size > 60 * 1024 * 1024) {toast(t('El so és massa gran (màxim 60 MB).')); return null}
  toast(t('Pujant el so…'), 60000);
  try {
    const r = await fetch('api/upload?kind=audio', {method: 'POST', headers: {'Content-Type': type, 'X-Quadern-Token': S.token}, body: file});
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {toast(t(d.error || "No s'ha pogut pujar el so.")); return null}
    $('#toast').hidden = true; return d.file;
  } catch (_) {toast(t('No es pot contactar amb el servidor.')); return null}
}
async function trackPlay(tr) {
  audioCtx();
  let a = snd.tracks[tr.id];
  if (!a) {
    let url = snd.blobs[tr.file];
    if (!url) {try {const r = await fetch(fileUrl(tr.file)); if (!r.ok) throw 0; url = snd.blobs[tr.file] = URL.createObjectURL(await r.blob())} catch (_) {toast(t("No s'ha pogut carregar el so.")); return}}
    a = snd.tracks[tr.id] = new Audio(url); a.onended = () => {if (!a.loop) refreshAudioPanel()};
  }
  a.loop = tr.loop !== false; a.volume = tr.vol ?? .8;
  try {await a.play()} catch (_) {toast(t("No s'ha pogut reproduir el so."))}
  refreshAudioPanel();
}
function trackStop(id) {const a = snd.tracks[id]; if (a) {a.pause(); a.currentTime = 0} refreshAudioPanel()}
function stopAllSound() {for (const k in snd.amb) ambStop(k); for (const id in snd.tracks) snd.tracks[id].pause(); refreshAudioPanel()}
const trackOn = id => snd.tracks[id] && !snd.tracks[id].paused;

function audioPanel() {
  const tracks = dmTracks(), any = Object.keys(snd.amb).length || tracks.some(x => trackOn(x.id));
  return `<section class="panel ms-audio" id="ms-audio"><div class="row" style="justify-content:space-between"><h2>${esc(t('Música i ambient'))}</h2>${any ? `<button class="btn sm danger" id="snd-stop">${esc(t('Aturar-ho tot'))}</button>` : ''}</div>
    <p class="small muted">${esc(t('Sona en aquest aparell, el del màster: connecta\'l a uns altaveus. Els jugadors no ho senten als mòbils.'))}</p>
    <div class="snd-grid"><div><h3>${esc(t('Ambients'))}</h3><ul class="snd-list">${AMBIENTS.map(([k, nm]) => `<li><button class="btn sm${snd.amb[k] ? ' pri' : ''}" data-amb="${k}" aria-pressed="${!!snd.amb[k]}">${snd.amb[k] ? '■' : '▶'} ${esc(t(nm))}</button>
        <input type="range" min="0" max="1" step="0.05" value="${snd.vol[k]}" data-ambvol="${k}" aria-label="${esc(t('Volum: {x}', {x: t(nm)}))}"></li>`).join('')}</ul>
      <p class="small muted">${esc(t('Es poden barrejar: per exemple, pluja i foguera.'))}</p></div>
    <div><h3>${esc(t('Les teues pistes'))}</h3><ul class="snd-list">${tracks.map(x => `<li data-trk="${x.id}"><button class="btn sm${trackOn(x.id) ? ' pri' : ''}" data-trkplay aria-pressed="${trackOn(x.id)}">${trackOn(x.id) ? '■' : '▶'}</button><span class="trk-name" title="${esc(x.name)}">${esc(x.name || t('Sense nom'))}</span>
        <label class="check small" title="${esc(t('Repetir'))}"><input type="checkbox" data-trkloop ${x.loop !== false ? 'checked' : ''}> ↻</label><input type="range" min="0" max="1" step="0.05" value="${x.vol ?? .8}" data-trkvol aria-label="${esc(t('Volum'))}"><button class="btn sm danger" data-trkdel aria-label="${esc(t('Esborrar'))}">×</button></li>`).join('') || `<li class="muted small">${esc(t('Puja música de taverna, de combat o el que vulgues. Es guarda amb la partida.'))}</li>`}</ul>
      <button class="btn sm" id="trk-add">+ ${esc(t('Pujar un so'))}</button></div></div></section>`;
}
function refreshAudioPanel() {const p = $('#ms-audio'); if (p && st.tab === 'master') p.outerHTML = audioPanel()}
document.addEventListener('click', async e => {
  if (st.tab !== 'master') return; const x = e.target;
  const am = x.closest('[data-amb]'); if (am) {const k = am.dataset.amb; snd.amb[k] ? ambStop(k) : ambStart(k); refreshAudioPanel(); return}
  if (x.id === 'snd-stop') {stopAllSound(); return}
  if (x.id === 'trk-add') {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*,.mp3,.ogg,.wav,.m4a,.flac,.webm';
    inp.onchange = async () => {const f = inp.files[0]; if (!f) return; const file = await uploadAudio(f); if (!file) return;
      write('dmaudio/' + newId(), {name: f.name.replace(/\.[^.]+$/, '').slice(0, 80), file, loop: true, vol: .8, created: Date.now()}); toast(t('So afegit.'))};
    inp.click(); return;
  }
  const li = x.closest('[data-trk]'); if (!li) return; const id = li.dataset.trk, tr = getDoc('dmaudio/' + id); if (!tr) return;
  if (x.closest('[data-trkplay]')) {trackOn(id) ? trackStop(id) : trackPlay({...tr, id}); return}
  if (x.closest('[data-trkdel]')) {armed(x.closest('[data-trkdel]'), () => {trackStop(id); delete snd.tracks[id]; del('dmaudio/' + id)}, t('Segur? Prem de nou')); return}
});
document.addEventListener('input', e => {
  if (st.tab !== 'master') return; const x = e.target;
  if (x.dataset.ambvol) {const k = x.dataset.ambvol; snd.vol[k] = +x.value; const a = snd.amb[k]; if (a) {const now = snd.ctx.currentTime; a.out.gain.cancelScheduledValues(now); a.out.gain.setTargetAtTime(+x.value, now, .1)} return}
  if (x.dataset.trkvol !== undefined) {const id = x.closest('[data-trk]').dataset.trk; if (snd.tracks[id]) snd.tracks[id].volume = +x.value; trkVolSave(id, +x.value)}
});
const trkVolSave = debounce((id, v) => write('dmaudio/' + id, {vol: v}, 'update'), 500);
document.addEventListener('change', e => {
  if (st.tab !== 'master' || e.target.dataset.trkloop === undefined) return;
  const id = e.target.closest('[data-trk]').dataset.trk; if (snd.tracks[id]) snd.tracks[id].loop = e.target.checked; write('dmaudio/' + id, {loop: e.target.checked}, 'update');
});
