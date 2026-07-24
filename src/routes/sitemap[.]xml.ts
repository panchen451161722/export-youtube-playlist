import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { PUBLIC_TOOL_DEFINITIONS } from '@/components/tools/public-tool-definitions';
import { BLOG_POST_SLUGS } from '@/content/posts';

const STATIC_PATHS = [
  '',
  '/pricing',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/blog',
  '/tools',
  '/tools/youtube-playlist-link-extractor',
  '/tools/youtube-playlist-title-extractor',
  '/tools/youtube-playlist-analyzer',
  ...PUBLIC_TOOL_DEFINITIONS.map((tool) => `/tools/${tool.slug}`),
];

type Entry = {
  path: string;
  lastModified?: string;
  changeFrequency: string;
  priority: number;
};

function urlFor(path: string, locale: string): string {
  return localizeUrl(`${envConfigs.app_url}${path || '/'}`, {
    locale: locale as (typeof locales)[number],
  }).href;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function entryXml(e: Entry, primaryLocale: string): string {
  const alternates = locales
    .map(
      (loc) =>
        `    <xhtml:link rel="alternate" hreflang="${loc}" href="${escapeXml(urlFor(e.path, loc))}"/>`
    )
    .concat(
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(urlFor(e.path, baseLocale))}"/>`
    )
    .join('\n');
  return [
    '  <url>',
    `    <loc>${escapeXml(urlFor(e.path, primaryLocale))}</loc>`,
    alternates,
    e.lastModified ? `    <lastmod>${e.lastModified}</lastmod>` : null,
    `    <changefreq>${e.changeFrequency}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const entries: Entry[] = STATIC_PATHS.map((path) => ({
          path,
          changeFrequency: path === '' ? 'weekly' : 'monthly',
          priority:
            path === ''
              ? 1
              : path === '/pricing' || path === '/tools'
                ? 0.8
                : path.startsWith('/tools/')
                  ? 0.7
                  : 0.5,
        }));

        const blogEntries = new Map<string, Entry>();
        for (const slug of BLOG_POST_SLUGS) {
          blogEntries.set(slug, {
            path: `/blog/${slug}`,
            changeFrequency: 'monthly',
            priority: 0.7,
          });
        }

        try {
          const { listPublishedArticles } =
            await import('@/modules/posts/service');
          const posts = await listPublishedArticles({ limit: 1000 });
          for (const post of posts) {
            blogEntries.set(post.slug, {
              path: `/blog/${post.slug}`,
              lastModified: new Date(post.createdAt).toISOString(),
              changeFrequency: 'monthly',
              priority: 0.7,
            });
          }
        } catch {
          // The local MDX entries still produce a complete development sitemap
          // when the configured database is unavailable.
        }

        entries.push(...blogEntries.values());

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          ...entries.flatMap((entry) =>
            locales.map((locale) => entryXml(entry, locale))
          ),
          '</urlset>',
          '',
        ].join('\n');

        return new Response(xml, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=0, s-maxage=3600',
          },
        });
      },
    },
  },
});
