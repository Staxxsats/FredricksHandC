# Changelog

## 0.1.0 (2026-11-07): Phase 0 + Phase 1
- Audit: no existing code; fresh Next.js 16 + TypeScript + Tailwind 4 + Postgres project.
- Bold Neighborhood design tokens, Montserrat, text wordmark (rejected F emblem excluded).
- Public pages: home, heating, cooling, repairs, maintenance, service area, about, contact, privacy (draft), terms (draft), 404, error.
- 5-step service request flow with ZIP gate, safety messaging, consents, review, idempotent submit, honest confirmation.
- Intake API with validation, spam defenses, duplicate flagging, consent snapshots, audit and outbox in one transaction.
- Office: login, leads inbox, lead detail with status machine, assignment, follow-ups, contact log, consent changes, duplicate merge, audit trail.
- Settings: ZIP allowlist, category toggles, integration status, launch checklist, automation queue.
- SEO: metadata, canonicals, sitemap, robots (noindex while prelaunch), FAQ structured data.
- Tests: 25 Vitest acceptance tests; 13-step Playwright phone journey.
