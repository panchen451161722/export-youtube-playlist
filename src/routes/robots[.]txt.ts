import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { locales, localizeUrl } from '@/paraglide/runtime.js';

const PRIVATE_PATHS = [
  '/admin',
  '/settings',
  '/api/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/redeem-invite',
  '/auth-callback',
];

function privateDisallowRules(): string[] {
  const rules = new Set<string>();
  for (const locale of locales) {
    for (const path of PRIVATE_PATHS) {
      const localized = localizeUrl(`${envConfigs.app_url}${path}`, {
        locale,
      });
      rules.add(`Disallow: ${localized.pathname}`);
    }
  }
  return [...rules];
}

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const body = [
          'User-Agent: *',
          'Allow: /',
          ...privateDisallowRules(),
          '',
          `Host: ${new URL(envConfigs.app_url).host}`,
          `Sitemap: ${envConfigs.app_url}/sitemap.xml`,
          '',
        ].join('\n');
        return new Response(body, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=0, s-maxage=3600',
          },
        });
      },
    },
  },
});
