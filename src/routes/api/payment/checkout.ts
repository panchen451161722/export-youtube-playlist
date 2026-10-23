import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getGuardCheckoutProvider, getGuardPlan } from '@/config/guard-plans';
import { getPricingProduct } from '@/config/pricing';
import { getAllConfigs } from '@/modules/config/service';
import {
  createCheckout,
  getGuardCheckoutOptions,
} from '@/modules/payment/service';
import { createGuardStore } from '@/modules/playlist-guard/service';
import { backupCheckoutPaths } from '@/lib/backup-checkout';
import { paymentAppUrl } from '@/lib/payment-return-url';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

function safeSameOriginPath(
  input: string | undefined | null,
  fallbackPath: string,
  baseUrl: string
): string {
  if (!input) return fallbackPath;
  try {
    const appUrl = new URL(baseUrl);
    const candidate = new URL(input, appUrl);
    if (candidate.origin !== appUrl.origin) return fallbackPath;
    return candidate.pathname + candidate.search + candidate.hash;
  } catch {
    return fallbackPath;
  }
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'checkout',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return respErr('Unauthorized');
    }

    const body = await request.json().catch(() => ({}));
    const { product_id, payment_provider, redirect } = body;

    if (!product_id || typeof product_id !== 'string') {
      return respErr('Missing product_id');
    }

    // Look up product in the authoritative server-side catalog.
    // We DO NOT trust price / credits / plan from the request body.
    const product = getPricingProduct(product_id);
    if (!product) {
      return respErr('Unknown product');
    }

    if (getGuardPlan(product_id)) {
      if (request.headers.get('origin') !== new URL(request.url).origin) {
        return respErr('Invalid request origin', { status: 403 });
      }
      if (payment_provider !== 'stripe') {
        return respErr('Monitoring subscriptions currently use Stripe.', {
          status: 400,
        });
      }
      const entitlement = await createGuardStore().entitlement(session.user.id);
      if (['lite', 'pro', 'ultra'].includes(entitlement.plan)) {
        return respErr(
          'You already have a monitoring subscription. Manage it from Billing before purchasing another.',
          { status: 409 }
        );
      }
    }

    const configs = await getAllConfigs();
    if (!getGuardCheckoutProvider(configs)) {
      return respErr('Annual checkout is not configured yet.', { status: 503 });
    }
    const options = await getGuardCheckoutOptions(
      session.user.id,
      session.user.email
    );
    if (options.hasSubscription)
      return respErr('Manage your existing subscription from Billing.', {
        status: 409,
      });
    // The browser displays eligibility, but never decides trial duration or price.
    if (body.expect_trial !== options.trialEligible) {
      return respErr(
        'Subscription eligibility changed. Refresh pricing and try again.',
        { status: 409 }
      );
    }

    // Build success/cancel URLs — only accept same-origin redirects.
    const baseUrl = paymentAppUrl(configs.app_url, request.url);
    const backupPaths = backupCheckoutPaths(body.checkout_flow, body.locale);
    const safeRedirectPath =
      backupPaths?.success ??
      safeSameOriginPath(redirect, '/settings/billing', baseUrl);
    const successUrl = `${baseUrl}${safeRedirectPath}`;
    const cancelUrl = `${baseUrl}${backupPaths?.cancel ?? '/pricing'}`;

    const checkout = await createCheckout({
      requestUrl: request.url,
      userId: session.user.id,
      userEmail: session.user.email,
      productName: product.productName,
      planName: product.planName,
      credits: product.credits,
      creditsValidDays: product.creditsValidDays,
      paymentOrder: {
        metadata: {
          checkout_flow: backupPaths ? 'backup' : 'pricing',
          checkout_locale: body.locale === 'zh' ? 'zh' : 'en',
        },
        productId: product.productId,
        price: { amount: product.priceInCents, currency: product.currency },
        type: product.type,
        description: product.description,
        successUrl,
        cancelUrl,
        customer: {
          email: session.user.email,
          name: session.user.name,
        },
        plan: product.plan
          ? {
              name: product.plan.name,
              interval: product.plan.interval,
              intervalCount: product.plan.intervalCount,
              trialPeriodDays: options.trialEligible
                ? product.plan.trialPeriodDays
                : undefined,
            }
          : undefined,
      },
      provider: payment_provider,
    });

    return respData({ checkout_url: checkout.checkoutInfo.checkoutUrl });
  } catch (error: any) {
    console.error('checkout failed:', error?.type || error?.name || 'Error');
    return respErr('Checkout failed. Please try again or contact support.', {
      status: 502,
    });
  }
}

async function GET({ request }: { request: Request }) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return respErr('Unauthorized', { status: 401 });
  try {
    return respData(
      await getGuardCheckoutOptions(session.user.id, session.user.email),
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch {
    return respErr('Checkout is not available yet.', { status: 503 });
  }
}

export const Route = createFileRoute('/api/payment/checkout')({
  server: {
    handlers: { GET, POST },
  },
});
