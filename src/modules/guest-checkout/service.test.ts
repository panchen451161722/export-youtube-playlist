import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import Stripe from 'stripe';

import {
  account,
  config,
  credit,
  guardCollection,
  guardDelivery,
  guardWorkspace,
  guestCheckout,
  order,
  session,
  subscription,
  user,
  verification,
} from '@/config/db/schema';
import { GUARD_TRIAL_DAYS } from '@/config/guard-plans';
import { guestCheckoutSchema } from '@/lib/guest-checkout';

// Disposable database, signed Stripe fixtures and a fake mail transport. Never charge or send email.
const folder = mkdtempSync(join(tmpdir(), 'eyp-guest-'));
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DATABASE_URL = `file:${folder}/guest.db`;
process.env.VITE_APP_URL = 'http://localhost:3000';
process.env.AUTH_SECRET = 'guest-test-only-secret-at-least-32-characters';
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
process.env.STRIPE_SIGNING_SECRET = 'whsec_guest_fixture';
process.env.YOUTUBE_API_KEY = 'youtube_test_placeholder';
process.env.PLAYLIST_GUARD_MAIL_PREVIEW_URL = 'http://localhost:3103/mail';
const client = createClient({ url: process.env.DATABASE_URL });
const database = drizzle(client);
for (const table of [
  user,
  session,
  account,
  verification,
  config,
  order,
  subscription,
  credit,
  guestCheckout,
  guardCollection,
  guardDelivery,
  guardWorkspace,
]) {
  const info = getTableConfig(table);
  await client.execute(
    `CREATE TABLE "${info.name}" (${info.columns.map((c) => `"${c.name}" ${c.getSQLType()}${c.primary ? ' PRIMARY KEY' : ''}${c.isUnique ? ' UNIQUE' : ''}`).join(',')})`
  );
}
for (const statement of [
  'CREATE UNIQUE INDEX uq_guest_browser ON guest_checkout (active_browser_hash)',
  'CREATE UNIQUE INDEX uq_guest_session ON guest_checkout (checkout_session_id)',
  'CREATE UNIQUE INDEX uq_guest_trial_email ON guest_checkout (trial_email_hash)',
  'CREATE UNIQUE INDEX uq_guest_retry ON guest_checkout (retry_of)',
  'CREATE UNIQUE INDEX uq_guard_slot ON guard_collection (user_id, slot)',
  'CREATE UNIQUE INDEX uq_guard_source ON guard_collection (user_id, source_key)',
])
  await client.execute(statement);
await database.insert(config).values([
  { name: 'stripe_enabled', value: 'true' },
  {
    name: 'stripe_price_ids_mapping',
    value: JSON.stringify({
      guard_lite_yearly: 'price_lite',
      guard_pro_yearly: 'price_pro',
      guard_ultra_yearly: 'price_ultra',
    }),
  },
]);
const service = await import('./service');
const flow = await import('@/routes/api/payment/-guest-checkout');
const payment = await import('@/modules/payment/service');
const { getAuth } = await import('@/core/auth');
const { getAllConfigs } = await import('@/modules/config/service');
const originalFetch = globalThis.fetch;
const mails: { text: string; to: string }[] = [];
let mailFails = false;
let youtubeRequests = 0;
let stripeStatus = 'open';
let serial = 0;
let currentSession: any;
let currentSubscription: any;
let createParams: URLSearchParams;
const stripeRequests = new Map<string, { body: string; session: any }>();
const sessionsById = new Map<string, any>();
const subscriptionsById = new Map<string, any>();
const cancellations: { id: string; params: URLSearchParams }[] = [];
let cancellationFails = false;
let remoteCustomers: any[] = [];
let remoteSubscriptions: any[] = [];
const now = Math.floor(Date.now() / 1000);
async function guestByEmail(email: string) {
  return (
    await database
      .select()
      .from(guestCheckout)
      .where(eq(guestCheckout.email, email))
  )[0];
}

globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.origin === 'http://localhost:3103') {
    if (mailFails) return new Response('', { status: 503 });
    mails.push(JSON.parse(String(init?.body)));
    return new Response('ok');
  }
  if (url.hostname === 'www.googleapis.com') {
    youtubeRequests += 1;
    if (url.pathname.endsWith('/playlists'))
      return Response.json({
        items: [
          {
            snippet: { title: 'Fixture playlist' },
            contentDetails: { itemCount: 0 },
          },
        ],
      });
    if (url.pathname.endsWith('/playlistItems'))
      return Response.json({ items: [], pageInfo: { totalResults: 0 } });
  }
  if (url.hostname === 'api.stripe.com') {
    if (url.pathname.startsWith('/v1/prices/'))
      return Response.json({
        id: url.pathname.split('/').pop(),
        active: true,
        livemode: false,
        currency: 'usd',
        unit_amount: url.pathname.endsWith('price_pro')
          ? 2990
          : url.pathname.endsWith('price_ultra')
            ? 6990
            : 990,
        recurring: { interval: 'year', interval_count: 1 },
      });
    if (url.pathname === '/v1/customers' && init?.method === 'POST')
      return Response.json({ id: `cus_guest_${serial}` });
    if (url.pathname === '/v1/customers')
      return Response.json({ data: remoteCustomers, has_more: false });
    if (url.pathname === '/v1/subscriptions')
      return Response.json({ data: remoteSubscriptions, has_more: false });
    if (url.pathname === '/v1/checkout/sessions' && init?.method === 'POST') {
      const key = new Headers(init.headers).get('Idempotency-Key');
      assert.ok(key?.startsWith('guard-checkout-guest-'));
      const prior = stripeRequests.get(key!);
      if (prior) {
        assert.equal(
          String(init.body),
          prior.body,
          'retries must preserve the entire Stripe request'
        );
        return Response.json(prior.session);
      }
      serial++;
      createParams = new URLSearchParams(String(init.body));
      const metadata = Object.fromEntries(
        [...createParams]
          .filter(([key]) => key.startsWith('metadata['))
          .map(([key, value]) => [key.slice(9, -1), value])
      );
      currentSession = {
        id: `cs_guest_${serial}`,
        success_url: createParams.get('success_url'),
        cancel_url: createParams.get('cancel_url'),
        status: 'open',
        payment_status: 'unpaid',
        metadata,
        url: `https://checkout.stripe.com/c/pay/cs_guest_${serial}`,
        customer: `cus_guest_${serial}`,
        amount_total: 990,
        currency: 'usd',
        created: now,
      };
      currentSubscription = {
        id: `sub_guest_${serial}`,
        status: 'active',
        default_payment_method: 'pm_guest_fixture',
        trial_start: now,
        trial_end: now + GUARD_TRIAL_DAYS * 86400,
        metadata,
        items: {
          data: [
            {
              price: {
                id: 'price_lite',
                product: 'prod_lite',
                unit_amount: 990,
                currency: 'usd',
              },
              plan: { interval: 'year', interval_count: 1 },
              current_period_start: now,
              current_period_end: now + 31536000,
            },
          ],
        },
      };
      stripeRequests.set(key!, {
        body: String(init.body),
        session: currentSession,
      });
      sessionsById.set(currentSession.id, currentSession);
      subscriptionsById.set(currentSubscription.id, currentSubscription);
      return Response.json(currentSession);
    }
    if (url.pathname === '/v1/checkout/sessions')
      return Response.json({ data: [] });
    if (url.pathname.endsWith('/expire'))
      return Response.json({ ...currentSession, status: 'expired' });
    if (url.pathname.startsWith('/v1/checkout/sessions/'))
      return Response.json({
        ...(url.pathname.endsWith(currentSession.id)
          ? currentSession
          : sessionsById.get(url.pathname.split('/').pop()!)),
        status: stripeStatus,
      });
    if (url.pathname.startsWith('/v1/subscriptions/')) {
      const id = url.pathname.split('/').pop()!;
      let sub = subscriptionsById.get(id) || currentSubscription;
      if (init?.method === 'DELETE') {
        if (cancellationFails)
          return Response.json(
            {
              error: {
                message: 'Fixture cancellation unavailable',
                type: 'invalid_request_error',
              },
            },
            { status: 400 }
          );
        cancellations.push({
          id,
          params: new URLSearchParams(url.search || String(init.body)),
        });
        sub = { ...sub, status: 'canceled', canceled_at: now, ended_at: now };
        subscriptionsById.set(id, sub);
        if (currentSubscription.id === id) currentSubscription = sub;
      }
      return Response.json(sub);
    }
  }
  throw new Error(`Unexpected external request: ${url.origin}${url.pathname}`);
};
after(() => {
  globalThis.fetch = originalFetch;
  client.close();
  rmSync(folder, { recursive: true, force: true });
});
const input = () =>
  guestCheckoutSchema.parse({
    locale: 'en',
    backup: {
      url: 'https://www.youtube.com/playlist?list=PL1234567890',
      planId: 'lite',
      frequency: 'daily',
      notifyMissing: true,
      notifyAdded: false,
      notifyRestored: true,
    },
  });
