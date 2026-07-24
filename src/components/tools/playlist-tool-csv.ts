import type { PlaylistExport, PlaylistVideo } from './types';

export type PlaylistCsvMode = 'links' | 'titles';

function safeSpreadsheetText(value: string) {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

function csvCell(value: string | number) {
  const safeValue =
    typeof value === 'string' ? safeSpreadsheetText(value) : String(value);
  return /[",\r\n]/.test(safeValue)
    ? `"${safeValue.replaceAll('"', '""')}"`
    : safeValue;
}

function rowsToCsv(rows: Array<Array<string | number>>) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function canonicalVideoUrl(video: PlaylistVideo) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`;
}

function optionalCount(value: string) {
  return /^\d+$/.test(value) ? Number(value) : '';
}

function normalizePublishedAt(value: string) {
  return value.replace(/Z$/, '');
}

export function createPlaylistExtractionCsv(
  result: PlaylistExport,
  mode: PlaylistCsvMode
) {
  if (mode === 'links') {
    return rowsToCsv([
      ['Index', 'URL'],
      ...result.videos.map((video, index) => [
        index + 1,
        canonicalVideoUrl(video),
      ]),
    ]);
  }

  return rowsToCsv([
    ['Index', 'Title'],
    ...result.videos.map((video, index) => [index + 1, video.title]),
  ]);
}

export function createPlaylistAnalyzerCsv(result: PlaylistExport) {
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
    ],
    ...result.videos.map((video, index) => [
      index + 1,
      video.videoId,
      video.title,
      canonicalVideoUrl(video),
      video.channelTitle,
      video.durationSeconds ?? '',
      optionalCount(video.viewCount),
      optionalCount(video.likeCount),
      optionalCount(video.commentCount),
      normalizePublishedAt(video.publishedAt),
    ]),
  ]);
}
