import type { ChannelVideo } from './types';

function count(value: string) {
  return /^\d+$/.test(value) ? Number(value) : 0;
}

export function analyzeChannelVideos(videos: ChannelVideo[]) {
  const totalDuration = videos.reduce(
    (total, video) => total + (video.durationSeconds ?? 0),
    0
  );
  const totalViews = videos.reduce(
    (total, video) => total + count(video.viewCount),
    0
  );
  const totalLikes = videos.reduce(
    (total, video) => total + count(video.likeCount),
    0
  );
  const totalComments = videos.reduce(
    (total, video) => total + count(video.commentCount),
    0
  );
  const withDuration = videos.filter((video) => video.durationSeconds !== null);
  const orderedDuration = [...withDuration].sort(
    (a, b) => (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0)
  );
  const topByViews = [...videos]
    .sort((a, b) => count(b.viewCount) - count(a.viewCount))
    .slice(0, 10);

  return {
    videoCount: videos.length,
    totalDuration,
    averageDuration:
      withDuration.length > 0 ? totalDuration / withDuration.length : 0,
    totalViews,
    averageViews: videos.length > 0 ? totalViews / videos.length : 0,
    totalLikes,
    averageLikes: videos.length > 0 ? totalLikes / videos.length : 0,
    totalComments,
    averageComments: videos.length > 0 ? totalComments / videos.length : 0,
    engagementRate:
      totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0,
    likeRate: totalViews > 0 ? (totalLikes / totalViews) * 100 : 0,
    commentRate: totalViews > 0 ? (totalComments / totalViews) * 100 : 0,
    longestVideo: orderedDuration[0] ?? null,
    shortestVideo: orderedDuration.at(-1) ?? null,
    topByViews,
    videosCount: videos.filter((video) => video.mediaType === 'videos').length,
    shortsCount: videos.filter((video) => video.mediaType === 'shorts').length,
    liveCount: videos.filter((video) => video.mediaType === 'live').length,
  };
}

export type ChannelVideoSort =
  | 'original'
  | 'newest'
  | 'oldest'
  | 'views'
  | 'likes'
  | 'comments'
  | 'longest'
  | 'shortest'
  | 'title-az'
  | 'title-za';

export function sortChannelVideos(
  videos: ChannelVideo[],
  sort: ChannelVideoSort
) {
  const result = [...videos];
  if (sort === 'original') return result;
  if (sort === 'newest') {
    return result.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }
  if (sort === 'oldest') {
    return result.sort(
      (a, b) =>
        new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    );
  }
  if (sort === 'views') {
    return result.sort((a, b) => count(b.viewCount) - count(a.viewCount));
  }
  if (sort === 'likes') {
    return result.sort((a, b) => count(b.likeCount) - count(a.likeCount));
  }
  if (sort === 'comments') {
    return result.sort((a, b) => count(b.commentCount) - count(a.commentCount));
  }
  if (sort === 'longest') {
    return result.sort(
      (a, b) => (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0)
    );
  }
  if (sort === 'shortest') {
    return result.sort(
      (a, b) => (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0)
    );
  }
  if (sort === 'title-za') {
    return result.sort((a, b) => b.title.localeCompare(a.title));
  }
  return result.sort((a, b) => a.title.localeCompare(b.title));
}

export function formatSeconds(value: number) {
  const rounded = Math.max(0, Math.round(value));
  const hours = Math.floor(rounded / 3_600);
  const minutes = Math.floor((rounded % 3_600) / 60);
  const seconds = rounded % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
