/* ================= Lecturer & Course Analysis =================
   Displays subjects with teacher % breakdowns, class stats, and
   red-highlighted warnings for risky or scarce courses.
   Data is loaded from data/TKBChuan/lecturer_analysis.json
   ============================================================= */

/* ---------- state ---------- */
let LA_DATA = null;        // raw JSON data
let LA_LOADED = false;
let LA_ERR = null;
ui.laGroup  = 'all';       // 'all' | 'CS' | 'NT' | 'SE'
ui.laSearch = '';          // search query
ui.laView   = 'subject';   // 'subject' | 'teacher'
ui.laSort   = 'name';      // 'name' | 'warn' | 'classes' | 'teachers'
ui.laExpand = {};          // expanded subject IDs
ui.laTExp   = {};          // expanded teacher IDs

/* ---------- warning thresholds ---------- */
const WARN = {
  FEW_CLASSES:    1.5,   // avg classes/semester ≤ this → "too few classes / hard to sign in"
  LOW_TEACHER:    0.5,   // top teacher % < 50% → "low teacher coverage" (many TBA or scattered)
  HIGH_UNASSIGNED:0.25,  // unassigned % > 25% → "teacher not assigned"
  SINGLE_TEACHER: true,  // only 1 teacher handling ≥80% of load
  MIN_TEACHERS:   1,     // ≤ this many teachers → single-point-of-failure
};

/* ---------- load data ---------- */
function laLoad() {
  if (LA_LOADED) return;
  LA_LOADED = true;
  fetch('data/TKBChuan/lecturer_analysis.json')
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(d => { LA_DATA = d; const v = $('#view'); if (v && curTab === 'lecturer') v.innerHTML = viewLecturer(); })
    .catch(e => { LA_ERR = e.message; const v = $('#view'); if (v && curTab === 'lecturer') v.innerHTML = viewLecturer(); });
}

/* ---------- helpers ---------- */
function pctBar(pct, cls) {
  const p = Math.round(pct * 100);
  const w = Math.min(100, p);
  return `<div class="la-barwrap"><div class="la-bartrack"><div class="la-barfill ${cls || ''}" style="width:${w}%"></div></div><span class="la-pct">${p}%</span></div>`;
}

function warnFlags(c) {
  const flags = [];
  if (c.pct_chua_pc > WARN.HIGH_UNASSIGNED) flags.push({ key: 'tba',   msg: `${Math.round(c.pct_chua_pc * 100)}% chưa phân công GV`, sev: 'high' });
  if (c.tb_lop_hk <= WARN.FEW_CLASSES)      flags.push({ key: 'few',   msg: `Trung bình ${c.tb_lop_hk} lớp/HK — ít lớp, khó đăng ký`, sev: 'med' });
  if (c.so_gv <= WARN.MIN_TEACHERS && c.so_gv > 0 && c.pct_chua_pc < 0.9)
                                              flags.push({ key: 'sgv',  msg: `Chỉ ${c.so_gv} GV LT — rủi ro phụ thuộc 1 người`, sev: 'med' });
  if (c.so_hk_mo <= 2 && c.so_hk_mo > 0)   flags.push({ key: 'rare',  msg: `Chỉ mở ${c.so_hk_mo}/5 HK — khó chủ động đăng ký`, sev: 'low' });
  return flags;
}

function sevClass(flags) {
  if (!flags.length) return '';
  if (flags.some(f => f.sev === 'high')) return 'warn-high';
  if (flags.some(f => f.sev === 'med'))  return 'warn-med';
  return 'warn-low';
}

function groupLabel(g) { return { CS: 'CS', NT: 'NT', SE: 'SE' }[g] || g; }

function laLecturers(ma) {
  if (!LA_DATA) return [];
  return LA_DATA.lecturers.filter(l => l.ma === ma && l.ma_gv); // exclude TBA rows
}
function laTAs(ma) {
  if (!LA_DATA) return [];
  return LA_DATA.tas.filter(t => t.ma === ma && t.ma_gv);
}
function tbas(ma) {
  if (!LA_DATA) return [];
  return LA_DATA.lecturers.filter(l => l.ma === ma && !l.ma_gv);
}

/* ---------- teacher-centric view ---------- */
function buildTeacherMap() {
  if (!LA_DATA) return {};
  const map = {};
  LA_DATA.lecturers.forEach(l => {
    if (!l.ma_gv) return; // skip TBA
    if (!map[l.gv]) map[l.gv] = { gv: l.gv, ma_gv: l.ma_gv, courses: [], totalLop: 0 };
    map[l.gv].courses.push({ ma: l.ma, pct: l.pct, so_lop: l.so_lop, dang_day: l.dang_day, day_gan: l.day_gan });
    map[l.gv].totalLop += l.so_lop_qd;
  });
  return map;
}

