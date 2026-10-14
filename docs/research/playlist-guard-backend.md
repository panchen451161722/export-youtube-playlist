# Playlist monitoring backend

Implemented for the local first version; not deployed. Production requires an additive reviewed database migration, provider configuration, and explicit enablement of the built-in scheduler. See [scheduled checks and email notifications](playlist-guard-scheduling.md) for the latest runtime setup and acceptance results.

## Storage and access

- `guard_workspace`: durable, one-time 7-day / 15-collection trial. Starting a trial is explicit, with no charge.
- `guard_delivery`: durable per-snapshot email outbox with bounded retries, delivery leases and provider receipts.
- `guard_collection`: per-user collections, soft deletion, unique quota slots, last known missing-video metadata, and up to 5 snapshots. Each scan is limited to 500 public videos; retain the most recent 500 missing-video records. Older snapshots may be pruned earlier to stay below the D1 row-size boundary (1.5 MB document budget).
- Paid access uses only an active, trialing, or pending-cancel provider subscription with an unexpired paid period and a recognized `guard_lite_monthly`, `guard_lite_yearly`, `guard_pro_monthly`, `guard_pro_yearly`, `guard_ultra_monthly`, or `guard_ultra_yearly` product. Limits: 2 / 15 / 50 collections.
- Expiry or downgrade preserves saved data and export access. Sync is restricted to slots covered by the current plan. Deleting a collection frees its quota slot; paused collections still occupy a slot.
- Database unique constraints reserve quota atomically. Optimistic document updates and durable 3-minute scan leases work without holding a SQL transaction over the YouTube request. These do not depend on process-local locks or D1 transaction emulation.
- All authenticated actions scope owner ID from the session, never the body. Cookie-based mutations require same-origin JSON and enforce an 8 KB streamed body limit. New sources are normalized to YouTube IDs and fetched only through the existing fixed Google API client.

## Routes

`GET /api/playlist-guard` returns `{ collections, entitlement, capabilities }`; append `?id=<collection-id>` for a detail, including history and missing items. Responses use the standard `respData` envelope and `Cache-Control: no-store`.

`POST /api/playlist-guard` accepts the shared `GuardAction` union. Start trial, create, sync, edit preferences, pause/resume and soft-delete are implemented. Create reserves the collection and attempts its first snapshot. If YouTube fails, creation still succeeds with `lastError` and empty history so the user can retry or remove it. Manual sync never sends email. Sync attempts are spaced by at least one minute per collection.

A fully scanned source is required before committing a snapshot. Truncated (>500 items) or failed upstream results preserve the last successful snapshot. An inaccessible video on a complete scan is tracked as missing with its previously saved metadata; unavailable metadata cannot be reconstructed if it was never saved. Sources that are entirely private/deleted return a scan error, not a false mass-deletion alert. Duplicate videos within a playlist are tracked once by video ID.

## Scheduler and email

`POST /api/playlist-guard-run` is a separate machine endpoint. It requires `Authorization: Bearer <PLAYLIST_GUARD_JOB_SECRET>` and `PLAYLIST_GUARD_SCHEDULER_ENABLED=true`. Secret length must be at least 32 characters. A built-in Nitro task invokes it internally every five minutes on Node and generates the native Cloudflare Cron Trigger at build time. The flag remains off by default until the runtime is configured; it is currently enabled only in the isolated local preview.

The built-in invocation cadence is every 5 minutes; the protected endpoint also supports external invocation. A call processes at most 5 due collections sequentially; per-collection preferences determine the next date (hourly, daily, weekly, 14 days, or 30 days). Overlapping invocations cannot claim the same collection twice. Large deployments need a queue or additional scheduled invocations; this initial bounded runner is not a large-scale scheduling system.

After a successful scheduled scan, the configured email manager sends only to the owner's verified email. Missing/new alerts follow their individual preferences. `emailDelivery` requests a JSON metadata backup on each scheduled scan, even when nothing changed. The JSON file is attached only when that preference is enabled. Snapshot persistence and outbox insertion are atomic. Failures retain the snapshot and retry delivery at most five times, without rescanning YouTube. Before each send, the outbox rechecks ownership, verified recipient, entitlement and current notification preferences. Resend uses a stable idempotency key. User-authorized local live tests confirmed receipt of both addition and missing-video notifications; the detailed record is in the scheduling document.

Private playlists, liked videos and subscriptions require a future YouTube OAuth connection; `privateSources` remains false.

## Verification

Run `node --import tsx --test src/modules/playlist-guard/*.test.ts src/routes/api/-playlist-guard.test.ts src/lib/playlist-guard/*.test.ts src/config/guard-plans.test.ts src/core/payment/stripe.test.ts src/core/email/cloudflare.test.ts`.

Tests use an in-memory SQLite database and fake scan results. They cover missing/reappearing video metadata, retention, one-time trial/expiry, concurrent quota reservation, owner isolation, concurrent sync claims, incomplete/failing scan preservation, origin/content-type/body limits, source normalization and scheduler configuration gates. No external provider calls occur.

All three committed schema dialect templates contain the three new tables. Apply local `pnpm db:push` only to an isolated development database; production uses reviewed generated migrations.
