import assert from 'node:assert/strict';
import test from 'node:test';
import { strFromU8, unzipSync } from 'fflate';

import {
  generateYouTubeExportFiles,
  resolveYouTubeExportFormats,
} from './formats';
import {
  channelVideosToExportRecords,
  playlistVideosToExportRecords,
} from './records';
import {
  YOUTUBE_EXPORT_COLUMNS,
  YOUTUBE_EXPORT_FORMATS,
  type YouTubeExportFormat,
  type YouTubeExportRecord,
} from './types';

const decoder = new TextDecoder();

const record: YouTubeExportRecord = {
  title: 'A title, with <markup>',
  description: 'Line one\nLine two #Python',
  thumbnailUrl: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
  channelName: 'Example Channel',
  views: 100,
  likes: 10,
  comments: 2,
  durationSeconds: 3723,
  durationMinutes: 62.05,
  durationTimestamp: '1:02:03',
  duration: '1 Hours, 2 Minutes, 3 Seconds',
  uploadedTime: '2024-01-02T03:04:05',
  videoUrl: 'https://www.youtube.com/watch?v=abc123',
  tags: ['#python', '#data science'],
  descriptionTags: ['#Python'],
  emails: ['contact@example.com'],
  links: ['https://example.com'],
};

const context = {
  title: 'Reference Playlist',
  source: 'playlist' as const,
};

async function generate(formats: YouTubeExportFormat[]) {
  return generateYouTubeExportFiles({
    records: [record],
    context,
    formats,
  });
}

test('exposes the same 13 formats and defaults to all of them', () => {
  assert.equal(YOUTUBE_EXPORT_FORMATS.length, 13);
  assert.deepEqual(
    resolveYouTubeExportFormats([]),
    YOUTUBE_EXPORT_FORMATS.map((format) => format.key)
  );
});

test('uses the reference 17-column order and values for CSV', async () => {
  const [file] = await generate(['csv']);
  const csv = decoder.decode(file.bytes).replace(/^\uFEFF/, '');
  const [header, row] = csv.split('\r\n');

  assert.equal(
    header,
    [
      'Title',
      'Description',
      'Thumbnail url',
      'Channel name',
      'Views',
      'Likes',
      'Comments',
      'Duration in seconds',
      'Duration in minutes',
      'Duration in timestamp',
      'Duration',
      'Uploaded Time',
      'Video url',
      'Tags',
      'Tags (in description)',
      'Emails (in description)',
      'Links (in description)',
    ].join(',')
  );
  assert.equal(YOUTUBE_EXPORT_COLUMNS.length, 17);
  assert.match(row, /"\[#python, #data science\]"/);
  assert.match(row, /2024-01-02T03:04:05/);
});

test('playlist and channel adapters preserve the same export contract', () => {
  const common = {
    title: record.title,
    url: record.videoUrl,
    tags: ['python', 'data science'],
    descriptionTags: ['Python'],
    description: record.description,
    thumbnailUrl: record.thumbnailUrl,
    channelTitle: record.channelName,
    viewCount: '100',
    likeCount: '10',
    commentCount: '2',
    durationText: record.duration,
    durationSeconds: record.durationSeconds,
    durationMinutes: record.durationMinutes,
    duration: record.durationTimestamp,
    publishedAt: `${record.uploadedTime}Z`,
  };
  const playlist = playlistVideosToExportRecords([
    {
      ...common,
      descriptionEmails: record.emails,
      descriptionLinks: record.links,
    },
  ]);
  const channel = channelVideosToExportRecords([
    { ...common, emails: record.emails, links: record.links },
  ]);

  assert.deepEqual(playlist, channel);
  assert.deepEqual(playlist[0].tags, ['#python', '#data science']);
  assert.deepEqual(playlist[0].descriptionTags, ['#Python']);
});

test('matches the reference text, JSON, Markdown, XML and YAML shapes', async () => {
  const files = await generate(['text', 'json', 'markdown', 'xml', 'yaml']);
  const content = Object.fromEntries(
    files.map((file) => [file.format, decoder.decode(file.bytes)])
  );

  assert.match(content.text, /^Title: A title, with <markup>/);
  assert.ok(
    content.text.indexOf('Description:') > content.text.indexOf('Links')
  );
  assert.match(content.text, /#{63}/);

  const json = JSON.parse(content.json) as Record<string, unknown>[];
  assert.equal(json[0].Title, record.title);
  assert.equal(json[0].Tags, '[#python, #data science]');
  assert.equal(Object.keys(json[0]).length, 17);

  assert.match(content.markdown, /^# Reference Playlist\n\n## A title/m);
  assert.match(content.markdown, /- \*\*Video url\*\*:/);
  assert.match(content.markdown, /- \*\*Description\*\*:/);

  assert.match(content.xml, /<export>/);
  assert.match(content.xml, /<Thumbnailurl>/);
  assert.match(content.xml, /&lt;markup&gt;/);

  assert.match(content.yaml, /^# YouTube Playlist Export:/);
  assert.match(content.yaml, /- Title:/);
  assert.match(content.yaml, /  Tags: "\[#python, #data science\]"/);
});

test('creates distinct bookmark and standalone HTML files', async () => {
  const files = await generate(['bookmark', 'html']);
  assert.deepEqual(
    files.map((file) => file.fileName),
    ['Reference-Playlist.html', 'Reference-Playlist_Export.html']
  );
  assert.match(decoder.decode(files[0].bytes), /NETSCAPE-Bookmark-file-1/);
  assert.match(decoder.decode(files[1].bytes), /<table>/);
});

test('creates valid XLSX and DOCX zip containers', async () => {
  const files = await generate(['xlsx', 'word']);
  for (const file of files) {
    assert.equal(decoder.decode(file.bytes.slice(0, 2)), 'PK');
  }
  const docx = unzipSync(files[1].bytes);
  const documentXml = strFromU8(docx['word/document.xml']);
  assert.match(documentXml, /Reference Playlist/);
  assert.match(documentXml, /A title, with &lt;markup&gt;/);
  assert.match(documentXml, /Description:/);
});

test('matches the reference M3U and M3U8 entry contract', async () => {
  const files = await generate(['m3u', 'm3u8']);
  const expected = [
    '#EXTM3U',
    '#EXTINF:3723,Example Channel - A title, with <markup>',
    record.videoUrl,
  ].join('\n');

  assert.equal(decoder.decode(files[0].bytes), expected);
  assert.equal(decoder.decode(files[1].bytes), expected);
});
