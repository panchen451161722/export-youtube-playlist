import { createFileRoute } from '@tanstack/react-router';

import { privatePageSeo } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { PlaylistGuardTour } from '@/blocks/playlist-guard/tour';

export const Route = createFileRoute('/demo')({
  head: () => privatePageSeo(m['guard.demo']()),
  component: DemoPage,
});
function DemoPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <main>
        <PlaylistGuardTour />
      </main>
      <Footer />
    </div>
  );
}
