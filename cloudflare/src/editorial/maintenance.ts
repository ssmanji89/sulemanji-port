import type { ContentProposal, PublicSource } from './contracts.js';

export type MaintenanceEvent = {
  id: string;
  kind: 'source-change' | 'broken-link' | 'correction' | 'withdrawal';
  target_id: string;
  evidence: PublicSource[];
  occurred_at: string;
  proposed_protected_fields?: string[];
};
export type PublicContentItem = {
  id: string;
  url: string;
  source_urls: string[];
  source_revisions: string[];
  dependencies: string[];
  protected_fields: string[];
  publication_date: string;
  body: string;
};
export type MaintenanceDecision =
  | { action: 'NO_CHANGE'; reason: string }
  | { action: 'REPAIR' | 'REFRESH' | 'CONNECT'; target_id: string; reason: string }
  | { action: 'NEEDS_OWNER'; target_id: string; reason: string; protected_fields: string[] };
export type ProtectedFieldResult = { allowed: true; proposal: ContentProposal } | { allowed: false; protected_fields: string[] };
export type ScopedCorrection = {
  id: string; source_episode: string; original_instruction: string; scope: string[]; affected_behavior: string; regression_reference: string; recorded_at: string;
};
export type CorrectionReceipt = { id: string; revision: string; stored_at: string };
export interface CorrectionStore { put(correction: ScopedCorrection): Promise<CorrectionReceipt> }

export function planMaintenance(event: MaintenanceEvent, item: PublicContentItem): MaintenanceDecision {
  if (!event.id || event.target_id !== item.id || !Number.isFinite(Date.parse(event.occurred_at))) return { action: 'NO_CHANGE', reason: 'Event identity or timestamp does not match the public item.' };
  const protectedFields = [...new Set(event.proposed_protected_fields ?? [])].filter((field) => item.protected_fields.includes(field)).sort();
  if (protectedFields.length) return { action: 'NEEDS_OWNER', target_id: item.id, reason: 'The proposal changes authored identity or a protected commitment.', protected_fields: protectedFields };
  if (event.kind === 'withdrawal') return { action: 'REFRESH', target_id: item.id, reason: 'Withdrawn knowledge requires dependent public claims to be checked and removed or re-sourced.' };
  if (!event.evidence.length) return { action: 'NO_CHANGE', reason: 'No public evidence is available to justify maintenance.' };
  const current = new Set(item.source_urls);
  const newSources = event.evidence.filter((source) => !current.has(source.url));
  if (event.kind === 'broken-link') return { action: 'REPAIR', target_id: item.id, reason: 'A public reference needs a link repair.' };
  if (event.kind === 'correction') return { action: 'REFRESH', target_id: item.id, reason: 'A scoped factual correction needs review against the affected public claims.' };
  if (newSources.length === 0 || event.evidence.every((source) => item.source_revisions.includes(source.content_sha256))) {
    return { action: 'NO_CHANGE', reason: 'The source episode is already represented by this item.' };
  }
  if (/\b(i|we)\s+(tested|used|saw|heard|experienced|believe|remember)\b/i.test(event.evidence.map((source) => source.title).join(' '))) {
    return { action: 'NO_CHANGE', reason: 'Public source material cannot establish firsthand experience or personal belief.' };
  }
  return { action: 'REFRESH', target_id: item.id, reason: 'A changed public source may affect this item and requires a bounded factual review.' };
}

const PROTECTED_FRONTMATTER = ['author', 'author_name', 'career', 'employment', 'featured', 'identity', 'commitments', 'publication_date', 'published_on'];
function frontMatter(content: string): Map<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const fields = new Map<string, string>();
  for (const line of (match?.[1] ?? '').split(/\r?\n/)) {
    const field = line.match(/^([a-z][a-z0-9_-]*):\s*(.*)$/i);
    if (field) fields.set(field[1], field[2]);
  }
  return fields;
}

export function applyProtectedFields(before: PublicContentItem, proposal: ContentProposal): ProtectedFieldResult {
  const protectedFields = new Set([...before.protected_fields, ...PROTECTED_FRONTMATTER]);
  const rejected = new Set<string>();
  for (const file of proposal.files) {
    if (file.operation !== 'update') continue;
    const old = frontMatter(before.body);
    const next = frontMatter(file.content);
    for (const field of protectedFields) {
      if (old.has(field) && old.get(field) !== next.get(field)) rejected.add(field === 'published_on' ? 'publication_date' : field);
    }
    if (before.publication_date && old.has('published_on') && old.get('published_on') !== next.get('published_on')) rejected.add('publication_date');
    if (before.url && !proposal.public_urls.includes(before.url)) rejected.add('permalink');
  }
  return rejected.size ? { allowed: false, protected_fields: [...rejected].sort() } : { allowed: true, proposal };
}

export async function recordCorrection(correction: ScopedCorrection, store: CorrectionStore): Promise<CorrectionReceipt> {
  const scope = [...new Set(correction.scope)].sort();
  if (!correction.id || !correction.source_episode || !correction.original_instruction.trim() || !scope.length ||
      !correction.affected_behavior.trim() || !correction.regression_reference.trim() || !Number.isFinite(Date.parse(correction.recorded_at))) {
    throw new Error('SCOPED_CORRECTION_INVALID');
  }
  const saved = await store.put({ ...correction, scope });
  if (saved.id !== correction.id || !saved.revision || !saved.stored_at) throw new Error('SCOPED_CORRECTION_READBACK_INVALID');
  return saved;
}

export function invalidatedByWithdrawal(item: PublicContentItem, withdrawnSubjectIds: string[]): boolean {
  const withdrawn = new Set(withdrawnSubjectIds);
  return item.dependencies.some((dependency) => withdrawn.has(dependency));
}
