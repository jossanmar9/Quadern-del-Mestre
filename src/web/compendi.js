/*
 * Quadern del Mestre — compendi del SRD 5.2.1 (bestiari, conjurs, objectes, estats, equip, regles),
 * monstres propis i preparador d'encontres.
 * El text del SRD és la traducció oficial al castellà de Wizards of the Coast (CC-BY 4.0).
 * Llicència GPL-3.0 o posterior.
 */
const cp = {cat: lsGet('qm-cp-cat') || 'criatura', q: '', sel: null, f: {}, enc: []};
const CP_CATS = [['criatura', L('Bestiari'), ['criatura'], true], ['conjuro', L('Conjurs'), ['conjuro']], ['objeto', L('Objectes màgics'), ['objeto']],
  ['estado', L('Estats'), ['estado']], ['equipo', L('Equip'), ['arma', 'armadura', 'herramienta', 'equipo']],
  ['personaje', L('Personatges'), ['clase', 'subclase', 'especie', 'trasfondo', 'dote']], ['regla', L('Regles'), ['regla', 'glosario', 'veneno', 'trampa']],
  ['propis', L('Monstres propis'), [], true]];
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const crLabel = cr => String(cr ?? '');
const ownMonsters = () => col('dmmonsters').sort((a, b) => (a.name || '').localeCompare(b.name || ''));

