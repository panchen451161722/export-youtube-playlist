import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';

import {
  drainYoutubeRevocations,
  removeUserYoutubeData,
  removeYoutubeConnectionData,
} from '@/core/youtube-lifecycle/service';
import {
  guardCollection,
  guardDelivery,
  guardWorkspace,
  user,
  verification,
  youtubeConnection,
  youtubeRevocation,
} from '@/config/db/schema';
import { decryptSecret, encryptSecret, isEncryptedSecret } from '@/lib/crypto';
import { YOUTUBE_READONLY_SCOPE } from '@/lib/youtube-connections/types';

import {
  disconnectYoutubeConnection,
  finishYoutubeAuthorization,
  listYoutubeConnections,
  ownedYoutubeConnection,
  readYoutubeAuthorizationState,
  startYoutubeAuthorization,
  validateYoutubeConnections,
  youtubeAccessToken,
} from './service';

const client = createClient({ url: ':memory:' }),
  database = drizzle(client);
const config = {
  clientId: 'fixture-client',
  clientSecret: 'fixture-only-not-a-real-secret',
};
const originalKey = process.env.CONFIG_ENCRYPTION_KEY,
  originalFetch = globalThis.fetch;
let refreshes = 0,
  failRefresh = false,
  failRevoke = false,
  failChannel = false,
  revocations = 0;
