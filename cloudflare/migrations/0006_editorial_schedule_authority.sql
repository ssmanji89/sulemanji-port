ALTER TABLE schedule_claims ADD COLUMN owner_epoch INTEGER;

CREATE INDEX schedule_pending_by_owner ON schedule_claims(owner_epoch, claimed_at)
WHERE dispatch_state = 'PENDING';
