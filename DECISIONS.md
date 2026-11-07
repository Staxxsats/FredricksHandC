# Decisions

Status keys: **APPROVED** (owner chose it) · **WORKING** (proposed, configurable, not public as fact) · **VERIFY** (needs owner facts/legal before live) · **PHASED** (designed, built later) · **ENG** (engineering choice made during build)

| Topic | Decision | Status |
|---|---|---|
| Display name | "Frederick's Heating & Cooling", centralized in `businessConfig.displayName` | WORKING (spelling vs "Fredrick's" not locked) |
| Older names | Augustus / Call Gus never appear publicly (e2e test checks) | APPROVED |
| Brand style | Bold Neighborhood: charcoal/amber/porcelain/steel, Montserrat | APPROVED |
| Logo | Rejected F emblem not used. Text wordmark via `BrandMark` | APPROVED (new mark pending) |
| Taglines | "When comfort matters, call Frederick's." / "Call Frederick's. Comfort starts here." / "Need heat? Need air? Call Frederick's." | APPROVED |
| Service area | "the Gwinnett area", Snellville listed; ZIP allowlist is empty in production until owner adds ZIPs | VERIFY |
| Demo ZIPs | 30078, 30039 seeded only by `db:seed-dev` and labeled DEMO | ENG |
| Phone / email / hours / address | `null`; UI hides call buttons, footer contact rows, hours | VERIFY |
| Booking wording | "Request Service" everywhere; confirmation says "request received, not a confirmed appointment" | APPROVED (spec) |
| Pricing | No prices shown publicly. Price-book seed not loaded (Phase 2, `public_visible=false`) | WORKING |
| Comfort Plan | Benefits shown; "Request plan details" goes to request flow (maintenance issue). No enrollment or payment | WORKING |
| Reviews | Section hidden until real, permissioned reviews exist | APPROVED (spec) |
| Stack | Next.js 16 + TS + Tailwind 4 + Postgres; PGlite locally | ENG |
| Auth | Built-in email/password + DB sessions; no auth vendor | ENG |
| Lead vs request | `leads` carry qualification state; `service_requests` hold the form payload (1:1 for web) | ENG |
| Out-of-area | Checked before contact details are collected; nothing saved for out-of-area ZIPs | ENG |
| Duplicates | Same phone + open lead within 14 days → flagged (`duplicate_of`), never discarded | ENG |
| Customer reuse | Same phone reuses the customer record; each request gets its own property row | ENG (review if landlords share numbers) |
| Spam | Honeypot, 4s minimum fill time, 5 submissions / 10 min per IP hash, same-origin check | ENG |
| Notifications | In-app inbox is the guaranteed path; email alert not connected (outbox marks `skipped`) | ENG |
| Indexing | Prelaunch: `noindex` + robots disallow all until `siteMode = "live"` | ENG |
| Analytics | Hooks emit allowlisted, non-PII fields only; no provider loaded | WORKING |
| Privacy / Terms | Drafts, clearly marked for legal review | VERIFY |
| Safety | Deterministic keyword + checkbox triggers "leave and call 911 / gas utility" guidance; no DIY advice | ENG |
