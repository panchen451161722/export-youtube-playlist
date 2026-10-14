import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import {
  guardCollection,
  guardDelivery,
  subscription,
  user,
  type Subscription,
} from '@/config/db/schema';
import type {
  GuardCollectionDetail,
  GuardCreateInput,
  GuardItem,
} from '@/lib/playlist-guard/types';

import {
  applyScan,
  createGuardStore,
  entitlementFor,
  GuardError,
} from './service';

// In-memory database only: no real account, provider, email or production DB access.
const client = createClient({ url: ':memory:' });
const database = drizzle(client);
let now = Date.UTC(2026, 9, 13);
const store = createGuardStore(database, () => now);
const input: GuardCreateInput = {
  name: 'A collection',
  url: 'https://www.youtube.com/playlist?list=PL1234567890',
  source: 'playlist',
  frequency: 'daily',
  notifyAdded: true,
  notifyMissing: true,
  emailDelivery: false,
};
const video = (id: string, title = id): GuardItem => ({
  id,
  title,
  channel: 'Saved channel',
  url: `https://www.youtube.com/watch?v=${id}`,
  thumbnail: '',
  duration: '1:20',
  position: 1,
});
const empty: GuardCollectionDetail = {
  ...input,
  id: 'collection',
  enabled: true,
  createdAt: new Date(now).toISOString(),
  lastSyncedAt: null,
  nextSyncAt: null,
  lastError: null,
  itemCount: 0,
  missingCount: 0,
  runCount: 0,
  snapshots: [],
  missing: [],
};
const code = (expected: string) => (error: unknown) =>
  error instanceof GuardError && error.code === expected;

before(async () => {
  // Introspect the actual Drizzle table definitions so fixtures follow all dialect column names.
  const { getTableConfig } = await import('drizzle-orm/sqlite-core');
  const { guardWorkspace } = await import('@/config/db/schema');
  for (const table of [
    user,
    subscription,
    guardWorkspace,
    guardCollection,
    guardDelivery,
  ]) {
    const config = getTableConfig(table);
    const columns = config.columns.map(
      (column) =>
        `"${column.name}" ${column.getSQLType()}${column.primary ? ' PRIMARY KEY' : ''}`
    );
    await client.execute(
      `CREATE TABLE "${config.name}" (${columns.join(', ')})`
    );
  }
  await client.execute(
    'CREATE UNIQUE INDEX uq_guard_user_slot ON guard_collection (user_id, slot)'
  );
  await client.execute(
    'CREATE UNIQUE INDEX uq_guard_user_source ON guard_collection (user_id, source_key)'
  );
  // Defaults declared in the schema remain supplied by Drizzle at insertion time.
  await database.insert(user).values([
    {
      id: 'alice',
      name: 'Alice',
      email: 'alice@example.invalid',
      emailVerified: true,
    },
    {
      id: 'bob',
      name: 'Bob',
      email: 'bob@example.invalid',
      emailVerified: true,
    },
    { id: 'lite', name: 'Lite', email: 'lite@example.invalid' },
  ]);
  await database.insert(subscription).values({
    id: 'sub-lite',
    subscriptionNo: 'sub-lite',
    userId: 'lite',
    status: 'active',
    paymentProvider: 'stripe',
    subscriptionId: 'provider-sub-lite',
    productId: 'guard_lite_monthly',
    currentPeriodStart: new Date(now - 1000),
    currentPeriodEnd: new Date(now + 30 * 86_400_000),
  });
});
after(() => client.close());

