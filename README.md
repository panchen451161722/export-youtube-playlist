# ShipAny Next

A headless SaaS engine for building AI-powered products with Claude Code. Pre-wired business logic (payments, credits, subscriptions, auth, RBAC, i18n, CMS) with minimal UI — you build your product pages on top.

## Quick Start

```bash
pnpm install
cp .env.example .env.development   # then fill in the values (AUTH_SECRET etc.)
pnpm db:push
pnpm rbac:init --admin-email=admin@example.com --admin-password=your-password
pnpm dev
```

> Local env lives in `.env.development` (gitignored). It is loaded by both Vite
> (`vite dev`) and the `db:*` scripts. Only `VITE_APP_URL`, `VITE_APP_NAME`,
> `DATABASE_PROVIDER`, `DATABASE_URL`, and `AUTH_SECRET` are required to boot.

## Features

- **Auth** — Email/password + Google/GitHub OAuth via better-auth
- **Payment** — Stripe, PayPal, Alipay, WeChat Pay (checkout, subscriptions, webhooks)
- **Credits** — FIFO consumption, expiration, auto-grant on signup
- **RBAC** — Roles, permissions, wildcard matching, admin panel management
- **API Keys** — CRUD + validation
- **Invite Codes** — Trial activation, batch generation, usage tracking
- **CMS** — Categories and posts with full CRUD
- **Image Upload** — Drop / paste / click uploader; uses S3/R2 if configured, falls back to inline base64 (size-capped) stored in DB
- **i18n** — English + Chinese via Paraglide JS (compiled messages, dot-keyed JSON), locale-aware routing
- **Admin Panel** — Full-featured admin with grouped sidebar navigation:
  - **RBAC** — Users (role assignment), Roles (permission management), Permissions
  - **Content** — Categories, Posts (with status tabs, category selector)
  - **Billing** — Payments, Subscriptions, Credits (with type/status tabs)
  - **Settings** — Collapsible config groups (General, Auth, Payment, Email, Storage, AI)
  - System switcher dropdown (Admin / Dashboard / Landing)
- **Dashboard** — Client-side rendered with shadcn sidebar
- **MDX Pages** — Privacy policy, terms of service (content in `src/content/pages/`), extensible via skill
- **Database** — SQLite (dev) / PostgreSQL / MySQL via Drizzle ORM
- **All code self-contained** — no external packages for business logic

## Tech Stack

- TanStack Start (RC, Vite 8 + nitro, React 19, TypeScript)
- TanStack Query, Form, and Table for data, forms, and tables
- shadcn/ui v4 (Base Nova style, Tailwind CSS 4)
- better-auth + Drizzle ORM
- Paraglide JS for i18n

## Project Structure

```
src/
├── core/           # Infrastructure (db, auth, payment, email, storage, ai, i18n)
├── modules/        # Business logic (payment, credits, subscriptions, apikeys, rbac, posts, taxonomy)
├── config/         # Environment, DB schema, locale names
├── routes/         # File-based routes (locale-free paths; /zh prefix via router rewrite)
│   ├── *.tsx       # Pages (landing, auth, settings, admin, legal)
│   └── api/        # Server routes (REST endpoints)
├── content/pages/  # MDX content for static pages
├── hooks/          # Shared react-query hooks
├── components/     # Shared UI (app-layout, app-sidebar, data-table, form-field, user-menu, shadcn)
└── lib/            # Utilities (api-client, query-client, hash, resp, cookie, cache, rate-limit)

messages/{en,zh}.json    # Translation source (flat dot-keyed)
project.inlang/          # Inlang project config
src/paraglide/           # Compiled messages + runtime (gitignored, generated)
```

## Admin Panel

The admin panel (`/admin`) provides a complete back-office interface:

| Section  | Pages                            | Features                                          |
| -------- | -------------------------------- | ------------------------------------------------- |
| Overview | Dashboard                        | Stats overview                                    |
| RBAC     | Users, Roles, Permissions        | Full CRUD, role assignment, permission management |
| Content  | Categories, Posts                | Full CRUD, status tabs, category selector         |
| Billing  | Payments, Subscriptions, Credits | Server-side pagination, type/status tabs, search  |
| Settings | System config                    | Collapsible groups, tabbed sections, all i18n     |

All admin pages include:

- Server-side paginated data tables with search
- Dialog-based create/edit/delete forms
- Complete English and Chinese translations

## Commands

| Command            | Description                                      |
| ------------------ | ------------------------------------------------ |
| `pnpm dev`         | Start Vite dev server (port 3000)                |
| `pnpm build`       | Production build                                 |
| `pnpm start`       | Run the production server                        |
| `pnpm db:setup`    | Copy schema template for chosen database         |
| `pnpm db:push`     | Push schema to database (dev)                    |
| `pnpm db:generate` | Generate migration SQL (production)              |
| `pnpm db:migrate`  | Run migrations (production)                      |
| `pnpm db:studio`   | Drizzle Studio GUI                               |
| `pnpm rbac:init`   | Create roles + permissions + optional admin user |
| `pnpm rbac:assign` | Assign role to user                              |

