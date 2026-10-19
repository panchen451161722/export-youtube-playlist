import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  FREE_PLAYLIST_EXPORT_LIMIT,
  SUBSCRIBER_PLAYLIST_EXPORT_LIMIT,
} from '@/config/playlist-export';
import { PlaylistServiceError } from '@/modules/youtube-playlist/service';

import { createPlaylistExportHandlers } from './-youtube-playlist';

const endpoint = 'https://example.invalid/api/youtube-playlist';
const playlistUrl = 'https://www.youtube.com/playlist?list=PLfixture12345';
const free = { subscribed: false, limit: FREE_PLAYLIST_EXPORT_LIMIT };
const subscribed = {
  subscribed: true,
  limit: SUBSCRIBER_PLAYLIST_EXPORT_LIMIT,
};
let requestNumber = 0;
function request(
  method: 'GET' | 'POST',
  body?: BodyInit,
  headers?: HeadersInit
) {
  const requestHeaders = new Headers(headers);
  // Distinct test requests must not share the production minimum-interval bucket.
  if (!requestHeaders.has('x-forwarded-for'))
    requestHeaders.set('x-forwarded-for', `192.0.2.${++requestNumber}`);
  if (!requestHeaders.has('content-type'))
    requestHeaders.set('content-type', 'application/json');
  return new Request(endpoint, { method, body, headers: requestHeaders });
}
function result(limit: number) {
  return {
    playlistId: 'PLfixture12345',
    title: 'Fixture playlist',
    channelTitle: 'Fixture channel',
    thumbnailUrl: '',
    videos: [],
    returnedItems: 0,
    totalItems: 0,
    scannedCount: 0,
    skippedCount: 0,
    truncated: false,
    limit,
  };
}
const fail = async (): Promise<never> => {
  assert.fail('This dependency must not be called');
};

test('anonymous GET and POST retain free exports without initializing auth or querying subscriptions', async () => {
  const calls: unknown[] = [];
  const handlers = createPlaylistExportHandlers({
    getSession: fail,
    getAccess: fail,
    loadPlaylist: async (input) => {
      calls.push(input);
      return result(input.maxItems!);
    },
  });
  for (const cookie of ['', 'PARAGLIDE_LOCALE=zh; analytics=fixture']) {
    const getResponse = await handlers.GET({
      request: request('GET', undefined, { cookie }),
    });
    assert.equal(getResponse.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await getResponse.json(), {
      code: 0,
      message: 'ok',
      data: free,
    });

    const postResponse = await handlers.POST({
      request: request('POST', JSON.stringify({ url: playlistUrl }), {
        cookie,
      }),
    });
    assert.equal(postResponse.status, 200);
    assert.equal(postResponse.headers.get('cache-control'), 'no-store');
    assert.equal(
      (await postResponse.json()).data.limit,
      FREE_PLAYLIST_EXPORT_LIMIT
    );
  }
  assert.deepEqual(
    calls,
    Array(2).fill({ playlistUrl, maxItems: FREE_PLAYLIST_EXPORT_LIMIT })
  );
});

test('an unverified session cookie never grants subscription access', async () => {
  let sessionCalls = 0;
  const handlers = createPlaylistExportHandlers({
    getSession: async () => {
      sessionCalls++;
      return null;
    },
    getAccess: fail,
    loadPlaylist: async (input) => result(input.maxItems!),
  });
  const headers = { cookie: 'better-auth.session_token=forged' };
  const getResponse = await handlers.GET({
    request: request('GET', undefined, headers),
  });
  assert.deepEqual((await getResponse.json()).data, free);
  const postResponse = await handlers.POST({
    request: request(
      'POST',
      JSON.stringify({ url: playlistUrl, subscribed: true }),
      headers
    ),
  });
  assert.equal(
    (await postResponse.json()).data.limit,
    FREE_PLAYLIST_EXPORT_LIMIT
  );
  assert.equal(sessionCalls, 2);
});

