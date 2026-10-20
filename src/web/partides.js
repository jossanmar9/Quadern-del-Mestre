/*
 * Quadern del Mestre — partides guardades, contrasenya del màster i partida d'exemple.
 * Llicència GPL-3.0 o posterior.
 */
TABS.partides = {label: L('Partides'), dmOnly: true, render: renderCamps};
let campCache = null;
async function renderCamps() {
  $('#main').innerHTML = `<div class="camps"><div><h2 style="font-size:32px">${esc(t('Partides guardades'))}</h2><p class="muted" style="margin:6px 0 0;max-width:62ch">${esc(t("Cada partida guarda els seus mapes, personatges, combat, diari i documents. Quan n'obris una, tots els que estan connectats hi passen."))}</p></div>
    <form class="panel camp-new" id="camp-new"><label class="field"><span>${esc(t('Partida nova'))}</span><input class="in" id="cn-name" required maxlength="80" placeholder="${esc(t('La maledicció del bosc'))}"></label><button class="btn pri" type="submit">${esc(t('Crear i obrir'))}</button></form>
    <div id="camp-list" class="camp-list"><p class="muted">${esc(t('Carregant…'))}</p></div>
    <div class="panel pw-box"><h3>${esc(t('Contrasenya del màster'))}</h3><p class="small muted">${esc(t('Qui entre amb aquesta contrasenya serà màster (pot haver-n\'hi més d\'un). La resta entra només amb el nom.'))}</p>
      <div class="row"><code class="pw" id="pw-show">••••••</code><button class="btn sm" id="pw-see">${esc(t('Mostrar'))}</button><input class="in" id="pw-new" placeholder="${esc(t('Contrasenya nova'))}" style="width:200px"><button class="btn sm" id="pw-set">${esc(t('Canviar'))}</button></div></div>
    <div class="panel"><h3>${esc(t('Importar una partida'))}</h3><p class="small muted">${esc(t('Obri una partida exportada des d\'un altre ordinador (un fitxer .zip). Es crea com a partida nova; no en substitueix cap.'))}</p><button class="btn" id="camp-import">${esc(t('Triar el fitxer…'))}</button></div>
    <div class="panel"><h3>${esc(t('Partides d\'exemple'))}</h3><p class="small muted">${esc(t('Crea una partida preparada per a provar-ho tot: mapa amb boira, personatges, monstres, diari, un document i notes del màster.'))}</p>
      <div class="ex-list"><div><b>${esc(t('La cripta del rei oblidat'))}</b><p class="small muted">${esc(t('Una cripta amb esquelets, una porta secreta i un tumulari. Boira revelada a mà.'))}</p><button class="btn" data-example="cripta">${esc(t('Crear'))}</button></div>
      <div><b>${esc(t('L\'emboscada del gual'))}</b><p class="small muted">${esc(t('Un camí de bosc, un riu i un campament de goblins. Amb boira automàtica: el mapa es revela a mesura que avancen els personatges.'))}</p><button class="btn" data-example="gual">${esc(t('Crear'))}</button></div></div></div>
  </div>`;
  if (!S.token) {$('#camp-list').innerHTML = `<p class="muted">${esc(t("Obri l'app des del servidor per a gestionar partides."))}</p>`; return}
  try {campCache = await api('api/campaigns'); drawCampList(campCache)} catch (e) {$('#camp-list').innerHTML = `<p class="small" style="color:var(--blood)">${esc(e.message)}</p>`}
}
function drawCampList(d) {
  const box = $('#camp-list'); if (!box) return;
  box.innerHTML = d.list.map(c => `<article class="camp-card${c.active ? ' on' : ''}"><div class="cc-head"><h3 class="cc-name">${esc(c.name)}</h3>${c.active ? `<span class="chip dm">${esc(t('Oberta'))}</span>` : ''}</div>
    <p class="muted small" style="margin:0">${esc(pl(c.maps, 'mapa', 'mapes'))} · ${esc(pl(c.characters, 'personatge', 'personatges'))} · ${esc(pl(c.sessions, 'sessió', 'sessions'))}</p>
    <p class="muted small" style="margin:0;font-style:italic">${esc(t('Darrer canvi {x}', {x: ago(c.updated)}))}</p>
    <div class="row" style="margin-top:6px">${c.active ? '' : `<button class="btn pri sm" data-copen="${c.id}">${esc(t('Obrir'))}</button>`}<button class="btn sm" data-cdup="${c.id}">${esc(t('Duplicar'))}</button><button class="btn sm" data-cexp="${c.id}">${esc(t('Exportar'))}</button><button class="btn sm" data-cbak="${c.id}">${esc(t('Còpies'))}</button>${c.active ? '' : `<button class="btn sm danger" data-cdel="${c.id}">${esc(t('Esborrar'))}</button>`}</div></article>`).join('');
}
/* ---------- exportar, importar i còpies de seguretat ---------- */
function exportCamp(id) {
  const a = document.createElement('a'); a.href = `api/export?id=${encodeURIComponent(id)}&t=${encodeURIComponent(S.token || '')}`; a.download = '';
  document.body.appendChild(a); a.click(); a.remove(); toast(t('Exportant la partida… El fitxer .zip es guardarà a les baixades.'));
}
function importCamp() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.zip,.json,application/zip,application/json';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    if (f.size > 400 * 1024 * 1024) {toast(t('El fitxer és massa gran.')); return}
    toast(t('Important la partida…'), 60000);
    try {
      const r = await fetch('api/import', {method: 'POST', headers: {'Content-Type': f.type || 'application/zip', 'X-Quadern-Token': S.token}, body: f});
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {toast(t(d.error || "No s'ha pogut importar.")); return}
      campCache = d; drawCampList(d); const c = d.list.find(x => x.id === d.imported);
      toast(t('Partida importada: {x}. Obri-la quan vulgues.', {x: c ? c.name : ''}), 6000);
    } catch (_) {toast(t('No es pot contactar amb el servidor.'))}
  };
  inp.click();
}
const BACKUP_WHY = {obrir: L('En obrir la partida'), partida: L('Durant la partida'), abans: L('Abans de restaurar'), ma: L('Feta a mà')};
async function backupsModal(id) {
  const c = (campCache?.list || []).find(x => x.id === id);
  let list = [];
  const draw = m => {
    $('#bk-list', m).innerHTML = list.length ? list.map(b => `<li><span><b>${esc(new Date(b.ts).toLocaleString(LANG === 'es' ? 'es' : 'ca', {dateStyle: 'medium', timeStyle: 'short'}))}</b> <span class="muted small">· ${esc(t(BACKUP_WHY[b.reason] || b.reason))} · ${Math.max(1, Math.round(b.size / 1024))} kB</span></span><button class="btn sm" data-bkr="${esc(b.id)}">${esc(t('Restaurar'))}</button></li>`).join('')
      : `<li class="muted small">${esc(t('Encara no hi ha cap còpia d\'aquesta partida.'))}</li>`;
  };
  try {list = (await api('api/campaigns', {action: 'backups', id})).list} catch (e) {toast(e.message); return}
  openModal(`<h2>${esc(t('Còpies de seguretat'))}</h2><p class="muted" style="margin:0">${esc(t('{x}: es fa una còpia cada vegada que s\'obri i cada mitja hora mentre es juga. Es guarden les {n} últimes.', {x: c?.name || id, n: 15}))}</p>
    <ul class="bk-list" id="bk-list"></ul>
    <div class="foot"><button class="btn" id="bk-now">${esc(t('Fer una còpia ara'))}</button><button class="btn pri" id="bk-x">${esc(t('Tancar'))}</button></div>`, (m, close) => {
    draw(m);
    $('#bk-x', m).onclick = close;
    $('#bk-now', m).onclick = async () => {try {list = (await api('api/campaigns', {action: 'backup', id})).list; draw(m); toast(t('Còpia feta.'))} catch (e) {toast(e.message)}};
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-bkr]'); if (!b) return;
      armed(b, async () => {
        try {const d = await api('api/campaigns', {action: 'restore', id, backup: b.dataset.bkr}); close();
          if (d.active !== id) {campCache = d; drawCampList(d); toast(t('Partida restaurada. El que hi havia abans també té còpia.'))}}
        catch (err) {toast(err.message)}
      }, t('Prem de nou per a restaurar'));
    });
  });
}
document.addEventListener('submit', async e => {
  if (e.target.id !== 'camp-new') return; e.preventDefault(); const n = $('#cn-name').value.trim(); if (!n) return;
  try {await api('api/campaigns', {action: 'create', name: n}); lsSet('qm-tab', 'mapa')} catch (err) {toast(err.message)}
});
document.addEventListener('click', async e => {
  if (st.tab !== 'partides') return; const x = e.target;
  const o = x.closest('[data-copen]'), du = x.closest('[data-cdup]'), de = x.closest('[data-cdel]'), ex = x.closest('[data-cexp]'), bk = x.closest('[data-cbak]'), exm = x.closest('[data-example]');
  if (ex) {exportCamp(ex.dataset.cexp); return}
  if (bk) {backupsModal(bk.dataset.cbak); return}
  if (x.id === 'camp-import') {importCamp(); return}
  try {
    if (o) {o.disabled = true; lsSet('qm-tab', 'mapa'); await api('api/campaigns', {action: 'switch', id: o.dataset.copen})}
    if (du) {drawCampList(await api('api/campaigns', {action: 'duplicate', id: du.dataset.cdup})); toast(t('Partida duplicada.'))}
    if (de) armed(de, async () => {try {drawCampList(await api('api/campaigns', {action: 'delete', id: de.dataset.cdel})); toast(t('Partida esborrada. Està a la carpeta partides/esborrades si la necessites.'))} catch (err) {toast(err.message)}}, t('Prem de nou per a esborrar'));
    if (x.id === 'pw-see') {const el = $('#pw-show'); el.textContent = el.textContent.startsWith('•') ? (campCache?.password || '') : '••••••'}
    if (x.id === 'pw-set') {const v = $('#pw-new').value.trim(); if (!v) return; campCache = await api('api/campaigns', {action: 'password', password: v}); $('#pw-new').value = ''; $('#pw-show').textContent = campCache.password; toast(t('Contrasenya canviada. Els màsters que ja han entrat no cal que tornen a entrar.'))}
    if (exm) {const k = exm.dataset.example; lsSet('qm-seed', k); lsSet('qm-tab', 'mapa'); await api('api/campaigns', {action: 'create', name: k === 'gual' ? t('L\'emboscada del gual') : t('La cripta del rei oblidat')})}
  } catch (err) {toast(err.message); if (o) o.disabled = false}
});

