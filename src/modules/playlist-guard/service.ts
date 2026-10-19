import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  notExists,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/core/db';
import type { EmailSendResult } from '@/core/email';
import {
  activeReviewGrants,
  reviewAccessConfiguration,
  withReviewAccess,
} from '@/core/playlist-guard/review-access';
import { YOUTUBE_USER_DELETION } from '@/core/youtube-lifecycle/service';
import {
  guardCollection,
  guardDelivery,
  guardWorkspace,
  subscription,
  user,
  verification,
  youtubeConnection,
  type GuardCollectionRow,
  type GuardDeliveryRow,
  type GuardWorkspaceRow,
  type Subscription,
} from '@/config/db/schema';
import {
  GUARD_PLANS,
  GUARD_SCAN_LIMIT,
  GUARD_SNAPSHOT_LIMIT,
} from '@/config/guard-plans';
import { getUuid } from '@/lib/hash';
import {
  notificationPayload,
  type GuardNotificationPayload,
} from '@/lib/playlist-guard/notifications';
import {
  GUARD_METADATA_RETENTION_MS,
  isFreshGuardMetadata,
  pruneGuardMetadata,
} from '@/lib/playlist-guard/retention';
import {
  needsYoutubeAccount,
  type GuardCollection,
  type GuardCollectionDetail,
  type GuardCreateInput,
  type GuardEntitlement,
  type GuardFrequency,
  type GuardItem,
  type GuardMissingItem,
  type GuardSnapshot,
} from '@/lib/playlist-guard/types';
import { YoutubeAccountError } from '@/lib/youtube-connections/google';

const DAY = 86_400_000;
const LEASE_MS = 180_000;
const MAX_DOCUMENT_BYTES = 1_500_000;
export class GuardError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}
export type GuardScan = {
  items: GuardItem[];
  complete: boolean;
  sourceTitle?: string;
};
type RetainedNotificationPayload = GuardNotificationPayload & {
  /** Earliest retrieval represented anywhere in this copied payload, including its name. */
  metadataCollectedAt: string;
};
function retainedPayload(
  value: string,
  now: number
): RetainedNotificationPayload | undefined {
  try {
    const payload = JSON.parse(value) as RetainedNotificationPayload;
    if (
      isFreshGuardMetadata(payload.snapshot?.createdAt, now) &&
      isFreshGuardMetadata(payload.metadataCollectedAt, now)
    )
      return payload;
  } catch {
    /* Unproven legacy or corrupt queued data must not be retained or sent. */
  }
  return undefined;
}

export type GuardCleanupCursor = {
  /** null means this stream is finished; omit the entire cursor to start a sweep. */
  collectionId: string | null;
  deliveryId: string | null;
};

function scannedChannelName(
  previous: GuardCollectionDetail,
  sourceTitle: string
) {
  if (previous.sourceTitle)
    return previous.name === previous.sourceTitle ? sourceTitle : previous.name;
  // Upgrade names generated before channel metadata was saved, including old /playlists URLs.
  let parts: string[] = [];
  try {
    parts = new URL(previous.url).pathname.split('/').filter(Boolean);
  } catch {
    /* Keep custom names. */
  }
  const identifiers = [
    parts[0],
    parts[1],
    'playlists',
    'videos',
    'shorts',
    'streams',
    'featured',
    'about',
    'community',
  ].filter(Boolean);
  const generated = [
    'Public channel',
    'YouTube Channel',
    'YouTube channel',
    '公开频道',
    'YouTube 频道',
  ].some((prefix) =>
    identifiers.some(
      (identifier) =>
        previous.name === `${prefix} · ${identifier}`.slice(0, 100)
    )
  );
  return generated ? sourceTitle : previous.name;
}
export function nextRun(frequency: GuardFrequency, now: number): string {
  const interval = {
    daily: DAY,
    weekly: 7 * DAY,
    biweekly: 14 * DAY,
    monthly: 30 * DAY,
  }[frequency];
  return new Date(now + interval).toISOString();
}

export function entitlementFor(
  rows: Subscription[],
  _workspace: GuardWorkspaceRow | undefined,
  now: number
): GuardEntitlement {
  // Only server-created, active provider subscriptions with an unexpired period grant access.
  const eligible = rows.filter(
    (row) =>
      !row.deletedAt &&
      ['active', 'pending_cancel', 'trialing'].includes(row.status) &&
      row.subscriptionId &&
      row.paymentProvider &&
      row.currentPeriodEnd &&
      row.currentPeriodEnd.getTime() > now &&
      (!row.currentPeriodStart || row.currentPeriodStart.getTime() <= now)
  );
  for (const plan of [...GUARD_PLANS].reverse()) {
    const row = eligible.find(
      (row) =>
        row.productId === `guard_${plan.id}_yearly` ||
        row.productId === `guard_${plan.id}_monthly`
    );
    if (!row) continue;
    let trialing = row.status === 'trialing';
    if (row.status === 'pending_cancel') {
      try {
        trialing =
          JSON.parse(row.subscriptionResult || '{}').status === 'trialing';
      } catch {
        /* Older subscriptions have no provider snapshot. */
      }
    }
    return {
      plan: plan.id,
      limit: plan.collectionLimit,
      trialEndsAt: trialing ? row.currentPeriodEnd!.toISOString() : null,
      canStartTrial: false,
    };
  }
  // Legacy no-card workspace trials are retained as records, never as access grants.
  return { plan: 'free', limit: 0, trialEndsAt: null, canStartTrial: false };
}

