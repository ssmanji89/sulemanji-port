import type { EditorialEnv } from './contracts.js';
import { parseEditorialPolicy, supportsProductionEditorialPolicy } from './policy.mjs';
import { parseEditorialRuntimeSettings } from './runtime-settings.mjs';

export type EditorialRuntimeEnv = EditorialEnv & {
  EDITORIAL_POLICY_JSON?: string;
  EDITORIAL_MODEL_CONFIG_JSON?: string;
  EDITORIAL_MODEL_API_KEY?: string;
  EDITORIAL_GITHUB_CONFIG_JSON?: string;
  EDITORIAL_GITHUB_TOKEN?: string;
};

function bearerCredential(value: string | undefined): value is string {
  return typeof value === 'string' && value === value.trim() && /^[A-Za-z0-9._~+/-]+=*$/.test(value);
}

export function readEditorialRuntimeConfig(env: EditorialRuntimeEnv) {
  const environment = env.DEPLOYMENT_ENV;
  if (environment !== 'production' && environment !== 'staging') return null;
  if (environment === 'staging' && !env.EDITORIAL_FIXTURE_SITE) return null;
  const policy = parseEditorialPolicy(env.EDITORIAL_POLICY_JSON);
  if (!policy || (environment === 'production' && !supportsProductionEditorialPolicy(policy))) return null;
  const settings = parseEditorialRuntimeSettings(env.EDITORIAL_MODEL_CONFIG_JSON, env.EDITORIAL_GITHUB_CONFIG_JSON,
    environment, policy.model_pricing_revision);
  const modelApiKey = env.EDITORIAL_MODEL_API_KEY;
  const githubToken = env.EDITORIAL_GITHUB_TOKEN;
  if (!settings || !bearerCredential(modelApiKey) || !bearerCredential(githubToken)) return null;
  return {
    policy,
    model: { ...settings.model, api_key: modelApiKey },
    publisher: { ...settings.publisher, token: githubToken, require_private: environment === 'staging' },
  };
}
