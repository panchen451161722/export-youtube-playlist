import { useState, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  Check,
  CircleMinus,
  Clock3,
  ExternalLink,
  History,
  Link2,
  ListVideo,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';

import {
  safeYoutubeHref,
  sortedCollectionVideos,
  visiblePageNumbers,
  type CollectionDetailView,
  type CollectionSort,
  type CollectionSummaryView,
  type CollectionTab,
  type CollectionVideo,
} from '@/lib/playlist-guard/presentation';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';

type Labels = Record<string, string>;
const panel =
  'overflow-hidden rounded-xl border border-border bg-card shadow-sm';
const control =
  'h-10 rounded-lg border border-input bg-background text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30';

export type CollectionListProps = {
  labels: Labels;
  collections: CollectionSummaryView[];
  busy?: boolean;
  canAdd?: boolean;
  headingLevel?: 1 | 2;
  toolbar?: ReactNode;
  headerExtra?: ReactNode;
  empty?: boolean;
  limit?: number;
  totalCount?: number;
  showSourceLinks?: boolean;
  onAdd: () => void;
  onView: (id: string) => void;
  onUpdate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
};

export function CollectionList({
  labels: l,
  collections,
  limit = 15,
  totalCount = collections.length,
  onAdd,
  onView,
  onUpdate,
  onDelete,
  onToggle,
  busy = false,
  canAdd = true,
  headingLevel = 2,
  toolbar,
  headerExtra,
  empty,
  showSourceLinks = false,
}: CollectionListProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <section className={cn(panel, 'p-5 sm:p-8')}>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="space-y-3">
            <Heading className="text-xl leading-tight font-semibold tracking-tight sm:text-2xl lg:text-3xl">
              {l.monitor_title}
            </Heading>
            {l.list_description && (
              <p className="text-muted-foreground max-w-xl text-sm leading-6">
                {l.list_description}
              </p>
            )}
            <span className="bg-primary text-primary-foreground inline-flex rounded-md px-2.5 py-1 text-xs font-medium">
              {totalCount}/{limit} {l.collections_added}
            </span>
          </div>
          <Button
            data-tour="add"
            onClick={onAdd}
            disabled={busy || !canAdd || collections.length >= limit}
            className="h-10 px-4"
          >
            <Plus aria-hidden="true" /> {l.add_new}
          </Button>
        </div>
        {headerExtra}
      </section>
      {toolbar}

      {collections.length === 0 ? (
        <section className={cn(panel, 'px-6 py-16 text-center')}>
          <ListVideo
            className="text-muted-foreground mx-auto mb-4 size-9"
            aria-hidden="true"
          />
          <h3 className="font-semibold">
            {empty === false ? l.no_search_results : l.empty_collections}
          </h3>
          <p className="text-muted-foreground mt-2 text-sm">
            {l.empty_collections_hint}
          </p>
          <Button
            disabled={busy || !canAdd}
            onClick={onAdd}
            className="mt-5 h-10 px-4"
          >
            <Plus aria-hidden="true" />
            {l.add_new}
          </Button>
        </section>
      ) : (
        <CollectionCards
          labels={l}
          collections={collections}
          busy={busy}
          showSourceLinks={showSourceLinks}
          onView={onView}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      )}
    </div>
  );
}

