# Editorial maintenance operations

The maintenance endpoints are private Worker routes. They accept authenticated HMAC commands only; do not put keys, raw memory, or customer data in this repository.

## Operator commands

Send a JSON request to `POST /internal/operator` with `content-type: application/json`, `x-operator-key-id`, and `x-operator-signature`. The signature is HMAC-SHA256 over the exact request bytes using the active operator key.

| Request | Effect |
|---|---|
| `{"action":"status"}` | Read pause state and owner epoch. |
| `{"action":"pause"}` | Pause runs and advance the owner epoch, invalidating prior clearance. |
| `{"action":"resume"}` | Resume admission and advance the owner epoch. Use only after the runtime, source, budget, and publisher bindings have been qualified. |
| `{"action":"inspect","candidate_id":"…"}` | Read a candidate's durable state and bounded call counters. |
| `{"action":"retry","candidate_id":"…"}` | Currently held. Reconcile its durable effect before implementing or invoking retry. |
| `{"action":"revoke","candidate_id":"…"}` | Hold a nonterminal candidate. |

Every accepted command writes a private durable receipt. The request body is capped at 16 KiB. Failed authentication returns 401; malformed requests return 400.

## Recovery

1. Pause the editorial Worker.
2. Inspect the candidate and its publication-effect row.
3. Read the associated pull request, checks, merge state, deployed source revision, and exact public URLs.
4. Record a terminal durable outcome only after readback. If evidence is uncertain, keep the candidate held and do not repeat the effect.
5. Resume only after the source authority, provider bounds, deployment, and one-writer state have been requalified.

Current limit: the scheduled Workflow durably records a held slot but does not yet execute discovery through public verification. Keep the control paused. A slot receipt is not a completed maintenance run.
