import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPlaylistAnalyzerCsv,
  createPlaylistExtractionCsv,
} from './playlist-tool-csv';
import type { PlaylistExport, PlaylistVideo } from './types';

function video(overrides: Partial<PlaylistVideo> = {}): PlaylistVideo {
  return {
    position: 1,
    title: 'A title, with a comma',
    description: '',
    thumbnailUrl: '',
    channelTitle: 'Example Channel',
    publishedAt: '2024-01-02T03:04:05Z',
    duration: '01:02',
    durationSeconds: 62,
    durationMinutes: 1.03,
    durationText: '1m 2s',
    viewCount: '100',
    likeCount: '10',
    commentCount: '2',
    videoId: 'abc123_-XYZ',
    url: 'https://www.youtube.com/watch?v=abc123_-XYZ',
    tags: [],
    descriptionTags: [],
    descriptionEmails: [],
    descriptionLinks: [],
    ...overrides,
  };
}

function playlist(videos: PlaylistVideo[]): PlaylistExport {
  return {
    playlistId: 'PL-example',
    title: 'Example playlist',
    channelTitle: 'Example Channel',
    thumbnailUrl: '',
    videos,
    returnedItems: videos.length,
    totalItems: videos.length,
    scannedCount: videos.length,
    skippedCount: 0,
    truncated: false,
    limit: 500,
  };
}

test('matches the reference link extractor CSV contract', () => {
  assert.equal(
    createPlaylistExtractionCsv(playlist([video()]), 'links'),
    ['Index,URL', '1,https://www.youtube.com/watch?v=abc123_-XYZ'].join('\r\n')
  );
});

test('matches the reference title extractor CSV contract', () => {
  assert.equal(
    createPlaylistExtractionCsv(playlist([video()]), 'titles'),
    ['Index,Title', '1,"A title, with a comma"'].join('\r\n')
  );
});

test('creates an analyzer CSV with stable comparison fields', () => {
  assert.equal(
    createPlaylistAnalyzerCsv(playlist([video()])),
    [
      [
        'Index',
        'Video ID',
        'Title',
        'URL',
        'Channel',
        'Duration Seconds',
        'Views',
        'Likes',
        'Comments',
        'Uploaded Time',
      ].join(','),
      [
        '1',
        'abc123_-XYZ',
        '"A title, with a comma"',
        'https://www.youtube.com/watch?v=abc123_-XYZ',
        'Example Channel',
        '62',
        '100',
        '10',
        '2',
        '2024-01-02T03:04:05',
      ].join(','),
    ].join('\r\n')
  );
});

test('protects spreadsheet users from formula injection', () => {
  assert.equal(
    createPlaylistExtractionCsv(
      playlist([video({ title: '=HYPERLINK("https://evil.example")' })]),
      'titles'
    ),
    ['Index,Title', '1,"\'=HYPERLINK(""https://evil.example"")"'].join('\r\n')
  );
});
