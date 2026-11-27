import cardModule from '@resvg/resvg-wasm/index_bg.wasm';
import cardFont from '../../../scripts/fonts/DejaVuSans-Bold.ttf';
import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { createSocialCardRenderer } from './social-card-renderer.js';
import { runEditorialAdmission } from './workflow-core.js';
import { createEditorialCandidateProcessor, type EditorialRuntimeEnv } from './runtime.js';
import type { WorkflowParams, WorkflowResult } from './workflow-types.js';
export type { WorkflowParams, WorkflowResult } from './workflow-types.js';
export type WorkflowEnv = EditorialRuntimeEnv;

const renderSocialCard = createSocialCardRenderer(cardModule, new Uint8Array(cardFont));

export class EditorialWorkflow extends WorkflowEntrypoint<WorkflowEnv, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep): Promise<WorkflowResult> {
    const processor = createEditorialCandidateProcessor(this.env, renderSocialCard);
    return runEditorialAdmission(event.payload, this.env, step, processor ?? undefined);
  }
}
