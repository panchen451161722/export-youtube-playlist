import type { GuardCollectionDetail } from './types';

/** Authorization checks and queued notifications still require recent evidence. */
export const GUARD_FRESHNESS_WINDOW_MS = 30 * 86_400_000;

function hasValidTimestamp(value: unknown, now: number): boolean {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now;
}

/** Missing/invalid/future timestamps are not evidence of a recent API retrieval. */
export function isFreshGuardMetadata(value: unknown, now: number): boolean {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return (
    Number.isFinite(time) &&
    time > now - GUARD_FRESHNESS_WINDOW_MS &&
    time <= now
  );
}

/** Cloud snapshots have no age expiry; reject invalid provenance on reads and maintenance. */
export function pruneGuardMetadata(
  document: GuardCollectionDetail,
  now: number
): GuardCollectionDetail {
  const snapshots = document.snapshots.filter((snapshot) =>
    hasValidTimestamp(snapshot.createdAt, now)
  );
  const missing = document.missing.flatMap((item) => {
    // Legacy missingSince dates describe absence, not retrieval. Recover provenance
    // only from a dated snapshot that really contained the item; otherwise erase it.
    const lastSeenAt =
      item.lastSeenAt ??
      document.snapshots
        .filter((snapshot) =>
          snapshot.items.some((entry) => entry.id === item.id)
        )
        .map((snapshot) => snapshot.createdAt)
        .sort()
        .at(-1);
    return hasValidTimestamp(lastSeenAt, now) ? [{ ...item, lastSeenAt }] : [];
  });
  const result = {
    ...document,
    snapshots,
    missing,
    itemCount: snapshots[0]?.itemCount ?? 0,
    missingCount: missing.length,
  };
  if (
    document.sourceTitle &&
    !hasValidTimestamp(document.sourceTitleFetchedAt, now)
  ) {
    // Auto-generated names may themselves be a copy of API metadata.
    if (result.name === document.sourceTitle) result.name = 'Collection';
    delete result.sourceTitle;
    delete result.sourceTitleFetchedAt;
  }
  return result;
}
