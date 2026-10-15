import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  AlipayProvider,
  CreemProvider,
  PaymentManager,
  StripeProvider,
  WechatPayProvider,
} from '@/core/payment';
import {
  PaymentStatus,
  PaymentType,
  SubscriptionCycleType,
  type CheckoutSession,
  type PaymentEvent,
  type PaymentOrder,
} from '@/core/payment/types';
import {
  credit,
  order,
  subscription,
  type Subscription,
} from '@/config/db/schema';
import { getGuardPlan, getGuardStripePriceId } from '@/config/guard-plans';
import { getAllConfigs } from '@/modules/config/service';
import { calculateCreditExpirationTime } from '@/modules/credits/service';
import {
  findByProviderSubscriptionId,
  findBySubscriptionNo,
  SubscriptionStatus,
  updateBySubscriptionNo,
  type NewSubscription,
  type UpdateSubscription,
} from '@/modules/subscriptions/service';
import { getSnowId, getUniSeq, getUuid } from '@/lib/hash';

// --- Order types ---

enum OrderStatus {
  PENDING = 'pending',
  CREATED = 'created',
  PAID = 'paid',
  FAILED = 'failed',
  TRIALING = 'trialing',
}

// --- Payment Manager ---

let manager: PaymentManager | null = null;
let managerConfigHash = '';

async function getPaymentManager(): Promise<PaymentManager> {
  const configs = await getAllConfigs();
  const c = (key: string) => configs[key] || '';

  // Rebuild manager if provider configs changed
  const hash = JSON.stringify([
    c('stripe_secret_key') || c('stripe_api_key'),
    c('stripe_signing_secret') || c('stripe_webhook_secret'),
    c('stripe_portal_configuration_id'),
    c('creem_enabled'),
    c('creem_api_key'),
    c('alipay_app_id'),
    c('wechat_mch_id'),
    c('default_payment_provider'),
  ]);
  if (manager && hash === managerConfigHash) return manager;

  manager = new PaymentManager();
  managerConfigHash = hash;

  const stripeKey = c('stripe_secret_key') || c('stripe_api_key');
  if (stripeKey) {
    const isDefault =
      !c('default_payment_provider') ||
      c('default_payment_provider') === 'stripe';
    manager.addProvider(
      new StripeProvider({
        secretKey: stripeKey,
        publishableKey: c('stripe_publishable_key'),
        signingSecret:
          c('stripe_signing_secret') || c('stripe_webhook_secret') || undefined,
        portalConfigurationId: c('stripe_portal_configuration_id'),
        allowPromotionCodes: true,
        allowedPaymentMethods: ['card', 'wechat_pay', 'alipay'],
      }),
      isDefault
    );
  }

  if (c('creem_enabled') === 'true' && c('creem_api_key')) {
    const isDefault = c('default_payment_provider') === 'creem';
    manager.addProvider(
      new CreemProvider({
        apiKey: c('creem_api_key'),
        signingSecret: c('creem_signing_secret') || undefined,
        environment:
          c('creem_environment') === 'production' ? 'production' : 'sandbox',
      }),
      isDefault
    );
  }

  if (c('alipay_app_id') && c('alipay_private_key')) {
    const isDefault = c('default_payment_provider') === 'alipay';
    manager.addProvider(
      new AlipayProvider({
        appId: c('alipay_app_id'),
        privateKey: c('alipay_private_key'),
        alipayPublicKey: c('alipay_public_key'),
        notifyUrl: c('alipay_notify_url') || undefined,
      }),
      isDefault
    );
  }

  if (c('wechat_mch_id') && c('wechat_private_key')) {
    const isDefault = c('default_payment_provider') === 'wechat';
    manager.addProvider(
      new WechatPayProvider({
        appId: c('wechat_app_id'),
        mchId: c('wechat_mch_id'),
        apiV3Key: c('wechat_api_v3_key'),
        privateKey: c('wechat_private_key'),
        serialNo: c('wechat_serial_no'),
        notifyUrl: c('wechat_notify_url') || undefined,
        platformCert: c('wechat_platform_cert') || undefined,
      }),
      isDefault
    );
  }

  return manager;
}

// --- Checkout ---

