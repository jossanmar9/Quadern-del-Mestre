/*
 * Quadern del Mestre — editor de mapes: imatge de fons, quadrícula, terreny, parets i portes,
 * etiquetes, boira de guerra (manual o automàtica), fitxes, regle, àrees d'efecte, llapis i avisos (ping).
 * Llicència GPL-3.0 o posterior.
 */
const CS = 48;   // píxels per casella amb zoom 1
const mp = {sel: lsGet('qm-map') || null, tool: 'move', terrain: 'floor', brush: 1, paintMode: 'brush', wall: 'wall', fogMode: 'reveal',
  labelKind: 'pin', aoeShape: 'circle', aoeSize: 6, views: {}, tokSel: null, drag: null, hover: null, ruler: null, pings: [], strokes: [], undo: [],
  imgs: {}, colors: null, cv: null, ctx: null, ro: null, dirty: false, local: null, pointers: new Map(), panel: lsGet('qm-map-panel') || 'eines'};
const mapId = () => dm() ? (mp.sel && getDoc('maps/' + mp.sel) ? mp.sel : (camp().activeMap && getDoc('maps/' + camp().activeMap) ? camp().activeMap : col('maps')[0]?.id)) : camp().activeMap;
const mapDoc = () => {const id = mapId(); return id ? (mp.local && mp.local.id === id ? mp.local.doc : getDoc('maps/' + id)) : null};
const tokens = () => {const id = mapId(); return id ? col('maps/' + id + '/tokens') : []};
const aoes = () => {const id = mapId(); return id ? col('maps/' + id + '/aoe') : []};
const view = () => {const id = mapId() || '_'; return mp.views[id] || (mp.views[id] = {x: 20, y: 20, z: 1, fit: true})};
function blankMap(name) {return {name: name || t('Mapa nou'), cols: 30, rows: 20, units: 1.5, bg: null, grid: {show: true, op: .35}, tiles: {}, walls: {}, labels: [], fog: {on: false, rev: {}}, created: Date.now()}}

TABS.mapa = {label: L('Mapa'), render: renderMap, refresh: mapRefresh, onLeave: () => {mp.ro && mp.ro.disconnect()}, themeChanged: () => {mp.colors = null; drawSoon()}};
function mapRefresh(path) {
  if (path.startsWith('maps/') || path === 'campaign/main' || path.startsWith('characters/') || path.startsWith('combat/')) {
    const id = mapId();
    if (!$('#map-cv') || $('#map-cv').dataset.map !== String(id) || (path === 'campaign/main' && dm())) {if (!editing() && !$('.modal') && !mp.drag) renderMap(); else pendingRender = true; return}
    if (path === 'maps/' + id && mp.local && !mp.drag) mp.local = null;
    drawSoon(); if (!editing()) renderMapSide();
  }
}

