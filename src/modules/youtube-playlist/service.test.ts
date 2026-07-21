import assert from 'node:assert/strict';
import test from 'node:test';

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
