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
  getPlaylistExport,
  parseYouTubePlaylistUrl,
} from '@/modules/youtube-playlist/service';
import {
  getChannelToolData,
  parseYouTubeChannelInput,
} from '@/modules/youtube-public/service';
import { jobConfiguration } from '@/lib/playlist-guard/job-config';
import {
  guardNotificationEmail,
  type GuardNotificationPayload,
} from '@/lib/playlist-guard/notifications';
import {
  GUARD_FREQUENCIES,
  type GuardCollectionDetail,
  type GuardCreateInput,
  type GuardOverview,
} from '@/lib/playlist-guard/types';
import { respErr } from '@/lib/resp';

const frequency = z.enum(GUARD_FREQUENCIES);
const id = z.string().min(1).max(100);
const preferences = {
  name: z.string().trim().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  frequency: frequency.optional(),
  notifyMissing: z.boolean().optional(),
  notifyAdded: z.boolean().optional(),
  emailDelivery: z.boolean().optional(),
};
export const guardActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start_trial') }).strict(),
  z
    .object({
      action: z.literal('create'),
      name: z.string().trim().min(1).max(100),
      url: z.string().trim().min(1).max(2048),
      source: z.enum(['playlist', 'channel']),
      frequency,
      notifyMissing: z.boolean(),
      notifyAdded: z.boolean(),
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
    if (input.source === 'playlist') {
      const playlistId = parseYouTubePlaylistUrl(input.url);
      return {
        input: {
          ...input,
          url: `https://www.youtube.com/playlist?list=${playlistId}`,
        },
        key: `playlist:${playlistId}`,
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
      'Enter a public YouTube playlist or channel URL matching the selected source.',
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
    privateSources: false,
  };
  async function scan(collection: GuardCollectionDetail): Promise<GuardScan> {
    if (!apiKey)
      throw new GuardError(
        'youtube_unconfigured',
        'YouTube monitoring is not configured yet.',
        503
      );
    let playlistUrl = collection.url;
    if (collection.source === 'channel') {
      const channel = await getChannelToolData({
        input: collection.url,
        includeVideos: false,
        apiKey,
      });
      playlistUrl = channel.uploadsPlaylistUrl;
    }
    const result = await getPlaylistExport({ playlistUrl, apiKey });
    return {
      complete: !result.truncated && result.scannedCount >= result.totalItems,
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
export function guardErrorResponse(error: unknown) {
  if (error instanceof GuardError)
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
