import assert from 'node:assert/strict';
import { test } from 'node:test';

import { StripeProvider } from './stripe';
import { SubscriptionStatus } from './types';

for (const status of ['active', 'trialing']) {
  test(`Stripe ${status} cancellation keeps access until period end`, async () => {
    const provider = new StripeProvider({
      secretKey: 'unit-test-placeholder',
      publishableKey: '',
    });
    const calls: unknown[] = [];
    Object.defineProperty(provider, 'client', {
      value: {
        subscriptions: {
          update: async (id: string, options: unknown) => {
            calls.push([id, options]);
            return {
              id,
              status,
              cancel_at_period_end: true,
              cancel_at: null,
              canceled_at: 1700000000,
              metadata: {},
              items: {
                data: [
                  {
                    price: {
                      product: 'p',
                      id: 'price',
                      unit_amount: 299,
                      currency: 'usd',
                    },
                    plan: { interval: 'month', interval_count: 1 },
                    current_period_start: 1700000000,
                    current_period_end: 1702592000,
                  },
                ],
              },
            };
          },
          cancel: () => {
            throw Error('Must not cancel immediately');
          },
        },
      },
    });
    const session = await provider.cancelSubscription({
      subscriptionId: 'subscription-test',
    });
    assert.deepEqual(calls, [
      ['subscription-test', { cancel_at_period_end: true }],
    ]);
    assert.equal(
      session.subscriptionInfo?.status,
      SubscriptionStatus.PENDING_CANCEL
    );
    assert.equal(
      session.subscriptionInfo?.canceledEndAt?.getTime(),
      1702592000000
    );
  });
}
test('Stripe refuses to report cancellation when provider did not schedule it', async () => {
  const provider = new StripeProvider({
    secretKey: 'unit-test-placeholder',
    publishableKey: '',
  });
  Object.defineProperty(provider, 'client', {
    value: {
      subscriptions: { update: async () => ({ cancel_at_period_end: false }) },
    },
  });
  await assert.rejects(
    provider.cancelSubscription({ subscriptionId: 'subscription-test' }),
    /Cancel subscription failed/
  );
});

test('registered Stripe prices must match amount, currency, environment and annual interval before Checkout', async () => {
  const { PaymentType, PaymentInterval } = await import('./types');
  const order = {
    priceId: 'price_annual',
    type: PaymentType.SUBSCRIPTION,
    price: { amount: 990, currency: 'usd' },
    plan: { name: 'Lite', interval: PaymentInterval.YEAR, intervalCount: 1 },
    metadata: { app: 'export-youtube-playlist' },
  };
  const price = {
    id: 'price_annual',
    active: true,
    livemode: false,
    unit_amount: 990,
    currency: 'usd',
    recurring: { interval: 'year', interval_count: 1 },
  };
  const provider = new StripeProvider({
    secretKey: 'sk_test_placeholder',
    publishableKey: '',
  });
  let calls = 0;
  let currentPrice = price;
  Object.defineProperty(provider, 'client', {
    value: {
      prices: { retrieve: async () => currentPrice },
      checkout: {
        sessions: {
          create: async (params: any) => {
            calls++;
            assert.deepEqual(params.line_items, [
              { price: 'price_annual', quantity: 1 },
            ]);
            assert.deepEqual(params.subscription_data.metadata, order.metadata);
            assert.deepEqual(params.payment_method_types, ['card']);
            return {
              id: 'cs_test_fake',
              url: 'https://checkout.stripe.com/test',
            };
          },
        },
      },
    },
  });
  await provider.createPayment({ order });
  for (const mismatch of [
    { unit_amount: 99 },
    { currency: 'eur' },
    { livemode: true },
    { active: false },
    { recurring: { interval: 'month', interval_count: 1 } },
  ]) {
    currentPrice = { ...price, ...mismatch };
    await assert.rejects(provider.createPayment({ order }), /does not match/);
  }
  assert.equal(calls, 1);
});

test('webhook verifies the raw signature and rejects cross-environment events', async () => {
  const { default: Stripe } = await import('stripe');
  const { PaymentStatus } = await import('./types');
  const signingSecret = 'whsec_unit_test_only';
  const provider = new StripeProvider({
    secretKey: 'sk_test_placeholder',
    publishableKey: '',
    signingSecret,
  });
  const payload = (livemode: boolean) =>
    JSON.stringify({
      id: 'evt_test',
      type: 'checkout.session.expired',
      livemode,
      data: {
        object: {
          id: 'cs_test_fake',
          status: 'expired',
          payment_status: 'unpaid',
          created: 1,
        },
      },
    });
  const request = (body: string, secret = signingSecret) =>
    new Request('https://example.invalid/api/payment/notify/stripe', {
      method: 'POST',
      body,
      headers: {
        'stripe-signature': Stripe.webhooks.generateTestHeaderString({
          payload: body,
          secret,
        }),
      },
    });
  const event = await provider.getPaymentEvent({
    req: request(payload(false)),
  });
  assert.equal(event.paymentSession?.paymentStatus, PaymentStatus.CANCELED);
  await assert.rejects(
    provider.getPaymentEvent({ req: request(payload(true)) }),
    /environment mismatch/
  );
  await assert.rejects(
    provider.getPaymentEvent({ req: request(payload(false), 'wrong-secret') }),
    /signature/i
  );
});

