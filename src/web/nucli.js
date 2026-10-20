/*
 * Quadern del Mestre — nucli: utilitats, idioma, tema, dades compartides, finestres i pestanyes.
 * Llicència GPL-3.0 o posterior.
 */
/* ================= utilitats ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function deepMerge(a, b) {if (!isObj(a) || !isObj(b)) return clone(b); const o = {...a}; for (const k in b) o[k] = (isObj(b[k]) && isObj(a[k])) ? deepMerge(a[k], b[k]) : clone(b[k]); return o}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const newId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const rnd = n => 1 + Math.floor(Math.random() * n);
const pick = a => a[Math.floor(Math.random() * a.length)];
const sgn = n => (n >= 0 ? '+' : '−') + Math.abs(n);
const modOf = score => Math.floor(((+score || 10) - 10) / 2);
function lsGet(k) {try {return localStorage.getItem(k)} catch (e) {return null}}
function lsSet(k, v) {try {localStorage.setItem(k, v)} catch (e) {}}
const debounce = (fn, ms) => {let tm; return (...a) => {clearTimeout(tm); tm = setTimeout(() => fn(...a), ms)}};

/* ================= idioma ================= */
// Les claus són el text en valencià; I18N.es té la traducció al castellà.
let LANG = lsGet('qm-lang') || (/^es/i.test(navigator.language || '') ? 'es' : 'val');
function t(k, v) {
  let s = (LANG === 'es' && I18N.es[k] != null) ? I18N.es[k] : k;
  if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => v[n] == null ? m : T(v[n]));
  return s;
}
function T(x) {if (x == null) return ''; if (typeof x === 'number') return String(x); if (typeof x === 'object' && x.k != null) return t(x.k, x.v); return t(String(x))}
const M = (k, v) => v ? {k, v} : {k};
const pl = (n, a, b) => `${n} ${t(n === 1 ? a : b)}`;
function ago(ts) {const s = (Date.now() - ts) / 1000; if (s < 45) return t('ara'); if (s < 3600) return t('fa {n} min', {n: Math.round(s / 60)}); if (s < 86400) return t('fa {n} h', {n: Math.round(s / 3600)}); return new Date(ts).toLocaleDateString(LANG === 'es' ? 'es' : 'ca')}
const fmtDate = ts => new Date(ts).toLocaleDateString(LANG === 'es' ? 'es' : 'ca', {day: 'numeric', month: 'long', year: 'numeric'});
function applyStatic() {
  document.documentElement.lang = LANG === 'es' ? 'es' : 'ca';
  document.title = t('Quadern del Mestre');
  $$('[data-i18n]').forEach(el => {el.textContent = t(el.dataset.i18n)});
  $$('[data-i18n-ph]').forEach(el => {el.placeholder = t(el.dataset.i18nPh); el.setAttribute('aria-label', t(el.dataset.i18nPh))});
  $$('[data-i18n-aria]').forEach(el => {el.setAttribute('aria-label', t(el.dataset.i18nAria))});
}
function setLang(l) {if (l === LANG) return; LANG = l; lsSet('qm-lang', l); applyStatic(); renderAll()}
const langSwitch = () => `<span class="langsw" role="group" aria-label="${esc(t('Idioma'))}"><button class="chip${LANG === 'val' ? ' dm' : ''}" data-lang="val" aria-pressed="${LANG === 'val'}">VAL</button><button class="chip${LANG === 'es' ? ' dm' : ''}" data-lang="es" aria-pressed="${LANG === 'es'}">CAS</button></span>`;
document.addEventListener('click', e => {const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang)});

