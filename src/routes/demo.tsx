import { createFileRoute } from '@tanstack/react-router';

import { privatePageSeo } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { PlaylistGuardDemo } from '@/blocks/playlist-guard/demo';

export const Route = createFileRoute('/demo')({
  loader: () => ({
    title: m['guard_tour.tour_title']({}, { locale: getLocale() }),
  }),
  head: ({ loaderData }) => privatePageSeo(loaderData?.title ?? ''),
  component: () => (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <main>
        <PlaylistGuardDemo />
      </main>
      <Footer />
    </div>
  ),
});
