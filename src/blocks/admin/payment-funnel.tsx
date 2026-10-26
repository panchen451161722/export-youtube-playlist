import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api-client';
import {
  PAYMENT_FUNNEL_DAYS,
  type PaymentFunnelDays,
  type PaymentFunnelReport,
} from '@/lib/payment-funnel';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';

function rate(numerator: number, denominator: number) {
  return denominator ? `${((numerator / denominator) * 100).toFixed(1)}%` : '—';
}

export function PaymentFunnel() {
  const [days, setDays] = useState<PaymentFunnelDays>(30);
  const query = useQuery({
    queryKey: ['admin-payment-funnel', days],
    queryFn: () =>
      apiGet<PaymentFunnelReport>(`/api/admin/payment-funnel?days=${days}`),
    staleTime: 30_000,
  });
  const data = query.data;
  const flowLabels = {
    pricing: m['admin.funnel.flow_pricing'](),
    backup: m['admin.funnel.flow_backup'](),
    guest_backup: m['admin.funnel.flow_guest'](),
    unknown: m['admin.funnel.flow_unknown'](),
  };
  const stages = data
    ? [
        {
          label: m['admin.funnel.started'](),
          value: data.checkoutStarted,
          percentage: null,
        },
        {
          label: m['admin.funnel.completed'](),
          value: data.checkoutCompleted,
          percentage: rate(data.checkoutCompleted, data.checkoutStarted),
        },
        {
          label: m['admin.funnel.paid'](),
          value: data.paymentSucceeded,
          percentage: rate(data.paymentSucceeded, data.checkoutStarted),
        },
      ]
    : [];

  return (
    <section
      className="border-border rounded-xl border p-5"
      aria-labelledby="payment-funnel-title"
      aria-busy={query.isFetching}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="payment-funnel-title" className="text-lg font-semibold">
          {m['admin.funnel.title']()}
        </h2>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_FUNNEL_DAYS.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={days === value ? 'default' : 'outline'}
              aria-pressed={days === value}
              onClick={() => setDays(value)}
            >
              {m['admin.funnel.days']({ days: value })}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {m['admin.funnel.refresh']()}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground mt-2 text-sm">
        {m['admin.funnel.scope']()}
      </p>
      {query.isPending && (
        <p role="status" className="mt-4 text-sm">
          {m['admin.funnel.loading']()}
        </p>
      )}
      {query.isError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {m['admin.funnel.error']()}
        </p>
      )}
      {data && (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {stages.map((stage, index) => (
              <div key={stage.label} className="bg-muted/40 rounded-lg p-4">
                <p className="text-muted-foreground text-sm">
                  {index + 1}. {stage.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {stage.value}
                </p>
                {stage.percentage && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    {m['admin.funnel.rate']({ rate: stage.percentage })}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm">
            {m['admin.funnel.trials']({
              started: data.trialStarted,
              converted: data.trialConverted,
            })}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            {m['admin.funnel.excluded']({
              test: data.excludedTestCheckouts,
              unknown: data.excludedUnverifiedCheckouts,
            })}
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                {m['admin.funnel.by_flow']()}
              </caption>
              <thead>
                <tr className="border-border border-b">
                  {[
                    m['admin.funnel.by_flow'](),
                    ...stages.map((stage) => stage.label),
                  ].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-2 py-2 font-medium"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.byFlow.map((flow) => (
                  <tr
                    key={flow.flow}
                    className="border-border border-b last:border-0"
                  >
                    <th scope="row" className="px-2 py-2 font-normal">
                      {flowLabels[flow.flow]}
                    </th>
                    <td className="px-2 py-2 tabular-nums">
                      {flow.checkoutStarted}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {flow.checkoutCompleted}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {flow.paymentSucceeded}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-4 text-xs">
            {m['admin.funnel.updated']({
              time: new Date(data.asOf).toLocaleString(),
            })}
          </p>
        </>
      )}
    </section>
  );
}
