import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { getAuth } from '@/core/auth';
import {
  claimGuest,
  guestBrowserToken,
  guestById,
  GuestCheckoutError,
  guestCookie,
  guestStatus,
  newGuestToken,
  ownsGuest,
} from '@/modules/guest-checkout/service';
import { guestCheckoutSchema } from '@/lib/guest-checkout';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

import {
  cancelGuestCheckout,
  recoverGuestCheckout,
  sendGuestClaim,
  startGuestCheckout,
  startGuestPaidCheckout,
} from './-guest-checkout';

const actionSchema = z.discriminatedUnion('action', [
  z
    .object({ action: z.literal('checkout'), input: guestCheckoutSchema })
    .strict(),
  z
    .object({
      action: z.enum(['recover', 'cancel', 'claim', 'paid_checkout']),
      id: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal('resend'),
      id: z.uuid(),
      email: z.email().max(190),
    })
    .strict(),
]);
const noStore = { 'Cache-Control': 'private, no-store' };
function failure(error: unknown) {
  if (error instanceof GuestCheckoutError)
    return respErr(error.code, { status: error.status, headers: noStore });
  if (error instanceof z.ZodError)
    return respErr('invalid_input', { status: 400, headers: noStore });
  console.error('Guest checkout operation failed');
  return respErr('checkout_failed', { status: 502, headers: noStore });
}
async function GET({ request }: { request: Request }) {
  try {
    const id = z.uuid().parse(new URL(request.url).searchParams.get('id'));
    const row = await guestById(id);
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (
      !row ||
      !(await ownsGuest(row, guestBrowserToken(request), session?.user))
    )
      return respErr('claim_forbidden', { status: 403, headers: noStore });
    return respData(await guestStatus(row), { headers: noStore });
  } catch (error) {
    return failure(error);
  }
}
async function POST({ request }: { request: Request }) {
  try {
    if (
      request.headers.get('origin') !== new URL(request.url).origin ||
      request.headers.get('sec-fetch-site') === 'cross-site' ||
      !request.headers.get('content-type')?.startsWith('application/json')
    )
      return respErr('invalid_request', { status: 403, headers: noStore });
    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 2000,
      keyPrefix: 'guest-checkout',
    });
    if (limited) return limited;
    const reader = request.body?.getReader();
    if (!reader) return respErr('invalid_input', { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 8192) {
        await reader.cancel();
        return respErr('invalid_input', { status: 413 });
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const action = actionSchema.parse(
      JSON.parse(new TextDecoder().decode(bytes))
    );
    const token = guestBrowserToken(request) || newGuestToken();
    if (action.action === 'checkout') {
      let response: Response;
      try {
        response = respData(
          await startGuestCheckout(action.input, token, request.url),
          {
            headers: noStore,
          }
        );
      } catch (error) {
        response = failure(error);
      }
      // Keep ownership recoverable even if Stripe times out after creating a session.
      response.headers.set('Set-Cookie', guestCookie(request, token));
      return response;
    }
    const row = await guestById(action.id);
    if (action.action === 'resend') {
      // Deliberately return the same response for a missing purchase or wrong address.
      if (
        row?.email === action.email.trim().toLowerCase() &&
        (!row.mailAttemptAt ||
          Date.now() - new Date(row.mailAttemptAt).getTime() >= 60_000)
      ) {
        try {
          await sendGuestClaim(row.id);
        } catch {
          /* Generic response prevents an account oracle. */
        }
      }
      return respData({ sent: true }, { headers: noStore });
    }
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!row || !(await ownsGuest(row, token, session?.user)))
      return respErr('claim_forbidden', { status: 403, headers: noStore });
    if (action.action === 'claim') {
      if (!session?.user?.emailVerified)
        return respErr('claim_forbidden', { status: 403 });
      return respData(await claimGuest(row.id, session.user.id), {
        headers: noStore,
      });
    }
    if (action.action === 'paid_checkout')
      return respData(
        await startGuestPaidCheckout(row.id, token, request.url),
        { headers: noStore }
      );
    if (action.action === 'cancel') await cancelGuestCheckout(row.id);
    else {
      try {
        await recoverGuestCheckout(row.id);
      } catch {
        /* Report persisted progress; no success inferred from return parameters. */
      }
    }
    return respData(await guestStatus((await guestById(row.id))!), {
      headers: noStore,
    });
  } catch (error) {
    return failure(error);
  }
}
export const Route = createFileRoute('/api/payment/guest-checkout')({
  server: { handlers: { GET, POST } },
});
