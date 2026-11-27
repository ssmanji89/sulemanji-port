import { afterEach, describe, expect, it, vi } from 'vitest';
import { runEditorialAdmission } from '../src/editorial/workflow-core.js';
import { parseEditorialPolicy } from '../src/editorial/scheduler.js';
import { OperationsD1 } from './operations.test-support.js';

class DurableStep {
  values = new Map<string, unknown>();
  async do<T>(name: string, callback: () => Promise<T> | T): Promise<T> {
    if (!this.values.has(name)) this.values.set(name, await callback());
    return this.values.get(name) as T;
  }
}

describe('resumable editorial workflow admission', () => {
  it('records a typed policy hold when no approved runtime policy is configured', async () => {
    const db = new PipelineD1();
    db.control.paused = 0;
    const env = { DB: db as unknown as D1Database };
    const params = { slot_claim_id: '2026-11-26:08:00' };
    const step = new DurableStep();
    expect(await runEditorialAdmission(params, env as never, step)).toMatchObject({ status: 'held', reason: 'Editorial policy is not configured.', slot_claim_id: params.slot_claim_id });
    expect(await runEditorialAdmission(params, env as never, step)).toMatchObject({ status: 'held', slot_claim_id: params.slot_claim_id });
    expect(db.receipts.size).toBe(1);
  });

  it('does not admit work while paused', async () => {
    const db = new OperationsD1();
    const result = await runEditorialAdmission({ slot_claim_id: 'paused-slot' }, { DB: db as unknown as D1Database } as never, new DurableStep());
    expect(result.status).toBe('held');
    expect(db.receipts.size).toBe(0);
  });
});

const policy = JSON.stringify({
  revision: 'test-policy-r1', timezone: 'America/Chicago', slots: ['08:00'], max_new_articles_daily: 1,
  max_refreshes_daily: 1, max_candidates_per_scan: 3, max_fetches_per_scan: 5,
  max_model_calls_per_candidate: 6, max_review_rounds_per_candidate: 3,
  max_candidate_usd: 0.75, max_daily_usd: 2, max_monthly_usd: 30, model_pricing_revision: 'test-only',
});

class PipelineD1 {
  control = { paused: 0, owner_epoch: 1 };
  receipts = new Map<string, Record<string, unknown>>();
  candidates = new Map<string, Record<string, unknown>>();
  prepare(sql: string) {
    let args: unknown[] = [];
    const statement = {
      bind: (...values: unknown[]) => { args = values; return statement; },
      first: async <T>() => {
        if (sql.includes('FROM editorial_control')) return this.control as T;
        if (sql.includes('FROM editorial_receipts WHERE id = ?')) return (this.receipts.get(String(args[0])) ?? null) as T | null;
        if (sql.includes('FROM editorial_candidates WHERE id = ?')) return (this.candidates.get(String(args[0])) ?? null) as T | null;
        return null;
      },
      all: async <T>() => {
        if (sql.includes('FROM public_knowledge')) return { results: [] as T[] };
        if (sql.includes('FROM editorial_receipts')) return { results: [...this.receipts.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, Number(args[0])) as T[] };
        if (sql.includes('FROM editorial_candidates')) return { results: [...this.candidates.values()].slice(0, Number(args[0])) as T[] };
        return { results: [] as T[] };
      },
      run: async () => {
        if (sql.includes('INSERT OR IGNORE INTO editorial_receipts')) {
          const [id, candidate_id, action, result_json, created_at] = args;
          if (this.receipts.has(String(id))) return { meta: { changes: 0 } };
          this.receipts.set(String(id), { id, candidate_id, action, result_json, created_at });
          return { meta: { changes: 1 } };
        }
        if (sql.includes('INSERT OR IGNORE INTO editorial_candidates')) {
          const [id, revision, payload_json, updated_at] = args;
          if (this.candidates.has(String(id))) return { meta: { changes: 0 } };
          this.candidates.set(String(id), { id, state: 'HELD', revision, payload_json, model_calls: 0, review_rounds: 0, updated_at });
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 0 } };
      },
    };
    return statement;
  }
}

