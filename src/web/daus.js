/*
 * Quadern del Mestre — daus: tirades compartides amb tota la taula.
 * Llicència GPL-3.0 o posterior.
 */
const dice = {adv: ''};
/** Interpreta expressions com 1d20+5, 2d6-1, 4d6kh3, d100. Torna null si no l'entén. */
function rollExpr(expr, adv) {
  const s = String(expr).replace(/\s+/g, '').toLowerCase().replace(/^d/, '1d');
  if (!/^[-+]?(\d*d\d+(k[hl]\d+)?|\d+)([-+](\d*d\d+(k[hl]\d+)?|\d+))*$/.test(s)) return null;
  const terms = s.match(/[-+]?(\d*d\d+(k[hl]\d+)?|\d+)/g);
  const dieTerms = terms.filter(x => x.includes('d'));
  const singleD20 = dieTerms.length === 1 && /^[-+]?1?d20$/.test(dieTerms[0]) && dieTerms[0][0] !== '-';
  let total = 0, parts = [], crit = null, count = 0, nat, faces = 20;
  for (const tm of terms) {
    const neg = tm[0] === '-', body = tm.replace(/^[-+]/, '');
    if (body.includes('d')) {
      const m = body.match(/^(\d*)d(\d+)(?:k([hl])(\d+))?$/); let n = m[1] === '' ? 1 : +m[1]; const f = +m[2];
      if (n < 1 || f < 2 || f > 1000) return null; count += n; if (count > 100) return null;
      let vals, kept;
      if (singleD20 && adv) {const a = rnd(20), b = rnd(20); kept = adv === 'adv' ? Math.max(a, b) : Math.min(a, b); vals = [a, b];
        parts.push(`${t(adv === 'adv' ? 'avantatge' : 'desavantatge')} d20 [${a}, ${b}]`)}
      else {
        vals = Array.from({length: n}, () => rnd(f));
        let keep = vals;
        if (m[3]) {const k = clamp(+m[4], 1, n); keep = [...vals].sort((a, b) => m[3] === 'h' ? b - a : a - b).slice(0, k)}
        kept = keep.reduce((x, y) => x + y, 0);
        parts.push(`${neg ? '− ' : parts.length ? '+ ' : ''}${body} [${vals.join(', ')}]`);
      }
      if (nat === undefined) {nat = (n === 1 || (singleD20 && adv)) ? kept : null; faces = f} else nat = null;
      total += neg ? -kept : kept;
      if (singleD20) crit = kept === 20 ? 'hit' : kept === 1 ? 'miss' : null;
    } else {total += neg ? -+body : +body; parts.push(`${neg ? '−' : '+'} ${body}`)}
  }
  return {total, detail: parts.join(' '), crit, adv: singleD20 ? adv : '', nat: nat ?? null, faces};
}
function dieSvg(f) {
  const P = {4: '<path d="M20 4 37 34H3Z"/><path d="M20 4v30M3 34l17-10 17 10"/>',
    6: '<rect x="6" y="6" width="28" height="28" rx="3"/><path d="M6 6l6 6h22M12 12v22"/>',
    8: '<path d="M20 3 36 20 20 37 4 20Z"/><path d="M4 20h32M20 3 13 20l7 17 7-17Z"/>',
    10: '<path d="M20 3 37 18 20 37 3 18Z"/><path d="M3 18l17 7 17-7M20 25v12M20 3l-7 13 7 9 7-9Z"/>',
    12: '<path d="M20 3 37 15 31 36H9L3 15Z"/><path d="M20 10l9 7-3 11h-12l-3-11Z"/>',
    20: '<path d="M20 2 36 11v18l-16 9-16-9V11Z"/><path d="M20 9l11 18H9Z"/><path d="M4 11l5 16M36 11l-5 16M20 2v7M9 27l-5 2M31 27l5 2M20 38V27"/>'};
  const k = f === 100 ? 10 : (P[f] ? f : 20);
  return `<svg viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">${P[k]}</svg>`;
}
$$('.die').forEach(b => {const f = +b.dataset.die.split('d')[1]; b.insertAdjacentHTML('afterbegin', dieSvg(f))});
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let rollTimer = null, localRolls = [];
/** Tira i ho comparteix. label pot ser un text o un missatge {k,v}. */
function doRoll(label, expr, opts = {}) {
  const adv = opts.adv !== undefined ? opts.adv : dice.adv;
  const r = rollExpr(expr, adv);
  if (!r) {toast(t('No entenc aquesta tirada. Prova amb un format com 2d6+3 o d20-1.')); return null}
  const priv = dm() && (opts.priv ?? $('#dice-secret').checked);
  const e = {label: label || expr, expr, total: r.total, detail: r.detail, crit: r.crit, priv, ts: Date.now(), uid: S.uid};
  showLast(e, r);
  if (S.token) api('api/roll', {roll: e}).catch(() => toast(t("No s'ha pogut compartir la tirada.")));
  else {localRolls = [e, ...localRolls].slice(0, 30); renderLog()}
  if (window.matchMedia('(max-width:1000px)').matches && !opts.quiet) $('#dice').classList.add('open');
  return r;
}
function showLast(e, r) {
  const box = $('#dice-last'); clearInterval(rollTimer);
  const faces = r?.faces || 20, nat = r?.nat;
  box.className = 'last';
  box.innerHTML = `<div class="die-shape">${dieSvg(faces)}<span class="face"></span></div><span class="lb">${esc(T(e.label))}${e.priv ? ` <span class="sec-tag">${esc(t('secreta'))}</span>` : ''}</span><span class="tot ${e.crit || ''}">${e.total}</span><span class="dt">${esc(e.detail)}${e.crit === 'hit' ? ' · ' + esc(t('crític!')) : e.crit === 'miss' ? ' · ' + esc(t('pífia')) : ''}</span>`;
  const face = $('.face', box);
  const land = () => {face.textContent = nat != null ? nat : ''; box.classList.remove('rolling'); box.classList.add('landed'); if (e.crit) box.classList.add('crit-' + e.crit)};
  if (reduceMotion()) {land(); return}
  void box.offsetWidth; box.classList.add('rolling');
  const t0 = Date.now();
  rollTimer = setInterval(() => {face.textContent = 1 + Math.floor(Math.random() * faces); if (Date.now() - t0 > 700) {clearInterval(rollTimer); land()}}, 55);
}
let lastSeenRoll = 0;
function renderLog() {
  const list = S.token ? (mem.get('rolls/main')?.list || []) : localRolls;
  const ol = $('#dice-log');
  ol.innerHTML = list.slice(0, 40).map(r => `<li><span class="who">${esc(r.uid === S.uid ? t('tu') : userName(r.uid))} · ${ago(r.ts)}${r.priv ? ` · <span class="sec-tag">${esc(t('secreta'))}</span>` : ''}</span><span class="tot ${r.crit || ''}">${r.total}</span><span class="lb">${esc(T(r.label))}</span><span class="dt">${esc(r.detail)}</span></li>`).join('') || `<li class="muted small" style="display:block">${esc(t('Encara no ha tirat ningú.'))}</li>`;
  // Si algú altre tira, ho mostrem també a dalt (sense animació si no és meu)
  const top = list[0];
  if (top && top.ts > lastSeenRoll) {if (lastSeenRoll && top.uid !== S.uid) showLast(top, {faces: 20, nat: null}); lastSeenRoll = top.ts}
}
function applyDiceStatic() {$('#secret-wrap').hidden = !dm()}
$('.dice-btns').addEventListener('click', e => {const b = e.target.closest('[data-die]'); if (b) doRoll(b.dataset.die.replace(/^1/, ''), b.dataset.die)});
$('.seg').addEventListener('click', e => {const b = e.target.closest('[data-adv]'); if (!b) return; dice.adv = b.dataset.adv; $$('.seg button').forEach(x => x.setAttribute('aria-pressed', x === b))});
$('#dice-form').addEventListener('submit', e => {e.preventDefault(); const v = $('#dice-expr').value.trim(); if (v) doRoll(v, v)});
$('#dice-fab').addEventListener('click', () => $('#dice').classList.add('open'));
$('#dice-close').addEventListener('click', () => $('#dice').classList.remove('open'));
// Botons [data-roll] a qualsevol lloc: tiren l'expressió amb l'etiqueta indicada
document.addEventListener('click', e => {const b = e.target.closest('[data-roll]'); if (!b) return; e.preventDefault(); doRoll(b.dataset.rollLabel || b.dataset.roll, b.dataset.roll)});
setInterval(() => {if (document.visibilityState === 'visible' && st.loaded) renderLog()}, 30000);