/* ========== HTML builders ========== */
function laHKcells(c) {
  const hks = [
    ['HK1 23-24', c.hk1_2324],
    ['HK1 24-25', c.hk1_2425],
    ['HK2 24-25', c.hk2_2425],
    ['HK1 25-26', c.hk1_2526],
    ['HK2 25-26', c.hk2_2526],
  ];
  return hks.map(([lbl, v]) =>
    `<div class="la-hk ${v > 0 ? 'active' : ''}"><small>${esc(lbl)}</small><b>${v > 0 ? v : '—'}</b></div>`
  ).join('');
}

function laLecturerRows(ma, type) {
  const rows = type === 'lt' ? laLecturers(ma) : laTAs(ma);
  const tba  = type === 'lt' ? tbas(ma) : [];
  if (!rows.length && !tba.length) return `<div class="la-nobody">Không có dữ liệu</div>`;
  let out = '';
  rows.forEach(l => {
    const pct = Math.round(l.pct * 100);
    const isCurrent = l.dang_day === 'Có';
    out += `<div class="la-lrow ${isCurrent ? 'current' : ''}">
      <span class="la-name">${esc(l.gv)}${isCurrent ? '<span class="la-now">Đang dạy</span>' : ''}</span>
      <span class="la-lbar">${pctBar(l.pct, pct >= 50 ? 'hi' : '')}</span>
      <span class="la-meta">${l.so_lop} lớp · ${esc(l.day_gan)}</span>
    </div>`;
  });
  tba.forEach(t => {
    const pct = Math.round(t.pct * 100);
    out += `<div class="la-lrow tba">
      <span class="la-name"><em>Chưa phân công</em></span>
      <span class="la-lbar">${pctBar(t.pct, 'tba-bar')}</span>
      <span class="la-meta">${t.so_lop} lớp</span>
    </div>`;
  });
  return out;
}

function laSubjectCard(c) {
  const flags  = warnFlags(c);
  const sc     = sevClass(flags);
  const open   = !!ui.laExpand[c.ma];
  const hkTag  = c.mo_hk2_2526 === 'Có' ? '<span class="la-tag green">HK2 25-26</span>' : `<span class="la-tag muted">${esc(c.mo_gan_nhat)}</span>`;
  const warnHTML = flags.length ? `<div class="la-warns">${flags.map(f => `<div class="la-wflag sev-${f.sev}">⚠ ${esc(f.msg)}</div>`).join('')}</div>` : '';
  const lts = laLecturers(c.ma), tas = laTAs(c.ma);

  const bodyHTML = open ? `<div class="la-body">
    <div class="la-stats-row">
      <div class="la-stat"><b>${c.so_hk_mo}<span>/5</span></b><small>HK đã mở</small></div>
      <div class="la-stat"><b>${c.tb_lop_hk}</b><small>Lớp TB/HK</small></div>
      <div class="la-stat"><b>${c.tb_si_so}</b><small>Sĩ số TB</small></div>
      <div class="la-stat"><b>${c.so_gv}</b><small>GV LT</small></div>
      ${c.tb_lop_th > 0 ? `<div class="la-stat"><b>${c.tb_lop_th}</b><small>Lớp TH TB</small></div>` : ''}
    </div>
    <div class="la-hks">${laHKcells(c)}</div>
    <div class="la-section">
      <h4>Giảng viên lý thuyết <span class="la-count">${lts.length} GV</span></h4>
      <div class="la-lrows">${laLecturerRows(c.ma, 'lt')}</div>
    </div>
    ${tas.length > 0 ? `<div class="la-section">
      <h4>Trợ giảng thực hành <span class="la-count">${tas.length} người</span></h4>
      <div class="la-lrows">${laLecturerRows(c.ma, 'th')}</div>
    </div>` : ''}
    ${c.gv_hk_moi ? `<div class="la-current-note">📌 HK mới nhất: <b>${esc(c.gv_hk_moi)}</b></div>` : ''}
  </div>` : '';

  return `<article class="la-card ${sc}" id="la-${esc(c.ma)}">
    <button class="la-head" data-laexp="${esc(c.ma)}" aria-expanded="${open}">
      <span class="la-code">${esc(c.ma)}</span>
      <span class="la-title">${esc(c.ten)}<small class="la-group">${esc(c.nhom)}</small></span>
      <span class="la-badges">${hkTag}${flags.length ? `<span class="la-warn-badge">${flags.length} cảnh báo</span>` : ''}</span>
      <span class="la-chev" aria-hidden="true"></span>
    </button>
    ${warnHTML}
    ${bodyHTML}
  </article>`;
}

