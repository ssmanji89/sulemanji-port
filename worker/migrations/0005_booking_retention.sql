CREATE TABLE session_quotes (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  blueprint_version INTEGER NOT NULL,
  credit_id TEXT NOT NULL REFERENCES credits(id),
  public_token_hash TEXT NOT NULL UNIQUE,
  duration_minutes INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  credit_cents INTEGER NOT NULL,
  balance_cents INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  approved_at TEXT
);

CREATE TABLE slot_holds (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES session_quotes(id),
  calendar_id TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  hold_id TEXT NOT NULL UNIQUE REFERENCES slot_holds(id),
  calendar_id TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  provider_event_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX session_quotes_case_blueprint_idx
  ON session_quotes(case_id, blueprint_version);

CREATE UNIQUE INDEX session_quotes_credit_id_idx
  ON session_quotes(credit_id);

CREATE UNIQUE INDEX slot_holds_active_window_idx
  ON slot_holds(calendar_id, starts_at, ends_at)
  WHERE status = 'active';
