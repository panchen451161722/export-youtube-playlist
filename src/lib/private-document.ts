/** Routes that may render account data must never share a document with trackers. */
export function isPrivateDocumentPath(pathname: string): boolean {
  let path: string;
  try {
    const decoded = decodeURIComponent(pathname).toLowerCase();
    // Paraglide URL rewriting can interpret a repeated slash as an authority
    // (e.g. /zh//x/sign-in becomes /sign-in). Ambiguous paths fail closed.
    if (decoded.includes('//')) return true;
    path = decoded.replace(/^\/zh(?=\/|$)/, '') || '/';
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

export function crossesPrivacyBoundary(from: string, to: string): boolean {
  return isPrivateDocumentPath(from) !== isPrivateDocumentPath(to);
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
  if (
    !isPrivateDocumentPath(new URL(request.url).pathname) &&
    !hasAccountCookie(request.headers.get('cookie') || '')
  )
    return {};
  return {
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': [
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://accounts.google.com",
      "connect-src 'self' https://challenges.cloudflare.com https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  };
}
