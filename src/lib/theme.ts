export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'invois-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'system' || stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage unavailable (private mode): fall back to the OS setting.
  }
  return 'system';
}

function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
  return pref;
}

function updateThemeColor(resolved: 'light' | 'dark'): void {
  const color = resolved === 'dark' ? '#1A1B16' : '#596949';
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = color;
    meta.removeAttribute('media');
  }
}

/** Applies a preference to the document root. "System" resolves to the OS setting. */
export function applyThemePreference(pref: ThemePreference): void {
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;
  updateThemeColor(resolved);
}

/** Persists a preference and applies it right away. */
export function setThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Storage unavailable: apply for this session only.
  }
  applyThemePreference(pref);
}

/** Applies the stored preference and keeps "system" in sync with OS changes. */
export function initTheme(): void {
  applyThemePreference(getThemePreference());
  window.matchMedia(DARK_QUERY).addEventListener('change', () => {
    if (getThemePreference() === 'system') applyThemePreference('system');
  });
}
