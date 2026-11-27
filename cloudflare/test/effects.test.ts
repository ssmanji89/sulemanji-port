import { describe, expect, it } from 'vitest';
import { D1PublishEffectStore } from '../src/editorial/effects.js';

class EffectsD1 {
  control = { paused: 0, owner_epoch: 1 };
  rows = new Map<string, Record<string, unknown>>();
  prepare(sql: string) {
    let args: unknown[] = [];
    const statement = {
      bind: (...values: unknown[]) => { args = values; return statement; },
      first: async <T>() => {
        if (sql.includes('FROM editorial_control')) return this.control as T;
        if (sql.includes('FROM publication_effects')) return (this.rows.get(String(args[0])) ?? null) as T | null;
        return null;
      },
      run: async () => {
        const guarded = /EXISTS\s*\(\s*SELECT 1 FROM editorial_control/.test(sql);
        const epoch = Number(args.at(-1));
        if (guarded && (this.control.paused !== 0 || this.control.owner_epoch !== epoch)) return { meta: { changes: 0 } };
        if (sql.includes('INSERT OR IGNORE INTO publication_effects')) {
          const candidateId = String(args[0]);
          if (!this.rows.has(candidateId)) this.rows.set(candidateId, { candidate_id: args[0], effect_id: args[1], owner_epoch: args[2], branch: args[3], state: 'INTENT', content_digest: args[4], updated_at: args[5], pull_request: null, source_commit: null, merge_commit: null });
          return { meta: { changes: 1 } };
        }
        if (sql.includes('UPDATE publication_effects')) {
          const candidateId = String(args[5]);
          const current = this.rows.get(candidateId);
          if (!current) return { meta: { changes: 0 } };
          const [pullRequest, sourceCommit, mergeCommit, state] = args;
          this.rows.set(candidateId, { ...current, pull_request: pullRequest ?? current.pull_request, source_commit: sourceCommit ?? current.source_commit,
            merge_commit: mergeCommit ?? current.merge_commit, state });
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 0 } };
      },
    };
    return statement;
  }
}

describe('owner-epoch fenced publication effects', () => {
  it('rejects intent and state writes after pause or owner-epoch change', async () => {
    const db = new EffectsD1();
    const store = new D1PublishEffectStore(db as unknown as D1Database, 1);
    await store.ensureIntent('candidate', 'publication:candidate', 'editorial/candidate', 1, 'a'.repeat(64));
    expect(await store.read('candidate')).toMatchObject({ state: 'INTENT', owner_epoch: 1 });

    db.control = { paused: 1, owner_epoch: 2 };
    await expect(store.record('candidate', { state: 'MERGED', merge_commit: 'b'.repeat(40) })).rejects.toThrow('WORKFLOW_AUTHORITY_CHANGED');
    expect(await store.read('candidate')).toMatchObject({ state: 'INTENT', merge_commit: null });
    await expect(new D1PublishEffectStore(db as unknown as D1Database, 1).ensureIntent('other', 'publication:other', 'editorial/other', 1, 'c'.repeat(64)))
      .rejects.toThrow('WORKFLOW_AUTHORITY_CHANGED');
    expect(await store.read('other')).toBeNull();
  });

  it('records effect readback under the matching active epoch', async () => {
    const db = new EffectsD1();
    const store = new D1PublishEffectStore(db as unknown as D1Database, 1);
    await store.ensureIntent('candidate', 'publication:candidate', 'editorial/candidate', 1, 'a'.repeat(64));
    await store.record('candidate', { state: 'MERGED', merge_commit: 'b'.repeat(40) });
    expect(await store.read('candidate')).toMatchObject({ state: 'MERGED', merge_commit: 'b'.repeat(40), owner_epoch: 1 });
  });
});
