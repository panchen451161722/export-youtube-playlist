import { m } from '@/paraglide/messages.js';
import { PlaylistExtractionTool } from '@/components/tools/playlist-extraction-tool';
import { ToolPageShell } from '@/components/tools/tool-page-shell';

export function PlaylistTitleExtractor() {
  return (
    <ToolPageShell
      breadcrumbLabel={m['tools.common.breadcrumb_label']()}
      breadcrumbs={[
        { label: m['tools.common.breadcrumb_home'](), href: '/' },
        { label: m['tools.common.breadcrumb_tools'](), href: '/tools' },
        { label: m['tools.catalog.titles.title']() },
      ]}
      eyebrow={m['tools.title.eyebrow']()}
      title={m['tools.title.title']()}
      description={m['tools.title.description']()}
      tool={
        <PlaylistExtractionTool
          mode="titles"
          labels={{
            inputLabel: m['tools.common.input_label'](),
            inputPlaceholder: m['tools.common.input_placeholder'](),
            inputHelper: `${m['tools.common.input_helper']()} ${m['tools.common.limit']()} · ${m['tools.common.privacy']()}`,
            submit: m['tools.common.submit'](),
            loading: m['tools.common.loading'](),
            formatLegend: m['tools.title.format_label'](),
            linksOnly: m['tools.link.format_links'](),
            titleAndLink: m['tools.link.format_titles'](),
            plainTitles: m['tools.title.format_plain'](),
            numberedTitles: m['tools.title.format_numbered'](),
            resultsHeading: m['tools.title.result_title'](),
            resultSummary: m['tools.common.result_summary']({
              count: '{count}',
              playlist: '{playlist}',
            }),
            truncated: m['tools.common.truncated'](),
            empty: m['tools.common.empty'](),
            copyAll: m['tools.common.copy'](),
            copySuccess: m['tools.common.copied'](),
            copyError: m['tools.common.copy_error'](),
            downloadTxt: m['tools.common.download_txt'](),
            downloadCsv: m['tools.common.download_csv'](),
            invalidUrl: m['tools.common.error_invalid'](),
            errorPrivate: m['tools.common.error_private'](),
            errorQuota: m['tools.common.error_quota'](),
            errorTimeout: m['tools.common.error_timeout'](),
            errorConfiguration: m['tools.common.error_config'](),
            errorRateLimit: m['tools.common.error_rate_limit'](),
            errorNetwork: m['tools.common.error_network'](),
            resultsListLabel: m['tools.title.result_title'](),
            fileFallback: m['tools.common.file_fallback'](),
          }}
        />
      }
      stepsTitle={m['tools.common.how_title']()}
      steps={[
        {
          title: m['tools.title.step_1.title'](),
          description: m['tools.title.step_1.description'](),
        },
        {
          title: m['tools.title.step_2.title'](),
          description: m['tools.title.step_2.description'](),
        },
        {
          title: m['tools.title.step_3.title'](),
          description: m['tools.title.step_3.description'](),
        },
      ]}
      benefitsTitle={m['tools.common.benefits_title']()}
      benefits={[
        {
          title: m['tools.title.benefit_1'](),
          description: m['tools.title.benefit_1_description'](),
        },
        {
          title: m['tools.title.benefit_2'](),
          description: m['tools.title.benefit_2_description'](),
        },
        {
          title: m['tools.title.benefit_3'](),
          description: m['tools.title.benefit_3_description'](),
        },
      ]}
      faqTitle={m['tools.common.faq_title']()}
      faqs={[
        {
          question: m['tools.title.faq_1.question'](),
          answer: m['tools.title.faq_1.answer'](),
        },
        {
          question: m['tools.title.faq_2.question'](),
          answer: m['tools.title.faq_2.answer'](),
        },
        {
          question: m['tools.title.faq_3.question'](),
          answer: m['tools.title.faq_3.answer'](),
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
          title: m['tools.catalog.analyzer.title'](),
          description: m['tools.catalog.analyzer.description'](),
          href: '/tools/youtube-playlist-analyzer',
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
