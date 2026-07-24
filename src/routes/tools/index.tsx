import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { localizedPageUrl, publicPageSeo } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { ToolsCatalog } from '@/blocks/tools/tools-catalog';

export const Route = createFileRoute('/tools/')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['tools.catalog.seo_title']({}, { locale }),
      description: m['tools.catalog.seo_description']({}, { locale }),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const title = `${loaderData.title} | ${envConfigs.app_name}`;

    return publicPageSeo({
      title,
      description: loaderData.description,
      path: '/tools',
      locale: loaderData.locale,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description: loaderData.description,
        url: localizedPageUrl('/tools', loaderData.locale),
        isPartOf: {
          '@type': 'WebSite',
          name: envConfigs.app_name,
          url: localizedPageUrl('/', loaderData.locale),
        },
      },
    });
  },
  component: ToolsPage,
});

function ToolsPage() {
  return (
    <div className="marketing-shell bg-background text-foreground min-h-screen">
      <Header />
      <ToolsCatalog />
      <Footer />
    </div>
  );
}
