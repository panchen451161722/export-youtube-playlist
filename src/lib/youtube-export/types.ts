export const YOUTUBE_EXPORT_FORMATS = [
  {
    key: 'csv',
    label: 'CSV',
    extension: 'csv',
    mimeType: 'text/csv;charset=utf-8',
  },
  {
    key: 'xlsx',
    label: 'Excel',
    extension: 'xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    key: 'text',
    label: 'Text',
    extension: 'txt',
    mimeType: 'text/plain;charset=utf-8',
  },
  {
    key: 'bookmark',
    label: 'Bookmark HTML',
    extension: 'html',
    mimeType: 'text/html;charset=utf-8',
  },
  {
    key: 'json',
    label: 'JSON',
    extension: 'json',
    mimeType: 'application/json;charset=utf-8',
  },
  {
    key: 'markdown',
    label: 'Markdown',
    extension: 'md',
    mimeType: 'text/markdown;charset=utf-8',
  },
  {
    key: 'xml',
    label: 'XML',
    extension: 'xml',
    mimeType: 'application/xml;charset=utf-8',
  },
  {
    key: 'html',
    label: 'HTML',
    extension: 'html',
    fileSuffix: '_Export',
    mimeType: 'text/html;charset=utf-8',
  },
  {
    key: 'yaml',
    label: 'YAML',
    extension: 'yaml',
    mimeType: 'application/yaml;charset=utf-8',
  },
  {
    key: 'sqlite',
    label: 'SQLite',
    extension: 'sqlite',
    mimeType: 'application/vnd.sqlite3',
  },
  {
    key: 'word',
    label: 'Word',
    extension: 'docx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    key: 'm3u',
    label: 'M3U',
    extension: 'm3u',
    mimeType: 'audio/x-mpegurl;charset=utf-8',
  },
  {
    key: 'm3u8',
    label: 'M3U8',
    extension: 'm3u8',
    mimeType: 'application/vnd.apple.mpegurl;charset=utf-8',
  },
] as const;

export type YouTubeExportFormat =
  (typeof YOUTUBE_EXPORT_FORMATS)[number]['key'];

export type YouTubeExportRecord = {
  title: string;
  videoUrl: string;
  tags: string[];
  descriptionTags: string[];
  emails: string[];
  links: string[];
  description: string;
  thumbnailUrl: string;
  channelName: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  duration: string;
  durationSeconds: number | null;
  durationMinutes: number | null;
  durationTimestamp: string;
  uploadedTime: string;
};

export type YouTubeExportContext = {
  title: string;
  source: 'playlist' | 'channel';
};

export type GeneratedYouTubeExportFile = {
  format: YouTubeExportFormat;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type YouTubeExportColumn = {
  key: keyof YouTubeExportRecord;
  label: string;
  sqliteName: string;
  sqliteType: 'TEXT' | 'INTEGER' | 'REAL';
};

export const YOUTUBE_EXPORT_COLUMNS: readonly YouTubeExportColumn[] = [
  {
    key: 'title',
    label: 'Title',
    sqliteName: 'title',
    sqliteType: 'TEXT',
  },
  {
    key: 'description',
    label: 'Description',
    sqliteName: 'description',
    sqliteType: 'TEXT',
  },
  {
    key: 'thumbnailUrl',
    label: 'Thumbnail url',
    sqliteName: 'thumbnail_url',
    sqliteType: 'TEXT',
  },
  {
    key: 'channelName',
    label: 'Channel name',
    sqliteName: 'channel_name',
    sqliteType: 'TEXT',
  },
  {
    key: 'views',
    label: 'Views',
    sqliteName: 'views',
    sqliteType: 'INTEGER',
  },
  {
    key: 'likes',
    label: 'Likes',
    sqliteName: 'likes',
    sqliteType: 'INTEGER',
  },
  {
    key: 'comments',
    label: 'Comments',
    sqliteName: 'comments',
    sqliteType: 'INTEGER',
  },
  {
    key: 'durationSeconds',
    label: 'Duration in seconds',
    sqliteName: 'duration_in_seconds',
    sqliteType: 'INTEGER',
  },
  {
    key: 'durationMinutes',
    label: 'Duration in minutes',
    sqliteName: 'duration_in_minutes',
    sqliteType: 'REAL',
  },
  {
    key: 'durationTimestamp',
    label: 'Duration in timestamp',
    sqliteName: 'duration_in_timestamp',
    sqliteType: 'TEXT',
  },
  {
    key: 'duration',
    label: 'Duration',
    sqliteName: 'duration',
    sqliteType: 'TEXT',
  },
  {
    key: 'uploadedTime',
    label: 'Uploaded Time',
    sqliteName: 'uploaded_time',
    sqliteType: 'TEXT',
  },
  {
    key: 'videoUrl',
    label: 'Video url',
    sqliteName: 'video_url',
    sqliteType: 'TEXT',
  },
  { key: 'tags', label: 'Tags', sqliteName: 'tags', sqliteType: 'TEXT' },
  {
    key: 'descriptionTags',
    label: 'Tags (in description)',
    sqliteName: 'tags_in_description',
    sqliteType: 'TEXT',
  },
  {
    key: 'emails',
    label: 'Emails (in description)',
    sqliteName: 'emails_in_description',
    sqliteType: 'TEXT',
  },
  {
    key: 'links',
    label: 'Links (in description)',
    sqliteName: 'links_in_description',
    sqliteType: 'TEXT',
  },
];
