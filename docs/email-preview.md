# Branded transactional emails — local review

Status: implemented and verified locally on 2026-10-28. Not deployed. No production emails or payments were sent. The screenshots use fixture data.

## Behavior

- Scheduled YouTube collection checks use the existing durable notification queue. Only enabled change categories are shown; unchanged collections stay quiet unless routine backup delivery is enabled. Optional JSON snapshot attachments remain intact. The existing consent, verified-recipient, retry and deduplication checks are unchanged.
- New registered-user subscriptions queue an activation email when checkout is created and deliver it only after a provider-confirmed successful activation, including free trials. Pending mail is retried by callbacks, webhooks and the existing scheduled task. Atomic claims prevent concurrent duplicate sends. Failures do not undo a successful subscription; up to five provider attempts are made.
- Guest subscriptions combine activation confirmation and the existing one-hour, single-use account-claim link. Trial eligibility is resolved before fulfillment sends the email; rejected trials do not receive a welcome. Private playlist onboarding continues to explain that YouTube authorization is still required. Claim-link resends after cancellation do not claim that the plan is active.
- Routine renewals do not send another welcome. Previously completed registered-user purchases have no new delivery marker and are not backfilled. Delivery state is stored inside the existing order checkout metadata; no schema migration is required.
- English, Chinese and German emails share a pale pink header, the existing navy E logo and a rose action button. Currency and dates come from persisted provider records. Dates explicitly use UTC; trial activation is not represented as a paid receipt. The current German billing/collection destinations retain the site's English fallback.
- The existing configured email provider is reused. No new credentials, external tracking or conversion analytics were added. Sending is at-least-once around a process crash after a provider accepts a message; providers without an idempotency API cannot promise exactly-once delivery.

## Preview

Run `node --import tsx scripts/preview-brand-emails.ts`, then serve `data/email-brand-preview` on loopback port 3104. This only writes HTML/text fixtures and a copy of the existing logo; it never calls a mail provider. The generated files include `changes-en.html`, `trial-en.html`, `paid-en.html` and their Chinese/German variants.

## Validation

50 tests passed across subscription templates, payment lifecycle, guest fulfillment/claims, and scheduled notifications. TypeScript and `pnpm build` passed. Desktop rendering and 390-pixel mobile layouts were inspected, including German subscription and Chinese change notifications; no horizontal overflow was observed. Logo loading was verified. These are browser-rendered email previews, not live Gmail/Outlook delivery tests.

This is transactional information and a requested brand update, not a launched conversion experiment. Existing CONV-2026-10-28-LITE and RET-2026-10-28 remain not run; no conversion or retention lift is claimed. Deployment is pending the user's later decision.
