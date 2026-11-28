import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { runEditorialAdmission as runWorkerAdmission } from '../src/editorial/workflow-core.js';
import { nextChicagoBudgetDay, parseEditorialPolicy } from '../src/editorial/scheduler.js';
import { fingerprintPublicKnowledge } from '../src/editorial/knowledge.js';
import sourceRegistry from '../config/public-sources.json' with { type: 'json' };
import { OperationsD1 } from './operations.test-support.js';

class DurableStep {
  values = new Map<string, unknown>();
  async sleep(_name: string, _milliseconds: number) {}
  async do<T>(name: string, callback: () => Promise<T> | T): Promise<T> {
    if (!this.values.has(name)) this.values.set(name, await callback());
    return this.values.get(name) as T;
  }
}

function addScheduleClaim(db: PipelineD1, id: string, ownerEpoch: number | null = db.control.owner_epoch) {
  db.slots.set(id, { id, local_date: '2026-11-27', slot: '08:00', owner_epoch: ownerEpoch });
}

function runEditorialAdmission(params: Parameters<typeof runWorkerAdmission>[0], env: Parameters<typeof runWorkerAdmission>[1], step: DurableStep,
  processor?: Parameters<typeof runWorkerAdmission>[4]) {
  const db = env.DB as unknown as PipelineD1;
  if (db instanceof PipelineD1) addScheduleClaim(db, params.slot_claim_id);
  return runWorkerAdmission(params, env, step, 'slot-2026-11-27-0800', processor);
}

describe('resumable editorial workflow admission', () => {
  it('holds unclaimed slots without recording a result', async () => {
    const db = new PipelineD1();
    const params = { slot_claim_id: '2026-11-27:08:00' };

    const result = await runWorkerAdmission(params, { DB: db } as never, new DurableStep(), 'slot-2026-11-27-0800');

    expect(result).toMatchObject({ status: 'held', reason: 'No current schedule claim matches this Workflow instance.' });
    expect(db.receipts.size).toBe(0);
    expect(db.candidates.size).toBe(0);
  });

  it.each([
    { claimEpoch: 1, instanceId: 'slot-2026-11-27-1300' },
    { claimEpoch: 0, instanceId: 'slot-2026-11-27-0800' },
    { claimEpoch: null, instanceId: 'slot-2026-11-27-0800' },
  ])('holds claims assigned to another Workflow instance or publisher epoch ($claimEpoch, $instanceId)', async ({ claimEpoch, instanceId }) => {
    const db = new PipelineD1();
    const params = { slot_claim_id: '2026-11-27:08:00' };
    addScheduleClaim(db, params.slot_claim_id, claimEpoch);

    const result = await runWorkerAdmission(params, { DB: db } as never, new DurableStep(), instanceId);

    expect(result).toMatchObject({ status: 'held', reason: 'No current schedule claim matches this Workflow instance.' });
    expect(db.receipts.size).toBe(0);
  });

  it.each([false, true])('returns the durable receipt when a slot is resumed (cached missing receipt: %s)', async (cachedMissing) => {
    const db = new PipelineD1();
    const params = { slot_claim_id: 'verified-slot' };
    db.receipts.set('slot-result:verified-slot', { id: 'slot-result:verified-slot', action: 'VERIFIED',
      result_json: JSON.stringify({ reason: 'All candidates were verified.', owner_epoch: 1 }), created_at: new Date().toISOString() });

    const step = new DurableStep();
    if (cachedMissing) step.values.set('read-existing-slot-result', null);
    const result = await runEditorialAdmission(params, { DB: db as unknown as D1Database } as never, step);

    expect(result).toMatchObject({ status: 'admitted', reason: 'All candidates were verified.', slot_claim_id: params.slot_claim_id });
  });

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
  max_refreshes_daily: 1, max_candidates_per_scan: 3, max_fetches_per_scan: sourceRegistry.filter(({ enabled }) => enabled).length,
  max_model_calls_per_candidate: 6, max_review_rounds_per_candidate: 3,
  max_candidate_usd: 0.75, max_daily_usd: 2, max_monthly_usd: 30, model_pricing_revision: 'test-only',
});