async function paid(
  id: string,
  email = 'buyer@example.invalid',
  trial = false,
  fulfill = true
) {
  const row = (await service.guestById(id))!;
  currentSubscription.status = trial ? 'trialing' : 'active';
  currentSession = {
    ...currentSession,
    status: 'complete',
    payment_status: trial ? 'no_payment_required' : 'paid',
    amount_total: trial ? 0 : 990,
    customer_details: { email },
    subscription: currentSubscription.id,
  };
  sessionsById.set(currentSession.id, currentSession);
  const payload = JSON.stringify({
    id: `evt_${serial}`,
    type: 'checkout.session.completed',
    livemode: false,
    data: { object: currentSession },
  });
  const event = await payment.handleWebhook({
    provider: 'stripe',
    req: new Request('http://localhost:3000/api/payment/notify/stripe', {
      method: 'POST',
      body: payload,
      headers: {
        'stripe-signature': Stripe.webhooks.generateTestHeaderString({
          payload,
          secret: process.env.STRIPE_SIGNING_SECRET!,
        }),
      },
    }),
  });
  if (fulfill) await flow.completeGuestFromEvent(event.paymentSession);
}

test('guest checkout starts a card-backed seven-day trial, saves the backup and supports safe retries', async () => {
  const token = service.newGuestToken();
  const result = await flow.startGuestCheckout(input(), token);
  const row = (await service.guestById(result.id))!;
  assert.equal(createParams.get('line_items[0][price]'), 'price_lite');
  assert.equal(createParams.has('customer'), false);
  assert.equal(createParams.has('customer_email'), false);
  assert.equal(row.email, '');
  assert.equal((await service.guestStatus(row)).email, '');
  assert.equal(
    guestCheckoutSchema.safeParse({
      ...input(),
      email: 'injected@example.invalid',
    }).success,
    false
  );
  assert.equal(createParams.get('subscription_data[trial_period_days]'), '7');
  assert.equal(createParams.get('metadata[trial_days]'), '7');
  assert.equal(createParams.get('payment_method_collection'), 'always');
  assert.equal(
    createParams.get(
      'subscription_data[trial_settings][end_behavior][missing_payment_method]'
    ),
    'cancel'
  );
  assert.equal(createParams.get('metadata[guest_checkout_id]'), row.id);
  assert.ok(Number(createParams.get('expires_at')) > now + 1800);
  assert.ok(
    ![...createParams].some(
      ([key, value]) =>
        key.startsWith('metadata') && value.includes('youtube.com')
    )
  );
  const [placeholder] = await database
    .select()
    .from(user)
    .where(eq(user.id, row.userId));
  assert.match(placeholder.email, /@guest.invalid$/);
  assert.equal(placeholder.emailVerified, false);
  assert.equal(await service.ownsGuest(row, token), true);
  assert.equal(await service.ownsGuest(row, service.newGuestToken()), false);
  assert.equal(
    await service.ownsGuest(row, null, {
      id: 'not-verified',
      email: row.email,
      emailVerified: false,
    }),
    false
  );
  assert.equal(
    (await flow.startGuestCheckout(input(), token)).checkout_url,
    result.checkout_url
  );
  await assert.rejects(service.saveGuest(input(), token));
  assert.equal(
    (await database.select().from(user)).length,
    1,
    'reservation conflict rolls back placeholder'
  );
  await flow.completeGuestCheckout(row.id);
  assert.equal(
    (await database.select().from(guardCollection)).length,
    0,
    'unpaid return cannot create a backup'
  );
  await paid(row.id, 'buyer@example.invalid', true);
  const [trialOrder] = await database
    .select()
    .from(order)
    .where(eq(order.orderNo, row.orderNo!));
  assert.equal(trialOrder.status, 'trialing');
  assert.equal(trialOrder.paymentAmount, 0);
  assert.equal(trialOrder.paidAt, null);
  const [trialSub] = await database
    .select()
    .from(subscription)
    .where(eq(subscription.userId, row.userId));
  assert.equal(trialSub.status, 'trialing');
  assert.equal(trialSub.amount, 990);
  assert.equal(
    trialSub.currentPeriodEnd?.getTime(),
    (now + GUARD_TRIAL_DAYS * 86400) * 1000
  );
  const done = (await service.guestById(row.id))!;
  assert.equal(done.status, 'fulfilled');
  assert.equal(done.email, 'buyer@example.invalid');
  assert.ok(done.collectionId);
  const [collection] = await database
    .select()
    .from(guardCollection)
    .where(eq(guardCollection.id, done.collectionId!));
  assert.equal(JSON.parse(collection.document).snapshots.length, 1);
  assert.equal(mails.length, 1);
  await paid(row.id, 'buyer@example.invalid', true);
  assert.equal(
    (await database.select().from(guardCollection)).length,
    1,
    'webhook replay does not duplicate backup'
  );
  assert.equal(mails.length, 1, 'webhook replay does not duplicate claim mail');
  await database
    .update(order)
    .set({ paymentEmail: 'changed@example.invalid' })
    .where(eq(order.orderNo, row.orderNo!));
  await assert.rejects(
    flow.completeGuestCheckout(row.id),
    /payment_email_mismatch/
  );
  assert.equal(
    (await service.guestById(row.id))?.email,
    'buyer@example.invalid'
  );
  await database
    .update(order)
    .set({ paymentEmail: 'buyer@example.invalid' })
    .where(eq(order.orderNo, row.orderNo!));
});

