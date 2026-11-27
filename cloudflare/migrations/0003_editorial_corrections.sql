CREATE TABLE IF NOT EXISTS editorial_corrections (
  id TEXT PRIMARY KEY,
  source_episode TEXT NOT NULL,
  original_instruction TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  affected_behavior TEXT NOT NULL,
  regression_reference TEXT NOT NULL,
  revision TEXT NOT NULL CHECK(length(revision) = 64),
  recorded_at TEXT NOT NULL,
  stored_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS editorial_corrections_episode ON editorial_corrections(source_episode);
