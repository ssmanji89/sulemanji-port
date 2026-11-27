function objectFromJson(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch { return null; }
}

function hasExactKeys(value, keys) {
  return Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
}

function parseModelSettings(raw) {
  const value = objectFromJson(raw);
  const keys = ['endpoint', 'model_id', 'pricing_revision', 'input_usd_per_million', 'output_usd_per_million', 'max_input_chars', 'max_output_tokens'];
  if (!value || !hasExactKeys(value, keys) || typeof value.endpoint !== 'string' || typeof value.model_id !== 'string' || !value.model_id.trim() ||
      typeof value.pricing_revision !== 'string' || !value.pricing_revision.trim() ||
      !Number.isFinite(value.input_usd_per_million) || Number(value.input_usd_per_million) < 0 ||
      !Number.isFinite(value.output_usd_per_million) || Number(value.output_usd_per_million) < 0 ||
      !Number.isSafeInteger(value.max_input_chars) || Number(value.max_input_chars) < 1 || Number(value.max_input_chars) > 100_000 ||
      !Number.isSafeInteger(value.max_output_tokens) || Number(value.max_output_tokens) < 1 || Number(value.max_output_tokens) > 4_000) return null;
  try {
    const url = new URL(value.endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null;
  } catch { return null; }
  return value;
}

const PUBLICATION_REPOSITORIES = {
  production: 'ssmanji89/sulemanji-port',
  staging: 'ssmanji89/sulemanji-editorial-fixture',
};

function parsePublisherSettings(raw, repository) {
  const value = objectFromJson(raw);
  if (!value || !hasExactKeys(value, ['repository', 'required_checks', 'default_branch']) ||
      value.repository !== repository || value.default_branch !== 'main' ||
      !Array.isArray(value.required_checks) || value.required_checks.length < 1 || value.required_checks.length > 20 ||
      value.required_checks.some((check) => typeof check !== 'string' || !/^[A-Za-z0-9 _.-]{1,100}$/.test(check)) ||
      new Set(value.required_checks).size !== value.required_checks.length) return null;
  return value;
}

export function parseEditorialRuntimeSettings(rawModel, rawPublisher, environment, pricingRevision) {
  const model = parseModelSettings(rawModel);
  const publisher = parsePublisherSettings(rawPublisher, PUBLICATION_REPOSITORIES[environment]);
  if (!model || !publisher || model.pricing_revision !== pricingRevision) return null;
  return { model, publisher };
}
