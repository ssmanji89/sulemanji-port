import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const cloudflareDir = resolve(here, '..');
const root = resolve(cloudflareDir, '..');
const temp = await mkdtemp(join(tmpdir(), 'sulemanji-site-built-'));
const site = join(temp, 'site');
const config = join(cloudflareDir, `.wrangler-site-built-${process.pid}.jsonc`);
let worker;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'inherit', ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
}

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => server.listen(0, '127.0.0.1', resolveListen).once('error', reject));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('could not allocate local test port');
  await new Promise((resolveClose) => server.close(resolveClose));
  return address.port;
}

try {
  run('bundle', ['exec', 'jekyll', 'build', '--destination', site, '--quiet'], { env: { ...process.env, JEKYLL_ENV: 'production' } });
  run('python3', ['scripts/build_site_manifest.py', '--site-root', site, '--baseline', 'docs/redevelopment/2026-11-26/article-baseline.json', '--allow-dirty', '--output', join(site, 'release.json')]);
  const release = JSON.parse(await readFile(join(site, 'release.json'), 'utf8'));
  const configData = {
    name: 'sulemanji-site-test',
    main: 'src/site/index.ts',
    compatibility_date: '2026-11-26',
    assets: {
      directory: site,
      binding: 'ASSETS',
      run_worker_first: ['/writing/', '/work-with-me', '/work-with-me/*', '/workshop-intake', '/workshop-intake/*'],
      not_found_handling: '404-page',
      html_handling: 'auto-trailing-slash',
    },
    vars: { SOURCE_COMMIT: release.source_commit, ASSET_DIGEST: release.asset_digest, BUILT_AT: release.built_at },
  };
  await writeFile(config, JSON.stringify(configData, null, 2));
  const port = await freePort();
  const logPath = join(temp, 'wrangler.log');
  const log = await import('node:fs').then(({ createWriteStream }) => createWriteStream(logPath));
  worker = spawn(join(cloudflareDir, 'node_modules/.bin/wrangler'), ['dev', '--config', config, '--port', String(port)], { cwd: cloudflareDir, stdio: ['ignore', 'pipe', 'pipe'] });
  worker.stdout.pipe(log);
  worker.stderr.pipe(log);
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (worker.exitCode !== null) throw new Error(`Wrangler exited early; inspect ${logPath}`);
    try {
      const response = await fetch(`${base}/writing`, { signal: AbortSignal.timeout(1000) });
      if (response.status === 200) { ready = true; break; }
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  if (!ready) throw new Error(`Wrangler did not become ready; inspect ${logPath}`);
  const test = spawnSync(join(cloudflareDir, 'node_modules/.bin/vitest'), ['run', '--config', 'vitest.config.ts'], {
    cwd: cloudflareDir,
    stdio: 'inherit',
    env: { ...process.env, SITE_PREVIEW_URL: base },
  });
  if (test.status !== 0) throw new Error(`built-site Worker tests failed with status ${test.status}`);
  console.log(`Built Jekyll site and Worker runtime passed at ${base}`);
} finally {
  if (worker && worker.exitCode === null) worker.kill('SIGTERM');
  await rm(config, { force: true });
  await rm(temp, { recursive: true, force: true });
}
