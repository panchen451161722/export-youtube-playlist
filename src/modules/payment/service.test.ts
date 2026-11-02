import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import Stripe from 'stripe';

import {
  config,
  credit,
  order,
  subscription,
  user,
  type Subscription,
} from '@/config/db/schema';

// Separate disposable DB and signed provider fixtures. No real Stripe account or user data.
const folder = mkdtempSync(join(tmpdir(), 'eyp-payment-'));
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DATABASE_URL = `file:${folder}/test.db`;
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
process.env.STRIPE_SIGNING_SECRET = 'whsec_test_fixture';
const client = createClient({ url: process.env.DATABASE_URL });
const database = drizzle(client);
for (const table of [config, credit, order, subscription, user]) {
  const info = getTableConfig(table);
  await client.execute(
    `CREATE TABLE "${info.name}" (${info.columns.map((c) => `"${c.name}" ${c.getSQLType()}${c.primary ? ' PRIMARY KEY' : ''}`).join(',')})`
  );
}
const {
  handleWebhook,
  createUserBillingPortal,
  guardCheckoutOptionsFor,
  cancelUserSubscription,
} = await import('./service');
const originalFetch = globalThis.fetch;
let providerStatus = 'active';
let providerId = 'sub_test';
let trialStart: number | null = null;
let trialEnd: number | null = null;
let periodOffset = 0;
const start = Math.floor(Date.now() / 1000);
const providerSub = () => ({
  id: providerId,
  trial_start: trialStart,
  trial_end: trialEnd,
  default_payment_method: 'pm_fixture',
  status: providerStatus,
  cancel_at_period_end: false,
  metadata: {},
  items: {
    data: [
      {
        price: {
          id: 'price_test',
          product: 'prod_test',
          unit_amount: 990,
          currency: 'usd',
        },
        plan: { interval: 'year', interval_count: 1 },
        current_period_start: start + periodOffset,
        current_period_end: start + periodOffset + 31536000,
      },
    ],
  },
});
const welcomeMessages: any[] = [];
let failWelcome = false;
let cancellationFetch: typeof fetch | undefined;
globalThis.fetch = async (input, init) => {
  if (cancellationFetch) return cancellationFetch(input, init);
  const url = String(input);
  if (url === 'http://localhost:3103/mail') {
    welcomeMessages.push(JSON.parse(String(init?.body)));
    return new Response('', { status: failWelcome ? 503 : 200 });
  }
  assert.match(url, /api\.stripe\.com\/v1\/subscriptions\/sub_/);
  return Response.json(providerSub());
};
after(() => {
  globalThis.fetch = originalFetch;
  client.close();
  rmSync(folder, { recursive: true, force: true });
});

function event(type: string, object: unknown) {
  const payload = JSON.stringify({
    id: 'evt_fixture',
    type,
    livemode: false,
    data: { object },
  });
  return {
    provider: 'stripe',
    req: new Request('http://localhost/api/payment/notify/stripe', {
      method: 'POST',
      body: payload,
      headers: {
        'stripe-signature': Stripe.webhooks.generateTestHeaderString({
          payload,
          secret: process.env.STRIPE_SIGNING_SECRET!,
        }),
      },
    }),
  };
}
const checkout = {
  id: 'cs_test_annual',
  status: 'complete',
  payment_status: 'paid',
  amount_total: 990,
  currency: 'usd',
  customer: 'cus_test',
  subscription: 'sub_test',
  invoice: 'in_first',
  created: start,
};

