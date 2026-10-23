import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  clearBackupDraft,
  playlistBackupUrl,
  readBackupDraft,
  saveBackupDraft,
} from './backup-draft';

const url = 'https://www.youtube.com/playlist?list=PL1234567890';
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
afterEach(() => {
  if (originalWindow)
    Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

function browser() {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      sessionStorage: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
        removeItem: (key: string) => data.delete(key),
      },
    },
  });
  return data;
}

test('draft keeps only the canonical playlist URL, dropping other URL data', () => {
  browser();
  saveBackupDraft(
    'https://music.youtube.com/watch?v=secret&list=PL1234567890&utm_source=private#secret'
  );
  assert.deepEqual(readBackupDraft(), {
    url,
    source: 'playlist',
    savedAt: readBackupDraft()!.savedAt,
  });
  clearBackupDraft();
  assert.equal(readBackupDraft(), null);
});

test('draft rejects non-YouTube destinations and invalid playlist IDs', () => {
  for (const value of [
    'javascript:alert(1)',
    'https://evil.test/?list=PL1234567890',
    'https://youtube.com.evil.test/?list=PL1234567890',
    'https://youtube.com/?list=short',
  ]) {
    assert.equal(playlistBackupUrl(value), null);
  }
});

test('stale, future, and corrupted drafts do not populate the backup form', () => {
  const data = browser();
  for (const savedAt of [Date.now() - 3 * 3600000, Date.now() + 3600000]) {
    data.set('playlist-backup-draft', JSON.stringify({ url, savedAt }));
    assert.equal(readBackupDraft(), null);
  }
  data.set('playlist-backup-draft', 'broken');
  assert.equal(readBackupDraft(), null);
});

test('storage restrictions do not prevent visiting the backup page', () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      get sessionStorage() {
        throw new Error('storage blocked');
      },
    },
  });
  assert.doesNotThrow(() => saveBackupDraft(url));
  assert.equal(readBackupDraft(), null);
  assert.doesNotThrow(clearBackupDraft);
});
