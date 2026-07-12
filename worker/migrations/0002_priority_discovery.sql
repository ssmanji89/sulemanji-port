CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  stripe_event_id TEXT NOT NULL,
  case_id TEXT NOT NULL REFERENCES cases(id),
  type TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE TABLE credits (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  stripe_checkout_session_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT NOT NULL,
  cents INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE gmail_threads (
  case_id TEXT PRIMARY KEY REFERENCES cases(id),
  gmail_thread_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE discovery_state (
  case_id TEXT PRIMARY KEY REFERENCES cases(id),
  workflow_id TEXT,
  gmail_thread_id TEXT,
  state_json TEXT NOT NULL,
  mandatory_review_held INTEGER NOT NULL DEFAULT 0,
  mandatory_review_reasons_json TEXT,
  mandatory_review_draft_id TEXT,
  mandatory_review_held_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  artifact_type TEXT NOT NULL,
  version INTEGER NOT NULL,
  body_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE risk_decisions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  reasons_json TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE workflow_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  workflow_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE offer_counters (
  counter_key TEXT PRIMARY KEY,
  value INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX payments_stripe_event_id_idx
  ON payments(stripe_event_id);

CREATE UNIQUE INDEX credits_stripe_checkout_session_id_idx
  ON credits(stripe_checkout_session_id);

CREATE UNIQUE INDEX credits_stripe_payment_intent_id_idx
  ON credits(stripe_payment_intent_id);

CREATE UNIQUE INDEX gmail_threads_gmail_thread_id_idx
  ON gmail_threads(gmail_thread_id);

CREATE UNIQUE INDEX discovery_state_workflow_id_idx
  ON discovery_state(workflow_id)
  WHERE workflow_id IS NOT NULL;

CREATE UNIQUE INDEX artifacts_case_type_version_idx
  ON artifacts(case_id, artifact_type, version);

CREATE INDEX artifacts_case_type_idx
  ON artifacts(case_id, artifact_type);

CREATE INDEX risk_decisions_case_status_idx
  ON risk_decisions(case_id, status);

CREATE UNIQUE INDEX risk_decisions_case_draft_idx
  ON risk_decisions(case_id, draft_id);

CREATE INDEX workflow_events_case_created_idx
  ON workflow_events(case_id, created_at);

CREATE INDEX workflow_events_workflow_id_idx
  ON workflow_events(workflow_id);

CREATE TRIGGER consents_no_update
BEFORE UPDATE ON consents
BEGIN
  SELECT RAISE(ABORT, 'consent evidence is immutable');
END;

CREATE TRIGGER consents_no_delete
BEFORE DELETE ON consents
BEGIN
  SELECT RAISE(ABORT, 'consent evidence is immutable');
END;