class PipelineD1 {
  control = { paused: 0, owner_epoch: 1 };
  slots = new Map<string, Record<string, unknown>>();
  receipts = new Map<string, Record<string, unknown>>();
  candidates = new Map<string, Record<string, unknown>>();
  sourceStates = new Map<string, Record<string, unknown>>();
  sourceAttempts = new Map<string, Record<string, unknown>>();
  prepare(sql: string) {
    let args: unknown[] = [];
    const statement = {
      bind: (...values: unknown[]) => { args = values; return statement; },
      first: async <T>() => {
        if (sql.includes('SET publication_retry_claim')) {
          const [slot, lease, epoch, , due] = args;
          if (this.control.paused || this.control.owner_epoch !== epoch) return null;
          const row = [...this.candidates.values()].find((candidate) => candidate.state === 'CAPACITY_HELD' &&
            (candidate.publication_retry_claim === slot || String(candidate.publication_retry_after) <= String(due)));
          if (row) Object.assign(row, { publication_retry_claim: slot, publication_retry_after: lease });
          return (row ?? null) as T | null;
        }
        if (sql.includes('FROM editorial_control')) return this.control as T;
        if (sql.includes('FROM schedule_claims')) {
          const row = this.slots.get(String(args[0]));
          return (row?.owner_epoch === args[1] && this.control.paused === 0 && this.control.owner_epoch === args[1] ? row : null) as T | null;
        }
        if (sql.includes('FROM editorial_receipts WHERE id = ?')) return (this.receipts.get(String(args[0])) ?? null) as T | null;
        if (sql.includes('FROM editorial_candidates WHERE id = ?')) return (this.candidates.get(String(args[0])) ?? null) as T | null;
        if (sql.includes('FROM editorial_source_state WHERE source_id = ?')) return (this.sourceStates.get(String(args[0])) ?? null) as T | null;
        return null;
      },
      all: async <T>() => {
        if (sql.includes('FROM public_knowledge')) return { results: [] as T[] };
        if (sql.includes('FROM editorial_source_state')) return { results: [...this.sourceStates.values()] as T[] };
        if (sql.includes('FROM editorial_source_attempts')) return { results: [...this.sourceAttempts.values()] as T[] };
        if (sql.includes('FROM editorial_receipts')) return { results: [...this.receipts.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, Number(args[0])) as T[] };
        if (sql.includes('FROM editorial_candidates')) return { results: [...this.candidates.values()].slice(0, Number(args.at(-1))) as T[] };
        return { results: [] as T[] };
      },
      run: async () => {
        if (sql.includes('INSERT OR IGNORE INTO editorial_receipts')) {
          const [id, candidate_id, action, result_json, created_at] = args;
          if (sql.includes('owner_epoch = ?') && (this.control.paused !== 0 || this.control.owner_epoch !== Number(args.at(-1)))) return { meta: { changes: 0 } };
          if (this.receipts.has(String(id))) return { meta: { changes: 0 } };
          this.receipts.set(String(id), { id, candidate_id, action, result_json, created_at });
          return { meta: { changes: 1 } };
        }
        if (sql.includes('INSERT OR IGNORE INTO editorial_candidates')) {
          const [id, revision, payload_json, updated_at] = args;
          if (sql.includes('owner_epoch = ?') && (this.control.paused !== 0 || this.control.owner_epoch !== Number(args.at(-1)))) return { meta: { changes: 0 } };
          if (this.candidates.has(String(id))) return { meta: { changes: 0 } };
          this.candidates.set(String(id), { id, state: 'HELD', revision, payload_json, model_calls: 0, review_rounds: 0, updated_at });
          return { meta: { changes: 1 } };
        }
        if (sql.includes('UPDATE editorial_candidates SET payload_json')) {
          const [payload_json, updated_at, id, revision, previous, ownerEpoch] = args;
          const row = this.candidates.get(String(id));
          if (this.control.paused !== 0 || this.control.owner_epoch !== ownerEpoch ||
              row?.state !== 'HELD' || row.revision !== revision || row.payload_json !== previous ||
              row.model_calls !== 0 || row.review_rounds !== 0) return { meta: { changes: 0 } };
          Object.assign(row, { payload_json, updated_at });
          return { meta: { changes: 1 } };
        }
        if (sql.includes('editorial_source_state')) {
          const [source_id, fetched_at, signals_json, ownerEpoch] = args;
          if (this.control.paused !== 0 || this.control.owner_epoch !== Number(ownerEpoch)) return { meta: { changes: 0 } };
          this.sourceStates.set(String(source_id), { source_id, fetched_at, signals_json });
          return { meta: { changes: 1 } };
        }
        if (sql.includes('editorial_source_attempts')) {
          const [source_id, last_attempt_at, retry_after, consecutive_failures, last_failure_code, ownerEpoch] = args;
          if (this.control.paused !== 0 || this.control.owner_epoch !== Number(ownerEpoch)) return { meta: { changes: 0 } };
          this.sourceAttempts.set(String(source_id), { source_id, last_attempt_at, retry_after, consecutive_failures, last_failure_code });
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 0 } };
      },
    };
    return statement;
  }
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
let sourceFetchCalls = 0;

function sourceFetcher({ candidate }: { candidate: boolean }): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    sourceFetchCalls += 1;
    const url = new URL(String(input));
    if (url.pathname === '/content-index.json') return Response.json({ schema_version: 1, items: candidate ? [
      { id: 'cloudflare-workers', canonical_url: '/work/cloudflare/', title: 'Cloudflare Workers', summary: 'A public guide.', topics: ['infrastructure'] },
    ] : [] });
    if (url.hostname === 'science.nasa.gov') return Response.json([]);
    if (candidate && url.hostname === 'blog.cloudflare.com') {
      const date = new Date().toUTCString();
      return new Response(`<rss><channel><item><title>Cloudflare Workers release update</title><description>A new documented version is available.</description><link>https://blog.cloudflare.com/workers/release/</link><pubDate>${date}</pubDate></item></channel></rss>`);
    }
    return new Response('<rss><channel></channel></rss>');
  }) as typeof fetch;
}

