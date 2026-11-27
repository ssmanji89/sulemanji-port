import { beforeEach, describe, expect, it } from 'vitest';
import { getPublicKnowledge, ingestKnowledge } from '../src/editorial/knowledge.js';
import type { EditorialEnv, KnowledgeEnvelope, PublicKnowledge } from '../src/editorial/contracts.js';

const NOW = new Date('2026-11-26T18:00:00.000Z');
const KEY = new Uint8Array(32).fill(17);
const KEY_ID = 'staging-key-1';
const POLICY = 'site-knowledge-v1';

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
}

async function digest(value: unknown): Promise<string> {
  const result = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value === null ? 'null' : canonical(value))));
  return [...result].map((b) => b.toString(16).padStart(2, '0')).join('');
}

class MemoryD1 {
  rows = new Map<string, Record<string, unknown>>();
  prepare(sql: string) {
    let values: unknown[] = [];
    return {
      bind: (...args: unknown[]) => { values = args; return this.prepareBound(sql, () => values); },
    };
  }
  private prepareBound(sql: string, values: () => unknown[]) {
    return {
      first: async <T>() => {
        const args = values();
        if (sql.includes('WHERE derivative_id = ?')) {
          const row = this.rows.get(String(args[0]));
          if (!row) return null;
          return (sql.includes('SELECT subject_id') ? { subject_id: row.subject_id } : row) as T;
        }
        if (sql.includes('WHERE subject_id = ?')) {
          const [subjectId, expiry] = args as [string, string];
          const row = [...this.rows.values()].filter((item) => item.subject_id === subjectId && item.action === 'UPSERT' && String(item.expires_at) > expiry)
            .sort((a, b) => Number(b.sequence) - Number(a.sequence))[0];
          return (row ? { payload_json: row.payload_json } : null) as T | null;
        }
        return null;
      },
      run: async () => {
        const args = values();
        if (!sql.includes('INSERT INTO public_knowledge')) return { meta: { changes: 0 } };
        const [derivativeId, subjectId, revision, sequence, action, payloadSha, policyRevision, issuedAt, expiresAt, payloadJson, updatedAt] = args;
        const old = this.rows.get(String(derivativeId));
        if (old && Number(sequence) <= Number(old.sequence)) return { meta: { changes: 0 } };
        this.rows.set(String(derivativeId), { derivative_id: derivativeId, subject_id: subjectId, revision, sequence, action, payload_sha256: payloadSha,
          policy_revision: policyRevision, issued_at: issuedAt, expires_at: expiresAt, payload_json: payloadJson, updated_at: updatedAt });
        return { meta: { changes: 1 } };
      },
    };
  }
}

const payload: PublicKnowledge = {
  subject_id: 'work.viyu',
  summary: 'A sanitized, authorized project summary.',
  allowed_uses: ['context', 'public-explanation'],
  public_sources: [{ url: 'https://example.com/project', title: 'Project', retrieved_at: '2026-11-26T17:00:00.000Z', source_date: null, content_sha256: 'a'.repeat(64) }],
  authored_fields: ['summary'],
};

const db = new MemoryD1();
const env = {
  DB: db as unknown as D1Database,
  EDITORIAL_WORKFLOW: {} as Workflow,
  DEPLOYMENT_ENV: 'staging',
  KNOWLEDGE_KEYS_JSON: JSON.stringify({ [KEY_ID]: btoa(String.fromCharCode(...KEY)) }),
  KNOWLEDGE_POLICY_REVISION: POLICY,
} satisfies EditorialEnv;

async function signed(envelope: KnowledgeEnvelope): Promise<{ raw: Uint8Array; signature: string }> {
  const raw = new TextEncoder().encode(JSON.stringify(envelope));
  const key = await crypto.subtle.importKey('raw', KEY, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, raw));
  return { raw, signature: btoa(String.fromCharCode(...signature)) };
}

async function makeEnvelope(overrides: Partial<KnowledgeEnvelope> = {}): Promise<KnowledgeEnvelope> {
  const base: KnowledgeEnvelope = {
    schema_version: 1, derivative_id: 'derivative.project.viyu', revision: 'content-rev-1', sequence: 1, action: 'UPSERT', target: 'sulemanji.com',
    issued_at: '2026-11-26T17:00:00.000Z', expires_at: '2026-11-27T17:00:00.000Z', policy_revision: POLICY,
    payload_sha256: await digest(payload), payload,
  };
  return { ...base, ...overrides };
}

