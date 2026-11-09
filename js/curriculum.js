/* ================= UIT curriculum data =================
   Bachelor of Information Security (An toàn thông tin), cohort 20 (2025): 129 credits, 3.5 years.
   Source: the program page on portal.uit.edu.vn, sections 3.x (course blocks) and 4.2 (sample teaching plan).
   Courses coded NT are tagged "NT" (project-heavy). The semester planner warns when one semester has too many.
   Edit this file to change the catalog or the recommended plan. */

const BLOCKS = [
  { id: 'gen', name: 'General education', need: 47 },
  { id: 'found', name: 'Foundation', need: 51 },
  { id: 'major', name: 'Major electives', need: 9 },
  { id: 'other', name: 'Other courses', need: 8 },
  { id: 'grad', name: 'Graduation', need: 14 }
];
const BLOCK_LABEL = { gen: 'General education', found: 'Foundation', major: 'Major electives (choose 3)', other: 'Other courses', grad: 'Graduation', sep: 'Counted separately (no credits)' };
const TOTAL_NEED = BLOCKS.reduce((a, b) => a + b.need, 0);
const CURRENT_SEM = 'hk3'; /* cohort 2025, autumn 2026 = third semester */

/* code, Vietnamese name, English name, credits, theory, practice, block, kind */
function K(code, vi, en, credits, lt, th, block, kind) {
  return { code, vi, en, credits, lt, th, block, kind: kind || 'req', nt: /^NT/.test(code), separate: block === 'sep' };
}
const CATALOG = [
  /* General education: politics and law */
  K('SS003', 'Tư tưởng Hồ Chí Minh', 'Ho Chi Minh Thought', 2, 2, 0, 'gen'),
  K('SS006', 'Pháp luật đại cương', 'General Law', 2, 2, 0, 'gen'),
  K('SS007', 'Triết học Mác – Lênin', 'Marxist-Leninist Philosophy', 3, 3, 0, 'gen'),
  K('SS008', 'Kinh tế chính trị Mác – Lênin', 'Marxist-Leninist Political Economy', 2, 2, 0, 'gen'),
  K('SS009', 'Chủ nghĩa xã hội khoa học', 'Scientific Socialism', 2, 2, 0, 'gen'),
  K('SS010', 'Lịch sử Đảng Cộng sản Việt Nam', 'History of the Communist Party of Vietnam', 2, 2, 0, 'gen'),
  /* General education: math, computing, science */
  K('MA006', 'Giải tích', 'Calculus', 4, 4, 0, 'gen'),
  K('MA003', 'Đại số tuyến tính', 'Linear Algebra', 3, 3, 0, 'gen'),
  K('MA004', 'Cấu trúc rời rạc', 'Discrete Structures', 4, 4, 0, 'gen'),
  K('MA005', 'Xác suất thống kê', 'Probability and Statistics', 3, 3, 0, 'gen'),
  K('PH002', 'Nhập môn mạch số', 'Introduction to Digital Circuits', 4, 3, 1, 'gen'),
  K('IT001', 'Nhập môn lập trình', 'Introduction to Programming', 4, 3, 1, 'gen'),
  /* General education: English */
  K('ENG01', 'Anh văn 1', 'English 1', 4, 4, 0, 'gen'),
  K('ENG02', 'Anh văn 2', 'English 2', 4, 4, 0, 'gen'),
  K('ENG03', 'Anh văn 3', 'English 3', 4, 4, 0, 'gen'),
  /* Physical education and defence: not counted in the 129 credits */
  K('ME001', 'Giáo dục Quốc phòng', 'National Defence Education', 0, 0, 0, 'sep'),
  K('PE231', 'Giáo dục thể chất 1', 'Physical Education 1', 0, 0, 0, 'sep'),
  K('PE232', 'Giáo dục thể chất 2', 'Physical Education 2', 0, 0, 0, 'sep'),
  /* Foundation (51 credits, all required) */
  K('IT002', 'Lập trình hướng đối tượng', 'Object-Oriented Programming', 4, 3, 1, 'found'),
  K('IT003', 'Cấu trúc dữ liệu và giải thuật', 'Data Structures and Algorithms', 4, 3, 1, 'found'),
  K('IT004', 'Cơ sở dữ liệu', 'Databases', 4, 3, 1, 'found'),
  K('IT005', 'Nhập môn mạng máy tính', 'Introduction to Computer Networks', 4, 3, 1, 'found'),
  K('IT006', 'Kiến trúc máy tính', 'Computer Architecture', 3, 3, 0, 'found'),
  K('IT007', 'Hệ điều hành', 'Operating Systems', 4, 3, 1, 'found'),
  K('NT015', 'Giới thiệu ngành ATTT', 'Introduction to Information Security', 1, 1, 0, 'found'),
  K('NT106', 'Lập trình mạng căn bản', 'Basic Network Programming', 3, 2, 1, 'found'),
  K('NT140', 'An toàn mạng', 'Network Security', 4, 3, 1, 'found'),
  K('NT230', 'Cơ chế hoạt động của mã độc', 'How Malware Works', 3, 2, 1, 'found'),
  K('NT132', 'Quản trị mạng và hệ thống', 'Network and System Administration', 4, 3, 1, 'found'),
  K('NT219', 'Mật mã học', 'Cryptography', 3, 2, 1, 'found'),
  K('NT209', 'Lập trình hệ thống', 'System Programming', 3, 2, 1, 'found'),
  K('NT208', 'Lập trình ứng dụng web', 'Web Application Programming', 3, 2, 1, 'found'),
  K('NT521', 'Lập trình an toàn và khai thác lỗ hổng phần mềm', 'Secure Programming and Software Vulnerability Exploitation', 4, 3, 1, 'found'),
  /* Major electives: choose 3 of 16 (9 credits) */
  K('NT204', 'Hệ thống tìm kiếm, phát hiện và ngăn ngừa xâm nhập', 'Intrusion Detection and Prevention Systems', 3, 2, 1, 'major', 'major'),
  K('NT330', 'An toàn mạng không dây và di động', 'Wireless and Mobile Network Security', 3, 2, 1, 'major', 'major'),
  K('NT207', 'Quản lý rủi ro và an toàn thông tin trong doanh nghiệp', 'Enterprise Risk and Information Security Management', 3, 2, 1, 'major', 'major'),
  K('NT137', 'Kỹ thuật phân tích mã độc', 'Malware Analysis Techniques', 3, 2, 1, 'major', 'major'),
  K('NT213', 'Bảo mật web và ứng dụng', 'Web and Application Security', 3, 2, 1, 'major', 'major'),
  K('NT334', 'Pháp chứng kỹ thuật số', 'Digital Forensics', 3, 2, 1, 'major', 'major'),
  K('NT535', 'Bảo mật Internet of things', 'Internet of Things Security', 3, 2, 1, 'major', 'major'),
  K('NT211', 'An ninh nhân sự, định danh và chứng thực', 'Personnel Security, Identity and Authentication', 3, 2, 1, 'major', 'major'),
  K('NT212', 'An toàn dữ liệu, khôi phục thông tin sau sự cố', 'Data Security and Disaster Recovery', 3, 2, 1, 'major', 'major'),
  K('NT534', 'An toàn mạng máy tính nâng cao', 'Advanced Computer Network Security', 3, 2, 1, 'major', 'major'),
  K('NT133', 'An toàn kiến trúc hệ thống', 'System Architecture Security', 3, 2, 1, 'major', 'major'),
  K('NT523', 'An toàn thông tin trong kỷ nguyên máy tính lượng tử', 'Information Security in the Quantum Computing Era', 3, 2, 1, 'major', 'major'),
  K('NT205', 'Tấn công mạng', 'Network Attacks', 3, 2, 1, 'major', 'major'),
  K('NT547', 'Blockchain: nền tảng, ứng dụng và bảo mật', 'Blockchain: Foundations, Applications and Security', 3, 2, 1, 'major', 'major'),
  K('NT118', 'Phát triển ứng dụng trên thiết bị di động', 'Mobile Application Development', 3, 2, 1, 'major', 'major'),
  K('NT522', 'Phương pháp học máy trong an toàn thông tin', 'Machine Learning Methods in Information Security', 3, 2, 1, 'major', 'major'),
  /* Other courses */
  K('SS004', 'Kỹ năng nghề nghiệp', 'Professional Skills', 2, 2, 0, 'other'),
  K('INI01', 'Thực tập quốc tế', 'International Internship (free elective option)', 2, 0, 0, 'other', 'free'),
  /* Graduation */
  K('NT114', 'Đồ án chuyên ngành', 'Major Project', 2, 0, 2, 'grad'),
  K('NT215', 'Thực tập doanh nghiệp', 'Industry Internship', 2, 2, 0, 'grad'),
  K('NT505', 'Khóa luận tốt nghiệp', 'Graduation Thesis', 10, 10, 0, 'grad', 'thesis'),
  K('NT506', 'Đồ án tốt nghiệp tại doanh nghiệp', 'Graduation Project at a Company', 10, 10, 0, 'grad', 'thesis'),
  K('NT508', 'Đồ án tốt nghiệp', 'Graduation Project (6 credits, add topic courses)', 6, 6, 0, 'grad', 'thesis'),
  K('NT541', 'Công nghệ mạng khả lập trình', 'Programmable Networking', 4, 3, 1, 'grad', 'topic'),
  K('NT548', 'Công nghệ DevOps và ứng dụng', 'DevOps Technology and Applications', 4, 3, 1, 'grad', 'topic')
];
const CAT = {}; CATALOG.forEach(c => { CAT[c.code] = c; });

