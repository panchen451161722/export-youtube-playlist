import { eq, inArray, or, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import type { StripeProvider } from '@/core/payment/stripe';
import { guestCheckout, order, subscription, user } from '@/config/db/schema';
import { getGuardPlan } from '@/config/guard-plans';

/** Include canceled/deleted historical records; ignore this attempt and unapproved concurrent trials. */
export async function guestSubscriptionHistory(
  provider: StripeProvider,
  email: string,
  excludeId: string
) {
  const normalized = email.trim().toLowerCase();
  const guests = await db()
    .select()
    .from(guestCheckout)
    .where(sql`lower(${guestCheckout.email}) = ${normalized}`);
  const approvedIds = new Set<string>();
  const attempts = new Map<string | null, typeof guestCheckout.$inferSelect>(
    guests.map(
      (g: typeof guestCheckout.$inferSelect) => [g.orderNo, g] as const
    )
  );
  const purchases = await db()
    .select()
    .from(order)
    .where(
      or(
        sql`lower(${order.paymentEmail}) = ${normalized}`,
        sql`lower(${order.userEmail}) = ${normalized}`
      )
    );
  let hasHistory = false;
  const localIds = new Set<string>();
  for (const purchase of purchases) {
    if (
      !getGuardPlan(purchase.productId || '') ||
      !['paid', 'trialing'].includes(purchase.status) ||
      !purchase.subscriptionId ||
      purchase.subscriptionId === excludeId
    )
      continue;
    const attempt = attempts.get(purchase.orderNo);
    if (
      attempt?.trialDecision === 'eligible' ||
      attempt?.purchaseMode === 'paid'
    )
      approvedIds.add(purchase.subscriptionId);
    let modernTrial = false;
    try {
      modernTrial =
        JSON.parse(purchase.checkoutResult || '{}').metadata
          ?.guest_trial_policy === 'email_v1';
    } catch {}
    if (
      modernTrial &&
      purchase.status === 'trialing' &&
      attempt?.trialDecision !== 'eligible'
    )
      continue;
    hasHistory = true;
    localIds.add(purchase.subscriptionId);
  }
  const subscriptions = await db()
    .select({ sub: subscription, ownerEmail: user.email })
    .from(subscription)
    .leftJoin(user, eq(user.id, subscription.userId))
    .where(
      or(
        sql`lower(${subscription.userEmail}) = ${normalized}`,
        sql`lower(${user.email}) = ${normalized}`
      )
    );
  const ids = new Set(localIds);
  for (const { sub } of subscriptions) {
    if (!getGuardPlan(sub.productId || '') || sub.subscriptionId === excludeId)
      continue;
    // Claimed, authenticated subscriptions and legacy grants count even when canceled.
    hasHistory = true;
    ids.add(sub.subscriptionId);
  }
  const currentRows = ids.size
    ? await db()
        .select()
        .from(subscription)
        .where(inArray(subscription.subscriptionId, [...ids]))
    : [];
  const hasCurrent = currentRows.some(
    (s: typeof subscription.$inferSelect) =>
      ids.has(s.subscriptionId) &&
      !s.deletedAt &&
      !['canceled', 'expired', 'incomplete_expired'].includes(s.status) &&
      (!s.currentPeriodEnd || s.currentPeriodEnd.getTime() > Date.now())
  );
  const remote = await provider.getGuestSubscriptionHistory(
    normalized,
    excludeId,
    approvedIds
  );
  return {
    hasHistory: hasHistory || remote.hasHistory,
    hasCurrent: hasCurrent || remote.hasCurrent,
  };
}
