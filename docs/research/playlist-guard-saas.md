# Playlist monitoring SaaS — first implementation

This document records successive implementation stages. Earlier provider/scheduler limitations below describe those stages; current behavior and live acceptance results are maintained in [scheduled checks and email notifications](playlist-guard-scheduling.md).

Reference inspected 2026-10-13: https://www.playlistguard.com/pricing/ and https://www.playlistguard.com/ . Public evidence only; browser connector timed out, authenticated workflows were not observed. User requests feature parity using this site's existing appearance, which overrides clone skill's pixel-perfect defaults.

Reference capabilities: 2/15/50 collection plans ($0.99/$2.99/$6.99 monthly), playlist/music/channel sources, private/liked/subscriptions through account connection, metadata snapshots, missing/new item alerts, daily/weekly/biweekly/monthly schedule, export, email delivery, 7-day trial.

Implementation contract: preserve existing public exporter and tools. Add /demo (explicit synthetic demo, no auth or external side effects), /settings/collections (real authenticated workspace), /pricing (new plans; retain noindex). Follow current Inter typography, semantic cream/card/navy tokens, generous whitespace and rounded outlined panels. Support English/Chinese, dark/mobile layouts. Monthly/annual toggle, real selectable tabs, add collection dialog, search/filter, detail/history/missing views, pause/resume, sync and CSV/JSON export. Display configured capabilities honestly. No deployment, real payment, emails, OAuth authorization, or production migration performed by the agent.

Shared API: GET /api/playlist-guard -> GuardOverview; GET ?id= -> GuardCollectionDetail; POST accepts GuardAction, returns relevant object. Shared types in src/lib/playlist-guard/types.ts. Inputs use same-origin cookie session and server validation. Store durable per-user records; derive quotas from verified subscription or one-time trial. Snapshot comparisons must reject incomplete source scans to avoid false missing alerts. Retain known metadata when items disappear.

Proposed annual prices are ten monthly payments ($9.90/$29.90/$69.90), a product draft, not verified reference yearly prices. Keep existing catalog products; add prefixed guard\_\* products. Trial needs no card and is intentionally different from the reference; no automatic charge is claimed.

## Verification and handoff

The previous SEO/content/bundle work was saved as local commit `e295dae`. This SaaS iteration remains a reviewable working-tree change; no deployment or production migration was run.

Local review pages: `http://localhost:3102/zh/demo` and `http://localhost:3102/zh/pricing`, backed by isolated `data/guard-preview.db`. Demo data is synthetic and resets on reload. Public API credentials, mail and checkout are disabled in this preview database.

Verification completed:

- `pnpm build` and `pnpm exec tsc --noEmit` pass. Main client entry 424.64 kB, no 500 kB warning.
- 18 tests pass covering entitlement/prices, trial expiry, owner isolation, concurrency/lease expiry, incomplete scans, CSV formula escaping, demo operations and Stripe period-end cancellation.
- Real HTTP checks: English/Chinese SSR content; pricing/demo noindex; anonymous access401; origin403; trial15/repeat409; unowned collection404; missing provider503.
- Browser: create collection, pause, filter, collection detail/missing list, annual price switch, valid Excel download (verified ZIP/XML rows), Chinese pages and no console errors.
- Actual CSS widths1440,768,480 checked without page overflow. Browser viewport reports2x requested dimensions and enforces a minimum480CSSpx, so390px was not verified.
- Screenshots in `docs/design-references/playlist-guard-{demo,pricing}.jpg`.
- Security scanner clean. No real payments or outbound emails were executed.

Limitations before launch: private playlists/liked videos/subscriptions do not yet have YouTube OAuth support; jobs require an external scheduler; email backups are JSON; source cap500, latest5 snapshots, most recent500 missing-video records; no durable failed-email retry queue. Provider-backed YouTube fetch, paid checkout/webhook and email delivery were not exercised against live accounts. Pricing annual values are draft choices described above.

## Demo revision after reference comparison

The live `/demo/` reference was subsequently inspected in the browser and its public HTML was read. Its key behavior is an automatically narrated-by-cursor product tour inside a 1100×750 window, rather than the standalone workspace UI previously used here.

`/demo` now uses an independent props-driven product tour with the same collection-card hierarchy, contained add/export dialogs, inline detail screen, thumbnail rows, missing/latest tabs, sorting, pagination, and Excel export selection. The scripted cursor follows source selection, URL typing, preferences, creation, details, missing videos, browsing and export. Pause, reset, chapter navigation and manual takeover are available. Autoplay never invokes an API, sends mail or downloads a file; manual export uses the existing spreadsheet exporter. Reduced motion and hidden tabs pause playback. Preview-only restored alerts and separate email scheduling are explicitly labeled.

Verification: final production build and TypeScript pass; demo chunk36.45kB and main424.68kB with no500kB warning. Three focused export/tour tests pass. Browser checks verified source validation, creation, editing frequency with seeded URL, searching, views sort/page2, missing/latest selection, export options/completion and English text/noindex. Actual narrow width480CSSpx and wider layouts had no horizontal page overflow;390px could not be obtained from this browser viewport controller. Final screenshot: `docs/design-references/playlist-guard-demo-v2.jpg`. No deployment.

## Live workspace aligned with the revised demo

`/settings/collections` now shares the demo's collection-card and inline-detail components while using authenticated, user-scoped API queries. Creation, rename/preferences, pause/resume, removal and manual sync persist through the existing service. Details have missing/latest tabs, search, real view-count sorting, pagination, the latest five snapshots and full-version Excel/CSV/JSON export. The selected collection is in the URL so reload and browser navigation retain the detail location. Demo playback/fixtures remain separate from the real workspace.

New snapshots retain YouTube view counts; old records with unknown counts display no invented zero. Rename is validated server-side. All email opt-ins require a configured provider and a verified address. Errors retain the saved collection and expose the failed sync; no-snapshot states do not claim videos are intact. Source-link controls open the original YouTube collection.

Local verification used a disposable account in `data/guard-preview.db` and the existing development YouTube API configuration. The public Corey Schafer Django playlist returned 17 real videos; two manual syncs created two retained snapshots. Browser checks covered creation, rename/frequency persistence after reload, pause/resume/filter, search, pagination, views sorting, historical selection and Excel export completion. No real email, payment or production database was used. Scheduling and mail remain disabled in this preview. This supersedes the initial preview note above that YouTube provider access was disabled.

Build and TypeScript checks pass; 21 focused tests cover permissions/quota/scan integrity, update validation, presentation/export data, demo controls and Stripe cancellation. Narrow list/detail layouts were checked at actual 480 CSS pixels without horizontal overflow (the browser controller's minimum). The shared demo was also smoke-checked after extraction. No deployment or schema migration is required for these workspace UI changes; optional view counts live in existing snapshot JSON.
