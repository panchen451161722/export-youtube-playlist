import { ArrowLeft } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { PlaylistGuardTour } from '@/blocks/playlist-guard/tour';

export function PlaylistGuardDemo() {
  return (
    <>
      <div className="mx-auto max-w-[1180px] px-4 pt-8 sm:px-8">
        <Link
          href="/youtube-playlist-backup"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {m['backup.back_to_backup']()}
        </Link>
      </div>
      <PlaylistGuardTour />
    </>
  );
}
