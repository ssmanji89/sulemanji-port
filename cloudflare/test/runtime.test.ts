import { describe, expect, it } from 'vitest';
import { createEditorialCandidateProcessor } from '../src/editorial/runtime.js';

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
    const create = (environment: string, repository: string, site?: { fetch: typeof fetch }) =>
      createEditorialCandidateProcessor({ ...env, DEPLOYMENT_ENV: environment, EDITORIAL_FIXTURE_SITE: site,
        EDITORIAL_GITHUB_CONFIG_JSON: JSON.stringify({ repository, required_checks: ['build'], default_branch: 'main' }) } as never);
    const production = 'ssmanji89/sulemanji-port';
    const fixture = 'ssmanji89/sulemanji-editorial-fixture';
    const binding = { fetch: async () => new Response('fixture') };
    expect(create('staging', production, binding)).toBeNull();
    expect(create('staging', fixture)).toBeNull();
    expect(create('staging', fixture, binding)).not.toBeNull();
    expect(create('production', fixture)).toBeNull();
    expect(create('production', production)).not.toBeNull();
    expect(create('runtime', production)).toBeNull();
  });

  it('fails closed when explicit model and publisher configuration is absent', () => {
    const processor = createEditorialCandidateProcessor({ DB: {} as D1Database } as never);
    expect(processor).toBeNull();
  });

  it('fails closed when model pricing does not match the approved strict policy', () => {
    const policy = JSON.stringify({ revision: 'approved-r1', timezone: 'America/Chicago', slots: ['08:00'], max_new_articles_daily: 1,
      max_refreshes_daily: 1, max_candidates_per_scan: 1, max_fetches_per_scan: 1, max_model_calls_per_candidate: 6,
      max_review_rounds_per_candidate: 3, max_candidate_usd: 0.75, max_daily_usd: 2, max_monthly_usd: 30, model_pricing_revision: 'prices-r2' });
    const model = JSON.stringify({ endpoint: 'https://models.example.test/v1/chat/completions', model_id: 'approved-model', pricing_revision: 'prices-r1',
      input_usd_per_million: 1, output_usd_per_million: 2, max_input_chars: 48_000, max_output_tokens: 4_000 });
    const publisher = JSON.stringify({ repository: 'ssmanji89/sulemanji-port', required_checks: ['site-release'], default_branch: 'main' });
    const processor = createEditorialCandidateProcessor({ DB: {} as D1Database, EDITORIAL_POLICY_JSON: policy,
      EDITORIAL_MODEL_CONFIG_JSON: model, EDITORIAL_MODEL_API_KEY: 'fixture',
      EDITORIAL_GITHUB_CONFIG_JSON: publisher, EDITORIAL_GITHUB_TOKEN: 'fixture' } as never);
    expect(processor).toBeNull();
  });
});
