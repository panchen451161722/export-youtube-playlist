# Annual Stripe checkout — local implementation and acceptance

Local acceptance recorded: 2026-10-14. Release preparation: 2026-10-15.
Production payment configuration remains a separate, guided step after deployment.

## Catalog

Only `guard_lite_yearly` ($9.90 USD/year, 2 collections), `guard_pro_yearly`
($29.90/year, 15 collections), and `guard_ultra_yearly` ($69.90/year, 50
collections) are available for new purchases. Legacy monthly subscriptions still
resolve their original entitlements. Monthly **backup frequency** is unchanged.
The template demo SKUs are no longer purchasable.

The authoritative catalog is `src/config/pricing.ts`. `stripe_price_ids_mapping`
in Admin Settings → Payment → Stripe maps the three product IDs to Stripe Price
IDs. Checkout retrieves and checks each Price's active flag, mode, currency,
amount and recurring interval before using it. Client-supplied amounts are ignored.

## Configuration

Stripe account verified by API: `acct_1Tk2iZPX7HdkZlWU` (stepan, HK, USD).

Website settings:

- `stripe_enabled`: enable only with the matching environment's credentials and prices.
- `stripe_secret_key`: a website server key, independent of the CLI management key.
- `stripe_signing_secret`: secret for the exact endpoint below, or the CLI listener in local testing.
- `stripe_price_ids_mapping`: JSON product ID → Price ID mapping.
- `stripe_portal_configuration_id`: app-specific portal config, cancellation at period end.
- `default_payment_provider`: `stripe`.
- `app_url`: canonical URL of the environment, used for one callback then a same-origin return.

Website restricted-key permissions: Checkout Sessions, Customers, Subscriptions,
Customer Portal Write; Prices and Invoices Read. No publishable key is needed by
this hosted Checkout redirect flow. Do not install the temporary CLI key as the
production website key.

Prepared production endpoint (disabled until deployment):
`https://exportyoutubeplaylist.com/api/payment/notify/stripe`.
Handler reads **`stripe_signing_secret`**. Snapshot events, API version
`2025-08-27.basil` (installed stripe-node 18.5.0):

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Raw-body async verification rejects invalid signatures and cross-mode events.
Failures return non-2xx so Stripe can retry. Atomic batches on D1/libSQL and stable
row IDs make duplicate delivery safe. Failed renewal pauses access; cancellation
keeps access through the paid period. Billing portal customer IDs are resolved
from the authenticated user's stored subscription; customers are scoped to the
app and user rather than reused by email across unrelated apps.

## Isolated Stripe test-mode resources

No production credentials or user/collection data were copied into the test DB.

| Plan  | Product               | Annual Price                     |
| ----- | --------------------- | -------------------------------- |
| Lite  | `prod_VRPPJkQMNIFFAg` | `price_1UQWamPX7HdkZlWUb0G3ZSKw` |
| Pro   | `prod_VRPPF9axhtbOgR` | `price_1UQWaoPX7HdkZlWUOHwh9qdR` |
| Ultra | `prod_VRPPwfDIgjO0hd` | `price_1UQWaqPX7HdkZlWUotpcfoTe` |

Test portal: `bpc_1UQWasPX7HdkZlWUnsquFuF4`.
Local test server: port 3103, independent `data/stripe-test.db` and gitignored
`.env.stripe.local`. Test credentials and webhook secrets stay encrypted in this
test DB. These temporary CLI test credentials are not production configuration.

## Evidence

- Pricing page shows only $9.90/$29.90/$69.90 per year, in English and Chinese.
- Actual hosted test Checkout with official 4242 card: Lite $9.90/year.
  Session `cs_test_b18WUYFz03Lt1jps0fUh3y6d4ZlkWbIsdy5h2xgflL4Z8DGm0jtubI7KrS`.
- Stripe listener delivery `evt_1UQWesPX7HdkZlWU1od8xuUE` (checkout completed) and
  `evt_1UQWeuPX7HdkZlWUZZxYJLOj` (invoice paid): HTTP 200, handler success.
  Local order paid, one annual subscription, Lite quota 2, automatic return to Collections.
