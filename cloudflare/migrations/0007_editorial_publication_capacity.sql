-- The prior worker cannot account for merges. Migrate only after it has drained.
-- A 26-hour lookback covers an entire Chicago accounting day, including fall-back.
CREATE TABLE IF NOT EXISTS publication_capacity_cutover (
  safe INTEGER CONSTRAINT publication_capacity_cutover_safe CHECK (safe = 1)
);
INSERT INTO publication_capacity_cutover(safe)
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM editorial_control AS control
  WHERE control.singleton = 1 AND control.paused = 1 AND NOT EXISTS (
    SELECT 1 FROM schedule_claims AS claim
    WHERE (claim.owner_epoch = control.owner_epoch OR julianday(claim.claimed_at) IS NULL
      OR julianday(claim.claimed_at) >= julianday('now', '-26 hours')) AND NOT EXISTS (
      SELECT 1 FROM editorial_receipts WHERE id = 'slot-result:' || claim.id
    )
  )
) AND NOT EXISTS (
  SELECT 1 FROM publication_effects
  WHERE state IN ('SOURCE_PUBLISHED', 'UNCERTAIN')
    OR ((state = 'MERGED' OR merge_commit IS NOT NULL) AND (
      julianday(updated_at) IS NULL OR julianday(updated_at) >= julianday('now', '-26 hours')
    ))
) THEN 1 ELSE 0 END;
DROP TABLE publication_capacity_cutover;

ALTER TABLE publication_effects ADD COLUMN merge_admission_date TEXT;
ALTER TABLE publication_effects ADD COLUMN merge_settled_date TEXT;
ALTER TABLE publication_effects ADD COLUMN merge_dispatch_id TEXT;
ALTER TABLE publication_effects ADD COLUMN new_articles INTEGER NOT NULL DEFAULT 0 CHECK (new_articles >= 0);
ALTER TABLE publication_effects ADD COLUMN refreshes INTEGER NOT NULL DEFAULT 0 CHECK (refreshes >= 0);

CREATE INDEX publication_capacity_by_day ON publication_effects(merge_admission_date, merge_settled_date)
WHERE merge_admission_date IS NOT NULL;

ALTER TABLE editorial_candidates ADD COLUMN publication_retry_after TEXT;
ALTER TABLE editorial_candidates ADD COLUMN publication_retry_claim TEXT;
CREATE INDEX editorial_publication_retry_due ON editorial_candidates(publication_retry_after)
WHERE state = 'CAPACITY_HELD';
