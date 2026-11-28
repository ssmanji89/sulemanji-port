ALTER TABLE editorial_control
  ADD COLUMN knowledge_generation INTEGER NOT NULL DEFAULT 0 CHECK(knowledge_generation >= 0);

CREATE TRIGGER editorial_knowledge_insert
AFTER INSERT ON public_knowledge
BEGIN
  UPDATE editorial_control SET knowledge_generation = knowledge_generation + 1 WHERE singleton = 1;
END;

-- An uninterrupted renewal preserves authority only if it leaves the projection's ordering intact.
CREATE TRIGGER editorial_knowledge_update
AFTER UPDATE ON public_knowledge
WHEN NOT (
  OLD.action = 'UPSERT' AND NEW.action = 'UPSERT'
  AND OLD.derivative_id = NEW.derivative_id AND OLD.subject_id = NEW.subject_id
  AND OLD.revision = NEW.revision AND OLD.policy_revision = NEW.policy_revision
  AND OLD.payload_sha256 = NEW.payload_sha256
  AND NEW.sequence >= OLD.sequence AND NEW.expires_at >= OLD.expires_at
  AND OLD.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  AND NOT EXISTS (
    SELECT 1 FROM public_knowledge AS other
    WHERE other.subject_id = NEW.subject_id AND other.policy_revision = NEW.policy_revision
      AND other.derivative_id <> NEW.derivative_id AND other.action = 'UPSERT'
      AND other.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND (other.sequence > OLD.sequence OR (other.sequence = OLD.sequence AND other.derivative_id < OLD.derivative_id))
      AND (other.sequence < NEW.sequence OR (other.sequence = NEW.sequence AND other.derivative_id > NEW.derivative_id))
  )
)
BEGIN
  UPDATE editorial_control SET knowledge_generation = knowledge_generation + 1 WHERE singleton = 1;
END;

CREATE TRIGGER editorial_knowledge_delete
AFTER DELETE ON public_knowledge
BEGIN
  UPDATE editorial_control SET knowledge_generation = knowledge_generation + 1 WHERE singleton = 1;
END;
