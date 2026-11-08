/* ================= toast and undo ================= */
let toastTimer = null;
function showToast(msg, undo) {
  const el = $('#toast'); clearTimeout(toastTimer);
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button" data-act="undo">Undo</button>' : ''}`;
  el.hidden = false; el.onUndo = undo || null;
  toastTimer = setTimeout(() => { el.hidden = true; el.onUndo = null; }, undo ? 8000 : 3500);
}
function withUndo(msg, fn) {
  const snap = JSON.stringify(S);
  fn();
  showToast(msg, () => { S = normState(JSON.parse(snap)); saveAll(); renderAll(); });
}

/* ================= theme (browser version only) ================= */
const THEMES = ['auto', 'light', 'dark'];
function themeNow() { try { return localStorage.getItem('duo-theme') || 'auto'; } catch (e) { return 'auto'; } }
function applyTheme(t) {
  const r = document.documentElement;
  if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
  try { if (t === 'auto') localStorage.removeItem('duo-theme'); else localStorage.setItem('duo-theme', t); } catch (e) {}
  const b = $('#theme-btn'); if (b) b.textContent = 'Theme: ' + t[0].toUpperCase() + t.slice(1);
}

/* ================= backup: file, copy and paste ================= */
const bkMsg = m => { $('#bk-msg').textContent = m; };
const backupText = () => JSON.stringify({ app: 'roadmap-duo', version: 1, exportedAt: new Date().toISOString(), data: S }, null, 2);
function importText(text) {
  let p; try { p = JSON.parse(text); } catch (e) { bkMsg('That is not a valid backup. Check that you pasted or chose the whole file.'); return; }
  if (p && p.app === 'roadmap-duo' && p.data) p = p.data;
  if (!p || typeof p !== 'object' || !(p.accts || Array.isArray(p.subjects))) { bkMsg('That file is not a Roadmap Duo backup.'); return; }
  withUndo('Backup imported', () => { S = normState(p); saveAll(); ui.open = {}; renderAll(); });
  bkMsg('Backup imported. You can undo it for a few seconds.');
}

