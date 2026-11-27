export type CandidateState = 'DISCOVERED' | 'ELIGIBLE' | 'DRAFTED' | 'REVIEWED' | 'SOURCE_PUBLISHED' | 'DEPLOYED' | 'VERIFIED' | 'NO_CHANGE' | 'NEEDS_OWNER' | 'HELD' | 'FAILED';

export async function transitionCandidate(db: D1Database, id: string, from: CandidateState, to: CandidateState, revision: string): Promise<boolean> {
  const result = await db.prepare('UPDATE editorial_candidates SET state = ?, revision = ?, updated_at = ? WHERE id = ? AND state = ? AND revision = ?')
    .bind(to, `${revision}:${to}`, new Date().toISOString(), id, from, revision).run();
  return (result.meta.changes ?? 0) === 1;
}

export async function recordModelCall(db: D1Database, candidateId: string, ownerEpoch: number, maximum = 6,
  maximumReviews = 3, isReview = false): Promise<boolean> {
  if (!Number.isSafeInteger(ownerEpoch) || ownerEpoch < 1 || !Number.isSafeInteger(maximum) || maximum < 1 || maximum > 6) return false;
  if (!Number.isSafeInteger(maximumReviews) || maximumReviews < 1 || maximumReviews > 3) return false;
  const reviewIncrement = isReview ? 1 : 0;
  const result = await db.prepare(`UPDATE editorial_candidates SET model_calls = model_calls + 1,
    review_rounds = review_rounds + ?, updated_at = ?
    WHERE id = ? AND model_calls < ? AND (? = 0 OR review_rounds < ?)
    AND EXISTS (
      SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?
    )`).bind(reviewIncrement, new Date().toISOString(), candidateId, maximum, reviewIncrement, maximumReviews, ownerEpoch).run();
  return (result.meta.changes ?? 0) === 1;
}

export async function readControl(db: D1Database): Promise<{ paused: boolean; owner_epoch: number }> {
  const row = await db.prepare('SELECT paused, owner_epoch FROM editorial_control WHERE singleton = 1').first<{ paused: number; owner_epoch: number }>();
  return row ? { paused: row.paused === 1, owner_epoch: row.owner_epoch } : { paused: true, owner_epoch: 0 };
}

export async function setPaused(db: D1Database, paused: boolean, now = new Date()): Promise<{ paused: boolean; owner_epoch: number }> {
  await db.prepare('UPDATE editorial_control SET paused = ?, owner_epoch = owner_epoch + 1, updated_at = ? WHERE singleton = 1')
    .bind(paused ? 1 : 0, now.toISOString()).run();
  return readControl(db);
}