- Three concurrent locally re-signed replays of the actual checkout event:
  HTTP 200/code 0, still one paid order and one subscription, zero template credits.
  Bad signature and cross-mode payload: HTTP 400/code -1.
- Actual cancellation API: `pending_cancel`, paid period retained to October 2027;
  `evt_1UQWgcPX7HdkZlWUMJgagRWS` delivered HTTP 200.
- Billing page opens app-specific Stripe test portal with invoice history,
  payment-method management and scheduled cancellation.
- Monthly checkout rejected. Tampered `price: 1` still creates Pro $29.90/year;
  untrusted redirect replaced by the site's billing page.
- Official declined test card (4000…0002): Stripe rejects payment; no subscription
  for the second synthetic user. Session
  `cs_test_b196DAtvrAWp2pFWEuY8z4FYT2LgWhMBsaFfmgvWdnopdG4v7axh1tzmae` remained unpaid,
  then explicitly expired as cleanup/expiry verification. Event
  `evt_1UQWlzPX7HdkZlWUiHePSxoy` delivered HTTP 200; order became failed and
  the second user still had no subscription.
- Automated service fixtures exercise simultaneous initial callbacks, renewal
  deduplication, failed invoices, expiry without granting, and foreign-user portal denial.
- `pnpm build`, TypeScript and relevant payment/entitlement tests pass.

## Prepared live resources

The user approved adding Products, Prices, Customer Portal and Webhook Endpoints
Write to the existing CLI key, including splitting Core/Billing group Reads into
equivalent per-resource Reads. The saved form was reopened and verified. All 56
Core/Billing children and the unchanged Connect permissions were checked before
saving; other permission groups were preserved. Creation through that same CLI
key then succeeded. The website server key was not substituted for management
access.

| Plan  | Product               | Annual Price                     |
| ----- | --------------------- | -------------------------------- |
| Lite  | `prod_VRaoy9W9YCmdwp` | `price_1UQhcePX7HdkZlWUMIu3b5Eb` |
| Pro   | `prod_VRaoHWCmta0cWN` | `price_1UQhcgPX7HdkZlWUOhW5Advd` |
| Ultra | `prod_VRaovIBq7Ih21M` | `price_1UQhciPX7HdkZlWUIPpea0Ag` |

Live customer portal: `bpc_1UQhckPX7HdkZlWU8FtwgH8X`. Invoice history,
payment-method updates and cancellation at the paid period's end are enabled.

Live webhook: `we_1UQhd7PX7HdkZlWUxGZAmrt3`, with the exact URL, API version and
eight events listed above. It was disabled immediately after creation because
the updated website has not been deployed. Final API readback confirmed
`livemode: true`, `status: disabled` and the expected event set.

The three Price IDs, portal ID and this endpoint's signing secret are saved in
the local `data/codex.db` configuration. Both Stripe secrets are encrypted at
rest. The existing local admin session refreshed the configuration cache;
Admin API returned HTTP 200/code 0 with masked secrets and the new mappings.
The public API reports `guard_checkout_provider: stripe`. Chinese and English
pricing show only the three annual prices and enabled subscribe buttons.

## Verification and deployment boundary

The website live server key is now saved locally. Read-only API checks matched
`acct_1Tk2iZPX7HdkZlWU`, confirmed live Price access and enabled charges/payouts.
The local build and all 16 relevant tests passed again after this handoff. The
website key also retrieved and validated all three live Prices and the dedicated
portal configuration. Other projects' Stripe products and endpoints are untouched.

No live charge was attempted. Production callback delivery is not verified;
the production application's configuration has not been changed. Refund/dispute
policy is unchanged and was not part of this acceptance. Deployment still needs
the same live mappings and endpoint secret in its own config store, followed by
enabling this prepared endpoint after the new handler is available. There was
no deployment or Git commit.

## Production activation — 2026-10-15

After deployment, the production admin had saved the server and signing secrets,
but the annual price mapping and portal configuration were absent. This kept
`guard_checkout_provider` empty: the available free-trial link led directly to
Collections, as designed, without opening Checkout.

