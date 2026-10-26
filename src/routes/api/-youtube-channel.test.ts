import assert from 'node:assert/strict';
import test from 'node:test';

import { getChannelToolData } from '@/modules/youtube-public/service';

import { createChannelToolHandlers } from './-youtube-channel';

const free = { subscribed: false, limit: 500 };
const paid = { subscribed: true, limit: 5000 };
let requestId = 0;
function request(body: object, cookie = '') {
  return new Request('https://example.invalid/api/youtube-channel', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `192.0.2.${++requestId}`,
      cookie,
    },
    body: JSON.stringify({
      url: 'https://youtube.com/@fixture',
      includeVideos: true,
      ...body,
    }),
  });
}
const fail = async (): Promise<never> => {
  assert.fail('Unexpected dependency call');
};
const fixture = (limit: number) =>
  ({
    returnedVideos: limit,
    totalVideos: 2061,
    truncated: limit < 2061,
  }) as Awaited<ReturnType<typeof getChannelToolData>>;

test('anonymous channel exports default to 500 and cannot override the server cap', async () => {
  const limits: number[] = [];
  const handlers = createChannelToolHandlers({
    getSession: fail,
    getAccess: fail,
    loadChannel: async ({ limit }) => {
      limits.push(limit!);
      return fixture(limit!);
    },
  });
  for (const body of [
    {},
    { limit: 5000, subscribed: true, userId: 'paid-user' },
    { limit: 100 },
  ]) {
    const response = await handlers.POST({ request: request(body) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const data = (await response.json()).data;
    assert.deepEqual(data.exportAccess, free);
    assert.equal(data.truncated, true);
  }
  assert.deepEqual(limits, [500, 500, 100]);
});

test('forged cookies and unsubscribed accounts stay at 500; validated subscribers get 5000', async () => {
  for (const session of [null, { user: { id: 'verified' } }]) {
    for (const access of [free, paid]) {
      const handlers = createChannelToolHandlers({
        getSession: async () => session,
        getAccess: async (id) => {
          assert.equal(id, 'verified');
          return access;
        },
        loadChannel: async ({ limit }) => fixture(limit!),
      });
      const response = await handlers.POST({
        request: request(
          { limit: 99999 },
          'better-auth.session_token=untrusted'
        ),
      });
      const data = (await response.json()).data;
      assert.equal(data.returnedVideos, session ? access.limit : 500);
      assert.deepEqual(data.exportAccess, session ? access : free);
    }
  }
});

test('subscriber default is 5000, without needing a client limit', async () => {
  const handlers = createChannelToolHandlers({
    getSession: async () => ({ user: { id: 'verified' } }),
    getAccess: async () => paid,
    loadChannel: async ({ limit }) => {
      assert.equal(limit, 5000);
      return fixture(limit!);
    },
  });
  assert.equal(
    (
      await handlers.POST({
        request: request({}, 'better-auth.session_token=verified'),
      })
    ).status,
    200
  );
});

test('subscription lookup failures never grant access or start a channel scan', async () => {
  const handlers = createChannelToolHandlers({
    getSession: async () => ({ user: { id: 'verified' } }),
    getAccess: async () => {
      throw new Error('database unavailable');
    },
    loadChannel: fail,
  });
  assert.equal(
    (
      await handlers.POST({
        request: request({}, 'better-auth.session_token=verified'),
      })
    ).status,
    500
  );
});

test('profile-only tools do not need auth or subscription lookup', async () => {
  const handlers = createChannelToolHandlers({
    getSession: fail,
    getAccess: fail,
    loadChannel: async ({ includeVideos }) => {
      assert.equal(includeVideos, false);
      return fixture(0);
    },
  });
  assert.equal(
    (
      await handlers.POST({
        request: request(
          { includeVideos: false },
          'better-auth.session_token=untrusted'
        ),
      })
    ).status,
    200
  );
});

test('a 2061-upload channel stops at 500 for free users even after a subscriber warms the cache', async () => {
  let pages = 0;
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/channels')) {
      return Response.json({
        items: [
          {
            id: 'UC_channel_limit_fixture',
            snippet: { title: 'Large channel' },
            contentDetails: {
              relatedPlaylists: { uploads: 'UU_limit_fixture' },
            },
            statistics: { videoCount: '2061' },
          },
        ],
      });
    }
    if (url.pathname.endsWith('/playlistItems')) {
      pages++;
      const start = Number(url.searchParams.get('pageToken') ?? 0);
      const end = Math.min(start + 50, 2061);
      return Response.json({
        pageInfo: { totalResults: 2061 },
        nextPageToken: end < 2061 ? String(end) : undefined,
        items: Array.from({ length: end - start }, (_, i) => ({
          contentDetails: { videoId: `video-${start + i}` },
        })),
      });
    }
    assert.ok(url.pathname.endsWith('/videos'));
    return Response.json({
      items: url.searchParams
        .get('id')!
        .split(',')
        .map((id) => ({
          id,
          snippet: { title: id },
          contentDetails: { duration: 'PT1M' },
        })),
    });
  };
  for (const access of [paid, free]) {
    pages = 0;
    const handlers = createChannelToolHandlers({
      getSession: async () => ({ user: { id: 'verified' } }),
      getAccess: async () => access,
      loadChannel: (params) =>
        getChannelToolData({ ...params, apiKey: 'fixture-key', fetchImpl }),
    });
    const response = await handlers.POST({
      request: request({}, 'better-auth.session_token=verified'),
    });
    const data = (await response.json()).data;
    assert.equal(data.totalVideos, 2061);
    assert.equal(data.videos.length, access.subscribed ? 2061 : 500);
    assert.equal(data.truncated, !access.subscribed);
    assert.equal(pages, access.subscribed ? 42 : 10);
  }
});