test('email link establishes a verified session, is single-use, and transfers only its own purchase', async () => {
  const row = (await guestByEmail('buyer@example.invalid'))!;
  await database.insert(user).values([
    {
      id: 'attacker',
      name: 'Other',
      email: 'other@example.invalid',
      emailVerified: true,
    },
    {
      id: 'unverified',
      name: 'Existing',
      email: row.email,
      emailVerified: false,
    },
  ]);
  await assert.rejects(
    service.claimGuest(row.id, 'attacker'),
    /claim_forbidden/
  );
  await assert.rejects(
    service.claimGuest(row.id, 'unverified'),
    /claim_forbidden/
  );
  const link = new URL(mails[0].text.split('Claim my account: ')[1]);
  assert.equal(link.pathname, '/claim-backup');
  assert.equal(
    link.searchParams.has('token'),
    false,
    'mail scanner GET cannot consume a fragment token'
  );
  const token = new URLSearchParams(link.hash.slice(1)).get('token')!;
  const auth = getAuth(await getAllConfigs());
  const verifyUrl = new URL('/api/auth/magic-link/verify', link.origin);
  verifyUrl.search = new URLSearchParams({
    token,
    callbackURL: link.pathname + link.search,
  }).toString();
  const response = await auth.handler(new Request(verifyUrl));
  assert.equal(response.status, 302);
  assert.ok(response.headers.get('set-cookie')?.includes('session_token'));
  const [owner] = await database
    .select()
    .from(user)
    .where(eq(user.id, 'unverified'));
  assert.equal(owner.emailVerified, true);
  assert.equal((await service.claimGuest(row.id, owner.id)).claimed, true);
  assert.equal(
    (await service.claimGuest(row.id, owner.id)).claimed,
    true,
    'claim replay is idempotent'
  );
  const [purchased] = await database
    .select()
    .from(order)
    .where(eq(order.orderNo, row.orderNo!));
  assert.equal(purchased.userId, owner.id);
  assert.equal(purchased.status, 'trialing');
  const [claimedSubscription] = await database
    .select()
    .from(subscription)
    .where(eq(subscription.userId, owner.id));
  assert.equal(claimedSubscription.status, 'trialing');
  assert.equal(
    (await payment.getGuardCheckoutOptions(owner.id, owner.email))
      .trialEligible,
    false
  );
  const [collection] = await database
    .select()
    .from(guardCollection)
    .where(eq(guardCollection.id, row.collectionId!));
  assert.equal(collection.userId, owner.id);
  const replay = await auth.handler(new Request(verifyUrl));
  assert.ok(
    !replay.headers.get('set-cookie')?.includes('session_token'),
    'email token cannot issue a second session'
  );
});

test('failed mail preserves the paid backup and a later delivery retry creates no duplicate', async () => {
  const result = await flow.startGuestCheckout(
    input(),
    service.newGuestToken()
  );
  mailFails = true;
  await assert.rejects(paid(result.id, 'retry@example.invalid'));
  const row = (await service.guestById(result.id))!;
  assert.equal(row.status, 'fulfilled');
  assert.ok(row.collectionId);
  assert.equal(row.mailSentAt, null);
  mailFails = false;
  await service.updateGuest(row.id, {
    mailAttemptAt: new Date(Date.now() - 65_000).toISOString(),
  });
  await flow.completeGuestCheckout(row.id);
  assert.ok((await service.guestById(row.id))?.mailSentAt);
  assert.equal(
    (
      await database
        .select()
        .from(guardCollection)
        .where(eq(guardCollection.userId, row.userId))
    ).length,
    1
  );
});

