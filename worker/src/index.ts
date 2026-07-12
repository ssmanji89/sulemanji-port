import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { createIntakeRoutes } from "./routes/intakes";
import { createPaymentRoutes } from "./routes/payments";

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

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "request_failed" }, 500);
});

export default app;