/* Placeholders in the sample plan that you fill by choosing a course. */
const SLOTS = {
  major: { label: 'Major elective', vi: 'Môn chuyên ngành', block: 'major', credits: 3, lt: 2, th: 1, nt: true, hint: 'Choose 3 of the 16 major electives (9 credits in total).' },
  free: { label: 'Free elective', vi: 'Môn tự chọn tự do', block: 'other', credits: 3, lt: 2, th: 1, nt: false, hint: 'Any course from UIT, VNU-HCM or a partner university (6 credits in total). Type the code, name and credits below.' },
  topic: { label: 'Graduation topic course', vi: 'Chuyên đề tốt nghiệp', block: 'grad', credits: 4, lt: 3, th: 1, nt: true, hint: 'Used with the 6-credit graduation project, in place of the 10-credit thesis.' },
  thesis: { label: 'Graduation track', vi: 'Khóa luận / đồ án tốt nghiệp', block: 'grad', credits: 10, lt: 10, th: 0, nt: true, hint: 'Thesis (10 credits), company project (10), or graduation project (6) plus topic courses (4).' }
};

/* Recommended plan (section 4.2). Items are course codes, '@slot' placeholders, or { code, slot }. */
const SAMPLE = [
  { id: 'hk1', name: 'Semester 1', items: ['IT001', 'MA006', 'MA003', 'PH002', 'NT015', 'ENG01', 'ME001'] },
  { id: 'hk2', name: 'Semester 2', items: ['IT002', 'IT005', 'MA004', 'IT006', 'SS006', 'ENG02'] },
  { id: 'hk3', name: 'Semester 3', items: ['IT004', 'NT209', 'IT003', 'SS004', 'MA005', 'ENG03'] },
  { id: 'hk4', name: 'Semester 4', items: ['IT007', 'NT106', 'NT219', 'NT208', 'SS010', 'SS007', 'PE231'] },
  { id: 'hk5', name: 'Semester 5', items: ['SS008', 'SS009', 'NT132', 'NT140', 'NT521', '@major', 'PE232'] },
  { id: 'hk6', name: 'Semester 6', items: ['NT230', 'SS003', 'NT114', '@major', '@major', '@free'] },
  { id: 'hk7', name: 'Semester 7', items: ['NT215', '@free', { code: 'NT505', slot: 'thesis' }] }
];

