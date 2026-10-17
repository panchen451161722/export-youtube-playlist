import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getAuthRedirect,
  getSafeCallbackUrl,
  getSignInHref,
} from './auth-redirect';

test('login returns to the originating page with its query and anchor intact', () => {
  for (const original of [
    '/#exporter',
    '/tools/export-youtube-playlist-to-csv?list=PL123#results',
    '/pricing?plan=annual#plans',
    '/settings/collections?page=2#videos',
    '/zh/tools/youtube-playlist-analyzer?tab=videos#results',
  ]) {
    const signIn = new URL(getSignInHref(original), 'https://example.com');
    assert.equal(signIn.pathname, '/sign-in');
    assert.equal(getAuthRedirect(signIn.search).afterLoginUrl, original);
  }
});

test('switching between login and signup keeps the destination', () => {
  const original = '/youtube-playlist-backup?tour=1#collections';
  const signIn = new URL(getSignInHref(original), 'https://example.com');
  const first = getAuthRedirect(signIn.search);
  const second = getAuthRedirect(first.switchQuery);
  assert.equal(second.afterLoginUrl, original);
  assert.equal(getAuthRedirect(second.switchQuery).afterLoginUrl, original);
});

test('email verification preserves encoded URLs and percent signs', () => {
  const original =
    '/tools/youtube-playlist-analyzer?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc%26list%3DPL123&q=100%25#results';
  const login = getAuthRedirect(
    new URLSearchParams({ callbackUrl: original }).toString()
  );
  const verification = new URLSearchParams({
    callbackUrl: login.afterLoginUrl,
  });
  assert.equal(getSafeCallbackUrl(verification.get('callbackUrl')), original);
});

test('direct login without a destination returns home instead of profile', () => {
  assert.equal(getAuthRedirect('').afterLoginUrl, '/');
});

test('external destinations and auth-page loops fall back to home', () => {
  for (const callbackUrl of [
    'https://example.com',
    '//example.com',
    '/\\example.com',
    '/\n/example.com',
    'javascript:alert(1)',
    '/sign-in',
    '/sign-up?callbackUrl=%2Fsign-in',
    '/verify-email#next',
    '/zh/sign-in',
    '/en/sign-up',
    '/tools/../sign-in',
    '/%73ign-in',
    '/forgot-password',
    '/reset-password?token=abc',
  ]) {
    assert.equal(getSafeCallbackUrl(callbackUrl), null, callbackUrl);
    assert.equal(
      getAuthRedirect(new URLSearchParams({ callbackUrl }).toString())
        .afterLoginUrl,
      '/',
      callbackUrl
    );
  }
});

test('existing client-protocol redirects survive auth-page switches', () => {
  const redirect = 'myapp://auth/complete';
  const destination = `/auth-callback?redirect=${encodeURIComponent(redirect)}`;
  const first = getAuthRedirect(new URLSearchParams({ redirect }).toString());
  assert.equal(first.afterLoginUrl, destination);
  assert.equal(getAuthRedirect(first.switchQuery).afterLoginUrl, destination);
});
