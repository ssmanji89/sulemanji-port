import type { CatalogItem, PublicKnowledge } from './contracts.js';
import { isRecycledKnowledge } from './evidence-origin.js';
import { fingerprintPublicKnowledge, parsePublicKnowledge } from './knowledge.js';
import type { KnowledgeFence } from './state.js';

const LIMIT = 100;
type KnowledgeRow = { subject_id: string; payload_json: string; derivative_id: string };

async function readProjection(db: D1Database, now: Date, catalog: CatalogItem[], policyRevision?: string) {
  const items: PublicKnowledge[] = [];
  let afterSubject = '';
  const derivatives: string[] = [];
  if (!policyRevision) return { items, derivatives };
  while (items.length < LIMIT) {
    const batch = await db.prepare(`SELECT subject_id, payload_json, derivative_id FROM (
        SELECT subject_id, payload_json, derivative_id,
          ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY sequence DESC, derivative_id) AS position
        FROM public_knowledge WHERE policy_revision = ? AND action = 'UPSERT' AND expires_at > ? AND subject_id > ?
      ) WHERE position = 1 ORDER BY subject_id LIMIT ?`)
      .bind(policyRevision, now.toISOString(), afterSubject, LIMIT).all<KnowledgeRow>();
    const rows = batch.results ?? [];
    for (const row of rows) {
      // An excluded winner can reveal an older record for its subject when it expires.
      derivatives.push(row.derivative_id);
      const knowledge = parsePublicKnowledge(row.payload_json);
      if (!knowledge || isRecycledKnowledge(knowledge, catalog)) continue;
      items.push(knowledge);
      if (items.length === LIMIT) return { items, derivatives };
    }
    if (rows.length < LIMIT) break;
    afterSubject = rows[rows.length - 1].subject_id;
  }
  return { items, derivatives };
}

export async function readKnowledge(db: D1Database, now: Date, catalog: CatalogItem[], policyRevision?: string): Promise<PublicKnowledge[]> {
  return (await readProjection(db, now, catalog, policyRevision)).items;
}

export async function captureKnowledgeAuthority(db: D1Database, ownerEpoch: number, now: Date, catalog: CatalogItem[],
  policyRevision?: string): Promise<{ fence: KnowledgeFence; revision: string } | null> {
  // The eventual dispatch tests this generation and epoch in one D1 statement.
  // Any mutation across the paged reads or hashing invalidates the result.
  const state = await db.prepare('SELECT knowledge_generation FROM editorial_control WHERE singleton = 1 AND paused = 0 AND owner_epoch = ?')
    .bind(ownerEpoch).first<{ knowledge_generation: number }>();
  if (!state || !Number.isSafeInteger(state.knowledge_generation) || state.knowledge_generation < 0) return null;
  const { items, derivatives } = await readProjection(db, now, catalog, policyRevision);
  return { fence: { generation: state.knowledge_generation, derivatives },
    revision: await fingerprintPublicKnowledge(items, policyRevision) };
}
