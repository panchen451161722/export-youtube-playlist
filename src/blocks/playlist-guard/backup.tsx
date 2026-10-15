import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import {
  Archive,
  ArrowRight,
  Bell,
  Clock3,
  ListVideo,
  PlayCircle,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

import { authClient, useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { GUARD_SCAN_LIMIT, GUARD_SNAPSHOT_LIMIT } from '@/config/guard-plans';
import { apiGet, apiPost } from '@/lib/api-client';
import {
  collectionView,
  formatCollectionDate,
  type CollectionDateStyle,
} from '@/lib/playlist-guard/presentation';
import type {
  GuardAction,
  GuardCollection,
  GuardCollectionDetail,
  GuardEntitlement,
  GuardOverview,
} from '@/lib/playlist-guard/types';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeHref } from '@/paraglide/runtime.js';
import { useYoutubeConnections } from '@/hooks/use-youtube-connections';
import { CollectionDialog } from '@/components/playlist-guard/collection-dialog';
import { CollectionCards } from '@/components/playlist-guard/collection-views';
import {
  CollectionForm,
  CollectionFormDialog,
} from '@/components/playlist-guard/create-dialog';
import { Button, buttonVariants } from '@/components/ui/button';

export function PlaylistBackup() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-10 sm:px-6 sm:pt-16 lg:px-8">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
              <Archive className="size-4" aria-hidden="true" />
              {m['backup.eyebrow']()}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {m['backup.title']()}
            </h1>
            <p className="text-muted-foreground mt-4 text-base leading-7">
              {m['backup.description']()}
            </p>
          </div>
        </div>
        <BackupSetup />
        <div className="mt-10 space-y-7">
          <div>
            <h2 className="text-xl font-semibold">{m['backup.how_title']()}</h2>
            <ol className="mt-6 grid gap-6 md:grid-cols-3">
              {[
                {
                  Icon: ListVideo,
                  title: m['backup.step1_title'](),
                  text: m['backup.step1_text'](),
                },
                {
                  Icon: Clock3,
                  title: m['backup.step2_title'](),
                  text: m['backup.step2_text'](),
                },
                {
                  Icon: Bell,
                  title: m['backup.step3_title'](),
                  text: m['backup.step3_text'](),
                },
              ].map(({ Icon, title, text }, index) => {
                return (
                  <li key={index} className="flex gap-4">
                    <span className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-xl">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-medium">{title}</h3>
                      <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                        {text}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="border-border border-t pt-6">
            <h2 className="font-semibold">{m['backup.saved_title']()}</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {m['backup.saved_text']()}
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              {m['backup.limit_text']({
                videos: GUARD_SCAN_LIMIT,
                snapshots: GUARD_SNAPSHOT_LIMIT,
              })}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function BackupSetup() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GuardCollection | null>(null);
  const [deleting, setDeleting] = useState<GuardCollection | null>(null);
  const { user: initialUser } = getRouteApi('__root__').useLoaderData();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const youtube = useYoutubeConnections(
    user?.id,
    getLocale() === 'zh'
      ? '/zh/youtube-playlist-backup'
      : '/youtube-playlist-backup'
  );
  const loggedIn = !!(user ?? (sessionPending ? initialUser : null));
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKey = ['playlist-guard', user?.id];
  const overview = useQuery({
    queryKey,
    queryFn: () => apiGet<GuardOverview>('/api/playlist-guard'),
    enabled: !!user,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
  const entitlement = overview.data?.entitlement;
  const cap = overview.data?.capabilities;
  const emailAvailable = !!cap?.email && !!user?.emailVerified;
  const mutation = useMutation({
    mutationFn: (action: GuardAction) =>
      apiPost<GuardCollectionDetail | GuardEntitlement | { id: string }>(
        '/api/playlist-guard',
        action
      ),
    onSuccess: (result, action) => {
      if (action.action === 'delete') {
        queryClient.removeQueries({
          queryKey: [...queryKey, action.id],
          exact: true,
        });
        setDeleting(null);
      }
      if ('snapshots' in result) {
        queryClient.setQueryData([...queryKey, result.id], result);
        if (action.action === 'create' && result.lastError) {
          toast.warning(m['guard_workspace.created_sync_failed']());
          return;
        }
      }
      toast.success(
        action.action === 'sync'
          ? m['guard.sync_success']()
          : m['guard.success']()
      );
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
  const verification = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const result = await authClient.sendVerificationEmail({
        email: user.email,
        callbackURL: localizeHref('/youtube-playlist-backup'),
      });
      if (result.error)
        throw new Error(result.error.message || m['guard.action_error']());
    },
    onSuccess: () => toast.success(m['guard_workspace.verification_sent']()),
    onError: (error: Error) => toast.error(error.message),
  });
  const canCreate =
    !!user &&
    !!(cap?.youtube || cap?.privateSources) &&
    !!entitlement?.limit &&
    (overview.data?.collections.length ?? 0) < entitlement.limit;
  const busy =
    mutation.isPending || verification.isPending || youtube.connect.isPending;
  const labels = {
    private_playlist: m['youtube_accounts.private_playlist'](),
    liked_videos: m['youtube_accounts.liked_videos'](),
    liked_music: m['youtube_accounts.liked_music'](),
    subscriptions: m['youtube_accounts.subscriptions'](),
    accounts_title: m['youtube_accounts.accounts_title'](),
    accounts_description: m['youtube_accounts.accounts_description'](),
    connect_account: m['youtube_accounts.connect_account'](),
    reconnect_account: m['youtube_accounts.reconnect_account'](),
    disconnect_account: m['youtube_accounts.disconnect_account'](),
    accounts_empty: m['youtube_accounts.accounts_empty'](),
    accounts_error: m['youtube_accounts.accounts_error'](),
    account_connected: m['youtube_accounts.account_connected'](),
    account_reconnect: m['youtube_accounts.account_reconnect'](),
    account_disconnected: m['youtube_accounts.account_disconnected'](),
    accounts_note: m['youtube_accounts.accounts_note'](),
    oauth_unavailable: m['youtube_accounts.oauth_unavailable'](),
    choose_account: m['youtube_accounts.choose_account'](),
    account_required: m['youtube_accounts.account_required'](),
    music_note: m['youtube_accounts.music_note'](),
    subscriptions_note: m['youtube_accounts.subscriptions_note'](),
    private_source_note: m['youtube_accounts.private_source_note'](),
    connected_notice: m['youtube_accounts.connected_notice'](),
    denied_notice: m['youtube_accounts.denied_notice'](),
    failed_notice: m['youtube_accounts.failed_notice'](),
    item_added: m['youtube_accounts.item_added'](),
    item_missing: m['youtube_accounts.item_missing'](),
    item_restored: m['youtube_accounts.item_restored'](),

    source: m['guard.source'](),
    loading: m['guard.loading'](),
    public_playlist: m['guard_tour.public_playlist'](),
    public_channel: m['guard_tour.public_channel'](),
    url: m['guard.url'](),
    name: m['guard.name'](),
    name_placeholder: m['guard.name_placeholder'](),
    private_note: m['guard.private_note'](),
    backup_frequency: m['guard_tour.backup_frequency'](),
    daily: m['guard.daily'](),
    weekly: m['guard.weekly'](),
    biweekly: m['guard.biweekly'](),
    monthly: m['guard.monthly'](),
    notifications: m['guard_tour.notifications'](),
    email_missing: m['guard.email_missing'](),
    email_added: m['guard.email_added'](),
    email_restored: m['guard.email_restored'](),
    email_changes_note: m['backup.alert_note'](),
    verify_email: m['common.sign.resend_verification'](),
    validation: m['guard.validation'](),
    action_error: m['guard.action_error'](),
    busy: m['guard.busy'](),
    create: m['backup.create'](),
    cancel: m['guard.cancel'](),
    close: m['guard.close'](),
    save: m['guard.save'](),
    update_collection: m['guard_workspace.update_collection'](),
    edit_description: m['guard_workspace.edit_description'](),
    email_delivery: m['guard.email_delivery'](),
    email_schedule_note: m['guard_workspace.email_schedule_note'](),
  };
  const cardLabels = {
    ...labels,
    update: m['guard_tour.update'](),
    delete: m['guard.delete'](),
    card_view: m['guard_card.view'](),
    card_update: m['guard_card.update'](),
    card_delete: m['guard_card.delete'](),
    card_missing: m['guard_card.missing'](),
    card_next_sync: m['guard_card.next_sync'](),
    view: m['guard.view'](),
    enabled: m['guard_tour.enabled'](),
    paused: m['guard.paused'](),
    enable_collection: m['guard_tour.enable_collection'](),
    pause_collection: m['guard_tour.pause_collection'](),
    open_source: m['guard_workspace.open_source'](),
    tracking_since: m['guard_tour.tracking_since'](),
    items: m['guard.items'](),
    missing: m['guard.missing'](),
    last_synced: m['guard_tour.last_synced'](),
    next_sync: m['guard.next_sync'](),
    sync_error: m['guard.sync_error'](),
    sync_initial_error: m['guard.sync_initial_error'](),
  };
  const date = (value: string | null, style?: CollectionDateStyle) =>
    formatCollectionDate(value, getLocale(), m['guard.not_yet'](), style);
  const addNewClass =
    'group border-primary/30 bg-background text-primary hover:border-primary hover:bg-secondary/50 focus-visible:outline-ring flex min-h-60 w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 sm:min-h-64';
  const addNewContent = (
    <>
      <span className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-full transition-transform group-hover:scale-105">
        <Plus className="size-9" aria-hidden="true" />
      </span>
      <span className="text-2xl font-semibold sm:text-3xl">
        {m['guard_tour.add_new']()}
      </span>
      <span className="text-muted-foreground max-w-sm text-sm leading-6">
        {m['backup.add_hint']()}
      </span>
    </>
  );
  return (
    <>
      <section
        className="border-border bg-card rounded-2xl border p-5 shadow-sm sm:p-7"
        aria-labelledby="backup-action-title"
      >
        {youtube.notice && (
          <p role="status" className="bg-secondary mb-5 rounded-lg p-3 text-sm">
            {labels[`${youtube.notice}_notice`]}
          </p>
        )}
        <div className="mb-6">
          <h2 id="backup-action-title" className="text-xl font-semibold">
            {m['backup.setup_title']()}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {m['backup.setup_description']()}
          </p>
        </div>
        <div className="grid items-stretch gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-10">
          {loggedIn ? (
            <button
              type="button"
              className={addNewClass}
              aria-label={m['guard_tour.add_new']()}
              onClick={() => setOpen(true)}
            >
              {addNewContent}
            </button>
          ) : (
            <Link
              href="/pricing"
              className={addNewClass}
              aria-label={m['guard_tour.add_new']()}
            >
              {addNewContent}
            </Link>
          )}
          <div className="flex flex-col justify-center py-2">
            <h3 className="text-xl font-semibold">
              {loggedIn
                ? m['backup.manage_title']()
                : m['backup.get_started_title']()}
            </h3>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {loggedIn
                ? m['backup.manage_text']()
                : m['backup.get_started_text']()}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={loggedIn ? '/settings/collections' : '/pricing'}
                className={buttonVariants({ className: 'h-12 px-5 text-base' })}
              >
                {loggedIn ? <ListVideo aria-hidden="true" /> : null}
                {loggedIn
                  ? m['guardPricing.nav_collections']()
                  : m['backup.view_pricing']()}
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/demo"
                className={buttonVariants({
                  variant: 'outline',
                  className: 'h-12 px-5 text-base',
                })}
              >
                <PlayCircle aria-hidden="true" />
                {m['backup.watch_demo']()}
              </Link>
            </div>
            <p className="text-muted-foreground mt-4 text-xs leading-6">
              {m['backup.demo_access']()}
            </p>
          </div>
        </div>
      </section>
      {user && (
        <section
          className="mt-8 space-y-5"
          aria-labelledby="backup-collections-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="backup-collections-title" className="text-xl font-semibold">
              {m['backup.your_collections']()}
              {overview.data && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  {overview.data.collections.length}/{entitlement?.limit ?? 0}
                </span>
              )}
            </h2>
            <Button
              variant="outline"
              disabled={overview.isFetching || busy}
              onClick={() => void overview.refetch()}
            >
              {overview.isFetching
                ? m['guard.loading']()
                : m['guard_workspace.refresh']()}
            </Button>
          </div>
          {overview.isPending ? (
            <p role="status" className="text-muted-foreground py-8 text-sm">
              {m['guard.loading']()}
            </p>
          ) : overview.isError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-card space-y-3 rounded-xl border p-5"
            >
              <p>{m['guard.load_error']()}</p>
              <Button variant="outline" onClick={() => void overview.refetch()}>
                {m['guard.retry']()}
              </Button>
            </div>
          ) : overview.data?.collections.length ? (
            <CollectionCards
              labels={cardLabels}
              collections={overview.data.collections.map((collection) =>
                collectionView(
                  collection,
                  date,
                  !!cap?.scheduler,
                  m['guard.manual_only']()
                )
              )}
              busy={busy}
              showSourceLinks
              onView={(id) =>
                router.push(
                  `/settings/collections?collection=${encodeURIComponent(id)}`
                )
              }
              onUpdate={(id) =>
                setEditing(
                  overview.data.collections.find((item) => item.id === id) ??
                    null
                )
              }
              onDelete={(id) =>
                setDeleting(
                  overview.data.collections.find((item) => item.id === id) ??
                    null
                )
              }
              onToggle={(id) => {
                const collection = overview.data.collections.find(
                  (item) => item.id === id
                );
                if (collection)
                  mutation.mutate({
                    action: 'update',
                    id,
                    enabled: !collection.enabled,
                  });
              }}
            />
          ) : (
            <div className="border-border bg-card rounded-xl border p-6 text-center">
              <p className="font-medium">{m['guard.empty_title']()}</p>
              <p className="text-muted-foreground mt-2 text-sm">
                {m['guard.empty_text']()}
              </p>
            </div>
          )}
        </section>
      )}
      {editing && (
        <CollectionFormDialog
          key={editing.id}
          collection={editing}
          accounts={youtube.query.data?.accounts}
          accountsLoading={youtube.query.isPending}
          accountsConfigured={youtube.query.data?.configured}
          onConnect={(id) => youtube.connect.mutate(id)}
          labels={labels}
          busy={busy}
          emailAvailable={emailAvailable}
          emailNotice={
            cap?.email && !user?.emailVerified
              ? m['guard_workspace.email_verify_note']()
              : m['guard.email_unavailable']()
          }
          onVerifyEmail={
            cap?.email && !user?.emailVerified
              ? () => verification.mutate()
              : undefined
          }
          onSave={(action) => mutation.mutateAsync(action)}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <CollectionDialog
          title={m['guard.delete_title']()}
          description={m['guard.delete_description']()}
          closeLabel={m['guard.close']()}
          busy={busy}
          onClose={() => setDeleting(null)}
        >
          <p className="font-medium break-words">{deleting.name}</p>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            {m['guard.delete_description']()}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              {m['guard.cancel']()}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                mutation.mutate({ action: 'delete', id: deleting.id })
              }
            >
              {busy ? m['guard.busy']() : m['guard_card.delete']()}
            </Button>
          </div>
        </CollectionDialog>
      )}
      {open && (
        <CollectionDialog
          title={m['guard_workspace.add_collection']()}
          description={m['backup.setup_description']()}
          closeLabel={m['guard.close']()}
          busy={busy}
          onClose={() => setOpen(false)}
        >
          {sessionPending || (user && overview.isPending) ? (
            <p
              role="status"
              className="text-muted-foreground py-12 text-center text-sm"
            >
              {m['guard.loading']()}
            </p>
          ) : user && overview.isError ? (
            <div role="alert" className="space-y-4">
              <p>{m['guard.load_error']()}</p>
              <Button variant="outline" onClick={() => void overview.refetch()}>
                {m['guard.retry']()}
              </Button>
            </div>
          ) : (
            <>
              {user &&
                (!(cap?.youtube || cap?.privateSources) || !cap.scheduler) && (
                  <p
                    role="status"
                    className="bg-secondary mb-5 rounded-lg p-3 text-sm leading-6"
                  >
                    {!(cap?.youtube || cap?.privateSources)
                      ? m['guard.api_unavailable']()
                      : m['guard.schedule_unavailable']()}
                  </p>
                )}
              <CollectionForm
                accounts={youtube.query.data?.accounts}
                accountsLoading={youtube.query.isPending}
                accountsConfigured={youtube.query.data?.configured}
                onConnect={(id) => youtube.connect.mutate(id)}
                key={user?.id ?? 'guest'}
                labels={labels}
                busy={busy}
                disabled={!canCreate}
                emailAvailable={emailAvailable}
                emailNotice={
                  !user
                    ? m['backup.signin_note']()
                    : cap?.email && !user.emailVerified
                      ? m['guard_workspace.email_verify_note']()
                      : m['guard.email_unavailable']()
                }
                onVerifyEmail={
                  user && cap?.email && !user.emailVerified
                    ? () => verification.mutate()
                    : undefined
                }
                showEmailBackup={false}
                initialValues={{
                  frequency: 'daily',
                  notifyMissing: true,
                  notifyAdded: true,
                  notifyRestored: true,
                  emailDelivery: false,
                }}
                onSave={(action) => mutation.mutateAsync(action)}
                onComplete={() => setOpen(false)}
                onCancel={() => setOpen(false)}
                footer={
                  !user ? (
                    <div className="border-border space-y-3 border-t pt-5">
                      <p className="text-muted-foreground text-sm">
                        {m['backup.signin_note']()}
                      </p>
                      <Link
                        href="/pricing"
                        className={buttonVariants({ className: 'w-full' })}
                      >
                        {m['backup.view_pricing']()}
                        <ArrowRight />
                      </Link>
                    </div>
                  ) : entitlement?.canStartTrial ? (
                    <div className="border-border space-y-3 border-t pt-5">
                      <p className="text-muted-foreground text-sm leading-6">
                        {m['guard.trial_note']()}
                      </p>
                      <Button
                        type="button"
                        disabled={busy}
                        className="w-full"
                        onClick={() =>
                          mutation.mutate({ action: 'start_trial' })
                        }
                      >
                        {busy ? m['guard.busy']() : m['guard.start_trial']()}
                      </Button>
                    </div>
                  ) : !entitlement?.limit ||
                    (overview.data?.collections.length ?? 0) >=
                      entitlement.limit ? (
                    <div className="border-border space-y-3 border-t pt-5">
                      <p className="text-muted-foreground text-sm">
                        {!entitlement?.limit
                          ? m['guard.trial_expired']()
                          : m['guard.quota']()}
                      </p>
                      <Link
                        href="/pricing"
                        className={buttonVariants({
                          variant: 'outline',
                          className: 'w-full',
                        })}
                      >
                        {m['guard.upgrade']()}
                      </Link>
                    </div>
                  ) : undefined
                }
              />
            </>
          )}
        </CollectionDialog>
      )}
    </>
  );
}
