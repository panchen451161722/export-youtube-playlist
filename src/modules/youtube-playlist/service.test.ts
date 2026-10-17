import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FREE_PLAYLIST_EXPORT_LIMIT,
  SUBSCRIBER_PLAYLIST_EXPORT_LIMIT,
} from '@/config/playlist-export';

import {
  extractDescriptionMetadata,
  getPlaylistExport,
  parseYouTubeDuration,
} from './service';

test('parseYouTubeDuration returns all export representations', () => {
  assert.deepEqual(parseYouTubeDuration('PT15M29S'), {
    seconds: 929,
    minutes: 15.48,
    timestamp: '15:29',
    text: '15 Minutes, 29 Seconds',
  });
  assert.deepEqual(parseYouTubeDuration('PT1H2M3S'), {
    seconds: 3723,
    minutes: 62.05,
    timestamp: '1:02:03',
    text: '1 Hour, 2 Minutes, 3 Seconds',
  });
});

function createPaginatedApi(options: {
  itemCount: number;
  reportedCount?: number;
  missingIdPositions?: number[];
  unavailablePositions?: number[];
  untitledPositions?: number[];
  duplicatePosition?: number;
}) {
  const pageRequests: Array<{ start: number; size: number }> = [];
  const videoRequests: string[][] = [];
  const reportedCount = options.reportedCount ?? options.itemCount;
  let activeVideoRequests = 0;
  let maxConcurrentVideoRequests = 0;

  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname.endsWith('/playlists')) {
      return Response.json({
        items: [{ contentDetails: { itemCount: reportedCount } }],
      });
    }
    if (url.pathname.endsWith('/playlistItems')) {
      const start = Number(url.searchParams.get('pageToken') ?? 0);
      const size = Number(url.searchParams.get('maxResults'));
      pageRequests.push({ start, size });
      const end = Math.min(start + size, options.itemCount);
      return Response.json({
        pageInfo: { totalResults: reportedCount },
        nextPageToken: end < options.itemCount ? String(end) : undefined,
        items: Array.from({ length: end - start }, (_, index) => {
          const position = start + index;
          const videoId = options.missingIdPositions?.includes(position)
            ? undefined
            : `video-${position === options.duplicatePosition ? 1 : position}`;
          return {
            snippet: { position, resourceId: { videoId } },
            contentDetails: { videoId },
          };
        }),
      });
    }

    assert.ok(url.pathname.endsWith('/videos'));
    const ids = url.searchParams.get('id')!.split(',');
    videoRequests.push(ids);
    activeVideoRequests += 1;
    maxConcurrentVideoRequests = Math.max(
      maxConcurrentVideoRequests,
      activeVideoRequests
    );
    await new Promise<void>((resolve) => setImmediate(resolve));
    activeVideoRequests -= 1;
    return Response.json({
      // YouTube need not return metadata in the playlist's order.
      items: ids
        .filter(
          (id) => !options.unavailablePositions?.includes(Number(id.slice(6)))
        )
        .reverse()
        .map((id) => ({
          id,
          snippet: {
            title: options.untitledPositions?.includes(Number(id.slice(6)))
              ? ''
              : `Title ${id}`,
          },
        })),
    });
  };

  return {
    fetchImpl,
    pageRequests,
    videoRequests,
    get maxConcurrentVideoRequests() {
      return maxConcurrentVideoRequests;
    },
  };
}

const playlistUrl = 'https://www.youtube.com/playlist?list=PL-test-playlist';

test('subscriber exports paginate beyond 500 and preserve playlist order', async () => {
  const api = createPaginatedApi({ itemCount: 601 });
  const result = await getPlaylistExport({
    playlistUrl,
    apiKey: 'test-key',
    fetchImpl: api.fetchImpl,
    maxItems: SUBSCRIBER_PLAYLIST_EXPORT_LIMIT,
  });

  assert.equal(result.limit, SUBSCRIBER_PLAYLIST_EXPORT_LIMIT);
  assert.equal(result.returnedItems, 601);
  assert.equal(result.scannedCount, 601);
  assert.equal(result.totalItems, 601);
  assert.equal(result.skippedCount, 0);
  assert.equal(result.truncated, false);
  assert.deepEqual(
    result.videos.map((video) => [video.position, video.videoId]),
    Array.from({ length: 601 }, (_, index) => [index + 1, `video-${index}`])
  );
  assert.equal(api.pageRequests.length, 13);
  assert.equal(api.videoRequests.length, 13);
  assert.equal(api.maxConcurrentVideoRequests, 5);
});

