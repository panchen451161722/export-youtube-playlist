import assert from 'node:assert/strict';
import { test } from 'node:test';

import { authorizationUrl, googleTokens } from './google';
import { scanAuthorizedYoutube } from './scan';
import { YOUTUBE_READONLY_SCOPE } from './types';

const video = (id: string, categoryId = '10') => ({
  id,
  snippet: { title: id, channelTitle: 'Fixture', categoryId },
  contentDetails: { duration: 'PT1M20S' },
});
test('OAuth asks only for read-only offline access with state and PKCE; token errors do not expose upstream details', async () => {
  const url = new URL(
    authorizationUrl(
      { clientId: 'fixture', clientSecret: 'fixture-not-a-secret' },
      'http://localhost/callback',
      'state',
      'challenge'
    )
  );
  assert.equal(url.searchParams.get('scope'), YOUTUBE_READONLY_SCOPE);
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('state'), 'state');
  const fetcher = (async () =>
    Response.json(
      {
        error: 'invalid_grant',
        error_description: 'sensitive upstream diagnostic',
      },
      { status: 400 }
    )) as typeof fetch;
  await assert.rejects(
    googleTokens(
      { clientId: 'fixture', clientSecret: 'fixture-not-a-secret' },
      { grant_type: 'refresh_token' },
      fetcher
    ),
    (e) =>
      e instanceof Error &&
      !e.message.includes('sensitive') &&
      e.message.includes('Reconnect')
  );
});
test('liked videos and music traverse every page; music uses category 10 explicitly', async () => {
  const calls: string[] = [];
  const fetcher = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push(url.toString());
    assert.equal(
      new Headers(init?.headers).get('authorization'),
      'Bearer fixture-token'
    );
    assert.equal(url.searchParams.get('myRating'), 'like');
    return Response.json(
      url.searchParams.has('pageToken')
        ? { items: [video('music-two')] }
        : {
            items: [video('music-one'), video('other', '22')],
            nextPageToken: 'page2',
          }
    );
  }) as typeof fetch;
  const music = await scanAuthorizedYoutube(
    { source: 'liked_music', url: '' },
    'fixture-token',
    fetcher
  );
  assert.deepEqual(
    music.items.map((v) => v.id),
    ['music-one', 'music-two']
  );
  assert.equal(music.complete, true);
  assert.equal(calls.length, 2);
  const likes = await scanAuthorizedYoutube(
    { source: 'liked_videos', url: '' },
    'fixture-token',
    fetcher
  );
  assert.equal(likes.items.length, 3);
});
test('private playlist reads authenticated metadata and subscriptions store channel URLs', async () => {
  const fetcher = (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/playlistItems'))
      return Response.json({
        items: [
          { contentDetails: { videoId: 'present' } },
          { contentDetails: { videoId: 'missing' } },
        ],
      });
    if (url.pathname.endsWith('/videos'))
      return Response.json({ items: [video('present')] });
    assert.equal(url.searchParams.get('mine'), 'true');
    return Response.json({
      items: [
        {
          snippet: {
            title: 'A channel',
            resourceId: { channelId: 'UCfixture' },
          },
        },
      ],
    });
  }) as typeof fetch;
  const list = await scanAuthorizedYoutube(
    {
      source: 'private_playlist',
      url: 'https://www.youtube.com/playlist?list=PLfixture',
    },
    'fixture',
    fetcher
  );
  assert.deepEqual(
    list.items.map((v) => v.id),
    ['present']
  );
  assert.equal(list.items[0].duration, '1:20');
  const subs = await scanAuthorizedYoutube(
    { source: 'subscriptions', url: '' },
    'fixture',
    fetcher
  );
  assert.equal(subs.items[0].kind, 'channel');
  assert.equal(subs.items[0].url, 'https://www.youtube.com/channel/UCfixture');
});
test('failed/invalid/over-limit reads never become successful empty snapshots', async () => {
  const source = { source: 'liked_music' as const, url: '' };
  await assert.rejects(
    scanAuthorizedYoutube(source, 'fixture', (async () =>
      Response.json({ error: {} }, { status: 403 })) as typeof fetch)
  );
  await assert.rejects(
    scanAuthorizedYoutube(source, 'fixture', (async () =>
      Response.json({})) as typeof fetch)
  );
  const large = await scanAuthorizedYoutube(source, 'fixture', (async () =>
    Response.json({
      items: Array.from({ length: 501 }, (_, i) => video(String(i), '22')),
    })) as typeof fetch);
  assert.equal(large.complete, false);
  const repeated = (async () =>
    Response.json({
      items: [video('same')],
      nextPageToken: 'repeat',
    })) as typeof fetch;
  await assert.rejects(scanAuthorizedYoutube(source, 'fixture', repeated));
});
