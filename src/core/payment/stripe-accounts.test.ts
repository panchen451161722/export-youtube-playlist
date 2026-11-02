import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import Stripe from 'stripe';

import { StripeAccountsProvider } from './stripe-accounts';
import { PaymentInterval, PaymentType, SubscriptionStatus } from './types';

const current = {
  secretKey: 'sk_test_current_fixture',
  publishableKey: '',
  signingSecret: 'whsec_current_fixture',
  portalConfigurationId: 'bpc_current',
};
const legacy = {
  secretKey: 'sk_test_legacy_fixture',
  publishableKey: '',
  signingSecret: 'whsec_legacy_fixture',
  portalConfigurationId: 'bpc_legacy',
};
const missing = () =>
  Response.json(
    {
      error: {
        type: 'invalid_request_error',
        code: 'resource_missing',
        message: 'No such object',
      },
    },
    { status: 404 }
  );
const forbidden = () =>
  Response.json(
    {
      error: {
        type: 'invalid_request_error',
        code: 'more_permissions_required',
        message: 'Permission denied',
      },
    },
    { status: 403 }
  );
const sub = (id: string) => ({
  id,
  status: 'active',
  customer: 'cus_legacy',
  metadata: { app: 'export-youtube-playlist', product_id: 'guard_lite_yearly' },
  cancel_at_period_end: true,
  canceled_at: 1700000000,
  items: {
    data: [
      {
        price: {
          id: 'price_legacy',
          product: 'prod_legacy',
          currency: 'usd',
          unit_amount: 990,
        },
        plan: { interval: 'year', interval_count: 1 },
        current_period_start: 1700000000,
        current_period_end: 1731536000,
      },
    ],
  },
});

function mockNetwork(
  t: TestContext,
  handler: (req: Request, old: boolean) => Response | Promise<Response>
) {
  const calls: { method: string; path: string; old: boolean }[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init?: RequestInit) => {
      const req = new Request(input, init);
      assert.equal(new URL(req.url).origin, 'https://api.stripe.com');
      const auth = req.headers.get('authorization');
      assert.ok(
        auth === `Bearer ${current.secretKey}` ||
          auth === `Bearer ${legacy.secretKey}`
      );
      const old = auth === `Bearer ${legacy.secretKey}`;
      calls.push({ method: req.method, path: new URL(req.url).pathname, old });
      return handler(req, old);
    }
  );
  return calls;
}

test('new annual checkout is created only in the current account', async (t) => {
  const calls = mockNetwork(t, async (req, old) => {
    assert.equal(old, false);
    if (new URL(req.url).pathname === '/v1/prices/price_current')
      return Response.json({
        id: 'price_current',
        active: true,
        livemode: false,
        unit_amount: 990,
        currency: 'usd',
        recurring: { interval: 'year', interval_count: 1 },
      });
    assert.equal(new URL(req.url).pathname, '/v1/checkout/sessions');
    const body = new URLSearchParams(await req.text());
    assert.equal(body.get('line_items[0][price]'), 'price_current');
    return Response.json({
      id: 'cs_current',
      url: 'https://checkout.stripe.com/fixture',
    });
  });
  await new StripeAccountsProvider(current, legacy).createPayment({
    order: {
      type: PaymentType.SUBSCRIPTION,
      priceId: 'price_current',
      price: { amount: 990, currency: 'usd' },
      plan: { name: 'Lite', interval: PaymentInterval.YEAR, intervalCount: 1 },
    },
  });
  assert.equal(calls.length, 2);
});

test('old billing customer uses the old account and its dedicated portal configuration', async (t) => {
  const calls = mockNetwork(t, async (req, old) => {
    if (req.method === 'GET') {
      assert.equal(old, false);
      return missing();
    }
    assert.equal(old, true);
    assert.equal(
      new URLSearchParams(await req.text()).get('configuration'),
      'bpc_legacy'
    );
    return Response.json({ url: 'https://billing.stripe.com/legacy-fixture' });
  });
  const result = await new StripeAccountsProvider(
    current,
    legacy
  ).getPaymentBilling({
    customerId: 'cus_legacy',
    returnUrl: 'https://example.com/settings/billing',
  });
  assert.match(result.billingUrl!, /legacy-fixture/);
  assert.deepEqual(
    calls.map((c) => [c.method, c.old]),
    [
      ['GET', false],
      ['POST', true],
    ]
  );
});

test('a failed current-account portal write never retries against the old account', async (t) => {
  const calls = mockNetwork(t, (req, old) => {
    assert.equal(old, false);
    return req.method === 'GET'
      ? Response.json({ id: 'cus_current' })
      : missing();
  });
  await assert.rejects(
    new StripeAccountsProvider(current, legacy).getPaymentBilling({
      customerId: 'cus_current',
    }),
    /No such object/
  );
  assert.equal(calls.length, 2);
});

