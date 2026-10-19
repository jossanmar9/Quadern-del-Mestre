/*
 * Quadern del Mestre — connexió amb el servidor, entrada i arrencada.
 * Llicència GPL-3.0 o posterior.
 */
let lanFirst = null, lanPoll = null, lanErrs = [], lanBannerT = null, lanLast = Date.now();
function lanOk() {clearTimeout(lanBannerT); lanBannerT = null; if ($('#banner').dataset.conn) {delete $('#banner').dataset.conn; showBanner('')}}
function lanTrouble() {if (!lanBannerT) lanBannerT = setTimeout(() => {$('#banner').dataset.conn = '1'; showBanner(t("S'ha perdut la connexió amb el servidor. Tornant a connectar…"))}, 5000)}
function applySnapshot(d) {
  S.uid = d.me.uid; S.dm = !!d.me.dm;
  if (S.camp && d.campaign && d.campaign !== S.camp) {location.reload(); return false}
  S.camp = d.campaign;
  if (lanFirst) {mem.clear(); for (const p in d.docs) mem.set(p, d.docs[p]); const f = lanFirst; lanFirst = null; f(); return true}
  const changed = [];
  for (const p of [...mem.keys()]) if (!(p in d.docs)) {mem.delete(p); changed.push(p)}
  for (const p in d.docs) if (JSON.stringify(mem.get(p)) !== JSON.stringify(d.docs[p])) {mem.set(p, d.docs[p]); changed.push(p)}
  for (const p of changed) memNotify(p); return true;
}
function startPolling() {
  if (lanPoll) return; if (S.es) {S.es.close(); S.es = null}
  const tick = async () => {try {const r = await fetch('api/snapshot', {headers: {'X-Quadern-Token': S.token}, cache: 'no-store'}); if (r.status === 401) {lsSet('qm-token', ''); location.reload(); return} if (!r.ok) throw 0; if (applySnapshot(await r.json())) lanOk()} catch (_) {lanTrouble()} lanPoll = setTimeout(tick, 2000)};
  lanPoll = setTimeout(tick, 0);
}
function lanConnect() {
  if (lanPoll) return; if (S.es) S.es.close();
  const es = new EventSource('api/events?t=' + encodeURIComponent(S.token)); S.es = es;
  es.addEventListener('snapshot', e => {lanLast = Date.now(); if (applySnapshot(JSON.parse(e.data))) lanOk()});
  es.addEventListener('ping', e => {lanLast = Date.now(); const d = JSON.parse(e.data || '{}'); if (d && d.map !== undefined) onPing(d)});
  es.addEventListener('campaign', () => {showBanner(t("S'ha obert una altra partida. Carregant…")); setTimeout(() => location.reload(), 500)});
  es.addEventListener('doc', e => {lanLast = Date.now(); const d = JSON.parse(e.data); if (d.data == null) mem.delete(d.path); else mem.set(d.path, d.data); memNotify(d.path)});
  es.onerror = () => {lanTrouble(); const now = Date.now(); lanErrs = lanErrs.filter(x => now - x < 60000); lanErrs.push(now); if (lanErrs.length >= 3) startPolling(); else if (es.readyState === 2) setTimeout(lanConnect, 3000)};
}
let joinResolve = null;
function joinRender() {
  const prev = $('#j-name')?.value || '', wasDm = $('#j-dm')?.checked || false;
  $('#tabs').innerHTML = '';
  $('#main').innerHTML = `<div class="join-wrap"><form id="join" class="panel"><img src="${esc($('.logo').src)}" alt="" width="96" height="96" class="join-logo"><h2>${esc(t('Benvingut al Quadern del Mestre'))}</h2>
    <label class="field"><span>${esc(t('El teu nom'))}</span><input class="in" id="j-name" required maxlength="40" autocomplete="nickname"></label>
    <label class="check"><input type="checkbox" id="j-dm" ${wasDm ? 'checked' : ''}> ${esc(t('Sóc el màster'))}</label>
    <label class="field" id="j-pw-f" ${wasDm ? '' : 'hidden'}><span>${esc(t('Contrasenya del màster'))}</span><input class="in" id="j-pw" autocomplete="current-password"><small class="muted">${esc(t('Surt a la finestra del servidor en arrancar.'))}</small></label>
    <p class="small" id="j-err" style="margin:0;color:var(--blood)"></p><button class="btn pri" type="submit">${esc(t('Entrar'))}</button></form></div>`;
  $('#j-name').value = prev; $('#j-name').focus();
  $('#j-dm').onchange = e => {$('#j-pw-f').hidden = !e.target.checked; if (e.target.checked) $('#j-pw').focus()};
  $('#join').addEventListener('submit', async e => {
    e.preventDefault(); $('#j-err').textContent = '';
    const body = {name: $('#j-name').value}; if ($('#j-dm').checked) body.password = $('#j-pw').value;
    if ($('#j-dm').checked && !body.password) {$('#j-err').textContent = t('Escriu la contrasenya del màster.'); return}
    try {const r = await fetch('api/join', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}); const d = await r.json();
      if (!r.ok) {$('#j-err').textContent = t(d.error || "No s'ha pogut entrar."); return} lsSet('qm-token', d.token); joinResolve(d)}
    catch (_) {$('#j-err').textContent = t('No es pot contactar amb el servidor.')}
  });
}
function joinScreen() {return new Promise(resolve => {joinResolve = resolve; joinRender()})}
function startSubs() {
  st.loaded = true; st.firstSync = true; renderAll(); setTimeout(() => {st.firstSync = false}, 1500);
  if (dm() && lsGet('qm-seed') === '1' && !col('maps').length && !col('characters').length) {lsSet('qm-seed', ''); seedExample()}
}
async function boot() {
  applyStatic(); renderHeader();
  let ok = false;
  if (/^https?:$/.test(location.protocol)) {try {const r = await fetch('api/hello', {cache: 'no-store'}); ok = r.ok} catch (_) {}}
  if (!ok) {
    S.uid = 'local'; S.dm = true; mem.set('users/local', {name: t('Tu')}); mem.set('campaign/main', {name: t('Mode de prova')});
    showBanner(t('Mode de prova: obri la pàgina a través del servidor (python3 quadern.py) perquè es guarde i es compartisca.'));
    startSubs(); return;
  }
  let tok = lsGet('qm-token'), me = null;
  if (tok) {try {const r = await fetch('api/join', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token: tok})}); if (r.ok) me = await r.json()} catch (_) {}}
  if (!me) me = await joinScreen();
  S.token = me.token; S.uid = me.uid; S.dm = !!me.dm;
  await new Promise(res => {lanFirst = res; lanConnect(); setTimeout(() => {if (lanFirst) startPolling()}, 5000)});
  setInterval(() => {if (!lanPoll && Date.now() - lanLast > 35000) startPolling()}, 5000);
  startSubs();
}
boot();
