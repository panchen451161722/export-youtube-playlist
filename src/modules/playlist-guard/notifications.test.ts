import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runGuardJobs } from '@/routes/api/-playlist-guard-jobs';
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
} from '@/config/db/schema';
import {
  guardNotificationEmail,
  type GuardNotificationPayload,
} from '@/lib/playlist-guard/notifications';
import type { GuardCreateInput, GuardItem } from '@/lib/playlist-guard/types';

import { createGuardStore } from './service';

const DAY = 86_400_000;
const video = (id: string): GuardItem => ({
  id,
  title: `<${id}>`,
  channel: 'Test',
  position: 1,
  duration: '1:20',
  url: `https://www.youtube.com/watch?v=${id}`,
  thumbnail: '',
});
async function fixture(preferences: Partial<GuardCreateInput> = {}) {
  const client = createClient({ url: ':memory:' });
  const database = drizzle(client);
  for (const table of [
    user,
    subscription,
    guardWorkspace,
    guardCollection,
    guardDelivery,
  ]) {
    const config = getTableConfig(table);
    await client.execute(
      `CREATE TABLE "${config.name}" (${config.columns.map((c) => `"${c.name}" ${c.getSQLType()}${c.primary ? ' PRIMARY KEY' : ''}`).join(',')})`
    );
  }
  await database.insert(user).values({
    id: 'owner',
    name: 'Owner',
    email: 'owner@example.invalid',
    emailVerified: true,
    locale: 'zh',
  });
  let now = Date.UTC(2026, 9, 13);
  const clock = () => now;
  const store = createGuardStore(database, clock);
  await database.insert(subscription).values({
    id: 'owner-sub',
    subscriptionNo: 'owner-sub',
    userId: 'owner',
    status: 'active',
    paymentProvider: 'stripe',
    subscriptionId: 'sub_owner',
    productId: 'guard_pro_yearly',
    currentPeriodStart: new Date(now),
    currentPeriodEnd: new Date(now + 365 * DAY),
  });
  const collection = await store.create(
    'owner',
    {
      name: '<Study & learn>',
      source: 'playlist',
      url: 'https://www.youtube.com/playlist?list=PL1234567890',
      frequency: 'daily',
      notifyMissing: true,
      notifyAdded: true,
      emailDelivery: true,
      ...preferences,
    },
    'playlist:test'
  );
  await store.sync('owner', collection.id, async () => ({
    complete: true,
    items: [video('a'), video('b')],
  }));
  return {
    client,
    database,
    store,
    collection,
    clock,
    advance: (n = DAY) => {
      now += n;
    },
  };
}
const capabilities = {
  youtube: true,
  email: true,
  scheduler: true,
  privateSources: false,
};

test('scheduled runner atomically saves changes, sends a localized attachment once, and advances schedule', async () => {
  const f = await fixture();
  try {
    assert.equal(
      (await f.database.select().from(guardDelivery)).length,
      0,
      'manual sync must not send'
    );
    f.advance();
    let scans = 0;
    const messages = [];
    const runtime = {
      capabilities,
      scan: async () => {
        scans++;
        return { complete: true, items: [video('b'), video('c')] };
      },
      send: async (
        payload: GuardNotificationPayload,
        to: string,
        id: string
      ) => {
        const mail = guardNotificationEmail(
          payload,
          to,
          { name: 'Test App', url: 'https://example.invalid' },
          id
        );
        messages.push(mail);
        assert.match(mail.text!, /丢失视频：1/);
        assert.match(mail.text!, /新增视频：1/);
        assert.match(mail.html!, /&lt;Study &amp; learn&gt;/);
        assert(!mail.html!.includes('<Study & learn>'));
        const snapshot = JSON.parse(mail.attachments![0].content.toString());
        assert.equal(snapshot.items.length, 2);
        assert.equal(to, 'owner@example.invalid');
        assert.equal(mail.idempotencyKey, `playlist-guard/${id}`);
        return { success: true, provider: 'test', messageId: 'accepted' };
      },
    };
    const result = await runGuardJobs(f.store, runtime);
    assert.equal(result.completed, 1);
    assert.equal(result.mail.sent, 1);
    const saved = await f.store.detail('owner', f.collection.id);
    assert.equal(saved.missing[0].id, 'a');
    assert.equal(saved.delivery?.status, 'sent');
    assert(Date.parse(saved.nextSyncAt!) > f.clock());
    await runGuardJobs(f.store, runtime);
    assert.equal(scans, 1);
    assert.equal(messages.length, 1);
  } finally {
    f.client.close();
  }
});

