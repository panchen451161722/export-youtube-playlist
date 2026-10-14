import { createFileRoute } from '@tanstack/react-router';

import { PlaylistGuardWorkspace } from '@/blocks/playlist-guard/workspace';

export const Route = createFileRoute('/settings/collections')({
  validateSearch: (
    search: Record<string, unknown>
  ): { collection?: string } => ({
    collection:
      typeof search.collection === 'string' && search.collection.length <= 100
        ? search.collection
        : undefined,
  }),
  component: () => <PlaylistGuardWorkspace />,
});