test('cancel expires an unpaid session, but a payment that wins the race is fulfilled', async () => {
  const cancel = await flow.startGuestCheckout(
    input(),
    service.newGuestToken()
  );
  stripeStatus = 'open';
  await flow.cancelGuestCheckout(cancel.id);
  assert.equal((await service.guestById(cancel.id))?.status, 'abandoned');
  assert.equal((await service.guestById(cancel.id))?.activeBrowserHash, null);
  const race = await flow.startGuestCheckout(input(), service.newGuestToken());
  stripeStatus = 'complete';
  currentSession = {
    ...currentSession,
    payment_status: 'paid',
    customer_details: { email: 'race@example.invalid' },
    subscription: currentSubscription.id,
  };
  await flow.cancelGuestCheckout(race.id);
  assert.equal((await service.guestById(race.id))?.status, 'fulfilled');
});

test('a new buyer creates an account only after verifying the emailed token', async () => {
  const row = (await guestByEmail('retry@example.invalid'))!;
  assert.equal(
    (await database.select().from(user).where(eq(user.email, row.email)))
      .length,
    0
  );
  const mail = mails.find((item) => item.to === row.email)!;
  const link = new URL(mail.text.split('Claim my account: ')[1]);
  const token = new URLSearchParams(link.hash.slice(1)).get('token')!;
  const auth = getAuth(await getAllConfigs());
  const verifyUrl = new URL('/api/auth/magic-link/verify', link.origin);
  verifyUrl.search = new URLSearchParams({
    token,
    callbackURL: link.pathname + link.search,
  }).toString();
  const response = await auth.handler(new Request(verifyUrl));
  assert.equal(response.status, 302);
  const [owner] = await database
    .select()
    .from(user)
    .where(eq(user.email, row.email));
  assert.equal(owner.emailVerified, true);
  assert.notEqual(owner.id, row.userId);
  assert.equal((await service.claimGuest(row.id, owner.id)).claimed, true);
});

test('a paid webhook arriving before checkout persistence must retry', async () => {
  const row = await service.saveGuest(input(), service.newGuestToken());
  await assert.rejects(
    flow.completeGuestFromEvent({
      metadata: { guest_checkout_id: row.id },
      paymentStatus: 'paid',
    }),
    /please_retry/
  );
});

test('missing or invalid paid email cannot grant a claim', async () => {
  const result = await flow.startGuestCheckout(
    input(),
    service.newGuestToken()
  );
  const row = (await service.guestById(result.id))!;
  await database
    .update(order)
    .set({ status: 'paid', paymentEmail: '' })
    .where(eq(order.orderNo, row.orderNo!));
  await assert.rejects(
    flow.completeGuestCheckout(row.id),
    /payment_email_missing/
  );
  assert.equal((await service.guestById(row.id))?.collectionId, null);
});

test('a lost local session write retries the same Stripe request without a second checkout', async () => {
  const token = service.newGuestToken();
  const result = await flow.startGuestCheckout(input(), token);
  const row = (await service.guestById(result.id))!;
  const count = serial;
  await service.updateGuest(row.id, {
    checkoutSessionId: null,
    checkoutUrl: null,
  });
  const recovered = await flow.startGuestCheckout(input(), token);
  assert.equal(recovered.checkout_url, result.checkout_url);
  assert.equal((await service.guestById(row.id))?.orderNo, row.orderNo);
  assert.equal(serial, count);
});

test('separate browsers may pay with the same Stripe email and both purchases stay recoverable', async () => {
  const first = await flow.startGuestCheckout(input(), service.newGuestToken());
  await paid(first.id, 'shared@example.invalid');
  const second = await flow.startGuestCheckout(
    input(),
    service.newGuestToken()
  );
  await paid(second.id, 'shared@example.invalid');
  assert.notEqual(first.id, second.id);
  for (const id of [first.id, second.id]) {
    const row = (await service.guestById(id))!;
    assert.equal(row.status, 'fulfilled');
    assert.equal(row.email, 'shared@example.invalid');
    assert.ok(row.collectionId);
  }
});

