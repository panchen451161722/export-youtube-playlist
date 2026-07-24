import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { PlaylistAnalyzerTool } from '@/components/tools/playlist-analyzer-tool';
import { ToolPageShell } from '@/components/tools/tool-page-shell';

export function PlaylistAnalyzer() {
  return (
    <ToolPageShell
      breadcrumbLabel={m['tools.common.breadcrumb_label']()}
      breadcrumbs={[
        { label: m['tools.common.breadcrumb_home'](), href: '/' },
        { label: m['tools.common.breadcrumb_tools'](), href: '/tools' },
        { label: m['tools.catalog.analyzer.title']() },
      ]}
      eyebrow={m['tools.analyzer.eyebrow']()}
      title={m['tools.analyzer.title']()}
      description={m['tools.analyzer.description']()}
      tool={
        <PlaylistAnalyzerTool
          locale={getLocale()}
          labels={{
            formTitle: m['tools.analyzer.summary_title'](),
            formDescription: m['tools.analyzer.form_description'](),
            urlLabel: m['tools.common.input_label'](),
            urlPlaceholder: m['tools.common.input_placeholder'](),
            urlHelper: `${m['tools.common.input_helper']()} ${m['tools.common.limit']()} · ${m['tools.common.privacy']()}`,
            submit: m['tools.analyzer.submit'](),
            loading: m['tools.analyzer.loading'](),
            invalidUrl: m['tools.common.error_invalid'](),
            configurationError: m['tools.common.error_config'](),
            unavailableError: m['tools.common.error_private'](),
            quotaError: m['tools.common.error_quota'](),
            timeoutError: m['tools.common.error_timeout'](),
            rateLimitError: m['tools.common.error_rate_limit'](),
            networkError: m['tools.common.error_network'](),
            emptyResult: m['tools.common.empty'](),
            resultsTitle: (playlistTitle) =>
              m['tools.analyzer.results_title']({
                playlist: playlistTitle,
              }),
            returnedVideos: (count) =>
              m['tools.analyzer.returned_videos']({ count }),
            truncatedNotice: (limit) =>
              m['tools.analyzer.truncated_notice']({ limit }),
            metricsHeading: m['tools.analyzer.summary_title'](),
            videoCount: m['tools.analyzer.video_count'](),
            totalDuration: m['tools.analyzer.total_duration'](),
            averageDuration: m['tools.analyzer.average_duration'](),
            uniqueChannels: m['tools.analyzer.unique_channels'](),
            totalViews: m['tools.analyzer.total_views'](),
            averageViews: m['tools.analyzer.average_views'](),
            totalLikes: m['tools.analyzer.total_likes'](),
            averageLikes: m['tools.analyzer.average_likes'](),
            totalComments: m['tools.analyzer.total_comments'](),
            averageComments: m['tools.analyzer.average_comments'](),
            statisticsAvailability: (available, total) =>
              m['tools.analyzer.statistics_availability']({
                available,
                total,
              }),
            watchTimeHeading: m['tools.analyzer.watch_time_title'](),
            normalSpeed: m['tools.analyzer.speed_normal'](),
            speed125: m['tools.analyzer.watch_time_speed']({ speed: '1.25×' }),
            speed15: m['tools.analyzer.watch_time_speed']({ speed: '1.5×' }),
            speed2: m['tools.analyzer.watch_time_speed']({ speed: '2×' }),
            detailsHeading: m['tools.analyzer.video_details_title'](),
            longestVideo: m['tools.analyzer.longest'](),
            shortestVideo: m['tools.analyzer.shortest'](),
            mostViewedVideos: m['tools.analyzer.top_videos_title'](),
            topChannels: m['tools.analyzer.top_channels_title'](),
            noStatistics: m['tools.analyzer.unavailable'](),
            missing: m['tools.analyzer.unavailable'](),
            views: (count) => m['tools.analyzer.views_count']({ count }),
            channelVideos: (count) =>
              m['tools.analyzer.channel_video_count']({ count }),
            videoDetail: (channel, duration) =>
              m['tools.analyzer.video_detail']({ channel, duration }),
            downloadCsv: m['tools.analyzer.download_csv'](),
            fileFallback: m['tools.common.file_fallback'](),
          }}
        />
      }
      stepsTitle={m['tools.common.how_title']()}
      steps={[
        {
          title: m['tools.analyzer.step_1.title'](),
          description: m['tools.analyzer.step_1.description'](),
        },
        {
          title: m['tools.analyzer.step_2.title'](),
          description: m['tools.analyzer.step_2.description'](),
        },
        {
          title: m['tools.analyzer.step_3.title'](),
          description: m['tools.analyzer.step_3.description'](),
        },
      ]}
      benefitsTitle={m['tools.common.benefits_title']()}
      benefits={[
        {
          title: m['tools.analyzer.benefit_1'](),
          description: m['tools.analyzer.benefit_1_description'](),
        },
        {
          title: m['tools.analyzer.benefit_2'](),
          description: m['tools.analyzer.benefit_2_description'](),
        },
        {
          title: m['tools.analyzer.benefit_3'](),
          description: m['tools.analyzer.benefit_3_description'](),
        },
      ]}
      faqTitle={m['tools.common.faq_title']()}
      faqs={[
        {
          question: m['tools.analyzer.faq_1.question'](),
          answer: m['tools.analyzer.faq_1.answer'](),
        },
        {
          question: m['tools.analyzer.faq_2.question'](),
          answer: m['tools.analyzer.faq_2.answer'](),
        },
        {
          question: m['tools.analyzer.faq_3.question'](),
          answer: m['tools.analyzer.faq_3.answer'](),
        },
      ]}
      relatedToolsTitle={m['tools.common.related_title']()}
      relatedTools={[
        {
          title: m['tools.catalog.links.title'](),
          description: m['tools.catalog.links.description'](),
          href: '/tools/youtube-playlist-link-extractor',
        },
        {
          title: m['tools.catalog.titles.title'](),
          description: m['tools.catalog.titles.description'](),
          href: '/tools/youtube-playlist-title-extractor',
        },
        {
          title: m['tools.catalog.export.title'](),
          description: m['tools.catalog.export.description'](),
          href: '/#exporter',
        },
      ]}
      openToolLabel={m['tools.catalog.open']()}
    />
  );
}
