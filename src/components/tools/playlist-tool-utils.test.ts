import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzePlaylist,
  formatDurationClock,
  isValidYouTubePlaylistUrl,
  parseOptionalCount,
} from './playlist-tool-utils';
import type { PlaylistVideo } from './types';

function video(
  overrides: Partial<PlaylistVideo> & Pick<PlaylistVideo, 'position' | 'title'>
): PlaylistVideo {
  const { position, title, ...rest } = overrides;
  return {
    position,
    title,
    description: '',
    thumbnailUrl: '',
    channelTitle: '',
    publishedAt: '',
    duration: '',
    durationSeconds: null,
    durationMinutes: null,
    durationText: '',
    viewCount: '',
    likeCount: '',
    commentCount: '',
    videoId: `video-${position}`,
    url: `https://www.youtube.com/watch?v=video-${position}`,
    tags: [],
    descriptionTags: [],
    descriptionEmails: [],
    descriptionLinks: [],
    ...rest,
  };
}

test('validates supported YouTube playlist URLs', () => {
  assert.equal(
    isValidYouTubePlaylistUrl(
      'https://www.youtube.com/playlist?list=PL-osiE80TeTskrapNbzXhwoFUiLCjGgY7'
    ),
    true
  );
  assert.equal(
    isValidYouTubePlaylistUrl(
      'https://music.youtube.com/playlist?list=PL-osiE80TeTskrapNbzXhwoFUiLCjGgY7'
    ),
    true
  );
  assert.equal(
    isValidYouTubePlaylistUrl('https://example.com/?list=PL-osiE80TeTskrap'),
    false
  );
  assert.equal(isValidYouTubePlaylistUrl('not a url'), false);
});

test('parses available counts without converting missing values to zero', () => {
  assert.equal(parseOptionalCount('120'), 120);
  assert.equal(parseOptionalCount(''), null);
  assert.equal(parseOptionalCount('not available'), null);
  assert.equal(parseOptionalCount('-1'), null);
});

test('analyzes durations and statistics while excluding missing values', () => {
  const result = analyzePlaylist([
    video({
      position: 1,
      title: 'First',
      channelTitle: 'Channel A',
      durationSeconds: 120,
      viewCount: '100',
      likeCount: '10',
      commentCount: '',
    }),
    video({
      position: 2,
      title: 'Second',
      channelTitle: 'Channel A',
      durationSeconds: 240,
      viewCount: '',
      likeCount: '20',
      commentCount: '3',
    }),
    video({
      position: 3,
      title: 'Third',
      channelTitle: 'Channel B',
      durationSeconds: null,
      viewCount: '300',
      likeCount: '',
      commentCount: '9',
    }),
  ]);

  assert.deepEqual(result.duration, {
    total: 360,
    average: 180,
    available: 2,
  });
  assert.deepEqual(result.views, {
    total: 400,
    average: 200,
    available: 2,
  });
  assert.deepEqual(result.likes, {
    total: 30,
    average: 15,
    available: 2,
  });
  assert.deepEqual(result.comments, {
    total: 12,
    average: 6,
    available: 2,
  });
  assert.equal(result.videoCount, 3);
  assert.equal(result.uniqueChannelCount, 2);
  assert.equal(result.longestVideo?.title, 'Second');
  assert.equal(result.shortestVideo?.title, 'First');
  assert.deepEqual(
    result.topVideosByViews.map(({ video: item, value }) => [
      item.title,
      value,
    ]),
    [
      ['Third', 300],
      ['First', 100],
    ]
  );
  assert.deepEqual(result.topChannels, [
    { channelTitle: 'Channel A', videoCount: 2 },
    { channelTitle: 'Channel B', videoCount: 1 },
  ]);
  assert.deepEqual(result.watchTimes, {
    normal: 360,
    speed125: 288,
    speed15: 240,
    speed2: 180,
  });
});

test('returns missing summaries when no numeric statistics are available', () => {
  const result = analyzePlaylist([
    video({ position: 1, title: 'Unavailable' }),
  ]);

  assert.deepEqual(result.views, {
    total: null,
    average: null,
    available: 0,
  });
  assert.equal(result.longestVideo, null);
  assert.equal(result.shortestVideo, null);
  assert.equal(result.watchTimes.normal, null);
  assert.deepEqual(result.topVideosByViews, []);
});

test('formats durations as an unambiguous clock value', () => {
  assert.equal(formatDurationClock(0), '00:00:00');
  assert.equal(formatDurationClock(3723), '01:02:03');
  assert.equal(formatDurationClock(93_784), '26:03:04');
});