/* ---------- maquetació ---------- */
function renderMap() {
  const id = mapId(), m = mapDoc(), maps = col('maps').sort((a, b) => (a.created || 0) - (b.created || 0));
  if (!m) {
    $('#main').innerHTML = dm() ? `<div class="empty"><b>${esc(t('Encara no hi ha cap mapa'))}</b>${esc(t('Crea un mapa buit per a pintar-lo, o puja una imatge (de Dungeondraft, Inkarnate, un escaneig…) i ajusta-hi la quadrícula.'))}
      <div class="row"><button class="btn pri" id="map-new">${esc(t('Crear un mapa'))}</button><button class="btn" id="map-new-img">${esc(t('Mapa a partir d\'una imatge'))}</button></div></div>`
      : `<div class="empty"><b>${esc(t('Encara no hi ha mapa'))}</b>${esc(t('El màster encara no ha ensenyat cap mapa. Mentrestant, pots preparar la teua fitxa.'))}</div>`;
    return;
  }
  const tools = [['move', L('Moure'), '✋'], ['ruler', L('Regle'), '📏'], ['aoe', L('Àrea'), '◎'], ['draw', L('Llapis'), '✎'], ['ping', L('Avisar'), '❗']];
  const dmTools = [['paint', L('Terreny'), '▦'], ['wall', L('Parets'), '▯'], ['label', L('Etiquetes'), '①'], ['fog', L('Boira'), '☁']];
  if (!dm() && !tools.some(x => x[0] === mp.tool)) mp.tool = 'move';
  $('#main').innerHTML = `<div class="map-layout">
    <div class="map-top">
      ${dm() ? `<select class="in" id="map-pick" aria-label="${esc(t('Mapa'))}">${maps.map(x => `<option value="${x.id}" ${x.id === id ? 'selected' : ''}>${esc(x.name || t('Sense nom'))}${x.id === camp().activeMap ? ' ★' : ''}</option>`).join('')}</select>
        <button class="btn sm ${id === camp().activeMap ? '' : 'pri'}" id="map-show" ${id === camp().activeMap ? 'disabled' : ''}>${esc(id === camp().activeMap ? t('Els jugadors veuen aquest mapa') : t('Ensenyar als jugadors'))}</button>` : `<b class="map-title">${esc(m.name || '')}</b>`}
      <div class="toolbar" role="toolbar">${[...tools, ...(dm() ? dmTools : [])].map(([k, lb, ic]) => `<button class="tool" data-tool="${k}" aria-pressed="${mp.tool === k}" title="${esc(t(lb))}"><span aria-hidden="true">${ic}</span>${esc(t(lb))}</button>`).join('')}</div>
      <div class="row zoom"><button class="btn sm" data-zoom="-1" aria-label="${esc(t('Allunyar'))}">−</button><button class="btn sm" data-zoom="0">${esc(t('Ajustar'))}</button><button class="btn sm" data-zoom="1" aria-label="${esc(t('Acostar'))}">+</button>${dm() ? `<button class="btn sm" id="map-undo" title="Ctrl+Z" ${mp.undo.length ? '' : 'disabled'}>${esc(t('Desfer'))}</button>` : ''}</div>
    </div>
    <div class="map-body"><div class="map-stage" id="map-stage"><canvas id="map-cv" data-map="${id}"></canvas><div class="map-hint" id="map-hint"></div></div>
      <aside class="map-side" id="map-side"></aside></div>
  </div>`;
  setupCanvas(); renderMapSide(); updateHint();
}
function toolOptions() {
  const T = mp.tool;
  if (T === 'paint') return `<h3>${esc(t('Terreny'))}</h3><div class="brushes">${TERRAINS.map(([id, nm, v]) => `<button class="brush" data-terr="${id}" aria-pressed="${mp.terrain === id}"><i style="background:var(${v})"></i>${esc(t(nm))}</button>`).join('')}<button class="brush" data-terr="" aria-pressed="${mp.terrain === ''}"><i class="erase"></i>${esc(t('Esborrar'))}</button></div>
    <div class="row"><div class="seg2">${[['brush', L('Pinzell')], ['rect', L('Rectangle')], ['fill', L('Omplir')]].map(([k, lb]) => `<button data-pmode="${k}" aria-pressed="${mp.paintMode === k}">${esc(t(lb))}</button>`).join('')}</div>
    ${mp.paintMode === 'brush' ? `<label class="check">${esc(t('Mida'))} <select class="in" id="brush-size" style="width:auto">${[1, 2, 3, 5].map(n => `<option ${mp.brush === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}</div>`;
  if (T === 'wall') return `<h3>${esc(t('Parets i portes'))}</h3><div class="brushes">${WALL_TYPES.map(([id, nm]) => `<button class="brush" data-wall="${id}" aria-pressed="${mp.wall === id}"><i class="w-${id}"></i>${esc(t(nm))}</button>`).join('')}<button class="brush" data-wall="" aria-pressed="${mp.wall === ''}"><i class="erase"></i>${esc(t('Esborrar'))}</button></div>
    <p class="small muted">${esc(t('Fes clic a la vora d\'una casella, o arrossega al llarg de les vores. Les portes secretes, els jugadors les veuen com a paret.'))}</p><button class="btn sm" id="walls-auto">${esc(t('Parets automàtiques al voltant del terreny'))}</button>`;
  if (T === 'label') return `<h3>${esc(t('Etiquetes'))}</h3><div class="seg2">${[['pin', L('Número de sala')], ['text', L('Text')]].map(([k, lb]) => `<button data-lkind="${k}" aria-pressed="${mp.labelKind === k}">${esc(t(lb))}</button>`).join('')}</div><p class="small muted">${esc(t('Fes clic al mapa per a posar-ne una. Fes clic damunt d\'una per a canviar-la o llevar-la.'))}</p>`;
  if (T === 'fog') {const f = mapDoc()?.fog || {}; return `<h3>${esc(t('Boira de guerra'))}</h3><label class="check"><input type="checkbox" id="fog-on" ${f.on ? 'checked' : ''}> ${esc(t('Activada'))}</label>
    <div class="seg2">${[['reveal', L('Revelar')], ['hide', L('Amagar')]].map(([k, lb]) => `<button data-fmode="${k}" aria-pressed="${mp.fogMode === k}">${esc(t(lb))}</button>`).join('')}</div>
    <p class="small muted">${esc(t('Arrossega per a fer un rectangle. Tu veus la boira transparent; els jugadors no veuen res del que hi ha davall.'))}</p><div class="row"><button class="btn sm" id="fog-all">${esc(t('Revelar-ho tot'))}</button><button class="btn sm" id="fog-none">${esc(t('Amagar-ho tot'))}</button></div>
    <h3>${esc(t('Boira automàtica'))}</h3><label class="check"><input type="checkbox" id="fog-auto" ${f.auto ? 'checked' : ''}> ${esc(t('Revelar el que veuen els personatges'))}</label>
    ${f.auto ? `<label class="field"><span>${esc(t('Distància de visió (m)'))}</span><input class="in" type="number" id="fog-dist" min="1.5" max="45" step="1.5" value="${esc(f.dist || 18)}"></label>` : ''}
    <p class="small muted">${esc(t('Quan un personatge jugador es mou, es revela el que veu des de la seua fitxa. Les parets, les portes tancades, la roca i els arbres tapen la vista. El que ja s\'ha vist queda revelat.'))}</p>`}
  if (T === 'aoe') return `<h3>${esc(t('Àrea d\'efecte'))}</h3><div class="seg2 wrap">${[['circle', L('Esfera')], ['cone', L('Con')], ['line', L('Línia')], ['cube', L('Cub')]].map(([k, lb]) => `<button data-shape="${k}" aria-pressed="${mp.aoeShape === k}">${esc(t(lb))}</button>`).join('')}</div>
    <label class="field"><span>${esc(t('Mida (m)'))}</span><input class="in" type="number" id="aoe-size" min="1.5" step="1.5" value="${mp.aoeSize}"></label><p class="small muted">${esc(t('Arrossega des del punt d\'origen. Fes clic damunt d\'una àrea per a llevar-la.'))}</p>
    ${aoes().length ? `<button class="btn sm" id="aoe-clear">${esc(t(dm() ? 'Llevar totes les àrees' : 'Llevar les meues àrees'))}</button>` : ''}`;
  if (T === 'ruler') return `<h3>${esc(t('Regle'))}</h3><p class="small muted">${esc(t('Arrossega per a mesurar. Cada casella són {n} m, també en diagonal.', {n: String(mapDoc()?.units || 1.5).replace('.', ',')}))}</p>`;
  if (T === 'draw') return `<h3>${esc(t('Llapis'))}</h3><p class="small muted">${esc(t('Dibuixa damunt del mapa per a assenyalar un camí o explicar un pla. Tothom ho veu, i s\'esborra sol al cap d\'uns segons.'))}</p>`;
  if (T === 'ping') return `<h3>${esc(t('Avisar'))}</h3><p class="small muted">${esc(t('Fes clic en un punt del mapa i tothom el veurà ressaltat uns segons.'))}</p>`;
  return `<h3>${esc(t('Moure'))}</h3><p class="small muted">${esc(dm() ? t('Arrossega les fitxes per a moure-les i el fons per a desplaçar el mapa. Roda o pessic per a fer zoom. Doble clic: avisar.') : t('Pots moure les fitxes dels teus personatges. Arrossega el fons per a desplaçar el mapa. Doble clic: avisar.'))}</p>`;
}
function renderMapSide() {
  const side = $('#map-side'); if (!side) return;
  const id = mapId(), m = mapDoc(); if (!m) return;
  const toks = tokens().filter(x => dm() || !x.hidden), sel = toks.find(x => x.id === mp.tokSel);
  const panels = dm() ? [['eines', L('Eines')], ['fitxes', L('Fitxes')], ['mapa', L('Mapa')]] : [['eines', L('Eines')], ['fitxes', L('Fitxes')]];
  if (!panels.some(p => p[0] === mp.panel)) mp.panel = 'eines';
  let body = '';
  if (mp.panel === 'eines') body = toolOptions();
  if (mp.panel === 'fitxes') body = `${sel ? tokenPanel(sel) : ''}<h3>${esc(t('Fitxes al mapa'))}</h3><div class="tok-list">${toks.map(x => `<button class="tok-item" data-tok="${x.id}" aria-pressed="${x.id === mp.tokSel}"><span class="dot" style="background:${esc(x.color || '#888')}"></span>${esc(x.name || '?')}${x.hidden ? ` <span class="sec-tag">${esc(t('amagada'))}</span>` : ''}</button>`).join('') || `<p class="small muted">${esc(t('Encara no hi ha fitxes.'))}</p>`}</div>
    ${dm() ? `<div class="row"><button class="btn sm" id="tok-add">+ ${esc(t('Fitxa'))}</button><button class="btn sm" id="tok-monster">+ ${esc(t('Monstre'))}</button><button class="btn sm" id="tok-party">+ ${esc(t('Tot el grup'))}</button></div>` : ''}`;
  if (mp.panel === 'mapa') body = `<h3>${esc(t('Aquest mapa'))}</h3>
    <label class="field"><span>${esc(t('Nom'))}</span><input class="in" data-mf="name" value="${esc(m.name || '')}"></label>
    <div class="grid2"><label class="field"><span>${esc(t('Columnes'))}</span><input class="in" type="number" min="4" max="150" data-mf="cols" value="${m.cols}"></label><label class="field"><span>${esc(t('Files'))}</span><input class="in" type="number" min="4" max="150" data-mf="rows" value="${m.rows}"></label></div>
    <label class="field"><span>${esc(t('Metres per casella'))}</span><input class="in" type="number" min="0.5" step="0.5" data-mf="units" value="${m.units || 1.5}"></label>
    <label class="check"><input type="checkbox" data-mfb="grid.show" ${m.grid?.show !== false ? 'checked' : ''}> ${esc(t('Mostrar la quadrícula'))}</label>
    <label class="field"><span>${esc(t('Opacitat de la quadrícula'))}</span><input type="range" min="0.05" max="1" step="0.05" data-mf="grid.op" value="${m.grid?.op ?? .35}"></label>
    <h3>${esc(t('Imatge de fons'))}</h3>
    ${m.bg?.file ? `<div class="grid2"><label class="field"><span>${esc(t('Posició X (caselles)'))}</span><input class="in" type="number" step="0.05" data-mf="bg.x" value="${m.bg.x || 0}"></label><label class="field"><span>${esc(t('Posició Y (caselles)'))}</span><input class="in" type="number" step="0.05" data-mf="bg.y" value="${m.bg.y || 0}"></label></div>
      <label class="field"><span>${esc(t('Amplària (caselles)'))}</span><input class="in" type="number" step="0.05" min="1" data-mf="bg.w" value="${m.bg.w || m.cols}"></label>
      <label class="field"><span>${esc(t('Opacitat'))}</span><input type="range" min="0.1" max="1" step="0.05" data-mf="bg.op" value="${m.bg.op ?? 1}"></label>
      <p class="small muted">${esc(t('Per a quadrar la quadrícula amb la del dibuix, canvia l\'amplària fins que les caselles coincidisquen i després mou-la amb X i Y.'))}</p>
      <div class="row"><button class="btn sm" id="bg-fit">${esc(t('Ajustar el mapa a la imatge'))}</button><button class="btn sm" id="bg-change">${esc(t('Canviar'))}</button><button class="btn sm danger" id="bg-del">${esc(t('Llevar'))}</button></div>`
      : `<button class="btn sm" id="bg-add">${esc(t('Pujar una imatge'))}</button>`}
    <h3>${esc(t('Mapes'))}</h3><div class="row"><button class="btn sm" id="map-new">+ ${esc(t('Mapa nou'))}</button><button class="btn sm" id="map-dup">${esc(t('Duplicar'))}</button><button class="btn sm danger" id="map-del">${esc(t('Esborrar'))}</button></div>
    <div class="row"><button class="btn sm" id="map-clear">${esc(t('Buidar el terreny'))}</button><button class="btn sm" id="map-export">${esc(t('Guardar com a imatge'))}</button></div>`;
  side.innerHTML = `<nav class="subtabs" role="tablist">${panels.map(([k, lb]) => `<button role="tab" data-mpanel="${k}" aria-selected="${mp.panel === k}">${esc(t(lb))}</button>`).join('')}</nav><div class="map-side-body">${body}</div>`;
}
function tokenPanel(x) {
  const ch = x.charId && getDoc('characters/' + x.charId), cb = x.cmbId && (getDoc('combat/main')?.list || []).find(c => c.id === x.cmbId);
  const canEd = dm();
  const hp = ch ? `${ch.hp}/${ch.maxHp}` : cb && cb.maxHp != null ? `${cb.hp}/${cb.maxHp}` : cb?.state ? t(HP_STATE[cb.state] || '') : '';
  return `<div class="tok-panel"><div class="row" style="justify-content:space-between"><b>${esc(x.name || '?')}</b>${hp ? `<span class="mono">${esc(t('PG'))} ${esc(hp)}</span>` : ''}</div>
    ${canEd ? `<label class="field"><span>${esc(t('Nom'))}</span><input class="in" data-tf="name" value="${esc(x.name || '')}"></label>
    <div class="row"><label class="check">${esc(t('Mida'))} <select class="in" data-tf="size" style="width:auto">${[[1, L('Mitjana')], [2, L('Gran')], [3, L('Enorme')], [4, L('Colossal')]].map(([n, lb]) => `<option value="${n}" ${(x.size || 1) === n ? 'selected' : ''}>${esc(t(lb))}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" data-tfb="hidden" ${x.hidden ? 'checked' : ''}> ${esc(t('Amagada'))}</label></div>
    <div class="swatches">${TOKEN_COLORS.map(c => `<button class="sw" style="background:${c}" data-tcolor="${c}" aria-pressed="${x.color === c}" aria-label="${c}"></button>`).join('')}</div>
    <div class="row">${!x.cmbId && !x.charId ? `<button class="btn sm" id="tok-cmb">${esc(t('Afegir al combat'))}</button>` : ''}${x.monster ? `<button class="btn sm" id="tok-stats">${esc(t('Estadístiques'))}</button>` : ''}<button class="btn sm danger" id="tok-del">${esc(t('Llevar del mapa'))}</button></div>`
      : `${ch ? `<button class="btn sm" data-gochar="${esc(x.charId)}">${esc(t('Veure la fitxa'))}</button>` : ''}`}</div>`;
}

/* ---------- canvas ---------- */
function setupCanvas() {
  const cv = $('#map-cv'), stage = $('#map-stage'); mp.cv = cv; mp.ctx = cv.getContext('2d');
  mp.ro && mp.ro.disconnect();
  mp.ro = new ResizeObserver(() => {const r = stage.getBoundingClientRect(), d = devicePixelRatio || 1; cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d); cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; if (view().fit) fitView(); draw()});
  mp.ro.observe(stage);
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
  cv.addEventListener('pointerleave', () => {mp.hover = null; drawSoon()});
  cv.addEventListener('wheel', onWheel, {passive: false}); cv.addEventListener('dblclick', e => {const w = toWorld(e); sendPing(w.x, w.y)});
  cv.style.cursor = cursorFor();
}
function fitView() {
  const m = mapDoc(); if (!m || !mp.cv) return; const v = view(), d = devicePixelRatio || 1;
  const W = mp.cv.width / d, H = mp.cv.height / d; const z = clamp(Math.min((W - 30) / (m.cols * CS), (H - 30) / (m.rows * CS)), .1, 3);
  v.z = z; v.x = (W - m.cols * CS * z) / 2; v.y = (H - m.rows * CS * z) / 2; v.fit = true;
}
const toWorld = e => {const r = mp.cv.getBoundingClientRect(), v = view(); return {x: (e.clientX - r.left - v.x) / (CS * v.z), y: (e.clientY - r.top - v.y) / (CS * v.z), sx: e.clientX - r.left, sy: e.clientY - r.top}};
function cssColors() {
  if (mp.colors) return mp.colors; const cs = getComputedStyle(document.documentElement), g = n => cs.getPropertyValue(n).trim() || '#888';
  const c = {}; for (const [id, , v] of TERRAINS) c[id] = g(v); for (const n of ['--ink', '--line-2', '--accent', '--gold', '--blood', '--good', '--surface', '--bg', '--t-void', '--t-door', '--muted']) c[n] = g(n);
  return (mp.colors = c);
}
let drawQ = 0;
function drawSoon() {if (drawQ) return; drawQ = requestAnimationFrame(() => {drawQ = 0; draw()})}
function bgImage(file) {
  if (!file) return null; let im = mp.imgs[file];
  if (!im) {im = mp.imgs[file] = new Image(); im.onload = drawSoon; im.src = fileUrl(file)}
  return im.complete && im.naturalWidth ? im : null;
}
function draw(tg) {
  const cv = tg ? tg.cv : mp.cv; if (!cv || (!tg && !cv.isConnected)) return; const ctx = tg ? tg.ctx : mp.ctx, m = mapDoc(); if (!m) return;
  const d = tg ? 1 : (devicePixelRatio || 1), v = tg ? tg.v : view(), C = cssColors(), s = CS * v.z, dmv = dm() && !tg;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.fillStyle = C['--t-void']; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.save(); ctx.translate(v.x, v.y);
  const W = m.cols * s, H = m.rows * s;
  ctx.fillStyle = C['--bg']; ctx.fillRect(0, 0, W, H);
  // fons
  const im = m.bg?.file && bgImage(m.bg.file);
  if (im) {const bw = (m.bg.w || m.cols) * s, bh = bw * im.naturalHeight / im.naturalWidth; ctx.globalAlpha = m.bg.op ?? 1; ctx.drawImage(im, (m.bg.x || 0) * s, (m.bg.y || 0) * s, bw, bh); ctx.globalAlpha = 1}
  // terreny
  for (const k in m.tiles || {}) {
    const tt = m.tiles[k]; if (!tt) continue; const [x, y] = k.split(',').map(Number); if (x < 0 || y < 0 || x >= m.cols || y >= m.rows) continue;
    ctx.fillStyle = C[tt] || '#888'; ctx.fillRect(x * s, y * s, s + .5, s + .5);
    if (tt === 'tree') {ctx.fillStyle = 'rgba(20,40,10,.35)'; ctx.beginPath(); ctx.arc(x * s + s * .5, y * s + s * .5, s * .32, 0, 7); ctx.fill()}
    else if (tt === 'water' || tt === 'deep') {ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = Math.max(1, s / 30); ctx.beginPath(); ctx.moveTo(x * s + s * .2, y * s + s * .55); ctx.quadraticCurveTo(x * s + s * .35, y * s + s * .4, x * s + s * .5, y * s + s * .55); ctx.quadraticCurveTo(x * s + s * .65, y * s + s * .7, x * s + s * .8, y * s + s * .55); ctx.stroke()}
    else if (tt === 'pit') {ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 4; i++) {ctx.moveTo(x * s + i * s / 4, y * s); ctx.lineTo(x * s, y * s + i * s / 4)} ctx.stroke()}
    else if (tt === 'rock') {ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x * s, y * s + s * .8, s, s * .2)}
  }
  // quadrícula
  if (m.grid?.show !== false) {
    ctx.strokeStyle = C['--ink']; ctx.globalAlpha = m.grid?.op ?? .35; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x <= m.cols; x++) {ctx.moveTo(x * s + .5, 0); ctx.lineTo(x * s + .5, H)}
    for (let y = 0; y <= m.rows; y++) {ctx.moveTo(0, y * s + .5); ctx.lineTo(W, y * s + .5)}
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  // parets i portes
  for (const k in m.walls || {}) {const w = m.walls[k]; if (w) drawWall(ctx, k, w, s, C, dmv)}
  // etiquetes
  for (const lb of m.labels || []) {
    const cx = (lb.x + .5) * s, cy = (lb.y + .5) * s;
    if (lb.kind === 'pin') {ctx.fillStyle = C['--accent']; ctx.beginPath(); ctx.arc(cx, cy, s * .32, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `600 ${Math.round(s * .36)}px Alegreya, Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lb.text || '?', cx, cy + 1)}
    else {ctx.font = `italic 600 ${Math.round(s * .42)}px "IM Fell English", Georgia, serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = Math.max(2, s / 12); ctx.strokeStyle = C['--surface']; ctx.strokeText(lb.text || '', lb.x * s + 4, cy); ctx.fillStyle = C['--ink']; ctx.fillText(lb.text || '', lb.x * s + 4, cy)}
  }
  // àrees d'efecte
  for (const a of aoes()) drawAoe(ctx, a, s, m, a.ownerId === S.uid ? C['--accent'] : C['--gold']);
  if (mp.drag?.kind === 'aoe') drawAoe(ctx, mp.drag.aoe, s, m, C['--accent']);
  // fitxes
  const combat = getDoc('combat/main'), curCmb = combat?.active ? (combat.list || [])[combat.turn || 0] : null;
  for (const tk of tokens()) {
    if (tk.hidden && !dmv) continue;
    const p = mp.drag?.kind === 'token' && mp.drag.id === tk.id ? mp.drag.pos : tk;
    drawToken(ctx, tk, p.x, p.y, s, C, curCmb && curCmb.id && curCmb.id === tk.cmbId || (curCmb && curCmb.charId && curCmb.charId === tk.charId));
  }
  // boira
  if (m.fog?.on && !tg) {
    const rev = m.fog.rev || {}; ctx.fillStyle = dmv ? 'rgba(10,6,4,.5)' : '#0b0806';
    for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) if (!rev[x + ',' + y]) ctx.fillRect(x * s - .5, y * s - .5, s + 1, s + 1);
    if (dmv) {ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1}
  }
  if (tg) {ctx.restore(); return}
  // seleccions i previsualitzacions
  if (mp.drag?.kind === 'rect') {const r = normRect(mp.drag.a, mp.drag.b); ctx.fillStyle = mp.tool === 'fog' ? (mp.fogMode === 'reveal' ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.4)') : 'rgba(162,116,25,.3)'; ctx.fillRect(r.x * s, r.y * s, r.w * s, r.h * s); ctx.strokeStyle = C['--gold']; ctx.lineWidth = 2; ctx.strokeRect(r.x * s, r.y * s, r.w * s, r.h * s)}
  if (mp.hover && ['paint', 'fog', 'label'].includes(mp.tool) && !mp.drag) {const n = mp.tool === 'paint' && mp.paintMode === 'brush' ? mp.brush : 1, o = Math.floor((n - 1) / 2); ctx.strokeStyle = C['--gold']; ctx.lineWidth = 2; ctx.strokeRect((Math.floor(mp.hover.x) - o) * s, (Math.floor(mp.hover.y) - o) * s, n * s, n * s)}
  if (mp.hover && mp.tool === 'wall' && !mp.drag) {const e = nearestEdge(mp.hover); if (e) drawWall(ctx, e, mp.wall || 'wall', s, C, true, .5)}
  if (mp.ruler) drawRuler(ctx, mp.ruler, s, m, C);
  // llapis: els traços s'esvaeixen sols
  const now = Date.now(); mp.strokes = mp.strokes.filter(k => now - k.ts < STROKE_LIFE && k.map === mapId());
  const live = mp.drag?.kind === 'draw' ? [{pts: mp.drag.pts, col: mp.drag.col, ts: now}] : [];
  for (const k of [...mp.strokes, ...live]) {
    const age = now - k.ts; ctx.globalAlpha = age < STROKE_LIFE - 2500 ? .95 : Math.max(0, (STROKE_LIFE - age) / 2500) * .95;
    ctx.strokeStyle = k.col || C['--accent']; ctx.lineWidth = Math.max(3, s * .09); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    k.pts.forEach(([x, y], i) => i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // avisos
  mp.pings = mp.pings.filter(p => now - p.ts < 2600 && p.map === mapId());
  for (const p of mp.pings) {const k = (now - p.ts) / 2600; for (let i = 0; i < 3; i++) {const r = ((k * 2 + i / 3) % 1); ctx.strokeStyle = p.dm ? C['--accent'] : C['--gold']; ctx.globalAlpha = (1 - r) * (1 - k * .5); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x * s, p.y * s, s * (.2 + r * 1.3), 0, 7); ctx.stroke()} ctx.globalAlpha = 1}
  ctx.restore();
  if (mp.pings.length || mp.strokes.length) drawSoon();
}
function drawWall(ctx, k, w, s, C, dmv, alpha = 1) {
  const [xs, ys, dd] = k.split(','); const x = +xs, y = +ys;
  const [x1, y1, x2, y2] = dd === 'n' ? [x, y, x + 1, y] : [x, y, x, y + 1];
  ctx.globalAlpha = alpha; ctx.lineCap = 'round';
  const line = (a, b, c, d2, wd, col) => {ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(a * s, b * s); ctx.lineTo(c * s, d2 * s); ctx.stroke()};
  const wallW = Math.max(3, s * .14);
  if (w === 'wall' || (w === 'secret' && !dmv)) line(x1, y1, x2, y2, wallW, C['--ink']);
  else if (w === 'secret') {line(x1, y1, x2, y2, wallW, C['--ink']); ctx.fillStyle = C['--accent']; ctx.font = `700 ${Math.round(s * .3)}px Alegreya, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('S', (x1 + x2) / 2 * s + (dd === 'w' ? s * .2 : 0), (y1 + y2) / 2 * s + (dd === 'n' ? s * .2 : 0))}
  else if (w === 'window') {line(x1, y1, x2, y2, wallW, C['--ink']); line(x1 + (x2 - x1) * .2, y1 + (y2 - y1) * .2, x1 + (x2 - x1) * .8, y1 + (y2 - y1) * .8, wallW * .45, '#9DB4C8')}
  else if (w === 'door' || w === 'open') {
    line(x1, y1, x1 + (x2 - x1) * .15, y1 + (y2 - y1) * .15, wallW, C['--ink']); line(x2 - (x2 - x1) * .15, y2 - (y2 - y1) * .15, x2, y2, wallW, C['--ink']);
    const ax = x1 + (x2 - x1) * .15, ay = y1 + (y2 - y1) * .15, bx = x2 - (x2 - x1) * .15, by = y2 - (y2 - y1) * .15;
    if (w === 'door') {ctx.fillStyle = C['--t-door']; ctx.strokeStyle = C['--ink']; ctx.lineWidth = 1.5; const th = s * .16; if (dd === 'n') {ctx.fillRect(ax * s, ay * s - th / 2, (bx - ax) * s, th); ctx.strokeRect(ax * s, ay * s - th / 2, (bx - ax) * s, th)} else {ctx.fillRect(ax * s - th / 2, ay * s, th, (by - ay) * s); ctx.strokeRect(ax * s - th / 2, ay * s, th, (by - ay) * s)}}
    else {const L2 = (dd === 'n' ? bx - ax : by - ay); line(ax, ay, ax + (dd === 'n' ? 0 : L2 * .8), ay + (dd === 'n' ? L2 * .8 : 0), Math.max(3, s * .1), C['--t-door'])}
  }
  ctx.globalAlpha = 1;
}
const HP_STATE = {healthy: L('Il·lès'), hurt: L('Ferit'), bloodied: L('Malferit'), critical: L('Molt greu'), down: L('Abatut')};
function drawToken(ctx, tk, x, y, s, C, current) {
  const n = tk.size || 1, r = n * s / 2, cx = x * s + r, cy = y * s + r;
  ctx.globalAlpha = tk.hidden ? .45 : 1;
  if (current) {ctx.strokeStyle = C['--gold']; ctx.lineWidth = Math.max(3, s * .08); ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, 7); ctx.stroke()}
  ctx.fillStyle = tk.color || '#888'; ctx.beginPath(); ctx.arc(cx, cy, r * .86, 0, 7); ctx.fill();
  const ch = tk.charId && getDoc('characters/' + tk.charId), img = tk.img ? bgImage(tk.img) : ch?.portrait ? bgImage(ch.portrait) : null;
  if (img) {ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r * .78, 0, 7); ctx.clip(); const sz = r * 1.56; ctx.drawImage(img, cx - sz / 2, cy - sz / 2, sz, sz); ctx.restore()}
  else {ctx.fillStyle = '#fff'; ctx.font = `600 ${Math.round(r * .62)}px Alegreya, Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tokInitials(tk.name), cx, cy + 1)}
  ctx.strokeStyle = mp.tokSel === tk.id ? C['--gold'] : 'rgba(0,0,0,.55)'; ctx.lineWidth = mp.tokSel === tk.id ? 3 : 1.5; ctx.beginPath(); ctx.arc(cx, cy, r * .86, 0, 7); ctx.stroke();
  // vida
  const cb = tk.cmbId && (getDoc('combat/main')?.list || []).find(c => c.id === tk.cmbId);
  let pct = null; if (ch) pct = hpPct(ch.hp, ch.maxHp); else if (cb && cb.maxHp != null) pct = hpPct(cb.hp, cb.maxHp);
  else if (cb?.state) pct = {healthy: 1, hurt: .75, bloodied: .45, critical: .2, down: 0}[cb.state] ?? null;
  if (pct != null) {ctx.lineWidth = Math.max(3, s * .07); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(cx, cy, r * .95, 0, 7); ctx.stroke(); ctx.strokeStyle = pct <= .25 ? C['--blood'] : pct <= .5 ? C['--gold'] : C['--good']; ctx.beginPath(); ctx.arc(cx, cy, r * .95, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct); ctx.stroke()}
  if (pct === 0) {ctx.strokeStyle = C['--blood']; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - r * .5, cy - r * .5); ctx.lineTo(cx + r * .5, cy + r * .5); ctx.moveTo(cx + r * .5, cy - r * .5); ctx.lineTo(cx - r * .5, cy + r * .5); ctx.stroke()}
  if (s * n > 34 && tk.name) {ctx.font = `500 ${Math.max(10, Math.round(s * .24))}px Alegreya, Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; const lb = tk.name.length > 16 ? tk.name.slice(0, 15) + '…' : tk.name; ctx.strokeText(lb, cx, y * s + n * s - 2); ctx.fillStyle = '#fff'; ctx.fillText(lb, cx, y * s + n * s - 2)}
  ctx.globalAlpha = 1;
}
const tokInitials = n => {const w = String(n || '?').trim().split(/\s+/), last = w.length > 1 ? w.at(-1) : ''; return ((w[0]?.[0] || '?') + (/^\d+$/.test(last) ? last : (last[0] || ''))).toUpperCase().slice(0, 3)};
function aoeGeom(a, m) {
  const u = m.units || 1.5, len = (a.size || 6) / u, ang = Math.atan2(a.dy || 0, a.dx || 1e-9);
  return {u, len, ang, ox: a.x, oy: a.y};
}
function inAoe(a, g, px, py) {
  const dx = px - g.ox, dy = py - g.oy;
  if (a.shape === 'circle') return dx * dx + dy * dy <= g.len * g.len;
  const ca = Math.cos(-g.ang), sa = Math.sin(-g.ang), lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
  if (a.shape === 'cone') return lx >= 0 && lx <= g.len && Math.abs(ly) <= lx / 2;
  if (a.shape === 'line') return lx >= 0 && lx <= g.len && Math.abs(ly) <= .5;
  if (a.shape === 'cube') return lx >= 0 && lx <= g.len && Math.abs(ly) <= g.len / 2;
  return false;
}
function drawAoe(ctx, a, s, m, col) {
  const g = aoeGeom(a, m);
  // caselles afectades
  ctx.fillStyle = col; ctx.globalAlpha = .18;
  const R = Math.ceil(g.len) + 1;
  for (let y = Math.floor(g.oy - R); y <= g.oy + R; y++) for (let x = Math.floor(g.ox - R); x <= g.ox + R; x++) if (x >= 0 && y >= 0 && x < m.cols && y < m.rows && inAoe(a, g, x + .5, y + .5)) ctx.fillRect(x * s, y * s, s, s);
  ctx.globalAlpha = .9; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath();
  if (a.shape === 'circle') ctx.arc(g.ox * s, g.oy * s, g.len * s, 0, 7);
  else {const pts = a.shape === 'cone' ? [[0, 0], [g.len, -g.len / 2], [g.len, g.len / 2]] : a.shape === 'line' ? [[0, -.5], [g.len, -.5], [g.len, .5], [0, .5]] : [[0, -g.len / 2], [g.len, -g.len / 2], [g.len, g.len / 2], [0, g.len / 2]];
    pts.forEach(([lx, ly], i) => {const X = g.ox + lx * Math.cos(g.ang) - ly * Math.sin(g.ang), Y = g.oy + lx * Math.sin(g.ang) + ly * Math.cos(g.ang); i ? ctx.lineTo(X * s, Y * s) : ctx.moveTo(X * s, Y * s)}); ctx.closePath()}
  ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(g.ox * s, g.oy * s, 4, 0, 7); ctx.fill();
}
function drawRuler(ctx, r, s, m, C) {
  const ax = Math.floor(r.a.x) + .5, ay = Math.floor(r.a.y) + .5, bx = Math.floor(r.b.x) + .5, by = Math.floor(r.b.y) + .5;
  const cells = Math.max(Math.abs(bx - ax), Math.abs(by - ay)), dist = cells * (m.units || 1.5);
  ctx.strokeStyle = C['--accent']; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(ax * s, ay * s); ctx.lineTo(bx * s, by * s); ctx.stroke(); ctx.setLineDash([]);
  const txt = `${String(Math.round(dist * 10) / 10).replace('.', ',')} m · ${cells} ${t(cells === 1 ? 'casella' : 'caselles')}`;
  ctx.font = `600 ${Math.max(13, Math.round(s * .3))}px Alegreya, Georgia, serif`; const w = ctx.measureText(txt).width + 14;
  ctx.fillStyle = C['--ink']; ctx.fillRect(bx * s + 10, by * s - 26, w, 24); ctx.fillStyle = C['--surface']; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx * s + 17, by * s - 14);
}
const normRect = (a, b) => {const x1 = clamp(Math.floor(Math.min(a.x, b.x)), 0, 1e4), y1 = clamp(Math.floor(Math.min(a.y, b.y)), 0, 1e4), x2 = Math.floor(Math.max(a.x, b.x)), y2 = Math.floor(Math.max(a.y, b.y)); return {x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1}};
function nearestEdge(p) {
  const x = Math.floor(p.x), y = Math.floor(p.y), fx = p.x - x, fy = p.y - y; const m = mapDoc(); if (!m) return null;
  const opts = [[fy, `${x},${y},n`], [1 - fy, `${x},${y + 1},n`], [fx, `${x},${y},w`], [1 - fx, `${x + 1},${y},w`]].sort((a, b) => a[0] - b[0]);
  if (opts[0][0] > .3) return null; const [ex, ey] = opts[0][1].split(',').map(Number);
  if (ex < 0 || ey < 0 || ex > m.cols || ey > m.rows) return null; return opts[0][1];
}
function cursorFor() {return {move: 'grab', ruler: 'crosshair', aoe: 'crosshair', draw: 'crosshair', ping: 'pointer', paint: 'cell', wall: 'crosshair', label: 'text', fog: 'cell'}[mp.tool] || 'default'}
function updateHint() {const h = $('#map-hint'); if (!h) return; const m = mapDoc(); h.textContent = m?.fog?.on && dm() ? t(m.fog.auto ? 'Boira automàtica: es revela el que veuen els personatges.' : 'Boira activada: els jugadors només veuen les zones revelades.') : ''; h.hidden = !h.textContent}

