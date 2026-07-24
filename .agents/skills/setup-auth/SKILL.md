---
name: setup-auth
description: Configure and verify email/password and Google OAuth for this ShipAny TanStack project, including Cloudflare environment fallbacks and a one-time first-super-admin bootstrap tied to a verified Google email. Use when setting up login for a new project or environment, enabling Google or email sign-in, creating the first super_admin without an existing admin session, or diagnosing “No sign-in methods available” and account_not_linked errors.
---

# Set Up Authentication

Set up a new environment so email registration and Google sign-in work before
any administrator exists. Bootstrap the first `super_admin` only after the
configured Google account completes a verified OAuth login.

## Inputs

Resolve these from the request and repository before asking the user:

- target environment: local or production
- application URL and Google OAuth callback URL
- bootstrap administrator email
- database backend and deployment target
- whether Google One Tap is requested; default to the normal Google button

Ask only for values that cannot be discovered. Never ask the user to paste a
Google Client Secret into chat.

## Fixed decisions

Apply these decisions without reopening the design discussion:

1. Use a separate Google OAuth Client for each website.
2. Store the production Google Client Secret only as a Cloudflare Worker Secret.
   Do not put it in command arguments, tracked files, database seed files, or
   logs. A local secret may live in the gitignored `.env.development`.
3. Make administrator bootstrap single-use. Persist
   `auth_bootstrap_completed_at`; once present, later deployments must never
   restore a removed user or role.
4. Before production mutation, show the Cloudflare account, Worker, hostname,
   database, and administrator email. Require the user to type the production
   hostname exactly; abort on a mismatch.
5. Grant `super_admin` only when Google reports a verified email that exactly
   matches the normalized bootstrap email.
6. Do not create a credentialless placeholder with administrator privileges.
7. If the email already belongs to a credential account, fail closed. Never
   auto-verify, link, or elevate that account.
8. Keep ordinary email/password registration available. Do not add Google-only
   restrictions, MFA requirements, reserved-email rules, special password
   rules, or a new audit subsystem. Do not remove controls already present.

## Workflow

### 1. Inspect before changing anything

Read:

- `src/config/index.ts`
- `src/core/auth/index.ts`
- `src/modules/config/service.ts`
- `src/routes/api/config/public.ts`
- the active schema plus `user`, `account`, `role`, `user_role`, and `config`
- `wrangler.jsonc`, `.env.example`, and `package.json`

Check the current database for the bootstrap email and list its account
providers without returning password hashes or tokens. If a credential account
already exists, stop and explain that explicit account recovery/linking is
required.

For a Cloudflare target, load and follow the `cloudflare` and `wrangler` skills
before running their commands. If deployment is also requested, follow
`deploy-cloudflare` through live verification, then return here.

### 2. Ensure configuration can work before admin login

Preserve the repository's `{ ...envConfigs, ...dbConfigs }` precedence so admin
settings continue to override deployment defaults. Add missing server-only
fallbacks using these names:

```text
EMAIL_AUTH_ENABLED=true
GOOGLE_AUTH_ENABLED=true
GOOGLE_CLIENT_ID=<non-secret client id>
GOOGLE_CLIENT_SECRET=<secret>
BOOTSTRAP_ADMIN_EMAIL=<normalized email>
```

Never expose `GOOGLE_CLIENT_SECRET` through a public config endpoint. The public
endpoint may expose the Client ID and resolved enabled flags.

Ensure the sign-in and sign-up pages use the resolved public flags. Database
settings left by an earlier deployment override the fallbacks; detect stale
values instead of silently assuming the environment values won.

### 3. Ensure one-time Google bootstrap exists

If the project does not already implement it, add the smallest server-side
bootstrap hook or callback flow that:

1. exits immediately when `auth_bootstrap_completed_at` exists
2. normalizes and compares the configured and returned emails
3. requires a Google account and a Google-verified email
4. refuses any pre-existing credential account for that email
5. seeds RBAC if needed
6. creates or links the Google user, assigns `super_admin`, and writes
   `auth_bootstrap_completed_at` atomically

Use unique inserts so retries cannot duplicate `user_role`. A failed grant must
not write the completion marker. Never clear the marker during deployment or
when an administrator is demoted or deleted.

Read and write the completion marker directly inside the database transaction;
do not rely on the configuration service's one-hour cache for this check. If
the auth library cannot include its own user/account insert in that transaction,
keep the role grant and completion marker atomic so failure can leave only a
non-admin Google user.

Do not enable broad automatic linking between arbitrary providers merely to
make this bootstrap work.

### 4. Configure the Google OAuth Client

Create or have the user create a Web application OAuth Client dedicated to this
website. Configure exact URLs, without wildcards:

```text
Authorized JavaScript origin: https://<hostname>
Authorized redirect URI:      https://<hostname>/api/auth/callback/google
```

For local testing, additionally use:

```text
http://127.0.0.1:3000
http://127.0.0.1:3000/api/auth/callback/google
```

Use the actual local hostname consistently; do not mix `localhost` and
`127.0.0.1` across app URL, origin, and callback.

### 5. Apply configuration

For local setup, write non-secret values and the local-only secret to the
gitignored `.env.development`, seed RBAC, restart the dev server, and verify.

For production:

1. run read-only Wrangler identity, Worker, route, and database checks
2. display the five-field target summary
3. wait for the exact hostname confirmation
4. put enabled flags, Client ID, and bootstrap email in Worker vars
5. have the user enter the Client Secret through:

   ```bash
   pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
   ```

6. build, deploy, and verify the live URL

Do not pass the secret with `echo`, a pipe, an argument, or a generated file.

### 6. Verify the complete flow

Verify all of the following:

- `pnpm build` passes after code changes
- `/api/config/public` reports email and Google auth enabled
- `/sign-up` offers email registration
- `/sign-in` offers email and Google login
- the OAuth request uses the intended Client ID and exact callback
- the bootstrap email completes Google login without `account_not_linked`
- the resulting user has a Google account record and permanent `super_admin`
- `auth_bootstrap_completed_at` is set
- signing out and back in can access `/admin`

Re-run the bootstrap check after success and confirm it performs no mutation.

## Failure handling

- **No sign-in methods available:** inspect resolved flags, credential presence,
  and stale database overrides.
- **account_not_linked:** inspect existing account providers and
  `email_verified`. Do not change either automatically.
- **redirect_uri_mismatch:** compare the browser callback byte-for-byte with the
  Google Console URI.
- **Google works but no admin role:** check the verified-email match, RBAC seed,
  transaction failure, and completion marker before retrying.
- **Role was later removed:** leave it removed. The one-time bootstrap must not
  restore it.

Finish with a compact report containing the environment, enabled methods,
administrator email, bootstrap state, verification result, and any remaining
manual Google Console action. Never include secret values.
