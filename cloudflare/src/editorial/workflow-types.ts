export type WorkflowParams = { slot_claim_id: string };
export type WorkflowResult = { status: 'held' | 'admitted'; reason: string; slot_claim_id: string };
