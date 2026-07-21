import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';

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
];

export const Route = createFileRoute('/llms.txt')({
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
