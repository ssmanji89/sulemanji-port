import { describe, expect, it } from 'vitest';
import { operatorRequest } from '../src/editorial/operator.js';

function b64(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)); }

describe('authenticated correction operation', () => {
  it('persists a scoped correction and returns a durable receipt', async () => {
    const rows = new Map<string, Record<string, string>>();
    const receipts: Array<{ action: string; candidate: string; result: string }> = [];
    const db = {
      prepare(query: string) {
        let values: unknown[] = [];
        return {
          bind(...args: unknown[]) { values = args; return this; },
          async run() {
            if (query.startsWith('INSERT OR IGNORE INTO editorial_corrections')) {
              const [id, sourceEpisode, originalInstruction, scopeJson, affectedBehavior, regressionReference, revision, recordedAt, storedAt] = values as string[];
              if (!rows.has(id)) rows.set(id, { id, source_episode: sourceEpisode, original_instruction: originalInstruction, scope_json: scopeJson,
                affected_behavior: affectedBehavior, regression_reference: regressionReference, revision, recorded_at: recordedAt, stored_at: storedAt });
            } else if (query.startsWith('SELECT revision, stored_at FROM editorial_corrections')) return { meta: { changes: 0 } };
            else if (query.startsWith('INSERT INTO editorial_receipts')) receipts.push({ action: values[2] as string, candidate: values[1] as string, result: values[3] as string });
            return { meta: { changes: 1 } };
          },
          async first<T>() { return (rows.get(values[0] as string) ?? null) as T | null; },
        };
      },
    } as unknown as D1Database;
    const key = crypto.getRandomValues(new Uint8Array(32));
    const raw = new TextEncoder().encode(JSON.stringify({ action: 'record_correction', id: 'corr-1', source_episode: 'episode-1',
      original_instruction: 'Correct one dated claim.', scope: ['markets', 'markets'], affected_behavior: 'Refresh only that claim.',
      regression_reference: 'maintenance.test.ts:scoped', recorded_at: '2026-11-26T00:00:00Z' }));
    const imported = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = new Uint8Array(await crypto.subtle.sign('HMAC', imported, raw));
    const response = await operatorRequest(raw, 'owner-1', b64(signature), { DB: db, EDITORIAL_OPERATOR_KEYS_JSON: JSON.stringify({ 'owner-1': b64(key) }) } as never);
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ action: 'record_correction', status: 'complete' });
    expect((body.revision as string)).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.parse(rows.get('corr-1')!.scope_json)).toEqual(['markets']);
    expect(receipts).toHaveLength(1);
    expect(receipts[0].action).toBe('RECORD_CORRECTION');
  });
});
