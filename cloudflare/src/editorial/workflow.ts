import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import type { EditorialEnv } from './contracts.js';
import { runEditorialAdmission } from './workflow-core.js';
import type { WorkflowParams, WorkflowResult } from './workflow-types.js';
export type { WorkflowParams, WorkflowResult } from './workflow-types.js';
export type WorkflowEnv = EditorialEnv & { EDITORIAL_POLICY_JSON: string };

export class EditorialWorkflow extends WorkflowEntrypoint<WorkflowEnv, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep): Promise<WorkflowResult> {
    return runEditorialAdmission(event.payload, this.env, step);
  }
}
