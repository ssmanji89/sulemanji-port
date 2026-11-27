import type { EditorialEnv, ImportResult, KnowledgeEnvelope, PublicKnowledge, PublicSource } from './contracts.js';

const MAX_BODY_BYTES = 1_048_576;
const MAX_ENVELOPE_LIFETIME_MS = 24 * 60 * 60 * 1000;
const HEX_256 = /^[0-9a-f]{64}$/;
const ISO_UTC_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const USES = new Set(['context', 'factual-update', 'public-explanation']);
const AUTHORABLE_FIELDS = new Set(['subject_id', 'summary', 'allowed_uses', 'public_sources']);

function source(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

type StoredKnowledge = {
  derivative_id: string;
  subject_id: string;
  revision: string;
  sequence: number;
  action: 'UPSERT' | 'WITHDRAW';
  payload_sha256: string;
  policy_revision: string;
  issued_at: string;
  expires_at: string;
  payload_json: string | null;
};

function exactKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const got = Object.keys(value as object).sort();
  return got.length === keys.length && got.every((key, i) => key === [...keys].sort()[i]);
}

function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  throw new Error('unsupported canonical JSON value');
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', source(bytes)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeBase64(value: string): Uint8Array | null {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null;
  try {
    const decoded = atob(value);
    return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function verifySignature(raw: Uint8Array, signature: string, keyId: string, env: EditorialEnv): Promise<boolean> {
  let entries: unknown;
  try { entries = JSON.parse(env.KNOWLEDGE_KEYS_JSON); } catch { return false; }
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) return false;
  const encodedKey = (entries as Record<string, unknown>)[keyId];
  if (typeof encodedKey !== 'string' || !encodedKey) return false;
  const signatureBytes = decodeBase64(signature);
  const keyBytes = decodeBase64(encodedKey);
  if (!signatureBytes || signatureBytes.length !== 32 || !keyBytes || keyBytes.length < 32) return false;
  try {
    const key = await crypto.subtle.importKey('raw', source(keyBytes), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    return crypto.subtle.verify('HMAC', key, source(signatureBytes), source(raw));
  } catch { return false; }
}

function isoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_UTC_MS.test(value) || Number(value.slice(0, 4)) === 0) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function isWellFormedUnicode(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const unit = value.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function safeText(value: unknown, maxCodePoints: number): value is string {
  return typeof value === 'string' && isWellFormedUnicode(value) && !value.includes('\0') &&
    Array.from(value).length <= maxCodePoints;
}

function validSource(source: unknown): source is PublicSource {
  if (!exactKeys(source, ['url', 'title', 'retrieved_at', 'source_date', 'content_sha256'])) return false;
  const item = source as unknown as PublicSource;
  if (!safeText(item.url, 2048) || !item.url.trim() || item.url.includes('\\') ||
      !safeText(item.title, 300) || !item.title.trim()) return false;
  const separator = item.url.indexOf('://');
  if (separator < 0 || item.url.slice(separator + 3).split(/[/?#]/, 1)[0].includes('@')) return false;
  let url: URL;
  try { url = new URL(item.url); } catch { return false; }
  return url.protocol === 'https:' && !url.username && !url.password && !url.hash && isPublicHostname(url.hostname) &&
    ![...url.searchParams.keys()].some((key) => /token|secret|password|credential|auth|key/i.test(key)) &&
    isoDate(item.retrieved_at) && (item.source_date === null || isoDate(item.source_date)) && HEX_256.test(item.content_sha256);
}

function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (host.startsWith('[') && host.endsWith(']')) return isPublicIpv6(host.slice(1, -1));
  const octets = host.split('.');
  if (octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part))) {
    return host.includes('.') && !host.startsWith('.') && !host.endsWith('.');
  }
  const [first, second, third, fourth] = octets.map(Number);
  if (octets.some((part) => Number(part) > 255) || first === 0 || first >= 224 || first === 10 || first === 127) return false;
  if ((first === 100 && second >= 64 && second <= 127) || (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168) ||
      (first === 192 && second === 0 && ((third === 0 && fourth !== 9 && fourth !== 10) || third === 2)) ||
      (first === 192 && second === 88 && third === 99) ||
      (first === 198 && ((second === 18 || second === 19) || (second === 51 && third === 100))) ||
      (first === 203 && second === 0 && third === 113)) return false;
  return true;
}

function isPublicIpv6(address: string): boolean {
  const ip = address.toLowerCase();
  if (ip.startsWith('::ffff:')) {
    const mapped = ip.slice('::ffff:'.length);
    const parts = mapped.split(':');
    if (parts.length !== 2 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return false;
    const high = Number.parseInt(parts[0], 16);
    const low = Number.parseInt(parts[1], 16);
    return isPublicHostname(`${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`);
  }
  const halves = ip.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
  const groups = halves.length > 1
    ? [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right]
    : left;
  const [first = '0', second = '0', third = '0'] = groups;
  const firstWord = Number.parseInt(first, 16);
  const secondWord = Number.parseInt(second, 16);
  const thirdWord = Number.parseInt(third, 16);
  const special2001Exception = firstWord === 0x2001 && (
    (secondWord === 1 && groups.slice(2, 7).every((group) => Number.parseInt(group, 16) === 0) &&
      (Number.parseInt(groups[7] ?? '0', 16) === 1 || Number.parseInt(groups[7] ?? '0', 16) === 2)) ||
    secondWord === 3 ||
    (secondWord === 4 && thirdWord === 0x112) ||
    (secondWord >= 0x20 && secondWord <= 0x2f) ||
    (secondWord >= 0x30 && secondWord <= 0x3f)
  );
  if (firstWord < 0x2000 || firstWord > 0x3fff || firstWord === 0x2002 ||
      (firstWord === 0x3fff && secondWord < 0x1000)) return false;
  if (firstWord === 0x2001 && secondWord === 0x0db8) return false;
  if (firstWord === 0x2001 && secondWord <= 0x01ff && !special2001Exception) return false;
  return true;
}

function validPayload(payload: unknown): payload is PublicKnowledge {
  if (!exactKeys(payload, ['subject_id', 'summary', 'allowed_uses', 'public_sources', 'authored_fields'])) return false;
  const p = payload as unknown as PublicKnowledge;
  return typeof p.subject_id === 'string' && /^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(p.subject_id) &&
    safeText(p.summary, 20_000) && p.summary.trim().length > 0 &&
    Array.isArray(p.allowed_uses) && p.allowed_uses.length > 0 && p.allowed_uses.every((use) => USES.has(use)) &&
    new Set(p.allowed_uses).size === p.allowed_uses.length &&
    Array.isArray(p.public_sources) && p.public_sources.length > 0 && p.public_sources.length <= 40 && p.public_sources.every(validSource) &&
    Array.isArray(p.authored_fields) && p.authored_fields.length <= 100 &&
    p.authored_fields.every((field) => typeof field === 'string' && AUTHORABLE_FIELDS.has(field)) &&
    new Set(p.authored_fields).size === p.authored_fields.length;
}

function parseEnvelope(value: unknown): value is KnowledgeEnvelope {
  if (!exactKeys(value, ['schema_version', 'derivative_id', 'revision', 'sequence', 'action', 'target', 'issued_at', 'expires_at', 'policy_revision', 'payload_sha256', 'payload'])) return false;
  const e = value as unknown as KnowledgeEnvelope;
  return e.schema_version === 1 && typeof e.derivative_id === 'string' && /^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(e.derivative_id) &&
    safeText(e.revision, 256) && e.revision.length > 0 &&
    Number.isSafeInteger(e.sequence) && e.sequence > 0 && ['UPSERT', 'WITHDRAW'].includes(e.action) &&
    e.target === 'sulemanji.com' && isoDate(e.issued_at) && isoDate(e.expires_at) &&
    safeText(e.policy_revision, 128) && e.policy_revision.length > 0 && HEX_256.test(e.payload_sha256) &&
    ((e.action === 'UPSERT' && validPayload(e.payload)) || (e.action === 'WITHDRAW' && e.payload === null));
}

function reject(code: Extract<ImportResult, { status: 'rejected' }>['code'], detail: string): ImportResult {
  return { status: 'rejected', code, detail };
}

export async function ingestKnowledge(raw: Uint8Array, signature: string, keyId: string, env: EditorialEnv, now = new Date()): Promise<ImportResult> {
  if (raw.byteLength > MAX_BODY_BYTES) return reject('INVALID', 'Request body exceeds 1 MiB.');
  if (!signature || !keyId || !(await verifySignature(raw, signature, keyId, env))) return reject('AUTH', 'Knowledge signature is invalid.');

  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); } catch { return reject('INVALID', 'Request body is not valid UTF-8 JSON.'); }
  if (!parseEnvelope(parsed)) return reject('INVALID', 'Envelope or payload schema is invalid.');
  const envelope = parsed;
  if (envelope.policy_revision !== env.KNOWLEDGE_POLICY_REVISION) return reject('INVALID', 'Knowledge policy revision is not authorized.');
  const issued = Date.parse(envelope.issued_at);
  const expiry = Date.parse(envelope.expires_at);
  if (issued > now.getTime() + 60_000 || expiry <= now.getTime() || expiry <= issued || expiry - issued > MAX_ENVELOPE_LIFETIME_MS) {
    return reject('EXPIRED', 'Knowledge authority is expired or outside the permitted lifetime.');
  }
  const payloadBytes = new TextEncoder().encode(envelope.payload === null ? 'null' : canonical(envelope.payload));
  if (await sha256Hex(payloadBytes) !== envelope.payload_sha256) return reject('INVALID', 'Payload digest does not match canonical payload bytes.');

  const current = await env.DB.prepare('SELECT * FROM public_knowledge WHERE derivative_id = ?').bind(envelope.derivative_id).first<StoredKnowledge>();
  if (current && current.sequence > envelope.sequence) return reject('STALE', 'A newer knowledge sequence is already stored.');
  const subjectId = envelope.payload?.subject_id ?? current?.subject_id ?? envelope.derivative_id;
  if (current && current.subject_id !== subjectId) return reject('CONFLICT', 'A derivative cannot change its authorized subject.');
  if (current && envelope.action === 'UPSERT' && current.revision === envelope.revision && current.payload_sha256 !== envelope.payload_sha256) {
    return reject('CONFLICT', 'Changed content requires a new opaque content revision.');
  }
  const payloadJson = envelope.payload === null ? null : JSON.stringify(envelope.payload);
  const write = await env.DB.prepare(`INSERT INTO public_knowledge
    (derivative_id, subject_id, revision, sequence, action, payload_sha256, policy_revision, issued_at, expires_at, payload_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(derivative_id) DO UPDATE SET
      subject_id=excluded.subject_id, revision=excluded.revision, sequence=excluded.sequence, action=excluded.action,
      payload_sha256=excluded.payload_sha256, policy_revision=excluded.policy_revision, issued_at=excluded.issued_at,
      expires_at=excluded.expires_at, payload_json=excluded.payload_json, updated_at=excluded.updated_at
    WHERE excluded.sequence > public_knowledge.sequence`)
    .bind(envelope.derivative_id, subjectId, envelope.revision, envelope.sequence, envelope.action, envelope.payload_sha256,
      envelope.policy_revision, envelope.issued_at, envelope.expires_at, payloadJson, now.toISOString()).run();
  const stored = await env.DB.prepare('SELECT * FROM public_knowledge WHERE derivative_id = ?').bind(envelope.derivative_id).first<StoredKnowledge>();
  if (!stored) return reject('INVALID', 'Durable knowledge readback failed.');
  if (stored.sequence > envelope.sequence) return reject('STALE', 'A newer knowledge sequence is already stored.');
  if (stored.sequence === envelope.sequence && (stored.revision !== envelope.revision || stored.action !== envelope.action ||
      stored.payload_sha256 !== envelope.payload_sha256 || stored.policy_revision !== envelope.policy_revision ||
      stored.issued_at !== envelope.issued_at || stored.expires_at !== envelope.expires_at)) {
    return reject('CONFLICT', 'Sequence is already bound to different knowledge.');
  }
  const changed = (write.meta.changes ?? 0) > 0;
  if (envelope.action === 'WITHDRAW') return { status: changed ? 'withdrawn' : 'duplicate', derivative_id: envelope.derivative_id, sequence: envelope.sequence };
  return { status: changed ? 'accepted' : 'duplicate', derivative_id: envelope.derivative_id, sequence: envelope.sequence };
}

export async function getPublicKnowledge(subjectId: string, db: D1Database, now = new Date()): Promise<PublicKnowledge | null> {
  const row = await db.prepare(`SELECT payload_json FROM public_knowledge
    WHERE subject_id = ? AND action = 'UPSERT' AND expires_at > ?
    ORDER BY sequence DESC LIMIT 1`).bind(subjectId, now.toISOString()).first<{ payload_json: string }>();
  if (!row) return null;
  try {
    const payload = JSON.parse(row.payload_json) as unknown;
    return validPayload(payload) ? payload : null;
  } catch { return null; }
}
