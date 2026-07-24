import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { PUBLIC_TOOL_DEFINITIONS } from '../src/components/tools/public-tool-definitions';

const PLAYLIST_TOOL_SLUGS = [
  'youtube-playlist-link-extractor',
  'youtube-playlist-title-extractor',
  'youtube-playlist-analyzer',
] as const;

const EXPECTED_SLUGS = [
  ...PLAYLIST_TOOL_SLUGS,
  ...PUBLIC_TOOL_DEFINITIONS.map((tool) => tool.slug),
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function matches(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(pattern)].map((match) => match[1] ?? match[0]);
}

async function main() {
  const serverModule = (await import(
    pathToFileURL(path.resolve('.output/server/_ssr/ssr.mjs')).href
  )) as {
    d?: { default?: { fetch(request: Request): Promise<Response> } };
  };
  const handler = serverModule.d?.default;
  assert(handler?.fetch, 'The production SSR fetch handler was not found.');

  const catalogResponse = await handler.fetch(
    new Request('http://local.test/tools')
  );
  assert(
    catalogResponse.status === 200,
    '/tools did not render with status 200.'
  );
  const catalogHtml = await catalogResponse.text();
  for (const slug of EXPECTED_SLUGS) {
    assert(
      catalogHtml.includes(`/tools/${slug}`),
      `/tools catalog is missing ${slug}.`
    );
  }

  const pages: Array<{
    slug: string;
    locale: 'en' | 'zh';
    title: string;
    h1: string;
  }> = [];

  for (const locale of ['en', 'zh'] as const) {
    for (const slug of EXPECTED_SLUGS) {
      const pathname = `${locale === 'zh' ? '/zh' : ''}/tools/${slug}`;
      const response = await handler.fetch(
        new Request(`http://local.test${pathname}`)
      );
      assert(
        response.status === 200,
        `${pathname} rendered with status ${response.status}.`
      );
      const html = await response.text();
      const titles = matches(html, /<title>(.*?)<\/title>/g);
      const headings = matches(html, /<h1\b[^>]*>(.*?)<\/h1>/gs).map((value) =>
        value.replace(/<[^>]+>/g, '').trim()
      );
      const canonicals = matches(
        html,
        /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/g
      );

      assert(titles.length === 1 && titles[0], `${pathname}: invalid title.`);
      assert(headings.length === 1 && headings[0], `${pathname}: invalid H1.`);
      assert(
        /<meta\b[^>]*name="description"[^>]*content="[^"]+"/.test(html),
        `${pathname}: missing meta description.`
      );
      assert(
        canonicals.length === 1 && new URL(canonicals[0]).pathname === pathname,
        `${pathname}: canonical URL does not match the route.`
      );
      assert(
        html.includes('"@type":"WebApplication"') &&
          html.includes('"@type":"BreadcrumbList"') &&
          html.includes('"@type":"FAQPage"'),
        `${pathname}: required structured data is missing.`
      );
      assert(
        /<form\b/.test(html) &&
          /<input\b/.test(html) &&
          /<button\b[^>]*type="submit"/.test(html),
        `${pathname}: interactive tool form is missing.`
      );
      assert(
        html.includes('aria-label="Breadcrumb"') ||
          html.includes('aria-label="面包屑导航"'),
        `${pathname}: visible breadcrumb navigation is missing.`
      );

      pages.push({ slug, locale, title: titles[0], h1: headings[0] });
    }
  }

  for (const locale of ['en', 'zh'] as const) {
    const localizedPages = pages.filter((page) => page.locale === locale);
    assert(
      new Set(localizedPages.map((page) => page.title)).size ===
        EXPECTED_SLUGS.length,
      `${locale}: page titles are not unique across all 18 tools.`
    );
    assert(
      new Set(localizedPages.map((page) => page.h1)).size ===
        EXPECTED_SLUGS.length,
      `${locale}: H1 headings are not unique across all 18 tools.`
    );
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        passed: true,
        catalogStatus: catalogResponse.status,
        toolRoutes: EXPECTED_SLUGS.length,
        localizedPagesRendered: pages.length,
        status200: pages.length,
        uniqueEnglishTitles: EXPECTED_SLUGS.length,
        uniqueChineseTitles: EXPECTED_SLUGS.length,
        checksPerPage: [
          'title',
          'meta description',
          'canonical',
          'single H1',
          'WebApplication JSON-LD',
          'BreadcrumbList JSON-LD',
          'FAQPage JSON-LD',
          'interactive form',
          'visible breadcrumb',
        ],
      },
      null,
      2
    )}\n`
  );
}

await main();