test('async checkout completion is recorded before payment without granting credits', async (t) => {
  t.after(async () => {
    await database.delete(order).where(eq(order.id, 'async-funnel'));
  });
  const session = {
    ...checkout,
    id: 'cs_async_funnel',
    subscription: null,
    payment_status: 'unpaid',
  };
  await database.insert(order).values({
    id: 'async-funnel',
    orderNo: 'ASYNC_FUNNEL',
    userId: 'async-user',
    status: 'created',
    amount: 990,
    currency: 'usd',
    checkoutInfo: '{}',
    paymentType: 'one-time',
    paymentProvider: 'stripe',
    paymentSessionId: session.id,
  });
  await handleWebhook(event('checkout.session.completed', session));
  await handleWebhook(event('checkout.session.completed', session));
  let persisted = (await database.select().from(order)).find(
    (row) => row.id === 'async-funnel'
  )!;
  assert.equal(persisted.status, 'created');
  assert.equal(persisted.paidAt, null);
  assert.equal(JSON.parse(persisted.paymentResult!).status, 'complete');
  assert.equal(
    (await database.select().from(credit)).filter(
      (row) => row.orderNo === 'ASYNC_FUNNEL'
    ).length,
    0
  );
  await handleWebhook(
    event('checkout.session.async_payment_succeeded', {
      ...session,
      payment_status: 'paid',
    })
  );
  await handleWebhook(event('checkout.session.completed', session));
  persisted = (await database.select().from(order)).find(
    (row) => row.id === 'async-funnel'
  )!;
  assert.equal(persisted.status, 'paid');
  assert.equal(persisted.paymentAmount, 990);
});

test('pricing distinguishes renewal-off access from an ended subscription without granting another trial', () => {
  const now = Date.UTC(2026, 9, 22);
  const ends = new Date(now + 86_400_000);
  const manual = {
    id: 'manual-lite',
    subscriptionNo: 'manual-lite',
    userId: 'fixture',
    productId: 'guard_lite_yearly',
    status: 'pending_cancel',
    paymentProvider: 'manual',
    subscriptionId: 'manual-fixture',
    currentPeriodStart: new Date(now - 86_400_000),
    currentPeriodEnd: ends,
    // Deliberately later: provider fallback dates must not extend trial access.
    canceledEndAt: new Date(now + 365 * 86_400_000),
    createdAt: new Date(now - 86_400_000),
    deletedAt: null,
  } as Subscription;
  const remote = { hasHistory: false, hasCurrent: false };
  assert.deepEqual(guardCheckoutOptionsFor([manual], remote, now), {
    hasSubscription: true,
    trialEligible: false,
    currentSubscription: {
      planId: 'lite',
      currentPeriodEnd: ends.toISOString(),
      renewalOff: true,
    },
  });
  for (const status of ['active', 'trialing', 'pending_cancel']) {
    for (const offset of [0, -1]) {
      const expired = {
        ...manual,
        status,
        currentPeriodEnd: new Date(now + offset),
      };
      assert.deepEqual(guardCheckoutOptionsFor([expired], remote, now), {
        hasSubscription: false,
        trialEligible: false,
        currentSubscription: null,
      });
      assert.equal(
        guardCheckoutOptionsFor(
          [expired],
          { hasHistory: true, hasCurrent: true },
          now
        ).hasSubscription,
        true
      );
    }
  }
  for (const patch of [
    { status: 'canceled' },
    { status: 'expired' },
    { deletedAt: new Date(now) },
  ]) {
    assert.deepEqual(
      guardCheckoutOptionsFor([{ ...manual, ...patch }], remote, now),
      {
        hasSubscription: false,
        trialEligible: false,
        currentSubscription: null,
      }
    );
  }
  assert.deepEqual(guardCheckoutOptionsFor([], remote, now), {
    hasSubscription: false,
    trialEligible: true,
    currentSubscription: null,
  });
  assert.deepEqual(
    guardCheckoutOptionsFor([], { hasHistory: true, hasCurrent: true }, now),
    {
      hasSubscription: true,
      trialEligible: false,
      currentSubscription: null,
    }
  );
  for (const status of ['paused', 'past_due', 'pending']) {
    assert.equal(
      guardCheckoutOptionsFor(
        [{ ...manual, status, currentPeriodEnd: new Date(now - 1) }],
        remote,
        now
      ).hasSubscription,
      true
    );
  }
  // Unknown deadlines stay blocked until the subscription can be reconciled.
  assert.equal(
    guardCheckoutOptionsFor(
      [{ ...manual, currentPeriodEnd: null }],
      remote,
      now
    ).hasSubscription,
    true
  );
});