/* ---------- partides d'exemple ---------- */
function seedExample(kind) {if (kind === 'gual') seedFord(); else seedCrypt()}
function seedCrypt() {
  const cols = 26, rows = 18, tiles = {}, labels = [], walls = {};
  const rect = (x1, y1, x2, y2, tt) => {for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) tiles[x + ',' + y] = tt};
  rect(1, 11, 8, 16, 'stone'); rect(4, 17, 5, 17, 'floor');                 // vestíbul i entrada
  rect(9, 13, 12, 13, 'floor'); rect(13, 10, 22, 16, 'stone');                // passadís i sala de les columnes
  for (const [x, y] of [[15, 12], [20, 12], [15, 14], [20, 14]]) tiles[x + ',' + y] = 'rock';
  rect(4, 9, 4, 10, 'floor'); rect(1, 2, 8, 8, 'wood'); rect(5, 4, 6, 5, 'water');   // capella amb la font
  rect(17, 8, 17, 9, 'floor'); rect(12, 1, 23, 7, 'stone'); rect(17, 3, 18, 4, 'rock'); rect(22, 1, 23, 2, 'pit');  // tomba del rei
  const solid = k => !tiles[k] || tiles[k] === 'rock' || tiles[k] === 'pit';
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (solid(x + ',' + y)) continue;
    if (solid(x + ',' + (y - 1))) walls[`${x},${y},n`] = 'wall'; if (solid(x + ',' + (y + 1))) walls[`${x},${y + 1},n`] = 'wall';
    if (solid((x - 1) + ',' + y)) walls[`${x},${y},w`] = 'wall'; if (solid((x + 1) + ',' + y)) walls[`${x + 1},${y},w`] = 'wall';
  }
  for (const [x, y] of [[15, 12], [20, 12], [15, 14], [20, 14], [17, 3], [18, 3], [17, 4], [18, 4], [22, 1], [23, 1], [22, 2], [23, 2]]) for (const k of [`${x},${y},n`, `${x},${y + 1},n`, `${x},${y},w`, `${x + 1},${y},w`]) delete walls[k];
  Object.assign(walls, {'9,13,w': 'door', '13,13,w': 'door', '4,9,n': 'door', '4,11,n': 'open', '17,10,n': 'door', '17,8,n': 'secret', '4,17,n': 'open'});
  labels.push({id: newId(), x: 4, y: 13, text: '1', kind: 'pin'}, {id: newId(), x: 17, y: 11, text: '2', kind: 'pin'}, {id: newId(), x: 2, y: 3, text: '3', kind: 'pin'}, {id: newId(), x: 14, y: 2, text: '4', kind: 'pin'}, {id: newId(), x: 6, y: 17, text: t('Entrada'), kind: 'text'});
  const rev = {}; for (let y = 11; y <= 17; y++) for (let x = 1; x <= 8; x++) rev[x + ',' + y] = 1;
  const mid = newId();
  write('maps/' + mid, {name: t('La cripta del rei oblidat'), cols, rows, units: 1.5, bg: null, grid: {show: true, op: .3}, tiles, walls, labels, fog: {on: true, rev}, created: Date.now()});
  const base = (o) => ({...blankChar(S.uid), ...o});
  const pc = [
    base({name: 'Aina de Morella', color: '#8C2A1C', species: 'human', cls: 'fighter', level: 3, background: 'soldier', alignment: 'Neutral bo', ab: {str: 16, dex: 12, con: 15, int: 10, wis: 12, cha: 11}, saves: {str: true, con: true}, skills: {atle: 1, perc: 1, inti: 1, surv: 1}, ac: 16, hp: 31, maxHp: 31,
      attacks: [{id: newId(), name: t('Espasa llarga'), bonus: '+5', dmg: '1d8+3', type: t('tallant')}, {id: newId(), name: t('Arc curt'), bonus: '+3', dmg: '1d6+1', type: t('perforant')}],
      inv: [{id: newId(), name: t('Cota de malla'), qty: 1, wt: 27.5, eq: true, notes: ''}, {id: newId(), name: t('Torxes'), qty: 5, wt: .5, eq: false, notes: ''}, {id: newId(), name: t('Corda de cànem (15 m)'), qty: 1, wt: 2.5, eq: false, notes: ''}], coins: {cp: 12, sp: 8, ep: 0, gp: 14, pp: 0},
      feats: t('Estil de combat: defensa. Segon alè. Acció sobtada.'), langs: t('Comú, nan')}),
    base({name: 'Eldrin Liadon', color: '#2B4A6B', species: 'elf', cls: 'wizard', level: 3, background: 'sage', alignment: 'Caòtic bo', ab: {str: 8, dex: 14, con: 13, int: 16, wis: 12, cha: 10}, saves: {int: true, wis: true}, skills: {arca: 1, hist: 1, inve: 1, perc: 1}, ac: 12, hp: 17, maxHp: 17, speed: 9,
      attacks: [{id: newId(), name: t('Bastó'), bonus: '+1', dmg: '1d6-1', type: t('contundent')}], spells: [{sid: 'fire-bolt', prep: true}, {sid: 'light', prep: true}, {sid: 'magic-missile', prep: true}, {sid: 'shield', prep: true}, {sid: 'sleep', prep: true}],
      slots: {1: {max: 4, used: 0}, 2: {max: 2, used: 0}}, inv: [{id: newId(), name: t('Llibre de conjurs'), qty: 1, wt: 1.5, eq: true, notes: ''}], coins: {cp: 0, sp: 15, ep: 0, gp: 9, pp: 0}, langs: t('Comú, èlfic, dracònic')}),
    base({name: 'Tova Pedrafonda', color: '#3E6A36', species: 'dwarf', cls: 'cleric', level: 3, background: 'acolyte', alignment: 'Legal bo', ab: {str: 14, dex: 10, con: 15, int: 10, wis: 16, cha: 12}, saves: {wis: true, cha: true}, skills: {medi: 1, reli: 1, insi: 1}, ac: 18, hp: 27, maxHp: 27, speed: 9,
      attacks: [{id: newId(), name: t('Martell de guerra'), bonus: '+4', dmg: '1d8+2', type: t('contundent')}], spells: [{sid: 'sacred-flame', prep: true}, {sid: 'light', prep: true}, {sid: 'guiding-bolt', prep: true}, {sid: 'cure-wounds', prep: true}, {sid: 'bless', prep: true}],
      slots: {1: {max: 4, used: 0}, 2: {max: 2, used: 0}}, coins: {cp: 30, sp: 4, ep: 0, gp: 6, pp: 0}, langs: t('Comú, nan')}),
  ];
  const ids = pc.map(c => {const id = newId(); write('characters/' + id, c); return id});
  [[4, 16], [5, 16], [4, 15]].forEach(([x, y], i) => write(`maps/${mid}/tokens/${newId()}`, {x, y, size: 1, name: pc[i].name, color: pc[i].color, charId: ids[i]}));
  [['skeleton', 16, 11, 'Esqueleto 1'], ['skeleton', 19, 15, 'Esqueleto 2'], ['zombie', 14, 5, 'Zombi 1'], ['zombie', 21, 5, 'Zombi 2'], ['wight', 17, 2, 'Tumulario']].forEach(([m, x, y, n]) => write(`maps/${mid}/tokens/${newId()}`, {x, y, size: 1, name: n, color: '#444444', monster: m}));
  write('campaign/main', {name: t('La cripta del rei oblidat'), activeMap: mid}, 'update');
  write('journal/' + newId(), {n: 1, date: Date.now(), title: t('El poble de Vilafosca'), ownerId: S.uid, created: Date.now(),
    body: t("El grup arriba a Vilafosca, un poble de pastors on fa setmanes que desapareix el bestiar.\n\n# Què hem descobert\n- El prior Bernat diu que de nit s'han vist llums a la vella cripta del turó.\n- La taverna **El Corb Adormit** ofereix 50 po a qui torne la campana robada.\n- Tova ha reconegut uns símbols d'un culte antic a la porta de la cripta.\n\n*Al final de la sessió, el grup baixa per l'escala de la cripta…*")});
  write('handouts/' + newId(), {title: t('Carta del prior'), shown: false, to: [], created: Date.now(), file: null,
    text: t("Amics viatgers:\n\nSi llegiu açò, és que heu decidit ajudar-nos. La cripta del rei Ot fa segles que dorm, però algú l'ha despertada. Baixeu amb llum i amb coratge, i no toqueu la corona del rei.\n\n— Bernat, prior de Vilafosca")});
  write('dmnotes/' + newId(), {title: t('Secrets de la cripta'), updated: Date.now(),
    body: t("- Sala 2: dos esquelets fan guàrdia. Si els PJ fan soroll a la capella, s'hi acosten.\n- Sala 3: la font és aigua beneïda (cura 1d4 una vegada al dia).\n- Hi ha una porta secreta entre la sala 2 i la tomba (CD 13 de Saviesa (Percepció)).\n- Sala 4: el tumulari és l'antic capità del rei Ot. Vol la corona per a ell.")});
  write('dmtables/' + newId(), {name: t('Rumors de Vilafosca'), lines: [t('El moliner ha vist un llop de dues cues.'), t('La filla del ferrer parla en somnis amb un rei mort.'), t('El prior amaga una clau sota l\'altar.'), t('Algú ha comprat totes les espelmes del mercat.'), t('Els gossos borden cada nit cap al turó.'), t('Diuen que la corona del rei Ot no es pot treure.')]});
  toast(t('Partida d\'exemple preparada. Fes un cop d\'ull a cada pestanya!'), 6000);
}