Saved the three live mappings above and the dedicated portal ID through the
authenticated production admin configuration API (HTTP 200/code 0). Re-read the
mapping and confirmed the public API reports `guard_checkout_provider: stripe`.
The existing webhook `we_1UQhd7PX7HdkZlWUxGZAmrt3` is now enabled; its URL and
eight subscribed events are unchanged. All three live annual Prices and the
portal configuration were re-read and confirmed active.

Clicked Lite's “Or subscribe now” on the production pricing page. Stripe hosted
Checkout opened successfully for YouTube Playlist Backup Lite at USD 9.90/year,
with the correct two-collection description. Stripe initially offered local CNY
conversion; selecting USD confirmed the catalog amount. Returned using Stripe's
back link without entering payment information or submitting a payment. The
account remains on its website trial. This proves Checkout creation/redirect,
not a completed live charge or signed production webhook delivery. Those claims
must remain separate from the earlier isolated test-mode payment acceptance.

This activation changed runtime configuration only; it did not require another
application deployment.

## Card-required trial implementation — 2026-10-15 (not deployed)

New subscriptions now start through Stripe Checkout with a required card and a
seven-day subscription trial. The chosen annual plan determines both the trial
quota and the subsequent annual price. The website-only `start_trial` action
has been removed; legacy workspace trial dates no longer grant access. Existing
snapshots remain saved, and existing paid subscriptions retain their access.
No database migration is required.

Eligibility is checked server-side against local subscription history and the
app-owned Stripe customer's subscriptions. Previously subscribed accounts cannot
claim another trial. Open Checkout sessions are reused, and clients must confirm
the currently displayed trial eligibility before a Checkout is created. Trial
orders show zero charged and no payment date. Only a successful annual invoice
extends paid access beyond the trial deadline.

Isolated acceptance used `data/stripe-test.db`, localhost:3103, test credentials,
and Stripe's official 4242 test card. Production credentials and billing were not
changed for this verification:

- Checkout `cs_test_b1XHCjXo3E3sZ7WzuwcvZFtdaeqENvSVwhnENQNGteuDy2GFEELxRrdVBO`
  displayed USD 0 today, seven free days, then USD 29.90/year for Pro.
- Subscription `sub_1UQqgjPX7HdkZlWU3pLZq4LE` had a saved payment method,
  trialing status, and a seven-day deadline. The local workspace received Pro's
  15-collection quota only after the confirmed Checkout.
- Cancellation through the website returned `pending_cancel`, preserving access
  to the trial deadline and preventing another free trial.
- The test subscription was resumed and its trial ended early through the Stripe
  test API to exercise conversion without waiting seven days. Annual invoice
  `in_1UQqjUPX7HdkZlWUW3X3aDlw` was paid for USD 29.90 with the test card.
  This forced transition produces `subscription_update`; the handler supports
  it alongside the normal `subscription_cycle` renewal reason.
- The actual paid event `evt_1UQqjXPX7HdkZlWU3WZkiYO8` was replayed twice with
  the local signing secret after the handler fix. Both responses were HTTP 200 /
  code 0, with exactly one annual order and one zero-dollar trial order.
- The test subscription was subsequently canceled immediately to stop future
  test billing. Eligibility then returned `trialEligible: false` and
  `hasSubscription: false`.

All 44 focused tests, TypeScript checking, and the production build passed.
This implementation is not deployed. Stripe's account-level trial reminder
email setting and production scheduler/email activation are separate runtime
configuration; this verification does not claim they are enabled.

## New-subscription account cutover — 2026-10-28 (activated)

Scope confirmed by the user: future subscriptions only; existing subscriptions
continue in the original account. The correct destination is **Playlist Expoter**,
`acct_1UVQkLPhHyOI5tl9` (HK, website `exportyoutubeplaylist.com`). Read-only live API
checks confirm `charges_enabled: true` and `payouts_enabled: true`. CLI profile
`playlist-exporter-target` is verified against that exact ID. A different US
account with the same display name is not the destination.

The original account has three subscriptions referencing this project's live
catalog: one active, one trialing and one past due. Before activation, production used the original live price mapping and portal
listed above. The original secret and signing secret were encrypted. The user
saved both new credentials to encrypted custom staging fields and explicitly
approved production deployment and the new-subscription account switch.

