import { and, asc, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  guardCollection,
  guardDelivery,
  guardWorkspace,
  verification,
  youtubeConnection,
  youtubeRevocation,
  type YoutubeConnectionRow,
  type YoutubeRevocationRow,
} from '@/config/db/schema';
import { decryptSecret, isEncryptedSecret } from '@/lib/crypto';
import { getUuid } from '@/lib/hash';
import { revokeGoogleToken } from '@/lib/youtube-connections/google';

export const YOUTUBE_OAUTH_NONCE = 'youtube-oauth';
export const YOUTUBE_USER_DELETION = 'youtube-delete-user';
export const YOUTUBE_DATA_MAX_AGE_MS = 30 * 86_400_000;
const REVOCATION_MAX_AGE_MS = 7 * 86_400_000;
const LEASE_MS = 60_000;
type Options = { database?: ReturnType<typeof db>; clock?: () => number };

/** D1/libSQL support atomic batch; the TCP dialects use a transaction. */
async function atomic(
  database: ReturnType<typeof db>,
  operations: ((d: ReturnType<typeof db>) => any)[]
) {
  if (typeof database.batch === 'function')
    await database.batch(operations.map((operation) => operation(database)));
  else
    await database.transaction(async (tx: ReturnType<typeof db>) => {
      for (const operation of operations) await operation(tx);
    });
}

/** Called only after the connection is fenced/deleted, so no new guarded insert can pass. */
async function removeConnectionCollections(
  userId: string,
  connectionId: string,
  database: ReturnType<typeof db>
) {
  // Summaries omit snapshots/missing metadata. Page them by ID so neither a large
  // owner history nor many 1.5 MB documents are loaded into Worker memory at once.
  let cursor: string | undefined;
  for (;;) {
    const rows: { id: string; summary: string }[] = await database
      .select({ id: guardCollection.id, summary: guardCollection.summary })
      .from(guardCollection)
      .where(
        and(
          eq(guardCollection.userId, userId),
          cursor ? gt(guardCollection.id, cursor) : undefined
        )
      )
      .orderBy(asc(guardCollection.id))
      .limit(50);
    if (!rows.length) break;
    cursor = rows[rows.length - 1].id;
    const batch: string[] = [];
    for (const row of rows) {
      let linked: boolean | undefined;
      try {
        const summary = JSON.parse(row.summary);
        if (typeof summary.connectionId === 'string')
          linked = summary.connectionId === connectionId;
        else if (['playlist', 'channel'].includes(summary.source))
          linked = false;
      } catch {
        /* Legacy summaries may not contain source/connection metadata. */
      }
      if (linked === undefined) {
        // Read and parse only one legacy document, release it before the next row.
        linked = await legacyCollectionUsesConnection(
          row.id,
          userId,
          connectionId,
          database
        );
      }
      if (linked) batch.push(row.id);
    }
    if (!batch.length) continue;
    // Explicit child deletion also works without historical FK enforcement.
    // Each page contributes at most 50 IDs, keeping D1 bind counts bounded.
    await atomic(database, [
      (d) =>
        d
          .delete(guardDelivery)
          .where(
            and(
              eq(guardDelivery.userId, userId),
              inArray(guardDelivery.collectionId, batch)
            )
          ),
      (d) =>
        d
          .delete(guardCollection)
          .where(
            and(
              eq(guardCollection.userId, userId),
              inArray(guardCollection.id, batch)
            )
          ),
    ]);
  }
}

async function legacyCollectionUsesConnection(
  id: string,
  userId: string,
  connectionId: string,
  database: ReturnType<typeof db>
) {
  const [row]: { document: string }[] = await database
    .select({ document: guardCollection.document })
    .from(guardCollection)
    .where(and(eq(guardCollection.id, id), eq(guardCollection.userId, userId)))
    .limit(1);
  try {
    return !!row && JSON.parse(row.document).connectionId === connectionId;
  } catch {
    return false;
  }
}

/** Persist a token for bounded revocation retry (including an abandoned OAuth callback). */
export async function enqueueYoutubeRevocation(
  credentials: string,
  options: Options & { userId?: string | null; connectionId?: string } = {}
) {
  const database = options.database ?? db();
  if (!isEncryptedSecret(credentials))
    throw new Error('Revocation credentials must be encrypted');
  const now = new Date((options.clock ?? Date.now)()).toISOString();
  const id = getUuid();
  await database.insert(youtubeRevocation).values({
    id,
    userId: options.userId ?? null,
    connectionId: options.connectionId ?? id,
    credentials,
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
  });
  return id;
}

