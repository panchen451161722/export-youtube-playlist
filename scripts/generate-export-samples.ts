import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { generateYouTubeExportFiles } from '../src/lib/youtube-export/formats';
import type { YouTubeExportRecord } from '../src/lib/youtube-export/types';

const records: YouTubeExportRecord[] = [
  {
    title: 'Example: Organize a research playlist',
    videoUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_01',
    tags: ['#research', '#workflow'],
    descriptionTags: ['#productivity'],
    emails: [],
    links: ['https://example.com/notes'],
    description:
      'A synthetic example row that shows how playlist metadata appears in an export.',
    thumbnailUrl: 'https://i.ytimg.com/vi/VIDEO_ID_01/hqdefault.jpg',
    channelName: 'Example Channel',
    views: 12500,
    likes: 480,
    comments: 32,
    duration: '12 Minutes, 34 Seconds',
    durationSeconds: 754,
    durationMinutes: 12.57,
    durationTimestamp: '12:34',
    uploadedTime: '2026-01-15T10:30:00',
  },
  {
    title: '示例：整理双语播放列表',
    videoUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_02',
    tags: ['#示例', '#playlist'],
    descriptionTags: [],
    emails: [],
    links: [],
    description:
      'Synthetic bilingual content demonstrates how UTF-8 titles are represented.',
    thumbnailUrl: 'https://i.ytimg.com/vi/VIDEO_ID_02/hqdefault.jpg',
    channelName: 'Example Channel',
    views: 980,
    likes: 45,
    comments: null,
    duration: '4 Minutes, 5 Seconds',
    durationSeconds: 245,
    durationMinutes: 4.08,
    durationTimestamp: '4:05',
    uploadedTime: '2026-02-20T08:00:00',
  },
];

const outputDirectory = resolve('public/samples');
await mkdir(outputDirectory, { recursive: true });

const files = await generateYouTubeExportFiles({
  records,
  context: { title: 'YouTube Playlist Export Sample', source: 'playlist' },
  formats: ['csv', 'xlsx'],
});

for (const file of files) {
  const fileName =
    file.format === 'csv'
      ? 'youtube-playlist-export-sample.csv'
      : 'youtube-playlist-export-sample.xlsx';
  await writeFile(resolve(outputDirectory, fileName), file.bytes);
}
