# Test report (2026-11-07)

All checks below were actually run against this code. Environment: Node 22, Linux, Chromium (Playwright), embedded Postgres (PGlite).

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | Pass |
| Lint | `npm run lint` | Pass (0 problems) |
| Production build | `npm run build` | Pass (22 routes) |
| Unit / acceptance | `npm test` | **25 / 25 pass** |
| Phone journey (production server) | `npm start` + `npm run test:e2e` | **13 / 13 pass** |

## Spec §19 "Booking and CRM" coverage

| # | Requirement | Test |
|---|---|---|
| 1 | Valid in-area lead saves once with values + attribution | unit 1; e2e "in-area request" + "owner sees lead" |
| 2 | Duplicate click/retry doesn't create two jobs | unit 2 (concurrent + replay); e2e network-failure retry |
| 3 | Out-of-area ZIP is truthful, no false confirmation | unit 3; e2e out-of-area |
| 4 | Unknown system type accepted | unit 4; e2e uses "Not sure" |
| 5 | Recovers from network/DB failure without claiming success | unit 5 (forced DB failure rolls back); e2e aborted request shows "Not sent" |
| 6 | Unauthenticated person can't access lead data | unit 6; e2e anonymous /admin redirect |
| 7 | Technician can't access unrelated customers | unit 7; e2e tech gets 404 on unassigned lead |
| 8 | Consents persist with version/timestamp, can change | unit 8 |
| 9 | Preferred time never becomes Confirmed without confirmation | unit 9 (incl. DB check constraint) |
| 10 | Owner actions create correct audit history | unit 10; e2e audit lines |

Also covered: honeypot, minimum fill time, rate limit, tenant permission, disabled category rejected, outbox marks disconnected providers `skipped`, analytics/log PII stripping, safety-language trigger, no `tel:` links without a real number, no legacy brand names, no horizontal scroll at 320/375/430/768/1440 on 10 pages, sitemap/robots/health respond.

## Not yet tested / known gaps
- No automated screen-reader run (axe/NVDA). Markup uses labels, fieldsets, live regions and focus management, but a manual pass is recommended.
- No Lighthouse/Core Web Vitals measurement yet. Client JS total is ~700 KB uncompressed across all routes; zod is kept out of the browser bundle.
- Postgres (`postgres` driver) path is exercised by type checks only; tests run on PGlite. Run `npm test` against a staging `DATABASE_URL` before launch.
- Phase 2+ items (estimates, payments, webhooks, reminders, agents) are not built, so their §19 "Operations" tests don't exist yet.
