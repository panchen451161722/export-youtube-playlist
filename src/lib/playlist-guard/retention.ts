import type { GuardCollectionDetail } from './types';

export const GUARD_METADATA_RETENTION_MS = 30 * 86_400_000;

/** Missing/invalid/future timestamps are not evidence of a recent API retrieval. */
export function isFreshGuardMetadata(value: unknown, now: number): boolean {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return (
    Number.isFinite(time) &&
    time > now - GUARD_METADATA_RETENTION_MS &&
    time <= now
  );
}

/** Apply on reads as well as maintenance so expired data cannot be exported between sweeps. */
export function pruneGuardMetadata(
  document: GuardCollectionDetail,
  now: number
): GuardCollectionDetail {
  const snapshots = document.snapshots.filter((snapshot) =>
    isFreshGuardMetadata(snapshot.createdAt, now)
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
    return isFreshGuardMetadata(lastSeenAt, now)
      ? [{ ...item, lastSeenAt }]
      : [];
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
    !isFreshGuardMetadata(document.sourceTitleFetchedAt, now)
  ) {
    // Auto-generated names may themselves be a copy of API metadata.
    if (result.name === document.sourceTitle) result.name = 'Collection';
    delete result.sourceTitle;
    delete result.sourceTitleFetchedAt;
  }
  return result;
}
