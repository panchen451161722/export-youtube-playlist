import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
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
import type { GuardCreateInput, GuardItem } from '@/lib/playlist-guard/types';

import { createGuardStore, GuardError } from './service';

const DAY = 86_400_000;
const input: GuardCreateInput = {
  name: 'Review collection',
  source: 'playlist',
  url: 'https://youtube.com/playlist?list=PLreview',
  frequency: 'daily',
  notifyMissing: true,
  notifyAdded: true,
  emailDelivery: true,
};
const video: GuardItem = {
  id: 'review-video',
  title: 'Saved metadata',
  channel: 'Review channel',
  url: 'https://youtu.be/review-video',
  thumbnail: '',
  duration: '1:00',
  position: 1,
};
const code = (expected: string) => (error: unknown) =>
  error instanceof GuardError && error.code === expected;

async function fixture(t: TestContext) {
  const client = createClient({ url: ':memory:' });
  t.after(() => client.close());
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
  await client.execute(
    'CREATE UNIQUE INDEX uq_guard_user_slot ON guard_collection (user_id, slot)'
  );
  await client.execute(
    'CREATE UNIQUE INDEX uq_guard_user_source ON guard_collection (user_id, source_key)'
  );
  let now = Date.UTC(2026, 9, 18);
  let configuration = JSON.stringify([
    {
      email: 'reviewer@example.invalid',
      expiresAt: '2026-11-17T23:59:59Z',
      limit: 10,
    },
  ]);
  const clock = () => now;
  const review = () => configuration;
  await database.insert(user).values([
    {
      id: 'reviewer',
      name: 'Reviewer',
      email: 'REVIEWER@example.invalid',
      emailVerified: true,
    },
    {
      id: 'other',
      name: 'Other',
      email: 'other@example.invalid',
      emailVerified: true,
    },
  ]);
  const store = createGuardStore(database, clock, review);
  return {
    database,
    store,
    clock,
    review,
    advance: (ms: number) => {
      now += ms;
    },
    setTime: (value: number) => {
      now = value;
    },
    revoke: () => {
      configuration = '[]';
    },
    async grantConnection(id: string, userId = 'reviewer') {
      await database.insert(youtubeConnection).values({
        id,
        userId,
        channelId: id,
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
    },
    async paid(plan: 'lite' | 'pro' | 'ultra') {
      await database.insert(subscription).values({
        id: 'paid',
        subscriptionNo: 'paid',
        userId: 'reviewer',
        status: 'active',
        paymentProvider: 'stripe',
        subscriptionId: 'sub_actual',
        productId: `guard_${plan}_monthly`,
        currentPeriodStart: new Date(now - DAY),
        currentPeriodEnd: new Date(now + 365 * DAY),
      });
    },
  };
}

test('reviewer can reserve exactly ten slots concurrently without a subscription or access for other accounts', async (t) => {
  const f = await fixture(t);
  const results = await Promise.allSettled(
    Array.from({ length: 14 }, (_, i) =>
      f.store.create('reviewer', input, `source-${i}`)
    )
  );
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    10
  );
  assert.equal((await f.store.list('reviewer')).length, 10);
  assert.equal((await f.database.select().from(subscription)).length, 0);
  assert.equal((await f.store.entitlement('reviewer')).plan, 'free');
  assert.equal((await f.store.entitlement('other')).limit, 0);
  await assert.rejects(
    f.store.create('other', input, 'other'),
    code('plan_required')
  );
});

test('review allowance preserves larger paid access and removal falls back to actual subscription', async (t) => {
  for (const plan of ['lite', 'pro'] as const) {
    const f = await fixture(t);
    await f.paid(plan);
    const before = await f.database.select().from(subscription);
    const active = await f.store.entitlement('reviewer');
    assert.equal(active.plan, plan);
    assert.equal(active.limit, plan === 'pro' ? 15 : 10);
    f.revoke();
    const remaining = await f.store.entitlement('reviewer');
    assert.equal(remaining.plan, plan);
    assert.equal(remaining.limit, plan === 'pro' ? 15 : 2);
    assert.equal(remaining.review, undefined);
    assert.deepEqual(await f.database.select().from(subscription), before);
  }
});

test('current verified database email controls access and private ownership remains mandatory', async (t) => {
  const f = await fixture(t);
  await f.grantConnection('own');
  await f.grantConnection('foreign', 'other');
  await assert.rejects(
    f.store.create(
      'reviewer',
      { ...input, source: 'private_playlist', connectionId: 'foreign' },
      'foreign'
    ),
    code('connection_unavailable')
  );
  const own = await f.store.create(
    'reviewer',
    { ...input, source: 'private_playlist', connectionId: 'own' },
    'own'
  );
  let scans = 0;
  await assert.rejects(
    f.store.sync('other', own.id, async () => {
      scans++;
      return { complete: true, items: [] };
    }),
    code('not_found')
  );
  await assert.rejects(f.store.detail('other', own.id), code('not_found'));
  await assert.rejects(
    f.store.update('other', own.id, { enabled: true }),
    code('not_found')
  );
  await assert.rejects(f.store.remove('other', own.id), code('not_found'));
  assert.equal(scans, 0);
  for (const change of [
    { emailVerified: false },
    { email: 'reviewer+alias@example.invalid', emailVerified: true },
  ]) {
    await f.database.update(user).set(change).where(eq(user.id, 'reviewer'));
    assert.equal((await f.store.entitlement('reviewer')).limit, 0);
    await assert.rejects(
      f.store.sync('reviewer', own.id, async () => ({
        complete: true,
        items: [],
      })),
      code('plan_required')
    );
  }
});

test('expiry blocks creation and scanning while preserving saved reads, pause and deletion', async (t) => {
  const f = await fixture(t);
  const saved = await f.store.create('reviewer', input, 'saved');
  await f.store.sync('reviewer', saved.id, async () => ({
    complete: true,
    items: [video],
  }));
  f.setTime(Date.parse('2026-11-17T23:59:59Z'));
  assert.equal((await f.store.entitlement('reviewer')).limit, 0);
  await assert.rejects(
    f.store.create('reviewer', input, 'expired'),
    code('plan_required')
  );
  await assert.rejects(
    f.store.sync('reviewer', saved.id, async () => ({
      complete: true,
      items: [],
    })),
    code('plan_required')
  );
  assert.equal((await f.store.detail('reviewer', saved.id)).id, saved.id);
  await f.store.update('reviewer', saved.id, { enabled: false });
  await assert.rejects(
    f.store.update('reviewer', saved.id, { enabled: true }),
    code('plan_required')
  );
  await f.store.remove('reviewer', saved.id);
  assert.equal((await f.store.list('reviewer')).length, 0);
});

test('expiry, removal or email changes during a scan preserve the old snapshot and enqueue nothing', async (t) => {
  for (const change of ['expiry', 'removal', 'email'] as const) {
    const f = await fixture(t);
    const saved = await f.store.create('reviewer', input, 'saved');
    await f.store.sync('reviewer', saved.id, async () => ({
      complete: true,
      items: [video],
    }));
    const previous = (await f.database.select().from(guardCollection))[0]
      .document;
    f.advance(61_000);
    await assert.rejects(
      f.store.sync(
        'reviewer',
        saved.id,
        async () => {
          if (change === 'expiry')
            f.setTime(Date.parse('2026-11-17T23:59:59Z'));
          if (change === 'removal') f.revoke();
          if (change === 'email')
            await f.database
              .update(user)
              .set({ emailVerified: false })
              .where(eq(user.id, 'reviewer'));
          return { complete: true, items: [{ ...video, id: 'new' }] };
        },
        { scheduled: true }
      ),
      code('plan_required')
    );
    assert.equal(
      (await f.database.select().from(guardCollection))[0].document,
      previous
    );
    assert.equal((await f.database.select().from(guardDelivery)).length, 0);
  }
});

test('atomic reservation checks verification again after the precheck', async (t) => {
  const f = await fixture(t);
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
              await f.database
                .update(user)
                .set({ emailVerified: false })
                .where(eq(user.id, 'reviewer'));
              return insert.select(query);
            };
          },
        });
      };
    },
  });
  await assert.rejects(
    createGuardStore(database, f.clock, f.review).create(
      'reviewer',
      input,
      'race'
    )
  );
  assert.equal((await f.database.select().from(guardCollection)).length, 0);
});