## IndexNow

Key: `791d51e58f416ad58d0fefce94462254`. The UTF-8 verification file is
`public/791d51e58f416ad58d0fefce94462254.txt` and is deployed with the site.

For future releases, submit newly added multilingual pages after deployment:

1. Identify the new localized page URLs in that release and check that they are
   live, indexable, and present in the production sitemap.
2. Verify that `https://exportyoutubeplaylist.com/791d51e58f416ad58d0fefce94462254.txt`
   returns HTTP 200 with the key above as its text content.
3. POST JSON to `https://api.indexnow.org/indexnow` with `host` set to
   `exportyoutubeplaylist.com`, the `key` above, `keyLocation` set to the verification
   URL above, and `urlList` containing only those newly added multilingual URLs
   (at most 10,000 per request).
4. Record the submitted URLs and response after submission. HTTP 200 means received;
   HTTP 202 means key validation is pending. Neither confirms indexing.

No scheduled or build-time submission is configured.
Reference: [Bing IndexNow setup](https://www.bing.com/indexnow/getstarted).

### Submission record — 2026-10-25

- Deployed Worker version: `46082926-3cbf-492c-84f9-3b818f604577`.
- Live key file: HTTP 200, text matches the key.
- Production sitemap: 64 → 67 URLs; all three additions return HTTP 200 with
  German language metadata, self-referencing canonical URLs and indexable robots metadata.
- Submitted at 08:34:15 America/Los_Angeles (15:34:15 UTC):
  - `https://exportyoutubeplaylist.com/de`
  - `https://exportyoutubeplaylist.com/de/tools/export-youtube-playlist-to-csv`
  - `https://exportyoutubeplaylist.com/de/tools/export-youtube-playlist-to-excel`
- IndexNow response: **HTTP 202**, empty body. URLs received; search-engine key
  validation is pending. This is not confirmation of crawling or indexing.
- Request reference: `AEC53BFE19054F3FAB8ABEEAB4D9E070`.
- Follow-up at 08:45:13 America/Los_Angeles (15:45:13 UTC): rechecked the live
  key file (HTTP 200, matching text), then used curl to POST the same three URLs
  directly to `https://www.bing.com/indexnow`. Bing returned **HTTP 200**, empty
  body: submission accepted successfully. Request reference:
  `F872583B0B074901A2FE552CB8B24CCF`. Dashboard visibility and indexing have not
  been independently confirmed; do not repeatedly resubmit unchanged pages.

### Submission record — 2026-10-26

- Deployed Worker version: `fcc52659-0c04-432a-a9d2-ec1dd096bfd7`.
- Production build and deployment succeeded. All 35 German routes returned HTTP
  200 with German language metadata, corrected branding, canonical URLs and
  reciprocal hreflang links. The three main German landing pages each expose six
  FAQ entries matching their visible content.
- Live IndexNow key file: HTTP 200, text matches the configured public key.
- Production sitemap: 67 → 95 URLs, including 31 German URLs.
- Submitted the 28 newly added German URLs from the sitemap difference; every
  submitted page was checked for HTTP 200 and indexable robots metadata. The
  three previously submitted German URLs were excluded. Pricing and the three
  existing noindex tools remain excluded from the sitemap and this submission.
- Exact request and submitted URL list:
  [indexnow-2026-10-26.json](docs/seo/indexnow-2026-10-26.json).
- Submitted to `https://api.indexnow.org/indexnow` at **2026-10-26 14:38:46 UTC**
  (07:38:46 America/Los_Angeles).
- Response: **HTTP 200**, empty body; submission accepted successfully.
- Request reference: `C993AC307BC54646B21300D6C17B2CB2`.
- Acceptance does not confirm crawling or indexing. Bing Webmaster Tools dashboard
  visibility and actual indexing have not been independently confirmed. No
  scheduled or build-time submission was added.

## Claude Code Skills

| Skill              | What it does                                        |
| ------------------ | --------------------------------------------------- |
| `/quick-start`     | Build a complete SaaS from a brief or reference URL |
| `/new-module`      | Create a backend module (service + API)             |
| `/new-page`        | Create a dashboard page (client component + nav)    |
| `/new-static-page` | Create an MDX content page (legal, about, FAQ)      |

## Environment Variables

```env
# Required (public vars use the VITE_ prefix; secrets stay server-only)
VITE_APP_URL=http://localhost:3000
VITE_APP_NAME=My App
VITE_APP_LOGO=/logo.png
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:data/local.db
AUTH_SECRET=generate-with-openssl-rand-base64-32

# Optional
VITE_DEFAULT_LOCALE=en
STRIPE_SECRET_KEY=
RESEND_API_KEY=
REPLICATE_API_TOKEN=

# Storage (optional — image upload falls back to inline base64 if unset)
STORAGE_ENDPOINT=
STORAGE_REGION=auto
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=
STORAGE_PUBLIC_DOMAIN=
INLINE_IMAGE_MAX_KB=2048
```

## License

This is proprietary software. See [LICENSE](./LICENSE) for the full license agreement.

**ShipAny** — [shipany.ai](https://shipany.ai)