/**
 * Queue and delete in one atomic unit. Cleanup after that unit can be recovered
 * from the durable queue if this worker stops. A stale refresh cannot delete a
 * newly replaced grant when expectedCredentials is supplied.
 */
export async function removeYoutubeConnectionData(
  userId: string,
  id: string,
  options: Options & { expectedCredentials?: string | null } = {}
) {
  const database = options.database ?? db();
  const now = new Date((options.clock ?? Date.now)()).toISOString();
  const [row]: YoutubeConnectionRow[] = await database
    .select()
    .from(youtubeConnection)
    .where(
      and(eq(youtubeConnection.userId, userId), eq(youtubeConnection.id, id))
    )
    .limit(1);
  if (
    !row ||
    (options.expectedCredentials !== undefined &&
      row.credentials !== options.expectedCredentials)
  )
    return { removed: 0, queuedIds: [] as string[] };
  const condition = and(
    eq(youtubeConnection.userId, userId),
    eq(youtubeConnection.id, id),
    options.expectedCredentials === undefined
      ? undefined
      : row.credentials === null
        ? isNull(youtubeConnection.credentials)
        : eq(youtubeConnection.credentials, row.credentials)
  );
  const queueId = getUuid();
  await atomic(database, [
    (d) =>
      d.insert(youtubeRevocation).select(
        d
          .select({
            id: sql`${queueId}`,
            userId: youtubeConnection.userId,
            connectionId: youtubeConnection.id,
            credentials: sql`coalesce(${youtubeConnection.credentials}, '')`,
            attempts: sql`0`,
            nextAttemptAt: sql`${now}`,
            leaseToken: sql`NULL`,
            leaseExpiresAt: sql`NULL`,
            createdAt: sql`${now}`,
          })
          .from(youtubeConnection)
          .where(condition)
      ),
    (d) => d.delete(youtubeConnection).where(condition),
    // Invalidate every pending callback for this user, including another tab's initial connection.
    (d) =>
      d
        .delete(verification)
        .where(
          and(
            eq(verification.identifier, YOUTUBE_OAUTH_NONCE),
            eq(verification.value, userId)
          )
        ),
  ]);
  const [queued] = await database
    .select({ id: youtubeRevocation.id })
    .from(youtubeRevocation)
    .where(eq(youtubeRevocation.id, queueId))
    .limit(1);
  if (!queued) return { removed: 0, queuedIds: [] as string[] };
  await removeConnectionCollections(userId, id, database);
  return { removed: 1, queuedIds: [queueId] };
}

/** beforeDelete hook: includes public collections and does not rely on database cascades. */
export async function removeUserYoutubeData(
  userId: string,
  options: Options = {}
) {
  const database = options.database ?? db();
  const now = (options.clock ?? Date.now)();
  await database.insert(verification).values({
    id: getUuid(),
    identifier: YOUTUBE_USER_DELETION,
    value: userId,
    expiresAt: new Date(now + 86_400_000),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });
  const rows: { id: string }[] = await database
    .select({ id: youtubeConnection.id })
    .from(youtubeConnection)
    .where(eq(youtubeConnection.userId, userId));
  const queuedIds: string[] = [];
  for (const row of rows) {
    const result = await removeYoutubeConnectionData(userId, row.id, options);
    queuedIds.push(...result.queuedIds);
  }
  await atomic(database, [
    (d) =>
      d
        .delete(verification)
        .where(
          and(
            eq(verification.identifier, YOUTUBE_OAUTH_NONCE),
            eq(verification.value, userId)
          )
        ),
    (d) => d.delete(guardDelivery).where(eq(guardDelivery.userId, userId)),
    (d) => d.delete(guardCollection).where(eq(guardCollection.userId, userId)),
    (d) => d.delete(guardWorkspace).where(eq(guardWorkspace.userId, userId)),
    (d) =>
      d
        .update(youtubeRevocation)
        .set({ userId: null })
        .where(eq(youtubeRevocation.userId, userId)),
  ]);
  return { removed: queuedIds.length, queuedIds };
}

