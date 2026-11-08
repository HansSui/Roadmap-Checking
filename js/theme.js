/* Runs in <head> so the saved theme applies before the page paints. */
(function () {
  try {
    var t = localStorage.getItem('duo-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
