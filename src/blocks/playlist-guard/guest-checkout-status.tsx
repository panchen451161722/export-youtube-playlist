import { useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { z } from 'zod';

import { Link } from '@/core/i18n/navigation';
import { apiGet, apiPost } from '@/lib/api-client';
import { clearBackupDraft } from '@/lib/backup-draft';
import type { GuestCheckoutStatus } from '@/lib/guest-checkout';
import { m } from '@/paraglide/messages.js';
import { TextField } from '@/components/form-field';
import { CollectionDialog } from '@/components/playlist-guard/collection-dialog';
import { Button, buttonVariants } from '@/components/ui/button';

import { GuestTrialDecision } from './guest-trial-decision';

export function ClaimEmailForm({ id }: { id: string }) {
  const [sent, setSent] = useState(false);
  const send = useMutation({
    mutationFn: (email: string) =>
      apiPost('/api/payment/guest-checkout', {
        action: 'resend',
        id,
        email: email.trim(),
      }),
    onSuccess: () => setSent(true),
  });
  const form = useForm({
    defaultValues: { email: '' },
    validators: { onSubmit: z.object({ email: z.email().max(190) }) },
    onSubmit: async ({ value }) => {
      await send.mutateAsync(value.email).catch(() => {});
    },
  });
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="email">
        {(field) => (
          <TextField
            field={field}
            type="email"
            label={m['guestFlow.email']()}
          />
        )}
      </form.Field>
      <Button type="submit" variant="outline" disabled={send.isPending || sent}>
        {m['guestClaim.resend']()}
      </Button>
      {sent && (
        <p role="status" className="text-muted-foreground text-sm leading-6">
          {m['guestClaim.resent']()}
        </p>
      )}
      {send.isError && (
        <p role="alert" className="text-destructive text-sm">
          {m['guestClaim.retry_later']()}
        </p>
      )}
    </form>
  );
}

export function GuestCheckoutResult({
  id,
  cancelled,
  onClose,
  onCancelled,
}: {
  id: string;
  cancelled: boolean;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const client = useQueryClient();
  const started = useRef(false);
  const key = ['guest-checkout', id];
  const status = useQuery({
    queryKey: key,
    queryFn: () =>
      apiGet<GuestCheckoutStatus>(
        `/api/payment/guest-checkout?id=${encodeURIComponent(id)}`
      ),
    retry: false,
    refetchInterval: (query) =>
      ['pending', 'paid', 'trialing', 'trial_cancel_pending'].includes(
        query.state.data?.status ?? ''
      )
        ? 5000
        : false,
  });
  const recover = useMutation({
    mutationFn: () =>
      apiPost<GuestCheckoutStatus>('/api/payment/guest-checkout', {
        action: cancelled ? 'cancel' : 'recover',
        id,
      }),
    onSuccess: (result) => {
      client.setQueryData(key, result);
      if (result.status === 'abandoned') onCancelled();
    },
  });
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      recover.mutate();
    }
  }, []);
  useEffect(() => {
    if (status.data?.backupSaved) clearBackupDraft();
  }, [status.data?.backupSaved]);
  const saved = status.data?.backupSaved;
  const privateReady =
    status.data?.needsYoutubeConnection &&
    ['fulfilled', 'claimed'].includes(status.data.status);
  const ready = saved || privateReady;
  const rejected = status.data?.status === 'trial_rejected';
  const cancelling = status.data?.status === 'trial_cancel_pending';
  const existing = status.data?.rejectionReason === 'existing_subscription';
  const paidCheckout = useMutation({
    mutationFn: () =>
      apiPost<{ checkout_url?: string; return_path?: string }>(
        '/api/payment/guest-checkout',
        { action: 'paid_checkout', id }
      ),
    onSuccess: (result) => {
      if (result.checkout_url || result.return_path)
        window.location.assign(result.checkout_url || result.return_path!);
    },
    onError: () => {
      void status.refetch();
    },
  });
  if ((rejected || cancelling) && status.data) {
    return (
      <GuestTrialDecision
        cancelling={cancelling}
        existing={existing}
        planId={status.data.planId}
        busy={recover.isPending || paidCheckout.isPending}
        error={recover.isError || paidCheckout.isError}
        onClose={onClose}
        onContinue={() => paidCheckout.mutate()}
        onRetry={() => recover.mutate()}
      />
    );
  }
  return (
    <CollectionDialog
      title={
        ready
          ? privateReady
            ? m['privateCheckout.ready_title']()
            : m['guestClaim.saved_title']()
          : m['guestClaim.processing_title']()
      }
      description={m['guestClaim.result_description']()}
      closeLabel={m['guard.close']()}
      onClose={onClose}
      busy={recover.isPending || paidCheckout.isPending}
    >
      <div className="space-y-5 p-1" aria-live="polite">
        {ready ? (
          <CheckCircle2 className="size-10 text-emerald-600" />
        ) : (
          <Loader2 className="size-9 animate-spin" />
        )}
        <p className="text-sm leading-6">
          {ready
            ? privateReady
              ? m['privateCheckout.ready_text']()
              : m['guestClaim.saved_text']()
            : status.data?.needsYoutubeConnection
              ? m['privateCheckout.processing']()
              : m['guestClaim.processing_text']()}
        </p>
        {ready && (
          <div className="bg-secondary rounded-xl p-4 text-sm leading-6">
            <Mail className="mb-2 size-5" />
            {status.data?.mailSent
              ? m['guestClaim.sent_to']({ email: status.data.email })
              : m['guestClaim.mail_pending']()}
          </div>
        )}
        {(status.isError || recover.isError) && (
          <p role="alert" className="text-destructive text-sm">
            {m['guestClaim.progress_error']()}
          </p>
        )}
        {!ready && (
          <Button
            variant="outline"
            disabled={recover.isPending}
            onClick={() => recover.mutate()}
          >
            {m['guard.retry']()}
          </Button>
        )}
        {status.data?.status === 'claimed' ? (
          <Link
            href={
              privateReady
                ? `/claim-backup?purchase=${encodeURIComponent(id)}`
                : '/settings/collections'
            }
            className={buttonVariants()}
          >
            {privateReady
              ? m['exportBackup.private.connected_action']()
              : m['guardPricing.nav_collections']()}
          </Link>
        ) : (
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              {m['guestClaim.no_email']()}
            </summary>
            <div className="mt-4">
              <ClaimEmailForm id={id} />
            </div>
          </details>
        )}
      </div>
    </CollectionDialog>
  );
}
