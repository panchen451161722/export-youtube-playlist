import { createFileRoute, notFound } from '@tanstack/react-router';

import { privatePageSeo } from '@/lib/seo';
import { GuestTrialPreview } from '@/blocks/playlist-guard/guest-trial-preview';

export const Route = createFileRoute('/dev/guest-trial')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => privatePageSeo('Guest trial preview'),
  component: GuestTrialPreview,
});
