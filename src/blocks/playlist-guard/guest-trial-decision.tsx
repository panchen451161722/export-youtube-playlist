import type { ReactNode } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { GUARD_PLANS, type GuardPlanId } from '@/config/guard-plans';
import { m } from '@/paraglide/messages.js';
import { CollectionDialog } from '@/components/playlist-guard/collection-dialog';
import { Button, buttonVariants } from '@/components/ui/button';

export function GuestTrialDecision({
  cancelling,
  existing,
  planId,
  busy,
  error,
  onClose,
  onContinue,
  onRetry,
  children,
}: {
  cancelling: boolean;
  existing: boolean;
  planId: GuardPlanId;
  busy: boolean;
  error: boolean;
  onClose: () => void;
  onContinue: () => void;
  onRetry: () => void;
  children?: ReactNode;
}) {
  const plan = GUARD_PLANS.find((p) => p.id === planId)!;
  const price = `$${(plan.yearlyPriceInCents / 100).toFixed(2)}`;
  return (
    <CollectionDialog
      title={
        cancelling
          ? m['guestTrial.cancelling_title']()
          : m['guestTrial.rejected_title']()
      }
      description={m['guestClaim.result_description']()}
      closeLabel={m['guard.close']()}
      onClose={onClose}
      busy={busy}
    >
      <div className="space-y-5 p-1" aria-live="polite">
        {children}
        {cancelling ? (
          <Loader2 className="size-9 animate-spin" />
        ) : (
          <ShieldCheck className="size-10 text-emerald-600" />
        )}
        <p className="text-sm leading-6">
          {cancelling
            ? m['guestTrial.cancelling_text']()
            : existing
              ? m['guestTrial.existing_text']()
              : m['guestTrial.rejected_text']()}
        </p>
        {!cancelling && !existing && (
          <div className="space-y-3 rounded-xl border p-4">
            <p className="font-medium">
              {plan.name} · {m['guestTrial.annual_price']({ price })}
            </p>
            <p className="text-muted-foreground text-sm leading-6">
              {m['guestTrial.paid_terms']({ price })}
            </p>
            <Button
              className="h-auto min-h-12 w-full whitespace-normal"
              disabled={busy}
              onClick={onContinue}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {m['guestTrial.buy']({ price })}
            </Button>
          </div>
        )}
        {!cancelling && existing && (
          <Link
            href="/sign-in?callbackUrl=%2Fsettings%2Fbilling"
            className={buttonVariants()}
          >
            {m['guestTrial.manage']()}
          </Link>
        )}
        {cancelling && (
          <Button variant="outline" disabled={busy} onClick={onRetry}>
            {m['guard.retry']()}
          </Button>
        )}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {m['guestTrial.checkout_error']()}
          </p>
        )}
      </div>
    </CollectionDialog>
  );
}
