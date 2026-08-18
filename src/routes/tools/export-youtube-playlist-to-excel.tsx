import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { localizedPageUrl, publicPageSeo } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { PlaylistExcelExporter } from '@/blocks/tools/playlist-excel-exporter';

const PATH = '/tools/export-youtube-playlist-to-excel';

export const Route = createFileRoute('/tools/export-youtube-playlist-to-excel')(
  {
    loader: () => {
      const locale = getLocale();
      return {
        locale,
        title: m['tools.excel.seo_title']({}, { locale }),
        description: m['tools.excel.seo_description']({}, { locale }),
        toolName: m['tools.excel.title']({}, { locale }),
        toolsName: m['tools.common.breadcrumb_tools']({}, { locale }),
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
          ],
        },
      });
    },
    component: ExcelExportPage,
  }
);

function ExcelExportPage() {
  return (
    <div className="marketing-shell bg-background text-foreground min-h-screen">
      <Header />
      <main>
        <PlaylistExcelExporter />
      </main>
      <Footer />
    </div>
  );
}
