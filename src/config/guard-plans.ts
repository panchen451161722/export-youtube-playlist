/** Shared limits and prices for playlist monitoring and server-side checkout. */
export const GUARD_TRIAL_DAYS = 7;
export const GUARD_TRIAL_COLLECTION_LIMIT = 15;
export const GUARD_SCAN_LIMIT = 500;
export const GUARD_SNAPSHOT_LIMIT = 5;

export const GUARD_PLANS = [
  {
    id: 'lite',
    name: 'Lite',
    collectionLimit: 2,
    monthlyPriceInCents: 99,
    yearlyPriceInCents: 990,
  },
  {
    id: 'pro',
    name: 'Pro',
    collectionLimit: 15,
    monthlyPriceInCents: 299,
    yearlyPriceInCents: 2990,
  },
  {
    id: 'ultra',
    name: 'Ultra',
    collectionLimit: 50,
    monthlyPriceInCents: 699,
    yearlyPriceInCents: 6990,
  },
] as const;

export type GuardPlan = (typeof GUARD_PLANS)[number];
export type GuardPlanId = GuardPlan['id'];
export type GuardBillingPeriod = 'monthly' | 'yearly';

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
  period: GuardBillingPeriod
): string {
  return `guard_${plan}_${period}`;
}

/** Match the Stripe setup used by payment/service without exposing credentials. */
export function getGuardCheckoutProvider(
  configs: Record<string, string>
): 'stripe' | '' {
  return configs.stripe_secret_key || configs.stripe_api_key ? 'stripe' : '';
}