/* ---------- course and semester builders ---------- */
function defaultWeights(c) {
  if (c.separate) return { qt: '', th: '', gk: '', ck: '' };
  if (!(c.lt > 0) && c.th > 0) return { qt: '0', th: '100', gk: '0', ck: '0' };
  if (c.th > 0) return { qt: '10', th: '20', gk: '20', ck: '50' };
  return { qt: '20', th: '0', gk: '20', ck: '60' };
}
function normCourse(c) {
  const n = v => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? x : 0; };
  const blank = { qt: '', th: '', gk: '', ck: '' };
  return { id: String(c.id || uid()), code: String(c.code || ''), name: String(c.name || ''), en: String(c.en || ''), credits: n(c.credits), lt: n(c.lt), th: n(c.th),
    block: String(c.block || 'other'), nt: !!c.nt, slot: String(c.slot || ''), separate: !!c.separate, done: !!c.done,
    w: Object.assign({}, blank, c.w), s: Object.assign({}, blank, c.s) };
}
function normSemester(s, i) {
  return { id: String(s.id || uid()), name: String(s.name || ''), target: s.target == null ? '' : String(s.target),
    order: typeof s.order === 'number' ? s.order : i + 1, courses: arr(s.courses).map(normCourse) };
}
function normSemesters(list) { return arr(list).map(normSemester).sort((a, b) => a.order - b.order); }
function courseFromCatalog(code, id, slot) {
  const c = CAT[code];
  return normCourse({ id, code: c.code, name: c.vi, en: c.en, credits: c.credits, lt: c.lt, th: c.th, block: c.block, nt: c.nt, slot: slot || '', separate: c.separate, w: defaultWeights(c) });
}
function slotCourse(slot, id, n) {
  const sl = SLOTS[slot];
  return normCourse({ id, code: '', name: sl.vi + ' ' + n, en: sl.label + ' ' + n, credits: sl.credits, lt: sl.lt, th: sl.th, block: sl.block, nt: sl.nt, slot, w: defaultWeights(sl) });
}
function defaultSemesters() {
  const count = {};
  return normSemesters(SAMPLE.map((s, i) => ({
    id: s.id, name: s.name, target: '', order: i + 1,
    courses: s.items.map(it => {
      if (typeof it === 'string' && it[0] === '@') { const sl = it.slice(1); count[sl] = (count[sl] || 0) + 1; return slotCourse(sl, s.id + '-' + sl + count[sl], count[sl]); }
      const code = typeof it === 'string' ? it : it.code;
      return courseFromCatalog(code, s.id + '-' + code, typeof it === 'string' ? '' : it.slot);
    })
  })));
}
function recommendedSemester(id) { return defaultSemesters().find(s => s.id === id) || null; }
/* Subjects entered in the earlier version of the Grades tab become one extra semester. */
function legacySemester(subjects) {
  const toN = v => Number(String(v == null ? '' : v).replace(',', '.')) || 0;
  return normSemester({ id: 'earlier', name: 'Earlier subjects', order: 99,
    courses: arr(subjects).filter(s => !s.ex).map(s => ({ id: s.id, name: s.name || 'Untitled subject', credits: toN(s.credits), lt: toN(s.credits), th: 0, block: 'other', nt: false, w: s.w, s: s.s })) }, 0);
}
function migrateSubjects(subjects) {
  const sems = defaultSemesters(), real = arr(subjects).filter(s => !s.ex);
  if (real.length) sems.push(legacySemester(real));
  return sems;
}
