import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getLocaleFromAcceptLanguage,
  withLocaleNegotiation,
} from './locale-negotiation';
import { LOCALE_PREFERENCE_COOKIE } from './locale-preference';

function request(
  path: string,
  language = 'zh-CN,zh;q=0.9,en;q=0.8',
  cookie = ''
) {
  return new Request(`https://example.test${path}`, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': language,
      Cookie: cookie,
    },
  });
}
function page() {
  return Promise.resolve(
    new Response('page', { headers: { 'Content-Type': 'text/html' } })
  );
}

test('Accept-Language respects quality weights and regional preference order', () => {
  for (const [header, expected] of [
    ['en-US;q=0.5,zh-CN;q=0.9,de;q=0.7', 'zh'],
    ['zh;q=0,de-AT;q=0.8,en;q=0.7', 'de'],
    ['en-US,zh;q=0.9', 'en'],
    ['fr-FR,zh-Hant-TW;q=0.9,en;q=0.8', 'zh'],
    ['de-DE;q=0.8,zh;q=0.8', 'de'],
    [' ZH-cn ; q=1.000 , en;q=0.1 ', 'zh'],
  ])
    assert.equal(getLocaleFromAcceptLanguage(header), expected, header);
  for (const header of [
    '',
    '*',
    'fr-FR,ja',
    'de;q=0,zh;q=0.000',
    'de;q=2,zh;q=oops',
    'zh;q=0.9;extra=x',
    'zh<script>',
  ]) {
    assert.equal(getLocaleFromAcceptLanguage(header), undefined, header);
  }
});

test('public entry uses a temporary same-origin redirect before rendering, retaining query and fragment', async () => {
  const response = await withLocaleNegotiation(
    request(
      '/tools/export-youtube-playlist-to-csv?url=https%3A%2F%2Fexample.org%2Fa%3Fb%3D1#results'
    ),
    async () => {
      assert.fail('No page rendering should occur before a redirect');
    }
  );
  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get('location'),
    'https://example.test/zh/tools/export-youtube-playlist-to-csv?url=https%3A%2F%2Fexample.org%2Fa%3Fb%3D1#results'
  );
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(await response.text(), '');
  const german = await withLocaleNegotiation(
    request('/', 'de-DE,de;q=0.9'),
    page
  );
  assert.equal(german.headers.get('location'), 'https://example.test/de');
});

test('manual choices beat the browser, including an explicit English choice', async () => {
  const english = await withLocaleNegotiation(
    request('/', 'zh-CN', `${LOCALE_PREFERENCE_COOKIE}=en`),
    page
  );
  assert.equal(english.status, 200);
  assert.equal(english.headers.get('location'), null);
  const chinese = await withLocaleNegotiation(
    request('/pricing', 'en-US', `${LOCALE_PREFERENCE_COOKIE}=zh`),
    page
  );
  assert.equal(
    chinese.headers.get('location'),
    'https://example.test/zh/pricing'
  );
  const german = await withLocaleNegotiation(
    request('/', 'zh-CN', `${LOCALE_PREFERENCE_COOKIE}=de`),
    page
  );
  assert.equal(german.headers.get('location'), 'https://example.test/de');
});

test('Paraglide automatic cookies and malformed preferences cannot override the browser', async () => {
  for (const cookie of [
    'PARAGLIDE_LOCALE=en',
    `${LOCALE_PREFERENCE_COOKIE}=unknown`,
    `${LOCALE_PREFERENCE_COOKIE}=%E0%A4%A`,
  ]) {
    const response = await withLocaleNegotiation(
      request('/', 'zh-CN', cookie),
      page
    );
    assert.equal(response.headers.get('location'), 'https://example.test/zh');
  }
});

test('explicit language URLs are authoritative regardless of browser or saved preferences', async () => {
  for (const path of [
    '/zh',
    '/zh/',
    '/zh/tools/export-youtube-playlist-to-csv',
    '/de',
    '/de/about',
    '/%7Ah/about',
  ]) {
    const original = new Response('localized', {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=60',
      },
    });
    const response = await withLocaleNegotiation(
      request(path, 'en-US', `${LOCALE_PREFERENCE_COOKIE}=en`),
      () => Promise.resolve(original)
    );
    assert.equal(response, original, path);
    assert.equal(response.headers.get('location'), null);
  }
});

