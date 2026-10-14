import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GuardError } from '@/modules/playlist-guard/service';
import type { GuardCreateInput } from '@/lib/playlist-guard/types';

import {
  jobConfiguration,
  normalizeGuardSource,
  readGuardAction,
} from './-playlist-guard';

const url = 'https://example.invalid/api/playlist-guard';
const request = (
  body: string,
  origin = 'https://example.invalid',
  contentType = 'application/json'
) =>
  new Request(url, {
    method: 'POST',
    headers: { origin, 'content-type': contentType },
    body,
  });
const code = (expected: string) => (error: unknown) =>
  error instanceof GuardError && error.code === expected;

test('JSON mutation rejects cross-origin, missing-origin, non-JSON and oversized streamed bodies', async () => {
  const valid = JSON.stringify({ action: 'start_trial' });
  assert.deepEqual(await readGuardAction(request(valid)), {
    action: 'start_trial',
  });
  await assert.rejects(
    readGuardAction(request(valid, 'https://attacker.invalid')),
    code('invalid_origin')
  );
  await assert.rejects(
    readGuardAction(request(valid, '')),
    code('invalid_origin')
  );
  await assert.rejects(
    readGuardAction(request(valid, 'https://example.invalid', 'text/plain')),
    code('invalid_content_type')
  );
  await assert.rejects(
    readGuardAction(request('x'.repeat(9000))),
    code('invalid_body')
  );
  await assert.rejects(
    readGuardAction(
      request(
        JSON.stringify({ action: 'update', id: 'a', userId: 'another-user' })
      )
    ),
    code('invalid_input')
  );
});

test('source normalization accepts public YouTube sources without ever fetching supplied URLs', () => {
  const base: GuardCreateInput = {
    name: 'Watchlist',
    url: 'https://www.youtube.com/watch?v=abcdefghijk&list=PL1234567890',
    source: 'playlist',
    frequency: 'weekly',
    notifyMissing: true,
    notifyAdded: false,
    emailDelivery: false,
  };
  assert.equal(
    normalizeGuardSource(base).input.url,
    'https://www.youtube.com/playlist?list=PL1234567890'
  );
  assert.throws(
    () =>
      normalizeGuardSource({
        ...base,
        url: 'http://127.0.0.1/?list=PL1234567890',
      }),
    code('invalid_source')
  );
  assert.equal(
    normalizeGuardSource({
      ...base,
      source: 'channel',
      url: 'https://www.youtube.com/@example',
    }).key,
    'channel:handle:example'
  );
  assert.throws(
    () =>
      normalizeGuardSource({
        ...base,
        source: 'channel',
        url: 'https://www.youtube.com/watch?v=abcdefghijk',
      }),
    code('invalid_source')
  );
});

test('scheduler capability requires explicit enablement and a strong configured token', () => {
  const originalSecret = process.env.PLAYLIST_GUARD_JOB_SECRET;
  const originalEnabled = process.env.PLAYLIST_GUARD_SCHEDULER_ENABLED;
  try {
    delete process.env.PLAYLIST_GUARD_JOB_SECRET;
    delete process.env.PLAYLIST_GUARD_SCHEDULER_ENABLED;
    assert.equal(jobConfiguration().enabled, false);
    process.env.PLAYLIST_GUARD_SCHEDULER_ENABLED = 'true';
    process.env.PLAYLIST_GUARD_JOB_SECRET = 'too-short';
    assert.equal(jobConfiguration().enabled, false);
    process.env.PLAYLIST_GUARD_JOB_SECRET =
      'unit-test-only-placeholder-not-a-real-secret';
    assert.equal(jobConfiguration().enabled, true);
    process.env.PLAYLIST_GUARD_SCHEDULER_ENABLED = 'false';
    assert.equal(jobConfiguration().enabled, false);
  } finally {
    if (originalSecret === undefined)
      delete process.env.PLAYLIST_GUARD_JOB_SECRET;
    else process.env.PLAYLIST_GUARD_JOB_SECRET = originalSecret;
    if (originalEnabled === undefined)
      delete process.env.PLAYLIST_GUARD_SCHEDULER_ENABLED;
    else process.env.PLAYLIST_GUARD_SCHEDULER_ENABLED = originalEnabled;
  }
});

test('collection update accepts a bounded name and keeps the source immutable', async () => {
  assert.deepEqual(
    await readGuardAction(
      request(
        JSON.stringify({ action: 'update', id: 'saved', name: ' New name ' })
      )
    ),
    { action: 'update', id: 'saved', name: 'New name' }
  );
  for (const patch of [
    { name: '' },
    { name: 'x'.repeat(101) },
    { url: 'https://youtube.com/playlist?list=another' },
  ])
    await assert.rejects(
      readGuardAction(
        request(JSON.stringify({ action: 'update', id: 'saved', ...patch }))
      ),
      code('invalid_input')
    );
});

test('collection preferences accept hourly change alerts and reject unsupported frequencies', async () => {
  const action = {
    action: 'update',
    id: 'saved',
    frequency: 'hourly',
    emailDelivery: false,
    notifyAdded: true,
    notifyMissing: true,
  };
  assert.deepEqual(
    await readGuardAction(request(JSON.stringify(action))),
    action
  );
  await assert.rejects(
    readGuardAction(
      request(JSON.stringify({ ...action, frequency: 'minutely' }))
    ),
    code('invalid_input')
  );
});
