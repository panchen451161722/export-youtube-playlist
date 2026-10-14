import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import {
  GUARD_PLANS,
  GUARD_SCAN_LIMIT,
  GUARD_SNAPSHOT_LIMIT,
  GUARD_TRIAL_COLLECTION_LIMIT,
  GUARD_TRIAL_DAYS,
  guardProductId,
  type GuardBillingPeriod,
  type GuardPlanId,
} from '@/config/guard-plans';
import { apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  GuardPricing,
  type GuardPricingContent,
} from '@/components/guard-pricing';

export function Pricing({ asPage = false }: { asPage?: boolean }) {
  const [period, setPeriod] = useState<GuardBillingPeriod>('monthly');
  const config = usePublicConfig();
  const { data: session } = useSession();
  const router = useRouter();
  const checkoutProvider = config.data?.guard_checkout_provider;
  const checkoutAvailable = checkoutProvider === 'stripe';
  const checkout = useMutation({
    mutationFn: (planId: GuardPlanId) =>
      apiPost<{ checkout_url: string }>('/api/payment/checkout', {
        product_id: guardProductId(planId, period),
        payment_provider: checkoutProvider,
        redirect: '/settings/collections',
      }),
    onSuccess: (result) => {
      // Only a successful, explicit checkout request may leave this page.
      const url = new URL(result.checkout_url);
      if (url.protocol !== 'https:') {
        throw new Error(m['guardPricing.checkout_error']());
      }
      window.location.assign(url.href);
    },
    onError: () => toast.error(m['guardPricing.checkout_error']()),
  });

  const descriptions = {
    lite: m['guardPricing.lite_description'](),
    pro: m['guardPricing.pro_description'](),
    ultra: m['guardPricing.ultra_description'](),
  };
  const sharedFeatures = [
    m['guardPricing.feature_sources'](),
    m['guardPricing.feature_snapshots']({ count: GUARD_SNAPSHOT_LIMIT }),
    m['guardPricing.feature_changes'](),
    m['guardPricing.feature_exports'](),
  ];
  const same = (value: string) => GUARD_PLANS.map(() => value);
  const content: GuardPricingContent = {
    eyebrow: m['guardPricing.eyebrow'](),
    title: m['guardPricing.title'](),
    description: m['guardPricing.description'](),
    monthly: m['guardPricing.monthly'](),
    yearly: m['guardPricing.yearly'](),
    annualSaving: m['guardPricing.annual_saving'](),
    billingLabel: m['guardPricing.billing_label'](),
    trial: m['guardPricing.trial']({ days: GUARD_TRIAL_DAYS }),
    trialNote: m['guardPricing.trial_note']({
      days: GUARD_TRIAL_DAYS,
      count: GUARD_TRIAL_COLLECTION_LIMIT,
    }),
    demo: m['guardPricing.demo'](),
    recommended: m['guardPricing.recommended'](),
    buy: m['guardPricing.buy'](),
    buying: m['guardPricing.buying'](),
    checkoutUnavailable: m['guardPricing.checkout_unavailable'](),
    checkoutLoading: m['guardPricing.checkout_loading'](),
    footerNote: m['guardPricing.footer_note'](),
    freeTitle: m['guardPricing.free_title'](),
    freeDescription: m['guardPricing.free_description'](),
    freeLink: m['guardPricing.free_link'](),
    comparisonTitle: m['guardPricing.comparison_title'](),
    comparisonDescription: m['guardPricing.comparison_description'](),
    featureLabel: m['guardPricing.feature_label'](),
    supportNote: m['guardPricing.support_note']({ count: GUARD_SCAN_LIMIT }),
    faqTitle: m['guardPricing.faq_title'](),
    faq: [
      {
        question: m['guardPricing.faq_collection_q'](),
        answer: m['guardPricing.faq_collection_a'](),
      },
      {
        question: m['guardPricing.faq_trial_q'](),
        answer: m['guardPricing.faq_trial_a']({
          days: GUARD_TRIAL_DAYS,
          count: GUARD_TRIAL_COLLECTION_LIMIT,
        }),
      },
      {
        question: m['guardPricing.faq_video_q'](),
        answer: m['guardPricing.faq_video_a'](),
      },
      {
        question: m['guardPricing.faq_private_q'](),
        answer: m['guardPricing.faq_private_a'](),
      },
      {
        question: m['guardPricing.faq_cancel_q'](),
        answer: m['guardPricing.faq_cancel_a'](),
      },
    ],
    plans: GUARD_PLANS.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: descriptions[plan.id],
      price: `$${((period === 'monthly' ? plan.monthlyPriceInCents : plan.yearlyPriceInCents) / 100).toFixed(2)}`,
      period:
        period === 'monthly'
          ? m['guardPricing.per_month']()
          : m['guardPricing.per_year'](),
      collectionLabel: m['guardPricing.collections']({
        count: plan.collectionLimit,
      }),
      features: sharedFeatures,
    })),
    comparison: [
      {
        feature: m['guardPricing.compare_collections'](),
        values: GUARD_PLANS.map((plan) => String(plan.collectionLimit)),
      },
      {
        feature: m['guardPricing.compare_items'](),
        values: same(String(GUARD_SCAN_LIMIT)),
      },
      {
        feature: m['guardPricing.compare_sources'](),
        values: same(m['guardPricing.compare_sources_value']()),
      },
      {
        feature: m['guardPricing.compare_history'](),
        values: same(
          m['guardPricing.compare_history_value']({
            count: GUARD_SNAPSHOT_LIMIT,
          })
        ),
      },
      {
        feature: m['guardPricing.compare_exports'](),
        values: same('CSV / Excel / JSON'),
      },
      {
        feature: m['guardPricing.compare_schedule'](),
        values: same(m['guardPricing.compare_schedule_value']()),
      },
      {
        feature: m['guardPricing.compare_alerts'](),
        values: same(m['guardPricing.compare_alerts_value']()),
      },
    ],
  };

  return (
    <GuardPricing
      content={content}
      period={period}
      onPeriodChange={setPeriod}
      onBuy={(planId) => {
        if (!session?.user) {
          router.push('/sign-in?callbackUrl=%2Fpricing');
          return;
        }
        if (checkoutAvailable) checkout.mutate(planId);
      }}
      pendingPlan={checkout.isPending ? checkout.variables : undefined}
      checkoutAvailable={checkoutAvailable}
      checkoutLoading={config.isPending}
      asPage={asPage}
    />
  );
}