test('complete snapshots retain missing metadata, remove restored records and bound history', () => {
  let state = applyScan(
    empty,
    { complete: true, items: [video('a', 'Remember this title'), video('b')] },
    now
  );
  assert.equal(state.snapshots[0].added, 0);
  state = applyScan(
    state,
    { complete: true, items: [video('b'), video('c')] },
    now + 1000
  );
  assert.equal(state.snapshots[0].removed, 1);
  assert.equal(state.snapshots[0].added, 1);
  assert.equal(state.missing[0].title, 'Remember this title');
  assert.equal(state.missing[0].channel, 'Saved channel');
  state = applyScan(
    state,
    { complete: true, items: [video('a'), video('b'), video('c')] },
    now + 2000
  );
  assert.equal(state.missing.length, 0);
  for (let i = 0; i < 8; i++)
    state = applyScan(
      state,
      { complete: true, items: [video('a')] },
      now + 3000 + i
    );
  assert.equal(state.snapshots.length, 5);
  const previous = JSON.stringify(state);
  assert.throws(
    () => applyScan(state, { complete: false, items: [] }, now),
    code('incomplete_scan')
  );
  assert.equal(JSON.stringify(state), previous);
});

test('trial is durable, one-time, and expires without deleting saved collections', async () => {
  assert.equal((await store.entitlement('alice')).limit, 0);
  await assert.rejects(
    store.create('alice', input, 'source-before-trial'),
    code('plan_required')
  );
  const result = await Promise.allSettled([
    store.startTrial('alice'),
    store.startTrial('alice'),
  ]);
  assert.equal(
    result.filter((entry) => entry.status === 'fulfilled').length,
    1
  );
  assert.equal((await store.entitlement('alice')).limit, 15);
  const collection = await store.create('alice', input, 'source-alice');
  now += 8 * 86_400_000;
  assert.equal((await store.entitlement('alice')).plan, 'free');
  await assert.rejects(store.startTrial('alice'), code('trial_unavailable'));
  await assert.rejects(
    store.sync('alice', collection.id, async () => ({
      complete: true,
      items: [],
    })),
    code('plan_required')
  );
  assert.equal((await store.detail('alice', collection.id)).id, collection.id);
  now -= 8 * 86_400_000;
});

test('unique slot reservations enforce paid quota under concurrent creation', async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, (_, i) =>
      store.create('lite', { ...input, name: `Collection ${i}` }, `source-${i}`)
    )
  );
  assert.equal(
    results.filter((entry) => entry.status === 'fulfilled').length,
    2
  );
  assert.equal((await store.list('lite')).length, 2);
  const first = (await store.list('lite'))[0];
  await store.remove('lite', first.id);
  await store.create('lite', input, 'source-replacement');
  assert.equal((await store.list('lite')).length, 2);
});

test('every collection read and mutation scopes ownership', async () => {
  const own = (await store.list('alice'))[0];
  const before = await store.detail('alice', own.id);
  const updated = await store.update('alice', own.id, {
    name: 'Renamed collection',
    frequency: 'monthly',
  });
  assert.equal(updated.name, 'Renamed collection');
  assert.equal((await store.list('alice'))[0].name, 'Renamed collection');
  assert.equal(updated.url, before.url);
  assert.deepEqual(updated.snapshots, before.snapshots);
  assert.equal((await store.list('bob')).length, 0);
  await assert.rejects(store.detail('bob', own.id), code('not_found'));
  await assert.rejects(
    store.update('bob', own.id, { name: 'Other user rename', enabled: false }),
    code('not_found')
  );
  await assert.rejects(store.remove('bob', own.id), code('not_found'));
  await assert.rejects(
    store.sync('bob', own.id, async () => ({ complete: true, items: [] })),
    code('not_found')
  );
});

