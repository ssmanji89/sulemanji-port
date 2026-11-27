import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const cloudflareDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const renderer = resolve(cloudflareDirectory, 'scripts/render-editorial-config.mjs');
const outputName = 'wrangler.editorial-staging.runtime.jsonc';
const validPolicy = {
  revision: 'synthetic-policy-r1',
  timezone: 'America/Chicago',
  slots: ['08:00', '13:00', '19:00', '22:00'],
  max_new_articles_daily: 1,
  max_refreshes_daily: 1,
  max_candidates_per_scan: 10,
  max_fetches_per_scan: 10,
  max_model_calls_per_candidate: 6,
  max_review_rounds_per_candidate: 3,
  max_candidate_usd: 0.75,
  max_daily_usd: 2,
  max_monthly_usd: 30,
  model_pricing_revision: 'synthetic-pricing-r1',
};

function render(policy: string | undefined, environment: 'staging' | 'production' = 'staging') {
  const outputDirectory = mkdtempSync(resolve(tmpdir(), 'editorial-render-test-'));
  const result = spawnSync(process.execPath, [renderer, environment, outputDirectory], {
    cwd: cloudflareDirectory,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH ?? '',
      EDITORIAL_DATABASE_ID: '11111111-1111-4111-8111-111111111111',
      EDITORIAL_WORKER_NAME: 'editorial-test-' + environment,
      EDITORIAL_WORKFLOW_NAME: 'editorial-test-workflow',
      EDITORIAL_DATABASE_NAME: 'editorial-test-database',
      EDITORIAL_POLICY_REVISION: 'synthetic-knowledge-policy-r1',
      ...(policy === undefined ? {} : { EDITORIAL_POLICY_JSON: policy }),
    },
  });
  return { outputDirectory, result };
}

describe('editorial runtime config policy wiring', () => {
  it('refuses to render when the policy variable is missing', () => {
    const { outputDirectory, result } = render(undefined);
    try {
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('EDITORIAL_POLICY_JSON_IS_REQUIRED');
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  });

  it('refuses malformed policy JSON', () => {
    const { outputDirectory, result } = render('{broken');
    try {
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('EDITORIAL_POLICY_JSON_MISSING_OR_INVALID');
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  });

  it('refuses parseable but incomplete policy objects', () => {
    const { outputDirectory, result } = render(JSON.stringify({ revision: 'synthetic-policy-r1' }));
    try {
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('EDITORIAL_POLICY_JSON_MISSING_OR_INVALID');
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  });

  it('writes the configured JSON policy into the generated Worker vars', () => {
    const policy = JSON.stringify(validPolicy);
    const { outputDirectory, result } = render(policy);
    try {
      expect(result.status).toBe(0);
      const config = JSON.parse(readFileSync(resolve(outputDirectory, outputName), 'utf8'));
      expect(config.vars.EDITORIAL_POLICY_JSON).toBe(policy);
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  });

  it('routes production fetches through the canonical Worker route while staging stays on its private binding', () => {
    const production = render(JSON.stringify(validPolicy), 'production');
    const staging = render(JSON.stringify(validPolicy));
    try {
      expect(production.result.status).toBe(0);
      expect(staging.result.status).toBe(0);
      const productionConfig = JSON.parse(readFileSync(resolve(production.outputDirectory, 'wrangler.editorial.runtime.jsonc'), 'utf8'));
      const stagingConfig = JSON.parse(readFileSync(resolve(staging.outputDirectory, outputName), 'utf8'));
      expect(productionConfig.compatibility_flags ?? []).toContain('global_fetch_strictly_public');
      expect(stagingConfig.compatibility_flags ?? []).not.toContain('global_fetch_strictly_public');
      expect(stagingConfig.services).toContainEqual({ binding: 'EDITORIAL_FIXTURE_SITE', service: 'sulemanji-editorial-fixture-site' });
    } finally {
      rmSync(production.outputDirectory, { recursive: true, force: true });
      rmSync(staging.outputDirectory, { recursive: true, force: true });
    }
  });
});
