import { envConfigs } from '@/config';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/';
const VIDEO_REQUEST_TIMEOUT_MS = 20_000;
const CHANNEL_REQUEST_TIMEOUT_MS = 120_000;
const PAGE_SIZE = 50;
const MAX_CHANNEL_VIDEOS = 5_000;
const MAX_CHANNEL_PLAYLISTS = 500;
const CACHE_TTL_MS = 5 * 60_000;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

export type YouTubePublicErrorCode =
  | 'configuration'
  | 'invalid_url'
  | 'not_found'
  | 'quota'
  | 'timeout'
  | 'network'
  | 'upstream';

const ERROR_STATUS: Record<YouTubePublicErrorCode, number> = {
  configuration: 503,
  invalid_url: 400,
  not_found: 404,
  quota: 503,
  timeout: 504,
  network: 502,
  upstream: 502,
};

const ERROR_MESSAGES: Record<YouTubePublicErrorCode, string> = {
  configuration:
    'youtube_api_key_missing: YouTube tools are not configured yet.',
  invalid_url: 'invalid_youtube_url: Enter a valid YouTube URL or identifier.',
  not_found: 'youtube_resource_not_found: This public resource was not found.',
  quota: 'quota_exceeded: The YouTube API quota is temporarily exhausted.',
  timeout: 'request_timeout: YouTube took too long to respond.',
  network: 'network_request_failed: YouTube could not be reached.',
  upstream: 'upstream_request_failed: YouTube could not process this request.',
};

export class YouTubePublicError extends Error {
  readonly code: YouTubePublicErrorCode;
  readonly status: number;

  constructor(code: YouTubePublicErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'YouTubePublicError';
    this.code = code;
    this.status = ERROR_STATUS[code];
  }
}

type Thumbnail = { url?: string; width?: number; height?: number };
type ThumbnailMap = Record<string, Thumbnail>;

type VideoResource = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    liveBroadcastContent?: string;
    thumbnails?: ThumbnailMap;
    tags?: string[];
  };
  contentDetails?: {
    duration?: string;
    regionRestriction?: { allowed?: string[]; blocked?: string[] };
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  status?: { privacyStatus?: string; embeddable?: boolean };
  liveStreamingDetails?: {
    scheduledStartTime?: string;
    actualStartTime?: string;
  };
};

type VideosResponse = {
  items?: VideoResource[];
  error?: { errors?: Array<{ reason?: string }> };
};

type ChannelResource = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    country?: string;
    thumbnails?: ThumbnailMap;
  };
  contentDetails?: {
    relatedPlaylists?: { uploads?: string };
  };
  statistics?: {
    viewCount?: string;
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
    videoCount?: string;
  };
  brandingSettings?: {
    channel?: { keywords?: string };
    image?: { bannerExternalUrl?: string };
  };
};

type ChannelsResponse = {
  items?: ChannelResource[];
  error?: { errors?: Array<{ reason?: string }> };
};

type PlaylistItemResource = {
  snippet?: {
    position?: number;
    publishedAt?: string;
    resourceId?: { videoId?: string };
  };
  contentDetails?: { videoId?: string; videoPublishedAt?: string };
};

type PlaylistItemsResponse = {
  nextPageToken?: string;
  pageInfo?: { totalResults?: number };
  items?: PlaylistItemResource[];
  error?: { errors?: Array<{ reason?: string }> };
};

type PlaylistResource = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    thumbnails?: ThumbnailMap;
    publishedAt?: string;
  };
  contentDetails?: { itemCount?: number };
};

