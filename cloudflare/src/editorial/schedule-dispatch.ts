import type { EditorialEnv } from './contracts.js';
import { claimScheduleSlot, markScheduleDispatched, pendingScheduleClaims, parseEditorialPolicy, scheduleWorkflowId } from './scheduler.js';
import { readControl } from './state.js';
import type { WorkflowParams } from './workflow.js';

type ScheduleEnv = EditorialEnv & { EDITORIAL_POLICY_JSON?: string };

export async function dispatchDueSlot(now: Date, env: ScheduleEnv): Promise<void> {
  const control = await readControl(env.DB);
  if (control.paused) return;
  const policy = parseEditorialPolicy(env.EDITORIAL_POLICY_JSON);
  if (!policy) throw new Error('EDITORIAL_POLICY_JSON_MISSING_OR_INVALID');
  await claimScheduleSlot(env.DB, now, policy, control.owner_epoch);
  for (const claim of await pendingScheduleClaims(env.DB, control.owner_epoch)) {
    const workflowId = scheduleWorkflowId(claim);
    try {
      await env.EDITORIAL_WORKFLOW.create({ id: workflowId, params: { slot_claim_id: claim.id } satisfies WorkflowParams });
      await markScheduleDispatched(env.DB, claim.id, workflowId, control.owner_epoch, now);
    } catch {
      try {
        await env.EDITORIAL_WORKFLOW.get(workflowId);
        await markScheduleDispatched(env.DB, claim.id, workflowId, control.owner_epoch, now);
      } catch { /* Keep the durable claim pending for a later cron readback. */ }
    }
  }
}
