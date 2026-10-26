import { createFileRoute } from '@tanstack/react-router';
import { getSessionCookie } from 'better-auth/cookies';

import { getAuth } from '@/core/auth';
import { getPaymentFunnel } from '@/modules/conversion-funnel/service';
import { hasPermission } from '@/modules/rbac/service';

import { createPaymentFunnelHandler } from './-payment-funnel';

const GET = createPaymentFunnelHandler({
  getUserId: async (request) => {
    if (!getSessionCookie(request)) return null;
    return (
      (await getAuth().api.getSession({ headers: request.headers }))?.user.id ??
      null
    );
  },
  canRead: (userId) => hasPermission(userId, 'admin.*'),
  report: getPaymentFunnel,
});

export const Route = createFileRoute('/api/admin/payment-funnel')({
  server: { handlers: { GET } },
});
