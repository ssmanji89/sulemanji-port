CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  public_token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  context_type TEXT NOT NULL,
  path TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE intakes (
  case_id TEXT PRIMARY KEY REFERENCES cases(id),
  problem TEXT NOT NULL,
  desired_outcome TEXT NOT NULL,
  prior_attempts TEXT NOT NULL,
  sanitized_links_json TEXT NOT NULL,
  redacted_at TEXT
);

CREATE TABLE consents (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  terms_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  evidence_json TEXT NOT NULL
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  case_id TEXT,
  event_type TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX cases_email_created_idx ON cases(email, created_at);
CREATE INDEX cases_status_idx ON cases(status);