type PlaylistsResponse = {
  nextPageToken?: string;
  items?: PlaylistResource[];
  error?: { errors?: Array<{ reason?: string }> };
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

type ChannelLookup =
  | { kind: 'id'; value: string }
  | { kind: 'handle'; value: string }
  | { kind: 'username'; value: string }
  | { kind: 'video'; value: string };

type CacheEntry<T> = { expiresAt: number; value: T };
const cache = new Map<string, CacheEntry<unknown>>();

function readCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function writeCache<T>(key: string, value: T): T {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}

function mapApiError(status: number, body: unknown): YouTubePublicError {
  const reasons =
    typeof body === 'object' && body !== null
      ? ((
          body as {
            error?: { errors?: Array<{ reason?: string }> };
          }
        ).error?.errors?.map((item) => item.reason || '') ?? [])
      : [];

  if (
    status === 403 &&
    reasons.some((reason) =>
      ['quotaExceeded', 'dailyLimitExceeded'].includes(reason)
    )
  ) {
    return new YouTubePublicError('quota');
  }
  if (
    reasons.some((reason) =>
      ['keyInvalid', 'accessNotConfigured', 'ipRefererBlocked'].includes(reason)
    )
  ) {
    return new YouTubePublicError('configuration');
  }
  if (status === 404) return new YouTubePublicError('not_found');
  return new YouTubePublicError('upstream');
}

async function requestApi<T>(params: {
  resource: 'videos' | 'channels' | 'playlistItems' | 'playlists';
  search: Record<string, string>;
  apiKey: string;
  signal: AbortSignal;
  fetchImpl: typeof fetch;
}): Promise<T> {
  const url = new URL(params.resource, YOUTUBE_API_BASE);
  for (const [key, value] of Object.entries(params.search)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('key', params.apiKey);

  let response: Response;
  try {
    response = await params.fetchImpl.call(globalThis, url.toString(), {
      headers: { accept: 'application/json' },
      signal: params.signal,
    });
  } catch (error) {
    if (params.signal.aborted || (error as Error)?.name === 'AbortError') {
      throw new YouTubePublicError('timeout');
    }
    console.error('youtube public API request failed', {
      errorName: error instanceof Error ? error.name : typeof error,
    });
    throw new YouTubePublicError('network');
  }

  const body = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw mapApiError(response.status, body);
  return body;
}

function assertYouTubeUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new YouTubePublicError('invalid_url');
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !YOUTUBE_HOSTS.has(hostname)
  ) {
    throw new YouTubePublicError('invalid_url');
  }
  return url;
}

