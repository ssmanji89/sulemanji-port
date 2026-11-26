CREATE TABLE IF NOT EXISTS editorial_control (
  singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
  paused INTEGER NOT NULL DEFAULT 1 CHECK(paused IN (0, 1)),
  owner_epoch INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
INSERT OR IGNORE INTO editorial_control(singleton, paused, owner_epoch, updated_at)
VALUES (1, 1, 1, '1970-01-01T00:00:00.000Z');

CREATE TABLE IF NOT EXISTS schedule_claims (
  id TEXT PRIMARY KEY,
  local_date TEXT NOT NULL,
  slot TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  dispatch_state TEXT NOT NULL DEFAULT 'PENDING' CHECK(dispatch_state IN ('PENDING', 'DISPATCHED')),
  workflow_instance_id TEXT,
  dispatched_at TEXT,
  UNIQUE(local_date, slot)
);

CREATE TABLE IF NOT EXISTS usage_reservations (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL UNIQUE,
  maximum_micros INTEGER NOT NULL CHECK(maximum_micros >= 0),
  actual_micros INTEGER,
  local_date TEXT NOT NULL,
  local_month TEXT NOT NULL,
  pricing_revision TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  settled_at TEXT
);
CREATE INDEX IF NOT EXISTS usage_by_day ON usage_reservations(local_date);
CREATE INDEX IF NOT EXISTS usage_by_month ON usage_reservations(local_month);
CREATE INDEX IF NOT EXISTS usage_by_candidate ON usage_reservations(candidate_id);

CREATE TABLE IF NOT EXISTS editorial_candidates (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  revision TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  model_calls INTEGER NOT NULL DEFAULT 0 CHECK(model_calls >= 0),
  review_rounds INTEGER NOT NULL DEFAULT 0 CHECK(review_rounds >= 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS editorial_receipts (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  action TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publication_effects (
  candidate_id TEXT PRIMARY KEY,
  effect_id TEXT NOT NULL UNIQUE,
  owner_epoch INTEGER NOT NULL,
  branch TEXT NOT NULL UNIQUE,
  pull_request INTEGER,
  source_commit TEXT,
  merge_commit TEXT,
  state TEXT NOT NULL CHECK(state IN ('INTENT', 'SOURCE_PUBLISHED', 'MERGED', 'UNCERTAIN', 'FAILED')),
  content_digest TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
