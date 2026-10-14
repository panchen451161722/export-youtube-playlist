import type {
  GuardCollection,
  GuardCollectionDetail,
  GuardItem,
  GuardSnapshot,
} from './types';

export type CollectionVideo = GuardItem & { missingSince?: string };
export type CollectionSummaryView = GuardCollection & {
  createdLabel: string;
  lastSyncLabel: string;
  nextSyncLabel?: string;
};
export type CollectionDetailView = CollectionSummaryView & {
  items: CollectionVideo[];
  missing: CollectionVideo[];
  hasSnapshot?: boolean;
};
export type CollectionTab = 'missing' | 'latest';
export type CollectionSort = 'default' | 'title' | 'views';

export function sortedCollectionVideos(
  items: CollectionVideo[],
  sort: CollectionSort,
  search: string
) {
  const needle = search.trim().toLocaleLowerCase();
  return items
    .filter(
      (item) =>
        !needle ||
        `${item.title} ${item.channel}`.toLocaleLowerCase().includes(needle)
    )
    .sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'views')
        return (b.views ?? -1) - (a.views ?? -1) || a.position - b.position;
      return a.position - b.position;
    });
}
export function visiblePageNumbers(current: number, total: number): number[] {
  return [...new Set([1, current - 1, current, current + 1, total])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
}
export function collectionView(
  collection: GuardCollection,
  formatDate: (value: string | null) => string,
  scheduler: boolean,
  manualLabel: string
): CollectionSummaryView {
  return {
    ...collection,
    createdLabel: formatDate(collection.createdAt),
    lastSyncLabel: formatDate(collection.lastSyncedAt),
    nextSyncLabel:
      scheduler && collection.enabled
        ? formatDate(collection.nextSyncAt)
        : manualLabel,
  };
}
export function collectionDetailView(
  collection: GuardCollectionDetail,
  formatDate: (value: string | null) => string,
  scheduler: boolean,
  manualLabel: string,
  snapshot?: GuardSnapshot
): CollectionDetailView {
  return {
    ...collectionView(collection, formatDate, scheduler, manualLabel),
    items: (snapshot ?? collection.snapshots[0])?.items ?? [],
    missing: collection.missing.map((item) => ({
      ...item,
      missingSince: formatDate(item.missingSince),
    })),
    hasSnapshot: collection.snapshots.length > 0,
  };
}
export function safeYoutubeHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      [
        'youtube.com',
        'www.youtube.com',
        'music.youtube.com',
        'youtu.be',
      ].includes(url.hostname)
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