test('pricing identifies the same highest valid tier as access checks, ignoring expired and unrelated plans', () => {
  const now = Date.UTC(2026, 9, 22);
  const current = {
    productId: 'guard_lite_yearly',
    status: 'active',
    paymentProvider: 'stripe',
    subscriptionId: 'sub_fixture',
    currentPeriodStart: new Date(now - 1),
    currentPeriodEnd: new Date(now + 86_400_000),
    createdAt: new Date(now - 1),
    deletedAt: null,
  } as Subscription;
  const options = guardCheckoutOptionsFor(
    [
      current,
      { ...current, productId: 'guard_pro_monthly', status: 'trialing' },
      {
        ...current,
        productId: 'guard_ultra_yearly',
        currentPeriodEnd: new Date(now),
      },
      { ...current, productId: 'unrelated' },
    ],
    { hasHistory: true, hasCurrent: true },
    now
  );
  assert.equal(options.currentSubscription?.planId, 'pro');
  assert.equal(options.currentSubscription?.renewalOff, false);
});

test('signed checkout is idempotent, renewals create one order, failed invoices suspend access and expired checkout grants nothing', async () => {
  await database
    .insert(user)
    .values({ id: 'test-user', name: 'Test', email: 'test@example.invalid' });
  await database.insert(order).values({
    id: 'order-test',
    orderNo: 'ORD_TEST',
    userId: 'test-user',
    userEmail: 'test@example.invalid',
    status: 'created',
    amount: 990,
    currency: 'usd',
    productId: 'guard_lite_yearly',
    checkoutInfo: '{}',
    paymentType: 'subscription',
    paymentProvider: 'stripe',
    paymentSessionId: checkout.id,
    planName: 'Lite',
  });
  await Promise.allSettled([
    handleWebhook(event('checkout.session.completed', checkout)),
    handleWebhook(event('checkout.session.completed', checkout)),
  ]);
  await handleWebhook(event('checkout.session.completed', checkout));
  assert.equal((await database.select().from(subscription)).length, 1);
  assert.equal((await database.select().from(order))[0].status, 'paid');
  assert.equal(
    (await database.select().from(subscription))[0].interval,
    'year'
  );
  const invoice = {
    id: 'in_renew',
    status: 'paid',
    amount_paid: 990,
    currency: 'usd',
    billing_reason: 'subscription_cycle',
    created: start,
    customer: 'cus_test',
    lines: {
      data: [
        { parent: { subscription_item_details: { subscription: 'sub_test' } } },
      ],
    },
  };
  await handleWebhook(event('invoice.payment_succeeded', invoice));
  await handleWebhook(event('invoice.payment_succeeded', invoice));
  assert.equal((await database.select().from(order)).length, 2);
  providerStatus = 'past_due';
  await handleWebhook(
    event('invoice.payment_failed', {
      ...invoice,
      id: 'in_failed',
      status: 'open',
      amount_paid: 0,
    })
  );
  assert.equal(
    (await database.select().from(subscription))[0].status,
    'paused'
  );
  assert.equal((await database.select().from(order)).length, 2);
  await database.insert(order).values({
    id: 'unpaid-test',
    orderNo: 'ORD_UNPAID',
    userId: 'test-user',
    status: 'created',
    amount: 990,
    currency: 'usd',
    productId: 'guard_lite_yearly',
    checkoutInfo: '{}',
    paymentType: 'subscription',
    paymentProvider: 'stripe',
    paymentSessionId: 'cs_expired',
  });
  await handleWebhook(
    event('checkout.session.expired', {
      id: 'cs_expired',
      status: 'expired',
      payment_status: 'unpaid',
      created: start,
    })
  );
  assert.equal(
    (await database.select().from(order)).find(
      (o) => o.orderNo === 'ORD_UNPAID'
    )?.status,
    'failed'
  );
  assert.equal((await database.select().from(subscription)).length, 1);
  assert.equal((await database.select().from(credit)).length, 0);
  await assert.rejects(
    createUserBillingPortal('different-user', 'SUBORD_TEST'),
    /not found/
  );
});

