import type { GuardPlanId } from '@/config/guard-plans';

export type GuardCheckoutOptions = {
  trialEligible: boolean;
  hasSubscription: boolean;
  currentSubscription: {
    planId: GuardPlanId;
    currentPeriodEnd: string;
    renewalOff: boolean;
  } | null;
};

/** Match each pricing action to an operation supported by the checkout API. */
export function guardPricingAction(
  options: GuardCheckoutOptions | undefined,
  planId: GuardPlanId
): 'checkout' | 'manage' | 'view' | 'wait' | 'billing' {
  if (!options?.hasSubscription) return 'checkout';
  const current = options.currentSubscription;
  if (current?.planId === planId) return current.renewalOff ? 'view' : 'manage';
  if (current?.renewalOff) return 'wait';
  return 'billing';
}
