import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

import {
  guardCollection,
  guardDelivery,
  guardWorkspace,
  subscription,
  user,
  verification,
  youtubeConnection,
} from '@/config/db/schema';
import type {
  GuardCollectionDetail,
  GuardItem,
} from '@/lib/playlist-guard/types';

import {
  applyScan,
  createGuardStore,
  type GuardCleanupCursor,
} from './service';

const DAY = 86_400_000;
const video: GuardItem = {
  id: 'secret',
  title: 'Private metadata',
  channel: 'Private channel',
  url: 'https://youtu.be/secret',
  thumbnail: '',
  duration: '1:00',
  position: 1,
};
async function fixture() {
  const client = createClient({ url: ':memory:' });
  const database = drizzle(client);
  for (const table of [
    user,
    verification,
    subscription,
    guardWorkspace,
    guardCollection,
    guardDelivery,
    youtubeConnection,
  ]) {
    const config = getTableConfig(table);
    await client.execute(
      `CREATE TABLE "${config.name}" (${config.columns.map((c) => `"${c.name}" ${c.getSQLType()}${c.primary ? ' PRIMARY KEY' : ''}`).join(',')})`
    );
  }
  let now = Date.UTC(2026, 9, 18);
  const clock = () => now;
  const store = createGuardStore(database, clock);
  await database.insert(user).values({
    id: 'owner',
    name: 'Owner',
    email: 'owner@example.invalid',
    emailVerified: true,
  });
  await database.insert(subscription).values({
    id: 'paid',
    subscriptionNo: 'paid',
    userId: 'owner',
    status: 'active',
    paymentProvider: 'stripe',
    subscriptionId: 'paid',
    productId: 'guard_pro_yearly',
    currentPeriodStart: new Date(now - DAY),
    currentPeriodEnd: new Date(now + 365 * DAY),
  });
  const input = {
    name: 'Saved collection',
    source: 'playlist' as const,
    url: 'https://youtube.com/playlist?list=PLtest',
    frequency: 'daily' as const,
    notifyMissing: true,
    notifyAdded: true,
    emailDelivery: true,
  };
  async function grant(id = 'connection', owner = 'owner') {
    await database.insert(youtubeConnection).values({
      id,
      userId: owner,
      channelId: 'channel',
      channelTitle: 'Channel',
      thumbnail: '',
      credentials: 'encrypted-fixture',
      clientId: 'client',
      status: 'connected',
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      verifiedAt: new Date(now).toISOString(),
      nextValidationAt: new Date(now + DAY).toISOString(),
    });
  }
  return {
    client,
    database,
    clock,
    store,
    input,
    grant,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

async function seedOld(
  f: Awaited<ReturnType<typeof fixture>>,
  id: string,
  enabled = false
) {
  const at = f.clock() - 31 * DAY;
  const blank: GuardCollectionDetail = {
    ...f.input,
    id,
    source: 'channel',
    name: 'API channel title',
    enabled,
    createdAt: new Date(at).toISOString(),
    lastSyncedAt: null,
    nextSyncAt: null,
    lastError: null,
    itemCount: 0,
    missingCount: 0,
    runCount: 0,
    snapshots: [],
    missing: [],
  };
  const old = applyScan(
    blank,
    { complete: true, items: [video], sourceTitle: 'API channel title' },
    at
  );
  old.missing = [
    {
      ...video,
      id: 'missing',
      missingSince: new Date(f.clock() - DAY).toISOString(),
      lastSeenAt: new Date(at).toISOString(),
    },
  ];
  old.missingCount = 1;
  const { snapshots: _snapshots, missing: _missing, ...summary } = old;
  await f.database.insert(guardCollection).values({
    id,
    userId: 'owner',
    slot: 0,
    sourceKey: id,
    document: JSON.stringify(old),
    summary: JSON.stringify(summary),
    createdAt: old.createdAt,
    enabled,
  });
  return old;
}

test('bounded retention clears paused/expired collections, failed outbox and legacy tombstones without paid access', async () => {
  const f = await fixture();
  try {
    await f.database.update(subscription).set({ status: 'canceled' });
    for (const id of ['a', 'b', 'c', 'd']) await seedOld(f, id);
    await f.database
      .update(guardCollection)
      .set({ deletedAt: new Date(f.clock() - DAY).toISOString() })
      .where(eq(guardCollection.id, 'd'));
    for (let n = 0; n < 6; n++)
      await f.database.insert(guardDelivery).values({
        id: `mail-${n}`,
        userId: 'owner',
        collectionId: 'a',
        recipient: 'owner@example.invalid',
        payload: JSON.stringify({
          snapshot: {
            createdAt: new Date(f.clock() - 31 * DAY).toISOString(),
            items: [video],
          },
        }),
        status: n % 2 ? 'failed' : 'pending',
        createdAt: new Date(f.clock() - 31 * DAY).toISOString(),
        nextAttemptAt: new Date(f.clock()).toISOString(),
      });
    assert.equal(
      (await f.store.detail('owner', 'a')).snapshots.length,
      0,
      'read-time gate works before maintenance'
    );
    assert.equal((await f.store.list('owner'))[0].name, 'Collection');
    let cursor: GuardCleanupCursor | undefined;
    const progress: { reviewed: number; deliveriesReviewed: number }[] = [];
    for (let page = 0; page < 5; page++) {
      const result = await f.store.cleanupExpired({ limit: 2, cursor });
      progress.push(result);
      assert(result.reviewed <= 2 && result.deliveriesReviewed <= 2);
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }
    assert.deepEqual(
      progress.map((row) => row.reviewed),
      [2, 2, 0]
    );
    assert.deepEqual(
      progress.map((row) => row.deliveriesReviewed),
      [2, 2, 2]
    );
    const rows = await f.database.select().from(guardCollection);
    assert.equal(rows.length, 3, 'legacy tombstone physically removed');
    for (const row of rows) {
      assert(!row.document.includes('Private metadata'));
      assert(!row.summary.includes('API channel title'));
      const document = JSON.parse(row.document);
      assert.equal(document.snapshots.length, 0);
      assert.equal(document.missing.length, 0);
    }
    assert.equal((await f.database.select().from(guardDelivery)).length, 0);
  } finally {
    f.client.close();
  }
});

test('cleanup fences successful and failed scans so expired metadata cannot return', async () => {
  for (const fails of [false, true]) {
    const f = await fixture();
    try {
      await seedOld(f, 'stale', true);
      let started!: () => void;
      const begun = new Promise<void>((resolve) => {
        started = resolve;
      });
      let release!: () => void;
      const blocked = new Promise<void>((resolve) => {
        release = resolve;
      });
      const result = Promise.allSettled([
        f.store.sync(
          'owner',
          'stale',
          async () => {
            started();
            await blocked;
            if (fails) throw new Error('upstream failure');
            return { complete: true, items: [video] };
          },
          { scheduled: true, emailAvailable: true }
        ),
      ]);
      await begun;
      await f.store.cleanupExpired();
      release();
      assert.equal((await result)[0].status, 'rejected');
      const [row] = await f.database.select().from(guardCollection);
      assert(!row.document.includes('Private metadata'));
      assert.equal((await f.database.select().from(guardDelivery)).length, 0);
    } finally {
      f.client.close();
    }
  }
});

test('collection deletion erases snapshots and every outbox copy even without database cascades', async () => {
  const f = await fixture();
  try {
    const collection = await f.store.create('owner', f.input, 'source');
    await f.store.sync(
      'owner',
      collection.id,
      async () => ({ complete: true, items: [video] }),
      { scheduled: true }
    );
    assert.equal((await f.database.select().from(guardDelivery)).length, 1);
    await f.store.remove('owner', collection.id);
    assert.equal((await f.database.select().from(guardCollection)).length, 0);
    assert.equal((await f.database.select().from(guardDelivery)).length, 0);
    let sends = 0;
    await f.store.deliverPending(async () => {
      sends++;
      return { success: true, provider: 'test' };
    });
    assert.equal(sends, 0);
  } finally {
    f.client.close();
  }
});

test('private source ownership and 30-day grant validation are enforced before creation', async () => {
  const f = await fixture();
  try {
    await f.grant();
    const input = {
      ...f.input,
      source: 'private_playlist' as const,
      connectionId: 'connection',
    };
    await f.database.update(youtubeConnection).set({ userId: 'other' });
    await assert.rejects(
      f.store.create('owner', input, 'foreign'),
      /Reconnect/
    );
    await f.database.update(youtubeConnection).set({
      userId: 'owner',
      verifiedAt: new Date(f.clock() - 30 * DAY).toISOString(),
    });
    await assert.rejects(
      f.store.create('owner', input, 'expired'),
      /Reconnect/
    );
    await f.database
      .update(youtubeConnection)
      .set({ verifiedAt: new Date(f.clock()).toISOString() });
    const saved = await f.store.create('owner', input, 'own');
    assert.equal(saved.connectionId, 'connection');
  } finally {
    f.client.close();
  }
});

test('removing the connected grant during a scan prevents both persistence and new outbox entries', async () => {
  const f = await fixture();
  try {
    await f.grant();
    const saved = await f.store.create(
      'owner',
      { ...f.input, source: 'private_playlist', connectionId: 'connection' },
      'private'
    );
    await assert.rejects(
      f.store.sync(
        'owner',
        saved.id,
        async () => {
          await f.database
            .delete(youtubeConnection)
            .where(eq(youtubeConnection.id, 'connection'));
          return { complete: true, items: [video] };
        },
        { scheduled: true }
      ),
      /Reconnect/
    );
    assert.equal((await f.database.select().from(guardDelivery)).length, 0);
    const [row] = await f.database.select().from(guardCollection);
    assert(!row.document.includes('Private metadata'));
    assert.equal((await f.store.list('owner')).length, 0);
    await f.store.cleanupExpired();
    assert.equal((await f.database.select().from(guardCollection)).length, 0);
  } finally {
    f.client.close();
  }
});

test('pending mail does not send after disconnect and terminal failures erase their payload', async () => {
  const f = await fixture();
  try {
    await f.grant();
    const saved = await f.store.create(
      'owner',
      { ...f.input, source: 'private_playlist', connectionId: 'connection' },
      'private'
    );
    await f.store.sync(
      'owner',
      saved.id,
      async () => ({ complete: true, items: [video] }),
      { scheduled: true }
    );
    await f.database
      .update(youtubeConnection)
      .set({ status: 'disconnected', credentials: null });
    let sends = 0;
    await f.store.deliverPending(async () => {
      sends++;
      return { success: true, provider: 'test' };
    });
    assert.equal(sends, 0);
    assert.equal(
      (await f.database.select().from(guardDelivery))[0].payload,
      '{}'
    );
    await f.database.update(guardDelivery).set({
      status: 'pending',
      attempts: 5,
      payload: JSON.stringify({ snapshot: { items: [video] } }),
    });
    await f.store.deliverPending(async () => {
      sends++;
      return { success: true, provider: 'test' };
    });
    assert.equal(sends, 0);
    assert.equal(
      (await f.database.select().from(guardDelivery))[0].payload,
      '{}'
    );
  } finally {
    f.client.close();
  }
});

async function markDeleting(f: Awaited<ReturnType<typeof fixture>>) {
  await f.database.insert(verification).values({
    id: 'delete-marker',
    identifier: 'youtube-delete-user',
    value: 'owner',
    expiresAt: new Date(f.clock() + DAY),
  });
}

test('atomic creation rejects revocation and account deletion that occur after the ownership precheck', async () => {
  for (const revoke of [true, false]) {
    const f = await fixture();
    try {
      await f.grant();
      const database = new Proxy(f.database, {
        get(target, property) {
          if (property !== 'insert') return Reflect.get(target, property);
          return (table: Parameters<typeof f.database.insert>[0]) => {
            const builder = target.insert(table);
            if (table !== guardCollection) return builder;
            return new Proxy(builder, {
              get(insert, key) {
                if (key !== 'select') return Reflect.get(insert, key);
                return async (query: Parameters<typeof insert.select>[0]) => {
                  if (revoke) await f.database.delete(youtubeConnection);
                  else await markDeleting(f);
                  return insert.select(query);
                };
              },
            });
          };
        },
      });
      const store = createGuardStore(database, f.clock);
      await assert.rejects(
        store.create(
          'owner',
          revoke
            ? {
                ...f.input,
                source: 'private_playlist',
                connectionId: 'connection',
              }
            : f.input,
          'racing-insert'
        ),
        /Collection not found/
      );
      assert.equal((await f.database.select().from(guardCollection)).length, 0);
    } finally {
      f.client.close();
    }
  }
});

test('account deletion fences public reads, writes, in-flight scan commits and pending mail', async () => {
  const f = await fixture();
  try {
    const saved = await f.store.create('owner', f.input, 'public');
    await f.store.sync(
      'owner',
      saved.id,
      async () => ({ complete: true, items: [video] }),
      { scheduled: true }
    );
    f.advance(61_000);
    await assert.rejects(
      f.store.sync(
        'owner',
        saved.id,
        async () => {
          await markDeleting(f);
          return {
            complete: true,
            items: [{ ...video, title: 'Must not return' }],
          };
        },
        { scheduled: true }
      ),
      /being deleted/
    );
    const [row] = await f.database.select().from(guardCollection);
    assert(!row.document.includes('Must not return'));
    assert.equal((await f.database.select().from(guardDelivery)).length, 1);
    assert.deepEqual(await f.store.list('owner'), []);
    await assert.rejects(f.store.detail('owner', saved.id), /being deleted/);
    await assert.rejects(
      f.store.update('owner', saved.id, { name: 'Changed' }),
      /being deleted/
    );
    await assert.rejects(
      f.store.create('owner', f.input, 'new'),
      /being deleted/
    );
    let sends = 0;
    await f.store.deliverPending(async () => {
      sends++;
      return { success: true, provider: 'test' };
    });
    assert.equal(sends, 0);
    assert.equal(
      (await f.database.select().from(guardDelivery))[0].payload,
      '{}'
    );
  } finally {
    f.client.close();
  }
});

test('deleting a collection after mail validation cancels its claimed send', async () => {
  const f = await fixture();
  try {
    const saved = await f.store.create('owner', f.input, 'public');
    await f.store.sync(
      'owner',
      saved.id,
      async () => ({ complete: true, items: [video] }),
      { scheduled: true }
    );
    const database = new Proxy(f.database, {
      get(target, property) {
        if (property !== 'select') return Reflect.get(target, property);
        return (fields?: Parameters<typeof f.database.select>[0]) => {
          const builder = fields ? target.select(fields) : target.select();
          if (!fields || fields.verified !== user.emailVerified) return builder;
          return {
            from: (table: typeof user) => ({
              where: (
                condition: Parameters<
                  ReturnType<typeof builder.from>['where']
                >[0]
              ) => ({
                limit: async (limit: number) => {
                  const result = await builder
                    .from(table)
                    .where(condition)
                    .limit(limit);
                  await f.store.remove('owner', saved.id);
                  return result;
                },
              }),
            }),
          };
        };
      },
    });
    let sends = 0;
    await createGuardStore(database, f.clock).deliverPending(async () => {
      sends++;
      return { success: true, provider: 'test' };
    });
    assert.equal(sends, 0);
    assert.equal((await f.database.select().from(guardDelivery)).length, 0);
  } finally {
    f.client.close();
  }
});

test('queued copies of an older source title expire before their newer snapshot', async () => {
  for (const useMaintenance of [true, false]) {
    const f = await fixture();
    try {
      const saved = await f.store.create(
        'owner',
        { ...f.input, source: 'channel', name: 'Old title' },
        'channel'
      );
      await f.store.sync('owner', saved.id, async () => ({
        complete: true,
        items: [video],
        sourceTitle: 'Old title',
      }));
      f.advance(29 * DAY);
      await f.store.sync(
        'owner',
        saved.id,
        async () => ({ complete: true, items: [video] }),
        { scheduled: true }
      );
      const [queued] = await f.database.select().from(guardDelivery);
      const payload = JSON.parse(queued.payload);
      assert.equal(
        Date.parse(payload.metadataCollectedAt),
        f.clock() - 29 * DAY
      );
      assert.equal(Date.parse(payload.snapshot.createdAt), f.clock());
      f.advance(DAY);
      let sends = 0;
      if (useMaintenance) {
        await f.store.cleanupExpired();
        assert.equal((await f.database.select().from(guardDelivery)).length, 0);
      } else {
        await f.store.deliverPending(async () => {
          sends++;
          return { success: true, provider: 'test' };
        });
        assert.equal(
          (await f.database.select().from(guardDelivery))[0].payload,
          '{}'
        );
      }
      assert.equal(sends, 0);
    } finally {
      f.client.close();
    }
  }
});