/* ================= actions ================= */
function jumpTo(pid) {
  ui.open[cur + ':' + pid] = true; renderView();
  const el = document.getElementById('phase-' + pid); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function tick(id, v) {
  const c = AC().checks; if (v) c[id] = true; else delete c[id];
  save('checks:' + cur); keepFocus(() => { renderTop(); renderView(); });
}
const refresh = () => { renderTop(); renderView(); };
const ACT = {
  undo() { const el = $('#toast'), f = el.onUndo; el.hidden = true; el.onUndo = null; if (f) f(); },
  edit() { ui.edit = !ui.edit; renderTabs(); renderView(); },
  'open-all'() { PLAN().phases.forEach(p => { ui.open[cur + ':' + p.id] = true; }); renderView(); },
  'close-all'() { PLAN().phases.forEach(p => { ui.open[cur + ':' + p.id] = false; }); renderView(); },
  'p-add'() {
    let nid; mutPlan(pl => { nid = uid(); pl.phases.push(normPhase({ id: nid, label: 'Phase ' + (pl.phases.length + 1), title: 'New phase' })); });
    ui.open[cur + ':' + nid] = true; refresh(); const el = document.getElementById('phase-' + nid); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  'p-up'(b) { mutPlan(pl => moveBy(pl.phases, pl.phases.findIndex(x => x.id === b.dataset.p), -1)); refresh(); },
  'p-down'(b) { mutPlan(pl => moveBy(pl.phases, pl.phases.findIndex(x => x.id === b.dataset.p), 1)); refresh(); },
  'p-del'(b) {
    withUndo('Phase deleted', () => {
      mutPlan(pl => { const ph = pl.phases.find(x => x.id === b.dataset.p); if (ph) ph.tasks.forEach(k => delete AC().checks[k.id]); pl.phases = pl.phases.filter(x => x.id !== b.dataset.p); });
      save('checks:' + cur); refresh();
    });
  },
  't-up'(b) { mutPlan(pl => { const ph = pl.phases.find(x => x.id === b.dataset.p); if (ph) moveBy(ph.tasks, ph.tasks.findIndex(k => k.id === b.dataset.t), -1); }); renderView(); },
  't-down'(b) { mutPlan(pl => { const ph = pl.phases.find(x => x.id === b.dataset.p); if (ph) moveBy(ph.tasks, ph.tasks.findIndex(k => k.id === b.dataset.t), 1); }); renderView(); },
  't-del'(b) {
    withUndo('Task deleted', () => {
      mutPlan(pl => { const ph = pl.phases.find(x => x.id === b.dataset.p); if (ph) ph.tasks = ph.tasks.filter(k => k.id !== b.dataset.t); });
      delete AC().checks[b.dataset.t]; save('checks:' + cur); refresh();
    });
  },
  's-up'(b) { mutPlan(pl => moveBy(pl.sections, pl.sections.findIndex(x => x.id === b.dataset.s), -1)); renderView(); },
  's-down'(b) { mutPlan(pl => moveBy(pl.sections, pl.sections.findIndex(x => x.id === b.dataset.s), 1)); renderView(); },
  's-del'(b) { withUndo('Note deleted', () => { mutPlan(pl => { pl.sections = pl.sections.filter(x => x.id !== b.dataset.s); }); renderView(); }); },
  's-add-list'() { mutPlan(pl => pl.sections.push(normSection({ id: uid(), title: 'New list', type: 'list', items: ['First point'] }))); renderView(); },
  's-add-table'() { mutPlan(pl => pl.sections.push(normSection({ id: uid(), title: 'New table', type: 'table', rows: [['Column A', 'Column B'], ['Cell', 'Cell']] }))); renderView(); },
  'plan-reset'() {
    withUndo('Plan reset to default', () => { AC().plan = null; Sync.del('plan-' + cur); save(); ui.open = {}; renderAll(); });
  },
  'add-subj'() {
    const id = 's' + Date.now();
    CY().subjects.push({ id, ex: false, order: Date.now(), name: '', credits: '3', w: { qt: '10', th: '20', gk: '20', ck: '50' }, s: { qt: '', th: '', gk: '', ck: '' } });
    save('subj:' + id); renderView(); const n = document.getElementById(id + '-name'); if (n) { n.focus(); n.scrollIntoView({ block: 'center' }); }
  },
  'rm-ex'() { withUndo('Examples removed', () => { CY().subjects.filter(s => s.ex).forEach(s => delSubj(s.id)); renderView(); }); },
  'rm-subj'(b) { withUndo('Subject deleted', () => { delSubj(b.dataset.rm); renderView(); }); },
  'app-del'(b) { withUndo('Application deleted', () => { S.accts.artist.apps = AP().filter(x => x.id !== b.dataset.aid); save('apps'); renderView(); }); },
  theme() { applyTheme(THEMES[(THEMES.indexOf(themeNow()) + 1) % THEMES.length]); },
  data() { const d = $('#data-panel'); d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  'bk-export'() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([backupText()], { type: 'application/json' }));
    a.download = 'roadmap-duo-backup-' + today() + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    bkMsg('Backup file downloaded.');
  },
  'bk-pick'() { $('#bk-file').click(); },
  'bk-copy'() {
    const box = $('#bk'); box.value = backupText(); box.select();
    try { navigator.clipboard.writeText(box.value).then(() => bkMsg('Backup copied. Paste it into a note to keep it.'), () => bkMsg('Backup is selected in the box. Copy it with Ctrl+C or Cmd+C.')); }
    catch (err) { bkMsg('Backup is selected in the box. Copy it with Ctrl+C or Cmd+C.'); }
  },
  'bk-restore'() { importText($('#bk').value); },
  'bk-reset'() { withUndo('Everything was reset', () => { S = blankState(); saveAll(); ui.open = {}; renderAll(); $('#bk').value = ''; }); bkMsg('Everything was reset. You can undo it for a few seconds.'); }
};

/* ================= events ================= */
document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.jump) { jumpTo(d.jump); return; }
  if (d.toggle) { const p = PLAN().phases.findIndex(x => x.id === d.toggle); ui.open[cur + ':' + d.toggle] = !isOpen(PLAN().phases[p], p); renderView(); return; }
  if (d.filter) { ui.filter = d.filter; renderView(); return; }
  if (d.afilter) { ui.appFilter = d.afilter; renderView(); return; }
  if (d.act && ACT[d.act]) ACT[d.act](t);
});
document.addEventListener('change', e => {
  const t = e.target, d = t.dataset;
  if (t.id === 'bk-file') {
    const f = t.files && t.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => importText(String(r.result)); r.onerror = () => bkMsg('Could not read that file.');
    r.readAsText(f); t.value = ''; return;
  }
  if (d.check) { tick(d.check, t.checked); return; }
  if (d.tf === 'target') { mutPlan(pl => { const k = findTask(pl, d.t); if (k) k.target = t.checked; }); return; }
  if (t.id === 'hide-done') { ui.hide = t.checked; $('#cl-list').innerHTML = checklistList(); return; }
  if (d.aid && d.af === 'status') {
    const x = AP().find(a => a.id === d.aid); if (!x) return;
    x.status = t.value; if (x.status !== 'Saved' && !x.date) x.date = today();
    save('apps'); keepFocus(renderView);
  }
});
document.addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (t.type === 'checkbox') return;
  if (d.pf) { mutPlan(pl => { pl[d.pf] = t.value; }); renderTop(); return; }
  if (d.f && d.p) { mutPlan(pl => { const ph = pl.phases.find(x => x.id === d.p); if (ph) ph[d.f] = d.f === 'do' ? t.value.split('\n').map(s => s.trim()).filter(Boolean) : t.value; }); if (d.f === 'label' || d.f === 'title') renderTop(); return; }
  if (d.tf) { mutPlan(pl => { const k = findTask(pl, d.t); if (k) k[d.tf] = t.value; }); return; }
  if (d.sf) {
    mutPlan(pl => { const s = pl.sections.find(x => x.id === d.s); if (!s) return; if (d.sf === 'title') s.title = t.value; else if (s.type === 'table') s.rows = parseRows(t.value); else s.items = t.value.split('\n').map(x => x.trim()).filter(Boolean); });
    return;
  }
  if (t.id === 'cl-q') { ui.q = t.value; $('#cl-list').innerHTML = checklistList(); return; }
  if (t.id === 'target') { CY().target = t.value; save('target'); CY().subjects.forEach(s => updateCard(s.id)); return; }
  if (d.sid) {
    const s = CY().subjects.find(x => x.id === d.sid); if (!s) return;
    if (d.f === 'name') s.name = t.value; else if (d.f === 'credits') s.credits = t.value; else { const [g, k] = d.f.split('.'); s[g][k] = t.value; }
    save('subj:' + s.id); updateCard(s.id); updateSummary(); return;
  }
  if (t.id === 'app-goal') { S.accts.artist.appGoal = t.value; save('apps'); $('#apps-stats').innerHTML = appStatsHTML(); return; }
  if (d.aid && d.af && d.af !== 'status') {
    const x = AP().find(a => a.id === d.aid); if (!x) return; x[d.af] = t.value; save('apps');
  }
});
document.addEventListener('submit', e => {
  const f = e.target; if (!f.matches('form')) return;
  e.preventDefault();
  const addTo = (pid, inp) => {
    const v = inp.value.trim(); if (!v) { inp.focus(); return false; }
    mutPlan(pl => { const ph = pl.phases.find(x => x.id === pid); if (ph) ph.tasks.push(normTask({ id: uid(), t: v, tag: 'Custom' })); });
    return true;
  };
  if (f.dataset.addtask) { if (addTo(f.dataset.addtask, f.querySelector('input[type=text]'))) { refresh(); const n = document.getElementById('at-' + f.dataset.addtask); if (n) n.focus(); } return; }
  if (f.id === 'cl-add') { if (addTo($('#cl-g').value, $('#cl-t'))) { refresh(); const n = $('#cl-t'); if (n) n.focus(); } return; }
  if (f.id === 'app-add') {
    const s = $('#app-studio'), r = $('#app-role'); if (!s.value.trim() && !r.value.trim()) { s.focus(); return; }
    AP().unshift({ id: uid(), studio: s.value.trim(), role: r.value.trim(), status: 'Saved', date: '', link: '', note: '' });
    save('apps'); renderView(); const n = $('#app-studio'); if (n) n.focus();
  }
});

/* ================= routing and start ================= */
function route() {
  const m = /^(cyber|artist)-([a-z]+)$/.exec(location.hash.slice(1));
  let a, t;
  if (m && TABS[m[1]].some(x => x[0] === m[2])) { a = m[1]; t = m[2]; }
  else { try { a = localStorage.getItem('duo-last'); } catch (e) {} if (!ACCTS.includes(a)) a = 'cyber'; t = ui.tabOf[a] || 'plan'; }
  if (a !== cur) { ui.filter = 'all'; ui.q = ''; ui.hide = false; ui.appFilter = 'all'; ui.edit = false; }
  cur = a; curTab = t; ui.tabOf[a] = t;
  try { localStorage.setItem('duo-last', a); } catch (e) {}
  renderAll();
}
window.addEventListener('hashchange', route);
$('#bk-note').textContent = Sync.note;
$('#bk-export').hidden = !Sync.canDownload;
if (Sync.themeToggle) applyTheme(themeNow()); else $('#theme-btn').hidden = true;
route();
Sync.init();
