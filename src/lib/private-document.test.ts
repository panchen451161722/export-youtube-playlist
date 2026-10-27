import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  crossesPrivacyBoundary,
  documentPrivacyMode,
  isBackupSelectionLocation,
  isPrivateDocumentPath,
  mayLoadThirdPartyScripts,
  privateDocumentHeaders,
} from './private-document';

test('private documents and authenticated public responses block edge-injected analytics and caching', () => {
  for (const request of [
    new Request('https://example.test/zh/settings/profile'),
    new Request('https://example.test/', {
      headers: { cookie: '__Secure-better-auth.session_token=opaque' },
    }),
  ]) {
    const headers = privateDocumentHeaders(request);
    assert.equal(headers['Cache-Control'], 'private, no-store');
    assert.equal(headers['Referrer-Policy'], 'same-origin');
    assert.match(
      headers['Content-Security-Policy'],
      /https:\/\/challenges.cloudflare.com/
    );
    assert.doesNotMatch(
      headers['Content-Security-Policy'],
      /clarity|cloudflareinsights|googlesyndication|google-analytics/
    );
  }
  assert.deepEqual(
    privateDocumentHeaders(new Request('https://example.test/privacy-policy')),
    {}
  );
});

test('only anonymous bare backup selection documents permit Clarity, not other trackers', () => {
  for (const path of [
    '/youtube-playlist-backup',
    '/zh/youtube-playlist-backup/',
    '/de/youtube-playlist-backup',
  ]) {
    assert.equal(isBackupSelectionLocation(path), true);
    assert.equal(documentPrivacyMode(path), 'backup-selection');
    const headers = privateDocumentHeaders(
      new Request(`https://example.test${path}`)
    );
    assert.equal(headers['Cache-Control'], 'private, no-store');
    assert.match(
      headers['Content-Security-Policy'],
      /https:\/\/\*\.clarity\.ms/
    );
    assert.doesNotMatch(
      headers['Content-Security-Policy'],
      /googlesyndication|google-analytics|cloudflareinsights/
    );
    // Other optional scripts remain disabled on this private-capable route.
    assert.equal(
      mayLoadThirdPartyScripts(isPrivateDocumentPath(path), '', false),
      false
    );
    for (const cookie of [
      'better-auth.session_token=expired',
      '__Secure-better-auth.session_token=opaque',
    ]) {
      const authenticated = privateDocumentHeaders(
        new Request(`https://example.test${path}`, { headers: { cookie } })
      );
      assert.doesNotMatch(
        authenticated['Content-Security-Policy'],
        /clarity|bing/
      );
      assert.equal(mayLoadThirdPartyScripts(false, cookie, false), false);
    }
  }
});

test('backup payment, auth, YouTube and unknown query parameters remain unrecorded', () => {
  const path = '/youtube-playlist-backup';
  for (const search of [
    '?guest=opaque',
    '?setup=success',
    '?setup=cancel',
    '?setup=auth',
    '?youtube=connected',
    '?code=secret',
    '?email=private@example.test',
    '?utm_source=unknown',
  ]) {
    assert.equal(isBackupSelectionLocation(path, search), false);
    assert.equal(documentPrivacyMode(path, search), 'private');
    const headers = privateDocumentHeaders(
      new Request(`https://example.test${path}${search}`)
    );
    assert.doesNotMatch(headers['Content-Security-Policy'], /clarity|bing/);
    assert.equal(crossesPrivacyBoundary(path, path, '', search), true);
    assert.equal(crossesPrivacyBoundary(path, path, search, ''), true);
  }
  assert.equal(crossesPrivacyBoundary('/', path), true);
  assert.equal(crossesPrivacyBoundary(path, '/'), true);
  assert.equal(crossesPrivacyBoundary(path, '/sign-in'), true);
  assert.equal(crossesPrivacyBoundary(path, '/settings/collections'), true);
  assert.equal(
    crossesPrivacyBoundary(path, '/zh/youtube-playlist-backup'),
    false
  );
  for (const ambiguous of [
    '//youtube-playlist-backup',
    '/zh//youtube-playlist-backup',
    '/%79outube-playlist-backup',
    '/youtube-playlist-backup/collections',
  ]) {
    assert.equal(isBackupSelectionLocation(ambiguous), false);
    assert.equal(documentPrivacyMode(ambiguous), 'private');
  }
});

test('signed-in export pages permit SQLite WASM without enabling JavaScript eval or trackers', () => {
  for (const path of [
    '/',
    '/zh',
    '/tools/export-youtube-playlist-to-excel',
    '/zh/tools/export-youtube-channel',
  ]) {
    const headers = privateDocumentHeaders(
      new Request(`https://example.test${path}`, {
        headers: { cookie: '__Secure-better-auth.session_token=opaque' },
      })
    );
    const directives = headers['Content-Security-Policy'].split('; ');
    const scripts = directives
      .find((directive) => directive.startsWith('script-src '))!
      .split(' ');
    assert.ok(scripts.includes("'wasm-unsafe-eval'"), path);
    assert.ok(!scripts.includes("'unsafe-eval'"), path);
    assert.deepEqual(
      scripts.filter((source) => source.startsWith('https:')),
      ['https://challenges.cloudflare.com', 'https://accounts.google.com']
    );
    assert.ok(
      directives.includes(
        "connect-src 'self' https://challenges.cloudflare.com https://accounts.google.com"
      )
    );
    assert.equal(headers['Cache-Control'], 'private, no-store');
  }
});

test('private routes and locale variants cannot load optional third-party scripts', () => {
  for (const path of [
    '/settings/collections',
    '/zh/settings/profile',
    '/de/settings/profile',
    '/de/sign-in',
    '/admin',
    '/dev/guest-trial',
    '/zh/dev/guest-trial',
    '/youtube-playlist-backup',
    '/zh/youtube-playlist-backup/',
    '/sign-in',
    '/SIGN-IN',
    '/ZH/Settings/Profile',
    '/%53ign-In',
    '/redeem-invite',
    '//sign-in',
    '///sign-in',
    '//settings/profile',
    '/zh//x/sign-in',
    '/zh//x/settings/profile',
    '/zh/reset-password',
    '/api/auth/callback/google',
    '/%zz',
  ]) {
    assert.equal(isPrivateDocumentPath(path), true, path);
    assert.equal(mayLoadThirdPartyScripts(true, '', false), false);
  }
  for (const path of [
    '/',
    '/zh',
    '/pricing',
    '/tools/export-youtube-playlist-to-csv',
  ]) {
    assert.equal(isPrivateDocumentPath(path), false, path);
  }
});

test('entering or leaving a private surface replaces the document before rendering', () => {
  assert.equal(crossesPrivacyBoundary('/', '/settings/collections'), true);
  assert.equal(
    crossesPrivacyBoundary('/zh/pricing', '/zh/youtube-playlist-backup'),
    true
  );
  assert.equal(crossesPrivacyBoundary('/settings/profile', '/'), true);
  assert.equal(
    crossesPrivacyBoundary('/settings/collections', '/settings/profile'),
    false
  );
});

test('authenticated public pages and failed session lookups remain tracker-free', () => {
  assert.equal(
    mayLoadThirdPartyScripts(
      false,
      '__Secure-better-auth.session_token=opaque',
      false
    ),
    false
  );
  assert.equal(
    mayLoadThirdPartyScripts(
      false,
      'theme=dark; better-auth.session_token=expired',
      false
    ),
    false
  );
  assert.equal(mayLoadThirdPartyScripts(false, '', true), false);
  assert.equal(mayLoadThirdPartyScripts(false, '', false), true);
});
