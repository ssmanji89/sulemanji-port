import { describe, expect, it, vi } from 'vitest';
import { createEditorialCandidateProcessor } from '../src/editorial/runtime.js';
import { collectSignals, sourceSetDigest } from '../src/editorial/sources.js';
import { fingerprintPublicKnowledge } from '../src/editorial/knowledge.js';
import { parseEditorialPolicy } from '../src/editorial/scheduler.js';
import type { Candidate, ContentProposal, ReviewReceipt } from '../src/editorial/contracts.js';
import sources from '../config/public-sources.json' with { type: 'json' };

const renderSocialCard = async () => new Uint8Array();

describe('editorial runtime configuration', () => {
  it('binds publication to the environment and requires private staging readback', () => {
    const env = {
      DB: {} as D1Database,
      EDITORIAL_POLICY_JSON: JSON.stringify({ revision: 'approved-r1', timezone: 'America/Chicago', slots: ['08:00'],
        max_new_articles_daily: 1, max_refreshes_daily: 1, max_candidates_per_scan: 1, max_fetches_per_scan: 1,
        max_model_calls_per_candidate: 6, max_review_rounds_per_candidate: 3, max_candidate_usd: 0.75,
        max_daily_usd: 2, max_monthly_usd: 30, model_pricing_revision: 'prices-r1' }),
      EDITORIAL_MODEL_CONFIG_JSON: JSON.stringify({ endpoint: 'https://models.example.test/v1/chat/completions',
        model_id: 'approved-model', pricing_revision: 'prices-r1', input_usd_per_million: 1, output_usd_per_million: 2,
        max_input_chars: 48_000, max_output_tokens: 4_000 }),
      EDITORIAL_MODEL_API_KEY: 'fixture', EDITORIAL_GITHUB_TOKEN: 'fixture',
    };
    const create = (environment: string, repository: string, site?: { fetch: typeof fetch }, modelConfig = env.EDITORIAL_MODEL_CONFIG_JSON) =>
      createEditorialCandidateProcessor({ ...env, DEPLOYMENT_ENV: environment, EDITORIAL_FIXTURE_SITE: site,
        EDITORIAL_MODEL_CONFIG_JSON: modelConfig,
        EDITORIAL_GITHUB_CONFIG_JSON: JSON.stringify({ repository, required_checks: ['build'], default_branch: 'main' }) } as never, renderSocialCard);
    const production = 'ssmanji89/sulemanji-port';
    const fixture = 'ssmanji89/sulemanji-editorial-fixture';
    const binding = { fetch: async () => new Response('fixture') };
    expect(create('staging', production, binding)).toBeNull();
    expect(create('staging', fixture)).toBeNull();
    expect(create('staging', fixture, binding)).not.toBeNull();
    expect(create('production', fixture)).toBeNull();
    expect(create('production', production)).not.toBeNull();
    expect(create('production', production, undefined, '')).toBeNull();
    expect(create('runtime', production)).toBeNull();
  });

  it('admits a real dated signal only while the current retry claim owns its matching source revision', async () => {
    const now = new Date();
    const base = 'a'.repeat(40);
    const feed = `<rss><channel><item><title>Workers release</title><description>New release details.</description>
      <link>https://blog.cloudflare.com/documented-release/</link><pubDate>${now.toUTCString()}</pubDate></item></channel></rss>`;
    const original = '---\nwriting_schema: 2\n---\n[Original guide](https://blog.cloudflare.com/original-guide/).';
    const fetcher = vi.fn(async (request: RequestInfo | URL) => {
      const url = String(request);
      if (url === sources[0].url) return new Response(feed);
      if (url.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha: base } });
      if (url.endsWith(`/contents/notes/existing-guide.md?ref=${base}`)) {
        return Response.json({ type: 'file', encoding: 'base64', content: btoa(original) });
      }
      throw new Error('Unexpected outbound effect');
    }) as typeof fetch;
    const [signal] = (await collectSignals([{ ...sources[0], format: 'rss' }], now, fetcher)).signals;
    const sourceDigest = await sourceSetDigest(signal.evidence);
    expect(sourceDigest).not.toBe(signal.source_revision);
    const knowledgeRevision = await fingerprintPublicKnowledge([]);
    const candidate: Candidate = { id: 'refresh:dated-signal:guide', action: 'REFRESH', target_id: 'guide', signal_ids: [signal.id],
      reader: 'Readers', question: 'What changed?', benefit: 'A current explanation', policy_revision: 'active-r1',
      knowledge_revision: knowledgeRevision, source_digest: signal.source_revision, state: 'DISCOVERED' };
    const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
      new TextEncoder().encode(value))), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const path = 'notes/existing-guide.md';
    const content = `${original}\n\n[Current evidence](${signal.evidence[0].url}).`;
    const fileHash = await hash(content);
    const url = '/notes/existing-guide';
    const proposal: ContentProposal = { candidate_id: candidate.id, owner_epoch: 1, base_commit: base, author_run_id: 'author-1',
      policy_revision: candidate.policy_revision, knowledge_revision: knowledgeRevision, source_digest: sourceDigest,
      content_digest: await hash(`${path}
${fileHash}`),
      files: [{ path, content, operation: 'update', encoding: 'utf-8', content_sha256: fileHash }],
      public_sources: signal.evidence, required_media_paths: [], public_urls: [url],
      expected_content: [{ url, title: 'Existing guide', text_sha256: fileHash }] };
    const review: ReviewReceipt = { ...proposal, reviewer_run_id: 'independent-1', decision: 'CLEAR', findings: [] };
    const attempt = { id: 'publication:guide', candidate_id: candidate.id, owner_epoch: 1, branch: 'editorial/candidate-guide',
      pull_request: 17, source_commit: base, deployment_version: null, public_urls: [url],
      expected_content: proposal.expected_content, status: 'CAPACITY_HELD' as const };
    const rawPolicy = JSON.stringify({ revision: 'active-r1', timezone: 'America/Chicago', slots: ['08:00'], max_new_articles_daily: 1,
      max_refreshes_daily: 1, max_candidates_per_scan: 1, max_fetches_per_scan: 1, max_model_calls_per_candidate: 6,
      max_review_rounds_per_candidate: 3, max_candidate_usd: 0.75, max_daily_usd: 2, max_monthly_usd: 30, model_pricing_revision: 'prices-r1' });
    const model = JSON.stringify({ endpoint: 'https://models.example.test/v1/chat/completions', model_id: 'approved-model', pricing_revision: 'prices-r1',
      input_usd_per_million: 1, output_usd_per_million: 2, max_input_chars: 48_000, max_output_tokens: 4_000 });
    let activeClaim = 'slot-A';
    let reachedWriteBoundary = 0;
    const db = { prepare(sql: string) {
      let args: unknown[] = [];
      return {
        bind(...values: unknown[]) { args = values; return this; },
        async first() {
          if (sql.includes('JOIN editorial_candidates')) {
            return args[0] === candidate.id && args[1] === candidate.source_digest && args[2] === activeClaim
              ? { paused: 0, owner_epoch: 1 } : null;
          }
          if (sql.includes('FROM editorial_control')) return { paused: 0, owner_epoch: 1 };
          return null;
        },
        async all() { return { results: [] }; },
        async run() {
          if (sql.includes('INSERT OR IGNORE INTO publication_effects')) reachedWriteBoundary += 1;
          throw new Error('Stopped at the guarded publication effect boundary.');
        },
      };
    } } as unknown as D1Database;
    const processor = createEditorialCandidateProcessor({ DB: db, DEPLOYMENT_ENV: 'production', EDITORIAL_POLICY_JSON: rawPolicy,
      EDITORIAL_MODEL_CONFIG_JSON: model, EDITORIAL_MODEL_API_KEY: 'fixture', EDITORIAL_GITHUB_TOKEN: 'fixture',
      EDITORIAL_GITHUB_CONFIG_JSON: JSON.stringify({ repository: 'ssmanji89/sulemanji-port', required_checks: ['build'], default_branch: 'main' }),
    } as never, renderSocialCard, fetcher)!;
    const input = { candidate, signal, catalog: [], knowledge: [], owner_epoch: 1, policy: parseEditorialPolicy(rawPolicy)!,
      resumeCapacity: { proposal, review, attempt, claim: 'slot-A' }, step: {
        async do<T>(_name: string, callback: () => T | Promise<T>) { return callback(); },
        async sleep() {},
      } };
    await expect(processor.processCandidate(input)).rejects.toThrow('Stopped at the guarded publication effect boundary.');
    expect(reachedWriteBoundary).toBe(1);
    activeClaim = 'slot-B';
    await expect(processor.processCandidate(input)).resolves.toMatchObject({ status: 'held' });
    expect(reachedWriteBoundary).toBe(1);
  });

  it('fails closed when model pricing does not match the approved strict policy', () => {
    const policy = JSON.stringify({ revision: 'approved-r1', timezone: 'America/Chicago', slots: ['08:00'], max_new_articles_daily: 1,
      max_refreshes_daily: 1, max_candidates_per_scan: 1, max_fetches_per_scan: 1, max_model_calls_per_candidate: 6,
      max_review_rounds_per_candidate: 3, max_candidate_usd: 0.75, max_daily_usd: 2, max_monthly_usd: 30, model_pricing_revision: 'prices-r2' });
    const model = JSON.stringify({ endpoint: 'https://models.example.test/v1/chat/completions', model_id: 'approved-model', pricing_revision: 'prices-r1',
      input_usd_per_million: 1, output_usd_per_million: 2, max_input_chars: 48_000, max_output_tokens: 4_000 });
    const publisher = JSON.stringify({ repository: 'ssmanji89/sulemanji-port', required_checks: ['site-release'], default_branch: 'main' });
    const processor = createEditorialCandidateProcessor({ DB: {} as D1Database, DEPLOYMENT_ENV: 'production', EDITORIAL_POLICY_JSON: policy,
      EDITORIAL_MODEL_CONFIG_JSON: model, EDITORIAL_MODEL_API_KEY: 'fixture',
      EDITORIAL_GITHUB_CONFIG_JSON: publisher, EDITORIAL_GITHUB_TOKEN: 'fixture' } as never, renderSocialCard);
    expect(processor).toBeNull();
  });
});