export function parseYouTubeVideoId(value: string): string {
  const input = value.trim();
  if (!input || input.length > 2_048) {
    throw new YouTubePublicError('invalid_url');
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;

  const url = assertYouTubeUrl(input);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const pathParts = url.pathname.split('/').filter(Boolean);
  const candidate = hostname.endsWith('youtu.be')
    ? pathParts[0]
    : url.searchParams.get('v') ||
      (['shorts', 'embed', 'live'].includes(pathParts[0] || '')
        ? pathParts[1]
        : '');
  if (!candidate || !/^[A-Za-z0-9_-]{11}$/.test(candidate)) {
    throw new YouTubePublicError('invalid_url');
  }
  return candidate;
}

export function parseYouTubeChannelInput(value: string): ChannelLookup {
  const input = value.trim();
  if (!input || input.length > 2_048) {
    throw new YouTubePublicError('invalid_url');
  }
  if (/^UC[A-Za-z0-9_-]{22}$/.test(input)) {
    return { kind: 'id', value: input };
  }
  if (/^@?[A-Za-z0-9._-]{3,100}$/.test(input)) {
    return { kind: 'handle', value: input.replace(/^@/, '') };
  }

  const url = assertYouTubeUrl(input);
  try {
    return { kind: 'video', value: parseYouTubeVideoId(input) };
  } catch {
    // Channel URLs continue through the path parser below.
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'channel' && /^UC[A-Za-z0-9_-]{22}$/.test(parts[1] || '')) {
    return { kind: 'id', value: parts[1] };
  }
  if (parts[0]?.startsWith('@')) {
    return { kind: 'handle', value: parts[0].slice(1) };
  }
  if (parts[0] === 'user' && parts[1]) {
    return { kind: 'username', value: parts[1] };
  }
  if (['c', 'channel'].includes(parts[0] || '') && parts[1]) {
    return { kind: 'handle', value: parts[1] };
  }
  throw new YouTubePublicError('invalid_url');
}

function getBestThumbnail(thumbnails?: ThumbnailMap): string {
  if (!thumbnails) return '';
  for (const key of ['maxres', 'standard', 'high', 'medium', 'default']) {
    const url = thumbnails[key]?.url;
    if (url) return url;
  }
  return Object.values(thumbnails).find((item) => item.url)?.url || '';
}

function parseDuration(value?: string) {
  const match = value?.match(
    /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/
  );
  if (!match) {
    return {
      seconds: null,
      minutes: null,
      timestamp: value || '',
      text: value || '',
    };
  }
  const totalSeconds =
    Number(match[1] || 0) * 86_400 +
    Number(match[2] || 0) * 3_600 +
    Number(match[3] || 0) * 60 +
    Math.floor(Number(match[4] || 0));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const textParts: string[] = [];
  if (hours > 0) textParts.push(`${hours} Hours`);
  if (minutes > 0) textParts.push(`${minutes} Minutes`);
  if (seconds > 0 || textParts.length === 0) {
    textParts.push(`${seconds} Seconds`);
  }
  return {
    seconds: totalSeconds,
    minutes: Number((totalSeconds / 60).toFixed(2)),
    timestamp:
      hours > 0
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${minutes}:${String(seconds).padStart(2, '0')}`,
    text: textParts.join(', '),
  };
}

function unique(values: string[], caseInsensitive = false) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim();
    const key = caseInsensitive ? normalized.toLowerCase() : normalized;
    if (!normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function descriptionMetadata(description: string) {
  const tags = Array.from(description.matchAll(/#([\p{L}\p{N}_-]+)/gu)).map(
    (match) => match[1]
  );
  const emails =
    description.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const links =
    description
      .match(/https?:\/\/[^\s<>"')\]}]+/gi)
      ?.map((link) => link.replace(/[.,!?;:]+$/, '')) ?? [];
  return {
    tags: unique(tags, true),
    emails: unique(emails, true),
    links: unique(links),
  };
}

function standardVideoThumbnails(videoId: string) {
  const base = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}`;
  return {
    default: { url: `${base}/default.jpg`, width: 120, height: 90 },
    medium: { url: `${base}/mqdefault.jpg`, width: 320, height: 180 },
    high: { url: `${base}/hqdefault.jpg`, width: 480, height: 360 },
    standard: { url: `${base}/sddefault.jpg`, width: 640, height: 480 },
    maxres: { url: `${base}/maxresdefault.jpg`, width: 1280, height: 720 },
  };
}

function normalizeVideoToolData(video: VideoResource): VideoToolData {
  if (!video.id || !video.snippet?.title) {
    throw new YouTubePublicError('not_found');
  }
  const description = video.snippet.description || '';
  const meta = descriptionMetadata(description);
  const duration = parseDuration(video.contentDetails?.duration);
  const restriction = video.contentDetails?.regionRestriction;
  const type = restriction?.allowed?.length
    ? 'allowed'
    : restriction?.blocked?.length
      ? 'blocked'
      : 'none';

  return {
    videoId: video.id,
    title: video.snippet.title,
    description,
    channelId: video.snippet.channelId || '',
    channelTitle: video.snippet.channelTitle || '',
    publishedAt: video.snippet.publishedAt || '',
    thumbnailUrl:
      getBestThumbnail(video.snippet.thumbnails) ||
      standardVideoThumbnails(video.id).maxres.url,
    thumbnails: standardVideoThumbnails(video.id),
    tags: unique(video.snippet.tags ?? [], true),
    descriptionTags: meta.tags,
    emails: meta.emails,
    links: meta.links,
    viewCount: video.statistics?.viewCount || '',
    likeCount: video.statistics?.likeCount || '',
    commentCount: video.statistics?.commentCount || '',
    duration: duration.timestamp,
    durationText: duration.text,
    durationSeconds: duration.seconds,
    regionRestriction: {
      type,
      regions:
        type === 'allowed'
          ? (restriction?.allowed ?? [])
          : type === 'blocked'
            ? (restriction?.blocked ?? [])
            : [],
    },
    embeddable: video.status?.embeddable !== false,
  };
}

async function getVideoResource(params: {
  videoId: string;
  apiKey: string;
  signal: AbortSignal;
  fetchImpl: typeof fetch;
}) {
  const response = await requestApi<VideosResponse>({
    resource: 'videos',
    search: {
      part: 'snippet,contentDetails,statistics,status,liveStreamingDetails',
      id: params.videoId,
      maxResults: '1',
    },
    apiKey: params.apiKey,
    signal: params.signal,
    fetchImpl: params.fetchImpl,
  });
  const video = response.items?.[0];
  if (!video) throw new YouTubePublicError('not_found');
  return video;
}

export async function getVideoToolData(params: {
  input: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<VideoToolData> {
  const videoId = parseYouTubeVideoId(params.input);
  const cached = readCache<VideoToolData>(`video:${videoId}`);
  if (cached) return cached;

  const apiKey = (params.apiKey ?? envConfigs.youtube_api_key).trim();
  if (!apiKey) throw new YouTubePublicError('configuration');
  const fetchImpl = params.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    VIDEO_REQUEST_TIMEOUT_MS
  );
  try {
    const video = await getVideoResource({
      videoId,
      apiKey,
      signal: controller.signal,
      fetchImpl,
    });
    return writeCache(`video:${videoId}`, normalizeVideoToolData(video));
  } finally {
    clearTimeout(timeout);
  }
}

function parseChannelKeywords(value: string) {
  const matches = value.match(/"[^"]+"|\S+/g) ?? [];
  return unique(
    matches.map((keyword) => keyword.replace(/^"|"$/g, '').trim()),
    true
  );
}

async function resolveChannelResource(params: {
  input: string;
  apiKey: string;
  signal: AbortSignal;
  fetchImpl: typeof fetch;
}) {
  const lookup = parseYouTubeChannelInput(params.input);
  let resolvedLookup = lookup;
  if (lookup.kind === 'video') {
    const video = await getVideoResource({
      videoId: lookup.value,
      apiKey: params.apiKey,
      signal: params.signal,
      fetchImpl: params.fetchImpl,
    });
    const channelId = video.snippet?.channelId;
    if (!channelId) throw new YouTubePublicError('not_found');
    resolvedLookup = { kind: 'id', value: channelId };
  }

  const cacheKey = `channel-profile:${resolvedLookup.kind}:${resolvedLookup.value.toLowerCase()}`;
  const cached = readCache<ChannelResource>(cacheKey);
  if (cached) return cached;

  const search: Record<string, string> = {
    part: 'snippet,contentDetails,statistics,brandingSettings',
    maxResults: '1',
  };
  if (resolvedLookup.kind === 'id') search.id = resolvedLookup.value;
  if (resolvedLookup.kind === 'handle') {
    search.forHandle = resolvedLookup.value;
  }
  if (resolvedLookup.kind === 'username') {
    search.forUsername = resolvedLookup.value;
  }

  const response = await requestApi<ChannelsResponse>({
    resource: 'channels',
    search,
    apiKey: params.apiKey,
    signal: params.signal,
    fetchImpl: params.fetchImpl,
  });
  const channel = response.items?.[0];
  if (!channel?.id) throw new YouTubePublicError('not_found');
  return writeCache(cacheKey, channel);
}

function channelAssets(channel: ChannelResource): {
  logos: Record<string, string>;
  banners: Record<string, string>;
} {
  const source = channel.snippet?.thumbnails;
  const defaultLogo = source?.default?.url || getBestThumbnail(source);
  const mediumLogo = source?.medium?.url || defaultLogo;
  const highLogo = source?.high?.url || mediumLogo;
  const banner = channel.brandingSettings?.image?.bannerExternalUrl || '';
  const logos: Record<string, string> = {
    'High (800x800)': highLogo,
    'Medium (240x240)': mediumLogo,
    'Default (88x88)': defaultLogo,
  };
  const banners: Record<string, string> = banner
    ? {
        'TV (2560x1440)': `${banner}=w2560`,
        'Desktop (2120x350)': `${banner}=w2120`,
        'Tablet (1536x350)': `${banner}=w1536`,
        'Mobile (1060x175)': `${banner}=w1060`,
      }
    : {};
  return {
    logos,
    banners,
  };
}

function videoMediaType(
  video: VideoResource,
  durationSeconds: number | null
): Exclude<ChannelMediaType, 'all'> {
  if (
    video.liveStreamingDetails?.actualStartTime ||
    video.liveStreamingDetails?.scheduledStartTime ||
    video.snippet?.liveBroadcastContent === 'live'
  ) {
    return 'live';
  }
  return durationSeconds !== null && durationSeconds < 60 ? 'shorts' : 'videos';
}

function normalizeChannelVideo(
  item: PlaylistItemResource,
  video: VideoResource,
  position: number
): ChannelVideo | null {
  if (!video.id || !video.snippet?.title) return null;
  const description = video.snippet.description || '';
  const meta = descriptionMetadata(description);
  const duration = parseDuration(video.contentDetails?.duration);
  return {
    position,
    videoId: video.id,
    title: video.snippet.title,
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`,
    description,
    channelTitle: video.snippet.channelTitle || '',
    publishedAt:
      item.contentDetails?.videoPublishedAt ||
      video.snippet.publishedAt ||
      item.snippet?.publishedAt ||
      '',
    thumbnailUrl:
      getBestThumbnail(video.snippet.thumbnails) ||
      standardVideoThumbnails(video.id).maxres.url,
    duration: duration.timestamp,
    durationText: duration.text,
    durationSeconds: duration.seconds,
    durationMinutes: duration.minutes,
    viewCount: video.statistics?.viewCount || '',
    likeCount: video.statistics?.likeCount || '',
    commentCount: video.statistics?.commentCount || '',
    tags: unique(video.snippet.tags ?? [], true),
    descriptionTags: meta.tags,
    emails: meta.emails,
    links: meta.links,
    mediaType: videoMediaType(video, duration.seconds),
  };
}

async function getChannelUploads(params: {
  channel: ChannelResource;
  apiKey: string;
  signal: AbortSignal;
  fetchImpl: typeof fetch;
  limit: number;
}) {
  const channelId = params.channel.id || '';
  const cacheKey = `channel-videos:${channelId}:${params.limit}`;
  const cached = readCache<{
    videos: ChannelVideo[];
    totalVideos: number;
    truncated: boolean;
  }>(cacheKey);
  if (cached) return cached;

  const playlistId =
    params.channel.contentDetails?.relatedPlaylists?.uploads || '';
  if (!playlistId) throw new YouTubePublicError('not_found');

  const rawItems: PlaylistItemResource[] = [];
  const seenTokens = new Set<string>();
  let pageToken = '';
  let totalVideos = 0;
  do {
    const search: Record<string, string> = {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: String(PAGE_SIZE),
    };
    if (pageToken) search.pageToken = pageToken;
    const page = await requestApi<PlaylistItemsResponse>({
      resource: 'playlistItems',
      search,
      apiKey: params.apiKey,
      signal: params.signal,
      fetchImpl: params.fetchImpl,
    });
    totalVideos = Math.max(
      totalVideos,
      page.pageInfo?.totalResults ?? 0,
      rawItems.length + (page.items?.length ?? 0)
    );
    rawItems.push(
      ...(page.items ?? []).slice(0, params.limit - rawItems.length)
    );
    const nextToken = page.nextPageToken || '';
    if (!nextToken || seenTokens.has(nextToken)) break;
    seenTokens.add(nextToken);
    pageToken = nextToken;
  } while (rawItems.length < params.limit);

  const videoIds = rawItems
    .map(
      (item) =>
        item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || ''
    )
    .filter(Boolean);
  const batches: string[][] = [];
  for (let index = 0; index < videoIds.length; index += PAGE_SIZE) {
    batches.push(videoIds.slice(index, index + PAGE_SIZE));
  }

  const videosById = new Map<string, VideoResource>();
  for (let index = 0; index < batches.length; index += 5) {
    const responses = await Promise.all(
      batches.slice(index, index + 5).map((ids) =>
        requestApi<VideosResponse>({
          resource: 'videos',
          search: {
            part: 'snippet,contentDetails,statistics,status,liveStreamingDetails',
            id: ids.join(','),
            maxResults: String(PAGE_SIZE),
          },
          apiKey: params.apiKey,
          signal: params.signal,
          fetchImpl: params.fetchImpl,
        })
      )
    );
    for (const video of responses.flatMap((response) => response.items ?? [])) {
      if (video.id) videosById.set(video.id, video);
    }
  }

  const videos = rawItems.flatMap((item, index) => {
    const videoId =
      item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '';
    const video = videosById.get(videoId);
    if (!video) return [];
    const normalized = normalizeChannelVideo(item, video, index + 1);
    return normalized ? [normalized] : [];
  });
  return writeCache(cacheKey, {
    videos,
    totalVideos: Math.max(totalVideos, videos.length),
    truncated: totalVideos > rawItems.length,
  });
}

async function getChannelPlaylists(params: {
  channelId: string;
  apiKey: string;
  signal: AbortSignal;
  fetchImpl: typeof fetch;
}) {
  const cacheKey = `channel-playlists:${params.channelId}`;
  const cached = readCache<ChannelPlaylist[]>(cacheKey);
  if (cached) return cached;
  const playlists: ChannelPlaylist[] = [];
  const seenTokens = new Set<string>();
  let pageToken = '';
  do {
    const search: Record<string, string> = {
      part: 'snippet,contentDetails',
      channelId: params.channelId,
      maxResults: String(PAGE_SIZE),
    };
    if (pageToken) search.pageToken = pageToken;
    const page = await requestApi<PlaylistsResponse>({
      resource: 'playlists',
      search,
      apiKey: params.apiKey,
      signal: params.signal,
      fetchImpl: params.fetchImpl,
    });
    for (const item of page.items ?? []) {
      if (!item.id || !item.snippet?.title) continue;
      playlists.push({
        playlistId: item.id,
        title: item.snippet.title,
        description: item.snippet.description || '',
        thumbnailUrl: getBestThumbnail(item.snippet.thumbnails),
        videoCount: item.contentDetails?.itemCount ?? 0,
        publishedAt: item.snippet.publishedAt || '',
        url: `https://www.youtube.com/playlist?list=${encodeURIComponent(item.id)}`,
      });
      if (playlists.length >= MAX_CHANNEL_PLAYLISTS) break;
    }
    const nextToken = page.nextPageToken || '';
    if (
      !nextToken ||
      seenTokens.has(nextToken) ||
      playlists.length >= MAX_CHANNEL_PLAYLISTS
    ) {
      break;
    }
    seenTokens.add(nextToken);
    pageToken = nextToken;
  } while (true);
  return writeCache(cacheKey, playlists);
}

