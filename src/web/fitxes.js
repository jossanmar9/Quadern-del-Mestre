/*
 * Quadern del Mestre — fitxes de personatge (5a edició 2024).
 * Llicència GPL-3.0 o posterior.
 */
const fx = {sel: lsGet('qm-char') || null, sub: lsGet('qm-sheet-tab') || 'fitxa'};
const chars = () => col('characters').sort((a, b) => (a.npc ? 1 : 0) - (b.npc ? 1 : 0) || (a.name || '').localeCompare(b.name || ''));
const canEditChar = c => c && (dm() || c.ownerId === S.uid);
const className = id => {const c = CLASSES.find(x => x[0] === id); return c ? t(c[1]) : (id || '')};
const speciesName = id => {const c = SPECIES.find(x => x[0] === id); return c ? t(c[1]) : (id || '')};
const bgName = id => {const c = BACKGROUNDS.find(x => x[0] === id); return c ? t(c[1]) : (id || '')};
const abName = k => t(ABIL.find(a => a[0] === k)?.[2] || k);
const abShort = k => t(ABIL.find(a => a[0] === k)?.[1] || k);
const skillName = k => t(SKILLS.find(s => s[0] === k)?.[1] || k);
const condName = k => t((CONDS.find(c => c[0] === k) || EXTRA_CONDS.find(c => c[0] === k) || [k, k])[1]);

function blankChar(owner) {
  return {ownerId: owner || S.uid, name: '', color: pick(TOKEN_COLORS), species: 'human', cls: 'fighter', subclass: '', level: 1, background: 'soldier',
    alignment: '', xp: 0, ab: {str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10}, saves: {}, skills: {}, ac: 10, speed: 9,
    hp: 10, maxHp: 10, tmp: 0, hdUsed: 0, death: [0, 0], conds: [], exh: 0, insp: false, initBonus: 0,
    attacks: [], spellAb: '', slots: {}, pact: {max: 0, used: 0, lvl: 1}, spells: [], inv: [], coins: {cp: 0, sp: 0, ep: 0, gp: 0, pp: 0},
    feats: '', profs: '', langs: '', notes: '', created: Date.now()};
}
function charCalc(c) {
  const lv = clamp(+c.level || 1, 1, 20), pb = profBonus(lv), mods = {};
  for (const [k] of ABIL) mods[k] = modOf(c.ab?.[k]);
  const save = k => mods[k] + (c.saves?.[k] ? pb : 0);
  const skill = k => {const s = SKILLS.find(x => x[0] === k); return mods[s[2]] + (c.skills?.[k] || 0) * pb};
  const sa = c.spellAb || CLASSES.find(x => x[0] === c.cls)?.[3] || '';
  const cl = CLASSES.find(x => x[0] === c.cls);
  return {lv, pb, mods, save, skill, init: mods.dex + (+c.initBonus || 0), passive: 10 + skill('perc'), hd: cl ? cl[2] : 8,
    spellAb: sa, dc: sa ? 8 + pb + mods[sa] : null, atk: sa ? pb + mods[sa] : null};
}
const hpPct = (hp, mx) => mx > 0 ? clamp(hp / mx, 0, 1) : 0;
const hpCls = p => p <= .25 ? 'low' : p <= .5 ? 'mid' : '';
function avatar(c, size = 36) {
  return c.portrait ? `<img class="cav" src="${esc(fileUrl(c.portrait))}" width="${size}" height="${size}" alt="">`
    : `<span class="cav ini" style="width:${size}px;height:${size}px;background:${esc(c.color || '#888')};font-size:${Math.round(size * .4)}px">${esc((c.name || '?').trim().slice(0, 1).toUpperCase())}</span>`;
}
/** Escriu un camp niat ("ab.str") a la fitxa */
function setPath(obj, path, val) {const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach(k => {if (!isObj(o[k])) o[k] = {}; o = o[k]}); o[ks.at(-1)] = val; return obj}
function charWrite(id, path, val) {write('characters/' + id, setPath({}, path, val), 'update')}

