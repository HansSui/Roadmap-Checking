/* ================= browser-only storage =================
   All data lives in localStorage (written by save() in core.js).
   This file only reports the save status and follows changes made in other tabs. */
function stampSaved(ok) {
  const el = document.getElementById('sync'); if (!el) return;
  if (ok === false) { el.textContent = 'Could not save in this browser. Download a backup.'; el.className = 'sync err'; return; }
  el.className = 'sync';
  el.textContent = 'Saved in this browser · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
const Sync = {
  canDownload: true,
  themeToggle: true,
  note: 'Everything is saved in this browser (localStorage) and works offline. Download a backup file to keep a spare copy or to move to another device, then import it there.',
  keys(ks, ok) { stampSaved(ok); },
  del() {},
  all(ok) { stampSaved(ok); },
  init() {
    window.addEventListener('storage', e => {
      if (e.key === KEY && e.newValue) { try { S = normState(JSON.parse(e.newValue)); keepFocus(renderAll); } catch (x) {} }
    });
  }
};
