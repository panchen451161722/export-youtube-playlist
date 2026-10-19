import { and, asc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  drainYoutubeRevocations,
  enqueueYoutubeRevocation,
  removeYoutubeConnectionData,
  YOUTUBE_DATA_MAX_AGE_MS,
  YOUTUBE_OAUTH_NONCE,
  YOUTUBE_USER_DELETION,
} from '@/core/youtube-lifecycle/service';
import {
  user,
  verification,
  youtubeConnection,
  youtubeRevocation,
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
export async function listYoutubeConnections(
  userId: string,
  database = db(),
  clock = Date.now
) {
  const rows: YoutubeConnectionRow[] = await database
    .select()
    .from(youtubeConnection)
    .where(eq(youtubeConnection.userId, userId));
  const active: YoutubeConnectionRow[] = [];
  for (const row of rows) {
    const verified = Date.parse(row.verifiedAt || row.createdAt);
    if (
      row.status !== 'connected' ||
      !row.credentials ||
      !Number.isFinite(verified) ||
      clock() - verified >= YOUTUBE_DATA_MAX_AGE_MS
    ) {
      await removeYoutubeConnectionData(userId, row.id, {
        database,
        clock,
        expectedCredentials: row.credentials,
      });
    } else active.push(row);
  }
  return active.map(publicAccount);
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
  settings: GoogleConfig | null,
  database = db()
) {
  const config = configRequired(settings);
  await assertGrantAllowed(input.userId, database);
  if (input.reconnectId)
    await ownedYoutubeConnection(input.userId, input.reconnectId, database);
  const state = randomUrlToken(),
    verifier = randomUrlToken();
  const challenge = base64url(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    )
  );
  const expiresAt = Date.now() + 600_000;
  const cookie = await seal({
    ...input,
    state,
    verifier,
    expiresAt,
  });
  await database.insert(verification).select(
    database
      .select({
        id: sql`${state}`,
        identifier: sql`${YOUTUBE_OAUTH_NONCE}`,
        value: user.id,
        expiresAt: sql`${sql.param(new Date(expiresAt), verification.expiresAt)}`,
        createdAt: sql`${sql.param(new Date(), verification.createdAt)}`,
        updatedAt: sql`${sql.param(new Date(), verification.updatedAt)}`,
      })
      .from(user)
      .where(and(eq(user.id, input.userId), grantAllowed(input.userId)))
  );
  const [pending] = await database
    .select({ id: verification.id })
    .from(verification)
    .where(eq(verification.id, state))
    .limit(1);
  if (!pending) throw invalidState();
  return {
    url: authorizationUrl(config, input.redirectUri, state, challenge),
    cookie,
  };
}

