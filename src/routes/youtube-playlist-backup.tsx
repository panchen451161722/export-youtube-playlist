import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { publicPageSeo } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { PlaylistBackup } from '@/blocks/playlist-guard/backup';

export const Route = createFileRoute('/youtube-playlist-backup')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['backup.seo_title']({}, { locale }),
      description: m['backup.seo_description']({}, { locale }),
    };
  },
  head: ({ loaderData }) =>
    loaderData
      ? publicPageSeo({
          title: `${loaderData.title} | ${envConfigs.app_name}`,
          description: loaderData.description,
          locale: loaderData.locale,
          path: '/youtube-playlist-backup',
        })
      : {},
  component: () => (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <main>
        <PlaylistBackup />
      </main>
      <Footer />
    </div>
  ),
});