/** A complete scan tracks unique videos; a disappearing video keeps its last known metadata. */
export function applyScan(
  previous: GuardCollectionDetail,
  scan: GuardScan,
  now: number
): GuardCollectionDetail {
  if (!scan.complete || scan.items.length > GUARD_SCAN_LIMIT)
    throw new GuardError(
      'incomplete_scan',
      'This source exceeds the 500-item limit or returned incomplete data. The previous snapshot was preserved.',
      422
    );
  previous = pruneGuardMetadata(previous, now);
  const items = [
    ...new Map(scan.items.map((item) => [item.id, item])).values(),
  ];
  const previousItems = previous.snapshots[0]?.items ?? [];
  const currentIds = new Set(items.map((item) => item.id));
  const oldIds = new Set(previousItems.map((item) => item.id));
  const missingIds = new Set(previous.missing.map((item) => item.id));
  const returnedOrNew = previous.snapshots.length
    ? items.filter((item) => !oldIds.has(item.id))
    : [];
  const removed = previousItems.filter((item) => !currentIds.has(item.id));
  const missingById = new Map(
    previous.missing
      .filter((item) => !currentIds.has(item.id))
      .map((item) => [item.id, item])
  );
  const timestamp = new Date(now).toISOString();
  for (const item of removed)
    missingById.set(item.id, {
      ...item,
      missingSince: timestamp,
      lastSeenAt: previous.snapshots[0].createdAt,
    });
  const missing: GuardMissingItem[] = [...missingById.values()]
    .sort((a, b) => b.missingSince.localeCompare(a.missingSince))
    .slice(0, GUARD_SCAN_LIMIT);
  const snapshot: GuardSnapshot = {
    id: getUuid(),
    createdAt: timestamp,
    itemCount: items.length,
    added: returnedOrNew.filter((item) => !missingIds.has(item.id)).length,
    removed: removed.length,
    restored: returnedOrNew.filter((item) => missingIds.has(item.id)).length,
    items,
  };
  const sourceTitle =
    previous.source === 'channel'
      ? scan.sourceTitle?.trim().slice(0, 100)
      : undefined;
  const result = {
    ...previous,
    ...(sourceTitle
      ? {
          sourceTitle,
          sourceTitleFetchedAt: timestamp,
          name: scannedChannelName(previous, sourceTitle),
        }
      : {}),
    snapshots: [snapshot, ...previous.snapshots].slice(0, GUARD_SNAPSHOT_LIMIT),
    missing,
    itemCount: items.length,
    missingCount: missing.length,
    runCount: previous.runCount + 1,
    lastSyncedAt: timestamp,
    nextSyncAt: previous.enabled ? nextRun(previous.frequency, now) : null,
    lastError: null,
  };
  // D1 has a 2 MB row limit. Drop oldest historical snapshots before that boundary.
  while (
    new TextEncoder().encode(JSON.stringify(result)).length >
      MAX_DOCUMENT_BYTES &&
    result.snapshots.length > 1
  )
    result.snapshots.pop();
  if (
    new TextEncoder().encode(JSON.stringify(result)).length > MAX_DOCUMENT_BYTES
  )
    throw new GuardError(
      'snapshot_too_large',
      'This snapshot is too large to store. The previous snapshot was preserved.',
      422
    );
  return result;
}