export async function getGuardCheckoutOptions(userId: string, email: string) {
  const rows: Subscription[] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId));
  const history = rows.filter((s) => getGuardPlan(s.productId || ''));
  const provider = (await getPaymentManager()).getProvider('stripe');
  if (!(provider instanceof StripeProvider))
    throw new Error('Stripe is not configured');
  const remote = await provider.getSubscriptionAccess(email, userId);
  return {
    trialEligible: history.length === 0 && !remote.hasHistory,
    hasSubscription:
      remote.hasCurrent ||
      history.some(
        (s) => !['canceled', 'expired'].includes(s.status) && !s.deletedAt
      ),
  };
}

export async function createCheckout(params: {
  userId: string;
  userEmail?: string;
  paymentOrder: PaymentOrder;
  provider?: string;
  productName?: string;
  planName?: string;
  credits?: number;
  creditsValidDays?: number;
}): Promise<CheckoutSession> {
  const {
    userId,
    userEmail,
    paymentOrder,
    provider,
    productName,
    planName,
    credits,
    creditsValidDays,
  } = params;
  const pm = await getPaymentManager();
  const orderNo = getUniSeq('ORD');
  const configs = await getAllConfigs();
  const appUrl = configs.app_url || 'http://localhost:3000';

  // Resolve provider-specific product ID (e.g. Creem product_ids_mapping)
  const resolvedProvider = provider || pm.getDefaultProvider()?.name;
  let resolvedProductId = paymentOrder.productId;
  if (resolvedProvider === 'creem' && paymentOrder.productId) {
    const mapping = configs.creem_product_ids_mapping;
    if (mapping) {
      try {
        const map = JSON.parse(mapping) as Record<string, string>;
        if (map[paymentOrder.productId]) {
          resolvedProductId = map[paymentOrder.productId];
        }
      } catch {
        // invalid JSON — fall through with original productId
      }
    }
  }

  const stripePriceId =
    resolvedProvider === 'stripe' && paymentOrder.productId
      ? getGuardStripePriceId(configs, paymentOrder.productId)
      : null;
  if (
    resolvedProvider === 'stripe' &&
    getGuardPlan(paymentOrder.productId || '') &&
    !stripePriceId
  ) {
    throw new Error('Annual Stripe price not configured');
  }

  const finalSuccessUrl =
    paymentOrder.successUrl || `${appUrl}/settings/billing?success=1`;
  const callbackSuccessUrl = `${appUrl}/api/payment/callback?order_no=${orderNo}&redirect=${encodeURIComponent(finalSuccessUrl)}`;

  const session = await pm.createPayment({
    order: {
      ...paymentOrder,
      productId: resolvedProductId,
      priceId: stripePriceId || undefined,
      metadata: {
        ...paymentOrder.metadata,
        app: 'export-youtube-playlist',
        user_id: userId,
        product_id: paymentOrder.productId || '',
        order_no: orderNo,
        trial_days: String(paymentOrder.plan?.trialPeriodDays || 0),
      },
      orderNo,
      successUrl: callbackSuccessUrl,
      cancelUrl:
        paymentOrder.cancelUrl || `${appUrl}/settings/billing?canceled=1`,
    },
    provider,
  });

  await db()
    .insert(order)
    .values({
      id: `checkout_${session.checkoutInfo.sessionId}`,
      orderNo: session.metadata?.order_no || orderNo,
      userId,
      userEmail: userEmail || '',
      status: OrderStatus.CREATED,
      amount: paymentOrder.price?.amount || 0,
      currency: paymentOrder.price?.currency || 'usd',
      productId: paymentOrder.productId || '',
      paymentProductId: stripePriceId || resolvedProductId || '',
      productName: productName || null,
      planName: planName || null,
      creditsAmount: credits ?? null,
      creditsValidDays: creditsValidDays ?? null,
      paymentType: paymentOrder.type || 'one-time',
      paymentProvider: session.provider,
      paymentSessionId: session.checkoutInfo.sessionId,
      checkoutInfo: JSON.stringify(session.checkoutInfo),
      checkoutResult: JSON.stringify(session.checkoutResult),
      checkoutUrl: session.checkoutInfo.checkoutUrl,
      description: paymentOrder.description || '',
    })
    .onConflictDoNothing();

  return session;
}

