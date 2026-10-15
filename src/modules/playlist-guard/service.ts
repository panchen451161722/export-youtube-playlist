import { and, asc, desc, eq, isNull, lt, lte, or, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import type { EmailSendResult } from '@/core/email';
import {
  guardCollection,
  guardDelivery,
  guardWorkspace,
  subscription,
  user,
  type GuardCollectionRow,
  type GuardDeliveryRow,
  type GuardWorkspaceRow,
  type Subscription,
} from '@/config/db/schema';
import {
  GUARD_PLANS,
  GUARD_SCAN_LIMIT,
  GUARD_SNAPSHOT_LIMIT,
  GUARD_TRIAL_COLLECTION_LIMIT,
  GUARD_TRIAL_DAYS,
} from '@/config/guard-plans';
import { getUuid } from '@/lib/hash';
import {
  notificationPayload,
  type GuardNotificationPayload,
} from '@/lib/playlist-guard/notifications';
import type {
  GuardCollection,
  GuardCollectionDetail,
  GuardCreateInput,
  GuardEntitlement,
  GuardFrequency,
  GuardItem,
  GuardMissingItem,
  GuardSnapshot,
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
  workspace: GuardWorkspaceRow | undefined,
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
    if (
      eligible.some(
        (row) =>
          row.productId === `guard_${plan.id}_monthly` ||
          row.productId === `guard_${plan.id}_yearly`
      )
    ) {
      return {
        plan: plan.id,
        limit: plan.collectionLimit,
        trialEndsAt: workspace?.trialEndsAt ?? null,
        canStartTrial: false,
      };
    }
  }
  const activeTrial =
    workspace?.trialEndsAt && Date.parse(workspace.trialEndsAt) > now;
  return {
    plan: activeTrial ? 'trial' : 'free',
    limit: activeTrial ? GUARD_TRIAL_COLLECTION_LIMIT : 0,
    trialEndsAt: workspace?.trialEndsAt ?? null,
    canStartTrial: !workspace?.trialStartedAt,
  };
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
  const items = [
    ...new Map(scan.items.map((item) => [item.id, item])).values(),
  ];
  const previousItems = previous.snapshots[0]?.items ?? [];
  const currentIds = new Set(items.map((item) => item.id));
  const oldIds = new Set(previousItems.map((item) => item.id));
  const missingIds = new Set(previous.missing.map((item) => item.id));
  const returnedOrNew = previous.runCount
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
    missingById.set(item.id, { ...item, missingSince: timestamp });
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
      ? { sourceTitle, name: scannedChannelName(previous, sourceTitle) }
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
  clock: () => number = Date.now
) {
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
    const [workspaces, subscriptions] = await Promise.all([
      database
        .select()
        .from(guardWorkspace)
        .where(eq(guardWorkspace.userId, userId))
        .limit(1),
      database
        .select()
        .from(subscription)
        .where(eq(subscription.userId, userId)),
    ]);
    return entitlementFor(subscriptions, workspaces[0], clock());
  }
  async function startTrial(userId: string) {
    const access = await entitlement(userId);
    if (!access.canStartTrial)
      throw new GuardError(
        'trial_unavailable',
        'Your trial has already been used or you already have an active plan.',
        409
      );
    const now = clock();
    try {
      await database.insert(guardWorkspace).values({
        userId,
        trialStartedAt: new Date(now).toISOString(),
        trialEndsAt: new Date(now + GUARD_TRIAL_DAYS * DAY).toISOString(),
      });
    } catch (error) {
      if (!isConflict(error)) throw error;
      throw new GuardError(
        'trial_unavailable',
        'Your trial has already been used.',
        409
      );
    }
    return entitlement(userId);
  }
  async function list(userId: string): Promise<GuardCollection[]> {
    const rows: { summary: string }[] = await database
      .select({ summary: guardCollection.summary })
      .from(guardCollection)
      .where(
        and(
          eq(guardCollection.userId, userId),
          isNull(guardCollection.deletedAt)
        )
      )
      .orderBy(asc(guardCollection.createdAt));
    return rows.map((row) =>
      normalizeLegacySchedule(JSON.parse(row.summary) as GuardCollection)
    );
  }

  async function detail(userId: string, id: string) {
    const document = documentOf(await rowFor(userId, id));
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
        await database.insert(guardCollection).values({
          id,
          userId,
          slot,
          sourceKey,
          document: JSON.stringify(document),
          summary: summaryOf(document),
          createdAt,
          nextSyncAt: createdAt,
          enabled: true,
        });
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
      const document = { ...documentOf(row), ...patch };
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
      if (fresh.leaseToken === token) return documentOf(fresh);
    }
    throw new GuardError(
      'conflict',
      'Collection changed while saving. Please try again.',
      409
    );
  }
  async function remove(userId: string, id: string) {
    await rowFor(userId, id);
    await database
      .update(guardCollection)
      .set({
        deletedAt: new Date(clock()).toISOString(),
        enabled: false,
        slot: null,
        sourceKey: null,
        nextSyncAt: null,
        leaseToken: null,
        leaseExpiresAt: null,
      })
      .where(
        and(
          eq(guardCollection.id, id),
          eq(guardCollection.userId, userId),
          isNull(guardCollection.deletedAt)
        )
      );
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
    const document = documentOf(row);
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
      const result = applyScan(document, scan, clock());
      const lease = and(
        eq(guardCollection.id, id),
        eq(guardCollection.userId, userId),
        eq(guardCollection.leaseToken, token),
        isNull(guardCollection.deletedAt)
      );
      const save = (connection: typeof database) =>
        connection
          .update(guardCollection)
          .set({
            document: JSON.stringify(result),
            summary: summaryOf(result),
            nextSyncAt: result.nextSyncAt,
            leaseExpiresAt: new Date(clock()).toISOString(),
          })
          .where(lease);
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
      const payload = recipient?.emailVerified
        ? notificationPayload(result, recipient.locale)
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
              .where(lease)
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
      if (saved.leaseToken !== token)
        throw new GuardError(
          'sync_expired',
          'Another sync replaced this scan. Please refresh.',
          409
        );
      return documentOf(saved);
    } catch (error) {
      // A failed scan never overwrites successful snapshots or marks videos missing.
      const message =
        error instanceof GuardError || error instanceof YoutubeAccountError
          ? error.message
          : 'YouTube could not complete this check. Please try again.';
      const failed = {
        ...document,
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
    const document = { ...documentOf(row), nextSyncAt };
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
          isNull(guardCollection.deletedAt),
          or(
            isNull(guardCollection.leaseExpiresAt),
            lte(guardCollection.leaseExpiresAt, new Date(clock()).toISOString())
          )
        )
      );
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
      if (row.attempts >= 5) {
        await database
          .update(guardDelivery)
          .set({
            status: 'failed',
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
      const payload = JSON.parse(row.payload) as GuardNotificationPayload;
      let eligible = false;
      try {
        const parent = await rowFor(row.userId, row.collectionId);
        await assertAccess(row.userId, parent);
        const current = documentOf(parent);
        const email = await verifiedEmail(row.userId);
        eligible =
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
            ['not_found', 'plan_required'].includes(error.code)
          )
        )
          throw error;
      }
      if (!eligible) {
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
    startTrial,
    list,
    detail,
    create,
    update,
    remove,
    sync,
    due,
    verifiedEmail,
    defer,
    deliverPending,
  };
}
