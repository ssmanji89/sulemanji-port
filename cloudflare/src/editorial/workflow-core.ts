import type { EditorialEnv } from './contracts.js';
import { readControl } from './state.js';
import type { WorkflowParams, WorkflowResult } from './workflow-types.js';

type DurableStep = { do<T>(name: string, callback: () => Promise<T> | T): Promise<T> };

export async function runEditorialAdmission(params: WorkflowParams, env: EditorialEnv, step: DurableStep): Promise<WorkflowResult> {
  const control = await step.do('read-editorial-control', () => readControl(env.DB));
  if (control.paused) return { status: 'held', reason: 'Editorial publishing is paused.', slot_claim_id: params.slot_claim_id };
  return step.do('record-held-unconfigured-pipeline', async () => {
    await env.DB.prepare(`INSERT OR IGNORE INTO editorial_receipts(id, candidate_id, action, result_json, created_at)
      VALUES (?, ?, 'HELD_PIPELINE_UNCONFIGURED', ?, ?)`)
      .bind(`slot-held:${params.slot_claim_id}`, params.slot_claim_id, JSON.stringify({ owner_epoch: control.owner_epoch, reason: 'discovery-review-publication-readback pipeline is not configured' }), new Date().toISOString()).run();
    return { status: 'held', reason: 'Discovery, independent review, publication, and public readback are not configured; this slot did not run.', slot_claim_id: params.slot_claim_id };
  });
}