TABS.compendi = {label: L('Compendi'), watch: ['dmmonsters'], render: renderCompendi};
function renderCompendi() {
  if (!SRD) {$('#main').innerHTML = `<div class="empty"><b>${esc(t('Obrint el compendi…'))}</b>${esc(t('Carregant el SRD 5.2.1.'))}</div>`; loadSRD().then(() => {if (st.tab === 'compendi') renderCompendi()}).catch(() => toast(t('No s\'ha pogut carregar el compendi.'))); return}
  const cats = CP_CATS.filter(c => !c[3] || dm()); if (!cats.some(c => c[0] === cp.cat)) cp.cat = 'conjuro';
  const cat = cats.find(c => c[0] === cp.cat);
  $('#main').innerHTML = `<div class="cp">
    <nav class="subtabs cp-cats" role="tablist">${cats.map(([id, lb]) => `<button role="tab" data-cpcat="${id}" aria-selected="${id === cp.cat}">${esc(t(lb))}</button>`).join('')}</nav>
    <div class="cp-body"><div class="cp-list-wrap">
      <div class="cp-search"><input class="in" id="cp-q" type="search" placeholder="${esc(t('Cerca…'))}" value="${esc(cp.q)}" aria-label="${esc(t('Cerca'))}">${cpFilters(cat[0])}</div>
      <ol class="cp-list" id="cp-list"></ol></div>
      <div class="cp-detail" id="cp-detail"></div>
      ${dm() && cp.cat === 'criatura' ? `<aside class="cp-enc" id="cp-enc"></aside>` : ''}</div>
    <p class="srd-attr small muted">${esc(t('El text del compendi és la traducció oficial al castellà del SRD 5.2.1.'))} ${esc(SRD.attr || '')}</p></div>`;
  drawCpList(); drawCpDetail(); drawEnc();
}
function cpFilters(cat) {
  const f = cp.f[cat] || {};
  if (cat === 'criatura') return `<div class="row"><select class="in" data-cpf="type" aria-label="${esc(t('Tipus'))}"><option value="">${esc(t('Tots els tipus'))}</option>${Object.entries(CREATURE_TYPES).map(([k, v]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${esc(t(v))}</option>`).join('')}</select>
    <select class="in" data-cpf="cr" aria-label="${esc(t('Valor de desafiament'))}"><option value="">${esc(t('Qualsevol VD'))}</option>${['0-1/2', '1-2', '3-4', '5-8', '9-12', '13-30'].map(r => `<option ${f.cr === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>`;
  if (cat === 'conjuro') return `<div class="row"><select class="in" data-cpf="lvl" aria-label="${esc(t('Nivell'))}"><option value="">${esc(t('Tots els nivells'))}</option>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<option value="${n}" ${f.lvl === String(n) ? 'selected' : ''}>${esc(n ? t('Nivell {n}', {n}) : t('Trucs'))}</option>`).join('')}</select>
    <select class="in" data-cpf="cls" aria-label="${esc(t('Classe'))}"><option value="">${esc(t('Totes les classes'))}</option>${CLASSES.filter(c => c[3]).map(([id, nm]) => `<option value="${id}" ${f.cls === id ? 'selected' : ''}>${esc(t(nm))}</option>`).join('')}</select></div>`;
  if (cat === 'objeto') return `<div class="row"><select class="in" data-cpf="rar" aria-label="${esc(t('Raresa'))}"><option value="">${esc(t('Totes les rareses'))}</option>${Object.entries(RARITIES).map(([k, v]) => `<option value="${k}" ${f.rar === k ? 'selected' : ''}>${esc(t(v))}</option>`).join('')}</select></div>`;
  return '';
}
function cpEntries(cat) {
  const def = CP_CATS.find(c => c[0] === cat); const f = cp.f[cat] || {}, q = norm(cp.q);
  if (cat === 'propis') return ownMonsters().filter(m => !q || norm(m.name).includes(q)).map(m => ({k: 'own', id: m.id, e: {nombre: m.name}, own: m}));
  let list = def[2].flatMap(k => SRD.by[k] || []);
  if (q) list = list.filter(e => norm(e.e.nombre).includes(q) || norm(e.id).includes(q));
  if (cat === 'criatura') {
    if (f.type) list = list.filter(e => e.c?.tipo === f.type);
    if (f.cr) {const [a, b] = f.cr.split('-').map(crNum); list = list.filter(e => {const v = crNum(e.c?.vd); return v >= a && v <= b})}
  }
  if (cat === 'conjuro') {if (f.lvl !== undefined && f.lvl !== '') list = list.filter(e => String(e.c?.nivel) === f.lvl); if (f.cls) {const C = f.cls.charAt(0).toUpperCase() + f.cls.slice(1); list = list.filter(e => (e.c?.clases || []).includes(C))}}
  if (cat === 'objeto' && f.rar) list = list.filter(e => (e.c?.rarezas || []).includes(f.rar));
  if (def[2].length > 1) list = [...list].sort((a, b) => a.e.nombre.localeCompare(b.e.nombre, 'es'));
  return list;
}
function entrySub(e) {
  if (e.own) return `${esc(t('VD'))} ${esc(e.own.cr || '?')} · ${esc(e.own.type || '')}`;
  if (e.k === 'criatura') return `${esc(t('VD'))} ${esc(crLabel(e.c?.vd))} · ${esc(t(CREATURE_TYPES[e.c?.tipo] || e.c?.tipo || ''))}`;
  if (e.k === 'conjuro') return esc(e.c?.nivel ? t('Nivell {n}', {n: e.c.nivel}) : t('Truc')) + ' · ' + esc(t(SPELL_SCHOOLS[e.c?.escuela] || ''));
  if (e.k === 'objeto') return esc((e.c?.rarezas || []).map(r => t(RARITIES[r] || r)).join(', '));
  return esc(e.e.cabecera || e.e.categoria || '');
}
function drawCpList() {
  const ol = $('#cp-list'); if (!ol) return; const list = cpEntries(cp.cat);
  if (!cp.sel || !list.some(e => e.id === cp.sel)) cp.sel = list[0]?.id || null;
  ol.innerHTML = list.slice(0, 400).map(e => `<li><button class="cp-item" data-cpe="${esc(e.k)}/${esc(e.id)}" aria-current="${e.id === cp.sel}"><span class="t">${esc(e.e.nombre)}</span><span class="s">${entrySub(e)}</span></button></li>`).join('')
    + (cp.cat === 'propis' ? `<li><button class="cp-item add" id="own-new">+ ${esc(t('Monstre nou'))}</button></li>` : '')
    || `<li class="muted small">${esc(t('No hi ha resultats.'))}</li>`;
}
function drawCpDetail() {
  const box = $('#cp-detail'); if (!box) return;
  if (cp.cat === 'propis') {const m = cp.sel && getDoc('dmmonsters/' + cp.sel); box.innerHTML = m ? ownMonsterHtml({...m, id: cp.sel}, true) : `<div class="empty"><b>${esc(t('Els teus monstres'))}</b>${esc(t('Crea monstres o personatges propis amb les seues estadístiques. Només els veus tu.'))}</div>`; return}
  const def = CP_CATS.find(c => c[0] === cp.cat), e = def[2].map(k => srdGet(k, cp.sel)).find(Boolean);
  box.innerHTML = e ? entryHtml(e, {actions: dm()}) : '';
}
function entryHtml(en, {actions} = {}) {
  const e = en.e;
  if (en.k === 'criatura') return statBlock(en, actions);
  let head = '';
  if (en.k === 'conjuro') head = `<p class="srd-sub">${srdHtml(e.cabecera || '')}</p><dl class="srd-dl"><dt>${esc(t('Temps de llançament'))}</dt><dd>${srdHtml(e.tiempo || '')}</dd><dt>${esc(t('Abast'))}</dt><dd>${srdHtml(e.alcance || '')}</dd><dt>${esc(t('Components'))}</dt><dd>${srdHtml(e.comp || '')}</dd><dt>${esc(t('Durada'))}</dt><dd>${srdHtml(e.dur || '')}</dd></dl>`;
  else if (e.cabecera || e.categoria) head = `<p class="srd-sub">${srdHtml(e.cabecera || e.categoria)}</p>`;
  return `<article class="srd-entry"><h2>${esc(e.nombre)}</h2>${head}<div class="srd-txt">${blocksHtml(e.bloques)}</div></article>`;
}
const CAMP_LABELS = [['ca', L('CA')], ['ini', L('Iniciativa')], ['pg', L('PG')], ['vel', L('Velocitat')], ['hab', L('Habilitats')], ['vul', L('Vulnerabilitats')], ['res', L('Resistències')], ['inm', L('Immunitats')], ['equipo', L('Equip')], ['sen', L('Sentits')], ['idi', L('Idiomes')], ['vd', L('VD')]];
function statBlock(en, actions) {
  const e = en.e, f = e.campos || {};
  return `<article class="statblock"><h2>${esc(e.nombre)}</h2><p class="srd-sub">${srdHtml(e.tipo || '')}</p>
    <dl class="sb-top">${CAMP_LABELS.slice(0, 4).filter(([k]) => f[k]).map(([k, lb]) => `<dt>${esc(t(lb))}</dt><dd>${srdHtml(f[k])}</dd>`).join('')}</dl>
    <div class="sb-ab">${(e.car || []).map(([ab, sc, md, sv]) => `<div><b>${esc(ab)}</b><span>${sc}</span><small>${esc(md)} / ${esc(sv)}</small></div>`).join('')}</div>
    <dl class="sb-top">${CAMP_LABELS.slice(4).filter(([k]) => f[k]).map(([k, lb]) => `<dt>${esc(t(lb))}</dt><dd>${srdHtml(f[k])}</dd>`).join('')}</dl>
    ${(e.secciones || []).map(sc => `<h3>${srdHtml(sc.titulo)}</h3>${sc.intro ? `<p class="small">${srdHtml(sc.intro)}</p>` : ''}${sc.items.map(it => `<div class="sb-item"><b>${srdHtml(it.nombre)}.</b> ${blocksHtml(it.bloques).replace(/^<p>/, '')}</div>`).join('')}`).join('')}
    ${e.bloques?.length ? `<div class="srd-txt">${blocksHtml(e.bloques)}</div>` : ''}
    ${actions ? `<div class="row sb-act"><label class="check">${esc(t('Quants'))} <input class="in" type="number" min="1" max="20" value="1" id="sb-n" style="width:64px"></label><button class="btn sm pri" data-sb="cmb" data-id="${esc(en.id)}">${esc(t('Al combat'))}</button><button class="btn sm" data-sb="both" data-id="${esc(en.id)}">${esc(t('Al combat i al mapa'))}</button><button class="btn sm" data-sb="enc" data-id="${esc(en.id)}">${esc(t('A l\'encontre'))}</button></div>` : ''}
  </article>`;
}
function showEntry(k, id) {
  loadSRD().then(() => {const en = srdGet(k, id); if (!en) return; openModal(`${entryHtml(en, {actions: false})}<div class="foot"><button class="btn pri" id="se-x">${esc(t('Tancar'))}</button></div>`, (m, close) => {$('#se-x', m).onclick = close}, {wide: true})});
}
/* ---- encontre ---- */
function drawEnc() {
  const box = $('#cp-enc'); if (!box) return;
  const pcs = chars().filter(c => !c.npc && !c.secret), lvls = pcs.map(c => clamp(+c.level || 1, 1, 20));
  const b = [0, 1, 2].map(i => lvls.reduce((s, l) => s + XP_BUDGET[l][i], 0));
  const xp = cp.enc.reduce((s, x) => s + (srdGet('criatura', x.id)?.c?.px || 0) * x.n, 0);
  const lvl = !xp ? '' : xp <= b[0] ? L('Baixa') : xp <= b[1] ? L('Moderada') : xp <= b[2] ? L('Alta') : L('Per damunt d\'alta');
  const pct = b[2] ? clamp(xp / b[2], 0, 1.2) : 0;
  box.innerHTML = `<h3>${esc(t('Preparar un encontre'))}</h3>
    <p class="small muted">${lvls.length ? esc(t('Grup: {n} (nivells {l})', {n: pl(lvls.length, 'personatge', 'personatges'), l: lvls.join(', ')})) : esc(t('Crea els personatges del grup per a calcular la dificultat.'))}</p>
    <ul class="enc-list">${cp.enc.map(x => {const en = srdGet('criatura', x.id); return `<li><span>${x.n} × ${esc(en?.e.nombre || x.id)}</span><span class="mono small">${(en?.c?.px || 0) * x.n} ${esc(t('PX'))}</span><button class="btn sm" data-encn="${esc(x.id)}:-1">−</button><button class="btn sm" data-encn="${esc(x.id)}:1">+</button></li>`}).join('') || `<li class="muted small">${esc(t('Afig monstres amb el botó «A l\'encontre».'))}</li>`}</ul>
    ${lvls.length ? `<div class="enc-bar"><i style="width:${Math.min(100, pct / 1.2 * 100)}%" class="${xp > b[2] ? 'over' : xp > b[1] ? 'high' : xp > b[0] ? 'mod' : ''}"></i><span style="left:${b[0] / b[2] / 1.2 * 100}%"></span><span style="left:${b[1] / b[2] / 1.2 * 100}%"></span><span style="left:${100 / 1.2}%"></span></div>
      <p class="small">${xp ? `${esc(t('Dificultat'))}: <b>${esc(t(lvl))}</b> · ` : ''}${xp} / ${b[2]} ${esc(t('PX'))}</p><p class="small muted">${esc(t('Baixa {a} · moderada {b} · alta {c} PX', {a: b[0], b: b[1], c: b[2]}))}</p>` : ''}
    ${cp.enc.length ? `<div class="row"><button class="btn sm pri" id="enc-go">${esc(t('Tot al combat i al mapa'))}</button><button class="btn sm" id="enc-clear">${esc(t('Buidar'))}</button></div>` : ''}`;
}
/* ---- monstres propis ---- */
function ownMonsterHtml(m, edit) {
  if (!edit) return `<article class="statblock"><h2>${esc(m.name)}</h2><p class="srd-sub">${esc(m.type || '')}</p><dl class="sb-top"><dt>${esc(t('CA'))}</dt><dd>${esc(m.ac)}</dd><dt>${esc(t('PG'))}</dt><dd>${esc(m.hp)}</dd><dt>${esc(t('Velocitat'))}</dt><dd>${esc(m.speed || '')}</dd><dt>${esc(t('VD'))}</dt><dd>${esc(m.cr || '')}</dd></dl>
    <div class="sb-ab">${ABIL.map(([k, ab], i) => `<div><b>${esc(t(ab))}</b><span>${m.ab?.[k] ?? 10}</span><small>${sgn(modOf(m.ab?.[k]))}</small></div>`).join('')}</div><div class="srd-txt"><p>${esc(m.text || '').replace(/\n/g, '<br>')}</p></div></article>`;
  const f = (k, lb, type = 'text') => `<label class="field"><span>${esc(t(lb))}</span><input class="in" data-om="${k}" type="${type}" value="${esc(m[k] ?? '')}"></label>`;
  return `<article class="statblock own" data-own="${m.id}"><div class="grid2">${f('name', L('Nom'))}${f('type', L('Tipus'))}${f('ac', L('CA'), 'number')}${f('hp', L('PG'), 'number')}${f('init', L('Bonificador d\'iniciativa'), 'number')}${f('speed', L('Velocitat'))}${f('cr', L('VD'))}${f('xp', L('PX'), 'number')}</div>
    <div class="sb-ab">${ABIL.map(([k, ab]) => `<label><b>${esc(t(ab))}</b><input class="in" type="number" data-om="ab.${k}" value="${m.ab?.[k] ?? 10}"></label>`).join('')}</div>
    <label class="field"><span>${esc(t('Trets i accions'))}</span><textarea class="in" data-om="text" rows="10">${esc(m.text || '')}</textarea></label>
    <div class="row sb-act"><label class="check">${esc(t('Quants'))} <input class="in" type="number" min="1" max="20" value="1" id="sb-n" style="width:64px"></label><button class="btn sm pri" data-ownadd="cmb">${esc(t('Al combat'))}</button><button class="btn sm" data-ownadd="both">${esc(t('Al combat i al mapa'))}</button><button class="btn sm danger" id="own-del">${esc(t('Esborrar'))}</button></div></article>`;
}
function addOwn(m, n, toMap) {
  const color = pick(TOKEN_COLORS);
  for (let i = 1; i <= n; i++) {const name = n > 1 ? `${m.name} ${i}` : m.name; const cid = combatAdd({name, kind: 'npc', monster: 'own:' + m.id, hp: +m.hp || 10, maxHp: +m.hp || 10, ac: +m.ac || 10, initMod: +m.init || 0}); if (toMap && mapId()) addToken({name, color, cmbId: cid, monster: null})}
  toast(t('Afegit: {x}', {x: n > 1 ? `${n} × ${m.name}` : m.name}));
}
function ownMonsterPicker() {
  const list = ownMonsters();
  if (!list.length) {toast(t('Encara no tens monstres propis. Crea\'n al Compendi.')); return}
  openModal(`<h2>${esc(t('Afegir un monstre propi'))}</h2><ul class="pick-list">${list.map(m => `<li><button class="cp-item" data-ownpick="${m.id}"><span class="t">${esc(m.name)}</span><span class="s">${esc(t('VD'))} ${esc(m.cr || '?')}</span></button></li>`).join('')}</ul>
    <div class="row"><label class="check">${esc(t('Quants'))} <input class="in" type="number" id="op-n" min="1" max="20" value="1" style="width:64px"></label><label class="check"><input type="checkbox" id="op-map" ${mapId() ? 'checked' : ''}> ${esc(t('Posar també al mapa'))}</label></div>
    <div class="foot"><button class="btn" id="op-x">${esc(t('Tancar'))}</button></div>`, (md, close) => {
    $('#op-x', md).onclick = close; md.addEventListener('click', e => {const b = e.target.closest('[data-ownpick]'); if (!b) return; const m = list.find(q => q.id === b.dataset.ownpick); addOwn(m, clamp(+$('#op-n', md).value || 1, 1, 20), $('#op-map', md).checked); close()});
  });
}
function showOwnMonster(id) {const m = getDoc('dmmonsters/' + id); if (!m) return; openModal(`${ownMonsterHtml({...m, id}, false)}<div class="foot"><button class="btn pri" id="om-x">${esc(t('Tancar'))}</button></div>`, (md, close) => {$('#om-x', md).onclick = close}, {wide: true})}

document.addEventListener('click', e => {
  if (st.tab !== 'compendi') return; const x = e.target;
  const cc = x.closest('[data-cpcat]'); if (cc) {cp.cat = cc.dataset.cpcat; lsSet('qm-cp-cat', cp.cat); cp.sel = null; renderCompendi(); return}
  const it = x.closest('[data-cpe]'); if (it) {cp.sel = it.dataset.cpe.split('/').slice(1).join('/'); $$('[data-cpe]').forEach(b => b.setAttribute('aria-current', b === it)); drawCpDetail(); if (window.matchMedia('(max-width:900px)').matches) $('#cp-detail').scrollIntoView({behavior: 'smooth'}); return}
  const sb = x.closest('[data-sb]'); if (sb) {const en = srdGet('criatura', sb.dataset.id), n = clamp(+$('#sb-n')?.value || 1, 1, 20);
    if (sb.dataset.sb === 'enc') {const ex = cp.enc.find(q => q.id === en.id); if (ex) ex.n += n; else cp.enc.push({id: en.id, n}); drawEnc(); return}
    addMonsters(en, n, {map: sb.dataset.sb === 'both'}); return}
  const en = x.closest('[data-encn]'); if (en) {const [id, d] = en.dataset.encn.split(':'); const q = cp.enc.find(z => z.id === id); if (q) {q.n += +d; if (q.n <= 0) cp.enc = cp.enc.filter(z => z !== q)} drawEnc(); return}
  if (x.id === 'enc-go') {for (const q of cp.enc) addMonsters(srdGet('criatura', q.id), q.n, {map: true}); cp.enc = []; drawEnc(); return}
  if (x.id === 'enc-clear') {cp.enc = []; drawEnc(); return}
  if (x.id === 'own-new') {const id = newId(); write('dmmonsters/' + id, {name: t('Monstre nou'), type: '', ac: 12, hp: 20, init: 1, speed: '9 m', cr: '1', xp: 200, ab: {str: 12, dex: 12, con: 12, int: 8, wis: 10, cha: 8}, text: ''}); cp.sel = id; setTimeout(renderCompendi, 40); return}
  const oa = x.closest('[data-ownadd]'); if (oa) {const id = x.closest('[data-own]').dataset.own; const m = getDoc('dmmonsters/' + id); if (m) addOwn({...m, id}, clamp(+$('#sb-n')?.value || 1, 1, 20), oa.dataset.ownadd === 'both'); return}
  if (x.id === 'own-del') {armed(x, () => {del('dmmonsters/' + x.closest('[data-own]').dataset.own); cp.sel = null; setTimeout(renderCompendi, 40)}, t('Prem de nou per a esborrar')); return}
});
document.addEventListener('input', e => {
  if (st.tab !== 'compendi') return; const x = e.target;
  if (x.id === 'cp-q') {cp.q = x.value; drawCpList(); drawCpDetail(); return}
  if (x.dataset.om) {ownInput(x)}
});
const ownInput = debounce(x => {const id = x.closest('[data-own]').dataset.own; const v = x.type === 'number' ? +x.value : x.value; write('dmmonsters/' + id, setPath({}, x.dataset.om, v), 'update'); if (x.dataset.om === 'name') {const b = $(`[data-cpe="own/${id}"] .t`); if (b) b.textContent = x.value}}, 400);
document.addEventListener('change', e => {if (st.tab !== 'compendi') return; const x = e.target; if (x.dataset.cpf) {cp.f[cp.cat] = {...(cp.f[cp.cat] || {}), [x.dataset.cpf]: x.value}; drawCpList(); drawCpDetail()}});

/** Selector del SRD en una finestra. onPick(entrada, quantitat, {map, hidden}) */
function srdPicker({kinds, title, filter, filterLabel, withCount, withMap, onPick}) {
  loadSRD().then(() => {
    let q = '', useFilter = !!filter;
    openModal(`<h2>${esc(title)}</h2><input class="in" id="pk-q" type="search" placeholder="${esc(t('Cerca…'))}" autofocus>
      ${filter ? `<label class="check"><input type="checkbox" id="pk-f" checked> ${esc(filterLabel)}</label>` : ''}
      <ul class="pick-list" id="pk-list"></ul>
      ${withCount ? `<div class="row"><label class="check">${esc(t('Quants'))} <input class="in" type="number" id="pk-n" min="1" max="20" value="1" style="width:64px"></label>${withMap ? `<label class="check"><input type="checkbox" id="pk-map" ${mapId() ? 'checked' : ''}> ${esc(t('Posar també al mapa'))}</label><label class="check"><input type="checkbox" id="pk-h"> ${esc(t('Amagats als jugadors'))}</label>` : ''}</div>` : ''}
      <div class="foot"><button class="btn" id="pk-x">${esc(t('Tancar'))}</button></div>`, (m, close) => {
      const draw = () => {const nq = norm(q); let list = kinds.flatMap(k => SRD.by[k] || []); if (useFilter) list = list.filter(filter); if (nq) list = list.filter(e => norm(e.e.nombre).includes(nq));
        $('#pk-list', m).innerHTML = list.slice(0, 80).map(e => `<li><button class="cp-item" data-pk="${esc(e.k)}/${esc(e.id)}"><span class="t">${esc(e.e.nombre)}</span><span class="s">${entrySub(e)}</span></button><button class="btn sm" data-pkinfo="${esc(e.k)}/${esc(e.id)}" aria-label="${esc(t('Veure'))}">?</button></li>`).join('') || `<li class="muted small">${esc(t('No hi ha resultats.'))}</li>`};
      draw(); $('#pk-q', m).oninput = e => {q = e.target.value; draw()}; if (filter) $('#pk-f', m).onchange = e => {useFilter = e.target.checked; draw()};
      $('#pk-x', m).onclick = close;
      m.addEventListener('click', e => {
        const inf = e.target.closest('[data-pkinfo]'); if (inf) {const [k, ...id] = inf.dataset.pkinfo.split('/'); const en = srdGet(k, id.join('/')); const li = inf.closest('li'); const ex = li.querySelector('.pk-prev'); if (ex) {ex.remove(); return} li.insertAdjacentHTML('beforeend', `<div class="pk-prev">${entryHtml(en)}</div>`); return}
        const b = e.target.closest('[data-pk]'); if (!b) return; const [k, ...id] = b.dataset.pk.split('/'); const en = srdGet(k, id.join('/'));
        const n = withCount ? clamp(+$('#pk-n', m).value || 1, 1, 20) : 1; const opt = {map: withMap ? $('#pk-map', m)?.checked : false, hidden: withMap ? $('#pk-h', m)?.checked : false};
        close(); onPick(en, n, opt);
      });
    }, {wide: true});
  }).catch(() => toast(t('No s\'ha pogut carregar el compendi.')));
}
