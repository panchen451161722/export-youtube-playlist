import { YOUTUBE_READONLY_SCOPE } from './types';

export class YoutubeAccountError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}
export type GoogleConfig = { clientId: string; clientSecret: string };
export type YoutubeTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};
type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
};

export function authorizationUrl(
  config: GoogleConfig,
  redirectUri: string,
  state: string,
  challenge: string
) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_READONLY_SCOPE,
    state,
    access_type: 'offline',
    prompt: 'consent select_account',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}
export async function googleTokens(
  config: GoogleConfig,
  grant: Record<string, string>,
  fetcher: typeof fetch = fetch
): Promise<TokenResponse> {
  const response = await fetcher('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...grant,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json()) as TokenResponse;
  if (!response.ok || !data.access_token) {
    if (data.error === 'invalid_grant')
      throw new YoutubeAccountError(
        'reconnect',
        'YouTube authorization expired or was revoked. Reconnect this account.',
        403
      );
    throw new YoutubeAccountError(
      'oauth_failed',
      'YouTube authorization could not be completed. Try connecting again.',
      502
    );
  }
  if (data.scope && !data.scope.split(' ').includes(YOUTUBE_READONLY_SCOPE))
    throw new YoutubeAccountError(
      'scope_missing',
      'Allow read-only YouTube access to connect this account.',
      403
    );
  return data;
}

/** A revoked/unknown token is already in the desired state; other failures must retry. */
export async function revokeGoogleToken(
  token: string,
  fetcher: typeof fetch = fetch
): Promise<void> {
  const response = await fetcher('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
    signal: AbortSignal.timeout(10_000),
  });
  if (response.ok) return;
  const result = await response.json().catch(() => null);
  if (response.status === 400 && result?.error === 'invalid_token') return;
  throw new YoutubeAccountError(
    'revocation_pending',
    'Google authorization revocation will be retried.',
    502
  );
}
export async function youtubeGet<T>(
  path: string,
  params: Record<string, string>,
  accessToken: string,
  fetcher: typeof fetch = fetch
): Promise<T> {
  const url = new URL('https://www.googleapis.com/youtube/v3/' + path);
  url.search = new URLSearchParams(params).toString();
  const response = await fetcher(url, {
    headers: { authorization: 'Bearer ' + accessToken },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    if (response.status === 401)
      throw new YoutubeAccountError(
        'reconnect',
        'Reconnect your YouTube account to continue checking this collection.',
        403
      );
    // Never treat denied, quota-limited or failed reads as empty collections.
    throw new YoutubeAccountError(
      'youtube_read_failed',
      'YouTube could not read this source. Check the connected account and source permissions, or try again later.',
      response.status === 404 ? 404 : 502
    );
  }
  return (await response.json()) as T;
}
