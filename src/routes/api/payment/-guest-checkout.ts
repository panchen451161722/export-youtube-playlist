// Server-side orchestration keeps the payment, guest and backup modules independent.
import { getAuth, getEmailProvider } from '@/core/auth';
import { PaymentStatus } from '@/core/payment/types';
import {
  getGuardCheckoutProvider,
  GUARD_TRIAL_DAYS,
} from '@/config/guard-plans';
import { getPricingProduct } from '@/config/pricing';
import { getAllConfigs } from '@/modules/config/service';
import {
  confirmedGuestOrder,
  guestById,
  guestByOrder,
  guestBySession,
  GuestCheckoutError,
  guestCheckoutMatchesTerms,
  guestPaidRetry,
  guestTokenHash,
  leaseGuest,
  pendingGuestCheckouts,
  releaseGuest,
  reservedGuest,
  reserveGuestTrial,
  saveGuest,
  updateGuest,
} from '@/modules/guest-checkout/service';
import {
  createCheckout,
  expireGuestPaymentSession,
  getGuestSubscriptionHistory,
  handlePaymentCallback,
  rejectGuestTrial,
} from '@/modules/payment/service';
import { createGuardStore } from '@/modules/playlist-guard/service';
import {
  guestBackupSchema,
  guestPaths,
  type GuestCheckoutInput,
} from '@/lib/guest-checkout';
import { paymentAppUrl } from '@/lib/payment-return-url';

import { guardRuntime, normalizeGuardSource } from '../-playlist-guard';

export async function startGuestCheckout(
  input: GuestCheckoutInput,
  token: string,
  requestUrl?: string,
  paidRetryOf?: string
) {
  const configs = await getAllConfigs();
  const appUrl = paymentAppUrl(configs.app_url, requestUrl);
  if (!getGuardCheckoutProvider(configs))
    throw new GuestCheckoutError('checkout_unavailable', 503);
  if (!getEmailProvider(configs))
    throw new GuestCheckoutError('email_unavailable', 503);
  if (!(await guardRuntime()).capabilities.youtube)
    throw new GuestCheckoutError('backup_unavailable', 503);
  let existing = await reservedGuest(token);
  if (existing?.purchaseMode === 'paid' && existing.retryOf && !paidRetryOf) {
    return {
      id: existing.retryOf,
      return_path: guestPaths(existing.retryOf, existing.locale).success,
    };
  }
  if (
    existing &&
    existing.status === 'pending' &&
    (new Date(existing.expiresAt).getTime() < Date.now() ||
      (!!existing.checkoutUrl &&
        !(await guestCheckoutMatchesTerms(
          existing,
          appUrl,
          existing.purchaseMode === 'paid' ? 0 : GUARD_TRIAL_DAYS
        ))))
  ) {
    const replaced = existing;
    await cancelGuestCheckout(existing.id);
    existing = await reservedGuest(token);
    if (!existing && replaced.retryOf)
      await updateGuest(replaced.id, { retryOf: null });
  }
  const browserHash = await guestTokenHash(token);
  if (existing) {
    if (existing.browserTokenHash !== browserHash)
      throw new GuestCheckoutError('checkout_exists');
    if (existing.status !== 'pending')
      return {
        id: existing.id,
        return_path: guestPaths(existing.id, existing.locale).success,
      };
    if (
      existing.backup !== JSON.stringify(input.backup) ||
      existing.locale !== input.locale
    )
      throw new GuestCheckoutError('checkout_exists');
    if (existing.checkoutUrl)
      return { id: existing.id, checkout_url: existing.checkoutUrl };
  }
  const row = existing ?? (await saveGuest(input, token, paidRetryOf));
  const lease = await leaseGuest(row.id);
  if (!lease) throw new GuestCheckoutError('please_retry');
  try {
    const product = getPricingProduct(row.productId)!;
    const paths = guestPaths(row.id, row.locale);
    const result = await createCheckout({
      requestUrl,
      userId: row.userId,
      userEmail: row.email,
      provider: 'stripe',
      productName: product.productName,
      planName: product.planName,
      paymentOrder: {
        productId: product.productId,
        type: product.type,
        price: { amount: product.priceInCents, currency: product.currency },
        orderNo: row.orderNo!,
        description: product.description,
        plan: product.plan
          ? {
              name: product.plan.name,
              interval: product.plan.interval,
              intervalCount: product.plan.intervalCount,
              trialPeriodDays:
                row.purchaseMode === 'paid' ? 0 : product.plan.trialPeriodDays,
            }
          : undefined,
        metadata: {
          checkout_flow: 'guest_backup',
          checkout_locale: row.locale,
          guest_checkout_id: row.id,
          ...(row.purchaseMode !== 'paid'
            ? { guest_trial_policy: 'email_v1' }
            : {}),
        },
        expiresAt: new Date(row.expiresAt),
        successUrl: new URL(paths.success, appUrl).href,
        cancelUrl: new URL(paths.cancel, appUrl).href,
      },
    });
    await updateGuest(
      row.id,
      {
        checkoutSessionId: result.checkoutInfo.sessionId,
        checkoutUrl: result.checkoutInfo.checkoutUrl,
        orderNo: result.metadata?.order_no ?? null,
      },
      lease
    );
    return { id: row.id, checkout_url: result.checkoutInfo.checkoutUrl };
  } finally {
    await releaseGuest(row.id, lease);
  }
}

