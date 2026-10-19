import type { GuardEntitlement } from '@/lib/playlist-guard/types';

type ReviewGrant = { email: string; expiresAt: string; limit: number };

/** Server-only runtime secret. Keep this out of envConfigs and public configuration. */
export function reviewAccessConfiguration(): unknown {
  const runtime = globalThis as typeof globalThis & {
    __CF_ENV__?: Record<string, unknown>;
    __env__?: Record<string, unknown>;
  };
  return (
    runtime.__CF_ENV__?.PLAYLIST_GUARD_REVIEW_ACCESS ??
    runtime.__env__?.PLAYLIST_GUARD_REVIEW_ACCESS ??
    (typeof process !== 'undefined'
      ? process.env.PLAYLIST_GUARD_REVIEW_ACCESS
      : undefined)
  );
}

/** Invalid configuration grants nothing; wildcard/domain grants are never supported. */
export function activeReviewGrants(value: unknown, now: number): ReviewGrant[] {
  if (
    typeof value !== 'string' ||
    value.length > 16_384 ||
    !Number.isFinite(now)
  )
    return [];
  try {
    const entries: unknown = JSON.parse(value);
    if (!Array.isArray(entries) || entries.length > 20) return [];
    const result: ReviewGrant[] = [];
    const emails = new Set<string>();
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry))
        return [];
      const grant = entry as Record<string, unknown>;
      if (
        Object.keys(grant).sort().join(',') !== 'email,expiresAt,limit' ||
        typeof grant.email !== 'string' ||
        typeof grant.expiresAt !== 'string' ||
        typeof grant.limit !== 'number' ||
        !Number.isInteger(grant.limit) ||
        grant.limit < 1 ||
        grant.limit > 50
      )
        return [];
      const email = grant.email.trim().toLowerCase();
      if (
        email.length > 254 ||
        !/^[^\s@*]+@[^\s@*]+\.[^\s@*]+$/.test(email) ||
        emails.has(email) ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
          grant.expiresAt
        )
      )
        return [];
      const expires = Date.parse(grant.expiresAt);
      if (
        !Number.isFinite(expires) ||
        new Date(expires).toISOString().replace('.000Z', 'Z') !==
          grant.expiresAt.replace('.000Z', 'Z')
      )
        return [];
      emails.add(email);
      if (expires > now)
        result.push({
          email,
          expiresAt: new Date(expires).toISOString(),
          limit: grant.limit,
        });
    }
    return result;
  } catch {
    return [];
  }
}

export function withReviewAccess(
  entitlement: GuardEntitlement,
  owner: { email: string; emailVerified: boolean } | undefined,
  configuration: unknown,
  now: number
): GuardEntitlement {
  if (owner?.emailVerified !== true) return entitlement;
  const email = owner.email.trim().toLowerCase();
  const grant = activeReviewGrants(configuration, now).find(
    (entry) => entry.email === email
  );
  if (!grant) return entitlement;
  return {
    ...entitlement,
    limit: Math.max(entitlement.limit, grant.limit),
    review: { limit: grant.limit, expiresAt: grant.expiresAt },
  };
}
