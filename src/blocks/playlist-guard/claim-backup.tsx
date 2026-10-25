import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { z } from 'zod';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { apiPost } from '@/lib/api-client';
import { writeBackupDraft } from '@/lib/backup-draft';
import { guestPaths, type GuestCheckoutInput } from '@/lib/guest-checkout';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { ClaimEmailForm } from '@/blocks/playlist-guard/guest-checkout-status';
import { Button, buttonVariants } from '@/components/ui/button';

export function ClaimBackup() {
  const [arrival, setArrival] = useState<{
    id: string;
    token: string;
    failed: boolean;
  } | null>(null);
  const { data: session, isPending } = useSession();
  const attempted = useRef(false);
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const url = new URL(window.location.href);
    const parsed = z.uuid().safeParse(url.searchParams.get('purchase'));
    const token = new URLSearchParams(url.hash.slice(1)).get('token') || '';
    setArrival({
      id: parsed.success ? parsed.data : '',
      token,
      failed: url.searchParams.has('error'),
    });
    // Keep the single-use secret out of history, screenshots and referrers.
    if (token) {
      url.hash = '';
      window.history.replaceState(window.history.state, '', url);
    }
  }, []);
  const claim = useMutation({
    mutationFn: () =>
      apiPost<{
        claimed: boolean;
        paused: boolean;
        privateBackup?: GuestCheckoutInput['backup'];
      }>('/api/payment/guest-checkout', { action: 'claim', id: arrival!.id }),
    onSuccess: (result) => {
      if (result.privateBackup) {
        const { url, source, ...preferences } = result.privateBackup;
        writeBackupDraft({
          url,
          source,
          preferences,
          savedAt: Date.now(),
          resume: 'entry',
        });
      }
    },
  });
  useEffect(() => {
    if (
      arrival?.id &&
      !arrival.token &&
      !arrival.failed &&
      session?.user.emailVerified &&
      !attempted.current
    ) {
      attempted.current = true;
      claim.mutate();
    }
  }, [arrival, session?.user.emailVerified]);
  function verify() {
    if (!arrival?.id || !arrival.token) return;
    const callback = guestPaths(arrival.id, getLocale()).claim;
    const url = new URL('/api/auth/magic-link/verify', window.location.origin);
    url.search = new URLSearchParams({
      token: arrival.token,
      callbackURL: callback,
      newUserCallbackURL: callback,
      errorCallbackURL: `${callback}&error=expired`,
    }).toString();
    window.location.assign(url.href);
  }
  return (
    <section className="mx-auto flex min-h-[65vh] max-w-lg items-center px-4 py-12">
      <div className="bg-card w-full space-y-5 rounded-2xl border p-7 sm:p-9">
        {claim.isSuccess ? (
          <CheckCircle2 className="size-10 text-emerald-600" />
        ) : (
          <ShieldCheck className="size-10" />
        )}
        <h1 className="text-2xl font-semibold">
          {claim.isSuccess
            ? m['guestClaim.claimed_title']()
            : m['guestClaim.title']()}
        </h1>
        <p className="text-muted-foreground text-sm leading-6">
          {claim.isSuccess
            ? claim.data.privateBackup
              ? m['privateCheckout.claimed']()
              : m['guestClaim.claimed_text']()
            : m['guestClaim.description']()}
        </p>
        {claim.isSuccess ? (
          <>
            {claim.data.paused && (
              <p className="text-sm leading-6" role="status">
                {m['guestClaim.paused']()}
              </p>
            )}
            <Link
              href={
                claim.data.privateBackup
                  ? '/youtube-playlist-backup'
                  : '/settings/collections'
              }
              className={buttonVariants({ className: 'w-full' })}
            >
              {claim.data.privateBackup
                ? m['exportBackup.private.connected_action']()
                : m['guardPricing.nav_collections']()}
            </Link>
            <Link
              href="/settings/billing"
              className="block text-center text-sm underline"
            >
              {m['guardPricing.billing_options']()}
            </Link>
          </>
        ) : arrival?.id ? (
          <>
            {arrival.token ? (
              <Button className="w-full" onClick={verify}>
                {m['guestClaim.email_action']()}
              </Button>
            ) : session?.user.emailVerified && !arrival.failed ? (
              <Button
                className="w-full"
                disabled={claim.isPending || isPending}
                onClick={() => claim.mutate()}
              >
                {claim.isPending
                  ? m['guard.loading']()
                  : m['guestClaim.email_action']()}
              </Button>
            ) : (
              <p className="text-sm leading-6">
                {m['guestClaim.link_needed']()}
              </p>
            )}
            {claim.isError && (
              <p className="text-destructive text-sm leading-6" role="alert">
                {m['guestClaim.claim_error']()}
              </p>
            )}
            <details
              className="rounded-lg border p-4"
              open={arrival.failed || undefined}
            >
              <summary className="cursor-pointer text-sm">
                {m['guestClaim.no_email']()}
              </summary>
              <div className="mt-4">
                <ClaimEmailForm id={arrival.id} />
              </div>
            </details>
          </>
        ) : (
          <p className="text-sm">
            {arrival ? m['guestClaim.link_needed']() : m['guard.loading']()}
          </p>
        )}
      </div>
    </section>
  );
}
