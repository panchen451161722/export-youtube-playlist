import { envConfigs } from '@/config';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

type AppLocale = (typeof locales)[number];

type PublicSeoOptions = {
  title: string;
  description: string;
  path: string;
  locale: string;
  type?: 'website' | 'article';
  image?: string;
  imageAlt?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  structuredData?: Record<string, unknown>;
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
  type = 'website',
  image = '/apple-touch-icon.png',
  imageAlt = title,
  publishedTime,
  modifiedTime,
  author,
  structuredData,
}: PublicSeoOptions) {
  const canonical = localizedPageUrl(path, locale);
  const socialImage = absoluteUrl(image);
  const ogLocale = locale === 'zh' ? 'zh_CN' : 'en_US';

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      {
        name: 'robots',
        content: 'index, follow, max-image-preview:large, max-snippet:-1',
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
      ...locales.map((loc) => ({
        rel: 'alternate',
        hrefLang: loc,
        href: localizedPageUrl(path, loc),
      })),
      {
        rel: 'alternate',
        hrefLang: 'x-default',
        href: localizedPageUrl(path, baseLocale),
      },
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