test('failed mail persists across store recreation and concurrent retry sends only once without rescanning', async () => {
  const f = await fixture();
  try {
    f.advance();
    let scans = 0;
    const runtime = {
      capabilities,
      scan: async () => {
        scans++;
        return { complete: true, items: [video('b')] };
      },
      send: async () => ({ success: false, provider: 'test' }),
    };
    await runGuardJobs(f.store, runtime);
    const queued = await f.store.detail('owner', f.collection.id);
    assert.equal(queued.delivery?.status, 'pending');
    assert.equal(queued.delivery?.attempts, 1);
    f.advance(5 * 60_000);
    const restarted = createGuardStore(f.database, f.clock);
    let deliveries = 0;
    const send = async () => {
      deliveries++;
      await new Promise((r) => setTimeout(r, 10));
      return { success: true, provider: 'test' };
    };
    const results = await Promise.all([
      runGuardJobs(restarted, { ...runtime, send }),
      runGuardJobs(f.store, { ...runtime, send }),
    ]);
    assert.equal(deliveries, 1);
    assert.equal(scans, 1);
    assert.equal(
      results.reduce((n, r) => n + r.mail.sent, 0),
      1
    );
    assert.equal(
      (await restarted.detail('owner', f.collection.id)).delivery?.attempts,
      2
    );
  } finally {
    f.client.close();
  }
});

test('unchanged alerts, unverified recipients, paused collections and incomplete scans never send', async () => {
  const f = await fixture({ emailDelivery: false });
  try {
    f.advance();
    let sends = 0;
    const send = async () => {
      sends++;
      return { success: true, provider: 'test' };
    };
    await runGuardJobs(f.store, {
      capabilities,
      scan: async () => ({ complete: true, items: [video('a'), video('b')] }),
      send,
    });
    assert.equal(sends, 0);
    f.advance();
    await f.database
      .update(user)
      .set({ emailVerified: false })
      .where(eq(user.id, 'owner'));
    await runGuardJobs(f.store, {
      capabilities,
      scan: async () => ({ complete: true, items: [video('a')] }),
      send,
    });
    assert.equal(sends, 0);
    f.advance();
    await f.database
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.id, 'owner'));
    await runGuardJobs(f.store, {
      capabilities,
      scan: async () => ({ complete: false, items: [] }),
      send,
    });
    assert.equal(sends, 0);
    assert.equal((await f.store.detail('owner', f.collection.id)).itemCount, 1);
    await f.store.update('owner', f.collection.id, { enabled: false });
    f.advance();
    assert.equal((await f.store.due()).length, 0);
  } finally {
    f.client.close();
  }
});

test('daily change-only checks stay quiet for unchanged videos and notify on additions or removals', async () => {
  const f = await fixture({ frequency: 'daily', emailDelivery: false });
  try {
    let scans = 0;
    let items = [
      video('a'),
      { ...video('b'), title: 'Updated title', views: 50 },
    ];
    const sent: GuardNotificationPayload[] = [];
    const runtime = {
      capabilities,
      scan: async () => {
        scans++;
        return { complete: true, items };
      },
      send: async (
        payload: GuardNotificationPayload,
        to: string,
        id: string
      ) => {
        sent.push(payload);
        const email = guardNotificationEmail(
          payload,
          to,
          { name: 'Test', url: 'https://example.invalid' },
          id
        );
        assert.equal(
          email.attachments,
          undefined,
          'backup delivery is disabled'
        );
        return { success: true, provider: 'test', messageId: id };
      },
    };
    f.advance(DAY - 1);
    assert.equal((await runGuardJobs(f.store, runtime)).checked, 0);
    f.advance(1);
    const unchanged = await runGuardJobs(f.store, runtime);
    assert.equal(unchanged.completed, 1);
    assert.equal(unchanged.mail.attempted, 0);
    assert.equal(sent.length, 0);
    assert.equal((await f.database.select().from(guardDelivery)).length, 0);
    const saved = await f.store.detail('owner', f.collection.id);
    assert.equal(Date.parse(saved.nextSyncAt!), f.clock() + DAY);
    assert.equal(saved.snapshots[0].added, 0);
    assert.equal(saved.snapshots[0].removed, 0);

    f.advance(DAY);
    items = [...items, video('c')];
    assert.equal((await runGuardJobs(f.store, runtime)).mail.sent, 1);
    assert.equal(sent[0].snapshot.added, 1);
    assert.equal(sent[0].snapshot.removed, 0);

    f.advance(DAY);
    assert.equal((await runGuardJobs(f.store, runtime)).mail.attempted, 0);
    assert.equal(
      sent.length,
      1,
      'an unchanged scan must not repeat the last alert'
    );

    f.advance(DAY);
    items = items.filter((item) => item.id !== 'a');
    assert.equal((await runGuardJobs(f.store, runtime)).mail.sent, 1);
    assert.equal(sent[1].snapshot.added, 0);
    assert.equal(sent[1].snapshot.removed, 1);
    assert.equal(scans, 4);
    assert.equal(sent.length, 2);
  } finally {
    f.client.close();
  }
});