describe('deterministic signal workflow', () => {
  it.each([
    { canContinue: true, laterSharedHold: false },
    { canContinue: true, laterSharedHold: true },
    { canContinue: false, laterSharedHold: false },
  ])('only continues independently after an explicitly safe candidate hold ($canContinue, $laterSharedHold)', async ({ canContinue, laterSharedHold }) => {
    const now = new Date('2026-11-27T14:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const db = new PipelineD1();
    const catalog = [
      { id: 'workers', canonical_url: '/notes/cloudflare-workers', title: 'Cloudflare Workers', topics: ['infrastructure'] },
      { id: 'markets', canonical_url: '/notes/market-systems', title: 'Market systems', topics: ['markets'] },
    ];
    function entry(title: string, url: string) {
      return `<item><title>${title}</title><description>New documented details.</description><link>${url}</link><pubDate>${now.toUTCString()}</pubDate></item>`;
    }
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/content-index.json') return Response.json({ schema_version: 1, items: catalog });
      const items = url.hostname === 'blog.cloudflare.com'
        ? [entry('Workers release update', 'https://blog.cloudflare.com/workers/release-one/'),
          entry('Workers API version update', 'https://blog.cloudflare.com/workers/release-two/')]
        : url.hostname === 'www.federalreserve.gov'
          ? [entry('Market policy update', 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20261127a.htm')]
          : [];
      if (url.hostname === 'science.nasa.gov') return Response.json([]);
      return new Response(`<rss><channel>${items.join('')}</channel></rss>`);
    });
    const processed: Array<string | null> = [];
    const processor: NonNullable<Parameters<typeof runWorkerAdmission>[4]> = { processCandidate: ({ candidate, step }) => step.do(`test-process-${candidate.id}`, () => {
      processed.push(candidate.target_id);
      if (processed.length === 1) return { status: 'held' as const, reason: 'Original candidate needs review.',
        ...(canContinue ? { continue_after_hold: true as const } : {}) };
      if (laterSharedHold) return { status: 'held' as const, reason: 'The provider requires reconciliation.' };
      return { status: 'verified' as const, reason: 'Exact publication was verified.' };
    }) };
    const params = { slot_claim_id: 'independent-candidate-hold' };
    const env = { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never;
    const step = new DurableStep();
    const result = await runEditorialAdmission(params, env, step, processor);

    expect(db.candidates.size).toBe(3);
    expect(result).toMatchObject({ status: 'held', reason: laterSharedHold ? 'The provider requires reconciliation.' : 'Original candidate needs review.' });
    expect(processed).toEqual(canContinue ? ['workers', 'markets'] : ['workers']);
    const receipt = db.receipts.get(`slot-result:${params.slot_claim_id}`)!;
    expect(receipt.action).toBe('HELD_PUBLICATION_PIPELINE');
    expect(JSON.parse(String(receipt.result_json)).outcomes.map((outcome: { status: string }) => outcome.status))
      .toEqual(canContinue ? ['held', 'held', laterSharedHold ? 'held' : 'verified'] : ['held']);
    expect(await runEditorialAdmission(params, env, step, processor)).toEqual(result);
    expect(processed).toEqual(canContinue ? ['workers', 'markets'] : ['workers']);
  });

  it('admits a dated independent-interest article from the actual source registry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T14:00:00Z'));
    const db = new PipelineD1();
    const feed = sourceRegistry.find(({ id }) => id === 'nasa-skywatching')!;
    let excerpt = '<p>Watch the Moon rise and look for meteors after moonset.</p>';
    const fallback = sourceFetcher({ candidate: false });
    const evidenceUrl = 'https://science.nasa.gov/solar-system/skywatching/whats-up-november-2026-skywatching-tips-from-nasa/';
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/content-index.json')) return Response.json({ schema_version: 1, items: [
        { id: 'independent-interests', canonical_url: '/about/#interests', title: 'Looking up', topics: ['astronomy', 'skywatching'] },
      ] });
      if (url === feed.url) return Response.json([{ link: evidenceUrl, date_gmt: '2026-11-02T18:19:58',
        title: { rendered: 'What&#8217;s Up: November 2026 Skywatching Tips from NASA' },
        content: { rendered: `<h2>Skywatching Highlights</h2><ul><li>${excerpt}</li></ul>` } }]);
      return fallback(input);
    });
    const processCandidate = vi.fn(async () => ({ status: 'held' as const, reason: 'Rehearsal stops before model work.' }));
    const result = await runEditorialAdmission({ slot_claim_id: 'nasa-observing-guide' },
      { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep(), { processCandidate });
    expect(result).toMatchObject({ status: 'held', reason: 'Rehearsal stops before model work.' });
    expect(processCandidate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      candidate: expect.objectContaining({ action: 'CREATE', target_id: null, reader: 'Skywatchers' }),
      signal: expect.objectContaining({ published_at: '2026-11-02T18:19:58.000Z', occurred_at: null,
        summary: 'Watch the Moon rise and look for meteors after moonset.', evidence: [expect.objectContaining({ url: evidenceUrl })] }),
    }));

    vi.setSystemTime(new Date('2026-11-03T21:00:00Z'));
    excerpt = '<p>Watch the Moon rise, then look for meteors after moonset from a dark site.</p>';
    await expect(runEditorialAdmission({ slot_claim_id: 'nasa-observing-guide-clarification' },
      { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep(), { processCandidate }))
      .resolves.toMatchObject({ status: 'no_change' });
    expect(processCandidate).toHaveBeenCalledTimes(1);
    expect(db.candidates.size).toBe(1);
  });

  it('resumes a previously held exact proposal in a later slot before new source discovery', async () => {
    const now = new Date('2026-11-28T14:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const db = new PipelineD1();
    const candidate = { id: 'deferred', source_digest: 'stored-source', signal_ids: ['source'], target_id: 'markets' };
    const signal = { id: 'source' };
    const proposal = { candidate_id: candidate.id, owner_epoch: 1, content_digest: 'stored-content' };
    const review = { ...proposal, decision: 'CLEAR' };
    const attempt = { ...proposal, status: 'CAPACITY_HELD', pull_request: 13 };
    db.candidates.set(candidate.id, { id: candidate.id, revision: candidate.source_digest, state: 'CAPACITY_HELD',
      publication_retry_after: '2026-11-28T06:00:00Z', payload_json: JSON.stringify({ owner_epoch: 1,
        candidate, pipeline: { proposal, review, attempt, signal } }) });
    const fetcher = vi.fn(async () => Response.json({ schema_version: 1, items: [] }));
    vi.stubGlobal('fetch', fetcher);
    const processCandidate = vi.fn(async () => ({ status: 'verified' as const, reason: 'Exact prior proposal verified.' }));
    const params = { slot_claim_id: '2026-11-28:08:00' };
    const env = { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never;
    const step = new DurableStep();
    const first = await runEditorialAdmission(params, env, step, { processCandidate });
    expect(first.status).toBe('admitted');
    expect(processCandidate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ candidate, signal,
      resumeCapacity: expect.objectContaining({ proposal, review, attempt }) }));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await runEditorialAdmission(params, env, step, { processCandidate })).toEqual(first);
    expect(processCandidate).toHaveBeenCalledTimes(1);
  });

  it('uses Chicago midnight on both sides of a daylight-saving transition', () => {
    expect(nextChicagoBudgetDay(new Date('2026-03-08T06:00:00Z'))).toBe(Date.parse('2026-03-09T05:00:00Z'));
    expect(nextChicagoBudgetDay(new Date('2026-11-01T05:00:00Z'))).toBe(Date.parse('2026-11-02T06:00:00Z'));
  });

  it('holds when the catalog redirects away from its exact URL', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 301, headers: { location: '/writing' } }));
    vi.stubGlobal('fetch', fetcher);
    const db = new PipelineD1();
    const result = await runEditorialAdmission({ slot_claim_id: 'catalog-redirect' }, { DB: db, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep());
    expect(result).toMatchObject({ status: 'held', reason: 'The public content index is unavailable or invalid.' });
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('https://www.sulemanji.com/content-index.json', { redirect: 'manual', headers: { accept: 'application/json' } });
    expect(db.candidates.size).toBe(0);
  });

  it('holds instead of declaring NO_CHANGE when the fetch cap leaves enabled sources uncovered', async () => {
    sourceFetchCalls = 0;
    vi.stubGlobal('fetch', sourceFetcher({ candidate: false }));
    const db = new PipelineD1();
    const limitedPolicy = JSON.stringify({ ...JSON.parse(policy), max_fetches_per_scan: 1 });
    const result = await runEditorialAdmission({ slot_claim_id: 'coverage-limited' }, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: limitedPolicy } as never, new DurableStep());
    expect(result).toMatchObject({ status: 'held', reason: 'Enabled public sources remain uncovered by this scan.' });
    expect([...db.receipts.values()].map((row) => row.action)).toEqual(['HELD_SOURCE_COVERAGE_INCOMPLETE']);
    expect(db.sourceStates.size).toBe(1);
  });

  it('uses successful persisted source reads until each configured interval is due', async () => {
    sourceFetchCalls = 0;
    const db = new PipelineD1();
    const now = Date.now();
    for (const source of (sourceRegistry as Array<{ id: string }>)) {
      db.sourceStates.set(source.id, { source_id: source.id, fetched_at: new Date(now - 60 * 60 * 1000).toISOString(), signals_json: '[]' });
    }
    vi.stubGlobal('fetch', sourceFetcher({ candidate: false }));
    const result = await runEditorialAdmission({ slot_claim_id: 'source-cache-fresh' }, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep());
    expect(result.status).toBe('no_change');
    expect(sourceFetchCalls).toBe(1);

    const firstSource = (sourceRegistry as Array<{ id: string }>)[0];
    db.sourceStates.set(firstSource.id, { source_id: firstSource.id, fetched_at: new Date(now - 7 * 60 * 60 * 1000).toISOString(), signals_json: '[]' });
    sourceFetchCalls = 0;
    const dueResult = await runEditorialAdmission({ slot_claim_id: 'source-cache-due' }, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep());
    expect(dueResult.status).toBe('no_change');
    expect(sourceFetchCalls).toBe(2);
    expect(Date.parse(String(db.sourceStates.get(firstSource.id)?.fetched_at))).toBeGreaterThan(now - 60 * 60 * 1000);
  });

  it('rotates due sources by oldest fetch so a one-request cap eventually covers the registry', async () => {
    vi.useFakeTimers();
    const firstDay = new Date('2026-11-27T08:00:00.000Z');
    vi.setSystemTime(firstDay);
    const db = new PipelineD1();
    const sources = sourceRegistry as Array<{ id: string; url: string; min_interval_seconds: number }>;
    const originalIntervals = sources.map((source) => source.min_interval_seconds);
    const base = sourceFetcher({ candidate: false });
    const fetchedUrls: string[] = [];
    vi.stubGlobal('fetch', (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname !== '/content-index.json') fetchedUrls.push(url.toString());
      return base(input, init);
    }) as typeof fetch);
    const limitedPolicy = JSON.stringify({ ...JSON.parse(policy), max_fetches_per_scan: 1 });
    let result: Awaited<ReturnType<typeof runEditorialAdmission>> | undefined;
    try {
      sources.forEach((source) => { source.min_interval_seconds = 10 * 24 * 60 * 60; });
      for (let day = 0; day < sources.length; day += 1) {
        vi.setSystemTime(new Date(firstDay.getTime() + day * 24 * 60 * 60 * 1000));
        result = await runEditorialAdmission({ slot_claim_id: `fairness-day-${day}` }, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: limitedPolicy } as never, new DurableStep());
      }
    } finally {
      sources.forEach((source, index) => { source.min_interval_seconds = originalIntervals[index]; });
    }
    expect(new Set(fetchedUrls)).toEqual(new Set(sources.map((source) => source.url)));
    expect(db.sourceStates.size).toBe(sources.length);
    expect(result?.status).toBe('no_change');
  });

  it('backs off failed source attempts without treating them as successful coverage', async () => {
    vi.useFakeTimers();
    const firstSlot = new Date('2026-11-27T08:00:00.000Z');
    vi.setSystemTime(firstSlot);
    const db = new PipelineD1();
    const base = sourceFetcher({ candidate: false });
    const fetchedUrls: string[] = [];
    vi.stubGlobal('fetch', (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === '/content-index.json') return base(input, init);
      fetchedUrls.push(url.toString());
      if (fetchedUrls.length === 1) return new Response('unavailable', { status: 503 });
      return base(input, init);
    }) as typeof fetch);
    const limitedPolicy = JSON.stringify({ ...JSON.parse(policy), max_fetches_per_scan: 1 });
    const sources = sourceRegistry as Array<{ id: string; url: string }>;
    const first = await runEditorialAdmission({ slot_claim_id: 'retry-day-0' }, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: limitedPolicy } as never, new DurableStep());
    expect(first.status).toBe('held');
    expect(db.sourceStates.has(sources[0].id)).toBe(false);
    expect(db.sourceAttempts.get(sources[0].id)).toMatchObject({ consecutive_failures: 1 });
    expect(Date.parse(String(db.sourceAttempts.get(sources[0].id)?.retry_after))).toBeGreaterThan(firstSlot.getTime() + 60 * 60 * 1000);

    vi.setSystemTime(new Date(firstSlot.getTime() + 60 * 60 * 1000));
    const second = await runEditorialAdmission({ slot_claim_id: 'retry-day-1' }, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: limitedPolicy } as never, new DurableStep());
    expect(second.status).toBe('held');
    expect(fetchedUrls).toEqual([sources[0].url, sources[1].url]);
    expect(db.sourceAttempts.get(sources[0].id)).toMatchObject({ consecutive_failures: 1 });
  });

  it('counts actual HTTP requests across a source redirect chain against the scan budget', async () => {
    const base = sourceFetcher({ candidate: false });
    const sourceUrls: string[] = [];
    vi.stubGlobal('fetch', (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === '/content-index.json') return base(input, init);
      sourceUrls.push(url.toString());
      return new Response(null, { status: 302, headers: { location: `${url.pathname}/redirect` } });
    }) as typeof fetch);
    const db = new PipelineD1();
    const limitedPolicy = JSON.stringify({ ...JSON.parse(policy), max_fetches_per_scan: 1 });
    const result = await runEditorialAdmission({ slot_claim_id: 'redirect-budget' }, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: limitedPolicy } as never, new DurableStep());
    expect(result.status).toBe('held');
    expect(sourceUrls).toHaveLength(1);
    expect(sourceUrls[0]).toBe((sourceRegistry as Array<{ url: string }>)[0].url);
  });

  it('does not persist NO_CHANGE after the owner epoch changes during source reads', async () => {
    const db = new PipelineD1();
    const base = sourceFetcher({ candidate: false });
    let feeds = 0;
    vi.stubGlobal('fetch', (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const response = await base(input, init);
      if (url.pathname !== '/content-index.json' && ++feeds === 1) db.control = { paused: 0, owner_epoch: 2 };
      return response;
    }) as typeof fetch);
    const result = await runEditorialAdmission({ slot_claim_id: 'stale-no-change' }, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep());
    expect(result.status).toBe('held');
    expect(feeds).toBe(1);
    expect([...db.receipts.values()].some((row) => row.action === 'NO_CHANGE')).toBe(false);
  });

  it('does not persist an actionable candidate after the owner epoch changes during source reads', async () => {
    const db = new PipelineD1();
    const base = sourceFetcher({ candidate: true });
    let feedCalls = 0;
    vi.stubGlobal('fetch', (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const response = await base(input, init);
      if (url.pathname !== '/content-index.json' && ++feedCalls === 1) db.control = { paused: 0, owner_epoch: 2 };
      return response;
    }) as typeof fetch);
    const result = await runEditorialAdmission({ slot_claim_id: 'stale-candidate' }, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep());
    expect(result.status).toBe('held');
    expect(db.candidates.size).toBe(0);
    expect(feedCalls).toBe(1);
    expect([...db.receipts.values()].some((row) => row.action === 'HELD_PROVIDER_UNCONFIGURED')).toBe(false);
  });

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

  it('records a durable NO_CHANGE when new feed IDs only repeat a published article', async () => {
    const now = new Date('2026-11-27T14:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const title = 'Cloudflare Workers release update';
    const summary = 'A new documented version changes a workflow decision.';
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/content-index.json') return Response.json({ schema_version: 1, items: [{
        id: 'published', canonical_url: '/notes/published-release', title, summary, topics: ['infrastructure'],
      }] });
      if (url.hostname === 'science.nasa.gov') return Response.json([]);
      const item = (id: string, attribution: string) => `<item><guid>${id}</guid><title>${title}</title><description>${summary}</description><link>https://blog.cloudflare.com/repost/${id}</link><pubDate>${now.toUTCString()}</pubDate>${attribution}</item>`;
      const entries = url.hostname === 'blog.cloudflare.com'
        ? item('a', '<source url="https://www.sulemanji.com/feed.xml">Original</source>') + item('b', '')
        : '';
      return new Response(`<rss><channel>${entries}</channel></rss>`);
    });
    const db = new PipelineD1();
    const processCandidate = vi.fn(async () => { throw new Error('Recycled evidence reached publication preparation'); });
    const params = { slot_claim_id: 'recycled-source' };
    const result = await runEditorialAdmission(params, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never,
      new DurableStep(), { processCandidate });
    expect(result).toMatchObject({ status: 'no_change' });
    expect([...db.receipts.values()].map(({ action }) => action)).toEqual(['NO_CHANGE']);
    expect(db.candidates.size).toBe(0);
    expect(processCandidate).not.toHaveBeenCalled();
  });

  it('persists an actionable candidate as HELD when provider adapters are absent', async () => {
    vi.stubGlobal('fetch', sourceFetcher({ candidate: true }));
    const db = new PipelineD1();
    const result = await runEditorialAdmission({ slot_claim_id: '2026-11-27:13:00' }, { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep());
    expect(result).toMatchObject({ status: 'held', reason: 'Candidate awaits configured author, reviewer, publisher, and readback adapters.' });
    expect([...db.candidates.values()]).toHaveLength(1);
    expect([...db.candidates.values()][0]).toMatchObject({ state: 'HELD' });
    const savedPayload = JSON.parse(String([...db.candidates.values()][0].payload_json));
    expect(savedPayload.candidate.knowledge_revision).toBe(await fingerprintPublicKnowledge([]));
    expect([...db.receipts.values()].map((row) => row.action)).toEqual(['HELD_PROVIDER_UNCONFIGURED']);
  });

  function providerRecoveryDatabase() {
    const sqlite = new DatabaseSync(':memory:');
    onTestFinished(() => sqlite.close());
    const migrations = new URL('../migrations/', import.meta.url);
    for (const name of readdirSync(migrations).filter((file) => file.endsWith('.sql')).sort()) {
      sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
    }
    sqlite.exec('UPDATE editorial_control SET paused = 0');
    const insert = sqlite.prepare('INSERT INTO schedule_claims(id, local_date, slot, claimed_at, owner_epoch) VALUES (?, ?, ?, ?, 1)');
    const slots = ['08:00', '13:00', '14:00'].map((time) => {
      const id = `2026-11-27:${time}`;
      insert.run(id, '2026-11-27', time, new Date().toISOString());
      return { id, workflow: `slot-2026-11-27-${time.replace(':', '')}` };
    });
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
    const env = { DB: db, EDITORIAL_POLICY_JSON: policy } as never;
    return { sqlite, run: (slot: typeof slots[number], processor?: Parameters<typeof runWorkerAdmission>[4], step = new DurableStep()) => runWorkerAdmission(
      { slot_claim_id: slot.id }, env, step, slot.workflow, processor,
    ), slots };
  }

  it('continues discovery after a recycled deferred candidate is retired without publishing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T14:00:00.000Z'));
    vi.stubGlobal('fetch', sourceFetcher({ candidate: true }));
    const { sqlite, run, slots: [first] } = providerRecoveryDatabase();
    const candidate = { id: 'recycled-candidate', target_id: 'cloudflare-workers', signal_ids: ['old-signal'], source_digest: 'old-source' };
    const base = { candidate_id: candidate.id, owner_epoch: 1 };
    sqlite.prepare(`INSERT INTO editorial_candidates(id, state, revision, payload_json, updated_at, publication_retry_after)
      VALUES (?, 'CAPACITY_HELD', ?, ?, ?, ?)`).run(candidate.id, candidate.source_digest, JSON.stringify({
        owner_epoch: 1, candidate, pipeline: { proposal: base, review: base,
          signal: { id: 'old-signal' }, attempt: { ...base, status: 'CAPACITY_HELD', pull_request: 7 } },
      }), new Date().toISOString(), '2026-11-27T13:00:00.000Z');
    const processed: string[] = [];
    const result = await run(first, {
      async processCandidate({ candidate: current, resumeCapacity }) {
        processed.push(current.id);
        if (!resumeCapacity) return { status: 'verified', reason: 'Independent publication verified.' };
        expect(sqlite.prepare(`UPDATE editorial_candidates SET state = 'NO_CHANGE',
          publication_retry_after = NULL, publication_retry_claim = NULL WHERE id = ? AND publication_retry_claim = ?`)
          .run(current.id, resumeCapacity.claim).changes).toBe(1);
        return { status: 'no_change', reason: 'This is recycled evidence.' };
      },
    });
    expect(result, result.reason).toMatchObject({ status: 'admitted' });
    expect(processed).toEqual([candidate.id, expect.stringContaining('refresh:')]);
    expect(sqlite.prepare('SELECT state, publication_retry_after, publication_retry_claim FROM editorial_candidates WHERE id = ?')
      .get(candidate.id)).toMatchObject({ state: 'NO_CHANGE', publication_retry_after: null, publication_retry_claim: null });
  });

  it.each([
    { providerRestored: false, legacyRow: false },
    { providerRestored: true, legacyRow: false },
    { providerRestored: true, legacyRow: true },
  ])('keeps a provider-held candidate actionable (provider restored: $providerRestored, legacy row: $legacyRow)', async ({ providerRestored, legacyRow }) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T14:00:00.000Z'));
    vi.stubGlobal('fetch', sourceFetcher({ candidate: true }));
    const { sqlite, run, slots: [first, next] } = providerRecoveryDatabase();
    expect(await run(first)).toMatchObject({ status: 'held' });
    const initial = sqlite.prepare('SELECT id, state FROM editorial_candidates').get();
    expect(initial).toMatchObject({ state: 'HELD' });
    if (legacyRow) sqlite.exec("UPDATE editorial_candidates SET payload_json = json_remove(payload_json, '$.awaiting_processing')");
    vi.setSystemTime(new Date('2026-11-27T19:00:00.000Z'));
    const processCandidate = vi.fn(async () => ({ status: 'verified' as const, reason: 'Fixture publication verified.' }));
    const result = await run(next, providerRestored ? { processCandidate } : undefined);

    expect(result.status).toBe(providerRestored ? 'admitted' : 'held');
    expect(sqlite.prepare('SELECT id FROM editorial_candidates').all()).toEqual([{ id: initial!.id }]);
    const receipt = sqlite.prepare('SELECT action FROM editorial_receipts WHERE id = ?');
    expect(receipt.get(`slot-result:${first.id}`)?.action).toBe('HELD_PROVIDER_UNCONFIGURED');
    expect(receipt.get(`slot-result:${next.id}`)?.action).toBe(providerRestored ? 'VERIFIED' : 'HELD_PROVIDER_UNCONFIGURED');
    if (providerRestored) expect(processCandidate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      candidate: expect.objectContaining({ id: initial!.id }),
    }));
    else expect(processCandidate).not.toHaveBeenCalled();
  });

  it('keeps recent unstarted candidates ahead of older unrelated claims in bounded history', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T14:00:00.000Z'));
    vi.stubGlobal('fetch', sourceFetcher({ candidate: true }));
    const { sqlite, run, slots: [first, next] } = providerRecoveryDatabase();
    expect(await run(first)).toMatchObject({ status: 'held' });
    sqlite.exec(`WITH RECURSIVE old(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM old WHERE n<1000)
      INSERT INTO editorial_candidates(id,state,revision,payload_json,updated_at)
      SELECT 'old'||n,'VERIFIED','fixture','{"processing_slot":"earlier-slot"}','2026-10-01T00:00:00Z' FROM old`);
    vi.setSystemTime(new Date('2026-11-27T19:00:00.000Z'));
    const processCandidate = vi.fn(async () => ({ status: 'verified' as const, reason: 'Fixture publication verified.' }));
    expect(await run(next, { processCandidate })).toMatchObject({ status: 'admitted' });
    expect(processCandidate).toHaveBeenCalledTimes(1);
  });

  it('admits only one concurrent slot to a provider-held candidate', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T14:00:00.000Z'));
    vi.stubGlobal('fetch', sourceFetcher({ candidate: true }));
    const { sqlite, run, slots: [first, next, concurrent] } = providerRecoveryDatabase();
    expect(await run(first)).toMatchObject({ status: 'held' });
    vi.setSystemTime(new Date('2026-11-27T19:00:00.000Z'));
    const processCandidate = vi.fn(async () => ({ status: 'verified' as const, reason: 'Fixture publication verified.' }));
    const results = await Promise.all([run(next, { processCandidate }), run(concurrent, { processCandidate })]);
    expect(processCandidate).toHaveBeenCalledTimes(1);
    expect(results.filter((result) => result.status === 'admitted')).toHaveLength(1);
    expect(sqlite.prepare('SELECT count(*) AS count FROM editorial_candidates').get()?.count).toBe(1);
  });

  it('records a hold while another slot is processing the recovered candidate', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T14:00:00.000Z'));
    vi.stubGlobal('fetch', sourceFetcher({ candidate: true }));
    const { sqlite, run, slots: [first, next, overlapping] } = providerRecoveryDatabase();
    expect(await run(first)).toMatchObject({ status: 'held' });
    vi.setSystemTime(new Date('2026-11-27T19:00:00.000Z'));
    let started!: () => void;
    let release!: () => void;
    const processing = new Promise<void>((resolve) => { started = resolve; });
    const finish = new Promise<void>((resolve) => { release = resolve; });
    const processCandidate = vi.fn(async () => {
      started();
      await finish;
      return { status: 'verified' as const, reason: 'Fixture publication verified.' };
    });
    const running = run(next, { processCandidate });
    await Promise.race([processing, running.then(() => { throw new Error('First workflow did not start the candidate'); })]);

    try {
      expect(await run(overlapping, { processCandidate })).toMatchObject({ status: 'held' });
      expect(sqlite.prepare('SELECT action FROM editorial_receipts WHERE id = ?').get(`slot-result:${overlapping.id}`)?.action)
        .toBe('HELD_CANDIDATE_RECONCILIATION');
    } finally {
      release();
      await running;
    }
    expect(processCandidate).toHaveBeenCalledTimes(1);
  });

  it.each(['HELD', 'DRAFTED'])('continues only unrelated work while a recovered candidate owns its target (%s)', async (candidateState) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T14:00:00.000Z'));
    const base = sourceFetcher({ candidate: true });
    vi.stubGlobal('fetch', base);
    const { sqlite, run, slots: [first, next, overlapping] } = providerRecoveryDatabase();
    expect(await run(first)).toMatchObject({ status: 'held' });
    vi.setSystemTime(new Date('2026-11-27T19:00:00.000Z'));

    let started!: () => void;
    let release!: () => void;
    const processing = new Promise<void>((resolve) => { started = resolve; });
    const finish = new Promise<void>((resolve) => { release = resolve; });
    const dispatched: Array<string | null> = [];
    const processor: NonNullable<Parameters<typeof runWorkerAdmission>[4]> = {
      async processCandidate({ candidate }) {
        dispatched.push(candidate.target_id);
        if (dispatched.length === 1) {
          started();
          await finish;
        }
        return { status: 'verified', reason: 'Fixture publication verified.' };
      },
    };
    const running = run(next, processor);
    await Promise.race([processing, running.then(() => { throw new Error('First workflow did not start the candidate'); })]);

    sqlite.prepare('UPDATE editorial_candidates SET state = ?').run(candidateState);

    try {
      vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.pathname === '/content-index.json') {
          const index = await (await base(input)).json() as { items: unknown[] };
          index.items.push({ id: 'market-systems', canonical_url: '/notes/market-systems', title: 'Market systems', topics: ['markets'] });
          return Response.json(index);
        }
        if (url.hostname === 'github.com') return new Response(`<feed><entry><title>Workers SDK update</title>
          <summary>New public details.</summary><link href="https://github.com/cloudflare/workers-sdk/releases/tag/fixture" />
          <updated>${new Date().toISOString()}</updated></entry></feed>`);
        if (url.hostname === 'www.federalreserve.gov') return new Response(`<rss><channel><item><title>Market policy update</title>
          <description>New public details.</description><link>https://www.federalreserve.gov/newsevents/fixture.htm</link>
          <pubDate>${new Date().toUTCString()}</pubDate></item></channel></rss>`);
        return base(input);
      });
      sqlite.exec(`DELETE FROM editorial_source_state WHERE source_id IN ('cloudflare-workers-sdk-releases', 'federal-reserve-press-releases')`);
      expect(await run(overlapping, processor)).toMatchObject({ status: 'held' });
      expect(dispatched).toEqual(['cloudflare-workers', 'market-systems']);
    } finally {
      release();
      await running;
    }
  });

  it('recovers an unstarted candidate if the first slot stops before recording the provider hold', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T14:00:00.000Z'));
    vi.stubGlobal('fetch', sourceFetcher({ candidate: true }));
    const { sqlite, run, slots: [first, next] } = providerRecoveryDatabase();
    class InterruptedStep extends DurableStep {
      override async do<T>(name: string, callback: () => Promise<T> | T): Promise<T> {
        if (name === 'record-provider-adapter-hold') throw new Error('stop before final receipt');
        return super.do(name, callback);
      }
    }
    await expect(run(first, undefined, new InterruptedStep())).rejects.toThrow('stop before final receipt');
    const candidate = sqlite.prepare('SELECT id FROM editorial_candidates').get();
    expect(candidate?.id).toBeTruthy();
    expect(sqlite.prepare('SELECT * FROM editorial_receipts').all()).toEqual([]);
    vi.setSystemTime(new Date('2026-11-27T19:00:00.000Z'));

    const processCandidate = vi.fn(async () => ({ status: 'verified' as const, reason: 'Fixture publication verified.' }));
    expect(await run(next, { processCandidate })).toMatchObject({ status: 'admitted' });
    expect(processCandidate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      candidate: expect.objectContaining({ id: candidate!.id }),
    }));
  });

  it.each(['DRAFTED', 'REVIEWED', 'VERIFIED', 'NEEDS_OWNER', 'CAPACITY_HELD'])('holds a cacheless restart after a %s checkpoint', async (checkpointState) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T14:00:00.000Z'));
    vi.stubGlobal('fetch', sourceFetcher({ candidate: true }));
    const { sqlite, run, slots: [first, next] } = providerRecoveryDatabase();
    expect(await run(first)).toMatchObject({ status: 'held' });
    vi.setSystemTime(new Date('2026-11-27T19:00:00.000Z'));
    const checkpoint: NonNullable<Parameters<typeof runWorkerAdmission>[4]> = {
      async processCandidate({ candidate }) {
        sqlite.prepare('UPDATE editorial_candidates SET state = ?, model_calls = 1 WHERE id = ?').run(checkpointState, candidate.id);
        throw new Error('stop after draft checkpoint');
      },
    };
    await expect(run(next, checkpoint)).rejects.toThrow('stop after draft checkpoint');
    const processCandidate = vi.fn(async () => ({ status: 'verified' as const, reason: 'Fixture publication verified.' }));

    expect(await run(next, { processCandidate })).toMatchObject({ status: 'held' });
    expect(processCandidate).not.toHaveBeenCalled();
    expect(sqlite.prepare('SELECT action FROM editorial_receipts WHERE id = ?').get(`slot-result:${next.id}`)?.action)
      .toBe('HELD_CANDIDATE_RECONCILIATION');
    expect(sqlite.prepare('SELECT state, model_calls FROM editorial_candidates').get()).toMatchObject({ state: checkpointState, model_calls: 1 });
  });

  it('leaves untouched candidates available after an earlier one stops processing', async () => {
    vi.useFakeTimers();
    const published = new Date('2026-11-27T14:00:00.000Z');
    vi.setSystemTime(published);
    const base = sourceFetcher({ candidate: true });
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/content-index.json') {
        const index = await (await base(input)).json() as { items: unknown[] };
        index.items.push({ id: 'market-systems', canonical_url: '/notes/market-systems', title: 'Market systems', topics: ['markets'] });
        return Response.json(index);
      }
      if (url.hostname === 'www.federalreserve.gov') return new Response(`<rss><channel><item><title>Market policy update</title>
        <description>Documented details.</description><link>https://www.federalreserve.gov/newsevents/fixture.htm</link>
        <pubDate>${published.toUTCString()}</pubDate></item></channel></rss>`);
      return base(input);
    });
    const { sqlite, run, slots: [first, next, later] } = providerRecoveryDatabase();
    expect(await run(first)).toMatchObject({ status: 'held' });
    expect(sqlite.prepare('SELECT count(*) AS count FROM editorial_candidates').get()?.count).toBe(2);
    vi.setSystemTime(new Date('2026-11-27T19:00:00.000Z'));
    const hold = vi.fn(async () => ({ status: 'held' as const, reason: 'Shared model pause.' }));
    expect(await run(next, { processCandidate: hold })).toMatchObject({ status: 'held' });
    expect(hold).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      candidate: expect.objectContaining({ target_id: 'cloudflare-workers' }),
    }));

    const resumed = vi.fn(async () => ({ status: 'verified' as const, reason: 'Fixture publication verified.' }));
    expect(await run(later, { processCandidate: resumed })).toMatchObject({ status: 'admitted' });
    expect(resumed).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      candidate: expect.objectContaining({ target_id: 'market-systems' }),
    }));
  });

  it('blocks a provider-held candidate with an unresolved model reservation from automatic recovery', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T14:00:00.000Z'));
    vi.stubGlobal('fetch', sourceFetcher({ candidate: true }));
    const { sqlite, run, slots: [first, next] } = providerRecoveryDatabase();
    expect(await run(first)).toMatchObject({ status: 'held' });
    sqlite.prepare(`INSERT INTO usage_reservations(id, candidate_id, attempt_id, maximum_micros, local_date, local_month, pricing_revision, requested_at)
      SELECT 'reserved', id, 'attempt', 1, '2026-11-27', '2026-11', 'test-only', ? FROM editorial_candidates`).run(new Date().toISOString());
    vi.setSystemTime(new Date('2026-11-27T19:00:00.000Z'));
    const processCandidate = vi.fn(async () => ({ status: 'verified' as const, reason: 'Fixture publication verified.' }));
    expect(await run(next, { processCandidate })).toMatchObject({ status: 'held' });
    expect(processCandidate).not.toHaveBeenCalled();
    expect(sqlite.prepare('SELECT count(*) AS count FROM usage_reservations').get()?.count).toBe(1);
  });

  it('hands an actionable candidate to configured durable publication adapters', async () => {
    vi.stubGlobal('fetch', sourceFetcher({ candidate: true }));
    const db = new PipelineD1();
    const processed: Array<{ candidate_id: string; source_id: string }> = [];
    const adapters = {
      async processCandidate({ candidate, signal }: { candidate: { id: string }; signal: { source_id: string } }) {
        processed.push({ candidate_id: candidate.id, source_id: signal.source_id });
        return { status: 'verified' as const, reason: 'Fixture publication verified.' };
      },
    };
    const result = await runEditorialAdmission({ slot_claim_id: '2026-11-27:13:05' },
      { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never, new DurableStep(), adapters as never);

    expect(result).toMatchObject({ status: 'admitted', reason: 'All admitted candidates passed publication and public readback.' });
    expect(processed).toHaveLength(1);
    expect(processed[0]).toMatchObject({ source_id: 'cloudflare-blog' });
    expect([...db.receipts.values()].map((row) => row.action)).toEqual(['VERIFIED']);
  });

  it.each([false, true])('records an already linked CONNECT with source failure=%s', async (sourceFailure) => {
    const base = sourceFetcher({ candidate: true });
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/content-index.json') return Response.json({ schema_version: 1, items: [
        { id: 'assets', canonical_url: '/notes/assets', title: 'Cloudflare static assets', topics: ['infrastructure'] },
        { id: 'routes', canonical_url: '/notes/routes', title: 'Cloudflare worker routes', topics: ['infrastructure'] },
      ] });
      if (url.hostname === 'blog.cloudflare.com') return new Response(`<rss><channel><item>
        <title>Cloudflare static assets depends on Cloudflare worker routes</title><description>Documented details.</description>
        <link>https://blog.cloudflare.com/workers/connection/</link><pubDate>${new Date().toUTCString()}</pubDate></item></channel></rss>`);
      if (sourceFailure && url.hostname === 'science.nasa.gov') return new Response('unavailable', { status: 503 });
      return base(input);
    });
    const db = new PipelineD1();
    const processCandidate = vi.fn(async () => ({ status: 'no_change' as const, reason: 'The deployed connection is already present.' }));
    const params = { slot_claim_id: '2026-11-27:13:05' };
    const env = { DB: db as unknown as D1Database, EDITORIAL_POLICY_JSON: policy } as never;
    expect(await runEditorialAdmission(params, env, new DurableStep(), { processCandidate }))
      .toMatchObject({ status: sourceFailure ? 'held' : 'no_change' });
    expect(processCandidate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      candidate: expect.objectContaining({ action: 'CONNECT', target_id: 'assets', related_id: 'routes' }),
    }));
    expect([...db.receipts.values()].map((row) => row.action))
      .toEqual([sourceFailure ? 'HELD_PUBLICATION_PIPELINE' : 'NO_CHANGE']);
    if (!sourceFailure) {
      const [receipt] = [...db.receipts.values()];
      expect(JSON.parse(String(receipt.result_json))).toMatchObject({
        source_failures: [], uncovered_source_ids: [],
        outcomes: [{ status: 'no_change', candidate_id: expect.any(String), reason: expect.any(String) }],
      });
    }
    expect(await runEditorialAdmission(params, env, new DurableStep(), { processCandidate }))
      .toMatchObject({ status: sourceFailure ? 'held' : 'no_change' });
    expect(processCandidate).toHaveBeenCalledTimes(1);
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