let refreshGate: (() => Promise<void>) | undefined;
let codeGate: (() => Promise<void>) | undefined;
before(async () => {
  process.env.CONFIG_ENCRYPTION_KEY = 'test-only-encryption-key-not-production';
  const { getTableConfig } = await import('drizzle-orm/sqlite-core');
  for (const table of [
    user,
    verification,
    youtubeConnection,
    youtubeRevocation,
    guardWorkspace,
    guardCollection,
    guardDelivery,
  ]) {
    const t = getTableConfig(table);
    await client.execute(
      `CREATE TABLE "${t.name}" (${t.columns.map((c) => `"${c.name}" ${c.getSQLType()}${c.primary ? ' PRIMARY KEY' : ''}`).join(',')})`
    );
  }
  await client.execute(
    'CREATE UNIQUE INDEX uq_owner_channel ON youtube_connection(user_id,channel_id)'
  );
  await database.insert(user).values([
    { id: 'alice', name: 'Alice', email: 'alice@example.invalid' },
    { id: 'bob', name: 'Bob', email: 'bob@example.invalid' },
  ]);
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url === 'https://oauth2.googleapis.com/revoke') {
      revocations++;
      return failRevoke
        ? Response.json({ error: 'server_error' }, { status: 503 })
        : new Response(null, { status: 200 });
    }
    if (url === 'https://oauth2.googleapis.com/token') {
      const grant = new URLSearchParams(String(init?.body));
      if (grant.get('grant_type') === 'refresh_token') {
        refreshes++;
        await refreshGate?.();
        if (failRefresh)
          return Response.json({ error: 'invalid_grant' }, { status: 400 });
        return Response.json({
          access_token: 'refreshed-fixture-token',
          expires_in: 3600,
          scope: YOUTUBE_READONLY_SCOPE,
        });
      }
      await codeGate?.();
      return Response.json({
        access_token: 'fixture-access',
        refresh_token: 'fixture-refresh',
        expires_in: 1,
        scope: YOUTUBE_READONLY_SCOPE,
      });
    }
    assert.ok(
      url.startsWith('https://www.googleapis.com/youtube/v3/channels?')
    );
    if (failChannel) return Response.json({ error: 'quota' }, { status: 403 });
    return Response.json({
      items: [{ id: 'UCfixture', snippet: { title: 'Fixture channel' } }],
    });
  }) as typeof fetch;
});
after(() => {
  client.close();
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.CONFIG_ENCRYPTION_KEY;
  else process.env.CONFIG_ENCRYPTION_KEY = originalKey;
});
test('state is bound to browser cookie, session, owner, callback origin and expiry', async () => {
  const start = await startYoutubeAuthorization(
    {
      userId: 'alice',
      sessionId: 'alice-session',
      redirectUri: 'http://localhost:3002/api/youtube-connections/callback',
      returnTo: '/zh/settings/collections',
    },
    config,
    database
  );
  assert.ok(isEncryptedSecret(start.cookie));
  const state = new URL(start.url).searchParams.get('state')!;
  const read = (
    cookie = start.cookie,
    id = 'alice',
    session = 'alice-session',
    origin = 'http://localhost:3002'
  ) => readYoutubeAuthorizationState(cookie, state, id, session, origin);
  await read();
  await assert.rejects(read(start.cookie, 'bob'));
  await assert.rejects(read(start.cookie, 'alice', 'different-session'));
  await assert.rejects(
    read(start.cookie, 'alice', 'alice-session', 'https://attacker.invalid')
  );
  await assert.rejects(read(start.cookie + 'broken'));
  const raw = JSON.parse((await decryptSecret(start.cookie))!);
  raw.expiresAt = 0;
  await assert.rejects(read(await encryptSecret(JSON.stringify(raw))));
});
test('real callback stores encrypted credentials, refreshes them, isolates owners and revokes/deletes a disconnected grant', async () => {
  const start = await startYoutubeAuthorization(
    {
      userId: 'alice',
      sessionId: 'session',
      redirectUri: 'http://localhost:3002/api/youtube-connections/callback',
      returnTo: '/settings/collections',
    },
    config,
    database
  );
  const state = await readYoutubeAuthorizationState(
    start.cookie,
    new URL(start.url).searchParams.get('state')!,
    'alice',
    'session',
    'http://localhost:3002'
  );
  assert.equal(
    await finishYoutubeAuthorization(state, 'fixture-code', config, database),
    '/settings/collections'
  );
  const [account] = await listYoutubeConnections('alice', database);
  assert.equal(account.channelTitle, 'Fixture channel');
  assert.ok(!('credentials' in account));
  const stored = await ownedYoutubeConnection('alice', account.id, database);
  assert.ok(isEncryptedSecret(stored.credentials!));
  assert.ok(!stored.credentials!.includes('fixture-refresh'));
  await assert.rejects(youtubeAccessToken('bob', account.id, config, database));
  assert.equal(refreshes, 0);
  assert.equal(
    await youtubeAccessToken('alice', account.id, config, database),
    'refreshed-fixture-token'
  );
  assert.equal(refreshes, 1);
  await assert.rejects(
    disconnectYoutubeConnection('bob', account.id, database)
  );
  await disconnectYoutubeConnection('alice', account.id, database);
  assert.equal((await listYoutubeConnections('alice', database)).length, 0);
  assert.equal(revocations, 1);
  await assert.rejects(
    youtubeAccessToken('alice', account.id, config, database)
  );
  await assert.rejects(
    finishYoutubeAuthorization(state, 'replayed-code', config, database)
  );
  const again = await connect();
  assert.notEqual(again.id, account.id);
  failRefresh = true;
  await assert.rejects(youtubeAccessToken('alice', again.id, config, database));
  assert.equal((await listYoutubeConnections('alice', database)).length, 0);
  failRefresh = false;
});

