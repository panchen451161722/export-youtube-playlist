import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
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
    <div className="min-h-screen bg-[#f7f5ef] text-[#18213b] dark:bg-[#111827] dark:text-white">
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
    const urlFor = (loc: string) =>
      localizeUrl(`${envConfigs.app_url}/`, { locale: loc as any }).href;
    const title = m['common.metadata.title']({}, { locale: locale as any });
    const description = m['common.metadata.description'](
      {},
      { locale: locale as any }
    );
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: urlFor(locale) },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      links: [
        { rel: 'canonical', href: urlFor(locale) },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
      ],
    };
  },
  component: HomePage,
});