test('unavailable German content stays in English and cannot loop with the existing fallback', async () => {
  for (const cookie of ['', `${LOCALE_PREFERENCE_COOKIE}=de`]) {
    const response = await withLocaleNegotiation(
      request('/demo?tour=1', 'de-DE,zh;q=0.9,en;q=0.8', cookie),
      page
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
  }
});

test('missing, unsupported, and declined browser languages retain English', async () => {
  for (const language of [
    '',
    'fr-FR,ja;q=0.9',
    '*',
    'zh;q=0,de;q=0',
    'en-US,zh;q=0.8',
  ]) {
    const response = await withLocaleNegotiation(request('/', language), page);
    assert.equal(response.status, 200, language);
    assert.equal(response.headers.get('location'), null);
  }
});

test('auth, account, payment, API, assets, metadata and ambiguous paths never negotiate', async () => {
  for (const path of [
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/redeem-invite',
    '/settings/billing',
    '/admin',
    '/youtube-playlist-backup',
    '/claim-backup',
    '/auth-callback',
    '/api/payment/callback',
    '/api/youtube-connections/callback',
    '/api/auth/callback/google',
    '/_serverFn/abc',
    '/%5FserverFn/abc',
    '/dev/guest-trial',
    '/assets/app.js',
    '/imgs/logo',
    '/fonts/inter.woff2',
    '/samples/data.csv',
    '/sitemap.xml',
    '/robots.txt',
    '/llms.txt',
    '/llms-full.txt',
    '/favicon.ico',
    '/.well-known/test',
    '/%61pi/auth',
    '/%73ign-in',
    '/%E0%A4%A',
    '/%2Fexample.com',
    '/tools//example',
    '/tools/%5Cexample',
  ]) {
    const original = new Response('unchanged');
    assert.equal(
      await withLocaleNegotiation(request(path), () =>
        Promise.resolve(original)
      ),
      original,
      path
    );
  }
});

test('only document GET and HEAD requests redirect; mutations and background requests are preserved', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const original = new Response('unchanged');
    const req = new Request(request('/pricing'), { method });
    assert.equal(
      await withLocaleNegotiation(req, () => Promise.resolve(original)),
      original
    );
  }
  const head = await withLocaleNegotiation(
    new Request(request('/pricing'), { method: 'HEAD' }),
    page
  );
  assert.equal(head.status, 302);
  const headerCases: Record<string, string>[] = [
    { Accept: 'application/json', 'Accept-Language': 'zh' },
    { Accept: '*/*', 'Accept-Language': 'zh' },
    { Accept: 'text/html;q=0', 'Accept-Language': 'zh' },
    { Accept: 'text/html', 'Accept-Language': 'zh', 'Sec-Fetch-Dest': 'empty' },
    { 'Accept-Language': 'zh' },
  ];
  for (const headers of headerCases) {
    const original = new Response('{}', {
      headers: { 'Content-Type': 'application/json' },
    });
    const req = new Request('https://example.test/pricing', { headers });
    assert.equal(
      await withLocaleNegotiation(req, () => Promise.resolve(original)),
      original
    );
  }
});

test('both redirected and English documents avoid cache contamination and retain existing headers', async () => {
  for (const language of ['zh-CN', 'en-US']) {
    const response = await withLocaleNegotiation(
      request('/', language),
      async () =>
        new Response('original body', {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=3600',
            'CDN-Cache-Control': 'max-age=86400',
            'Cloudflare-CDN-Cache-Control': 'max-age=86400',
            Vary: 'Accept-Encoding, cookie',
            'Content-Security-Policy': "default-src 'self'",
            'Set-Cookie': 'existing=keep; Path=/',
          },
        })
    );
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('cdn-cache-control'), 'no-store');
    assert.equal(
      response.headers.get('cloudflare-cdn-cache-control'),
      'no-store'
    );
    const vary = response.headers
      .get('vary')!
      .toLowerCase()
      .split(',')
      .map((value) => value.trim());
    assert.equal(vary.filter((value) => value === 'cookie').length, 1);
    assert.ok(vary.includes('accept-language'));
    if (language === 'en-US') {
      assert.ok(vary.includes('accept-encoding'));
      assert.equal(
        response.headers.get('content-security-policy'),
        "default-src 'self'"
      );
      assert.equal(response.headers.get('set-cookie'), 'existing=keep; Path=/');
      assert.equal(await response.text(), 'original body');
    }
  }
  const wildcard = await withLocaleNegotiation(
    request('/', 'en'),
    async () => new Response('body', { headers: { Vary: '*' } })
  );
  assert.equal(wildcard.headers.get('vary'), '*');
});
