import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import {
  ChannelUtilityTool,
  type ChannelUtilityLabels,
} from '@/components/tools/channel-utility-tool';
import {
  getPublicToolDefinition,
  PUBLIC_TOOL_DEFINITIONS,
} from '@/components/tools/public-tool-definitions';
import { ToolPageShell } from '@/components/tools/tool-page-shell';
import {
  VideoUtilityTool,
  type VideoUtilityLabels,
} from '@/components/tools/video-utility-tool';

function ui(key: string) {
  return tDynamic(`tools.extra.ui.${key}`);
}

function videoLabels(submit: string): VideoUtilityLabels {
  return {
    inputLabel: ui('video_input'),
    inputPlaceholder: ui('video_placeholder'),
    inputHelper: ui('video_helper'),
    submit,
    loading: ui('loading'),
    error: ui('video_error'),
    results: ui('results'),
    copy: ui('copy'),
    copied: ui('copied'),
    download: ui('download'),
    downloadTxt: ui('download_txt'),
    downloadAll: ui('download_all'),
    open: ui('open'),
    title: ui('title'),
    channel: ui('channel'),
    actualTags: ui('actual_tags'),
    descriptionTags: ui('description_tags'),
    includeDescriptionTags: ui('include_description_tags'),
    sort: ui('sort'),
    sortOriginal: ui('sort_original'),
    sortAz: ui('sort_az'),
    sortZa: ui('sort_za'),
    sortLongest: ui('sort_longest'),
    sortShortest: ui('sort_shortest'),
    copyHashtags: ui('copy_hashtags'),
    description: ui('description'),
    emails: ui('emails'),
    links: ui('links'),
    statistics: ui('statistics'),
    views: ui('views'),
    likes: ui('likes'),
    comments: ui('comments'),
    noData: ui('no_data'),
    embedOptions: ui('embed_options'),
    autoplay: ui('autoplay'),
    controls: ui('controls'),
    loop: ui('loop'),
    muted: ui('muted'),
    related: ui('related'),
    responsive: ui('responsive'),
    shortsRatio: ui('shorts_ratio'),
    startSeconds: ui('start_seconds'),
    endSeconds: ui('end_seconds'),
    embedCode: ui('embed_code'),
    preview: ui('preview'),
    restrictionStatus: ui('restriction_status'),
    unrestricted: ui('unrestricted'),
    allowedOnly: ui('allowed_only'),
    blockedIn: ui('blocked_in'),
    regionCodes: ui('region_codes'),
  };
}

function channelLabels(submit: string): ChannelUtilityLabels {
  return {
    inputLabel: ui('channel_input'),
    inputPlaceholder: ui('channel_placeholder'),
    inputHelper: ui('channel_helper'),
    submit,
    loading: ui('loading'),
    error: ui('channel_error'),
    results: ui('results'),
    copy: ui('copy'),
    copied: ui('copied'),
    downloadCsv: ui('download_csv'),
    downloadXlsx: ui('download_xlsx'),
    downloadTxt: ui('download_txt'),
    open: ui('open'),
    channelId: ui('channel_id'),
    channelName: ui('channel_name'),
    handle: ui('handle'),
    country: ui('country'),
    playlistUrl: ui('playlist_url'),
    playlistId: ui('playlist_id'),
    subscribeUrl: ui('subscribe_url'),
    mediaType: ui('media_type'),
    allUploads: ui('all_uploads'),
    videosOnly: ui('videos_only'),
    shortsOnly: ui('shorts_only'),
    liveOnly: ui('live_only'),
    sort: ui('sort'),
    sortOriginal: ui('sort_original'),
    sortNewest: ui('sort_newest'),
    sortOldest: ui('sort_oldest'),
    sortViews: ui('sort_views'),
    sortLikes: ui('sort_likes'),
    sortComments: ui('sort_comments'),
    sortLongest: ui('sort_longest'),
    sortShortest: ui('sort_shortest'),
    sortAz: ui('sort_az'),
    sortZa: ui('sort_za'),
    search: ui('search'),
    count: ui('count'),
    noData: ui('no_data'),
    totalUploads: ui('total_uploads'),
    totalDuration: ui('total_duration'),
    averageDuration: ui('average_duration'),
    totalViews: ui('total_views'),
    averageViews: ui('average_views'),
    totalLikes: ui('total_likes'),
    totalComments: ui('total_comments'),
    engagementRate: ui('engagement_rate'),
    formats: ui('formats'),
    topVideos: ui('top_videos'),
    keywords: ui('keywords'),
    copyHashtags: ui('copy_hashtags'),
    logos: ui('logos'),
    banners: ui('banners'),
    videoCount: ui('video_count'),
  };
}

export function PublicToolPage({ toolKey }: { toolKey: string }) {
  const definition = getPublicToolDefinition(toolKey);
  const prefix = `tools.extra.${definition.key}`;
  const title = tDynamic(`${prefix}.title`);
  const description = tDynamic(`${prefix}.description`);
  const submit = tDynamic(`${prefix}.submit`);
  const related = PUBLIC_TOOL_DEFINITIONS.filter(
    (item) =>
      item.category === definition.category && item.key !== definition.key
  ).slice(0, 3);

  return (
    <ToolPageShell
      breadcrumbLabel={m['tools.common.breadcrumb_label']()}
      breadcrumbs={[
        { label: m['tools.common.breadcrumb_home'](), href: '/' },
        { label: m['tools.common.breadcrumb_tools'](), href: '/tools' },
        { label: title },
      ]}
      eyebrow={tDynamic(`${prefix}.eyebrow`)}
      title={title}
      description={description}
      tool={
        definition.category === 'video' ? (
          <VideoUtilityTool
            mode={definition.mode}
            labels={videoLabels(submit)}
          />
        ) : (
          <ChannelUtilityTool
            mode={definition.mode}
            labels={channelLabels(submit)}
          />
        )
      }
      stepsTitle={ui('how_title')}
      steps={[
        {
          title: ui('step_1_title'),
          description:
            definition.category === 'video'
              ? ui('video_step_1')
              : ui('channel_step_1'),
        },
        {
          title: ui('step_2_title'),
          description: tDynamic(`${prefix}.step_2`),
        },
        {
          title: ui('step_3_title'),
          description: tDynamic(`${prefix}.step_3`),
        },
      ]}
      benefitsTitle={ui('benefits_title')}
      benefits={[
        {
          title: ui('benefit_official_title'),
          description: ui('benefit_official_description'),
        },
        {
          title: ui('benefit_private_title'),
          description: ui('benefit_private_description'),
        },
        {
          title: ui('benefit_export_title'),
          description: tDynamic(`${prefix}.benefit_export`),
        },
      ]}
      faqTitle={ui('faq_title')}
      faqs={[
        {
          question: tDynamic(`${prefix}.faq_1_question`),
          answer: tDynamic(`${prefix}.faq_1_answer`),
        },
        {
          question: ui('faq_login_question'),
          answer: ui('faq_login_answer'),
        },
        {
          question: ui('faq_data_question'),
          answer: ui('faq_data_answer'),
        },
      ]}
      relatedToolsTitle={m['tools.common.related_title']()}
      relatedTools={related.map((item) => ({
        title: tDynamic(`tools.extra.${item.key}.title`),
        description: tDynamic(`tools.extra.${item.key}.description`),
        href: `/tools/${item.slug}`,
      }))}
      openToolLabel={m['tools.catalog.open']()}
    />
  );
}
