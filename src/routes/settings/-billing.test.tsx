import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ComponentType } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from '@tanstack/react-router';
import { renderToStaticMarkup } from 'react-dom/server';

import { respData } from '@/lib/resp';
import { m } from '@/paraglide/messages.js';

import { Route } from './billing';

function renderBilling(current: unknown) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(['billing', 'current'], current);
  queryClient.setQueryData(['billing', 'list', 1, 'all', ''], {
    items: [],
    total: 0,
  });
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory({ initialEntries: ['/settings/billing'] }),
  });
  const BillingPage = Route.options.component as ComponentType;
  try {
    return renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <RouterContextProvider router={router}>
          <BillingPage />
        </RouterContextProvider>
      </QueryClientProvider>
    );
  } finally {
    queryClient.clear();
  }
}

test('a successful no-subscription response renders the empty state and pricing link', async () => {
  const { data } = await respData(null).json();
  const html = renderBilling(data);
  assert.ok(html.includes(m['settings.billing.no_subscription']()));
  assert.match(html, /href="\/pricing"/);
  assert.ok(html.includes(m['settings.billing.subscribe']()));
  assert.ok(!html.includes(m['settings.billing.cancel_title']()));
});

test('legacy empty-array responses also render as no subscription', () => {
  const html = renderBilling([]);
  assert.ok(html.includes(m['settings.billing.no_subscription']()));
  assert.match(html, /href="\/pricing"/);
});

test('an active subscription still renders management and cancellation controls', () => {
  const html = renderBilling({
    id: 'fixture-subscription',
    subscriptionNo: 'fixture-subscription',
    paymentProvider: 'stripe',
    status: 'active',
    planName: 'Lite',
    currentPeriodEnd: '2027-10-16T00:00:00.000Z',
  });
  assert.ok(html.includes('Lite'));
  assert.ok(html.includes(m['settings.billing.manage_payment']()));
  assert.ok(html.includes(m['settings.billing.cancel']()));
  assert.ok(!html.includes('href="/pricing"'));
});
