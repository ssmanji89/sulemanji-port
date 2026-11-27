CREATE TABLE IF NOT EXISTS editorial_source_attempts (
  source_id TEXT PRIMARY KEY,
  last_attempt_at TEXT NOT NULL,
  retry_after TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK(consecutive_failures >= 0),
  last_failure_code TEXT
);
