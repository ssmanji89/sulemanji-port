import type { PublicationCounts, PublishEffect, PublishEffectStore } from './publisher.js';
import { localBudgetPeriod } from './scheduler.js';

export class D1PublishEffectStore implements PublishEffectStore {
  constructor(private readonly db: D1Database, private readonly ownerEpoch: number,
    private readonly limits: PublicationCounts, private readonly clock: () => Date = () => new Date()) {}

  async ensureIntent(candidateId: string, effectId: string, branch: string, ownerEpoch: number, contentDigest: string): Promise<void> {
    if (!Number.isSafeInteger(this.ownerEpoch) || this.ownerEpoch < 1 || ownerEpoch !== this.ownerEpoch) throw new Error('WORKFLOW_AUTHORITY_CHANGED');
    await this.db.prepare(`INSERT OR IGNORE INTO publication_effects(candidate_id, effect_id, owner_epoch, branch, state, content_digest, updated_at)
      SELECT ?, ?, ?, ?, 'INTENT', ?, ? WHERE EXISTS (
        SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?
      )`).bind(candidateId, effectId, ownerEpoch, branch, contentDigest, new Date().toISOString(), this.ownerEpoch).run();
    const control = await this.db.prepare('SELECT paused, owner_epoch FROM editorial_control WHERE singleton = 1')
      .first<{ paused: number; owner_epoch: number }>();
    if (!control || control.paused !== 0 || control.owner_epoch !== this.ownerEpoch) throw new Error('WORKFLOW_AUTHORITY_CHANGED');
    const row = await this.db.prepare('SELECT effect_id, owner_epoch, branch, content_digest FROM publication_effects WHERE candidate_id = ?')
      .bind(candidateId).first<{ effect_id: string; owner_epoch: number; branch: string; content_digest: string }>();
    if (!row || row.effect_id !== effectId || row.owner_epoch !== ownerEpoch || row.branch !== branch || row.content_digest !== contentDigest) {
      throw new Error('PUBLICATION_EFFECT_CONFLICT');
    }
  }

  async read(candidateId: string) {
    return this.db.prepare(`SELECT effect_id, branch, owner_epoch, content_digest, pull_request, source_commit, merge_commit, state
      FROM publication_effects WHERE candidate_id = ?`).bind(candidateId).first<PublishEffect>();
  }

  async reserveMergeCapacity(candidateId: string, counts: PublicationCounts): Promise<boolean> {
    if ([counts.new_articles, counts.refreshes, this.limits.new_articles, this.limits.refreshes]
      .some((number) => !Number.isSafeInteger(number) || number < 0)) throw new Error('PUBLICATION_CAPACITY_INVALID');
    const { local_date: date } = localBudgetPeriod(this.clock());
    // Unresolved attempts carry forward. A merge settled after midnight counts on both days.
    await this.db.prepare(`UPDATE publication_effects SET merge_admission_date = ?, new_articles = ?, refreshes = ?
      WHERE candidate_id = ? AND owner_epoch = ? AND state = 'SOURCE_PUBLISHED' AND merge_commit IS NULL
        AND merge_admission_date IS NULL AND EXISTS (
          SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?
        ) AND EXISTS (
          SELECT 1 FROM (
            SELECT COALESCE(SUM(new_articles), 0) AS used_new, COALESCE(SUM(refreshes), 0) AS used_refreshes
            FROM publication_effects WHERE merge_admission_date IS NOT NULL
              AND (merge_admission_date = ? OR merge_settled_date IS NULL OR merge_settled_date >= ?)
          ) WHERE (? = 0 OR used_new <= ?) AND (? = 0 OR used_refreshes <= ?)
        )`).bind(date, counts.new_articles, counts.refreshes, candidateId, this.ownerEpoch, this.ownerEpoch,
      date, date, counts.new_articles, this.limits.new_articles - counts.new_articles,
      counts.refreshes, this.limits.refreshes - counts.refreshes).run();
    const row = await this.db.prepare(`SELECT effect.merge_admission_date, effect.new_articles, effect.refreshes
      FROM publication_effects AS effect JOIN editorial_control AS control
        ON control.singleton = 1 AND control.paused = 0 AND control.owner_epoch = effect.owner_epoch
      WHERE effect.candidate_id = ? AND effect.owner_epoch = ? AND effect.state = 'SOURCE_PUBLISHED' AND effect.merge_commit IS NULL`)
      .bind(candidateId, this.ownerEpoch).first<{ merge_admission_date: string | null; new_articles: number; refreshes: number }>();
    if (!row) throw new Error('WORKFLOW_AUTHORITY_CHANGED');
    if (!row.merge_admission_date) return false;
    if (row.new_articles !== counts.new_articles || row.refreshes !== counts.refreshes) throw new Error('PUBLICATION_CAPACITY_CONFLICT');
    return true;
  }

  async record(candidateId: string, patch: { pull_request?: number; source_commit?: string; merge_commit?: string; state: string }): Promise<void> {
    const current = await this.read(candidateId);
    if (!current) throw new Error('PUBLICATION_EFFECT_INTENT_MISSING');
    const now = this.clock();
    const settledDate = patch.state === 'MERGED' && patch.merge_commit ? localBudgetPeriod(now).local_date : null;
    const result = await this.db.prepare(`UPDATE publication_effects SET pull_request = COALESCE(?, pull_request), source_commit = COALESCE(?, source_commit),
      merge_commit = COALESCE(?, merge_commit), state = ?, updated_at = ?,
      merge_settled_date = CASE WHEN merge_admission_date IS NOT NULL THEN COALESCE(merge_settled_date, ?) END
      WHERE candidate_id = ? AND owner_epoch = ? AND EXISTS (
        SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?
      )`)
      .bind(patch.pull_request ?? null, patch.source_commit ?? null, patch.merge_commit ?? null, patch.state,
        now.toISOString(), settledDate, candidateId, this.ownerEpoch, this.ownerEpoch).run();
    if ((result.meta.changes ?? 0) !== 1) throw new Error('WORKFLOW_AUTHORITY_CHANGED');
    const readback = await this.read(candidateId);
    if (!readback || readback.state !== patch.state || (patch.pull_request !== undefined && readback.pull_request !== patch.pull_request) ||
      (patch.source_commit !== undefined && readback.source_commit !== patch.source_commit) || (patch.merge_commit !== undefined && readback.merge_commit !== patch.merge_commit)) {
      throw new Error('PUBLICATION_EFFECT_READBACK_FAILED');
    }
  }
}
