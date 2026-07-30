import { lazy, Suspense } from 'react';

import { envConfigs } from '@/config';
import { localizedPageUrl, publicPageSeo } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import type { PublicToolDefinition } from '@/components/tools/public-tool-definitions';

const PublicToolPage = lazy(() =>
  import('@/blocks/tools/public-tool-page').then((module) => ({
    default: module.PublicToolPage,
  }))
);

type StaticMessage = (...args: any[]) => string;

const publicToolSeoMessages = {
  thumbnail: {
    title: m['tools.extra.thumbnail.title'],
    seoTitle: m['tools.extra.thumbnail.seo_title'],
    seoDescription: m['tools.extra.thumbnail.seo_description'],
    faqQuestion: m['tools.extra.thumbnail.faq_1_question'],
    faqAnswer: m['tools.extra.thumbnail.faq_1_answer'],
  },
  tags: {
    title: m['tools.extra.tags.title'],
    seoTitle: m['tools.extra.tags.seo_title'],
    seoDescription: m['tools.extra.tags.seo_description'],
    faqQuestion: m['tools.extra.tags.faq_1_question'],
    faqAnswer: m['tools.extra.tags.faq_1_answer'],
  },
  description: {
    title: m['tools.extra.description.title'],
    seoTitle: m['tools.extra.description.seo_title'],
    seoDescription: m['tools.extra.description.seo_description'],
    faqQuestion: m['tools.extra.description.faq_1_question'],
    faqAnswer: m['tools.extra.description.faq_1_answer'],
  },
  embed: {
    title: m['tools.extra.embed.title'],
    seoTitle: m['tools.extra.embed.seo_title'],
    seoDescription: m['tools.extra.embed.seo_description'],
    faqQuestion: m['tools.extra.embed.faq_1_question'],
    faqAnswer: m['tools.extra.embed.faq_1_answer'],
  },
  restrictions: {
    title: m['tools.extra.restrictions.title'],
    seoTitle: m['tools.extra.restrictions.seo_title'],
    seoDescription: m['tools.extra.restrictions.seo_description'],
    faqQuestion: m['tools.extra.restrictions.faq_1_question'],
    faqAnswer: m['tools.extra.restrictions.faq_1_answer'],
  },
  channel_id: {
    title: m['tools.extra.channel_id.title'],
    seoTitle: m['tools.extra.channel_id.seo_title'],
    seoDescription: m['tools.extra.channel_id.seo_description'],
    faqQuestion: m['tools.extra.channel_id.faq_1_question'],
    faqAnswer: m['tools.extra.channel_id.faq_1_answer'],
  },
  channel_playlist: {
    title: m['tools.extra.channel_playlist.title'],
    seoTitle: m['tools.extra.channel_playlist.seo_title'],
    seoDescription: m['tools.extra.channel_playlist.seo_description'],
    faqQuestion: m['tools.extra.channel_playlist.faq_1_question'],
    faqAnswer: m['tools.extra.channel_playlist.faq_1_answer'],
  },
  subscribe: {
    title: m['tools.extra.subscribe.title'],
    seoTitle: m['tools.extra.subscribe.seo_title'],
    seoDescription: m['tools.extra.subscribe.seo_description'],
    faqQuestion: m['tools.extra.subscribe.faq_1_question'],
    faqAnswer: m['tools.extra.subscribe.faq_1_answer'],
  },
  channel_playlists: {
    title: m['tools.extra.channel_playlists.title'],
    seoTitle: m['tools.extra.channel_playlists.seo_title'],
    seoDescription: m['tools.extra.channel_playlists.seo_description'],
    faqQuestion: m['tools.extra.channel_playlists.faq_1_question'],
    faqAnswer: m['tools.extra.channel_playlists.faq_1_answer'],
  },
  channel_links: {
    title: m['tools.extra.channel_links.title'],
    seoTitle: m['tools.extra.channel_links.seo_title'],
    seoDescription: m['tools.extra.channel_links.seo_description'],
    faqQuestion: m['tools.extra.channel_links.faq_1_question'],
    faqAnswer: m['tools.extra.channel_links.faq_1_answer'],
  },
  channel_titles: {
    title: m['tools.extra.channel_titles.title'],
    seoTitle: m['tools.extra.channel_titles.seo_title'],
    seoDescription: m['tools.extra.channel_titles.seo_description'],
    faqQuestion: m['tools.extra.channel_titles.faq_1_question'],
    faqAnswer: m['tools.extra.channel_titles.faq_1_answer'],
  },
  channel_export: {
    title: m['tools.extra.channel_export.title'],
    seoTitle: m['tools.extra.channel_export.seo_title'],
    seoDescription: m['tools.extra.channel_export.seo_description'],
    faqQuestion: m['tools.extra.channel_export.faq_1_question'],
    faqAnswer: m['tools.extra.channel_export.faq_1_answer'],
  },
  channel_analyzer: {
    title: m['tools.extra.channel_analyzer.title'],
    seoTitle: m['tools.extra.channel_analyzer.seo_title'],
    seoDescription: m['tools.extra.channel_analyzer.seo_description'],
    faqQuestion: m['tools.extra.channel_analyzer.faq_1_question'],
    faqAnswer: m['tools.extra.channel_analyzer.faq_1_answer'],
  },
  channel_keywords: {
    title: m['tools.extra.channel_keywords.title'],
    seoTitle: m['tools.extra.channel_keywords.seo_title'],
    seoDescription: m['tools.extra.channel_keywords.seo_description'],
    faqQuestion: m['tools.extra.channel_keywords.faq_1_question'],
    faqAnswer: m['tools.extra.channel_keywords.faq_1_answer'],
  },
  channel_assets: {
    title: m['tools.extra.channel_assets.title'],
    seoTitle: m['tools.extra.channel_assets.seo_title'],
    seoDescription: m['tools.extra.channel_assets.seo_description'],
    faqQuestion: m['tools.extra.channel_assets.faq_1_question'],
    faqAnswer: m['tools.extra.channel_assets.faq_1_answer'],
  },
} as const satisfies Record<
  PublicToolDefinition['key'],
  {
    title: StaticMessage;
    seoTitle: StaticMessage;
    seoDescription: StaticMessage;
    faqQuestion: StaticMessage;
    faqAnswer: StaticMessage;
  }