test('outbox insert failure rolls back the snapshot and queues no phantom notification', async () => {
  const f = await fixture();
  try {
    await f.client.execute(
      "CREATE TRIGGER reject_delivery BEFORE INSERT ON guard_delivery BEGIN SELECT RAISE(ABORT,'outbox unavailable'); END"
    );
    f.advance();
    await assert.rejects(
      f.store.sync(
        'owner',
        f.collection.id,
        async () => ({ complete: true, items: [video('c')] }),
        { scheduled: true }
      )
    );
    const saved = await f.store.detail('owner', f.collection.id);
    assert.equal(saved.runCount, 1);
    assert.equal(saved.itemCount, 2);
    assert.equal((await f.database.select().from(guardDelivery)).length, 0);
  } finally {
    f.client.close();
  }
});

test('recipient or notification preference changes cancel pending delivery', async () => {
  const f = await fixture();
  try {
    f.advance();
    await f.store.sync(
      'owner',
      f.collection.id,
      async () => ({ complete: true, items: [video('b')] }),
      { scheduled: true }
    );
    await f.store.update('owner', f.collection.id, { emailDelivery: false });
    const stats = await f.store.deliverPending(async () => {
      throw Error('must not send');
    });
    assert.equal(stats.cancelled, 1);
    assert.equal(
      (await f.store.detail('owner', f.collection.id)).delivery?.status,
      'cancelled'
    );
  } finally {
    f.client.close();
  }
});

test('mail retry stops after five failures and does not consume another scan', async () => {
  const f = await fixture();
  try {
    f.advance();
    await f.store.sync(
      'owner',
      f.collection.id,
      async () => ({ complete: true, items: [video('b')] }),
      { scheduled: true }
    );
    for (let attempt = 0; attempt < 5; attempt++) {
      await f.store.deliverPending(async () => ({
        success: false,
        provider: 'test',
      }));
      f.advance(6 * 60 * 60_000);
    }
    const saved = await f.store.detail('owner', f.collection.id);
    assert.equal(saved.delivery?.status, 'failed');
    assert.equal(saved.delivery?.attempts, 5);
    assert.equal(saved.runCount, 2);
    const result = await f.store.deliverPending(async () => {
      throw Error('must stop');
    });
    assert.equal(result.attempted, 0);
  } finally {
    f.client.close();
  }
});

test('an expired scan cannot enqueue a stale notification after a newer scan wins', async () => {
  const f = await fixture();
  try {
    f.advance();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let scanning!: () => void;
    const started = new Promise<void>((resolve) => {
      scanning = resolve;
    });
    const stale = f.store.sync(
      'owner',
      f.collection.id,
      async () => {
        scanning();
        await gate;
        return { complete: true, items: [video('old')] };
      },
      { scheduled: true }
    );
    await started;
    f.advance(4 * 60_000);
    const fresh = await f.store.sync(
      'owner',
      f.collection.id,
      async () => ({ complete: true, items: [video('new')] }),
      { scheduled: true }
    );
    release();
    await assert.rejects(stale);
    const queue = await f.database.select().from(guardDelivery);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].id, fresh.snapshots[0].id);
  } finally {
    f.client.close();
  }
});

