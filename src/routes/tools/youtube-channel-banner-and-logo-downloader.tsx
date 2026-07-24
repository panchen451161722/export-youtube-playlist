import { createFileRoute } from '@tanstack/react-router';

import { getPublicToolDefinition } from '@/components/tools/public-tool-definitions';

import { publicToolRouteOptions } from './-public-tool-route';

export const Route = createFileRoute(
  '/tools/youtube-channel-banner-and-logo-downloader'
)(publicToolRouteOptions(getPublicToolDefinition('channel_assets')));
