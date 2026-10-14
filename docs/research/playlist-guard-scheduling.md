# Scheduled checks and email notifications

The app registers a Nitro task (`server/tasks/playlist-guard.ts`) every five minutes. Node runs the timer while the server is alive; the Cloudflare build generates a native Cron Trigger. Each collection follows its hourly, daily, weekly, fortnightly or monthly frequency. Hourly checks become due 3,600 seconds after the last successful scan, and the next five-minute scheduler tick picks them up. The task dispatches internally to `POST /api/playlist-guard-run`, authenticated with a separate environment-only secret. No external scheduler is required.

## Runtime configuration

Set `PLAYLIST_GUARD_SCHEDULER_ENABLED=true` and a random `PLAYLIST_GUARD_JOB_SECRET` of at least 32 characters on the target runtime. Use a different value from `AUTH_SECRET`. These settings cannot be overwritten through the config table. The protected HTTP endpoint remains available for an external scheduler or manual operations if needed; browsers cannot trigger it with a user session alone.

Configure an existing provider in admin settings: Resend (`resend_api_key`, `resend_sender_email`) or Cloudflare Email Service (`email_provider=cloudflare`, account ID, email sending token and verified sender address). API credentials are not required in committed env files. Users explicitly opt into missing/new item notifications and/or JSON backup delivery. They must verify their account email; the workspace provides a verification-email button even when verification is optional for sign-in.

## Persistence and retry behavior

`guard_delivery` is a durable outbox. A scheduled successful scan and its notification are committed atomically using D1/libSQL batch or a SQL transaction; both writes require the current collection lease. Manual scans never enqueue email. Incomplete scans keep the last successful snapshot and retry after 15 minutes. The runner handles at most five due collections and ten due messages per tick.

Delivery rechecks collection ownership, current entitlement, enabled state, notification preferences and the verified recipient. Changed access, address or opt-outs cancel queued messages. A three-minute lease prevents concurrent dispatch; failures retry after 5, 15, 60 and 180 minutes, stopping after five attempts. Retrying mail does not rescan YouTube. Resend receives a stable idempotency key; Cloudflare delivery is protected by application leases, but an ambiguous provider response followed by a process crash cannot guarantee exactly-once email acceptance. Successful receipts release the stored attachment payload.

The workspace shows pending, sending, provider-accepted, failed or cancelled status. “Accepted” means the provider accepted the request, not proof that a message reached the inbox. Cloudflare permanent bounces and responses with no accepted recipients count as failures. Both providers send the snapshot attachment.

## Local acceptance testing

Use an isolated SQLite database (`file:data/guard-preview.db`), run `pnpm db:push` with that explicit database URL, then build the app. Start `pnpm guard:mail-preview` for a loopback-only mail catcher at `http://127.0.0.1:3103`. Set `PLAYLIST_GUARD_MAIL_PREVIEW_URL=http://127.0.0.1:3103/mail` on the local app process. This transport is explicitly labelled in the UI, refuses external URLs and is disabled in Cloudflare/D1 runtimes. Captures and attachments are stored in gitignored `data/guard-mail-preview` with restricted permissions.

Automated add/remove/failure regression tests run against the in-memory database with a fake sender. Real-provider acceptance tests use an explicitly approved recipient and local test collections clearly labelled as simulations; an adjusted historical fixture can exercise a change event against a fresh real public-playlist scan. Never change a real YouTube playlist just to manufacture a missing-video event. Disable the catcher override before a real provider test, pause its test collections afterward, and leave the user's ordinary collection unchanged.

### Local workspace with Resend

After `pnpm build`, run `pnpm guard:local` to start the local production build. It reads the gitignored `.env.guard.local`, binds to `127.0.0.1:3102`, and uses the isolated `data/guard-preview.db`. This environment file holds the stable local auth, scheduler and configuration-encryption secrets, the YouTube API configuration, and an empty `PLAYLIST_GUARD_MAIL_PREVIEW_URL` to enable real sending. Preserve the encryption key so the saved provider configuration remains readable. Node must support `--use-env-proxy` and `--env-file`.

Resend is selected in the local database's admin configuration; the API key is encrypted using the existing `saveConfigs` service. The sender and app URL are saved there too. No mail-provider keys are included in the startup command or source code. Starting this command enables real scheduled notifications for opted-in, verified accounts in that local database. Checks run only while the process is running. Restore the loopback catcher URL in `.env.guard.local` and restart to switch back to local capture.

The disposable preview account uses the user-approved recipient, whose ownership was confirmed by receipt of the first test email. Existing production accounts and authentication requirements are unchanged. For the automatic delivery test, only that account's single public-playlist collection is made due; the scheduler performs the real scan and normal outbox delivery.

## Deployment boundary

This iteration is not deployed. The new outbox table was pushed only to the isolated local database. Before a later production release, generate and review migrations for the SaaS tables (including `guard_delivery`), apply them through the project's production migration workflow, configure the provider and runtime secret, and deploy the generated Cron Trigger with the application. No production schema or Cloudflare trigger was changed during development.

## Acceptance results (2026-10-13)

