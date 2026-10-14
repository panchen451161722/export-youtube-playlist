import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';

import { authClient, useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { apiGet, apiPost } from '@/lib/api-client';
import type {
  GuardAction,
  GuardCollectionDetail,
  GuardEntitlement,
  GuardItem,
  GuardOverview,
} from '@/lib/playlist-guard/types';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeHref } from '@/paraglide/runtime.js';
import { GuardWorkspace } from '@/components/playlist-guard/workspace';

export function PlaylistGuardWorkspace() {
  const locale = getLocale();
  const labels = {
    verify_email: m['common.sign.resend_verification'](),
    verification_sent: m['guard_workspace.verification_sent'](),
    eyebrow: m['guard.eyebrow'](),
    title: m['guard.title'](),
    description: m['guard.description'](),
    collections: m['guard.collections'](),
    protected: m['guard.protected'](),
    missing: m['guard.missing'](),
    runs: m['guard.runs'](),
    add: m['guard.add'](),
    demo: m['guard.demo'](),
    demo_note: m['guard.demo_note'](),
    open_workspace: m['guard.open_workspace'](),
    reset: m['guard.reset'](),
    plan: m['guard.plan'](),
    trial: m['guard.trial'](),
    trial_note: m['guard.trial_note'](),
    start_trial: m['guard.start_trial'](),
    upgrade: m['guard.upgrade'](),
    trial_until: m['guard.trial_until'](),
    search: m['guard.search'](),
    all: m['guard.all'](),
    attention: m['guard.attention'](),
    paused: m['guard.paused'](),
    active: m['guard.active'](),
    playlist: m['guard.playlist'](),
    channel: m['guard.channel'](),
    items: m['guard.items'](),
    missing_short: m['guard.missing_short'](),
    last_sync: m['guard.last_sync'](),
    next_sync: m['guard.next_sync'](),
    not_yet: m['guard.not_yet'](),
    manual_only: m['guard.manual_only'](),
    view: m['guard.view'](),
    sync: m['guard.sync'](),
    pause: m['guard.pause'](),
    resume: m['guard.resume'](),
    busy: m['guard.busy'](),
    hourly: m['guard.hourly'](),
    daily: m['guard.daily'](),
    weekly: m['guard.weekly'](),
    biweekly: m['guard.biweekly'](),
    monthly: m['guard.monthly'](),
    empty_title: m['guard.empty_title'](),
    empty_text: m['guard.empty_text'](),
    no_results: m['guard.no_results'](),
    loading: m['guard.loading'](),
    load_error: m['guard.load_error'](),
    retry: m['guard.retry'](),
    name: m['guard.name'](),
    name_placeholder: m['guard.name_placeholder'](),
    source: m['guard.source'](),
    url: m['guard.url'](),
    frequency: m['guard.frequency'](),
    add_description: m['guard.add_description'](),
    private_note: m['guard.private_note'](),
    email_missing: m['guard.email_missing'](),
    email_added: m['guard.email_added'](),
    email_delivery: m['guard.email_delivery'](),
    email_unavailable: m['guard.email_unavailable'](),
    schedule_unavailable: m['guard.schedule_unavailable'](),
    cancel: m['guard.cancel'](),
    save: m['guard.save'](),
    create: m['guard.create'](),
    validation: m['guard.validation'](),
    latest: m['guard.latest'](),
    history: m['guard.history'](),
    preferences: m['guard.preferences'](),
    metadata_note: m['guard.metadata_note'](),
    export: m['guard.export'](),
    export_csv: m['guard.export_csv'](),
    export_json: m['guard.export_json'](),
    export_xlsx: m['guard.export_xlsx'](),
    missing_since: m['guard.missing_since'](),
    history_note: m['guard.history_note'](),
    added: m['guard.added'](),
    removed: m['guard.removed'](),
    no_missing: m['guard.no_missing'](),
    no_snapshot: m['guard.no_snapshot'](),
    back: m['guard.back'](),
    delete: m['guard.delete'](),
    delete_title: m['guard.delete_title'](),
    delete_description: m['guard.delete_description'](),
    success: m['guard.success'](),
    sync_success: m['guard.sync_success'](),
    demo_sync_success: m['guard.demo_sync_success'](),
    export_success: m['guard.export_success'](),
    action_error: m['guard.action_error'](),
    quota: m['guard.quota'](),
    api_unavailable: m['guard.api_unavailable'](),
    empty_selection: m['guard.empty_selection'](),
    open_youtube: m['guard.open_youtube'](),
    trial_expired: m['guard.trial_expired'](),
    collection_usage: m['guard.collection_usage'](),
    snapshot: m['guard.snapshot'](),
    close: m['guard.close'](),
    plan_free: m['guard.plan_free'](),
    plan_trial: m['guard.plan_trial'](),
    plan_lite: m['guard.plan_lite'](),
    plan_pro: m['guard.plan_pro'](),
    plan_ultra: m['guard.plan_ultra'](),
    sync_error: m['guard.sync_error'](),
    demo_title: m['guard.demo_title'](),
    demo_intro: m['guard.demo_intro'](),
    status: m['guard.status'](),
    enable: m['guard.enable'](),
    add_collection: m['guard_workspace.add_collection'](),
    add_new: m['guard_tour.add_new'](),
    back_to_playlists: m['guard_tour.back_to_playlists'](),
    backup_frequency: m['guard_tour.backup_frequency'](),
    collections_added: m['guard_tour.collections_added'](),
    created_sync_failed: m['guard_workspace.created_sync_failed'](),
    default_order: m['guard_tour.default_order'](),
    edit_description: m['guard_workspace.edit_description'](),
    email_schedule_note: m['guard_workspace.email_schedule_note'](),
    email_verify_note: m['guard_workspace.email_verify_note'](),
    empty_collections: m['guard_tour.empty_collections'](),
    empty_collections_hint: m['guard_tour.empty_collections_hint'](),
    enable_collection: m['guard_tour.enable_collection'](),
    enabled: m['guard_tour.enabled'](),
    export_data: m['guard_tour.export_data'](),
    export_description: m['guard_tour.export_description'](),
    export_latest: m['guard_tour.export_latest'](),
    export_missing: m['guard_tour.export_missing'](),
    export_scope_note: m['guard_workspace.export_scope_note'](),
    export_snapshot: m['guard_workspace.export_snapshot'](),
    file_format: m['guard_workspace.file_format'](),
    items_available: m['guard_tour.items_available'](),
    last_synced: m['guard_tour.last_synced'](),
    latest_version: m['guard_tour.latest_version'](),
    missing_videos: m['guard_tour.missing_videos'](),
    monitor_title: m['guard_tour.monitor_title'](),
    most_viewed: m['guard_tour.most_viewed'](),
    next: m['guard_tour.next'](),
    no_missing_description: m['guard_tour.no_missing_description'](),
    no_missing_title: m['guard_tour.no_missing_title'](),
    no_search_results: m['guard_tour.no_search_results'](),
    notifications: m['guard_tour.notifications'](),
    open_source: m['guard_workspace.open_source'](),
    notification_status: m['guard_workspace.notification_status'](),
    notification_none: m['guard_workspace.notification_none'](),
    notification_pending: m['guard_workspace.notification_pending'](),
    notification_sending: m['guard_workspace.notification_sending'](),
    notification_sent: m['guard_workspace.notification_sent'](),
    notification_failed: m['guard_workspace.notification_failed'](),
    notification_cancelled: m['guard_workspace.notification_cancelled'](),
    notification_retry: m['guard_workspace.notification_retry'](),
    notification_attempts: m['guard_workspace.notification_attempts'](),
    email_preview: m['guard_workspace.email_preview'](),
    email_preview_sent: m['guard_workspace.email_preview_sent'](),
    open_video: m['guard_tour.open_video'](),
    page_label: m['guard_tour.page_label'](),
    pause_collection: m['guard_tour.pause_collection'](),
    preparing_export: m['guard_tour.preparing_export'](),
    previous: m['guard_tour.previous'](),
    public_channel: m['guard_tour.public_channel'](),
    public_playlist: m['guard_tour.public_playlist'](),
    refresh: m['guard_workspace.refresh'](),
    search_latest: m['guard_tour.search_latest'](),
    sort_by: m['guard_tour.sort_by'](),
    title_az: m['guard_tour.title_az'](),
    total_runs: m['guard_tour.total_runs'](),
    tracking_since: m['guard_tour.tracking_since'](),
    update: m['guard_tour.update'](),
    update_collection: m['guard_workspace.update_collection'](),
    views: m['guard_tour.views'](),
  };
  const { data: session } = useSession();
  const userId = session?.user.id;
  const router = useRouter();
  const { collection } = useSearch({ from: '/settings/collections' });
  const selectedId = collection ?? null;
  function select(id: string | null, replace = false) {
    const href = id
      ? `/settings/collections?collection=${encodeURIComponent(id)}`
      : '/settings/collections';
    if (replace) router.replace(href);
    else router.push(href);
  }
  const queryClient = useQueryClient();
  const queryKey = ['playlist-guard', userId];
  const overviewQuery = useQuery({
    queryKey,
    queryFn: () => apiGet<GuardOverview>('/api/playlist-guard'),
    enabled: !!userId,
  });
  const detailQuery = useQuery({
    queryKey: [...queryKey, selectedId],
    queryFn: () =>
      apiGet<GuardCollectionDetail>(
        `/api/playlist-guard?id=${encodeURIComponent(selectedId!)}`
      ),
    enabled: !!userId && !!selectedId,
  });
  const verification = useMutation({
    mutationFn: async () => {
      if (!session?.user.email) return;
      const result = await authClient.sendVerificationEmail({
        email: session.user.email,
        callbackURL: localizeHref('/settings/collections'),
      });
      if (result.error)
        throw new Error(result.error.message || labels.action_error);
    },
    onSuccess: () => toast.success(labels.verification_sent),
    onError: (error: Error) => toast.error(error.message),
  });
  const mutation = useMutation({
    mutationFn: (action: GuardAction) =>
      apiPost<GuardCollectionDetail | GuardEntitlement | { id: string }>(
        '/api/playlist-guard',
        action
      ),
    onSuccess: (result, action) => {
      if ('snapshots' in result)
        queryClient.setQueryData([...queryKey, result.id], result);
      if (action.action === 'delete') {
        queryClient.removeQueries({
          queryKey: [...queryKey, action.id],
          exact: true,
        });
        if (selectedId === action.id) select(null, true);
      }
      if (action.action === 'create' && 'snapshots' in result) {
        select(result.id);
        if (result.lastError) {
          toast.warning(labels.created_sync_failed);
          return;
        }
      }
      toast.success(
        action.action === 'sync' ? labels.sync_success : labels.success
      );
    },
    onError: (err: Error) => toast.error(err.message || labels.action_error),
    // Failed syncs save an error alongside the last successful snapshot. Read that state too.
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  async function onExport(
    items: GuardItem[],
    name: string,
    format: 'csv' | 'json' | 'xlsx'
  ) {
    try {
      const { downloadGuardExport } =
        await import('@/lib/playlist-guard/export');
      await downloadGuardExport(items, name, format);
      toast.success(labels.export_success);
    } catch {
      throw new Error(labels.action_error);
    }
  }
  return (
    <GuardWorkspace
      key={userId}
      labels={labels}
      locale={locale}
      overview={overviewQuery.data}
      loading={overviewQuery.isPending}
      error={overviewQuery.isError}
      refreshing={
        overviewQuery.isFetching || (!!selectedId && detailQuery.isFetching)
      }
      busy={mutation.isPending || verification.isPending}
      onVerifyEmail={() => verification.mutate()}
      emailVerified={!!session?.user.emailVerified}
      selectedId={selectedId}
      onSelect={select}
      detail={detailQuery.data}
      detailLoading={detailQuery.isPending}
      detailError={detailQuery.isError}
      onAction={(action) => mutation.mutateAsync(action)}
      onRetry={() => {
        void overviewQuery.refetch();
        if (selectedId) void detailQuery.refetch();
      }}
      onExport={onExport}
    />
  );
}
