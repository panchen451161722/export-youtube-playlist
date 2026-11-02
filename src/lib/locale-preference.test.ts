import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getPreferredLocale,
  LOCALE_PREFERENCE_COOKIE,
  parseLocalePreference,
  rememberLocalePreference,
} from './locale-preference';

test('browser preference order wins, including regional variants', () => {
  assert.equal(getPreferredLocale(['zh-CN', 'en']), 'zh');
  assert.equal(getPreferredLocale(['de-DE', 'zh']), 'de');
  assert.equal(getPreferredLocale(['en-US', 'zh-CN']), 'en');
  assert.equal(getPreferredLocale(['fr-FR', 'de-AT', 'en']), 'de');
  assert.equal(getPreferredLocale(['ZH-hant-TW']), 'zh');
});

test('unsupported, malformed, and empty preferences do not invent a locale', () => {
  assert.equal(getPreferredLocale([]), undefined);
  assert.equal(getPreferredLocale(['fr-FR', 'ja']), undefined);
  assert.equal(getPreferredLocale(['', '*', 'zh<script>', 'en_US']), undefined);
  assert.equal(getPreferredLocale(['de-DE', 'zh'], ['en']), undefined);
});

test('only the explicit choice cookie overrides automatic language detection', () => {
  assert.equal(parseLocalePreference('PARAGLIDE_LOCALE=en'), undefined);
  assert.equal(
    parseLocalePreference(
      `PARAGLIDE_LOCALE=en; ${LOCALE_PREFERENCE_COOKIE}=zh`
    ),
    'zh'
  );
  assert.equal(parseLocalePreference(`${LOCALE_PREFERENCE_COOKIE}=de`), 'de');
  assert.equal(
    parseLocalePreference(`other=x; ${LOCALE_PREFERENCE_COOKIE}=en; session=x`),
    'en'
  );
  for (const cookie of [
    '',
    `${LOCALE_PREFERENCE_COOKIE}=`,
    `${LOCALE_PREFERENCE_COOKIE}=fr`,
    `${LOCALE_PREFERENCE_COOKIE}=zh-CN`,
    `${LOCALE_PREFERENCE_COOKIE}=zh%3BPath%3D%2F`,
    `${LOCALE_PREFERENCE_COOKIE}=%E0%A4%A`,
    `prefix_${LOCALE_PREFERENCE_COOKIE}=zh`,
  ])
    assert.equal(parseLocalePreference(cookie), undefined);
});

test('manual choices persist for one year without introducing server state', () => {
  assert.doesNotThrow(() => rememberLocalePreference('zh'));
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    'document'
  );
  const browserDocument = { cookie: '' };
  const browserWindow = { location: { protocol: 'https:' } };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: browserDocument,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: browserWindow,
  });
  try {
    rememberLocalePreference('zh');
    assert.equal(
      browserDocument.cookie,
      `${LOCALE_PREFERENCE_COOKIE}=zh; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    );
    assert.equal(parseLocalePreference(browserDocument.cookie), 'zh');
    browserWindow.location.protocol = 'http:';
    rememberLocalePreference('en');
    assert.equal(
      browserDocument.cookie,
      `${LOCALE_PREFERENCE_COOKIE}=en; Path=/; Max-Age=31536000; SameSite=Lax`
    );
    rememberLocalePreference('zh; injected=value' as 'zh');
    assert.equal(parseLocalePreference(browserDocument.cookie), 'en');
    Object.defineProperty(browserDocument, 'cookie', {
      get() {
        throw new Error('Cookie access denied');
      },
      set() {
        throw new Error('Cookie access denied');
      },
    });
    assert.doesNotThrow(() => rememberLocalePreference('de'));
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (previousDocument)
      Object.defineProperty(globalThis, 'document', previousDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
  assert.equal(parseLocalePreference(''), undefined);
});