test('trial Checkout requires a card, preserves annual price, reuses open sessions and rejects repeat trials', async () => {
  const { PaymentType, PaymentInterval } = await import('./types');
  const provider = new StripeProvider({
    secretKey: 'sk_test_placeholder',
    publishableKey: '',
  });
  const order = {
    type: PaymentType.SUBSCRIPTION,
    price: { amount: 2990, currency: 'usd' },
    plan: {
      name: 'Pro',
      interval: PaymentInterval.YEAR,
      intervalCount: 1,
      trialPeriodDays: 7,
    },
    customer: { email: 'fixture@example.invalid' },
    metadata: {
      app: 'export-youtube-playlist',
      user_id: 'fixture',
      product_id: 'guard_pro_yearly',
      trial_days: '7',
    },
  };
  let history: any[] = [];
  let open: any[] = [];
  let created = 0;
  Object.defineProperty(provider, 'client', {
    value: {
      customers: {
        list: async () => ({
          data: [{ id: 'cus_fixture', metadata: order.metadata }],
        }),
      },
      subscriptions: { list: async () => ({ data: history }) },
      checkout: {
        sessions: {
          list: async () => ({ data: open }),
          create: async (p: any, options: any) => {
            created++;
            assert.equal(p.payment_method_collection, 'always');
            assert.equal(p.subscription_data.trial_period_days, 7);
            assert.equal(
              p.subscription_data.trial_settings.end_behavior
                .missing_payment_method,
              'cancel'
            );
            assert.equal(p.line_items[0].price_data.unit_amount, 2990);
            assert.equal(p.line_items[0].price_data.recurring.interval, 'year');
            assert.equal(
              options.idempotencyKey,
              'guard-checkout-cus_fixture-first'
            );
            const result = {
              id: 'cs_trial',
              url: 'https://checkout.stripe.com/fixture',
              status: 'open',
              metadata: order.metadata,
            };
            open = [result];
            return result;
          },
        },
      },
    },
  });
  const first = await provider.createPayment({ order });
  const retry = await provider.createPayment({ order });
  assert.equal(first.checkoutInfo.sessionId, retry.checkoutInfo.sessionId);
  assert.equal(created, 1);
  history = [{ status: 'trialing' }];
  await assert.rejects(
    provider.createPayment({ order }),
    /existing subscription/
  );
  history = [{ status: 'canceled' }];
  await assert.rejects(provider.createPayment({ order }), /already subscribed/);
  assert.deepEqual(
    await provider.getSubscriptionAccess('fixture@example.invalid', 'fixture'),
    { hasHistory: true, hasCurrent: false }
  );
});

test('a completed trial requires a confirmed payment method and uses trial_end as the access deadline', async () => {
  const provider = new StripeProvider({
    secretKey: 'sk_test_placeholder',
    publishableKey: '',
  });
  const start = 1700000000;
  let paymentMethod: string | null = null;
  Object.defineProperty(provider, 'client', {
    value: {
      checkout: {
        sessions: {
          retrieve: async () => ({
            id: 'cs_trial',
            status: 'complete',
            payment_status: 'no_payment_required',
            subscription: 'sub_trial',
            amount_total: 0,
          }),
        },
      },
      subscriptions: {
        retrieve: async () => ({
          id: 'sub_trial',
          status: 'trialing',
          default_payment_method: paymentMethod,
          trial_start: start,
          trial_end: start + 7 * 86400,
          metadata: {},
          items: {
            data: [
              {
                price: {
                  product: 'prod',
                  id: 'price',
                  unit_amount: 990,
                  currency: 'usd',
                },
                plan: { interval: 'year', interval_count: 1 },
                current_period_start: start,
                current_period_end: start + 365 * 86400,
              },
            ],
          },
        }),
      },
    },
  });
  await assert.rejects(
    provider.getPaymentSession({ sessionId: 'cs_trial' }),
    /payment method/
  );
  paymentMethod = 'pm_fixture';
  const trial = await provider.getPaymentSession({ sessionId: 'cs_trial' });
  assert.equal(trial.subscriptionInfo?.status, 'trialing');
  assert.equal(trial.subscriptionInfo?.trialPeriodDays, 7);
  assert.equal(
    trial.subscriptionInfo?.currentPeriodEnd.getTime(),
    (start + 7 * 86400) * 1000
  );
  assert.equal(trial.paymentInfo?.paymentAmount, 0);
});

