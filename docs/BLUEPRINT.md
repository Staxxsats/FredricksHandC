# Implementation blueprint

## A. Existing-work audit (2026-11-07)

- No existing Frederick's (or Augustus / Call Gus) code was found in the owner's GitHub account or on the connected computer. No hosting, database, CRM or field-service platform is connected.
- Decision: start fresh with the spec's preferred baseline (Next.js + TypeScript + Tailwind + Postgres). Nothing to preserve.

## B. Architecture and MVP cutline

**One app, one database, one source of truth.** The public site, the request API and the office dashboard share the same domain layer and Postgres database. No shadow CRM.

```
Public UI ─> /api/requests ─> intake service ─┐
Office UI ─> server actions ─> lead service ──┼─> Postgres (single source of truth)
                                              └─> outbox_events ─> worker ─> adapters (disabled until approved)
```

### Phase 1 (BUILT, this delivery)

- Public routes: `/`, `/heating`, `/cooling`, `/repairs`, `/maintenance`, `/service-area`, `/about`, `/book`, `/contact`, `/privacy` (draft), `/terms` (draft), 404, error.
- 5-step request flow with ZIP gate, safety messaging, request-only preferred time, separate consents, review step, idempotent submit, honest "request received" confirmation.
- Server intake: validation, honeypot, minimum fill time, IP-hash rate limit, active-ZIP and enabled-category checks, duplicate flagging, consent snapshot, audit event and outbox event in a single transaction.
- Office: owner/dispatcher/technician login (no sign-up), leads inbox with counts and filters, lead detail (request, customer/property, consent, contact log, audit trail), actions (contact, qualify, confirm with agreed time, ineligible/close with reason, assign, follow-up, duplicate merge, consent change).
- Settings: ZIP allowlist, category toggles, integration status ("not connected"), launch-readiness checklist, automation queue view.
- SEO basics (metadata, canonical, sitemap, robots, FAQ structured data), privacy-safe analytics hooks, accessibility (labels, error summary, focus management, reduced motion, 48px targets).

### Phase 2 (planned, not built)

Tables added only when the phase ships: `appointments`, `technicians`, `work_orders`, `job_notes`, `media_files` (private storage), `estimates` (versioned), `authorizations`, `invoices`, `payments` (processor IDs only), `price_book` (private, all `public_visible=false`), `tasks`.
Calendar adapter (one Google calendar is the cheapest option), technician mobile view, estimate draft → staff approval → send → customer acceptance with immutable snapshot.

### Phase 3 (planned)

Consent-checked messaging (SMS/email), missed-call handling, estimate follow-ups, neutral review requests, membership schedules, technician voice-to-note with review, workflow run log and kill switches.

### Phase 4 (planned)

Area expansion, partner portal, subcontract tracking after legal review, financial KPIs.

## C. Visual system

| Token | Hex | Use |
|---|---|---|
| charcoal | #252B2D | Header, hero, dark sections |
| amber | #F1B44F | Primary CTA, highlights, livery stripe |
| porcelain | #F6F5F0 | Page background |
| steel | #839392 | Secondary blocks, stripe (never small text on white) |
| steel-dark | #5C6B6A | Steel tone darkened for AA text on light backgrounds |
| ink | #1B2325 | Body text |

- Typography: Montserrat variable (900 italic wordmark, 800 headings, 400–600 body).
- Wordmark: text only, "FREDERICK'S" over a skewed amber/steel "HEATING & COOLING" bar. The rejected F emblem is not used anywhere. `BrandMark` is the single swap point.
- Graphic device: the van/yard-sign diagonal livery stripe (amber + steel) in the hero, endcap, footer rule and page heroes.

## D. Lead state machine

```
new ──> contacted ──> qualified ──> confirmed
 │          │             │            │
 │          └──────┬──────┘            └─> qualified (customer cancels) | closed
 ├──> duplicate    └──> ineligible (reason) | closed (reason)
```