function laTeacherCard(gv, info) {
  const open = !!ui.laTExp[gv];
  const courses = info.courses.sort((a, b) => b.pct - a.pct);
  const activeCourses = courses.filter(c => c.dang_day === 'Có');
  const bodyHTML = open ? `<div class="la-body">
    <div class="la-lrows">
      ${courses.map(c => {
        const course = LA_DATA.courses.find(x => x.ma === c.ma) || {};
        const isCurrent = c.dang_day === 'Có';
        return `<div class="la-lrow ${isCurrent ? 'current' : ''}">
          <span class="la-name"><code class="la-code-sm">${esc(c.ma)}</code> ${esc(course.ten || '')}${isCurrent ? '<span class="la-now">Đang dạy</span>' : ''}</span>
          <span class="la-lbar">${pctBar(c.pct, c.pct >= 0.5 ? 'hi' : '')}</span>
          <span class="la-meta">${c.so_lop} lớp · ${esc(c.day_gan)}</span>
        </div>`;
      }).join('')}
    </div>
  </div>` : '';

  return `<article class="la-card" id="lat-${esc(gv)}">
    <button class="la-head" data-lataexp="${esc(gv)}" aria-expanded="${open}">
      <span class="la-code" style="min-width:60px">${esc(info.ma_gv)}</span>
      <span class="la-title">${esc(gv)}</span>
      <span class="la-badges">
        <span class="la-tag ${activeCourses.length ? 'green' : 'muted'}">${activeCourses.length} đang dạy</span>
        <span class="la-tag muted">${courses.length} môn</span>
        <span class="la-tag muted">${info.totalLop.toFixed(1)} lớp quy đổi</span>
      </span>
      <span class="la-chev" aria-hidden="true"></span>
    </button>
    ${bodyHTML}
  </article>`;
}