TABS.personatges = {label: L('Personatges'), watch: ['characters/', 'users/'], render: renderChars};
function renderChars() {
  const list = chars().filter(c => dm() || !c.secret);
  if (fx.sel && !list.find(c => c.id === fx.sel)) fx.sel = null;
  if (!fx.sel) fx.sel = (list.find(c => c.ownerId === S.uid) || list[0])?.id || null;
  const c = list.find(x => x.id === fx.sel);
  $('#main').innerHTML = `<div class="cards">${list.map(x => {const p = hpPct(x.hp, x.maxHp);
      return `<button class="ccard" data-char="${x.id}" aria-pressed="${x.id === fx.sel}">${x.npc ? `<span class="badge">${esc(t(x.secret ? 'PNJ secret' : 'PNJ'))}</span>` : ''}
      <span class="nm">${avatar(x, 30)}<span>${esc(x.name || t('Sense nom'))}</span></span>
      <span class="sub">${esc([speciesName(x.species), className(x.cls), x.level ? t('nivell {n}', {n: x.level}) : ''].filter(Boolean).join(' · '))}</span>
      <span class="meta">${esc(x.npc ? t('del màster') : userName(x.ownerId))} · ${esc(t('PG'))} ${x.hp}/${x.maxHp}</span><div class="hpbar"><i class="${hpCls(p)}" style="width:${p * 100}%"></i></div></button>`}).join('')}
    <button class="ccard add" id="char-new">+ ${esc(t('Nou personatge'))}</button></div>
    ${c ? sheetHtml(c) : `<div class="empty"><b>${esc(t('Encara no hi ha personatges'))}</b>${esc(t('Crea el teu personatge amb el botó de dalt. El màster pot crear-ne per a tothom, i també personatges no jugadors.'))}</div>`}`;
}
function sheetHtml(c) {
  const k = charCalc(c), ed = canEditChar(c), dis = ed ? '' : 'disabled';
  const inp = (f, v, type = 'text', extra = '') => `<input class="in" data-f="${f}" type="${type}" value="${esc(v ?? '')}" ${dis} ${extra}>`;
  const sel = (f, opts, v) => `<select class="in" data-f="${f}" ${dis}>${opts.map(([id, nm]) => `<option value="${esc(id)}" ${id === v ? 'selected' : ''}>${esc(t(nm))}</option>`).join('')}</select>`;
  const subs = [['fitxa', L('Fitxa')], ['combat', L('Combat')], ['conjurs', L('Conjurs')], ['inventari', L('Inventari')], ['notes', L('Trets i notes')]];
  const nm = esc(c.name || t('Sense nom'));
  return `<section class="sheet" data-cid="${c.id}">
    <div class="sheet-top">
      <button class="portrait-btn" id="c-portrait" ${ed ? '' : 'disabled'} title="${esc(t('Canviar el retrat'))}">${avatar(c, 84)}</button>
      <div class="sheet-head">
        <label class="field name-f"><span>${esc(t('Nom'))}</span><input id="c-name" class="in" data-f="name" value="${esc(c.name)}" ${dis} placeholder="${esc(t('Nom del personatge'))}"></label>
        <label class="field"><span>${esc(t('Espècie'))}</span>${sel('species', [...SPECIES, ['', L('Una altra')]], SPECIES.some(s => s[0] === c.species) ? c.species : '')}</label>
        <label class="field"><span>${esc(t('Classe'))}</span>${sel('cls', [...CLASSES.map(x => [x[0], x[1]]), ['', L('Una altra')]], CLASSES.some(s => s[0] === c.cls) ? c.cls : '')}</label>
        <label class="field"><span>${esc(t('Subclasse'))}</span>${inp('subclass', c.subclass)}</label>
        <label class="field"><span>${esc(t('Nivell'))}</span>${inp('level', c.level, 'number', 'min="1" max="20"')}</label>
        <label class="field"><span>${esc(t('Trasfons'))}</span>${sel('background', [...BACKGROUNDS, ['', L('Un altre')]], BACKGROUNDS.some(s => s[0] === c.background) ? c.background : '')}</label>
        <label class="field"><span>${esc(t('Alineament'))}</span>${sel('alignment', [['', '—'], ...ALIGN.map(a => [a, a])], c.alignment)}</label>
        <label class="field"><span>${esc(t('PX'))}</span>${inp('xp', c.xp, 'number', 'min="0"')}</label>
        ${ed && k.lv < 20 ? `<div class="field lvl-f"><span>${xpReady(c) ? esc(t('Ja pot pujar!')) : '&nbsp;'}</span><button class="btn sm${xpReady(c) ? ' pri' : ''}" id="c-lvlup">⬆ ${esc(t('Pujar de nivell'))}</button></div>` : ''}
        <div class="field"><span>${esc(t('Color'))}</span><div class="swatches">${TOKEN_COLORS.map(col => `<button class="sw" style="background:${col}" data-color="${col}" aria-pressed="${c.color === col}" ${dis} aria-label="${col}"></button>`).join('')}</div></div>
      </div>
    </div>
    <div class="vitals">
      <div class="vital"><span>${esc(t('Classe d\'armadura'))}</span>${ed ? `<input data-f="ac" type="number" value="${esc(c.ac)}">` : `<b>${esc(c.ac)}</b>`}</div>
      <button class="vital" data-roll="1d20${sgn(k.init).replace('−', '-')}" data-roll-label="${esc(t('{n}: iniciativa', {n: c.name}))}"><span>${esc(t('Iniciativa'))}</span><b>${sgn(k.init)}</b></button>
      <div class="vital"><span>${esc(t('Velocitat (m)'))}</span>${ed ? `<input data-f="speed" type="number" step="1.5" value="${esc(c.speed)}">` : `<b>${esc(c.speed)}</b>`}</div>
      <div class="vital"><span>${esc(t('Bonificador de competència'))}</span><b>${sgn(k.pb)}</b></div>
      <div class="vital"><span>${esc(t('Percepció passiva'))}</span><b>${k.passive}</b></div>
    </div>
    <div class="hp">
      <div class="hp-nums"><input data-f="hp" type="number" value="${esc(c.hp)}" ${dis} aria-label="${esc(t('Punts de golpe'))}"><small>/</small><input data-f="maxHp" type="number" value="${esc(c.maxHp)}" ${dis} aria-label="${esc(t('Punts de golpe màxims'))}"><small>${esc(t('PG'))}</small>
        <input data-f="tmp" type="number" value="${esc(c.tmp || 0)}" ${dis} aria-label="${esc(t('Punts de golpe temporals'))}" style="width:56px"><small>${esc(t('temp.'))}</small></div>
      <div class="hpbar"><i class="${hpCls(hpPct(c.hp, c.maxHp))}" style="width:${hpPct(c.hp, c.maxHp) * 100}%"></i></div>
      ${ed ? `<div class="hp-quick row"><input class="in mono" id="hp-amt" type="number" min="0" placeholder="0" aria-label="${esc(t('Quantitat'))}" style="width:80px"><button class="btn sm danger" data-hp="-1">${esc(t('Dany'))}</button><button class="btn sm" data-hp="1">${esc(t('Curació'))}</button><button class="btn sm" data-hp="tmp">${esc(t('Temporals'))}</button>
        <span class="muted small" style="margin-left:auto">${esc(t('Daus de golpe'))}: ${k.lv - (c.hdUsed || 0)}/${k.lv} d${k.hd}</span><button class="btn sm" id="rest-short">${esc(t('Descans curt'))}</button><button class="btn sm" id="rest-long">${esc(t('Descans llarg'))}</button></div>` : ''}
    </div>
    <nav class="subtabs" role="tablist">${subs.map(([id, lb]) => `<button role="tab" data-sub="${id}" aria-selected="${fx.sub === id}">${esc(t(lb))}</button>`).join('')}</nav>
    <div class="subpane">${({fitxa: sheetMain, combat: sheetCombat, conjurs: sheetSpells, inventari: sheetInv, notes: sheetNotes}[fx.sub] || sheetMain)(c, k, ed, dis)}</div>
    <div class="sheet-foot"><span class="muted small">${c.npc ? esc(t('Personatge no jugador del màster.')) : esc(t('Jugador: {n}', {n: userName(c.ownerId)}))}${ed ? ' · ' + esc(t('Els canvis es guarden sols.')) : ''}</span>
      <span class="row">${dm() ? `<label class="check"><input type="checkbox" data-fb="npc" ${c.npc ? 'checked' : ''}> ${esc(t('PNJ'))}</label><label class="check"><input type="checkbox" data-fb="secret" ${c.secret ? 'checked' : ''}> ${esc(t('Amagat als jugadors'))}</label>
        <select class="in" id="c-owner" style="width:auto">${[...new Set([c.ownerId, S.uid, ...Object.keys(Object.fromEntries([...mem.keys()].filter(p => p.startsWith('users/')).map(p => [p.slice(6), 1])))])].map(u => `<option value="${esc(u)}" ${u === c.ownerId ? 'selected' : ''}>${esc(userName(u))}</option>`).join('')}</select>` : ''}
      ${ed ? `<button class="btn sm" id="c-token">${esc(t('Posar al mapa'))}</button><button class="btn sm danger" id="c-del">${esc(t('Esborrar'))}</button>` : ''}</span></div>
  </section>`;
}
function sheetMain(c, k, ed, dis) {
  return `<div class="cols"><div><h3>${esc(t('Característiques'))}</h3><div class="abils">${ABIL.map(([id, ab, nm]) => `<div class="abil"><span class="ab">${esc(t(ab))}</span>
      <button class="modb" data-roll="1d20${sgn(k.mods[id]).replace('−', '-')}" data-roll-label="${esc(t('{n}: prova de {x}', {n: c.name, x: t(nm)}))}" title="${esc(t('Tirar una prova de {x}', {x: t(nm)}))}">${sgn(k.mods[id])}</button>
      <input type="number" data-f="ab.${id}" value="${esc(c.ab?.[id] ?? 10)}" min="1" max="30" ${dis} aria-label="${esc(t(nm))}">
      <span class="save"><input type="checkbox" data-fb="saves.${id}" ${c.saves?.[id] ? 'checked' : ''} ${dis} aria-label="${esc(t('Competència en salvacions de {x}', {x: t(nm)}))}"><button data-roll="1d20${sgn(k.save(id)).replace('−', '-')}" data-roll-label="${esc(t('{n}: salvació de {x}', {n: c.name, x: t(nm)}))}">${esc(t('Salv.'))} ${sgn(k.save(id))}</button></span></div>`).join('')}</div>
      <div class="row" style="margin-top:12px"><label class="check"><input type="checkbox" data-fb="insp" ${c.insp ? 'checked' : ''} ${dis}> ${esc(t('Inspiració heroica'))}</label></div></div>
    <div><h3>${esc(t('Habilitats'))}</h3><div class="skills">${SKILLS.map(([id, nm, ab]) => {const lvl = c.skills?.[id] || 0;
      return `<div class="sk"><button class="prof p${lvl}" data-prof="${id}" ${dis} title="${esc(t(lvl === 2 ? 'Expert' : lvl ? 'Competent' : 'Sense competència'))}" aria-label="${esc(t('Competència en {x}', {x: t(nm)}))}">${lvl === 2 ? '◆' : lvl ? '●' : '○'}</button><b>${sgn(k.skill(id))}</b>
        <button data-roll="1d20${sgn(k.skill(id)).replace('−', '-')}" data-roll-label="${esc(t('{n}: {x}', {n: c.name, x: t(nm)}))}"><span>${esc(t(nm))}</span><small>${esc(abShort(ab))}</small></button></div>`}).join('')}</div></div></div>`;
}
function sheetCombat(c, k, ed, dis) {
  const atks = c.attacks || [];
  return `<div class="cols"><div><h3>${esc(t('Atacs'))}</h3>
      <div class="atk-list">${atks.map(a => `<div class="atk" data-atk="${a.id}">
        ${ed ? `<input class="in" data-a="name" value="${esc(a.name)}" placeholder="${esc(t('Arma o atac'))}"><input class="in mono" data-a="bonus" value="${esc(a.bonus)}" placeholder="+5" style="width:64px"><input class="in mono" data-a="dmg" value="${esc(a.dmg)}" placeholder="1d8+3" style="width:110px"><input class="in" data-a="type" value="${esc(a.type || '')}" placeholder="${esc(t('tipus'))}" style="width:110px">` : `<b>${esc(a.name)}</b><span class="mono">${esc(a.bonus)}</span><span class="mono">${esc(a.dmg)}</span><span class="muted">${esc(a.type || '')}</span>`}
        <button class="btn sm" data-atk-roll="hit">${esc(t('Atacar'))}</button><button class="btn sm" data-atk-roll="dmg">${esc(t('Dany'))}</button><button class="btn sm" data-atk-roll="crit" title="${esc(t('Dany de crític (dobla els daus)'))}">${esc(t('Crític'))}</button>
        ${ed ? `<button class="btn sm danger" data-atk-del aria-label="${esc(t('Esborrar'))}">×</button>` : ''}</div>`).join('') || `<p class="muted small">${esc(t('Encara no hi ha atacs.'))}</p>`}</div>
      ${ed ? `<div class="row" style="margin-top:8px"><button class="btn sm" id="atk-add">+ ${esc(t('Atac'))}</button><button class="btn sm" id="atk-srd">+ ${esc(t('Arma del SRD'))}</button></div>` : ''}
    </div>
    <div><h3>${esc(t('Estats'))}</h3><div class="conds">${[...CONDS, ...EXTRA_CONDS].map(([id, nm]) => `<button class="cond toggle" data-cond="${id}" aria-pressed="${(c.conds || []).includes(id)}" ${dis}>${esc(t(nm))}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><span class="small">${esc(t('Esgotament'))}</span>${[0, 1, 2, 3, 4, 5, 6].map(n => `<button class="btn sm" data-exh="${n}" aria-pressed="${(c.exh || 0) === n}" ${dis}>${n}</button>`).join('')}</div>
      <h3 style="margin-top:18px">${esc(t('Salvacions contra la mort'))}</h3>
      <div class="death row"><span class="small">${esc(t('Èxits'))}</span>${[1, 2, 3].map(n => `<button class="pip-b ok" data-death="0:${n}" aria-pressed="${(c.death?.[0] || 0) >= n}" ${dis}></button>`).join('')}
        <span class="small" style="margin-left:14px">${esc(t('Fracassos'))}</span>${[1, 2, 3].map(n => `<button class="pip-b ko" data-death="1:${n}" aria-pressed="${(c.death?.[1] || 0) >= n}" ${dis}></button>`).join('')}
        <button class="btn sm" data-roll="1d20" data-roll-label="${esc(t('{n}: salvació contra la mort', {n: c.name}))}" style="margin-left:auto">${esc(t('Tirar'))}</button></div>
      <h3 style="margin-top:18px">${esc(t('Bonificador extra d\'iniciativa'))}</h3>${`<input class="in" type="number" data-f="initBonus" value="${esc(c.initBonus || 0)}" ${dis} style="width:90px">`}
    </div></div>`;
}
function spellRow(s, c, ed) {
  const e = s.sid && srdGet('conjuro', s.sid), cc = e?.c || {};
  const name = e ? e.e.nombre : s.name;
  return `<div class="spell" data-sp="${esc(s.sid || s.name)}">${ed && (s.lvl || cc.nivel) ? `<input type="checkbox" data-sp-prep ${s.prep ? 'checked' : ''} title="${esc(t('Preparat'))}" aria-label="${esc(t('Preparat'))}">` : '<span></span>'}
    <button class="link" data-sp-open>${esc(name)}</button><span class="muted small">${e ? esc([e.e.tiempo, e.e.alcance].filter(Boolean).join(' · ')) : ''}${cc.concentracion ? ' · <b title="' + esc(t('Concentració')) + '">C</b>' : ''}${cc.ritual ? ' · <b title="' + esc(t('Ritual')) + '">R</b>' : ''}</span>
    ${ed ? `<button class="btn sm danger" data-sp-del aria-label="${esc(t('Esborrar'))}">×</button>` : ''}</div>`;
}
function sheetSpells(c, k, ed, dis) {
  if (!SRD) {loadSRD().then(() => {if (st.tab === 'personatges' && fx.sub === 'conjurs') scheduleRender()}); return `<p class="muted">${esc(t('Carregant el compendi…'))}</p>`}
  const cl = CLASSES.find(x => x[0] === c.cls), type = cl?.[4];
  const byLvl = {}; for (const s of c.spells || []) {const lv = s.sid ? (srdGet('conjuro', s.sid)?.c?.nivel ?? 0) : (+s.lvl || 0); (byLvl[lv] = byLvl[lv] || []).push(s)}
  const topLv = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(lv => c.slots?.[lv]?.max).pop() || 0;
  const slotsHtml = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(lv => {const sl = c.slots?.[lv] || {max: 0, used: 0}; if (!sl.max && (!ed || lv > Math.max(1, topLv + 1))) return '';
    return `<div class="slot"><span class="small">${esc(t('Nivell {n}', {n: lv}))}</span>${ed ? `<input type="number" min="0" max="9" data-f="slots.${lv}.max" value="${sl.max || 0}" aria-label="${esc(t('Espais de nivell {n}', {n: lv}))}">` : ''}
      <span class="pips">${Array.from({length: sl.max || 0}, (_, i) => `<button class="pip-b" data-slot="${lv}:${i + 1}" aria-pressed="${i < (sl.used || 0)}" ${dis} title="${esc(t('Gastat'))}"></button>`).join('')}</span></div>`}).join('');
  return `<div class="spell-head row">
      <label class="field" style="width:180px"><span>${esc(t('Característica'))}</span><select class="in" data-f="spellAb" ${dis}><option value="">${esc(t('Segons la classe'))}</option>${ABIL.map(([id, , nm]) => `<option value="${id}" ${c.spellAb === id ? 'selected' : ''}>${esc(t(nm))}</option>`).join('')}</select></label>
      ${k.spellAb ? `<div class="vital sm"><span>${esc(t('CD de salvació'))}</span><b>${k.dc}</b></div><button class="vital sm" data-roll="1d20${sgn(k.atk).replace('−', '-')}" data-roll-label="${esc(t('{n}: atac de conjur', {n: c.name}))}"><span>${esc(t('Atac de conjur'))}</span><b>${sgn(k.atk)}</b></button>` : `<p class="muted small">${esc(t('Aquesta classe no llança conjurs; tria una característica si en té per una altra via.'))}</p>`}
      ${ed && type ? `<button class="btn sm" id="slots-fill">${esc(t('Omplir espais segons la classe'))}</button>` : ''}</div>
    ${type === 'pact' || c.pact?.max ? `<div class="slot"><span class="small">${esc(t('Espais de pacte (nivell {n})', {n: c.pact?.lvl || 1}))}</span><span class="pips">${Array.from({length: c.pact?.max || 0}, (_, i) => `<button class="pip-b" data-pact="${i + 1}" aria-pressed="${i < (c.pact?.used || 0)}" ${dis}></button>`).join('')}</span></div>` : ''}
    <div class="slots">${slotsHtml}</div>
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(lv => byLvl[lv]).map(lv => `<h3>${esc(lv ? t('Nivell {n}', {n: lv}) : t('Trucs'))}</h3><div class="spells">${byLvl[lv].map(s => spellRow(s, c, ed)).join('')}</div>`).join('') || `<p class="muted">${esc(t('Encara no hi ha conjurs.'))}</p>`}
    ${ed ? `<div class="row" style="margin-top:10px"><button class="btn sm" id="sp-add">+ ${esc(t('Conjur del SRD'))}</button><button class="btn sm" id="sp-custom">+ ${esc(t('Conjur propi'))}</button></div>` : ''}`;
}
function sheetInv(c, k, ed, dis) {
  const inv = c.inv || [];
  const wt = inv.reduce((s, i) => s + (+i.wt || 0) * (+i.qty || 1), 0);
  return `<h3>${esc(t('Monedes'))}</h3><div class="coins">${COINS.map(([id, ab]) => `<label class="coin"><span title="${esc(t(COIN_NAMES[id]))}">${esc(t(ab))}</span><input type="number" min="0" data-f="coins.${id}" value="${esc(c.coins?.[id] || 0)}" ${dis}></label>`).join('')}</div>
    <h3 style="margin-top:16px">${esc(t('Equip'))}</h3>
    <div class="inv">${inv.map(i => `<div class="inv-row" data-inv="${i.id}">${ed ? `<input type="checkbox" data-i="eq" ${i.eq ? 'checked' : ''} title="${esc(t('Equipat'))}" aria-label="${esc(t('Equipat'))}"><input class="in" data-i="name" value="${esc(i.name)}"><input class="in mono" type="number" min="0" data-i="qty" value="${esc(i.qty ?? 1)}" aria-label="${esc(t('Quantitat'))}"><input class="in mono" type="number" min="0" step="0.1" data-i="wt" value="${esc(i.wt ?? '')}" placeholder="kg" aria-label="${esc(t('Pes (kg)'))}"><input class="in" data-i="notes" value="${esc(i.notes || '')}" placeholder="${esc(t('Notes'))}"><button class="btn sm danger" data-inv-del aria-label="${esc(t('Esborrar'))}">×</button>`
      : `<span>${i.eq ? '◆' : ''}</span><b>${esc(i.name)}</b><span class="mono">×${esc(i.qty ?? 1)}</span><span class="mono">${i.wt ? esc(i.wt) + ' kg' : ''}</span><span class="muted">${esc(i.notes || '')}</span>`}</div>`).join('') || `<p class="muted small">${esc(t('La motxilla està buida.'))}</p>`}</div>
    <div class="row" style="margin-top:8px">${ed ? `<button class="btn sm" id="inv-add">+ ${esc(t('Objecte'))}</button><button class="btn sm" id="inv-srd">+ ${esc(t('Del SRD'))}</button>` : ''}<span class="muted small" style="margin-left:auto">${esc(t('Pes total: {n} kg', {n: Math.round(wt * 10) / 10}))}</span></div>`;
}
function sheetNotes(c, k, ed, dis) {
  const ta = (f, lb, ph) => `<label class="field"><span>${esc(t(lb))}</span><textarea class="in" data-f="${f}" ${dis} placeholder="${esc(t(ph))}">${esc(c[f] || '')}</textarea></label>`;
  return `<div class="texts">${ta('feats', L('Trets, dots i capacitats'), L('Trets de classe, d\'espècie, dots…'))}${ta('profs', L('Competències'), L('Armes, armadures, eines…'))}${ta('langs', L('Idiomes'), L('Comú, èlfic…'))}${ta('notes', L('Notes i història'), L('Aspecte, personalitat, contactes…'))}</div>`;
}

/* ---- esdeveniments de la fitxa ---- */
const curChar = () => fx.sel && getDoc('characters/' + fx.sel) ? {...getDoc('characters/' + fx.sel), id: fx.sel} : null;
document.addEventListener('click', async e => {
  if (st.tab !== 'personatges') return;
  const x = e.target;
  const card = x.closest('[data-char]'); if (card) {fx.sel = card.dataset.char; lsSet('qm-char', fx.sel); renderChars(); return}
  if (x.closest('#char-new')) {const id = newId(); const c = blankChar(); c.name = dm() ? t('Nou personatge') : (mem.get('users/' + S.uid)?.name ? t('Personatge de {n}', {n: mem.get('users/' + S.uid).name}) : t('Nou personatge')); write('characters/' + id, c); fx.sel = id; fx.sub = 'fitxa'; setTimeout(renderChars, 30); return}
  const sub = x.closest('[data-sub]'); if (sub) {fx.sub = sub.dataset.sub; lsSet('qm-sheet-tab', fx.sub); renderChars(); return}
  const c = curChar(); if (!c) return; const id = c.id, ed = canEditChar(c);
  if (!ed && !x.closest('[data-sp-open]')) return;
  const sw = x.closest('[data-color]'); if (sw) {charWrite(id, 'color', sw.dataset.color); return}
  if (x.closest('#c-portrait')) {const f = await pickImage('portrait'); if (f) charWrite(id, 'portrait', f); return}
  const pr = x.closest('[data-prof]'); if (pr) {const k = pr.dataset.prof; charWrite(id, 'skills.' + k, ((c.skills?.[k] || 0) + 1) % 3); return}
  const hpb = x.closest('[data-hp]'); if (hpb) {const n = Math.abs(+$('#hp-amt').value || 0); if (!n) {$('#hp-amt').focus(); return} applyHpChar(c, hpb.dataset.hp, n); $('#hp-amt').value = ''; return}
  if (x.closest('#rest-long')) {longRest(c); return}
  if (x.closest('#c-lvlup')) {levelUpModal(c); return}
  if (x.closest('#rest-short')) {shortRest(c); return}
  const cd = x.closest('[data-cond]'); if (cd) {const s = new Set(c.conds || []); s.has(cd.dataset.cond) ? s.delete(cd.dataset.cond) : s.add(cd.dataset.cond); write('characters/' + id, {conds: [...s]}, 'update'); return}
  const ex = x.closest('[data-exh]'); if (ex) {charWrite(id, 'exh', +ex.dataset.exh); return}
  const dt = x.closest('[data-death]'); if (dt) {const [w, n] = dt.dataset.death.split(':').map(Number); const d = [...(c.death || [0, 0])]; d[w] = d[w] >= n ? n - 1 : n; write('characters/' + id, {death: d}, 'update'); return}
  const sl = x.closest('[data-slot]'); if (sl) {const [lv, n] = sl.dataset.slot.split(':').map(Number); const u = c.slots?.[lv]?.used || 0; charWrite(id, `slots.${lv}.used`, u >= n ? n - 1 : n); return}
  const pc = x.closest('[data-pact]'); if (pc) {const n = +pc.dataset.pact; const u = c.pact?.used || 0; charWrite(id, 'pact.used', u >= n ? n - 1 : n); return}
  if (x.closest('#slots-fill')) {fillSlots(c); return}
  if (x.closest('#atk-add')) {write('characters/' + id, {attacks: [...(c.attacks || []), {id: newId(), name: '', bonus: sgn(charCalc(c).pb + charCalc(c).mods.str), dmg: '1d6' + sgn(charCalc(c).mods.str).replace('−', '-'), type: ''}]}, 'update'); return}
  if (x.closest('#atk-srd')) {srdPicker({kinds: ['arma'], title: t('Afegir una arma del SRD'), onPick: en => addWeapon(c, en)}); return}
  const ar = x.closest('[data-atk-roll]'); if (ar) {const a = (c.attacks || []).find(q => q.id === ar.closest('[data-atk]').dataset.atk); if (a) rollAttack(c, a, ar.dataset.atkRoll); return}
  if (x.closest('[data-atk-del]')) {const aid = x.closest('[data-atk]').dataset.atk; write('characters/' + id, {attacks: (c.attacks || []).filter(a => a.id !== aid)}, 'update'); return}
  if (x.closest('#sp-add')) {const cl = c.cls; srdPicker({kinds: ['conjuro'], title: t('Afegir un conjur'), filter: en => !cl || !CLASSES.some(q => q[0] === cl) || (en.c?.clases || []).includes(cl.charAt(0).toUpperCase() + cl.slice(1)), filterLabel: t('Només els de la classe'), onPick: en => {if ((c.spells || []).some(s => s.sid === en.id)) return; write('characters/' + id, {spells: [...(c.spells || []), {sid: en.id, prep: true}]}, 'update'); toast(t('Afegit: {x}', {x: en.e.nombre}))}}); return}
  if (x.closest('#sp-custom')) {openModal(`<h2>${esc(t('Conjur propi'))}</h2><label class="field"><span>${esc(t('Nom'))}</span><input class="in" id="spc-n" autofocus></label><label class="field"><span>${esc(t('Nivell (0 per a truc)'))}</span><input class="in" id="spc-l" type="number" min="0" max="9" value="1"></label><label class="field"><span>${esc(t('Descripció'))}</span><textarea class="in" id="spc-d"></textarea></label><div class="foot"><button class="btn" id="spc-x">${esc(t('Cancel·lar'))}</button><button class="btn pri" id="spc-ok">${esc(t('Afegir'))}</button></div>`,
    (m, close) => {$('#spc-x', m).onclick = close; $('#spc-ok', m).onclick = () => {const n = $('#spc-n', m).value.trim(); if (!n) return; write('characters/' + id, {spells: [...(c.spells || []), {name: n, lvl: +$('#spc-l', m).value || 0, desc: $('#spc-d', m).value, prep: true}]}, 'update'); close()}}); return}
  const so = x.closest('[data-sp-open]'); if (so) {const key = so.closest('[data-sp]').dataset.sp; const s = (c.spells || []).find(q => (q.sid || q.name) === key); if (s?.sid) showEntry('conjuro', s.sid); else if (s) openModal(`<h2>${esc(s.name)}</h2><p class="muted">${esc(s.lvl ? t('Nivell {n}', {n: s.lvl}) : t('Truc'))}</p><div class="srd-txt"><p>${esc(s.desc || '').replace(/\n/g, '<br>')}</p></div><div class="foot"><button class="btn pri" id="x">${esc(t('Tancar'))}</button></div>`, (m, close) => {$('#x', m).onclick = close}); return}
  if (x.closest('[data-sp-del]')) {const key = x.closest('[data-sp]').dataset.sp; write('characters/' + id, {spells: (c.spells || []).filter(s => (s.sid || s.name) !== key)}, 'update'); return}
  if (x.closest('#inv-add')) {write('characters/' + id, {inv: [...(c.inv || []), {id: newId(), name: t('Objecte nou'), qty: 1, wt: 0, notes: '', eq: false}]}, 'update'); return}
  if (x.closest('#inv-srd')) {srdPicker({kinds: ['equipo', 'arma', 'armadura', 'herramienta', 'objeto'], title: t('Afegir equip del SRD'), onPick: en => {const w = parseWeight(en); write('characters/' + id, {inv: [...(c.inv || []), {id: newId(), name: en.e.nombre, qty: 1, wt: w, notes: '', eq: false, ref: en.k + '/' + en.id}]}, 'update'); toast(t('Afegit: {x}', {x: en.e.nombre}))}}); return}
  if (x.closest('[data-inv-del]')) {const iid = x.closest('[data-inv]').dataset.inv; write('characters/' + id, {inv: (c.inv || []).filter(i => i.id !== iid)}, 'update'); return}
  if (x.closest('#c-token')) {placeCharToken(c); return}
  if (x.id === 'c-del') {armed(x, () => {del('characters/' + id); fx.sel = null; setTimeout(renderChars, 30)}, t('Prem de nou per a esborrar')); return}
});
document.addEventListener('change', e => {
  if (st.tab !== 'personatges') return;
  const x = e.target, c = curChar(); if (!c || !canEditChar(c)) return; const id = c.id;
  if (x.dataset.fb) {charWrite(id, x.dataset.fb, x.checked); return}
  if (x.id === 'c-owner' && dm()) {charWrite(id, 'ownerId', x.value); return}
  if (x.dataset.spPrep !== undefined) {const key = x.closest('[data-sp]').dataset.sp; write('characters/' + id, {spells: (c.spells || []).map(s => (s.sid || s.name) === key ? {...s, prep: x.checked} : s)}, 'update'); return}
  if (x.dataset.i === 'eq') {const iid = x.closest('[data-inv]').dataset.inv; write('characters/' + id, {inv: (c.inv || []).map(i => i.id === iid ? {...i, eq: x.checked} : i)}, 'update'); return}
  if (x.tagName === 'SELECT' && x.dataset.f) {charWrite(id, x.dataset.f, x.value); if (x.dataset.f === 'cls' || x.dataset.f === 'level') setTimeout(renderChars, 30)}
});
const sheetInput = debounce((x, id) => {
  const c = getDoc('characters/' + id); if (!c) return;
  if (x.dataset.f) {const v = x.type === 'number' ? (x.value === '' ? 0 : +x.value) : x.value; charWrite(id, x.dataset.f, v); return}
  if (x.dataset.a) {const aid = x.closest('[data-atk]').dataset.atk; write('characters/' + id, {attacks: (c.attacks || []).map(a => a.id === aid ? {...a, [x.dataset.a]: x.value} : a)}, 'update'); return}
  if (x.dataset.i) {const iid = x.closest('[data-inv]').dataset.inv; const v = x.type === 'number' ? +x.value : x.value; write('characters/' + id, {inv: (c.inv || []).map(i => i.id === iid ? {...i, [x.dataset.i]: v} : i)}, 'update')}
}, 350);
document.addEventListener('input', e => {
  if (st.tab !== 'personatges') return;
  const x = e.target; if (x.tagName === 'SELECT' || x.type === 'checkbox') return;
  if (!(x.dataset.f || x.dataset.a || x.dataset.i)) return;
  const c = curChar(); if (!c || !canEditChar(c)) return;
  sheetInput(x, c.id);
});

function applyHpChar(c, mode, n) {
  const upd = {};
  if (mode === 'tmp') upd.tmp = Math.max(c.tmp || 0, n);
  else if (+mode < 0) {let left = n; const tmp = c.tmp || 0; if (tmp) {const u = Math.min(tmp, left); upd.tmp = tmp - u; left -= u} upd.hp = Math.max(0, (c.hp || 0) - left)}
  else upd.hp = Math.min(c.maxHp || 0, (c.hp || 0) + n);
  if (upd.hp > 0) upd.death = [0, 0];
  write('characters/' + c.id, upd, 'update');
  if (+mode < 0 && n > 0 && (c.conds || []).includes('conc')) {
    const down = upd.hp != null && upd.hp <= 0;
    concCheck({name: c.name, mod: charCalc(c).save('con'), dmg: n, down, priv: false,
      drop: () => {const ch = getDoc('characters/' + c.id); if (ch) write('characters/' + c.id, {conds: (ch.conds || []).filter(k => k !== 'conc')}, 'update')}});
  }
}
function longRest(c) {
  const k = charCalc(c), slots = {};
  for (const lv in (c.slots || {})) slots[lv] = {...c.slots[lv], used: 0};
  write('characters/' + c.id, {hp: c.maxHp, tmp: 0, death: [0, 0], slots, pact: {...(c.pact || {}), used: 0}, hdUsed: Math.max(0, (c.hdUsed || 0) - Math.max(1, Math.floor(k.lv / 2))), exh: Math.max(0, (c.exh || 0) - 1)}, 'update');
  toast(t('{n} ha fet un descans llarg.', {n: c.name}));
}
function shortRest(c) {
  const k = charCalc(c), left = k.lv - (c.hdUsed || 0);
  if (left <= 0) {toast(t('No queden daus de golpe.')); return}
  const r = doRoll(M('{n}: dau de golpe', {n: c.name}), `1d${k.hd}${sgn(k.mods.con).replace('−', '-')}`, {adv: '', quiet: true});
  if (!r) return;
  write('characters/' + c.id, {hp: Math.min(c.maxHp, (c.hp || 0) + Math.max(1, r.total)), hdUsed: (c.hdUsed || 0) + 1, pact: {...(c.pact || {}), used: 0}}, 'update');
}
/** Els espais de conjur que li toquen a la classe en un nivell (null si la classe no en té) */
function slotsFor(c, lvIn) {
  const cl = CLASSES.find(x => x[0] === c.cls); if (!cl || !cl[4]) return null; const lv = clamp(lvIn, 1, 20);
  if (cl[4] === 'pact') {const [n, sl] = SLOTS_PACT[lv]; return {pact: {max: n, used: Math.min(c.pact?.used || 0, n), lvl: sl}}}
  const tb = cl[4] === 'full' ? SLOTS_FULL : SLOTS_HALF, slots = {};
  for (let i = 1; i <= 9; i++) slots[i] = {max: tb[lv][i - 1] || 0, used: Math.min(c.slots?.[i]?.used || 0, tb[lv][i - 1] || 0)};
  return {slots};
}
function fillSlots(c) {const u = slotsFor(c, +c.level || 1); if (u) write('characters/' + c.id, u, 'update')}
const slotsText = u => !u ? '' : u.pact ? t('{n} espais de pacte de nivell {l}', {n: u.pact.max, l: u.pact.lvl}) : Object.entries(u.slots).filter(([, v]) => v.max).map(([l, v]) => `${v.max}×${l}`).join(' · ') || '—';
const xpReady = c => {const lv = clamp(+c.level || 1, 1, 20); return lv < 20 && (+c.xp || 0) >= XP_LEVELS[lv + 1]};
/** Els trets de classe d'un nivell, de la taula de la classe al compendi (en castellà, com tot el SRD) */
function classFeatures(cls, lv) {
  const e = srdGet('clase', cls); if (!e) return null;
  const tb = (e.e.bloques || []).find(b => b.t === 'tabla' && /^Rasgos de/i.test(b.titulo || '')); if (!tb) return null;
  const head = tb.filas[0] || [], col = head.findIndex(h => /Rasgos de clase/i.test(h)); const row = tb.filas.find(r => r[0] === String(lv));
  return row && col >= 0 ? row[col] : null;
}
async function levelUpModal(c) {
  const k = charCalc(c), nl = k.lv + 1; if (nl > 20) return;
  try {await loadSRD()} catch (_) {}
  const con = k.mods.con, avg = Math.floor(k.hd / 2) + 1, pbNew = profBonus(nl);
  const oldS = slotsFor(c, k.lv), newS = slotsFor(c, nl), feats = classFeatures(c.cls, nl), need = XP_LEVELS[nl];
  openModal(`<h2>${esc(t('{n} puja a nivell {l}', {n: c.name || t('Sense nom'), l: nl}))}</h2>
    ${(+c.xp || 0) < need ? `<p class="small muted" style="margin:0">${esc(t('Encara no té els PX del nivell {l} ({x} de {y}). Si jugueu per fites, pots pujar-lo igualment.', {l: nl, x: +c.xp || 0, y: need}))}</p>` : ''}
    <h3>${esc(t('Punts de golpe'))}</h3>
    <label class="check"><input type="radio" name="lu-hp" value="avg" checked> ${esc(t('Valor fix: +{n} PG ({a} del dau i {c} de Constitució)', {n: Math.max(1, avg + con), a: avg, c: sgn(con)}))}</label>
    <label class="check"><input type="radio" name="lu-hp" value="roll"> ${esc(t('Tirar 1d{d}{m}', {d: k.hd, m: con ? sgn(con) : ''}))}</label>
    <ul class="lu-list">
      <li>${esc(t('Punts de golpe màxims'))}: <b>${esc(c.maxHp || 0)}</b> → <b id="lu-max">${(+c.maxHp || 0) + Math.max(1, avg + con)}</b></li>
      <li>${esc(t('Daus de golpe'))}: ${k.lv}d${k.hd} → <b>${nl}d${k.hd}</b></li>
      ${pbNew !== k.pb ? `<li>${esc(t('Bonificador de competència'))}: ${sgn(k.pb)} → <b>${sgn(pbNew)}</b></li>` : ''}
      ${newS ? `<li>${esc(t('Espais de conjur'))}: ${esc(slotsText(oldS))} → <b>${esc(slotsText(newS))}</b></li>` : ''}
    </ul>
    ${newS ? `<label class="check"><input type="checkbox" id="lu-slots" checked> ${esc(t('Actualitzar els espais de conjur'))}</label>` : ''}
    ${feats ? `<h3>${esc(t('Trets de classe del nivell {l}', {l: nl}))}</h3><p class="lu-feats">${srdHtml(feats)}</p><p class="small muted" style="margin:0">${esc(t('Apunta els trets nous a «Trets i notes». Si toca una millora de característica o una subclasse, fes-ho a la fitxa.'))}</p>
      <button class="btn sm" id="lu-class" style="align-self:flex-start">${esc(t('Veure la classe al compendi'))}</button>` : ''}
    <div class="foot"><button class="btn" id="lu-x">${esc(t('Cancel·lar'))}</button><button class="btn pri" id="lu-ok">${esc(t('Pujar a nivell {l}', {l: nl}))}</button></div>`, (m, close) => {
    $$('[name=lu-hp]', m).forEach(r => r.onchange = () => {$('#lu-max', m).textContent = r.value === 'avg' ? (+c.maxHp || 0) + Math.max(1, avg + con) : t('{n} + la tirada', {n: c.maxHp || 0})});
    $('#lu-x', m).onclick = close;
    if ($('#lu-class', m)) $('#lu-class', m).onclick = () => {close(); showEntry('clase', c.cls)};
    $('#lu-ok', m).onclick = () => {
      let gain = Math.max(1, avg + con);
      if ($('[name=lu-hp]:checked', m).value === 'roll') {const r = doRoll(M('{n}: punts de golpe del nivell {l}', {n: c.name, l: nl}), `1d${k.hd}${con ? sgn(con).replace('−', '-') : ''}`, {adv: '', quiet: true}); if (!r) return; gain = Math.max(1, r.total)}
      const cur = getDoc('characters/' + c.id) || c;
      const upd = {level: nl, maxHp: (+cur.maxHp || 0) + gain, hp: (+cur.hp || 0) + gain};
      if (newS && $('#lu-slots', m)?.checked) Object.assign(upd, slotsFor(cur, nl));
      write('characters/' + c.id, upd, 'update'); close();
      toast(t('{n} ja és de nivell {l}! +{g} PG.', {n: c.name, l: nl, g: gain}), 6000); setTimeout(renderChars, 40);
    };
  });
}
function rollAttack(c, a, kind) {
  const nm = a.name || t('Atac');
  if (kind === 'hit') {const b = String(a.bonus || '+0').trim().replace('−', '-'); doRoll(M('{n}: atac amb {x}', {n: c.name, x: nm}), '1d20' + (/^[-+]/.test(b) ? b : '+' + b)); return}
  let d = String(a.dmg || '').replace(/\s+/g, '').replace('−', '-');
  if (kind === 'crit') d = d.replace(/(\d*)d(\d+)/g, (m, n, f) => `${(+n || 1) * 2}d${f}`);
  doRoll(M(kind === 'crit' ? '{n}: dany de crític amb {x}' : '{n}: dany amb {x}', {n: c.name, x: nm}), d || '1d4');
}
function addWeapon(c, en) {
  const k = charCalc(c), cc = en.c || {}, props = cc.propiedades || [], ranged = /Ranged/.test(cc.categoria || '');
  const ab = props.includes('Finesse') ? (k.mods.str >= k.mods.dex ? 'str' : 'dex') : ranged ? 'dex' : 'str';
  const dmgRow = (en.e.bloques?.[0]?.filas || []).find(r => /Daño/i.test(r[0]));
  const type = dmgRow ? dmgRow[1].replace(/^[\dd+\s]+/, '') : '';
  const m = k.mods[ab];
  write('characters/' + c.id, {attacks: [...(c.attacks || []), {id: newId(), name: en.e.nombre, bonus: sgn(k.pb + m).replace('−', '-'), dmg: (cc.dano || '1d4') + (m ? sgn(m).replace('−', '-') : ''), type}]}, 'update');
  toast(t('Afegit: {x}', {x: en.e.nombre}));
}
function parseWeight(en) {
  const row = (en.e.bloques || []).flatMap(b => b.filas || []).find(r => /^Peso$/i.test(r[0]));
  if (!row) return 0; const m = String(row[1]).replace(',', '.').match(/[\d.]+/); return m ? +m[0] : 0;
}
