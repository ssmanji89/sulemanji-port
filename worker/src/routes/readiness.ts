import { Hono } from "hono";
import type { Env } from "../env";

export const REQUIRED_BINDINGS = [
  "TURNSTILE_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_REFRESH_TOKEN",
  "GMAIL_SENDER",
  "GMAIL_CLINIC_LABEL",
  "GOOGLE_CALENDAR_CLIENT_ID",
  "GOOGLE_CALENDAR_CLIENT_SECRET",
  "GOOGLE_CALENDAR_REFRESH_TOKEN",
  "OPENAI_API_KEY",
  "ACCESS_TEAM_DOMAIN",
  "ACCESS_AUD",
  "ADMIN_EMAIL",
] as const;

export type RequiredBindingName = (typeof REQUIRED_BINDINGS)[number];

export interface ReadinessStatus {
  mode: string;
  ready: boolean;
  missing: RequiredBindingName[];
}

export const readinessStatus = (env: Env): ReadinessStatus => {
  const missing = missingRequiredBindings(env);
  const mode = env.SERVICE_MODE || "setup";

  return {
    mode,
    ready: mode === "live" && missing.length === 0,
    missing,
  };
};

export const missingRequiredBindings = (env: Env): RequiredBindingName[] =>
  REQUIRED_BINDINGS.filter((name) => !env[name]);

export const serviceIsReady = (env: Env): boolean =>
  readinessStatus(env).ready;

export const createReadinessRoutes = () => {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/readiness", (c) => c.json(readinessStatus(c.env)));

  return app;
};
