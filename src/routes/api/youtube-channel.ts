import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getPlaylistExportAccess } from '@/modules/subscriptions/service';
import { getChannelToolData } from '@/modules/youtube-public/service';

import { createChannelToolHandlers } from './-youtube-channel';

const handlers = createChannelToolHandlers({
  getSession: (request) =>
    getAuth().api.getSession({ headers: request.headers }),
  getAccess: getPlaylistExportAccess,
  loadChannel: getChannelToolData,
});

export const Route = createFileRoute('/api/youtube-channel')({
  server: { handlers },
});
