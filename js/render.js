/* ================= rendering: shell ================= */
const mark = n => (String(n).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?');
function renderSwitcher() {
  $('#switcher').innerHTML = ACCTS.map((a, i) => {
    const p = PLAN(a), pr = acctProg(a);
    return `<a class="acct ${a === cur ? 'on' : ''}" href="#${a}-${ui.tabOf[a]}" ${a === cur ? 'aria-current="page"' : ''}>
      <span class="mark mk${i + 1}">${esc(mark(p.name))}</span>
      <span class="who"><b>${esc(p.name)}</b><small>${esc(p.sub)}</small></span><span class="pct">${pr.p}%</span></a>`;
  }).join('');
}
function ringSVG(p) {
  const c = 2 * Math.PI * 52;
  return `<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${p}% complete"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p / 100)).toFixed(1)}" transform="rotate(-90 60 60)"/><text x="60" y="60" text-anchor="middle" class="ring-n">${p}%</text><text x="60" y="78" text-anchor="middle" class="ring-s">done</text></svg>`;
}
function trackHTML() {
  const ph = PLAN().phases, ci = currentPhaseIdx(cur);
  if (!ph.length) return '';
  return `<div class="track">` + ph.map((p, i) => {
    const pr = prog(p.tasks, cur), st = pr.t && pr.n === pr.t ? 'done' : (i === ci ? 'now' : '');
    return `<button class="cell ${st}" data-jump="${esc(p.id)}"><span class="cl">${esc(p.label)}</span><b>${esc(p.title)}</b><span class="cf">${pr.n}/${pr.t}</span><span class="bar"><i style="width:${pr.p}%"></i></span>${i === ci ? '<em class="badge">Now</em>' : (st === 'done' ? '<em class="badge done">Done</em>' : '')}</button>`;
  }).join('') + `</div>`;
}
function renderHero() {
  const p = PLAN(), pr = acctProg(cur), ci = currentPhaseIdx(cur), slim = curTab !== 'plan';
  const now = !p.phases.length ? 'No phases yet' : (ci < 0 ? 'Every task is ticked' : `Now: <b>${esc(p.phases[ci].label)}</b> &middot; ${esc(p.phases[ci].title)}`);
  $('#hero').innerHTML = `<section class="hero ${slim ? 'slim' : ''}"><div class="hero-main"><span class="eyebrow">Account ${ACCTS.indexOf(cur) + 1} &middot; ${esc(p.name)}</span>
    <h1>${esc(p.title)}</h1><p class="goal">${fmt(p.goal)}</p><p class="now">${now} &middot; ${pr.n} of ${pr.t} tasks</p></div>${ringSVG(pr.p)}</section>${slim ? '' : trackHTML()}`;
}
function renderTabs() {
  const edits = curTab === 'plan' || curTab === 'reference';
  $('#tabs').innerHTML = `<div class="tabbar"><nav class="tabs" aria-label="Sections">${TABS[cur].map(([id, l]) => `<a href="#${cur}-${id}" ${id === curTab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>${edits ? `<button class="editbtn" data-act="edit" aria-pressed="${ui.edit}">${ui.edit ? 'Done editing' : 'Edit plan'}</button>` : ''}</div>`;
}
function renderTop() { renderSwitcher(); renderHero(); }
function renderView() {
  const fn = { plan: viewPlan, checklist: viewChecklist, reference: viewReference, grades: viewGrades, applications: viewApps }[curTab];
  $('#view').innerHTML = fn();
  if (curTab === 'grades') updateSummary();
}
function renderAll() { document.documentElement.setAttribute('data-acct', cur); renderTop(); renderTabs(); renderView(); }

/* ================= plan tab ================= */
function taskRow(t, pre) {
  const d = isDone(cur, t.id);
  return `<div class="task ${d ? 'done' : ''} ${t.target ? 'target' : ''}"><input type="checkbox" id="${pre}${esc(t.id)}" data-check="${esc(t.id)}" ${d ? 'checked' : ''}>
    <label for="${pre}${esc(t.id)}">${fmt(t.t)}</label>${t.target ? '<span class="tag accent">Target</span>' : (t.tag ? `<span class="tag">${esc(t.tag)}</span>` : '<span></span>')}${t.due ? `<span class="due">${esc(t.due)}</span>` : ''}</div>`;
}
function nextUp() {
  const ph = PLAN().phases, ci = currentPhaseIdx(cur);
  if (!ph.length) return '';
  if (ci < 0) return `<section class="panel"><h2>All done</h2><p class="note" style="margin-top:6px">Every task is ticked. Turn on Edit plan to add the next phase.</p></section>`;
  const p = ph[ci], open = p.tasks.filter(t => !isDone(cur, t.id)).slice(0, 4);
  return `<section class="panel"><div class="sec-h"><h2>Next up</h2><span class="note">${esc(p.label)}: ${esc(p.title)}</span></div><div class="nx">${open.map(t => taskRow(t, 'nx-')).join('')}</div></section>`;
}
function isOpen(p, i) { const k = cur + ':' + p.id; return k in ui.open ? ui.open[k] : (ui.edit || i === currentPhaseIdx(cur)); }
function phaseCard(p, i) {
  const pr = prog(p.tasks, cur), open = isOpen(p, i);
  let body = '';
  if (open) body = ui.edit ? phaseEdit(p, i) : `<div class="ph-body"><div class="cols"><div>
      ${p.goal ? `<p class="lede">${fmt(p.goal)}</p>` : ''}
      ${p.do.length ? `<span class="label">Focus</span><ul>${p.do.map(d => `<li>${fmt(d)}</li>`).join('')}</ul>` : ''}
      ${p.expect ? `<span class="label">What to expect</span><p class="expect">${fmt(p.expect)}</p>` : ''}
      ${p.gate ? `<span class="label">Gate</span><p class="gate">${fmt(p.gate)}</p>` : ''}
    </div><div class="tasks"><span class="label">Tasks</span>${p.tasks.map(t => taskRow(t, 'pl-')).join('') || '<p class="note">No tasks yet.</p>'}</div></div></div>`;
  return `<article class="panel phase ${open ? 'open' : ''}" id="phase-${esc(p.id)}"><button class="ph-head" data-toggle="${esc(p.id)}" aria-expanded="${open}">
    <span class="ph-l"><span class="label">${esc(p.label)}</span><span class="period">${esc(p.period)}</span></span><span class="ph-t">${esc(p.title)}</span>
    <span class="ph-p"><span class="bar"><i style="width:${pr.p}%"></i></span><span class="cnt">${pr.n}/${pr.t}</span></span><span class="chev" aria-hidden="true"></span></button>${body}</article>`;
}
function phaseEdit(p, i) {
  const f = (k, label, v, wide, rows) => `<label class="f ${wide ? 'wide' : ''}">${label}${rows ? `<textarea rows="${rows}" data-f="${k}" data-p="${esc(p.id)}">${esc(v)}</textarea>` : `<input type="text" data-f="${k}" data-p="${esc(p.id)}" value="${esc(v)}">`}</label>`;
  const rows = p.tasks.map(t => `<div class="trow"><input type="checkbox" id="ed-${esc(t.id)}" data-check="${esc(t.id)}" ${isDone(cur, t.id) ? 'checked' : ''} aria-label="Done">
    <input type="text" data-tf="t" data-t="${esc(t.id)}" value="${esc(t.t)}" aria-label="Task">
    <input type="text" data-tf="tag" data-t="${esc(t.id)}" value="${esc(t.tag)}" placeholder="Tag" aria-label="Tag">
    <input type="text" data-tf="due" data-t="${esc(t.id)}" value="${esc(t.due)}" placeholder="Date" aria-label="Date note">
    <label class="tgt"><input type="checkbox" data-tf="target" data-t="${esc(t.id)}" ${t.target ? 'checked' : ''}>Target</label>
    <span class="mv"><button data-act="t-up" data-p="${esc(p.id)}" data-t="${esc(t.id)}" aria-label="Move task up">&uarr;</button><button data-act="t-down" data-p="${esc(p.id)}" data-t="${esc(t.id)}" aria-label="Move task down">&darr;</button><button class="danger" data-act="t-del" data-p="${esc(p.id)}" data-t="${esc(t.id)}" aria-label="Delete task">&times;</button></span></div>`).join('');
  return `<div class="ph-body"><div class="grid2">${f('label', 'Label', p.label)}${f('period', 'Period', p.period)}${f('title', 'Title', p.title, true)}
    ${f('goal', 'Goal', p.goal, true, 2)}${f('do', 'Focus bullets (one per line)', p.do.join('\n'), true, 4)}${f('expect', 'What to expect', p.expect, true, 2)}${f('gate', 'Gate', p.gate, true, 2)}</div>
    <div><span class="label">Tasks</span>${rows}<form class="addrow" data-addtask="${esc(p.id)}"><input type="text" id="at-${esc(p.id)}" placeholder="New task" aria-label="New task"><button class="primary" type="submit">Add task</button></form></div>
    <div class="btnrow"><button data-act="p-up" data-p="${esc(p.id)}">Move phase up</button><button data-act="p-down" data-p="${esc(p.id)}">Move phase down</button><button class="danger" data-act="p-del" data-p="${esc(p.id)}">Delete phase</button></div></div>`;
}
function editBar() { return `<div class="editbar"><span><b>Editing the plan.</b> Changes save as you type, and ticking still works.</span><button data-act="edit">Done</button></div>`; }
function planSettings(p) {
  const f = (k, label, v, wide) => `<label class="f ${wide ? 'wide' : ''}">${label}<input type="text" data-pf="${k}" value="${esc(v)}"></label>`;
  return `<section class="panel"><h2 style="margin-bottom:12px">Account details</h2><div class="grid2">${f('name', 'Account name', p.name)}${f('sub', 'Subtitle', p.sub)}${f('title', 'Headline', p.title, true)}${f('goal', 'Goal', p.goal, true)}</div></section>`;
}
function viewPlan() {
  const p = PLAN();
  return (ui.edit ? editBar() + planSettings(p) : nextUp() + (p.phases.length > 1 ? `<div class="btnrow end"><button class="sm" data-act="open-all">Expand all</button><button class="sm" data-act="close-all">Collapse all</button></div>` : '')) +
    `<div class="phases">${p.phases.map(phaseCard).join('') || '<div class="panel empty">No phases yet.</div>'}</div>` +
    (ui.edit ? `<div class="btnrow"><button class="primary" data-act="p-add">Add phase</button><button class="danger" data-act="plan-reset">Reset plan to default</button></div>` : '');
}

/* ================= reference tab ================= */
function tableHTML(rows) {
  if (!rows.length) return '<p class="note">Empty table.</p>';
  const h = rows[0], b = rows.slice(1);
  return `<div class="tablewrap"><table><thead><tr>${h.map(c => `<th>${fmt(c)}</th>`).join('')}</tr></thead><tbody>${b.map(r => `<tr>${r.map(c => `<td>${fmt(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function sectionView(s) { return `<section class="panel sec ${s.type === 'table' ? 'wide' : ''}"><h2>${esc(s.title)}</h2>${s.type === 'table' ? tableHTML(s.rows) : `<ul>${s.items.map(i => `<li>${fmt(i)}</li>`).join('')}</ul>`}</section>`; }
function sectionEdit(s) {
  const val = s.type === 'table' ? s.rows.map(r => r.join(' | ')).join('\n') : s.items.join('\n');
  const hint = s.type === 'table' ? 'One row per line. Separate columns with " | ". The first line is the header.' : 'One bullet per line. Use **bold** and [text](https://link).';
  return `<section class="panel sec wide"><label class="f">Title<input type="text" data-sf="title" data-s="${esc(s.id)}" value="${esc(s.title)}"></label>
    <label class="f">${s.type === 'table' ? 'Table' : 'List'}<textarea rows="${Math.min(14, Math.max(4, val.split('\n').length + 1))}" data-sf="body" data-s="${esc(s.id)}">${esc(val)}</textarea></label><p class="note">${hint}</p>
    <div class="btnrow"><button data-act="s-up" data-s="${esc(s.id)}">Move up</button><button data-act="s-down" data-s="${esc(s.id)}">Move down</button><button class="danger" data-act="s-del" data-s="${esc(s.id)}">Delete</button></div></section>`;
}
function viewReference() {
  const p = PLAN();
  return (ui.edit ? editBar() : '') + `<div class="secs">${p.sections.map(s => ui.edit ? sectionEdit(s) : sectionView(s)).join('') || '<div class="panel empty">No notes yet. Turn on Edit plan to add some.</div>'}</div>` +
    (ui.edit ? `<div class="btnrow"><button class="primary" data-act="s-add-list">Add list</button><button data-act="s-add-table">Add table</button></div>` : '');
}
function parseRows(v) { return v.split('\n').map(l => l.split('|').map(c => c.trim())).filter(r => r.some(Boolean)); }

/* ================= checklist tab ================= */
function viewChecklist() {
  const ph = PLAN().phases;
  if (ui.filter !== 'all' && !ph.some(p => p.id === ui.filter)) ui.filter = 'all';
  const chips = [['all', 'All']].concat(ph.map(p => [p.id, p.label])).map(([id, l]) => `<button class="chip" data-filter="${esc(id)}" aria-pressed="${ui.filter === id}">${esc(l)}</button>`).join('');
  return `<div class="filters">${chips}</div>
    <div class="filters2"><input type="text" id="cl-q" placeholder="Search tasks" aria-label="Search tasks" value="${esc(ui.q)}"><label class="hide"><input type="checkbox" id="hide-done" ${ui.hide ? 'checked' : ''}>Hide done</label></div>
    <div id="cl-list" class="cl-list">${checklistList()}</div>
    <section class="panel"><h3>Add a task</h3><form class="addrow" id="cl-add"><select id="cl-g" aria-label="Phase">${ph.map(p => `<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('')}</select>
    <input type="text" id="cl-t" placeholder="New task" aria-label="Task"><button class="primary" type="submit">Add</button></form></section>`;
}
function checklistList() {
  const q = ui.q.trim().toLowerCase();
  const out = PLAN().phases.filter(p => ui.filter === 'all' || ui.filter === p.id).map(p => {
    const pr = prog(p.tasks, cur);
    let list = p.tasks;
    if (ui.hide) list = list.filter(t => !isDone(cur, t.id));
    if (q) list = list.filter(t => (t.t + ' ' + t.tag).toLowerCase().includes(q));
    if ((ui.hide || q) && !list.length) return '';
    return `<section class="panel group"><div class="group-head"><div class="gt"><h3>${esc(p.label)}: ${esc(p.title)}</h3><span>${esc(p.period)}</span></div><span class="bar"><i style="width:${pr.p}%"></i></span><span class="cnt">${pr.n}/${pr.t}</span></div>
      <div class="rows">${list.map(t => taskRow(t, 'cl-')).join('') || '<p class="note pad">No tasks yet.</p>'}</div></section>`;
  }).join('');
  return out || '<div class="panel empty">Nothing matches.</div>';
}

/* ================= grades tab (account 1) ================= */
function num(v) {
  if (v == null) return null;
  const t = String(v).trim().replace(',', '.'); if (t === '') return null;
  const n = Number(t); return Number.isFinite(n) ? n : NaN;
}
function grade4(x) {
  const r = Math.round(x * 10) / 10;
  if (r >= 8.5) return ['A', 4]; if (r >= 8) return ['B+', 3.5]; if (r >= 7) return ['B', 3]; if (r >= 6.5) return ['C+', 2.5];
  if (r >= 5.5) return ['C', 2]; if (r >= 5) return ['D+', 1.5]; if (r >= 4) return ['D', 1]; return ['F', 0];
}
function calc(s) {
  const Tg = num(CY().target); let total = 0, wBad = false, sBad = false; const act = [];
  COMPS.forEach(c => {
    let w = num(s.w[c.k]); if (Number.isNaN(w) || (w != null && w < 0)) { wBad = true; w = 0; } if (w == null) w = 0;
    let sc = num(s.s[c.k]); if (Number.isNaN(sc) || (sc != null && (sc < 0 || sc > 10))) { sBad = true; sc = null; }
    total += w; if (w > 0) act.push({ c, w, sc });
  });
  const graded = act.filter(a => a.sc != null), rem = act.filter(a => a.sc == null);
  const gW = graded.reduce((a, b) => a + b.w, 0);
  const earned = total > 0 ? graded.reduce((a, b) => a + b.w * b.sc, 0) / total : 0, share = total > 0 ? gW / total : 0;
  const out = { total, wBad, sBad, act, graded, rem, earned, share, complete: act.length > 0 && rem.length === 0 };
  if (out.complete) { out.final = earned; out.g4 = grade4(earned); }
  if (share > 0) out.running = earned / share;
  if (rem.length && total > 0 && Tg != null && !Number.isNaN(Tg)) { const rs = 1 - share; out.need = (Tg - earned) / rs; out.max = earned + rs * 10; out.T = Tg; }
  return out;
}
function outHTML(s) {
  const r = calc(s), t = Math.round(r.total * 100) / 100;
  const pill = r.total === 0 ? `<span class="pill warn">Enter weights above</span>` : (Math.abs(r.total - 100) < 0.001 ? `<span class="pill">Weights total 100%</span>` : `<span class="pill warn">Weights total ${t}%, expected 100%</span>`);
  let body = '';
  if (r.complete) {
    body = `<div class="res"><span class="final">${r.final.toFixed(2)}</span><span class="meta">/ 10 &middot; rounds to ${(Math.round(r.final * 10) / 10).toFixed(1)} &middot; ${r.g4[0]} &middot; ${r.g4[1].toFixed(1)} / 4.0</span></div>`;
  } else if (r.act.length) {
    body += r.graded.length ? `<div class="res"><span class="final">${r.running.toFixed(2)}</span><span class="meta">running average over ${Math.round(r.share * 100)}% of the grade</span></div>` : `<div class="note">No scores entered yet.</div>`;
    if (r.need != null) {
      const names = r.rem.map(a => a.c.vi).join(' + ');
      const line = r.need <= 0 ? `Target ${r.T} is already secured.` : r.need > 10 ? `Target ${r.T} is out of reach. The best possible result is <b>${r.max.toFixed(2)}</b>.` : `To finish on ${r.T}, you need <b>${r.need.toFixed(2)}</b> ${r.rem.length > 1 ? 'on average ' : ''}in ${esc(names)}.`;
      body += `<div class="note">${line}</div>`;
    }
  }
  if (r.sBad) body += `<div class="note" style="color:var(--bad)">A score outside 0 to 10 is ignored.</div>`;
  if (r.wBad) body += `<div class="note" style="color:var(--bad)">A weight that is not a positive number counts as 0.</div>`;
  return pill + body;
}
function cardHTML(s) {
  const rows = COMPS.map(c => `<div class="name"><b>${c.vi}</b><small>${c.en}</small></div>
    <input type="text" inputmode="decimal" id="${s.id}-w-${c.k}" data-sid="${s.id}" data-f="w.${c.k}" value="${esc(s.w[c.k])}" aria-label="${c.vi} weight percent" placeholder="0">
    <input type="text" inputmode="decimal" id="${s.id}-s-${c.k}" data-sid="${s.id}" data-f="s.${c.k}" value="${esc(s.s[c.k])}" aria-label="${c.vi} score out of 10" placeholder="-">`).join('');
  return `<article class="panel card" data-card="${s.id}"><div class="card-top">
    <label class="f">Subject${s.ex ? '<span class="ex">Example</span>' : ''}<input type="text" id="${s.id}-name" data-sid="${s.id}" data-f="name" value="${esc(s.name)}" placeholder="Subject name"></label>
    <label class="f">Credits<input type="text" inputmode="decimal" id="${s.id}-cr" data-sid="${s.id}" data-f="credits" value="${esc(s.credits)}"></label>
    <button class="danger" data-act="rm-subj" data-rm="${s.id}">Delete</button></div>
    <div class="comp"><span class="h">Component</span><span class="h" style="text-align:right">Weight %</span><span class="h" style="text-align:right">Score /10</span>${rows}</div>
    <div class="out" id="${s.id}-out">${outHTML(s)}</div></article>`;
}
function viewGrades() {
  const hasEx = CY().subjects.some(s => s.ex);
  return `<section class="panel sum" id="sum"></section>
    ${hasEx ? `<div class="banner"><span>These subjects are examples so you can see how it works. Replace them with your own.</span><button data-act="rm-ex">Remove examples</button></div>` : ''}
    <div class="subjects">${CY().subjects.map(cardHTML).join('') || '<div class="panel empty">No subjects yet. Add your first one.</div>'}</div>
    <div class="btnrow"><button class="primary" data-act="add-subj">Add subject</button></div>
    <p class="foot">Each subject&rsquo;s grade is the weighted sum of its scores on a 10-point scale. Components with weight 0 are ignored. Letter and 4.0 points use a common Vietnamese scale (8.5 A, 8.0 B+, 7.0 B, 6.5 C+, 5.5 C, 5.0 D+, 4.0 D) applied to the grade rounded to one decimal. Your school may use different cutoffs.</p>`;
}
function updateSummary() {
  const el = $('#sum'); if (!el) return;
  let cr = 0, s10 = 0, s4 = 0, done = 0, prog2 = 0;
  CY().subjects.forEach(s => { const r = calc(s), c = num(s.credits); if (r.complete && c > 0) { cr += c; s10 += r.final * c; s4 += r.g4[1] * c; done++; } else if (!r.complete && r.graded.length) prog2++; });
  el.innerHTML = `<label class="f">Target grade (10-point)<input type="text" inputmode="decimal" id="target" value="${esc(CY().target)}"></label>
    <div class="cellx"><span class="big">${done ? (s10 / cr).toFixed(2) : '-'}</span><small>GPA, 10-point scale</small></div>
    <div class="cellx"><span class="big">${done ? (s4 / cr).toFixed(2) : '-'}</span><small>GPA, 4.0 scale</small></div>
    <div class="cellx"><span class="big">${cr || '-'}</span><small>credits counted &middot; ${done} complete${prog2 ? ', ' + prog2 + ' in progress' : ''}</small></div>`;
}
function updateCard(id) {
  const s = CY().subjects.find(x => x.id === id), card = $(`[data-card="${id}"]`); if (!s || !card) return;
  $('#' + id + '-out').innerHTML = outHTML(s);
  card.querySelectorAll('input[data-f]').forEach(inp => {
    const [grp, k] = inp.dataset.f.split('.'); if (!k) return;
    const v = num(inp.value), bad = Number.isNaN(v) || (v != null && v < 0) || (grp === 's' && v != null && v > 10);
    inp.setAttribute('aria-invalid', bad ? 'true' : 'false');
  });
}

/* ================= applications tab (account 2) ================= */
function appStatsHTML() {
  const A = S.accts.artist, sent = A.apps.filter(x => x.status !== 'Saved').length, goal = num(A.appGoal) || 0, pct = goal > 0 ? Math.min(100, Math.round(sent / goal * 100)) : 0;
  return `<span class="big">${sent}<span> / ${goal || '-'} sent</span></span><span class="bar"><i style="width:${pct}%"></i></span>
    <span class="note">Saved leads do not count. Anything from Applied onward does, including rejections.</span>`;
}
function appCard(x) {
  const id = esc(x.id), inp = (k, label, v, ph, type) => `<label class="f">${label}<input type="${type || 'text'}" id="a-${id}-${k}" data-aid="${id}" data-af="${k}" value="${esc(v)}" ${ph ? `placeholder="${ph}"` : ''}></label>`;
  return `<article class="panel app"><div class="app-top">${inp('studio', 'Studio', x.studio, 'Studio')}
    <label class="f">Status<select id="a-${id}-status" data-aid="${id}" data-af="status">${STATUSES.map(s => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label></div>
    ${inp('role', 'Role', x.role, 'Role')}<div class="app-row">${inp('date', 'Date', x.date, '', 'date')}${inp('link', 'Listing link', x.link, 'https://')}</div>${inp('note', 'Notes', x.note, 'Notes')}
    <div class="app-foot">${/^https?:\/\//.test(x.link) ? `<a href="${esc(x.link)}" target="_blank" rel="noopener noreferrer">Open listing</a>` : '<span></span>'}<button class="danger" data-act="app-del" data-aid="${id}">Delete</button></div></article>`;
}
function appListHTML() {
  const list = ui.appFilter === 'all' ? AP() : AP().filter(x => x.status === ui.appFilter);
  return list.map(appCard).join('') || '<div class="panel empty">Nothing here yet.</div>';
}
function viewApps() {
  const A = S.accts.artist;
  const chips = [['all', 'All', A.apps.length]].concat(STATUSES.map(s => [s, s, A.apps.filter(x => x.status === s).length]))
    .map(([id, l, n]) => `<button class="chip" data-afilter="${id}" aria-pressed="${ui.appFilter === id}">${l} ${n}</button>`).join('');
  return `<section class="panel apps-top"><div class="stats" id="apps-stats">${appStatsHTML()}</div>
    <label class="f">Application goal<input type="text" inputmode="numeric" id="app-goal" value="${esc(A.appGoal)}"></label></section>
    <section class="panel"><h3>Add a lead</h3><form class="addrow" id="app-add"><input type="text" id="app-studio" placeholder="Studio" aria-label="Studio"><input type="text" id="app-role" placeholder="Role" aria-label="Role"><button class="primary" type="submit">Add</button></form></section>
    <div class="filters">${chips}</div><div class="apps" id="apps">${appListHTML()}</div>`;
}

