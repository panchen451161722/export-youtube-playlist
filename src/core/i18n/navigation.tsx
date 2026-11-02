import type { ComponentProps, ReactNode } from 'react';
import {
  defaultParseSearch,
  Link as RouterLink,
  useLocation,
  useRouter as useTanStackRouter,
} from '@tanstack/react-router';

import { hasGermanContent } from '@/config/locale';
import { crossesPrivacyBoundary } from '@/lib/private-document';
import { getLocale } from '@/paraglide/runtime.js';

// Locale-aware navigation. Locale prefixes are handled entirely by the
// router rewrite (Paraglide localizeUrl/deLocalizeUrl) — internal hrefs
// stay locale-free and get localized on output automatically.

export function useCurrentLocale(): string {
  return getLocale();
}

type LinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  href: string;
  locale?: string; // kept for API compat; locale switching goes via setLocale()
  prefetch?: boolean | string;
  children?: ReactNode;
};

export function Link({ href, locale, prefetch, ...rest }: LinkProps) {
  const current = useLocation();
  // Leaving translated coverage reloads the English document and locale.
  if (
    getLocale() === 'de' &&
    href.startsWith('/') &&
    !hasGermanContent(href.split(/[?#]/)[0])
  ) {
    return <a href={href} {...rest} />;
  }
  if (/^(https?:|mailto:|tel:|#)/.test(href)) {
    return <a href={href} {...rest} />;
  }
  const Comp = RouterLink as any;
  return (
    <Comp
      {...toNavigateOptions(href)}
      reloadDocument={requiresDocumentNavigation(current, href)}
      {...rest}
    />
  );
}

export function requiresDocumentNavigation(
  current: { pathname: string; searchStr: string },
  href: string
) {
  const { to } = toNavigateOptions(href);
  const search = href.split('#')[0].split('?')[1] || '';
  // Decide before history is changed. Redirecting afterward to the same URL
  // with a fragment can be treated as a hash-only navigation by the browser,
  // leaving the previous page mounted at the new address.
  return crossesPrivacyBoundary(
    current.pathname,
    to,
    current.searchStr,
    search
  );
}

export function usePathname(): string {
  // Routes are matched against the de-localized tree, so pathname here is
  // already locale-free.
  return useLocation().pathname;
}

export function toNavigateOptions(href: string) {
  // TanStack expects path, search and hash separately. Passing /#exporter as
  // `to` can change the address without matching the home route.
  const hashIndex = href.indexOf('#');
  const pathPart = hashIndex < 0 ? href : href.slice(0, hashIndex);
  const hash = hashIndex < 0 ? '' : href.slice(hashIndex + 1);
  const searchIndex = pathPart.indexOf('?');
  const pathname = searchIndex < 0 ? pathPart : pathPart.slice(0, searchIndex);
  const searchStr = searchIndex < 0 ? '' : pathPart.slice(searchIndex);
  return {
    to: pathname || '/',
    search: defaultParseSearch(searchStr),
    hash,
  };
}

export function useRouter() {
  const router = useTanStackRouter();
  return {
    // navigate() goes through the router rewrite so outgoing URLs are
    // localized — do not switch this back to history.push.
    push: (href: string) => {
      router.navigate({
        ...toNavigateOptions(href),
        reloadDocument: requiresDocumentNavigation(router.state.location, href),
      } as any);
    },
    replace: (href: string) => {
      router.navigate({
        ...toNavigateOptions(href),
        replace: true,
        reloadDocument: requiresDocumentNavigation(router.state.location, href),
      } as any);
    },
    back: () => router.history.back(),
    forward: () => router.history.forward(),
    refresh: () => router.invalidate(),
    prefetch: (_href: string) => {},
  };
}
