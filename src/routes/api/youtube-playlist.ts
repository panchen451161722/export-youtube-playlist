import { createFileRoute } from '@tanstack/react-router';

import {
  getPlaylistExport,
  PlaylistServiceError,
} from '@/modules/youtube-playlist/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

const MAX_BODY_BYTES = 4 * 1024;

async function readBoundedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    throw new RequestBodyError('Request body is too large.', 413);
  }

  const contentType = request.headers.get('content-type');
  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    throw new RequestBodyError('Request body must be JSON.', 415);
  }

  if (!request.body)
    throw new RequestBodyError('Playlist URL is required.', 400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalLength += value.byteLength;
    if (totalLength > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RequestBodyError('Request body is too large.', 413);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new RequestBodyError('Request body must be valid JSON.', 400);
  }
}

class RequestBodyError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'RequestBodyError';
    this.status = status;
  }
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 2_000,
    keyPrefix: 'youtube-playlist-preview',
  });
  if (limited) {
    return respErr('Please wait before previewing another playlist.', {
      status: limited.status,
      headers: limited.headers,
    });
  }

  try {
    const body = await readBoundedJson(request);
    const playlistUrl =
      typeof body === 'object' && body !== null
        ? ((body as { url?: unknown; playlistUrl?: unknown }).url ??
          (body as { playlistUrl?: unknown }).playlistUrl)
        : undefined;
    if (typeof playlistUrl !== 'string' || !playlistUrl.trim()) {
      return respErr('Playlist URL is required.', { status: 400 });
    }

    const result = await getPlaylistExport({ playlistUrl });
    return respData(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof PlaylistServiceError) {
      return respErr(error.message, {
        status: error.status,
        headers: {
          'cache-control': 'no-store',
          'x-playlist-error': error.code,
        },
      });
    }
    if (error instanceof RequestBodyError) {
      return respErr(error.message, { status: error.status });
    }

    console.error('youtube playlist preview failed with an unexpected error');
    return respErr('Playlist preview failed. Please try again.', {
      status: 500,
    });
  }
}

export const Route = createFileRoute('/api/youtube-playlist')({
  server: {
    handlers: { POST },
  },
});
