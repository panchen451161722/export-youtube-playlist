import { envConfigs } from '@/config';
import { respErr } from '@/lib/resp';
import { YoutubeAccountError } from '@/lib/youtube-connections/google';
import { isYoutubeConnectionNotice } from '@/lib/youtube-connections/types';

export const YOUTUBE_STATE_COOKIE = 'youtube_connection_state';
export function callbackOrigin(request: Request) {
  const url = new URL(request.url);
  const configured = new URL(envConfigs.app_url).origin;
  if (url.origin === configured) return url.origin;
  if (
    process.env.NODE_ENV !== 'production' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
    return url.origin;
  throw new YoutubeAccountError(
    'invalid_origin',
    'This request must use the configured application URL.',
    403
  );
}
export function stateCookie(value: string, secure: boolean) {
  return `${YOUTUBE_STATE_COOKIE}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/api/youtube-connections/callback; Max-Age=${value ? 600 : 0}${secure ? '; Secure' : ''}`;
}
export function readStateCookie(request: Request) {
  const part = request.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(YOUTUBE_STATE_COOKIE + '='));
  try {
    return decodeURIComponent(
      part?.slice(YOUTUBE_STATE_COOKIE.length + 1) || ''
    );
  } catch {
    return '';
  }
}
/** Bound streamed bodies too; Content-Length can be absent or misleading. */
export async function readConnectionBody(request: Request): Promise<unknown> {
  const invalid = () =>
    new YoutubeAccountError(
      'invalid_request',
      'Invalid connection request.',
      400
    );
  if (
    !request.body ||
    Number(request.headers.get('content-length') || 0) > 2048
  )
    throw invalid();
  const reader = request.body.getReader();
  const bytes = new Uint8Array(2048);
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (length + value.byteLength > bytes.length) {
        await reader.cancel();
        throw invalid();
      }
      bytes.set(value, length);
      length += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes.subarray(0, length)));
  } catch {
    throw invalid();
  }
}
export function youtubeErrorResponse(error: unknown) {
  return respErr(
    error instanceof YoutubeAccountError
      ? error.message
      : 'YouTube connection could not be completed. Try again.',
    {
      status: error instanceof YoutubeAccountError ? error.status : 500,
      headers: { 'cache-control': 'no-store' },
    }
  );
}

/** Only static application codes may leave the callback; never upstream error text. */
export function youtubeCallbackFailure(error: unknown) {
  return error instanceof YoutubeAccountError &&
    isYoutubeConnectionNotice(error.code) &&
    !['connected', 'denied'].includes(error.code)
    ? error.code
    : 'failed';
}
