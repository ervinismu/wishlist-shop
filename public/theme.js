// Light/dark theme. The choice is saved in localStorage so it survives reloads.
// Without a saved choice we follow the operating system setting.

export const THEME_KEY = 'theme';

export function resolveTheme(saved, prefersDark) {
  if (saved === 'light' || saved === 'dark') return saved;
  return prefersDark ? 'dark' : 'light';
}

export function nextTheme(current) {
  return current === 'dark' ? 'light' : 'dark';
}

function readSaved(storage) {
  try { return storage.getItem(THEME_KEY); } catch { return null; }
}

export function initTheme(button, { storage = localStorage, doc = document, win = window } = {}) {
  const prefersDark = win.matchMedia && win.matchMedia('(prefers-color-scheme: dark)').matches;
  let theme = resolveTheme(readSaved(storage), prefersDark);

  function apply() {
    doc.documentElement.dataset.theme = theme;
    button.textContent = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  button.addEventListener('click', () => {
    theme = nextTheme(theme);
    try { storage.setItem(THEME_KEY, theme); } catch { /* private mode: still switch, just not remembered */ }
    apply();
  });
  apply();
}
