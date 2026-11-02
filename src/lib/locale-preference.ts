import { locales, type Locale } from '@/paraglide/runtime.js';

export const LOCALE_PREFERENCE_COOKIE = 'SITE_LOCALE_PREFERENCE';
const PREFERENCE_MAX_AGE = 60 * 60 * 24 * 365;

/** Match the first supported browser preference without overriding its order. */
export function getPreferredLocale(
  languages: readonly string[],
  supportedLocales: readonly Locale[] = locales
): Locale | undefined {
  for (const language of languages) {
    const normalized = language.trim().toLowerCase();
    if (!/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/.test(normalized)) continue;

    const exact = supportedLocales.find(
      (locale) => locale.toLowerCase() === normalized
    );
    if (exact) return exact;

    const base = normalized.split('-')[0];
    const baseMatch = supportedLocales.find(
      (locale) => locale.toLowerCase() === base
    );
    if (baseMatch) return baseMatch;
  }
  return undefined;
}

/** Paraglide's own cookie is automatic, so only our explicit choice counts. */
export function parseLocalePreference(
  cookieHeader: string
): Locale | undefined {
  const entry = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${LOCALE_PREFERENCE_COOKIE}=`));
  if (!entry) return undefined;

  try {
    const value = decodeURIComponent(
      entry.slice(LOCALE_PREFERENCE_COOKIE.length + 1)
    );
    return locales.find((locale) => locale === value);
  } catch {
    return undefined;
  }
}

/** Remember only deliberate choices; automatic detection must not set this. */
export function rememberLocalePreference(locale: Locale): void {
  if (
    typeof document === 'undefined' ||
    typeof window === 'undefined' ||
    !locales.includes(locale)
  ) {
    return;
  }

  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${LOCALE_PREFERENCE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=${PREFERENCE_MAX_AGE}; SameSite=Lax${secure}`;
  } catch {
    // A blocked cookie must not prevent the user's requested navigation.
  }
}
