import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { runEditorialAdmission } from './workflow-core.js';
import { createEditorialCandidateProcessor, type EditorialRuntimeEnv } from './runtime.js';
import type { WorkflowParams, WorkflowResult } from './workflow-types.js';
export type { WorkflowParams, WorkflowResult } from './workflow-types.js';
export type WorkflowEnv = EditorialRuntimeEnv;

export class EditorialWorkflow extends WorkflowEntrypoint<WorkflowEnv, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep): Promise<WorkflowResult> {
    const processor = createEditorialCandidateProcessor(this.env);
    return runEditorialAdmission(event.payload, this.env, step, processor ?? undefined);
  }
}
