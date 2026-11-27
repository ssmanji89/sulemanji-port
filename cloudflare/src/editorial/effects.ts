import type { PublishEffectStore } from './publisher.js';

export class D1PublishEffectStore implements PublishEffectStore {
  constructor(private readonly db: D1Database, private readonly ownerEpoch: number) {}

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
    return this.db.prepare('SELECT pull_request, source_commit, merge_commit, state FROM publication_effects WHERE candidate_id = ?')
      .bind(candidateId).first<{ pull_request: number | null; source_commit: string | null; merge_commit: string | null; state: string }>();
  }

  async record(candidateId: string, patch: { pull_request?: number; source_commit?: string; merge_commit?: string; state: string }): Promise<void> {
    const current = await this.read(candidateId);
    if (!current) throw new Error('PUBLICATION_EFFECT_INTENT_MISSING');
    const result = await this.db.prepare(`UPDATE publication_effects SET pull_request = COALESCE(?, pull_request), source_commit = COALESCE(?, source_commit),
      merge_commit = COALESCE(?, merge_commit), state = ?, updated_at = ? WHERE candidate_id = ? AND EXISTS (
        SELECT 1 FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?
      )`)
      .bind(patch.pull_request ?? null, patch.source_commit ?? null, patch.merge_commit ?? null, patch.state, new Date().toISOString(), candidateId, this.ownerEpoch).run();
    if ((result.meta.changes ?? 0) !== 1) throw new Error('WORKFLOW_AUTHORITY_CHANGED');
    const readback = await this.read(candidateId);
    if (!readback || readback.state !== patch.state || (patch.pull_request !== undefined && readback.pull_request !== patch.pull_request) ||
      (patch.source_commit !== undefined && readback.source_commit !== patch.source_commit) || (patch.merge_commit !== undefined && readback.merge_commit !== patch.merge_commit)) {
      throw new Error('PUBLICATION_EFFECT_READBACK_FAILED');
    }
  }
}