test('only the validated session identity and server entitlement determine the export limit', async () => {
  for (const access of [free, subscribed]) {
    const owners: string[] = [];
    const loads: unknown[] = [];
    const handlers = createPlaylistExportHandlers({
      getSession: async () => ({ user: { id: 'verified-owner' } }),
      getAccess: async (userId) => {
        owners.push(userId);
        return access;
      },
      loadPlaylist: async (input) => {
        loads.push(input);
        return result(input.maxItems!);
      },
    });
    const headers = { cookie: '__Secure-better-auth.session_token=fixture' };
    const getResponse = await handlers.GET({
      request: request('GET', undefined, headers),
    });
    assert.equal(getResponse.headers.get('cache-control'), 'no-store');
    assert.deepEqual((await getResponse.json()).data, access);
    const postResponse = await handlers.POST({
      request: request(
        'POST',
        JSON.stringify({
          playlistUrl,
          userId: 'other-subscriber',
          subscribed: true,
          plan: 'ultra',
          limit: 999999,
          maxItems: 999999,
        }),
        headers
      ),
    });
    assert.equal(postResponse.headers.get('cache-control'), 'no-store');
    assert.equal((await postResponse.json()).data.limit, access.limit);
    assert.deepEqual(owners, ['verified-owner', 'verified-owner']);
    assert.deepEqual(loads, [{ playlistUrl, maxItems: access.limit }]);
  }
});