test('the default free export stops at 500 without requesting an extra page', async () => {
  const api = createPaginatedApi({ itemCount: 501 });
  const result = await getPlaylistExport({
    playlistUrl,
    apiKey: 'test-key',
    fetchImpl: api.fetchImpl,
  });

  assert.equal(result.limit, FREE_PLAYLIST_EXPORT_LIMIT);
  assert.equal(result.returnedItems, 500);
  assert.equal(result.scannedCount, 500);
  assert.equal(result.totalItems, 501);
  assert.equal(result.truncated, true);
  assert.equal(api.pageRequests.length, 10);
  assert.equal(api.videoRequests.length, 10);
  assert.equal(api.videoRequests.flat().includes('video-500'), false);
});

test('requested limits cannot exceed the subscriber cap', async () => {
  const api = createPaginatedApi({ itemCount: 5_001 });
  const result = await getPlaylistExport({
    playlistUrl,
    apiKey: 'test-key',
    fetchImpl: api.fetchImpl,
    maxItems: 10_000,
  });

  assert.equal(result.limit, SUBSCRIBER_PLAYLIST_EXPORT_LIMIT);
  assert.equal(result.returnedItems, 5_000);
  assert.equal(result.scannedCount, 5_000);
  assert.equal(result.truncated, true);
  assert.equal(api.pageRequests.length, 100);
  assert.equal(api.videoRequests.length, 100);
  assert.equal(api.videoRequests.flat().includes('video-5000'), false);
  assert.equal(api.maxConcurrentVideoRequests, 5);
});

test('partial final pages request only the remaining allowed items', async () => {
  const api = createPaginatedApi({ itemCount: 502, reportedCount: 0 });
  const result = await getPlaylistExport({
    playlistUrl,
    apiKey: 'test-key',
    fetchImpl: api.fetchImpl,
    maxItems: 501,
  });

  assert.equal(result.returnedItems, 501);
  assert.equal(result.scannedCount, 501);
  assert.equal(result.totalItems, 501);
  // The next page token still proves truncation when upstream counts are stale.
  assert.equal(result.truncated, true);
  assert.deepEqual(api.pageRequests.at(-1), { start: 500, size: 1 });
  assert.deepEqual(api.videoRequests.at(-1), ['video-500']);
});

test('unavailable entries count as skipped and duplicate videos keep their positions', async () => {
  const api = createPaginatedApi({
    itemCount: 503,
    missingIdPositions: [0],
    unavailablePositions: [500],
    untitledPositions: [499],
    duplicatePosition: 498,
  });
  const result = await getPlaylistExport({
    playlistUrl,
    apiKey: 'test-key',
    fetchImpl: api.fetchImpl,
    maxItems: 501,
  });

  assert.equal(result.scannedCount, 501);
  assert.equal(result.returnedItems, 498);
  assert.equal(result.skippedCount, 3);
  assert.equal(result.truncated, true);
  assert.equal(result.videos[0].position, 2);
  assert.equal(result.videos.at(-1)?.position, 499);
  assert.equal(result.videos.at(-1)?.videoId, 'video-1');
  assert.equal(
    api.videoRequests.flat().filter((id) => id === 'video-1').length,
    1
  );
  assert.equal(api.videoRequests.flat().includes('video-501'), false);
});

test('a fully scanned playlist with unavailable videos is not truncated', async () => {
  const api = createPaginatedApi({
    itemCount: 501,
    unavailablePositions: [500],
  });
  const result = await getPlaylistExport({
    playlistUrl,
    apiKey: 'test-key',
    fetchImpl: api.fetchImpl,
    maxItems: SUBSCRIBER_PLAYLIST_EXPORT_LIMIT,
  });

  assert.equal(result.scannedCount, 501);
  assert.equal(result.returnedItems, 500);
  assert.equal(result.skippedCount, 1);
  assert.equal(result.truncated, false);
});

test('limits are normalized to bounded positive integers', async () => {
  for (const [maxItems, expectedLimit] of [
    [0, FREE_PLAYLIST_EXPORT_LIMIT],
    [-1, FREE_PLAYLIST_EXPORT_LIMIT],
    [NaN, FREE_PLAYLIST_EXPORT_LIMIT],
    [Infinity, FREE_PLAYLIST_EXPORT_LIMIT],
    [0.5, 1],
    [1.9, 1],
  ]) {
    const api = createPaginatedApi({ itemCount: 2 });
    const result = await getPlaylistExport({
      playlistUrl,
      apiKey: 'test-key',
      fetchImpl: api.fetchImpl,
      maxItems,
    });
    assert.equal(result.limit, expectedLimit);
    assert.equal(result.scannedCount, Math.min(2, expectedLimit));
  }
});

