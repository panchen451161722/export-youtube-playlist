/// <reference types="vite/client" />
import { useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  createRootRoute,
  HeadContent,
  Outlet,
  redirect,
  Scripts,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import interLatinUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import { ThemeProvider } from 'next-themes';

import { useSession } from '@/core/auth/client';
import { envConfigs } from '@/config';
import {
  crossesPrivacyBoundary,
  isBackupSelectionLocation,
  isPrivateDocumentPath,
  mayLoadThirdPartyScripts,
} from '@/lib/private-document';
import { getQueryClient } from '@/lib/query-client';
import { getLocale } from '@/paraglide/runtime.js';
import { Clarity } from '@/components/analytics/clarity';
import { GoogleAnalytics } from '@/components/analytics/google-analytics';
import { Plausible } from '@/components/analytics/plausible';
import { CustomerService } from '@/components/customer-service';
import { Toaster } from '@/components/ui/sonner';

import '@/styles/fonts.css';
import '@/styles/globals.css';

// Analytics IDs live in the DB config (1h-cached service). Fetched via a
// server function so drizzle/db code never reaches the client bundle.
const getRootData = createServerFn()
  .inputValidator(
    (input: { privatePage: boolean; backupSelection: boolean }) => ({
      privatePage: input?.privatePage !== false,
      backupSelection: input?.backupSelection === true,
    })
  )
  .handler(async ({ data }) => {
    const [{ getAllConfigs }, { getRequestHeaders }] = await Promise.all([
      import('@/modules/config/service'),
      import('@tanstack/react-start/server'),
    ]);
    const configs = await getAllConfigs();
    const requestHeaders = getRequestHeaders();
    const isLocalRequest = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(
      requestHeaders.get('host') || ''
    );
    const hasSessionCookie = (requestHeaders.get('cookie') || '').includes(
      'better-auth.session_token='
    );
    const thirdPartyAllowed = mayLoadThirdPartyScripts(
      data.privatePage,
      requestHeaders.get('cookie') || '',
      isLocalRequest
    );
    const recordBackupSelection =
      data.backupSelection &&
      mayLoadThirdPartyScripts(
        false,
        requestHeaders.get('cookie') || '',
        isLocalRequest
      );
    let user: {
      name: string;
      email: string;
      image?: string | null;
    } | null = null;

    if (hasSessionCookie) {
      try {
        const { getAuth } = await import('@/core/auth');
        const session = await getAuth(configs).api.getSession({
          headers: requestHeaders,
        });
        if (session?.user) {
          user = {
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
          };
        }
      } catch {
        // A public page must remain available if session lookup fails.
      }
    }

    return {
      user,
      thirdPartyAllowed,
      recordBackupSelection,
      gaId: configs.google_analytics_id?.trim() || '',
      plausibleDomain: configs.plausible_domain?.trim() || '',
      plausibleSrc: configs.plausible_src?.trim() || '',
      clarityProjectId: isLocalRequest
        ? ''
        : configs.clarity_project_id?.trim() || '',
      crispWebsiteId:
        configs.crisp_enabled === 'true'
          ? configs.crisp_website_id?.trim() || ''
          : '',
      tawkPropertyId:
        configs.tawk_enabled === 'true'
          ? configs.tawk_property_id?.trim() || ''
          : '',
      tawkWidgetId:
        configs.tawk_enabled === 'true'
          ? configs.tawk_widget_id?.trim() || ''
          : '',
    };
  });

// A script already executed on a public page survives React unmounting. A full
// document navigation at this boundary prevents that script seeing private DOM.
const initialDocumentPath =
  typeof window === 'undefined' ? null : window.location.pathname;
const initialDocumentSearch =
  typeof window === 'undefined' ? '' : window.location.search;

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (
      initialDocumentPath !== null &&
      crossesPrivacyBoundary(
        initialDocumentPath,
        location.pathname,
        initialDocumentSearch,
        location.searchStr
      )
    ) {
      // `href` is the locale-free route. A document reload must use the
      // rewritten browser URL so /de and /zh survive this privacy boundary.
      throw redirect({ href: location.publicHref, reloadDocument: true });
    }
  },
  loader: ({ location }) =>
    getRootData({
      data: {
        privatePage: isPrivateDocumentPath(location.pathname),
        backupSelection: isBackupSelectionLocation(
          location.pathname,
          location.searchStr
        ),
      },
    }),
  head: ({ loaderData }) => {
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'referrer',
          content: 'strict-origin-when-cross-origin',
        },
        {
          name: 'google-adsense-account',
          content: 'ca-pub-5428651211440842',
        },
        { title: envConfigs.app_name },
        { name: 'description', content: envConfigs.app_description },
      ],
      links: [
        {
          rel: 'preload',
          href: interLatinUrl,
          as: 'font',
          type: 'font/woff2',
          crossOrigin: 'anonymous',
        },
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        {
          rel: 'apple-touch-icon',
          href: '/apple-touch-icon.png',
          sizes: '180x180',
        },
      ],
      scripts: loaderData?.thirdPartyAllowed
        ? [
            {
              async: true,
              src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5428651211440842',
              crossOrigin: 'anonymous',
            },
          ]
        : [],
    };
  },
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootComponent() {
  const rootData = Route.useLoaderData();
  // Loader invalidation must not remove the guard from a document that has
  // already executed Clarity (for example, after a cross-tab sign-in).
  const [recordedSelectionDocument] = useState(
    rootData?.recordBackupSelection === true
  );

  return (
    <QueryClientProvider client={getQueryClient()}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {recordedSelectionDocument ? (
          <RecordedSelectionBoundary
            privateNow={!rootData?.recordBackupSelection || !!rootData?.user}
          >
            <Outlet />
            <Toaster position="top-center" richColors />
          </RecordedSelectionBoundary>
        ) : (
          <>
            <Outlet />
            <Toaster position="top-center" richColors />
          </>
        )}
        {rootData?.thirdPartyAllowed && rootData.gaId ? (
          <GoogleAnalytics measurementId={rootData.gaId} />
        ) : null}
        {rootData?.thirdPartyAllowed &&
        (rootData.plausibleDomain || rootData.plausibleSrc) ? (
          <Plausible
            domain={rootData.plausibleDomain}
            src={rootData.plausibleSrc || undefined}
          />
        ) : null}
        {(rootData?.thirdPartyAllowed || rootData?.recordBackupSelection) &&
        rootData.clarityProjectId ? (
          <Clarity
            projectId={rootData.clarityProjectId}
            backupSelection={rootData.recordBackupSelection}
          />
        ) : null}
        {rootData?.thirdPartyAllowed && (
          <CustomerService
            crispWebsiteId={rootData?.crispWebsiteId || undefined}
            tawkPropertyId={rootData?.tawkPropertyId || undefined}
            tawkWidgetId={rootData?.tawkWidgetId || undefined}
          />
        )}
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

// An account may sign in in another tab. Never render its DOM into a recorded
// guest document, even for one frame; reload into the server's private CSP.
function RecordedSelectionBoundary({
  children,
  privateNow,
}: {
  children: ReactNode;
  privateNow: boolean;
}) {
  const { data: session } = useSession();
  const reload = privateNow || !!session?.user;
  useEffect(() => {
    if (reload) window.location.reload();
  }, [reload]);
  // SSR already verified the absence of an auth cookie. While the client
  // session is pending, descendants render their existing anonymous state.
  if (reload) return null;
  return children;
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <a href="/" className="text-sm underline underline-offset-4">
        Back to home
      </a>
    </div>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Oops</h1>
      <p className="text-muted-foreground">
        Something went wrong. Please try again.
      </p>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="bg-muted mt-2 max-w-lg overflow-auto rounded p-4 text-xs">
          {error.message}
        </pre>
      )}
      <button
        type="button"
        onClick={reset}
        className="text-sm underline underline-offset-4"
      >
        Try again
      </button>
    </div>
  );
}