test('Checkout retries keep their flow, while switching into backup or changing locale replaces the open session', async () => {
  const { PaymentType, PaymentInterval } = await import('./types');
  const provider = new StripeProvider({
    secretKey: 'sk_test_placeholder',
    publishableKey: '',
  });
  const order = {
    type: PaymentType.SUBSCRIPTION,
    price: { amount: 990, currency: 'usd' },
    plan: { name: 'Lite', interval: PaymentInterval.YEAR, intervalCount: 1 },
    customer: { email: 'fixture@example.invalid' },
    successUrl: 'https://example.invalid/callback',
    cancelUrl: 'https://example.invalid/youtube-playlist-backup?setup=cancel',
    metadata: {
      app: 'export-youtube-playlist',
      user_id: 'fixture',
      product_id: 'guard_lite_yearly',
      trial_days: '0',
      checkout_flow: 'backup',
      checkout_locale: 'en',
    },
  };
  const expired: string[] = [];
  const created: any[] = [];
  let open = {
    id: 'cs_pricing',
    success_url: order.successUrl,
    cancel_url: order.cancelUrl,
    status: 'open',
    url: 'https://checkout.stripe.com/old',
    metadata: { ...order.metadata, checkout_flow: 'pricing' },
  };
  Object.defineProperty(provider, 'client', {
    value: {
      customers: {
        list: async () => ({
          data: [{ id: 'cus_fixture', metadata: order.metadata }],
        }),
      },
      subscriptions: { list: async () => ({ data: [] }) },
      checkout: {
        sessions: {
          list: async () => ({ data: [open] }),
          expire: async (id: string) => {
            expired.push(id);
          },
          create: async (params: any) => {
            created.push(params);
            open = {
              id: `cs_backup_${created.length}`,
              success_url: params.success_url,
              cancel_url: params.cancel_url,
              status: 'open',
              url: 'https://checkout.stripe.com/backup',
              metadata: params.metadata,
            };
            return open;
          },
        },
      },
    },
  });
  const first = await provider.createPayment({ order });
  const retry = await provider.createPayment({ order });
  assert.equal(first.checkoutInfo.sessionId, retry.checkoutInfo.sessionId);
  assert.equal(created.length, 1);
  assert.deepEqual(expired, ['cs_pricing']);
  assert.equal(created[0].cancel_url, order.cancelUrl);
  assert.equal(created[0].success_url, order.successUrl);
  await provider.createPayment({
    order: { ...order, metadata: { ...order.metadata, checkout_locale: 'zh' } },
  });
  assert.equal(created.length, 2);
  assert.deepEqual(expired, ['cs_pricing', 'cs_backup_1']);
  const changedOrigin = {
    ...order,
    metadata: { ...order.metadata, checkout_locale: 'zh' },
    successUrl:
      'http://localhost:3000/api/payment/callback?order_no=next&redirect=%2Fyoutube-playlist-backup',
    cancelUrl: 'http://localhost:3000/youtube-playlist-backup?setup=cancel',
  };
  await provider.createPayment({ order: changedOrigin });
  assert.equal(
    created.length,
    3,
    'stale destinations cannot reuse an old Checkout'
  );
  assert.equal(created[2].cancel_url, changedOrigin.cancelUrl);
  await provider.createPayment({
    order: {
      ...changedOrigin,
      successUrl: changedOrigin.successUrl.replace(
        'order_no=next',
        'order_no=retry'
      ),
    },
  });
  assert.equal(
    created.length,
    3,
    'changing only the generated order number still reuses the session'
  );
});

test('rejecting a guest trial refuses a different checkout owner without canceling', async () => {
  const provider = new StripeProvider({
    secretKey: 'unit-test-placeholder',
    publishableKey: '',
  });
  let canceled = false;
  Object.defineProperty(provider, 'client', {
    value: {
      subscriptions: {
        retrieve: async () => ({
          id: 'sub_other',
          status: 'trialing',
          trial_start: 1700000000,
          metadata: {
            app: 'export-youtube-playlist',
            checkout_flow: 'guest_backup',
            guest_checkout_id: 'other',
          },
        }),
        cancel: async () => {
          canceled = true;
        },
      },
    },
  });
  await assert.rejects(
    provider.rejectGuestTrial('sub_other', 'requested'),
    /ownership mismatch/
  );
  assert.equal(canceled, false);
});
