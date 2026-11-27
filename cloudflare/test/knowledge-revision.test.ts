import { describe, expect, it } from 'vitest';
import { fingerprintPublicKnowledge } from '../src/editorial/knowledge.js';
import type { PublicKnowledge } from '../src/editorial/contracts.js';

const knowledge: PublicKnowledge = {
  subject_id: 'career-context', summary: 'A sanitized public context summary.', allowed_uses: ['context', 'factual-update'],
  public_sources: [
    { url: 'https://source.example.test/2', title: 'Source 2', retrieved_at: '2026-11-27T12:00:00.000Z', source_date: null, content_sha256: 'b'.repeat(64) },
    { url: 'https://source.example.test/1', title: 'Source 1', retrieved_at: '2026-11-27T12:00:00.000Z', source_date: null, content_sha256: 'a'.repeat(64) },
  ],
  authored_fields: ['skills', 'experience'],
};

describe('authorized public-knowledge revision fingerprint', () => {
  it('is stable across set ordering and changes when sanitized content changes', async () => {
    const revision = await fingerprintPublicKnowledge([knowledge]);
    const reordered = await fingerprintPublicKnowledge([{ ...knowledge, allowed_uses: [...knowledge.allowed_uses].reverse(),
      public_sources: [...knowledge.public_sources].reverse(), authored_fields: [...knowledge.authored_fields].reverse() }]);
    const changed = await fingerprintPublicKnowledge([{ ...knowledge, summary: 'A revised sanitized public context summary.' }]);

    expect(revision).toMatch(/^[0-9a-f]{64}$/);
    expect(reordered).toBe(revision);
    expect(changed).not.toBe(revision);
  });
});