// --- Payment callback (return_url) ---

export async function handlePaymentCallback(orderNo: string) {
  // Find the order
  const [existingOrder] = await db()
    .select()
    .from(order)
    .where(eq(order.orderNo, orderNo))
    .limit(1);

  if (!existingOrder) return;
  if (
    [OrderStatus.PAID, OrderStatus.TRIALING].includes(
      existingOrder.status as OrderStatus
    )
  )
    return;

  // Query the payment provider for latest status
  const pm = await getPaymentManager();
  const provider = pm.getProvider(existingOrder.paymentProvider);
  if (!provider) return;

  const session = await provider.getPaymentSession({
    sessionId: existingOrder.paymentSessionId || existingOrder.orderNo,
  });

  // Reuse the same atomic success handler as the webhook so that
  // subscriptions are created and credits granted on synchronous return too.
  // This is important in environments where webhooks aren't reachable (e.g. localhost).
  await handleCheckoutSuccess(session, existingOrder.paymentProvider);
}

// --- Webhook handling ---

export async function handleWebhook(params: {
  req: Request;
  provider: string;
}): Promise<PaymentEvent> {
  const pm = await getPaymentManager();
  const event = await pm.getPaymentEvent({
    req: params.req,
    provider: params.provider,
  });
  const session = event.paymentSession;
  if (!session) return event;

  const eventType = event.eventType;

  // Route event to appropriate handler
  if (
    eventType === 'payment.success' &&
    session.paymentInfo?.subscriptionCycleType === SubscriptionCycleType.RENEWAL
  ) {
    await handleSubscriptionRenewal(session, params.provider);
  } else if (eventType === 'payment.failed' && session.subscriptionId) {
    await handleSubscriptionUpdated(session, params.provider);
  } else if (
    eventType === 'checkout.success' ||
    eventType === 'payment.success' ||
    eventType === 'payment.failed'
  ) {
    await handleCheckoutSuccess(session, params.provider);
  } else if (eventType === 'subscribe.updated') {
    await handleSubscriptionUpdated(session, params.provider);
  } else if (eventType === 'subscribe.canceled') {
    await handleSubscriptionCanceled(session, params.provider);
  }

  return event;
}

// --- Checkout Success: update order + create subscription + grant credits ---

