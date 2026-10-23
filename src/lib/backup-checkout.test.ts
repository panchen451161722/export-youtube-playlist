import assert from 'node:assert/strict';
import { test } from 'node:test';

import { backupCheckoutPaths } from './backup-checkout';

test('backup checkout preserves locale and only returns to fixed setup URLs', () => {
  assert.deepEqual(backupCheckoutPaths('backup', 'en'), {
    success: '/youtube-playlist-backup?setup=success',
    cancel: '/youtube-playlist-backup?setup=cancel',
  });
  assert.deepEqual(backupCheckoutPaths('backup', 'zh'), {
    success: '/zh/youtube-playlist-backup?setup=success',
    cancel: '/zh/youtube-playlist-backup?setup=cancel',
  });
  assert.deepEqual(
    backupCheckoutPaths('backup', '//evil.test'),
    backupCheckoutPaths('backup', 'en')
  );
  for (const flow of [undefined, 'pricing', '//evil.test'])
    assert.equal(backupCheckoutPaths(flow, 'en'), null);
});