/* L'emboscada del gual: exterior, amb boira automàtica (es revela el que veuen els personatges). */
function seedFord() {
  const cols = 34, rows = 22, tiles = {}, walls = {}, labels = [];
  const rect = (x1, y1, x2, y2, tt) => {for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) if (x >= 0 && y >= 0 && x < cols && y < rows) tiles[x + ',' + y] = tt};
  rect(0, 0, cols - 1, rows - 1, 'grass');
  // bosc: taques d'arbres (tapen la vista)
  const trees = [[2, 1, 6, 5], [9, 0, 12, 3], [1, 15, 5, 20], [8, 16, 11, 21], [24, 0, 27, 3], [29, 14, 33, 21], [20, 17, 23, 21], [13, 8, 14, 10]];
  for (const [a, b, c, d] of trees) rect(a, b, c, d, 'tree');
  for (const [x, y] of [[7, 6], [3, 7], [10, 5], [6, 14], [12, 14], [25, 5], [28, 4], [22, 15]]) tiles[x + ',' + y] = 'tree';
  // camí de terra d'oest a est, i el riu de nord a sud amb el gual
  for (let x = 0; x < cols; x++) {const y = 10 + Math.round(Math.sin(x / 5) * 1.2); rect(x, y, x, y + 1, 'sand')}
  for (let y = 0; y < rows; y++) {const x = 16 + Math.round(Math.sin(y / 4) * 1.4); rect(x - 1, y, x + 1, y, 'water'); tiles[x + ',' + y] = 'deep'}
  for (let y = 10; y <= 12; y++) for (let x = 14; x <= 19; x++) if (tiles[x + ',' + y] === 'water' || tiles[x + ',' + y] === 'deep') tiles[x + ',' + y] = 'mud';
  // roques a la riba (tapen la vista)
  for (const [x, y] of [[13, 6], [13, 7], [19, 14], [20, 14], [20, 13], [18, 5]]) tiles[x + ',' + y] = 'rock';
  // campament goblin a l'est, amb una tanca de fusta i una entrada
  rect(25, 7, 31, 13, 'mud'); rect(27, 8, 29, 9, 'wood'); tiles['28,11'] = 'lava';
  for (let x = 25; x <= 31; x++) {walls[`${x},7,n`] = 'wall'; walls[`${x},14,n`] = 'wall'}
  for (let y = 7; y <= 13; y++) {walls[`25,${y},w`] = 'wall'; walls[`32,${y},w`] = 'wall'}
  walls['25,10,w'] = 'open'; walls['25,11,w'] = 'open';
  labels.push({id: newId(), x: 15, y: 11, text: '1', kind: 'pin'}, {id: newId(), x: 21, y: 6, text: '2', kind: 'pin'}, {id: newId(), x: 28, y: 9, text: '3', kind: 'pin'},
    {id: newId(), x: 1, y: 12, text: t('Cap a Vilafosca'), kind: 'text'}, {id: newId(), x: 15, y: 1, text: t('Riu Clar'), kind: 'text'});
  const mid = newId();
  write('maps/' + mid, {name: t('L\'emboscada del gual'), cols, rows, units: 1.5, bg: null, grid: {show: true, op: .22}, tiles, walls, labels, fog: {on: true, auto: true, dist: 18, rev: {}}, created: Date.now()});
  const base = o => ({...blankChar(S.uid), ...o});
  const pc = [
    base({name: 'Bernat Soler', color: '#3E6A36', species: 'human', cls: 'ranger', level: 2, background: 'soldier', alignment: 'Neutral bo', ab: {str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 8}, saves: {str: true, dex: true}, skills: {anim: 1, perc: 1, stea: 1, surv: 1}, ac: 14, hp: 20, maxHp: 20, speed: 9,
      attacks: [{id: newId(), name: t('Arc llarg'), bonus: '+5', dmg: '1d8+3', type: t('perforant')}, {id: newId(), name: t('Espasa curta'), bonus: '+5', dmg: '1d6+3', type: t('perforant')}],
      spells: [{sid: 'hunters-mark', prep: true}, {sid: 'cure-wounds', prep: true}, {sid: 'ensnaring-strike', prep: true}], slots: {1: {max: 2, used: 0}},
      inv: [{id: newId(), name: t('Armadura de cuir'), qty: 1, wt: 5, eq: true, notes: ''}, {id: newId(), name: t('Fletxes'), qty: 20, wt: .05, eq: false, notes: ''}], coins: {cp: 5, sp: 10, ep: 0, gp: 12, pp: 0}, langs: t('Comú, èlfic')}),
    base({name: 'Lia Amakiir', color: '#5B3A7A', species: 'elf', cls: 'rogue', level: 2, background: 'criminal', alignment: 'Caòtic neutral', ab: {str: 8, dex: 17, con: 12, int: 13, wis: 12, cha: 14}, saves: {dex: true, int: true}, skills: {acro: 1, enga: 1, perc: 2, slei: 1, stea: 2, inve: 1}, ac: 14, hp: 15, maxHp: 15, speed: 9,
      attacks: [{id: newId(), name: t('Daga'), bonus: '+5', dmg: '1d4+3', type: t('perforant')}, {id: newId(), name: t('Arc curt'), bonus: '+5', dmg: '1d6+3', type: t('perforant')}],
      inv: [{id: newId(), name: t('Eines de lladre'), qty: 1, wt: .5, eq: true, notes: ''}], coins: {cp: 0, sp: 3, ep: 0, gp: 21, pp: 0}, feats: t('Atac furtiu (1d6). Acció astuta.'), langs: t('Comú, èlfic, jerga de lladres')}),
    base({name: 'Joana Puig', color: '#A27419', species: 'halfling', cls: 'bard', level: 2, background: 'sage', alignment: 'Neutral bo', ab: {str: 8, dex: 14, con: 12, int: 12, wis: 10, cha: 16}, saves: {dex: true, cha: true}, skills: {perf: 1, pers: 1, hist: 1, insi: 1, arca: 1}, ac: 13, hp: 13, maxHp: 13, speed: 9,
      attacks: [{id: newId(), name: t('Estoc'), bonus: '+4', dmg: '1d8+2', type: t('perforant')}],
      spells: [{sid: 'vicious-mockery', prep: true}, {sid: 'minor-illusion', prep: true}, {sid: 'healing-word', prep: true}, {sid: 'dissonant-whispers', prep: true}, {sid: 'faerie-fire', prep: true}], slots: {1: {max: 3, used: 0}},
      inv: [{id: newId(), name: t('Llaüt'), qty: 1, wt: 1, eq: true, notes: ''}], coins: {cp: 20, sp: 6, ep: 0, gp: 8, pp: 0}, langs: t('Comú, mitjà')}),
  ];
  const ids = pc.map(c => {const id = newId(); write('characters/' + id, c); return id});
  [[1, 10], [1, 11], [0, 11]].forEach(([x, y], i) => write(`maps/${mid}/tokens/${newId()}`, {x, y, size: 1, name: pc[i].name, color: pc[i].color, charId: ids[i]}));
  [['goblin-warrior', 21, 5, 'Guerrero goblin 1'], ['goblin-warrior', 19, 15, 'Guerrero goblin 2'], ['goblin-minion', 22, 9, 'Secuaz goblin 1'], ['goblin-minion', 26, 12, 'Secuaz goblin 2'],
   ['goblin-boss', 28, 9, 'Jefe goblin'], ['wolf', 29, 11, 'Lobo 1'], ['wolf', 30, 12, 'Lobo 2']].forEach(([m, x, y, n]) => write(`maps/${mid}/tokens/${newId()}`, {x, y, size: 1, name: n, color: m === 'wolf' ? '#7A4A2A' : '#444444', monster: m}));
  write('campaign/main', {name: t('L\'emboscada del gual'), activeMap: mid}, 'update');
  write('journal/' + newId(), {n: 1, date: Date.now(), title: t('El carro que no va arribar'), ownerId: S.uid, created: Date.now(),
    body: t("El moliner de Vilafosca ens ha contractat: el seu carro de farina fa tres dies que no torna del mercat.\n\n# Què sabem\n- El carro havia de creuar el **gual del Riu Clar**.\n- Un pastor diu que ha sentit llops i rialles de goblins de nit.\n- El moliner paga 30 po si tornem el carro, i 10 més si el carreter és viu.\n\n*Eixim a trenc d'alba pel camí del bosc…*")});
  write('handouts/' + newId(), {title: t('Nota clavada en un arbre'), shown: false, to: [], created: Date.now(), file: null,
    text: t("PEATGE DEL GUAL\n\nQui vulga passar, que deixe ací tot el menjar i totes les monedes.\nQui no pague, que ho pregunte al carreter.\n\n— El cap Grunx")});
  write('dmnotes/' + newId(), {title: t('Com funciona l\'emboscada'), updated: Date.now(),
    body: t("- La boira és automàtica: el mapa es revela segons el que veuen els personatges. Els arbres i les roques tapen la vista.\n- 1. Gual: l'aigua arriba als genolls (terreny difícil). Els dos guerrers goblins vigilen amagats a la riba (CD 13 de Saviesa (Percepció) per a veure'ls).\n- 2. Si sona l'alarma, el cap Grunx solta els llops.\n- 3. Campament: el carreter està lligat dins de la tenda. La farina està intacta.\n- Si el cap cau, els secuaços fugen.")});
  write('dmtables/' + newId(), {name: t('Què es troba pel camí'), lines: [t('Un rastre de farina que va cap al riu.'), t('Una roda trencada de carro.'), t('Petjades de llop, fresques.'), t('Un goblin adormit dalt d\'un arbre.'), t('Un cartell de peatge mal escrit.'), t('Fum d\'una foguera a l\'altra banda del riu.')]});
  toast(t('Partida d\'exemple preparada. Fes un cop d\'ull a cada pestanya!'), 6000);
}
