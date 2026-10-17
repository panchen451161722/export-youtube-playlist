import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getPlaylistExportAccess } from '@/modules/subscriptions/service';
import { getPlaylistExport } from '@/modules/youtube-playlist/service';

import { createPlaylistExportHandlers } from './-youtube-playlist';

const handlers = createPlaylistExportHandlers({
  getSession: (request) =>
    getAuth().api.getSession({ headers: request.headers }),
  getAccess: getPlaylistExportAccess,
  loadPlaylist: getPlaylistExport,
});

export const Route = createFileRoute('/api/youtube-playlist')({
  server: { handlers },
});
