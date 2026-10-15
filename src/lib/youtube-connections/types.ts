export type YoutubeConnection = {
  id: string;
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  status: 'connected' | 'reconnect' | 'disconnected';
};
export type YoutubeConnectionsOverview = {
  accounts: YoutubeConnection[];
  configured: boolean;
};
export const YOUTUBE_READONLY_SCOPE =
  'https://www.googleapis.com/auth/youtube.readonly';
export const YOUTUBE_RETURN_PATHS = [
  '/settings/collections',
  '/zh/settings/collections',
  '/youtube-playlist-backup',
  '/zh/youtube-playlist-backup',
] as const;
export type YoutubeReturnPath = (typeof YOUTUBE_RETURN_PATHS)[number];

export const YOUTUBE_CONNECTION_NOTICES = [
  'connected',
  'denied',
  'failed',
  'invalid_state',
  'channel_missing',
  'scope_missing',
  'offline_missing',
  'wrong_channel',
  'oauth_failed',
  'youtube_read_failed',
  'not_configured',
  'session_missing',
] as const;
export type YoutubeConnectionNotice =
  (typeof YOUTUBE_CONNECTION_NOTICES)[number];
export function isYoutubeConnectionNotice(
  value: unknown
): value is YoutubeConnectionNotice {
  return (
    typeof value === 'string' &&
    (YOUTUBE_CONNECTION_NOTICES as readonly string[]).includes(value)
  );
}