async function handleCheckoutSuccess(session: any, provider: string) {
  // Different providers expose the session identifier under different keys.
  // We try the common shapes; for Alipay the natural key is out_trade_no
  // (which equals our orderNo and the value we stored in paymentSessionId).
  const result = session.paymentResult || {};
  const sessionId: string =
    result.id ||
    result.object?.id ||
    result.out_trade_no ||
    result.outTradeNo ||
    '';
  if (!sessionId) return;

  // Find order by session ID
  const [existingOrder] = await db()
    .select()
    .from(order)
    .where(
      and(
        eq(order.paymentSessionId, sessionId),
        eq(order.paymentProvider, provider),
        isNull(order.deletedAt)
      )
    )
    .limit(1);

  if (!existingOrder) return;

  // Idempotency: skip if already paid
  if (
    [OrderStatus.PAID, OrderStatus.TRIALING].includes(
      existingOrder.status as OrderStatus
    )
  )
    return;
  if (
    existingOrder.status !== OrderStatus.CREATED &&
    existingOrder.status !== OrderStatus.PENDING
  )
    return;

  const paymentInfo = session.paymentInfo;
  const subscriptionInfo = session.subscriptionInfo;

  if (session.paymentStatus === PaymentStatus.SUCCESS) {
    const isTrial =
      subscriptionInfo?.status === SubscriptionStatus.TRIALING ||
      session.subscriptionResult?.status === 'trialing';
    // Prepare order update
    const orderUpdate: Record<string, any> = {
      status: isTrial ? OrderStatus.TRIALING : OrderStatus.PAID,
      paymentResult: JSON.stringify(session.paymentResult),
      paymentAmount: paymentInfo?.paymentAmount ?? null,
      paymentCurrency: paymentInfo?.paymentCurrency || null,
      paymentEmail: paymentInfo?.paymentEmail || null,
      paidAt: isTrial ? null : paymentInfo?.paidAt || new Date(),
      transactionId: paymentInfo?.transactionId || null,
      invoiceId: paymentInfo?.invoiceId || null,
      invoiceUrl: paymentInfo?.invoiceUrl || null,
      paymentUserName: paymentInfo?.paymentUserName || null,
      paymentUserId: paymentInfo?.paymentUserId || null,
      discountCode: paymentInfo?.discountCode || null,
      discountAmount: paymentInfo?.discountAmount || null,
    };

    // Atomically update order + create subscription + grant credits
    await atomicPaymentWrites((tx: any) => {
      const writes: any[] = [];
      // 1. Create subscription if applicable
      if (subscriptionInfo && session.subscriptionId) {
        const subNo = `SUB${existingOrder.orderNo}`;
        const newSub: any = {
          id: `sub_${existingOrder.id}`,
          subscriptionNo: subNo,
          userId: existingOrder.userId,
          userEmail:
            existingOrder.userEmail || existingOrder.paymentEmail || '',
          status: subscriptionInfo.status || SubscriptionStatus.ACTIVE,
          paymentProvider: provider,
          subscriptionId: session.subscriptionId,
          subscriptionResult: JSON.stringify(session.subscriptionResult),
          productId: existingOrder.productId,
          description: subscriptionInfo.description || 'Subscription Created',
          amount: subscriptionInfo.amount,
          currency: subscriptionInfo.currency,
          interval: subscriptionInfo.interval,
          intervalCount: subscriptionInfo.intervalCount,
          trialPeriodDays: subscriptionInfo.trialPeriodDays,
          currentPeriodStart: subscriptionInfo.currentPeriodStart,
          currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
          billingUrl: subscriptionInfo.billingUrl,
          planName: existingOrder.planName || existingOrder.productName,
          productName: existingOrder.productName,
          creditsAmount: existingOrder.creditsAmount,
          creditsValidDays: existingOrder.creditsValidDays,
          paymentProductId: existingOrder.paymentProductId,
          paymentUserId: paymentInfo?.paymentUserId,
        };
        writes.push(
          tx.insert(subscription).values(newSub).onConflictDoNothing()
        );
        orderUpdate.subscriptionNo = subNo;
        orderUpdate.subscriptionId = session.subscriptionId;
        orderUpdate.subscriptionResult = JSON.stringify(
          session.subscriptionResult
        );
      }

      // 2. Grant credits if applicable
      if (
        !isTrial &&
        existingOrder.creditsAmount &&
        existingOrder.creditsAmount > 0
      ) {
        const credits = existingOrder.creditsAmount;
        const expiresAt = calculateCreditExpirationTime({
          creditsValidDays: existingOrder.creditsValidDays || 0,
          currentPeriodEnd: subscriptionInfo?.currentPeriodEnd,
        });

        writes.push(
          tx
            .insert(credit)
            .values({
              id: `credit_${existingOrder.id}`,
              userId: existingOrder.userId,
              userEmail: existingOrder.userEmail || '',
              orderNo: existingOrder.orderNo,
              subscriptionNo: orderUpdate.subscriptionNo || '',
              transactionNo: getSnowId(),
              transactionType: 'grant',
              transactionScene:
                existingOrder.paymentType === 'subscription'
                  ? 'subscription'
                  : 'payment',
              credits,
              remainingCredits: credits,
              description: 'Grant credit',
              expiresAt,
              status: 'active',
            })
            .onConflictDoNothing()
        );
      }

      // 3. Update order
      writes.push(
        tx
          .update(order)
          .set(orderUpdate)
          .where(
            and(
              eq(order.id, existingOrder.id),
              eq(order.status, existingOrder.status)
            )
          )
      );
      return writes;
    });
  } else if (
    session.paymentStatus === PaymentStatus.FAILED ||
    session.paymentStatus === PaymentStatus.CANCELED
  ) {
    await db()
      .update(order)
      .set({
        status: OrderStatus.FAILED,
        paymentResult: JSON.stringify(session.paymentResult),
      })
      .where(
        and(
          eq(order.id, existingOrder.id),
          eq(order.status, existingOrder.status)
        )
      );
  }
}

// --- Subscription Renewal ---

