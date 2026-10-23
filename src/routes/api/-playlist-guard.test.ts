import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GuardError } from '@/modules/playlist-guard/service';
import {
  getPlaylistBackup,
  PlaylistServiceError,
} from '@/modules/youtube-playlist/service';
import {
  getChannelToolData,
  YouTubePublicError,
} from '@/modules/youtube-public/service';
import type { GuardCreateInput } from '@/lib/playlist-guard/types';

import {
  assertGuardBackupEmailReady,
  jobConfiguration,
  normalizeGuardSource,
  readGuardAction,
  scanGuardPublicSource,
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
  const valid = JSON.stringify({ action: 'sync', id: 'a' });
  assert.deepEqual(await readGuardAction(request(valid)), {
    action: 'sync',
    id: 'a',
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

test('collection preferences accept daily change alerts and reject unsupported frequencies', async () => {
  const action = {
    action: 'update',
    id: 'saved',
    frequency: 'daily',
    emailDelivery: false,
    notifyAdded: true,
    notifyMissing: true,
  };
  assert.deepEqual(
    await readGuardAction(request(JSON.stringify(action))),
    action
  );
  for (const frequency of ['hourly', 'minutely']) {
    await assert.rejects(
      readGuardAction(request(JSON.stringify({ ...action, frequency }))),
      code('invalid_input')
    );
    await assert.rejects(
      readGuardAction(
        request(
          JSON.stringify({
            action: 'create',
            name: 'test',
            source: 'playlist',
            url: 'https://youtube.com/playlist?list=PL1234567890',
            frequency,
            notifyAdded: true,
            notifyMissing: true,
            emailDelivery: false,
          })
        )
      ),
      code('invalid_input')
    );
  }
});

test('account sources normalize by connection and reject missing owners or unsafe private URLs', () => {
  const base: GuardCreateInput = {
    name: 'Private',
    source: 'private_playlist',
    url: 'https://youtube.com/playlist?list=PL1234567890',
    connectionId: 'alice-channel',
    frequency: 'daily',
    notifyAdded: true,
    notifyMissing: true,
    emailDelivery: false,
  };
  assert.equal(
    normalizeGuardSource(base).key,
    'private_playlist:alice-channel:PL1234567890'
  );
  assert.notEqual(
    normalizeGuardSource(base).key,
    normalizeGuardSource({ ...base, connectionId: 'other-channel' }).key
  );
  assert.throws(
    () => normalizeGuardSource({ ...base, connectionId: undefined }),
    code('invalid_source')
  );
  assert.throws(
    () =>
      normalizeGuardSource({
        ...base,
        url: 'https://attacker.invalid/?list=PL1234567890',
      }),
    code('invalid_source')
  );
  for (const source of [
    'liked_videos',
    'liked_music',
    'subscriptions',
  ] as const) {
    const result = normalizeGuardSource({ ...base, source, url: '' });
    assert.equal(result.key, `${source}:alice-channel`);
    assert.ok(result.input.url.startsWith('https://www.youtube.com/'));
  }
});

test('change-alert preferences can be saved before mail setup, while routine backup delivery stays gated', () => {
  const action = {
    action: 'create' as const,
    name: 'Alerts',
    source: 'playlist' as const,
    url: 'https://youtube.com/playlist?list=PL1234567890',
    frequency: 'daily' as const,
    notifyAdded: true,
    notifyMissing: true,
    emailDelivery: false,
  };
  assert.doesNotThrow(() => assertGuardBackupEmailReady(action, false, false));
  assert.doesNotThrow(() =>
    assertGuardBackupEmailReady(
      { action: 'update', id: 'saved', notifyAdded: true, notifyMissing: true },
      false,
      false
    )
  );
  assert.throws(
    () =>
      assertGuardBackupEmailReady(
        { ...action, emailDelivery: true },
        false,
        true
      ),
    code('email_unconfigured')
  );
  assert.throws(
    () =>
      assertGuardBackupEmailReady(
        { ...action, emailDelivery: true },
        true,
        false
      ),
    code('email_unverified')
  );
  assert.doesNotThrow(() =>
    assertGuardBackupEmailReady({ ...action, emailDelivery: true }, true, true)
  );
});

test('restored preference defaults on for new collections and supports explicit opt-out', async () => {
  const action = {
    action: 'create',
    name: 'Restored',
    source: 'playlist',
    url: 'https://youtube.com/playlist?list=PL1234567890',
    frequency: 'daily',
    notifyAdded: true,
    notifyMissing: true,
    emailDelivery: false,
  };
  assert.equal(
    (
      (await readGuardAction(
        request(JSON.stringify(action))
      )) as GuardCreateInput
    ).notifyRestored,
    true
  );
  assert.equal(
    (
      (await readGuardAction(
        request(JSON.stringify({ ...action, notifyRestored: false }))
      )) as GuardCreateInput
    ).notifyRestored,
    false
  );
  for (const notifyRestored of [true, false]) {
    const update = { action: 'update', id: 'saved', notifyRestored };
    assert.deepEqual(
      await readGuardAction(request(JSON.stringify(update))),
      update
    );
  }
  await assert.rejects(
    readGuardAction(
      request(JSON.stringify({ ...action, notifyRestored: 'true' }))
    ),
    code('invalid_input')
  );
});

test('channel tab URLs preserve the channel identity rather than the tab name', () => {
  for (const tab of ['playlists', 'videos', 'shorts']) {
    const result = normalizeGuardSource({
      name: 'Channel',
      source: 'channel',
      url: `https://www.youtube.com/@chaijing2023/${tab}`,
      frequency: 'daily',
      notifyAdded: true,
      notifyMissing: true,
      emailDelivery: false,
    });
    assert.equal(result.input.url, 'https://www.youtube.com/@chaijing2023');
    assert.equal(result.key, 'channel:handle:chaijing2023');
  }
});

test('public scans preserve safe network and API errors so failed collections can explain the cause', async () => {
  for (const error of [
    new YouTubePublicError('network'),
    new YouTubePublicError('quota'),
    new YouTubePublicError('configuration'),
  ]) {
    await assert.rejects(
      scanGuardPublicSource(
        { source: 'channel', url: 'https://www.youtube.com/@example' },
        'test-key',
        {
          getChannelToolData: async () => {
            throw error;
          },
          getPlaylistBackup,
        }
      ),
      (caught: unknown) =>
        caught instanceof GuardError &&
        caught.code === `youtube_${error.code}` &&
        caught.status === error.status &&
        !caught.message.includes('test-key') &&
        !caught.message.includes('_failed:')
    );
  }
  await assert.rejects(
    scanGuardPublicSource(
      {
        source: 'playlist',
        url: 'https://www.youtube.com/playlist?list=PL1234567890',
      },
      'test-key',
      {
        getChannelToolData,
        getPlaylistBackup: async () => {
          throw new PlaylistServiceError('private_or_not_found');
        },
      }
    ),
    code('youtube_private_or_not_found')
  );
});

test('channel scans carry the actual YouTube title and use its uploads playlist', async () => {
  const result = await scanGuardPublicSource(
    { source: 'channel', url: 'https://www.youtube.com/@example' },
    'test-key',
    {
      getChannelToolData: async ({ input }) => {
        assert.equal(input, 'https://www.youtube.com/@example');
        return {
          title: 'Actual channel title',
          uploadsPlaylistUrl:
            'https://www.youtube.com/playlist?list=UU1234567890',
        };
      },
      getPlaylistBackup: async ({ playlistUrl }) => {
        assert.equal(
          playlistUrl,
          'https://www.youtube.com/playlist?list=UU1234567890'
        );
        return { videos: [], truncated: false, scannedCount: 0, totalItems: 0 };
      },
    }
  );
  assert.equal(result.sourceTitle, 'Actual channel title');
  assert.equal(result.complete, true);
});

test('removed no-card trial endpoint cannot grant access', async () => {
  await assert.rejects(
    readGuardAction(request(JSON.stringify({ action: 'start_trial' }))),
    code('invalid_input')
  );
});
