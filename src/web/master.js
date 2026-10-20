/*
 * Quadern del Mestre — pestanya del màster: generadors, taules pròpies i notes secretes.
 * Llicència GPL-3.0 o posterior.
 */
const ms = {note: null, results: [], genSp: 'human', encDiff: 1, encType: '', lootCr: '0'};
const dmNotes = () => col('dmnotes').sort((a, b) => (b.updated || 0) - (a.updated || 0));
const dmTables = () => col('dmtables').sort((a, b) => (a.name || '').localeCompare(b.name || ''));

TABS.master = {label: L('Màster'), dmOnly: true, watch: ['dmnotes/', 'dmtables/', 'dmaudio/'], render: renderMaster};
function renderMaster() {
  const notes = dmNotes(); if (!ms.note || !notes.some(n => n.id === ms.note)) ms.note = notes[0]?.id || null;
  const n = notes.find(x => x.id === ms.note);
  $('#main').innerHTML = `<div class="ms">
    <section class="panel ms-gen"><h2>${esc(t('Generadors'))}</h2>
      <div class="gen-row"><select class="in" id="g-sp">${Object.keys(NAMES).map(k => `<option value="${k}" ${ms.genSp === k ? 'selected' : ''}>${esc(speciesName(k))}</option>`).join('')}</select><button class="btn sm" data-gen="name">${esc(t('Nom'))}</button><button class="btn sm" data-gen="npc">${esc(t('PNJ ràpid'))}</button></div>
      <div class="gen-row"><button class="btn sm" data-gen="tavern">${esc(t('Taverna'))}</button><button class="btn sm" data-gen="trinket">${esc(t('Objecte curiós'))}</button></div>
      <div class="gen-row"><span class="small">${esc(t('Botí per a VD'))}</span><select class="in" id="g-loot">${LOOT_TIERS.map(([a, b]) => `<option value="${a}" ${ms.lootCr === String(a) ? 'selected' : ''}>${a}–${b}</option>`).join('')}</select><button class="btn sm" data-gen="loot">${esc(t('Botí'))}</button></div>
      <div class="gen-row"><span class="small">${esc(t('Encontre'))}</span><select class="in" id="g-diff">${[L('Baixa'), L('Moderada'), L('Alta')].map((lb, i) => `<option value="${i}" ${ms.encDiff === i ? 'selected' : ''}>${esc(t(lb))}</option>`).join('')}</select>
        <select class="in" id="g-type"><option value="">${esc(t('Tots els tipus'))}</option>${Object.entries(CREATURE_TYPES).map(([k, v]) => `<option value="${k}" ${ms.encType === k ? 'selected' : ''}>${esc(t(v))}</option>`).join('')}</select><button class="btn sm" data-gen="enc">${esc(t('Generar'))}</button></div>
      <ol class="gen-out" id="gen-out">${ms.results.map((r, i) => `<li><div>${r.html}</div><div class="row">${r.enc ? `<button class="btn sm" data-genenc="${i}">${esc(t('Al combat i al mapa'))}</button>` : ''}<button class="btn sm" data-gennote="${i}">${esc(t('A les notes'))}</button></div></li>`).join('') || `<li class="muted small">${esc(t('Els resultats apareixeran ací.'))}</li>`}</ol>
    </section>
    <section class="panel ms-tables"><h2>${esc(t('Taules pròpies'))}</h2><p class="small muted">${esc(t('Rumors, esdeveniments, botí… Una opció per línia. Tira-les quan vulgues.'))}</p>
      <ul class="tbl-list">${dmTables().map(tb => `<li><button class="link" data-tedit="${tb.id}">${esc(tb.name || t('Sense nom'))}</button><span class="muted small">${(tb.lines || []).length}</span><button class="btn sm pri" data-troll="${tb.id}">${esc(t('Tirar'))}</button></li>`).join('') || `<li class="muted small">${esc(t('Encara no tens cap taula.'))}</li>`}</ul>
      <button class="btn sm" id="t-new">+ ${esc(t('Taula nova'))}</button></section>
    ${audioPanel()}
    <section class="panel ms-notes"><h2>${esc(t('Notes secretes'))}</h2><p class="small muted">${esc(t('Només les veus tu: trames, secrets, preparació de la sessió.'))}</p>
      <div class="ms-notes-grid"><div class="notes-list"><button class="btn sm" id="n-new">+ ${esc(t('Nota nova'))}</button>${notes.map(x => `<button class="note-item" data-note="${x.id}" aria-current="${x.id === ms.note}"><span class="t">${esc(x.title || t('Sense títol'))}</span><span class="small muted">${esc(ago(x.updated || 0))}</span></button>`).join('')}</div>
      <div class="note-ed">${n ? `<input class="in" id="note-title" data-nf="title" value="${esc(n.title || '')}" placeholder="${esc(t('Títol'))}"><textarea class="in" id="note-body" data-nf="body">${esc(n.body || '')}</textarea><div class="row" style="justify-content:flex-end"><button class="btn sm danger" id="n-del">${esc(t('Esborrar'))}</button></div>` : `<div class="empty"><b>${esc(t('Sense notes'))}</b>${esc(t('Crea una nota amb el botó de l\'esquerra.'))}</div>`}</div></div></section>
  </div>`;
}
function genName(sp) {const N = NAMES[sp] || NAMES.human; return `${pick(Math.random() < .5 ? N.m : N.f)} ${pick(N.s)}`}
function addResult(r) {ms.results = [r, ...ms.results].slice(0, 12); renderMaster()}
async function genLoot() {
  await loadSRD(); const tier = LOOT_TIERS.find(x => String(x[0]) === String(ms.lootCr)) || LOOT_TIERS[0];
  const [, , dice, mult, coin, pMagic, rars] = tier; const r = rollExpr(dice); const amount = r.total * mult;
  let html = `<b>${esc(t('Botí'))}</b>: ${amount} ${esc(t(COIN_NAMES[coin]))}`;
  const extra = []; for (let i = 0; i < 3; i++) if (Math.random() < pMagic) {const pool = (SRD.by.objeto || []).filter(e => (e.c?.rarezas || []).some(x => rars.includes(x))); if (pool.length) extra.push(pick(pool))}
  if (Math.random() < .5) extra.push({gem: true});
  for (const e of extra) html += e.gem ? `<br>· ${esc(t('Una gemma de {n} po', {n: pick([10, 25, 50, 100, 250]) * (tier[0] >= 11 ? 5 : 1)}))}` : `<br>· <button class="link" data-showobj="${esc(e.id)}">${esc(e.e.nombre)}</button> <span class="muted small">(${esc((e.c?.rarezas || []).map(x => t(RARITIES[x] || x)).join(', '))})</span>`;
  addResult({html, text: html.replace(/<[^>]+>/g, ' ')});
}
async function genEncounter() {
  await loadSRD();
  const lvls = chars().filter(c => !c.npc && !c.secret).map(c => clamp(+c.level || 1, 1, 20)); if (!lvls.length) lvls.push(1, 1, 1, 1);
  const budget = lvls.reduce((s, l) => s + XP_BUDGET[l][ms.encDiff], 0);
  let pool = (SRD.by.criatura || []).filter(e => e.c?.px && e.c.px <= budget && e.c.px >= budget / 12); if (ms.encType) pool = pool.filter(e => e.c.tipo === ms.encType);
  if (!pool.length) pool = (SRD.by.criatura || []).filter(e => e.c?.px && e.c.px <= budget && (!ms.encType || e.c.tipo === ms.encType));
  if (!pool.length) {toast(t('No he trobat monstres adequats.')); return}
  const a = pick(pool), parts = []; let left = budget;
  const na = clamp(Math.floor(budget * (.55 + Math.random() * .35) / a.c.px), 1, 8); parts.push({id: a.id, n: na}); left -= na * a.c.px;
  const pool2 = pool.filter(e => e.id !== a.id && e.c.px <= left && e.c.px * 1 <= left); if (pool2.length && Math.random() < .6) {const b = pick(pool2); const nb = clamp(Math.floor(left / b.c.px), 1, 6); parts.push({id: b.id, n: nb}); left -= nb * b.c.px}
  const xp = budget - left;
  const html = `<b>${esc(t('Encontre'))}</b> (${xp}/${budget} ${esc(t('PX'))}): ${parts.map(p => {const e = srdGet('criatura', p.id); return `${p.n} × <button class="link" data-showcr="${esc(p.id)}">${esc(e.e.nombre)}</button> <span class="muted small">(${esc(t('VD'))} ${esc(e.c.vd)})</span>`}).join(', ')}`;
  addResult({html, enc: parts, text: html.replace(/<[^>]+>/g, ' ')});
}
document.addEventListener('click', e => {
  if (st.tab !== 'master') return; const x = e.target;
  const g = x.closest('[data-gen]'); if (g) {const k = g.dataset.gen;
    if (k === 'name') addResult({html: `<b>${esc(genName(ms.genSp))}</b> <span class="muted small">${esc(speciesName(ms.genSp))}</span>`, text: genName(ms.genSp)});
    if (k === 'npc') {const nm = genName(ms.genSp), job = t(pick(NPC_JOBS)), tr = t(pick(NPC_TRAITS)); addResult({html: `<b>${esc(nm)}</b>, ${esc(job)} (${esc(speciesName(ms.genSp).toLowerCase())}). ${esc(tr)}`, text: `${nm}, ${job}. ${tr}`})}
    if (k === 'tavern') {const n = `${t(pick(TAVERN_A))} ${t(pick(TAVERN_B))}`; addResult({html: `<b>${esc(n)}</b> · ${esc(t('Taverner'))}: ${esc(genName(pick(Object.keys(NAMES))))}`, text: n})}
    if (k === 'trinket') {const tr = t(pick(TRINKETS)); addResult({html: esc(tr), text: tr})}
    if (k === 'loot') genLoot();
    if (k === 'enc') genEncounter();
    return}
  const ge = x.closest('[data-genenc]'); if (ge) {for (const p of ms.results[+ge.dataset.genenc].enc) addMonsters(srdGet('criatura', p.id), p.n, {map: true}); return}
  const gn = x.closest('[data-gennote]'); if (gn) {const r = ms.results[+gn.dataset.gennote]; const id = ms.note; if (id) {const n = getDoc('dmnotes/' + id); write('dmnotes/' + id, {body: ((n?.body || '') + '\n- ' + r.text.replace(/\s+/g, ' ').trim()).trim(), updated: Date.now()}, 'update')} else write('dmnotes/' + newId(), {title: t('Idees'), body: '- ' + r.text.replace(/\s+/g, ' ').trim(), updated: Date.now()}); toast(t('Afegit a les notes.')); setTimeout(renderMaster, 40); return}
  const so = x.closest('[data-showobj]'); if (so) {showEntry('objeto', so.dataset.showobj); return}
  const sc = x.closest('[data-showcr]'); if (sc) {showEntry('criatura', sc.dataset.showcr); return}
  const nt = x.closest('[data-note]'); if (nt) {ms.note = nt.dataset.note; renderMaster(); return}
  if (x.id === 'n-new') {const id = newId(); write('dmnotes/' + id, {title: '', body: '', updated: Date.now()}); ms.note = id; setTimeout(() => {renderMaster(); $('#note-title')?.focus()}, 40); return}
  if (x.id === 'n-del') {armed(x, () => {del('dmnotes/' + ms.note); ms.note = null; setTimeout(renderMaster, 40)}, t('Prem de nou per a esborrar')); return}
  if (x.id === 't-new') {tableModal(null); return}
  const te = x.closest('[data-tedit]'); if (te) {tableModal(te.dataset.tedit); return}
  const tr = x.closest('[data-troll]'); if (tr) {const tb = getDoc('dmtables/' + tr.dataset.troll); const lines = (tb?.lines || []).filter(Boolean); if (!lines.length) return; const i = rnd(lines.length) - 1; addResult({html: `<b>${esc(tb.name)}</b> (d${lines.length}: ${i + 1}): ${esc(lines[i])}`, text: lines[i]}); return}
});
document.addEventListener('change', e => {
  if (st.tab !== 'master') return; const x = e.target;
  if (x.id === 'g-sp') ms.genSp = x.value; if (x.id === 'g-loot') ms.lootCr = x.value; if (x.id === 'g-diff') ms.encDiff = +x.value; if (x.id === 'g-type') ms.encType = x.value;
});
const nInput = debounce((x, id) => write('dmnotes/' + id, {[x.dataset.nf]: x.value, updated: Date.now()}, 'update'), 400);
document.addEventListener('input', e => {if (st.tab === 'master' && e.target.dataset.nf && ms.note) {nInput(e.target, ms.note); if (e.target.dataset.nf === 'title') {const b = $(`[data-note="${ms.note}"] .t`); if (b) b.textContent = e.target.value || t('Sense títol')}}});
function tableModal(id) {
  const tb = id ? getDoc('dmtables/' + id) : {name: '', lines: []};
  openModal(`<h2>${esc(t(id ? 'Taula' : 'Taula nova'))}</h2><label class="field"><span>${esc(t('Nom'))}</span><input class="in" id="tb-n" value="${esc(tb.name || '')}" autofocus></label>
    <label class="field"><span>${esc(t('Opcions (una per línia)'))}</span><textarea class="in" id="tb-l" rows="10">${esc((tb.lines || []).join('\n'))}</textarea></label>
    <div class="foot">${id ? `<button class="btn danger" id="tb-d">${esc(t('Esborrar'))}</button>` : ''}<button class="btn" id="tb-x">${esc(t('Cancel·lar'))}</button><button class="btn pri" id="tb-ok">${esc(t('Guardar'))}</button></div>`, (m, close) => {
    $('#tb-x', m).onclick = close;
    $('#tb-ok', m).onclick = () => {write('dmtables/' + (id || newId()), {name: $('#tb-n', m).value.trim() || t('Taula'), lines: $('#tb-l', m).value.split('\n').map(s => s.trim()).filter(Boolean)}); close(); setTimeout(renderMaster, 40)};
    if (id) $('#tb-d', m).onclick = () => {del('dmtables/' + id); close(); setTimeout(renderMaster, 40)};
  });
}