export async function handleSubscriptionRenewal(
  session: any,
  provider: string
) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub || !existingSub.amount || !existingSub.currency) return;

  const subscriptionInfo = session.subscriptionInfo;
  if (
    !subscriptionInfo.currentPeriodStart ||
    !subscriptionInfo.currentPeriodEnd
  )
    return;

  if (session.paymentStatus !== PaymentStatus.SUCCESS) return;

  const paymentInfo = session.paymentInfo;

  // Idempotency: drop duplicate renewals for the same provider transaction.
  if (paymentInfo?.transactionId) {
    const [dup] = await db()
      .select({ id: order.id })
      .from(order)
      .where(
        and(
          eq(order.transactionId, paymentInfo.transactionId),
          eq(order.paymentProvider, provider)
        )
      )
      .limit(1);
    if (dup) return;
  }

  if (!paymentInfo?.transactionId)
    throw new Error('Renewal transaction ID missing');
  const renewalOrderNo = `RENEW_${provider}_${paymentInfo.transactionId}`;

  await atomicPaymentWrites((tx: any) => {
    const writes: any[] = [];
    // 1. Update subscription period
    writes.push(
      tx
        .update(subscription)
        .set({
          currentPeriodStart: subscriptionInfo.currentPeriodStart,
          currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
          status: subscriptionInfo.status,
          subscriptionResult: JSON.stringify(session.subscriptionResult),
        })
        .where(eq(subscription.subscriptionNo, existingSub.subscriptionNo))
    );

    // 2. Create renewal order
    writes.push(
      tx
        .insert(order)
        .values({
          id: renewalOrderNo,
          orderNo: renewalOrderNo,
          userId: existingSub.userId,
          userEmail: existingSub.userEmail || '',
          status: OrderStatus.PAID,
          amount: existingSub.amount,
          currency: existingSub.currency,
          productId: existingSub.productId || '',
          paymentType: 'renew',
          paymentInterval: existingSub.interval || '',
          paymentProvider: provider,
          checkoutInfo: '',
          description: 'Subscription Renewal',
          productName: existingSub.productName || '',
          planName: existingSub.planName || '',
          creditsAmount: existingSub.creditsAmount,
          creditsValidDays: existingSub.creditsValidDays,
          paymentProductId: existingSub.paymentProductId || '',
          paymentResult: JSON.stringify(session.paymentResult),
          paymentAmount: paymentInfo?.paymentAmount,
          paymentCurrency: paymentInfo?.paymentCurrency,
          paymentEmail: paymentInfo?.paymentEmail,
          paidAt: paymentInfo?.paidAt || new Date(),
          invoiceId: paymentInfo?.invoiceId,
          invoiceUrl: paymentInfo?.invoiceUrl,
          subscriptionNo: existingSub.subscriptionNo,
          subscriptionId: session.subscriptionId,
          transactionId: paymentInfo?.transactionId,
          paymentUserName: paymentInfo?.paymentUserName,
          paymentUserId: paymentInfo?.paymentUserId,
        })
        .onConflictDoNothing()
    );

    // 3. Grant credits for renewal
    if (existingSub.creditsAmount && existingSub.creditsAmount > 0) {
      const credits = existingSub.creditsAmount;
      const expiresAt = calculateCreditExpirationTime({
        creditsValidDays: existingSub.creditsValidDays || 0,
        currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
      });

      writes.push(
        tx
          .insert(credit)
          .values({
            id: `credit_${renewalOrderNo}`,
            userId: existingSub.userId,
            userEmail: existingSub.userEmail || '',
            orderNo: renewalOrderNo,
            subscriptionNo: existingSub.subscriptionNo,
            transactionNo: getSnowId(),
            transactionType: 'grant',
            transactionScene: 'renewal',
            credits,
            remainingCredits: credits,
            description: 'Grant credit',
            expiresAt,
            status: 'active',
          })
          .onConflictDoNothing()
      );
    }
    return writes;
  });
}

// --- Subscription Updated ---

