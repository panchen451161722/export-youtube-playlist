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
