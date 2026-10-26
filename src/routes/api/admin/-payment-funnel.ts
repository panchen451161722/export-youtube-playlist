import {
  PAYMENT_FUNNEL_DAYS,
  type PaymentFunnelDays,
  type PaymentFunnelReport,
} from '@/lib/payment-funnel';
import { respData, respErr } from '@/lib/resp';

export function createPaymentFunnelHandler(deps: {
  getUserId: (request: Request) => Promise<string | null>;
  canRead: (userId: string) => Promise<boolean>;
  report: (days: PaymentFunnelDays) => Promise<PaymentFunnelReport>;
}) {
  return async ({ request }: { request: Request }) => {
    const headers = { 'Cache-Control': 'private, no-store' };
    try {
      const userId = await deps.getUserId(request);
      if (!userId) return respErr('Unauthorized', { status: 401, headers });
      if (!(await deps.canRead(userId)))
        return respErr('Forbidden', { status: 403, headers });
      const days = Number(
        new URL(request.url).searchParams.get('days') ?? '30'
      );
      if (!PAYMENT_FUNNEL_DAYS.includes(days as PaymentFunnelDays)) {
        return respErr('Invalid date range', { status: 400, headers });
      }
      return respData(await deps.report(days as PaymentFunnelDays), {
        headers,
      });
    } catch {
      return respErr('Unable to load payment funnel', { status: 500, headers });
    }
  };
}
