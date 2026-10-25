import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { z } from 'zod';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import {
  GUARD_PLANS,
  GUARD_TRIAL_DAYS,
  guardProductId,
} from '@/config/guard-plans';
import { apiGet, apiPost } from '@/lib/api-client';
import {
  clearBackupDraft,
  DEFAULT_BACKUP_PREFERENCES,
  mayCompleteBackup,
  playlistBackupUrl,
  writeBackupDraft,
  type BackupDraft,
  type BackupPreferences,
} from '@/lib/backup-draft';
import type { GuardCheckoutOptions } from '@/lib/guard-checkout';
import {
  GUARD_FREQUENCIES,
  type GuardCollectionDetail,
  type GuardOverview,
} from '@/lib/playlist-guard/types';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import { TextField } from '@/components/form-field';
import { CollectionDialog } from '@/components/playlist-guard/collection-dialog';
import { Button, buttonVariants } from '@/components/ui/button';

type SetupValues = BackupPreferences & { url: string };

export function BackupOnboarding({
  initialDraft,
  cancelled,
  onClose,
  onCreated,
  onConnectPrivate,
}: {
  initialDraft: BackupDraft | null;
  cancelled: boolean;
  onClose: () => void;
  onCreated: () => void;
  onConnectPrivate: () => void;
}) {
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const privatePlaylist = initialDraft?.source === 'private_playlist';
  const config = usePublicConfig();
  const queryClient = useQueryClient();
  const formId = useId();
  const [confirmedDraft, setConfirmedDraft] = useState(initialDraft);
  const [error, setError] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const autoStarted = useRef(false);
  const returning = !!(
    user &&
    confirmedDraft?.checkout?.returned &&
    confirmedDraft.checkout.userId === user.id
  );
  const overview = useQuery({
    queryKey: ['playlist-guard', user?.id],
    queryFn: () => apiGet<GuardOverview>('/api/playlist-guard'),
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (query) =>
      returning && pollCount < 15 && !query.state.error ? 2000 : false,
  });
  const limit = overview.data?.entitlement.limit ?? 0;
  const needsPlan = limit === 0;
  const full = limit > 0 && (overview.data?.collections.length ?? 0) >= limit;
  const eligibility = useQuery({
    queryKey: ['checkout-eligibility', user?.id],
    queryFn: () => apiGet<GuardCheckoutOptions>('/api/payment/checkout'),
    enabled:
      !!user &&
      overview.isSuccess &&
      needsPlan &&
      config.data?.guard_checkout_provider === 'stripe' &&
      !returning,
    staleTime: 0,
  });
  useEffect(() => {
    if (returning && needsPlan && overview.dataUpdatedAt)
      setPollCount((count) => count + 1);
  }, [returning, needsPlan, overview.dataUpdatedAt]);

  const form = useForm({
    defaultValues: {
      url: initialDraft?.url ?? '',
      ...DEFAULT_BACKUP_PREFERENCES,
      ...initialDraft?.preferences,
    },
    validators: {
      onSubmit: z.object({
        url: z
          .string()
          .refine(
            (value) => !!playlistBackupUrl(value),
            m['landing.exporter.error.invalid']()
          ),
        planId: z.enum(['lite', 'pro', 'ultra']),
        frequency: z.enum(GUARD_FREQUENCIES),
        notifyMissing: z.boolean(),
        notifyAdded: z.boolean(),
        notifyRestored: z.boolean(),
      }),
    },
    onSubmit: async ({ value }) => {
      setError('');
      if (!user) {
        guestCheckout.mutate(value);
        return;
      }
      if (overview.isFetching || !overview.data) return;
      if (limit > 0) {
        if (privatePlaylist) {
          persist(value);
          onConnectPrivate();
          return;
        }
        create.mutate(value);
        return;
      }
      if (
        eligibility.data?.hasSubscription ||
        !eligibility.data ||
        config.data?.guard_checkout_provider !== 'stripe'
      )
        return;
      checkout.mutate(value);
    },
  });

  function persist(
    values: SetupValues,
    resume?: BackupDraft['resume'],
    checkoutUser?: string
  ) {
    const url = playlistBackupUrl(values.url);
    if (!url) return false;
    const { url: _url, ...preferences } = values;
    return writeBackupDraft({
      url,
      source: privatePlaylist ? 'private_playlist' : 'playlist',
      savedAt: Date.now(),
      preferences,
      resume,
      checkout: checkoutUser
        ? { userId: checkoutUser, returned: false }
        : undefined,
    });
  }
  function edited(values: SetupValues) {
    persist(values);
    setConfirmedDraft(null);
    setError('');
  }
  // The API still checks ownership, subscription and quota. A URL return flag
  // alone never unlocks creation, and duplicate-source races recover the owned record.
  const create = useMutation({
    mutationFn: async (values: SetupValues) => {
      const url = playlistBackupUrl(values.url);
      if (!url || !user) throw new Error(m['landing.exporter.error.invalid']());
      const findExisting = async () => {
        const data = await apiGet<GuardOverview>('/api/playlist-guard');
        if (!data.entitlement.limit) return null;
        const found = data.collections.find(
          (item) => item.source === 'playlist' && item.url === url
        );
        return found
          ? apiGet<GuardCollectionDetail>(
              `/api/playlist-guard?id=${encodeURIComponent(found.id)}`
            )
          : null;
      };
      const existing = await findExisting();
      if (existing) return { collection: existing, existing: true };
      try {
        const collection = await apiPost<GuardCollectionDetail>(
          '/api/playlist-guard',
          {
            action: 'create',
            source: 'playlist',
            url,
            name: m['guard_tour.public_playlist'](),
            frequency: values.frequency,
            notifyMissing: values.notifyMissing,
            notifyAdded: values.notifyAdded,
            notifyRestored: values.notifyRestored,
            emailDelivery: false,
          }
        );
        return { collection, existing: false };
      } catch (cause) {
        const recovered = await findExisting();
        if (recovered) return { collection: recovered, existing: true };
        throw cause;
      }
    },
    onSuccess: () => {
      clearBackupDraft();
      setConfirmedDraft(null);
      void queryClient.invalidateQueries({
        queryKey: ['playlist-guard', user?.id],
      });
      onCreated();
    },
    onError: () => setError(m['backupFlow.create_error']()),
  });
  const checkout = useMutation({
    mutationFn: async (values: SetupValues) => {
      if (!user || !eligibility.data || eligibility.data.hasSubscription)
        throw new Error('subscription_unavailable');
      if (!persist(values, 'checkout', user.id))
        throw new Error('draft_storage_unavailable');
      return apiPost<{ checkout_url: string }>('/api/payment/checkout', {
        product_id: guardProductId(values.planId),
        payment_provider: 'stripe',
        expect_trial: eligibility.data.trialEligible,
        checkout_flow: 'backup',
        locale: getLocale(),
      });
    },
    onSuccess: (result) => {
      try {
        const url = new URL(result.checkout_url);
        if (url.protocol !== 'https:') throw new Error('invalid_checkout');
        window.location.assign(url.href);
      } catch {
        setError(m['guardPricing.checkout_error']());
      }
    },
    onError: () => {
      setError(m['guardPricing.checkout_error']());
      void eligibility.refetch();
    },
  });
  const guestCheckout = useMutation({
    mutationFn: async (values: SetupValues) => {
      persist(values);
      const backup = {
        ...values,
        source: privatePlaylist ? 'private_playlist' : 'playlist',
      };
      return apiPost<{
        id: string;
        checkout_url?: string;
        return_path?: string;
      }>('/api/payment/guest-checkout', {
        action: 'checkout',
        input: { locale: getLocale(), backup },
      });
    },
    onSuccess: (result) => {
      if (result.return_path) {
        window.location.assign(result.return_path);
        return;
      }
      try {
        const url = new URL(result.checkout_url!);
        if (url.protocol !== 'https:') throw new Error('invalid_checkout');
        window.location.assign(url.href);
      } catch {
        setError(m['guardPricing.checkout_error']());
      }
    },
    onError: (cause: Error) =>
      setError(
        cause.message === 'checkout_exists'
          ? m['guestFlow.existing']()
          : cause.message === 'email_unavailable'
            ? m['guestFlow.email_unavailable']()
            : m['guardPricing.checkout_error']()
      ),
  });
  useEffect(() => {
    if (
      !autoStarted.current &&
      !privatePlaylist &&
      mayCompleteBackup(confirmedDraft, user?.id, limit) &&
      overview.isSuccess &&
      !overview.isFetching
    ) {
      autoStarted.current = true;
      create.mutate({
        url: confirmedDraft!.url,
        ...DEFAULT_BACKUP_PREFERENCES,
        ...confirmedDraft!.preferences,
      });
    }
  }, [
    confirmedDraft,
    user?.id,
    limit,
    overview.isSuccess,
    overview.isFetching,
  ]);

  useEffect(() => {
    if (
      privatePlaylist &&
      user &&
      overview.isSuccess &&
      !overview.isFetching &&
      limit > 0
    ) {
      persist(form.state.values);
      onConnectPrivate();
    }
  }, [
    privatePlaylist,
    user?.id,
    overview.isSuccess,
    overview.isFetching,
    limit,
  ]);

  const busy =
    checkout.isPending || guestCheckout.isPending || create.isPending;
  const loading =
    sessionPending ||
    config.isPending ||
    (!!user && overview.isPending) ||
    (!!user &&
      needsPlan &&
      !returning &&
      eligibility.isPending &&
      config.data?.guard_checkout_provider === 'stripe');
  const failedLoad =
    config.isError ||
    (!!user && overview.isError) ||
    (!!user && needsPlan && !returning && eligibility.isError);
  const waitingPayment = returning && needsPlan;
  const confirming = pollCount < 15 && !overview.isError;
  const trial = !user || eligibility.data?.trialEligible === true;
  const statusBlocked =
    !!user && needsPlan && eligibility.data?.hasSubscription;
  const frequencies = {
    daily: m['guard.daily'](),
    weekly: m['guard.weekly'](),
    biweekly: m['guard.biweekly'](),
    monthly: m['guard.monthly'](),
  };
  const dismiss = () => {
    if (!create.isSuccess) persist(form.state.values);
    onClose();
  };

  const footer =
    !create.data && !waitingPayment ? (
      <form.Subscribe selector={(state) => state.values}>
        {(values) => {
          const plan = GUARD_PLANS.find((item) => item.id === values.planId)!;
          const price = `$${(plan.yearlyPriceInCents / 100).toFixed(2)}`;
          const existing = overview.data?.collections.find(
            (item) =>
              item.source === 'playlist' &&
              item.url === playlistBackupUrl(values.url)
          );
          const blockedQuota = full && !existing;
          return (
            <div className="space-y-3">
              {(needsPlan || !user) && !statusBlocked && !loading && (
                <p className="text-muted-foreground text-xs leading-5">
                  {trial
                    ? m['backupFlow.trial_terms']({
                        days: GUARD_TRIAL_DAYS,
                        price,
                      })
                    : m['backupFlow.paid_terms']({ price })}
                </p>
              )}
              {blockedQuota || statusBlocked ? (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm leading-6">
                    {blockedQuota
                      ? m['guard.quota']()
                      : m['guardPricing.existing_subscription']()}
                  </p>
                  <Link
                    href={
                      blockedQuota
                        ? '/settings/collections'
                        : '/settings/billing'
                    }
                    className={buttonVariants({
                      variant: 'outline',
                      className: 'w-full',
                    })}
                  >
                    {blockedQuota
                      ? m['guardPricing.nav_collections']()
                      : m['guardPricing.billing_options']()}
                  </Link>
                </div>
              ) : (
                <>
                  <Button
                    type="submit"
                    form={formId}
                    className="h-auto min-h-12 w-full py-3 text-sm whitespace-normal"
                    disabled={
                      busy ||
                      loading ||
                      failedLoad ||
                      (!user
                        ? config.data?.guard_checkout_provider !== 'stripe'
                        : needsPlan &&
                          (config.data?.guard_checkout_provider !== 'stripe' ||
                            !eligibility.data))
                    }
                  >
                    {busy || loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {create.isPending
                      ? m['backupFlow.creating']()
                      : checkout.isPending || guestCheckout.isPending
                        ? m['guardPricing.buying']()
                        : loading
                          ? m['guard.loading']()
                          : !user
                            ? privatePlaylist
                              ? m['privateCheckout.start_trial']({
                                  days: GUARD_TRIAL_DAYS,
                                })
                              : m['backupFlow.start_trial']({
                                  days: GUARD_TRIAL_DAYS,
                                })
                            : !needsPlan
                              ? existing
                                ? m['backupFlow.view_backup']()
                                : m['backupFlow.enable']()
                              : trial
                                ? privatePlaylist
                                  ? m['privateCheckout.start_trial']({
                                      days: GUARD_TRIAL_DAYS,
                                    })
                                  : m['backupFlow.start_trial']({
                                      days: GUARD_TRIAL_DAYS,
                                    })
                                : privatePlaylist
                                  ? m['privateCheckout.subscribe']()
                                  : m['backupFlow.subscribe']()}
                    {!busy && !loading && <ArrowRight className="size-4" />}
                  </Button>
                  {!user && (
                    <div className="space-y-2 text-center">
                      <Link
                        href="/sign-in?callbackUrl=%2Fyoutube-playlist-backup%3Fsetup%3Dauth"
                        className="text-muted-foreground text-xs underline underline-offset-4"
                        onClick={(event) => {
                          if (!persist(values, 'auth')) {
                            event.preventDefault();
                            setError(m['backupFlow.storage_error']());
                          }
                        }}
                      >
                        {m['guestFlow.signin']()}
                      </Link>
                      <p className="text-muted-foreground text-xs leading-5">
                        {m['guestFlow.claim_note']()}
                      </p>
                    </div>
                  )}
                  {user &&
                    needsPlan &&
                    !loading &&
                    config.data?.guard_checkout_provider !== 'stripe' && (
                      <p className="text-muted-foreground text-sm">
                        {m['guardPricing.checkout_unavailable']()}
                      </p>
                    )}
                  {user && needsPlan && !loading && (
                    <p className="text-muted-foreground text-center text-xs leading-5">
                      {privatePlaylist
                        ? m['privateCheckout.confirm_note']()
                        : m['backupFlow.confirm_note']()}
                    </p>
                  )}
                </>
              )}
              {failedLoad && (
                <div role="alert" className="space-y-2 text-sm">
                  <p>{m['guard.load_error']()}</p>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      void config.refetch();
                      if (user) {
                        void overview.refetch();
                        if (needsPlan) void eligibility.refetch();
                      }
                    }}
                  >
                    {m['guard.retry']()}
                  </Button>
                </div>
              )}
              {error && (
                <p role="alert" className="text-destructive text-sm leading-6">
                  {error}
                </p>
              )}
            </div>
          );
        }}
      </form.Subscribe>
    ) : undefined;

  return (
    <CollectionDialog
      title={
        create.isSuccess
          ? m['backupFlow.success_title']()
          : privatePlaylist
            ? m['privateCheckout.title']()
            : m['backupFlow.title']()
      }
      description={
        privatePlaylist
          ? m['privateCheckout.description']()
          : m['backupFlow.description']()
      }
      closeLabel={m['guard.close']()}
      busy={busy}
      onClose={dismiss}
      footer={footer}
    >
      {create.data ? (
        <div className="space-y-5 text-center" role="status">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-7" />
          </span>
          <p className="text-lg font-semibold">
            {create.data.existing
              ? m['backupFlow.already_saved']()
              : m['backupFlow.saved']()}
          </p>
          <p className="text-muted-foreground text-sm leading-6">
            {create.data.collection.lastSyncedAt
              ? m['backupFlow.first_snapshot']()
              : m['backupFlow.snapshot_pending']()}
          </p>
          {overview.data && !overview.data.capabilities.scheduler && (
            <p className="text-muted-foreground text-xs">
              {m['guard.schedule_unavailable']()}
            </p>
          )}
          <Link
            href="/settings/collections"
            className={buttonVariants({ className: 'min-h-11 w-full' })}
          >
            {m['backupFlow.view_backup']()}
            <ArrowRight />
          </Link>
        </div>
      ) : waitingPayment ? (
        <div className="space-y-5 text-center" role="status">
          <Loader2
            className={cn('mx-auto size-8', confirming && 'animate-spin')}
          />
          <p className="font-medium">
            {confirming
              ? m['backupFlow.confirming']()
              : m['backupFlow.confirming_slow']()}
          </p>
          <p className="text-muted-foreground text-sm leading-6">
            {m['backupFlow.confirming_note']()}
          </p>
          <Button
            onClick={() => {
              setPollCount(0);
              void overview.refetch();
            }}
          >
            {m['guard.retry']()}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setConfirmedDraft(null);
              persist(form.state.values);
            }}
          >
            {m['backupFlow.back_to_setup']()}
          </Button>
        </div>
      ) : (
        <form
          id={formId}
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          {cancelled && (
            <p className="bg-secondary rounded-lg p-3 text-sm" role="status">
              {m['backupFlow.cancelled']()}
            </p>
          )}
          <form.Field
            name="url"
            listeners={{
              onChange: ({ value }) =>
                edited({ ...form.state.values, url: value }),
            }}
          >
            {(field) => (
              <TextField
                field={field}
                label={m['guard.url']()}
                placeholder="https://www.youtube.com/playlist?list=…"
                disabled={busy}
              />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.values}>
            {(values) => {
              const existing = overview.data?.collections.find(
                (item) =>
                  item.source === 'playlist' &&
                  item.url === playlistBackupUrl(values.url)
              );
              const blockedQuota = full && !existing;
              return (
                <>
                  {(needsPlan || !user) && !statusBlocked && (
                    <fieldset disabled={busy}>
                      <legend className="mb-3 text-sm font-medium">
                        {m['backupFlow.choose_plan']()}
                      </legend>
                      <form.Field name="planId">
                        {(field) => (
                          <div className="grid grid-cols-3 gap-2">
                            {GUARD_PLANS.map((item) => (
                              <label
                                key={item.id}
                                className={cn(
                                  'relative cursor-pointer rounded-xl border p-3 transition-colors',
                                  field.state.value === item.id
                                    ? 'border-primary bg-secondary ring-primary ring-1'
                                    : 'border-border hover:bg-secondary/50'
                                )}
                              >
                                <input
                                  type="radio"
                                  name="backup-plan"
                                  value={item.id}
                                  checked={field.state.value === item.id}
                                  onChange={() => {
                                    field.handleChange(item.id);
                                    edited({ ...values, planId: item.id });
                                  }}
                                  className="peer sr-only"
                                />
                                <span className="peer-focus-visible:ring-ring absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2" />
                                <span className="flex items-center justify-between text-sm font-semibold">
                                  {item.name}
                                  {field.state.value === item.id && (
                                    <Check className="size-3.5" />
                                  )}
                                </span>
                                <span className="mt-2 block text-lg font-semibold">
                                  ${(item.yearlyPriceInCents / 100).toFixed(2)}
                                </span>
                                <span className="text-muted-foreground block text-xs">
                                  {m['guardPricing.per_year']()}
                                </span>
                                <span className="mt-2 block text-xs leading-5">
                                  {m['guardPricing.collections']({
                                    count: item.collectionLimit,
                                  })}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </form.Field>
                    </fieldset>
                  )}
                  {user && !needsPlan && !blockedQuota && (
                    <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm">
                      <ShieldCheck className="size-4 shrink-0" />
                      {m['backupFlow.included']()}
                    </p>
                  )}
                  <div className="bg-secondary/60 rounded-xl p-3.5">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Clock3 className="size-4" />
                      {m['backupFlow.schedule']({
                        frequency: frequencies[values.frequency],
                      })}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      {m['backupFlow.schedule_note']()}
                    </p>
                  </div>
                  <details className="group rounded-lg border px-3.5">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium">
                      {m['backupFlow.advanced']()}
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="space-y-4 pb-4">
                      <form.Field name="frequency">
                        {(field) => (
                          <label className="grid gap-2 text-sm">
                            {m['guard_tour.backup_frequency']()}
                            <select
                              disabled={busy}
                              value={field.state.value}
                              onChange={(event) => {
                                const frequency = event.target
                                  .value as SetupValues['frequency'];
                                field.handleChange(frequency);
                                edited({ ...values, frequency });
                              }}
                              className="border-input bg-background h-11 rounded-lg border px-3"
                            >
                              {GUARD_FREQUENCIES.map((value) => (
                                <option key={value} value={value}>
                                  {frequencies[value]}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </form.Field>
                      {(
                        [
                          'notifyMissing',
                          'notifyAdded',
                          'notifyRestored',
                        ] as const
                      ).map((key, index) => (
                        <form.Field key={key} name={key}>
                          {(field) => (
                            <label className="flex min-h-8 cursor-pointer items-center gap-2 text-sm">
                              <input
                                disabled={busy}
                                type="checkbox"
                                className="accent-primary size-4"
                                checked={field.state.value}
                                onChange={(event) => {
                                  field.handleChange(event.target.checked);
                                  edited({
                                    ...values,
                                    [key]: event.target.checked,
                                  });
                                }}
                              />
                              {
                                [
                                  m['guard.email_missing'](),
                                  m['guard.email_added'](),
                                  m['guard_tour.notify_restored'](),
                                ][index]
                              }
                            </label>
                          )}
                        </form.Field>
                      ))}
                      <p className="text-muted-foreground text-xs leading-5">
                        {m['backupFlow.notifications_note']()}
                      </p>
                    </div>
                  </details>
                  {overview.data && !overview.data.capabilities.scheduler && (
                    <p className="text-muted-foreground text-xs leading-5">
                      {m['guard.schedule_unavailable']()}
                    </p>
                  )}
                </>
              );
            }}
          </form.Subscribe>
        </form>
      )}
    </CollectionDialog>
  );
}
