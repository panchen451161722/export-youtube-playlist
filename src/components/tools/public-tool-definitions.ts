import type { ChannelUtilityMode } from './channel-utility-tool';
import type { VideoUtilityMode } from './video-utility-tool';

export type PublicToolDefinition =
  | {
      key: string;
      slug: string;
      category: 'video';
      mode: VideoUtilityMode;
    }
  | {
      key: string;
      slug: string;
      category: 'channel';
      mode: ChannelUtilityMode;
    };

export const PUBLIC_TOOL_DEFINITIONS = [
  {
    key: 'thumbnail',
    slug: 'download-youtube-thumbnail',
    category: 'video',
    mode: 'thumbnail',
  },
  {
    key: 'tags',
    slug: 'youtube-tag-extractor',
    category: 'video',
    mode: 'tags',
  },
  {
    key: 'description',
    slug: 'youtube-description-extractor',
    category: 'video',
    mode: 'description',
  },
  {
    key: 'embed',
    slug: 'youtube-embed-code-generator',
    category: 'video',
    mode: 'embed',
  },
  {
    key: 'restrictions',
    slug: 'youtube-region-restriction-checker',
    category: 'video',
    mode: 'restrictions',
  },
  {
    key: 'channel_id',
    slug: 'youtube-channel-id-finder',
    category: 'channel',
    mode: 'id',
  },
  {
    key: 'channel_playlist',
    slug: 'youtube-channel-to-playlist',
    category: 'channel',
    mode: 'playlist',
  },
  {
    key: 'subscribe',
    slug: 'youtube-subscribe-link-generator',
    category: 'channel',
    mode: 'subscribe',
  },
  {
    key: 'channel_playlists',
    slug: 'youtube-channel-playlist-extractor',
    category: 'channel',
    mode: 'playlists',
  },
  {
    key: 'channel_links',
    slug: 'youtube-channel-video-link-extractor',
    category: 'channel',
    mode: 'links',
  },
  {
    key: 'channel_titles',
    slug: 'youtube-channel-title-extractor',
    category: 'channel',
    mode: 'titles',
  },
  {
    key: 'channel_export',
    slug: 'export-youtube-channel',
    category: 'channel',
    mode: 'export',
  },
  {
    key: 'channel_analyzer',
    slug: 'youtube-channel-analyzer',
    category: 'channel',
    mode: 'analyzer',
  },
  {
    key: 'channel_keywords',
    slug: 'youtube-channel-keywords',
    category: 'channel',
    mode: 'keywords',
  },
  {
    key: 'channel_assets',
    slug: 'youtube-channel-banner-and-logo-downloader',
    category: 'channel',
    mode: 'assets',
  },
] as const satisfies readonly PublicToolDefinition[];

export function getPublicToolDefinition(key: string): PublicToolDefinition {
  const definition = PUBLIC_TOOL_DEFINITIONS.find((item) => item.key === key);
  if (!definition) throw new Error(`Unknown public tool: ${key}`);
  return definition;
}
