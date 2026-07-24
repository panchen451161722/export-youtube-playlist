import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { localizedPageUrl, publicPageSeo } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Pricing } from '@/blocks/pricing';

export const Route = createFileRoute('/pricing')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['seo.pricing.title']({}, { locale }),
      description: m['seo.pricing.description']({}, { locale }),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const title = `${loaderData.title} | ${envConfigs.app_name}`;
    return publicPageSeo({
      title,
      description: loaderData.description,
      path: '/pricing',
      locale: loaderData.locale,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description: loaderData.description,
        url: localizedPageUrl('/pricing', loaderData.locale),
        isPartOf: {
          '@type': 'WebSite',
          name: envConfigs.app_name,
          url: localizedPageUrl('/', loaderData.locale),
        },
      },
    });
  },
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <h1 className="sr-only">{m['landing.pricing.title']()}</h1>
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
