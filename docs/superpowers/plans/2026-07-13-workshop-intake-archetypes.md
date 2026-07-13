# Workshop Intake Archetypes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Workshop Ideas / starting-point categories to the existing Work With Me intake, persist them, surface them in admin review, and pass them into agent discovery prompts.

**Architecture:** Keep `/work-with-me` as the single public entry point and add one normalized `workshopCategory` field from static Jekyll form to Worker intake schema to D1 storage. Admin and agent layers consume a safe label/helper rather than making category-specific state-machine decisions.

**Tech Stack:** Jekyll Markdown/Liquid, vanilla browser JavaScript, TypeScript Cloudflare Worker, Hono, Zod, Cloudflare D1 SQL migrations, Vitest with Cloudflare workers pool, Python static verifier.

## Global Constraints

- Do not create separate public workshop pages.
- Do not publish session pricing.
- Do not enable live checkout if the config gate is still off.
- Do not accept attachments at launch.
- Do not ask users for credentials, private source code, customer data, or sensitive third-party records.
- Do not offer regulated advice, employment surveillance, high-impact decisions, credential handling, or sensitive-data processing workflows.
- Do not expose internal implementation details of Viyu, customer systems, or private tooling.
- Allowed `workshopCategory` values are `github_codebase_review`, `ai_business_operations`, `home_personal_automation`, and `not_sure_other`.
- Missing, malformed, or blank `workshopCategory` must normalize to `not_sure_other`.
- The category must not override risk handling.
- Checkout remains controlled by the existing readiness/config gate.

---

## File Structure

- `worker/src/domain/case.ts`: owns the `WorkshopCategory` enum, safe category labels, and `IntakeInput` normalization.
- `worker/migrations/0008_workshop_category.sql`: adds the persisted D1 column for new and historical intake rows.
- `worker/src/repositories/cases.ts`: writes category values, reads them for public/admin/agent contexts, and handles historical null values.
- `worker/src/routes/intakes.ts`: continues to accept legacy payloads and returns current safe public state.
- `work-with-me.md`: adds the public starting-point selector and category copy inside the existing intake page.
- `assets/js/work-with-me.js`: serializes `workshopCategory`.
- `scripts/verify_work_with_me.py`: verifies the four categories, serialized field, safety boundaries, and rendered site output.
- `worker/src/admin/page.ts`: shows a safe category label in the open intake queue.
- `worker/src/agent/contracts.ts`: carries category through `AgentInputSchema`.
- `worker/src/agent/prompts.ts`: adds category-specific discovery guidance without bypassing risk gates.
- `worker/test/intakes.test.ts`: covers route behavior, persistence, legacy fallback, unknown fallback, and inline test schema.
- `worker/test/discovery-repository-d1.test.ts`: covers D1 migration and repository read behavior with the real migration loader.
- `worker/test/admin.test.ts`: verifies admin category rendering.
- `worker/test/agent.test.ts` and `worker/test/fixtures/discovery-cases.json`: verifies agent contract and prompt/risk compatibility.

---

### Task 1: Domain Contract And D1 Persistence

**Files:**
- Modify: `worker/src/domain/case.ts`
- Create: `worker/migrations/0008_workshop_category.sql`
- Modify: `worker/src/repositories/cases.ts`
- Modify: `worker/test/intakes.test.ts`
- Test: `worker/test/intakes.test.ts`

**Interfaces:**
- Consumes: existing `IntakeInput` Zod schema and `D1CaseRepository.createIntakeInStatus(input, meta, next, event)`.
- Produces:
  - `WorkshopCategory` Zod enum.
  - `type WorkshopCategory`.
  - `WORKSHOP_CATEGORY_LABELS: Record<WorkshopCategory, string>`.
  - `normalizeWorkshopCategory(value: unknown): WorkshopCategory`.
  - `IntakeInput["workshopCategory"]`.
  - D1 `intakes.workshop_category TEXT NOT NULL DEFAULT 'not_sure_other'`.

- [ ] **Step 1: Write failing intake persistence tests**

