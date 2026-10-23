import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { Header } from '@/blocks/header';
import { ClaimBackup } from '@/blocks/playlist-guard/claim-backup';

export const Route = createFileRoute('/claim-backup')({
  head: () => ({
    meta: [
      { title: m['guestClaim.title']() },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'referrer', content: 'no-referrer' },
    ],
  }),
  component: () => (
    <>
      <Header />
      <main>
        <ClaimBackup />
      </main>
    </>
  ),
});
