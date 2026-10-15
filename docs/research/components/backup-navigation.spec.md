# Playlist Backup navigation and collection dialog

## Current scope

The header uses Playlist Backup, with no standalone Demo navigation item. The avatar menus link to Collections. The public EN/ZH Backup page keeps the prominent Add New card: guests go to localized Pricing; signed-in users open the real collection setup dialog. Watch Demo now opens the standalone localized /demo page, which has a return link to Playlist Backup and remains noindex. Pricing also links to /demo.

## Live reference inspection (2026-10-14)

At the user's request, used OpenCLI with the logged-in Chrome Browser Bridge to inspect https://www.playlistguard.com/youtube/schedule/. Opened Add New, read the visible form fields and computed styles, captured a local screenshot, then cancelled without submitting or changing reference account data.

The reference creation flow is Type → URL → Backup Frequency → Notifications, with Cancel/Create in the footer and no required name field. It also offers private sources, restored alerts and optional export email schedules. This adaptation uses the existing site's theme, daily/weekly/biweekly/monthly checks, and added/missing/restored alerts. The user subsequently requested all six source types and real YouTube account integration; see the authorization section below. Restored-alert controls are now available in the real workflow, following the subsequent user request described below.

## Implementation

- Shared CollectionDialog supplies a wider dialog, stronger backdrop, separated header, accessible close control, scrollable body and mobile-safe viewport bounds. Used by Backup setup and Collections create/edit.
- Creation needs source, URL, frequency and notifications. The API still receives a nonempty name derived from source type and URL identifier; users can rename later. It does not pretend to have fetched the YouTube playlist title.
- New collections default to daily checks and enabled added/missing/restored alert preferences, even before email setup. Sending requires configured email delivery and a verified account email. Email backup is off and hidden on creation. Existing collection values initialize editing exactly, and only changed fields are patched. Existing email-backup settings remain editable and are never silently overwritten.
- Real API/account limits, verification, service-availability, trial and upgrade gates remain in place. Cancel and close work even when creation is unavailable; mutations lock dismissal while pending.
- Demo data and interactions remain local to the demo page and never perform real collection/email operations.

## Local environment repair

Browser verification found that the development database used on port 3002 lacked all three guard tables. Backed up data/codex.db to /tmp/playlist-backup-codex-before-schema.db and ran pnpm db:push. Schema comparison confirmed only guard_collection, guard_workspace, guard_delivery and their indexes were added; no existing schema objects changed or were removed. The original guard-preview database, collection settings and email runtime were not modified.

## Verification

- Production build and TypeScript pass; existing tour/presentation/export tests pass (4 tests).
- Chrome confirms Watch Demo navigates to /zh/demo with its own H1 and return link, and the Backup page no longer renders the embedded tour.
- Isolated browser form checks (no real API writes): empty URL blocked; playlist/channel create parameters include a generated name; new defaults daily + added/missing alerts + emailDelivery false; cancel submits nothing; editing preserves saved frequency/notification values; renaming only patches name.
- Narrow-screen dialog checked at 390 × 844. Temporary browser test harness removed after verification.
- No deployment, commit, real collection creation/deletion, or email send in this revision.

## YouTube accounts and six source types (2026-10-14)

YouTube account management lives above the collection list at `/settings/collections`, reached through the avatar menu. Users can connect multiple YouTube channels, see connection state, reconnect a channel, or disconnect it locally. Google site login remains separate. Disconnection clears local access/refresh credentials; existing collections and snapshots remain saved, and their private checks fail safely until reconnected.

Add Collection exposes public playlist, private playlist, liked videos, liked music, public channel, and subscriptions. Private playlists require a connected account and URL. Likes, music, and subscriptions require an account without a URL. The form retains daily checks, added/missing alerts, and email backups off for new collections. Existing settings are preserved when editing. Account IDs are scoped to the authenticated user on every create, scan, refresh and disconnect.

The server uses a separate Google OAuth flow with `youtube.readonly`, offline access, PKCE, an encrypted ten-minute state cookie bound to the site session, and fixed return paths. Access/refresh tokens are encrypted with the existing AES-GCM helper and never included in account-list responses. Refresh failure requests reconnection. Mutation requests enforce origin/JSON and bounded bodies.

Authorized reads use the official YouTube Data API:

- Private playlists: `playlistItems.list` and `videos.list` with the owner's access token.
- Liked videos: `videos.list(myRating=like)` with pagination.
- Liked music: the liked-video result filtered by YouTube Music category ID 10. This is explicitly described in EN/ZH UI and may differ from YouTube Music's dedicated Liked Music collection.
- Subscriptions: `subscriptions.list(mine=true)` backs up subscribed channel metadata and detects new/removed subscriptions. It does not back up every upload from each channel. Channel exports and email alerts use channel labels.