In `worker/test/intakes.test.ts`, extend `valid` and add three tests inside `describe("intake routes", () => { ... })`:

```ts
const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  contextType: "professional",
  workshopCategory: "github_codebase_review",
  problem:
    "A recurring intake process is copied manually between email and a tracker.",
  desiredOutcome:
    "A reviewed workflow with explicit handoffs and approval boundaries.",
  priorAttempts: "A spreadsheet checklist.",
  sanitizedLinks: [],
  path: "normal",
  termsAccepted: true,
  turnstileToken: "test-pass",
  website: "",
};

it("persists the selected workshop category", async () => {
  const response = await postIntake({
    ...valid,
    workshopCategory: "ai_business_operations",
  });

  expect(response.status).toBe(201);
  const intake = await testEnv.DB.prepare(
    "SELECT workshop_category FROM intakes INNER JOIN cases ON cases.id = intakes.case_id WHERE cases.email = ?",
  )
    .bind(valid.email)
    .first<{ workshop_category: string }>();
  expect(intake).toEqual({ workshop_category: "ai_business_operations" });
});

it("defaults missing workshop category for legacy submissions", async () => {
  const { workshopCategory: _workshopCategory, ...legacyInput } = valid;
  const response = await postIntake(legacyInput);

  expect(response.status).toBe(201);
  const intake = await testEnv.DB.prepare(
    "SELECT workshop_category FROM intakes INNER JOIN cases ON cases.id = intakes.case_id WHERE cases.email = ?",
  )
    .bind(valid.email)
    .first<{ workshop_category: string }>();
  expect(intake).toEqual({ workshop_category: "not_sure_other" });
});

it("normalizes unknown workshop categories instead of rejecting the intake", async () => {
  const response = await postIntake({
    ...valid,
    workshopCategory: "unsupported_category",
  });

  expect(response.status).toBe(201);
  const intake = await testEnv.DB.prepare(
    "SELECT workshop_category FROM intakes INNER JOIN cases ON cases.id = intakes.case_id WHERE cases.email = ?",
  )
    .bind(valid.email)
    .first<{ workshop_category: string }>();
  expect(intake).toEqual({ workshop_category: "not_sure_other" });
});
```

Update the inline `CREATE TABLE intakes` statement in `schemaStatements` so these tests can query the new column:

```sql
CREATE TABLE intakes (
  case_id TEXT PRIMARY KEY REFERENCES cases(id),
  workshop_category TEXT NOT NULL DEFAULT 'not_sure_other',
  problem TEXT NOT NULL,
  desired_outcome TEXT NOT NULL,
  prior_attempts TEXT NOT NULL,
  sanitized_links_json TEXT NOT NULL,
  redacted_at TEXT
)
```

- [ ] **Step 2: Run the route test to verify it fails**

Run:

```bash
cd worker && npm test -- intakes.test.ts
```

Expected: FAIL because `workshopCategory` is not accepted by `IntakeInput` and `intakes.workshop_category` is not written.

- [ ] **Step 3: Add domain enum and normalization**

In `worker/src/domain/case.ts`, insert this above `IntakeInput`:

```ts
export const WorkshopCategory = z.enum([
  "github_codebase_review",
  "ai_business_operations",
  "home_personal_automation",
  "not_sure_other",
]);
export type WorkshopCategory = z.infer<typeof WorkshopCategory>;

export const WORKSHOP_CATEGORY_LABELS: Record<WorkshopCategory, string> = {
  github_codebase_review: "GitHub / Codebase Review",
  ai_business_operations: "AI Business Operations",
  home_personal_automation: "Home + Personal Automation",
  not_sure_other: "Not sure / Other",
};

export const normalizeWorkshopCategory = (value: unknown): WorkshopCategory => {
  const parsed = WorkshopCategory.safeParse(value);
  return parsed.success ? parsed.data : "not_sure_other";
};
```

Replace the current `IntakeInput` definition with a preprocess wrapper that normalizes the category before object validation:

