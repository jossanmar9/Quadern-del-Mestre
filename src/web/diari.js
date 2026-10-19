/*
 * Quadern del Mestre — diari de sessions i documents per als jugadors.
 * Llicència GPL-3.0 o posterior.
 */
const dj = {sub: lsGet('qm-diari') || 'sessions', sel: null, hsel: null};
/** Format senzill: **negreta**, *cursiva*, # títol, - llista */
function md(src) {
  const lines = esc(src || '').split('\n'); let out = '', ul = false;
  for (const ln of lines) {
    const inl = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
    if (/^\s*[-*]\s+/.test(ln)) {if (!ul) {out += '<ul>'; ul = true} out += `<li>${inl(ln.replace(/^\s*[-*]\s+/, ''))}</li>`; continue}
    if (ul) {out += '</ul>'; ul = false}
    if (/^#{1,3}\s/.test(ln)) out += `<h4>${inl(ln.replace(/^#+\s/, ''))}</h4>`; else if (ln.trim()) out += `<p>${inl(ln)}</p>`;
  }
  return out + (ul ? '</ul>' : '');
}
const journals = () => col('journal').sort((a, b) => (b.n || 0) - (a.n || 0) || (b.created || 0) - (a.created || 0));
const handouts = () => col('handouts').sort((a, b) => (b.created || 0) - (a.created || 0));
const canEditJ = j => j && (dm() || j.ownerId === S.uid);

TABS.diari = {label: L('Diari'), watch: ['journal/', 'handouts/', 'users/'], render: renderDiari};
function renderDiari() {
  const subs = [['sessions', L('Sessions')], ['documents', L('Documents')]];
  $('#main').innerHTML = `<nav class="subtabs" role="tablist">${subs.map(([k, lb]) => `<button role="tab" data-dsub="${k}" aria-selected="${dj.sub === k}">${esc(t(lb))}${k === 'documents' && !dm() && handouts().length ? ` (${handouts().length})` : ''}</button>`).join('')}</nav>
    <div id="dj-body">${dj.sub === 'documents' ? handoutsHtml() : journalHtml()}</div>`;
}
function journalHtml() {
  const list = journals(); if (!dj.sel || !list.some(j => j.id === dj.sel)) dj.sel = list[0]?.id || null;
  const j = list.find(x => x.id === dj.sel), ed = canEditJ(j);
  return `<div class="camp"><div class="notes-list"><button class="btn pri" id="j-new">+ ${esc(t('Nova sessió'))}</button>
      ${list.map(x => `<button class="note-item" data-j="${x.id}" aria-current="${x.id === dj.sel}"><span class="k">${esc(t('Sessió {n}', {n: x.n || '?'}))}${x.date ? ' · ' + esc(fmtDate(x.date)) : ''}</span><span class="t">${esc(x.title || t('Sense títol'))}</span><span class="small muted">${esc(userName(x.ownerId))}</span></button>`).join('') || `<p class="muted small">${esc(t('Encara no hi ha cap sessió apuntada.'))}</p>`}</div>
    <div class="note-ed">${j ? (ed ? `<div class="row"><label class="field" style="width:110px"><span>${esc(t('Sessió'))}</span><input class="in" type="number" min="1" data-jf="n" value="${esc(j.n || '')}"></label><label class="field" style="width:190px"><span>${esc(t('Data'))}</span><input class="in" type="date" data-jf="date" value="${esc(j.date ? new Date(j.date).toISOString().slice(0, 10) : '')}"></label></div>
        <input class="in" id="note-title" data-jf="title" value="${esc(j.title || '')}" placeholder="${esc(t('Títol de la sessió'))}">
        <textarea class="in" id="note-body" data-jf="body" placeholder="${esc(t('Què va passar? Llocs, personatges, pistes, botí… Pots fer servir **negreta**, *cursiva*, # títols i - llistes.'))}">${esc(j.body || '')}</textarea>
        <div class="row" style="justify-content:space-between"><span class="small muted">${esc(t('Escrit per {n}. Els canvis es guarden sols.', {n: userName(j.ownerId)}))}</span><button class="btn sm danger" id="j-del">${esc(t('Esborrar'))}</button></div>`
      : `<p class="small muted">${esc(t('Sessió {n}', {n: j.n || '?'}))}${j.date ? ' · ' + esc(fmtDate(j.date)) : ''} · ${esc(userName(j.ownerId))}</p><h2 class="j-title">${esc(j.title || t('Sense títol'))}</h2><div class="md">${md(j.body)}</div>`)
      : `<div class="empty"><b>${esc(t('El diari de la campanya'))}</b>${esc(t('Apunteu ací el resum de cada sessió. Tothom el pot llegir, i cadascú pot escriure les seues.'))}</div>`}</div></div>`;
}
function handoutsHtml() {
  const list = handouts().filter(h => dm() || h.shown);
  if (!dm()) return list.length ? `<div class="ho-grid">${list.map(h => `<button class="ho-card" data-hopen="${h.id}">${h.file ? `<img src="${esc(fileUrl(h.file))}" alt="" loading="lazy">` : `<span class="ho-txt">${esc((h.text || '').slice(0, 140))}</span>`}<b>${esc(h.title || t('Document'))}</b></button>`).join('')}</div>`
    : `<div class="empty"><b>${esc(t('Encara no hi ha documents'))}</b>${esc(t('Quan el màster vos ensenye una carta, un mapa o una pista, apareixerà ací.'))}</div>`;
  const users = [...mem.keys()].filter(p => p.startsWith('users/')).map(p => p.slice(6)).filter(u => u !== S.uid);
  return `<div class="row" style="margin-bottom:14px"><button class="btn pri" id="h-new">+ ${esc(t('Document de text'))}</button><button class="btn" id="h-img">+ ${esc(t('Document amb imatge'))}</button><span class="small muted">${esc(t('Prepara cartes, pistes o imatges i ensenya-les quan toque.'))}</span></div>
    <div class="ho-grid">${list.map(h => `<article class="ho-card dm ${h.shown ? 'on' : ''}" data-h="${h.id}">${h.file ? `<img src="${esc(fileUrl(h.file))}" alt="" loading="lazy">` : ''}
      <input class="in" data-hf="title" value="${esc(h.title || '')}" placeholder="${esc(t('Títol'))}">
      <textarea class="in" data-hf="text" rows="4" placeholder="${esc(t('Text del document (opcional)'))}">${esc(h.text || '')}</textarea>
      <div class="ho-to"><span class="small muted">${esc(t('Per a:'))}</span><label class="check"><input type="checkbox" data-hto="" ${!(h.to || []).length ? 'checked' : ''}> ${esc(t('Tothom'))}</label>${users.map(u => `<label class="check"><input type="checkbox" data-hto="${esc(u)}" ${(h.to || []).includes(u) ? 'checked' : ''}> ${esc(userName(u))}</label>`).join('')}</div>
      <div class="row"><button class="btn sm ${h.shown ? '' : 'pri'}" data-hshow>${esc(h.shown ? t('Amagar') : t('Ensenyar'))}</button><button class="btn sm" data-hopen="${h.id}">${esc(t('Veure'))}</button><button class="btn sm danger" data-hdel>${esc(t('Esborrar'))}</button>${h.shown ? `<span class="sec-tag" style="color:var(--good)">${esc(t('Visible'))}</span>` : ''}</div></article>`).join('') || `<div class="empty"><b>${esc(t('Encara no hi ha documents'))}</b>${esc(t('Els jugadors no veuen res fins que prems «Ensenyar».'))}</div>`}</div>`;
}
function openHandout(h) {
  openModal(`<h2>${esc(h.title || t('Document'))}</h2>${h.file ? `<img class="ho-big" src="${esc(fileUrl(h.file))}" alt="">` : ''}${h.text ? `<div class="md ho-paper">${md(h.text)}</div>` : ''}<div class="foot"><button class="btn pri" id="ho-x">${esc(t('Tancar'))}</button></div>`, (m, close) => {$('#ho-x', m).onclick = close}, {wide: true});
}
document.addEventListener('click', async e => {
  if (st.tab !== 'diari') return; const x = e.target;
  const ds = x.closest('[data-dsub]'); if (ds) {dj.sub = ds.dataset.dsub; lsSet('qm-diari', dj.sub); renderDiari(); return}
  const jj = x.closest('[data-j]'); if (jj) {dj.sel = jj.dataset.j; renderDiari(); return}
  if (x.id === 'j-new') {const id = newId(), n = journals().reduce((a, j) => Math.max(a, +j.n || 0), 0) + 1; write('journal/' + id, {title: '', n, date: Date.now(), body: '', ownerId: S.uid, created: Date.now()}); dj.sel = id; setTimeout(() => {renderDiari(); $('#note-title')?.focus()}, 40); return}
  if (x.id === 'j-del') {armed(x, () => {del('journal/' + dj.sel); dj.sel = null; setTimeout(renderDiari, 40)}, t('Prem de nou per a esborrar')); return}
  const ho = x.closest('[data-hopen]'); if (ho) {const h = getDoc('handouts/' + ho.dataset.hopen); if (h) openHandout(h); return}
  if (!dm()) return;
  if (x.id === 'h-new') {write('handouts/' + newId(), {title: t('Document nou'), text: '', file: null, shown: false, to: [], created: Date.now()}); setTimeout(renderDiari, 40); return}
  if (x.id === 'h-img') {const f = await pickImage('handout'); if (!f) return; write('handouts/' + newId(), {title: t('Imatge'), text: '', file: f, shown: false, to: [], created: Date.now()}); setTimeout(renderDiari, 40); return}
  const card = x.closest('[data-h]'); if (!card) return; const id = card.dataset.h, h = getDoc('handouts/' + id);
  if (x.closest('[data-hshow]')) {write('handouts/' + id, {shown: !h.shown, shownAt: Date.now()}, 'update'); if (!h.shown) toast(t('Els jugadors ja veuen «{x}».', {x: h.title || t('Document')})); setTimeout(renderDiari, 40); return}
  if (x.closest('[data-hdel]')) {armed(x, () => {del('handouts/' + id); setTimeout(renderDiari, 40)}, t('Prem de nou per a esborrar')); return}
});
document.addEventListener('change', e => {
  if (st.tab !== 'diari' || !dm()) return; const x = e.target; if (x.dataset.hto === undefined) return;
  const id = x.closest('[data-h]').dataset.h, h = getDoc('handouts/' + id); let to = new Set(h.to || []);
  if (x.dataset.hto === '') to = new Set(); else {x.checked ? to.add(x.dataset.hto) : to.delete(x.dataset.hto)}
  write('handouts/' + id, {to: [...to]}, 'update'); setTimeout(renderDiari, 40);
});
const jInput = debounce((x, id) => {let v = x.value; if (x.dataset.jf === 'n') v = +v || 0; if (x.dataset.jf === 'date') v = v ? new Date(v + 'T12:00').getTime() : null; write('journal/' + id, {[x.dataset.jf]: v}, 'update')}, 400);
const hInput = debounce((x, id) => write('handouts/' + id, {[x.dataset.hf]: x.value}, 'update'), 400);
document.addEventListener('input', e => {
  if (st.tab !== 'diari') return; const x = e.target;
  if (x.dataset.jf && dj.sel && canEditJ(getDoc('journal/' + dj.sel))) {jInput(x, dj.sel); if (x.dataset.jf === 'title') {const b = $(`[data-j="${dj.sel}"] .t`); if (b) b.textContent = x.value || t('Sense títol')}}
  if (x.dataset.hf && dm()) hInput(x, x.closest('[data-h]').dataset.h);
});
// Avís als jugadors quan el màster ensenya un document nou
const seenH = new Set(JSON.parse(lsGet('qm-seen-h') || '[]'));
watchPrefix('handouts', path => {
  if (dm() || !st.loaded) return; const h = getDoc(path); if (!h || !h.shown) return;
  const key = path + ':' + (h.shownAt || 0); if (seenH.has(key)) return; seenH.add(key); lsSet('qm-seen-h', JSON.stringify([...seenH].slice(-200)));
  if (st.firstSync) return;
  if (!$('.modal')) openHandout(h); else toast(t('El màster vos ensenya: {x}', {x: h.title || t('Document')}));
});
