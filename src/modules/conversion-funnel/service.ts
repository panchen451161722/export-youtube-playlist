import { and, eq, gte, inArray, isNotNull, isNull, lte } from 'drizzle-orm';

import { db } from '@/core/db';
import { order } from '@/config/db/schema';
import {
  summarizePaymentFunnel,
  type FunnelOrder,
  type PaymentFunnelDays,
} from '@/lib/payment-funnel';

const fields = {
  paymentProvider: order.paymentProvider,
  paymentSessionId: order.paymentSessionId,
  paymentType: order.paymentType,
  checkoutUrl: order.checkoutUrl,
  checkoutResult: order.checkoutResult,
  paymentResult: order.paymentResult,
  status: order.status,
  paymentAmount: order.paymentAmount,
  subscriptionNo: order.subscriptionNo,
  createdAt: order.createdAt,
  paidAt: order.paidAt,
};

/** Guest and signed-in checkouts both persist here; never double-count guest_checkout. */
export async function getPaymentFunnel(
  days: PaymentFunnelDays,
  asOf = new Date()
) {
  const database = db();
  const checkouts: FunnelOrder[] = await database
    .select(fields)
    .from(order)
    .where(
      and(
        eq(order.paymentProvider, 'stripe'),
        inArray(order.paymentType, ['subscription', 'one-time']),
        isNotNull(order.paymentSessionId),
        isNotNull(order.checkoutUrl),
        isNull(order.deletedAt),
        gte(order.createdAt, new Date(asOf.getTime() - days * 86_400_000)),
        lte(order.createdAt, asOf)
      )
    );
  const subscriptionNos = [
    ...new Set(
      checkouts.flatMap((row) =>
        row.subscriptionNo ? [row.subscriptionNo] : []
      )
    ),
  ];
  const renewals: FunnelOrder[] = [];
  // Bound SQL parameters for SQLite/D1 as well as PostgreSQL/MySQL.
  for (let offset = 0; offset < subscriptionNos.length; offset += 100) {
    renewals.push(
      ...(await database
        .select(fields)
        .from(order)
        .where(
          and(
            eq(order.paymentProvider, 'stripe'),
            eq(order.paymentType, 'renew'),
            eq(order.status, 'paid'),
            isNull(order.deletedAt),
            lte(order.paidAt, asOf),
            inArray(
              order.subscriptionNo,
              subscriptionNos.slice(offset, offset + 100)
            )
          )
        ))
    );
  }
  return summarizePaymentFunnel(checkouts, renewals, days, asOf);
}
