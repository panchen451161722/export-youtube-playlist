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
