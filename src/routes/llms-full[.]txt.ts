import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { PUBLIC_TOOL_DEFINITIONS } from '@/components/tools/public-tool-definitions';

function englishMessage(key: string): string {
  const message = (m as Record<string, unknown>)[key];
  if (typeof message !== 'function') return key;
  return (
    message as (
      args?: Record<string, never>,
      options?: { locale: 'en' }
    ) => string
  )({}, { locale: 'en' });
}

const STATIC_PAGES: { path: string; title: string; description: string }[] = [
  {
    path: '',
    title: 'Export YouTube Playlist',
    description:
      'Preview a public YouTube playlist, export its metadata to CSV or XLSX, or copy all video links.',
  },
  {
    path: '/pricing',
    title: 'Pricing',
    description:
      'Current free access and information about the planned Pro offering.',
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy',
    description:
      'How playlist URLs, public YouTube metadata, downloads, analytics, and advertising are handled.',
  },
  {
    path: '/terms-of-service',
    title: 'Terms of Service',
    description:
      'Rules for using the service and exported public YouTube metadata.',
  },
  {
    path: '/about',
    title: 'About',
    description: 'Why the playlist exporter exists and how it works.',
  },
  {
    path: '/contact',
    title: 'Contact',
    description: 'Support, privacy, correction, and feedback information.',
  },
  {
    path: '/tools',
    title: 'Free YouTube Playlist Tools',
    description:
      'A directory of live tools for extracting, analyzing, and exporting public YouTube playlists.',
  },
  {
    path: '/tools/youtube-playlist-link-extractor',
    title: 'YouTube Playlist Link Extractor',
    description:
      'Extract, copy, and download canonical video links from a public playlist.',
  },
  {
    path: '/tools/export-youtube-playlist-to-csv',
    title: 'Export YouTube Playlist to CSV',
    description:
      'Export public YouTube playlist metadata to a CSV file with CSV included by default.',
  },
  {
    path: '/tools/export-youtube-playlist-to-excel',
    title: 'Export YouTube Playlist to Excel',
    description:
      'Export public YouTube playlist metadata to an Excel XLSX workbook with Excel selected by default.',
  },
  {
    path: '/tools/youtube-playlist-title-extractor',
    title: 'YouTube Playlist Title Extractor',
    description:
      'Extract plain or numbered video titles and download TXT or CSV.',
  },
  {
    path: '/tools/youtube-playlist-analyzer',
    title: 'YouTube Playlist Analyzer',
    description:
      'Analyze duration, watch time, channels, and available engagement statistics.',
  },
  ...PUBLIC_TOOL_DEFINITIONS.map((tool) => ({
    path: `/tools/${tool.slug}`,
    title: englishMessage(`tools.extra.${tool.key}.title`),
    description: englishMessage(`tools.extra.${tool.key}.description`),
  })),
  {
    path: '/blog/how-to-export-a-youtube-playlist-to-csv-or-excel',
    title: 'How to Export a YouTube Playlist to CSV or Excel',
    description: 'A practical guide to exporting public playlist metadata.',
  },
];

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: async () => {
        const { app_url, app_name, app_description } = envConfigs;

        const lines: string[] = [
          `# ${app_name}`,
          '',
          `> ${app_description}`,
          '',
          '## Pages',
          '',
          ...STATIC_PAGES.map(
            (p) => `- [${p.title}](${app_url}${p.path}): ${p.description}`
          ),
        ];

        lines.push('');

        return new Response(lines.join('\n'), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});
