import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import { user, youtubeConnection } from '@/config/db/schema';
import { decryptSecret, encryptSecret, isEncryptedSecret } from '@/lib/crypto';
import { YOUTUBE_READONLY_SCOPE } from '@/lib/youtube-connections/types';

import {
  disconnectYoutubeConnection,
  finishYoutubeAuthorization,
  listYoutubeConnections,
  ownedYoutubeConnection,
  readYoutubeAuthorizationState,
  startYoutubeAuthorization,
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
  failRefresh = false;
before(async () => {
  process.env.CONFIG_ENCRYPTION_KEY = 'test-only-encryption-key-not-production';
  const { getTableConfig } = await import('drizzle-orm/sqlite-core');
  for (const table of [user, youtubeConnection]) {
    const t = getTableConfig(table);
    await client.execute(
      `CREATE TABLE "${t.name}" (${t.columns.map((c) => `"${c.name}" ${c.getSQLType()}${c.primary ? ' PRIMARY KEY' : ''}`).join(',')})`
    );
  }
  await client.execute(
    'CREATE UNIQUE INDEX uq_owner_channel ON youtube_connection(user_id,channel_id)'
  );
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url === 'https://oauth2.googleapis.com/token') {
      const grant = new URLSearchParams(String(init?.body));
      if (grant.get('grant_type') === 'refresh_token') {
        refreshes++;
        if (failRefresh)
          return Response.json({ error: 'invalid_grant' }, { status: 400 });
        return Response.json({
          access_token: 'refreshed-fixture-token',
          expires_in: 3600,
          scope: YOUTUBE_READONLY_SCOPE,
        });
      }
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
    config
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
test('real callback logic stores encrypted credentials, refreshes them, isolates owners and disconnects locally', async () => {
  const start = await startYoutubeAuthorization(
    {
      userId: 'alice',
      sessionId: 'session',
      redirectUri: 'http://localhost:3002/api/youtube-connections/callback',
      returnTo: '/settings/collections',
    },
    config
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
  const disconnected = await ownedYoutubeConnection(
    'alice',
    account.id,
    database
  );
  assert.equal(disconnected.credentials, null);
  assert.equal(disconnected.status, 'disconnected');
  await assert.rejects(
    youtubeAccessToken('alice', account.id, config, database)
  );
  await finishYoutubeAuthorization(state, 'fixture-code-two', config, database);
  assert.equal(
    (await listYoutubeConnections('alice', database))[0].id,
    account.id
  );
  failRefresh = true;
  await assert.rejects(
    youtubeAccessToken('alice', account.id, config, database)
  );
  const expired = await ownedYoutubeConnection('alice', account.id, database);
  assert.equal(expired.status, 'reconnect');
  assert.equal(expired.credentials, null);
});