>;

function localizedMessage(message: StaticMessage, locale: string) {
  return message({}, { locale });
}

export function publicToolRouteOptions(definition: PublicToolDefinition) {
  const path = `/tools/${definition.slug}`;
  const messages =
    publicToolSeoMessages[definition.key as keyof typeof publicToolSeoMessages];

  return {
    loader: () => {
      const locale = getLocale();
      return {
        locale,
        title: localizedMessage(messages.seoTitle, locale),
        description: localizedMessage(messages.seoDescription, locale),
        toolName: localizedMessage(messages.title, locale),
        toolsName: localizedMessage(m['tools.common.breadcrumb_tools'], locale),
        faqQuestion: localizedMessage(messages.faqQuestion, locale),
        faqAnswer: localizedMessage(messages.faqAnswer, locale),
      };
    },
    head: ({
      loaderData,
    }: {
      loaderData?:
        | {
            locale: string;
            title: string;
            description: string;
            toolName: string;
            toolsName: string;
            faqQuestion: string;
            faqAnswer: string;
          }
        | undefined;
    }) => {
      if (!loaderData) return {};
      const title = `${loaderData.title} | ${envConfigs.app_name}`;
      return publicPageSeo({
        title,
        description: loaderData.description,
        path,
        locale: loaderData.locale,
        structuredData: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebApplication',
              name: loaderData.toolName,
              description: loaderData.description,
              url: localizedPageUrl(path, loaderData.locale),
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Any',
              isAccessibleForFree: true,
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: envConfigs.app_name,
                  item: localizedPageUrl('/', loaderData.locale),
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: loaderData.toolsName,
                  item: localizedPageUrl('/tools', loaderData.locale),
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: loaderData.toolName,
                  item: localizedPageUrl(path, loaderData.locale),
                },
              ],
            },
            {
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: loaderData.faqQuestion,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: loaderData.faqAnswer,
                  },
                },
              ],
            },
          ],
        },
      });
    },
    component: () => (
      <div className="marketing-shell bg-background text-foreground min-h-screen">
        <Header />
        <Suspense
          fallback={
            <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-16 sm:px-6" />
          }
        >
          <PublicToolPage toolKey={definition.key} />
        </Suspense>
        <Footer />
      </div>
    ),
  };
}