test('OAuth-only scheduler checks subscriptions as their owner, preserves failures and alerts only on changes', async () => {
  const f = await fixture({
    source: 'subscriptions',
    connectionId: 'fixture-connection',
    frequency: 'daily',
    emailDelivery: false,
  });
  try {
    const initial = await f.store.detail('owner', f.collection.id);
    const sent: GuardNotificationPayload[] = [];
    let fail = false;
    let items = initial.snapshots[0].items.map((item) => ({
      ...item,
      kind: 'channel' as const,
    }));
    const runtime = {
      capabilities: { ...capabilities, youtube: false, privateSources: true },
      scan: async (collection: { connectionId?: string }, ownerId: string) => {
        assert.equal(ownerId, 'owner');
        assert.equal(collection.connectionId, 'fixture-connection');
        if (fail) throw new Error('upstream fixture failure');
        return { complete: true, items };
      },
      send: async (payload: GuardNotificationPayload) => {
        sent.push(payload);
        return { success: true, provider: 'fixture' };
      },
    };
    f.advance(DAY);
    assert.equal((await runGuardJobs(f.store, runtime)).completed, 1);
    assert.equal(sent.length, 0);
    items = [items[0], { ...items[1], id: 'new-channel' }];
    f.advance(DAY);
    assert.equal((await runGuardJobs(f.store, runtime)).mail.sent, 1);
    assert.equal(sent[0].kind, 'channel');
    const email = guardNotificationEmail(
      sent[0],
      'fixture@example.invalid',
      { name: 'Test', url: 'https://example.invalid' },
      'fixture'
    );
    assert.match(email.text || '', /新增频道：1/);
    assert.match(email.text || '', /丢失频道：1/);
    const saved = await f.store.detail('owner', f.collection.id);
    fail = true;
    f.advance(DAY);
    assert.equal((await runGuardJobs(f.store, runtime)).failed, 1);
    assert.deepEqual(
      (await f.store.detail('owner', f.collection.id)).snapshots,
      saved.snapshots
    );
    assert.equal(sent.length, 1);
  } finally {
    f.client.close();
  }
});

test('legacy hourly collections become daily without changing notification preferences or scanning early', async () => {
  const f = await fixture({
    emailDelivery: false,
    notifyAdded: true,
    notifyMissing: true,
  });
  try {
    const [row] = await f.database
      .select()
      .from(guardCollection)
      .where(eq(guardCollection.id, f.collection.id));
    const document = JSON.parse(row.document);
    const summary = JSON.parse(row.summary);
    const oldDeadline = new Date(f.clock() + 3_600_000).toISOString();
    await f.database
      .update(guardCollection)
      .set({
        document: JSON.stringify({
          ...document,
          frequency: 'hourly',
          nextSyncAt: oldDeadline,
        }),
        summary: JSON.stringify({
          ...summary,
          frequency: 'hourly',
          nextSyncAt: oldDeadline,
        }),
        nextSyncAt: oldDeadline,
      })
      .where(eq(guardCollection.id, f.collection.id));
    const current = await f.store.detail('owner', f.collection.id);
    assert.equal(current.frequency, 'daily');
    assert.equal(current.nextSyncAt, new Date(f.clock() + DAY).toISOString());
    assert.equal(current.notifyAdded, true);
    assert.equal(current.notifyMissing, true);
    assert.equal(current.emailDelivery, false);
    assert.deepEqual(current.snapshots, document.snapshots);
    assert.equal((await f.store.list('owner'))[0].frequency, 'daily');
    f.advance(3_600_000);
    assert.equal((await f.store.due()).length, 0);
    const [deferred] = await f.database
      .select()
      .from(guardCollection)
      .where(eq(guardCollection.id, f.collection.id));
    assert.equal(deferred.nextSyncAt, current.nextSyncAt);
    f.advance(DAY - 3_600_000);
    assert.equal((await f.store.due()).length, 1);
    await f.store.sync(
      'owner',
      f.collection.id,
      async () => ({ complete: true, items: current.snapshots[0].items }),
      { scheduled: true }
    );
    const [saved] = await f.database
      .select()
      .from(guardCollection)
      .where(eq(guardCollection.id, f.collection.id));
    assert.equal(JSON.parse(saved.document).frequency, 'daily');
    assert.equal(saved.nextSyncAt, new Date(f.clock() + DAY).toISOString());
    assert.equal((await f.database.select().from(guardDelivery)).length, 0);
  } finally {
    f.client.close();
  }
});

test('mail setup can follow saved alert preferences without stale alerts or exhausted retries', async () => {
  const f = await fixture({
    emailDelivery: false,
    notifyAdded: true,
    notifyMissing: true,
  });
  try {
    let items = [video('a'), video('b'), video('c')];
    let calls = 0;
    let fail = false;
    const runtime = {
      capabilities: { ...capabilities, email: false },
      scan: async () => ({ complete: true, items }),
      send: async () => {
        calls++;
        return fail
          ? { success: false, provider: 'fixture', error: 'temporary' }
          : { success: true, provider: 'fixture' };
      },
    };
    f.advance(DAY);
    const unconfigured = await runGuardJobs(f.store, runtime);
    assert.equal(unconfigured.completed, 1);
    assert.equal(unconfigured.mail.attempted, 0);
    assert.equal(calls, 0);
    assert.equal((await f.database.select().from(guardDelivery)).length, 0);
    const preferences = await f.store.detail('owner', f.collection.id);
    assert.equal(preferences.notifyAdded, true);
    assert.equal(preferences.notifyMissing, true);
    assert.equal(preferences.emailDelivery, false);
    runtime.capabilities.email = true;
    f.advance(DAY);
    assert.equal((await runGuardJobs(f.store, runtime)).mail.attempted, 0);
    assert.equal(calls, 0, 'enabling mail does not resend earlier changes');
    items = [...items, video('d')];
    fail = true;
    f.advance(DAY);
    assert.equal((await runGuardJobs(f.store, runtime)).mail.failed, 1);
    const [pending] = await f.database.select().from(guardDelivery);
    assert.equal(pending.attempts, 1);
    runtime.capabilities.email = false;
    f.advance(3_600_000);
    assert.equal((await runGuardJobs(f.store, runtime)).mail.attempted, 0);
    const [waiting] = await f.database.select().from(guardDelivery);
    assert.equal(waiting.attempts, pending.attempts);
    runtime.capabilities.email = true;
    fail = false;
    assert.equal((await runGuardJobs(f.store, runtime)).mail.sent, 1);
    assert.equal(calls, 2);
  } finally {
    f.client.close();
  }
});