/* ---------- edició local del mapa (amb desfer) ---------- */
function beginEdit() {const id = mapId(), doc = clone(getDoc('maps/' + id)); mp.undo.push({id, doc: clone(doc)}); if (mp.undo.length > 25) mp.undo.shift(); mp.local = {id, doc}; return doc}
function commitEdit() {if (!mp.local) return; const {id, doc} = mp.local; for (const k of ['tiles', 'walls']) for (const kk in doc[k] || {}) if (!doc[k][kk]) delete doc[k][kk]; if (doc.fog?.rev) for (const kk in doc.fog.rev) if (!doc.fog.rev[kk]) delete doc.fog.rev[kk]; write('maps/' + id, doc, 'set'); setTimeout(() => {if (mp.local && mp.local.id === id && !mp.drag) mp.local = null}, 600); const b = $('#map-undo'); if (b) b.disabled = false}
function undoMap() {const u = mp.undo.pop(); if (!u) return; write('maps/' + u.id, u.doc, 'set'); mp.local = null; drawSoon(); const b = $('#map-undo'); if (b) b.disabled = !mp.undo.length}
document.addEventListener('keydown', e => {if (st.tab === 'mapa' && dm() && (e.ctrlKey || e.metaKey) && e.key === 'z' && !editing()) {e.preventDefault(); undoMap()}});
function paintAt(doc, p) {
  const n = mp.brush, o = Math.floor((n - 1) / 2), x0 = Math.floor(p.x) - o, y0 = Math.floor(p.y) - o; doc.tiles = doc.tiles || {};
  for (let y = y0; y < y0 + n; y++) for (let x = x0; x < x0 + n; x++) if (x >= 0 && y >= 0 && x < doc.cols && y < doc.rows) doc.tiles[x + ',' + y] = mp.terrain || null;
}
function floodFill(doc, p) {
  const sx = Math.floor(p.x), sy = Math.floor(p.y); if (sx < 0 || sy < 0 || sx >= doc.cols || sy >= doc.rows) return;
  doc.tiles = doc.tiles || {}; const target = doc.tiles[sx + ',' + sy] || null, repl = mp.terrain || null; if (target === repl) return;
  const blocked = (x, y, nx, ny) => {const k = nx > x ? `${nx},${y},w` : nx < x ? `${x},${y},w` : ny > y ? `${x},${ny},n` : `${x},${y},n`; const w = doc.walls?.[k]; return w && w !== 'open'};
  const q = [[sx, sy]], seen = new Set([sx + ',' + sy]); let n = 0;
  while (q.length && n < 20000) {const [x, y] = q.shift(); n++; doc.tiles[x + ',' + y] = repl;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {const k = nx + ',' + ny; if (nx < 0 || ny < 0 || nx >= doc.cols || ny >= doc.rows || seen.has(k) || (doc.tiles[k] || null) !== target || blocked(x, y, nx, ny)) continue; seen.add(k); q.push([nx, ny])}}
}
function autoWalls() {
  const doc = beginEdit(); doc.walls = doc.walls || {}; const solid = k => {const v = doc.tiles?.[k]; return !v || v === 'rock' || v === 'pit'};
  for (let y = 0; y < doc.rows; y++) for (let x = 0; x < doc.cols; x++) {
    if (solid(x + ',' + y)) continue;
    if (solid(x + ',' + (y - 1)) && !doc.walls[`${x},${y},n`]) doc.walls[`${x},${y},n`] = 'wall';
    if (solid(x + ',' + (y + 1)) && !doc.walls[`${x},${y + 1},n`]) doc.walls[`${x},${y + 1},n`] = 'wall';
    if (solid((x - 1) + ',' + y) && !doc.walls[`${x},${y},w`]) doc.walls[`${x},${y},w`] = 'wall';
    if (solid((x + 1) + ',' + y) && !doc.walls[`${x + 1},${y},w`]) doc.walls[`${x + 1},${y},w`] = 'wall';
  }
  commitEdit(); drawSoon();
}

