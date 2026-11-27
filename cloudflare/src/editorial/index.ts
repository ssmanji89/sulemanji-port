import type { EditorialEnv } from './contracts.js';
import { ingestKnowledge } from './knowledge.js';
import { operatorRequest } from './operator.js';
import { dispatchDueSlot } from './schedule-dispatch.js';
import { EditorialWorkflow } from './workflow.js';

export { EditorialWorkflow };
type Env = EditorialEnv & { EDITORIAL_OPERATOR_KEYS_JSON: string; EDITORIAL_POLICY_JSON?: string };

async function readBody(request: Request, limit: number): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/internal/knowledge') {
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return new Response('Content-Type must be application/json.', { status: 400 });
      const raw = await readBody(request, 1_048_576);
      if (!raw) return new Response('Request body is missing or exceeds 1 MiB.', { status: 400 });
      const result = await ingestKnowledge(raw, request.headers.get('x-knowledge-signature') ?? '', request.headers.get('x-knowledge-key-id') ?? '', env);
      if (result.status === 'rejected') {
        const status = result.code === 'AUTH' ? 401 : result.code === 'STALE' || result.code === 'CONFLICT' ? 409 : result.code === 'EXPIRED' ? 422 : 400;
        return Response.json(result, { status, headers: { 'cache-control': 'no-store' } });
      }
      return Response.json(result, { status: 200, headers: { 'cache-control': 'no-store' } });
    }
    if (request.method === 'POST' && url.pathname === '/internal/operator') {
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return new Response('Content-Type must be application/json.', { status: 400 });
      const raw = await readBody(request, 16_384);
      if (!raw) return new Response('Request body is missing or too large.', { status: 400 });
      return operatorRequest(raw, request.headers.get('x-operator-key-id') ?? '', request.headers.get('x-operator-signature') ?? '', env);
    }
    return new Response('Not found', { status: 404 });
  },
  scheduled(controller: ScheduledController, env: Env, context: ExecutionContext): void {
    context.waitUntil(dispatchDueSlot(new Date(controller.scheduledTime), env));
  },
};
