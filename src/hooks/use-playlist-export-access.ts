import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/core/auth/client';
import type { PlaylistExportAccess } from '@/config/playlist-export';
import { apiGet } from '@/lib/api-client';

export function usePlaylistExportAccess() {
  const { data: session, isPending } = useSession();
  return useQuery({
    queryKey: ['playlist-export-access', session?.user?.id ?? null],
    queryFn: () =>
      apiGet<PlaylistExportAccess>('/api/youtube-playlist', {
        cache: 'no-store',
      }),
    enabled: !isPending && Boolean(session?.user),
    staleTime: 0,
  });
}
