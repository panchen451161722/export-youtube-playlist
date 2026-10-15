import { z } from 'zod';

import {
  CloudflareEmailProvider,
  EmailManager,
  ResendProvider,
} from '@/core/email';
import { PreviewEmailProvider, previewMailUrl } from '@/core/email/preview';
import { envConfigs } from '@/config';
import { getAllConfigs } from '@/modules/config/service';
import { GuardError, type GuardScan } from '@/modules/playlist-guard/service';
import {
  youtubeAccessToken,
  youtubeConfig,
} from '@/modules/youtube-connections/service';
import {
  getPlaylistExport,
  parseYouTubePlaylistUrl,
  PlaylistServiceError,
} from '@/modules/youtube-playlist/service';
import {
  getChannelToolData,
  parseYouTubeChannelInput,
  YouTubePublicError,
} from '@/modules/youtube-public/service';
import { jobConfiguration } from '@/lib/playlist-guard/job-config';
import {
  guardNotificationEmail,
  type GuardNotificationPayload,
} from '@/lib/playlist-guard/notifications';
import {
  GUARD_FREQUENCIES,
  GUARD_SOURCES,
  needsSourceUrl,
  needsYoutubeAccount,
  type GuardAction,
  type GuardCollectionDetail,
  type GuardCreateInput,
  type GuardOverview,
} from '@/lib/playlist-guard/types';
import { respErr } from '@/lib/resp';
import { YoutubeAccountError } from '@/lib/youtube-connections/google';
import { scanAuthorizedYoutube } from '@/lib/youtube-connections/scan';

const frequency = z.enum(GUARD_FREQUENCIES);

/** Change-alert preferences may be saved before mail is ready; routine backup delivery still requires setup. */
export function assertGuardBackupEmailReady(
  action: GuardAction,
  configured: boolean,
  verified: boolean
) {
  if (!('emailDelivery' in action) || !action.emailDelivery) return;
  if (!configured)
    throw new GuardError(
      'email_unconfigured',
      'Email delivery is not configured yet.',
      503
    );
  if (!verified)
    throw new GuardError(
      'email_unverified',
      'Verify your email address before enabling email delivery.',
      403
    );
}
const id = z.string().min(1).max(100);
const preferences = {
  name: z.string().trim().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  frequency: frequency.optional(),
  notifyMissing: z.boolean().optional(),
  notifyAdded: z.boolean().optional(),
  notifyRestored: z.boolean().optional(),
  emailDelivery: z.boolean().optional(),
};
export const guardActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start_trial') }).strict(),
  z
    .object({
      action: z.literal('create'),
      name: z.string().trim().min(1).max(100),
      url: z.string().trim().max(2048),
      source: z.enum(GUARD_SOURCES),
      connectionId: z.string().min(1).max(100).optional(),
      frequency,
      notifyMissing: z.boolean(),
      notifyAdded: z.boolean(),
      notifyRestored: z.boolean().default(true),
      emailDelivery: z.boolean(),
    })
    .strict(),
  z.object({ action: z.literal('sync'), id }).strict(),
  z.object({ action: z.literal('update'), id, ...preferences }).strict(),
  z.object({ action: z.literal('delete'), id }).strict(),
]);

