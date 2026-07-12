# Work With Me Priority Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a portfolio-native intake, paid Gmail discovery, reviewed action blueprint, and private paid scheduling flow to `www.sulemanji.com`.

**Architecture:** Keep Jekyll/GitHub Pages as the static frontend and add an isolated TypeScript Cloudflare Worker package. Hono exposes narrow HTTP routes; D1 owns case state; Cloudflare Workflows coordinates multi-day discovery; Stripe, Gmail, Google Calendar, and OpenAI sit behind testable adapters. Delivery is split into three deployable checkpoints: normal intake, mandatory-review paid discovery, and private paid booking.

**Tech Stack:** Jekyll, browser JavaScript, TypeScript 7, Cloudflare Workers/Workflows/D1, Hono 4.12, Zod 4.4, Stripe 22.3, Vitest 4.1 with `@cloudflare/vitest-pool-workers` 0.18, Gmail API, Google Calendar API, OpenAI Responses API (`gpt-5.4-mini` launch candidate, configurable by secret-backed environment variable).

---

## Plan Boundaries and File Map

### Checkpoint A: Native Intake and Normal Queue

- `worker/package.json`: isolated Worker scripts and dependencies.
- `worker/wrangler.jsonc`: Worker, D1, cron, Workflow, and environment bindings.
- `worker/tsconfig.json`, `worker/vitest.config.ts`: strict TypeScript and Worker test runtime.
- `worker/migrations/0001_cases.sql`: cases, intake, consent, event, and outbox schema.
- `worker/src/env.ts`: binding types and non-secret configuration.
- `worker/src/domain/case.ts`: Zod schemas and case types.
- `worker/src/domain/state-machine.ts`: allowed case transitions.
- `worker/src/repositories/cases.ts`: all case persistence.
- `worker/src/routes/intakes.ts`: intake creation and status routes.
- `worker/src/security/turnstile.ts`: server-side bot verification.
- `worker/src/index.ts`: Hono composition only.
- `worker/test/intakes.test.ts`, `worker/test/state-machine.test.ts`: foundation behavior.
- `work-with-me.md`: native form and clear normal/priority choices.
- `work-with-me-priority.md`: deposit summary and Stripe handoff.
- `work-with-me-thanks.md`: normal-queue and payment-processing confirmation.
- `work-with-me-terms.md`, `privacy.md`: versioned public service and privacy terms.
- `assets/js/work-with-me.js`: accessible submission state and API calls.
- `assets/css/style.scss`: form-specific styles using existing variables.
- `scripts/verify_work_with_me.py`: replace stale Phase 1 form/Stripe prohibitions.

### Checkpoint B: Paid Discovery With Mandatory Review

- `worker/migrations/0002_priority_discovery.sql`: payments, credits, Gmail threads, discovery, artifacts, risks, and workflow events.
- `worker/src/integrations/stripe.ts`: Checkout and verified webhook adapter.
- `worker/src/integrations/gmail.ts`: OAuth, labels, threads, drafts, and sends.
- `worker/src/integrations/openai.ts`: schema-constrained Responses API adapter.
- `worker/src/agent/contracts.ts`: discovery/checkpoint/blueprint schemas.
- `worker/src/agent/prompts.ts`: bounded interviewer and blueprint instructions.
- `worker/src/domain/risk.ts`: deterministic risk rules and hold decisions.
- `worker/src/routes/payments.ts`: deposit Checkout and webhook routes.
- `worker/src/routes/admin.ts`: Cloudflare Access-protected review actions.
- `worker/src/admin/page.ts`: minimal review and quote-approval UI.
- `worker/src/workflows/priority-discovery.ts`: durable paid discovery state machine.
- `worker/src/scheduled/gmail-poller.ts`: incremental labeled-thread polling.
- `worker/src/scheduled/digest.ts`: operational digest.
- `worker/test/payments.test.ts`, `gmail.test.ts`, `agent.test.ts`, `priority-discovery.test.ts`, `admin.test.ts`: integration-contract coverage.
- `worker/test/fixtures/discovery-cases.json`: safe, risky, contradictory, attachment, and topic-expansion cases.

### Checkpoint C: Private Quote, Paid Booking, Retention, and Launch

- `worker/migrations/0003_booking_retention.sql`: session quotes, slot holds, calendar events, and retention deadlines.
- `worker/src/integrations/calendar.ts`: free/busy and event creation adapter.
- `worker/src/domain/booking.ts`: quote, credit, hold, and availability rules.
- `worker/src/routes/quotes.ts`: private quote, slot hold, and remaining-balance Checkout routes.
- `work-with-me-quote.md`: private quote and availability shell.
- `assets/js/work-with-me-quote.js`: quote loading, slot selection, and balance Checkout handoff.
- `worker/src/scheduled/retention.ts`: 90-day D1 redaction and one-year Gmail deletion.
- `worker/test/booking.test.ts`, `calendar.test.ts`, `retention.test.ts`, `e2e.test.ts`: concurrency, payment, calendar, and lifecycle coverage.
- `.github/workflows/jekyll.yml`: run Worker tests and verifiers before Pages deployment.
- `.env.example`, `README.md`: non-secret setup and operating runbook.

## Checkpoint A: Native Intake and Normal Queue

