import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { fingerprintPublicKnowledge, getPublicKnowledge, ingestKnowledge } from '../src/editorial/knowledge.js';
import { independentKnowledge } from '../src/editorial/evidence-origin.js';
import { captureKnowledgeAuthority, readKnowledge } from '../src/editorial/knowledge-authority.js';
import { BudgetedModelGateway, type ModelConfig, type ModelRequest } from '../src/editorial/models.js';
import { readKnowledgeFence } from '../src/editorial/state.js';
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

class KnowledgeD1Fixture {
  private readonly database = new DatabaseSync(':memory:');
  beforeWrite?: () => Promise<void>;
  beforeRead?: (sql: string) => void;

  constructor() {
    this.database.exec(readFileSync(new URL('../migrations/0001_editorial.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0002_editorial_operations.sql', import.meta.url), 'utf8'));
    this.database.exec(readFileSync(new URL('../migrations/0008_editorial_knowledge_authority.sql', import.meta.url), 'utf8'));
  }

  clear() {
    this.beforeWrite = undefined;
    this.beforeRead = undefined;
    this.database.exec('DELETE FROM public_knowledge; DELETE FROM usage_reservations; DELETE FROM editorial_candidates; UPDATE editorial_control SET paused = 1, owner_epoch = 1');
  }

  count() {
    return this.database.prepare('SELECT count(*) AS total FROM public_knowledge').get()?.total;
  }

  exec(sql: string) { this.database.exec(sql); }

  prepare(sql: string) {
    const statement = this.database.prepare(sql);
    const bound = (...args: SQLInputValue[]) => ({
        first: async <T>() => { this.beforeRead?.(sql); return (statement.get(...args) ?? null) as T | null; },
        all: async <T>() => ({ results: statement.all(...args) as T[] }),
        run: async () => {
          const beforeWrite = this.beforeWrite;
          this.beforeWrite = undefined;
          await beforeWrite?.();
          return { meta: { changes: statement.run(...args).changes } };
        },
    });
    return { ...bound(), bind: bound };
  }
}

const payload: PublicKnowledge = {
  subject_id: 'work.viyu',
  summary: 'A sanitized, authorized project summary.',
  allowed_uses: ['context', 'public-explanation'],
  public_sources: [{ url: 'https://example.com/project', title: 'Project', retrieved_at: '2026-11-26T17:00:00.000Z', source_date: null, content_sha256: 'a'.repeat(64) }],
  authored_fields: ['summary'],
};

const db = new KnowledgeD1Fixture();
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

async function importEnvelope(envelope: KnowledgeEnvelope, requestEnv = env, at = NOW) {
  const request = await signed(envelope);
  return ingestKnowledge(request.raw, request.signature, KEY_ID, requestEnv, at);
}