/** JSON and Origin must both match. Browsers supply Origin on same-origin POSTs. */
export async function readGuardAction(request: Request) {
  if (
    request.headers.get('origin') !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new GuardError(
      'invalid_origin',
      'This request must come from this website.',
      403
    );
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    throw new GuardError(
      'invalid_content_type',
      'A JSON request is required.',
      415
    );
  const maxBytes = 8_192;
  if (
    Number(request.headers.get('content-length') || 0) > maxBytes ||
    !request.body
  )
    throw new GuardError('invalid_body', 'Invalid request body.', 413);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new GuardError('invalid_body', 'Request body is too large.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new GuardError('invalid_body', 'Invalid JSON request.', 400);
  }
  const parsed = guardActionSchema.safeParse(body);
  if (!parsed.success)
    throw new GuardError(
      'invalid_input',
      'Check the collection name, YouTube URL and preferences.',
      400
    );
  return parsed.data;
}

export function normalizeGuardSource(input: GuardCreateInput): {
  input: GuardCreateInput;
  key: string;
} {
  try {
    if (needsYoutubeAccount(input.source) && !input.connectionId)
      throw new Error('Account required');
    if (!needsSourceUrl(input.source)) {
      return {
        input: {
          ...input,
          url:
            input.source === 'subscriptions'
              ? 'https://www.youtube.com/feed/channels'
              : 'https://www.youtube.com/playlist?list=LL',
        },
        key: `${input.source}:${input.connectionId}`,
      };
    }
    if (input.source === 'playlist' || input.source === 'private_playlist') {
      const playlistId = parseYouTubePlaylistUrl(input.url);
      return {
        input: {
          ...input,
          url: `https://www.youtube.com/playlist?list=${playlistId}`,
        },
        key:
          input.source === 'private_playlist'
            ? `private_playlist:${input.connectionId}:${playlistId}`
            : `playlist:${playlistId}`,
      };
    }
    const channel = parseYouTubeChannelInput(input.url);
    if (channel.kind === 'video' || channel.value.length > 100)
      throw new Error('Channel required');
    const path =
      channel.kind === 'id'
        ? `channel/${channel.value}`
        : channel.kind === 'username'
          ? `user/${encodeURIComponent(channel.value)}`
          : `@${encodeURIComponent(channel.value)}`;
    return {
      input: { ...input, url: `https://www.youtube.com/${path}` },
      key: `channel:${channel.kind}:${channel.kind === 'id' ? channel.value : channel.value.toLowerCase()}`,
    };
  } catch {
    throw new GuardError(
      'invalid_source',
      'Select the required YouTube account and enter a YouTube URL matching the source type.',
      400
    );
  }
}

export { jobConfiguration } from '@/lib/playlist-guard/job-config';

export async function guardRuntime() {
  const configs = await getAllConfigs();
  const manager = new EmailManager();
  const preview = previewMailUrl();
  if (preview) manager.addProvider(new PreviewEmailProvider(preview));
  else if (configs.email_provider === 'cloudflare') {
    if (
      configs.cloudflare_email_api_token &&
      configs.cloudflare_email_account_id &&
      configs.cloudflare_email_sender_email
    )
      manager.addProvider(
        new CloudflareEmailProvider({
          apiToken: configs.cloudflare_email_api_token,
          accountId: configs.cloudflare_email_account_id,
          defaultFrom: configs.cloudflare_email_sender_email,
        })
      );
  } else if (configs.resend_api_key && configs.resend_sender_email)
    manager.addProvider(
      new ResendProvider({
        apiKey: configs.resend_api_key,
        defaultFrom: configs.resend_sender_email,
      })
    );
  const apiKey = configs.youtube_api_key || '';
  const capabilities: GuardOverview['capabilities'] = {
    youtube: Boolean(apiKey),
    email: manager.getProviderNames().length > 0,
    emailPreview: Boolean(preview),
    scheduler: jobConfiguration().enabled,
    privateSources: !!youtubeConfig(configs),
  };
  async function scan(
    collection: GuardCollectionDetail,
    ownerId: string
  ): Promise<GuardScan> {
    if (needsYoutubeAccount(collection.source)) {
      if (!collection.connectionId)
        throw new GuardError(
          'account_missing',
          'Reconnect a YouTube account for this collection.',
          403
        );
      const token = await youtubeAccessToken(
        ownerId,
        collection.connectionId,
        youtubeConfig(configs)
      );
      return scanAuthorizedYoutube(collection, token);
    }
    if (!apiKey)
      throw new GuardError(
        'youtube_unconfigured',
        'YouTube monitoring is not configured yet.',
        503
      );
    return scanGuardPublicSource(collection, apiKey);
  }

  async function send(
    payload: GuardNotificationPayload,
    recipient: string,
    id: string
  ) {
    if (!capabilities.email)
      return {
        success: false,
        provider: 'unconfigured',
        error: 'Email provider is not configured.',
      };
    return manager.sendEmail(
      guardNotificationEmail(
        payload,
        recipient,
        {
          name: configs.app_name || envConfigs.app_name,
          url: configs.app_url || envConfigs.app_url,
        },
        id
      )
    );
  }
  return { capabilities, scan, send };
}
/** Preserve only the public services' safe errors at this composition boundary. */
export async function scanGuardPublicSource(
  collection: Pick<GuardCollectionDetail, 'source' | 'url'>,
  apiKey: string,
  services: {
    getChannelToolData: (
      input: Parameters<typeof getChannelToolData>[0]
    ) => Promise<
      Pick<
        Awaited<ReturnType<typeof getChannelToolData>>,
        'title' | 'uploadsPlaylistUrl'
      >
    >;
    getPlaylistExport: (
      input: Parameters<typeof getPlaylistExport>[0]
    ) => Promise<
      Pick<
        Awaited<ReturnType<typeof getPlaylistExport>>,
        'truncated' | 'scannedCount' | 'totalItems' | 'videos'
      >
    >;
  } = { getChannelToolData, getPlaylistExport }
): Promise<GuardScan> {
  try {
    let playlistUrl = collection.url;
    let sourceTitle: string | undefined;
    if (collection.source === 'channel') {
      const channel = await services.getChannelToolData({
        input: collection.url,
        includeVideos: false,
        apiKey,
      });
      playlistUrl = channel.uploadsPlaylistUrl;
      sourceTitle = channel.title;
    }
    const result = await services.getPlaylistExport({ playlistUrl, apiKey });
    return {
      complete: !result.truncated && result.scannedCount >= result.totalItems,
      sourceTitle,
      items: result.videos.map((video) => ({
        id: video.videoId,
        title: video.title.slice(0, 300),
        channel: video.channelTitle.slice(0, 120),
        url: video.url,
        thumbnail: video.thumbnailUrl.slice(0, 500),
        duration: video.duration.slice(0, 40),
        position: video.position,
        views:
          /^\d+$/.test(video.viewCount) &&
          Number.isSafeInteger(Number(video.viewCount))
            ? Number(video.viewCount)
            : undefined,
      })),
    };
  } catch (error) {
    if (
      error instanceof YouTubePublicError ||
      error instanceof PlaylistServiceError
    )
      throw new GuardError(
        `youtube_${error.code}`,
        error.message.replace(/^[a-z_]+: /, ''),
        error.status
      );
    throw error;
  }
}

export function guardErrorResponse(error: unknown) {
  if (error instanceof GuardError || error instanceof YoutubeAccountError)
    return respErr(error.message, {
      status: error.status,
      headers: { 'cache-control': 'no-store', 'x-guard-error': error.code },
    });
  console.error('playlist_guard_operation_failed');
  return respErr(
    'The collection operation could not be completed. Please try again.',
    { status: 500, headers: { 'cache-control': 'no-store' } }
  );
}