test('a guest checkout saved with a stale return port is expired and replaced', async () => {
  stripeStatus = 'open';
  const token = service.newGuestToken();
  const first = await flow.startGuestCheckout(input(), token);
  const row = (await service.guestById(first.id))!;
  const stored = {
    ...currentSession,
    success_url: currentSession.success_url.replace(':3000', ':3002'),
    cancel_url: currentSession.cancel_url.replace(':3000', ':3002'),
  };
  await database
    .update(order)
    .set({ checkoutResult: JSON.stringify(stored) })
    .where(eq(order.orderNo, row.orderNo!));
  const next = await flow.startGuestCheckout(input(), token);
  assert.notEqual(next.id, first.id);
  assert.equal((await service.guestById(first.id))?.status, 'abandoned');
  assert.equal(
    new URL(createParams.get('cancel_url')!).origin,
    'http://localhost:3000'
  );
  assert.equal(
    new URL(createParams.get('success_url')!).origin,
    'http://localhost:3000'
  );
});

test('a previous immediate-charge guest session is replaced with the promised trial', async () => {
  stripeStatus = 'open';
  const token = service.newGuestToken();
  const first = await flow.startGuestCheckout(input(), token);
  const row = (await service.guestById(first.id))!;
  await database
    .update(order)
    .set({
      checkoutResult: JSON.stringify({
        ...currentSession,
        metadata: { ...currentSession.metadata, trial_days: '0' },
      }),
    })
    .where(eq(order.orderNo, row.orderNo!));
  const next = await flow.startGuestCheckout(input(), token);
  assert.notEqual(next.id, first.id);
  assert.equal((await service.guestById(first.id))?.status, 'abandoned');
  assert.equal(createParams.get('subscription_data[trial_period_days]'), '7');
});

test('all guest plans use their annual price and the same seven-day trial', async () => {
  for (const planId of ['lite', 'pro', 'ultra'] as const) {
    const values = input();
    values.backup.planId = planId;
    await flow.startGuestCheckout(values, service.newGuestToken());
    assert.equal(createParams.get('line_items[0][price]'), `price_${planId}`);
    assert.equal(createParams.get('subscription_data[trial_period_days]'), '7');
    assert.equal(createParams.has('customer_email'), false);
  }
});

test('an unconfirmed trial card cannot create a backup or send a claim link', async () => {
  const result = await flow.startGuestCheckout(
    input(),
    service.newGuestToken()
  );
  const mailCount = mails.length;
  currentSubscription.default_payment_method = null;
  await assert.rejects(
    paid(result.id, 'trial-card@example.invalid', true),
    /payment method has not been confirmed/
  );
  const row = (await service.guestById(result.id))!;
  assert.equal(row.collectionId, null);
  assert.equal((await service.guestStatus(row)).status, 'pending');
  assert.equal(mails.length, mailCount);
  currentSubscription.default_payment_method = 'pm_confirmed';
  await paid(result.id, 'trial-card@example.invalid', true);
  assert.equal((await service.guestById(result.id))?.status, 'fulfilled');
  assert.equal(mails.length, mailCount + 1);
});

