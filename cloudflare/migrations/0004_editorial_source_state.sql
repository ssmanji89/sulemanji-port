CREATE TABLE IF NOT EXISTS editorial_source_state (
  source_id TEXT PRIMARY KEY,
  fetched_at TEXT NOT NULL,
  signals_json TEXT NOT NULL
);
