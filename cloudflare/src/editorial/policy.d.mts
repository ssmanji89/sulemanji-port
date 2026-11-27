export type EditorialPolicy = {
  revision: string;
  timezone: 'America/Chicago';
  slots: string[];
  max_new_articles_daily: number;
  max_refreshes_daily: number;
  max_candidates_per_scan: number;
  max_fetches_per_scan: number;
  max_model_calls_per_candidate: number;
  max_review_rounds_per_candidate: number;
  max_candidate_usd: number;
  max_daily_usd: number;
  max_monthly_usd: number;
  model_pricing_revision: string;
};

export declare const MAX_MODEL_CALLS_PER_CANDIDATE: number;
export declare const MAX_REVIEW_ROUNDS_PER_CANDIDATE: number;
export declare function parseEditorialPolicy(raw: string | undefined): EditorialPolicy | null;