Local compatibility code retains one previous account using
`stripe_legacy_secret_key`, `stripe_legacy_signing_secret`, and
`stripe_legacy_portal_configuration_id`. New Checkout creation uses the current
account. Existing customer/subscription/session/invoice ownership is resolved by
a read-only lookup before selecting a provider; writes are never retried against
another account. Both endpoint signatures are accepted independently, with all
subsequent event lookups using the account whose secret verified the event.
Subscription and guest-trial history checks include both accounts.

The final 29 focused payment/configuration tests pass, including both signed webhook paths, legacy
portal/cancellation, current-only new checkout, rejecting invalid/cross-mode
signatures, failing closed on permission errors, and historical trial eligibility.
Type checking and `pnpm build` passed during preparation. These are local checks,
not evidence of a deployed cutover or actual production callback delivery.

The user approved the four CLI permission changes (Products, Prices, Customer
Portal, Webhook Endpoints → Write). They were saved and verified by the catalog
creation operations. The target live resources are:

| Plan  | Annual USD | Product               | Price                            |
| ----- | ---------: | --------------------- | -------------------------------- |
| Lite  |       9.90 | `prod_VWUPGz8sBkEjZ6` | `price_1UVRR5PhHyOI5tl9Gg9loTv6` |
| Pro   |      29.90 | `prod_VWUQgufoVjsskC` | `price_1UVRRaPhHyOI5tl9Ss5sQOQL` |
| Ultra |      69.90 | `prod_VWUQZ4nQIE7ttn` | `price_1UVRRhPhHyOI5tl9OtTKW2ko` |

Portal `bpc_1UVRSXPhHyOI5tl9YwRNHmRS` is active/live, with invoice history,
payment-method updates, and cancellation at period end without proration.
Webhook `we_1UVRTfPhHyOI5tl9hN37u7Rz` targets
`https://exportyoutubeplaylist.com/api/payment/notify/stripe`, API version
`2025-08-27.basil`, and is now **enabled**. Events:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `checkout.session.expired`,
`invoice.payment_succeeded`, `invoice.payment_failed`,
`customer.subscription.updated`, `customer.subscription.deleted`.
The signing secret was not printed or written to a local file.

The user created a separate website restricted key with Checkout Sessions,
Customers, Subscriptions, and Customer Portal Write; Prices and Invoices Read,
and saved it and the endpoint signing secret in encrypted staging fields. Both
values were then promoted into the standard Stripe settings. The two temporary
`stripe_next_*` fields were removed after successful production verification. These secret-like custom names use the existing
production encryption and masking. An expiring CLI management key is not used
as the website key.

A release directory at `/private/tmp/playlist-stripe-release` contains HEAD plus
only this payment change, excluding the unrelated locale UI/server work. Its
Cloudflare build passes after copying the existing inlang plugin cache; the
initial missing-plugin/translation warnings are resolved. No schema change or
migration is required.

Activation progress:

- Compatibility deployment: `2f24bedf-2e72-48db-8b1e-0ebbf9968abe`.
- Active values were copied directly inside D1 with one guarded INSERT statement;
  credentials never left the encrypted configuration store. Original values are
  retained in `stripe_legacy_*`; the standard template `stripe_secret_key`,
  `stripe_signing_secret`, `stripe_price_ids_mapping`, and
  `stripe_portal_configuration_id` now reference the target account.
- Cache-refresh deployment: `27df5efb-2f09-43ea-b815-7130bba77acd`.
- Original endpoint `we_1UQhd7PX7HdkZlWUxGZAmrt3` remains enabled. Target endpoint
  `we_1UVRTfPhHyOI5tl9hN37u7Rz` was enabled after activation.
- Production homepage returned HTTP 200; public config returned code 0 with
  Stripe enabled and selected as default.
- Automatic approval rejected the template's former live $1 Checkout diagnostic.
  No diagnostic payment was submitted. The template Stripe settings test was
  changed to GET-only validation of configured prices, portal, and API read
  access, returning no customer data; no financial objects are created.