- `confirmed` requires `confirmed_at`, `scheduled_for` and `confirmed_by` (enforced by a DB check constraint, not only by code).
- Every transition writes an `audit_events` row with actor, from/to and reason.

## E. Event contracts (implemented subset)

| Event | Written when | Payload | Handler today |
|---|---|---|---|
| `service_request.created` | Intake transaction | `{ lead_id, ref }` | Marked `skipped`: "email not connected; lead visible in inbox" |
| `appointment.confirmed` | Staff confirms | `{ lead_id }` | `skipped`: calendar/SMS not connected |
| `customer.opted_out` | Staff records marketing opt-out | `{ customer_id }` | `done`: suppression on customer record |

Queue design: transactional outbox table, unique idempotency key per event, retries up to 5 then `dead`, visible in Admin → Settings. A cron (e.g. Vercel Cron hitting a protected endpoint) will replace the inline/“Process now” trigger in Phase 2.

Example payload:

```json
{ "event_type": "service_request.created", "idempotency_key": "service_request.created:6f1c…", "payload": { "lead_id": "6f1c…", "ref": "FHC-7K2M9Q" } }
```

## F. The seven AI agents (mapped, none active)

Shared pattern: event → deterministic rules → optional AI draft → human approval if consequential → provider action → delivery ack → audit. One worker, seven capabilities, each with a kill switch flag in `businessConfig`.

| Agent | Trigger event(s) | Reads | Writes | Human gate | Status |
|---|---|---|---|---|---|
| 1. AI Receptionist | `call.inbound`, `call.missed` | FAQs, config, ZIPs | lead, task, message_event | Transfer to human; no prices/availability invented | Off: no phone provider (`aiReceptionistEnabled=false`) |
| 2. Lead Qualification | `service_request.created` | lead, request | triage suggestion on lead | Dispatcher decides; never confirms | Off: rules (ZIP, category, safety flag) already run deterministically |
| 3. Outbound Acquisition | owner-created campaign | opted-in customers only | draft messages | Owner approves each campaign; no cold AI calls | Off (`outboundAutomationEnabled=false`) |
| 4. Estimate Follow-up | `estimate.sent` | estimate, consent | tasks at 2h/24h/72h | Stops on reply/decision/opt-out | Phase 3 |
| 5. Reviews & Satisfaction | `job.closed` | job, consent | neutral invite | No gating by satisfaction | Phase 3 (`reviewsEnabled=false`) |
| 6. Maintenance Reactivation | `membership.visit_due` | plan, consent | reminder task/message | Only with approved plan | Phase 3 |
| 7. Technician Field Support | `job_note.dictated` | job | draft note | Technician edits and signs | Phase 3 |

## G. Integration map and expected costs (estimates, verify before purchase)

| Need | Minimum option | Approx. cost | When |
|---|---|---|---|
| Hosting | Vercel Hobby/Pro | $0–20/mo | Launch |
| Database | Neon or Supabase free tier | $0 to start | Launch |
| Domain | Any registrar | ~$12–20/yr | Launch |
| Transactional email | Resend or Postmark | $0–15/mo | Launch (new-lead alerts) |
| Business phone/SMS | Provider TBD (needs A2P 10DLC registration) | ~$10–30/mo + usage | Phase 2–3 |
| Calendar | Google Workspace calendar | ~$7/user/mo (if Workspace used) | Phase 2 |
| Payments | Processor TBD (Square/Stripe/etc.) | % per transaction | Phase 2 |
| AI | Claude API, capped | usage-based, cap set by owner | Phase 3 |

Nothing has been purchased or signed up for.

## H. Blocked for live (not blocking development)

Final name spelling, legal entity, licensed contractor structure, insurance, EPA 608 where relevant, real phone, email, domain, hours, approved ZIPs, approved prices/fees, privacy/terms legal review, consent wording review, photos, Google Business Profile. Full list: `LAUNCH_READINESS.md`.
