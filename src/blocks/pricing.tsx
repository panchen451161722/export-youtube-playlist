import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import {
  GUARD_PLANS,
  GUARD_SNAPSHOT_LIMIT,
  GUARD_TRIAL_DAYS,
  guardProductId,
  type GuardPlanId,
} from '@/config/guard-plans';
import { SUBSCRIBER_PLAYLIST_EXPORT_LIMIT } from '@/config/playlist-export';
import { apiGet, apiPost } from '@/lib/api-client';
import { readBackupDraft } from '@/lib/backup-draft';
import {
  guardPricingAction,
  type GuardCheckoutOptions,
} from '@/lib/guard-checkout';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  GuardPricing,
  type GuardPricingContent,
} from '@/components/guard-pricing';

export function Pricing({ asPage = false }: { asPage?: boolean }) {
  const config = usePublicConfig();
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  const checkoutProvider = config.data?.guard_checkout_provider;
  const eligibility = useQuery({
    queryKey: ['checkout-eligibility', session?.user.id],
    queryFn: () => apiGet<GuardCheckoutOptions>('/api/payment/checkout'),
    enabled: !!session?.user && checkoutProvider === 'stripe',
    staleTime: 0,
  });
  const trialEligible =
    !session?.user || eligibility.data?.trialEligible === true;
  const checkoutAvailable = checkoutProvider === 'stripe';
  const currentSubscription = eligibility.data?.currentSubscription;
  const currentPlan = GUARD_PLANS.find(
    (plan) => plan.id === currentSubscription?.planId
  );
  const currentEnd = currentSubscription
    ? new Date(currentSubscription.currentPeriodEnd).toLocaleDateString(
        getLocale()
      )
    : '';
  const checkout = useMutation({
    mutationFn: (planId: GuardPlanId) =>
      apiPost<{ checkout_url: string }>('/api/payment/checkout', {
        product_id: guardProductId(planId),
        payment_provider: checkoutProvider,
        redirect: readBackupDraft()
          ? '/youtube-playlist-backup'
          : '/settings/collections',
        expect_trial: trialEligible,
      }),
    onSuccess: (result) => {
      // Only a successful, explicit checkout request may leave this page.
      const url = new URL(result.checkout_url);
      if (url.protocol !== 'https:') {
        throw new Error(m['guardPricing.checkout_error']());
      }
      window.location.assign(url.href);
    },
    onError: () => {
      toast.error(m['guardPricing.checkout_error']());
      void eligibility.refetch();
    },
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
    m['guardPricing.feature_playlist_exports']({
      limit: SUBSCRIBER_PLAYLIST_EXPORT_LIMIT,
    }),
  ];
  const same = (value: string) => GUARD_PLANS.map(() => value);
  const content: GuardPricingContent = {
    eyebrow: m['guardPricing.eyebrow'](),
    title: m['guardPricing.title'](),
    description: m['guardPricing.description'](),
    annualBilling: m['guardPricing.annual_billing'](),
    subscriptionNotice:
      currentPlan && currentSubscription
        ? currentSubscription.renewalOff
          ? m['guardPricing.current_ending']({
              plan: currentPlan.name,
              date: currentEnd,
            })
          : m['guardPricing.current_active']({ plan: currentPlan.name })
        : eligibility.data?.hasSubscription
          ? m['guardPricing.existing_subscription']()
          : undefined,
    trialNote:
      trialEligible && !eligibility.data?.hasSubscription
        ? m['guardPricing.trial_note']({
            days: GUARD_TRIAL_DAYS,
          })
        : '',
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
    supportNote: m['guardPricing.support_note'](),
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
    plans: GUARD_PLANS.map((plan) => {
      const action = guardPricingAction(eligibility.data, plan.id);
      const cta = {
        checkout: trialEligible
          ? m['guardPricing.trial']({ days: GUARD_TRIAL_DAYS })
          : m['guardPricing.buy'](),
        manage: m['guardPricing.manage'](),
        view: m['guardPricing.view_subscription'](),
        wait: m['guardPricing.available_after_period'](),
        billing: m['guardPricing.billing_options'](),
      }[action];
      return {
        id: plan.id,
        name: plan.name,
        description: descriptions[plan.id],
        price: `$${(plan.yearlyPriceInCents / 100).toFixed(2)}`,
        period: m['guardPricing.per_year'](),
        collectionLabel: m['guardPricing.collections']({
          count: plan.collectionLimit,
        }),
        features: sharedFeatures,
        cta,
        ctaDisabled: action === 'wait',
        badge:
          currentSubscription?.planId === plan.id
            ? m['guardPricing.current_plan']()
            : undefined,
        statusNote:
          currentSubscription?.planId === plan.id &&
          currentSubscription.renewalOff
            ? m['guardPricing.renewal_off_until']({ date: currentEnd })
            : undefined,
      };
    }),
    comparison: [
      {
        feature: m['guardPricing.compare_collections'](),
        values: GUARD_PLANS.map((plan) => String(plan.collectionLimit)),
      },
      {
        feature: m['guardPricing.compare_items'](),
        values: same(m['guardPricing.compare_items_value']()),
      },
      {
        feature: m['guardPricing.compare_playlist_exports'](),
        values: same(String(SUBSCRIBER_PLAYLIST_EXPORT_LIMIT)),
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
      onBuy={(planId) => {
        if (!session?.user) {
          router.push('/sign-in?callbackUrl=%2Fpricing');
          return;
        }
        const action = guardPricingAction(eligibility.data, planId);
        if (action === 'wait') return;
        if (action !== 'checkout') {
          router.push('/settings/billing');
          return;
        }
        if (checkoutAvailable && eligibility.data) checkout.mutate(planId);
      }}
      pendingPlan={checkout.isPending ? checkout.variables : undefined}
      checkoutAvailable={
        checkoutAvailable &&
        !sessionPending &&
        (!session?.user || !!eligibility.data)
      }
      checkoutLoading={
        config.isPending ||
        sessionPending ||
        (checkoutAvailable && !!session?.user && eligibility.isPending)
      }
      asPage={asPage}
    />
  );
}
