import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { D1PublishEffectStore } from '../src/editorial/effects.js';
import { claimDeferredPublication } from '../src/editorial/workflow-core.js';

const limits = { new_articles: 1, refreshes: 1 };
const creation = { new_articles: 1, refreshes: 0 };
const refresh = { new_articles: 0, refreshes: 1 };

function sqliteD1(beforeCapacity?: (sqlite: DatabaseSync) => void) {
  const sqlite = new DatabaseSync(':memory:');
  const migrations = new URL('../migrations/', import.meta.url);
  for (const name of readdirSync(migrations).filter((file) => file.endsWith('.sql')).sort()) {
    if (name.startsWith('0007_')) beforeCapacity?.(sqlite);
    sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
  }
  sqlite.exec('UPDATE editorial_control SET paused = 0');
  const db = { prepare(sql: string) {
    const statement = sqlite.prepare(sql);
    let bindings: SQLInputValue[] = [];
    return {
      bind(...values: SQLInputValue[]) { bindings = values; return this; },
      async first() { return statement.get(...bindings) ?? null; },
      async all() { return { results: statement.all(...bindings) }; },
      async run() { return { meta: { changes: Number(statement.run(...bindings).changes) } }; },
    };
  } } as unknown as D1Database;
  return { sqlite, db };
}

async function seedMergeable(store: D1PublishEffectStore, ...ids: string[]) {
  for (const id of ids) {
    await store.ensureIntent(id, `publication:${id}`, `editorial/${id}`, 1, 'a'.repeat(64));
    await store.record(id, { state: 'SOURCE_PUBLISHED', pull_request: 1, source_commit: 'b'.repeat(40) });
  }
}