/** Only the rejected attempt's owner can explicitly begin a separate, full-price Checkout. */
export async function startGuestPaidCheckout(
  id: string,
  token: string,
  requestUrl?: string
) {
  const row = await guestById(id);
  if (
    !row ||
    row.browserTokenHash !== (await guestTokenHash(token)) ||
    row.status !== 'trial_rejected' ||
    row.trialDecision !== 'trial_used'
  )
    throw new GuestCheckoutError('paid_checkout_forbidden', 403);
  const lease = await leaseGuest(id);
  if (!lease) throw new GuestCheckoutError('please_retry');
  try {
    const completedRetry = await guestPaidRetry(id);
    if (
      completedRetry &&
      (['fulfilled', 'claimed'].includes(completedRetry.status) ||
        (await confirmedGuestOrder(completedRetry)))
    )
      return {
        id: completedRetry.id,
        return_path: guestPaths(completedRetry.id, completedRetry.locale)
          .success,
      };
    const purchase = await confirmedGuestOrder(row);
    if (!purchase?.subscriptionId) throw new GuestCheckoutError('please_retry');
    const history = await getGuestSubscriptionHistory(
      row.email,
      purchase.subscriptionId
    );
    if (history.hasCurrent) {
      await updateGuest(id, { trialDecision: 'existing_subscription' }, lease);
      throw new GuestCheckoutError('existing_subscription');
    }
    let retry = await guestPaidRetry(id);
    if (retry?.status === 'abandoned') {
      await updateGuest(retry.id, { retryOf: null });
      retry = undefined;
    }
    const input = {
      locale: row.locale === 'zh' ? ('zh' as const) : ('en' as const),
      backup: guestBackupSchema.parse(JSON.parse(row.backup)),
    };
    if (!retry) await saveGuest(input, token, id);
    return await startGuestCheckout(input, token, requestUrl, id);
  } finally {
    await releaseGuest(id, lease);
  }
}

export async function sendGuestClaim(id: string) {
  const row = await guestById(id);
  if (!row || !['fulfilled', 'claimed'].includes(row.status)) return;
  const configs = await getAllConfigs();
  await getAuth(configs).api.signInMagicLink({
    headers: new Headers({ origin: configs.app_url }),
    body: {
      email: row.email,
      name: row.email.split('@')[0],
      callbackURL: guestPaths(row.id, row.locale).claim,
      metadata: { purchaseId: row.id },
    },
  });
}

