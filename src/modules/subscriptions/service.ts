import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { subscription, type Subscription } from '@/config/db/schema';
import { GUARD_PLANS } from '@/config/guard-plans';
import {
  FREE_PLAYLIST_EXPORT_LIMIT,
  SUBSCRIBER_PLAYLIST_EXPORT_LIMIT,
  type PlaylistExportAccess,
} from '@/config/playlist-export';
import { getSnowId, getUuid } from '@/lib/hash';

export enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PENDING_CANCEL = 'pending_cancel',
  TRIALING = 'trialing',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

export type NewSubscription = typeof subscription.$inferInsert;
export type UpdateSubscription = Partial<
  Omit<NewSubscription, 'id' | 'subscriptionNo' | 'createdAt'>
>;

export async function createSubscription(data: NewSubscription) {
  const [result] = await db().insert(subscription).values(data).returning();
  return result;
}

export async function updateBySubscriptionNo(
  subscriptionNo: string,
  data: UpdateSubscription
) {
  const [result] = await db()
    .update(subscription)
    .set(data)
    .where(eq(subscription.subscriptionNo, subscriptionNo))
    .returning();
  return result;
}

export async function findBySubscriptionNo(subscriptionNo: string) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionNo, subscriptionNo));
  return result;
}

export async function findByProviderSubscriptionId(params: {
  provider: string;
  subscriptionId: string;
}) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.paymentProvider, params.provider),
        eq(subscription.subscriptionId, params.subscriptionId)
      )
    );
  return result;
}

export async function getCurrentSubscription(userId: string) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.userId, userId),
        inArray(subscription.status, [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PENDING_CANCEL,
          SubscriptionStatus.TRIALING,
        ])
      )
    )
    .orderBy(desc(subscription.createdAt))
    .limit(1);
  return result;
}

/** Match existing plan access, including provider-backed trials and cancellation at period end. */
export function playlistExportAccessFor(
  rows: Subscription[],
  now = Date.now()
): PlaylistExportAccess {
  const subscribed = rows.some(
    (row) =>
      !row.deletedAt &&
      [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.PENDING_CANCEL,
        SubscriptionStatus.TRIALING,
      ].includes(row.status as SubscriptionStatus) &&
      Boolean(row.subscriptionId && row.paymentProvider) &&
      Boolean(row.currentPeriodEnd && row.currentPeriodEnd.getTime() > now) &&
      (!row.currentPeriodStart || row.currentPeriodStart.getTime() <= now) &&
      GUARD_PLANS.some(
        (plan) =>
          row.productId === `guard_${plan.id}_yearly` ||
          row.productId === `guard_${plan.id}_monthly`
      )
  );
  return {
    subscribed,
    limit: subscribed
      ? SUBSCRIBER_PLAYLIST_EXPORT_LIMIT
      : FREE_PLAYLIST_EXPORT_LIMIT,
  };
}

export async function getPlaylistExportAccess(
  userId: string
): Promise<PlaylistExportAccess> {
  const rows: Subscription[] = await db()
    .select()
    .from(subscription)
    .where(
      and(eq(subscription.userId, userId), isNull(subscription.deletedAt))
    );
  return playlistExportAccessFor(rows);
}

export async function getSubscriptions(params: {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, status, page = 1, limit = 30 } = params;
  return db()
    .select()
    .from(subscription)
    .where(
      and(
        userId ? eq(subscription.userId, userId) : undefined,
        status ? eq(subscription.status, status) : undefined
      )
    )
    .orderBy(desc(subscription.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}
