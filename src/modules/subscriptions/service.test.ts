import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

import {
  guardWorkspace,
  subscription,
  user,
  type Subscription,
} from '@/config/db/schema';
import {
  FREE_PLAYLIST_EXPORT_LIMIT,
  SUBSCRIBER_PLAYLIST_EXPORT_LIMIT,
} from '@/config/playlist-export';

// Configure a disposable database before importing the service's DB accessor.
const folder = mkdtempSync(join(tmpdir(), 'eyp-export-access-'));
const previousProvider = process.env.DATABASE_PROVIDER;
const previousUrl = process.env.DATABASE_URL;
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DATABASE_URL = `file:${folder}/test.db`;
const client = createClient({ url: process.env.DATABASE_URL });
const database = drizzle(client);
for (const table of [user, subscription, guardWorkspace]) {
  const info = getTableConfig(table);
  await client.execute(
    `CREATE TABLE "${info.name}" (${info.columns.map((column) => `"${column.name}" ${column.getSQLType()}${column.primary ? ' PRIMARY KEY' : ''}`).join(',')})`
  );
}
const { getPlaylistExportAccess, playlistExportAccessFor } =
  await import('./service');
after(() => {
  client.close();
  rmSync(folder, { recursive: true, force: true });
  if (previousProvider === undefined) delete process.env.DATABASE_PROVIDER;
  else process.env.DATABASE_PROVIDER = previousProvider;
  if (previousUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousUrl;
});

const now = Date.UTC(2026, 9, 16);
const free = { subscribed: false, limit: FREE_PLAYLIST_EXPORT_LIMIT };
const subscribed = {
  subscribed: true,
  limit: SUBSCRIBER_PLAYLIST_EXPORT_LIMIT,
};
const current = {
  id: 'current-subscription',
  subscriptionNo: 'current-subscription',
  userId: 'subscriber',
  productId: 'guard_lite_yearly',
  paymentProvider: 'stripe',
  subscriptionId: 'provider-subscription',
  status: 'active',
  currentPeriodStart: new Date(now - 1000),
  currentPeriodEnd: new Date(now + 1000),
  deletedAt: null,
} as Subscription;

test('every recognized annual and legacy monthly plan grants subscriber exports during its valid period', () => {
  for (const plan of ['lite', 'pro', 'ultra']) {
    for (const period of ['monthly', 'yearly']) {
      for (const status of ['active', 'pending_cancel', 'trialing']) {
        assert.deepEqual(
          playlistExportAccessFor(
            [{ ...current, productId: `guard_${plan}_${period}`, status }],
            now
          ),
          subscribed,
          `${plan}/${period}/${status}`
        );
      }
    }
  }
  assert.deepEqual(
    playlistExportAccessFor(
      [
        {
          ...current,
          status: 'pending_cancel',
          subscriptionResult: '{"status":"trialing"}',
        },
      ],
      now
    ),
    subscribed
  );
});

test('access requires a current recognized provider subscription, with exact period boundaries', () => {
  const denied: Partial<Subscription>[] = [
    ...['pending', 'canceled', 'expired', 'paused', 'past_due', 'unpaid'].map(
      (status) => ({ status })
    ),
    ...[
      'lite',
      'pro',
      'ultra',
      'guard_free_yearly',
      'guard_pro_lifetime',
      'other_product',
    ].map((productId) => ({ productId })),
    { productId: null },
    { subscriptionId: '' },
    { paymentProvider: '' },
    { deletedAt: new Date(now) },
    { currentPeriodEnd: null },
    { currentPeriodEnd: new Date(now - 1) },
    { currentPeriodEnd: new Date(now) },
    { currentPeriodEnd: new Date(Number.NaN) },
    { currentPeriodStart: new Date(now + 1) },
    { currentPeriodStart: new Date(Number.NaN) },
  ];
  for (const patch of denied) {
    assert.deepEqual(
      playlistExportAccessFor([{ ...current, ...patch }], now),
      free,
      JSON.stringify(patch)
    );
  }
  assert.deepEqual(playlistExportAccessFor([], now), free);
  assert.deepEqual(
    playlistExportAccessFor(
      [{ ...current, currentPeriodStart: new Date(now) }],
      now
    ),
    subscribed
  );
  assert.deepEqual(
    playlistExportAccessFor([{ ...current, currentPeriodStart: null }], now),
    subscribed
  );
});

test('an eligible subscription is found regardless of newer invalid rows or row order', () => {
  const expired = { ...current, currentPeriodEnd: new Date(now) };
  const pending = { ...current, status: 'pending' };
  assert.deepEqual(
    playlistExportAccessFor([expired, current, pending], now),
    subscribed
  );
  assert.deepEqual(
    playlistExportAccessFor([pending, current, expired], now),
    subscribed
  );
  assert.deepEqual(playlistExportAccessFor([expired, pending], now), free);
});

test('database lookup scopes access to the authenticated owner and ignores deleted subscriptions and legacy workspace trials', async () => {
  const dbNow = Date.now();
  await database.insert(user).values(
    ['subscriber', 'deleted', 'legacy-trial'].map((id) => ({
      id,
      name: id,
      email: `${id}@example.invalid`,
    }))
  );
  await database.insert(subscription).values([
    {
      ...current,
      currentPeriodStart: new Date(dbNow - 60_000),
      currentPeriodEnd: new Date(dbNow + 86_400_000),
    },
    {
      ...current,
      id: 'deleted-subscription',
      subscriptionNo: 'deleted-subscription',
      subscriptionId: 'provider-deleted',
      userId: 'deleted',
      currentPeriodStart: new Date(dbNow - 60_000),
      currentPeriodEnd: new Date(dbNow + 86_400_000),
      deletedAt: new Date(dbNow),
    },
  ]);
  await database.insert(guardWorkspace).values({
    userId: 'legacy-trial',
    trialStartedAt: new Date(dbNow).toISOString(),
    trialEndsAt: new Date(dbNow + 7 * 86_400_000).toISOString(),
  });

  assert.deepEqual(await getPlaylistExportAccess('subscriber'), subscribed);
  assert.deepEqual(await getPlaylistExportAccess('deleted'), free);
  assert.deepEqual(await getPlaylistExportAccess('legacy-trial'), free);
  assert.deepEqual(await getPlaylistExportAccess('unknown-user'), free);
  assert.deepEqual(
    await getPlaylistExportAccess("subscriber' OR 1=1 --"),
    free
  );
});