/* ---------- ratolí i dits ---------- */
function tokenAt(p) {
  const list = tokens().filter(x => dm() || !x.hidden).reverse();
  return list.find(tk => p.x >= tk.x && p.x < tk.x + (tk.size || 1) && p.y >= tk.y && p.y < tk.y + (tk.size || 1));
}
const canMoveTok = tk => dm() || (tk.charId && getDoc('characters/' + tk.charId)?.ownerId === S.uid);
function onDown(e) {
  const cv = mp.cv; cv.setPointerCapture(e.pointerId); mp.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
  if (mp.pointers.size === 2) {const [a, b] = [...mp.pointers.values()]; mp.drag = {kind: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), z: view().z, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2}; return}
  const p = toWorld(e), m = mapDoc(); if (!m) return;
  if (e.button === 1 || (e.button === 0 && e.altKey)) {mp.drag = {kind: 'pan', sx: e.clientX, sy: e.clientY, vx: view().x, vy: view().y}; return}
  const T = mp.tool;
  if (T === 'move') {
    const tk = tokenAt(p);
    if (tk) {mp.tokSel = tk.id; if (mp.panel !== 'fitxes' && dm()) {mp.panel = 'fitxes'} renderMapSide(); if (canMoveTok(tk)) mp.drag = {kind: 'token', id: tk.id, off: {x: p.x - tk.x, y: p.y - tk.y}, pos: {x: tk.x, y: tk.y}, moved: false}; drawSoon(); return}
    mp.tokSel = null; renderMapSide();
    mp.drag = {kind: 'pan', sx: e.clientX, sy: e.clientY, vx: view().x, vy: view().y}; cv.style.cursor = 'grabbing'; return;
  }
  if (T === 'ruler') {mp.ruler = {a: p, b: p}; mp.drag = {kind: 'ruler'}; drawSoon(); return}
  if (T === 'ping') {sendPing(p.x, p.y); return}
  if (T === 'draw') {mp.drag = {kind: 'draw', pts: [[p.x, p.y]], col: myColor()}; drawSoon(); return}
  if (T === 'aoe') {
    const hit = aoes().find(a => inAoe(a, aoeGeom(a, m), p.x, p.y) && (dm() || a.ownerId === S.uid));
    if (hit) {del(`maps/${mapId()}/aoe/${hit.id}`); return}
    mp.drag = {kind: 'aoe', aoe: {shape: mp.aoeShape, size: mp.aoeSize, x: mp.aoeShape === 'circle' ? Math.round(p.x * 2) / 2 : p.x, y: mp.aoeShape === 'circle' ? Math.round(p.y * 2) / 2 : p.y, dx: 1, dy: 0, ownerId: S.uid}}; drawSoon(); return;
  }
  if (!dm()) return;
  if (T === 'paint') {
    if (mp.paintMode === 'fill') {const doc = beginEdit(); floodFill(doc, p); commitEdit(); drawSoon(); return}
    if (mp.paintMode === 'rect') {mp.drag = {kind: 'rect', a: p, b: p}; drawSoon(); return}
    const doc = beginEdit(); paintAt(doc, p); mp.drag = {kind: 'paint'}; drawSoon(); return;
  }
  if (T === 'wall') {const k = nearestEdge(p); if (!k) return; const doc = beginEdit(); doc.walls = doc.walls || {}; const v = doc.walls[k] === mp.wall ? null : (mp.wall || null); doc.walls[k] = v; mp.drag = {kind: 'wall', val: v, last: k}; drawSoon(); return}
  if (T === 'fog') {mp.drag = {kind: 'rect', a: p, b: p}; drawSoon(); return}
  if (T === 'label') {labelAt(p); return}
}
function onMove(e) {
  if (mp.pointers.has(e.pointerId)) mp.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
  const p = toWorld(e), d = mp.drag;
  mp.hover = p;
  if (!d) {if (['paint', 'fog', 'label', 'wall'].includes(mp.tool)) drawSoon(); return}
  if (d.kind === 'pinch' && mp.pointers.size >= 2) {const [a, b] = [...mp.pointers.values()]; const v = view(), nd = Math.hypot(a.x - b.x, a.y - b.y); zoomAt(d.cx, d.cy, clamp(d.z * nd / d.d, .1, 4) / v.z); return}
  if (d.kind === 'pan') {const v = view(); v.x = d.vx + e.clientX - d.sx; v.y = d.vy + e.clientY - d.sy; v.fit = false; drawSoon(); return}
  if (d.kind === 'token') {const m = mapDoc(), tk = tokens().find(x => x.id === d.id); const n = tk?.size || 1; d.pos = {x: clamp(Math.round(p.x - d.off.x), 0, m.cols - n), y: clamp(Math.round(p.y - d.off.y), 0, m.rows - n)}; d.moved = true; drawSoon(); return}
  if (d.kind === 'ruler') {mp.ruler.b = p; drawSoon(); return}
  if (d.kind === 'draw') {const l = d.pts.at(-1); if (d.pts.length < 600 && Math.hypot(p.x - l[0], p.y - l[1]) > .08) {d.pts.push([p.x, p.y]); drawSoon()} return}
  if (d.kind === 'aoe') {const a = d.aoe; a.dx = p.x - a.x; a.dy = p.y - a.y; if (a.shape === 'circle') {} drawSoon(); return}
  if (d.kind === 'paint') {paintAt(mp.local.doc, p); drawSoon(); return}
  if (d.kind === 'rect') {d.b = p; drawSoon(); return}
  if (d.kind === 'wall') {const k = nearestEdge(p); if (k && k !== d.last) {mp.local.doc.walls[k] = d.val; d.last = k; drawSoon()} return}
}
function onUp(e) {
  mp.pointers.delete(e.pointerId);
  const d = mp.drag; if (!d) return; mp.drag = null; mp.cv.style.cursor = cursorFor();
  if (d.kind === 'pinch') {return}
  if (d.kind === 'token') {if (d.moved) write(`maps/${mapId()}/tokens/${d.id}`, {x: d.pos.x, y: d.pos.y}, 'update'); drawSoon(); return}
  if (d.kind === 'ruler') {setTimeout(() => {if (!mp.drag) {mp.ruler = null; drawSoon()}}, 1800); return}
  if (d.kind === 'draw') {if (d.pts.length > 1) {const k = {map: mapId(), pts: d.pts.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]), col: d.col, ts: Date.now()}; mp.strokes.push(k); if (S.token) api('api/draw', k).catch(() => {})} drawSoon(); return}
  if (d.kind === 'aoe') {const a = d.aoe; if (Math.hypot(a.dx, a.dy) < .2 && a.shape !== 'circle') {a.dx = 1; a.dy = 0} write(`maps/${mapId()}/aoe/${newId()}`, a); drawSoon(); return}
  if (d.kind === 'paint' || d.kind === 'wall') {commitEdit(); return}
  if (d.kind === 'rect') {
    const r = normRect(d.a, d.b), doc = beginEdit();
    if (mp.tool === 'fog') {doc.fog = doc.fog || {on: true, rev: {}}; doc.fog.rev = doc.fog.rev || {}; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) doc.fog.rev[x + ',' + y] = mp.fogMode === 'reveal' ? 1 : null}
    else {doc.tiles = doc.tiles || {}; for (let y = r.y; y < Math.min(doc.rows, r.y + r.h); y++) for (let x = r.x; x < Math.min(doc.cols, r.x + r.w); x++) doc.tiles[x + ',' + y] = mp.terrain || null}
    commitEdit(); drawSoon();
  }
}
function zoomAt(sx, sy, f) {const v = view(), r = mp.cv.getBoundingClientRect(), px = sx - r.left, py = sy - r.top, nz = clamp(v.z * f, .1, 4); v.x = px - (px - v.x) * nz / v.z; v.y = py - (py - v.y) * nz / v.z; v.z = nz; v.fit = false; drawSoon()}
function onWheel(e) {e.preventDefault(); if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015))); else {const v = view(); v.x -= e.deltaX; v.fit = false; drawSoon()}}
function sendPing(x, y) {const p = {x, y, map: mapId(), uid: S.uid, dm: dm(), ts: Date.now()}; mp.pings.push(p); drawSoon(); if (S.token) api('api/ping', p).catch(() => {})}
const STROKE_LIFE = 9000;
/** El color del llapis: el del teu personatge (el màster, el color de la partida) */
function myColor() {if (dm()) return ''; const ch = chars().find(c => c.ownerId === S.uid && !c.npc); return ch?.color || ''}
function onDraw(k) {if (k.uid === S.uid) return; k.ts = Date.now(); mp.strokes.push(k); if (st.tab === 'mapa') drawSoon()}
function onPing(p) {if (p.uid === S.uid) return; p.ts = Date.now(); mp.pings.push(p); if (st.tab === 'mapa') drawSoon(); else if (p.map === mapId()) toast(t('{n} assenyala alguna cosa al mapa.', {n: userName(p.uid)}))}
function labelAt(p) {
  const m = mapDoc(), x = Math.floor(p.x), y = Math.floor(p.y);
  const ex = (m.labels || []).find(lb => lb.x === x && lb.y === y);
  const pins = (m.labels || []).filter(lb => lb.kind === 'pin'), next = String(pins.reduce((a, lb) => Math.max(a, +lb.text || 0), 0) + 1);
  const kind = ex ? ex.kind : mp.labelKind;
  openModal(`<h2>${esc(t(kind === 'pin' ? 'Número de sala' : 'Etiqueta'))}</h2><label class="field"><span>${esc(t('Text'))}</span><input class="in" id="lb-t" value="${esc(ex ? ex.text : kind === 'pin' ? next : '')}" maxlength="60" autofocus></label>
    <div class="foot">${ex ? `<button class="btn danger" id="lb-del">${esc(t('Llevar'))}</button>` : ''}<button class="btn" id="lb-x">${esc(t('Cancel·lar'))}</button><button class="btn pri" id="lb-ok">${esc(t('Guardar'))}</button></div>`, (md, close) => {
    const save = () => {const v = $('#lb-t', md).value.trim(); const doc = beginEdit(); doc.labels = (doc.labels || []).filter(lb => !(lb.x === x && lb.y === y)); if (v) doc.labels.push({id: ex?.id || newId(), x, y, text: v, kind}); commitEdit(); drawSoon(); close()};
    $('#lb-ok', md).onclick = save; $('#lb-t', md).onkeydown = e => {if (e.key === 'Enter') save()}; $('#lb-x', md).onclick = close;
    if (ex) $('#lb-del', md).onclick = () => {const doc = beginEdit(); doc.labels = (doc.labels || []).filter(lb => lb !== ex && !(lb.x === x && lb.y === y)); commitEdit(); drawSoon(); close()};
  });
}