test('trial activation records zero charged, renews after seven days and cancellation never grants another trial', async () => {
  providerId = 'sub_cardtrial';
  providerStatus = 'trialing';
  trialStart = start;
  trialEnd = start + 7 * 86400;
  await database.insert(order).values({
    id: 'trial-order',
    orderNo: 'ORD_TRIAL',
    userId: 'test-user',
    status: 'created',
    amount: 990,
    currency: 'usd',
    productId: 'guard_lite_yearly',
    paymentType: 'subscription',
    paymentProvider: 'stripe',
    paymentSessionId: 'cs_trial',
    checkoutInfo: '{}',
  });
  const trialCheckout = {
    ...checkout,
    id: 'cs_trial',
    subscription: providerId,
    amount_total: 0,
    payment_status: 'no_payment_required',
  };
  await handleWebhook(event('checkout.session.completed', trialCheckout));
  await handleWebhook(event('checkout.session.completed', trialCheckout));
  const receipt = (await database.select().from(order)).find(
    (o) => o.id === 'trial-order'
  )!;
  assert.equal(receipt.status, 'trialing');
  assert.equal(receipt.paymentAmount, 0);
  assert.equal(receipt.paidAt, null);
  const trialSub = (await database.select().from(subscription)).find(
    (s) => s.subscriptionId === providerId
  )!;
  assert.equal(trialSub.status, 'trialing');
  assert.equal(trialSub.trialPeriodDays, 7);
  assert.equal(trialSub.currentPeriodEnd!.getTime(), trialEnd * 1000);
  providerStatus = 'active';
  periodOffset = 7 * 86400;
  await handleWebhook(event('customer.subscription.updated', providerSub()));
  const unpaidSub = (await database.select().from(subscription)).find(
    (s) => s.subscriptionId === providerId
  )!;
  assert.equal(unpaidSub.status, 'trialing');
  assert.equal(unpaidSub.currentPeriodEnd!.getTime(), trialEnd * 1000);

  const invoice = {
    id: 'in_after_trial',
    status: 'paid',
    amount_paid: 990,
    currency: 'usd',
    billing_reason: 'subscription_update',
    created: start + periodOffset,
    customer: 'cus_test',
    lines: {
      data: [
        { parent: { subscription_item_details: { subscription: providerId } } },
      ],
    },
  };
  await handleWebhook(event('invoice.payment_succeeded', invoice));
  await handleWebhook(event('invoice.payment_succeeded', invoice));
  const paidSub = (await database.select().from(subscription)).find(
    (s) => s.subscriptionId === providerId
  )!;
  assert.equal(paidSub.status, 'active');
  assert.equal(
    paidSub.currentPeriodEnd!.getTime(),
    (start + periodOffset + 31536000) * 1000
  );
  assert.equal(
    (await database.select().from(order)).filter(
      (o) => o.transactionId === 'in_after_trial'
    ).length,
    1
  );
  providerStatus = 'canceled';
  await handleWebhook(event('customer.subscription.deleted', providerSub()));
  assert.equal(
    (await database.select().from(subscription)).find(
      (s) => s.subscriptionId === providerId
    )!.status,
    'canceled'
  );
});

