import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { clarityBootstrap } from './clarity-bootstrap';

function run(
  options: {
    consent?: string;
    gpc?: boolean;
    dnt?: string;
    storageThrows?: boolean;
  } = {}
) {
  const calls: unknown[][] = [];
  const scripts: Array<{ src?: string; async?: number }> = [];
  const window = {
    navigator: { globalPrivacyControl: options.gpc, doNotTrack: options.dnt },
    localStorage: {
      getItem(key: string) {
        assert.equal(key, 'clarity_consent');
        if (options.storageThrows) throw new Error('Storage blocked');
        return options.consent ?? null;
      },
      removeItem() {
        assert.fail('Do not erase existing privacy preferences');
      },
    },
    clarity: (...args: unknown[]) => calls.push(args),
  };
  const document = {
    createElement: () => ({}),
    getElementsByTagName: () => [
      {
        parentNode: { insertBefore: (script: object) => scripts.push(script) },
      },
    ],
  };
  runInNewContext(clarityBootstrap('xuh8j6w18z')!, { window, document });
  return { calls, scripts };
}

test('ordinary visits keep vendor regional defaults rather than fabricating consent', () => {
  for (const options of [{}, { consent: 'granted' }, { storageThrows: true }]) {
    const { calls, scripts } = run(options);
    assert.deepEqual(calls, []);
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].src, 'https://www.clarity.ms/tag/xuh8j6w18z');
  }
});

test('existing refusals, GPC and DNT are respected before the tag loads', () => {
  for (const options of [{ consent: 'denied' }, { gpc: true }, { dnt: '1' }]) {
    const { calls } = run(options);
    assert.equal(
      JSON.stringify(calls),
      JSON.stringify([
        ['consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' }],
      ])
    );
  }
});

test('project IDs cannot inject executable script', () => {
  for (const id of ['', '</script><script>alert(1)</script>', 'x";alert(1)'])
    assert.equal(clarityBootstrap(id), null);
  assert.ok(clarityBootstrap(' xuh8j6w18z '));
});