/* ================= tema ================= */
let THEME = lsGet('qm-theme') || 'auto';
function applyTheme() {if (THEME === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', THEME)}
applyTheme();
const THEME_NEXT = {auto: 'light', light: 'dark', dark: 'auto'};
const THEME_LBL = {auto: L('Tema: automàtic'), light: L('Tema: clar'), dark: L('Tema: fosc')};
const THEME_ICO = {auto: '◐', light: '☀', dark: '☾'};
const themeBtn = () => `<button class="chip ico" id="theme" title="${esc(t(THEME_LBL[THEME]))}" aria-label="${esc(t(THEME_LBL[THEME]))}">${THEME_ICO[THEME]}</button>`;
document.addEventListener('click', e => {if (!e.target.closest('#theme')) return; THEME = THEME_NEXT[THEME]; lsSet('qm-theme', THEME); applyTheme(); renderHeader(); toast(t(THEME_LBL[THEME])); if (TABS[st.tab]?.themeChanged) TABS[st.tab].themeChanged()});

/* ================= avisos ================= */
let toastT;
function toast(m, ms = 3500) {const el = $('#toast'); el.textContent = m; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, ms)}
function armed(btn, fn, label) {
  if (btn.dataset.armed) {delete btn.dataset.armed; fn(); return}
  btn.dataset.armed = '1'; const old = btn.textContent; btn.textContent = label || t('Prem de nou per a confirmar');
  setTimeout(() => {if (btn.isConnected && btn.dataset.armed) {delete btn.dataset.armed; btn.textContent = old}}, 4000);
}
function showBanner(x, kind) {const b = $('#banner'); b.textContent = x; b.hidden = !x; b.classList.toggle('off', kind === 'off')}

/* ================= dades compartides ================= */
const S = {uid: null, token: null, camp: null, dm: false, es: null};
const st = {tab: lsGet('qm-tab') || 'mapa', loaded: false};
const mem = new Map(), memL = new Set();
const parentOf = p => p.split('/').slice(0, -1).join('/');
const dm = () => S.dm;
function memNotify(path) {for (const l of [...memL]) {if (l.doc ? l.path === path : (path.startsWith(l.path + '/'))) l.fire(path)} docChanged(path)}
function watchDoc(path, cb) {const l = {doc: true, path, fire: () => {const d = mem.get(path); cb(d ? clone(d) : null)}}; memL.add(l); setTimeout(l.fire, 0)}
function watchPrefix(prefix, cb) {const l = {doc: false, path: prefix, fire: p => cb(p)}; memL.add(l)}
const getDoc = p => mem.get(p) || null;
/** Fills directes d'una col·lecció: col('characters') → [{id, ...doc}] */
function col(prefix) {const n = prefix.split('/').length + 1, out = []; for (const [p, d] of mem) if (p.startsWith(prefix + '/') && p.split('/').length === n) out.push({...d, id: p.split('/').pop()}); return out}
const userName = uid => uid === S.uid ? t('tu') : (mem.get('users/' + uid)?.name || t('algú'));
const camp = () => mem.get('campaign/main') || {};

async function doWrite(path, mode, data) {
  if (mode === 'delete') {mem.delete(path); if (path.split('/').length === 2 && path.startsWith('maps/')) for (const k of [...mem.keys()]) if (k.startsWith(path + '/')) {mem.delete(k); memNotify(k)}}
  else if (mode === 'set') mem.set(path, clone(data)); else mem.set(path, deepMerge(mem.get(path) || {}, data));
  memNotify(path);
  if (!S.token) return;
  let r;
  try {r = await fetch('api/write', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Quadern-Token': S.token}, body: JSON.stringify({path, mode, data, camp: S.camp})})} catch (e) {throw {code: 'net'}}
  if (r.status === 401) {lsSet('qm-token', ''); location.reload(); return}
  if (r.status === 409) {location.reload(); return}
  if (r.status === 403) {toast(t('No tens permís per a canviar això.')); throw {code: 'perm'}}
  if (!r.ok) throw {code: 'http'};
}
const wq = new Map();
function write(path, data, mode = 'set') {
  let q = wq.get(path); if (!q) {q = {busy: false, next: null}; wq.set(path, q)}
  if (q.next && q.next.mode === 'update' && mode === 'update') q.next.data = deepMerge(q.next.data, data);
  else q.next = {mode, data: clone(data)};
  if (!q.busy) flush(path, q);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** Canvis que no han arribat al servidor perquè no hi ha connexió: es tornen a enviar fins que arriben. */
const pendingNet = new Set();
/** Si mentre s'esperava hi ha un canvi nou al mateix document, s'ajunten (el més nou mana). */
function combineWrites(old, nw) {
  if (nw.mode !== 'update') return nw;
  if (old.mode === 'update') return {mode: 'update', data: deepMerge(old.data, nw.data)};
  if (old.mode === 'set') return {mode: 'set', data: deepMerge(old.data, nw.data)};
  return nw;
}
async function flush(path, q) {
  q.busy = true;
  while (q.next) {
    const job = q.next; q.next = null;
    try {await doWrite(path, job.mode, job.data); if (pendingNet.delete(path) && !pendingNet.size) netBack()} catch (e) {
      if (e && e.code === 'perm') continue;
      if (e && e.code === 'net') {pendingNet.add(path); netLost(); await sleep(2500); q.next = q.next ? combineWrites(job, q.next) : job; continue}
      await sleep(500);
      try {await doWrite(path, job.mode, job.data)} catch (e2) {if (!e2 || e2.code !== 'perm') toast(t("No s'ha pogut guardar. Comprova la connexió amb el servidor."))}
    }
  }
  q.busy = false;
}
const del = path => write(path, null, 'delete');
async function api(path, body) {
  const opt = body ? {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Quadern-Token': S.token || ''}, body: JSON.stringify(body)} : {headers: {'X-Quadern-Token': S.token || ''}, cache: 'no-store'};
  const r = await fetch(path, opt); const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(t(d.error || "No s'ha pogut fer.")); return d;
}
const fileUrl = name => name ? `fitxer/${encodeURIComponent(name)}?t=${encodeURIComponent(S.token || '')}` : '';
async function upload(file, kind) {
  if (!file) return null;
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {toast(t('Només es poden pujar imatges JPG, PNG, WebP o GIF.')); return null}
  if (file.size > 20 * 1024 * 1024) {toast(t('La imatge és massa gran (màxim 20 MB).')); return null}
  toast(t('Pujant la imatge…'), 20000);
  const r = await fetch('api/upload?kind=' + kind, {method: 'POST', headers: {'Content-Type': file.type, 'X-Quadern-Token': S.token}, body: file});
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {toast(t(d.error || "No s'ha pogut pujar la imatge.")); return null}
  $('#toast').hidden = true; return d.file;
}
function pickImage(kind) {
  return new Promise(res => {const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp,image/gif';
    inp.onchange = async () => res(await upload(inp.files[0], kind)); inp.click()});
}

/* ================= compendi SRD (es carrega quan cal) ================= */
let SRD = null, srdP = null;
function loadSRD() {
  if (SRD) return Promise.resolve(SRD);
  if (!srdP) srdP = fetch('api/srd').then(r => r.json()).then(d => {
    const by = {}, idx = {};
    for (const e of d.entradas) {(by[e.k] = by[e.k] || []).push(e); idx[e.k + '/' + e.id] = e}
    for (const k in by) by[k].sort((a, b) => a.e.nombre.localeCompare(b.e.nombre, 'es'));
    SRD = {by, idx, names: d.nombres, attr: d.atribucion}; return SRD;
  }).catch(e => {srdP = null; throw e});
  return srdP;
}
const srdGet = (k, id) => SRD && SRD.idx[k + '/' + id];

/* ================= finestres ================= */
function openModal(html, onMount, opts = {}) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-back" id="mback"><div class="modal${opts.wide ? ' wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  const back = $('#mback'); const close = () => {root.innerHTML = ''; document.removeEventListener('keydown', onKey); opts.onClose && opts.onClose()};
  const onKey = e => {if (e.key === 'Escape') close()}; document.addEventListener('keydown', onKey);
  back.addEventListener('mousedown', e => {if (e.target === back) close()});
  onMount && onMount($('.modal', root), close);
  const f = $('.modal [autofocus]', root) || $('.modal input:not([type=checkbox]),.modal button', root); f && f.focus();
  return close;
}
function confirmModal(title, text, okLabel, fn) {
  openModal(`<h2>${esc(title)}</h2><p style="margin:0">${text}</p><div class="foot"><button class="btn" id="cm-no">${esc(t('Cancel·lar'))}</button><button class="btn pri danger-pri" id="cm-ok">${esc(okLabel)}</button></div>`,
    (m, close) => {$('#cm-no', m).onclick = close; $('#cm-ok', m).onclick = () => {close(); fn()}});
}

/* ================= pestanyes ================= */
// Cada secció es registra amb TABS[id] = {label, dmOnly, render(), refresh?(path), onLeave?()}
const TABS = {};
const TAB_ORDER = ['mapa', 'personatges', 'combat', 'compendi', 'diari', 'master', 'partides'];
const tabAllowed = id => TABS[id] && (!TABS[id].dmOnly || dm());
function renderTabs() {
  $('#tabs').innerHTML = TAB_ORDER.filter(tabAllowed).map(id => `<button class="tab" role="tab" data-tab="${id}" aria-selected="${id === st.tab}">${esc(t(TABS[id].label))}</button>`).join('');
}
function goTab(id) {
  if (!tabAllowed(id)) id = 'mapa';
  if (st.tab !== id && TABS[st.tab]?.onLeave) TABS[st.tab].onLeave();
  st.tab = id; lsSet('qm-tab', id); renderTabs(); renderTab();
}
document.addEventListener('click', e => {const x = e.target.closest('#tabs [data-tab]'); if (x) goTab(x.dataset.tab)});
function renderTab() {if (!st.loaded) return; if (!tabAllowed(st.tab)) st.tab = 'mapa'; const tb = TABS[st.tab]; $('#main').dataset.tab = st.tab; tb.render()}
let pendingRender = false;
const editing = () => {const a = document.activeElement; return a && a.closest('#main') && a.matches('input:not([type=checkbox]):not([type=range]),textarea,select,[contenteditable]')};
function docChanged(path) {
  if (!st.loaded) return;
  if (path === 'campaign/main') renderHeader();
  if (path.startsWith('rolls/')) {renderLog(); return}
  const tb = TABS[st.tab];
  if (tb.refresh) {tb.refresh(path); return}
  if (tb.watch && !tb.watch.some(p => path.startsWith(p))) return;
  if ($('.modal') && !tb.refreshUnderModal) {pendingRender = true; return}
  if (editing()) {pendingRender = true; return}
  scheduleRender();
}
let rq = 0;
function scheduleRender() {if (rq) return; rq = requestAnimationFrame(() => {rq = 0; pendingRender = false; renderTab()})}
document.addEventListener('focusout', () => setTimeout(() => {if (pendingRender && !editing() && !$('.modal')) scheduleRender()}, 50));
new MutationObserver(() => {if (pendingRender && !$('.modal') && !editing()) scheduleRender()}).observe($('#modal-root'), {childList: true});

function renderHeader() {
  const n = $('#camp-name'); if (document.activeElement !== n) n.value = camp().name || ''; n.disabled = !dm();
  const me = mem.get('users/' + S.uid)?.name || '';
  $('#who').innerHTML = langSwitch() + themeBtn() +
    (S.token ? `<button class="chip ico" id="invite" title="${esc(t('Convida a la taula'))}" aria-label="${esc(t('Convida a la taula'))}">${QR_ICON}</button><span class="chip${dm() ? ' dm' : ''}">${esc(me)}${dm() ? ' · ' + esc(t('màster')) : ''}</span><button class="chip" id="logout">${esc(t('Eixir'))}</button>` : '');
}
function renderAll() {renderHeader(); renderTabs(); renderTab(); renderLog(); applyDiceStatic()}
$('#camp-name').addEventListener('input', debounce(e => {if (dm()) write('campaign/main', {name: e.target.value}, 'update')}, 500));
document.addEventListener('click', e => {if (e.target.id === 'logout') armed(e.target, () => {lsSet('qm-token', ''); location.reload()}, t('Segur? Prem de nou'))});

/* ================= convidar amb QR ================= */
const QR_ICON = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="currentColor"><path d="M1 1h6v6H1zm1.5 1.5v3h3v-3zM9 1h6v6H9zm1.5 1.5v3h3v-3zM1 9h6v6H1zm1.5 1.5v3h3v-3zM9 9h2v2H9zm2 2h2v2h-2zm2-2h2v2h-2zm-4 4h2v2H9zm4 0h2v2h-2z"/></svg>';
async function inviteModal() {
  let d; try {d = await api('api/invite')} catch (_) {toast(t('No es pot contactar amb el servidor.')); return}
  const list = d.list || []; let i = 0;
  const draw = m => {$('#qr-box', m).innerHTML = list[i].svg; $('#qr-url', m).textContent = list[i].url; $$('[data-qri]', m).forEach(b => b.setAttribute('aria-pressed', +b.dataset.qri === i))};
  openModal(`<h2>${esc(t('Convida a la taula'))}</h2>
    <p class="muted" style="margin:0">${esc(t("Escaneja el codi amb la càmera del mòbil, o escriu l'adreça al navegador. Heu d'estar a la mateixa wifi."))}</p>
    <div class="qr-box" id="qr-box"></div><p class="qr-url" id="qr-url"></p>
    ${list.length > 1 ? `<div class="row" style="justify-content:center"><span class="small muted">${esc(t('Si no funciona, prova una altra adreça:'))}</span>${list.map((x, j) => `<button class="btn sm" data-qri="${j}">${j + 1}</button>`).join('')}</div>` : ''}
    <div class="foot"><button class="btn pri" id="qr-close">${esc(t('Tancar'))}</button></div>`, (m, close) => {
    if (!list.length) $('#qr-box', m).textContent = t('No he trobat cap adreça de xarxa.'); else draw(m);
    m.addEventListener('click', e => {const b = e.target.closest('[data-qri]'); if (b) {i = +b.dataset.qri; draw(m)} if (e.target.id === 'qr-close') close()});
  });
}
document.addEventListener('click', e => {if (e.target.closest('#invite')) inviteModal()});

/* ================= text del SRD ================= */
// Els textos del SRD porten <b>, <i> i <br>: deixem passar només eixes etiquetes.
const srdHtml = s => esc(s).replace(/&lt;(\/?)(b|i|br|em|strong)&gt;/g, '<$1$2>');
function blocksHtml(bl) {
  return (bl || []).map(b => {
    if (b.t === 'p' || b.t === 'nota' || b.t === 'formula') return `<p>${srdHtml(b.txt)}</p>`;
    if (b.t === 'li') return `<ul><li>${srdHtml(b.txt)}</li></ul>`;
    if (b.t === 'h') return `<h4>${srdHtml(b.txt)}</h4>`;
    if (b.t === 'campos') return `<dl class="srd-dl">${(b.filas || []).map(r => `<dt>${srdHtml(r[0])}</dt><dd>${srdHtml(r[1])}</dd>`).join('')}</dl>`;
    if (b.t === 'tabla') {const rows = b.filas || []; const head = b.sin_cabecera || b.vertical ? [] : [rows[0]]; const body = b.sin_cabecera || b.vertical ? rows : rows.slice(1);
      return `<div class="srd-tw"><table class="srd-t">${b.titulo ? `<caption>${srdHtml(b.titulo)}</caption>` : ''}${head.map(r => `<tr>${r.map(c => `<th>${srdHtml(c)}</th>`).join('')}</tr>`).join('')}${body.map(r => `<tr>${r.map((c, i) => b.vertical && i === 0 ? `<th>${srdHtml(c)}</th>` : `<td>${srdHtml(c)}</td>`).join('')}</tr>`).join('')}</table></div>`}
    if (b.t === 'columnas' || b.t === 'recuadro') return `<div class="srd-box">${b.titulo ? `<h4>${srdHtml(b.titulo)}</h4>` : ''}${blocksHtml(b.bloques)}${(b.items || []).map(x => `<p>${srdHtml(x)}</p>`).join('')}</div>`;
    if (b.t === 'ficha') return `<div class="srd-box"><h4>${srdHtml(b.nombre)}</h4><p class="muted">${srdHtml(b.tipo || '')}</p><p>${b.ca ? `<b>CA</b> ${srdHtml(b.ca)} ` : ''}${b.pg ? `<b>PG</b> ${srdHtml(b.pg)} ` : ''}${b.vel ? `<b>${esc(t('Vel.'))}</b> ${srdHtml(b.vel)}` : ''}</p>${(b.rasgos || []).map(r => `<p><b>${srdHtml(r[0])}</b> ${srdHtml(r[1])}</p>`).join('')}${(b.secciones || []).map(sc => `<h4>${srdHtml(sc.titulo)}</h4>${sc.items.map(r => `<p><b>${srdHtml(r[0])}.</b> ${srdHtml(r[1])}</p>`).join('')}`).join('')}</div>`;
    return b.txt ? `<p>${srdHtml(b.txt)}</p>` : '';
  }).join('').replace(/<\/ul><ul>/g, '');
}
