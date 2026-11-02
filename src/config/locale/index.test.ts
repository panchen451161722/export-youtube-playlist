import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { isPrivateDocumentPath } from '@/lib/private-document';
import { publicPageSeo } from '@/lib/seo';

import { hasGermanContent } from './index';

test('German backup and trial authentication pages retain their locale and privacy boundary', () => {
  for (const path of [
    '/youtube-playlist-backup',
    '/claim-backup',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/redeem-invite',
  ]) {
    assert.ok(hasGermanContent(path), path);
    assert.ok(isPrivateDocumentPath(`/de${path}`), path);
  }
  assert.equal(hasGermanContent('/settings/billing'), false);
  const head = publicPageSeo({
    title: 'Backup',
    description: 'Backup',
    path: '/youtube-playlist-backup',
    locale: 'de',
  });
  assert.ok(
    head.links?.some(
      (link) =>
        link.rel === 'canonical' &&
        link.href?.endsWith('/de/youtube-playlist-backup')
    )
  );
  assert.ok(
    head.links?.some(
      (link) =>
        link.hrefLang === 'de' &&
        link.href?.endsWith('/de/youtube-playlist-backup')
    )
  );
});

test('German backup, trial and auth interfaces have authored messages with matching placeholders', () => {
  const english = JSON.parse(readFileSync('messages/en.json', 'utf8'));
  const german = JSON.parse(readFileSync('messages/de.json', 'utf8'));
  const files = [
    'src/routes/youtube-playlist-backup.tsx',
    'src/blocks/playlist-guard/backup.tsx',
    'src/blocks/playlist-guard/backup-onboarding.tsx',
    'src/blocks/playlist-guard/guest-checkout-status.tsx',
    'src/blocks/playlist-guard/guest-trial-decision.tsx',
    'src/blocks/playlist-guard/claim-backup.tsx',
    ...[
      'sign-in',
      'sign-up',
      'forgot-password',
      'reset-password',
      'verify-email',
      'redeem-invite',
    ].map((name) => `src/routes/(auth)/${name}.tsx`),
  ];
  const placeholders = (text: string) =>
    (text.match(/\{[^}]+\}/g) || []).sort();
  for (const file of files) {
    for (const match of readFileSync(file, 'utf8').matchAll(
      /m\[\s*'([^']+)'\s*\]/g
    )) {
      const key = match[1];
      assert.ok(german[key]?.trim(), `${file}: ${key} falls back to English`);
      assert.deepEqual(
        placeholders(german[key]),
        placeholders(english[key]),
        key
      );
    }
  }
});
