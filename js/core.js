/* ================= helpers and normalizers ================= */
const $ = (s, r) => (r || document).querySelector(s);
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fmt(s) {
  return esc(s).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}
const uid = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const arr = x => (Array.isArray(x) ? x : []);
const strs = x => arr(x).map(String);
function today() { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function moveBy(a, i, d) { const j = i + d; if (i < 0 || j < 0 || j >= a.length) return; const x = a[i]; a[i] = a[j]; a[j] = x; }
function normTask(t) { return { id: String(t.id || uid()), t: String(t.t || ''), tag: String(t.tag || ''), due: String(t.due || ''), target: !!t.target }; }
function normPhase(p) {
  return { id: String(p.id || uid()), label: String(p.label || ''), period: String(p.period || ''), title: String(p.title || ''), goal: String(p.goal || ''),
    do: strs(p.do), expect: String(p.expect || ''), gate: String(p.gate || ''), tasks: arr(p.tasks).map(normTask) };
}
function normSection(s) {
  const type = s.type === 'table' ? 'table' : 'list';
  return { id: String(s.id || uid()), title: String(s.title || ''), type, items: type === 'list' ? strs(s.items) : [], rows: type === 'table' ? arr(s.rows).map(strs) : [] };
}
function normPlan(p) {
  return { name: String(p.name || ''), sub: String(p.sub || ''), title: String(p.title || ''), goal: String(p.goal || ''), phases: arr(p.phases).map(normPhase), sections: arr(p.sections).map(normSection) };
}
function normChecks(c) { const o = {}; Object.keys(c || {}).forEach(k => { if (c[k]) o[k] = true; }); return o; }
function normApps(a) {
  return arr(a).map(x => ({ id: String(x.id || uid()), studio: String(x.studio || ''), role: String(x.role || ''), status: STATUSES.includes(x.status) ? x.status : 'Saved',
    date: String(x.date || ''), link: String(x.link || ''), note: String(x.note || '') }));
}
const DEFP = { cyber: normPlan(DEF.cyber), artist: normPlan(DEF.artist) };
function withCustom(plan, custom) {
  arr(custom).forEach(c => {
    const ph = plan.phases.find(x => x.id === c.g) || plan.phases[plan.phases.length - 1];
    if (ph) ph.tasks.push(normTask({ id: c.id, t: c.t, tag: c.tag || 'Custom' }));
  });
  return plan;
}
function blankState() {
  return { accts: {
    cyber: { plan: null, checks: {}, target: '8', maxNT: '4', maxCredits: '24', semesters: defaultSemesters() },
    artist: { plan: null, checks: {}, apps: normApps(DEF_APPS), appGoal: '20' } } };
}
function normState(p) {
  const b = blankState();
  if (!p || typeof p !== 'object') return b;
  if (p.accts) {
    const c = p.accts.cyber || {}, a = p.accts.artist || {};
    return { accts: {
      cyber: { plan: c.plan ? normPlan(c.plan) : null, checks: normChecks(c.checks), target: c.target == null ? '8' : String(c.target),
        maxNT: c.maxNT == null ? '4' : String(c.maxNT), maxCredits: c.maxCredits == null ? '24' : String(c.maxCredits),
        semesters: Array.isArray(c.semesters) ? normSemesters(c.semesters) : Array.isArray(c.subjects) ? normSemesters(migrateSubjects(c.subjects)) : b.accts.cyber.semesters },
      artist: { plan: a.plan ? normPlan(a.plan) : null, checks: normChecks(a.checks), apps: Array.isArray(a.apps) ? normApps(a.apps) : b.accts.artist.apps, appGoal: a.appGoal == null ? '20' : String(a.appGoal) } } };
  }
  if (Array.isArray(p.subjects)) {
    const cy = b.accts.cyber;
    cy.checks = normChecks(p.checks); cy.target = p.target == null ? '8' : String(p.target); cy.semesters = normSemesters(migrateSubjects(p.subjects));
    if (arr(p.custom).length) cy.plan = withCustom(normPlan(DEF.cyber), p.custom);
  }
  return b;
}
const canon = st => JSON.stringify([st.accts.cyber.plan, Object.keys(st.accts.cyber.checks).sort(), st.accts.cyber.target, st.accts.cyber.maxNT, st.accts.cyber.maxCredits, st.accts.cyber.semesters,
  st.accts.artist.plan, Object.keys(st.accts.artist.checks).sort(), st.accts.artist.apps, st.accts.artist.appGoal]);

/* ================= state ================= */
const KEY = 'roadmap-duo-v1', OLD = 'crypto-re-roadmap-v1';
function load() {
  try {
    let raw = localStorage.getItem(KEY); if (raw) return normState(JSON.parse(raw));
    raw = localStorage.getItem(OLD); if (raw) return normState(JSON.parse(raw));
  } catch (e) {}
  return blankState();
}
let S = load();
function cacheLocal() { try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) { return false; } }
/* save() and saveAll() write the browser copy, then tell the Sync adapter (sync-local.js, or the hosted adapter). */
function save() { const ok = cacheLocal(); Sync.keys(Array.from(arguments), ok); }
function saveAll() { const ok = cacheLocal(); Sync.all(ok); }
let cur = 'cyber', curTab = 'plan';
const ui = { open: {}, edit: false, filter: 'all', hide: false, q: '', appFilter: 'all', tabOf: { cyber: 'plan', artist: 'plan' } };
const AC = () => S.accts[cur];
const CY = () => S.accts.cyber;
const AP = () => S.accts.artist.apps;
const PLAN = a => S.accts[a || cur].plan || DEFP[a || cur];
function mutPlan(fn) { const A = AC(); if (!A.plan) A.plan = normPlan(DEF[cur]); fn(A.plan); save('plan:' + cur); }
const isDone = (a, id) => !!S.accts[a].checks[id];
function prog(tasks, a) { const n = tasks.filter(t => isDone(a, t.id)).length; return { n, t: tasks.length, p: tasks.length ? Math.round(n / tasks.length * 100) : 0 }; }
const acctProg = a => prog(PLAN(a).phases.flatMap(p => p.tasks), a);
const currentPhaseIdx = a => PLAN(a).phases.findIndex(p => p.tasks.some(t => !isDone(a, t.id)));
const findTask = (pl, id) => { for (const p of pl.phases) { const t = p.tasks.find(k => k.id === id); if (t) return t; } return null; };


function keepFocus(fn) {
  const a = document.activeElement, id = a && a.id;
  const pos = a && a.type !== 'checkbox' && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
  fn();
  if (id) { const e = document.getElementById(id); if (e) { try { e.focus({ preventScroll: true }); if (pos && e.setSelectionRange) e.setSelectionRange(pos[0], pos[1]); } catch (x) {} } }
}


