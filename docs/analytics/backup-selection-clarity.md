# Anonymous backup selection recording

Status: deployed and smoke-tested on 2026-10-27 UTC (2026-10-26 Los Angeles).

Cloudflare version: `c49cd936-677e-40d5-8a40-e3d4add94b67`.

The anonymous, query-free `/youtube-playlist-backup` page (including locale
variants) may load Clarity. It continues to exclude advertising, other analytics,
and customer-service scripts. Playlist URL input is explicitly masked. The only
additional custom event is `page_view` with `page_type=backup_selection`; account,
playlist, and payment identifiers are not added to event payloads.

Any query string, including `guest`, `setup`, and `youtube` callbacks, keeps this
route private. Any auth session cookie, including an expired or unresolvable
cookie, also prevents recording. Private responses retain their tracker-blocking
CSP and `private, no-store` caching policy.

Public pages, anonymous backup selection, and private pages use separate document
boundaries. Crossing a boundary reloads the document. If an account signs in in
another tab, the recorded document suppresses its route content and toast portal
before reloading. The guard remains active even if root loader data is refreshed.

Clarity's existing regional defaults, stored refusal, GPC, and DNT handling are
unchanged. No consent-granted signal is introduced. Localhost recording remains
disabled.

Validation:

- `node --import tsx --test src/lib/private-document.test.ts src/lib/clarity-bootstrap.test.ts src/lib/analytics.test.ts src/lib/backup-draft.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- Local production HTML/CSP checks for anonymous English/Chinese selection,
  payment/YouTube/unknown query parameters, both auth-cookie forms, and sign-in.
  These checks inspect responses without executing or sending data to Clarity.

This is an observability/privacy change, with no registration, pricing, or
checkout variant. No A/B experiment is launched and no conversion improvement is
claimed.

Production verification:

- Anonymous homepage, channel export and bare backup-selection documents include
  Clarity. English/Chinese backup pages permit it in CSP; the German backup URL
  follows the site's existing redirect to the English page.
- Both supported auth-cookie forms (tested with invalid dummy values), sign-in,
  callback and unknown query parameters exclude Clarity and keep private CSP.
- In an anonymous Chrome session, homepage → backup navigation retained the same
  `_clsk` session ID and advanced its page counter from 4 to 5. The backup page's
  Clarity collector returned HTTP 204. No consent-granted override was used.
- The anonymous backup-plan dialog opens and renders Lite/Pro/Ultra options.
- With the repository's test playlist URL (no checkout or export submitted), the
  dialog's sign-in link opens the expected sign-in page. A fresh load of sign-in
  shows zero Clarity requests in Chrome Network (filtered by `clarity.ms`).
- This checks browser-side continuity and delivery; it does not establish
  availability or rendering quality of the processed replay in the Clarity UI.

Existing UX issue observed, outside this release: clicking the dialog's sign-in
link with an empty URL or channel handle produces the browser-storage error
message. `persist()` rejects an invalid playlist URL as well as storage failures,
but the link treats both alike. This behavior predates this release; no conversion
change or A/B test was made here.