### Task 1: Scaffold the Worker Package

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/vitest.config.ts`
- Create: `worker/wrangler.jsonc`
- Modify: `.gitignore`

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "sulemanji-work-with-me",
  "private": true,
  "type": "module",
  "scripts": {
    "check": "tsc --noEmit && vitest run",
    "test": "vitest run",
    "test:watch": "vitest",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "db:migrate:local": "wrangler d1 migrations apply DB --local",
    "db:migrate:remote": "wrangler d1 migrations apply DB --remote"
  },
  "dependencies": {
    "hono": "4.12.29",
    "stripe": "22.3.1",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "5.20260712.1",
    "@cloudflare/vitest-pool-workers": "0.18.4",
    "@types/node": "26.1.1",
    "typescript": "7.0.2",
    "vitest": "4.1.10",
    "wrangler": "4.110.0"
  }
}
```

- [ ] **Step 2: Add strict compiler and Worker test configuration**

```json
// worker/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "types": ["@cloudflare/workers-types", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "test/**/*.ts", "vitest.config.ts"]
}
```

```ts
// worker/vitest.config.ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: { poolOptions: { workers: { wrangler: { configPath: "./wrangler.jsonc" } } } },
});
```

- [ ] **Step 3: Add the initial Worker configuration**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "sulemanji-work-with-me",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-11",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "vars": {
    "SITE_ORIGIN": "https://www.sulemanji.com",
    "TERMS_VERSION": "2026-07-11",
    "PRIORITY_DEPOSIT_CENTS": "29500",
    "MANDATORY_REVIEW_CASE_LIMIT": "10",
    "AGENT_MODEL": "gpt-5.4-mini"
  }
}
```

- [ ] **Step 4: Install and generate the D1 binding without hand-written IDs**

Run:

```bash
cd worker
npm install
npx wrangler d1 create sulemanji-work-with-me --binding DB --update-config
```

Expected: `package-lock.json` is created and `wrangler.jsonc` gains a `d1_databases` entry with a real `database_id`.

- [ ] **Step 5: Ignore local Worker state**

```gitignore
.wrangler/
worker/.dev.vars
worker/coverage/
```

- [ ] **Step 6: Run the empty check and commit**

Run: `cd worker && npm run check`

Expected: PASS with zero test files and no TypeScript errors.

```bash
git add .gitignore worker
git commit -m "build: scaffold Work With Me worker"
```

### Task 2: Add Case Schema, State Machine, and D1 Repository

**Files:**
- Create: `worker/migrations/0001_cases.sql`
- Create: `worker/src/domain/case.ts`
- Create: `worker/src/domain/state-machine.ts`
- Create: `worker/src/repositories/cases.ts`
- Create: `worker/test/state-machine.test.ts`

- [ ] **Step 1: Write failing transition tests**

```ts
import { describe, expect, it } from "vitest";
import { canTransition } from "../src/domain/state-machine";

