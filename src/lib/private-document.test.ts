import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  crossesPrivacyBoundary,
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

test('private routes and locale variants cannot load optional third-party scripts', () => {
  for (const path of [
    '/settings/collections',
    '/zh/settings/profile',
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