export async function completeGuestCheckout(id: string) {
  let row = await guestById(id);
  if (
    !row ||
    ['claimed', 'trial_rejected', 'abandoned'].includes(row.status) ||
    !(await confirmedGuestOrder(row))
  )
    return;
  const lease = await leaseGuest(id);
  if (!lease) throw new GuestCheckoutError('please_retry');
  try {
    row = (await guestById(id))!;
    const purchase = await confirmedGuestOrder(row);
    if (!purchase) return;
    await updateGuest(id, { lastCheckedAt: new Date().toISOString() }, lease);
    // Only a provider-confirmed payment or card-backed trial establishes the recipient.
    if (!row.email) {
      await updateGuest(
        id,
        { email: purchase.paymentEmail!.trim().toLowerCase() },
        lease
      );
      row = (await guestById(id))!;
    }
    if (purchase.status === 'trialing' && row.status !== 'fulfilled') {
      if (!row.trialDecision) {
        const reserved = await reserveGuestTrial(row, lease);
        const history = await getGuestSubscriptionHistory(
          row.email,
          purchase.subscriptionId!
        );
        const decision = history.hasCurrent
          ? 'existing_subscription'
          : !reserved || history.hasHistory
            ? 'trial_used'
            : 'eligible';
        await updateGuest(
          id,
          {
            trialDecision: decision,
            ...(decision !== 'eligible'
              ? { status: 'trial_cancel_pending' }
              : {}),
          },
          lease
        );
        row = (await guestById(id))!;
      }
      if (row.trialDecision !== 'eligible') {
        // Persist the decision before the external call; failed cancellation is retried.
        await rejectGuestTrial(purchase.subscriptionId!, row.id);
        await updateGuest(
          id,
          { status: 'trial_rejected', lastError: null },
          lease
        );
        return;
      }
    }
    if (row.status !== 'fulfilled') {
      const values = guestBackupSchema.parse(JSON.parse(row.backup));
      if (values.source !== 'private_playlist') {
        const store = createGuardStore();
        const input = normalizeGuardSource({
          source: 'playlist',
          name: row.locale === 'zh' ? '播放列表备份' : 'Playlist backup',
          url: values.url,
          frequency: values.frequency,
          notifyMissing: values.notifyMissing,
          notifyAdded: values.notifyAdded,
          notifyRestored: values.notifyRestored,
          emailDelivery: false,
        });
        let collection = (await store.list(row.userId)).find(
          (item) => item.url === values.url
        );
        if (!collection)
          collection = await store.create(row.userId, input.input, input.key);
        await updateGuest(id, { collectionId: collection.id }, lease);
        // Persist before scanning: a YouTube outage must never lose a paid backup.
        if (!collection.lastSyncedAt) {
          try {
            await store.sync(
              row.userId,
              collection.id,
              (await guardRuntime()).scan
            );
          } catch {
            /* Retry from Collections or the existing scheduler. */
          }
        }
      }
      await updateGuest(id, { status: 'fulfilled', lastError: null }, lease);
    }
    if (!row.mailSentAt) await sendGuestClaim(id);
  } catch (error) {
    await updateGuest(
      id,
      {
        lastError:
          (await guestById(id))?.status === 'trial_cancel_pending'
            ? 'trial_cancel_pending'
            : (await guestById(id))?.status === 'fulfilled'
              ? 'email_pending'
              : 'backup_pending',
      },
      lease
    );
    throw error;
  } finally {
    await releaseGuest(id, lease);
  }
}

export async function recoverGuestCheckout(id: string) {
  const row = await guestById(id);
  if (!row || ['abandoned', 'trial_rejected'].includes(row.status)) return;
  if (row.orderNo) await handlePaymentCallback(row.orderNo);
  await completeGuestCheckout(id);
}

/** Bounded durable retry, also covering completed Checkout when the browser never returns. */
export async function retryGuestCheckouts() {
  let failed = 0;
  const rows = await pendingGuestCheckouts();
  for (const row of rows) {
    await updateGuest(row.id, { lastCheckedAt: new Date().toISOString() });
    try {
      await recoverGuestCheckout(row.id);
      const latest = (await guestById(row.id))!;
      if (
        latest.status === 'pending' &&
        Date.now() > new Date(latest.expiresAt).getTime()
      )
        await cancelGuestCheckout(row.id);
    } catch {
      failed++;
    }
  }
  return { checked: rows.length, failed };
}

export async function cancelGuestCheckout(id: string) {
  const lease = await leaseGuest(id);
  if (!lease) throw new GuestCheckoutError('please_retry');
  let completed = false;
  try {
    const row = await guestById(id);
    if (!row || row.status !== 'pending') return;
    if (
      !row.checkoutSessionId &&
      Date.now() < new Date(row.expiresAt).getTime()
    )
      throw new GuestCheckoutError('please_retry');
    completed =
      !!row.checkoutSessionId &&
      (await expireGuestPaymentSession(row.checkoutSessionId)) === 'complete';
    if (!completed)
      await updateGuest(
        id,
        { status: 'abandoned', activeBrowserHash: null },
        lease
      );
  } finally {
    await releaseGuest(id, lease);
  }
  if (completed) await recoverGuestCheckout(id);
}

export async function completeGuestFromOrder(orderNo: string) {
  const row = await guestByOrder(orderNo);
  if (row) await completeGuestCheckout(row.id);
}
export async function completeGuestFromEvent(
  session:
    | {
        paymentResult?: { id?: string };
        metadata?: Record<string, unknown>;
        paymentStatus?: string;
      }
    | undefined
) {
  const id = session?.metadata?.guest_checkout_id;
  const row =
    typeof id === 'string'
      ? await guestById(id)
      : session?.paymentResult?.id
        ? await guestBySession(session.paymentResult.id)
        : null;
  if (row) {
    // Retry if Stripe notifies before the initiating request persists its order.
    if (
      session?.paymentStatus === PaymentStatus.SUCCESS &&
      ['pending', 'trial_cancel_pending'].includes(row.status) &&
      !(await confirmedGuestOrder(row))
    )
      throw new GuestCheckoutError('please_retry');
    await completeGuestCheckout(row.id);
  }
}
