import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  guardPricingAction,
  type GuardCheckoutOptions,
} from './guard-checkout';

const renewalOff: GuardCheckoutOptions = {
  hasSubscription: true,
  trialEligible: false,
  currentSubscription: {
    planId: 'lite',
    currentPeriodEnd: '2027-10-16T00:00:00.000Z',
    renewalOff: true,
  },
};

test('a canceled renewal offers details for the current plan and prevents overlapping purchases', () => {
  assert.equal(guardPricingAction(renewalOff, 'lite'), 'view');
  assert.equal(guardPricingAction(renewalOff, 'pro'), 'wait');
  assert.equal(guardPricingAction(renewalOff, 'ultra'), 'wait');
});

test('active subscriptions keep management separate from other plans without promising an unsupported upgrade', () => {
  const active = {
    ...renewalOff,
    currentSubscription: {
      ...renewalOff.currentSubscription!,
      renewalOff: false,
    },
  };
  assert.equal(guardPricingAction(active, 'lite'), 'manage');
  assert.equal(guardPricingAction(active, 'pro'), 'billing');
  assert.equal(
    guardPricingAction({ ...active, currentSubscription: null }, 'lite'),
    'billing'
  );
});

test('ended subscriptions can purchase again, while newcomers retain checkout', () => {
  for (const trialEligible of [true, false]) {
    const options = {
      hasSubscription: false,
      trialEligible,
      currentSubscription: null,
    };
    for (const plan of ['lite', 'pro', 'ultra'] as const) {
      assert.equal(guardPricingAction(options, plan), 'checkout');
    }
  }
  assert.equal(guardPricingAction(undefined, 'lite'), 'checkout');
});
