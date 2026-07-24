import { envConfigs } from '@/config';
import { localizedPageUrl, publicPageSeo } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { PublicToolPage } from '@/blocks/tools/public-tool-page';
import type { PublicToolDefinition } from '@/components/tools/public-tool-definitions';

function localizedMessage(key: string, locale: string) {
  const message = (m as Record<string, unknown>)[key];
  if (typeof message !== 'function') return key;
  return (
    message as (
      args?: Record<string, never>,
      options?: { locale: string }
    ) => string
  )({}, { locale });
}

export function publicToolRouteOptions(definition: PublicToolDefinition) {
  const path = `/tools/${definition.slug}`;
  const prefix = `tools.extra.${definition.key}`;

  return {
    loader: () => {
      const locale = getLocale();
      return {
        locale,
        title: localizedMessage(`${prefix}.seo_title`, locale),
        description: localizedMessage(`${prefix}.seo_description`, locale),
        toolName: localizedMessage(`${prefix}.title`, locale),
        toolsName: localizedMessage('tools.common.breadcrumb_tools', locale),
        faqQuestion: localizedMessage(`${prefix}.faq_1_question`, locale),
        faqAnswer: localizedMessage(`${prefix}.faq_1_answer`, locale),
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
        <PublicToolPage toolKey={definition.key} />
        <Footer />
      </div>
    ),
  };
}
