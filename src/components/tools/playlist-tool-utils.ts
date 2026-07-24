import type { PlaylistVideo } from './types';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

export type NumericSummary = {
  total: number | null;
  average: number | null;
  available: number;
};

export type RankedVideo = {
  video: PlaylistVideo;
  value: number;
};

export type RankedChannel = {
  channelTitle: string;
  videoCount: number;
};

export type PlaylistAnalysis = {
  videoCount: number;
  duration: NumericSummary;
  views: NumericSummary;
  likes: NumericSummary;
  comments: NumericSummary;
  uniqueChannelCount: number;
  watchTimes: {
    normal: number | null;
    speed125: number | null;
    speed15: number | null;
    speed2: number | null;
  };
  longestVideo: PlaylistVideo | null;
  shortestVideo: PlaylistVideo | null;
  topVideosByViews: RankedVideo[];
  topChannels: RankedChannel[];
};

export function isValidYouTubePlaylistUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    const playlistId = url.searchParams.get('list') ?? '';
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      YOUTUBE_HOSTS.has(url.hostname.toLowerCase()) &&
      /^[A-Za-z0-9_-]{10,80}$/.test(playlistId)
    );
  } catch {
    return false;
  }
}

export function parseOptionalCount(value: string): number | null {
  if (!value.trim()) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function summarize(values: Array<number | null>): NumericSummary {
  const availableValues = values.filter(
    (value): value is number => value !== null && Number.isFinite(value)
  );
  if (availableValues.length === 0) {
    return { total: null, average: null, available: 0 };
  }

  const total = availableValues.reduce((sum, value) => sum + value, 0);
  return {
    total,
    average: total / availableValues.length,
    available: availableValues.length,
  };
}

function durationOf(video: PlaylistVideo): number | null {
  const duration = video.durationSeconds;
  return duration !== null && Number.isFinite(duration) && duration >= 0
    ? duration
    : null;
}

export function analyzePlaylist(
  videos: PlaylistVideo[],
  topVideoLimit = 5,
  topChannelLimit = 5
): PlaylistAnalysis {
  const duration = summarize(videos.map(durationOf));
  const views = summarize(
    videos.map((video) => parseOptionalCount(video.viewCount))
  );
  const likes = summarize(
    videos.map((video) => parseOptionalCount(video.likeCount))
  );
  const comments = summarize(
    videos.map((video) => parseOptionalCount(video.commentCount))
  );

  const channels = new Map<string, number>();
  for (const video of videos) {
    const channelTitle = video.channelTitle.trim();
    if (!channelTitle) continue;
    channels.set(channelTitle, (channels.get(channelTitle) ?? 0) + 1);
  }

  const videosWithDuration = videos.filter(
    (video) => durationOf(video) !== null
  );
  const byDurationAscending = [...videosWithDuration].sort(
    (a, b) => (durationOf(a) ?? 0) - (durationOf(b) ?? 0)
  );

  const topVideosByViews = videos
    .map((video) => ({
      video,
      value: parseOptionalCount(video.viewCount),
    }))
    .filter(
      (entry): entry is RankedVideo =>
        entry.value !== null && Number.isFinite(entry.value)
    )
    .sort((a, b) => b.value - a.value || a.video.position - b.video.position)
    .slice(0, Math.max(0, topVideoLimit));

  const topChannels = Array.from(channels, ([channelTitle, videoCount]) => ({
    channelTitle,
    videoCount,
  }))
    .sort(
      (a, b) =>
        b.videoCount - a.videoCount ||
        a.channelTitle.localeCompare(b.channelTitle)
    )
    .slice(0, Math.max(0, topChannelLimit));

  return {
    videoCount: videos.length,
    duration,
    views,
    likes,
    comments,
    uniqueChannelCount: channels.size,
    watchTimes: {
      normal: duration.total,
      speed125: duration.total === null ? null : duration.total / 1.25,
      speed15: duration.total === null ? null : duration.total / 1.5,
      speed2: duration.total === null ? null : duration.total / 2,
    },
    longestVideo: byDurationAscending[byDurationAscending.length - 1] ?? null,
    shortestVideo: byDurationAscending[0] ?? null,
    topVideosByViews,
    topChannels,
  };
}

export function formatDurationClock(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;

  return [hours, minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}
