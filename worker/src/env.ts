export type Env = {
  DB: D1Database;
  SITE_ORIGIN: string;
  TERMS_VERSION: string;
  TURNSTILE_SECRET: string;
  TURNSTILE_TEST_BYPASS?: string;
};
