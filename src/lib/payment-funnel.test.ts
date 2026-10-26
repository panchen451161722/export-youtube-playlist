import assert from 'node:assert/strict';
import { test } from 'node:test';

import { summarizePaymentFunnel, type FunnelOrder } from './payment-funnel';

const now = new Date('2026-10-25T20:00:00Z');
const created = new Date('2026-10-20T20:00:00Z');
function checkout(
  id: string,
  overrides: Partial<FunnelOrder> = {}
): FunnelOrder {
  return {
    paymentProvider: 'stripe',
    paymentSessionId: id,
    paymentType: 'subscription',
    checkoutUrl: 'https://checkout.stripe.com/fixture',
    checkoutResult: JSON.stringify({
      livemode: true,
      metadata: { checkout_flow: 'pricing', trial_days: '0' },
    }),
    paymentResult: null,
    status: 'created',
    paymentAmount: null,
    subscriptionNo: null,
    createdAt: created,
    paidAt: null,
    ...overrides,
  };
}
function renewal(
  subscriptionNo: string,
  overrides: Partial<FunnelOrder> = {}
): FunnelOrder {
  return checkout('renewal', {
    paymentType: 'renew',
    status: 'paid',
    subscriptionNo,
    paymentAmount: 990,
    paidAt: new Date('2026-10-24T20:00:00Z'),
    checkoutResult: null,
    paymentResult: JSON.stringify({ livemode: true }),
    ...overrides,
  });
}

test('completion, trials, positive charges and duplicate delivery are distinct', () => {
  const paid = checkout('paid', {
    status: 'paid',
    paymentAmount: 990,
    paidAt: created,
  });
  const trial = checkout('trial', {
    status: 'trialing',
    paymentAmount: 0,
    subscriptionNo: 'sub_trial',
  });
  const rows = [
    checkout('open'),
    paid,
    paid,
    trial,
    checkout('zero', { status: 'paid', paymentAmount: 0, paidAt: created }),
    checkout('pending', {
      status: 'pending',
      paymentResult: '{"livemode":true,"status":"complete"}',
    }),
    checkout('failed', { status: 'failed' }),
  ];
  const report = summarizePaymentFunnel(
    rows,
    [renewal('sub_trial'), renewal('sub_trial')],
    30,
    now
  );
  assert.equal(report.checkoutStarted, 6);
  assert.equal(report.checkoutCompleted, 4);
  assert.equal(report.paymentSucceeded, 2);
  assert.equal(report.trialStarted, 1);
  assert.equal(report.trialConverted, 1);
  assert.equal(report.byFlow[0].checkoutStarted, 6);
});

test('only confirmed live checkouts in the cohort count; no PII leaves the report', () => {
  const report = summarizePaymentFunnel(
    [
      checkout('test', {
        checkoutResult: '{"livemode":false}',
        status: 'paid',
        paymentAmount: 990,
        paidAt: created,
      }),
      checkout('corrupt', { checkoutResult: '{broken' }),
      checkout('mixed', { paymentResult: '{"livemode":false}' }),
      checkout('old', { createdAt: new Date('2026-09-01') }),
      checkout('future', { createdAt: new Date('2026-11-01') }),
      checkout('manual', { paymentProvider: 'manual' }),
      checkout('missing', { paymentSessionId: null }),
      renewal('sub_old'),
      checkout('guest-private-id', {
        checkoutResult:
          '{"livemode":true,"metadata":{"checkout_flow":"guest_backup","email":"private@example.invalid"}}',
      }),
    ],
    [],
    7,
    now
  );
  assert.equal(report.checkoutStarted, 1);
  assert.equal(report.excludedTestCheckouts, 2);
  assert.equal(report.excludedUnverifiedCheckouts, 1);
  assert.equal(report.byFlow[2].checkoutStarted, 1);
  assert.doesNotMatch(
    JSON.stringify(report),
    /private|checkout\.stripe|guest-private-id/
  );
});

test('only real later charges for the same subscription convert a trial', () => {
  const trial = checkout('trial', {
    status: 'trialing',
    subscriptionNo: 'sub_trial',
  });
  const excluded = [
    renewal('other'),
    renewal('sub_trial', { paymentAmount: 0 }),
    renewal('sub_trial', { status: 'failed' }),
    renewal('sub_trial', { paidAt: null }),
    renewal('sub_trial', { paidAt: new Date('2026-10-19') }),
    renewal('sub_trial', { paidAt: new Date('2026-11-01') }),
    renewal('sub_trial', { paymentResult: '{"livemode":false}' }),
    renewal('sub_trial', { paymentProvider: 'creem' }),
  ];
  assert.equal(
    summarizePaymentFunnel([trial], excluded, 30, now).paymentSucceeded,
    0
  );
  assert.equal(
    summarizePaymentFunnel(
      [trial],
      [...excluded, renewal('sub_trial')],
      30,
      now
    ).paymentSucceeded,
    1
  );
});