test('a canceled prior trial blocks a repeat, and paid checkout requires a separate explicit action', async () => {
  const original = await flow.startGuestCheckout(
    input(),
    service.newGuestToken()
  );
  await paid(original.id, 'used-trial@example.invalid', true);
  const previousSubId = currentSubscription.id;
  await database
    .update(subscription)
    .set({ status: 'canceled' })
    .where(eq(subscription.subscriptionId, previousSubId));
  subscriptionsById.get(previousSubId).status = 'canceled';
  const token = service.newGuestToken();
  const attempt = await flow.startGuestCheckout(input(), token);
  const countBefore = serial;
  const mailCount = mails.length;
  await paid(attempt.id, 'USED-TRIAL@example.invalid', true);
  const row = (await service.guestById(attempt.id))!;
  assert.equal(row.status, 'trial_rejected');
  assert.equal(row.trialDecision, 'trial_used');
  assert.equal(row.collectionId, null);
  assert.equal(mails.length, mailCount);
  assert.equal(
    serial,
    countBefore,
    'no paid checkout is created automatically'
  );
  assert.equal(cancellations.at(-1)?.id, currentSubscription.id);
  assert.equal(cancellations.at(-1)?.params.get('invoice_now'), 'false');
  assert.equal(cancellations.at(-1)?.params.get('prorate'), 'false');
  assert.equal((await service.guestStatus(row)).rejectionReason, 'trial_used');
  await assert.rejects(
    flow.startGuestPaidCheckout(row.id, service.newGuestToken()),
    /paid_checkout_forbidden/
  );
  let retry = await flow.startGuestPaidCheckout(row.id, token);
  assert.notEqual(retry.id, row.id);
  assert.equal(createParams.has('subscription_data[trial_period_days]'), false);
  assert.equal(createParams.get('metadata[trial_days]'), '0');
  assert.equal((await service.guestById(retry.id))?.purchaseMode, 'paid');
  assert.ok('checkout_url' in retry);
  const repeated = await flow.startGuestPaidCheckout(row.id, token);
  assert.ok('checkout_url' in repeated);
  assert.equal(repeated.checkout_url, retry.checkout_url);
  assert.equal(
    (await flow.startGuestCheckout(input(), token)).id,
    row.id,
    'a trial entry never silently reuses a paid checkout'
  );
  await service.updateGuest(retry.id, {
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  });
  stripeStatus = 'open';
  const renewed = await flow.startGuestPaidCheckout(row.id, token);
  assert.notEqual(renewed.id, retry.id);
  assert.equal(
    createParams.get('metadata[trial_days]'),
    '0',
    'replacing an expired paid retry cannot re-enable a trial'
  );
  retry = renewed;
  await paid(retry.id, 'used-trial@example.invalid');
  assert.equal((await service.guestById(retry.id))?.status, 'fulfilled');
  const [purchased] = await database
    .select()
    .from(order)
    .where(eq(order.orderNo, (await service.guestById(retry.id))!.orderNo!));
  assert.equal(purchased.paymentAmount, 990);
});

test('an existing subscription cancels only the duplicate trial and does not offer another purchase', async () => {
  const first = await flow.startGuestCheckout(input(), service.newGuestToken());
  await paid(first.id, 'current-subscriber@example.invalid', true);
  const firstSub = currentSubscription.id;
  const token = service.newGuestToken();
  const duplicate = await flow.startGuestCheckout(input(), token);
  await paid(duplicate.id, 'current-subscriber@example.invalid', true);
  assert.equal(
    (await service.guestById(duplicate.id))?.trialDecision,
    'existing_subscription'
  );
  assert.equal(subscriptionsById.get(firstSub).status, 'trialing');
  assert.equal(currentSubscription.status, 'canceled');
  await assert.rejects(
    flow.startGuestPaidCheckout(duplicate.id, token),
    /paid_checkout_forbidden/
  );
});

test('a failed cancellation keeps backup and paid checkout locked until a retry confirms cancellation', async () => {
  const token = service.newGuestToken();
  const result = await flow.startGuestCheckout(input(), token);
  cancellationFails = true;
  try {
    await assert.rejects(
      paid(result.id, 'current-subscriber@example.invalid', true)
    );
  } finally {
    cancellationFails = false;
  }
  let row = (await service.guestById(result.id))!;
  assert.equal(row.status, 'trial_cancel_pending');
  assert.equal(row.collectionId, null);
  assert.equal(row.mailSentAt, null);
  await assert.rejects(
    flow.startGuestPaidCheckout(row.id, token),
    /paid_checkout_forbidden/
  );
  await database
    .update(guestCheckout)
    .set({ lastCheckedAt: new Date().toISOString() });
  await service.updateGuest(row.id, {
    lastCheckedAt: new Date(Date.now() - 120_000).toISOString(),
  });
  assert.deepEqual(await flow.retryGuestCheckouts(), { checked: 1, failed: 0 });
  row = (await service.guestById(row.id))!;
  assert.equal(row.status, 'trial_rejected');
  const count = cancellations.length;
  await flow.completeGuestCheckout(row.id);
  assert.equal(
    cancellations.length,
    count,
    'replayed notifications do not cancel a different subscription'
  );
});

test('Stripe-only historical canceled subscriptions also prevent another guest trial', async () => {
  remoteCustomers = [{ id: 'cus_remote_history', metadata: {} }];
  remoteSubscriptions = [
    {
      id: 'sub_remote_history',
      status: 'canceled',
      trial_start: now - 86400,
      metadata: {
        app: 'export-youtube-playlist',
        product_id: 'guard_lite_yearly',
      },
    },
  ];
  try {
    const result = await flow.startGuestCheckout(
      input(),
      service.newGuestToken()
    );
    await paid(result.id, 'remote-history@example.invalid', true);
    assert.equal(
      (await service.guestById(result.id))?.trialDecision,
      'trial_used'
    );
    assert.equal(
      (await service.guestById(result.id))?.status,
      'trial_rejected'
    );
  } finally {
    remoteCustomers = [];
    remoteSubscriptions = [];
  }
});

