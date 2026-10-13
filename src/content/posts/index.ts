import { lazy, type ComponentType } from 'react';

import { locales } from '@/paraglide/runtime.js';

/**
 * Local blog posts written as MDX files in this directory.
 * File naming: `<slug>.<locale>.mdx`.
 * Register every local post slug here — it drives loading and the sitemap.
 *
 * This module is isomorphic (safe in client bundles). Database posts are
 * fetched through the server functions in ./server.ts and merged with the
 * local posts via the pure helpers below.
 */
export const BLOG_POST_SLUGS = [
  'how-i-created-the-youtube-playlist-export-web-app',
  'how-i-learned-python-using-youtube-playlists',
  'how-to-export-a-youtube-playlist-to-csv-or-excel',
  'analyze-youtube-playlist-in-google-sheets',
  'back-up-youtube-playlists',
  'calculate-youtube-playlist-watch-time',
  'audit-a-youtube-channel-with-public-data',
] as const;

export type BlogPostMeta = {
  title: string;
  description: string;
  created_at: string;
  author_name?: string;
  author_image?: string;
  image?: string;
};

type PostModule = {
  default: ComponentType;
  meta: BlogPostMeta;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  image?: string;
  /** ISO date string — serializable across loader/server-fn boundaries */
  createdAt: string;
  authorName?: string;
  authorImage?: string;
  source: 'local' | 'db';
};

export type BlogPostDetail = BlogPost & {
  /** Raw markdown — set for database posts */
  content?: string;
};

// Each article/locale is its own async chunk. Locale checks use only the keys;
// metadata is loaded by the blog server functions, never eagerly by the router.
const postLoaders = import.meta.glob<PostModule>('/src/content/posts/*.mdx');
const postComponents = new Map<string, ComponentType>();

function localPostLoader(slug: string, locale: string) {
  if (!BLOG_POST_SLUGS.includes(slug as (typeof BLOG_POST_SLUGS)[number])) {
    return null;
  }
  return postLoaders[`/src/content/posts/${slug}.${locale}.mdx`] ?? null;
}

export async function loadLocalPost(
  slug: string,
  locale: string
): Promise<PostModule | null> {
  return localPostLoader(slug, locale)?.() ?? null;
}

export function getLocalPostComponent(
  slug: string,
  locale: string
): ComponentType | null {
  const loader = localPostLoader(slug, locale);
  if (!loader) return null;
  const key = `/src/content/posts/${slug}.${locale}.mdx`;
  let component = postComponents.get(key);
  if (!component) {
    component = lazy(loader);
    postComponents.set(key, component);
  }
  return component;
}

/** Locales with a real MDX file for this post; no cross-locale fallback. */
export function getLocalPostLocales(slug: string): (typeof locales)[number][] {
  return locales.filter((locale) => localPostLoader(slug, locale) !== null);
}

function localPostToItem(slug: string, meta: BlogPostMeta): BlogPost {
  return {
    slug,
    title: meta.title,
    description: meta.description,
    image: meta.image,
    createdAt: new Date(meta.created_at).toISOString(),
    authorName: meta.author_name,
    authorImage: meta.author_image,
    source: 'local',
  };
}

export async function getLocalPosts(locale: string): Promise<BlogPost[]> {
  const posts = await Promise.all(
    BLOG_POST_SLUGS.map(async (slug) => ({
      slug: slug as string,
      mod: await loadLocalPost(slug, locale),
    }))
  );
  return posts
    .filter((m): m is { slug: string; mod: PostModule } => m.mod !== null)
    .map(({ slug, mod }) => localPostToItem(slug, mod.meta));
}

/**
 * Merge database posts with local MDX posts, deduped by slug
 * (database wins), newest first.
 */
export function mergePosts(
  dbPosts: BlogPost[],
  localPosts: BlogPost[],
  options: { limit?: number } = {}
): BlogPost[] {
  const dbSlugs = new Set(dbPosts.map((p) => p.slug));
  const merged = [
    ...dbPosts,
    ...localPosts.filter((p) => !dbSlugs.has(p.slug)),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return options.limit ? merged.slice(0, options.limit) : merged;
}

export function formatPostDate(dateIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: locale === 'zh' ? 'long' : 'short',
    day: 'numeric',
  }).format(new Date(dateIso));
}
