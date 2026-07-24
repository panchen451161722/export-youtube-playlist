import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getChannelToolData,
  getVideoToolData,
  parseYouTubeChannelInput,
  parseYouTubeVideoId,
  YouTubePublicError,
} from './service';

test('parses supported video and channel inputs without accepting other hosts', () => {
  assert.equal(
    parseYouTubeVideoId('https://youtu.be/YYXdXT2l-Gg?t=10'),
    'YYXdXT2l-Gg'
  );
  assert.equal(
    parseYouTubeVideoId('https://www.youtube.com/shorts/YYXdXT2l-Gg'),
    'YYXdXT2l-Gg'
  );
  assert.deepEqual(parseYouTubeChannelInput('https://youtube.com/@coreyms'), {
    kind: 'handle',
    value: 'coreyms',
  });
  assert.deepEqual(parseYouTubeChannelInput('UCCezIgC97PvUuR4_gbFUs5g'), {
    kind: 'id',
    value: 'UCCezIgC97PvUuR4_gbFUs5g',
  });
  assert.throws(
    () => parseYouTubeVideoId('https://example.com/watch?v=YYXdXT2l-Gg'),
    (error) =>
      error instanceof YouTubePublicError && error.code === 'invalid_url'
  );
});

test('maps one video into all five public video tool contracts', async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.pathname, '/youtube/v3/videos');
    assert.equal(url.searchParams.get('id'), 'YYXdXT2l-Gg');
    return Response.json({
      items: [
        {
          id: 'YYXdXT2l-Gg',
          snippet: {
            title: 'Python Tutorial',
            description:
              '#Python contact@example.com https://example.com/docs.',
            channelId: 'UCCezIgC97PvUuR4_gbFUs5g',
            channelTitle: 'Corey Schafer',
            publishedAt: '2017-05-17T14:09:24Z',
            thumbnails: {
              maxres: {
                url: 'https://i.ytimg.com/vi/YYXdXT2l-Gg/maxresdefault.jpg',
              },
            },
            tags: ['python tutorial', 'Python', 'python'],
          },
          contentDetails: {
            duration: 'PT17M23S',
            regionRestriction: { blocked: ['DE', 'AT'] },
          },
          statistics: {
            viewCount: '100',
            likeCount: '10',
            commentCount: '2',
          },
          status: { embeddable: true },
        },
      ],
    });
  };

  const result = await getVideoToolData({
    input: 'https://www.youtube.com/watch?v=YYXdXT2l-Gg',
    apiKey: 'test-key',
    fetchImpl,
  });

  assert.equal(result.videoId, 'YYXdXT2l-Gg');
  assert.equal(result.duration, '17:23');
  assert.equal(result.durationText, '17 Minutes, 23 Seconds');
  assert.deepEqual(result.tags, ['python tutorial', 'Python']);
  assert.deepEqual(result.descriptionTags, ['Python']);
  assert.deepEqual(result.emails, ['contact@example.com']);
  assert.deepEqual(result.links, ['https://example.com/docs']);
  assert.deepEqual(result.regionRestriction, {
    type: 'blocked',
    regions: ['DE', 'AT'],
  });
  assert.deepEqual(result.thumbnails.maxres, {
    url: 'https://i.ytimg.com/vi/YYXdXT2l-Gg/maxresdefault.jpg',
    width: 1280,
    height: 720,
  });
});