test('parallel guest trials reserve one normalized email and grant only one backup', async () => {
  const rows = [];
  for (let i = 0; i < 2; i++) {
    const result = await flow.startGuestCheckout(
      input(),
      service.newGuestToken()
    );
    // Persist the provider-confirmed order before fulfillment, like overlapping webhook requests.
    await paid(
      result.id,
      i ? 'PARALLEL@example.invalid' : 'parallel@example.invalid',
      true,
      false
    );
    rows.push(result.id);
  }
  await Promise.all(rows.map((id) => flow.completeGuestCheckout(id)));
  const results = await Promise.all(rows.map((id) => service.guestById(id)));
  assert.equal(results.filter((r) => r?.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r?.status === 'trial_rejected').length, 1);
  assert.equal(results.filter((r) => r?.collectionId).length, 1);
});

test('private guest checkout waits for YouTube authorization and only the verified buyer can claim its plan', async () => {
  const values = input();
  values.backup.source = 'private_playlist';
  const result = await flow.startGuestCheckout(values, service.newGuestToken());
  const beforeReads = youtubeRequests;
  const beforeMails = mails.length;
  await paid(result.id, 'private-buyer@example.invalid', true);
  const row = (await service.guestById(result.id))!;
  assert.equal(row.status, 'fulfilled');
  assert.equal(row.collectionId, null);
  assert.equal(
    youtubeRequests,
    beforeReads,
    'private content must not use the public scan'
  );
  const status = await service.guestStatus(row);
  assert.equal(status.backupSaved, false);
  assert.equal(status.needsYoutubeConnection, true);
  assert.equal(mails.length, beforeMails + 1);
  assert.match(mails.at(-1)!.text, /has not been read or backed up/);
  await flow.completeGuestCheckout(row.id);
  assert.equal(youtubeRequests, beforeReads);
  assert.equal(
    mails.length,
    beforeMails + 1,
    'fulfillment replay sends no duplicate mail'
  );
  await database.insert(user).values({
    id: 'private-owner',
    name: 'Private owner',
    email: row.email,
    emailVerified: false,
  });
  await assert.rejects(
    service.claimGuest(row.id, 'attacker'),
    /claim_forbidden/
  );
  await assert.rejects(
    service.claimGuest(row.id, 'private-owner'),
    /claim_forbidden/
  );
  await database
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.id, 'private-owner'));
  const claimed = await service.claimGuest(row.id, 'private-owner');
  assert.equal(claimed.privateBackup?.source, 'private_playlist');
  assert.equal(claimed.privateBackup?.url, values.backup.url);
  assert.deepEqual(await service.claimGuest(row.id, 'private-owner'), claimed);
  const [purchased] = await database
    .select()
    .from(order)
    .where(eq(order.orderNo, row.orderNo!));
  assert.equal(purchased.userId, 'private-owner');
  const [plan] = await database
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionNo, purchased.subscriptionNo!));
  assert.equal(plan.userId, 'private-owner');
  assert.equal(
    (
      await database
        .select()
        .from(guardCollection)
        .where(eq(guardCollection.userId, 'private-owner'))
    ).length,
    0
  );
});

test('private checkout intent does not grant an unpaid plan and rejects unsupported sources', async () => {
  const values = input();
  values.backup.source = 'private_playlist';
  const result = await flow.startGuestCheckout(values, service.newGuestToken());
  const row = (await service.guestById(result.id))!;
  await database.insert(user).values({
    id: 'private-unpaid',
    name: 'Unpaid',
    email: 'unpaid@example.invalid',
    emailVerified: true,
  });
  await service.updateGuest(row.id, { email: 'unpaid@example.invalid' });
  await assert.rejects(
    service.claimGuest(row.id, 'private-unpaid'),
    /backup_not_ready/
  );
  await flow.completeGuestCheckout(row.id);
  assert.equal((await service.guestById(row.id))?.status, 'pending');
  assert.equal(
    guestCheckoutSchema.safeParse({
      ...values,
      backup: { ...values.backup, source: 'watch_later' },
    }).success,
    false
  );
});
