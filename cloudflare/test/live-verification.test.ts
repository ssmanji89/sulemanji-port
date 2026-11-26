import { describe, expect, it } from 'vitest';
import { verifyPublicationDetailed } from '../src/editorial/publisher.js';
import { normalizeVisibleText } from '../src/editorial/review.js';
import type { PublishAttempt } from '../src/editorial/contracts.js';

async function sha(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer));
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
const articleUrl = 'https://www.sulemanji.com/notes/reviewed-article';
const title = 'A nested article that is verified';
const body = '<p>Nested public text remains visible to the reader, <strong>including the exact bold words</strong> inside this article body.</p><ul><li>A separate list item with useful evidence.</li></ul>';
function response(url: string, body: string, headers: Record<string, string> = {}, status = 200): Response {
  const result = new Response(body, { status, headers });
  Object.defineProperty(result, 'url', { value: url });
  return result;
}
function attempt(textHash: string): PublishAttempt {
  return { id: 'publication:candidate', candidate_id: 'candidate', owner_epoch: 3, branch: 'editorial/candidate-candidate', pull_request: 12, source_commit: 'a'.repeat(40),
    deployment_version: null, public_urls: ['/notes/reviewed-article'], expected_content: [{ url: '/notes/reviewed-article', title, text_sha256: textHash }], status: 'SOURCE_PUBLISHED' };
}

describe('deployed page readback', () => {
  it('parses nested HTML, verifies exact content and release revision, then confirms writing/feed/sitemap', async () => {
    const html = `<!doctype html><html><head><link rel="canonical" href="${articleUrl}"></head><body><article><h1>${title}</h1><div data-writing-body>${body}</div></article></body></html>`;
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/notes/reviewed-article') return response(articleUrl, html, { 'x-site-source-commit': 'a'.repeat(40) });
      if (url.pathname === '/writing/') return response(url.toString(), `<a href="/notes/reviewed-article">${title}</a>`);
      if (url.pathname === '/feed.xml') return response(url.toString(), `<feed><link>${articleUrl}</link></feed>`);
      if (url.pathname === '/sitemap.xml') return response(url.toString(), `<url><loc>${articleUrl}</loc></url>`);
      return response(url.toString(), '', {}, 404);
    };
    const detailed = await verifyPublicationDetailed(attempt(await sha(normalizeVisibleText(body))), fetcher);
    if (detailed.failure) throw new Error(detailed.failure);
    const receipt = detailed.receipt;
    expect(receipt.outcome).toBe('VERIFIED');
    expect(receipt.source_commit).toBe('a'.repeat(40));
    expect(receipt.deployment_version).not.toBe('');
  });

  it('does not accept a 200 homepage when the expected article is missing', async () => {
    const fetcher: typeof fetch = async (input) => response(String(input), '<html><body><h1>Home</h1></body></html>', { 'x-site-source-commit': 'a'.repeat(40) });
    expect((await verifyPublicationDetailed(attempt('b'.repeat(64)), fetcher)).receipt.outcome).toBe('UNCERTAIN');
  });

  it('rejects a page served from the wrong deployed revision', async () => {
    const html = `<!doctype html><html><head><link rel="canonical" href="${articleUrl}"></head><body><h1>${title}</h1><div data-writing-body>${body}</div></body></html>`;
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/notes/reviewed-article') return response(articleUrl, html, { 'x-site-source-commit': 'b'.repeat(40) });
      return response(url.toString(), '<feed></feed>');
    };
    expect((await verifyPublicationDetailed(attempt(await sha(normalizeVisibleText(body))), fetcher)).receipt.outcome).toBe('UNCERTAIN');
  });
});