test('authentication and entitlement failures stop before expensive playlist requests and hide internal errors', async (t) => {
  t.mock.method(console, 'error', () => {});
  for (const failure of ['session', 'access']) {
    const handlers = createPlaylistExportHandlers({
      getSession: async () => {
        if (failure === 'session') throw new Error('private-auth-detail');
        return { user: { id: 'verified-owner' } };
      },
      getAccess: async () => {
        throw new Error('private-database-detail');
      },
      loadPlaylist: fail,
    });
    const headers = { cookie: 'better-auth.session_token=fixture' };
    const getResponse = await handlers.GET({
      request: request('GET', undefined, headers),
    });
    assert.equal(getResponse.status, 503);
    assert.equal(getResponse.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(await getResponse.text(), /private-/);
    const postResponse = await handlers.POST({
      request: request('POST', JSON.stringify({ url: playlistUrl }), headers),
    });
    assert.equal(postResponse.status, 500);
    assert.equal(postResponse.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(await postResponse.text(), /private-/);
  }
});

test('invalid, missing and oversized bodies fail before auth and upstream work', async () => {
  const handlers = createPlaylistExportHandlers({
    getSession: fail,
    getAccess: fail,
    loadPlaylist: fail,
  });
  const cases: Array<[BodyInit | undefined, HeadersInit, number]> = [
    [undefined, {}, 400],
    ['{invalid', {}, 400],
    ['null', {}, 400],
    ['[]', {}, 400],
    ['{}', {}, 400],
    [JSON.stringify({ url: 123 }), {}, 400],
    [JSON.stringify({ url: '   ' }), {}, 400],
    [
      JSON.stringify({ url: playlistUrl }),
      { 'content-type': 'text/plain' },
      415,
    ],
    [JSON.stringify({ url: playlistUrl }), { 'content-length': '4097' }, 413],
    [JSON.stringify({ url: playlistUrl, padding: 'x'.repeat(4096) }), {}, 413],
  ];
  for (const [body, headers, status] of cases) {
    const response = await handlers.POST({
      request: request('POST', body, headers),
    });
    assert.equal(response.status, status);
    assert.equal((await response.json()).code, -1);
  }
});

test('upstream errors retain their public error code and responses are not cached', async () => {
  const handlers = createPlaylistExportHandlers({
    getSession: fail,
    getAccess: fail,
    loadPlaylist: async () => {
      throw new PlaylistServiceError('quota');
    },
  });
  const response = await handlers.POST({
    request: request('POST', JSON.stringify({ url: playlistUrl })),
  });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('x-playlist-error'), 'quota');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('minimum interval rate limiting prevents repeated playlist work', async () => {
  let calls = 0;
  const handlers = createPlaylistExportHandlers({
    getSession: fail,
    getAccess: fail,
    loadPlaylist: async (input) => {
      calls++;
      return result(input.maxItems!);
    },
  });
  const headers = { 'x-forwarded-for': '198.51.100.100' };
  const first = await handlers.POST({
    request: request('POST', JSON.stringify({ url: playlistUrl }), headers),
  });
  const second = await handlers.POST({
    request: request('POST', JSON.stringify({ url: playlistUrl }), headers),
  });
  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.equal(second.headers.get('cache-control'), 'no-store');
  assert.ok(Number(second.headers.get('retry-after')) > 0);
  assert.equal(calls, 1);
});

test('IP limits ignore arbitrary cookies and prefer trusted proxy headers before forwarded-for', async () => {
  let calls = 0;
  const handlers = createPlaylistExportHandlers({
    getSession: fail,
    getAccess: fail,
    loadPlaylist: async (input) => {
      calls++;
      return result(input.maxItems!);
    },
  });
  const sources: Array<[HeadersInit, HeadersInit]> = [
    [
      { 'cf-connecting-ip': '203.0.113.1', 'x-real-ip': '192.0.2.1' },
      { 'cf-connecting-ip': '203.0.113.1', 'x-real-ip': '192.0.2.2' },
    ],
    [{ 'x-real-ip': '203.0.113.2' }, { 'x-real-ip': '203.0.113.2' }],
    [
      { 'x-forwarded-for': '203.0.113.3, 192.0.2.1' },
      { 'x-forwarded-for': '203.0.113.3, 192.0.2.2' },
    ],
  ];
  for (const [firstSource, secondSource] of sources) {
    const firstHeaders = new Headers(firstSource);
    firstHeaders.set('cookie', 'analytics=first');
    const secondHeaders = new Headers(secondSource);
    secondHeaders.set('cookie', 'analytics=changed; arbitrary=bypass-attempt');
    const first = await handlers.POST({
      request: request(
        'POST',
        JSON.stringify({ url: playlistUrl }),
        firstHeaders
      ),
    });
    const second = await handlers.POST({
      request: request(
        'POST',
        JSON.stringify({ url: playlistUrl }),
        secondHeaders
      ),
    });
    assert.equal(first.status, 200);
    assert.equal(second.status, 429);
    assert.equal(second.headers.get('cache-control'), 'no-store');
  }
  assert.equal(calls, sources.length);
});

test('subscriber limits use the verified account even when cookies and source IPs change', async () => {
  let sessionCalls = 0;
  let upstreamCalls = 0;
  const owners: string[] = [];
  const handlers = createPlaylistExportHandlers({
    getSession: async () => {
      sessionCalls++;
      return { user: { id: 'same-rate-limited-subscriber' } };
    },
    getAccess: async (userId) => {
      owners.push(userId);
      return subscribed;
    },
    loadPlaylist: async (input) => {
      upstreamCalls++;
      return result(input.maxItems!);
    },
  });
  const first = await handlers.POST({
    request: request('POST', JSON.stringify({ url: playlistUrl }), {
      cookie: 'better-auth.session_token=fixture',
      'cf-connecting-ip': '203.0.113.10',
    }),
  });
  const second = await handlers.POST({
    request: request(
      'POST',
      JSON.stringify({ url: playlistUrl, userId: 'another-user' }),
      {
        cookie: 'better-auth.session_token=other-session; arbitrary=changed',
        'cf-connecting-ip': '203.0.113.11',
      }
    ),
  });
  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.equal(second.headers.get('cache-control'), 'no-store');
  assert.ok(Number(second.headers.get('retry-after')) > 0);
  assert.deepEqual(owners, [
    'same-rate-limited-subscriber',
    'same-rate-limited-subscriber',
  ]);
  assert.equal(sessionCalls, 2);
  assert.equal(upstreamCalls, 1);
});
