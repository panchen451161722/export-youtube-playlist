import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { PUBLIC_TOOL_DEFINITIONS } from '../src/components/tools/public-tool-definitions';

const PLAYLIST_TOOL_SLUGS = [
  'youtube-playlist-link-extractor',
  'youtube-playlist-title-extractor',
  'youtube-playlist-analyzer',
] as const;

const REQUIRED_EXTRA_MESSAGE_FIELDS = [
  'seo_title',
  'seo_description',
  'eyebrow',
  'title',
  'description',
  'submit',
  'step_2',
  'step_3',
  'benefit_export',
  'faq_1_question',
  'faq_1_answer',
] as const;

const REQUIRED_PLAYLIST_MESSAGE_PREFIXES = [
  'tools.link',
  'tools.title',
  'tools.analyzer',
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function loadMessages(locale: 'en' | 'zh') {
  return JSON.parse(
    await readFile(path.resolve(`messages/${locale}.json`), 'utf8')
  ) as Record<string, string>;
}

async function main() {
  const extraSlugs = PUBLIC_TOOL_DEFINITIONS.map((tool) => tool.slug);
  const expectedSlugs = [...PLAYLIST_TOOL_SLUGS, ...extraSlugs];
  assert(
    PUBLIC_TOOL_DEFINITIONS.length === 15,
    `Expected 15 video/channel tools, found ${PUBLIC_TOOL_DEFINITIONS.length}.`
  );
  assert(
    new Set(expectedSlugs).size === 18,
    'The 18 public tool slugs must be unique.'
  );

  const routeDirectory = path.resolve('src/routes/tools');
  const routeFiles = (await readdir(routeDirectory))
    .filter(
      (file) =>
        file.endsWith('.tsx') && file !== 'index.tsx' && !file.startsWith('-')
    )
    .map((file) => file.replace(/\.tsx$/, ''))
    .sort();
  assert(
    routeFiles.length === 18,
    `Expected exactly 18 public tool route files, found ${routeFiles.length}.`
  );
  assert(
    JSON.stringify(routeFiles) === JSON.stringify([...expectedSlugs].sort()),
    'Route files do not exactly match the expected 18 public tools.'
  );

  const routeTree = await readFile(
    path.resolve('src/routeTree.gen.ts'),
    'utf8'
  );
  for (const slug of expectedSlugs) {
    const routePath = path.join(routeDirectory, `${slug}.tsx`);
    await access(routePath);
    const routeSource = await readFile(routePath, 'utf8');
    assert(
      routeSource.includes(`/tools/${slug}`),
      `${slug}: route source does not declare its expected URL.`
    );
    assert(
      routeTree.includes(`/tools/${slug}`),
      `${slug}: generated route tree does not contain the route.`
    );
  }

  const [en, zh] = await Promise.all([loadMessages('en'), loadMessages('zh')]);
  for (const definition of PUBLIC_TOOL_DEFINITIONS) {
    for (const field of REQUIRED_EXTRA_MESSAGE_FIELDS) {
      const key = `tools.extra.${definition.key}.${field}`;
      assert(en[key]?.trim(), `Missing English message: ${key}`);
      assert(zh[key]?.trim(), `Missing Chinese message: ${key}`);
    }
  }
  for (const prefix of REQUIRED_PLAYLIST_MESSAGE_PREFIXES) {
    for (const suffix of ['seo_title', 'seo_description', 'title']) {
      const key = `${prefix}.${suffix}`;
      assert(en[key]?.trim(), `Missing English message: ${key}`);
      assert(zh[key]?.trim(), `Missing Chinese message: ${key}`);
    }
  }

  for (const field of [
    'seo_title',
    'seo_description',
    'title',
    'description',
  ]) {
    const englishValues = PUBLIC_TOOL_DEFINITIONS.map(
      (tool) => en[`tools.extra.${tool.key}.${field}`]
    );
    const chineseValues = PUBLIC_TOOL_DEFINITIONS.map(
      (tool) => zh[`tools.extra.${tool.key}.${field}`]
    );
    assert(
      new Set(englishValues).size === englishValues.length,
      `English ${field} values must be unique.`
    );
    assert(
      new Set(chineseValues).size === chineseValues.length,
      `Chinese ${field} values must be unique.`
    );
  }

  const [
    catalogSource,
    sitemapSource,
    llmsSource,
    llmsFullSource,
    headerSource,
  ] = await Promise.all([
    readFile(path.resolve('src/blocks/tools/tools-catalog.tsx'), 'utf8'),
    readFile(path.resolve('src/routes/sitemap[.]xml.ts'), 'utf8'),
    readFile(path.resolve('src/routes/llms[.]txt.ts'), 'utf8'),
    readFile(path.resolve('src/routes/llms-full[.]txt.ts'), 'utf8'),
    readFile(path.resolve('src/blocks/header.tsx'), 'utf8'),
  ]);

  for (const slug of PLAYLIST_TOOL_SLUGS) {
    assert(
      catalogSource.includes(slug),
      `${slug}: missing from /tools catalog.`
    );
    assert(sitemapSource.includes(slug), `${slug}: missing from sitemap.`);
    assert(llmsSource.includes(slug), `${slug}: missing from llms.txt.`);
    assert(
      llmsFullSource.includes(slug),
      `${slug}: missing from llms-full.txt.`
    );
    assert(headerSource.includes(slug), `${slug}: missing from header menu.`);
  }
  for (const source of [
    catalogSource,
    sitemapSource,
    llmsSource,
    llmsFullSource,
  ]) {
    assert(
      source.includes('PUBLIC_TOOL_DEFINITIONS'),
      'A generated public-tool listing is not wired to PUBLIC_TOOL_DEFINITIONS.'
    );
  }
  assert(headerSource.includes('href="/tools"'), 'Header is missing /tools.');
  assert(
    headerSource.includes('PUBLIC_TOOL_DEFINITIONS'),
    'Header menu is not wired to all public tool definitions.'
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        passed: true,
        publicToolRoutes: expectedSlugs.length,
        playlistTools: PLAYLIST_TOOL_SLUGS.length,
        videoAndChannelTools: PUBLIC_TOOL_DEFINITIONS.length,
        localizedMessageSets: 2,
        uniqueSeoFieldsChecked: 4,
        listingsChecked: ['catalog', 'sitemap', 'llms', 'llms-full', 'header'],
      },
      null,
      2
    )}\n`
  );
}

await main();
