// Apply the saved theme before first paint to avoid a color flash.
(function () {
  var pref = 'system';
  try {
    pref = localStorage.getItem('invois-theme') || 'system';
  } catch {
    // Storage is blocked in some private modes; the system theme still works.
  }
  if (pref !== 'light' && pref !== 'dark') pref = 'system';
  var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  var meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.content = pref === 'system' ? 'light dark' : pref;
})();
