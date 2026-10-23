import type {
  GuardCollectionDetail,
  GuardItem,
} from '@/lib/playlist-guard/types';

import { YoutubeAccountError, youtubeGet } from './google';

type Page<T> = { items?: T[]; nextPageToken?: string };
type Video = {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    categoryId?: string;
    thumbnails?: { medium?: { url: string }; default?: { url: string } };
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
};
type PlaylistItem = { contentDetails?: { videoId?: string } };
type Subscription = {
  snippet: {
    title: string;
    resourceId: { channelId: string };
    thumbnails?: { default?: { url: string } };
  };
};
function duration(value = '') {
  const match = value.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return '';
  const seconds =
    +(match[1] || 0) * 86400 +
    +(match[2] || 0) * 3600 +
    +(match[3] || 0) * 60 +
    +(match[4] || 0);
  return seconds >= 3600
    ? `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
function videoItem(video: Video, index: number): GuardItem {
  return {
    id: video.id,
    kind: 'video',
    title: video.snippet.title.slice(0, 300),
    channel: video.snippet.channelTitle.slice(0, 120),
    url: 'https://www.youtube.com/watch?v=' + encodeURIComponent(video.id),
    thumbnail: (
      video.snippet.thumbnails?.medium?.url ||
      video.snippet.thumbnails?.default?.url ||
      ''
    ).slice(0, 500),
    duration: duration(video.contentDetails?.duration),
    position: index + 1,
    views:
      video.statistics?.viewCount &&
      /^\d+$/.test(video.statistics.viewCount) &&
      Number.isSafeInteger(Number(video.statistics.viewCount))
        ? Number(video.statistics.viewCount)
        : undefined,
  };
}
export async function scanAuthorizedYoutube(
  collection: Pick<GuardCollectionDetail, 'source' | 'url'>,
  token: string,
  fetcher: typeof fetch = fetch
) {
  // Uncapped scans must still finish before the guard's three-minute lease.
  const signal = AbortSignal.timeout(150_000);
  const scanFetch: typeof fetch = (input, init) =>
    fetcher(input, {
      ...init,
      signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal,
    });
  const get = <T>(path: string, params: Record<string, string>) =>
    youtubeGet<Page<T>>(path, params, token, scanFetch);
  async function all<T>(path: string, params: Record<string, string>) {
    const items: T[] = [];
    let next = '';
    const seen = new Set<string>();
    do {
      if (seen.has(next))
        throw new YoutubeAccountError(
          'incomplete_scan',
          'YouTube returned an incomplete page sequence. Previous snapshots were preserved.',
          502
        );
      seen.add(next);
      const page = await get<T>(path, {
        ...params,
        maxResults: '50',
        ...(next ? { pageToken: next } : {}),
      });
      if (
        !Array.isArray(page.items) ||
        (page.nextPageToken && !page.items.length)
      )
        throw new YoutubeAccountError(
          'incomplete_scan',
          'YouTube returned an incomplete response. Previous snapshots were preserved.',
          502
        );
      items.push(...page.items);
      next = page.nextPageToken || '';
    } while (next);
    return { items, complete: true };
  }
  if (collection.source === 'subscriptions') {
    const page = await all<Subscription>('subscriptions', {
      part: 'snippet',
      mine: 'true',
      order: 'alphabetical',
    });
    return {
      complete: page.complete,
      items: page.items.map(
        (item, index): GuardItem => ({
          id: item.snippet.resourceId.channelId,
          kind: 'channel',
          title: item.snippet.title.slice(0, 300),
          channel: item.snippet.title.slice(0, 120),
          url:
            'https://www.youtube.com/channel/' +
            encodeURIComponent(item.snippet.resourceId.channelId),
          thumbnail: (item.snippet.thumbnails?.default?.url || '').slice(
            0,
            500
          ),
          duration: '',
          position: index + 1,
        })
      ),
    };
  }
  if (
    collection.source === 'liked_videos' ||
    collection.source === 'liked_music'
  ) {
    const page = await all<Video>('videos', {
      part: 'snippet,contentDetails,statistics',
      myRating: 'like',
    });
    return {
      complete: page.complete,
      items: page.items
        .filter(
          (v) =>
            collection.source !== 'liked_music' || v.snippet.categoryId === '10'
        )
        .map(videoItem),
    };
  }
  if (collection.source !== 'private_playlist')
    throw new YoutubeAccountError(
      'invalid_source',
      'This source does not use a private YouTube connection.'
    );
  const playlistId = new URL(collection.url).searchParams.get('list');
  if (!playlistId)
    throw new YoutubeAccountError(
      'invalid_source',
      'Enter a YouTube playlist URL.'
    );
  const page = await all<PlaylistItem>('playlistItems', {
    part: 'contentDetails',
    playlistId,
  });
  if (!page.complete) return { complete: false, items: [] };
  const ids = [
    ...new Set(
      page.items
        .map((v) => v.contentDetails?.videoId)
        .filter((id): id is string => !!id)
    ),
  ];
  const videos = new Map<string, Video>();
  for (let i = 0; i < ids.length; i += 50) {
    const batch = await get<Video>('videos', {
      part: 'snippet,contentDetails,statistics',
      id: ids.slice(i, i + 50).join(','),
    });
    if (!Array.isArray(batch.items))
      throw new YoutubeAccountError(
        'incomplete_scan',
        'YouTube returned an incomplete response. Previous snapshots were preserved.',
        502
      );
    for (const video of batch.items) videos.set(video.id, video);
  }
  return {
    complete: true,
    items: ids.flatMap((id, index) =>
      videos.has(id) ? [videoItem(videos.get(id)!, index)] : []
    ),
  };
}
