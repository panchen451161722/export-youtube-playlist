import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { createUserBillingPortal } from '@/modules/payment/service';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return respErr('Invalid request origin', { status: 403 });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return respErr('Unauthorized', { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.subscriptionNo !== 'string' || !body.subscriptionNo)
    return respErr('Subscription required', { status: 400 });
  try {
    return respData(
      await createUserBillingPortal(session.user.id, body.subscriptionNo)
    );
  } catch {
    return respErr('Billing portal unavailable', { status: 400 });
  }
}

export const Route = createFileRoute('/api/user/subscriptions/portal')({
  server: { handlers: { POST } },
});