function invalidState() {
  return new YoutubeAccountError(
    'invalid_state',
    'Your connection request expired. Please connect YouTube again.',
    403
  );
}
function grantAllowed(userId: string) {
  return sql`not exists (select 1 from ${verification} where ${verification.identifier} = ${YOUTUBE_USER_DELETION} and ${verification.value} = ${userId})
    and not exists (select 1 from ${youtubeRevocation} where ${youtubeRevocation.userId} = ${userId})`;
}
async function assertGrantAllowed(
  userId: string,
  database: ReturnType<typeof db>
) {
  const [pending] = await database
    .select({ id: youtubeRevocation.id })
    .from(youtubeRevocation)
    .where(eq(youtubeRevocation.userId, userId))
    .limit(1);
  if (pending)
    throw new YoutubeAccountError(
      'revocation_pending',
      'A previous Google authorization is still being revoked. Please try connecting again later.',
      409
    );
  const [owner] = await database
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.id, userId), grantAllowed(userId)))
    .limit(1);
  if (!owner) throw invalidState();
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
  await assertGrantAllowed(state.userId, database);
  const nonceCondition = and(
    eq(verification.id, state.state),
    eq(verification.identifier, YOUTUBE_OAUTH_NONCE),
    eq(verification.value, state.userId),
    gt(verification.expiresAt, new Date())
  );
  const [nonce] = await database
    .select({ id: verification.id })
    .from(verification)
    .where(nonceCondition)
    .limit(1);
  if (!nonce) throw invalidState();
  const result = await googleTokens(config, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: state.redirectUri,
    code_verifier: state.verifier,
  });
  let saved = false;
  try {
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
      verifiedAt: now,
      nextValidationAt: new Date(Date.now() + 86_400_000).toISOString(),
      validationToken: null,
    };
    const id = existing?.id || getUuid();
    const allowed = and(
      sql`exists (select 1 from ${verification} where ${nonceCondition})`,
      sql`exists (select 1 from ${user} where ${user.id} = ${state.userId})`,
      grantAllowed(state.userId)
    );
    if (existing) {
      await database
        .update(youtubeConnection)
        .set(values)
        .where(
          and(
            eq(youtubeConnection.id, existing.id),
            eq(youtubeConnection.userId, state.userId),
            allowed
          )
        );
    } else {
      await database.insert(youtubeConnection).select(
        database
          .select({
            id: sql`${id}`,
            userId: verification.value,
            channelId: sql`${channel.id}`,
            channelTitle: sql`${values.channelTitle}`,
            thumbnail: sql`${values.thumbnail}`,
            credentials: sql`${values.credentials}`,
            clientId: sql`${values.clientId}`,
            status: sql`${values.status}`,
            createdAt: sql`${now}`,
            updatedAt: sql`${now}`,
            verifiedAt: sql`${now}`,
            nextValidationAt: sql`${values.nextValidationAt}`,
            validationToken: sql`NULL`,
          })
          .from(verification)
          .where(and(nonceCondition, allowed))
      );
    }
    const [stored]: YoutubeConnectionRow[] = await database
      .select()
      .from(youtubeConnection)
      .where(
        and(
          eq(youtubeConnection.id, id),
          eq(youtubeConnection.userId, state.userId),
          eq(youtubeConnection.credentials, values.credentials)
        )
      )
      .limit(1);
    if (!stored) throw invalidState();
    saved = true;
    await database.delete(verification).where(nonceCondition);
    return state.returnTo;
  } finally {
    if (!saved) {
      const credentials = await seal({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
      });
      const id = await enqueueYoutubeRevocation(credentials, {
        database,
        userId: state.userId,
      });
      await drainYoutubeRevocations({ database, ids: [id] });
    }
  }
}
export async function disconnectYoutubeConnection(
  userId: string,
  id: string,
  database = db()
) {
  await ownedYoutubeConnection(userId, id, database);
  const result = await removeYoutubeConnectionData(userId, id, { database });
  await drainYoutubeRevocations({ database, ids: result.queuedIds });
}
export async function youtubeAccessToken(
  userId: string,
  id: string,
  settings: GoogleConfig | null,
  database = db(),
  options: {
    forceRefresh?: boolean;
    fetcher?: typeof fetch;
    clock?: () => number;
  } = {}
) {
  const clock = options.clock ?? Date.now;
  const config = configRequired(settings),
    row = await ownedYoutubeConnection(userId, id, database);
  const [deleting] = await database
    .select({ id: verification.id })
    .from(verification)
    .where(
      and(
        eq(verification.identifier, YOUTUBE_USER_DELETION),
        eq(verification.value, userId)
      )
    )
    .limit(1);
  if (deleting) throw invalidState();
  const verified = Date.parse(row.verifiedAt || row.createdAt);
  if (
    !Number.isFinite(verified) ||
    clock() - verified >= YOUTUBE_DATA_MAX_AGE_MS
  ) {
    const removed = await removeYoutubeConnectionData(userId, id, {
      database,
      expectedCredentials: row.credentials,
      clock,
    });
    await drainYoutubeRevocations({
      database,
      ids: removed.queuedIds,
      fetcher: options.fetcher,
      clock,
    });
    throw new YoutubeAccountError(
      'reconnect',
      'This YouTube connection expired. Connect again to continue.',
      403
    );
  }
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
  if (
    !options.forceRefresh &&
    token.accessToken &&
    token.expiresAt > clock() + 60_000
  )
    return token.accessToken;
  try {
    const renewed = await googleTokens(
      config,
      {
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      },
      options.fetcher
    );
    const credentials = await seal({
      accessToken: renewed.access_token,
      refreshToken: renewed.refresh_token || token.refreshToken,
      expiresAt: clock() + (renewed.expires_in || 3600) * 1000,
    });
    await database
      .update(youtubeConnection)
      .set({ credentials, updatedAt: new Date(clock()).toISOString() })
      .where(
        and(
          eq(youtubeConnection.id, id),
          eq(youtubeConnection.userId, userId),
          eq(youtubeConnection.credentials, row.credentials),
          eq(youtubeConnection.status, 'connected')
        )
      );
    const fresh = await ownedYoutubeConnection(userId, id, database);
    if (fresh.status !== 'connected' || fresh.credentials !== credentials)
      throw new YoutubeAccountError(
        'reconnect',
        'This YouTube account was disconnected.',
        403
      );
    return renewed.access_token!;
  } catch (error) {
    if (
      error instanceof YoutubeAccountError &&
      ['reconnect', 'scope_missing'].includes(error.code)
    ) {
      const removed = await removeYoutubeConnectionData(userId, id, {
        database,
        expectedCredentials: row.credentials,
        clock,
      });
      await drainYoutubeRevocations({
        database,
        ids: removed.queuedIds,
        fetcher: options.fetcher,
        clock,
      });
    }
    throw error;
  }
}

