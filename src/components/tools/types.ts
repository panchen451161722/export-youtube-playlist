export type PlaylistVideo = {
  position: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  durationText: string;
  durationSeconds: number | null;
  durationMinutes: number | null;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  videoId: string;
  url: string;
  tags: string[];
  descriptionTags: string[];
  descriptionEmails: string[];
  descriptionLinks: string[];
};

export type PlaylistExport = {
  playlistId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videos: PlaylistVideo[];
  returnedItems: number;
  totalItems: number;
  scannedCount: number;
  skippedCount: number;
  truncated: boolean;
  limit: number;
};

export type ToolFaq = {
  question: string;
  answer: string;
};

export type ToolLink = {
  title: string;
  description: string;
  href: string;
};

export type ToolStep = {
  title: string;
  description: string;
};

export type VideoToolData = {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  thumbnails: Record<
    'default' | 'medium' | 'high' | 'standard' | 'maxres',
    { url: string; width: number; height: number }
  >;
  tags: string[];
  descriptionTags: string[];
  emails: string[];
  links: string[];
  viewCount: string;
  likeCount: string;
  commentCount: string;
  duration: string;
  durationText: string;
  durationSeconds: number | null;
  regionRestriction: {
    type: 'none' | 'allowed' | 'blocked';
    regions: string[];
  };
  embeddable: boolean;
};

export type ChannelMediaType = 'all' | 'videos' | 'shorts' | 'live';

export type ChannelVideo = {
  position: number;
  videoId: string;
  title: string;
  url: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  duration: string;
  durationText: string;
  durationSeconds: number | null;
  durationMinutes: number | null;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  tags: string[];
  descriptionTags: string[];
  emails: string[];
  links: string[];
  mediaType: Exclude<ChannelMediaType, 'all'>;
};

export type ChannelPlaylist = {
  playlistId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoCount: number;
  publishedAt: string;
  url: string;
};

export type ChannelToolData = {
  channelId: string;
  title: string;
  description: string;
  customUrl: string;
  country: string;
  thumbnailUrl: string;
  rawKeywords: string;
  keywords: string[];
  uploadsPlaylistId: string;
  uploadsPlaylistUrl: string;
  subscribeUrl: string;
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
  logos: Record<string, string>;
  banners: Record<string, string>;
  videos: ChannelVideo[];
  playlists: ChannelPlaylist[];
  returnedVideos: number;
  totalVideos: number;
  truncated: boolean;
};
