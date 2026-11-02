import { and, asc, eq, inArray, isNull, like, or } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/core/db';
import { getEmailProvider } from '@/core/email/provider';
import { envConfigs } from '@/config';
import { order, subscription } from '@/config/db/schema';
import { getAllConfigs } from '@/modules/config/service';
import { checkoutLocale } from '@/lib/backup-checkout';
import { subscriptionEmail } from '@/lib/emails/subscription';

// Stored with the order at checkout creation. Older purchases are never backfilled.
// CAS on checkoutInfo leases delivery across callback, webhook, and scheduler races.
export async function sendSubscriptionWelcome(orderNo: string): Promise<void> {
  const database = db();
  const [purchase] = await database
    .select()
    .from(order)
    .where(and(eq(order.orderNo, orderNo), isNull(order.deletedAt)))
    .limit(1);
  if (
    !purchase ||
    !['paid', 'trialing'].includes(purchase.status) ||
    purchase.userId.startsWith('guest_')
  )
    return;
  const info = JSON.parse(purchase.checkoutInfo);
  const state = info.subscriptionEmail;
  if (!state || !['pending', 'sending'].includes(state.status)) return;
  const now = Date.now();
  if (
    state.attemptedAt &&
    now - state.attemptedAt < (state.status === 'sending' ? 120_000 : 60_000)
  )
    return;
  const [plan] = await database
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.subscriptionNo, purchase.subscriptionNo || ''),
        eq(subscription.userId, purchase.userId),
        isNull(subscription.deletedAt)
      )
    )
    .limit(1);
  if (!plan) return;
  if (!['active', 'trialing'].includes(plan.status)) {
    await database
      .update(order)
      .set({
        checkoutInfo: JSON.stringify({
          ...info,
          subscriptionEmail: { ...state, status: 'canceled' },
        }),
      })
      .where(
        and(
          eq(order.id, purchase.id),
          eq(order.checkoutInfo, purchase.checkoutInfo)
        )
      );
    return;
  }
  const recipient = z.email().safeParse(purchase.userEmail);
  if (!recipient.success) return;
  const configs = await getAllConfigs();
  const mail = getEmailProvider(configs);
  if (!mail) return;
  const claimed = {
    ...info,
    subscriptionEmail: {
      ...state,
      status: 'sending',
      attemptedAt: now,
      attempts: (state.attempts || 0) + 1,
    },
  };
  const claimedJson = JSON.stringify(claimed);
  const rows = await database
    .update(order)
    .set({ checkoutInfo: claimedJson })
    .where(
      and(
        eq(order.id, purchase.id),
        eq(order.checkoutInfo, purchase.checkoutInfo)
      )
    )
    .returning({ id: order.id });
  if (!rows.length) return;
  let success = false;
  try {
    const email = subscriptionEmail({
      id: purchase.id,
      to: recipient.data,
      locale: checkoutLocale(state.locale),
      brand: {
        name: configs.app_name || envConfigs.app_name,
        url: configs.app_url || envConfigs.app_url,
        logo: configs.app_logo || envConfigs.app_logo,
      },
      planName: plan.planName || plan.productName || '',
      trial: plan.status === 'trialing',
      amount: plan.amount,
      currency: plan.currency || purchase.currency,
      paidAmount: purchase.paymentAmount,
      paidCurrency: purchase.paymentCurrency,
      periodEnd: plan.currentPeriodEnd,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
    });
    success = (await mail.provider.sendEmail(email)).success;
  } catch {
    /* Keep payment success independent of an email provider outage. */
  }
  await database
    .update(order)
    .set({
      checkoutInfo: JSON.stringify({
        ...info,
        subscriptionEmail: {
          ...claimed.subscriptionEmail,
          status: success
            ? 'sent'
            : claimed.subscriptionEmail.attempts >= 5
              ? 'failed'
              : 'pending',
          ...(success ? { sentAt: new Date().toISOString() } : {}),
        },
      }),
    })
    .where(and(eq(order.id, purchase.id), eq(order.checkoutInfo, claimedJson)));
  if (!success) console.error('subscription_welcome_delivery_failed');
}

export async function trySubscriptionWelcome(orderNo: string): Promise<void> {
  try {
    await sendSubscriptionWelcome(orderNo);
  } catch {
    console.error('subscription_welcome_pending');
  }
}

/** Bounded durable retry also works when the browser never returns to the callback. */
export async function retrySubscriptionWelcomes(): Promise<void> {
  const purchases = await db()
    .select({ orderNo: order.orderNo })
    .from(order)
    .where(
      and(
        isNull(order.deletedAt),
        inArray(order.status, ['paid', 'trialing']),
        or(
          like(order.checkoutInfo, '%"subscriptionEmail":{"status":"pending"%'),
          like(order.checkoutInfo, '%"subscriptionEmail":{"status":"sending"%')
        )
      )
    )
    .orderBy(asc(order.updatedAt))
    .limit(25);
  for (const purchase of purchases)
    await trySubscriptionWelcome(purchase.orderNo);
}