/**
 * No PII in return values. Expired token erasure is independent of drain limits.
 * Targeted account-deletion work attempts every requested grant in batches of
 * three; ordinary scheduled work claims at most three rows per invocation.
 */
export async function drainYoutubeRevocations(
  options: Options & {
    fetcher?: typeof fetch;
    limit?: number;
    ids?: string[];
  } = {}
) {
  const database = options.database ?? db(),
    clock = options.clock ?? Date.now;
  // Privacy retention must not depend on backlog size, IDs requested by a caller,
  // future retry dates, or active leases. Keep the row for recoverable local cleanup.
  await database
    .update(youtubeRevocation)
    .set({ credentials: '' })
    .where(
      lte(
        youtubeRevocation.createdAt,
        new Date(clock() - REVOCATION_MAX_AGE_MS).toISOString()
      )
    );
  const stats = { attempted: 0, revoked: 0, retrying: 0, expired: 0 };
  const targets: (string[] | undefined)[] = [];
  if (options.ids) {
    const ids = [...new Set(options.ids)];
    for (let i = 0; i < ids.length; i += 3) targets.push(ids.slice(i, i + 3));
  } else targets.push(undefined);
  for (const ids of targets) {
    const now = new Date(clock()).toISOString();
    const eligible = and(
      lte(youtubeRevocation.nextAttemptAt, now),
      or(
        isNull(youtubeRevocation.leaseExpiresAt),
        lte(youtubeRevocation.leaseExpiresAt, now)
      ),
      ids ? inArray(youtubeRevocation.id, ids) : undefined
    );
    const rows: YoutubeRevocationRow[] = await database
      .select()
      .from(youtubeRevocation)
      .where(eligible)
      .orderBy(asc(youtubeRevocation.nextAttemptAt))
      .limit(ids ? 3 : Math.min(3, Math.max(1, options.limit ?? 3)));
    await Promise.all(
      rows.map(async (row) => {
        const lease = getUuid();
        await database
          .update(youtubeRevocation)
          .set({
            leaseToken: lease,
            leaseExpiresAt: new Date(clock() + LEASE_MS).toISOString(),
            attempts: row.attempts + 1,
          })
          .where(
            and(
              eq(youtubeRevocation.id, row.id),
              eq(youtubeRevocation.attempts, row.attempts),
              eligible
            )
          );
        const [claimed] = await database
          .select({ leaseToken: youtubeRevocation.leaseToken })
          .from(youtubeRevocation)
          .where(eq(youtubeRevocation.id, row.id))
          .limit(1);
        if (claimed?.leaseToken !== lease) return;
        const owned = and(
          eq(youtubeRevocation.id, row.id),
          eq(youtubeRevocation.leaseToken, lease)
        );
        const expired =
          clock() - Date.parse(row.createdAt) >= REVOCATION_MAX_AGE_MS;
        if (expired)
          await database
            .update(youtubeRevocation)
            .set({ credentials: '' })
            .where(owned);
        try {
          if (row.userId)
            await removeConnectionCollections(
              row.userId,
              row.connectionId,
              database
            );
          if (expired) {
            await database.delete(youtubeRevocation).where(owned);
            stats.expired++;
            return;
          }
          if (row.credentials) {
            const value = isEncryptedSecret(row.credentials)
              ? await decryptSecret(row.credentials)
              : null;
            const tokens = value ? JSON.parse(value) : null;
            const token = tokens?.refreshToken || tokens?.accessToken;
            if (!token || typeof token !== 'string')
              throw new Error('Encrypted credential unavailable');
            stats.attempted++;
            await revokeGoogleToken(token, options.fetcher);
          }
          await database.delete(youtubeRevocation).where(owned);
          stats.revoked++;
        } catch {
          const delay = Math.min(
            6 * 3_600_000,
            300_000 * 2 ** Math.min(row.attempts, 7)
          );
          const deadline = Date.parse(row.createdAt) + REVOCATION_MAX_AGE_MS;
          await database
            .update(youtubeRevocation)
            .set({
              leaseToken: null,
              leaseExpiresAt: null,
              nextAttemptAt: new Date(
                Math.min(clock() + delay, deadline)
              ).toISOString(),
            })
            .where(owned);
          stats.retrying++;
        }
      })
    );
  }
  return stats;
}