export async function getChannelToolData(params: {
  input: string;
  includeVideos?: boolean;
  includePlaylists?: boolean;
  mediaType?: ChannelMediaType;
  limit?: number;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<ChannelToolData> {
  const apiKey = (params.apiKey ?? envConfigs.youtube_api_key).trim();
  if (!apiKey) throw new YouTubePublicError('configuration');
  const fetchImpl = params.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    CHANNEL_REQUEST_TIMEOUT_MS
  );
  try {
    const channel = await resolveChannelResource({
      input: params.input,
      apiKey,
      signal: controller.signal,
      fetchImpl,
    });
    if (!channel.id) throw new YouTubePublicError('not_found');
    const limit = Math.min(
      Math.max(Math.floor(params.limit ?? MAX_CHANNEL_VIDEOS), 1),
      MAX_CHANNEL_VIDEOS
    );
    const uploads = params.includeVideos
      ? await getChannelUploads({
          channel,
          apiKey,
          signal: controller.signal,
          fetchImpl,
          limit,
        })
      : {
          videos: [],
          totalVideos: Number(channel.statistics?.videoCount || 0),
          truncated: false,
        };
    const mediaType = params.mediaType ?? 'all';
    const videos =
      mediaType === 'all'
        ? uploads.videos
        : uploads.videos.filter((video) => video.mediaType === mediaType);
    const playlists = params.includePlaylists
      ? await getChannelPlaylists({
          channelId: channel.id,
          apiKey,
          signal: controller.signal,
          fetchImpl,
        })
      : [];
    const uploadsPlaylistId =
      channel.contentDetails?.relatedPlaylists?.uploads ||
      channel.id.replace(/^UC/, 'UU');
    const rawKeywords = channel.brandingSettings?.channel?.keywords || '';
    const assets = channelAssets(channel);
    return {
      channelId: channel.id,
      title: channel.snippet?.title || 'YouTube channel',
      description: channel.snippet?.description || '',
      customUrl: channel.snippet?.customUrl || '',
      country: channel.snippet?.country || '',
      thumbnailUrl:
        channel.snippet?.thumbnails?.default?.url ||
        getBestThumbnail(channel.snippet?.thumbnails),
      rawKeywords,
      keywords: parseChannelKeywords(rawKeywords),
      uploadsPlaylistId,
      uploadsPlaylistUrl: `https://www.youtube.com/playlist?list=${encodeURIComponent(uploadsPlaylistId)}`,
      subscribeUrl: `https://www.youtube.com/channel/${encodeURIComponent(channel.id)}?sub_confirmation=1`,
      statistics: {
        viewCount: channel.statistics?.viewCount || '',
        subscriberCount: channel.statistics?.subscriberCount || '',
        hiddenSubscriberCount:
          channel.statistics?.hiddenSubscriberCount ?? false,
        videoCount: channel.statistics?.videoCount || '',
      },
      ...assets,
      videos,
      playlists,
      returnedVideos: videos.length,
      totalVideos: uploads.totalVideos,
      truncated: uploads.truncated,
    };
  } finally {
    clearTimeout(timeout);
  }
}
