# Frederick's Heating & Cooling: website + service-request platform

Prelaunch build. The public site, the guided 5-step service request, and a secured office leads inbox are working (Phase 1). Dispatch, estimates, invoicing, memberships and AI agents are planned in `docs/BLUEPRINT.md` but not built.

> Production readiness has **not** been established. See `LAUNCH_READINESS.md`.

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript | One codebase for site, API and office dashboard |
| Styling | Tailwind CSS 4 with brand tokens in `src/app/globals.css` | Custom "Bold Neighborhood" look, no UI kit |
| Font | Montserrat (self-hosted via `@fontsource-variable/montserrat`) | Approved board typography; no Google Fonts request at runtime |
| Database | Postgres. Local/tests: PGlite (embedded Postgres in WASM). Prod: any managed Postgres via `DATABASE_URL` | Same SQL in dev and prod; zero setup locally |
| Validation | zod (server only) | Server is the authority; the client bundle stays zod-free |
| Auth | Own email + password (scrypt), DB-backed sessions, httpOnly cookie | No vendor needed for a 1–5 person office; no public sign-up |
| Tests | Vitest (service-level, real Postgres) + Playwright journey script | Proves the form-to-inbox journey end to end |

## Run it locally

```bash
npm install
npm run db:seed-dev      # demo ZIPs 30078/30039 + demo staff logins (dev only)
npm run dev              # http://localhost:3000
```

Demo office logins (local only, password `dev-password-change-me`):
`owner@example.test` (owner_admin), `dispatch@example.test` (dispatcher), `tech@example.test` (technician).
Office lives at `/admin`.

Data is stored in `./.data/pglite` (git-ignored). Delete that folder for a clean slate.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next config) |
| `npm test` | Vitest acceptance tests against in-memory Postgres |
| `npm run test:e2e` | Playwright phone-sized journey (app must be running and seeded) |
| `npm run db:migrate` | Apply migrations (also auto-applied on first DB use) |
| `npm run db:create-owner` | Create the first real owner login from `OWNER_EMAIL` / `OWNER_PASSWORD` |
| `npm run db:seed-dev` | Demo data; refuses to run when `DATABASE_URL` is set |

## Architecture

```
PUBLIC SITE (src/app/(site))          OFFICE (src/app/admin, auth required)
  issue cards ─┐                         inbox · lead detail · settings/status
  /book 5-step flow                              │ server actions (CSRF-safe)
        │ POST /api/requests                     │
        ▼                                        ▼
  src/server/intake.ts ───────── src/server/leads.ts / settings.ts
   validate (zod) · honeypot · timing ·     permission + object-level checks
   rate limit · ZIP + category gate ·       state machine (src/domain/lead-status.ts)
   idempotency · duplicate flag                    │
        │  one transaction                          │
        ▼                                           ▼
  Postgres: customers · properties · leads · service_requests · consents
            contact_logs · audit_events · outbox_events · service_zips · service_categories
        │
        ▼
  outbox_events ──> src/integrations (email/SMS/calendar/payments/AI: all fail closed, "not connected")
```

Key folders:

- `src/config/business.ts`: every public business fact and feature flag. Unverified facts are `null`.
- `src/content/site.ts`: all marketing copy, FAQs, service-page text.
- `src/components/brand/BrandMark.tsx`: the temporary text wordmark. Replace here when a logo is approved.
- `src/domain/`: request schema, lead state machine, pure helpers.
- `src/server/`: DB, migrations, auth, intake, office operations.
- `src/integrations/`: provider adapters and outbox processor.

## Deploying (when approved)

1. Create a managed Postgres (Neon or Supabase free tier is enough to start). Set `DATABASE_URL`.
2. Set `IP_HASH_SALT`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`.
3. Deploy to Vercel (or any Node host). Migrations run automatically on first request; or run `npm run db:migrate` in CI.
4. `npm run db:create-owner` once against production to create the owner login.
5. Add the owner-approved ZIPs in **Admin → Settings**.
6. Work through `LAUNCH_READINESS.md` before switching `siteMode` to `"live"` (which also allows search indexing).

PGlite is for local development only; it is single-process and must not be used in production.

## Other docs

`docs/BLUEPRINT.md` (architecture + phase plan + agents) · `DECISIONS.md` · `LAUNCH_READINESS.md` · `OPERATIONS.md` · `INTEGRATIONS.md` · `CHANGELOG.md` · `TEST_REPORT.md`
