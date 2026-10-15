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