async function importEnvelope(envelope: KnowledgeEnvelope, requestEnv = env) {
  const request = await signed(envelope);
  return ingestKnowledge(request.raw, request.signature, KEY_ID, requestEnv, NOW);
}

describe('signed public knowledge import', () => {
  beforeEach(() => db.rows.clear());
  it('accepts a valid target and returns only a typed receipt', async () => {
    const result = await importEnvelope(await makeEnvelope());
    expect(result).toEqual({ status: 'accepted', derivative_id: 'derivative.project.viyu', sequence: 1 });
    expect(JSON.stringify(result)).not.toContain(payload.subject_id);
  });

  it('rejects invalid signatures before parsing and rejects unknown keys', async () => {
    const request = await signed(await makeEnvelope());
    expect(await ingestKnowledge(request.raw, request.signature, 'missing', env, NOW)).toMatchObject({ status: 'rejected', code: 'AUTH' });
    const changed = new TextEncoder().encode(` ${new TextDecoder().decode(request.raw)}`);
    expect(await ingestKnowledge(changed, request.signature, KEY_ID, env, NOW)).toMatchObject({ status: 'rejected', code: 'AUTH' });
  });

  it('rejects an expired payload and authority longer than one day', async () => {
    expect(await importEnvelope(await makeEnvelope({ expires_at: '2026-11-26T17:59:59.000Z' }))).toMatchObject({ status: 'rejected', code: 'EXPIRED' });
    expect(await importEnvelope(await makeEnvelope({ expires_at: '2026-11-27T18:00:00.000Z' }))).toMatchObject({ status: 'rejected', code: 'EXPIRED' });
  });

  it('rejects target, policy, schema, and canonical payload digest mismatches', async () => {
    expect(await importEnvelope(await makeEnvelope({ target: 'elsewhere.com' as 'sulemanji.com' }))).toMatchObject({ status: 'rejected', code: 'INVALID' });
    expect(await importEnvelope(await makeEnvelope({ policy_revision: 'unapproved' }))).toMatchObject({ status: 'rejected', code: 'INVALID' });
    expect(await importEnvelope(await makeEnvelope({ payload_sha256: '0'.repeat(64) }))).toMatchObject({ status: 'rejected', code: 'INVALID' });
    expect(await importEnvelope(await makeEnvelope({ payload: { ...payload, unexpected: true } as PublicKnowledge }))).toMatchObject({ status: 'rejected', code: 'INVALID' });
  });

  it.each(['project.status', 'summary.details', 'authored_fields', 'unknown'])('rejects non-contract authored field %s', async (field) => {
    const invalidPayload = { ...payload, authored_fields: [field] };
    const result = await importEnvelope(await makeEnvelope({ payload: invalidPayload, payload_sha256: await digest(invalidPayload) }));
    expect(result).toMatchObject({ status: 'rejected', code: 'INVALID' });
    expect(db.rows.size).toBe(0);
  });

  it.each(['https://localhost/private', 'https://localhost./private', 'https://printer/private',
    'https://api.local/private', 'https://127.0.0.1/private',
    'https://0177.0.0.1/private', 'https://１２７.０.０.１/private', 'https://0x7f.０.０.１/private',
    'https://10.0.0.4/private', 'https://100.64.0.1/private',
    'https://192.0.2.1/private', 'https://192.168.1.2/private', 'https://@example.org/private', 'https://[::1]/private',
    'https://[fd12::1]/private', 'https://[fe80::1]/private', 'https://[ff02::1]/private',
    'https://[2001:db8::1]/private', 'https://[2001:2::1]/private', 'https://[2001:4::1]/private',
    'https://[2001:40::1]/private',
    'https://[2002:0a00:0001::1]/private', 'https://[3fff::1]/private',
    'https://[::ffff:10.0.0.1]/private'])('rejects non-public source address %s', async (url) => {
    const invalidPayload = { ...payload, public_sources: [{ ...payload.public_sources[0], url }] };
    const result = await importEnvelope(await makeEnvelope({ payload: invalidPayload, payload_sha256: await digest(invalidPayload) }));
    expect(result).toMatchObject({ status: 'rejected', code: 'INVALID' });
    expect(db.rows.size).toBe(0);
  });

  it.each(['https://[2001:1::1]/public', 'https://[2001:3::1]/public',
    'https://[2001:4:112::1]/public', 'https://[2001:20::1]/public', 'https://[2001:21::1]/public',
    'https://[2001:2f:ffff::1]/public', 'https://[2001:20:1000::1]/public',
    'https://[2001:30:1000::1]/public', 'https://[2001:3f:ffff::1]/public'])('accepts globally reachable IPv6 exception %s', async (url) => {
    const validPayload = { ...payload, public_sources: [{ ...payload.public_sources[0], url }] };
    const result = await importEnvelope(await makeEnvelope({ payload: validPayload, payload_sha256: await digest(validPayload) }));
    expect(result).toMatchObject({ status: 'accepted' });
    expect(db.rows.size).toBe(1);
  });

  it('rejects empty source lists, duplicate authored fields, and NUL text', async () => {
    for (const invalidPayload of [
      { ...payload, public_sources: [] },
      { ...payload, authored_fields: ['summary', 'summary'] },
      { ...payload, summary: 'Public summary.\0hidden' },
    ]) {
      const result = await importEnvelope(await makeEnvelope({ payload: invalidPayload, payload_sha256: await digest(invalidPayload) }));
      expect(result).toMatchObject({ status: 'rejected', code: 'INVALID' });
      expect(db.rows.size).toBe(0);
    }
  });

  it('rejects year zero and malformed Unicode in public text', async () => {
    const invalidPayloads = [
      { ...payload, public_sources: [{ ...payload.public_sources[0], retrieved_at: '0000-01-01T00:00:00.000Z' }] },
      { ...payload, summary: '\ud800' },
      { ...payload, public_sources: [{ ...payload.public_sources[0], title: '\ud800' }] },
      { ...payload, public_sources: [{ ...payload.public_sources[0], url: 'https://example.org/\ud800' }] },
    ];
    for (const invalidPayload of invalidPayloads) {
      const result = await importEnvelope(await makeEnvelope({ payload: invalidPayload, payload_sha256: await digest(invalidPayload) }));
      expect(result).toMatchObject({ status: 'rejected', code: 'INVALID' });
      expect(db.rows.size).toBe(0);
    }
  });

  it('counts supplementary Unicode code points for bounded fields', async () => {
    const validPayload = { ...payload, summary: '😀'.repeat(20_000), public_sources: [{
      ...payload.public_sources[0], title: '😀'.repeat(300),
    }] };
    const result = await importEnvelope(await makeEnvelope({
      revision: '😀'.repeat(256), payload: validPayload, payload_sha256: await digest(validPayload),
    }));
    expect(result).toMatchObject({ status: 'accepted', sequence: 1 });
  });

  it('rejects oversize requests without touching D1', async () => {
    const result = await ingestKnowledge(new Uint8Array(1_048_577), '', '', env, NOW);
    expect(result).toMatchObject({ status: 'rejected', code: 'INVALID' });
    expect(db.rows.size).toBe(0);
  });

  it('makes an exact replay a no-op duplicate', async () => {
    const envelope = await makeEnvelope({ sequence: 2 });
    expect(await importEnvelope(envelope)).toMatchObject({ status: 'accepted', sequence: 2 });
    expect(await importEnvelope(envelope)).toMatchObject({ status: 'duplicate', sequence: 2 });
  });

  it('preserves withdrawal tombstones over delayed upserts and removes retrieval eligibility', async () => {
    const withdrawal: KnowledgeEnvelope = { ...(await makeEnvelope({ sequence: 3, revision: 'content-rev-3', action: 'WITHDRAW', payload: null, payload_sha256: await digest(null) })) };
    expect(await importEnvelope(withdrawal)).toMatchObject({ status: 'withdrawn', sequence: 3 });
    const delayed = await makeEnvelope({ sequence: 2, revision: 'content-rev-2' });
    expect(await importEnvelope(delayed)).toMatchObject({ status: 'rejected', code: 'STALE' });
    expect(await getPublicKnowledge(payload.subject_id, db as unknown as D1Database, NOW)).toBeNull();
  });

  it('rejects a conflicting payload at one sequence and accepts a fresh renewal revision', async () => {
    const first = await makeEnvelope({ sequence: 8 });
    expect(await importEnvelope(first)).toMatchObject({ status: 'accepted' });
    const conflictPayload = { ...payload, summary: 'Different summary.' };
    const conflict = await makeEnvelope({ sequence: 8, payload: conflictPayload, payload_sha256: await digest(conflictPayload) });
    expect(await importEnvelope(conflict)).toMatchObject({ status: 'rejected', code: 'CONFLICT' });
    const renewal = await makeEnvelope({ sequence: 9, issued_at: '2026-11-26T17:30:00.000Z', expires_at: '2026-11-27T17:30:00.000Z' });
    expect(await importEnvelope(renewal)).toMatchObject({ status: 'accepted', sequence: 9 });
  });
});
