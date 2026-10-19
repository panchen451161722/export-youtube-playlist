import { getSessionCookie } from 'better-auth/cookies';

import {
  FREE_PLAYLIST_EXPORT_LIMIT,
  type PlaylistExportAccess,
} from '@/config/playlist-export';
import {
  PlaylistServiceError,
  type getPlaylistExport,
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

type PlaylistExportDependencies = {
  getSession: (request: Request) => Promise<{ user: { id: string } } | null>;
  getAccess: (userId: string) => Promise<PlaylistExportAccess>;
  loadPlaylist: typeof getPlaylistExport;
};

export function createPlaylistExportHandlers(deps: PlaylistExportDependencies) {
  async function accessFor(request: Request): Promise<{
    access: PlaylistExportAccess;
    userId?: string;
  }> {
    // Cookie presence is only an optimization; getSession validates it before granting access.
    // Anonymous exports still work without initializing auth or opening the database.
    const session = getSessionCookie(request)
      ? await deps.getSession(request)
      : null;
    if (!session?.user) {
      return {
        access: { subscribed: false, limit: FREE_PLAYLIST_EXPORT_LIMIT },
      };
    }
    return {
      access: await deps.getAccess(session.user.id),
      userId: session.user.id,
    };
  }

  async function GET({ request }: { request: Request }) {
    try {
      const { access } = await accessFor(request);
      return respData(access, {
        headers: { 'cache-control': 'no-store' },
      });
    } catch {
      return respErr('Could not check your export limit. Please try again.', {
        status: 503,
        headers: { 'cache-control': 'no-store' },
      });
    }
  }

  async function POST({ request }: { request: Request }) {
    const sourceIp =
      request.headers.get('cf-connecting-ip')?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 2_000,
      keyPrefix: 'youtube-playlist-preview',
      identityKey: `ip:${sourceIp}`,
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

      const { access, userId } = await accessFor(request);
      if (access.subscribed && userId) {
        const subscriberLimited = enforceMinIntervalRateLimit(request, {
          intervalMs: 2_000,
          keyPrefix: 'youtube-playlist-subscriber',
          identityKey: userId,
        });
        if (subscriberLimited) {
          return respErr('Please wait before previewing another playlist.', {
            status: subscriberLimited.status,
            headers: subscriberLimited.headers,
          });
        }
      }
      const result = await deps.loadPlaylist({
        playlistUrl,
        maxItems: access.limit,
      });
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
        headers: { 'cache-control': 'no-store' },
      });
    }
  }

  return { GET, POST };
}