async function pending(userId = 'alice') {
  const started = await startYoutubeAuthorization(
    {
      userId,
      sessionId: 'session',
      redirectUri: 'http://localhost:3002/api/youtube-connections/callback',
      returnTo: '/settings/collections',
    },
    config,
    database
  );
  return readYoutubeAuthorizationState(
    started.cookie,
    new URL(started.url).searchParams.get('state')!,
    userId,
    'session',
    'http://localhost:3002'
  );
}
async function connect(userId = 'alice') {
  await finishYoutubeAuthorization(
    await pending(userId),
    'fixture-code',
    config,
    database
  );
  return (await listYoutubeConnections(userId, database))[0];
}
async function collection(id: string, connectionId?: string, userId = 'alice') {
  const now = new Date().toISOString();
  await database.insert(guardCollection).values({
    id,
    userId,
    document: JSON.stringify({
      connectionId,
      snapshots: [{ items: [{ title: 'Private title' }] }],
    }),
    summary: '{}',
    createdAt: now,
  });
  await database.insert(guardDelivery).values({
    id: id + '-mail',
    collectionId: id,
    userId,
    recipient: 'owner@example.invalid',
    payload: '{"private":"saved metadata"}',
    nextAttemptAt: now,
    createdAt: now,
  });
}
async function clean() {
  failRefresh = false;
  failRevoke = false;
  failChannel = false;
  refreshGate = undefined;
  codeGate = undefined;
  for (const table of [
    youtubeConnection,
    youtubeRevocation,
    verification,
    guardDelivery,
    guardCollection,
    guardWorkspace,
  ])
    await database.delete(table);
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

test('disconnect physically removes private snapshots/outbox including soft-deleted collections, preserving public and other owners', async () => {
  await clean();
  const account = await connect();
  await collection('private', account.id);
  await collection('deleted-private', account.id);
  await database
    .update(guardCollection)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(guardCollection.id, 'deleted-private'));
  await collection('public');
  await collection('bob-private', account.id, 'bob');
  await disconnectYoutubeConnection('alice', account.id, database);
  assert.deepEqual(
    (await database.select({ id: guardCollection.id }).from(guardCollection))
      .map((r) => r.id)
      .sort(),
    ['bob-private', 'public']
  );
  assert.equal((await database.select().from(guardDelivery)).length, 2);
  assert.equal((await database.select().from(youtubeRevocation)).length, 0);
});

test('Google revoke outage keeps only encrypted retry work and blocks reconnect until retry succeeds', async () => {
  await clean();
  const account = await connect();
  await collection('private-retry', account.id);
  failRevoke = true;
  await disconnectYoutubeConnection('alice', account.id, database);
  assert.equal((await database.select().from(guardCollection)).length, 0);
  const [queued] = await database.select().from(youtubeRevocation);
  assert.ok(isEncryptedSecret(queued.credentials));
  await assert.rejects(pending(), (e: any) => e.code === 'revocation_pending');
  failRevoke = false;
  const result = await drainYoutubeRevocations({
    database,
    ids: [queued.id],
    clock: () => Date.parse(queued.nextAttemptAt),
  });
  assert.equal(result.revoked, 1);
  await pending();
});

test('a callback already exchanging a code cannot recreate a connection after disconnect', async () => {
  await clean();
  const account = await connect();
  const state = await pending();
  const entered = deferred(),
    release = deferred();
  codeGate = async () => {
    entered.resolve();
    await release.promise;
  };
  const callback = finishYoutubeAuthorization(
    state,
    'inflight-code',
    config,
    database
  );
  await entered.promise;
  await disconnectYoutubeConnection('alice', account.id, database);
  release.resolve();
  await assert.rejects(callback, (e: any) => e.code === 'invalid_state');
  assert.equal((await listYoutubeConnections('alice', database)).length, 0);
  codeGate = undefined;
});

test('a refresh in progress cannot restore credentials after disconnect', async () => {
  await clean();
  const account = await connect();
  const entered = deferred(),
    release = deferred();
  refreshGate = async () => {
    entered.resolve();
    await release.promise;
  };
  const refresh = youtubeAccessToken('alice', account.id, config, database);
  await entered.promise;
  await disconnectYoutubeConnection('alice', account.id, database);
  release.resolve();
  await assert.rejects(refresh);
  assert.equal((await listYoutubeConnections('alice', database)).length, 0);
  refreshGate = undefined;
});

test('invalid_grant removes connection and authorized snapshots without deleting public collections', async () => {
  await clean();
  const account = await connect();
  await collection('bad-private', account.id);
  await collection('public-kept');
  failRefresh = true;
  await assert.rejects(
    youtubeAccessToken('alice', account.id, config, database)
  );
  assert.deepEqual(
    (
      await database.select({ id: guardCollection.id }).from(guardCollection)
    ).map((r) => r.id),
    ['public-kept']
  );
  assert.equal((await listYoutubeConnections('alice', database)).length, 0);
});

