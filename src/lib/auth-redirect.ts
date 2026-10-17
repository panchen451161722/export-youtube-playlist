import { locales } from '@/paraglide/runtime.js';

/** Only return to local pages, excluding auth pages that would loop. */
export function getSafeCallbackUrl(value?: string | null): string | null {
  if (!value?.startsWith('/') || value.startsWith('//')) return null;
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return null;

  try {
    const url = new URL(value, 'https://callback.invalid');
    const segments = decodeURIComponent(url.pathname).split('/');
    if (locales.some((locale) => locale === segments[1])) segments.splice(1, 1);
    if (
      /^(sign-in|sign-up|verify-email|forgot-password|reset-password)$/.test(
        segments[1]
      )
    ) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function getSignInHref(currentHref: string): string {
  const callbackUrl = getSafeCallbackUrl(currentHref) || '/';
  return `/sign-in?${new URLSearchParams({ callbackUrl })}`;
}

export function getAuthRedirect(search: string) {
  const params = new URLSearchParams(search);
  const callbackUrl = getSafeCallbackUrl(params.get('callbackUrl'));
  const redirect = params.get('redirect');
  const switchParams = new URLSearchParams();
  if (callbackUrl) switchParams.set('callbackUrl', callbackUrl);
  if (redirect) switchParams.set('redirect', redirect);
  const switchQuery = switchParams.toString();

  return {
    afterLoginUrl: redirect
      ? `/auth-callback?redirect=${encodeURIComponent(redirect)}`
      : callbackUrl || '/',
    switchQuery: switchQuery ? `?${switchQuery}` : '',
  };
}
