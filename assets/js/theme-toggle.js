(function () {
  function current() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
    var meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0d1117' : '#0969da');
  }
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      apply(current() === 'dark' ? 'light' : 'dark');
    });
  });
  // Follow OS changes only when the user hasn't chosen explicitly
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    try { if (localStorage.getItem('theme')) return; } catch (err) {}
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });
})();
