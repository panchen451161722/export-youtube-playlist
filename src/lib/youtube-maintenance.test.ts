import assert from 'node:assert/strict';
import test from 'node:test';

import { runPrivacyMaintenance } from './youtube-maintenance';

test('provider failure cannot prevent revocation or retention cleanup, and errors are redacted', async () => {
  const calls: string[] = [];
  const result = await runPrivacyMaintenance({
    validate: async () => {
      calls.push('validate');
      throw new Error('private-token');
    },
    revoke: async () => {
      calls.push('revoke');
      return { revoked: 1 };
    },
    cleanup: async () => {
      calls.push('cleanup');
      return { cleaned: 2 };
    },
  });
  assert.deepEqual(calls, ['validate', 'revoke', 'cleanup']);
  assert.deepEqual(result.failed, ['validate']);
  assert.equal(JSON.stringify(result).includes('private-token'), false);
  assert.deepEqual(result.results.cleanup, { cleaned: 2 });
});

test('all failed stages are reported after each has had a chance to run', async () => {
  const fail = async () => {
    throw new Error('failure');
  };
  assert.deepEqual(
    (
      await runPrivacyMaintenance({
        validate: fail,
        revoke: fail,
        cleanup: fail,
      })
    ).failed,
    ['validate', 'revoke', 'cleanup']
  );
});
