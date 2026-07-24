import { createFileRoute } from '@tanstack/react-router';

import {
  getVideoToolData,
  YouTubePublicError,
} from '@/modules/youtube-public/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { readBoundedJson, RequestJsonError } from '@/lib/request-json';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_500,
    keyPrefix: 'youtube-video-tools',
  });
  if (limited) {
    return respErr('Please wait before checking another video.', {
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
      return respErr('A YouTube video URL is required.', { status: 400 });
    }
    const result = await getVideoToolData({ input });
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
    console.error('youtube video tool failed unexpectedly');
    return respErr('The video could not be loaded.', { status: 500 });
  }
}

export const Route = createFileRoute('/api/youtube-video')({
  server: { handlers: { POST } },
});
