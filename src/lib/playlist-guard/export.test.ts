import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyGuardDemoAction, createGuardDemo } from './demo';
import { guardCsv, guardExportCell } from './export';

test('CSV preserves quotes/newlines and neutralizes spreadsheet formulas', () => {
  for (const value of [
    '=WEBSERVICE("https://bad.example")',
    ' +SUM(1,2)',
    '@SUM(A:A)',
    '\tformula',
  ])
    assert.equal(guardExportCell(value), `'${value}`);
  const item = {
    ...createGuardDemo()[0].snapshots[0].items[0],
    title: '=1+1',
    channel: 'A "quoted"\nchannel',
  };
  const csv = guardCsv([item]);
  assert.ok(csv.startsWith('\ufeff'));
  assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(csv.includes('"A ""quoted""\nchannel"'));
});
test('demo operations stay local and preserve missing metadata/history', () => {
  const initial = createGuardDemo();
  const snapshot = JSON.stringify(initial);
  const next = applyGuardDemoAction(initial, {
    action: 'sync',
    id: initial[0].id,
  });
  assert.equal(JSON.stringify(initial), snapshot);
  assert.equal(next[0].runCount, 3);
  assert.equal(next[0].snapshots.length, 3);
  assert.equal(next[0].snapshots[0].removed, 1);
  assert.equal(next[0].missing.length, 2);
  const paused = applyGuardDemoAction(next, {
    action: 'update',
    id: next[0].id,
    enabled: false,
  });
  assert.equal(paused[0].enabled, false);
  assert.equal(
    applyGuardDemoAction(paused, { action: 'delete', id: paused[0].id }).length,
    2
  );
});

test('subscribed channels export as channel IDs and URLs', () => {
  const item = {
    ...createGuardDemo()[0].snapshots[0].items[0],
    id: 'UCtest',
    kind: 'channel' as const,
    url: 'https://www.youtube.com/channel/UCtest',
    duration: '',
    views: undefined,
  };
  const csv = guardCsv([item]);
  assert.ok(csv.includes('"Channel URL"'));
  assert.ok(csv.includes('"Channel ID"'));
  assert.ok(!csv.includes('"Video ID"'));
});
