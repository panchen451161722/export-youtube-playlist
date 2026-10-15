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
