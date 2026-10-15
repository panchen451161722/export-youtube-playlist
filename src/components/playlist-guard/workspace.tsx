import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  CircleAlert,
  History,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import {
  collectionDetailView,
  collectionView,
  formatCollectionDate,
  type CollectionDateStyle,
  type CollectionSort,
  type CollectionTab,
} from '@/lib/playlist-guard/presentation';
import type {
  GuardAction,
  GuardCollection,
  GuardCollectionDetail,
  GuardItem,
  GuardOverview,
} from '@/lib/playlist-guard/types';
import type { YoutubeConnection } from '@/lib/youtube-connections/types';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { CollectionDetail, CollectionList } from './collection-views';
import { CollectionFormDialog, type GuardLabels } from './create-dialog';
import { CollectionExportDialog } from './export-dialog';

export type GuardWorkspaceProps = {
  labels: GuardLabels;
  accounts?: YoutubeConnection[];
  accountsLoading?: boolean;
  accountsConfigured?: boolean;
  onConnect?: (id?: string) => void;
  accountsPanel?: ReactNode;
  locale: string;
  overview?: GuardOverview;
  loading: boolean;
  error: boolean;
  busy: boolean;
  refreshing: boolean;
  emailVerified: boolean;
  onVerifyEmail: () => void;
  selectedId: string | null;
  detail?: GuardCollectionDetail;
  detailLoading: boolean;
  detailError: boolean;
  onSelect: (id: string | null) => void;
  onAction: (action: GuardAction) => Promise<unknown>;
  onRetry: () => void;
  onExport: (
    items: GuardItem[],
    name: string,
    format: 'csv' | 'json' | 'xlsx'
  ) => Promise<void>;
};
export function GuardWorkspace({
  labels: l,
  accounts,
  accountsLoading,
  accountsConfigured,
  onConnect,
  accountsPanel,
  locale,
  overview,
  loading,
  error,
  busy,
  refreshing,
  emailVerified,
  onVerifyEmail,
  selectedId,
  detail,
  detailLoading,
  detailError,
  onSelect,
  onAction,
  onRetry,
  onExport,
}: GuardWorkspaceProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState<{ collection?: GuardCollection } | null>(
    null
  );
  const [deleting, setDeleting] = useState<GuardCollection | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const collections = overview?.collections ?? [];
  const entitlement = overview?.entitlement;
  const cap = overview?.capabilities;
  const date = (value: string | null, style?: CollectionDateStyle) =>
    formatCollectionDate(value, locale, l.not_yet, style);
  const canAdd =
    !!(cap?.youtube || cap?.privateSources) &&
    !!entitlement?.limit &&
    collections.length < entitlement.limit;
  const canSync =
    !!(cap?.youtube || cap?.privateSources) && !!entitlement?.limit;
  const emailAvailable = !!cap?.email && emailVerified;
  const emailNotice =
    cap?.email && !emailVerified ? l.email_verify_note : l.email_unavailable;
  const action = (value: GuardAction) => {
    void onAction(value).catch(() => {});
  };
  const filtered = collections.filter(
    (c) =>
      (filter === 'all' ||
        (filter === 'attention' && (c.missingCount > 0 || !!c.lastError)) ||
        (filter === 'paused' && !c.enabled)) &&
      c.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );
  const plan = entitlement && (
    <div className="border-border mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="text-muted-foreground mt-0.5 size-5 shrink-0" />
        <div>
          <p className="text-sm font-medium">
            {l.plan} · {l[`plan_${entitlement.plan}`]}
          </p>
          <p className="text-muted-foreground mt-1 max-w-xl text-xs leading-5">
            {entitlement.canStartTrial
              ? l.trial_note
              : entitlement.plan === 'trial'
                ? `${l.trial_until} · ${date(entitlement.trialEndsAt)}`
                : entitlement.plan === 'free'
                  ? l.trial_expired
                  : l.metadata_note}
          </p>
        </div>
      </div>
      {entitlement.canStartTrial ? (
        <Button
          disabled={busy}
          onClick={() => action({ action: 'start_trial' })}
        >
          {l.start_trial}
        </Button>
      ) : (
        <Link
          href="/pricing"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {l.upgrade}
        </Link>
      )}
    </div>
  );
  const environmentNotice = !(cap?.youtube || cap?.privateSources)
    ? l.api_unavailable
    : !cap.scheduler
      ? l.schedule_unavailable
      : '';
  function remove(c: GuardCollection) {
    setDeleteError('');
    setDeleting(c);
  }
  return (
    <div className="mx-auto w-full max-w-[1260px] pb-10 [--primary-foreground:#fff] [--primary:#1a213c] dark:[--primary-foreground:#1a213c] dark:[--primary:#dce1f5]">
      {loading ? (
        <WorkspaceStatus labels={l} loading />
      ) : error ? (
        <WorkspaceStatus labels={l} onRetry={onRetry} />
      ) : selectedId ? (
        <>
          {detailLoading ? (
            <WorkspaceStatus labels={l} loading onBack={() => onSelect(null)} />
          ) : detailError || !detail ? (
            <WorkspaceStatus
              labels={l}
              onRetry={onRetry}
              onBack={() => onSelect(null)}
            />
          ) : (
            <WorkspaceDetail
              key={detail.id}
              detail={detail}
              labels={l}
              date={date}
              scheduler={!!cap?.scheduler}
              emailPreview={!!cap?.emailPreview}
              busy={busy}
              canSync={canSync}
              environmentNotice={
                !entitlement?.limit ? l.trial_expired : environmentNotice
              }
              onBack={() => onSelect(null)}
              onEdit={() => setForm({ collection: detail })}
              onDelete={() => remove(detail)}
              onSync={() => action({ action: 'sync', id: detail.id })}
              onExport={onExport}
            />
          )}
        </>
      ) : (
        <>
          {accountsPanel}
          <CollectionList
            labels={{
              ...l,
              empty_collections: l.empty_title,
              empty_collections_hint: l.empty_text,
            }}
            headingLevel={1}
            showSourceLinks
            collections={filtered.map((c) =>
              collectionView(c, date, !!cap?.scheduler, l.manual_only)
            )}
            totalCount={collections.length}
            limit={entitlement?.limit ?? 0}
            busy={busy}
            canAdd={canAdd}
            empty={collections.length === 0}
            headerExtra={
              <>
                <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[
                    [
                      l.active_collections,
                      collections.filter((c) => c.enabled).length,
                    ],
                    [
                      l.saved_videos,
                      collections.reduce((total, c) => total + c.itemCount, 0),
                    ],
                    [
                      l.missing_videos_summary,
                      collections.reduce(
                        (total, c) => total + c.missingCount,
                        0
                      ),
                    ],
                  ].map(([label, count]) => (
                    <div
                      key={label}
                      className="bg-secondary/50 rounded-lg px-4 py-3"
                    >
                      <dt className="text-muted-foreground text-xs">{label}</dt>
                      <dd className="mt-2 text-2xl font-semibold tabular-nums">
                        {count}
                      </dd>
                    </div>
                  ))}
                </dl>
                {plan}
                {cap?.emailPreview && (
                  <p className="text-muted-foreground mt-4 text-xs">
                    {l.email_preview}
                  </p>
                )}
                {environmentNotice && (
                  <p className="bg-secondary/60 mt-4 flex items-start gap-2 rounded-lg p-3 text-xs leading-5">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    {environmentNotice}
                  </p>
                )}
                {!!entitlement?.limit &&
                  collections.length >= entitlement.limit && (
                    <p className="text-muted-foreground mt-3 text-xs">
                      {l.quota}
                    </p>
                  )}
              </>
            }
            toolbar={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1">
                  {['all', 'attention', 'paused'].map((value) => (
                    <Button
                      key={value}
                      variant={filter === value ? 'secondary' : 'ghost'}
                      size="sm"
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                    >
                      {l[value]}
                    </Button>
                  ))}
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-sm">
                  <label className="relative min-w-0 flex-1">
                    <Search className="text-muted-foreground absolute top-3 left-3 size-4" />
                    <input
                      aria-label={l.search}
                      placeholder={l.search}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="border-input bg-card h-10 w-full rounded-lg border pr-3 pl-9 text-sm"
                    />
                  </label>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={l.refresh}
                    disabled={refreshing || busy}
                    onClick={onRetry}
                  >
                    <RefreshCw className={refreshing ? 'animate-spin' : ''} />
                  </Button>
                </div>
              </div>
            }
            onAdd={() => setForm({})}
            onView={onSelect}
            onUpdate={(id) => {
              const c = collections.find((c) => c.id === id);
              if (c) setForm({ collection: c });
            }}
            onDelete={(id) => {
              const c = collections.find((c) => c.id === id);
              if (c) remove(c);
            }}
            onToggle={(id) => {
              const c = collections.find((c) => c.id === id);
              if (c) action({ action: 'update', id, enabled: !c.enabled });
            }}
          />
        </>
      )}
      {form && (
        <CollectionFormDialog
          key={form.collection?.id ?? 'create'}
          collection={form.collection}
          accounts={accounts}
          accountsLoading={accountsLoading}
          accountsConfigured={accountsConfigured}
          onConnect={onConnect}
          onClose={() => setForm(null)}
          onSave={onAction}
          labels={l}
          emailAvailable={emailAvailable}
          emailNotice={emailNotice}
          onVerifyEmail={
            cap?.email && !emailVerified ? onVerifyEmail : undefined
          }
          busy={busy}
        />
      )}
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>{l.delete_title}</DialogTitle>
            <DialogDescription>{l.delete_description}</DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium break-words">{deleting?.name}</p>
          {deleteError && (
            <p role="alert" className="text-destructive text-sm">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              {l.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                if (deleting)
                  void onAction({ action: 'delete', id: deleting.id })
                    .then(() => setDeleting(null))
                    .catch((e) =>
                      setDeleteError(
                        e instanceof Error ? e.message : l.action_error
                      )
                    );
              }}
            >
              {busy ? l.busy : l.delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function WorkspaceStatus({
  labels: l,
  loading,
  onRetry,
  onBack,
}: {
  labels: GuardLabels;
  loading?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="p-8">
      {onBack && (
        <Button variant="outline" onClick={onBack} className="mb-6">
          <ArrowLeft />
          {l.back_to_playlists}
        </Button>
      )}
      <div
        className="border-border bg-card rounded-xl border p-12 text-center"
        role={loading ? 'status' : 'alert'}
      >
        {loading ? (
          <LoaderCircle className="mx-auto mb-3 size-6 animate-spin" />
        ) : (
          <CircleAlert className="text-destructive mx-auto mb-3 size-6" />
        )}
        <p className="text-muted-foreground text-sm">
          {loading ? l.loading : l.load_error}
        </p>
        {onRetry && (
          <Button className="mt-4" variant="outline" onClick={onRetry}>
            {l.retry}
          </Button>
        )}
      </div>
    </div>
  );
}
function WorkspaceDetail({
  detail,
  labels: l,
  date,
  scheduler,
  emailPreview,
  busy,
  canSync,
  environmentNotice,
  onBack,
  onEdit,
  onDelete,
  onSync,
  onExport,
}: {
  detail: GuardCollectionDetail;
  labels: GuardLabels;
  date: (v: string | null) => string;
  scheduler: boolean;
  emailPreview: boolean;
  busy: boolean;
  canSync: boolean;
  environmentNotice: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSync: () => void;
  onExport: GuardWorkspaceProps['onExport'];
}) {
  const [tab, setTab] = useState<CollectionTab>('missing');
  const [sort, setSort] = useState<CollectionSort>('default');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [snapshotId, setSnapshotId] = useState('latest');
  const [exportOpen, setExportOpen] = useState(false);
  const snapshot =
    snapshotId === 'latest'
      ? undefined
      : detail.snapshots.find((s) => s.id === snapshotId);
  const view = collectionDetailView(
    detail,
    date,
    scheduler,
    l.manual_only,
    snapshot
  );
  return (
    <>
      <CollectionDetail
        headingLevel={1}
        labels={l}
        collection={view}
        tab={tab}
        sort={sort}
        page={page}
        pageSize={10}
        search={search}
        latestLabel={snapshot ? l.snapshot : l.latest_version}
        onTabChange={(value) => {
          setTab(value);
          setPage(1);
          setSearch('');
          setSort('default');
        }}
        onSortChange={(value) => {
          setSort(value);
          setPage(1);
        }}
        onPageChange={setPage}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onBack={onBack}
        onExport={() => setExportOpen(true)}
        headerActions={
          <>
            <Button
              variant="outline"
              className="h-10 px-3 text-xs"
              disabled={busy || !canSync || !detail.enabled}
              onClick={onSync}
            >
              <RefreshCw className={busy ? 'animate-spin' : ''} />
              {busy ? l.busy : l.sync}
            </Button>
            <Button
              variant="outline"
              className="h-10 px-3 text-xs"
              disabled={busy}
              onClick={onEdit}
            >
              <Pencil />
              {l.update}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10"
              aria-label={l.delete}
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </>
        }
        notice={
          <>
            <div
              className="border-border bg-card rounded-lg border p-3 text-xs leading-6"
              role="status"
            >
              <span className="font-medium">{l.notification_status}: </span>
              {detail.delivery ? (
                <>
                  <span>
                    {emailPreview && detail.delivery.status === 'sent'
                      ? l.email_preview_sent
                      : l[`notification_${detail.delivery.status}`]}
                  </span>
                  <span className="text-muted-foreground ml-3">
                    {l.notification_attempts}: {detail.delivery.attempts}
                  </span>
                  {detail.delivery.sentAt && (
                    <span className="text-muted-foreground ml-3">
                      {date(detail.delivery.sentAt)}
                    </span>
                  )}
                  {detail.delivery.nextAttemptAt && (
                    <span className="text-muted-foreground ml-3">
                      {l.notification_retry}:{' '}
                      {date(detail.delivery.nextAttemptAt)}
                    </span>
                  )}
                  {detail.delivery.lastError && (
                    <p className="text-destructive">
                      {detail.delivery.lastError}
                    </p>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">
                  {l.notification_none}
                </span>
              )}
              {emailPreview && (
                <p className="text-muted-foreground">{l.email_preview}</p>
              )}
            </div>
            {detail.lastError && (
              <div
                role="alert"
                className="border-destructive/25 bg-destructive/5 rounded-lg border p-4 text-sm"
              >
                <p className="font-medium">
                  {detail.runCount === 0 ? l.sync_initial_error : l.sync_error}
                </p>
                <p className="text-muted-foreground mt-1">{detail.lastError}</p>
              </div>
            )}
            <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <span>
                {l.status}:{' '}
                <strong className="text-foreground">
                  {detail.enabled ? l.enabled : l.paused}
                </strong>
              </span>
              <span>
                {l.backup_frequency}: {l[detail.frequency]}
              </span>
              <span>
                {l.next_sync}: {detail.enabled ? view.nextSyncLabel : l.paused}
              </span>
            </div>
            {environmentNotice && (
              <p className="text-muted-foreground text-xs">
                {environmentNotice}
              </p>
            )}
          </>
        }
        snapshotSelector={
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <label className="flex min-w-0 items-center gap-2 text-sm">
              <History className="size-4 shrink-0" />
              {l.history}
              <select
                aria-label={l.history}
                value={snapshot?.id ?? 'latest'}
                onChange={(e) => {
                  setSnapshotId(e.target.value);
                  setPage(1);
                  setSearch('');
                }}
                className="border-input bg-background max-w-full min-w-0 rounded-lg border p-2 text-xs"
              >
                <option value="latest">
                  {l.latest_version}
                  {detail.lastSyncedAt ? ` · ${date(detail.lastSyncedAt)}` : ''}
                </option>
                {detail.snapshots.slice(1).map((s) => (
                  <option key={s.id} value={s.id}>
                    {date(s.createdAt)} · {s.itemCount} {l.items}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-muted-foreground text-xs">
              {l.history_note}
            </span>
            {snapshot && (
              <span className="text-muted-foreground w-full text-xs">
                +{snapshot.added} {l.added} · −{snapshot.removed} {l.removed}
                {(snapshot.restored ?? 0) > 0 && (
                  <>
                    {' '}
                    · {snapshot.restored} {l.restored}
                  </>
                )}
              </span>
            )}
          </div>
        }
      />
      {exportOpen && (
        <CollectionExportDialog
          collection={detail}
          snapshot={snapshot}
          initialKind={
            tab === 'missing' && detail.missing.length
              ? 'missing'
              : snapshot
                ? 'snapshot'
                : 'latest'
          }
          labels={l}
          onClose={() => setExportOpen(false)}
          onExport={onExport}
        />
      )}
    </>
  );
}