test('resolves a channel and paginates uploads and public playlists', async () => {
  const requests: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requests.push(url.pathname);

    if (url.pathname.endsWith('/channels')) {
      assert.equal(url.searchParams.get('forHandle'), 'fixturechannel');
      return Response.json({
        items: [
          {
            id: 'UC1234567890123456789012',
            snippet: {
              title: 'Fixture Channel',
              customUrl: '@fixturechannel',
              country: 'US',
              thumbnails: {
                default: { url: 'https://img.test/logo-88' },
                medium: { url: 'https://img.test/logo-240' },
                high: { url: 'https://img.test/logo-800' },
              },
            },
            contentDetails: {
              relatedPlaylists: { uploads: 'UU1234567890123456789012' },
            },
            statistics: {
              viewCount: '1000',
              subscriberCount: '100',
              videoCount: '2',
            },
            brandingSettings: {
              channel: {
                keywords: 'Python SQL "Web Development"',
              },
              image: {
                bannerExternalUrl: 'https://img.test/banner',
              },
            },
          },
        ],
      });
    }

    if (url.pathname.endsWith('/playlistItems')) {
      if (!url.searchParams.get('pageToken')) {
        return Response.json({
          pageInfo: { totalResults: 2 },
          nextPageToken: 'second-page',
          items: [
            {
              snippet: { resourceId: { videoId: 'abc123_-XYZ' } },
              contentDetails: {
                videoId: 'abc123_-XYZ',
                videoPublishedAt: '2025-01-02T03:04:05Z',
              },
            },
          ],
        });
      }
      return Response.json({
        pageInfo: { totalResults: 2 },
        items: [
          {
            snippet: { resourceId: { videoId: 'def456_-UVW' } },
            contentDetails: {
              videoId: 'def456_-UVW',
              videoPublishedAt: '2024-01-02T03:04:05Z',
            },
          },
        ],
      });
    }

    if (url.pathname.endsWith('/videos')) {
      return Response.json({
        items: [
          {
            id: 'abc123_-XYZ',
            snippet: {
              title: 'Regular video',
              description: '#Python https://example.com/video',
              channelTitle: 'Fixture Channel',
              thumbnails: {
                maxres: { url: 'https://img.test/video-1' },
              },
              tags: ['Python', 'Tutorial'],
            },
            contentDetails: { duration: 'PT1H2M3S' },
            statistics: {
              viewCount: '900',
              likeCount: '90',
              commentCount: '9',
            },
          },
          {
            id: 'def456_-UVW',
            snippet: {
              title: 'Short video',
              description: '',
              channelTitle: 'Fixture Channel',
              thumbnails: {
                high: { url: 'https://img.test/video-2' },
              },
            },
            contentDetails: { duration: 'PT30S' },
            statistics: {
              viewCount: '100',
              likeCount: '10',
              commentCount: '1',
            },
          },
        ],
      });
    }

    if (url.pathname.endsWith('/playlists')) {
      return Response.json({
        items: [
          {
            id: 'PL-fixture',
            snippet: {
              title: 'Fixture Playlist',
              description: 'Fixture description',
              publishedAt: '2020-01-01T00:00:00Z',
              thumbnails: {
                high: { url: 'https://img.test/playlist' },
              },
            },
            contentDetails: { itemCount: 2 },
          },
        ],
      });
    }

    return Response.json({}, { status: 404 });
  };

  const result = await getChannelToolData({
    input: 'https://www.youtube.com/@fixturechannel',
    includeVideos: true,
    includePlaylists: true,
    apiKey: 'test-key',
    fetchImpl,
  });

  assert.deepEqual(requests, [
    '/youtube/v3/channels',
    '/youtube/v3/playlistItems',
    '/youtube/v3/playlistItems',
    '/youtube/v3/videos',
    '/youtube/v3/playlists',
  ]);
  assert.equal(result.channelId, 'UC1234567890123456789012');
  assert.equal(result.uploadsPlaylistId, 'UU1234567890123456789012');
  assert.deepEqual(result.keywords, ['Python', 'SQL', 'Web Development']);
  assert.equal(result.returnedVideos, 2);
  assert.equal(result.totalVideos, 2);
  assert.equal(result.truncated, false);
  assert.equal(result.videos[0].durationText, '1 Hours, 2 Minutes, 3 Seconds');
  assert.equal(result.videos[0].mediaType, 'videos');
  assert.equal(result.videos[1].mediaType, 'shorts');
  assert.equal(result.playlists[0].videoCount, 2);
  assert.equal(
    result.banners['TV (2560x1440)'],
    'https://img.test/banner=w2560'
  );
});
