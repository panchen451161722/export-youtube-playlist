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
globalThis.fetch = async (input) => {
  const url = String(input);
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