test('old failed refresh cannot delete a grant replaced by a completed reconnect', async () => {
  await clean();
  const account = await connect();
  const entered = deferred(),
    release = deferred();
  refreshGate = async () => {
    entered.resolve();
    await release.promise;
  };
  const refresh = youtubeAccessToken('alice', account.id, config, database);
  await entered.promise;
  await connect();
  failRefresh = true;
  release.resolve();
  await assert.rejects(refresh);
  assert.equal((await listYoutubeConnections('alice', database)).length, 1);
  refreshGate = undefined;
});

test('account deletion removes public/private data and fences new or pending callbacks while preserving revoke retry', async () => {
  await clean();
  const account = await connect();
  const state = await pending();
  await collection('all-private', account.id);
  await collection('all-public');
  await database.insert(guardWorkspace).values({ userId: 'alice' });
  const removed = await removeUserYoutubeData('alice', { database });
  assert.equal(removed.queuedIds.length, 1);
  assert.equal((await database.select().from(guardCollection)).length, 0);
  assert.equal((await database.select().from(guardDelivery)).length, 0);
  assert.equal((await database.select().from(guardWorkspace)).length, 0);
  assert.equal(
    (await database.select().from(youtubeRevocation))[0].userId,
    null
  );
  await assert.rejects(pending());
  await assert.rejects(
    finishYoutubeAuthorization(state, 'stale-code', config, database)
  );
  failRevoke = true;
  assert.equal(
    (await drainYoutubeRevocations({ database, ids: removed.queuedIds }))
      .retrying,
    1
  );
});

test('independent validation refreshes channel data without a plan and defers transient failures without extending verifiedAt', async () => {
  await clean();
  const account = await connect();
  const now = Date.now();
  const old = new Date(now - 2 * 86_400_000).toISOString();
  await database
    .update(youtubeConnection)
    .set({ channelTitle: 'Old title', verifiedAt: old, nextValidationAt: null })
    .where(eq(youtubeConnection.id, account.id));
  failChannel = true;
  assert.equal(
    (await validateYoutubeConnections(config, { database, clock: () => now }))
      .deferred,
    1
  );
  let row = await ownedYoutubeConnection('alice', account.id, database);
  assert.equal(row.verifiedAt, old);
  failChannel = false;
  assert.equal(
    (
      await validateYoutubeConnections(config, {
        database,
        clock: () => now + 3_600_001,
      })
    ).verified,
    1
  );
  row = await ownedYoutubeConnection('alice', account.id, database);
  assert.equal(row.channelTitle, 'Fixture channel');
  assert.equal(row.verifiedAt, new Date(now + 3_600_001).toISOString());
});

test('30-day expiry purges data even with unavailable config and a future validation time', async () => {
  await clean();
  const account = await connect();
  await collection('expired-private', account.id);
  const now = Date.now();
  await database
    .update(youtubeConnection)
    .set({
      verifiedAt: new Date(now - 30 * 86_400_000).toISOString(),
      nextValidationAt: new Date(now + 86_400_000).toISOString(),
    })
    .where(eq(youtubeConnection.id, account.id));
  assert.equal(
    (await validateYoutubeConnections(null, { database, clock: () => now }))
      .removed,
    1
  );
  assert.equal((await database.select().from(guardCollection)).length, 0);
  assert.equal((await listYoutubeConnections('alice', database)).length, 0);
});

test('encrypted revoke work expires after seven days even if Google remains unavailable', async () => {
  await clean();
  const account = await connect();
  failRevoke = true;
  await disconnectYoutubeConnection('alice', account.id, database);
  const [queued] = await database.select().from(youtubeRevocation);
  const stats = await drainYoutubeRevocations({
    database,
    clock: () => Date.parse(queued.createdAt) + 7 * 86_400_000,
  });
  assert.equal(stats.expired, 1);
  assert.equal((await database.select().from(youtubeRevocation)).length, 0);
});

