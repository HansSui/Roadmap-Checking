/* ================= Grades tab: semester planner (Crypto + RE account) =================
   Each semester holds courses taken from the UIT catalog (curriculum.js) or added by hand.
   Courses carry their own weights and scores, so the planner and the grade calculator are one list. */
const PASS_MIN = 4;
const SLOT_KINDS = { major: ['major'], topic: ['topic', 'major'], thesis: ['thesis'], free: ['free'] };
ui.sem = ''; ui.cx = {}; ui.catq = ''; ui.catOpen = false;

/* ---------- grade maths ---------- */
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
  if (s.separate) return `<div class="note">Counted separately (0 credits). Tick Done when you have finished it.</div>`;
  const r = calc(s), t = Math.round(r.total * 100) / 100;
  const pill = r.total === 0 ? `<span class="pill warn">Enter weights above</span>` : (Math.abs(r.total - 100) < 0.001 ? `<span class="pill">Weights total 100%</span>` : `<span class="pill warn">Weights total ${t}%, expected 100%</span>`);
  let body = '';
  if (r.complete) {
    body = `<div class="res"><span class="final">${r.final.toFixed(2)}</span><span class="meta">/ 10 &middot; rounds to ${(Math.round(r.final * 10) / 10).toFixed(1)} &middot; ${r.g4[0]} &middot; ${r.g4[1].toFixed(1)} / 4.0${r.g4[1] === 0 ? ' &middot; not passed' : ''}</span></div>`;
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
function isPassed(c, r) {
  if (c.done) return true; if (c.separate) return false;
  r = r || calc(c); return r.complete && Math.round(r.final * 10) / 10 >= PASS_MIN;
}

/* ---------- plan data helpers ---------- */
const SEMS = () => CY().semesters;
const semById = id => SEMS().find(s => s.id === id);
function curSem() {
  let s = semById(ui.sem);
  if (!s) { s = semById(CURRENT_SEM) || SEMS()[0] || null; ui.sem = s ? s.id : ''; }
  return s;
}
const allCourses = () => SEMS().flatMap(s => s.courses);
function findCourse(id) { for (const s of SEMS()) { const c = s.courses.find(x => x.id === id); if (c) return { sem: s, c }; } return null; }
const lim = v => { const n = num(v); return n != null && !Number.isNaN(n) && n > 0 ? n : null; };
const maxNT = () => lim(CY().maxNT), maxCr = () => lim(CY().maxCredits);
const reorder = () => SEMS().forEach((s, i) => { s.order = i + 1; });
const saveSems = () => { reorder(); saveAll(); };

function semStats(s) {
  const cs = s.courses.filter(c => !c.separate); let credits = 0, nt = 0, cr = 0, s10 = 0, s4 = 0, earned = 0, remain = 0, got10 = 0;
  cs.forEach(c => {
    credits += c.credits; if (c.nt) nt++;
    const r = calc(c);
    if (r.complete && c.credits > 0) { cr += c.credits; s10 += r.final * c.credits; s4 += r.g4[1] * c.credits; } else if (c.credits > 0 && !c.done) remain += c.credits;
    if (isPassed(c, r)) earned += c.credits;
  });
  const warns = [], mn = maxNT(), mc = maxCr();
  if (mn != null && nt > mn) warns.push(`${nt} project-heavy (NT) courses in one semester. Your limit is ${mn}. Moving ${nt - mn} of them to a lighter semester would balance the load.`);
  if (mc != null && credits > mc) warns.push(`${credits} credits is above your limit of ${mc}.`);
  const others = new Set(SEMS().filter(x => x !== s).flatMap(x => x.courses.map(c => c.code)).filter(Boolean));
  const dup = Array.from(new Set(s.courses.map(c => c.code).filter(c => c && others.has(c))));
  if (dup.length) warns.push(`${dup.join(', ')} also appear${dup.length === 1 ? 's' : ''} in another semester. Equivalent courses only count once.`);
  return { credits, nt, cr, s10, s4, earned, remain, warns, gpa10: cr ? s10 / cr : null, gpa4: cr ? s4 / cr : null, n: cs.length };
}
function blockStats() {
  const out = {}; BLOCKS.forEach(b => { out[b.id] = { planned: 0, earned: 0, count: 0 }; });
  allCourses().forEach(c => {
    if (c.separate) return;
    const b = out[c.block] || (out[c.block] = { planned: 0, earned: 0, count: 0 });
    b.planned += c.credits; b.count++; if (isPassed(c)) b.earned += c.credits;
  });
  return out;
}

/* ---------- summary, blocks, semester strip ---------- */
function sumHTML() {
  let cr = 0, s10 = 0, s4 = 0, planned = 0, earned = 0, done = 0, started = 0;
  allCourses().forEach(c => {
    if (c.separate) return;
    planned += c.credits; const r = calc(c);
    if (r.complete && c.credits > 0) { cr += c.credits; s10 += r.final * c.credits; s4 += r.g4[1] * c.credits; done++; } else if (r.graded.length) started++;
    if (isPassed(c, r)) earned += c.credits;
  });
  const diff = planned - TOTAL_NEED;
  return `<label class="f">Target grade (10-point)<input type="text" inputmode="decimal" id="target" value="${esc(CY().target)}"></label>
    <label class="f">Max NT courses per semester<input type="text" inputmode="numeric" id="max-nt" value="${esc(CY().maxNT)}" placeholder="no limit"></label>
    <label class="f">Max credits per semester<input type="text" inputmode="numeric" id="max-cr" value="${esc(CY().maxCredits)}" placeholder="no limit"></label>
    <div class="cellx"><span class="big">${done ? (s10 / cr).toFixed(2) : '-'}</span><small>GPA, 10-point scale</small></div>
    <div class="cellx"><span class="big">${done ? (s4 / cr).toFixed(2) : '-'}</span><small>GPA, 4.0 scale &middot; ${done} course${done === 1 ? '' : 's'} graded${started ? ', ' + started + ' started' : ''}</small></div>
    <div class="cellx"><span class="big">${earned}<span class="of"> / ${TOTAL_NEED}</span></span><small>credits earned &middot; ${planned} planned${diff ? ` (${diff > 0 ? diff + ' over' : -diff + ' short of'} the ${TOTAL_NEED} needed)` : ''}</small></div>`;
}
function blocksHTML() {
  const bs = blockStats();
  const rows = BLOCKS.map(b => {
    const s = bs[b.id], d = s.planned - b.need;
    const state = d > 0 ? `<span class="pill warn">${d} over</span>` : d < 0 ? `<span class="pill">${-d} still to plan</span>` : `<span class="pill ok">Planned</span>`;
    const extra = b.id === 'major' ? ` &middot; ${s.count} of 3 courses` : '';
    const w1 = Math.min(100, s.planned / b.need * 100), w2 = Math.min(100, s.earned / b.need * 100);
    return `<div class="blk"><div class="blk-h"><b>${esc(b.name)}</b><span>${s.earned} earned &middot; ${s.planned} / ${b.need} planned${extra}</span>${state}</div>
      <div class="bar"><i style="width:${w1}%"></i><b style="width:${w2}%"></b></div></div>`;
  }).join('');
  return `<h2>Degree blocks</h2><div class="blks">${rows}</div>`;
}
function stripHTML() {
  const sel = curSem();
  return SEMS().map(s => {
    const st = semStats(s);
    return `<button class="semchip${sel && s.id === sel.id ? ' on' : ''}${st.warns.length ? ' warn' : ''}" data-sem="${esc(s.id)}" aria-pressed="${sel && s.id === sel.id}">
      <b>${esc(s.name || 'Untitled')}${st.warns.length ? ' <span class="wi" title="Needs attention">!</span>' : ''}</b><small>${st.credits} cr &middot; ${st.nt} NT</small></button>`;
  }).join('') + `<button class="semchip add" data-act="sem-add">+ Semester</button>`;
}

/* ---------- selected semester ---------- */
function semStatsHTML(s) {
  const st = semStats(s), mn = maxNT(), mc = maxCr();
  const chip = (v, l, bad) => `<div class="chip${bad ? ' bad' : ''}"><b>${v}</b><small>${l}</small></div>`;
  let goal = '';
  const g = num(s.target);
  if (g != null && !Number.isNaN(g) && st.credits) {
    if (st.remain === 0) goal = st.cr ? `<div class="note">Goal ${g}: finished on <b>${st.gpa10.toFixed(2)}</b>${st.gpa10 >= g ? ', goal met.' : ', below the goal.'}</div>` : '';
    else {
      const need = (g * (st.cr + st.remain) - st.s10) / st.remain;
      goal = `<div class="note">${need <= 0 ? `Goal ${g} is already secured.` : need > 10 ? `Goal ${g} is out of reach for this semester.` : `To reach a semester GPA of ${g}, the remaining ${st.remain} credits need an average of <b>${need.toFixed(2)}</b>.`}</div>`;
    }
  }
  return `<div class="chips">${chip(st.credits + (mc != null ? ' / ' + mc : ''), 'credits', mc != null && st.credits > mc)}${chip(st.nt + (mn != null ? ' / ' + mn : ''), 'NT courses', mn != null && st.nt > mn)}${chip(st.n, 'courses')}${chip(st.gpa10 == null ? '-' : st.gpa10.toFixed(2), 'GPA 10-pt')}${chip(st.gpa4 == null ? '-' : st.gpa4.toFixed(2), 'GPA 4.0')}${chip(st.earned, 'credits earned')}</div>
    ${st.warns.map(w => `<div class="warnbox" role="alert">${esc(w)}</div>`).join('')}${goal}`;
}
function slotSelect(c) {
  const used = new Set(allCourses().filter(x => x !== c).map(x => x.code).filter(Boolean));
  const opts = CATALOG.filter(k => (SLOT_KINDS[c.slot] || []).includes(k.kind) && !used.has(k.code));
  return `<label class="f">${esc(SLOTS[c.slot].label)}<select data-cid="${c.id}" data-cf="pick" id="${c.id}-pick"><option value="">Choose a course...</option>${opts.map(k => `<option value="${k.code}"${k.code === c.code ? ' selected' : ''}>${k.code} &middot; ${esc(k.vi)} (${k.credits} cr)</option>`).join('')}</select></label>`;
}
function smText(c) {
  if (c.separate) return c.done ? 'Done' : '';
  const r = calc(c);
  if (r.complete) return r.final.toFixed(1) + ' ' + r.g4[0];
  if (r.graded.length) return '~' + r.running.toFixed(1);
  return c.done ? 'Done' : '';
}
function courseHTML(c) {
  const open = !!ui.cx[c.id], pending = c.slot && !c.code;
  const head = `<button class="x" data-cx="${c.id}" aria-expanded="${open}" aria-label="${open ? 'Collapse' : 'Expand'} ${esc(c.name)}"><span aria-hidden="true">${open ? '&#9662;' : '&#9656;'}</span></button>
    <span class="code">${esc(c.code || (pending ? '?' : '-'))}</span>
    <span class="nm">${esc(c.name || 'Untitled')}${c.en && !pending ? `<small>${esc(c.en)}</small>` : pending ? `<small>${esc(SLOTS[c.slot].hint)}</small>` : ''}</span>
    <span class="cr">${c.credits} cr</span>${c.nt ? '<span class="tagnt" title="Project-heavy course">NT</span>' : '<span></span>'}
    <span class="sm" id="${c.id}-sm">${esc(smText(c))}</span>`;
  const semOpts = SEMS().map(s => `<option value="${esc(s.id)}"${findCourse(c.id).sem === s ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
  const rows = COMPS.map(k => `<div class="name"><b>${k.vi}</b><small>${k.en}</small></div>
    <input type="text" inputmode="decimal" id="${c.id}-w-${k.k}" data-cid="${c.id}" data-cf="w.${k.k}" value="${esc(c.w[k.k])}" aria-label="${k.vi} weight percent" placeholder="0">
    <input type="text" inputmode="decimal" id="${c.id}-s-${k.k}" data-cid="${c.id}" data-cf="s.${k.k}" value="${esc(c.s[k.k])}" aria-label="${k.vi} score out of 10" placeholder="-">`).join('');
  const body = open ? `<div class="crs-body">
    <div class="crs-fields">
      <label class="f">Code<input type="text" id="${c.id}-code" data-cid="${c.id}" data-cf="code" value="${esc(c.code)}"></label>
      <label class="f nm2">Name<input type="text" id="${c.id}-name" data-cid="${c.id}" data-cf="name" value="${esc(c.name)}"></label>
      <label class="f">Credits<input type="text" inputmode="decimal" id="${c.id}-cr" data-cid="${c.id}" data-cf="credits" value="${esc(c.credits)}"></label>
    </div>
    <div class="crs-fields">
      ${c.slot ? slotSelect(c) : ''}
      <label class="f">Block<select data-cid="${c.id}" data-cf="block">${BLOCKS.map(b => `<option value="${b.id}"${c.block === b.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
      <label class="f">Semester<select data-cid="${c.id}" data-cf="move">${semOpts}</select></label>
    </div>
    <div class="crs-flags">
      <label class="chk"><input type="checkbox" data-cid="${c.id}" data-cf="nt" ${c.nt ? 'checked' : ''}> NT (project-heavy)</label>
      <label class="chk"><input type="checkbox" data-cid="${c.id}" data-cf="done" ${c.done ? 'checked' : ''}> Done, count credits</label>
      <button class="danger" data-act="c-del" data-cid="${c.id}">Remove from plan</button>
    </div>
    ${c.separate ? '' : `<div class="comp"><span class="h">Component</span><span class="h" style="text-align:right">Weight %</span><span class="h" style="text-align:right">Score /10</span>${rows}</div>`}
    <div class="out" id="${c.id}-out">${outHTML(c)}</div></div>` : '';
  return `<div class="crs${open ? ' open' : ''}${pending ? ' pending' : ''}" data-card="${c.id}"><div class="crs-row">${head}</div>${body}</div>`;
}
function semHTML(s) {
  if (!s) return `<div class="panel empty">No semesters yet. Add one with the button above.</div>`;
  const i = SEMS().indexOf(s), rec = recommendedSemester(s.id);
  return `<section class="panel semp">
    <div class="semh">
      <label class="f">Semester name<input type="text" id="sem-name" data-semf="name" value="${esc(s.name)}"></label>
      <label class="f">Goal GPA (10-point)<input type="text" inputmode="decimal" id="sem-goal" data-semf="target" value="${esc(s.target)}" placeholder="optional"></label>
      <div class="semtools">
        <button class="sm" data-act="sem-up" ${i === 0 ? 'disabled' : ''} aria-label="Move semester earlier">&uarr;</button>
        <button class="sm" data-act="sem-down" ${i === SEMS().length - 1 ? 'disabled' : ''} aria-label="Move semester later">&darr;</button>
        ${rec ? `<button class="sm" data-act="sem-rec" title="Replace this semester's courses with the recommended ones">Load recommended</button>` : ''}
        <button class="sm danger" data-act="sem-del">Delete semester</button>
      </div>
    </div>
    <div id="semstats">${semStatsHTML(s)}</div>
    <div class="crslist">${s.courses.map(courseHTML).join('') || '<div class="empty">No courses in this semester. Add one from the catalog below, or add a blank course.</div>'}</div>
    <div class="btnrow"><button class="primary" data-act="c-add">Add blank course</button><button data-act="open-courses">Expand all</button><button data-act="close-courses">Collapse all</button></div>
  </section>`;
}

/* ---------- catalog ---------- */
function slotFor(k) {
  const cs = curSem(), order = [cs].concat(SEMS().filter(s => s !== cs));
  for (const s of order) { if (!s) continue; const c = s.courses.find(x => x.slot && !x.code && (SLOT_KINDS[x.slot] || []).includes(k.kind)); if (c) return { sem: s, c }; }
  return null;
}
function catListHTML() {
  const q = (ui.catq || '').trim().toLowerCase(), where = {};
  SEMS().forEach(s => s.courses.forEach(c => { if (c.code) where[c.code] = s; }));
  const groups = ['gen', 'sep', 'found', 'major', 'other', 'grad'], cs = curSem();
  return groups.map(g => {
    const rows = CATALOG.filter(k => k.block === g && (!q || (k.code + ' ' + k.vi + ' ' + k.en).toLowerCase().includes(q))).map(k => {
      const w = where[k.code], sl = !w && slotFor(k);
      const act = w ? `<span class="pill">In ${esc(w.name)}</span>` : sl ? `<button class="sm" data-act="cat-add" data-code="${k.code}">Use slot in ${esc(sl.sem.name)}</button>` : `<button class="sm" data-act="cat-add" data-code="${k.code}">Add to ${esc(cs ? cs.name : 'plan')}</button>`;
      return `<div class="cat-row"><span class="code">${k.code}</span><span class="nm">${esc(k.vi)}<small>${esc(k.en)}</small></span><span class="cr">${k.credits} cr</span>${k.nt ? '<span class="tagnt">NT</span>' : '<span></span>'}<span class="act">${act}</span></div>`;
    }).join('');
    return rows ? `<h3>${esc(BLOCK_LABEL[g])}</h3>${rows}` : '';
  }).join('') || '<div class="empty">No course matches that search.</div>';
}
function catalogHTML() {
  return `<details class="panel catalog" data-catd ${ui.catOpen ? 'open' : ''}><summary><b>Course catalog</b> <span class="muted">UIT An toàn thông tin, cohort 20 (2025) &middot; ${CATALOG.length} courses. Choose what goes into your plan.</span></summary>
    <label class="f">Search<input type="text" id="cat-q" value="${esc(ui.catq)}" placeholder="Code or name"></label>
    <div id="cat-list">${catListHTML()}</div></details>`;
}

function viewGrades() {
  return `<section class="panel sum" id="sum">${sumHTML()}</section>
    <section class="panel" id="blocks">${blocksHTML()}</section>
    <div class="semstrip" id="semstrip" role="group" aria-label="Semesters">${stripHTML()}</div>
    <div id="semview">${semHTML(curSem())}</div>
    ${catalogHTML()}
    <div class="btnrow"><button data-act="sem-reset">Reset plan to the recommended curriculum</button></div>
    <p class="foot">Courses tagged NT are the project-heavy ones. The planner warns when a semester has more NT courses or credits than the limits above. Each course&rsquo;s grade is the weighted sum of its scores on a 10-point scale. Components with weight 0 are ignored. Letter and 4.0 points use a common Vietnamese scale (8.5 A, 8.0 B+, 7.0 B, 6.5 C+, 5.5 C, 5.0 D+, 4.0 D) applied to the grade rounded to one decimal, and a course counts as earned from 4.0. Default weights are placeholders, so set the real ones from each course&rsquo;s syllabus. Prerequisites are not checked. Your school may use different cutoffs.</p>`;
}

/* ---------- live updates (no full re-render, so typing keeps focus) ---------- */
function refreshSem() {
  keepFocus(() => {
    const set = (id, h) => { const e = document.getElementById(id); if (e) e.innerHTML = h; };
    set('sum', sumHTML()); set('blocks', blocksHTML()); set('semstrip', stripHTML());
    const s = curSem(); if (s) set('semstats', semStatsHTML(s));
  });
}
function updateCourse(c) {
  const o = document.getElementById(c.id + '-out'); if (o) o.innerHTML = outHTML(c);
  const m = document.getElementById(c.id + '-sm'); if (m) m.textContent = smText(c);
  const card = document.querySelector(`[data-card="${c.id}"]`); if (!card) return;
  card.querySelectorAll('input[data-cf]').forEach(inp => {
    const [grp, k] = inp.dataset.cf.split('.'); if (!k) return;
    const v = num(inp.value), bad = Number.isNaN(v) || (v != null && v < 0) || (grp === 's' && v != null && v > 10);
    inp.setAttribute('aria-invalid', bad ? 'true' : 'false');
  });
  const cr = card.querySelector('.crs-row .cr'); if (cr) cr.textContent = c.credits + ' cr';
  const cd = card.querySelector('.crs-row .code'); if (cd) cd.textContent = c.code || (c.slot ? '?' : '-');
  const nm = card.querySelector('.crs-row .nm'); if (nm && document.activeElement && document.activeElement.dataset.cf === 'name') nm.firstChild.textContent = c.name || 'Untitled';
}
function applyCatalog(c, code) {
  const k = CAT[code]; if (!k) return;
  Object.assign(c, { code: k.code, name: k.vi, en: k.en, credits: k.credits, lt: k.lt, th: k.th, block: k.block, nt: k.nt });
}
function clearSlot(c) {
  const sl = SLOTS[c.slot];
  Object.assign(c, { code: '', name: sl.vi, en: sl.label, credits: sl.credits, lt: sl.lt, th: sl.th, block: sl.block, nt: sl.nt });
}

/* ---------- event hooks (called from app.js) ---------- */
function semClick(d) {
  if (d.sem) { ui.sem = d.sem; renderView(); return true; }
  if (d.cx) { ui.cx[d.cx] = !ui.cx[d.cx]; renderView(); return true; }
  return false;
}
function semInput(t) {
  const d = t.dataset;
  if (t.id === 'target') { CY().target = t.value; save('settings'); refreshSem(); allCourses().forEach(updateCourse); return true; }
  if (t.id === 'max-nt') { CY().maxNT = t.value; save('settings'); refreshSem(); return true; }
  if (t.id === 'max-cr') { CY().maxCredits = t.value; save('settings'); refreshSem(); return true; }
  if (t.id === 'cat-q') { ui.catq = t.value; const l = $('#cat-list'); if (l) l.innerHTML = catListHTML(); return true; }
  if (d.semf) { const s = curSem(); if (!s) return true; s[d.semf] = t.value; save('sem:' + s.id); refreshSem(); return true; }
  if (d.cid) {
    if (['nt', 'done', 'move', 'pick', 'block'].includes(d.cf)) return true;
    const f = findCourse(d.cid); if (!f) return true; const c = f.c;
    if (d.cf === 'name' || d.cf === 'code') c[d.cf] = t.value;
    else if (d.cf === 'credits') { const v = num(t.value); c.credits = v != null && !Number.isNaN(v) && v >= 0 ? v : 0; }
    else { const [g, k] = d.cf.split('.'); c[g][k] = t.value; }
    save('sem:' + f.sem.id); updateCourse(c); refreshSem(); return true;
  }
  return false;
}
function semChange(t) {
  const d = t.dataset; if (!d.cid || !d.cf) return false;
  const f = findCourse(d.cid); if (!f) return true; const c = f.c;
  if (d.cf === 'nt' || d.cf === 'done') { c[d.cf] = t.checked; save('sem:' + f.sem.id); updateCourse(c); refreshSem(); return true; }
  if (d.cf === 'block') { c.block = t.value; save('sem:' + f.sem.id); refreshSem(); return true; }
  if (d.cf === 'pick') { if (t.value) applyCatalog(c, t.value); else clearSlot(c); save('sem:' + f.sem.id); keepFocus(renderView); return true; }
  if (d.cf === 'move') {
    const to = semById(t.value); if (!to || to === f.sem) return true;
    f.sem.courses = f.sem.courses.filter(x => x !== c); to.courses.push(c); ui.sem = to.id;
    save('sem:' + f.sem.id, 'sem:' + to.id); renderView(); showToast('Moved to ' + to.name); return true;
  }
  return false;
}
document.addEventListener('toggle', e => { const t = e.target; if (t && t.matches && t.matches('[data-catd]')) ui.catOpen = t.open; }, true);

const SEM_ACT = {
  'sem-add'() {
    const s = normSemester({ id: uid(), name: 'Semester ' + (SEMS().length + 1), courses: [] }, SEMS().length);
    SEMS().push(s); ui.sem = s.id; saveSems(); renderView();
  },
  'sem-del'() {
    const s = curSem(); if (!s) return;
    withUndo('Semester deleted', () => { CY().semesters = SEMS().filter(x => x !== s); ui.sem = ''; saveSems(); renderView(); });
  },
  'sem-up'() { const s = curSem(); moveBy(SEMS(), SEMS().indexOf(s), -1); saveSems(); renderView(); },
  'sem-down'() { const s = curSem(); moveBy(SEMS(), SEMS().indexOf(s), 1); saveSems(); renderView(); },
  'sem-rec'() {
    const s = curSem(), r = s && recommendedSemester(s.id); if (!r) return;
    withUndo('Recommended courses loaded', () => { s.courses = r.courses; save('sem:' + s.id); renderView(); });
  },
  'sem-reset'() {
    withUndo('Plan reset to the recommended curriculum', () => { CY().semesters = defaultSemesters(); ui.sem = ''; ui.cx = {}; saveSems(); renderView(); });
  },
  'c-add'() {
    const s = curSem(); if (!s) return;
    const c = normCourse({ id: uid(), name: '', credits: 3, lt: 2, th: 1, block: 'other', w: defaultWeights({ lt: 2, th: 1 }) });
    s.courses.push(c); ui.cx[c.id] = true; save('sem:' + s.id); renderView();
    const n = document.getElementById(c.id + '-name'); if (n) { n.focus(); n.scrollIntoView({ block: 'center' }); }
  },
  'c-del'(b) {
    const f = findCourse(b.dataset.cid); if (!f) return;
    withUndo('Course removed', () => { f.sem.courses = f.sem.courses.filter(x => x !== f.c); save('sem:' + f.sem.id); renderView(); });
  },
  'cat-add'(b) {
    const k = CAT[b.dataset.code]; if (!k || allCourses().some(c => c.code === k.code)) return;
    const sl = slotFor(k), s = curSem();
    if (sl) { applyCatalog(sl.c, k.code); save('sem:' + sl.sem.id); ui.sem = sl.sem.id; ui.cx[sl.c.id] = false; }
    else { if (!s) return; s.courses.push(courseFromCatalog(k.code, uid(), '')); save('sem:' + s.id); }
    renderView();
  },
  'open-courses'() { (curSem() || { courses: [] }).courses.forEach(c => { ui.cx[c.id] = true; }); renderView(); },
  'close-courses'() { (curSem() || { courses: [] }).courses.forEach(c => { ui.cx[c.id] = false; }); renderView(); }
};