test('restored-only alerts send once when a missing ID returns, without counting it as new', async () => {
  const f = await fixture({
    notifyAdded: false,
    notifyMissing: false,
    notifyRestored: true,
    emailDelivery: false,
  });
  try {
    let items = [video('b')];
    const sent: GuardNotificationPayload[] = [];
    const runtime = {
      capabilities,
      scan: async () => ({ complete: true, items }),
      send: async (payload: GuardNotificationPayload) => {
        sent.push(payload);
        return { success: true, provider: 'fixture' };
      },
    };
    f.advance(DAY);
    assert.equal((await runGuardJobs(f.store, runtime)).mail.attempted, 0);
    assert.equal(
      (await f.store.detail('owner', f.collection.id)).missing.length,
      1
    );
    items = [video('a'), video('b')];
    f.advance(DAY);
    assert.equal((await runGuardJobs(f.store, runtime)).mail.sent, 1);
    assert.equal(sent[0].snapshot.restored, 1);
    assert.equal(sent[0].snapshot.added, 0);
    assert.equal(sent[0].snapshot.removed, 0);
    assert.equal(
      (await f.store.detail('owner', f.collection.id)).missing.length,
      0
    );
    const app = { name: 'Test', url: 'https://example.invalid' };
    assert.match(
      guardNotificationEmail(sent[0], 'fixture@example.invalid', app, 'fixture')
        .text || '',
      /恢复视频：1/
    );
    assert.match(
      guardNotificationEmail(
        { ...sent[0], locale: 'en' },
        'fixture@example.invalid',
        app,
        'fixture'
      ).text || '',
      /Restored videos: 1/
    );
    assert.equal(
      guardNotificationEmail(sent[0], 'fixture@example.invalid', app, 'fixture')
        .attachments,
      undefined
    );
    f.advance(DAY);
    assert.equal((await runGuardJobs(f.store, runtime)).mail.attempted, 0);
    assert.equal(sent.length, 1);
  } finally {
    f.client.close();
  }
});

test('disabled restored alerts do not become added alerts, and opting out cancels a queued restoration', async () => {
  const f = await fixture({
    notifyAdded: true,
    notifyMissing: false,
    notifyRestored: false,
    emailDelivery: false,
  });
  try {
    f.advance(61_000);
    await f.store.sync('owner', f.collection.id, async () => ({
      complete: true,
      items: [video('b')],
    }));
    f.advance(DAY);
    const runtime = {
      capabilities,
      scan: async () => ({ complete: true, items: [video('a'), video('b')] }),
      send: async () => {
        throw Error('must not send');
      },
    };
    assert.equal((await runGuardJobs(f.store, runtime)).mail.attempted, 0);
    assert.equal(
      (await f.store.detail('owner', f.collection.id)).snapshots[0].restored,
      1
    );
    assert.equal(
      (await f.store.detail('owner', f.collection.id)).snapshots[0].added,
      0
    );
    await f.store.update('owner', f.collection.id, { notifyRestored: true });
    f.advance(61_000);
    await f.store.sync('owner', f.collection.id, async () => ({
      complete: true,
      items: [video('b')],
    }));
    f.advance(DAY);
    await f.store.sync('owner', f.collection.id, runtime.scan, {
      scheduled: true,
    });
    assert.equal((await f.database.select().from(guardDelivery)).length, 1);
    await f.store.update('owner', f.collection.id, { notifyRestored: false });
    assert.equal((await f.store.deliverPending(runtime.send)).cancelled, 1);
  } finally {
    f.client.close();
  }
});
