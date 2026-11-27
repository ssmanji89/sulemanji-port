CREATE TABLE IF NOT EXISTS public_knowledge (
  derivative_id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  revision TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK(sequence > 0),
  action TEXT NOT NULL CHECK(action IN ('UPSERT', 'WITHDRAW')),
  payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256) = 64),
  policy_revision TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  payload_json TEXT,
  updated_at TEXT NOT NULL,
  CHECK((action = 'UPSERT' AND payload_json IS NOT NULL) OR (action = 'WITHDRAW' AND payload_json IS NULL))
);

CREATE INDEX IF NOT EXISTS public_knowledge_subject_expiry
  ON public_knowledge(subject_id, expires_at, sequence);