for (const originalStatus of ['active', 'trialing']) {
  test(`canceling an ${originalStatus} subscription immediately removes paid access and retries are idempotent`, async (t) => {
    const { getCurrentSubscription, getPlaylistExportAccess } =
      await import('@/modules/subscriptions/service');
    const { entitlementFor } = await import('@/modules/playlist-guard/service');
    const userId = `cancel-${originalStatus}`;
    const subscriptionNo = `SUB_CANCEL_${originalStatus}`;
    const canceledAt = Math.floor(Date.now() / 1000);
    const periodEnd = new Date((canceledAt + 30 * 86400) * 1000);
    await database.insert(user).values({
      id: userId,
      name: 'Cancellation fixture',
      email: `${userId}@example.invalid`,
    });
    await database.insert(subscription).values({
      id: subscriptionNo,
      subscriptionNo,
      userId,
      status: originalStatus,
      paymentProvider: 'stripe',
      subscriptionId: `sub_${userId}`,
      productId: 'guard_lite_yearly',
      currentPeriodStart: new Date((canceledAt - 86400) * 1000),
      currentPeriodEnd: periodEnd,
    });
    assert.equal((await getPlaylistExportAccess(userId)).subscribed, true);
    let requests = 0;
    t.after(() => {
      cancellationFetch = undefined;
    });
    cancellationFetch = async (input, init) => {
      const req = new Request(input, init);
      assert.ok(['DELETE', 'GET'].includes(req.method));
      assert.equal(
        new URL(req.url).pathname,
        `/v1/subscriptions/sub_${userId}`
      );
      if (req.method === 'DELETE') requests++;
      return Response.json({
        ...providerSub(),
        id: `sub_${userId}`,
        status: 'canceled',
        canceled_at: canceledAt,
        ended_at: canceledAt,
      });
    };
    await assert.rejects(
      cancelUserSubscription({ userId: 'not-the-owner', subscriptionNo }),
      /Forbidden/
    );
    assert.equal(requests, 0);
    const result = await cancelUserSubscription({ userId, subscriptionNo });
    assert.equal(result.status, 'canceled');
    assert.equal(result.canceledEndAt?.getTime(), canceledAt * 1000);
    assert.equal(result.currentPeriodEnd?.getTime(), periodEnd.getTime());
    assert.equal(await getCurrentSubscription(userId), undefined);
    assert.equal((await getPlaylistExportAccess(userId)).subscribed, false);
    assert.equal(entitlementFor([result], undefined, Date.now()).limit, 0);
    assert.equal(
      (await cancelUserSubscription({ userId, subscriptionNo })).status,
      'canceled'
    );
    assert.equal(requests, 1);
    await handleWebhook(
      event('customer.subscription.deleted', { id: `sub_${userId}` })
    );
    assert.equal(await getCurrentSubscription(userId), undefined);
    assert.equal((await getPlaylistExportAccess(userId)).subscribed, false);
  });
}

test('an unconfirmed provider cancellation leaves paid access intact', async (t) => {
  const { getPlaylistExportAccess } =
    await import('@/modules/subscriptions/service');
  const userId = 'cancel-failure';
  const subscriptionNo = 'SUB_CANCEL_FAILURE';
  await database.insert(user).values({
    id: userId,
    name: 'Failure fixture',
    email: 'cancel-failure@example.invalid',
  });
  await database.insert(subscription).values({
    id: subscriptionNo,
    subscriptionNo,
    userId,
    status: 'active',
    paymentProvider: 'stripe',
    subscriptionId: 'sub_cancel_failure',
    productId: 'guard_lite_yearly',
    currentPeriodStart: new Date(Date.now() - 86400_000),
    currentPeriodEnd: new Date(Date.now() + 86400_000),
  });
  t.after(() => {
    cancellationFetch = undefined;
  });
  cancellationFetch = async () =>
    Response.json({
      ...providerSub(),
      id: 'sub_cancel_failure',
      status: 'active',
      cancel_at_period_end: true,
    });
  await assert.rejects(
    cancelUserSubscription({ userId, subscriptionNo }),
    /Cancel subscription failed/
  );
  const [unchanged] = await database
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionNo, subscriptionNo));
  assert.equal(unchanged.status, 'active');
  assert.equal(unchanged.canceledAt, null);
  assert.equal((await getPlaylistExportAccess(userId)).subscribed, true);
});

