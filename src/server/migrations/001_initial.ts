// Generated from the canonical SQL below. Edit here; migrations are append-only once deployed.
const m001 = `
-- Phase 1 schema: intake, CRM basics, consent, audit, outbox.
-- Later-phase tables (appointments, work_orders, estimates, invoices, memberships...) are
-- intentionally NOT created yet. See DECISIONS.md.

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  role          text NOT NULL CHECK (role IN ('owner_admin','dispatcher','technician','read_only_accounting')),
  password_hash text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE service_zips (
  zip        text PRIMARY KEY CHECK (zip ~ '^[0-9]{5}$'),
  label      text,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE service_categories (
  slug            text PRIMARY KEY,
  label           text NOT NULL,
  public_enabled  boolean NOT NULL DEFAULT true,
  requires_review boolean NOT NULL DEFAULT true,
  sort_order      int NOT NULL DEFAULT 0
);

CREATE TABLE customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text NOT NULL,          -- normalized digits, +1XXXXXXXXXX
  email       text,
  provenance  text NOT NULL DEFAULT 'web_form',
  marketing_opted_out_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_phone_idx ON customers(phone);

CREATE TABLE properties (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  street        text,
  unit          text,
  city          text,
  state         text DEFAULT 'GA',
  zip           text NOT NULL,
  property_type text,                  -- home | rental | other
  relationship  text,                  -- owner | tenant | property_manager
  access_notes  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE leads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref              text NOT NULL UNIQUE,         -- customer-facing reference, e.g. FHC-7K2M9Q
  customer_id      uuid NOT NULL REFERENCES customers(id),
  property_id      uuid REFERENCES properties(id),
  channel          text NOT NULL DEFAULT 'web',
  source           text NOT NULL DEFAULT 'direct',
  utm              jsonb NOT NULL DEFAULT '{}'::jsonb,
  referrer_host    text,
  landing_path     text,
  issue            text NOT NULL,
  urgency          text NOT NULL,
  status           text NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','contacted','qualified','confirmed','ineligible','closed','duplicate')),
  zip_eligible     boolean NOT NULL,
  safety_flag      boolean NOT NULL DEFAULT false,
  duplicate_of     uuid REFERENCES leads(id),
  assigned_to      uuid REFERENCES users(id),
  next_step        text,
  next_due_at      timestamptz,
  ineligible_reason text,
  requested_at     timestamptz NOT NULL DEFAULT now(),
  contacted_at     timestamptz,
  qualified_at     timestamptz,
  confirmed_at     timestamptz,
  scheduled_for    timestamptz,                  -- only set by staff confirmation
  confirmed_by     uuid REFERENCES users(id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'confirmed' OR (confirmed_at IS NOT NULL AND scheduled_for IS NOT NULL AND confirmed_by IS NOT NULL))
);
CREATE INDEX leads_status_idx ON leads(status, requested_at DESC);

CREATE TABLE service_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  idempotency_key   text NOT NULL UNIQUE,
  issue             text NOT NULL,
  notes             text,
  system_running    text NOT NULL,     -- yes | partially | no | not_sure
  urgency           text NOT NULL,     -- asap | few_days | flexible
  zip               text NOT NULL,
  system_type       text,              -- free choice incl. not_sure
  system_age        text,
  preferred_day     text,              -- REQUEST ONLY, never a confirmed slot
  preferred_window  text,
  tenant_contact    text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE consents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES customers(id),
  lead_id      uuid REFERENCES leads(id),
  kind         text NOT NULL CHECK (kind IN ('service_contact','marketing')),
  granted      boolean NOT NULL,
  text_version text NOT NULL,
  text_shown   text NOT NULL,
  source       text NOT NULL,          -- web_form | staff_update
  recorded_by  uuid REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consents_customer_idx ON consents(customer_id, kind, created_at DESC);

CREATE TABLE contact_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id),
  channel    text NOT NULL,            -- phone | text | email | in_person | note
  summary    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id          bigserial PRIMARY KEY,
  actor_type  text NOT NULL,           -- user | system | customer
  actor_id    text,
  entity      text NOT NULL,
  entity_id   text NOT NULL,
  action      text NOT NULL,
  from_status text,
  to_status   text,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_entity_idx ON audit_events(entity, entity_id, created_at);

-- Transactional outbox: events are written in the same transaction as the data they describe,
-- then processed by a worker. Live provider sends are disabled until configured.
CREATE TABLE outbox_events (
  id              bigserial PRIMARY KEY,
  event_type      text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  payload         jsonb NOT NULL,      -- IDs only, no PII
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','skipped','failed','dead')),
  attempts        int NOT NULL DEFAULT 0,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz
);

CREATE TABLE rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count        int NOT NULL
);
`;
export default m001;
