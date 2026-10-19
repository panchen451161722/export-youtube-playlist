import assert from 'node:assert/strict';
import { test } from 'node:test';

import { revokeGoogleToken, YoutubeAccountError } from './google';

test('revocation sends the token in the POST body and treats only invalid_token as already revoked', async () => {
  await revokeGoogleToken('fixture-revoke-token', (async (input, init) => {
    assert.equal(String(input), 'https://oauth2.googleapis.com/revoke');
    assert.equal(init?.method, 'POST');
    assert.equal(
      new URLSearchParams(String(init?.body)).get('token'),
      'fixture-revoke-token'
    );
    assert.equal(
      new Headers(init?.headers).get('content-type'),
      'application/x-www-form-urlencoded'
    );
    assert.ok(init?.signal);
    return Response.json({ error: 'invalid_token' }, { status: 400 });
  }) as typeof fetch);
  for (const response of [
    Response.json(
      { error: 'invalid_request', diagnostic: 'sensitive-token' },
      { status: 400 }
    ),
    Response.json({ error: 'server_error' }, { status: 503 }),
    new Response('not-json', { status: 502 }),
  ]) {
    await assert.rejects(
      revokeGoogleToken('fixture', (async () => response) as typeof fetch),
      (error: unknown) =>
        error instanceof YoutubeAccountError &&
        error.code === 'revocation_pending' &&
        !error.message.includes('sensitive')
    );
  }
});
