import { pageLocales } from '@/config/locale';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

import { getPreferredLocale, parseLocalePreference } from './locale-preference';
import { isPrivateDocumentPath } from './private-document';

/** Honor HTTP quality weights, including explicit q=0 exclusions. */
export function getLocaleFromAcceptLanguage(header: string) {
  const preferences = header.split(',').flatMap((entry, index) => {
    const match = entry
      .trim()
      .match(
        /^([a-z]{2,8}(?:-[a-z0-9]{1,8})*|\*)(?:\s*;\s*q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?$/i
      );
    if (!match || match[1] === '*') return [];
    const quality = match[2] === undefined ? 1 : Number(match[2]);
    return quality > 0 ? [{ language: match[1], quality, index }] : [];
  });
  preferences.sort((a, b) => b.quality - a.quality || a.index - b.index);
  return getPreferredLocale(preferences.map(({ language }) => language));
}

/** Only unprefixed public pages participate; assets and private flows do not. */
function isNegotiablePath(pathname: string) {
  if (isPrivateDocumentPath(pathname)) return false;
  let path: string;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  if (/[\\\u0000-\u0020\u007f]/.test(path)) return false;
  if (
    locales.some(
      (locale) => path === `/${locale}` || path.startsWith(`/${locale}/`)
    )
  ) {
    return false;
  }
  return !(
    /^\/(?:_|\.)/.test(path) ||
    /^\/(assets|imgs|fonts|samples|auth-callback)(\/|$)/.test(path) ||
    /\.[^/]+\/?$/.test(path)
  );
}

function isDocumentRequest(request: Request) {
  const destination = request.headers.get('sec-fetch-dest');
  if (destination && !['document', 'iframe', 'frame'].includes(destination)) {
    return false;
  }
  return (request.headers.get('accept') || '').split(',').some((entry) => {
    const [type, ...parameters] = entry.trim().toLowerCase().split(';');
    return (
      (type.trim() === 'text/html' ||
        type.trim() === 'application/xhtml+xml') &&
      !parameters.some((parameter) =>
        /^\s*q\s*=\s*0(?:\.0*)?\s*$/.test(parameter)
      )
    );
  });
}

/**
 * Negotiate before rendering so the first document is already in its language.
 * Keep the URL authoritative once it has a locale prefix. Do not persist inferred
 * preferences: only the language menu can override later browser preferences.
 */
export async function withLocaleNegotiation(
  request: Request,
  next: () => Promise<Response>
): Promise<Response> {
  const url = new URL(request.url);
  if (
    !['GET', 'HEAD'].includes(request.method) ||
    !isNegotiablePath(url.pathname)
  ) {
    return next();
  }

  const documentRequest = isDocumentRequest(request);
  const locale =
    parseLocalePreference(request.headers.get('cookie') || '') ??
    getLocaleFromAcceptLanguage(request.headers.get('accept-language') || '') ??
    baseLocale;

  // Resolve against all supported languages first. When German is unavailable,
  // retain English rather than bouncing between /de/... and its English fallback.
  const response =
    documentRequest &&
    locale !== baseLocale &&
    pageLocales(url.pathname).includes(locale)
      ? new Response(null, {
          status: 302,
          headers: { Location: localizeUrl(url, { locale }).href },
        })
      : await next();

  if (
    !documentRequest &&
    !response.headers.get('content-type')?.includes('text/html')
  ) {
    return response;
  }

  // A 200 English response is also negotiated. Caching it could suppress a later
  // visitor's redirect just as caching a 302 could send everyone to one language.
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('CDN-Cache-Control', 'no-store');
  headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  const vary = (headers.get('Vary') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!vary.includes('*')) {
    for (const name of [
      'Accept',
      'Accept-Language',
      'Cookie',
      'Sec-Fetch-Dest',
    ]) {
      if (!vary.some((value) => value.toLowerCase() === name.toLowerCase()))
        vary.push(name);
    }
    headers.set('Vary', vary.join(', '));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
