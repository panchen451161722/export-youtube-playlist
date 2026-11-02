export function checkoutLocale(locale: unknown): 'en' | 'zh' | 'de' {
  return locale === 'zh' || locale === 'de' ? locale : 'en';
}

/** Fixed return destinations: callers never supply an arbitrary cancel URL. */
export function backupCheckoutPaths(flow: unknown, locale: unknown) {
  const language = checkoutLocale(locale);
  const prefix = language === 'en' ? '' : `/${language}`;
  if (flow !== 'backup') return null;
  return {
    success: `${prefix}/youtube-playlist-backup?setup=success`,
    cancel: `${prefix}/youtube-playlist-backup?setup=cancel`,
  };
}
