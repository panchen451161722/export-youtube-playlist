/// <reference types="vite/client" />
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { ThemeProvider } from 'next-themes';

import { envConfigs } from '@/config';
import { getQueryClient } from '@/lib/query-client';
import { getLocale } from '@/paraglide/runtime.js';
import { Clarity } from '@/components/analytics/clarity';
import { GoogleAnalytics } from '@/components/analytics/google-analytics';
import { Plausible } from '@/components/analytics/plausible';
import { CustomerService } from '@/components/customer-service';
import { Toaster } from '@/components/ui/sonner';

import '@fontsource-variable/inter';
import '@/styles/globals.css';

// Analytics IDs live in the DB config (1h-cached service). Fetched via a
// server function so drizzle/db code never reaches the client bundle.
const getRootData = createServerFn().handler(async () => {
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

export const Route = createRootRoute({
  loader: () => getRootData(),
  head: () => {
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: envConfigs.app_name },
        { name: 'description', content: envConfigs.app_description },
      ],
      links: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        {
          rel: 'apple-touch-icon',
          href: '/apple-touch-icon.png',
          sizes: '180x180',
        },
      ],
    };
  },
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootComponent() {
  const rootData = Route.useLoaderData();

  return (
    <QueryClientProvider client={getQueryClient()}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Outlet />
        <Toaster position="top-center" richColors />
        {rootData?.gaId ? (
          <GoogleAnalytics measurementId={rootData.gaId} />
        ) : null}
        {rootData?.plausibleDomain ? (
          <Plausible
            domain={rootData.plausibleDomain}
            src={rootData.plausibleSrc || undefined}
          />
        ) : null}
        {rootData?.clarityProjectId ? (
          <Clarity projectId={rootData.clarityProjectId} />
        ) : null}
        <CustomerService
          crispWebsiteId={rootData?.crispWebsiteId || undefined}
          tawkPropertyId={rootData?.tawkPropertyId || undefined}
          tawkWidgetId={rootData?.tawkWidgetId || undefined}
        />
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
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