test('a grant change immediately before the save batch cannot persist or falsely report success', async (t) => {
  const f = await fixture(t);
  const saved = await f.store.create('reviewer', input, 'saved');
  const before = (await f.database.select().from(guardCollection))[0].document;
  const database = new Proxy(f.database, {
    get(target, property) {
      if (property !== 'batch') return Reflect.get(target, property);
      return async (queries: Parameters<typeof f.database.batch>[0]) => {
        await f.database
          .update(user)
          .set({ emailVerified: false })
          .where(eq(user.id, 'reviewer'));
        return target.batch(queries);
      };
    },
  });
  await assert.rejects(
    createGuardStore(database, f.clock, f.review).sync(
      'reviewer',
      saved.id,
      async () => ({ complete: true, items: [video] }),
      { scheduled: true }
    ),
    code('plan_required')
  );
  assert.equal(
    (await f.database.select().from(guardCollection))[0].document,
    before
  );
  assert.equal((await f.database.select().from(guardDelivery)).length, 0);
});

test('expiry during the recipient lookup cannot leave a stale quota predicate in the commit', async (t) => {
  const f = await fixture(t);
  const saved = await f.store.create('reviewer', input, 'saved');
  const before = (await f.database.select().from(guardCollection))[0].document;
  const database = new Proxy(f.database, {
    get(target, property) {
      if (property !== 'select') return Reflect.get(target, property);
      return (fields?: Parameters<typeof f.database.select>[0]) => {
        const builder = fields ? target.select(fields) : target.select();
        if (!fields || fields.locale !== user.locale) return builder;
        return {
          from: (table: typeof user) => ({
            where: (
              condition: Parameters<ReturnType<typeof builder.from>['where']>[0]
            ) => ({
              limit: async (limit: number) => {
                const result = await builder
                  .from(table)
                  .where(condition)
                  .limit(limit);
                f.setTime(Date.parse('2026-11-17T23:59:59Z'));
                return result;
              },
            }),
          }),
        };
      };
    },
  });
  await assert.rejects(
    createGuardStore(database, f.clock, f.review).sync(
      'reviewer',
      saved.id,
      async () => ({ complete: true, items: [video] }),
      { scheduled: true }
    ),
    code('plan_required')
  );
  assert.equal(
    (await f.database.select().from(guardCollection))[0].document,
    before
  );
  assert.equal((await f.database.select().from(guardDelivery)).length, 0);
});

test('revoked or expired review access cancels queued email without sending', async (t) => {
  for (const change of ['revoke', 'expire']) {
    const f = await fixture(t);
    f.setTime(Date.parse('2026-11-17T23:59:59Z') - 1000);
    const saved = await f.store.create('reviewer', input, 'saved');
    await f.store.sync(
      'reviewer',
      saved.id,
      async () => ({ complete: true, items: [video] }),
      { scheduled: true }
    );
    assert.equal((await f.database.select().from(guardDelivery)).length, 1);
    if (change === 'revoke') f.revoke();
    else f.advance(1000);
    let sends = 0;
    const result = await f.store.deliverPending(async () => {
      sends++;
      return { success: true, provider: 'test' };
    });
    assert.equal(sends, 0);
    assert.equal(result.cancelled, 1);
    assert.equal(
      (await f.database.select().from(guardDelivery))[0].payload,
      '{}'
    );
  }
});
