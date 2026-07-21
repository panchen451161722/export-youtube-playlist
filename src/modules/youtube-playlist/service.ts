import { envConfigs } from '@/config';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PLAYLIST_ITEMS = 500;
const PAGE_SIZE = 50;

const ALLOWED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

export type PlaylistServiceErrorCode =
  | 'configuration'
  | 'invalid_url'
  | 'private_or_not_found'
  | 'quota'
  | 'timeout'
  | 'network'
  | 'upstream';

const PUBLIC_ERROR_MESSAGES: Record<PlaylistServiceErrorCode, string> = {
  configuration:
    'youtube_api_key_missing: Playlist preview is not configured yet. Add a YouTube API key and try again.',
  invalid_url:
    'invalid_playlist_url: Enter a valid YouTube playlist URL with a list parameter.',
  private_or_not_found:
    'playlist_not_found: This playlist is private, deleted, or could not be found.',
  quota:
    'quota_exceeded: The YouTube API quota is temporarily exhausted. Please try again later.',
  timeout:
    'request_timeout: YouTube took too long to respond. Please try again.',
  network:
    'network_request_failed: YouTube could not be reached. Please check the connection and retry.',
  upstream:
    'upstream_request_failed: YouTube could not process this playlist right now. Please try again.',
};

const ERROR_STATUS: Record<PlaylistServiceErrorCode, number> = {
  configuration: 503,
  invalid_url: 400,
  private_or_not_found: 404,
  quota: 503,
  timeout: 504,
  network: 502,
  upstream: 502,
};

export class PlaylistServiceError extends Error {
  readonly code: PlaylistServiceErrorCode;
  readonly status: number;

  constructor(code: PlaylistServiceErrorCode) {
    super(PUBLIC_ERROR_MESSAGES[code]);
    this.name = 'PlaylistServiceError';
    this.code = code;
    this.status = ERROR_STATUS[code];
  }
}

export type PlaylistVideo = {
  position: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  durationSeconds: number | null;
  durationMinutes: number | null;
  durationText: string;
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

type YouTubeErrorResponse = {
  error?: {
    errors?: Array<{ reason?: string }>;
  };
};

type PlaylistListResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    contentDetails?: { itemCount?: number };
  }>;
};

type PlaylistItemsResponse = {
  nextPageToken?: string;
  pageInfo?: { totalResults?: number };
  items?: Array<{
    snippet?: {
      position?: number;
      title?: string;
      channelTitle?: string;
      publishedAt?: string;
      resourceId?: { videoId?: string };
    };
    contentDetails?: {
      videoId?: string;
      videoPublishedAt?: string;
    };
  }>;
};

type VideosListResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: Record<string, { url?: string }>;
      tags?: string[];
    };
    contentDetails?: { duration?: string };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
};

type RawPlaylistItem = NonNullable<PlaylistItemsResponse['items']>[number];
type RawVideo = NonNullable<VideosListResponse['items']>[number];

/**
 * Extract a playlist ID without ever using the supplied URL as a fetch target.
 */
export function parseYouTubePlaylistUrl(value: string): string {
  const input = value.trim();
  if (!input || input.length > 2_048) {
    throw new PlaylistServiceError('invalid_url');
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new PlaylistServiceError('invalid_url');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    !ALLOWED_YOUTUBE_HOSTS.has(hostname)
  ) {
    throw new PlaylistServiceError('invalid_url');
  }

  const playlistId = url.searchParams.get('list')?.trim() ?? '';
  if (!/^[a-zA-Z0-9_-]{10,128}$/.test(playlistId)) {
    throw new PlaylistServiceError('invalid_url');
  }

  return playlistId;
}

export type YouTubeDuration = {
  seconds: number | null;
  minutes: number | null;
  timestamp: string;
  text: string;
};

