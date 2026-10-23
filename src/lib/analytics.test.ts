import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { trackEvent } from './analytics';
import { analyticsProperties } from './analytics-events';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
afterEach(() => {
  if (originalWindow)
    Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

function browser(pathname = '/') {
  const calls: { event: string; options: unknown }[] = [];
  const win = {
    location: { pathname },
    plausible: (event: string, options: unknown) =>
      calls.push({ event, options }),
    clarity: (..._args: unknown[]) => {},
  };
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: win,
  });
  return { win, calls };
}

test('events only contain allowlisted categorical properties', () => {
  assert.deepEqual(
    analyticsProperties({
      tool: 'playlist_export',
      output_format: 'csv_xlsx',
      truncated: false,
      email: 'private@example.com',
      url: 'https://youtube.com/playlist?list=private',
      title: 'Private playlist',
      user_id: 'user123',
      error_type: 'Error: private@example.com',
      result_size: '1_10',
      media_type: 'all',
    }),
    {
      tool: 'playlist_export',
      output_format: 'csv_xlsx',
      truncated: false,
      result_size: '1_10',
      media_type: 'all',
    }
  );
});

test('public tool events reach Plausible without requiring Clarity', () => {
  const { win, calls } = browser('/tools/export-youtube-playlist-to-csv');
  Reflect.deleteProperty(win, 'clarity');
  trackEvent('export_downloaded', {
    tool: 'playlist_export',
    output_format: 'csv',
  });
  assert.deepEqual(calls, [
    {
      event: 'export_downloaded',
      options: {
        props: { tool: 'playlist_export', output_format: 'csv' },
        interactive: true,
      },
    },
  ]);
});

test('exposure and errors do not lower bounce rate; CTA clicks are interactive', () => {
  const { calls } = browser('/zh');
  trackEvent('backup_cta_viewed', { placement: 'export_success' });
  trackEvent('tool_run_failed', { error_type: 'invalid_url' });
  trackEvent('backup_cta_clicked', { placement: 'export_success' });
  assert.deepEqual(
    calls.map((call) => (call.options as { interactive: boolean }).interactive),
    [false, false, true]
  );
});

test('a throwing Clarity tracker does not suppress Plausible or break the action', () => {
  const { win, calls } = browser();
  win.clarity = () => {
    throw new Error('blocked');
  };
  assert.doesNotThrow(() =>
    trackEvent('tool_run_succeeded', { tool: 'playlist_export' })
  );
  assert.equal(calls.length, 1);
  win.plausible = () => {
    throw new Error('blocked');
  };
  assert.doesNotThrow(() => trackEvent('export_downloaded'));
});

test('private pages never emit tool or backup events even if a tracker exists', () => {
  for (const path of [
    '/settings/collections',
    '/zh/settings/billing',
    '/youtube-playlist-backup',
    '/sign-in',
  ]) {
    const { calls } = browser(path);
    trackEvent('backup_cta_clicked');
    assert.equal(calls.length, 0, path);
  }
});

test('SSR and missing trackers are safe; payment events are outside this scope', () => {
  Reflect.deleteProperty(globalThis, 'window');
  assert.doesNotThrow(() => trackEvent('tool_run_started'));
  const { win, calls } = browser();
  trackEvent('payment_succeeded' as never);
  assert.equal(calls.length, 0);
  Reflect.deleteProperty(win, 'plausible');
  assert.doesNotThrow(() => trackEvent('tool_run_started'));
});
