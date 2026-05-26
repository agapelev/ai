// theme.js - manages theme toggle and persistence

document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      // ignore write errors
    }
  }

  function updateButton(theme) {
    btn.textContent = theme === 'dark' ? '🌙' : '☀️';
    btn.setAttribute('aria-pressed', theme === 'dark');
  }

  // init state
  const initial = getTheme();
  updateButton(initial);

  btn.addEventListener('click', function () {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    updateButton(next);
  });
});
