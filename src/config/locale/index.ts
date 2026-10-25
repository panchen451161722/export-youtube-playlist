// Locale display names for the language switcher UI.
// Locales themselves are defined in project.inlang/settings.json and
// exposed at runtime via @/paraglide/runtime.js (locales, baseLocale).
export const localeNames: Record<string, string> = {
  en: 'English',
  zh: '中文',
  de: 'Deutsch',
};

/** German content is intentionally limited to these three public pages. */
export const GERMAN_PAGE_PATHS = [
  '/',
  '/tools/export-youtube-playlist-to-csv',
  '/tools/export-youtube-playlist-to-excel',
] as const;

export function hasGermanContent(path: string): boolean {
  const normalized = path.replace(/\/$/, '') || '/';
  return (GERMAN_PAGE_PATHS as readonly string[]).includes(normalized);
}

export function pageLocales(path: string): readonly ('en' | 'zh' | 'de')[] {
  return hasGermanContent(path) ? ['en', 'zh', 'de'] : ['en', 'zh'];
}
