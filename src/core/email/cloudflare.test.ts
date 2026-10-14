import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CloudflareEmailProvider } from './cloudflare';
import { previewMailUrl } from './preview';

test('Cloudflare sends base64 attachments to all recipients and rejects permanent bounces', async () => {
  const original = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  try {
    globalThis.fetch = async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return Response.json({
        success: true,
        result: {
          delivered: ['test@example.invalid'],
          queued: [],
          permanent_bounces: [],
        },
      });
    };
    const provider = new CloudflareEmailProvider({
      apiToken: 'test-only',
      accountId: 'test-only',
      defaultFrom: 'test@example.invalid',
    });
    const sent = await provider.sendEmail({
      to: ['a@example.invalid', 'b@example.invalid'],
      subject: 'Test',
      text: 'Test',
      attachments: [
        {
          filename: 'backup.json',
          content: Buffer.from('{"ok":true}'),
          contentType: 'application/json',
        },
      ],
    });
    assert.equal(sent.success, true);
    assert.deepEqual(requests[0].to, [
      'a@example.invalid',
      'b@example.invalid',
    ]);
    assert.deepEqual(requests[0].attachments, [
      {
        filename: 'backup.json',
        content: Buffer.from('{"ok":true}').toString('base64'),
        type: 'application/json',
        disposition: 'attachment',
      },
    ]);
    globalThis.fetch = async () =>
      Response.json({
        success: true,
        result: {
          delivered: [],
          queued: [],
          permanent_bounces: ['test@example.invalid'],
        },
      });
    assert.equal(
      (
        await provider.sendEmail({
          to: 'test@example.invalid',
          subject: 'Test',
          text: 'Test',
        })
      ).success,
      false
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('mail catcher is restricted to explicit loopback URLs and unavailable with D1', () => {
  const original = process.env.PLAYLIST_GUARD_MAIL_PREVIEW_URL;
  const db = process.env.DATABASE_PROVIDER;
  try {
    process.env.DATABASE_PROVIDER = 'sqlite';
    process.env.PLAYLIST_GUARD_MAIL_PREVIEW_URL =
      'https://attacker.example/mail';
    assert.equal(previewMailUrl(), null);
    process.env.PLAYLIST_GUARD_MAIL_PREVIEW_URL = 'http://127.0.0.1:3103/mail';
    assert.equal(previewMailUrl(), 'http://127.0.0.1:3103/mail');
    process.env.DATABASE_PROVIDER = 'd1';
    assert.equal(previewMailUrl(), null);
  } finally {
    if (original === undefined)
      delete process.env.PLAYLIST_GUARD_MAIL_PREVIEW_URL;
    else process.env.PLAYLIST_GUARD_MAIL_PREVIEW_URL = original;
    if (db === undefined) delete process.env.DATABASE_PROVIDER;
    else process.env.DATABASE_PROVIDER = db;
  }
});

test('Resend retries use a stable provider idempotency key and encode the snapshot attachment', async () => {
  const { ResendProvider } = await import('./resend');
  const original = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async (_url, init) => {
      calls++;
      assert.equal(
        new Headers(init?.headers).get('idempotency-key'),
        'playlist-guard/test-snapshot'
      );
      const body = JSON.parse(String(init?.body));
      assert.equal(
        body.attachments[0].content,
        Buffer.from('backup').toString('base64')
      );
      return Response.json({ id: 'provider-receipt' });
    };
    const provider = new ResendProvider({
      apiKey: 'test-only',
      defaultFrom: 'test@example.invalid',
    });
    const email = {
      to: 'test@example.invalid',
      subject: 'Test',
      text: 'Test',
      idempotencyKey: 'playlist-guard/test-snapshot',
      attachments: [
        { filename: 'backup.json', content: Buffer.from('backup') },
      ],
    };
    assert.equal((await provider.sendEmail(email)).success, true);
    assert.equal((await provider.sendEmail(email)).success, true);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