test('concurrent sync claims fetch once and failed or incomplete scans preserve snapshots', async () => {
  await store.startTrial('bob');
  const collection = await store.create('bob', input, 'source-bob');
  let reads = 0;
  let resolveScan!: (value: { complete: boolean; items: GuardItem[] }) => void;
  const pending = new Promise<{ complete: boolean; items: GuardItem[] }>(
    (resolve) => {
      resolveScan = resolve;
    }
  );
  const fetchScan = async () => {
    reads++;
    return pending;
  };
  const first = store.sync('bob', collection.id, fetchScan);
  const second = store.sync('bob', collection.id, fetchScan);
  const finished = Promise.allSettled([first, second]);
  await new Promise((resolve) => setTimeout(resolve, 20));
  resolveScan({ complete: true, items: [video('known', 'Original metadata')] });
  const results = await finished;
  assert.equal(reads, 1);
  assert.equal(
    results.filter((entry) => entry.status === 'fulfilled').length,
    1
  );
  now += 61_000;
  await assert.rejects(
    store.sync('bob', collection.id, async () => ({
      complete: false,
      items: [],
    })),
    code('incomplete_scan')
  );
  let saved = await store.detail('bob', collection.id);
  assert.equal(saved.snapshots.length, 1);
  assert.equal(saved.snapshots[0].items[0].title, 'Original metadata');
  assert.equal(saved.missing.length, 0);
  now += 61_000;
  await assert.rejects(
    store.sync('bob', collection.id, async () => {
      throw new Error('Upstream secret error');
    }),
    code('scan_failed')
  );
  saved = await store.detail('bob', collection.id);
  assert.equal(saved.snapshots.length, 1);
  assert.equal(saved.lastError?.includes('secret'), false);
});

test('only recognized, current provider subscriptions grant a paid quota', () => {
  const base = {
    id: 'sub',
    userId: 'user',
    productId: 'guard_pro_monthly',
    status: 'active',
    subscriptionId: 'provider-id',
    paymentProvider: 'stripe',
    currentPeriodStart: new Date(now - 1000),
    currentPeriodEnd: new Date(now + 1000),
    deletedAt: null,
  } as Subscription;
  assert.equal(entitlementFor([base], undefined, now).limit, 15);
  assert.equal(
    entitlementFor([{ ...base, status: 'pending_cancel' }], undefined, now)
      .limit,
    15
  );
  for (const patch of [
    { productId: 'pro' },
    { status: 'pending' },
    { status: 'canceled' },
    { subscriptionId: '' },
    { currentPeriodEnd: new Date(now - 1) },
    { currentPeriodStart: new Date(now + 1) },
    { deletedAt: new Date(now) },
  ]) {
    assert.equal(
      entitlementFor([{ ...base, ...patch }], undefined, now).limit,
      0
    );
  }
});

test('an expired scan lease cannot overwrite a newer scan or resurrect a deleted collection', async () => {
  const collection = await store.create(
    'bob',
    { ...input, name: 'Lease test' },
    'lease-test'
  );
  let release!: (value: { complete: boolean; items: GuardItem[] }) => void;
  const pending = new Promise<{ complete: boolean; items: GuardItem[] }>(
    (resolve) => {
      release = resolve;
    }
  );
  let started!: () => void;
  const startedPromise = new Promise<void>((resolve) => {
    started = resolve;
  });
  const old = store.sync('bob', collection.id, async () => {
    started();
    return pending;
  });
  const oldResult = Promise.allSettled([old]);
  await startedPromise;
  now += 181_000;
  await store.sync('bob', collection.id, async () => ({
    complete: true,
    items: [video('new', 'New result')],
  }));
  release({ complete: true, items: [video('old', 'Stale result')] });
  assert.equal((await oldResult)[0].status, 'rejected');
  assert.equal(
    (await store.detail('bob', collection.id)).snapshots[0].items[0].id,
    'new'
  );

  now += 61_000;
  let releaseDeleted!: (value: {
    complete: boolean;
    items: GuardItem[];
  }) => void;
  const deletedPending = new Promise<{ complete: boolean; items: GuardItem[] }>(
    (resolve) => {
      releaseDeleted = resolve;
    }
  );
  let startedDeleted!: () => void;
  const deletedStartedPromise = new Promise<void>((resolve) => {
    startedDeleted = resolve;
  });
  const scanning = store.sync('bob', collection.id, async () => {
    startedDeleted();
    return deletedPending;
  });
  const result = Promise.allSettled([scanning]);
  await deletedStartedPromise;
  await store.remove('bob', collection.id);
  releaseDeleted({ complete: true, items: [video('resurrect')] });
  assert.equal((await result)[0].status, 'rejected');
  await assert.rejects(store.detail('bob', collection.id), code('not_found'));
});
