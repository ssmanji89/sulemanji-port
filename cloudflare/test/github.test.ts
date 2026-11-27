import { describe, expect, it, vi } from 'vitest';
import { GitHubApiPublisher } from '../src/editorial/github.js';

describe('GitHub publication read adapters', () => {
  it('reads the repository base branch commit', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => Response.json({ object: { sha: 'a'.repeat(40) } }));
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository: 'ssmanji89/sulemanji-port', required_checks: ['site-release'] }, fetcher as typeof fetch);

    await expect(github.readDefaultBranchHead()).resolves.toBe('a'.repeat(40));
    expect(String(fetcher.mock.calls[0][0])).toBe('https://api.github.com/repos/ssmanji89/sulemanji-port/git/ref/heads/main');
  });

  it('reads and strictly decodes an article file at the reviewed base commit', async () => {
    const content = '---\ntitle: A checked article\n---\n\nEvidence-backed text.\n';
    const encoded = btoa(unescape(encodeURIComponent(content)));
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => Response.json({ type: 'file', encoding: 'base64', content: encoded }));
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository: 'ssmanji89/sulemanji-port', required_checks: ['site-release'] }, fetcher as typeof fetch);

    await expect(github.readTextFile('notes/a-checked-article.md', 'a'.repeat(40))).resolves.toBe(content);
    expect(String(fetcher.mock.calls[0][0])).toBe('https://api.github.com/repos/ssmanji89/sulemanji-port/contents/notes/a-checked-article.md?ref=' + 'a'.repeat(40));
  });

  it('rejects protected and traversal paths before requesting content', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => Response.json({}));
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository: 'ssmanji89/sulemanji-port', required_checks: ['site-release'] }, fetcher as typeof fetch);

    await expect(github.readTextFile('../.github/workflows/site.yml', 'a'.repeat(40))).rejects.toThrow('GITHUB_PATH_REJECTED');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
