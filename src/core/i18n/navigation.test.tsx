import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterContextProvider,
} from '@tanstack/react-router';
import { renderToStaticMarkup } from 'react-dom/server';

import { deLocalizeUrl, localizeUrl, setLocale } from '@/paraglide/runtime.js';

import {
  Link,
  requiresDocumentNavigation,
  toNavigateOptions,
} from './navigation';

for (const locale of ['en', 'zh', 'de'] as const) {
  test(`${locale}: Home links match the home route and preserve the exporter anchor`, async () => {
    setLocale(locale, { reload: false });
    const root = createRootRoute();
    const home = createRoute({ getParentRoute: () => root, path: '/' });
    const backup = createRoute({
      getParentRoute: () => root,
      path: '/youtube-playlist-backup',
      component: () => createElement(Link, { href: '/#exporter' }, 'Home'),
    });
    const router = createRouter({
      routeTree: root.addChildren([home, backup]),
      history: createMemoryHistory({
        initialEntries: [
          `${locale === 'en' ? '' : `/${locale}`}/youtube-playlist-backup?setup=cancel`,
        ],
      }),
      rewrite: {
        input: ({ url }) => deLocalizeUrl(url),
        output: ({ url }) => localizeUrl(url, { locale }),
      },
    });
    await router.load();
    const html = renderToStaticMarkup(
      createElement(RouterContextProvider, {
        router: router as any,
        children: createElement(Link, { href: '/#exporter' }, 'Home'),
      })
    );
    const expected = locale === 'en' ? '/#exporter' : `/${locale}#exporter`;
    assert.ok(html.includes(`href="${expected}"`), html);
    await router.navigate(toNavigateOptions('/#exporter'));
    assert.equal(router.state.location.pathname, '/');
    assert.equal(router.state.location.hash, 'exporter');
    assert.equal(Object.keys(router.state.location.search).length, 0);
    assert.equal(router.state.matches.at(-1)?.routeId, '/');
    assert.equal(router.history.location.href, expected);
    assert.equal(router.state.location.publicHref, expected);
    setLocale('en', { reload: false });
  });
}

test('query parameters are not confused with path or hash during trial sign-in', () => {
  const options = toNavigateOptions(
    '/sign-in?callbackUrl=%2Fde%2Fpricing#form'
  );
  assert.deepEqual(
    { ...options, search: { ...options.search } },
    {
      to: '/sign-in',
      search: { callbackUrl: '/de/pricing' },
      hash: 'form',
    }
  );
});

test('privacy boundaries trigger document navigation before changing history, including anchored Home and trial links', () => {
  assert.equal(
    requiresDocumentNavigation(
      { pathname: '/youtube-playlist-backup', searchStr: '' },
      '/#exporter'
    ),
    true
  );
  assert.equal(
    requiresDocumentNavigation(
      { pathname: '/pricing', searchStr: '' },
      '/sign-in?callbackUrl=%2Fde%2Fpricing'
    ),
    true
  );
  assert.equal(
    requiresDocumentNavigation(
      { pathname: '/youtube-playlist-backup', searchStr: '' },
      '/youtube-playlist-backup?setup=success'
    ),
    true
  );
  assert.equal(
    requiresDocumentNavigation({ pathname: '/', searchStr: '' }, '/#exporter'),
    false
  );
  assert.equal(
    requiresDocumentNavigation({ pathname: '/', searchStr: '' }, '/pricing'),
    false
  );
});
