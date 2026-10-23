import assert from 'node:assert/strict';
import { test } from 'node:test';

import { paymentAppUrl, sameCheckoutReturnUrls } from './payment-return-url';

test('local checkout keeps the current browser host and port despite stale configuration', () => {
  assert.equal(
    paymentAppUrl(
      'http://localhost:3002',
      'http://localhost:3000/api/payment/checkout',
      true
    ),
    'http://localhost:3000'
  );
  assert.equal(
    paymentAppUrl(
      'http://127.0.0.1:3000',
      'http://localhost:3000/api/payment/checkout',
      true
    ),
    'http://localhost:3000'
  );
  assert.equal(
    paymentAppUrl(
      'http://localhost:3002',
      'http://[::1]:3000/api/payment/checkout',
      true
    ),
    'http://[::1]:3000'
  );
});

test('request URLs cannot override production destinations or use lookalike loopback hosts', () => {
  assert.equal(
    paymentAppUrl('https://example.com', 'http://localhost:3000', true),
    'https://example.com'
  );
  assert.equal(
    paymentAppUrl('http://localhost:3002', 'http://localhost:3000', false),
    'http://localhost:3002'
  );
  for (const url of [
    'https://evil.test',
    'http://localhost.evil.test:3000',
    'http://localhost:3000@evil.test',
    'http://user@localhost:3000',
    'file:///tmp',
    'broken',
  ]) {
    assert.equal(
      paymentAppUrl('http://localhost:3002', url, true),
      'http://localhost:3002'
    );
  }
});

test('return URL matching ignores only generated order numbers', () => {
  const old = {
    success_url:
      'http://localhost:3002/api/payment/callback?order_no=one&redirect=%2Fyoutube-playlist-backup',
    cancel_url: 'http://localhost:3002/youtube-playlist-backup?setup=cancel',
  };
  assert.equal(
    sameCheckoutReturnUrls(old, {
      successUrl: old.success_url.replace('one', 'two'),
      cancelUrl: old.cancel_url,
    }),
    true
  );
  for (const patch of [
    { successUrl: old.success_url.replace(':3002', ':3000') },
    { cancelUrl: old.cancel_url.replace(':3002', ':3000') },
    {
      successUrl: old.success_url.replace(
        'youtube-playlist-backup',
        'settings'
      ),
    },
  ])
    assert.equal(
      sameCheckoutReturnUrls(old, {
        successUrl: old.success_url,
        cancelUrl: old.cancel_url,
        ...patch,
      }),
      false
    );
});
