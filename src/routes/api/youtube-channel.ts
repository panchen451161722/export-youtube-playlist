import { createFileRoute } from '@tanstack/react-router';

import {
  getChannelToolData,
  YouTubePublicError,
  type ChannelMediaType,
} from '@/modules/youtube-public/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { readBoundedJson, RequestJsonError } from '@/lib/request-json';
import { respData, respErr } from '@/lib/resp';

const MEDIA_TYPES = new Set<ChannelMediaType>([
  'all',
  'videos',
  'shorts',
  'live',
]);

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 2_000,
    keyPrefix: 'youtube-channel-tools',
  });
  if (limited) {
    return respErr('Please wait before checking another channel.', {
      status: limited.status,
      headers: limited.headers,
    });
  }

  try {
    const body = await readBoundedJson(request);
    const input =
      typeof body === 'object' && body !== null
        ? (body as { url?: unknown }).url
        : undefined;
    if (typeof input !== 'string' || !input.trim()) {
      return respErr('A YouTube channel URL, handle, or ID is required.', {
        status: 400,
      });
    }
    const objectBody = body as {
      includeVideos?: unknown;
      includePlaylists?: unknown;
      mediaType?: unknown;
      limit?: unknown;
    };
    const mediaType = MEDIA_TYPES.has(objectBody.mediaType as ChannelMediaType)
      ? (objectBody.mediaType as ChannelMediaType)
      : 'all';
    const requestedLimit =
      typeof objectBody.limit === 'number' && Number.isFinite(objectBody.limit)
        ? objectBody.limit
        : undefined;
    const result = await getChannelToolData({
      input,
      includeVideos: objectBody.includeVideos === true,
      includePlaylists: objectBody.includePlaylists === true,
      mediaType,
      limit: requestedLimit,
    });
    return respData(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof YouTubePublicError) {
      return respErr(error.message, {
        status: error.status,
        headers: {
          'cache-control': 'no-store',
          'x-youtube-error': error.code,
        },
      });
    }
    if (error instanceof RequestJsonError) {
      return respErr(error.message, { status: error.status });
    }
    console.error('youtube channel tool failed unexpectedly');
    return respErr('The channel could not be loaded.', { status: 500 });
  }
}

export const Route = createFileRoute('/api/youtube-channel')({
  server: { handlers: { POST } },
});
