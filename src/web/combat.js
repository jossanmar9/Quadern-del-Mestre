/*
 * Quadern del Mestre — combat: iniciativa, torns, punts de golpe, estats i dificultat de l'encontre.
 * Llicència GPL-3.0 o posterior.
 */
const cmbDoc = () => getDoc('combat/main') || {active: false, round: 1, turn: 0, list: []};
const saveCmb = c => write('combat/main', c);
/** Afig un combatent i en torna l'id */
function combatAdd(entry) {
  const c = clone(cmbDoc()); const id = newId();
  c.list = [...(c.list || []), {id, init: null, conds: [], ...entry}];
  saveCmb(c); return id;
}
function rowView(r) {
  if (r.kind === 'pc' && r.charId) {const ch = getDoc('characters/' + r.charId); if (ch) return {...r, name: ch.name, hp: ch.hp, maxHp: ch.maxHp, tmp: ch.tmp, ac: ch.ac, conds: ch.conds || [], color: ch.color, ch}}
  return r;
}
function encounterInfo(list) {
  const pcs = chars().filter(c => !c.npc && !c.secret);
  const lvls = pcs.map(c => clamp(+c.level || 1, 1, 20));
  const xp = list.filter(r => r.monster).reduce((s, r) => {const e = srdGet('criatura', r.monster); return s + (e?.c?.px || 0)}, 0);
  if (!lvls.length || !xp) return null;
  const b = [0, 1, 2].map(i => lvls.reduce((s, l) => s + XP_BUDGET[l][i], 0));
  const lvl = xp <= b[0] ? L('Baixa') : xp <= b[1] ? L('Moderada') : xp <= b[2] ? L('Alta') : L('Per damunt d\'alta');
  return {xp, b, lvl, n: lvls.length};
}
TABS.combat = {label: L('Combat'), watch: ['combat/', 'characters/', 'users/'], render: renderCombat};
function renderCombat() {
  const c = cmbDoc(), list = (c.list || []).map(rowView), isDm = dm(), cur = c.active ? list[c.turn || 0] : null;
  if (isDm && !SRD) loadSRD().then(() => {if (st.tab === 'combat') scheduleRender()});
  const enc = isDm && SRD ? encounterInfo(list) : null;
  $('#main').innerHTML = `<div class="cmb-head">
      <div class="round">${c.active ? `<div><span>${esc(t('Ronda'))}</span> <b>${c.round || 1}</b></div><div><span>${esc(t('Torn de'))}</span> <b class="cur-name">${esc(cur ? cur.name : '—')}</b></div>` : `<h2>${esc(t('Combat'))}</h2>`}</div>
      ${isDm ? `<div class="row">${c.active ? `<button class="btn" id="cmb-prev">${esc(t('Torn anterior'))}</button><button class="btn pri" id="cmb-next">${esc(t('Torn següent'))}</button><button class="btn danger" id="cmb-end">${esc(t('Acabar el combat'))}</button>`
        : `<button class="btn" id="cmb-rollnpc">${esc(t('Tirar iniciativa als monstres'))}</button><button class="btn pri" id="cmb-start" ${list.length ? '' : 'disabled'}>${esc(t('Començar el combat'))}</button>`}</div>` : ''}
    </div>
    ${isDm ? `<div class="row cmb-add"><button class="btn sm" id="cmb-party">+ ${esc(t('El grup'))}</button><button class="btn sm" id="cmb-monster">+ ${esc(t('Monstre del SRD'))}</button><button class="btn sm" id="cmb-own">+ ${esc(t('Monstre propi'))}</button><button class="btn sm" id="cmb-other">+ ${esc(t('Un altre'))}</button>
      <button class="btn sm" id="cmb-sort">${esc(t('Ordenar per iniciativa'))}</button>${list.length ? `<button class="btn sm danger" id="cmb-clear">${esc(t('Buidar'))}</button>` : ''}
      ${enc ? `<span class="enc-diff" title="${esc(t('Pressupost per a {n}: baixa {a}, moderada {b}, alta {c} PX', {n: pl(enc.n, 'personatge', 'personatges'), a: enc.b[0], b: enc.b[1], c: enc.b[2]}))}">${esc(t('Dificultat'))}: <b>${esc(t(enc.lvl))}</b> · ${enc.xp} ${esc(t('PX'))}</span>` : ''}</div>` : ''}
    ${list.length ? `<div class="cmb-scroll"><table class="cmb"><thead><tr><th>${esc(t('Inic.'))}</th><th>${esc(t('Nom'))}</th><th>${esc(t('CA'))}</th><th>${esc(t('Punts de golpe'))}</th>${isDm ? `<th>${esc(t('Dany / curació'))}</th>` : ''}<th>${esc(t('Estats'))}</th>${isDm ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map((r, i) => cmbRow(r, i, c, isDm)).join('')}</tbody></table></div>`
      : `<div class="empty"><b>${esc(t('No hi ha ningú al combat'))}</b>${esc(isDm ? t('Afig el grup i els monstres. Pots tirar la iniciativa dels monstres d\'un colp i després ordenar.') : t('Quan el màster comence un combat, ací veuràs l\'ordre d\'iniciativa.'))}</div>`}`;
}
function cmbRow(r, i, c, isDm) {
  const cur = c.active && i === (c.turn || 0), hp = r.maxHp != null ? hpPct(r.hp, r.maxHp) : null, down = r.maxHp != null ? (r.hp || 0) <= 0 : r.state === 'down';
  const hpCell = r.maxHp != null ? `<div class="hpc"><span class="mono">${r.hp ?? 0}/${r.maxHp}${r.tmp ? ` (+${r.tmp})` : ''}</span><div class="hpbar"><i class="${hpCls(hp)}" style="width:${hp * 100}%"></i></div></div>`
    : `<span class="state-word">${esc(t(HP_STATE[r.state] || ''))}</span>`;
  const conds = (r.conds || []).map(k => `<button class="cond" data-cond-x="${k}" ${isDm || (r.ch && r.ch.ownerId === S.uid) ? '' : 'disabled'} title="${esc(t('Llevar'))}">${esc(condName(k))}</button>`).join('');
  return `<tr class="${cur ? 'cur' : ''} ${down ? 'down' : ''} ${r.hidden ? 'hid' : ''}" data-row="${r.id}">
    <td>${isDm ? `<input class="init" type="number" value="${r.init ?? ''}" data-init aria-label="${esc(t('Iniciativa'))}">` : `<b class="mono">${r.init ?? '—'}</b>`}</td>
    <td><span class="who">${r.ch ? avatar(r.ch, 26) : `<span class="dot" style="background:${esc(r.color || (r.kind === 'pc' ? '#2B4A6B' : '#8C2A1C'))}"></span>`}${r.monster && isDm ? `<button class="link" data-stats="${esc(r.monster)}">${esc(r.name)}</button>` : esc(r.name)}${r.hidden ? ` <span class="sec-tag">${esc(t('amagat'))}</span>` : ''}</span></td>
    <td class="mono">${r.ac ?? (r.maxHp != null || isDm ? '—' : '')}</td><td>${hpCell}</td>
    ${isDm ? `<td><div class="dmg"><input class="in mono" type="number" min="0" data-amt aria-label="${esc(t('Quantitat'))}"><button class="btn sm danger" data-dmg="-1" title="${esc(t('Dany'))}">−</button><button class="btn sm" data-dmg="1" title="${esc(t('Curació'))}">+</button></div></td>` : ''}
    <td><div class="conds">${conds}${isDm || (r.ch && r.ch.ownerId === S.uid) ? `<select class="cond-add" data-cond-add aria-label="${esc(t('Afegir un estat'))}"><option value="">+ ${esc(t('estat'))}</option>${[...CONDS, ...EXTRA_CONDS].filter(([k]) => !(r.conds || []).includes(k)).map(([k, nm]) => `<option value="${k}">${esc(t(nm))}</option>`).join('')}</select>` : ''}</div></td>
    ${isDm ? `<td class="row-act"><button class="btn sm" data-rinit title="${esc(t('Tirar iniciativa'))}">d20</button><button class="btn sm" data-hide aria-pressed="${!!r.hidden}" title="${esc(t('Amagar als jugadors'))}">${r.hidden ? '◌' : '●'}</button><button class="btn sm danger" data-rm aria-label="${esc(t('Treure'))}">×</button></td>` : ''}</tr>`;
}
function initModOf(r) {const v = rowView(r); if (v.ch) return charCalc(v.ch).init; return +r.initMod || 0}
function rollInit(r, quiet) {const res = doRoll(M('{n}: iniciativa', {n: rowView(r).name}), '1d20' + sgn(initModOf(r)).replace('−', '-'), {adv: '', quiet, priv: r.kind !== 'pc' && dm()}); return res ? res.total : null}
function cmbUpdateRow(id, fn) {const c = clone(cmbDoc()); const r = (c.list || []).find(x => x.id === id); if (!r) return; fn(r, c); saveCmb(c)}
function sortCmb(c) {const curId = c.active ? c.list[c.turn || 0]?.id : null; c.list.sort((a, b) => (b.init ?? -99) - (a.init ?? -99) || initModOf(b) - initModOf(a)); if (curId) c.turn = Math.max(0, c.list.findIndex(x => x.id === curId))}
document.addEventListener('click', e => {
  if (st.tab !== 'combat' || !dm()) {
    // els jugadors poden llevar estats dels seus personatges
    if (st.tab === 'combat') {const cx = e.target.closest('[data-cond-x]'); if (cx) {const r = (cmbDoc().list || []).find(x => x.id === cx.closest('[data-row]').dataset.row); const v = r && rowView(r); if (v?.ch && v.ch.ownerId === S.uid) write('characters/' + r.charId, {conds: (v.conds || []).filter(k => k !== cx.dataset.condX)}, 'update')}}
    return;
  }
  const x = e.target, row = x.closest('[data-row]'), rid = row?.dataset.row;
  if (x.id === 'cmb-start') {const c = clone(cmbDoc()); for (const r of c.list) if (r.init == null && r.kind !== 'pc') r.init = rollInit(r, true); sortCmb(c); c.active = true; c.round = 1; c.turn = 0; saveCmb(c); return}
  if (x.id === 'cmb-next' || x.id === 'cmb-prev') {const c = clone(cmbDoc()), n = c.list.length; if (!n) return; let tt = (c.turn || 0) + (x.id === 'cmb-next' ? 1 : -1); if (tt >= n) {tt = 0; c.round = (c.round || 1) + 1} if (tt < 0) {tt = n - 1; c.round = Math.max(1, (c.round || 1) - 1)} c.turn = tt; saveCmb(c); return}
  if (x.id === 'cmb-end') {armed(x, () => {const c = clone(cmbDoc()); c.active = false; c.turn = 0; c.round = 1; c.list = c.list.filter(r => r.kind === 'pc'); for (const r of c.list) r.init = null; saveCmb(c); toast(t('Combat acabat. He tret els monstres de la llista.'))}, t('Segur? Prem de nou')); return}
  if (x.id === 'cmb-rollnpc') {const c = clone(cmbDoc()); for (const r of c.list) if (r.kind !== 'pc') r.init = rollInit(r, true); sortCmb(c); saveCmb(c); return}
  if (x.id === 'cmb-sort') {const c = clone(cmbDoc()); sortCmb(c); saveCmb(c); return}
  if (x.id === 'cmb-clear') {armed(x, () => saveCmb({active: false, round: 1, turn: 0, list: []}), t('Segur? Prem de nou')); return}
  if (x.id === 'cmb-party') {const c = clone(cmbDoc()); let n = 0; for (const ch of chars().filter(q => !q.npc)) if (!c.list.some(r => r.charId === ch.id)) {c.list.push({id: newId(), kind: 'pc', charId: ch.id, name: ch.name, init: null, conds: []}); n++} saveCmb(c); toast(n ? t('Afegit: {x}', {x: pl(n, 'personatge', 'personatges')}) : t('Tot el grup ja és al combat.')); return}
  if (x.id === 'cmb-monster') {srdPicker({kinds: ['criatura'], title: t('Afegir monstres al combat'), withCount: true, withMap: true, onPick: (en, n, opt) => addMonsters(en, n, {map: opt.map, hidden: opt.hidden})}); return}
  if (x.id === 'cmb-own') {ownMonsterPicker(); return}
  if (x.id === 'cmb-other') {otherModal(); return}
  if (!rid) {const st2 = x.closest('[data-stats]'); if (st2) showEntry('criatura', st2.dataset.stats); return}
  const st2 = x.closest('[data-stats]'); if (st2) {const r = (cmbDoc().list || []).find(q => q.id === rid); if (r?.monster?.startsWith('own:')) showOwnMonster(r.monster.slice(4)); else showEntry('criatura', st2.dataset.stats); return}
  const dmg = x.closest('[data-dmg]'); if (dmg) {const inp = $('[data-amt]', row), n = Math.abs(+inp.value || 0); if (!n) {inp.focus(); return} applyHpRow(rid, +dmg.dataset.dmg < 0 ? -n : n); inp.value = ''; return}
  if (x.closest('[data-rinit]')) {cmbUpdateRow(rid, r => {r.init = rollInit(r, true)}); return}
  if (x.closest('[data-hide]')) {cmbUpdateRow(rid, r => {r.hidden = !r.hidden; const tk = allTokens().find(q => q.tok.cmbId === rid); if (tk) write(`maps/${tk.map}/tokens/${tk.tok.id}`, {hidden: r.hidden}, 'update')}); return}
  if (x.closest('[data-rm]')) {const c = clone(cmbDoc()); const i = c.list.findIndex(r => r.id === rid); if (i < 0) return; c.list.splice(i, 1); if (c.turn >= c.list.length) c.turn = 0; else if (i < c.turn) c.turn--; saveCmb(c); return}
  const cx = x.closest('[data-cond-x]'); if (cx) {setCond(rid, cx.dataset.condX, false); return}
});
document.addEventListener('change', e => {
  if (st.tab !== 'combat') return; const x = e.target, row = x.closest('[data-row]'); if (!row) return; const rid = row.dataset.row;
  if (x.dataset.condAdd !== undefined && x.value) {setCond(rid, x.value, true); return}
  if (x.dataset.init !== undefined && dm()) cmbUpdateRow(rid, r => {r.init = x.value === '' ? null : +x.value});
});
document.addEventListener('keydown', e => {if (st.tab === 'combat' && e.key === 'Enter' && e.target.dataset?.amt !== undefined) {e.preventDefault(); const row = e.target.closest('[data-row]'); const n = Math.abs(+e.target.value || 0); if (n) {applyHpRow(row.dataset.row, -n); e.target.value = ''}}});
function setCond(rid, k, on) {
  const r = (cmbDoc().list || []).find(x => x.id === rid); if (!r) return;
  if (r.kind === 'pc' && r.charId) {const ch = getDoc('characters/' + r.charId); if (!ch) return; const s = new Set(ch.conds || []); on ? s.add(k) : s.delete(k); write('characters/' + r.charId, {conds: [...s]}, 'update'); return}
  if (!dm()) return; cmbUpdateRow(rid, rr => {const s = new Set(rr.conds || []); on ? s.add(k) : s.delete(k); rr.conds = [...s]});
}
function applyHpRow(rid, delta) {
  const r = (cmbDoc().list || []).find(x => x.id === rid); if (!r) return;
  if (r.kind === 'pc' && r.charId) {const ch = getDoc('characters/' + r.charId); if (ch) applyHpChar({...ch, id: r.charId}, delta < 0 ? '-1' : '1', Math.abs(delta)); return}
  cmbUpdateRow(rid, rr => {if (delta < 0) {let left = -delta; if (rr.tmp) {const u = Math.min(rr.tmp, left); rr.tmp -= u; left -= u} rr.hp = Math.max(0, (rr.hp || 0) - left)} else rr.hp = Math.min(rr.maxHp || 0, (rr.hp || 0) + delta)});
}
function allTokens() {const out = []; for (const m of col('maps')) for (const tk of col('maps/' + m.id + '/tokens')) out.push({map: m.id, tok: tk}); return out}
function otherModal() {
  openModal(`<h2>${esc(t('Afegir al combat'))}</h2><label class="field"><span>${esc(t('Nom'))}</span><input class="in" id="o-n" autofocus></label>
    <div class="grid2"><label class="field"><span>${esc(t('Punts de golpe'))}</span><input class="in" id="o-hp" type="number" value="10"></label><label class="field"><span>${esc(t('CA'))}</span><input class="in" id="o-ac" type="number" value="12"></label>
    <label class="field"><span>${esc(t('Bonificador d\'iniciativa'))}</span><input class="in" id="o-in" type="number" value="0"></label><label class="field"><span>${esc(t('Quants'))}</span><input class="in" id="o-c" type="number" min="1" max="20" value="1"></label></div>
    <label class="check"><input type="checkbox" id="o-map" ${mapId() ? 'checked' : ''}> ${esc(t('Posar també al mapa'))}</label><label class="check"><input type="checkbox" id="o-h"> ${esc(t('Amagat als jugadors'))}</label>
    <div class="foot"><button class="btn" id="o-x">${esc(t('Cancel·lar'))}</button><button class="btn pri" id="o-ok">${esc(t('Afegir'))}</button></div>`, (m, close) => {
    $('#o-x', m).onclick = close;
    $('#o-ok', m).onclick = () => {const n = $('#o-n', m).value.trim() || t('Enemic'), c = clamp(+$('#o-c', m).value || 1, 1, 20), hp = +$('#o-hp', m).value || 1, color = pick(TOKEN_COLORS), hid = $('#o-h', m).checked;
      for (let i = 1; i <= c; i++) {const name = c > 1 ? `${n} ${i}` : n; const cid = combatAdd({name, kind: 'npc', hp, maxHp: hp, ac: +$('#o-ac', m).value || 10, initMod: +$('#o-in', m).value || 0, hidden: hid}); if ($('#o-map', m).checked && mapId()) addToken({name, color, cmbId: cid, hidden: hid})}
      close()};
  });
}
// El torn ha canviat: avisa el jugador a qui li toca
let lastTurnKey = '';
watchDoc('combat/main', d => {
  if (!d || !d.active) {lastTurnKey = ''; return}
  const r = (d.list || [])[d.turn || 0]; if (!r) return; const key = d.round + ':' + d.turn + ':' + r.id;
  if (key === lastTurnKey) return; const first = !lastTurnKey; lastTurnKey = key; if (first) return;
  const ch = r.charId && getDoc('characters/' + r.charId);
  if (ch && ch.ownerId === S.uid && !dm()) toast(t('És el torn de {n}!', {n: ch.name}), 5000);
});
