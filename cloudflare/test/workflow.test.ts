import { afterEach, describe, expect, it, vi } from 'vitest';
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
        if (sql.includes('FROM editorial_candidates')) return { results: [...this.candidates.values()].slice(0, Number(args[0])) as T[] };
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
    const fallback = sourceFetcher({ candidate: false });
    const evidenceUrl = 'https://science.nasa.gov/solar-system/skywatching/whats-up-november-2026-skywatching-tips-from-nasa/';
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/content-index.json')) return Response.json({ schema_version: 1, items: [
        { id: 'independent-interests', canonical_url: '/about/#interests', title: 'Looking up', topics: ['astronomy', 'skywatching'] },
      ] });
      if (url === feed.url) return Response.json([{ link: evidenceUrl, date_gmt: '2026-11-02T18:19:58',
        title: { rendered: 'What&#8217;s Up: November 2026 Skywatching Tips from NASA' },
        excerpt: { rendered: '<p>Watch the Moon rise and look for meteors after moonset.</p>' } }]);
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