async function handleSubscriptionUpdated(session: any, provider: string) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub) return;

  const info = session.subscriptionInfo;
  // Stripe can report active as soon as a trial ends, before the first annual
  // invoice is paid. Only invoice.payment_succeeded extends paid access.
  const extendsPeriod =
    existingSub.currentPeriodEnd &&
    info.currentPeriodEnd > existingSub.currentPeriodEnd;
  const awaitingPayment =
    extendsPeriod &&
    [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING_CANCEL].includes(
      info.status
    );
  await updateBySubscriptionNo(existingSub.subscriptionNo, {
    status: awaitingPayment ? existingSub.status : info.status,
    currentPeriodStart: awaitingPayment
      ? existingSub.currentPeriodStart
      : info.currentPeriodStart,
    currentPeriodEnd: awaitingPayment
      ? existingSub.currentPeriodEnd
      : info.currentPeriodEnd,
    canceledAt: info.canceledAt || null,
    canceledEndAt: info.canceledEndAt || null,
    canceledReason: info.canceledReason || '',
    canceledReasonType: info.canceledReasonType || '',
    subscriptionResult: JSON.stringify(session.subscriptionResult),
  });
}

// --- Subscription Canceled ---

async function handleSubscriptionCanceled(session: any, provider: string) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub) return;

  const info = session.subscriptionInfo;
  await updateBySubscriptionNo(existingSub.subscriptionNo, {
    status: SubscriptionStatus.CANCELED,
    canceledAt: info.canceledAt,
    canceledEndAt: info.canceledEndAt,
    canceledReason: info.canceledReason,
    canceledReasonType: info.canceledReasonType,
  });
}

// --- Cancel subscription (user-initiated) ---

export async function cancelUserSubscription(params: {
  userId: string;
  subscriptionNo: string;
}) {
  const { userId, subscriptionNo } = params;

  const sub = await findBySubscriptionNo(subscriptionNo);
  if (!sub) throw new Error('Subscription not found');
  if (sub.userId !== userId) throw new Error('Forbidden');

  if (
    sub.status === SubscriptionStatus.CANCELED ||
    sub.status === SubscriptionStatus.EXPIRED
  ) {
    return sub;
  }

  const pm = await getPaymentManager();
  const provider = pm.getProvider(sub.paymentProvider);
  if (!provider || !provider.cancelSubscription) {
    throw new Error('Cancellation not supported for this provider');
  }

  const session = await provider.cancelSubscription({
    subscriptionId: sub.subscriptionId,
  });

  const info = session.subscriptionInfo;
  const updated = await updateBySubscriptionNo(subscriptionNo, {
    status: info?.status || SubscriptionStatus.CANCELED,
    canceledAt: info?.canceledAt || new Date(),
    canceledEndAt: info?.canceledEndAt || null,
    canceledReason: info?.canceledReason || 'Canceled by user',
    canceledReasonType: info?.canceledReasonType || 'user_request',
  });

  return updated;
}

// --- Billing portal ---

export async function createUserBillingPortal(
  userId: string,
  subscriptionNo: string
) {
  const sub = await findBySubscriptionNo(subscriptionNo);
  if (
    !sub ||
    sub.userId !== userId ||
    sub.paymentProvider !== 'stripe' ||
    !sub.paymentUserId
  ) {
    throw new Error('Billing subscription not found');
  }
  const configs = await getAllConfigs();
  if (!configs.stripe_portal_configuration_id)
    throw new Error('Billing portal not configured');
  const provider = (await getPaymentManager()).getProvider('stripe');
  if (!provider?.getPaymentBilling)
    throw new Error('Billing portal unavailable');
  return provider.getPaymentBilling({
    customerId: sub.paymentUserId,
    returnUrl: `${configs.app_url}/settings/billing`,
  });
}

// --- Query helpers ---

export async function getUserOrders(userId: string) {
  return db()
    .select()
    .from(order)
    .where(and(eq(order.userId, userId), isNull(order.deletedAt)))
    .orderBy(desc(order.createdAt));
}

/** D1 and libSQL batches are atomic and avoid overlapping interactive transactions. */
async function atomicPaymentWrites(build: (tx: any) => any[]) {
  const database = db();
  if (typeof database.batch === 'function') {
    await database.batch(build(database));
  } else {
    await database.transaction(async (tx: any) => {
      for (const statement of build(tx)) await statement;
    });
  }
}
