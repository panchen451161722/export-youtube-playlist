import { Suspense } from 'react';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { MDXProvider } from '@mdx-js/react';
import { ArrowLeft, Calendar } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { absoluteUrl, localizedPageUrl, publicPageSeo } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { baseLocale, getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { MarkdownContent } from '@/components/markdown-content';
import { mdxComponents } from '@/components/mdx-components';
import {
  formatPostDate,
  getLocalPostComponent,
  getLocalPostLocales,
} from '@/content/posts';
import { getBlogPostFn } from '@/content/posts/server';

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => {
    const locale = getLocale();
    const post = await getBlogPostFn({
      data: { slug: params.slug, locale },
    });
    if (!post) {
      // An explicitly requested untranslated locale resolves permanently to
      // the real base-locale article, but only when that article exists.
      if (locale !== baseLocale) {
        const basePost = await getBlogPostFn({
          data: { slug: params.slug, locale: baseLocale },
        });
        if (basePost) {
          throw redirect({
            href: absoluteUrl(`/blog/${params.slug}`),
            statusCode: 308,
          });
        }
      }
      throw notFound();
    }

    const localPostLocales = getLocalPostLocales(post.slug);
    const availableLocales: ReturnType<typeof getLocalPostLocales> =
      post.source === 'db' && !localPostLocales.includes(baseLocale)
        ? [baseLocale, ...localPostLocales]
        : localPostLocales;

    return { availableLocales, locale, post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { availableLocales, locale, post } = loaderData;
    const path = `/blog/${post.slug}`;
    const title = `${post.title} | ${envConfigs.app_name}`;
    const author = post.authorName || envConfigs.app_name;
    const image = post.image || '/apple-touch-icon.png';
    return publicPageSeo({
      title,
      description: post.description,
      path,
      locale,
      availableLocales,
      type: 'article',
      image,
      imageAlt: post.title,
      publishedTime: post.createdAt,
      modifiedTime: post.createdAt,
      author,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        image: absoluteUrl(image),
        datePublished: post.createdAt,
        dateModified: post.createdAt,
        inLanguage: locale === 'zh' ? 'zh-CN' : 'en-US',
        mainEntityOfPage: localizedPageUrl(path, locale),
        author: { '@type': 'Organization', name: author },
        publisher: {
          '@type': 'Organization',
          name: envConfigs.app_name,
          logo: {
            '@type': 'ImageObject',
            url: absoluteUrl('/apple-touch-icon.png'),
          },
        },
      },
    });
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { locale, post } = Route.useLoaderData();

  // Local posts load only their own MDX component; database posts render
  // raw markdown through MarkdownContent.
  const LocalContent =
    post.source === 'local' ? getLocalPostComponent(post.slug, locale) : null;

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-6 py-12 md:px-8 md:py-16">
        <article className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            {m['blog.back_to_blog']()}
          </Link>

          <header className="border-border mt-8 mb-6 border-b pb-6">
            <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
              {post.title}
            </h1>
            {post.description && (
              <p className="text-muted-foreground mt-3">{post.description}</p>
            )}
            <div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" />
                {formatPostDate(post.createdAt, locale)}
              </span>
              {(post.authorName || post.authorImage) && (
                <span className="inline-flex items-center gap-2">
                  {post.authorImage && (
                    <img
                      src={post.authorImage}
                      alt={post.authorName || ''}
                      width={20}
                      height={20}
                      className="size-5 rounded-full object-cover"
                    />
                  )}
                  {post.authorName}
                </span>
              )}
            </div>
          </header>

          {post.image && (
            <img
              src={post.image}
              alt={post.title}
              className="border-border mb-8 w-full rounded-2xl border object-cover"
            />
          )}

          {LocalContent ? (
            <div className="text-foreground/90 text-[15px] leading-7">
              <MDXProvider components={mdxComponents}>
                <Suspense fallback={null}>
                  <LocalContent />
                </Suspense>
              </MDXProvider>
            </div>
          ) : (
            <MarkdownContent content={post.content || ''} />
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}