test('overlapping revocation workers send once and targeted draining ignores unrelated backlog', async () => {
  await clean();
  const alice = await connect();
  const bob = await connect('bob');
  const first = await removeYoutubeConnectionData('alice', alice.id, {
    database,
  });
  const second = await removeYoutubeConnectionData('bob', bob.id, { database });
  const entered = deferred(),
    release = deferred();
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    entered.resolve();
    await release.promise;
    return new Response(null, { status: 200 });
  }) as typeof fetch;
  const drain = drainYoutubeRevocations({
    database,
    ids: second.queuedIds,
    fetcher,
  });
  await entered.promise;
  const competing = await drainYoutubeRevocations({
    database,
    ids: second.queuedIds,
    fetcher,
  });
  assert.equal(competing.attempted, 0);
  release.resolve();
  assert.equal((await drain).revoked, 1);
  assert.equal(calls, 1);
  assert.deepEqual(
    (
      await database
        .select({ id: youtubeRevocation.id })
        .from(youtubeRevocation)
    ).map((row) => row.id),
    first.queuedIds
  );
});

test('connection listing never returns stale channel metadata when maintenance has not run', async () => {
  await clean();
  const account = await connect();
  await collection('read-expired-private', account.id);
  const now = Date.now();
  await database
    .update(youtubeConnection)
    .set({ verifiedAt: new Date(now - 30 * 86_400_000).toISOString() })
    .where(eq(youtubeConnection.id, account.id));
  assert.deepEqual(
    await listYoutubeConnections('alice', database, () => now),
    []
  );
  assert.equal((await database.select().from(guardCollection)).length, 0);
  assert.equal((await database.select().from(guardDelivery)).length, 0);
});

test('overlapping validators with the same timestamp claim an account once', async () => {
  await clean();
  const account = await connect();
  await database
    .update(youtubeConnection)
    .set({ nextValidationAt: null })
    .where(eq(youtubeConnection.id, account.id));
  const now = Date.now(),
    entered = deferred(),
    release = deferred();
  const previousRefreshes = refreshes;
  refreshGate = async () => {
    entered.resolve();
    await release.promise;
  };
  const first = validateYoutubeConnections(config, {
    database,
    clock: () => now,
  });
  await entered.promise;
  const second = await validateYoutubeConnections(config, {
    database,
    clock: () => now,
  });
  assert.equal(second.checked, 0);
  release.resolve();
  assert.equal((await first).verified, 1);
  assert.equal(refreshes, previousRefreshes + 1);
  refreshGate = undefined;
});

test('targeted draining erases every overdue token regardless of backlog, future retry times, leases or limit', async () => {
  await clean();
  const now = Date.now();
  const old = new Date(now - 7 * 86_400_000).toISOString();
  const future = new Date(now + 86_400_000).toISOString();
  const credentials = await encryptSecret(
    JSON.stringify({ refreshToken: 'overdue-fixture-token' })
  );
  await database.insert(youtubeRevocation).values(
    Array.from({ length: 8 }, (_, i) => ({
      id: `overdue-${i}`,
      userId: 'alice',
      connectionId: `removed-${i}`,
      credentials,
      createdAt: old,
      nextAttemptAt: future,
      leaseToken: 'another-worker',
      leaseExpiresAt: future,
    }))
  );
  // A recovery row must remain so its deleted connection's metadata can still be removed.
  await collection('recover-overdue', 'removed-0');
  await database.insert(youtubeRevocation).values({
    id: 'fresh-target',
    userId: null,
    connectionId: 'fresh',
    credentials,
    createdAt: new Date(now).toISOString(),
    nextAttemptAt: new Date(now).toISOString(),
  });
  let requests = 0;
  const result = await drainYoutubeRevocations({
    database,
    ids: ['fresh-target'],
    limit: 1,
    clock: () => now,
    fetcher: (async () => {
      requests++;
      return new Response(null, { status: 200 });
    }) as typeof fetch,
  });
  assert.equal(result.attempted, 1);
  assert.equal(requests, 1);
  const pending = await database.select().from(youtubeRevocation);
  assert.equal(pending.length, 8);
  assert.ok(pending.every((row) => row.credentials === ''));
  assert.equal((await database.select().from(guardCollection)).length, 1);
  await database
    .update(youtubeRevocation)
    .set({
      nextAttemptAt: new Date(now).toISOString(),
      leaseToken: null,
      leaseExpiresAt: null,
    })
    .where(eq(youtubeRevocation.id, 'overdue-0'));
  const recovered = await drainYoutubeRevocations({
    database,
    ids: ['overdue-0'],
    clock: () => now,
    fetcher: (async () => {
      throw new Error('Expired token must never be sent');
    }) as typeof fetch,
  });
  assert.equal(recovered.attempted, 0);
  assert.equal(recovered.expired, 1);
  assert.equal((await database.select().from(guardCollection)).length, 0);
  assert.equal((await database.select().from(guardDelivery)).length, 0);
});

