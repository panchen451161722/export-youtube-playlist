import assert from 'node:assert/strict';
import test from 'node:test';

import { PaymentInterval, PaymentType } from '@/core/payment/types';
import {
  getGuardCheckoutProvider,
  getGuardPlan,
  GUARD_TRIAL_COLLECTION_LIMIT,
  GUARD_TRIAL_DAYS,
  guardProductId,
} from '@/config/guard-plans';
import { getPricingProduct } from '@/config/pricing';

test('guard checkout products preserve published USD prices and recurring intervals', () => {
  const contracts = [
    { id: 'lite', limit: 2, monthly: 99, yearly: 990 },
    { id: 'pro', limit: 15, monthly: 299, yearly: 2990 },
    { id: 'ultra', limit: 50, monthly: 699, yearly: 6990 },
  ] as const;
  for (const contract of contracts) {
    for (const period of ['monthly', 'yearly'] as const) {
      const id = guardProductId(contract.id, period);
      const product = getPricingProduct(id);
      assert.ok(product);
      assert.equal(product.productId, id);
      assert.equal(product.priceInCents, contract[period]);
      assert.equal(product.currency, 'usd');
      assert.equal(product.type, PaymentType.SUBSCRIPTION);
      assert.equal(product.credits, 0);
      assert.equal(product.plan?.intervalCount, 1);
      assert.equal(
        product.plan?.interval,
        period === 'monthly' ? PaymentInterval.MONTH : PaymentInterval.YEAR
      );
      assert.equal(getGuardPlan(id)?.collectionLimit, contract.limit);
    }
  }
  assert.equal(GUARD_TRIAL_DAYS, 7);
  assert.equal(GUARD_TRIAL_COLLECTION_LIMIT, 15);
  assert.equal(getPricingProduct('pro_monthly')?.priceInCents, 2900);
});

test('unknown products and unrelated subscriptions do not resolve a guard plan', () => {
  for (const input of [
    '',
    'pro_monthly',
    'guard_pro',
    'guard_pro_lifetime',
    'guard_ultra_monthly_extra',
  ]) {
    assert.equal(getGuardPlan(input), null);
  }
  assert.equal(getPricingProduct('guard_pro_lifetime'), null);
});

test('checkout capability requires Stripe credentials and never returns their values', () => {
  assert.equal(getGuardCheckoutProvider({}), '');
  assert.equal(getGuardCheckoutProvider({ stripe_enabled: 'true' }), '');
  assert.equal(
    getGuardCheckoutProvider({ stripe_secret_key: 'dummy-secret' }),
    'stripe'
  );
  assert.equal(
    getGuardCheckoutProvider({ stripe_api_key: 'dummy-api-key' }),
    'stripe'
  );
  assert.equal(
    getGuardCheckoutProvider({
      creem_enabled: 'true',
      creem_api_key: 'dummy-secret',
    }),
    ''
  );
  assert.equal(
    getGuardCheckoutProvider({
      default_payment_provider: 'creem',
      stripe_secret_key: 'dummy-secret',
    }),
    'stripe'
  );
});
