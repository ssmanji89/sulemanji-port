import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
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

function controlSqlite() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0002_editorial_operations.sql', import.meta.url), 'utf8'));
  const db = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      let bindings: SQLInputValue[] = [];
      const execute = () => ({ meta: { changes: Number(statement.run(...bindings).changes) } });
      return {
        bind(...args: SQLInputValue[]) { bindings = args; return this; },
        async run() { return execute(); },
        async first() { return statement.get(...bindings) ?? null; },
        execute,
      };
    },
    async batch(statements: Array<{ execute(): unknown }>) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map((statement) => statement.execute());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as D1Database;
  const control = () => sqlite.prepare('SELECT paused, owner_epoch FROM editorial_control').get();
  const receipts = () => sqlite.prepare("SELECT id, result_json FROM editorial_receipts WHERE action='RESUME'").all();
  return { sqlite, db, control, receipts };
}

const cutoverTime = new Date('2026-11-28T10:05:00.000Z');
const freshResume = {
  action: 'resume', expected_owner_epoch: 1, retirement_proof_sha256: 'a'.repeat(64),
  verified_at: '2026-11-28T10:00:00.000Z',
};

async function signForOperator(db: D1Database, mode: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return async (body: Record<string, unknown>) => {
    const raw = new TextEncoder().encode(JSON.stringify(body));
    const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, raw));
    return operatorRequest(raw, 'owner', b64(signature), {
      DB: db, DEPLOYMENT_ENV: mode, EDITORIAL_OPERATOR_KEYS_JSON: JSON.stringify({ owner: b64(bytes) }),
    } as never, cutoverTime);
  };
}

describe('production publisher transfer', () => {
  it.each([
    ['bare resume', { action: 'resume' }],
    ['expired retirement observation', { ...freshResume, verified_at: '2026-11-28T09:00:00.000Z' }],
    ['future retirement observation', { ...freshResume, verified_at: '2026-11-28T10:06:00.000Z' }],
  ])('keeps production paused with %s', async (_case, body) => {
    const fixture = controlSqlite();
    try {
      const command = await signForOperator(fixture.db, 'production');
      expect((await command(body)).status).toBe(400);
      expect(fixture.control()).toEqual({ paused: 1, owner_epoch: 1 });
      expect(fixture.receipts()).toHaveLength(0);
    } finally { fixture.sqlite.close(); }
  });

  it('admits the bound epoch once and keeps a fresh pause after a stale retry', async () => {
    const fixture = controlSqlite();
    try {
      const command = await signForOperator(fixture.db, 'production');
      const responses = await Promise.all([command(freshResume), command(freshResume)]);
      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      const success = responses.find((response) => response.status === 200)!;
      const accepted = await success.json() as { receipt_id: string };
      expect(accepted).toMatchObject({ paused: false, owner_epoch: 2, status: 'complete' });
      expect(fixture.control()).toEqual({ paused: 0, owner_epoch: 2 });
      const receipts = fixture.receipts();
      expect(receipts).toHaveLength(1);
      expect(receipts[0].id).toBe(accepted.receipt_id);
      expect(JSON.parse(receipts[0].result_json as string)).toMatchObject({
        owner_epoch: 2, previous_owner_epoch: 1, retirement_proof_sha256: freshResume.retirement_proof_sha256,
      });
      expect((await command({ action: 'pause' })).status).toBe(200);
      expect((await command(freshResume)).status).toBe(409);
      expect(fixture.control()).toEqual({ paused: 1, owner_epoch: 3 });
      expect(fixture.receipts()).toHaveLength(1);
    } finally { fixture.sqlite.close(); }
  });

  it('keeps production paused when the resume receipt cannot be recorded', async () => {
    const fixture = controlSqlite();
    try {
      fixture.sqlite.exec(`CREATE TRIGGER fail_resume_receipt BEFORE INSERT ON editorial_receipts
        WHEN NEW.action = 'RESUME' BEGIN SELECT RAISE(ABORT, 'fixture unavailable'); END`);
      const command = await signForOperator(fixture.db, 'production');
      expect((await command(freshResume)).status).toBe(503);
      expect(fixture.control()).toEqual({ paused: 1, owner_epoch: 1 });
      expect(fixture.receipts()).toHaveLength(0);
    } finally { fixture.sqlite.close(); }
  });

  it('keeps the staging resume path and rejects an unspecified environment', async () => {
    const fixture = controlSqlite();
    try {
      const unknown = await signForOperator(fixture.db, 'runtime');
      expect((await unknown({ action: 'resume' })).status).toBe(400);
      const staging = await signForOperator(fixture.db, 'staging');
      expect((await staging({ action: 'resume' })).status).toBe(200);
      expect(fixture.control()).toEqual({ paused: 0, owner_epoch: 2 });
    } finally { fixture.sqlite.close(); }
  });
});