test('empty pages and repeated tokens stop pagination and report truncation', async () => {
  for (const emptyPage of [true, false]) {
    let pageRequests = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.pathname.endsWith('/playlists')) {
        return Response.json({ items: [{}] });
      }
      if (url.pathname.endsWith('/videos')) {
        return Response.json({ items: [] });
      }
      pageRequests += 1;
      return Response.json({
        nextPageToken: 'repeated-token',
        items: emptyPage ? [] : [{ snippet: { position: pageRequests - 1 } }],
      });
    };

    const result = await getPlaylistExport({
      playlistUrl,
      apiKey: 'test-key',
      fetchImpl,
      maxItems: SUBSCRIBER_PLAYLIST_EXPORT_LIMIT,
    });
    assert.equal(pageRequests, emptyPage ? 1 : 2);
    assert.equal(result.truncated, true);
    assert.equal(result.scannedCount, emptyPage ? 0 : 2);
  }
});

test('extractDescriptionMetadata deduplicates tags, emails, and links', () => {
  const result = extractDescriptionMetadata(
    [
      '#Python and #python',
      'Contact Creator@Example.com or creator@example.com.',
      'Docs: https://example.com/docs).',
      'Again: https://example.com/docs',
      'Reference: https://example.com/article_(topic)',
    ].join('\n')
  );

  assert.deepEqual(result, {
    tags: ['#Python'],
    emails: ['Creator@Example.com'],
    links: ['https://example.com/docs', 'https://example.com/article_(topic)'],
  });
});

test('getPlaylistExport maps the rich video metadata without extra requests', async () => {
  const requestedResources: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requestedResources.push(url.pathname);

    if (url.pathname.endsWith('/playlists')) {
      return Response.json({
        items: [
          {
            id: 'PL-test-playlist',
            snippet: {
              title: 'Test playlist',
              channelTitle: 'Test channel',
              thumbnails: { high: { url: 'https://img.test/playlist.jpg' } },
            },
            contentDetails: { itemCount: 1 },
          },
        ],
      });
    }

    if (url.pathname.endsWith('/playlistItems')) {
      return Response.json({
        pageInfo: { totalResults: 1 },
        items: [
          {
            snippet: {
              position: 0,
              resourceId: { videoId: 'video-12345' },
            },
            contentDetails: {
              videoId: 'video-12345',
              videoPublishedAt: '2024-01-02T03:04:05Z',
            },
          },
        ],
      });
    }

    return Response.json({
      items: [
        {
          id: 'video-12345',
          snippet: {
            title: 'Video title',
            description:
              '#Export contact@example.com https://example.com/resource',
            channelTitle: 'Video channel',
            publishedAt: '2024-01-02T03:04:05Z',
            thumbnails: {
              maxres: { url: 'https://img.test/video.jpg' },
            },
            tags: ['playlist export', 'YouTube', 'youtube'],
          },
          contentDetails: { duration: 'PT15M29S' },
          statistics: {
            viewCount: '123',
            likeCount: '45',
            commentCount: '6',
          },
        },
      ],
    });
  };

  const result = await getPlaylistExport({
    playlistUrl: 'https://www.youtube.com/playlist?list=PL-test-playlist',
    apiKey: 'test-key',
    fetchImpl,
  });

  assert.deepEqual(requestedResources, [
    '/youtube/v3/playlists',
    '/youtube/v3/playlistItems',
    '/youtube/v3/videos',
  ]);
  assert.deepEqual(result.videos[0], {
    position: 1,
    title: 'Video title',
    description: '#Export contact@example.com https://example.com/resource',
    thumbnailUrl: 'https://img.test/video.jpg',
    channelTitle: 'Video channel',
    publishedAt: '2024-01-02T03:04:05Z',
    duration: '15:29',
    durationSeconds: 929,
    durationMinutes: 15.48,
    durationText: '15 Minutes, 29 Seconds',
    viewCount: '123',
    likeCount: '45',
    commentCount: '6',
    videoId: 'video-12345',
    url: 'https://www.youtube.com/watch?v=video-12345',
    tags: ['#playlist export', '#YouTube', '#youtube'],
    descriptionTags: ['#Export'],
    descriptionEmails: ['contact@example.com'],
    descriptionLinks: ['https://example.com/resource'],
  });
});
