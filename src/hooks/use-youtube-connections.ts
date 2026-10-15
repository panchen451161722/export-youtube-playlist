import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiGet, apiPost } from '@/lib/api-client';
import {
  isYoutubeConnectionNotice,
  type YoutubeConnectionNotice,
  type YoutubeConnectionsOverview,
  type YoutubeReturnPath,
} from '@/lib/youtube-connections/types';

export function useYoutubeConnections(
  userId: string | undefined,
  returnTo: YoutubeReturnPath
) {
  const [notice, setNotice] = useState<'' | YoutubeConnectionNotice>('');
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('youtube');
    if (isYoutubeConnectionNotice(status)) setNotice(status);
  }, []);
  const queryClient = useQueryClient();
  const queryKey = ['youtube-connections', userId];
  const query = useQuery({
    queryKey,
    queryFn: () =>
      apiGet<YoutubeConnectionsOverview>('/api/youtube-connections'),
    enabled: !!userId,
  });
  const connect = useMutation({
    mutationFn: (reconnectId?: string) =>
      apiPost<{ url: string }>('/api/youtube-connections', {
        action: 'connect',
        returnTo,
        reconnectId,
      }),
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const disconnect = useMutation({
    mutationFn: (id: string) =>
      apiPost('/api/youtube-connections', { action: 'disconnect', id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (e: Error) => toast.error(e.message),
  });
  return { query, connect, disconnect, notice };
}
