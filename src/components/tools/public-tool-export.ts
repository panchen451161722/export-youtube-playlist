import type { ChannelPlaylist, ChannelToolData, ChannelVideo } from './types';

type ExportCell = string | number | null;

const CHANNEL_EXPORT_HEADERS = [
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
];

function safeSpreadsheetText(value: string) {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

function safeCell(value: ExportCell): ExportCell {
  return typeof value === 'string' ? safeSpreadsheetText(value) : value;
}

function csvCell(value: ExportCell) {
  const safeValue = safeCell(value);
  const text = safeValue === null ? '' : String(safeValue);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows: ExportCell[][]) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function numeric(value: string) {
  return /^\d+$/.test(value) ? Number(value) : null;
}

function list(values: string[]) {
  return `[${values.join(', ')}]`;
}

function channelExportRow(video: ChannelVideo): ExportCell[] {
  return [
    video.title,
    video.url,
    list(video.tags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))),
    list(
      video.descriptionTags.map((tag) =>
        tag.startsWith('#') ? tag : `#${tag}`
      )
    ),
    list(video.emails),
    list(video.links),
    video.description,
    video.thumbnailUrl,
    video.channelTitle,
    numeric(video.viewCount),
    numeric(video.likeCount),
    numeric(video.commentCount),
    video.durationText,
    video.durationSeconds,
    video.durationMinutes,
    video.duration,
    video.publishedAt.replace(/Z$/, ''),
  ];
}

export function createChannelLinksCsv(videos: ChannelVideo[]) {
  return rowsToCsv([
    ['Index', 'URL'],
    ...videos.map((video, index) => [index + 1, video.url]),
  ]);
}

export function createChannelTitlesCsv(videos: ChannelVideo[]) {
  return rowsToCsv([
    ['Index', 'Title'],
    ...videos.map((video, index) => [index + 1, video.title]),
  ]);
}

export function createChannelPlaylistsCsv(playlists: ChannelPlaylist[]) {
  return rowsToCsv([
    ['Index', 'Playlist ID', 'Title', 'URL', 'Video Count', 'Published At'],
    ...playlists.map((playlist, index) => [
      index + 1,
      playlist.playlistId,
      playlist.title,
      playlist.url,
      playlist.videoCount,
      playlist.publishedAt.replace(/Z$/, ''),
    ]),
  ]);
}

export function createChannelExportCsv(videos: ChannelVideo[]) {
  return rowsToCsv([CHANNEL_EXPORT_HEADERS, ...videos.map(channelExportRow)]);
}

export function createChannelAnalyzerCsv(videos: ChannelVideo[]) {
  return rowsToCsv([
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
      'Media Type',
    ],
    ...videos.map((video, index) => [
      index + 1,
      video.videoId,
      video.title,
      video.url,
      video.channelTitle,
      video.durationSeconds,
      numeric(video.viewCount),
      numeric(video.likeCount),
      numeric(video.commentCount),
      video.publishedAt.replace(/Z$/, ''),
      video.mediaType,
    ]),
  ]);
}

export async function createChannelExportXlsx(data: ChannelToolData) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const header = CHANNEL_EXPORT_HEADERS.map((value) => ({
    value,
    fontWeight: 'bold' as const,
    backgroundColor: '#E8EDF8',
  }));
  const rows = data.videos.map(channelExportRow).map((row) =>
    row.map((value, columnIndex) => ({
      value: safeCell(value) ?? undefined,
      alignVertical: 'top' as const,
      wrap: [0, 1, 2, 3, 4, 5, 6].includes(columnIndex),
      ...(columnIndex === 6 ? { height: 72 } : {}),
    }))
  );
  return writeXlsxFile([header, ...rows], {
    columns: [
      42, 42, 34, 30, 28, 36, 70, 45, 24, 14, 14, 14, 18, 18, 18, 20, 24,
    ].map((width) => ({ width })),
    stickyRowsCount: 1,
  }).toBlob();
}

export function safeFileName(value: string, fallback = 'youtube-data') {
  const normalized = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 100);
  return normalized || fallback;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }, 1_000);
}

export function downloadText(
  content: string,
  fileName: string,
  type = 'text/plain'
) {
  downloadBlob(
    new Blob([`\uFEFF${content}`], { type: `${type};charset=utf-8` }),
    fileName
  );
}

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('copy_failed');
}
