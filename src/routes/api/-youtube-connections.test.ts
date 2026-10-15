import assert from 'node:assert/strict';
import { test } from 'node:test';

import { YoutubeAccountError } from '@/lib/youtube-connections/google';

import {
  readConnectionBody,
  readStateCookie,
  stateCookie,
  youtubeCallbackFailure,
} from './-youtube-connections';

test('connection bodies are bounded without Content-Length, and OAuth cookies are callback-only', async () => {
  const request = (body: string) =>
    new Request('https://example.invalid/api/youtube-connections', {
      method: 'POST',
      body,
    });
  assert.deepEqual(await readConnectionBody(request('{"action":"connect"}')), {
    action: 'connect',
  });
  await assert.rejects(readConnectionBody(request('x'.repeat(2049))));
  await assert.rejects(readConnectionBody(request('{broken')));
  const cookie = stateCookie('sealed:fixture/value', true);
  assert.ok(
    cookie.includes(
      'HttpOnly; SameSite=Lax; Path=/api/youtube-connections/callback;'
    )
  );
  assert.ok(cookie.endsWith('; Secure'));
  assert.equal(
    readStateCookie(
      new Request('https://example.invalid', { headers: { cookie } })
    ),
    'sealed:fixture/value'
  );
  assert.ok(stateCookie('', true).includes('Max-Age=0'));
});

test('callback reports allowlisted failures without exposing upstream text or false success', () => {
  assert.equal(
    youtubeCallbackFailure(
      new YoutubeAccountError('channel_missing', 'private upstream text')
    ),
    'channel_missing'
  );
  assert.equal(
    youtubeCallbackFailure(
      new YoutubeAccountError('access_token=secret', 'secret')
    ),
    'failed'
  );
  assert.equal(
    youtubeCallbackFailure(new YoutubeAccountError('connected', 'secret')),
    'failed'
  );
  assert.equal(
    youtubeCallbackFailure(new Error('database connection secret')),
    'failed'
  );
});