describe("case transitions", () => {
  it("allows intake_received to normal_queue", () => {
    expect(canTransition("intake_received", "normal_queue")).toBe(true);
  });
  it("rejects normal_queue to session_confirmed", () => {
    expect(canTransition("normal_queue", "session_confirmed")).toBe(false);
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `cd worker && npm test -- state-machine.test.ts`

Expected: FAIL because `state-machine.ts` does not exist.

- [ ] **Step 3: Implement schemas and explicit transitions**

```ts
// worker/src/domain/case.ts
import { z } from "zod";

export const CaseStatus = z.enum([
  "intake_received", "normal_queue", "checkout_pending", "paid_pending_start",
  "discovery_active", "waiting_for_customer", "understanding_review",
  "waiting_for_suleman", "blueprint_ready", "blueprint_delivered",
  "priority_scheduling", "slot_held", "balance_payment_pending",
  "session_confirmed", "paused_inactive", "closed",
  "declined_refund_pending", "payment_disputed", "failed_requires_attention"
]);
export type CaseStatus = z.infer<typeof CaseStatus>;

export const IntakeInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(254),
  contextType: z.enum(["personal", "professional"]),
  problem: z.string().trim().min(40).max(6000),
  desiredOutcome: z.string().trim().min(20).max(3000),
  priorAttempts: z.string().trim().max(3000).default(""),
  sanitizedLinks: z.array(z.string().url()).max(5),
  path: z.enum(["normal", "priority"]),
  termsAccepted: z.literal(true),
  turnstileToken: z.string().min(1),
  website: z.string().max(0)
});
```

```ts
// worker/src/domain/state-machine.ts
import type { CaseStatus } from "./case";

const allowed: Record<CaseStatus, readonly CaseStatus[]> = {
  intake_received: ["normal_queue", "checkout_pending"], normal_queue: ["closed"],
  checkout_pending: ["paid_pending_start", "closed"],
  paid_pending_start: ["discovery_active", "declined_refund_pending", "failed_requires_attention"],
  discovery_active: ["waiting_for_customer", "waiting_for_suleman", "paused_inactive"],
  waiting_for_customer: ["discovery_active", "understanding_review", "paused_inactive"],
  understanding_review: ["discovery_active", "waiting_for_suleman", "blueprint_ready"],
  waiting_for_suleman: ["discovery_active", "understanding_review", "blueprint_ready", "declined_refund_pending"],
  blueprint_ready: ["blueprint_delivered", "waiting_for_suleman"],
  blueprint_delivered: ["priority_scheduling", "closed"],
  priority_scheduling: ["slot_held", "closed"], slot_held: ["balance_payment_pending", "priority_scheduling"],
  balance_payment_pending: ["session_confirmed", "priority_scheduling", "failed_requires_attention"],
  session_confirmed: ["closed"], paused_inactive: ["discovery_active", "closed"], closed: [],
  declined_refund_pending: ["closed", "failed_requires_attention"],
  payment_disputed: ["closed", "failed_requires_attention"],
  failed_requires_attention: ["discovery_active", "waiting_for_suleman", "closed"]
};

export const canTransition = (from: CaseStatus, to: CaseStatus) => allowed[from].includes(to);
```

- [ ] **Step 4: Create normalized tables and indexes**

```sql
CREATE TABLE cases (
  id TEXT PRIMARY KEY, public_token_hash TEXT NOT NULL UNIQUE, email TEXT NOT NULL,
  name TEXT NOT NULL, context_type TEXT NOT NULL, path TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  closed_at TEXT
);
CREATE TABLE intakes (
  case_id TEXT PRIMARY KEY REFERENCES cases(id), problem TEXT NOT NULL,
  desired_outcome TEXT NOT NULL, prior_attempts TEXT NOT NULL,
  sanitized_links_json TEXT NOT NULL, redacted_at TEXT
);
CREATE TABLE consents (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id),
  terms_version TEXT NOT NULL, accepted_at TEXT NOT NULL, evidence_json TEXT NOT NULL
);
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY, case_id TEXT, event_type TEXT NOT NULL,
  data_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX cases_email_created_idx ON cases(email, created_at);
CREATE INDEX cases_status_idx ON cases(status);
```

- [ ] **Step 5: Implement `CaseRepository` with parameterized D1 statements**

Expose exactly these methods from `worker/src/repositories/cases.ts`:

```ts
export interface CaseRepository {
  createIntake(input: IntakeInput, meta: ConsentMeta): Promise<{ id: string; publicToken: string }>;
  getByPublicToken(token: string): Promise<PublicCase | null>;
  transition(id: string, expected: CaseStatus, next: CaseStatus, event: string): Promise<void>;
}
```

Implement the interface with `crypto.randomUUID()` for internal IDs, 32 random
bytes for public tokens, SHA-256 hashes in D1, parameterized `prepare().bind()`
statements, and one D1 batch so case, intake, consent, and audit event commit
atomically. `transition` must update with `WHERE id = ? AND status = ?` and throw
unless `meta.changes === 1`.

- [ ] **Step 6: Migrate, verify GREEN, and commit**

Run:

```bash
cd worker
npm run db:migrate:local
npm test -- state-machine.test.ts
npm run check
```

Expected: migration succeeds; all tests PASS.

```bash
git add worker/migrations worker/src/domain worker/src/repositories worker/test
git commit -m "feat: add intake case domain"
```

### Task 3: Implement the Intake API and Bot Boundary

**Files:**
- Create: `worker/src/env.ts`
- Create: `worker/src/security/turnstile.ts`
- Create: `worker/src/routes/intakes.ts`
- Create: `worker/src/index.ts`
- Create: `worker/test/intakes.test.ts`

- [ ] **Step 1: Write failing route tests**

Test `POST /v1/intakes` for `201`, invalid input `422`, honeypot `204` without persistence, attachment-like link rejection, unverified Turnstile `403`, and strict `Access-Control-Allow-Origin: https://www.sulemanji.com`.

```ts
const valid = { name: "Ada Lovelace", email: "ada@example.com", contextType: "professional",
  problem: "A recurring intake process is copied manually between email and a tracker.",
  desiredOutcome: "A reviewed workflow with explicit handoffs and approval boundaries.",
  priorAttempts: "A spreadsheet checklist.", sanitizedLinks: [], path: "normal",
  termsAccepted: true, turnstileToken: "test-pass", website: "" };
const response = await SELF.fetch("https://api.example/v1/intakes", {
  method: "POST", headers: { "content-type": "application/json", origin: "https://www.sulemanji.com" },
  body: JSON.stringify(valid)
});
expect(response.status).toBe(201);
```

- [ ] **Step 2: Verify RED**

Run: `cd worker && npm test -- intakes.test.ts`

Expected: FAIL because the route is missing.

- [ ] **Step 3: Implement bindings and Turnstile verification**

```ts
export type Env = {
  DB: D1Database; SITE_ORIGIN: string; TERMS_VERSION: string;
  TURNSTILE_SECRET: string; TURNSTILE_TEST_BYPASS?: string;
};
export async function verifyTurnstile(env: Env, token: string, ip?: string): Promise<boolean> {
  if (env.TURNSTILE_TEST_BYPASS && token === env.TURNSTILE_TEST_BYPASS) return true;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if (ip) body.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  return response.ok && Boolean((await response.json<{ success: boolean }>()).success);
}
```

- [ ] **Step 4: Implement route composition**

`POST /v1/intakes` must parse JSON with `IntakeInput.safeParse`, reject non-HTTP(S) links and strings suggestive of credentials, verify Turnstile, persist atomically, transition to `normal_queue` or `checkout_pending`, and return only `{ caseToken, next }`. `GET /v1/cases/:token` returns only public state.

```ts
const app = new Hono<{ Bindings: Env }>();
app.use("/v1/*", cors({ origin: (origin, c) => origin === c.env.SITE_ORIGIN ? origin : c.env.SITE_ORIGIN }));
app.route("/v1", createIntakeRoutes());
app.onError((error, c) => c.json({ error: "request_failed" }, 500));
export default app;
```

- [ ] **Step 5: Verify GREEN and commit**

Run: `cd worker && npm run check`

Expected: all tests PASS; no TypeScript errors.

```bash
git add worker/src worker/test/intakes.test.ts
git commit -m "feat: accept Work With Me intake"
```

### Task 4: Replace Mailto With the Native Intake Experience

**Files:**
- Modify: `work-with-me.md`
- Create: `work-with-me-priority.md`
- Create: `work-with-me-thanks.md`
- Create: `work-with-me-terms.md`
- Create: `privacy.md`
- Create: `assets/js/work-with-me.js`
- Modify: `assets/css/style.scss`
- Modify: `_layouts/default.html`
- Modify: `scripts/verify_work_with_me.py`

- [ ] **Step 1: Update verifier expectations first**

Replace Phase 1 prohibitions for Stripe, pricing, forms, and payment links with requirements for `id="work-with-me-intake"`, normal and priority choices, attachment prohibition, AI disclosure, privacy/terms consent, and `assets/js/work-with-me.js`. Keep vehicle-repair, invoice-review, Brakes & Bytes, and separate-agency prohibitions.

- [ ] **Step 2: Verify RED**

Run: `bundle exec jekyll build && python3 scripts/verify_work_with_me.py`

Expected: FAIL because the intake form is absent.

- [ ] **Step 3: Add semantic form markup**

Add fields matching `IntakeInput`, a hidden `website` honeypot, no file input,
an explicit consent checkbox, a normal/priority segmented choice, status region
`role="status" aria-live="polite"`, and a submit button. Use this structure:

```html
<form id="work-with-me-intake" class="intake-form" data-endpoint="https://api.sulemanji.com/v1/intakes">
  <label class="form-field">Name <input name="name" required minlength="2" maxlength="120" autocomplete="name"></label>
  <label class="form-field">Email <input name="email" type="email" required maxlength="254" autocomplete="email"></label>
  <fieldset><legend>This workflow is mainly</legend>
    <label><input type="radio" name="contextType" value="personal" required> Personal</label>
    <label><input type="radio" name="contextType" value="professional" required> Professional</label>
  </fieldset>
  <label class="form-field">What is messy? <textarea name="problem" required minlength="40" maxlength="6000"></textarea></label>
  <label class="form-field">What would useful look like? <textarea name="desiredOutcome" required minlength="20" maxlength="3000"></textarea></label>
  <label class="form-field">What have you tried? <textarea name="priorAttempts" maxlength="3000"></textarea></label>
  <label class="form-field">Sanitized links, one per line <textarea name="sanitizedLinks" maxlength="2000"></textarea></label>
  <fieldset class="path-choice"><legend>Review path</legend>
    <label><input type="radio" name="path" value="normal" required> Normal review queue</label>
    <label><input type="radio" name="path" value="priority" required> Priority Discovery deposit</label>
  </fieldset>
  <label><input type="checkbox" name="termsAccepted" required> I accept the <a href="/work-with-me/terms">service terms</a> and <a href="/privacy">privacy notice</a>.</label>
  <input name="website" class="honeypot" tabindex="-1" autocomplete="off" aria-hidden="true">
  <input name="turnstileToken" type="hidden">
  <p id="intake-status" class="form-status" role="status" aria-live="polite"></p>
  <button class="btn btn-primary" type="submit">Submit problem</button>
</form>
```

Create the priority page with the deposit deliverable, fixed `$295` deposit wording, non-refundable trigger, 60-day credit, AI disclosure,
and a button that requests deposit Checkout using the case token. Create the
thanks page with no customer details in the URL or rendered HTML. Create terms
and privacy pages containing the exact approved commercial, safety, processor,
and retention rules; mark checkout language as unavailable until legal/tax
review is recorded.

- [ ] **Step 4: Add focused frontend behavior**

```js
const form = document.getElementById('work-with-me-intake');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = form.querySelector('[type="submit"]');
  const status = document.getElementById('intake-status');
  submit.disabled = true; status.textContent = 'Submitting...';
  try {
    const response = await fetch(form.dataset.endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(serializeIntake(new FormData(form)))
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'submission_failed');
    window.location.assign(result.next === 'checkout' ? `/work-with-me/priority?case=${encodeURIComponent(result.caseToken)}` : `/work-with-me/thanks?case=${encodeURIComponent(result.caseToken)}`);
  } catch (_) { status.textContent = 'Submission failed. Your text remains here; try again or email ssmanji89@gmail.com.'; }
  finally { submit.disabled = false; }
});
```

- [ ] **Step 5: Add restrained form styles and conditional page script**

Add `.intake-form`, `.form-field`, `.field-error`, `.path-choice`, and `.form-status` styles using existing color variables, `border-radius: 8px`, stable control heights, visible focus rings, and mobile single-column layout. In `_layouts/default.html`, load the script only when `page.work_with_me_form` is true.

- [ ] **Step 6: Build, verify, and commit Checkpoint A**

Run:

```bash
bundle exec jekyll build
python3 scripts/verify_work_with_me.py
cd worker && npm run check
```

Expected: all commands PASS.

```bash
git add work-with-me.md work-with-me-priority.md work-with-me-thanks.md work-with-me-terms.md privacy.md assets/js/work-with-me.js assets/css/style.scss _layouts/default.html scripts/verify_work_with_me.py
git commit -m "feat: add native Work With Me intake"
```

## Checkpoint B: Paid Discovery With Mandatory Review

### Task 5: Add Payment, Discovery, and Artifact Persistence

**Files:**
- Create: `worker/migrations/0002_priority_discovery.sql`
- Modify: `worker/src/env.ts`
- Modify: `worker/src/repositories/cases.ts`
- Create: `worker/test/discovery-repository.test.ts`

- [ ] **Step 1: Write repository tests for one-time fulfillment and credit**

Cover duplicate Stripe event IDs, one Gmail thread per case, one active Workflow ID, immutable consent evidence, versioned artifacts, and atomic mandatory-review gate tracking.

- [ ] **Step 2: Verify RED**

Run: `cd worker && npm test -- discovery-repository.test.ts`

Expected: FAIL because discovery tables and methods do not exist.

- [ ] **Step 3: Add normalized tables**

Create `payments`, `credits`, `gmail_threads`, `discovery_state`, `artifacts`, `risk_decisions`, `workflow_events`, and `offer_counters`. Add unique indexes on Stripe event/session/payment IDs, Gmail thread ID, Workflow ID, and `(case_id, artifact_type, version)`.

Extend `Env` with these exact bindings before compiling this checkpoint:

```ts
PRIORITY_DISCOVERY: Workflow<{ caseId: string }>;
STRIPE_SECRET_KEY: string; STRIPE_WEBHOOK_SECRET: string;
GMAIL_CLIENT_ID: string; GMAIL_CLIENT_SECRET: string; GMAIL_REFRESH_TOKEN: string;
GMAIL_SENDER: string; GMAIL_CLINIC_LABEL: string;
OPENAI_API_KEY: string; AGENT_MODEL: string;
PRIORITY_DEPOSIT_CENTS: string; MANDATORY_REVIEW_CASE_LIMIT: string;
ACCESS_TEAM_DOMAIN: string; ACCESS_AUD: string; ADMIN_EMAIL: string;
```

- [ ] **Step 4: Add repository contracts**

```ts
recordStripeEvent(eventId: string, caseId: string, type: string): Promise<"new" | "duplicate">;
markDepositPaid(caseId: string, sessionId: string, paymentIntentId: string, cents: number): Promise<void>;
startDelivery(caseId: string, gmailThreadId: string, workflowId: string): Promise<void>;
saveDiscoveryState(caseId: string, state: DiscoveryState): Promise<void>;
saveArtifact(caseId: string, type: "checkpoint" | "blueprint", body: unknown): Promise<number>;
holdForReview(caseId: string, reasons: string[], draftId: string): Promise<void>;
```

- [ ] **Step 5: Migrate, test, and commit**

Run: `cd worker && npm run db:migrate:local && npm run check`

Expected: PASS.

```bash
git add worker/migrations/0002_priority_discovery.sql worker/src worker/test/discovery-repository.test.ts
git commit -m "feat: persist priority discovery state"
```

### Task 6: Implement Deposit Checkout and Verified Fulfillment

**Files:**
- Create: `worker/src/integrations/stripe.ts`
- Create: `worker/src/routes/payments.ts`
- Modify: `worker/src/index.ts`
- Create: `worker/test/payments.test.ts`

- [ ] **Step 1: Write failing payment tests**

Test authoritative fixed-deposit selection, review-gate concurrency, Checkout metadata, policy acceptance, raw-body signature rejection, duplicate webhook acknowledgement, successful workflow start, and pre-delivery automatic refund.

- [ ] **Step 2: Verify RED**

Run: `cd worker && npm test -- payments.test.ts`

Expected: FAIL because payment routes are absent.

- [ ] **Step 3: Implement the Stripe adapter**

```ts
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
  cryptoProvider: Stripe.createSubtleCryptoProvider()
});
export const constructEvent = (raw: string, signature: string, secret: string) =>
  stripe.webhooks.constructEventAsync(raw, signature, secret);
```

Create deposit Checkout Sessions with one line item, `case_id` metadata on both Session and PaymentIntent, `customer_email`, explicit success/cancel URLs, and a 30-minute Checkout expiry. Never trust a price from the browser.

- [ ] **Step 4: Implement routes**

`POST /v1/cases/:token/deposit-checkout` requires `checkout_pending`, uses the configured fixed Priority Discovery Deposit, records whether the case is inside the launch review gate, and returns `{ checkoutUrl }`. `POST /v1/webhooks/stripe` reads `request.text()` before parsing, verifies the signature, records event ID before effects, and starts exactly one `PRIORITY_DISCOVERY` Workflow on `checkout.session.completed`.

- [ ] **Step 5: Test and commit**

Run: `cd worker && npm run check`

Expected: PASS, including duplicate webhook tests.

```bash
git add worker/src/integrations/stripe.ts worker/src/routes/payments.ts worker/src/index.ts worker/test/payments.test.ts
git commit -m "feat: collect priority discovery deposit"
```

### Task 7: Implement Gmail and Agent Adapters

**Files:**
- Create: `worker/src/integrations/gmail.ts`
- Create: `worker/src/integrations/openai.ts`
- Create: `worker/src/agent/contracts.ts`
- Create: `worker/src/agent/prompts.ts`
- Create: `worker/src/domain/risk.ts`
- Create: `worker/test/gmail.test.ts`
- Create: `worker/test/agent.test.ts`
- Create: `worker/test/fixtures/discovery-cases.json`

- [ ] **Step 1: Write failing adapter and policy tests**

Gmail tests must prove deterministic case headers, correct `threadId`, label isolation, draft-not-send behavior, attachment detection before body processing, token refresh, and no full mailbox scan. Agent tests must prove one question, required-field grounding, contradiction detection, explicit confirmation requirement, topic expansion, risky-case hold, and schema failure escalation.

- [ ] **Step 2: Verify RED**

Run: `cd worker && npm test -- gmail.test.ts agent.test.ts`

Expected: FAIL because adapters are absent.

- [ ] **Step 3: Define structured agent contracts**

```ts
export const AgentDecision = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("question"), topic: z.string(), message: z.string() }),
  z.object({ kind: z.literal("checkpoint"), summary: UnderstandingSchema }),
  z.object({ kind: z.literal("blueprint"), blueprint: BlueprintSchema }),
  z.object({ kind: z.literal("hold"), reasons: z.array(z.string()).min(1), draft: z.string() })
]);
export type AgentProvider = { decide(input: AgentInput): Promise<z.infer<typeof AgentDecision>> };
```

- [ ] **Step 4: Implement the OpenAI Responses adapter**

POST to `https://api.openai.com/v1/responses` with `model: env.AGENT_MODEL`, `reasoning: { effort: "low" }`, the approved system prompt, sanitized structured state, and strict JSON Schema output. Parse only the structured output and validate again with Zod. Retry one schema/grounding failure, then return `hold`.

Use `gpt-5.4-mini` as the launch candidate because current official model guidance identifies it as the lower-latency/cost professional-work option; keep `AGENT_MODEL` configurable and require the evaluation gate before live use.

- [ ] **Step 5: Implement Gmail REST calls**

Expose `createDiscoveryThread`, `listLabeledHistory`, `getThreadMessages`, `createReplyDraft`, `sendDraft`, `applyCaseLabels`, and `deleteThread`. Build RFC 2822 MIME messages with `X-Sulemanji-Case` and an opaque public case reference. Reject attachments from metadata before fetching body content.

- [ ] **Step 6: Implement deterministic risk rules before model output**

`evaluateRisk` must hold regulated advice, worker surveillance/evaluation, high-impact decisions, credentials/secrets, private third-party data, destructive actions, unclear authorization, unsupported claims, contradictions, topic expansion, and low-confidence thread mapping. Launch-review mode forces checkpoints and blueprints to hold regardless of model risk.

- [ ] **Step 7: Run fixture evals and commit**

Run: `cd worker && npm run check`

Expected: all fixture expectations PASS; no unsafe case returns an auto-send decision.

```bash
git add worker/src/integrations worker/src/agent worker/src/domain/risk.ts worker/test
git commit -m "feat: add Gmail discovery agent"
```

### Task 8: Implement Durable Discovery, Polling, and Review Actions

**Files:**
- Create: `worker/src/workflows/priority-discovery.ts`
- Create: `worker/src/scheduled/gmail-poller.ts`
- Create: `worker/src/scheduled/digest.ts`
- Create: `worker/src/routes/admin.ts`
- Create: `worker/src/admin/page.ts`
- Modify: `worker/src/index.ts`
- Modify: `worker/wrangler.jsonc`
- Create: `worker/test/priority-discovery.test.ts`
- Create: `worker/test/admin.test.ts`

- [ ] **Step 1: Write failing workflow tests**

Cover payment-to-first-email, one-hour breach alert, one-question turns, correction reopening, explicit confirmation, mandatory launch review, edited-draft approval, 14-day reminder/pause, 60-day abandoned close, duplicate Gmail history, and provider retry without duplicate sends.

- [ ] **Step 2: Verify RED**

Run: `cd worker && npm test -- priority-discovery.test.ts admin.test.ts`

Expected: FAIL because Workflow and admin routes are absent.

- [ ] **Step 3: Implement the Workflow entrypoint**

```ts
export class PriorityDiscoveryWorkflow extends WorkflowEntrypoint<Env, { caseId: string }> {
  async run(event: WorkflowEvent<{ caseId: string }>, step: WorkflowStep) {
    await step.do("start-delivery", () => startDelivery(event.payload.caseId, this.env));
    while (true) {
      const reply = await step.waitForEvent<{ messageId: string }>("customer-reply", { timeout: "14 days" });
      const outcome = await step.do("process-reply", () => processReply(event.payload.caseId, reply.payload, this.env));
      if (outcome === "blueprint_delivered" || outcome === "closed") return;
    }
  }
}
```

Handle the timeout by sending one reminder, transitioning to `paused_inactive`, and waiting for a resume event with a 60-day timeout before closing as abandoned.

- [ ] **Step 4: Implement incremental Gmail polling**

Run every two minutes. Read only the dedicated label using the persisted Gmail history cursor, record message IDs before sending Workflow events, and advance the cursor only after all events are durable.

- [ ] **Step 5: Implement authenticated review actions**

Require verified Cloudflare Access JWT claims for `ssmanji89@gmail.com`. Routes are `POST /v1/admin/cases/:id/approve-draft`, `/reject-refund`, `/pause`, and `/resume`. Every action records actor, prior state, next state, and artifact version. Deleting a Gmail draft has no state effect. Compute the human-review deadline as 5:00 p.m. America/Chicago on the next weekday that is not a United States federal holiday.

- [ ] **Step 6: Add bindings and cron**

Add these bindings directly to `wrangler.jsonc`:

```jsonc
"workflows": [{
  "name": "priority-discovery",
  "binding": "PRIORITY_DISCOVERY",
  "class_name": "PriorityDiscoveryWorkflow"
}],
"triggers": { "crons": ["*/2 * * * *", "0 13 * * *"] }
```

`worker/src/admin/page.ts` must render a server-generated table of held cases
with artifact version, risk reasons, deadline, Gmail draft link, and explicit
Approve/send, Reject/refund, Pause, Resume, and Approve private quote forms.
Every form includes a CSRF token bound to the Access identity and case ID.

- [ ] **Step 7: Verify Checkpoint B and commit**

Run:

```bash
cd worker
npm run check
npx wrangler deploy --dry-run
```

Expected: tests PASS and Wrangler reports a valid bundle without deployment.

```bash
git add worker
git commit -m "feat: orchestrate reviewed priority discovery"
```

## Checkpoint C: Private Quote, Paid Booking, Retention, and Launch

### Task 9: Add Private Quotes, Credits, and Slot Holds

**Files:**
- Create: `worker/migrations/0003_booking_retention.sql`
- Create: `worker/src/domain/booking.ts`
- Modify: `worker/src/repositories/cases.ts`
- Create: `worker/test/booking.test.ts`

- [ ] **Step 1: Write failing booking-domain tests**

Test private-token hashing, quote expiry at blueprint delivery plus 60 days, deposit subtraction exactly once, non-negative balance, 15-minute hold, concurrent hold rejection, failed Checkout release, and no session confirmation before verified balance payment.

- [ ] **Step 2: Verify RED**

Run: `cd worker && npm test -- booking.test.ts`

Expected: FAIL because booking domain is absent.

- [ ] **Step 3: Add booking tables**

Create `session_quotes`, `slot_holds`, and `calendar_events` with unique active-hold indexing by `(calendar_id, starts_at, ends_at)`, one quote per blueprint version, one credit-consumption event, opaque token hashes, and timestamps in UTC.

- [ ] **Step 4: Implement pure rules**

```ts
export const remainingBalance = (total: number, credit: number) => Math.max(0, total - credit);
export const holdExpiresAt = (now: Date) => new Date(now.getTime() + 15 * 60_000);
export const quoteExpiresAt = (blueprintDeliveredAt: Date) => new Date(blueprintDeliveredAt.getTime() + 60 * 86_400_000);
```

Repository methods must use D1 transactions/batches and compare-and-set status changes to prevent two active holds or duplicate credit consumption.

- [ ] **Step 5: Migrate, test, and commit**

Run: `cd worker && npm run db:migrate:local && npm run check`

Expected: PASS.

```bash
git add worker/migrations/0003_booking_retention.sql worker/src/domain/booking.ts worker/src/repositories/cases.ts worker/test/booking.test.ts
git commit -m "feat: add private session quotes"
```

### Task 10: Implement Calendar Availability and Paid Confirmation

**Files:**
- Create: `worker/src/integrations/calendar.ts`
- Create: `worker/src/routes/quotes.ts`
- Create: `work-with-me-quote.md`
- Create: `assets/js/work-with-me-quote.js`
- Modify: `_layouts/default.html`
- Modify: `worker/src/routes/payments.ts`
- Modify: `worker/src/index.ts`
- Create: `worker/test/calendar.test.ts`
- Modify: `worker/test/booking.test.ts`

- [ ] **Step 1: Write failing calendar and route tests**

Cover free/busy privacy, duration and buffer calculations, America/Chicago DST, opaque quote authorization, hold collision, remaining-balance metadata, webhook recheck, event creation, event failure retry, slot-taken refund/alternatives, and no silent time substitution.

- [ ] **Step 2: Verify RED**

Run: `cd worker && npm test -- calendar.test.ts booking.test.ts`

Expected: FAIL because Calendar and quote routes are absent.

- [ ] **Step 3: Implement Calendar REST adapter**

Expose `listAvailability(window, durationMinutes)`, `isFree(start, end)`, and `createSessionEvent(input)`. Use OAuth refresh credentials, call Calendar free/busy, return only computed UTC windows, and never return event titles, descriptions, attendees, or IDs to the browser.

Extend `Env` with `GOOGLE_CALENDAR_ID`, `GOOGLE_CALENDAR_CLIENT_ID`,
`GOOGLE_CALENDAR_CLIENT_SECRET`, and `GOOGLE_CALENDAR_REFRESH_TOKEN`.

- [ ] **Step 4: Implement private quote routes**

`GET /v1/quotes/:token` returns scope, duration, total, credit, remaining balance, expiry, timezone, and windows. `POST /v1/quotes/:token/holds` atomically creates a 15-minute hold and returns a Stripe Checkout URL. The Stripe webhook rechecks free/busy, consumes credit once, creates the event, marks `session_confirmed`, and emails confirmation.

Create `/work-with-me/quote` as a static shell that reads an opaque token from
the URL fragment, not the query string, fetches the private quote, renders
price values from integer cents, shows times in the browser timezone plus
America/Chicago, and posts the selected UTC window to the hold route. Never
persist the token to local storage or analytics.

Set `work_with_me_quote: true` in the page front matter and conditionally load
`assets/js/work-with-me-quote.js` from `_layouts/default.html` only for that
page.

- [ ] **Step 5: Test and commit**

Run: `cd worker && npm run check`

Expected: all payment/calendar race tests PASS.

```bash
git add worker/src worker/test/calendar.test.ts worker/test/booking.test.ts
git commit -m "feat: confirm paid priority sessions"
```

### Task 11: Implement Retention and Operational Digest

**Files:**
- Create: `worker/src/scheduled/retention.ts`
- Modify: `worker/src/scheduled/digest.ts`
- Modify: `worker/src/index.ts`
- Modify: `worker/wrangler.jsonc`
- Create: `worker/test/retention.test.ts`

- [ ] **Step 1: Write failing accelerated-time tests**

Test 90-day redaction, one-year Gmail deletion, legal/dispute hold exclusion, idempotent reruns, failure alerting, no false deletion success, expiring credits, pending reviews, stalled workflows, and held-slot digest entries.

- [ ] **Step 2: Verify RED**

Run: `cd worker && npm test -- retention.test.ts`

Expected: FAIL because retention is absent.

- [ ] **Step 3: Implement retention in two confirmed phases**

At 90 days after closure, redact intake text, discovery working state, and generated working material only after D1 confirms the eligible set. At one year, delete the Gmail thread, record Gmail confirmation, then remove the thread mapping. Preserve consent/payment identifiers and records under an active dispute/legal hold.

- [ ] **Step 4: Expand the digest**

Include normal queue, paid stage, review deadlines, one-hour delivery risk, inactivity, credit expiry, quote approval, slot holds, balance payments, disputes/refunds, and retention failures. Send no customer body content in the digest.

- [ ] **Step 5: Add daily retention cron, test, and commit**

Add `30 13 * * *` to the scheduled triggers and dispatch by cron expression in `index.ts`.

Run: `cd worker && npm run check`

Expected: PASS.

```bash
git add worker/src worker/test/retention.test.ts worker/wrangler.jsonc
git commit -m "feat: enforce discovery retention"
```

### Task 12: Add CI, Runbooks, End-to-End Verification, and Deployment Gates

**Files:**
- Modify: `.github/workflows/jekyll.yml`
- Modify: `.env.example`
- Modify: `README.md`
- Create: `worker/test/e2e.test.ts`
- Create: `worker/README.md`

- [ ] **Step 1: Write the synthetic end-to-end test**

The test must execute unpaid intake, fixed deposit, verified webhook, first Gmail message, three discovery turns, corrected checkpoint, customer confirmation, held blueprint, Suleman approval, private quote, slot hold, remaining-balance payment, Calendar event, 14/60-day timers in accelerated time, and duplicate-event replays. Assert one payment effect, one thread, one blueprint version sent, one credit consumption, and one calendar event.

- [ ] **Step 2: Verify RED then GREEN**

Run: `cd worker && npm test -- e2e.test.ts`

Expected first run: FAIL at the first uncovered contract. For each failure,
implement the named route, repository method, or adapter behavior already
specified in Tasks 1-11, then rerun. Do not remove, skip, or weaken assertions.

- [ ] **Step 3: Add CI before Pages deployment**

Add Node 22 setup, `npm ci --prefix worker`, `npm run check --prefix worker`, Jekyll build, `verify_work_with_me.py`, and `verify_viyu_positioning.py` to the build job before artifact upload. CI must not deploy Pages when Worker or content verification fails.

- [ ] **Step 4: Document exact secret setup without values**

Document `TURNSTILE_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`, `GOOGLE_CALENDAR_REFRESH_TOKEN`, `OPENAI_API_KEY`, and Cloudflare Access audience/team domain. Use `wrangler secret put NAME`; never place values in files or command history.

Document Cloudflare custom-domain routing for `api.sulemanji.com`, restrict
CORS to `https://www.sulemanji.com`, and verify the API hostname before changing
the static site's production endpoint.

- [ ] **Step 5: Document staged production commands**

```bash
cd worker
npm run check
npx wrangler d1 migrations apply DB --remote
npx wrangler deploy
cd ..
bundle exec jekyll build
python3 scripts/verify_work_with_me.py
python3 scripts/verify_viyu_positioning.py
```

Expected: every command PASS before DNS/API configuration or live Stripe mode changes.

- [ ] **Step 6: Execute live test-mode UAT**

Use only synthetic content. Confirm Turnstile, Stripe test Checkout, Gmail label/thread/draft behavior, Access authorization, blueprint approval, quote privacy, 15-minute hold, Calendar test event, duplicate webhooks, and alert delivery. Record evidence in `worker/README.md` with dates and test IDs, never message bodies or secrets.

- [ ] **Step 7: Enforce launch gates**

Keep live Stripe disabled until Texas terms/tax review is recorded, all checks pass, Gmail/Calendar OAuth scopes are reviewed, retention is verified, and a refund drill succeeds. Keep every launch-review checkpoint and blueprint in mandatory review. Do not enable routine auto-send until ten paid cases complete launch review and the spec's zero-unsafe-send evaluation gate passes.

- [ ] **Step 8: Commit the verified release configuration**

```bash
git add .github/workflows/jekyll.yml .env.example README.md worker
git commit -m "test: gate priority discovery launch"
```

## Final Verification

Run from the repository root:

```bash
git status --short
bundle exec jekyll build
python3 scripts/verify_work_with_me.py
python3 scripts/verify_viyu_positioning.py
npm run check --prefix worker
npx wrangler deploy --dry-run --config worker/wrangler.jsonc
```

Expected:

- worktree is clean;
- Jekyll build succeeds;
- both Python verifiers pass;
- all Worker unit, integration, evaluation, and end-to-end tests pass;
- Wrangler produces a valid bundle with D1, Workflow, and cron bindings;
- no secret appears in tracked files or generated output;
- live payment remains disabled until the documented external launch gates pass.
