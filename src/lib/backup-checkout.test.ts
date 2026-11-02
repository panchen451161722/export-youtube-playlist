import assert from 'node:assert/strict';
import { test } from 'node:test';

import { backupCheckoutPaths } from './backup-checkout';
import { guestCheckoutSchema, guestPaths } from './guest-checkout';

test('backup checkout preserves locale and only returns to fixed setup URLs', () => {
  assert.deepEqual(backupCheckoutPaths('backup', 'en'), {
    success: '/youtube-playlist-backup?setup=success',
    cancel: '/youtube-playlist-backup?setup=cancel',
  });
  assert.deepEqual(backupCheckoutPaths('backup', 'zh'), {
    success: '/zh/youtube-playlist-backup?setup=success',
    cancel: '/zh/youtube-playlist-backup?setup=cancel',
  });
  assert.deepEqual(backupCheckoutPaths('backup', 'de'), {
    success: '/de/youtube-playlist-backup?setup=success',
    cancel: '/de/youtube-playlist-backup?setup=cancel',
  });
  assert.deepEqual(
    backupCheckoutPaths('backup', '//evil.test'),
    backupCheckoutPaths('backup', 'en')
  );
  for (const flow of [undefined, 'pricing', '//evil.test'])
    assert.equal(backupCheckoutPaths(flow, 'en'), null);
});

test('guest trial accepts German and preserves it through success, cancellation and account claim', () => {
  const input = guestCheckoutSchema.parse({
    locale: 'de',
    backup: {
      url: 'https://www.youtube.com/playlist?list=PL1234567890',
      planId: 'lite',
      frequency: 'daily',
      notifyMissing: true,
      notifyAdded: false,
      notifyRestored: true,
    },
  });
  assert.equal(input.locale, 'de');
  assert.deepEqual(guestPaths('purchase-fixture', input.locale), {
    success: '/de/youtube-playlist-backup?guest=purchase-fixture',
    cancel: '/de/youtube-playlist-backup?guest=purchase-fixture&setup=cancel',
    claim: '/de/claim-backup?purchase=purchase-fixture',
  });
  assert.equal(
    guestCheckoutSchema.safeParse({ ...input, locale: '//evil.test' }).success,
    false
  );
  assert.deepEqual(
    guestPaths('fixture', '//evil.test'),
    guestPaths('fixture', 'en')
  );
});