test('targeted account revocation attempts every grant with concurrency at most three', async () => {
  await clean();
  const now = new Date().toISOString();
  const credentials = await encryptSecret(
    JSON.stringify({ refreshToken: 'multi-grant-fixture' })
  );
  const ids = Array.from({ length: 8 }, (_, i) => `target-${i}`);
  await database.insert(youtubeRevocation).values(
    ids.map((id) => ({
      id,
      userId: null,
      connectionId: id,
      credentials,
      createdAt: now,
      nextAttemptAt: now,
    }))
  );
  let active = 0,
    maximum = 0,
    attempts = 0;
  const result = await drainYoutubeRevocations({
    database,
    ids,
    limit: 1,
    fetcher: (async () => {
      active++;
      attempts++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return Response.json({ error: 'server_error' }, { status: 503 });
    }) as typeof fetch,
  });
  assert.equal(attempts, 8);
  assert.equal(result.attempted, 8);
  assert.equal(result.retrying, 8);
  assert.ok(maximum <= 3);
  assert.ok(
    (await database.select().from(youtubeRevocation)).every(
      (row) => row.attempts === 1
    )
  );
});

test('disconnect cleans multiple summary pages and legacy large documents without skipping rows after deletion', async () => {
  await clean();
  const account = await connect();
  const now = new Date().toISOString();
  const rows = Array.from({ length: 120 }, (_, index) => {
    const id = `history-${String(index).padStart(3, '0')}`;
    const connectionId =
      index % 3 === 0
        ? account.id
        : index % 3 === 1
          ? undefined
          : 'different-connection';
    const source = connectionId ? 'private_playlist' : 'playlist';
    return {
      id,
      userId: 'alice',
      createdAt: now,
      // Include both valid summaries and legacy summaries requiring one-at-a-time fallback.
      summary: index % 2 ? '{}' : JSON.stringify({ source, connectionId }),
      document: JSON.stringify({
        source,
        connectionId,
        snapshots: [
          {
            items: [],
            padding: index === 0 || index === 3 ? 'x'.repeat(1_300_000) : '',
          },
        ],
      }),
      deletedAt: index % 5 === 0 ? now : null,
    };
  });
  await database.insert(guardCollection).values(rows);
  await database.insert(guardDelivery).values(
    rows.map((row) => ({
      id: `${row.id}-mail`,
      collectionId: row.id,
      userId: 'alice',
      recipient: 'owner@example.invalid',
      payload: '{}',
      nextAttemptAt: now,
      createdAt: now,
    }))
  );
  await disconnectYoutubeConnection('alice', account.id, database);
  const remaining = await database
    .select({ id: guardCollection.id })
    .from(guardCollection);
  assert.equal(remaining.length, 80);
  assert.ok(remaining.every((row) => Number(row.id.slice(-3)) % 3 !== 0));
  assert.equal(
    (await database.select({ id: guardDelivery.id }).from(guardDelivery))
      .length,
    80
  );
});
