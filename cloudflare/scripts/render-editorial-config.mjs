import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEditorialPolicy, PRODUCTION_EDITORIAL_CRON, supportsProductionEditorialPolicy } from '../src/editorial/policy.mjs';
import { parseEditorialRuntimeSettings } from '../src/editorial/runtime-settings.mjs';

const cloudflareDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [environment, outputDirectory = cloudflareDir] = process.argv.slice(2);
if (!['staging', 'production'].includes(environment)) {
  throw new Error('EDITORIAL_ENVIRONMENT_MUST_BE_STAGING_OR_PRODUCTION');
}

const databaseId = process.env.EDITORIAL_DATABASE_ID ?? '';
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(databaseId)) {
  throw new Error('EDITORIAL_DATABASE_ID_MUST_BE_A_UUID');
}

const requiredValues = ['EDITORIAL_WORKER_NAME', 'EDITORIAL_WORKFLOW_NAME', 'EDITORIAL_DATABASE_NAME', 'EDITORIAL_POLICY_REVISION', 'EDITORIAL_POLICY_JSON'];
for (const key of requiredValues) {
  if (!process.env[key]?.trim()) throw new Error(`${key}_IS_REQUIRED`);
}
const editorialPolicy = parseEditorialPolicy(process.env.EDITORIAL_POLICY_JSON);
if (!editorialPolicy) throw new Error('EDITORIAL_POLICY_JSON_MISSING_OR_INVALID');
const cron = process.env.EDITORIAL_CRON_SCHEDULE?.trim();
if (environment === 'production' && (cron !== PRODUCTION_EDITORIAL_CRON || !supportsProductionEditorialPolicy(editorialPolicy))) {
  throw new Error('EDITORIAL_PRODUCTION_POLICY_OR_SCHEDULE_INVALID');
}

const configName = environment === 'staging' ? 'wrangler.editorial-staging.jsonc' : 'wrangler.editorial.jsonc';
const outputName = environment === 'staging' ? 'wrangler.editorial-staging.runtime.jsonc' : 'wrangler.editorial.runtime.jsonc';
const config = JSON.parse(readFileSync(resolve(cloudflareDir, configName), 'utf8'));
config.name = process.env.EDITORIAL_WORKER_NAME;
config.workers_dev = process.env.EDITORIAL_WORKERS_DEV === 'true';
config.routes = process.env.EDITORIAL_CUSTOM_DOMAIN?.trim()
  ? [{ pattern: process.env.EDITORIAL_CUSTOM_DOMAIN.trim(), custom_domain: true }]
  : [];
config.triggers.crons = cron ? [cron] : [];
config.vars.DEPLOYMENT_ENV = environment;
config.vars.KNOWLEDGE_POLICY_REVISION = process.env.EDITORIAL_POLICY_REVISION;
config.vars.EDITORIAL_POLICY_JSON = JSON.stringify(editorialPolicy);
const model = process.env.EDITORIAL_MODEL_CONFIG_JSON?.trim();
const publisher = process.env.EDITORIAL_GITHUB_CONFIG_JSON?.trim();
if (model || publisher || process.env.EDITORIAL_REQUIRE_RUNTIME_SETTINGS === 'true') {
  const settings = parseEditorialRuntimeSettings(model, publisher, environment, editorialPolicy.model_pricing_revision);
  if (!settings) throw new Error('EDITORIAL_RUNTIME_SETTINGS_MISSING_OR_INVALID');
  config.vars.EDITORIAL_MODEL_CONFIG_JSON = JSON.stringify(settings.model);
  config.vars.EDITORIAL_GITHUB_CONFIG_JSON = JSON.stringify(settings.publisher);
}
config.d1_databases[0].database_name = process.env.EDITORIAL_DATABASE_NAME;
config.d1_databases[0].database_id = databaseId;
config.workflows[0].name = process.env.EDITORIAL_WORKFLOW_NAME;
const outputPath = resolve(outputDirectory, outputName);
writeFileSync(outputPath, JSON.stringify(config, null, 2), { mode: 0o600 });
console.log(`Rendered ${outputName} from an environment-scoped configuration`);