- Production Node build, Cloudflare build and TypeScript pass. The generated Worker config contains `*/5 * * * *` and an actual scheduled handler. No deployment was run.
- 31 tests pass, including atomic scan/outbox rollback, expired leases, concurrent delivery, bounded retries without rescanning, opt-out cancellation, verified-recipient gating, provider attachment encoding and Resend idempotency.
- A natural Node cron tick ran the real public Django playlist check, persisted 17 videos, accepted one local notification and produced a valid JSON attachment containing all 17 records. The browser flow also covered sending an actual verification link to the local catcher, verifying the disposable account and then enabling notification preferences.
- Requests with no job secret or an invalid secret return 401. The mail preview transport remains visibly labelled as local capture.
- Initial local testing completed without a real provider configured. On 2026-10-14, a single test email to the user-approved recipient was accepted by Resend using a sending key supplied through a gitignored local file. The test used the application's notification template and Resend provider with the real 17-video snapshot attached as JSON. The user confirmed receiving that first test email before the subsequent local scheduler integration below.

## Resend scheduler acceptance (2026-10-14)

- Encrypted Resend configuration was saved to the isolated local database, and the local mail-catcher override was disabled. The authenticated workspace API reports real email and scheduling capabilities enabled.
- At 08:35 UTC, a natural five-minute cron tick scanned the public playlist, saved a fresh snapshot of 17 videos, and sent one notification through the normal durable outbox to the approved recipient. The collection run count advanced from 5 to 6, the outbox recorded one successful attempt and a Resend message ID, and the snapshot payload was released after acceptance. The application template included its JSON backup attachment. Provider acceptance is recorded; inbox receipt of this second message has not been independently confirmed.
- The workspace API reports the new snapshot and successful delivery, with the next daily check scheduled for 2026-10-15 at 08:35 UTC. A repeat runner call performed zero scans and zero delivery attempts. Missing runner credentials still return 401.
- `pnpm build` and all 31 automated tests pass. Browser access was blocked by the browser tool's URL policy during this pass, so the authenticated API and database were checked instead of claiming a new visual UI verification.
- No production database, provider setting, scheduler or deployment was changed. The local server continues using Resend while `pnpm guard:local` is running.

## Hourly change-only acceptance (2026-10-14)

- The existing local collection was updated through its authenticated API to `frequency=hourly`, `emailDelivery=false`, `notifyAdded=true`, and `notifyMissing=true`. Frontend frequency options, request validation, and the next-run calculation now share hourly support. The email option text explicitly distinguishes change alerts from a backup sent after every scheduled scan.
- A one-time due-time adjustment in the isolated local database allowed immediate testing through the protected scheduled runner. The real YouTube scan at 08:48:50 UTC saved a new 17-video snapshot with zero added and zero removed videos. The runner attempted and sent zero emails. Outbox rows and cumulative delivery attempts both stayed at four, confirming no provider send was invoked.
- The next due time was 09:48:50 UTC, exactly 3,600 seconds later. An immediate repeat runner invocation performed no scans or mail attempts. Local snapshots still save on successful checks; only routine email backup delivery is disabled.
- All 33 tests, TypeScript checking, and `pnpm build` pass. New regression coverage checks the hourly boundary, no mail for unchanged IDs even when metadata changes, no repeated alert on an unchanged later scan, and independent addition/removal alerts without backup attachments. Positive event cases use an in-memory database and a fake sender; no extra real test email was sent. No deployment was run.

## Real change-alert acceptance (2026-10-14)

- Two isolated local test collections used the same public source with explicitly labelled simulated history. The addition fixture contained 16 of the current 17 videos; the missing fixture contained all 17 plus one synthetic test-only entry. The original collection and the YouTube playlist were not changed.
- The protected scheduled-runner API queried YouTube normally, saved both fresh 17-video snapshots, and detected exactly `added=1, removed=0` and `added=0, removed=1`. The missing entry was retained in the test collection's missing-video history. Both collections had change alerts enabled and email backup delivery disabled.
- The normal durable outbox and Resend provider sent one Chinese notification for each case to the user-approved recipient. Both were accepted at 08:52 UTC with distinct provider message IDs, one attempt each, no errors and no backup attachments. The email subject and collection name clearly identify simulated test events. The user subsequently confirmed receiving both messages.
- Authenticated detail API readback confirmed the snapshots and delivery state. Repeating the runner sent nothing, and no pending mail remained. Both test collections were paused after verification. A hash comparison confirmed the original collection's document was unchanged, including its hourly change-only preferences and next check time.
- This pass changed local test data and this acceptance record only; application source was unchanged from the preceding successful build and 33-test run. No deployment was performed.

## Test cleanup and saved state (2026-10-14)

- After the user confirmed receipt, both simulation collections were removed using the authenticated application API. Soft deletion releases their collection slots, clears source reservations and scheduled times, and retains historical delivery receipts locally. The workspace now lists only the original collection, and no mail is pending.
- The original collection's stored document was unchanged by cleanup: hourly checks, addition/removal alerts enabled, routine email backup disabled. Provider keys, local runtime secrets, database files and captured mail remain gitignored; local environment variants are also excluded from Docker build context.
