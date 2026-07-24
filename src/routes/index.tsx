import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { absoluteUrl, localizedPageUrl, publicPageSeo } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { CTA } from '@/blocks/cta';
import { FAQ } from '@/blocks/faq';
import { Features } from '@/blocks/features';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Hero } from '@/blocks/hero';
import { HowItWorks } from '@/blocks/how-it-works';
import { Pricing } from '@/blocks/pricing';
import { ProofStrip } from '@/blocks/proof-strip';

function HomePage() {
  return (
    <div className="marketing-shell bg-background text-foreground min-h-screen">
      <Header />
      <main>
        <Hero />
        <ProofStrip />
        <Features />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/')({
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['common.metadata.title']({}, { locale: locale as any });
    const description = m['common.metadata.description'](
      {},
      { locale: locale as any }
    );
    return publicPageSeo({
      title,
      description,
      path: '/',
      locale,
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            name: envConfigs.app_name,
            url: localizedPageUrl('/', locale),
            logo: absoluteUrl('/apple-touch-icon.png'),
          },
          {
            '@type': 'WebApplication',
            name: envConfigs.app_name,
            description,
            url: localizedPageUrl('/', locale),
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Any',
            isAccessibleForFree: true,
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
          },
        ],
      },
    });
  },
  component: HomePage,
});
