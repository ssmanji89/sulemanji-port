import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { createAdminRoutes } from "./routes/admin";
import { createIntakeRoutes } from "./routes/intakes";
import { createPaymentRoutes } from "./routes/payments";
import { createQuoteRoutes } from "./routes/quotes";
import { createReadinessRoutes, serviceIsReady } from "./routes/readiness";
import { runOperationalDigest } from "./scheduled/digest";
import { runGmailPoller } from "./scheduled/gmail-poller";
import { runRetention } from "./scheduled/retention";
export { PriorityDiscoveryWorkflow } from "./workflows/priority-discovery-runtime";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/v1/*",
  cors({
    origin: (origin, c) =>
      origin === c.env.SITE_ORIGIN ? origin : c.env.SITE_ORIGIN,
    allowHeaders: ["content-type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.route("/v1", createIntakeRoutes());
app.route("/v1", createPaymentRoutes());
app.route("/v1", createQuoteRoutes());
app.route("/v1", createAdminRoutes());
app.route("/v1", createReadinessRoutes());

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "request_failed" }, 500);
});

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) =>
    app.fetch(request, env, ctx),
  scheduled: (
    event: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) => {
    const task = scheduledTaskFor(event, env);
    if (task) ctx.waitUntil(task);
  },
};

export const scheduledTaskFor = (
  event: ScheduledController,
  env: Env,
): Promise<unknown> | null => {
  if (!serviceIsReady(env)) {
    return null;
  }

  if (event.cron === "0 13 * * *") {
    return runOperationalDigest(env);
  }

  if (event.cron === "30 13 * * *") {
    return runRetention(env);
  }

  return runGmailPoller(env);
};
