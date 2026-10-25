import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/core/db';
import {
  credit,
  guardCollection,
  guardDelivery,
  guestCheckout,
  order,
  subscription,
  user,
  type GuestCheckoutRow,
} from '@/config/db/schema';
import { GUARD_PLANS, guardProductId } from '@/config/guard-plans';
import {
  guestBackupSchema,
  type GuestCheckoutInput,
  type GuestCheckoutStatus,
} from '@/lib/guest-checkout';
import { getUniSeq, getUuid } from '@/lib/hash';

export class GuestCheckoutError extends Error {
  constructor(
    public code: string,
    public status = 409
  ) {
    super(code);
  }
}
export async function guestTokenHash(token: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}
export function guestBrowserToken(request: Request) {
  const value = /(?:^|;\s*)guest_checkout=([a-f0-9]{64})(?:;|$)/.exec(
    request.headers.get('cookie') || ''
  )?.[1];
  return value ?? null;
}
export function newGuestToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}
export function guestCookie(request: Request, token: string) {
  return `guest_checkout=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=172800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function guestById(id: string): Promise<GuestCheckoutRow | null> {
  return (
    (
      await db()
        .select()
        .from(guestCheckout)
        .where(eq(guestCheckout.id, id))
        .limit(1)
    )[0] ?? null
  );
}
export async function guestBySession(
  sessionId: string
): Promise<GuestCheckoutRow | null> {
  return (
    (
      await db()
        .select()
        .from(guestCheckout)
        .where(eq(guestCheckout.checkoutSessionId, sessionId))
        .limit(1)
    )[0] ?? null
  );
}
export async function guestByOrder(
  orderNo: string
): Promise<GuestCheckoutRow | null> {
  const rows = await db()
    .select({ guest: guestCheckout })
    .from(guestCheckout)
    .innerJoin(order, eq(order.userId, guestCheckout.userId))
    .where(eq(order.orderNo, orderNo))
    .limit(1);
  return rows[0]?.guest ?? null;
}
export async function reservedGuest(
  token: string
): Promise<GuestCheckoutRow | null> {
  return (
    (
      await db()
        .select()
        .from(guestCheckout)
        .where(eq(guestCheckout.activeBrowserHash, await guestTokenHash(token)))
        .limit(1)
    )[0] ?? null
  );
}
export async function ownsGuest(
  row: GuestCheckoutRow,
  token: string | null,
  owner?: { id: string; email: string; emailVerified: boolean }
) {
  return (
    !!(token && (await guestTokenHash(token)) === row.browserTokenHash) ||
    !!(owner?.emailVerified && owner.email.toLowerCase() === row.email)
  );
}
export async function confirmedGuestOrder(row: GuestCheckoutRow) {
  if (!row.checkoutSessionId) return null;
  const purchase = (
    await db()
      .select()
      .from(order)
      .where(
        and(
          eq(order.paymentSessionId, row.checkoutSessionId),
          eq(order.paymentProvider, 'stripe'),
          isNull(order.deletedAt)
        )
      )
      .limit(1)
  )[0];
  if (
    !purchase ||
    !['paid', 'trialing'].includes(purchase.status) ||
    purchase.productId !== row.productId
  )
    return null;
  const email = z
    .email()
    .max(190)
    .safeParse((purchase.paymentEmail || '').trim().toLowerCase());
  if (!email.success) throw new GuestCheckoutError('payment_email_missing');
  if (row.email && email.data !== row.email)
    throw new GuestCheckoutError('payment_email_mismatch');
  return purchase;
}
export async function guestCheckoutMatchesTerms(
  row: GuestCheckoutRow,
  baseUrl: string,
  trialDays: number
) {
  if (!row.orderNo) return false;
  const [purchase] = await db()
    .select({ result: order.checkoutResult })
    .from(order)
    .where(and(eq(order.orderNo, row.orderNo), eq(order.userId, row.userId)))
    .limit(1);
  try {
    const result = JSON.parse(purchase?.result || '{}');
    return (
      new URL(result.success_url).origin === baseUrl &&
      new URL(result.cancel_url).origin === baseUrl &&
      result.metadata?.trial_days === String(trialDays)
    );
  } catch {
    return false;
  }
}
export async function saveGuest(
  input: GuestCheckoutInput,
  token: string,
  retryOf?: string
) {
  const id = getUuid();
  const userId = `guest_${id}`;
  const createdAt = new Date().toISOString();
  const values = {
    id,
    userId,
    browserTokenHash: await guestTokenHash(token),
    email: '', // Unknown until Stripe confirms Checkout, including a card-backed trial.
    activeBrowserHash: await guestTokenHash(token),
    purchaseMode: retryOf ? 'paid' : 'trial',
    retryOf: retryOf || null,
    orderNo: getUniSeq('ORD'),
    productId: guardProductId(input.backup.planId),
    locale: input.locale,
    status: 'pending',
    backup: JSON.stringify(input.backup),
    createdAt,
    expiresAt: new Date(Date.now() + 35 * 60_000).toISOString(),
  };
  await atomic((database) => [
    ...(retryOf
      ? [
          database
            .update(guestCheckout)
            .set({ activeBrowserHash: null })
            .where(eq(guestCheckout.id, retryOf)),
        ]
      : []),
    database.insert(user).values({
      id: userId,
      name: 'Guest',
      email: `${id}@guest.invalid`,
      emailVerified: false,
    }),
    database.insert(guestCheckout).values(values),
  ]);
  return (await guestById(id))!;
}

/** The unique hash survives cancellation and claiming, so a trial cannot be reset. */
export async function reserveGuestTrial(row: GuestCheckoutRow, lease: string) {
  const hash = await guestTokenHash(row.email.trim().toLowerCase());
  try {
    await updateGuest(row.id, { trialEmailHash: hash }, lease);
  } catch (error) {
    const [winner] = await db()
      .select({ id: guestCheckout.id })
      .from(guestCheckout)
      .where(eq(guestCheckout.trialEmailHash, hash));
    if (winner && winner.id !== row.id) return false;
    throw error;
  }
  return (await guestById(row.id))?.trialEmailHash === hash;
}

export async function guestPaidRetry(id: string) {
  return (
    await db()
      .select()
      .from(guestCheckout)
      .where(eq(guestCheckout.retryOf, id))
      .limit(1)
  )[0] as GuestCheckoutRow | undefined;
}

export async function pendingGuestCheckouts() {
  return db()
    .select()
    .from(guestCheckout)
    .where(
      and(
        or(
          eq(guestCheckout.status, 'trial_cancel_pending'),
          eq(guestCheckout.status, 'pending')
        ),
        or(
          isNull(guestCheckout.lastCheckedAt),
          lt(
            guestCheckout.lastCheckedAt,
            new Date(Date.now() - 60_000).toISOString()
          )
        )
      )
    )
    .orderBy(guestCheckout.lastCheckedAt)
    .limit(20);
}
export async function updateGuest(
  id: string,
  patch: Partial<GuestCheckoutRow>,
  leaseToken?: string
) {
  await db()
    .update(guestCheckout)
    .set(patch)
    .where(
      and(
        eq(guestCheckout.id, id),
        leaseToken ? eq(guestCheckout.leaseToken, leaseToken) : undefined
      )
    );
}
export async function leaseGuest(id: string) {
  const token = getUuid();
  const now = new Date().toISOString();
  await db()
    .update(guestCheckout)
    .set({
      leaseToken: token,
      leaseExpiresAt: new Date(Date.now() + 180_000).toISOString(),
    })
    .where(
      and(
        eq(guestCheckout.id, id),
        or(
          isNull(guestCheckout.leaseExpiresAt),
          lt(guestCheckout.leaseExpiresAt, now)
        )
      )
    );
  return (await guestById(id))?.leaseToken === token ? token : null;
}
export async function releaseGuest(id: string, token: string) {
  await updateGuest(id, { leaseToken: null, leaseExpiresAt: null }, token);
}
export async function guestStatus(
  row: GuestCheckoutRow
): Promise<GuestCheckoutStatus> {
  const confirmed = await confirmedGuestOrder(row);
  const [local, domain] = row.email.split('@');
  return {
    id: row.id,
    status: (row.status === 'pending' && confirmed
      ? confirmed.status
      : row.status) as GuestCheckoutStatus['status'],
    email: row.email ? `${local.slice(0, 2)}***@${domain}` : '',
    mailSent: !!row.mailSentAt,
    backupSaved: !!row.collectionId,
    needsYoutubeConnection:
      guestBackupSchema.parse(JSON.parse(row.backup)).source ===
      'private_playlist',
    lastError: row.lastError,
    rejectionReason:
      row.trialDecision === 'trial_used' ||
      row.trialDecision === 'existing_subscription'
        ? row.trialDecision
        : null,
    planId: GUARD_PLANS.find(
      (plan) => guardProductId(plan.id) === row.productId
    )!.id,
  };
}

/** Move only the verified email's isolated purchase. Never authenticate by billing email. */
export async function claimGuest(id: string, ownerId: string) {
  const owner = (
    await db().select().from(user).where(eq(user.id, ownerId)).limit(1)
  )[0];
  const row = await guestById(id);
  if (!row || !owner?.emailVerified || owner.email.toLowerCase() !== row.email)
    throw new GuestCheckoutError('claim_forbidden', 403);
  const values = guestBackupSchema.parse(JSON.parse(row.backup));
  const privateBackup =
    values.source === 'private_playlist' ? values : undefined;
  if (row.claimedByUserId) {
    if (row.claimedByUserId !== ownerId)
      throw new GuestCheckoutError('claim_forbidden', 403);
    return { claimed: true, paused: false, privateBackup };
  }
  if (
    row.status !== 'fulfilled' ||
    (!row.collectionId && !privateBackup) ||
    !(await confirmedGuestOrder(row))
  )
    throw new GuestCheckoutError('backup_not_ready');
  const token = await leaseGuest(id);
  if (!token) throw new GuestCheckoutError('please_retry');
  try {
    const proof = sql`exists (select 1 from ${guestCheckout} where ${guestCheckout.id} = ${id} and ${guestCheckout.leaseToken} = ${token} and ${guestCheckout.claimedByUserId} is null) and exists (select 1 from ${user} where ${user.id} = ${ownerId} and ${user.emailVerified} = true and lower(${user.email}) = ${row.email})`;
    if (privateBackup) {
      // Claim the purchased entitlement only. Reading private metadata still
      // requires a separate, explicit YouTube connection owned by this user.
      await atomic((database) => [
        database
          .update(order)
          .set({ userId: ownerId, userEmail: owner.email })
          .where(and(eq(order.userId, row.userId), proof)),
        database
          .update(subscription)
          .set({ userId: ownerId, userEmail: owner.email })
          .where(and(eq(subscription.userId, row.userId), proof)),
        database
          .update(credit)
          .set({ userId: ownerId, userEmail: owner.email })
          .where(and(eq(credit.userId, row.userId), proof)),
        database
          .update(guestCheckout)
          .set({
            status: 'claimed',
            claimedByUserId: ownerId,
            activeBrowserHash: null,
          })
          .where(and(eq(guestCheckout.id, id), proof)),
      ]);
      if ((await guestById(id))?.claimedByUserId !== ownerId)
        throw new GuestCheckoutError('please_retry');
      return { claimed: true, paused: false, privateBackup };
    }
    const collections = await db()
      .select()
      .from(guardCollection)
      .where(
        and(
          eq(guardCollection.userId, ownerId),
          isNull(guardCollection.deletedAt)
        )
      );
    const source = (
      await db()
        .select()
        .from(guardCollection)
        .where(
          and(
            eq(guardCollection.id, row.collectionId!),
            eq(guardCollection.userId, row.userId)
          )
        )
        .limit(1)
    )[0];
    if (!source) throw new GuestCheckoutError('backup_not_ready');
    const duplicate = collections.find(
      (item: typeof source) => item.sourceKey === source.sourceKey
    );
    const limit = GUARD_PLANS.find(
      (plan) => guardProductId(plan.id) === row.productId
    )!.collectionLimit;
    const slot = Array.from({ length: limit }, (_, index) => index).find(
      (index) => !collections.some((item: typeof source) => item.slot === index)
    );
    const paused = !duplicate && slot === undefined;
    const doc = JSON.parse(source.document);
    const summary = JSON.parse(source.summary);
    if (paused || duplicate) {
      doc.enabled = false;
      summary.enabled = false;
    }
    await atomic((database) => [
      database
        .update(order)
        .set({ userId: ownerId, userEmail: owner.email })
        .where(and(eq(order.userId, row.userId), proof)),
      database
        .update(subscription)
        .set({ userId: ownerId, userEmail: owner.email })
        .where(and(eq(subscription.userId, row.userId), proof)),
      database
        .update(credit)
        .set({ userId: ownerId, userEmail: owner.email })
        .where(and(eq(credit.userId, row.userId), proof)),
      database
        .update(guardCollection)
        .set({
          userId: ownerId,
          slot: duplicate || paused ? null : slot,
          sourceKey: duplicate ? null : source.sourceKey,
          deletedAt: duplicate ? new Date().toISOString() : null,
          enabled: !duplicate && !paused,
          document: JSON.stringify(doc),
          summary: JSON.stringify(summary),
        })
        .where(
          and(
            eq(guardCollection.id, source.id),
            eq(guardCollection.userId, row.userId),
            proof
          )
        ),
      database
        .update(guardDelivery)
        .set({ userId: ownerId, recipient: owner.email })
        .where(and(eq(guardDelivery.userId, row.userId), proof)),
      database
        .update(guestCheckout)
        .set({
          status: 'claimed',
          claimedByUserId: ownerId,
          activeBrowserHash: null,
          collectionId: duplicate?.id ?? source.id,
        })
        .where(and(eq(guestCheckout.id, id), proof)),
    ]);
    if ((await guestById(id))?.claimedByUserId !== ownerId)
      throw new GuestCheckoutError('please_retry');
    return { claimed: true, paused };
  } finally {
    await releaseGuest(id, token);
  }
}

async function atomic(build: (database: ReturnType<typeof db>) => any[]) {
  const database = db();
  if (typeof database.batch === 'function')
    await database.batch(build(database));
  else
    await database.transaction(async (tx: typeof database) => {
      for (const statement of build(tx)) await statement;
    });
}
