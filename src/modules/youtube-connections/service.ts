import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  youtubeConnection,
  type YoutubeConnectionRow,
} from '@/config/db/schema';
import { decryptSecret, encryptSecret, isEncryptedSecret } from '@/lib/crypto';
import { getUuid } from '@/lib/hash';
import {
  authorizationUrl,
  googleTokens,
  YoutubeAccountError,
  youtubeGet,
  type GoogleConfig,
  type YoutubeTokens,
} from '@/lib/youtube-connections/google';
import {
  YOUTUBE_RETURN_PATHS,
  type YoutubeConnection,
  type YoutubeReturnPath,
} from '@/lib/youtube-connections/types';

export function youtubeConfig(
  configs: Record<string, string>
): GoogleConfig | null {
  if (
    !configs.google_client_id ||
    !configs.google_client_secret ||
    !process.env.CONFIG_ENCRYPTION_KEY
  )
    return null;
  return {
    clientId: configs.google_client_id,
    clientSecret: configs.google_client_secret,
  };
}
function configRequired(config: GoogleConfig | null): GoogleConfig {
  if (!config)
    throw new YoutubeAccountError(
      'not_configured',
      'YouTube authorization is not configured. Configure Google OAuth and credential encryption first.',
      503
    );
  return config;
}
const publicAccount = (r: YoutubeConnectionRow): YoutubeConnection => ({
  id: r.id,
  channelId: r.channelId,
  channelTitle: r.channelTitle,
  thumbnail: r.thumbnail,
  status: r.status as YoutubeConnection['status'],
});
export async function listYoutubeConnections(userId: string, database = db()) {
  return (
    await database
      .select()
      .from(youtubeConnection)
      .where(eq(youtubeConnection.userId, userId))
  ).map(publicAccount);
}
export async function ownedYoutubeConnection(
  userId: string,
  id: string,
  database = db()
) {
  const [row] = await database
    .select()
    .from(youtubeConnection)
    .where(
      and(eq(youtubeConnection.userId, userId), eq(youtubeConnection.id, id))
    )
    .limit(1);
  if (!row)
    throw new YoutubeAccountError(
      'account_missing',
      'Select a YouTube account connected to your workspace.',
      404
    );
  return row;
}
function randomUrlToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
async function seal(value: unknown) {
  const encrypted = await encryptSecret(JSON.stringify(value));
  if (!isEncryptedSecret(encrypted))
    throw new YoutubeAccountError(
      'not_configured',
      'Credential encryption must be configured before connecting YouTube.',
      503
    );
  return encrypted;
}
type AuthState = {
  state: string;
  verifier: string;
  userId: string;
  sessionId: string;
  expiresAt: number;
  redirectUri: string;
  returnTo: YoutubeReturnPath;
  reconnectId?: string;
};
export async function startYoutubeAuthorization(
  input: Omit<AuthState, 'state' | 'verifier' | 'expiresAt'>,
  settings: GoogleConfig | null
) {
  const config = configRequired(settings);
  if (input.reconnectId)
    await ownedYoutubeConnection(input.userId, input.reconnectId);
  const state = randomUrlToken(),
    verifier = randomUrlToken();
  const challenge = base64url(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    )
  );
  const cookie = await seal({
    ...input,
    state,
    verifier,
    expiresAt: Date.now() + 600_000,
  });
  return {
    url: authorizationUrl(config, input.redirectUri, state, challenge),
    cookie,
  };
}
export async function readYoutubeAuthorizationState(
  cookie: string,
  state: string,
  userId: string,
  sessionId: string,
  origin: string
): Promise<AuthState> {
  let value: AuthState | null = null;
  try {
    value = JSON.parse((await decryptSecret(cookie)) || 'null');
  } catch {
    /* Invalid sealed state. */
  }
  if (
    !isEncryptedSecret(cookie) ||
    !value ||
    value.state !== state ||
    value.userId !== userId ||
    value.sessionId !== sessionId ||
    value.expiresAt < Date.now() ||
    !YOUTUBE_RETURN_PATHS.includes(value.returnTo) ||
    value.redirectUri !== origin + '/api/youtube-connections/callback' ||
    typeof value.verifier !== 'string'
  )
    throw new YoutubeAccountError(
      'invalid_state',
      'Your connection request expired. Please connect YouTube again.',
      403
    );
  return value;
}
export async function finishYoutubeAuthorization(
  state: AuthState,
  code: string,
  settings: GoogleConfig | null,
  database = db()
) {
  const config = configRequired(settings);
  const result = await googleTokens(config, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: state.redirectUri,
    code_verifier: state.verifier,
  });
  const channels = await youtubeGet<{
    items?: {
      id: string;
      snippet: { title: string; thumbnails?: { default?: { url: string } } };
    }[];
  }>(
    'channels',
    { part: 'snippet', mine: 'true', maxResults: '1' },
    result.access_token!
  );
  const channel = channels.items?.[0];
  if (!channel?.id)
    throw new YoutubeAccountError(
      'channel_missing',
      'This Google account has no YouTube channel. Choose a YouTube account with a channel.'
    );
  if (state.reconnectId) {
    const original = await ownedYoutubeConnection(
      state.userId,
      state.reconnectId,
      database
    );
    if (original.channelId !== channel.id)
      throw new YoutubeAccountError(
        'wrong_channel',
        'Choose the same YouTube channel when reconnecting. Use Connect account to add another channel.'
      );
  }
  const [existing] = await database
    .select()
    .from(youtubeConnection)
    .where(
      and(
        eq(youtubeConnection.userId, state.userId),
        eq(youtubeConnection.channelId, channel.id)
      )
    )
    .limit(1);
  let previous: YoutubeTokens | null = null;
  if (existing?.credentials && existing.clientId === config.clientId) {
    try {
      previous = JSON.parse(
        (await decryptSecret(existing.credentials)) || 'null'
      );
    } catch {
      /* Re-consent supplies a new refresh token. */
    }
  }
  const refreshToken = result.refresh_token || previous?.refreshToken;
  if (!refreshToken)
    throw new YoutubeAccountError(
      'offline_missing',
      'Offline YouTube access was not granted. Connect again and allow access for automatic checks.'
    );
  const now = new Date().toISOString();
  const values = {
    channelTitle: channel.snippet.title.slice(0, 200),
    thumbnail: (channel.snippet.thumbnails?.default?.url || '').slice(0, 500),
    credentials: await seal({
      accessToken: result.access_token,
      refreshToken,
      expiresAt: Date.now() + Math.max(1, result.expires_in || 3600) * 1000,
    }),
    clientId: config.clientId,
    status: 'connected',
    updatedAt: now,
  };
  if (existing)
    await database
      .update(youtubeConnection)
      .set(values)
      .where(
        and(
          eq(youtubeConnection.id, existing.id),
          eq(youtubeConnection.userId, state.userId)
        )
      );
  else
    await database.insert(youtubeConnection).values({
      id: getUuid(),
      userId: state.userId,
      channelId: channel.id,
      createdAt: now,
      ...values,
    });
  return state.returnTo;
}
export async function disconnectYoutubeConnection(
  userId: string,
  id: string,
  database = db()
) {
  await ownedYoutubeConnection(userId, id, database);
  // Drop this connection's credentials only. Other channels and site sign-in remain independent.
  await database
    .update(youtubeConnection)
    .set({
      credentials: null,
      status: 'disconnected',
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(eq(youtubeConnection.id, id), eq(youtubeConnection.userId, userId))
    );
}
export async function youtubeAccessToken(
  userId: string,
  id: string,
  settings: GoogleConfig | null,
  database = db()
) {
  const config = configRequired(settings),
    row = await ownedYoutubeConnection(userId, id, database);
  if (
    row.status !== 'connected' ||
    !row.credentials ||
    row.clientId !== config.clientId
  )
    throw new YoutubeAccountError(
      'reconnect',
      'Reconnect this YouTube account before checking its collections.',
      403
    );
  let token: YoutubeTokens | null = null;
  try {
    token = JSON.parse((await decryptSecret(row.credentials)) || 'null');
  } catch {
    /* Never fall back to plaintext credentials. */
  }
  if (!isEncryptedSecret(row.credentials) || !token?.refreshToken)
    throw new YoutubeAccountError(
      'reconnect',
      'Reconnect this YouTube account before checking its collections.',
      403
    );
  if (token.accessToken && token.expiresAt > Date.now() + 60_000)
    return token.accessToken;
  try {
    const renewed = await googleTokens(config, {
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    });
    const credentials = await seal({
      accessToken: renewed.access_token,
      refreshToken: renewed.refresh_token || token.refreshToken,
      expiresAt: Date.now() + (renewed.expires_in || 3600) * 1000,
    });
    await database
      .update(youtubeConnection)
      .set({ credentials, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(youtubeConnection.id, id),
          eq(youtubeConnection.userId, userId),
          eq(youtubeConnection.credentials, row.credentials),
          eq(youtubeConnection.status, 'connected')
        )
      );
    const fresh = await ownedYoutubeConnection(userId, id, database);
    if (fresh.status !== 'connected')
      throw new YoutubeAccountError(
        'reconnect',
        'This YouTube account was disconnected.',
        403
      );
    return renewed.access_token!;
  } catch (error) {
    if (error instanceof YoutubeAccountError && error.code === 'reconnect')
      await database
        .update(youtubeConnection)
        .set({
          status: 'reconnect',
          credentials: null,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(youtubeConnection.id, id),
            eq(youtubeConnection.userId, userId),
            eq(youtubeConnection.credentials, row.credentials)
          )
        );
    throw error;
  }
}
