# Task 2 Report: Add Case Schema, State Machine, and D1 Repository

## Status

DONE_WITH_CONCERNS

## Commit

- c9434d59a822608156ed7a28ec34c3888f061316 feat: add intake case domain

## Files Changed

- `worker/migrations/0001_cases.sql`
- `worker/src/domain/case.ts`
- `worker/src/domain/state-machine.ts`
- `worker/src/repositories/cases.ts`
- `worker/test/state-machine.test.ts`

## RED Verification

Command:

```bash
cd worker && npm test -- state-machine.test.ts
```

Result: exit 1, expected RED failure.

Key output:

```text
FAIL  test/state-machine.test.ts [ test/state-machine.test.ts ]
Error: Cannot find module '../src/domain/state-machine'
Test Files  1 failed (1)
Tests  no tests
```

The RED run failed because `worker/src/domain/state-machine.ts` did not exist, matching the Task 2 expectation. The run also emitted a Cloudflare test-pool warning that `worker/src/index.ts` could not be resolved; that file is outside Task 2 write scope.

## GREEN Verification

Command:

```bash
cd worker && npm test -- state-machine.test.ts
```

Result: exit 0.

Key output:

```text
Test Files  1 passed (1)
Tests  2 passed (2)
```

The focused transition test passed after implementing the domain state machine.

## Task 2 Verification Commands

Command:

```bash
cd worker && npm run db:migrate:local
```

Result: exit 0.

Key output:

```text
No migrations to apply!
```

Note: the initial migration verification before the final repository self-review adjustment applied `0001_cases.sql` successfully with `7 commands executed successfully`.

Command:

```bash
cd worker && npm test -- state-machine.test.ts
```

Result: exit 0.

Key output:

```text
Test Files  1 passed (1)
Tests  2 passed (2)
```

Command:

```bash
cd worker && npm run check
```

Result: exit 0.

Key output:

```text
tsc --noEmit && vitest run
Test Files  1 passed (1)
Tests  2 passed (2)
```

## Implementation Notes

- Added the case status enum and intake input schema using the Task 2 values verbatim.
- Added explicit allowed transitions and `canTransition`.
- Added normalized D1 tables and requested indexes.
- Added `CaseRepository` plus `D1CaseRepository` using parameterized `prepare().bind()` statements.
- `createIntake` uses `crypto.randomUUID()`, a 32-byte random public token, SHA-256 token hashes, and one D1 batch for case, intake, consent, and audit event writes.
- `transition` checks the explicit state machine, updates with `WHERE id = ? AND status = ?`, and throws unless `meta.changes === 1`.

## Self-Review

- Confirmed staged diff contained only the five Task 2 worker files.
- Confirmed no frontend files or later checkpoint files were edited.
- Adjusted `createIntake` during self-review to start all cases at `intake_received` rather than inferring a path-specific next status inside intake creation.
- Committed only the requested Task 2 worker paths.

## Concerns

- `vitest` continues to warn that `worker/src/index.ts` cannot be resolved by the Cloudflare test pool. This warning existed during the RED run and remains after Task 2, but all required commands exit 0. I did not create or edit `worker/src/index.ts` because it is outside the Task 2 write scope.

---

# Task 2 Review Fix Report

## Status

DONE

## Commit

- 5db6f8bd1e94225c63317493a0911afaa77e8613 fix: harden case repository transitions

## Files Changed

- `worker/src/repositories/cases.ts`
- `worker/test/repository/cases.test.ts`

## RED Verification

Command:

```bash
cd worker && npm test -- cases.test.ts
```

Result: exit 1, expected RED failure.

Key output:

```text
Tests  2 failed | 4 passed (6)
rejects invalid runtime intake input before persisting:
AssertionError: promise resolved instead of rejecting
rolls back the status update when audit insertion fails:
expected 'normal_queue' to be 'intake_received'
```

The RED run confirmed both review findings: `createIntake` accepted invalid runtime input, and a failed audit insert left the case status mutated.

## GREEN Verification

Command:

```bash
cd worker && npm test -- cases.test.ts
```

Result: exit 0.

Key output:

```text
Test Files  1 passed (1)
Tests  6 passed (6)
```

Command:

```bash
cd worker && npm test -- state-machine.test.ts cases.test.ts
```

Result: exit 0.

Key output:

```text
Test Files  2 passed (2)
Tests  8 passed (8)
```

Command:

```bash
npm run check --prefix worker
```

Result: exit 0.

Key output:

```text
tsc --noEmit && vitest run
Test Files  2 passed (2)
Tests  8 passed (8)
```

## Implementation Notes

- `D1CaseRepository.createIntake` now parses `IntakeInput` inside the repository before generating IDs or writing any D1 statements.
- `D1CaseRepository.transition` now batches the compare-and-set update with a conditional audit insert using `WHERE changes() = 1`, so failed CAS transitions do not write audit events.
- The transition batch verifies both update and audit insert changed one row before returning success.
- Added focused repository tests for create validation, public-token lookup, valid transition audit insertion, invalid transition rejection, CAS failure, and rollback when audit insertion fails.

## Self-Review

- Confirmed changes stayed within the requested repository/test/report scope.
- Confirmed no frontend, route, or later checkpoint files were edited.
- Confirmed the repository fake exercises the D1 statement order and transactional batch behavior needed for these review findings.
- `git diff --check` passed before committing.

## Concerns

- `vitest` still emits the pre-existing Cloudflare test-pool warning that `worker/src/index.ts` cannot be resolved. I did not create that file because it is outside this task's write scope; all required test/check commands exit 0.
