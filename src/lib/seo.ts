import { envConfigs } from '@/config';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

type AppLocale = (typeof locales)[number];

/**
 * Core tools and tools retained based on Search Console traffic or impressions.
 * This search-indexing policy also controls sitemap inclusion; it does not
 * control AdSense review or ad placement. Other `/tools/*` pages remain usable
 * with `noindex, follow` and are left out of the sitemap.
 */
export const INDEXED_TOOL_PATHS: readonly string[] = [
  '/tools/export-youtube-playlist-to-csv',
  '/tools/export-youtube-playlist-to-excel',
  '/tools/youtube-playlist-analyzer',
  '/tools/export-youtube-channel',
  '/tools/youtube-channel-analyzer',
  // Retain the 11 tools with clicks in the 2026-09-13–2026-10-10 GSC window.
  '/tools/youtube-channel-keywords',
  '/tools/youtube-playlist-link-extractor',
  '/tools/youtube-playlist-title-extractor',
  '/tools/youtube-channel-title-extractor',
  '/tools/youtube-channel-playlist-extractor',
  '/tools/youtube-subscribe-link-generator',
  '/tools/youtube-channel-to-playlist',
  '/tools/youtube-region-restriction-checker',
  '/tools/youtube-description-extractor',
  '/tools/youtube-channel-id-finder',
  '/tools/youtube-embed-code-generator',
  // Retain the tag extractor for its existing search impressions.
  '/tools/youtube-tag-extractor',
];

/** Whether a locale-free public path should be indexed by search engines. */
export function isIndexablePath(path: string): boolean {
  if (!path.startsWith('/tools/')) return true;
  return INDEXED_TOOL_PATHS.includes(path);
}

type PublicSeoOptions = {
  title: string;
  description: string;
  path: string;
  locale: string;
  availableLocales?: readonly AppLocale[];
  type?: 'website' | 'article';
  image?: string;
  imageAlt?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  structuredData?: Record<string, unknown>;
  /** Force `noindex, follow`; defaults to the tool indexing policy. */
  noindex?: boolean;
};

function appOrigin(): string {
  const configured = envConfigs.app_url || 'http://localhost:3000';
  return configured.endsWith('/') ? configured : `${configured}/`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, appOrigin()).href;
}

export function localizedPageUrl(path: string, locale: string): string {
  return localizeUrl(absoluteUrl(path || '/'), {
    locale: locale as AppLocale,
  }).href;
}

function serializeStructuredData(value: Record<string, unknown>): string {
  // Prevent user-managed article fields from closing the script element.
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** Consistent metadata for every public, indexable route. */
export function publicPageSeo({
  title,
  description,
  path,
  locale,
  availableLocales = locales,
  type = 'website',
  image = '/apple-touch-icon.png',
  imageAlt = title,
  publishedTime,
  modifiedTime,
  author,
  structuredData,
  noindex = !isIndexablePath(path),
}: PublicSeoOptions) {
  const canonical = localizedPageUrl(path, locale);
  const socialImage = absoluteUrl(image);
  const ogLocale = locale === 'zh' ? 'zh_CN' : 'en_US';
  const defaultLocale = availableLocales.includes(baseLocale)
    ? baseLocale
    : availableLocales[0];

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      {
        name: 'robots',
        content: noindex
          ? 'noindex, follow'
          : 'index, follow, max-image-preview:large, max-snippet:-1',
      },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { property: 'og:url', content: canonical },
      { property: 'og:site_name', content: envConfigs.app_name },
      { property: 'og:locale', content: ogLocale },
      { property: 'og:image', content: socialImage },
      { property: 'og:image:alt', content: imageAlt },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: socialImage },
      ...(publishedTime
        ? [{ property: 'article:published_time', content: publishedTime }]
        : []),
      ...(modifiedTime
        ? [{ property: 'article:modified_time', content: modifiedTime }]
        : []),
      ...(author ? [{ property: 'article:author', content: author }] : []),
    ],
    links: [
      { rel: 'canonical', href: canonical },
      ...availableLocales.map((loc) => ({
        rel: 'alternate',
        hrefLang: loc,
        href: localizedPageUrl(path, loc),
      })),
      ...(defaultLocale
        ? [
            {
              rel: 'alternate',
              hrefLang: 'x-default',
              href: localizedPageUrl(path, defaultLocale),
            },
          ]
        : []),
    ],
    scripts: structuredData
      ? [
          {
            type: 'application/ld+json',
            children: serializeStructuredData(structuredData),
          },
        ]
      : [],
  };
}

/** Private, account, and authentication screens must never enter search. */
export function privatePageSeo(title: string) {
  return {
    meta: [
      { title: `${title} | ${envConfigs.app_name}` },
      { name: 'robots', content: 'noindex, nofollow, noarchive' },
      { name: 'googlebot', content: 'noindex, nofollow, noarchive' },
    ],
  };
}
