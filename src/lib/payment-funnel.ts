export const PAYMENT_FUNNEL_DAYS = [1, 7, 30, 90] as const;
export type PaymentFunnelDays = (typeof PAYMENT_FUNNEL_DAYS)[number];

export interface FunnelOrder {
  paymentProvider: string;
  paymentSessionId: string | null;
  paymentType: string | null;
  checkoutUrl: string | null;
  checkoutResult: string | null;
  paymentResult: string | null;
  status: string;
  paymentAmount: number | null;
  subscriptionNo: string | null;
  createdAt: Date;
  paidAt: Date | null;
}

export interface PaymentFunnelCounts {
  checkoutStarted: number;
  checkoutCompleted: number;
  paymentSucceeded: number;
  trialStarted: number;
  trialConverted: number;
}

export type CheckoutFlow = 'pricing' | 'backup' | 'guest_backup' | 'unknown';
export interface PaymentFunnelReport extends PaymentFunnelCounts {
  days: PaymentFunnelDays;
  from: string;
  asOf: string;
  excludedTestCheckouts: number;
  excludedUnverifiedCheckouts: number;
  byFlow: Array<PaymentFunnelCounts & { flow: CheckoutFlow }>;
}

function providerObject(value: string | null): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function mode(row: FunnelOrder): 'live' | 'test' | 'unknown' {
  const checkout = providerObject(row.checkoutResult);
  const payment = providerObject(row.paymentResult);
  if (checkout.livemode === false || payment.livemode === false) return 'test';
  if (checkout.livemode === true || payment.livemode === true) return 'live';
  return 'unknown';
}

function positivePayment(row: FunnelOrder, asOf: Date) {
  return (
    row.status === 'paid' &&
    Number.isFinite(row.paymentAmount) &&
    (row.paymentAmount ?? 0) > 0 &&
    row.paidAt !== null &&
    row.paidAt <= asOf
  );
}

const emptyCounts = (): PaymentFunnelCounts => ({
  checkoutStarted: 0,
  checkoutCompleted: 0,
  paymentSucceeded: 0,
  trialStarted: 0,
  trialConverted: 0,
});

/** Server-confirmed Stripe checkout cohorts; no browser success flags or PII. */
export function summarizePaymentFunnel(
  checkouts: FunnelOrder[],
  renewals: FunnelOrder[],
  days: PaymentFunnelDays,
  asOf: Date
): PaymentFunnelReport {
  const from = new Date(asOf.getTime() - days * 86_400_000);
  const report: PaymentFunnelReport = {
    ...emptyCounts(),
    days,
    from: from.toISOString(),
    asOf: asOf.toISOString(),
    excludedTestCheckouts: 0,
    excludedUnverifiedCheckouts: 0,
    byFlow: (['pricing', 'backup', 'guest_backup', 'unknown'] as const).map(
      (flow) => ({ flow, ...emptyCounts() })
    ),
  };
  const paidRenewals = new Map<string, Date[]>();
  for (const renewal of renewals) {
    if (
      renewal.paymentProvider !== 'stripe' ||
      renewal.paymentType !== 'renew' ||
      !renewal.subscriptionNo ||
      mode(renewal) !== 'live' ||
      !positivePayment(renewal, asOf)
    )
      continue;
    const dates = paidRenewals.get(renewal.subscriptionNo) ?? [];
    dates.push(renewal.paidAt!);
    paidRenewals.set(renewal.subscriptionNo, dates);
  }
  const seen = new Set<string>();
  for (const row of checkouts) {
    if (
      row.paymentProvider !== 'stripe' ||
      !['one-time', 'subscription'].includes(row.paymentType || '') ||
      !row.paymentSessionId ||
      !row.checkoutUrl ||
      row.createdAt < from ||
      row.createdAt > asOf ||
      seen.has(row.paymentSessionId)
    )
      continue;
    seen.add(row.paymentSessionId);
    const environment = mode(row);
    if (environment !== 'live') {
      if (environment === 'test') report.excludedTestCheckouts++;
      else report.excludedUnverifiedCheckouts++;
      continue;
    }
    const checkout = providerObject(row.checkoutResult);
    const payment = providerObject(row.paymentResult);
    const metadata =
      checkout.metadata && typeof checkout.metadata === 'object'
        ? (checkout.metadata as Record<string, unknown>)
        : {};
    const flow =
      report.byFlow.find((item) => item.flow === metadata.checkout_flow) ??
      report.byFlow[3];
    const completed =
      ['paid', 'trialing'].includes(row.status) ||
      payment.status === 'complete';
    const paid =
      completed &&
      (positivePayment(row, asOf) ||
        (row.subscriptionNo &&
          paidRenewals
            .get(row.subscriptionNo)
            ?.some((date) => date >= row.createdAt)));
    const trial =
      completed &&
      (row.status === 'trialing' || Number(metadata.trial_days) > 0);
    for (const counts of [report, flow]) {
      counts.checkoutStarted++;
      if (completed) counts.checkoutCompleted++;
      if (paid) counts.paymentSucceeded++;
      if (trial) counts.trialStarted++;
      if (trial && paid) counts.trialConverted++;
    }
  }
  return report;
}
