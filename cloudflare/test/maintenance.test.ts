import { describe, expect, it } from 'vitest';
import { applyProtectedFields, invalidatedByWithdrawal, planMaintenance, recordCorrection, type PublicContentItem } from '../src/editorial/maintenance.js';
import type { ContentProposal, PublicSource } from '../src/editorial/contracts.js';

const source: PublicSource = { url: 'https://example.com/release', title: 'Release note', retrieved_at: '2026-11-26T00:00:00Z', source_date: '2026-11-25T00:00:00Z', content_sha256: 'a'.repeat(64) };
const item: PublicContentItem = { id: 'markets', url: '/work/markets/', source_urls: [source.url], source_revisions: [source.content_sha256], dependencies: ['market-context'], protected_fields: ['career', 'beliefs'], publication_date: '2020-01-02', body: '---\npublished_on: "2020-01-02"\nauthor_name: "Suleman"\ncareer: "Engineer"\npermalink: "/work/markets/"\n---\nBody' };
function proposal(content: string, publicUrl = item.url): ContentProposal {
  return { candidate_id: 'c1', author_run_id: 'author-1', content_digest: 'a'.repeat(64), source_digest: 'b'.repeat(64), policy_revision: 'p1', knowledge_revision: 'k1', base_commit: 'c'.repeat(40), owner_epoch: 1,
    files: [{ path: 'notes/market-update.md', operation: 'update', encoding: 'utf-8', content, content_sha256: 'd'.repeat(64) }], public_sources: [source], required_media_paths: [], public_urls: [publicUrl], expected_content: [] };
}

describe('bounded editorial maintenance', () => {
  it('keeps a repeated source summary at NO_CHANGE', () => {
    expect(planMaintenance({ id: 'event', kind: 'source-change', target_id: item.id, evidence: [source], occurred_at: '2026-11-26T00:00:00Z' }, item).action).toBe('NO_CHANGE');
  });

  it('routes a market cue that changes personal beliefs to owner review', () => {
    expect(planMaintenance({ id: 'event', kind: 'source-change', target_id: item.id, evidence: [source], occurred_at: '2026-11-26T00:00:00Z', proposed_protected_fields: ['beliefs'] }, item))
      .toMatchObject({ action: 'NEEDS_OWNER', protected_fields: ['beliefs'] });
  });

  it('rejects a refresh that changes the original publication date or authored identity', () => {
    const content = item.body.replace('2020-01-02', '2026-11-26').replace('Engineer', 'Investor');
    expect(applyProtectedFields(item, proposal(content))).toMatchObject({ allowed: false, protected_fields: ['career', 'publication_date'] });
  });

  it('invalidates dependent items after a knowledge withdrawal', () => {
    expect(invalidatedByWithdrawal(item, ['market-context'])).toBe(true);
    expect(invalidatedByWithdrawal(item, ['other-subject'])).toBe(false);
  });

  it('stores corrections with only their declared, deduplicated scope', async () => {
    let written: unknown;
    const receipt = await recordCorrection({ id: 'corr-1', source_episode: 'episode-1', original_instruction: 'Correct this dated claim.', scope: ['markets', 'markets'], affected_behavior: 'Refresh only the cited claim.', regression_reference: 'maintenance.test.ts:scoped correction', recorded_at: '2026-11-26T00:00:00Z' }, {
      async put(value) { written = value; return { id: value.id, revision: 'r1', stored_at: value.recorded_at }; },
    });
    expect((written as { scope: string[] }).scope).toEqual(['markets']);
    expect(receipt.revision).toBe('r1');
  });
});