Reads that fail, return malformed pagination, or exceed the existing 500-item scan limit never replace a successful snapshot or report all entries missing. Automatic checks also work when only OAuth access is configured; the public API key is not required for private-source scans. Unchanged scans send no email when email backup delivery is off. Manual checks remain silent.

### Local verification

- 34 isolated tests pass, including authorization/state validation, credential encryption and refresh, ownership isolation, all authorized readers, pagination failures, subscription exports, and OAuth-only scheduled change/no-change notifications. Tests use in-memory databases and fake Google/email responses; no real mail is sent.
- Browser checks use the actual form with a temporary simulated-account harness: all six types expose the right fields, missing-account submission is blocked, private playlist names use the playlist ID, subscriptions submit without a URL, and daily/change-only/no-email-backup defaults persist.
- Mobile dialog checked at 390 × 844. Temporary harness and reference/test tabs removed.
- `pnpm build`, `pnpm exec tsc --noEmit`, and `git diff --check` pass.
- The local development database gained only the `youtube_connection` table/indexes for this increment. A local encryption key was generated in the ignored `.env.development`; its value is never committed. Original collections and the separate mail-preview database were not changed.

### Deferred live authorization check

The user explicitly requested real Google authorization testing **after launch**. No real consent flow, private Google-data read, or live email test was performed for this increment; passing fixture tests does not verify those live integrations. There has been no deployment or commit.

At a future authorized deployment, review/generate the production migration for the new `youtube_connection` table before applying it, configure a stable `CONFIG_ENCRYPTION_KEY` secret, reuse the configured Google OAuth client, enable the YouTube Data API, and register the production application's exact `/api/youtube-connections/callback` redirect URI. Testing-mode consent requires the intended test Google account; public release needs the appropriate Google consent/verification configuration. Then validate connection, private-source initial backup, scheduled no-change/change checks, reconnect and disconnect with a real account. Do not rotate the encryption secret without a credential migration/reconnection plan.

Official API references: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [video ratings](https://developers.google.com/youtube/v3/guides/implementation/ratings), [playlist items](https://developers.google.com/youtube/v3/docs/playlistItems/list), [subscriptions](https://developers.google.com/youtube/v3/docs/subscriptions/list).

## Daily minimum frequency (2026-10-14)

The user requested removal of hourly checks. The shared frequency list now has daily, weekly, biweekly and monthly only, covering both the real setup form and demo backup/export selectors. New real collections and demo drafts default to daily. EN/ZH Backup and Pricing copy match the available choices. API create/update validation rejects hourly values.

Legacy hourly documents are read as daily without changing alert or email-backup preferences. The scheduler defers an obsolete one-hour deadline to at least 24 hours after the last successful scan; subsequent scans/saves persist daily in the collection document. Existing failed-scan retry behavior is retained. This change does not deploy or directly rewrite the user's database.

## Notification defaults before email setup (2026-10-14)

The user requested that change notifications be checked by default before configuring Resend in the runtime environment. Both real creation entry points now default added/missing preferences to true independently of provider readiness. The user can toggle them before setup; editing preserves existing saved choices. Routine backup email remains off and retains its setup/verified-email gate.

The API permits saving change-alert preferences before provider setup or address verification. Actual scheduled delivery still requires a verified address and configured mail provider. While no email provider is configured, scans save snapshots without queuing new alerts, and pending deliveries do not consume retries. Once configured, future changes can send notifications; historical changes from before setup are not replayed. EN/ZH hints explain this distinction.

Browser verification with the real form and a temporary no-mail fixture confirmed checked/editable defaults, successful simulated submission with daily frequency and emailDelivery=false, and preservation of disabled preferences on existing collections. No real API write or email was sent; the temporary harness was removed.

## Restored-item notifications (2026-10-14)

Added the missing third notification checkbox to real Backup setup and Collections create/edit, with EN/ZH copy matching the demo. All three preferences default on for newly created collections, including before email setup; routine email backups remain off. Existing collections that lack `notifyRestored` treat it as false until the user opts in. Editing patches only changed fields.

Complete scans now classify a returning ID from the tracked missing list as `restored`, separately from truly new IDs. A return removes the entry from the missing list and is not counted twice as an addition. Initial baselines and unchanged scans do not trigger restored alerts. Older snapshots without the count remain readable. The new preference/count are stored in existing collection JSON, requiring no schema change.

The scheduled notification outbox, localized email report and snapshot summary support restored events. Disabling restored notifications before a queued restoration is delivered cancels that pending message. Provider-readiness, verified-email checks, manual-scan silence and retry behavior are unchanged. A restored-only event can notify with addition/removal preferences off.

Validation uses in-memory databases and fake mail senders, plus the actual browser form with simulated callbacks: three default checks, create payload including notifyRestored=true, legacy restoration preference off, and a restored-only edit patch. No real Google read or email send was performed.