test('new trial welcome retries after provider failure and sends once across repeated payment callbacks', async () => {
  process.env.PLAYLIST_GUARD_MAIL_PREVIEW_URL = 'http://localhost:3103/mail';
  const id = 'welcome-trial';
  providerId = 'sub_welcome_trial';
  providerStatus = 'trialing';
  trialStart = start;
  trialEnd = start + 7 * 86400;
  await database
    .insert(user)
    .values({ id, name: 'Welcome', email: 'welcome@example.invalid' });
  await database.insert(order).values({
    id,
    orderNo: 'WELCOME_TRIAL',
    userId: id,
    userEmail: 'welcome@example.invalid',
    status: 'created',
    amount: 990,
    currency: 'usd',
    productId: 'guard_lite_yearly',
    planName: 'Lite',
    paymentType: 'subscription',
    paymentProvider: 'stripe',
    paymentSessionId: 'cs_welcome_trial',
    checkoutInfo: JSON.stringify({
      subscriptionEmail: { status: 'pending', locale: 'de' },
    }),
  });
  const session = {
    ...checkout,
    id: 'cs_welcome_trial',
    subscription: providerId,
    payment_status: 'no_payment_required',
    amount_total: 0,
  };
  failWelcome = true;
  await handleWebhook(event('checkout.session.completed', session));
  let [purchase] = await database.select().from(order).where(eq(order.id, id));
  assert.equal(
    purchase.status,
    'trialing',
    'a mail failure never rolls back entitlement'
  );
  assert.equal(purchase.paidAt, null);
  assert.equal(
    JSON.parse(purchase.checkoutInfo).subscriptionEmail.status,
    'pending'
  );
  assert.equal(welcomeMessages.length, 1);
  const info = JSON.parse(purchase.checkoutInfo);
  info.subscriptionEmail.attemptedAt = Date.now() - 180000;
  await database
    .update(order)
    .set({ checkoutInfo: JSON.stringify(info) })
    .where(eq(order.id, id));
  failWelcome = false;
  await Promise.all([
    handleWebhook(event('checkout.session.completed', session)),
    handleWebhook(event('checkout.session.completed', session)),
  ]);
  [purchase] = await database.select().from(order).where(eq(order.id, id));
  assert.equal(
    JSON.parse(purchase.checkoutInfo).subscriptionEmail.status,
    'sent'
  );
  assert.equal(
    welcomeMessages.length,
    2,
    'concurrent retries claim one delivery'
  );
  assert.match(welcomeMessages.at(-1).text, /Testphase endet/);
  assert.match(welcomeMessages.at(-1).text, /Erste geplante Abbuchung/);
  assert.match(welcomeMessages.at(-1).text, /0,00/);
  const { handlePaymentCallback } = await import('./service');
  await handlePaymentCallback('WELCOME_TRIAL');
  await handleWebhook(event('checkout.session.completed', session));
  assert.equal(welcomeMessages.length, 2);
  delete process.env.PLAYLIST_GUARD_MAIL_PREVIEW_URL;
});

test('new paid subscription receives activation email; historical orders and canceled plans are not mailed', async () => {
  process.env.PLAYLIST_GUARD_MAIL_PREVIEW_URL = 'http://localhost:3103/mail';
  const id = 'welcome-paid';
  providerId = 'sub_welcome_paid';
  providerStatus = 'active';
  trialStart = null;
  trialEnd = null;
  await database
    .insert(user)
    .values({ id, name: 'Paid', email: 'paid@example.invalid' });
  await database.insert(order).values({
    id,
    orderNo: 'WELCOME_PAID',
    userId: id,
    userEmail: 'paid@example.invalid',
    status: 'created',
    amount: 990,
    currency: 'usd',
    productId: 'guard_lite_yearly',
    planName: 'Lite',
    paymentType: 'subscription',
    paymentProvider: 'stripe',
    paymentSessionId: 'cs_welcome_paid',
    checkoutInfo: JSON.stringify({
      subscriptionEmail: { status: 'pending', locale: 'en' },
    }),
  });
  const before = welcomeMessages.length;
  await handleWebhook(
    event('checkout.session.completed', {
      ...checkout,
      id: 'cs_welcome_paid',
      subscription: providerId,
    })
  );
  assert.equal(welcomeMessages.length, before + 1);
  assert.match(welcomeMessages.at(-1).text, /Charged today: \$9.90/);
  assert.match(welcomeMessages.at(-1).text, /Next scheduled renewal/);
  const { retrySubscriptionWelcomes, sendSubscriptionWelcome } =
    await import('./welcome');
  await database
    .update(subscription)
    .set({ status: 'canceled' })
    .where(eq(subscription.subscriptionNo, 'SUBWELCOME_PAID'));
  await database
    .update(order)
    .set({
      checkoutInfo: JSON.stringify({
        subscriptionEmail: { status: 'pending', locale: 'en' },
      }),
    })
    .where(eq(order.id, id));
  await retrySubscriptionWelcomes();
  await sendSubscriptionWelcome('ASYNC_FUNNEL');
  assert.equal(welcomeMessages.length, before + 1);
  delete process.env.PLAYLIST_GUARD_MAIL_PREVIEW_URL;
});
