(function () {
  var preference = null;
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch (e) {}

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#17232a' : '#f7f6f2');
    var button = document.querySelector('.theme-toggle');
    if (button) button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  document.addEventListener('DOMContentLoaded', function () {
    apply(preference || (media.matches ? 'dark' : 'light'));
    var button = document.querySelector('.theme-toggle');
    if (!button) return;
    button.addEventListener('click', function () {
      preference = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', preference); } catch (e) {}
      apply(preference);
    });
    button.hidden = false;
  });
  var followSystem = function (event) {
    if (!preference) apply(event.matches ? 'dark' : 'light');
  };
  if (media.addEventListener) media.addEventListener('change', followSystem);
  else if (media.addListener) media.addListener(followSystem);
})();