/** Runs independently of subscriptions and collection preferences. No user data in metrics. */
export async function validateYoutubeConnections(
  settings: GoogleConfig | null,
  options: {
    database?: ReturnType<typeof db>;
    clock?: () => number;
    fetcher?: typeof fetch;
    limit?: number;
  } = {}
) {
  const database = options.database ?? db(),
    clock = options.clock ?? Date.now;
  const timestamp = new Date(clock()).toISOString();
  const cutoff = new Date(clock() - YOUTUBE_DATA_MAX_AGE_MS).toISOString();
  await database
    .delete(verification)
    .where(
      and(
        or(
          eq(verification.identifier, YOUTUBE_OAUTH_NONCE),
          eq(verification.identifier, YOUTUBE_USER_DELETION)
        ),
        lte(verification.expiresAt, new Date(clock()))
      )
    );
  const due = or(
    isNull(youtubeConnection.nextValidationAt),
    lte(youtubeConnection.nextValidationAt, timestamp),
    lte(youtubeConnection.verifiedAt, cutoff),
    and(
      isNull(youtubeConnection.verifiedAt),
      lte(youtubeConnection.createdAt, cutoff)
    )
  );
  const rows: YoutubeConnectionRow[] = await database
    .select()
    .from(youtubeConnection)
    .where(due)
    .orderBy(
      sql`case when ${youtubeConnection.verifiedAt} is null then 0 else 1 end`,
      asc(youtubeConnection.verifiedAt),
      asc(youtubeConnection.nextValidationAt)
    )
    .limit(Math.min(3, Math.max(1, options.limit ?? 3)));
  const stats = { checked: 0, verified: 0, removed: 0, deferred: 0 };
  await Promise.all(
    rows.map(async (row) => {
      const condition = and(
        eq(youtubeConnection.id, row.id),
        eq(youtubeConnection.userId, row.userId),
        row.credentials === null
          ? isNull(youtubeConnection.credentials)
          : eq(youtubeConnection.credentials, row.credentials),
        row.nextValidationAt === null
          ? isNull(youtubeConnection.nextValidationAt)
          : eq(youtubeConnection.nextValidationAt, row.nextValidationAt)
      );
      // Retry failures without changing verifiedAt; a permanently failing account cannot starve others.
      const retryAt = new Date(clock() + 3_600_000).toISOString();
      const validationToken = getUuid();
      await database
        .update(youtubeConnection)
        .set({ nextValidationAt: retryAt, validationToken })
        .where(condition);
      const [claimed]: YoutubeConnectionRow[] = await database
        .select()
        .from(youtubeConnection)
        .where(
          and(
            eq(youtubeConnection.id, row.id),
            eq(youtubeConnection.validationToken, validationToken)
          )
        )
        .limit(1);
      if (!claimed || claimed.credentials !== row.credentials) return;
      const prior = Date.parse(row.verifiedAt || row.createdAt);
      if (
        row.status !== 'connected' ||
        !row.credentials ||
        !Number.isFinite(prior) ||
        clock() - prior >= YOUTUBE_DATA_MAX_AGE_MS ||
        (settings && row.clientId !== settings.clientId)
      ) {
        const removed = await removeYoutubeConnectionData(row.userId, row.id, {
          database,
          clock,
          expectedCredentials: row.credentials,
        });
        stats.removed += removed.removed;
        return;
      }
      if (!settings) {
        stats.deferred++;
        return;
      }
      stats.checked++;
      try {
        const accessToken = await youtubeAccessToken(
          row.userId,
          row.id,
          settings,
          database,
          { clock, fetcher: options.fetcher, forceRefresh: true }
        );
        const response = await youtubeGet<{
          items?: {
            id: string;
            snippet: {
              title: string;
              thumbnails?: { default?: { url: string } };
            };
          }[];
        }>(
          'channels',
          { part: 'snippet', mine: 'true', maxResults: '1' },
          accessToken,
          options.fetcher
        );
        const channel = response.items?.find(
          (item) => item.id === row.channelId
        );
        if (!channel)
          throw new YoutubeAccountError(
            'reconnect',
            'This YouTube channel is no longer authorized.',
            403
          );
        await database
          .update(youtubeConnection)
          .set({
            channelTitle: channel.snippet.title.slice(0, 200),
            thumbnail: (channel.snippet.thumbnails?.default?.url || '').slice(
              0,
              500
            ),
            verifiedAt: timestamp,
            updatedAt: timestamp,
            nextValidationAt: new Date(clock() + 86_400_000).toISOString(),
            validationToken: null,
          })
          .where(
            and(
              eq(youtubeConnection.id, row.id),
              eq(youtubeConnection.userId, row.userId),
              eq(youtubeConnection.status, 'connected'),
              eq(youtubeConnection.validationToken, validationToken)
            )
          );
        stats.verified++;
      } catch (error) {
        if (
          error instanceof YoutubeAccountError &&
          ['reconnect', 'scope_missing', 'account_missing'].includes(error.code)
        ) {
          // The token-refresh path may already have removed it. Read the current row
          // and never delete a grant replaced by an explicit reconnect in the meantime.
          const [fresh]: YoutubeConnectionRow[] = await database
            .select()
            .from(youtubeConnection)
            .where(
              and(
                eq(youtubeConnection.id, row.id),
                eq(youtubeConnection.validationToken, validationToken)
              )
            )
            .limit(1);
          if (fresh)
            stats.removed += (
              await removeYoutubeConnectionData(row.userId, row.id, {
                database,
                clock,
                expectedCredentials: fresh.credentials,
              })
            ).removed;
          else stats.removed++;
        } else stats.deferred++;
      }
    })
  );
  return stats;
}
