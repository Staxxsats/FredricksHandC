# Integrations

All providers fail closed. Admin → Settings shows live status.

| Integration | Chosen? | Status | Credentials needed | Fallback today | Webhooks |
|---|---|---|---|---|---|
| In-app leads inbox | Built in | Working | none | n/a | n/a |
| Database | Postgres (provider TBD: Neon/Supabase suggested) | Local PGlite only | `DATABASE_URL` | n/a | n/a |
| New-lead email | Not chosen (Resend or Postmark suggested, $0–15/mo) | Not connected | `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`, `LEAD_ALERT_EMAIL` | Inbox; outbox marks `skipped` | Delivery webhooks (Phase 2) |
| Phone / SMS | Not chosen | Not connected | Provider keys, A2P 10DLC brand/campaign | Customer calls are handled manually | Inbound SMS/call (Phase 3) |
| Calendar | Not chosen (Google Calendar suggested) | Not connected | OAuth client + calendar ID | Staff confirm manually, customer told by phone | Push notifications (Phase 2) |
| Payments | Not chosen | Disabled | Processor keys + webhook secret | No online payment | Signed, idempotent `payment.*` (Phase 2) |
| AI | Not chosen (Claude API suggested, with spend cap) | Disabled | API key, spend cap | Deterministic rules only | n/a |
| Analytics | Not chosen | Not connected | Provider ID | Events dropped (no PII emitted) | n/a |

New-lead alert content rule: the alert should say "New request FHC-XXXXXX (No heat, ASAP)" with a link to the inbox. No name, phone, address or notes in email/SMS bodies.
