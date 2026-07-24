import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { localizedPageUrl, publicPageSeo } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { PlaylistTitleExtractor } from '@/blocks/tools/playlist-title-extractor';

const PATH = '/tools/youtube-playlist-title-extractor';

export const Route = createFileRoute('/tools/youtube-playlist-title-extractor')(
  {
    loader: () => {
      const locale = getLocale();
      return {
        locale,
        title: m['tools.title.seo_title']({}, { locale }),
        description: m['tools.title.seo_description']({}, { locale }),
        toolName: m['tools.catalog.titles.title']({}, { locale }),
        toolsName: m['tools.common.breadcrumb_tools']({}, { locale }),
        faq: [
          {
            question: m['tools.title.faq_1.question']({}, { locale }),
            answer: m['tools.title.faq_1.answer']({}, { locale }),
          },
          {
            question: m['tools.title.faq_2.question']({}, { locale }),
            answer: m['tools.title.faq_2.answer']({}, { locale }),
          },
          {
            question: m['tools.title.faq_3.question']({}, { locale }),
            answer: m['tools.title.faq_3.answer']({}, { locale }),
          },
        ],
      };
    },
    head: ({ loaderData }) => {
      if (!loaderData) return {};
      const title = `${loaderData.title} | ${envConfigs.app_name}`;

      return publicPageSeo({
        title,
        description: loaderData.description,
        path: PATH,
        locale: loaderData.locale,
        structuredData: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebApplication',
              name: loaderData.toolName,
              description: loaderData.description,
              url: localizedPageUrl(PATH, loaderData.locale),
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
                  item: localizedPageUrl(PATH, loaderData.locale),
                },
              ],
            },
            {
              '@type': 'FAQPage',
              mainEntity: loaderData.faq.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: item.answer,
                },
              })),
            },
          ],
        },
      });
    },
    component: TitleExtractorPage,
  }
);

function TitleExtractorPage() {
  return (
    <div className="marketing-shell bg-background text-foreground min-h-screen">
      <Header />
      <PlaylistTitleExtractor />
      <Footer />
    </div>
  );
}