```ts
export const IntakeInput = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return value;
    }

    const raw = value as Record<string, unknown>;
    return {
      ...raw,
      workshopCategory: normalizeWorkshopCategory(raw.workshopCategory),
    };
  },
  z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().email().max(254),
    contextType: z.enum(["personal", "professional"]),
    workshopCategory: WorkshopCategory,
    problem: z.string().trim().min(40).max(6000),
    desiredOutcome: z.string().trim().min(20).max(3000),
    priorAttempts: z.string().trim().max(3000).default(""),
    sanitizedLinks: z.array(z.string().url()).max(5),
    path: z.enum(["normal", "priority"]),
    termsAccepted: z.literal(true),
    turnstileToken: z.string().min(1),
    website: z.string().max(0),
  }),
);
export type IntakeInput = z.infer<typeof IntakeInput>;
```

- [ ] **Step 4: Add the production migration**

Create `worker/migrations/0008_workshop_category.sql`:

```sql
ALTER TABLE intakes
  ADD COLUMN workshop_category TEXT NOT NULL DEFAULT 'not_sure_other';
```

- [ ] **Step 5: Write category values in repository inserts**

In both `createIntake` and `createIntakeInStatus` in `worker/src/repositories/cases.ts`, replace each `INSERT INTO intakes` statement with:

```sql
INSERT INTO intakes (
  case_id, workshop_category, problem, desired_outcome, prior_attempts,
  sanitized_links_json, redacted_at
) VALUES (?, ?, ?, ?, ?, ?, ?)
```

Bind `parsedInput.workshopCategory` immediately after `id`:

```ts
.bind(
  id,
  parsedInput.workshopCategory,
  parsedInput.problem,
  parsedInput.desiredOutcome,
  parsedInput.priorAttempts,
  JSON.stringify(parsedInput.sanitizedLinks),
  null,
)
```

- [ ] **Step 6: Run the focused intake tests**

Run:

```bash
cd worker && npm test -- intakes.test.ts
```

Expected: PASS for all intake route tests.

- [ ] **Step 7: Commit**

```bash
git add worker/src/domain/case.ts worker/src/repositories/cases.ts worker/migrations/0008_workshop_category.sql worker/test/intakes.test.ts
git commit -m "feat: persist workshop intake category"
```

---

### Task 2: Public Work With Me Starting Points

**Files:**
- Modify: `work-with-me.md`
- Modify: `assets/js/work-with-me.js`
- Modify: `scripts/verify_work_with_me.py`
- Test: `scripts/verify_work_with_me.py`

**Interfaces:**
- Consumes: `workshopCategory` enum values from Task 1.
- Produces: submitted JSON payload containing `workshopCategory`.

- [ ] **Step 1: Extend the static verifier first**

In `scripts/verify_work_with_me.py`, add these source checks inside `if PAGE.exists():` after the existing form field checks:

```python
        for phrase in [
            "Pick the closest starting point",
            "GitHub / Codebase Review",
            "AI Business Operations",
            "Home + Personal Automation",
            "Not sure / Other",
            'name="workshopCategory"',
            'value="github_codebase_review"',
            'value="ai_business_operations"',
            'value="home_personal_automation"',
            'value="not_sure_other"',
        ]:
            require_text(page, phrase, PAGE, failures)
```

Add these script checks inside `if SCRIPT.exists():`:

```python
        require_text(script, "workshopCategory", SCRIPT, failures)
        require_text(script, 'formData.get("workshopCategory")', SCRIPT, failures)
```

Add these rendered output checks inside `if SITE_PAGE.exists():`:

```python
        for phrase in [
            "Pick the closest starting point",
            "GitHub / Codebase Review",
            "AI Business Operations",
            "Home + Personal Automation",
            "Not sure / Other",
            'name="workshopCategory"',
        ]:
            require(phrase in site_text, f"_site/work-with-me.html must include {phrase!r}", failures)
```

- [ ] **Step 2: Run verifier to confirm it fails before UI changes**

Run:

```bash
python3 scripts/verify_work_with_me.py
```

