import { useEffect, useRef } from 'react';
import { useRouterState } from '@tanstack/react-router';

import { trackEvent } from '@/lib/analytics';
import { trackClarityEvent } from '@/lib/clarity';
import { clarityBootstrap } from '@/lib/clarity-bootstrap';
import { isBackupSelectionLocation } from '@/lib/private-document';

export function Clarity({
  projectId,
  backupSelection = false,
}: {
  projectId: string;
  backupSelection?: boolean;
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (backupSelection) {
      if (
        isBackupSelectionLocation(
          window.location.pathname,
          window.location.search
        )
      ) {
        trackClarityEvent('page_view', { page_type: 'backup_selection' });
      }
      return;
    }
    const path = pathname.replace(/^\/(zh|de)(?=\/|$)/, '') || '/';
    trackEvent('page_view', {
      page_type:
        path === '/'
          ? 'homepage'
          : path === '/pricing'
            ? 'pricing'
            : 'other_public',
    });
  }, [pathname, backupSelection]);
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
