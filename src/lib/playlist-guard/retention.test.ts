import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyScan } from '@/modules/playlist-guard/service';

import { GUARD_METADATA_RETENTION_MS, pruneGuardMetadata } from './retention';
import type { GuardCollectionDetail, GuardItem } from './types';

const now = Date.UTC(2026, 9, 18);
const DAY = 86_400_000;
const item: GuardItem = {
  id: 'video',
  title: 'Old metadata',
  channel: 'Channel',
  url: 'https://youtu.be/video',
  thumbnail: '',
  duration: '1:00',
  position: 1,
};
const empty: GuardCollectionDetail = {
  id: 'collection',
  name: 'My collection',
  source: 'playlist',
  url: 'https://youtube.com/playlist?list=PLtest',
  frequency: 'daily',
  enabled: false,
  notifyMissing: false,
  notifyAdded: false,
  emailDelivery: false,
  createdAt: new Date(now).toISOString(),
  lastSyncedAt: null,
  nextSyncAt: null,
  lastError: null,
  itemCount: 0,
  missingCount: 0,
  runCount: 0,
  snapshots: [],
  missing: [],
};

test('missing metadata expires from its last successful retrieval, not later disappearance or scans', () => {
  const first = applyScan(empty, { complete: true, items: [item] }, now);
  const missing = applyScan(
    first,
    { complete: true, items: [] },
    now + 29 * DAY
  );
  assert.equal(missing.missing[0].lastSeenAt, new Date(now).toISOString());
  assert.equal(
    missing.missing[0].missingSince,
    new Date(now + 29 * DAY).toISOString()
  );
  const boundary = pruneGuardMetadata(
    missing,
    now + GUARD_METADATA_RETENTION_MS
  );
  assert.equal(boundary.missing.length, 0);
  assert.equal(
    boundary.snapshots.length,
    1,
    'recent empty snapshot remains, old video does not'
  );
  assert.equal(JSON.stringify(boundary).includes('Old metadata'), false);
});

test('legacy missing records need a genuine snapshot retrieval timestamp; unproven titles fail closed', () => {
  const first = applyScan(empty, { complete: true, items: [item] }, now);
  const missing = { ...item, missingSince: new Date(now + DAY).toISOString() };
  assert.equal(
    pruneGuardMetadata({ ...first, missing: [missing] }, now + DAY).missing
      .length,
    1
  );
  assert.equal(
    pruneGuardMetadata({ ...empty, missing: [missing] }, now + DAY).missing
      .length,
    0
  );
  const titled = {
    ...first,
    name: 'Old channel',
    sourceTitle: 'Old channel',
    sourceTitleFetchedAt: new Date(now).toISOString(),
  };
  const cleaned = pruneGuardMetadata(titled, now + 30 * DAY);
  assert.equal(cleaned.sourceTitle, undefined);
  assert.equal(cleaned.name, 'Collection');
  assert.equal(
    pruneGuardMetadata({ ...titled, name: 'My research' }, now + 30 * DAY).name,
    'My research'
  );
  assert.equal(
    pruneGuardMetadata({ ...titled, sourceTitleFetchedAt: undefined }, now)
      .sourceTitle,
    undefined
  );
});

test('fresh scans cannot renew old snapshots, source titles or missing metadata', () => {
  const first = applyScan(
    { ...empty, source: 'channel' },
    { complete: true, items: [item], sourceTitle: 'Channel title' },
    now
  );
  const newest = applyScan(
    first,
    { complete: true, items: [{ ...item, id: 'new', title: 'Fresh' }] },
    now + 30 * DAY
  );
  assert.equal(newest.snapshots.length, 1);
  assert.equal(newest.missing.length, 0);
  assert.equal(newest.sourceTitle, undefined);
  assert.equal(newest.snapshots[0].items[0].title, 'Fresh');
  assert.equal(
    newest.snapshots[0].added,
    0,
    'Expired baselines do not classify the entire collection as new'
  );
  const future = {
    ...first.snapshots[0],
    createdAt: new Date(now + DAY).toISOString(),
  };
  assert.equal(
    pruneGuardMetadata({ ...empty, snapshots: [future] }, now).snapshots.length,
    0
  );
});