describe('daily merge capacity on SQLite', () => {
  it('requires a paused, drained database and a clean accounting day before migrating', () => {
    const migration = readFileSync(new URL('../migrations/0007_editorial_publication_capacity.sql', import.meta.url), 'utf8');
    const { sqlite } = sqliteD1((db) => {
      db.exec('UPDATE editorial_control SET paused = 0');
      expect(() => db.exec(migration)).toThrow(/publication_capacity_cutover_safe/);
      db.exec('UPDATE editorial_control SET paused = 1');
      db.exec(`INSERT INTO publication_effects(candidate_id, effect_id, branch, state, owner_epoch, content_digest, updated_at)
        VALUES ('historical', 'historical', 'editorial/historical', 'MERGED', 1, 'digest', datetime('now'))`);
      expect(() => db.exec(migration)).toThrow(/publication_capacity_cutover_safe/);
      db.exec("UPDATE publication_effects SET state = 'FAILED', merge_commit = 'historical-merge'");
      expect(() => db.exec(migration)).toThrow(/publication_capacity_cutover_safe/);
      db.exec("UPDATE publication_effects SET updated_at = datetime('now', '-27 hours'), state = 'UNCERTAIN'");
      expect(() => db.exec(migration)).toThrow(/publication_capacity_cutover_safe/);
      db.exec("UPDATE publication_effects SET state = 'MERGED'");
    });
    sqlite.close();
  });

  it('admits only one concurrent new article, preserves replay and keeps refresh capacity separate', async () => {
    const { db, sqlite } = sqliteD1();
    try {
      const store = new D1PublishEffectStore(db, 1, limits, () => new Date('2026-11-27T12:00:00Z'));
      await seedMergeable(store, 'first', 'second', 'refresh', 'extra-refresh');
      const results = await Promise.all(['first', 'second'].map((id) => store.reserveMergeCapacity(id, creation)));
      expect(results.filter(Boolean)).toHaveLength(1);
      const winner = results[0] ? 'first' : 'second';
      await expect(store.reserveMergeCapacity(winner, creation)).resolves.toBe(true);
      await expect(store.reserveMergeCapacity('refresh', refresh)).resolves.toBe(true);
      await expect(store.reserveMergeCapacity('extra-refresh', refresh)).resolves.toBe(false);
      sqlite.exec('UPDATE editorial_control SET paused=1, owner_epoch=2');
      await expect(store.reserveMergeCapacity(winner, creation)).rejects.toThrow('WORKFLOW_AUTHORITY_CHANGED');
    } finally { sqlite.close(); }
  });

  it('reconciles a prior-owner charge only from the exact closed PR and head', async () => {
    const { db, sqlite } = sqliteD1();
    try {
      const prior = new D1PublishEffectStore(db, 1, limits, () => new Date('2026-11-27T05:00:00Z'));
      await seedMergeable(prior, 'prior');
      await expect(prior.reserveMergeCapacity('prior', creation)).resolves.toBe(true);
      sqlite.exec('UPDATE editorial_control SET owner_epoch = 2');
      let now = new Date('2026-11-27T12:00:00Z');
      const current = new D1PublishEffectStore(db, 2, limits, () => now);
      await expect(prior.record('prior', { state: 'MERGED', merge_commit: 'c'.repeat(40) })).rejects.toThrow('WORKFLOW_AUTHORITY_CHANGED');
      await current.reconcileMergeCapacity(async () => ({ state: 'closed', number: 1, head_sha: 'f'.repeat(40),
        merged: true, merge_commit_sha: 'c'.repeat(40), checks: 'success' }));
      expect((await current.read('prior'))?.merge_commit).toBeNull();

      await current.reconcileMergeCapacity(async () => ({ state: 'closed', number: 1, head_sha: 'b'.repeat(40),
        merged: true, merge_commit_sha: 'c'.repeat(40), checks: 'success' }));
      expect(await current.read('prior')).toMatchObject({ state: 'MERGED', owner_epoch: 1, merge_commit: 'c'.repeat(40) });
      await current.ensureIntent('next', 'publication:next', 'editorial/next', 2, 'a'.repeat(64));
      await current.record('next', { state: 'SOURCE_PUBLISHED', pull_request: 2, source_commit: 'b'.repeat(40) });
      await expect(current.reserveMergeCapacity('next', creation)).resolves.toBe(false);
      now = new Date('2026-11-28T06:01:00Z');
      await expect(current.reserveMergeCapacity('next', creation)).resolves.toBe(true);
    } finally { sqlite.close(); }
  });

  it('claims a reviewed pending publication once per day and recovers an unfinished attempt', async () => {
    const { db, sqlite } = sqliteD1();
    try {
      const candidate = { id: 'held', source_digest: 'digest', signal_ids: ['source'] };
      const signal = { id: 'source' };
      const proposal = { candidate_id: candidate.id, owner_epoch: 1 };
      const payload = { owner_epoch: 1, candidate, pipeline: {
        signal, proposal, review: proposal, attempt: { ...proposal, pull_request: 3, status: 'CAPACITY_HELD' },
      } };
      sqlite.prepare(`INSERT INTO editorial_candidates (id, state, revision, payload_json, updated_at, publication_retry_after)
        VALUES (?, 'CAPACITY_HELD', ?, ?, ?, ?)`).run(candidate.id, candidate.source_digest,
        JSON.stringify(payload), '2026-11-27T23:00:00.000Z', '2026-11-28T06:00:00.000Z');
      await expect(claimDeferredPublication(db, 'early', new Date('2026-11-28T05:59:59Z'), 1)).resolves.toBeNull();
      const today = new Date('2026-11-28T12:00:00Z');
      const claims = await Promise.all(['first-slot', 'other-slot'].map((slot) => claimDeferredPublication(db, slot, today, 1)));
      expect(claims.filter(Boolean)).toHaveLength(1);
      const winner = claims[0] ? 'first-slot' : 'other-slot';
      await expect(claimDeferredPublication(db, winner, today, 1)).resolves.toMatchObject({ candidate, signal });
      await expect(claimDeferredPublication(db, 'tomorrow', new Date('2026-11-29T12:00:00Z'), 1)).resolves.toMatchObject({ candidate, signal });
      sqlite.exec('UPDATE editorial_control SET paused=1, owner_epoch=2');
      await expect(claimDeferredPublication(db, 'tomorrow', new Date('2026-11-29T12:00:00Z'), 1)).resolves.toBeNull();
    } finally { sqlite.close(); }
  });

  it('carries an unresolved merge across Chicago midnight and frees capacity only after a later day', async () => {
    const { db, sqlite } = sqliteD1();
    try {
      let now = new Date('2026-11-27T05:59:00Z');
      const store = new D1PublishEffectStore(db, 1, limits, () => now);
      await seedMergeable(store, 'late', 'next');
      await expect(store.reserveMergeCapacity('late', creation)).resolves.toBe(true);
      now = new Date('2026-11-27T06:01:00Z');
      await expect(store.reserveMergeCapacity('next', creation)).resolves.toBe(false);
      await store.record('late', { state: 'MERGED', merge_commit: 'c'.repeat(40) });
      await expect(store.reserveMergeCapacity('next', creation)).resolves.toBe(false);
      now = new Date('2026-11-28T06:01:00Z');
      await expect(store.reserveMergeCapacity('next', creation)).resolves.toBe(true);
    } finally { sqlite.close(); }
  });
});

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
          const candidateId = String(args[6]);
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
    const store = new D1PublishEffectStore(db as unknown as D1Database, 1, limits);
    await store.ensureIntent('candidate', 'publication:candidate', 'editorial/candidate', 1, 'a'.repeat(64));
    expect(await store.read('candidate')).toMatchObject({ state: 'INTENT', owner_epoch: 1 });

    db.control = { paused: 1, owner_epoch: 2 };
    await expect(store.record('candidate', { state: 'MERGED', merge_commit: 'b'.repeat(40) })).rejects.toThrow('WORKFLOW_AUTHORITY_CHANGED');
    expect(await store.read('candidate')).toMatchObject({ state: 'INTENT', merge_commit: null });
    await expect(new D1PublishEffectStore(db as unknown as D1Database, 1, limits).ensureIntent('other', 'publication:other', 'editorial/other', 1, 'c'.repeat(64)))
      .rejects.toThrow('WORKFLOW_AUTHORITY_CHANGED');
    expect(await store.read('other')).toBeNull();
  });

  it('records effect readback under the matching active epoch', async () => {
    const db = new EffectsD1();
    const store = new D1PublishEffectStore(db as unknown as D1Database, 1, limits);
    await store.ensureIntent('candidate', 'publication:candidate', 'editorial/candidate', 1, 'a'.repeat(64));
    await store.record('candidate', { state: 'MERGED', merge_commit: 'b'.repeat(40) });
    expect(await store.read('candidate')).toMatchObject({ state: 'MERGED', merge_commit: 'b'.repeat(40), owner_epoch: 1 });
  });
});