test('old subscriptions are canceled immediately only in their owning account', async (t) => {
  const calls = mockNetwork(t, async (req, old) => {
    if (!old) {
      assert.equal(req.method, 'GET');
      return missing();
    }
    assert.equal(req.method, 'DELETE');
    const params = new URL(req.url).searchParams;
    assert.equal(params.get('invoice_now'), 'false');
    assert.equal(params.get('prorate'), 'false');
    return Response.json({
      ...sub('sub_legacy'),
      status: 'canceled',
      cancel_at_period_end: false,
      ended_at: 1700000100,
    });
  });
  const result = await new StripeAccountsProvider(
    current,
    legacy
  ).cancelSubscription({ subscriptionId: 'sub_legacy' });
  assert.equal(result.subscriptionInfo?.status, SubscriptionStatus.CANCELED);
  assert.equal(
    result.subscriptionInfo?.currentPeriodEnd.getTime(),
    1731536000000
  );
  assert.equal(
    result.subscriptionInfo?.canceledEndAt?.getTime(),
    1700000100000
  );
  assert.deepEqual(
    calls.map((c) => [c.method, c.old]),
    [
      ['GET', false],
      ['DELETE', true],
    ]
  );
});

test('lookup permission failures fail closed instead of trying another account', async (t) => {
  const calls = mockNetwork(t, () => forbidden());
  await assert.rejects(
    new StripeAccountsProvider(current, legacy).cancelSubscription({
      subscriptionId: 'sub_unknown',
    }),
    /Permission denied/
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
});

function signed(secret: string, livemode = false) {
  const payload = JSON.stringify({
    id: 'evt_fixture',
    type: 'customer.subscription.updated',
    livemode,
    data: { object: { id: 'sub_fixture' } },
  });
  return {
    req: new Request('https://example.com/api/payment/notify/stripe', {
      method: 'POST',
      body: payload,
      headers: {
        'stripe-signature': Stripe.webhooks.generateTestHeaderString({
          payload,
          secret,
        }),
      },
    }),
  };
}

for (const account of ['current', 'legacy'] as const) {
  test(`${account} signed webhook performs subscription lookup with the matching API key`, async (t) => {
    const calls = mockNetwork(t, (_req, old) => {
      assert.equal(old, account === 'legacy');
      return Response.json(sub('sub_fixture'));
    });
    await new StripeAccountsProvider(current, legacy).getPaymentEvent(
      signed(
        account === 'legacy' ? legacy.signingSecret : current.signingSecret
      )
    );
    assert.equal(calls.length, 1);
  });
}

test('invalid signatures and cross-mode events never reach provider APIs', async (t) => {
  const calls = mockNetwork(t, () => {
    throw new Error('Unexpected provider request');
  });
  const provider = new StripeAccountsProvider(current, legacy);
  await assert.rejects(provider.getPaymentEvent(signed('whsec_unrelated')), {
    type: 'StripeSignatureVerificationError',
  });
  await assert.rejects(
    provider.getPaymentEvent(signed(legacy.signingSecret, true)),
    /environment mismatch/
  );
  assert.equal(calls.length, 0);
});

test('verified webhook processing failures are not treated as signature failures', async (t) => {
  const calls = mockNetwork(t, () => forbidden());
  await assert.rejects(
    new StripeAccountsProvider(current, legacy).getPaymentEvent(
      signed(current.signingSecret)
    ),
    /Permission denied/
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].old, false);
});

test('old paid subscription still blocks another trial and duplicate subscription after cutover', async (t) => {
  mockNetwork(t, (req, old) => {
    if (new URL(req.url).pathname === '/v1/customers')
      return Response.json({
        object: 'list',
        has_more: false,
        data: old
          ? [
              {
                id: 'cus_legacy',
                metadata: {
                  app: 'export-youtube-playlist',
                  user_id: 'user_fixture',
                },
              },
            ]
          : [],
      });
    assert.equal(old, true);
    return Response.json({
      object: 'list',
      has_more: false,
      data: [sub('sub_legacy')],
    });
  });
  const provider = new StripeAccountsProvider(current, legacy);
  assert.deepEqual(
    await provider.getSubscriptionAccess('fixture@example.com', 'user_fixture'),
    { hasHistory: true, hasCurrent: true }
  );
  assert.deepEqual(
    await provider.getGuestSubscriptionHistory(
      'fixture@example.com',
      '',
      new Set()
    ),
    { hasHistory: true, hasCurrent: true }
  );
});

test('mixed modes and incomplete legacy credentials are rejected', () => {
  assert.throws(
    () =>
      new StripeAccountsProvider(current, {
        ...legacy,
        secretKey: 'sk_live_fixture',
      }),
    /same environment/
  );
  assert.throws(
    () => new StripeAccountsProvider(current, { ...legacy, signingSecret: '' }),
    /incomplete/
  );
});
