import assert from 'node:assert/strict';
import { test } from 'node:test';

import { guardNotificationEmail } from '@/lib/playlist-guard/notifications';

import { subscriptionEmail, type SubscriptionEmailInput } from './subscription';

const input: SubscriptionEmailInput = {
  to: 'fixture@example.invalid',
  id: 'fixture',
  locale: 'en',
  brand: { name: 'Test Brand', url: 'https://example.invalid' },
  planName: 'Lite',
  trial: true,
  amount: 990,
  currency: 'usd',
  paidAmount: 0,
  periodEnd: new Date('2026-11-04T10:00:00Z'),
  interval: 'year',
};
test('trial confirmation separates zero charge, trial end, first charge, and cancellation terms', () => {
  const email = subscriptionEmail(input);
  assert.match(email.text!, /Charged today: \$0\.00/);
  assert.match(email.text!, /Trial ends: Nov 4, 2026/);
  assert.match(email.text!, /First scheduled charge: Nov 4, 2026/);
  assert.match(email.text!, /Renewal price: \$9\.90 \/ year/);
  assert.match(email.text!, /Cancellation stops paid features immediately/);
  assert.match(email.text!, /not a payment receipt/);
  assert.match(email.html!, /https:\/\/example.invalid\/logo.png/);
});
test('paid activation does not promise a free trial; unknown amounts are not claimed as zero', () => {
  const email = subscriptionEmail({ ...input, trial: false, paidAmount: 990 });
  assert.match(email.text!, /Charged today: \$9.90/);
  assert.match(email.text!, /Next scheduled renewal/);
  assert.doesNotMatch(email.html!, /Trial ends|free trial starts/);
  assert.match(
    subscriptionEmail({ ...input, paidAmount: null }).text!,
    /Charged today: See billing details/
  );
});
test('ended subscription claim does not promise access or another renewal', () => {
  const email = subscriptionEmail({
    ...input,
    trial: false,
    ended: true,
    claim: {
      url: 'https://example.invalid/claim-backup#token=fixture',
      privatePlaylist: false,
    },
  });
  assert.match(email.text!, /previous subscription has ended/);
  assert.doesNotMatch(
    email.text!,
    /Next scheduled renewal|Renewal price|unlimited videos/
  );
});
test('all supported locales render translated email content and preserve safe claim URLs', () => {
  for (const locale of ['en', 'zh', 'de']) {
    const url = `https://example.invalid/${locale}/claim-backup?guest=fixture#token=safe`;
    const email = subscriptionEmail({
      ...input,
      locale,
      claim: { url, privatePlaylist: true },
    });
    assert.match(email.html!, new RegExp(`lang="${locale}"`));
    assert.ok(email.text!.includes(url));
    assert.match(email.html!, /#fce7ef/);
  }
  const unsafe = subscriptionEmail({
    ...input,
    planName: '<script>alert(1)</script>',
  });
  assert.match(unsafe.html!, /&lt;script&gt;/);
  assert.doesNotMatch(unsafe.html!, /<script>/);
  assert.throws(
    () =>
      subscriptionEmail({
        ...input,
        claim: { url: 'javascript:alert(1)', privatePlaylist: false },
      }),
    /Invalid email URL/
  );
});
test('German change email shows only enabled counts and retains an optional snapshot attachment', () => {
  const email = guardNotificationEmail(
    {
      name: '<Private & music>',
      url: 'https://youtube.com/playlist?list=fixture',
      locale: 'de',
      notifyAdded: true,
      notifyMissing: true,
      notifyRestored: false,
      emailDelivery: true,
      snapshot: {
        id: 's',
        createdAt: '2026-10-28T10:00:00Z',
        itemCount: 42,
        added: 2,
        removed: 1,
        restored: 3,
        items: [],
      },
    },
    'fixture@example.invalid',
    input.brand,
    's'
  );
  assert.match(email.html!, /Deine Sammlung wurde aktualisiert/);
  assert.match(email.html!, /&lt;Private &amp; music&gt;/);
  assert.doesNotMatch(email.html!, /Wieder verfügbar/);
  assert.match(email.text!, /keine Video- oder Audiodateien/);
  assert.equal(
    JSON.parse(email.attachments![0].content.toString()).restored,
    3
  );
  assert.equal(email.idempotencyKey, 'playlist-guard/s');
});