function isConflict(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.message} ${String(error.cause ?? '')}`
      : String(error);
  return /unique|duplicate|constraint.*failed/i.test(message);
}
function summaryOf(document: GuardCollectionDetail): string {
  const { snapshots: _snapshots, missing: _missing, ...summary } = document;
  return JSON.stringify(summary);
}
function documentOf(row: GuardCollectionRow): GuardCollectionDetail {
  return normalizeLegacySchedule(
    JSON.parse(row.document) as GuardCollectionDetail
  );
}

/** Older saved collections used hourly checks. Retire that cadence without changing other preferences. */
function normalizeLegacySchedule<T extends GuardCollection>(collection: T): T {
  if ((collection.frequency as string) !== 'hourly') return collection;
  const daily = { ...collection, frequency: 'daily' as const };
  if (
    daily.enabled &&
    daily.lastSyncedAt &&
    daily.nextSyncAt &&
    !daily.lastError
  ) {
    const earliest = Date.parse(daily.lastSyncedAt) + DAY;
    if (earliest > Date.parse(daily.nextSyncAt))
      daily.nextSyncAt = new Date(earliest).toISOString();
  }
  return daily;
}

/** Inject a database and clock for integration tests. No cross-module dependencies or network I/O. */
export function createGuardStore(
  database: ReturnType<typeof db> = db(),
  clock: () => number = Date.now,
  reviewConfiguration: () => unknown = reviewAccessConfiguration
) {
  const retainedDocument = (row: GuardCollectionRow) =>
    pruneGuardMetadata(documentOf(row), clock());

  function activeOwnerPredicate(userId: string) {
    return and(
      exists(
        database.select({ id: user.id }).from(user).where(eq(user.id, userId))
      ),
      notExists(
        database
          .select({ id: verification.id })
          .from(verification)
          .where(
            and(
              eq(verification.identifier, YOUTUBE_USER_DELETION),
              eq(verification.value, userId),
              gt(verification.expiresAt, new Date(clock()))
            )
          )
      )
    );
  }

  function connectionPredicate(
    userId: string,
    collection: Pick<GuardCollection, 'source' | 'connectionId'>
  ) {
    if (!needsYoutubeAccount(collection.source))
      return activeOwnerPredicate(userId);
    if (!collection.connectionId) return sql`1 = 0`;
    return and(
      activeOwnerPredicate(userId),
      exists(
        database
          .select({ id: youtubeConnection.id })
          .from(youtubeConnection)
          .where(
            and(
              eq(youtubeConnection.id, collection.connectionId),
              eq(youtubeConnection.userId, userId),
              eq(youtubeConnection.status, 'connected'),
              isNotNull(youtubeConnection.credentials),
              ne(youtubeConnection.credentials, ''),
              gt(
                youtubeConnection.verifiedAt,
                new Date(clock() - GUARD_METADATA_RETENTION_MS).toISOString()
              ),
              lte(youtubeConnection.verifiedAt, new Date(clock()).toISOString())
            )
          )
      )
    );
  }

  async function assertConnected(
    userId: string,
    collection: Pick<GuardCollection, 'source' | 'connectionId'>
  ) {
    const [owner] = await database
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.id, userId), connectionPredicate(userId, collection)))
      .limit(1);
    if (!owner)
      throw new GuardError(
        'connection_unavailable',
        needsYoutubeAccount(collection.source)
          ? 'Reconnect your YouTube account before accessing this collection.'
          : 'This account is unavailable or being deleted.',
        403
      );
  }

  async function deleteRows(userId: string, id: string, version?: number) {
    const predicate = and(
      eq(guardCollection.id, id),
      eq(guardCollection.userId, userId),
      version === undefined ? undefined : eq(guardCollection.version, version)
    );
    const deliveries = (connection: typeof database) =>
      connection
        .delete(guardDelivery)
        .where(
          and(
            eq(guardDelivery.userId, userId),
            eq(guardDelivery.collectionId, id),
            exists(
              connection
                .select({ id: guardCollection.id })
                .from(guardCollection)
                .where(predicate)
            )
          )
        );
    const collection = (connection: typeof database) =>
      connection.delete(guardCollection).where(predicate);
    if (typeof database.batch === 'function')
      await database.batch([deliveries(database), collection(database)]);
    else
      await database.transaction(async (tx: typeof database) => {
        await deliveries(tx);
        await collection(tx);
      });
  }
  async function rowFor(
    userId: string,
    id: string
  ): Promise<GuardCollectionRow> {
    const [row] = await database
      .select()
      .from(guardCollection)
      .where(
        and(
          eq(guardCollection.id, id),
          eq(guardCollection.userId, userId),
          isNull(guardCollection.deletedAt)
        )
      )
      .limit(1);
    if (!row) throw new GuardError('not_found', 'Collection not found.', 404);
    return row;
  }
  async function entitlement(userId: string) {
    const [workspaces, subscriptions, owners] = await Promise.all([
      database
        .select()
        .from(guardWorkspace)
        .where(eq(guardWorkspace.userId, userId))
        .limit(1),
      database
        .select()
        .from(subscription)
        .where(eq(subscription.userId, userId)),
      database
        .select({ email: user.email, emailVerified: user.emailVerified })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1),
    ]);
    const now = clock();
    return withReviewAccess(
      entitlementFor(subscriptions, workspaces[0], now),
      owners[0],
      reviewConfiguration(),
      now
    );
  }

  // Recheck quota in the write itself: a stale verified-email lookup must not
  // authorize a reviewer after their address or verification state changes.
  function quotaPredicate(userId: string, slot: number | null) {
    if (slot === null || slot < 0) return sql`1 = 0`;
    const now = clock();
    const products = GUARD_PLANS.filter(
      (plan) => plan.collectionLimit > slot
    ).flatMap((plan) => [
      `guard_${plan.id}_monthly`,
      `guard_${plan.id}_yearly`,
    ]);
    const paid = products.length
      ? exists(
          database
            .select({ id: subscription.id })
            .from(subscription)
            .where(
              and(
                eq(subscription.userId, userId),
                isNull(subscription.deletedAt),
                inArray(subscription.status, [
                  'active',
                  'pending_cancel',
                  'trialing',
                ]),
                isNotNull(subscription.subscriptionId),
                ne(subscription.subscriptionId, ''),
                isNotNull(subscription.paymentProvider),
                ne(subscription.paymentProvider, ''),
                gt(subscription.currentPeriodEnd, new Date(now)),
                or(
                  isNull(subscription.currentPeriodStart),
                  lte(subscription.currentPeriodStart, new Date(now))
                ),
                inArray(subscription.productId, products)
              )
            )
        )
      : sql`1 = 0`;
    const emails = activeReviewGrants(reviewConfiguration(), now)
      .filter((grant) => grant.limit > slot)
      .map((grant) => grant.email);
    const review = emails.length
      ? exists(
          database
            .select({ id: user.id })
            .from(user)
            .where(
              and(
                eq(user.id, userId),
                eq(user.emailVerified, true),
                inArray(sql`lower(trim(${user.email}))`, emails)
              )
            )
        )
      : sql`1 = 0`;
    return or(paid, review);
  }
  async function list(userId: string): Promise<GuardCollection[]> {
    // Keep bulky documents out of the list query; at most one is held while pruning.
    const rows: { id: string }[] = await database
      .select({ id: guardCollection.id })
      .from(guardCollection)
      .where(
        and(
          eq(guardCollection.userId, userId),
          isNull(guardCollection.deletedAt)
        )
      )
      .orderBy(asc(guardCollection.createdAt));
    const collections: GuardCollection[] = [];
    for (const row of rows) {
      try {
        const document = retainedDocument(await rowFor(userId, row.id));
        await assertConnected(userId, document);
        collections.push(JSON.parse(summaryOf(document)) as GuardCollection);
      } catch (error) {
        if (
          error instanceof GuardError &&
          ['connection_unavailable', 'not_found'].includes(error.code)
        )
          continue;
        throw error;
      }
    }
    return collections;
  }

  async function detail(userId: string, id: string) {
    const document = retainedDocument(await rowFor(userId, id));
    await assertConnected(userId, document);
    const [delivery]: GuardDeliveryRow[] = await database
      .select()
      .from(guardDelivery)
      .where(
        and(
          eq(guardDelivery.userId, userId),
          eq(guardDelivery.collectionId, id)
        )
      )
      .orderBy(desc(guardDelivery.createdAt))
      .limit(1);
    return {
      ...document,
      delivery: delivery
        ? {
            status: delivery.status as NonNullable<
              GuardCollectionDetail['delivery']
            >['status'],
            attempts: delivery.attempts,
            createdAt: delivery.createdAt,
            sentAt: delivery.sentAt,
            nextAttemptAt: ['pending', 'sending'].includes(delivery.status)
              ? delivery.nextAttemptAt
              : null,
            lastError: delivery.lastError,
          }
        : null,
    };
  }
  async function create(
    userId: string,
    input: GuardCreateInput,
    sourceKey: string
  ) {
    await assertConnected(userId, input);
    const access = await entitlement(userId);
    if (!access.limit)
      throw new GuardError(
        'plan_required',
        'Start your trial or choose a plan to monitor collections.',
        403
      );
    const id = getUuid();
    const createdAt = new Date(clock()).toISOString();
    const document: GuardCollectionDetail = {
      ...input,
      notifyRestored: input.notifyRestored ?? true,
      id,
      enabled: true,
      createdAt,
      lastSyncedAt: null,
      nextSyncAt: createdAt,
      lastError: null,
      itemCount: 0,
      missingCount: 0,
      runCount: 0,
      snapshots: [],
      missing: [],
    };
    // Unique (user, slot) is the quota reservation. Concurrent requests cannot overbook it.
    for (let slot = 0; slot < access.limit; slot++) {
      try {
        const values = {
          id,
          userId,
          slot,
          sourceKey,
          document: JSON.stringify(document),
          summary: summaryOf(document),
          createdAt,
          nextSyncAt: createdAt,
          enabled: true,
        };
        // Ownership, deletion marker and grant checks share one SQL statement.
        // User deletion or revocation cannot race a new orphan insertion.
        await database.insert(guardCollection).select(
          database
            .select({
              id: sql`${id}`,
              userId: sql`${userId}`,
              slot: sql`${slot}`,
              sourceKey: sql`${sourceKey}`,
              document: sql`${values.document}`,
              summary: sql`${values.summary}`,
              version: sql`0`,
              enabled: sql`true`,
              nextSyncAt: sql`${createdAt}`,
              leaseToken: sql`NULL`,
              leaseExpiresAt: sql`NULL`,
              lastAttemptAt: sql`NULL`,
              createdAt: sql`${createdAt}`,
              deletedAt: sql`NULL`,
            })
            .from(user)
            .where(
              and(
                eq(user.id, userId),
                connectionPredicate(userId, input),
                quotaPredicate(userId, slot)
              )
            )
        );
        // A zero-row insert means the grant was removed after the precheck.
        await rowFor(userId, id);
        return document;
      } catch (error) {
        if (!isConflict(error)) throw error;
        const existing = await database
          .select({ id: guardCollection.id })
          .from(guardCollection)
          .where(
            and(
              eq(guardCollection.userId, userId),
              eq(guardCollection.sourceKey, sourceKey),
              isNull(guardCollection.deletedAt)
            )
          )
          .limit(1);
        if (existing.length)
          throw new GuardError(
            'duplicate_source',
            'This source is already in your collections.',
            409
          );
      }
    }
    throw new GuardError(
      'collection_limit',
      'Your collection limit is reached. Remove a collection or upgrade your plan.',
      403
    );
  }
  async function assertAccess(userId: string, row: GuardCollectionRow) {
    const access = await entitlement(userId);
    if (row.slot === null || row.slot >= access.limit)
      throw new GuardError(
        'plan_required',
        'This collection is outside your current plan limit. Its saved snapshots remain available.',
        403
      );
  }
  async function update(
    userId: string,
    id: string,
    patch: Partial<
      Pick<
        GuardCollectionDetail,
        | 'name'
        | 'enabled'
        | 'frequency'
        | 'notifyMissing'
        | 'notifyAdded'
        | 'notifyRestored'
        | 'emailDelivery'
      >
    >
  ) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const row = await rowFor(userId, id);
      if (patch.enabled === true) await assertAccess(userId, row);
      const document = { ...retainedDocument(row), ...patch };
      await assertConnected(userId, document);
      if (
        row.leaseToken &&
        row.leaseExpiresAt &&
        row.leaseExpiresAt > new Date(clock()).toISOString()
      )
        throw new GuardError(
          'sync_busy',
          'A sync is running. Try again shortly.',
          409
        );
      document.nextSyncAt = document.enabled
        ? nextRun(document.frequency, clock())
        : null;
      const token = getUuid();
      // Compare-and-swap + token readback works even with MySQL's returning compatibility shim.
      await database
        .update(guardCollection)
        .set({
          document: JSON.stringify(document),
          summary: summaryOf(document),
          version: row.version + 1,
          enabled: document.enabled,
          nextSyncAt: document.nextSyncAt,
          leaseToken: token,
          leaseExpiresAt: new Date(clock()).toISOString(),
        })
        .where(
          and(
            eq(guardCollection.id, id),
            eq(guardCollection.userId, userId),
            eq(guardCollection.version, row.version),
            connectionPredicate(userId, document),
            patch.enabled === true
              ? quotaPredicate(userId, row.slot)
              : undefined,
            isNull(guardCollection.deletedAt),
            or(
              isNull(guardCollection.leaseExpiresAt),
              lte(
                guardCollection.leaseExpiresAt,
                new Date(clock()).toISOString()
              )
            )
          )
        );
      const fresh = await rowFor(userId, id);
      if (fresh.leaseToken === token) return retainedDocument(fresh);
    }
    throw new GuardError(
      'conflict',
      'Collection changed while saving. Please try again.',
      409
    );
  }
  async function remove(userId: string, id: string) {
    await rowFor(userId, id);
    await deleteRows(userId, id);
    return { id };
  }
  async function sync(
    userId: string,
    id: string,
    fetchScan: (
      collection: GuardCollectionDetail,
      ownerId: string
    ) => Promise<GuardScan>,
    options: { scheduled?: boolean; emailAvailable?: boolean } = {}
  ) {
    const row = await rowFor(userId, id);
    await assertAccess(userId, row);
    const now = clock();
    const timestamp = new Date(now).toISOString();
    const document = retainedDocument(row);
    await assertConnected(userId, document);
    if (!document.enabled)
      throw new GuardError(
        'paused',
        'Resume this collection before syncing.',
        409
      );
    if (row.lastAttemptAt && Date.parse(row.lastAttemptAt) > now - 60_000)
      throw new GuardError(
        'sync_rate_limit',
        'Please wait one minute before syncing this collection again.',
        429
      );
    const token = getUuid();
    await database
      .update(guardCollection)
      .set({
        leaseToken: token,
        leaseExpiresAt: new Date(now + LEASE_MS).toISOString(),
        lastAttemptAt: timestamp,
        version: row.version + 1,
      })
      .where(
        and(
          eq(guardCollection.id, id),
          eq(guardCollection.userId, userId),
          eq(guardCollection.version, row.version),
          eq(guardCollection.enabled, true),
          connectionPredicate(userId, document),
          quotaPredicate(userId, row.slot),
          isNull(guardCollection.deletedAt),
          or(
            isNull(guardCollection.leaseExpiresAt),
            lte(guardCollection.leaseExpiresAt, timestamp)
          )
        )
      );
    const claimed = await rowFor(userId, id);
    if (claimed.leaseToken !== token)
      throw new GuardError('sync_busy', 'A sync is already running.', 409);
    try {
      const scan = await fetchScan(document, userId);
      await assertAccess(userId, claimed);
      await assertConnected(userId, document);
      const result = applyScan(document, scan, clock());
      // Build at each write, after any recipient lookup, so an expiring review
      // grant cannot leave a previously captured allowlist in a later commit.
      const lease = () =>
        and(
          eq(guardCollection.id, id),
          eq(guardCollection.userId, userId),
          eq(guardCollection.leaseToken, token),
          eq(guardCollection.version, claimed.version),
          connectionPredicate(userId, document),
          quotaPredicate(userId, claimed.slot),
          isNull(guardCollection.deletedAt)
        );
      const save = (connection: typeof database) =>
        connection
          .update(guardCollection)
          .set({
            document: JSON.stringify(result),
            summary: summaryOf(result),
            nextSyncAt: result.nextSyncAt,
            version: claimed.version + 1,
            leaseExpiresAt: new Date(clock()).toISOString(),
          })
          .where(lease());
      const [recipient]: {
        email: string;
        emailVerified: boolean;
        locale: string;
      }[] =
        options.scheduled && options.emailAvailable !== false
          ? await database
              .select({
                email: user.email,
                emailVerified: user.emailVerified,
                locale: user.locale,
              })
              .from(user)
              .where(eq(user.id, userId))
              .limit(1)
          : [];
      const notification = recipient?.emailVerified
        ? notificationPayload(result, recipient.locale)
        : null;
      const payload: RetainedNotificationPayload | null = notification
        ? {
            ...notification,
            metadataCollectedAt:
              result.name === result.sourceTitle && result.sourceTitleFetchedAt
                ? [
                    notification.snapshot.createdAt,
                    result.sourceTitleFetchedAt,
                  ].sort()[0]
                : notification.snapshot.createdAt,
          }
        : null;
      if (payload && recipient) {
        // INSERT ... SELECT shares the scan's lease predicate. A stale worker can
        // neither overwrite the snapshot nor enqueue a notification for that scan.
        const enqueue = (connection: typeof database) =>
          connection.insert(guardDelivery).select(
            connection
              .select({
                id: sql`${payload.snapshot.id}`,
                collectionId: sql`${id}`,
                userId: sql`${userId}`,
                recipient: sql`${recipient.email}`,
                payload: sql`${JSON.stringify(payload)}`,
                status: sql`'pending'`,
                attempts: sql`0`,
                nextAttemptAt: sql`${payload.snapshot.createdAt}`,
                leaseToken: sql`NULL`,
                leaseExpiresAt: sql`NULL`,
                createdAt: sql`${payload.snapshot.createdAt}`,
                sentAt: sql`NULL`,
                lastError: sql`NULL`,
                providerMessageId: sql`NULL`,
              })
              .from(guardCollection)
              .where(lease())
          );
        // D1/libSQL provide atomic batch; PostgreSQL/MySQL use transactions.
        if (typeof database.batch === 'function')
          await database.batch([enqueue(database), save(database)]);
        else
          await database.transaction(async (tx: typeof database) => {
            await enqueue(tx);
            await save(tx);
          });
      } else await save(database);
      const saved = await rowFor(userId, id);
      await assertAccess(userId, saved);
      await assertConnected(userId, result);
      if (saved.leaseToken !== token || saved.version !== claimed.version + 1)
        throw new GuardError(
          'sync_expired',
          'Another sync replaced this scan. Please refresh.',
          409
        );
      return retainedDocument(saved);
    } catch (error) {
      // A failed scan never overwrites successful snapshots or marks videos missing.
      const message =
        error instanceof GuardError || error instanceof YoutubeAccountError
          ? error.message
          : 'YouTube could not complete this check. Please try again.';
      const failed = {
        ...pruneGuardMetadata(document, clock()),
        lastError: message,
        nextSyncAt: new Date(clock() + 15 * 60_000).toISOString(),
      };
      await database
        .update(guardCollection)
        .set({
          document: JSON.stringify(failed),
          summary: summaryOf(failed),
          nextSyncAt: failed.nextSyncAt,
          leaseExpiresAt: new Date(clock()).toISOString(),
        })
        .where(
          and(
            eq(guardCollection.id, id),
            eq(guardCollection.userId, userId),
            eq(guardCollection.leaseToken, token),
            eq(guardCollection.version, claimed.version),
            connectionPredicate(userId, document),
            quotaPredicate(userId, claimed.slot),
            isNull(guardCollection.deletedAt)
          )
        );
      if (error instanceof GuardError || error instanceof YoutubeAccountError)
        throw error;
      throw new GuardError('scan_failed', message, 502);
    }
  }
  async function due(limit = 5) {
    const timestamp = new Date(clock()).toISOString();
    const rows: Pick<
      GuardCollectionRow,
      'id' | 'userId' | 'summary' | 'version' | 'nextSyncAt'
    >[] = await database
      .select({
        id: guardCollection.id,
        userId: guardCollection.userId,
        summary: guardCollection.summary,
        version: guardCollection.version,
        nextSyncAt: guardCollection.nextSyncAt,
      })
      .from(guardCollection)
      .where(
        and(
          eq(guardCollection.enabled, true),
          isNull(guardCollection.deletedAt),
          lte(guardCollection.nextSyncAt, timestamp),
          or(
            isNull(guardCollection.leaseExpiresAt),
            lt(guardCollection.leaseExpiresAt, timestamp)
          )
        )
      )
      .orderBy(asc(guardCollection.nextSyncAt))
      .limit(Math.min(limit, 5));
    const ready: { id: string; userId: string }[] = [];
    for (const row of rows) {
      const schedule = normalizeLegacySchedule(
        JSON.parse(row.summary) as GuardCollection
      );
      if (schedule.nextSyncAt && schedule.nextSyncAt > timestamp) {
        // Move the due index past an obsolete hourly deadline. A subsequent save persists the normalized document.
        await database
          .update(guardCollection)
          .set({ nextSyncAt: schedule.nextSyncAt })
          .where(
            and(
              eq(guardCollection.id, row.id),
              eq(guardCollection.userId, row.userId),
              eq(guardCollection.version, row.version),
              connectionPredicate(row.userId, schedule),
              isNull(guardCollection.deletedAt),
              eq(guardCollection.enabled, true),
              row.nextSyncAt
                ? eq(guardCollection.nextSyncAt, row.nextSyncAt)
                : isNull(guardCollection.nextSyncAt),
              or(
                isNull(guardCollection.leaseExpiresAt),
                lt(guardCollection.leaseExpiresAt, timestamp)
              )
            )
          );
        continue;
      }
      ready.push({ id: row.id, userId: row.userId });
    }
    return ready;
  }
  async function verifiedEmail(userId: string): Promise<string | null> {
    const [row] = await database
      .select({ email: user.email, verified: user.emailVerified })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    return row?.verified ? row.email : null;
  }
  async function defer(userId: string, id: string) {
    const row = await rowFor(userId, id);
    const nextSyncAt = new Date(clock() + DAY).toISOString();
    const document = { ...retainedDocument(row), nextSyncAt };
    await database
      .update(guardCollection)
      .set({
        nextSyncAt,
        document: JSON.stringify(document),
        summary: summaryOf(document),
        version: row.version + 1,
      })
      .where(
        and(
          eq(guardCollection.userId, userId),
          eq(guardCollection.id, id),
          eq(guardCollection.version, row.version),
          connectionPredicate(userId, document),
          isNull(guardCollection.deletedAt),
          or(
            isNull(guardCollection.leaseExpiresAt),
            lte(guardCollection.leaseExpiresAt, new Date(clock()).toISOString())
          )
        )
      );
  }

  /** One bounded page per stream, independent of subscriptions, pauses and scan health. */
  async function cleanupExpired(
    options: { limit?: number; cursor?: GuardCleanupCursor } = {}
  ) {
    const requestedLimit = options.limit ?? 25;
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(25, Math.floor(requestedLimit)))
      : 25;
    const collectionCursor = options.cursor?.collectionId;
    const deliveryCursor = options.cursor?.deliveryId;
    const collectionRows: { id: string }[] =
      collectionCursor === null
        ? []
        : await database
            .select({ id: guardCollection.id })
            .from(guardCollection)
            .where(
              collectionCursor
                ? gt(guardCollection.id, collectionCursor)
                : undefined
            )
            .orderBy(asc(guardCollection.id))
            .limit(limit + 1);
    const deliveryRows: { id: string }[] =
      deliveryCursor === null
        ? []
        : await database
            .select({ id: guardDelivery.id })
            .from(guardDelivery)
            .where(
              deliveryCursor ? gt(guardDelivery.id, deliveryCursor) : undefined
            )
            .orderBy(asc(guardDelivery.id))
            .limit(limit + 1);
    const stats = {
      reviewed: 0,
      cleaned: 0,
      deliveriesReviewed: 0,
      deliveriesCleaned: 0,
    };
    for (const entry of collectionRows.slice(0, limit)) {
      stats.reviewed++;
      const [row]: GuardCollectionRow[] = await database
        .select()
        .from(guardCollection)
        .where(eq(guardCollection.id, entry.id))
        .limit(1);
      if (!row) continue;
      let document: GuardCollectionDetail;
      try {
        document = retainedDocument(row);
      } catch {
        // Corrupt documents cannot establish provenance and must not retain API data.
        await deleteRows(row.userId, row.id, row.version);
        stats.cleaned++;
        continue;
      }
      let remove = !!row.deletedAt;
      if (needsYoutubeAccount(document.source)) {
        const [connection] = document.connectionId
          ? await database
              .select()
              .from(youtubeConnection)
              .where(
                and(
                  eq(youtubeConnection.id, document.connectionId),
                  eq(youtubeConnection.userId, row.userId)
                )
              )
              .limit(1)
          : [];
        // Give legacy grants a bounded chance to undergo their first validation.
        // Actual reads and writes still require verifiedAt, never this fallback.
        remove ||=
          !connection ||
          connection.status !== 'connected' ||
          !connection.credentials ||
          !isFreshGuardMetadata(
            connection.verifiedAt ?? connection.createdAt,
            clock()
          );
      }
      if (remove) {
        await deleteRows(row.userId, row.id, row.version);
        stats.cleaned++;
        continue;
      }
      const serialized = JSON.stringify(document);
      const summary = summaryOf(document);
      if (serialized !== row.document || summary !== row.summary) {
        // Fencing both successful and failed scans prevents an in-flight request
        // from reintroducing metadata removed by this maintenance page.
        await database
          .update(guardCollection)
          .set({
            document: serialized,
            summary,
            version: row.version + 1,
            leaseToken: null,
            leaseExpiresAt: null,
            nextSyncAt: document.nextSyncAt,
          })
          .where(
            and(
              eq(guardCollection.id, row.id),
              eq(guardCollection.userId, row.userId),
              eq(guardCollection.version, row.version)
            )
          );
        stats.cleaned++;
      }
    }
    for (const entry of deliveryRows.slice(0, limit)) {
      stats.deliveriesReviewed++;
      const [row]: GuardDeliveryRow[] = await database
        .select()
        .from(guardDelivery)
        .where(eq(guardDelivery.id, entry.id))
        .limit(1);
      if (!row) continue;
      let stale = !isFreshGuardMetadata(row.createdAt, clock());
      if (!stale && row.payload !== '{}') {
        stale = !retainedPayload(row.payload, clock());
      }
      if (stale) {
        await database
          .delete(guardDelivery)
          .where(
            and(
              eq(guardDelivery.id, row.id),
              eq(guardDelivery.createdAt, row.createdAt)
            )
          );
        stats.deliveriesCleaned++;
      } else if (
        !['pending', 'sending'].includes(row.status) &&
        row.payload !== '{}'
      ) {
        await database
          .update(guardDelivery)
          .set({ payload: '{}', leaseToken: null, leaseExpiresAt: null })
          .where(
            and(
              eq(guardDelivery.id, row.id),
              eq(guardDelivery.status, row.status)
            )
          );
        stats.deliveriesCleaned++;
      }
    }
    const next: GuardCleanupCursor = {
      collectionId:
        collectionRows.length > limit ? collectionRows[limit - 1].id : null,
      deliveryId:
        deliveryRows.length > limit ? deliveryRows[limit - 1].id : null,
    };
    return {
      ...stats,
      nextCursor:
        next.collectionId === null && next.deliveryId === null ? null : next,
    };
  }

  async function deliverPending(
    send: (
      payload: GuardNotificationPayload,
      recipient: string,
      id: string
    ) => Promise<EmailSendResult>,
    limit = 10
  ) {
    const now = new Date(clock()).toISOString();
    const dueCondition = and(
      lte(guardDelivery.nextAttemptAt, now),
      or(
        eq(guardDelivery.status, 'pending'),
        and(
          eq(guardDelivery.status, 'sending'),
          lte(guardDelivery.leaseExpiresAt, now)
        )
      )
    );
    const rows: GuardDeliveryRow[] = await database
      .select()
      .from(guardDelivery)
      .where(dueCondition)
      .orderBy(asc(guardDelivery.nextAttemptAt))
      .limit(Math.min(10, limit));
    const stats = { attempted: 0, sent: 0, failed: 0, cancelled: 0 };
    for (const row of rows) {
      if (row.attempts >= 5 || !isFreshGuardMetadata(row.createdAt, clock())) {
        await database
          .update(guardDelivery)
          .set({
            status: 'failed',
            payload: '{}',
            leaseToken: null,
            leaseExpiresAt: null,
            lastError: 'Email delivery did not complete after five attempts.',
          })
          .where(and(eq(guardDelivery.id, row.id), dueCondition));
        stats.failed++;
        continue;
      }
      const token = getUuid();
      await database
        .update(guardDelivery)
        .set({
          status: 'sending',
          leaseToken: token,
          leaseExpiresAt: new Date(clock() + LEASE_MS).toISOString(),
          attempts: row.attempts + 1,
        })
        .where(
          and(
            eq(guardDelivery.id, row.id),
            eq(guardDelivery.attempts, row.attempts),
            dueCondition
          )
        );
      const [claimed]: GuardDeliveryRow[] = await database
        .select()
        .from(guardDelivery)
        .where(eq(guardDelivery.id, row.id))
        .limit(1);
      if (claimed?.leaseToken !== token) continue;
      const ownedLease = and(
        eq(guardDelivery.id, row.id),
        eq(guardDelivery.leaseToken, token)
      );
      const payload = retainedPayload(claimed.payload, clock());
      let eligible = false;
      let parent: GuardCollectionRow | undefined;
      let current: GuardCollectionDetail | undefined;
      try {
        parent = await rowFor(row.userId, row.collectionId);
        await assertAccess(row.userId, parent);
        current = retainedDocument(parent);
        await assertConnected(row.userId, current);
        const email = await verifiedEmail(row.userId);
        eligible =
          !!payload &&
          current.enabled &&
          email === row.recipient &&
          (!payload.emailDelivery || current.emailDelivery) &&
          (!payload.notifyMissing || current.notifyMissing) &&
          (!payload.notifyAdded || current.notifyAdded) &&
          (!payload.notifyRestored || !!current.notifyRestored);
      } catch (error) {
        if (
          !(
            error instanceof GuardError &&
            ['not_found', 'plan_required', 'connection_unavailable'].includes(
              error.code
            )
          )
        )
          throw error;
      }
      if (eligible && parent && current) {
        // Last read before network I/O: deleted/cancelled claims, changed parent
        // versions and disconnected grants cannot start a queued send.
        const [allowed] = await database
          .select({ id: guardDelivery.id })
          .from(guardDelivery)
          .where(
            and(
              ownedLease,
              eq(guardDelivery.status, 'sending'),
              exists(
                database
                  .select({ id: user.id })
                  .from(user)
                  .where(
                    and(
                      eq(user.id, row.userId),
                      eq(user.emailVerified, true),
                      eq(user.email, row.recipient)
                    )
                  )
              ),
              exists(
                database
                  .select({ id: guardCollection.id })
                  .from(guardCollection)
                  .where(
                    and(
                      eq(guardCollection.id, parent.id),
                      eq(guardCollection.userId, row.userId),
                      eq(guardCollection.version, parent.version),
                      eq(guardCollection.enabled, true),
                      isNull(guardCollection.deletedAt),
                      connectionPredicate(row.userId, current),
                      quotaPredicate(row.userId, parent.slot)
                    )
                  )
              )
            )
          )
          .limit(1);
        eligible = !!allowed;
      }
      if (!eligible || !payload) {
        await database
          .update(guardDelivery)
          .set({
            status: 'cancelled',
            payload: '{}',
            leaseToken: null,
            leaseExpiresAt: null,
            lastError:
              'Notification cancelled: collection, verified address or preferences changed.',
          })
          .where(ownedLease);
        stats.cancelled++;
        continue;
      }
      stats.attempted++;
      let result: EmailSendResult;
      try {
        result = await send(payload, row.recipient, row.id);
      } catch {
        result = {
          success: false,
          provider: 'unknown',
          error: 'Email provider request failed.',
        };
      }
      if (result.success) {
        await database
          .update(guardDelivery)
          .set({
            status: 'sent',
            sentAt: new Date(clock()).toISOString(),
            lastError: null,
            providerMessageId: result.messageId ?? null,
            leaseToken: null,
            leaseExpiresAt: null,
            // Release the bulky attachment after success; keep a small delivery receipt.
            payload: '{}',
          })
          .where(ownedLease);
        stats.sent++;
      } else {
        const attempts = row.attempts + 1;
        await database
          .update(guardDelivery)
          .set({
            status: attempts >= 5 ? 'failed' : 'pending',
            ...(attempts >= 5 ? { payload: '{}' } : {}),
            leaseToken: null,
            leaseExpiresAt: null,
            nextAttemptAt: new Date(
              clock() +
                [5, 15, 60, 180, 360][Math.min(attempts - 1, 4)] * 60_000
            ).toISOString(),
            lastError:
              'Email delivery failed. Check the email provider configuration or delivery log.',
          })
          .where(ownedLease);
        stats.failed++;
      }
    }
    return stats;
  }

  return {
    entitlement,
    list,
    detail,
    create,
    update,
    remove,
    sync,
    due,
    verifiedEmail,
    defer,
    cleanupExpired,
    deliverPending,
  };
}