/* ---------- fitxes ---------- */
function freeCell(m, near) {
  const occ = new Set(); for (const tk of tokens()) for (let i = 0; i < (tk.size || 1); i++) for (let j = 0; j < (tk.size || 1); j++) occ.add((tk.x + i) + ',' + (tk.y + j));
  const v = view(), d = devicePixelRatio || 1, cx = near ? near.x : clamp(Math.floor(((mp.cv ? mp.cv.width / d / 2 : 0) - v.x) / (CS * v.z)), 0, m.cols - 1), cy = near ? near.y : clamp(Math.floor(((mp.cv ? mp.cv.height / d / 2 : 0) - v.y) / (CS * v.z)), 0, m.rows - 1);
  for (let r = 0; r < 30; r++) for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (x >= 0 && y >= 0 && x < m.cols && y < m.rows && !occ.has(x + ',' + y)) return {x, y};
  return {x: 0, y: 0};
}
function addToken(data, mapIdOverride) {
  const id = mapIdOverride || mapId(); const m = getDoc('maps/' + id); if (!m) {toast(t('Primer cal un mapa.')); return null}
  const pos = freeCell(m); const tid = newId(); write(`maps/${id}/tokens/${tid}`, {x: pos.x, y: pos.y, size: 1, color: pick(TOKEN_COLORS), ...data}); return tid;
}
function placeCharToken(c) {
  const id = dm() ? mapId() : camp().activeMap; if (!id || !getDoc('maps/' + id)) {toast(t('Encara no hi ha cap mapa actiu.')); return}
  if (!dm()) {toast(t('Demana al màster que pose la teua fitxa al mapa.')); return}
  if (col('maps/' + id + '/tokens').some(tk => tk.charId === c.id)) {toast(t('{n} ja és al mapa.', {n: c.name})); return}
  addToken({name: c.name, color: c.color, charId: c.id}, id); toast(t('{n} és al mapa.', {n: c.name}));
}
const SIZE_CELLS = {Tiny: 1, Small: 1, Medium: 1, Large: 2, Huge: 3, Gargantuan: 4};
document.addEventListener('click', async e => {
  if (st.tab !== 'mapa') return;
  const x = e.target;
  const tb = x.closest('[data-tool]'); if (tb) {mp.tool = tb.dataset.tool; mp.panel = 'eines'; lsSet('qm-map-panel', 'eines'); $$('[data-tool]').forEach(b => b.setAttribute('aria-pressed', b === tb)); renderMapSide(); if (mp.cv) mp.cv.style.cursor = cursorFor(); drawSoon(); return}
  const pn = x.closest('[data-mpanel]'); if (pn) {mp.panel = pn.dataset.mpanel; lsSet('qm-map-panel', mp.panel); renderMapSide(); return}
  const zm = x.closest('[data-zoom]'); if (zm) {const z = +zm.dataset.zoom; if (!z) {fitView(); drawSoon()} else {const r = mp.cv.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, z > 0 ? 1.25 : .8)} return}
  const tr = x.closest('[data-terr]'); if (tr) {mp.terrain = tr.dataset.terr; renderMapSide(); return}
  const pm = x.closest('[data-pmode]'); if (pm) {mp.paintMode = pm.dataset.pmode; renderMapSide(); return}
  const wl = x.closest('[data-wall]'); if (wl) {mp.wall = wl.dataset.wall; renderMapSide(); return}
  const lk = x.closest('[data-lkind]'); if (lk) {mp.labelKind = lk.dataset.lkind; renderMapSide(); return}
  const fm = x.closest('[data-fmode]'); if (fm) {mp.fogMode = fm.dataset.fmode; renderMapSide(); return}
  const sh = x.closest('[data-shape]'); if (sh) {mp.aoeShape = sh.dataset.shape; renderMapSide(); return}
  const ti = x.closest('[data-tok]'); if (ti) {mp.tokSel = ti.dataset.tok; const tk = tokens().find(q => q.id === mp.tokSel); if (tk) centerOn(tk.x, tk.y); renderMapSide(); drawSoon(); return}
  const tc = x.closest('[data-tcolor]'); if (tc && mp.tokSel) {write(`maps/${mapId()}/tokens/${mp.tokSel}`, {color: tc.dataset.tcolor}, 'update'); return}
  const gc = x.closest('[data-gochar]'); if (gc) {fx.sel = gc.dataset.gochar; goTab('personatges'); return}
  if (x.id === 'map-undo') {undoMap(); return}
  if (x.id === 'map-new') {const id = newId(); write('maps/' + id, blankMap()); mp.sel = id; lsSet('qm-map', id); if (!camp().activeMap) write('campaign/main', {activeMap: id}, 'update'); mp.panel = 'mapa'; setTimeout(renderMap, 40); return}
  if (x.id === 'map-new-img') {const f = await pickImage('map'); if (!f) return; const im = new Image(); im.onload = () => {const cols = 30, rows = Math.max(4, Math.round(cols * im.naturalHeight / im.naturalWidth)); const id = newId(); write('maps/' + id, {...blankMap(t('Mapa nou')), cols, rows, bg: {file: f, x: 0, y: 0, w: cols, op: 1}}); mp.sel = id; lsSet('qm-map', id); if (!camp().activeMap) write('campaign/main', {activeMap: id}, 'update'); mp.panel = 'mapa'; setTimeout(renderMap, 40); toast(t('Ajusta l\'amplària de la imatge perquè la quadrícula coincidisca.'), 6000)}; im.src = fileUrl(f); return}
  if (x.id === 'map-show') {write('campaign/main', {activeMap: mapId()}, 'update'); toast(t('Els jugadors ja veuen aquest mapa.')); return}
  if (x.id === 'map-dup') {const id = newId(), m = clone(getDoc('maps/' + mapId())); m.name = (m.name || '') + ' ' + t('(còpia)'); m.created = Date.now(); write('maps/' + id, m); mp.sel = id; lsSet('qm-map', id); setTimeout(renderMap, 40); return}
  if (x.id === 'map-del') {armed(x, () => {const id = mapId(); del('maps/' + id); if (camp().activeMap === id) write('campaign/main', {activeMap: null}, 'update'); mp.sel = null; setTimeout(renderMap, 40)}, t('Prem de nou per a esborrar')); return}
  if (x.id === 'map-clear') {armed(x, () => {const doc = beginEdit(); doc.tiles = {}; doc.walls = {}; doc.labels = []; commitEdit(); drawSoon()}, t('Segur? Prem de nou')); return}
  if (x.id === 'map-export') {exportMap(); return}
  if (x.id === 'bg-add' || x.id === 'bg-change') {const f = await pickImage('map'); if (!f) return; const doc = beginEdit(); doc.bg = {file: f, x: 0, y: 0, w: doc.cols, op: 1, ...(x.id === 'bg-change' ? {x: doc.bg?.x || 0, y: doc.bg?.y || 0, w: doc.bg?.w || doc.cols} : {})}; commitEdit(); setTimeout(renderMapSide, 50); return}
  if (x.id === 'bg-del') {const doc = beginEdit(); doc.bg = null; commitEdit(); setTimeout(renderMapSide, 50); return}
  if (x.id === 'bg-fit') {const m = mapDoc(), im = m.bg?.file && bgImage(m.bg.file); if (!im) return; const doc = beginEdit(); const w = doc.bg.w || doc.cols; doc.cols = Math.max(4, Math.round(w + (doc.bg.x || 0))); doc.rows = Math.max(4, Math.round(w * im.naturalHeight / im.naturalWidth + (doc.bg.y || 0))); commitEdit(); fitView(); setTimeout(renderMapSide, 50); return}
  if (x.id === 'walls-auto') {autoWalls(); return}
  if (x.id === 'fog-all' || x.id === 'fog-none') {const doc = beginEdit(); doc.fog = {on: true, rev: {}}; if (x.id === 'fog-all') for (let yy = 0; yy < doc.rows; yy++) for (let xx = 0; xx < doc.cols; xx++) doc.fog.rev[xx + ',' + yy] = 1; commitEdit(); drawSoon(); setTimeout(renderMapSide, 50); return}
  if (x.id === 'aoe-clear') {for (const a of aoes()) if (dm() || a.ownerId === S.uid) del(`maps/${mapId()}/aoe/${a.id}`); setTimeout(renderMapSide, 50); return}
  if (x.id === 'tok-add') {tokenModal(); return}
  if (x.id === 'tok-monster') {srdPicker({kinds: ['criatura'], title: t('Posar monstres al mapa i al combat'), withCount: true, onPick: (en, n) => addMonsters(en, n, {map: true})}); return}
  if (x.id === 'tok-party') {let n = 0; for (const c of chars().filter(c => !c.npc)) {if (!tokens().some(tk => tk.charId === c.id)) {addToken({name: c.name, color: c.color, charId: c.id}); n++}} toast(n ? t('He posat {n} al mapa.', {n: pl(n, 'personatge', 'personatges')}) : t('Tot el grup ja és al mapa.')); return}
  if (x.id === 'tok-del' && mp.tokSel) {del(`maps/${mapId()}/tokens/${mp.tokSel}`); mp.tokSel = null; setTimeout(renderMapSide, 50); return}
  if (x.id === 'tok-cmb' && mp.tokSel) {const tk = tokens().find(q => q.id === mp.tokSel); if (!tk) return; if (tk.monster) await loadSRD(); const cc = tk.monster && srdGet('criatura', tk.monster)?.c || {};
    const cid = combatAdd({name: tk.name, kind: 'npc', monster: tk.monster || null, hp: cc.pg || 10, maxHp: cc.pg || 10, ac: cc.ca || 10, initMod: cc.iniciativa ?? 0, hidden: !!tk.hidden}); write(`maps/${mapId()}/tokens/${tk.id}`, {cmbId: cid}, 'update'); toast(t('{n} és al combat.', {n: tk.name})); return}
  if (x.id === 'tok-stats' && mp.tokSel) {const tk = tokens().find(q => q.id === mp.tokSel); if (tk?.monster) showEntry('criatura', tk.monster); return}
});
document.addEventListener('input', e => {
  if (st.tab !== 'mapa') return; const x = e.target;
  if (x.dataset.mf) {mapFieldInput(x); return}
  if (x.dataset.tf === 'name' && mp.tokSel) {tokNameInput(x.value); return}
  if (x.id === 'aoe-size') {mp.aoeSize = Math.max(1.5, +x.value || 1.5)}
});
const mapFieldInput = debounce(x => {
  const f = x.dataset.mf; let v = x.type === 'number' || x.type === 'range' ? +x.value : x.value;
  if (f === 'cols' || f === 'rows') v = clamp(Math.round(v) || 4, 4, 150);
  write('maps/' + mapId(), setPath({}, f, v), 'update'); if (f === 'cols' || f === 'rows') {setTimeout(() => {fitView(); drawSoon()}, 60)}
}, 250);
const tokNameInput = debounce(v => write(`maps/${mapId()}/tokens/${mp.tokSel}`, {name: v}, 'update'), 350);
document.addEventListener('change', e => {
  if (st.tab !== 'mapa') return; const x = e.target;
  if (x.id === 'map-pick') {mp.sel = x.value; lsSet('qm-map', x.value); mp.tokSel = null; mp.undo = []; renderMap(); return}
  if (x.id === 'brush-size') {mp.brush = +x.value; return}
  if (x.id === 'fog-on') {const doc = beginEdit(); doc.fog = {rev: {}, ...(doc.fog || {}), on: x.checked}; commitEdit(); drawSoon(); updateHint(); return}
  if (x.id === 'fog-auto') {write('maps/' + mapId(), {fog: x.checked ? {auto: true, on: true, dist: mapDoc()?.fog?.dist || 18} : {auto: false}}, 'update'); setTimeout(() => {renderMapSide(); updateHint()}, 60);
    if (x.checked) toast(t('Boira automàtica activada: es revelarà el que veuen els personatges quan es moguen.'), 5000); return}
  if (x.id === 'fog-dist') {write('maps/' + mapId(), {fog: {dist: clamp(+x.value || 18, 1.5, 45)}}, 'update'); return}
  if (x.dataset.mfb) {write('maps/' + mapId(), setPath({}, x.dataset.mfb, x.checked), 'update'); return}
  if (x.dataset.tf === 'size' && mp.tokSel) {write(`maps/${mapId()}/tokens/${mp.tokSel}`, {size: +x.value}, 'update'); return}
  if (x.dataset.tfb && mp.tokSel) {write(`maps/${mapId()}/tokens/${mp.tokSel}`, {[x.dataset.tfb]: x.checked}, 'update'); return}
});
function centerOn(x, y) {const v = view(), d = devicePixelRatio || 1; if (!mp.cv) return; v.x = mp.cv.width / d / 2 - (x + .5) * CS * v.z; v.y = mp.cv.height / d / 2 - (y + .5) * CS * v.z; v.fit = false}
function tokenModal() {
  openModal(`<h2>${esc(t('Fitxa nova'))}</h2><label class="field"><span>${esc(t('Nom'))}</span><input class="in" id="tk-n" autofocus></label>
    <label class="field"><span>${esc(t('Mida'))}</span><select class="in" id="tk-s">${[[1, L('Mitjana')], [2, L('Gran')], [3, L('Enorme')], [4, L('Colossal')]].map(([n, lb]) => `<option value="${n}">${esc(t(lb))}</option>`).join('')}</select></label>
    <label class="field"><span>${esc(t('Quantes'))}</span><input class="in" id="tk-c" type="number" min="1" max="20" value="1"></label>
    <label class="check"><input type="checkbox" id="tk-h"> ${esc(t('Amagada als jugadors'))}</label>
    <div class="foot"><button class="btn" id="tk-x">${esc(t('Cancel·lar'))}</button><button class="btn pri" id="tk-ok">${esc(t('Afegir'))}</button></div>`, (m, close) => {
    $('#tk-x', m).onclick = close;
    $('#tk-ok', m).onclick = () => {const n = $('#tk-n', m).value.trim() || t('Fitxa'), c = clamp(+$('#tk-c', m).value || 1, 1, 20), col0 = pick(TOKEN_COLORS);
      for (let i = 1; i <= c; i++) addToken({name: c > 1 ? `${n} ${i}` : n, size: +$('#tk-s', m).value, hidden: $('#tk-h', m).checked, color: col0}); close()};
  });
}
/** Afig n monstres del SRD: al combat i/o al mapa. */
function addMonsters(en, n, {map = false, combat = true, hidden = false} = {}) {
  const cc = en.c || {}, size = SIZE_CELLS[(cc.tamano || [])[0]] || 1, col0 = pick(TOKEN_COLORS);
  const existing = (getDoc('combat/main')?.list || []).filter(c => c.monster === en.id).length + tokens().filter(tk => tk.monster === en.id).length;
  for (let i = 1; i <= n; i++) {
    const num = n > 1 || existing ? ` ${existing + i}` : '';
    const name = en.e.nombre + num;
    let cid = null;
    if (combat) {const hp = cc.pg || 10; cid = combatAdd({name, kind: 'npc', monster: en.id, hp, maxHp: hp, ac: cc.ca || 10, initMod: cc.iniciativa ?? modOf(cc.car?.[1]), hidden})}
    if (map && mapId()) addToken({name, size, color: col0, monster: en.id, cmbId: cid, hidden});
  }
  toast(t('Afegit: {x}', {x: n > 1 ? `${n} × ${en.e.nombre}` : en.e.nombre}));
}
function exportMap() {
  const m = mapDoc(); if (!m) return;
  const cv = document.createElement('canvas'); cv.width = m.cols * 40; cv.height = m.rows * 40;
  draw({cv, ctx: cv.getContext('2d'), v: {x: 0, y: 0, z: 40 / CS}});
  try {const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = (m.name || 'mapa') + '.png'; a.click()} catch (e) {toast(t("No s'ha pogut guardar la imatge."))}
}
