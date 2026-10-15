import assert from 'node:assert/strict';
import { test } from 'node:test';

import { guardExportRows } from './export';
import {
  collectionView,
  formatCollectionDate,
  safeYoutubeHref,
  sortedCollectionVideos,
  visiblePageNumbers,
} from './presentation';
import type { GuardCollection, GuardItem } from './types';

test('saved snapshots with unavailable statistics sort without inventing views, and exports retain original metadata', () => {
  const base: GuardItem = {
    id: 'a',
    title: 'Original title',
    channel: 'Channel',
    position: 1,
    duration: '3:30',
    url: 'https://www.youtube.com/watch?v=abcdefghijk',
    thumbnail: '',
  };
  const items = [
    base,
    { ...base, id: 'b', title: 'Second video', position: 2, views: 250 },
    {
      ...base,
      id: 'c',
      position: 3,
      views: 0,
      missingSince: '2026-10-13T09:00:00Z',
    },
  ];
  const copy = JSON.stringify(items);
  assert.deepEqual(
    sortedCollectionVideos(items, 'views', '').map((item) => item.id),
    ['b', 'c', 'a']
  );
  assert.equal(sortedCollectionVideos(items, 'default', 'Second')[0].id, 'b');
  assert.equal(JSON.stringify(items), copy);
  const rows = guardExportRows(items);
  assert.equal(rows[1].at(-1), '');
  assert.equal(rows[2].at(-1), 250);
  assert.equal(rows[3].at(-2), '2026-10-13T09:00:00Z');
  assert.ok(rows.every((row) => row.length === rows[0].length));
  assert.ok(visiblePageNumbers(25, 50).length <= 5);
  assert.deepEqual(visiblePageNumbers(1, 1), [1]);
  assert.equal(safeYoutubeHref('javascript:alert(1)'), undefined);
  assert.equal(
    safeYoutubeHref('https://youtube.com.attacker.invalid/'),
    undefined
  );
  assert.equal(safeYoutubeHref(base.url), base.url);
});

test('card dates are concise and a disabled scheduler never promises an automatic next check', () => {
  const time = '2026-10-14T15:57:00Z';
  const c = {
    createdAt: time,
    lastSyncedAt: time,
    nextSyncAt: '2026-10-15T15:57:00Z',
    enabled: true,
  } as GuardCollection;
  const date = (value: string | null, style?: 'full' | 'date' | 'short') =>
    formatCollectionDate(value, 'en', 'Not yet', style);
  const scheduled = collectionView(c, date, true, 'Manual checks available');
  assert.ok(!scheduled.createdLabel.includes(':'));
  assert.ok(scheduled.createdLabel.includes('2026'));
  assert.ok(scheduled.lastSyncLabel.includes(':'));
  assert.ok(!scheduled.lastSyncLabel.includes('2026'));
  assert.ok(scheduled.nextSyncLabel?.includes(':'));
  assert.equal(
    collectionView(c, date, false, 'Manual checks available').nextSyncLabel,
    'Manual checks available'
  );
  assert.equal(formatCollectionDate(null, 'zh', '尚未同步'), '尚未同步');
});
