import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import Stripe from 'stripe';

import { config, credit, order, subscription, user } from '@/config/db/schema';

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
const { handleWebhook, createUserBillingPortal } = await import('./service');
const originalFetch = globalThis.fetch;
let providerStatus = 'active';
const start = Math.floor(Date.now() / 1000);
const providerSub = () => ({
  id: 'sub_test',
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
        current_period_start: start,
        current_period_end: start + 31536000,
      },
    ],
  },
});
globalThis.fetch = async (input) => {
  const url = String(input);
  assert.match(url, /api\.stripe\.com\/v1\/subscriptions\/sub_test/);
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
