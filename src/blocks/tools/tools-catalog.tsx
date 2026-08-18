import {
  BarChart3,
  FileSpreadsheet,
  Link2,
  ListOrdered,
  RadioTower,
  Table2,
  Video,
} from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import { PUBLIC_TOOL_DEFINITIONS } from '@/components/tools/public-tool-definitions';
import { ToolsCatalog as ToolsCatalogView } from '@/components/tools/tools-catalog';

export function ToolsCatalog() {
  const openToolLabel = m['tools.catalog.open']();

  return (
    <ToolsCatalogView
      breadcrumbLabel={m['tools.common.breadcrumb_tools']()}
      breadcrumbs={[
        { label: m['tools.common.breadcrumb_home'](), href: '/' },
        { label: m['tools.common.breadcrumb_tools']() },
      ]}
      eyebrow={m['tools.catalog.eyebrow']()}
      title={m['tools.catalog.title']()}
      description={m['tools.catalog.description']()}
      tools={[
        {
          title: m['tools.catalog.export.title'](),
          description: m['tools.catalog.export.description'](),
          href: '/#exporter',
          actionLabel: openToolLabel,
          icon: <FileSpreadsheet />,
        },
        {
          title: m['tools.csv.title'](),
          description: m['tools.csv.description'](),
          href: '/tools/export-youtube-playlist-to-csv',
          actionLabel: openToolLabel,
          icon: <Table2 />,
        },
        {
          title: m['tools.excel.title'](),
          description: m['tools.excel.description'](),
          href: '/tools/export-youtube-playlist-to-excel',
          actionLabel: openToolLabel,
          icon: <FileSpreadsheet />,
        },
        {
          title: m['tools.catalog.links.title'](),
          description: m['tools.catalog.links.description'](),
          href: '/tools/youtube-playlist-link-extractor',
          actionLabel: openToolLabel,
          icon: <Link2 />,
        },
        {
          title: m['tools.catalog.titles.title'](),
          description: m['tools.catalog.titles.description'](),
          href: '/tools/youtube-playlist-title-extractor',
          actionLabel: openToolLabel,
          icon: <ListOrdered />,
        },
        {
          title: m['tools.catalog.analyzer.title'](),
          description: m['tools.catalog.analyzer.description'](),
          href: '/tools/youtube-playlist-analyzer',
          actionLabel: openToolLabel,
          icon: <BarChart3 />,
        },
        ...PUBLIC_TOOL_DEFINITIONS.map((tool) => ({
          title: tDynamic(`tools.extra.${tool.key}.title`),
          description: tDynamic(`tools.extra.${tool.key}.description`),
          href: `/tools/${tool.slug}`,
          actionLabel: openToolLabel,
          icon: tool.category === 'video' ? <Video /> : <RadioTower />,
        })),
      ]}
      publicDataTitle={m['tools.catalog.note_title']()}
      publicDataDescription={m['tools.catalog.note_description']()}
    />
  );
}
