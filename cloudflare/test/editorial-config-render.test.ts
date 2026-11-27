import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const cloudflareDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const renderer = resolve(cloudflareDirectory, 'scripts/render-editorial-config.mjs');
const outputName = 'wrangler.editorial-staging.runtime.jsonc';

function render(policy: string | undefined) {
  const outputDirectory = mkdtempSync(resolve(tmpdir(), 'editorial-render-test-'));
  const result = spawnSync(process.execPath, [renderer, 'staging', outputDirectory], {
    cwd: cloudflareDirectory,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH ?? '',
      EDITORIAL_DATABASE_ID: '11111111-1111-4111-8111-111111111111',
      EDITORIAL_WORKER_NAME: 'editorial-test-staging',
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
      expect(result.stderr).toContain('EDITORIAL_POLICY_JSON_MUST_BE_VALID_JSON');
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  });

  it('writes the configured JSON policy into the generated Worker vars', () => {
    const policy = JSON.stringify({ revision: 'synthetic-policy-r1' });
    const { outputDirectory, result } = render(policy);
    try {
      expect(result.status).toBe(0);
      const config = JSON.parse(readFileSync(resolve(outputDirectory, outputName), 'utf8'));
      expect(config.vars.EDITORIAL_POLICY_JSON).toBe(policy);
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  });
});
