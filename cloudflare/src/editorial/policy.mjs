export const MAX_MODEL_CALLS_PER_CANDIDATE = 6;
export const MAX_REVIEW_ROUNDS_PER_CANDIDATE = 3;
export const PRODUCTION_EDITORIAL_CRON = '0 * * * *';

/** @param {{ slots: string[], max_model_calls_per_candidate: number }} policy */
export function supportsProductionEditorialPolicy(policy) {
  return policy.slots.every((slot) => slot.endsWith(':00')) && policy.max_model_calls_per_candidate >= 2;
}

const POLICY_FIELDS = [
  'revision', 'timezone', 'slots', 'max_new_articles_daily', 'max_refreshes_daily', 'max_candidates_per_scan',
  'max_fetches_per_scan', 'max_model_calls_per_candidate', 'max_review_rounds_per_candidate', 'max_candidate_usd',
  'max_daily_usd', 'max_monthly_usd', 'model_pricing_revision',
].sort();

/** @param {string | undefined} raw */
export function parseEditorialPolicy(raw) {
  if (!raw) return null;
  let value;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value;
  if (Object.keys(record).sort().join('\0') !== POLICY_FIELDS.join('\0')) return null;
  const integerFields = [
    'max_new_articles_daily', 'max_refreshes_daily', 'max_candidates_per_scan', 'max_fetches_per_scan',
    'max_model_calls_per_candidate', 'max_review_rounds_per_candidate',
  ];
  if (integerFields.some((field) => !Number.isSafeInteger(record[field]) || Number(record[field]) <= 0)) return null;
  const moneyFields = ['max_candidate_usd', 'max_daily_usd', 'max_monthly_usd'];
  if (moneyFields.some((field) => !Number.isFinite(record[field]) || Number(record[field]) < 0)) return null;
  if (typeof record.revision !== 'string' || !record.revision.trim() || typeof record.model_pricing_revision !== 'string' || !record.model_pricing_revision.trim()) return null;
  if (record.timezone !== 'America/Chicago' || !Array.isArray(record.slots) || !record.slots.length ||
      record.slots.some((slot) => typeof slot !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot)) ||
      new Set(record.slots).size !== record.slots.length) return null;
  if (Number(record.max_model_calls_per_candidate) > MAX_MODEL_CALLS_PER_CANDIDATE ||
      Number(record.max_review_rounds_per_candidate) > MAX_REVIEW_ROUNDS_PER_CANDIDATE ||
      Number(record.max_candidates_per_scan) > 100 || Number(record.max_fetches_per_scan) > 100 ||
      Number(record.max_candidate_usd) > Number(record.max_daily_usd) || Number(record.max_daily_usd) > Number(record.max_monthly_usd)) return null;
  return record;
}
