import { createFileRoute } from '@tanstack/react-router';

import { getAllConfigs } from '@/modules/config/service';
import { handlePaymentCallback } from '@/modules/payment/service';
import { paymentAppUrl } from '@/lib/payment-return-url';

import { completeGuestFromOrder } from './-guest-checkout';

/**
 * GET /api/payment/callback?order_no=xxx&redirect=xxx
 *
 * After payment (e.g. Alipay return_url), this endpoint:
 * 1. Queries the payment provider for the latest order status
 * 2. Updates the order in DB if paid
 * 3. Redirects to the final destination (same-origin only)
 */
function resolveSameOriginRedirect(
  input: string | null,
  fallbackUrl: string,
  baseUrl: string
): string {
  if (!input) return fallbackUrl;
  try {
    const appUrl = new URL(baseUrl);
    const target = new URL(input, appUrl);
    if (target.origin !== appUrl.origin) return fallbackUrl;
    return target.toString();
  } catch {
    return fallbackUrl;
  }
}

async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const orderNo = url.searchParams.get('order_no');
  const redirect = url.searchParams.get('redirect');
  const configs = await getAllConfigs();
  const appUrl = paymentAppUrl(configs.app_url, request.url);
  const fallback = `${appUrl}/settings/billing`;

  try {
    if (orderNo) {
      await handlePaymentCallback(orderNo);
      await completeGuestFromOrder(orderNo);
    }
  } catch (error: any) {
    console.error('Payment callback processing incomplete');
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: resolveSameOriginRedirect(redirect, fallback, appUrl),
    },
  });
}

export const Route = createFileRoute('/api/payment/callback')({
  server: {
    handlers: { GET },
  },
});
