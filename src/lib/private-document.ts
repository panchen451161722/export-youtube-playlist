/** Routes that may render account data must never share a document with trackers. */
export function isPrivateDocumentPath(pathname: string): boolean {
  let path: string;
  try {
    const decoded = decodeURIComponent(pathname).toLowerCase();
    // Paraglide URL rewriting can interpret a repeated slash as an authority
    // (e.g. /zh//x/sign-in becomes /sign-in). Ambiguous paths fail closed.
    if (decoded.includes('//')) return true;
    path = decoded.replace(/^\/(zh|de)(?=\/|$)/, '') || '/';
  } catch {
    // Malformed paths fail closed rather than enabling optional scripts.
    return true;
  }
  return (
    /^\/(settings|admin|api|dev)(\/|$)/.test(path) ||
    /^\/(youtube-playlist-backup|claim-backup|sign-in|sign-up|forgot-password|reset-password|verify-email|redeem-invite)(\/|$)/.test(
      path
    )
  );
}

/** Only the bare selection URL is recordable; callbacks/unknown parameters fail closed. */
export function isBackupSelectionLocation(
  pathname: string,
  search = ''
): boolean {
  return (
    /^\/(?:zh\/|de\/)?youtube-playlist-backup\/?$/.test(pathname) && !search
  );
}

export function documentPrivacyMode(pathname: string, search = '') {
  if (isBackupSelectionLocation(pathname, search)) return 'backup-selection';
  return isPrivateDocumentPath(pathname) ? 'private' : 'public';
}

export function crossesPrivacyBoundary(
  from: string,
  to: string,
  fromSearch = '',
  toSearch = ''
): boolean {
  return (
    documentPrivacyMode(from, fromSearch) !== documentPrivacyMode(to, toSearch)
  );
}

export function mayLoadThirdPartyScripts(
  privatePage: boolean,
  cookie: string,
  localRequest: boolean
): boolean {
  // HttpOnly auth cookies are deliberately inspected on the server. Do not
  // enable trackers if a session exists but its lookup temporarily fails.
  return !privatePage && !localRequest && !hasAccountCookie(cookie);
}

export function hasAccountCookie(cookie: string): boolean {
  return /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/.test(cookie);
}

/** Also blocks optional scripts injected at the hosting edge. */
export function privateDocumentHeaders(
  request: Request
): Record<string, string> {
  const url = new URL(request.url);
  const selection =
    isBackupSelectionLocation(url.pathname, url.search) &&
    !hasAccountCookie(request.headers.get('cookie') || '');
  if (
    !isPrivateDocumentPath(url.pathname) &&
    !hasAccountCookie(request.headers.get('cookie') || '')
  )
    return {};
  return {
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': [
      // SQLite exports compile same-origin WASM, including on signed-in pages.
      // Permit WASM without enabling JavaScript eval or third-party trackers.
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://accounts.google.com" +
        (selection ? ' https://*.clarity.ms' : ''),
      "connect-src 'self' https://challenges.cloudflare.com https://accounts.google.com" +
        (selection ? ' https://*.clarity.ms https://c.bing.com' : ''),
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  };
}