Expected: FAIL with missing category selector and serializer messages.

- [ ] **Step 3: Add the category selector to the intake form**

In `work-with-me.md`, insert this fieldset between the existing `contextType` fieldset and the `What is messy?` textarea:

```html
  <fieldset class="workshop-category-choice"><legend>Pick the closest starting point</legend>
    <p class="form-help">It just helps me ask better first questions. Choose Not sure / Other if the work does not fit cleanly.</p>
    <label><input type="radio" name="workshopCategory" value="github_codebase_review"> <strong>GitHub / Codebase Review</strong><span>Repo, prototype, AI-built app, broken automation, or unclear technical build path.</span></label>
    <label><input type="radio" name="workshopCategory" value="ai_business_operations"> <strong>AI Business Operations</strong><span>Recurring work across email, docs, spreadsheets, tickets, forms, or business systems.</span></label>
    <label><input type="radio" name="workshopCategory" value="home_personal_automation"> <strong>Home + Personal Automation</strong><span>Household, personal admin, inbox, calendar, files, or lightweight life-operations workflows.</span></label>
    <label><input type="radio" name="workshopCategory" value="not_sure_other" checked> <strong>Not sure / Other</strong><span>A messy problem that needs triage before it has a clean category.</span></label>
  </fieldset>
```

Keep the existing Boundaries section unchanged unless the verifier requires a safety phrase already present in the design.

- [ ] **Step 4: Serialize `workshopCategory`**

In `assets/js/work-with-me.js`, add the field immediately after `contextType` in `serializeIntake`:

```js
      workshopCategory: String(formData.get("workshopCategory") || "not_sure_other"),
```

- [ ] **Step 5: Add minimal CSS for stable category cards**

In `assets/css/style.scss`, add category styling near the existing `.path-choice` and `.intake-form` rules:

```scss
.workshop-category-choice {
  display: grid;
  gap: 0.75rem;
}

.workshop-category-choice label {
  border: 1px solid var(--border);
  border-radius: 8px;
  display: grid;
  gap: 0.25rem;
  grid-template-columns: auto 1fr;
  min-height: 4.5rem;
  padding: 0.85rem;
}

.workshop-category-choice input {
  margin-top: 0.25rem;
}

.workshop-category-choice strong,
.workshop-category-choice span {
  grid-column: 2;
}

.form-help {
  color: var(--text-muted);
  margin: 0;
}
```

- [ ] **Step 6: Build and verify static output**

Run:

```bash
bundle exec jekyll build
python3 scripts/verify_work_with_me.py
```

Expected: both commands exit `0` and verifier prints `Work With Me verification passed.`

- [ ] **Step 7: Commit**

```bash
git add work-with-me.md assets/js/work-with-me.js assets/css/style.scss scripts/verify_work_with_me.py
git commit -m "feat: add workshop starting points to intake"
```

---

### Task 3: Admin Queue Category Visibility

**Files:**
- Modify: `worker/src/admin/page.ts`
- Modify: `worker/test/admin.test.ts`
- Test: `worker/test/admin.test.ts`

**Interfaces:**
- Consumes: `WORKSHOP_CATEGORY_LABELS`, `WorkshopCategory`, and persisted `intakes.workshop_category`.
- Produces: `IntakeQueueCase.workshopCategory` and safe admin HTML label.

- [ ] **Step 1: Write failing admin render test**

In `worker/test/admin.test.ts`, add `workshopCategory` to the existing `intakeQueueCases` fixture:

```ts
          workshopCategory: "ai_business_operations",
```

Add this assertion after `expect(html).toContain("normal_queue");`:

```ts
    expect(html).toContain("AI Business Operations");
```

- [ ] **Step 2: Run admin test to confirm failure**

Run:

```bash
cd worker && npm test -- admin.test.ts
```

Expected: FAIL because `IntakeQueueCase` has no `workshopCategory` property and the HTML does not render the label.

- [ ] **Step 3: Extend admin types and query**

In `worker/src/admin/page.ts`, import the labels and type:

```ts
import {
  WORKSHOP_CATEGORY_LABELS,
  WorkshopCategory,
  normalizeWorkshopCategory,
} from "../domain/case";
```

Add to `IntakeQueueCase`:

```ts
  workshopCategory: WorkshopCategory;
```

Update the `listIntakeQueueCases` SQL select list:

```sql
        intakes.problem, intakes.desired_outcome,
        intakes.sanitized_links_json, intakes.workshop_category
```

Update the row type:

```ts
      workshop_category: string | null;
```

Map the normalized value:

```ts
    workshopCategory: normalizeWorkshopCategory(row.workshop_category),
```

- [ ] **Step 4: Render the category label in the open queue**

In `renderIntakeQueueRow`, replace the current path cell with:

```ts
    <td>${escapeHtml(labelForPath(item.path))}<br><span class="muted">${escapeHtml(item.status)}</span><br><span class="muted">${escapeHtml(labelForWorkshopCategory(item.workshopCategory))}</span></td>
```

Add helper near `labelForPath`:

```ts
const labelForWorkshopCategory = (category: WorkshopCategory): string =>
  WORKSHOP_CATEGORY_LABELS[category];
```

- [ ] **Step 5: Run admin test**

Run:

```bash
cd worker && npm test -- admin.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add worker/src/admin/page.ts worker/test/admin.test.ts
git commit -m "feat: show workshop category in admin queue"
```

---

### Task 4: Agent Context And Tailored Discovery Guidance

**Files:**
- Modify: `worker/src/agent/contracts.ts`
- Modify: `worker/src/agent/prompts.ts`
- Modify: `worker/src/integrations/openai.ts`
- Modify: `worker/src/repositories/cases.ts`
- Modify: `worker/test/agent.test.ts`
- Modify: `worker/test/agent-jobs.test.ts`
- Modify: `worker/test/fixtures/discovery-cases.json`
- Test: `worker/test/agent.test.ts`
- Test: `worker/test/agent-jobs.test.ts`

**Interfaces:**
- Consumes: `IntakeInput["workshopCategory"]` and persisted `intakes.workshop_category`.
- Produces: `AgentInputSchema.intake.workshopCategory` and category-specific discovery hints in the model prompt.

- [ ] **Step 1: Write failing agent contract test**

In `worker/test/agent.test.ts`, add this test near the existing contract tests:

```ts
  it("accepts workshop category in agent intake context", () => {
    const safeRoutine = fixtures.find((fixture) => fixture.name === "safe routine")!
      .input as AgentInput;

    expect(safeRoutine.intake.workshopCategory).toBe("ai_business_operations");
  });
```

In the existing `"minimizes and redacts sensitive values before model submission"` test, update the key assertion to include the new safe category field:

```ts
    expect(Object.keys(sanitized.intake)).toEqual([
      "contextType",
      "workshopCategory",
      "problem",
      "desiredOutcome",
      "priorAttempts",
      "sanitizedLinks",
    ]);
```

Update `worker/test/fixtures/discovery-cases.json` so every `input.intake` object includes:

```json
"workshopCategory": "ai_business_operations"
```

Keep every existing fixture on `ai_business_operations` so this task changes the
contract without expanding the fixture scenarios.

- [ ] **Step 2: Write failing repository context assertion**

In `worker/test/discovery-repository-d1.test.ts`, import the new migration raw text after `migration0006`:

```ts
import migration0008 from "../migrations/0008_workshop_category.sql?raw";
```

Add the migration to `loadMigrations()` after `migration0006`:

```ts
    migration("0008_workshop_category.sql", migration0008),
```

Add this test after `it("treats repeated identical delivery starts as idempotent", async () => { ... });`:

```ts
  it("loads workshop category into discovery agent context", async () => {
    await seedCase("case_1");
    await db
      .prepare(
        `INSERT INTO intakes (
          case_id, workshop_category, problem, desired_outcome, prior_attempts,
          sanitized_links_json, redacted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        "case_1",
        "github_codebase_review",
        "A public repo has an unclear build path and failing automation handoffs.",
        "A clear review agenda and first safe build slice.",
        "The README and scripts were edited several times.",
        JSON.stringify(["https://github.com/example/repo"]),
        null,
      )
      .run();

    const context = await repository.getDiscoveryAgentContext("case_1");

    expect(context).toMatchObject({
      caseId: "case_1",
      workshopCategory: "github_codebase_review",
      contextType: "professional",
    });
  });
```

This test proves the real migration loader creates `intakes.workshop_category` and that the repository maps it into discovery context.

Also assert historical fallback in the same test file by inserting a legacy row without an explicit category after the new migration has applied:

```ts
  it("defaults historical discovery context rows without a category", async () => {
    await seedCase("case_2");
    await db
      .prepare(
        `INSERT INTO intakes (
          case_id, problem, desired_outcome, prior_attempts,
          sanitized_links_json, redacted_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        "case_2",
        "A messy recurring workflow needs a general triage path.",
        "A clearer map and review agenda.",
        "",
        JSON.stringify([]),
        null,
      )
      .run();

    const context = await repository.getDiscoveryAgentContext("case_2");

    expect(context).toMatchObject({
      caseId: "case_2",
      workshopCategory: "not_sure_other",
    });
  });
```

- [ ] **Step 3: Run focused tests to confirm failure**

Run:

```bash
cd worker && npm test -- agent.test.ts discovery-repository-d1.test.ts
```

Expected: FAIL because the agent schema and repository context do not include `workshopCategory`.

- [ ] **Step 4: Extend agent contract**

In `worker/src/agent/contracts.ts`, import the enum:

```ts
import { WorkshopCategory } from "../domain/case";
```

Add `workshopCategory` inside `AgentInputSchema.shape.intake` after `contextType`:

```ts
        workshopCategory: WorkshopCategory,
```

- [ ] **Step 5: Extend repository discovery context**

In `worker/src/repositories/cases.ts`, add `WorkshopCategory` to the existing import from `../domain/case` if needed:

```ts
import {
  IntakeInput,
  normalizeWorkshopCategory,
  type CaseStatus,
  type WorkshopCategory,
} from "../domain/case";
```

Add to `DiscoveryAgentContext`:

```ts
  workshopCategory: WorkshopCategory;
```

Add to `DiscoveryAgentContextRow`:

```ts
  workshop_category: string | null;
```

Update the `getDiscoveryAgentContext` SQL select list:

```sql
          cases.launch_review_required, intakes.workshop_category,
          intakes.problem,
```

Map the normalized category:

```ts
      workshopCategory: normalizeWorkshopCategory(row.workshop_category),
```

- [ ] **Step 6: Pass category into queued agent jobs**

In `worker/src/workflows/priority-discovery.ts`, update the `agentInput.intake` object inside `preparePriorityDiscoveryAgentTurn` to include `workshopCategory`:

```ts
intake: {
  contextType: context.contextType,
  workshopCategory: context.workshopCategory,
  problem: context.problem,
  desiredOutcome: context.desiredOutcome,
  priorAttempts: context.priorAttempts,
  sanitizedLinks: context.sanitizedLinks,
},
```

Update `worker/test/agent-jobs.test.ts` helper `agentInput`:

```ts
  intake: {
    contextType: "professional" as const,
    workshopCategory: "ai_business_operations" as const,
    problem: "I need help prioritizing a messy intake workflow across teams.",
    desiredOutcome: "A practical automation blueprint and session agenda.",
    priorAttempts: "",
    sanitizedLinks: [],
  },
```

Update admin test fixtures for claimed agent jobs to include:

```ts
            workshopCategory: "ai_business_operations" as const,
```

- [ ] **Step 7: Preserve category in sanitized model input**

In `worker/src/integrations/openai.ts`, add `workshopCategory` to `sanitizeAgentInputForModel` immediately after `contextType`:

```ts
  intake: {
    contextType: input.intake.contextType,
    workshopCategory: input.intake.workshopCategory,
    problem: redactSensitiveText(input.intake.problem),
    desiredOutcome: redactSensitiveText(input.intake.desiredOutcome),
    priorAttempts: redactSensitiveText(input.intake.priorAttempts),
    sanitizedLinks: input.intake.sanitizedLinks.slice(0, 5),
  },
```

- [ ] **Step 8: Add tailored prompt guidance**

Replace `DISCOVERY_SYSTEM_PROMPT` in `worker/src/agent/prompts.ts` with:

```ts
export const DISCOVERY_SYSTEM_PROMPT = `
You run a cautious AI workflow discovery thread for Suleman Manji.
Ask one question at a time until the messy workflow is understood.
Use the intake workshop category only to choose better first questions:
- github_codebase_review: ask about repo goal, current blocker, intended users, build/test/deploy state, docs/readme quality, known failure points, sanitized public links, and private-code boundaries.
- ai_business_operations: ask about recurring work, systems involved at a high level, who touches each step, handoffs, frequency/volume, business risk, approval needs, and data sensitivity boundaries.
- home_personal_automation: ask about the recurring personal workflow, devices or services involved at a high level, manual triggers, human approval, privacy boundaries, and anything that must never be automated.
- not_sure_other: ask generic messy-work triage questions about desired outcome, current process, pain points, tools involved, volume/frequency, and risk boundaries.
Do not provide regulated advice, request credentials, process attachments, or
expand into unrelated projects. Do not automate employment surveillance,
high-impact decisions, unsafe personal automation, credential handling, or
sensitive third-party data workflows. Return only the requested JSON decision
shape.
`.trim();
```

- [ ] **Step 9: Run focused agent and repository tests**

Run:

```bash
cd worker && npm test -- agent.test.ts agent-jobs.test.ts discovery-repository-d1.test.ts admin.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add worker/src/agent/contracts.ts worker/src/agent/prompts.ts worker/src/integrations/openai.ts worker/src/repositories/cases.ts worker/src/workflows worker/test/agent.test.ts worker/test/agent-jobs.test.ts worker/test/admin.test.ts worker/test/fixtures/discovery-cases.json worker/test/discovery-repository-d1.test.ts
git commit -m "feat: tailor agent discovery by workshop category"
```

---

### Task 5: End-To-End Verification And Merge Preparation

**Files:**
- Modify only files already changed by Tasks 1-4 if verification finds a bug.
- Test: full Worker suite, static verifier, Jekyll build.

**Interfaces:**
- Consumes: complete implementation from Tasks 1-4.
- Produces: verified branch ready to merge back to `main`.

- [ ] **Step 1: Run full Worker suite**

Run:

```bash
cd worker && npm test
```

Expected: all Worker tests pass.

- [ ] **Step 2: Build the static site**

Run:

```bash
bundle exec jekyll build
```

Expected: command exits `0`, `_site/work-with-me.html` exists, and the rendered page contains the four category labels.

- [ ] **Step 3: Run the static verifier**

Run:

```bash
python3 scripts/verify_work_with_me.py
```

Expected: prints `Work With Me verification passed.`

- [ ] **Step 4: Inspect git diff for accidental scope creep**

Run:

```bash
git diff --stat main...HEAD
git diff --name-only main...HEAD
```

Expected: changed files are limited to the spec, this plan, and files listed in Tasks 1-4. `.DS_Store` remains unstaged.

- [ ] **Step 5: Commit verification fixes if any were needed**

If Step 1-3 required fixes, commit only those implementation files:

```bash
git add worker/src worker/test worker/migrations work-with-me.md assets/js/work-with-me.js assets/css/style.scss scripts/verify_work_with_me.py
git commit -m "fix: verify workshop intake archetypes"
```

If no fixes were needed, do not create an empty commit.

- [ ] **Step 6: Prepare merge**

Run:

```bash
git status --short --branch
git log --oneline main..HEAD
```

Expected: branch is clean except the pre-existing unstaged `.DS_Store`, and the branch contains the spec, plan, and implementation commits.
