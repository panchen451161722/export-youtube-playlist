// Locale display names for the language switcher UI.
// Locales themselves are defined in project.inlang/settings.json and
// exposed at runtime via @/paraglide/runtime.js (locales, baseLocale).
export const localeNames: Record<string, string> = {
  en: 'English',
  zh: '中文',
  de: 'Deutsch',
};

/** Public routes with authored German content; account workflows still fall back to English. */
export const GERMAN_PAGE_PATHS = [
  '/',
  '/tools',
  '/pricing',
  '/blog',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/tools/download-youtube-thumbnail',
  '/tools/export-youtube-channel',
  '/tools/export-youtube-playlist-to-csv',
  '/tools/export-youtube-playlist-to-excel',
  '/tools/youtube-channel-analyzer',
  '/tools/youtube-channel-banner-and-logo-downloader',
  '/tools/youtube-channel-id-finder',
  '/tools/youtube-channel-keywords',
  '/tools/youtube-channel-playlist-extractor',
  '/tools/youtube-channel-title-extractor',
  '/tools/youtube-channel-to-playlist',
  '/tools/youtube-channel-video-link-extractor',
  '/tools/youtube-description-extractor',
  '/tools/youtube-embed-code-generator',
  '/tools/youtube-playlist-analyzer',
  '/tools/youtube-playlist-link-extractor',
  '/tools/youtube-playlist-title-extractor',
  '/tools/youtube-region-restriction-checker',
  '/tools/youtube-subscribe-link-generator',
  '/tools/youtube-tag-extractor',
  '/blog/how-i-created-the-youtube-playlist-export-web-app',
  '/blog/how-i-learned-python-using-youtube-playlists',
  '/blog/how-to-export-a-youtube-playlist-to-csv-or-excel',
  '/blog/analyze-youtube-playlist-in-google-sheets',
  '/blog/back-up-youtube-playlists',
  '/blog/calculate-youtube-playlist-watch-time',
  '/blog/audit-a-youtube-channel-with-public-data',
] as const;

export function hasGermanContent(path: string): boolean {
  const normalized = path.replace(/\/$/, '') || '/';
  return (GERMAN_PAGE_PATHS as readonly string[]).includes(normalized);
}

export function pageLocales(path: string): readonly ('en' | 'zh' | 'de')[] {
  return hasGermanContent(path) ? ['en', 'zh', 'de'] : ['en', 'zh'];
}
