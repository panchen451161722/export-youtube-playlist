import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createChannelExportCsv,
  createChannelLinksCsv,
  createChannelTitlesCsv,
} from './public-tool-export';
import type { ChannelVideo } from './types';

function video(overrides: Partial<ChannelVideo> = {}): ChannelVideo {
  return {
    position: 1,
    videoId: 'abc123_-XYZ',
    title: 'A title, with a comma',
    url: 'https://www.youtube.com/watch?v=abc123_-XYZ',
    description: '#Python contact@example.com https://example.com',
    channelTitle: 'Example Channel',
    publishedAt: '2024-01-02T03:04:05Z',
    thumbnailUrl: 'https://i.ytimg.com/vi/abc123_-XYZ/maxresdefault.jpg',
    duration: '1:02:03',
    durationText: '1 Hours, 2 Minutes, 3 Seconds',
    durationSeconds: 3723,
    durationMinutes: 62.05,
    viewCount: '100',
    likeCount: '10',
    commentCount: '2',
    tags: ['python', 'data science'],
    descriptionTags: ['Python'],
    emails: ['contact@example.com'],
    links: ['https://example.com'],
    mediaType: 'videos',
    ...overrides,
  };
}

test('matches the reference channel link and title CSV contracts', () => {
  assert.equal(
    createChannelLinksCsv([video()]),
    ['Index,URL', '1,https://www.youtube.com/watch?v=abc123_-XYZ'].join('\r\n')
  );
  assert.equal(
    createChannelTitlesCsv([video()]),
    ['Index,Title', '1,"A title, with a comma"'].join('\r\n')
  );
});

test('matches the reference 17-column channel export contract', () => {
  const rows = createChannelExportCsv([video()]).split('\r\n');
  assert.equal(
    rows[0],
    [
      'Title',
      'Video url',
      'Tags',
      'Tags (in description)',
      'Emails (in description)',
      'Links (in description)',
      'Description',
      'Thumbnail url',
      'Channel name',
      'Views',
      'Likes',
      'Comments',
      'Duration',
      'Duration in seconds',
      'Duration in minutes',
      'Duration in timestamp',
      'Uploaded Time',
    ].join(',')
  );
  assert.equal(
    rows[1],
    [
      '"A title, with a comma"',
      'https://www.youtube.com/watch?v=abc123_-XYZ',
      '"[#python, #data science]"',
      '[#Python]',
      '[contact@example.com]',
      '[https://example.com]',
      '#Python contact@example.com https://example.com',
      'https://i.ytimg.com/vi/abc123_-XYZ/maxresdefault.jpg',
      'Example Channel',
      '100',
      '10',
      '2',
      '"1 Hours, 2 Minutes, 3 Seconds"',
      '3723',
      '62.05',
      '1:02:03',
      '2024-01-02T03:04:05',
    ].join(',')
  );
});

test('protects channel exports from spreadsheet formula injection', () => {
  const csv = createChannelExportCsv([
    video({ title: '=HYPERLINK("https://evil.example")' }),
  ]);
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/evil\.example""\)"/);
});
