import type { EditorialEnv } from './contracts.js';
import { claimScheduleSlot, markScheduleDispatched, pendingScheduleClaims, parseEditorialPolicy } from './scheduler.js';
import { readControl } from './state.js';
import type { WorkflowParams } from './workflow.js';

type ScheduleEnv = EditorialEnv & { EDITORIAL_POLICY_JSON?: string };

export async function dispatchDueSlot(now: Date, env: ScheduleEnv): Promise<void> {
  if ((await readControl(env.DB)).paused) return;
  const policy = parseEditorialPolicy(env.EDITORIAL_POLICY_JSON);
  if (!policy) throw new Error('EDITORIAL_POLICY_JSON_MISSING_OR_INVALID');
  await claimScheduleSlot(env.DB, now, policy);
  for (const claim of await pendingScheduleClaims(env.DB)) {
    const workflowId = `slot-${claim.local_date}-${claim.slot.replace(':', '')}`;
    try {
      await env.EDITORIAL_WORKFLOW.create({ id: workflowId, params: { slot_claim_id: claim.id } satisfies WorkflowParams });
      await markScheduleDispatched(env.DB, claim.id, workflowId, now);
    } catch {
      try {
        await env.EDITORIAL_WORKFLOW.get(workflowId);
        await markScheduleDispatched(env.DB, claim.id, workflowId, now);
      } catch { /* Keep the durable claim pending for a later cron readback. */ }
    }
  }
}
