import assert from 'node:assert/strict';
import test from 'node:test';

import type { GuardEntitlement } from '@/lib/playlist-guard/types';

import { activeReviewGrants, withReviewAccess } from './review-access';

const now = Date.UTC(2026, 9, 18);
const grant = {
  email: 'reviewer@example.invalid',
  expiresAt: '2026-11-17T23:59:59Z',
  limit: 10,
};
const free: GuardEntitlement = {
  plan: 'free',
  limit: 0,
  trialEndsAt: null,
  canStartTrial: false,
};

test('review grants require exact normalized verified email, without alias or domain matching', () => {
  const raw = JSON.stringify([
    { ...grant, email: ' Reviewer@Example.Invalid ' },
  ]);
  const allowed = withReviewAccess(
    free,
    { email: 'REVIEWER@example.invalid', emailVerified: true },
    raw,
    now
  );
  assert.equal(allowed.plan, 'free');
  assert.equal(allowed.limit, 10);
  assert.deepEqual(allowed.review, {
    limit: 10,
    expiresAt: '2026-11-17T23:59:59.000Z',
  });
  assert.equal(JSON.stringify(allowed).includes('example.invalid'), false);
  for (const owner of [
    undefined,
    { email: grant.email, emailVerified: false },
    { email: 'reviewer+alias@example.invalid', emailVerified: true },
    { email: 'review.er@example.invalid', emailVerified: true },
    { email: 'other@example.invalid', emailVerified: true },
    { email: 'reviewer@google.com', emailVerified: true },
  ])
    assert.deepEqual(withReviewAccess(free, owner, raw, now), free);
});

test('review grants fail closed for expiry, malformed config, wildcard and invalid limits', () => {
  for (const value of [
    undefined,
    '',
    '{broken',
    '{}',
    'null',
    JSON.stringify([null]),
    JSON.stringify([{ ...grant, limit: 0 }]),
    JSON.stringify([{ ...grant, limit: -1 }]),
    JSON.stringify([{ ...grant, limit: 51 }]),
    JSON.stringify([{ ...grant, limit: 1.5 }]),
    JSON.stringify([{ ...grant, limit: '10' }]),
    JSON.stringify([{ ...grant, email: '*@example.invalid' }]),
    JSON.stringify([{ ...grant, email: '@example.invalid' }]),
    JSON.stringify([{ ...grant, expiresAt: '2026-11-17' }]),
    JSON.stringify([{ ...grant, expiresAt: '2026-02-30T00:00:00Z' }]),
    JSON.stringify([{ ...grant, expiresAt: 'invalid' }]),
    JSON.stringify([{ ...grant, expiresAt: new Date(now).toISOString() }]),
    JSON.stringify([{ ...grant, expiresAt: new Date(now - 1).toISOString() }]),
    JSON.stringify([{ ...grant, permanent: true }]),
    JSON.stringify([grant, { ...grant, email: grant.email.toUpperCase() }]),
    JSON.stringify(
      Array.from({ length: 21 }, (_, i) => ({
        ...grant,
        email: `${i}@example.invalid`,
      }))
    ),
  ])
    assert.deepEqual(activeReviewGrants(value, now), [], String(value));
  assert.deepEqual(activeReviewGrants(JSON.stringify([grant]), Number.NaN), []);
  assert.deepEqual(activeReviewGrants(' '.repeat(16_385), now), []);
});

test('review allowance never changes paid plan identity or reduces paid allowance', () => {
  for (const paid of [
    { ...free, plan: 'lite' as const, limit: 2 },
    {
      ...free,
      plan: 'pro' as const,
      limit: 15,
      trialEndsAt: '2026-11-01T00:00:00.000Z',
    },
    { ...free, plan: 'ultra' as const, limit: 50 },
  ]) {
    const owner = { email: grant.email, emailVerified: true };
    const result = withReviewAccess(paid, owner, JSON.stringify([grant]), now);
    assert.equal(result.plan, paid.plan);
    assert.equal(result.limit, Math.max(paid.limit, 10));
    assert.equal(result.trialEndsAt, paid.trialEndsAt);
    assert.deepEqual(withReviewAccess(paid, owner, '[]', now), paid);
  }
});
