import { m } from '@/paraglide/messages.js';
import type { InputToolRecommendationContent } from '@/components/tools/input-tool-recommendation';

export function inputToolRecommendationContent(): InputToolRecommendationContent {
  return {
    channel: {
      title: m['tools.input_recommendation.channel_title'](),
      description: m['tools.input_recommendation.channel_description'](),
      tools: [
        {
          href: '/tools/export-youtube-channel',
          label: m['tools.extra.channel_export.title'](),
        },
        {
          href: '/tools/youtube-channel-playlist-extractor',
          label: m['tools.extra.channel_playlists.title'](),
        },
      ],
    },
    video: {
      title: m['tools.input_recommendation.video_title'](),
      description: m['tools.input_recommendation.video_description'](),
      tools: [
        {
          href: '/tools/youtube-description-extractor',
          label: m['tools.extra.description.title'](),
        },
        {
          href: '/tools/youtube-tag-extractor',
          label: m['tools.extra.tags.title'](),
        },
        {
          href: '/tools/download-youtube-thumbnail',
          label: m['tools.extra.thumbnail.title'](),
        },
      ],
    },
  };
}