/** Shared live/demo cards; pages choose the actions they expose. */
export function CollectionCards({
  labels: l,
  collections,
  busy = false,
  showSourceLinks = false,
  onView,
  onUpdate,
  onDelete,
  onToggle,
}: Pick<
  CollectionListProps,
  | 'labels'
  | 'collections'
  | 'busy'
  | 'showSourceLinks'
  | 'onView'
  | 'onUpdate'
  | 'onToggle'
> & { onDelete?: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {collections.map((collection) => (
        <article
          key={collection.id}
          data-tour={`card-${collection.id}`}
          className={cn(
            panel,
            'flex h-full flex-col transition-shadow hover:shadow-md'
          )}
        >
          <header className="border-border flex items-start justify-between gap-3 border-b px-6 py-6">
            <div className="min-w-0">
              <h3
                className="line-clamp-2 text-lg leading-7 font-semibold break-words"
                title={collection.name}
              >
                {collection.name}
              </h3>
              <p className="text-primary mt-1 text-sm font-medium uppercase">
                {collection.source === 'channel'
                  ? l.public_channel
                  : collection.source === 'playlist'
                    ? l.public_playlist
                    : l[collection.source]}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => onToggle(collection.id)}
                aria-label={
                  collection.enabled ? l.pause_collection : l.enable_collection
                }
                aria-pressed={collection.enabled}
                className={cn(
                  'focus-visible:ring-ring mt-2 rounded-full px-2 py-0.5 text-xs font-medium shadow-xs outline-none focus-visible:ring-2',
                  collection.enabled
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {collection.enabled ? l.enabled : l.paused}
              </button>
            </div>
            {showSourceLinks && safeYoutubeHref(collection.url) ? (
              <a
                href={safeYoutubeHref(collection.url)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${l.open_source}: ${collection.name}`}
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'icon' }),
                  'size-10 shrink-0 rounded-md'
                )}
              >
                <Link2 aria-hidden="true" />
              </a>
            ) : (
              <Button
                variant="secondary"
                size="icon"
                aria-label={`${l.view}: ${collection.name}`}
                onClick={() => onView(collection.id)}
                className="size-10 shrink-0 rounded-md"
              >
                <Link2 aria-hidden="true" />
              </Button>
            )}
          </header>
          <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-5 px-6 py-6">
            <Metric
              label={l.backup_frequency}
              value={l[collection.frequency]}
            />
            <Metric
              label={l.tracking_since}
              value={l[collection.createdLabel] ?? collection.createdLabel}
            />
            <Metric label={l.items} value={collection.itemCount} />
            <Metric
              label={l.card_missing || l.missing}
              value={collection.missingCount}
              warning={collection.missingCount > 0}
            />
            {collection.nextSyncLabel && (
              <>
                <Metric
                  label={l.last_synced}
                  value={collection.lastSyncLabel}
                />
                <Metric
                  label={l.card_next_sync || l.next_sync}
                  value={
                    collection.enabled ? collection.nextSyncLabel : l.paused
                  }
                />
              </>
            )}
          </dl>
          {collection.lastError && (
            <p role="status" className="text-destructive px-6 pb-5 text-sm">
              <span className="block font-medium">
                {collection.runCount === 0
                  ? l.sync_initial_error || l.sync_error
                  : l.sync_error}
              </span>
              <span className="mt-1 block">{collection.lastError}</span>
            </p>
          )}
          <footer
            className={cn(
              'border-border bg-muted/10 grid gap-2 border-t px-6 py-4',
              onDelete ? 'grid-cols-3' : 'grid-cols-2'
            )}
          >
            <Button
              data-tour={`view-${collection.id}`}
              variant="outline"
              onClick={() => onView(collection.id)}
              className="h-10 min-w-0 px-2 text-sm font-normal"
            >
              {l.card_view || l.view}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => onUpdate(collection.id)}
              className="h-10 min-w-0 px-2 text-sm font-normal"
            >
              {l.card_update || l.update}
            </Button>
            {onDelete && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => onDelete(collection.id)}
                className="h-10 min-w-0 px-2 text-sm font-normal"
              >
                {l.card_delete || l.delete}
              </Button>
            )}
          </footer>
        </article>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string | number;
  warning?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          'text-sm leading-6 font-medium tabular-nums',
          warning && 'text-destructive'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export type CollectionDetailProps = {
  labels: Labels;
  collection: CollectionDetailView;
  pageSize?: number;
  headingLevel?: 1 | 2;
  headerActions?: ReactNode;
  snapshotSelector?: ReactNode;
  latestLabel?: string;
  notice?: ReactNode;
  tab: CollectionTab;
  sort: CollectionSort;
  page: number;
  search: string;
  onTabChange: (tab: CollectionTab) => void;
  onSortChange: (sort: CollectionSort) => void;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onBack: () => void;
  onExport: () => void;
};

export function CollectionDetail({
  labels: l,
  collection,
  tab,
  sort,
  page,
  search,
  onTabChange,
  onSortChange,
  onPageChange,
  onSearchChange,
  onBack,
  onExport,
  pageSize = 3,
  headingLevel = 2,
  headerActions,
  snapshotSelector,
  latestLabel,
  notice,
}: CollectionDetailProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const videos = sortedCollectionVideos(
    tab === 'missing' ? collection.missing : collection.items,
    sort,
    search
  );
  const pageCount = Math.max(1, Math.ceil(videos.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const visible = videos.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <section className={cn(panel, 'p-5 sm:p-6')}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1 basis-72">
            <Heading className="text-xl leading-tight font-semibold tracking-tight sm:text-2xl">
              {collection.name}
            </Heading>
            <div className="text-muted-foreground mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <History className="size-3.5" aria-hidden="true" />
                {l.tracking_since}:{' '}
                <strong className="text-foreground font-medium">
                  {l[collection.createdLabel] ?? collection.createdLabel}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="size-3.5" aria-hidden="true" />
                {l.last_synced}:{' '}
                <strong className="text-foreground font-medium">
                  {l[collection.lastSyncLabel] ?? collection.lastSyncLabel}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PlayCircle className="size-3.5" aria-hidden="true" />
                {l.total_runs}:{' '}
                <strong className="text-foreground font-medium">
                  {collection.runCount}
                </strong>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {headerActions}
            <Button
              data-tour="back"
              variant="outline"
              className="h-10 px-3 text-xs"
              onClick={onBack}
            >
              <ArrowLeft aria-hidden="true" />
              {l.back_to_playlists}
            </Button>
            <Button
              data-tour="export"
              className="h-10 px-3 text-xs"
              onClick={onExport}
              disabled={!collection.items.length && !collection.missing.length}
            >
              <ArrowDownToLine aria-hidden="true" />
              {l.export_data}
            </Button>
          </div>
        </div>
      </section>

      {notice}
      <section className={panel}>
        <div
          role="tablist"
          aria-label={collection.name}
          className="border-border flex gap-1 overflow-x-auto border-b px-3 sm:px-5"
        >
          {(['missing', 'latest'] as const).map((value) => {
            const Icon = value === 'missing' ? CircleMinus : ListVideo;
            const count =
              value === 'missing'
                ? collection.missing.length
                : collection.items.length;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                id={`tour-tab-${value}`}
                aria-selected={tab === value}
                aria-controls="tour-video-panel"
                tabIndex={tab === value ? 0 : -1}
                data-tour={`tab-${value}`}
                onClick={() => onTabChange(value)}
                onKeyDown={(event) => {
                  if (
                    !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                      event.key
                    )
                  )
                    return;
                  event.preventDefault();
                  const next =
                    event.key === 'Home'
                      ? 'missing'
                      : event.key === 'End'
                        ? 'latest'
                        : value === 'latest'
                          ? 'missing'
                          : 'latest';
                  onTabChange(next);
                  event.currentTarget.parentElement
                    ?.querySelector<HTMLButtonElement>(
                      `[data-tour="tab-${next}"]`
                    )
                    ?.focus();
                }}
                className={cn(
                  'focus-visible:ring-ring inline-flex min-h-14 shrink-0 items-center gap-2 border-b-2 px-2 text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-inset sm:px-3 sm:text-sm',
                  tab === value
                    ? 'border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                )}
              >
                <Icon
                  className={cn(
                    'size-4',
                    value === 'missing' && count > 0
                      ? 'text-destructive'
                      : value === 'latest'
                        ? 'text-emerald-600'
                        : ''
                  )}
                  aria-hidden="true"
                />
                {value === 'missing'
                  ? l.missing_videos
                  : (latestLabel ?? l.latest_version)}
                <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id="tour-video-panel"
          aria-labelledby={`tour-tab-${tab}`}
        >
          {tab === 'latest' && snapshotSelector}
          {
            <div className="border-border bg-muted/25 flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <label className="relative min-w-0 flex-1 basis-48">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-3 left-3 size-4"
                  aria-hidden="true"
                />
                <input
                  aria-label={l.search_latest}
                  placeholder={l.search_latest}
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  className={cn(control, 'w-full pr-3 pl-9')}
                />
              </label>
              <label className="text-muted-foreground flex items-center gap-2 text-xs">
                {l.sort_by}
                <select
                  data-tour="sort"
                  value={sort}
                  onChange={(event) =>
                    onSortChange(event.target.value as CollectionSort)
                  }
                  className={cn(control, 'text-foreground max-w-44 px-3')}
                >
                  <option value="default">{l.default_order}</option>
                  <option value="title">{l.title_az}</option>
                  {(tab === 'missing'
                    ? collection.missing
                    : collection.items
                  ).some((item) => typeof item.views === 'number') && (
                    <option value="views">{l.most_viewed}</option>
                  )}
                </select>
              </label>
            </div>
          }

          {collection.hasSnapshot === false ? (
            <p className="text-muted-foreground px-5 py-16 text-center text-sm">
              {l.no_snapshot}
            </p>
          ) : tab === 'missing' && collection.missing.length === 0 ? (
            <div className="bg-muted/5 px-5 py-16 text-center">
              <Check
                className="mx-auto mb-4 size-12 text-emerald-500"
                aria-hidden="true"
              />
              <h3 className="text-xl font-medium">{l.no_missing_title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {l.no_missing_description}
              </p>
            </div>
          ) : videos.length === 0 ? (
            <p className="text-muted-foreground px-5 py-16 text-center text-sm">
              {l.no_search_results}
            </p>
          ) : (
            <div className="divide-border divide-y">
              {visible.map((video) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  missing={tab === 'missing'}
                  labels={l}
                />
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <nav
              aria-label={l.page_label}
              className="border-border flex justify-center gap-2 border-t p-4"
            >
              <Button
                variant="outline"
                disabled={safePage === 1}
                onClick={() => onPageChange(safePage - 1)}
                size="sm"
              >
                {l.previous}
              </Button>
              {visiblePageNumbers(safePage, pageCount).map((number) => (
                <Button
                  key={number}
                  data-tour={`page-${number}`}
                  variant={number === safePage ? 'default' : 'outline'}
                  onClick={() => onPageChange(number)}
                  aria-current={number === safePage ? 'page' : undefined}
                  aria-label={`${l.page_label} ${number}`}
                  size="sm"
                  className="min-w-8"
                >
                  {number}
                </Button>
              ))}
              <Button
                variant="outline"
                disabled={safePage === pageCount}
                onClick={() => onPageChange(safePage + 1)}
                size="sm"
              >
                {l.next}
              </Button>
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}

function VideoRow({
  video,
  missing,
  labels: l,
}: {
  video: CollectionVideo;
  missing: boolean;
  labels: Labels;
}) {
  const [failedImage, setFailedImage] = useState(false);
  const imageUrl = /^https:\/\/(i\.ytimg\.com|yt3\.ggpht\.com)\//.test(
    video.thumbnail
  )
    ? video.thumbnail
    : '';
  const href = safeYoutubeHref(video.url);
  const openLabel = video.kind === 'channel' ? l.open_channel : l.open_video;
  const views =
    video.views === undefined
      ? null
      : new Intl.NumberFormat('en', {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(video.views);
  return (
    <article className={cn('p-4', missing && 'bg-muted/15')}>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="bg-muted relative aspect-video w-full shrink-0 overflow-hidden rounded-lg sm:w-48">
          {imageUrl && !failedImage ? (
            <img
              onError={() => setFailedImage(true)}
              src={imageUrl}
              alt={video.title}
              width={480}
              height={360}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className={cn(
                'absolute inset-0 size-full object-cover',
                missing && 'opacity-65 grayscale'
              )}
            />
          ) : (
            <div className="text-muted-foreground absolute inset-0 grid place-items-center">
              <PlayCircle className="size-8" aria-hidden="true" />
            </div>
          )}
          {!missing && video.duration && (
            <span className="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {video.duration}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 py-1">
          <div>
            <h3
              className={cn(
                'text-sm leading-snug font-semibold sm:text-base',
                missing && 'text-foreground/75 line-through'
              )}
            >
              {video.title}
            </h3>
            <p className="text-muted-foreground mt-1.5 text-xs">
              {video.channel}
            </p>
          </div>
          {missing ? (
            <div>
              <span className="bg-destructive/5 text-destructive inline-flex rounded px-2 py-1 text-xs font-medium">
                {l.missing_since}{' '}
                {l[video.missingSince ?? ''] ?? video.missingSince}
              </span>
            </div>
          ) : (
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              {video.duration && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  {video.duration}
                </span>
              )}
              {views !== null && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden="true" />
                  {views} {l.views}
                </span>
              )}
              {href && (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-xs underline-offset-4 outline-none hover:underline focus-visible:ring-2"
                  aria-label={`${openLabel}: ${video.title}`}
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  {openLabel}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
