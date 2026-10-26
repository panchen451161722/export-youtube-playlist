import { useEffect, useRef } from 'react';
import { useRouterState } from '@tanstack/react-router';

import { trackEvent } from '@/lib/analytics';
import { clarityBootstrap } from '@/lib/clarity-bootstrap';

export function Clarity({ projectId }: { projectId: string }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const path = pathname.replace(/^\/(zh|de)(?=\/|$)/, '') || '/';
    trackEvent('page_view', {
      page_type:
        path === '/'
          ? 'homepage'
          : path === '/pricing'
            ? 'pricing'
            : 'other_public',
    });
  }, [pathname]);
  const bootstrap = clarityBootstrap(projectId);
  if (!bootstrap) return null;

  return (
    <script
      id="clarity-init"
      async
      dangerouslySetInnerHTML={{
        __html: bootstrap,
      }}
    />
  );
}
