import assert from 'node:assert/strict';
import test from 'node:test';

import { PaymentInterval, PaymentType } from '@/core/payment/types';
import {
  getGuardCheckoutProvider,
  getGuardPlan,
  getGuardStripePriceId,
  GUARD_PLANS,
  guardProductId,
} from '@/config/guard-plans';
import { getPricingProduct, listPricingProducts } from '@/config/pricing';

test('only the three published annual plans can be purchased; legacy monthly access stays readable', () => {
  assert.equal(listPricingProducts().length, 3);
  for (const plan of GUARD_PLANS) {
    const product = getPricingProduct(guardProductId(plan.id));
    assert.ok(product);
    assert.equal(product.priceInCents, plan.yearlyPriceInCents);
    assert.equal(product.currency, 'usd');
    assert.equal(product.type, PaymentType.SUBSCRIPTION);
    assert.equal(product.credits, 0);
    assert.equal(product.plan?.interval, PaymentInterval.YEAR);
    assert.equal(product.plan?.intervalCount, 1);
    assert.equal(getPricingProduct(`guard_${plan.id}_monthly`), null);
    assert.equal(
      getGuardPlan(`guard_${plan.id}_monthly`)?.collectionLimit,
      plan.collectionLimit
    );
  }
  for (const id of [
    'pro_monthly',
    'starter_yearly',
    'pro_lifetime',
    '__proto__',
    'constructor',
    'guard_pro_lifetime',
  ]) {
    assert.equal(getPricingProduct(id), null);
  }
});

test('checkout fails closed without enabled credentials, webhook verification, or every price mapping', () => {
  const configs = {
    stripe_enabled: 'true',
    stripe_secret_key: 'test-placeholder',
    stripe_signing_secret: 'signing-placeholder',
    stripe_price_ids_mapping: JSON.stringify(
      Object.fromEntries(
        GUARD_PLANS.map((plan) => [guardProductId(plan.id), `price_${plan.id}`])
      )
    ),
  };
  assert.equal(getGuardCheckoutProvider(configs), 'stripe');
  for (const key of Object.keys(configs)) {
    assert.equal(getGuardCheckoutProvider({ ...configs, [key]: '' }), '');
  }
  assert.equal(
    getGuardCheckoutProvider({ ...configs, stripe_enabled: 'false' }),
    ''
  );
  for (const mapping of [
    'null',
    '[]',
    '{',
    '{"guard_lite_yearly":"prod_wrong"}',
  ]) {
    assert.equal(
      getGuardStripePriceId(
        { stripe_price_ids_mapping: mapping },
        'guard_lite_yearly'
      ),
      null
    );
    assert.equal(
      getGuardCheckoutProvider({
        ...configs,
        stripe_price_ids_mapping: mapping,
      }),
      ''
    );
  }
});
