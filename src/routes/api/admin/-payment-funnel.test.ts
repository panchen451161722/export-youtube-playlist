import assert from 'node:assert/strict';
import { test } from 'node:test';

import { summarizePaymentFunnel } from '@/lib/payment-funnel';

import { createPaymentFunnelHandler } from './-payment-funnel';

test('report requires admin permission, validates range, and never caches private results', async () => {
  let user: string | null = null;
  let admin = false;
  let reads = 0;
  const handler = createPaymentFunnelHandler({
    getUserId: async () => user,
    canRead: async () => admin,
    report: async (days) => {
      reads++;
      return summarizePaymentFunnel([], [], days, new Date());
    },
  });
  const request = (query = '') => ({
    request: new Request(
      `https://example.com/api/admin/payment-funnel${query}`
    ),
  });
  assert.equal((await handler(request())).status, 401);
  user = 'regular-user';
  assert.equal((await handler(request())).status, 403);
  admin = true;
  for (const value of ['NaN', '0', '-1', '100000', '1.5'])
    assert.equal((await handler(request(`?days=${value}`))).status, 400);
  assert.equal(reads, 0);
  const response = await handler(request('?days=7'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.json()).data.days, 7);
  assert.equal(reads, 1);
});

test('database failures expose no raw server details', async () => {
  const handler = createPaymentFunnelHandler({
    getUserId: async () => 'admin',
    canRead: async () => true,
    report: async () => {
      throw new Error('private-database-connection');
    },
  });
  const response = await handler({
    request: new Request('https://example.com/api/admin/payment-funnel'),
  });
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /private-database/);
});
