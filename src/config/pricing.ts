/**
 * Authoritative pricing catalog.
 *
 * The checkout API uses this as the SOURCE OF TRUTH for price/credits/duration.
 * Any price, credits, or plan info sent by the client is IGNORED — only the
 * product_id is honored, and everything else is looked up here.
 *
 * To change pricing, edit this file and redeploy. Admin UI cannot alter prices.
 */

import { PaymentInterval, PaymentType } from '@/core/payment/types';
import { GUARD_PLANS, guardProductId } from '@/config/guard-plans';

export type PricingPlanInfo = {
  name: string;
  interval: PaymentInterval;
  intervalCount: number;
};

export type PricingProduct = {
  productId: string;
  productName: string;
  planName: string;
  description: string;
  type: PaymentType;
  priceInCents: number;
  currency: string;
  credits: number;
  creditsValidDays?: number;
  plan?: PricingPlanInfo;
};

/** Only the published annual backup plans are available for new purchases. */
export const pricingCatalog: Record<string, PricingProduct> =
  Object.fromEntries(
    GUARD_PLANS.map((plan) => {
      const productId = guardProductId(plan.id);
      return [
        productId,
        {
          productId,
          productName: `YouTube Playlist Backup ${plan.name}`,
          planName: plan.name,
          description: `${plan.name} annual subscription — ${plan.collectionLimit} collections`,
          type: PaymentType.SUBSCRIPTION,
          priceInCents: plan.yearlyPriceInCents,
          currency: 'usd',
          credits: 0,
          plan: {
            name: plan.name,
            interval: PaymentInterval.YEAR,
            intervalCount: 1,
          },
        } satisfies PricingProduct,
      ];
    })
  );

export function getPricingProduct(productId: string): PricingProduct | null {
  return Object.hasOwn(pricingCatalog, productId)
    ? pricingCatalog[productId]
    : null;
}

export function listPricingProducts(): PricingProduct[] {
  return Object.values(pricingCatalog);
}
