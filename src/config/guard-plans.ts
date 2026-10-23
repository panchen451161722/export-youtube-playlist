/** Shared limits and prices for playlist monitoring and server-side checkout. */
export const GUARD_TRIAL_DAYS = 7;
export const GUARD_SNAPSHOT_LIMIT = 5;

export const GUARD_PLANS = [
  {
    id: 'lite',
    name: 'Lite',
    collectionLimit: 2,
    yearlyPriceInCents: 990,
  },
  {
    id: 'pro',
    name: 'Pro',
    collectionLimit: 15,
    yearlyPriceInCents: 2990,
  },
  {
    id: 'ultra',
    name: 'Ultra',
    collectionLimit: 50,
    yearlyPriceInCents: 6990,
  },
] as const;

export type GuardPlan = (typeof GUARD_PLANS)[number];
export type GuardPlanId = GuardPlan['id'];
export type GuardBillingPeriod = 'yearly';

export function getGuardPlan(productIdOrPlanId: string): GuardPlan | null {
  return (
    GUARD_PLANS.find(
      (plan) =>
        plan.id === productIdOrPlanId ||
        `guard_${plan.id}_monthly` === productIdOrPlanId ||
        `guard_${plan.id}_yearly` === productIdOrPlanId
    ) ?? null
  );
}

export function guardProductId(
  plan: GuardPlanId,
  period: GuardBillingPeriod = 'yearly'
): string {
  return `guard_${plan}_${period}`;
}

/** Only configured, fixed annual prices may be sold. Legacy monthly entitlements remain readable. */
export function getGuardStripePriceId(
  configs: Record<string, string>,
  productId: string
): string | null {
  try {
    const mapping = JSON.parse(configs.stripe_price_ids_mapping || '{}');
    const value = mapping?.[productId];
    return typeof value === 'string' && /^price_[a-zA-Z0-9]+$/.test(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

export function getGuardCheckoutProvider(
  configs: Record<string, string>
): 'stripe' | '' {
  return configs.stripe_enabled === 'true' &&
    !!(configs.stripe_secret_key || configs.stripe_api_key) &&
    !!(configs.stripe_signing_secret || configs.stripe_webhook_secret) &&
    GUARD_PLANS.every((plan) =>
      getGuardStripePriceId(configs, guardProductId(plan.id))
    )
    ? 'stripe'
    : '';
}
