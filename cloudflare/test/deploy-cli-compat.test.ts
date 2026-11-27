import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('Cloudflare deployment script CLI compatibility', () => {
  it('uses only flags supported by the pinned Wrangler deploy command', () => {
    const testDir = dirname(fileURLToPath(import.meta.url));
    const script = readFileSync(resolve(testDir, '../../scripts/deploy_site.sh'), 'utf8');
    const deployCommand = script.split('\n').find((line) => line.includes('wrangler deploy --config'));
    expect(deployCommand).toBeDefined();

    const wrangler = resolve(testDir, '../node_modules/.bin/wrangler');
    const help = execFileSync(wrangler, ['deploy', '--help'], { encoding: 'utf8' });
    const flags = deployCommand?.match(/--[a-z][a-z-]*/g) ?? [];
    for (const flag of flags) {
      expect(help, `Wrangler deploy does not support ${flag}`).toContain(flag);
    }
  });
});
