import { YOUTUBE_EXPORT_COLUMNS, type YouTubeExportRecord } from './types';

type PlaylistVideoSource = {
  title: string;
  url: string;
  tags: string[];
  descriptionTags: string[];
  descriptionEmails: string[];
  descriptionLinks: string[];
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  durationText: string;
  durationSeconds: number | null;
  durationMinutes: number | null;
  duration: string;
  publishedAt: string;
};

type ChannelVideoSource = Omit<
  PlaylistVideoSource,
  'descriptionEmails' | 'descriptionLinks'
> & {
  emails: string[];
  links: string[];
};

export type ExportCell = string | number | null;

function numeric(value: string): number | null {
  return /^\d+$/.test(value) ? Number(value) : null;
}

function normalizeUploadedTime(value: string): string {
  return value.replace(/Z$/, '');
}

function normalizeTags(values: string[]): string[] {
  return values.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
}

export function playlistVideosToExportRecords(
  videos: PlaylistVideoSource[]
): YouTubeExportRecord[] {
  return videos.map((video) => ({
    title: video.title,
    videoUrl: video.url,
    tags: normalizeTags(video.tags),
    descriptionTags: normalizeTags(video.descriptionTags),
    emails: video.descriptionEmails,
    links: video.descriptionLinks,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    channelName: video.channelTitle,
    views: numeric(video.viewCount),
    likes: numeric(video.likeCount),
    comments: numeric(video.commentCount),
    duration: video.durationText,
    durationSeconds: video.durationSeconds,
    durationMinutes: video.durationMinutes,
    durationTimestamp: video.duration,
    uploadedTime: normalizeUploadedTime(video.publishedAt),
  }));
}

export function channelVideosToExportRecords(
  videos: ChannelVideoSource[]
): YouTubeExportRecord[] {
  return videos.map((video) => ({
    title: video.title,
    videoUrl: video.url,
    tags: normalizeTags(video.tags),
    descriptionTags: normalizeTags(video.descriptionTags),
    emails: video.emails,
    links: video.links,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    channelName: video.channelTitle,
    views: numeric(video.viewCount),
    likes: numeric(video.likeCount),
    comments: numeric(video.commentCount),
    duration: video.durationText,
    durationSeconds: video.durationSeconds,
    durationMinutes: video.durationMinutes,
    durationTimestamp: video.duration,
    uploadedTime: normalizeUploadedTime(video.publishedAt),
  }));
}

export function listCell(values: string[]): string {
  return `[${values.join(', ')}]`;
}

export function exportCell(
  record: YouTubeExportRecord,
  key: keyof YouTubeExportRecord
): ExportCell {
  const value = record[key];
  return Array.isArray(value) ? listCell(value) : value;
}

export function exportRows(records: YouTubeExportRecord[]): ExportCell[][] {
  return records.map((record) =>
    YOUTUBE_EXPORT_COLUMNS.map((column) => exportCell(record, column.key))
  );
}

export function recordObject(record: YouTubeExportRecord) {
  return Object.fromEntries(
    YOUTUBE_EXPORT_COLUMNS.map((column) => [
      column.label,
      exportCell(record, column.key),
    ])
  );
}

export function safeSpreadsheetCell(value: ExportCell): ExportCell {
  return typeof value === 'string' && /^[=+\-@]/.test(value.trimStart())
    ? `'${value}`
    : value;
}

export function safeExportFileName(
  value: string,
  fallback = 'youtube-export'
): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 100);
  return normalized || fallback;
}
