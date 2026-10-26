import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

import { order } from '@/config/db/schema';

const folder = mkdtempSync(join(tmpdir(), 'eyp-funnel-'));
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DATABASE_URL = `file:${folder}/test.db`;
const client = createClient({ url: process.env.DATABASE_URL });
const database = drizzle(client);
const info = getTableConfig(order);
await client.execute(
  `CREATE TABLE "${info.name}" (${info.columns.map((column) => `"${column.name}" ${column.getSQLType()}${column.primary ? ' PRIMARY KEY' : ''}`).join(',')})`
);
const { getPaymentFunnel } = await import('./service');
after(() => {
  client.close();
  rmSync(folder, { recursive: true, force: true });
});

test('database report includes guest checkout once, relates trial charges, and excludes deleted/old records', async () => {
  const now = new Date('2026-10-25T20:00:00Z');
  const created = new Date('2026-10-20T20:00:00Z');
  const base = {
    userId: 'fixture',
    status: 'trialing',
    amount: 990,
    currency: 'usd',
    paymentProvider: 'stripe',
    paymentType: 'subscription',
    checkoutInfo: '{}',
    checkoutUrl: 'https://checkout.stripe.com/fixture',
    checkoutResult:
      '{"livemode":true,"metadata":{"checkout_flow":"guest_backup","trial_days":"7"}}',
    createdAt: created,
    paymentAmount: 0,
  };
  await database.insert(order).values([
    {
      ...base,
      id: 'guest',
      orderNo: 'guest',
      paymentSessionId: 'cs_guest',
      subscriptionNo: 'sub_guest',
    },
    {
      ...base,
      id: 'deleted',
      orderNo: 'deleted',
      paymentSessionId: 'cs_deleted',
      deletedAt: created,
    },
    {
      ...base,
      id: 'old',
      orderNo: 'old',
      paymentSessionId: 'cs_old',
      createdAt: new Date('2026-09-01'),
    },
    {
      ...base,
      id: 'renew',
      orderNo: 'renew',
      paymentType: 'renew',
      subscriptionNo: 'sub_guest',
      status: 'paid',
      paymentAmount: 990,
      paidAt: now,
    },
    {
      ...base,
      id: 'unrelated-renew',
      orderNo: 'unrelated-renew',
      paymentType: 'renew',
      subscriptionNo: 'other',
      status: 'paid',
      paymentAmount: 990,
      paidAt: now,
    },
  ]);
  const report = await getPaymentFunnel(7, now);
  assert.equal(report.checkoutStarted, 1);
  assert.equal(report.checkoutCompleted, 1);
  assert.equal(report.paymentSucceeded, 1);
  assert.equal(report.trialConverted, 1);
  assert.equal(report.byFlow[2].checkoutStarted, 1);
});
