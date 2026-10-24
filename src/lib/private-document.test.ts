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
