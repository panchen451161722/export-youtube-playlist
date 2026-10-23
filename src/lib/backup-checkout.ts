/** Fixed return destinations: callers never supply an arbitrary cancel URL. */
export function backupCheckoutPaths(flow: unknown, locale: unknown) {
  const prefix = locale === 'zh' ? '/zh' : '';
  if (flow !== 'backup') return null;
  return {
    success: `${prefix}/youtube-playlist-backup?setup=success`,
    cancel: `${prefix}/youtube-playlist-backup?setup=cancel`,
  };
}