- Preview smoke checks covered 390/768/1440-pixel home layouts, light/dark theme,
  rendered metadata, sitemap and robots, plus build/bundle and security review.
  This was not a complete Lighthouse/CWV measurement or every-route visual audit.
- The local Workers preview required a command-line compatibility-date override
  because its workerd binary predates the production date; production config
  was left unchanged.

Final verification:

- Final deployment: `976cc7fe-9431-4791-a32d-c51dc2d9cf96`.
- Production Admin → Payment → Stripe → Test succeeded using the actual saved
  website key. All three exact target prices returned active/live at 990, 2990,
  and 6990 USD cents per year; dedicated portal
  `bpc_1UVRSXPhHyOI5tl9YwRNHmRS` was accessible. Customers, subscriptions,
  Checkout Sessions, and invoices read requests also succeeded.
- New legacy-setting labels display correctly. Both active credentials and both
  legacy credentials remain encrypted. The two temporary staging records were
  removed only after verifying their ciphertext matched the promoted values;
  database readback confirms zero staging fields remain.
- Final focused suite: 29 passed, zero failed. TypeScript, `pnpm build`,
  Cloudflare build/deploy and the security scan passed.
- No real payment or subscription was created. The blocked $1 diagnostic was not
  executed; the replacement read-only check created no payment objects.
- Target recent events contain catalog/portal setup events only. No signed
  production delivery for the eight subscribed billing events has yet been
  observed. Webhook configuration is enabled, but live delivery and payment
  acceptance are not claimed as verified. Local signed-event fixtures passed.

Future new subscriptions now use `acct_1UVQkLPhHyOI5tl9`; the original three
subscriptions and original webhook remain on `acct_1Tk2iZPX7HdkZlWU`.

### Checkout compatibility incident after cutover

A user retry exposed an account-default difference that the read-only connection
check does not exercise. Stripe request `req_g0iVhWV6TrsiP5` returned HTTP 400:
Managed Payments is enabled by default on the new account and rejects the
integration's explicit `payment_method_types`. Later retries, including
`req_InPpwq3TTzRXnL`, returned `idempotency_error` because the same customer/first
checkout key carried newly generated order metadata and callback parameters.
This was not an existing-subscription eligibility rejection. Readback found zero
Checkout Sessions for the affected customer before the fix.

The provider now explicitly sends `managed_payments[enabled]=false` to retain the
site's original direct-Stripe subscription integration. It uses a versioned
Checkout idempotency namespace and derives a stable authenticated order number
from the existing checkout generation, using the same number in session metadata,
subscription metadata and callback URL. Guest order numbers remain unchanged.
The generation still serializes competing selections; writes are not blindly
retried with random keys. Existing open sessions continue to be reused.

Regression coverage exercises the explicit Managed Payments opt-out and an
ambiguous/lost response followed by a retry with a different generated order
number. Both calls must have identical Stripe parameters and keys, and the
returned order must match the callback and subscription metadata. Final suite:
30 passed, zero failures; typecheck, build and security scan passed.

Fix deployment: `d09aea09-a433-495d-be6c-2065ad80b919`. The user retried the
pricing button and confirmed the Stripe page opened, providing a screenshot.
Read-only verification on the target account found session
`cs_live_b14AOGZfZN8czRnj42HUy8vSB8b0myqwGF2ICPAfH1voHgt4FlETIMISxC`:
`livemode=true`, `mode=subscription`, `status=open`, `payment_status=unpaid`,
`currency=usd`, `product_id=guard_lite_yearly`, `trial_days=7`, and no created
subscription. The screenshot shows Playlist Expoter, Lite, and seven free days.
The customer-operated session was left unchanged. No agent-operated live
financial diagnostic or real payment was performed. Successful Checkout creation
does not yet prove paid activation or production webhook delivery.

Primary references:

- https://docs.stripe.com/payments/managed-payments/update-checkout#remove-unsupported-parameters
- Original request: https://dashboard.stripe.com/acct_1UVQkLPhHyOI5tl9/workbench/logs/req_g0iVhWV6TrsiP5
