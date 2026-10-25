import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  backupArrival,
  clearBackupDraft,
  DEFAULT_BACKUP_PREFERENCES,
  mayCompleteBackup,
  playlistBackupUrl,
  readBackupDraft,
  saveBackupDraft,
  writeBackupDraft,
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
    resume: 'entry',
  });
  clearBackupDraft();
  assert.equal(readBackupDraft(), null);
});

test('entry opens once and an auth return restores the selected playlist and plan', () => {
  browser();
  saveBackupDraft(url);
  assert.equal(backupArrival('').open, true);
  assert.equal(backupArrival('').open, false);
  writeBackupDraft({
    url,
    source: 'playlist',
    savedAt: Date.now(),
    preferences: {
      ...DEFAULT_BACKUP_PREFERENCES,
      planId: 'pro',
      frequency: 'weekly',
    },
  });
  const returned = backupArrival('?setup=auth');
  assert.equal(returned.open, true);
  assert.equal(returned.draft?.url, url);
  assert.equal(returned.draft?.preferences?.planId, 'pro');
  assert.equal(returned.draft?.preferences?.frequency, 'weekly');
  assert.equal(backupArrival('').open, false);
});

test('checkout return requires the same account and server entitlement before auto-creation', () => {
  browser();
  saveBackupDraft(url);
  assert.equal(
    mayCompleteBackup(backupArrival('?setup=success').draft, 'owner', 2),
    false
  );
  writeBackupDraft({
    url,
    source: 'playlist',
    savedAt: Date.now(),
    resume: 'checkout',
    checkout: { userId: 'owner', returned: false },
  });
  assert.equal(mayCompleteBackup(backupArrival('').draft, 'owner', 2), false);
  const paid = backupArrival('?setup=success');
  assert.equal(paid.open, true);
  assert.equal(mayCompleteBackup(paid.draft, 'owner', 0), false);
  assert.equal(mayCompleteBackup(paid.draft, 'other-account', 2), false);
  assert.equal(mayCompleteBackup(paid.draft, 'owner', 2), true);
  assert.equal(
    backupArrival('').open,
    true,
    'a refresh can finish an interrupted return'
  );
});

test('canceling checkout keeps settings and removes automatic creation consent', () => {
  browser();
  writeBackupDraft({
    url,
    source: 'playlist',
    savedAt: Date.now(),
    preferences: DEFAULT_BACKUP_PREFERENCES,
    resume: 'checkout',
    checkout: { userId: 'owner', returned: false },
  });
  const cancelled = backupArrival('?setup=cancel');
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.open, true);
  assert.deepEqual(cancelled.draft?.preferences, DEFAULT_BACKUP_PREFERENCES);
  assert.equal(cancelled.draft?.checkout, undefined);
  assert.equal(
    mayCompleteBackup(backupArrival('?setup=success').draft, 'owner', 2),
    false
  );
  assert.equal(backupArrival('').open, false);
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

test('private export handoff preserves its source through checkout and OAuth without public auto-creation', () => {
  browser();
  saveBackupDraft(url, 'private_playlist');
  const arrival = backupArrival('');
  assert.equal(arrival.open, true);
  assert.equal(arrival.draft?.source, 'private_playlist');
  assert.equal(arrival.draft?.url, url);
  assert.equal(backupArrival('').open, false);
  writeBackupDraft({
    ...arrival.draft!,
    resume: 'entry',
    checkout: { userId: 'owner', returned: false },
  });
  const paid = backupArrival('?setup=success');
  assert.equal(paid.draft?.source, 'private_playlist');
  assert.equal(mayCompleteBackup(paid.draft, 'owner', 2), false);
  writeBackupDraft({ ...paid.draft!, resume: 'entry', checkout: undefined });
  const connected = backupArrival('?youtube=connected');
  assert.equal(connected.open, true);
  assert.equal(connected.draft?.source, 'private_playlist');
  assert.equal(connected.draft?.url, url);
});