function durationUnit(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

/** Convert an ISO 8601 YouTube duration into export-friendly representations. */
export function parseYouTubeDuration(
  value: string | undefined
): YouTubeDuration {
  if (!value) {
    return { seconds: null, minutes: null, timestamp: '', text: '' };
  }
  const match = value.match(
    /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/
  );
  if (!match) {
    return {
      seconds: null,
      minutes: null,
      timestamp: value,
      text: value,
    };
  }

  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0) + days * 24;
  const minutes = Number(match[3] || 0);
  const seconds = Math.floor(Number(match[4] || 0));
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const timestamp =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${minutes}:${String(seconds).padStart(2, '0')}`;
  const textParts: string[] = [];
  if (hours > 0) textParts.push(durationUnit(hours, 'Hour', 'Hours'));
  if (minutes > 0) textParts.push(durationUnit(minutes, 'Minute', 'Minutes'));
  if (seconds > 0 || textParts.length === 0) {
    textParts.push(durationUnit(seconds, 'Second', 'Seconds'));
  }

  return {
    seconds: totalSeconds,
    minutes: Number((totalSeconds / 60).toFixed(2)),
    timestamp,
    text: textParts.join(', '),
  };
}

/** Convert an ISO 8601 YouTube duration into H:MM:SS or M:SS. */
export function formatYouTubeDuration(value: string | undefined): string {
  return parseYouTubeDuration(value).timestamp;
}

function uniqueValues(values: string[], caseInsensitive = false): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = caseInsensitive ? value.toLowerCase() : value;
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanDescriptionLink(value: string): string {
  let cleaned = value.replace(/[.,;:!?]+$/g, '');
  for (const [opening, closing] of [
    ['(', ')'],
    ['[', ']'],
    ['{', '}'],
  ] as const) {
    while (
      cleaned.endsWith(closing) &&
      cleaned.split(closing).length > cleaned.split(opening).length
    ) {
      cleaned = cleaned.slice(0, -1);
    }
  }
  return cleaned;
}

export function extractDescriptionMetadata(description: string): {
  tags: string[];
  emails: string[];
  links: string[];
} {
  const tags = uniqueValues(
    description.match(/#[\p{L}\p{N}_-]+/gu) ?? [],
    true
  );
  const emails = uniqueValues(
    description.match(
      /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+/gi
    ) ?? [],
    true
  );
  const links = uniqueValues(
    (description.match(/https?:\/\/[^\s<>"']+/gi) ?? [])
      .map(cleanDescriptionLink)
      .filter(Boolean)
  );
  return { tags, emails, links };
}

function getBestThumbnail(
  thumbnails: Record<string, { url?: string }> | undefined
): string {
  if (!thumbnails) return '';
  for (const key of ['maxres', 'standard', 'high', 'medium', 'default']) {
    const url = thumbnails[key]?.url;
    if (url) return url;
  }
  return '';
}

function mapApiFailure(status: number, body: unknown): PlaylistServiceError {
  const reasons =
    (body as YouTubeErrorResponse | undefined)?.error?.errors
      ?.map((item) => item.reason)
      .filter((reason): reason is string => Boolean(reason)) ?? [];

  if (
    reasons.some((reason) =>
      [
        'quotaExceeded',
        'dailyLimitExceeded',
        'dailyLimitExceededUnreg',
        'rateLimitExceeded',
      ].includes(reason)
    )
  ) {
    return new PlaylistServiceError('quota');
  }

  if (
    status === 404 ||
    reasons.some((reason) =>
      [
        'playlistNotFound',
        'playlistForbidden',
        'notFound',
        'forbidden',
      ].includes(reason)
    )
  ) {
    return new PlaylistServiceError('private_or_not_found');
  }

  if (
    reasons.some((reason) =>
      ['keyInvalid', 'accessNotConfigured', 'ipRefererBlocked'].includes(reason)
    )
  ) {
    return new PlaylistServiceError('configuration');
  }

  return new PlaylistServiceError('upstream');
}

async function requestYouTubeApi<T>(params: {
  resource: 'playlists' | 'playlistItems' | 'videos';
  search: Record<string, string>;
  apiKey: string;
  signal: AbortSignal;
  fetchImpl: typeof fetch;
}): Promise<T> {
  // The origin and path are code-owned constants. User input is only placed in
  // encoded query parameters, so this cannot become an SSRF primitive.
  const url = new URL(params.resource, YOUTUBE_API_BASE);
  for (const [key, value] of Object.entries(params.search)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('key', params.apiKey);

  let response: Response;
  try {
    response = await params.fetchImpl(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: params.signal,
    });
  } catch (error) {
    if (params.signal.aborted || (error as Error)?.name === 'AbortError') {
      throw new PlaylistServiceError('timeout');
    }
    throw new PlaylistServiceError('network');
  }

  const body = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw mapApiFailure(response.status, body);
  return body;
}

function normalizeVideo(
  item: RawPlaylistItem,
  video: RawVideo
): PlaylistVideo | null {
  const videoId = video.id || item.contentDetails?.videoId;
  if (!videoId || !video.snippet?.title) return null;
  const description = video.snippet.description || '';
  const duration = parseYouTubeDuration(video.contentDetails?.duration);
  const descriptionMetadata = extractDescriptionMetadata(description);
  const tags = (video.snippet.tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

  return {
    position: (item.snippet?.position ?? 0) + 1,
    title: video.snippet.title,
    description,
    thumbnailUrl: getBestThumbnail(video.snippet.thumbnails),
    channelTitle:
      video.snippet.channelTitle || item.snippet?.channelTitle || '',
    publishedAt:
      item.contentDetails?.videoPublishedAt ||
      video.snippet.publishedAt ||
      item.snippet?.publishedAt ||
      '',
    duration: duration.timestamp,
    durationSeconds: duration.seconds,
    durationMinutes: duration.minutes,
    durationText: duration.text,
    viewCount: video.statistics?.viewCount || '',
    likeCount: video.statistics?.likeCount || '',
    commentCount: video.statistics?.commentCount || '',
    videoId,
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
    tags,
    descriptionTags: descriptionMetadata.tags,
    descriptionEmails: descriptionMetadata.emails,
    descriptionLinks: descriptionMetadata.links,
  };
}

/**
 * Load public playlist metadata and up to 500 exportable videos.
 * Playlist data is returned to the caller and is never persisted.
 */
export async function getPlaylistExport(params: {
  playlistUrl: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<PlaylistExport> {
  const playlistId = parseYouTubePlaylistUrl(params.playlistUrl);
  const apiKey = (params.apiKey ?? envConfigs.youtube_api_key).trim();
  if (!apiKey) throw new PlaylistServiceError('configuration');

  const fetchImpl = params.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const playlistResponse = await requestYouTubeApi<PlaylistListResponse>({
      resource: 'playlists',
      search: {
        part: 'snippet,contentDetails',
        id: playlistId,
        maxResults: '1',
      },
      apiKey,
      signal: controller.signal,
      fetchImpl,
    });
    const playlist = playlistResponse.items?.[0];
    if (!playlist) throw new PlaylistServiceError('private_or_not_found');

    const rawItems: RawPlaylistItem[] = [];
    const seenPageTokens = new Set<string>();
    let nextPageToken = '';
    let pageTotal = 0;

    do {
      const search: Record<string, string> = {
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: String(PAGE_SIZE),
      };
      if (nextPageToken) search.pageToken = nextPageToken;

      const page = await requestYouTubeApi<PlaylistItemsResponse>({
        resource: 'playlistItems',
        search,
        apiKey,
        signal: controller.signal,
        fetchImpl,
      });
      pageTotal = Math.max(pageTotal, page.pageInfo?.totalResults ?? 0);
      rawItems.push(
        ...(page.items ?? []).slice(0, MAX_PLAYLIST_ITEMS - rawItems.length)
      );

      const token = page.nextPageToken ?? '';
      if (!token || seenPageTokens.has(token)) break;
      seenPageTokens.add(token);
      nextPageToken = token;
    } while (rawItems.length < MAX_PLAYLIST_ITEMS);

    const videoIds = rawItems
      .map(
        (item) =>
          item.contentDetails?.videoId ||
          item.snippet?.resourceId?.videoId ||
          ''
      )
      .filter(Boolean);
    const batches: string[][] = [];
    for (let index = 0; index < videoIds.length; index += PAGE_SIZE) {
      batches.push(videoIds.slice(index, index + PAGE_SIZE));
    }

    const videoResponses = await Promise.all(
      batches.map((ids) =>
        requestYouTubeApi<VideosListResponse>({
          resource: 'videos',
          search: {
            part: 'snippet,contentDetails,statistics',
            id: ids.join(','),
            maxResults: String(PAGE_SIZE),
          },
          apiKey,
          signal: controller.signal,
          fetchImpl,
        })
      )
    );
    const videosById = new Map<string, RawVideo>();
    for (const video of videoResponses.flatMap(
      (response) => response.items ?? []
    )) {
      if (video.id) videosById.set(video.id, video);
    }

    const items = rawItems.flatMap((item) => {
      const videoId =
        item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '';
      const video = videosById.get(videoId);
      if (!video) return [];
      const normalized = normalizeVideo(item, video);
      return normalized ? [normalized] : [];
    });
    const totalCount = Math.max(
      playlist.contentDetails?.itemCount ?? 0,
      pageTotal,
      rawItems.length
    );

    return {
      playlistId: playlist.id || playlistId,
      title: playlist.snippet?.title || 'Untitled playlist',
      channelTitle: playlist.snippet?.channelTitle || '',
      thumbnailUrl: getBestThumbnail(playlist.snippet?.thumbnails),
      videos: items,
      returnedItems: items.length,
      totalItems: totalCount,
      scannedCount: rawItems.length,
      skippedCount: rawItems.length - items.length,
      truncated: totalCount > rawItems.length,
      limit: MAX_PLAYLIST_ITEMS,
    };
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
