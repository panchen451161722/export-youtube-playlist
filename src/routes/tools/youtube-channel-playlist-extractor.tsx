import { createFileRoute } from '@tanstack/react-router';

import { getPublicToolDefinition } from '@/components/tools/public-tool-definitions';

import { publicToolRouteOptions } from './-public-tool-route';

export const Route = createFileRoute(
  '/tools/youtube-channel-playlist-extractor'
)(publicToolRouteOptions(getPublicToolDefinition('channel_playlists')));