afterEach(() => vi.unstubAllGlobals());
let sourceFetchCalls = 0;

function sourceFetcher({ candidate }: { candidate: boolean }): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    sourceFetchCalls += 1;
    const url = new URL(String(input));
    if (url.pathname === '/content-index.json') return Response.json({ schema_version: 1, items: candidate ? [
      { id: 'cloudflare-workers', canonical_url: '/work/cloudflare/', title: 'Cloudflare Workers', summary: 'A public guide.', topics: ['infrastructure'] },
    ] : [] });
    if (candidate && url.hostname === 'blog.cloudflare.com') {
      const date = new Date().toUTCString();
      return new Response(`<rss><channel><item><title>Cloudflare Workers release update</title><description>A new documented version is available.</description><link>https://blog.cloudflare.com/workers/release/</link><pubDate>${date}</pubDate></item></channel></rss>`);
    }
    return new Response('<rss><channel></channel></rss>');
  }) as typeof fetch;
}

describe('deterministic signal workflow', () => {
  it('persists one successful NO_CHANGE receipt without calling a model when sources have no new items', async () => {
    sourceFetchCalls = 0;
    const fetcher = sourceFetcher({ candidate: false });
    vi.stubGlobal('fetch', fetcher);
    const db = new PipelineD1();
    const params = { slot_claim_id: '2026-11-27:08:00' };
    const result = await runEditorialAdmission(params, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep());
    expect(result).toMatchObject({ status: 'no_change', slot_claim_id: params.slot_claim_id });
    expect([...db.receipts.values()].map((row) => row.action)).toEqual(['NO_CHANGE']);
    expect(db.candidates.size).toBe(0);
    const completedFetchCount = sourceFetchCalls;
    expect(await runEditorialAdmission(params, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep()))
      .toMatchObject({ status: 'no_change' });
    expect(sourceFetchCalls).toBe(completedFetchCount);
    expect(db.receipts.size).toBe(1);
  });

  it('persists an actionable candidate as HELD when provider adapters are absent', async () => {
    vi.stubGlobal('fetch', sourceFetcher({ candidate: true }));
    const db = new PipelineD1();
    const result = await runEditorialAdmission({ slot_claim_id: '2026-11-27:13:00' }, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep());
    expect(result).toMatchObject({ status: 'held', reason: 'Candidate awaits configured author, reviewer, publisher, and readback adapters.' });
    expect([...db.candidates.values()]).toHaveLength(1);
    expect([...db.candidates.values()][0]).toMatchObject({ state: 'HELD' });
    expect([...db.receipts.values()].map((row) => row.action)).toEqual(['HELD_PROVIDER_UNCONFIGURED']);
  });

  it('holds a failed source batch instead of reporting NO_CHANGE', async () => {
    vi.stubGlobal('fetch', (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      return url.pathname === '/content-index.json' ? Response.json({ schema_version: 1, items: [] }) : new Response('unavailable', { status: 503 });
    }) as typeof fetch);
    const db = new PipelineD1();
    const result = await runEditorialAdmission({ slot_claim_id: '2026-11-27:19:00' }, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep());
    expect(result).toMatchObject({ status: 'held', reason: 'Public source reads failed; the run cannot conclude NO_CHANGE.' });
    expect([...db.receipts.values()].map((row) => row.action)).toEqual(['HELD_SOURCE_UNAVAILABLE']);
  });

  it('rejects proposed, partial, or oversized runtime policy shapes', () => {
    expect(parseEditorialPolicy(policy)?.revision).toBe('test-policy-r1');
    expect(parseEditorialPolicy(JSON.stringify({ ...JSON.parse(policy), status: 'proposed' }))).toBeNull();
    expect(parseEditorialPolicy(JSON.stringify({ ...JSON.parse(policy), max_review_rounds_per_candidate: 4 }))).toBeNull();
    expect(parseEditorialPolicy(undefined)).toBeNull();
  });
});