/* ========== top-level view ========== */
function viewLecturer() {
  if (!LA_LOADED || (!LA_DATA && !LA_ERR)) {
    laLoad();
    return `<div class="panel empty" style="padding:40px 16px">
      <div class="la-loading">Đang tải dữ liệu phân tích...</div></div>`;
  }
  if (LA_ERR) {
    return `<div class="panel empty" style="padding:40px 16px; color:var(--bad)">
      Không thể tải dữ liệu: ${esc(LA_ERR)}<br><small>Đảm bảo file <code>data/TKBChuan/lecturer_analysis.json</code> tồn tại.</small></div>`;
  }

  /* ---- filters ---- */
  const groups = ['all', 'CS', 'NT', 'SE'];
  const groupChips = groups.map(g => {
    const cnt = g === 'all' ? LA_DATA.courses.length : LA_DATA.courses.filter(c => c.nhom === g).length;
    return `<button class="chip" data-lagrp="${g}" aria-pressed="${ui.laGroup === g}">${g === 'all' ? 'Tất cả' : g} <span class="la-cnt">${cnt}</span></button>`;
  }).join('');

  const viewChips = [['subject', 'Theo môn học'], ['teacher', 'Theo giảng viên']].map(([id, l]) =>
    `<button class="chip" data-laview="${id}" aria-pressed="${ui.laView === id}">${l}</button>`).join('');

  /* ---- filter and sort courses ---- */
  let courses = [...LA_DATA.courses];
  if (ui.laGroup !== 'all') courses = courses.filter(c => c.nhom === ui.laGroup);
  const q = ui.laSearch.trim().toLowerCase();
  if (q) courses = courses.filter(c => (c.ma + ' ' + c.ten).toLowerCase().includes(q));

  if (ui.laSort === 'warn')     courses.sort((a, b) => warnFlags(b).length - warnFlags(a).length || a.ten.localeCompare(b.ten));
  else if (ui.laSort === 'classes') courses.sort((a, b) => b.tb_lop_hk - a.tb_lop_hk || a.ten.localeCompare(b.ten));
  else if (ui.laSort === 'teachers') courses.sort((a, b) => b.so_gv - a.so_gv || a.ten.localeCompare(b.ten));
  else courses.sort((a, b) => a.ten.localeCompare(b.ten));

  const warnCount = courses.filter(c => warnFlags(c).length > 0).length;

  /* ---- subject view ---- */
  if (ui.laView === 'subject') {
    return `
    <div class="la-toolbar">
      <div class="filters">${groupChips}</div>
      <div class="filters">${viewChips}</div>
    </div>
    <div class="la-toolbar2">
      <input type="text" id="la-search" placeholder="Tìm môn học (mã hoặc tên)…" value="${esc(ui.laSearch)}" class="la-search">
      <div class="la-sort-row">
        <span class="label">Sắp xếp:</span>
        ${[['name','Tên'],['warn','Cảnh báo'],['classes','Lớp/HK'],['teachers','Số GV']].map(([v,l]) =>
          `<button class="chip ${ui.laSort===v?'on':''}" data-lasort="${v}">${l}</button>`).join('')}
      </div>
    </div>
    <div class="la-summary panel">
      <span>📋 <b>${courses.length}</b> môn học</span>
      ${warnCount > 0 ? `<span class="la-sumwarn">⚠ <b>${warnCount}</b> môn có cảnh báo</span>` : '<span style="color:var(--accent)">✓ Không có cảnh báo</span>'}
      <span class="note">Nhấn vào môn để xem chi tiết GV và phân bổ lớp</span>
    </div>
    <div class="la-legend panel">
      <b>Chú thích cảnh báo:</b>
      <span class="la-wflag sev-high">⚠ Chưa phân công GV (&gt;25% lớp chưa có GV)</span>
      <span class="la-wflag sev-med">⚠ Ít GV / ít lớp (&lt;=1 GV hoặc TB &lt;=1.5 lớp/HK)</span>
      <span class="la-wflag sev-low">⚠ Mở ít học kỳ (&lt;=2/5 HK)</span>
    </div>
    <div class="la-cards">${courses.map(laSubjectCard).join('') || '<div class="panel empty">Không tìm thấy môn học nào.</div>'}</div>`;
  }

  /* ---- teacher view ---- */
  const teacherMap = buildTeacherMap();
  let teachers = Object.entries(teacherMap).map(([gv, info]) => ({ gv, ...info }));
  if (ui.laGroup !== 'all') {
    teachers = teachers.filter(t => t.courses.some(c => {
      const course = LA_DATA.courses.find(x => x.ma === c.ma);
      return course && course.nhom === ui.laGroup;
    }));
  }
  if (q) teachers = teachers.filter(t => t.gv.toLowerCase().includes(q) || t.ma_gv.toLowerCase().includes(q));
  teachers.sort((a, b) => b.totalLop - a.totalLop || a.gv.localeCompare(b.gv));

  return `
  <div class="la-toolbar">
    <div class="filters">${groupChips}</div>
    <div class="filters">${viewChips}</div>
  </div>
  <div class="la-toolbar2">
    <input type="text" id="la-search" placeholder="Tìm giảng viên (tên hoặc mã)…" value="${esc(ui.laSearch)}" class="la-search">
  </div>
  <div class="la-summary panel">
    <span>👨‍🏫 <b>${teachers.length}</b> giảng viên</span>
    <span class="note">Sắp xếp theo số lớp quy đổi (nhiều nhất trước)</span>
  </div>
  <div class="la-cards">${teachers.map(t => laTeacherCard(t.gv, t)).join('') || '<div class="panel empty">Không tìm thấy giảng viên nào.</div>'}</div>`;
}

/* ========== event wiring (called from app.js click/input handlers) ========== */
function lecturerClick(d) {
  if (d.laexp !== undefined) {
    ui.laExpand[d.laexp] = !ui.laExpand[d.laexp];
    renderView(); return true;
  }
  if (d.lataexp !== undefined) {
    ui.laTExp[d.lataexp] = !ui.laTExp[d.lataexp];
    renderView(); return true;
  }
  if (d.lagrp !== undefined) {
    ui.laGroup = d.lagrp; ui.laExpand = {}; ui.laTExp = {};
    renderView(); return true;
  }
  if (d.laview !== undefined) {
    ui.laView = d.laview; ui.laSearch = ''; ui.laExpand = {}; ui.laTExp = {};
    renderView(); return true;
  }
  if (d.lasort !== undefined) {
    ui.laSort = d.lasort;
    renderView(); return true;
  }
  return false;
}
function lecturerInput(t) {
  if (t.id === 'la-search') {
    ui.laSearch = t.value; ui.laExpand = {}; ui.laTExp = {};
    const cards = document.querySelector('.la-cards');
    if (cards) {
      keepFocus(renderView);
    }
    return true;
  }
  return false;
}