describe('signed public knowledge import', () => {
  beforeEach(() => db.clear());
  it('accepts a valid target and returns only a typed receipt', async () => {
    const result = await importEnvelope(await makeEnvelope());
    expect(result).toEqual({ status: 'accepted', derivative_id: 'derivative.project.viyu', sequence: 1 });
    expect(JSON.stringify(result)).not.toContain(payload.subject_id);
  });

  it('projects only records signed for the currently selected policy', async () => {
    expect(await importEnvelope(await makeEnvelope())).toMatchObject({ status: 'accepted' });
    expect(await readKnowledge(env.DB, NOW, [], POLICY)).toEqual([payload]);
    expect(await readKnowledge(env.DB, NOW, [], 'replacement-policy')).toEqual([]);
    expect(await fingerprintPublicKnowledge([], POLICY)).not.toBe(await fingerprintPublicKnowledge([], 'replacement-policy'));
  });

  it('expires a projection when a skipped row can expose other authorized knowledge', async () => {
    const at = new Date(Date.now() - 120_000);
    const issued_at = at.toISOString();
    const hiddenUntil = new Date(at.getTime() + 60_000).toISOString();
    expect(await importEnvelope(await makeEnvelope({ issued_at,
      expires_at: new Date(at.getTime() + 3600_000).toISOString() }), env, at)).toMatchObject({ status: 'accepted' });
    const recycled = { ...payload, public_sources: [{ ...payload.public_sources[0], url: 'https://www.sulemanji.com/notes/site-copy' }] };
    expect(await importEnvelope(await makeEnvelope({ issued_at, expires_at: hiddenUntil, derivative_id: 'second-derivative',
      revision: 'copied-data', sequence: 2, payload: recycled, payload_sha256: await digest(recycled) }), env, at))
      .toMatchObject({ status: 'accepted' });
    db.exec('UPDATE editorial_control SET paused = 0');
    const hidden = await captureKnowledgeAuthority(env.DB, 1, at, [], POLICY);
    const visible = await captureKnowledgeAuthority(env.DB, 1, new Date(), [], POLICY);
    expect(hidden?.revision).toBe(await fingerprintPublicKnowledge([], POLICY));
    expect(visible?.revision).toBe(await fingerprintPublicKnowledge([payload], POLICY));
    expect(hidden?.fence.generation).toBe(visible?.fence.generation);
    expect(await readKnowledgeFence(env.DB, 1, hidden!.fence)).toBe(false);
  });

  it('invalidates clearance when a same-content renewal changes the selected derivative', async () => {
    const at = new Date();
    const dates = { issued_at: at.toISOString(), expires_at: new Date(at.getTime() + 60_000).toISOString() };
    const alternate = { ...payload, summary: 'A distinct authorized account for this subject.' };
    expect(await importEnvelope(await makeEnvelope(dates), env, at)).toMatchObject({ status: 'accepted' });
    expect(await importEnvelope(await makeEnvelope({ ...dates, derivative_id: 'alternate-derivative', revision: 'alternate',
      sequence: 2, payload: alternate, payload_sha256: await digest(alternate) }), env, at)).toMatchObject({ status: 'accepted' });
    db.exec('UPDATE editorial_control SET paused = 0');
    const before = await captureKnowledgeAuthority(env.DB, 1, at, [], POLICY);
    expect(before?.revision).toBe(await fingerprintPublicKnowledge([alternate], POLICY));
    expect(await importEnvelope(await makeEnvelope({ ...dates, sequence: 3,
      expires_at: new Date(at.getTime() + 120_000).toISOString() }), env, at)).toMatchObject({ status: 'accepted' });
    const after = await captureKnowledgeAuthority(env.DB, 1, at, [], POLICY);
    expect(after?.revision).toBe(await fingerprintPublicKnowledge([payload], POLICY));
    expect(await readKnowledgeFence(env.DB, 1, before!.fence)).toBe(false);
  });

  it.each(['withdraw-before-admission', 'pause-before-dispatch', 'expire-before-admission', 'withdraw-during-review',
    'withdraw-and-regrant', 'renew-during-review', 'valid-review'] as const)
    ('checks the actual signed snapshot and D1 effect boundary for %s', async (scenario) => {
      const at = new Date(Date.now() - (scenario === 'expire-before-admission' ? 120_000 : 0));
      const times = { issued_at: at.toISOString(), expires_at: new Date(at.getTime() + 60_000).toISOString() };
      expect(await importEnvelope(await makeEnvelope(times), env, at)).toMatchObject({ status: 'accepted' });
      const withdrawal = await makeEnvelope({ ...times, sequence: 2, revision: 'withdrawal', action: 'WITHDRAW',
        payload: null, payload_sha256: await digest(null) });
      const withdraw = async () => {
        expect(await importEnvelope(withdrawal, env, at)).toMatchObject({ status: 'withdrawn' });
      };
      db.exec("UPDATE editorial_control SET paused = 0; INSERT INTO editorial_candidates (id, state, revision, payload_json, updated_at) VALUES ('candidate-a', 'DRAFTED', 'test', '{}', '')");
      const cfg: ModelConfig = { endpoint: 'https://provider.example.test/chat', api_key: 'test', model_id: 'test',
        pricing_revision: 'test', input_usd_per_million: 1, output_usd_per_million: 1, max_input_chars: 4000, max_output_tokens: 500 };
      const expected = await fingerprintPublicKnowledge([payload], POLICY);
      let dispatched = 0;
      const gateway = new BudgetedModelGateway({ async generate(request) {
        dispatched++;
        if (scenario === 'withdraw-during-review' || scenario === 'withdraw-and-regrant') await withdraw();
        if (scenario === 'renew-during-review' || scenario === 'withdraw-and-regrant') {
          const renewal = await makeEnvelope({ ...times, sequence: 3, expires_at: new Date(at.getTime() + 120_000).toISOString() });
          expect(await importEnvelope(renewal, env, at)).toMatchObject({ status: 'accepted' });
        }
        return { run_id: request.run_id, output: { decision: 'CLEAR', findings: [] }, actual_usd: 0.001, provider_request_id: 'test' };
      } }, cfg, {
        db: env.DB, candidate_id: 'candidate-a', owner_epoch: 1, max_model_calls: 6, max_review_rounds: 3,
        limits: { candidate_usd: 0.75, daily_usd: 2, monthly_usd: 30 }, expected_pricing_revision: 'test',
        async captureKnowledgeAuthority() {
          const scoped = await captureKnowledgeAuthority(env.DB, 1, at, [], POLICY);
          expect(scoped?.revision).toBe(expected);
          if (scenario === 'withdraw-before-admission') db.beforeWrite = withdraw;
          if (scenario === 'pause-before-dispatch') db.beforeRead = (sql) => {
            if (!sql.startsWith('SELECT 1 AS authorized')) return;
            db.beforeRead = undefined;
            db.exec('UPDATE editorial_control SET paused = 1, owner_epoch = 2');
          };
          return scoped!.fence;
        },
      });
      const request: ModelRequest = { run_id: 'review-attempt', reservation_id: 'review-attempt', purpose: 'review',
        input: '{}', schema_id: 'review-test', schema: {}, max_output_tokens: 100 };
      const valid = scenario === 'valid-review' || scenario === 'renew-during-review';
      if (valid) {
        await expect(gateway.generate(request)).resolves.toMatchObject({ knowledge_fence: { derivatives: ['derivative.project.viyu'] } });
      } else {
        await expect(gateway.generate(request)).rejects.toThrow('MODEL_KNOWLEDGE_AUTHORITY_CHANGED');
      }
      const sent = valid || scenario === 'withdraw-during-review' || scenario === 'withdraw-and-regrant';
      expect(dispatched).toBe(sent ? 1 : 0);
      const reservation = await env.DB.prepare('SELECT actual_micros FROM usage_reservations WHERE id = ?').bind(request.reservation_id).first();
      expect(reservation).toMatchObject({ actual_micros: sent ? 1000 : 0 });
      const counters = await env.DB.prepare('SELECT model_calls, review_rounds FROM editorial_candidates WHERE id = ?').bind('candidate-a').first();
      const admitted = scenario === 'withdraw-before-admission' || scenario === 'expire-before-admission' ? 0 : 1;
      expect(counters).toMatchObject({ model_calls: admitted, review_rounds: admitted });
    });

  it('keeps the import receipt for a fresh derivative but excludes recycled evidence from model knowledge', async () => {
    const article = { id: 'article', url: '/notes/workflow-guide', title: 'Workflow release guide',
      summary: 'How the current workflow release changes a deployment decision.', topics: ['infrastructure'] };
    const recovered: PublicKnowledge[] = [payload];
    for (const [index, url] of [
      'https://www.sulemanji.com/notes/workflow-guide?utm_source=recall',
      'https://github.com/ssmanji89/sulemanji-port/blob/main/notes/workflow-guide.md',
      'https://api.github.com/repos/ssmanji89/sulemanji-port/contents/notes/workflow-guide.md',
      'https://mirror.example.org/posts/new-id',
    ].entries()) {
      const copied: PublicKnowledge = { ...payload, subject_id: `publication.copy-${index}`,
        summary: article.summary, allowed_uses: ['factual-update'],
        public_sources: [{ ...payload.public_sources[0], url, title: article.title }, payload.public_sources[0]] };
      const envelope = await makeEnvelope({ derivative_id: `new-memory-${index}`, payload: copied, payload_sha256: await digest(copied) });
      await expect(importEnvelope(envelope)).resolves.toMatchObject({ status: 'accepted' });
      const stored = await getPublicKnowledge(copied.subject_id, env.DB, NOW);
      expect(stored).toEqual(copied);
      recovered.push(stored!);
    }
    expect(independentKnowledge(recovered, [article])).toEqual([payload]);
  });

  it('retains the full independent knowledge limit and fingerprint when earlier subjects are recycled', async () => {
    async function store(derivativeId: string, item: PublicKnowledge) {
      const envelope = await makeEnvelope({ derivative_id: derivativeId, payload: item, payload_sha256: await digest(item) });
      await expect(importEnvelope(envelope)).resolves.toMatchObject({ status: 'accepted' });
    }
    for (let index = 0; index < 101; index += 1) {
      const id = `subject-${String(index).padStart(3, '0')}`;
      await store(id, { ...payload, subject_id: id });
    }
    const before = await readKnowledge(env.DB, NOW, [], POLICY);
    expect(before).toHaveLength(100);
    await store('early-recycled-derivative', { ...payload, subject_id: 'earlier-subject',
      public_sources: [{ ...payload.public_sources[0], url: 'https://sulemanji.com/notes/own-work' }] });
    const after = await readKnowledge(env.DB, NOW, [], POLICY);
    expect(after).toEqual(before);
    expect(await fingerprintPublicKnowledge(after)).toBe(await fingerprintPublicKnowledge(before));
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
    expect(db.count()).toBe(0);
  });

  it.each(['https://localhost/private', 'https://localhost./private', 'https://printer/private',
    'https://api.local/private', 'https://127.0.0.1/private',
    'https://0177.0.0.1/private', 'https://１２７.０.０.１/private', 'https://0x7f.０.０.１/private',
    'https://127.0.0.%31/private', 'https://127.0.0.%EF%BC%91/private', 'https://127%2E0%2E0%2E1/private',
    'https://10.0.0.4/private', 'https://100.64.0.1/private',
    'https://192.0.2.1/private', 'https://192.168.1.2/private', 'https://@example.org/private', 'https://[::1]/private',
    'https://192.0.0.8/private', 'https://192.0.0.11/private',
    'https://[fd12::1]/private', 'https://[fe80::1]/private', 'https://[ff02::1]/private',
    'https://[2001:db8::1]/private', 'https://[2001:2::1]/private', 'https://[2001:4::1]/private',
    'https://[2001:40::1]/private',
    'https://[2002:0a00:0001::1]/private', 'https://[3fff::1]/private',
    'https://[::ffff:10.0.0.1]/private'])('rejects non-public source address %s', async (url) => {
    const invalidPayload = { ...payload, public_sources: [{ ...payload.public_sources[0], url }] };
    const result = await importEnvelope(await makeEnvelope({ payload: invalidPayload, payload_sha256: await digest(invalidPayload) }));
    expect(result).toMatchObject({ status: 'rejected', code: 'INVALID' });
    expect(db.count()).toBe(0);
  });

  it.each(['https://192.0.0.9/public', 'https://192.0.0.10/public',
    'https://[2001:1::1]/public', 'https://[2001:3::1]/public',
    'https://[2001:4:112::1]/public', 'https://[2001:20::1]/public', 'https://[2001:21::1]/public',
    'https://[2001:2f:ffff::1]/public', 'https://[2001:20:1000::1]/public',
    'https://[2001:30:1000::1]/public', 'https://[2001:3f:ffff::1]/public'])('accepts producer-global source address %s', async (url) => {
    const validPayload = { ...payload, public_sources: [{ ...payload.public_sources[0], url }] };
    const result = await importEnvelope(await makeEnvelope({ payload: validPayload, payload_sha256: await digest(validPayload) }));
    expect(result).toMatchObject({ status: 'accepted' });
    expect(db.count()).toBe(1);
  });

  it('rejects empty source lists, duplicate authored fields, and NUL text', async () => {
    for (const invalidPayload of [
      { ...payload, public_sources: [] },
      { ...payload, authored_fields: ['summary', 'summary'] },
      { ...payload, summary: 'Public summary.\0hidden' },
    ]) {
      const result = await importEnvelope(await makeEnvelope({ payload: invalidPayload, payload_sha256: await digest(invalidPayload) }));
      expect(result).toMatchObject({ status: 'rejected', code: 'INVALID' });
      expect(db.count()).toBe(0);
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
      expect(db.count()).toBe(0);
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
    expect(db.count()).toBe(0);
  });

  it('keeps the first committed payload for an opaque revision during overlapping writes', async () => {
    expect(await importEnvelope(await makeEnvelope())).toMatchObject({ status: 'accepted', sequence: 1 });
    const original = { ...payload, summary: 'The first authorized revision.' };
    const incoming = { ...payload, summary: 'The second draft has a different summary.' };
    const firstRevision = await makeEnvelope({
      sequence: 2, revision: 'content-rev-2', payload: original, payload_sha256: await digest(original),
    });
    const overlapping = await makeEnvelope({
      sequence: 3, revision: firstRevision.revision, payload: incoming, payload_sha256: await digest(incoming),
    });
    db.beforeWrite = async () => {
      expect(await importEnvelope(firstRevision)).toMatchObject({ status: 'accepted', sequence: 2 });
    };
    expect(await importEnvelope(overlapping)).toMatchObject({ status: 'rejected', code: 'CONFLICT' });
    expect(await getPublicKnowledge(payload.subject_id, env.DB, NOW)).toEqual(original);
  });

  it('binds a derivative to the subject of the first committed insert', async () => {
    const first = await makeEnvelope();
    const other = { ...payload, subject_id: 'work.different-subject' };
    const overlapping = await makeEnvelope({
      sequence: 2, revision: 'content-rev-2', payload: other, payload_sha256: await digest(other),
    });
    db.beforeWrite = async () => {
      expect(await importEnvelope(first)).toMatchObject({ status: 'accepted', sequence: 1 });
    };
    expect(await importEnvelope(overlapping)).toMatchObject({ status: 'rejected', code: 'CONFLICT' });
    expect(await getPublicKnowledge(payload.subject_id, env.DB, NOW)).toEqual(payload);
    expect(await getPublicKnowledge(other.subject_id, env.DB, NOW)).toBeNull();
  });

  it('preserves the committed subject when a newer withdrawal overlaps the first insert', async () => {
    const first = await makeEnvelope();
    const withdrawal = await makeEnvelope({
      sequence: 2, revision: 'withdrawal-rev', action: 'WITHDRAW', payload: null, payload_sha256: await digest(null),
    });
    db.beforeWrite = async () => {
      expect(await importEnvelope(first)).toMatchObject({ status: 'accepted', sequence: 1 });
    };
    expect(await importEnvelope(withdrawal)).toMatchObject({ status: 'withdrawn', sequence: 2 });
    expect(await getPublicKnowledge(payload.subject_id, env.DB, NOW)).toBeNull();
    const tombstone = await db.prepare('SELECT subject_id FROM public_knowledge WHERE derivative_id = ?')
      .bind(withdrawal.derivative_id).first<{ subject_id: string }>();
    expect(tombstone?.subject_id).toBe(payload.subject_id);
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
