import { describe, expect, it, vi } from 'vitest';
import { GitHubApiPublisher } from '../src/editorial/github.js';

describe('GitHub publication read adapters', () => {
  it('reads exactly one manifest annotation per successful site deploy of the requested commit', async () => {
    const repository = 'ssmanji89/sulemanji-port';
    const commit = 'a'.repeat(40);
    const digest = 'c'.repeat(64);
    const check = { id: 42, name: 'deploy-cloudflare', head_sha: commit, status: 'completed', conclusion: 'success',
      app: { id: 15368, slug: 'github-actions' }, details_url: `https://github.com/${repository}/actions/runs/10/job/42` };
    const annotation = { path: '.github/workflows/jekyll.yml', annotation_level: 'notice', title: 'Verified site manifest',
      message: `site-release-manifest-sha256-v1 ${commit} ${digest}` };
    let annotations = [annotation];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const uri = new URL(String(input));
      expect(uri.origin).toBe('https://api.github.com');
      if (uri.pathname.endsWith(`/commits/${commit}/check-runs`)) return Response.json({
        check_runs: [{ ...check, id: 99, app: { id: 999, slug: 'untrusted' } }, { ...check, id: 98, head_sha: 'e'.repeat(40) },
          { ...check, id: 97, conclusion: 'failure' }, { ...check, id: 96, name: 'deploy-editorial-fixture' }, check],
      });
      if (uri.pathname.endsWith('/check-runs/42/annotations')) return Response.json(annotations);
      throw new Error('Unexpected GitHub request');
    });
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository, required_checks: ['build'] }, fetcher as typeof fetch);
    await expect(github.readReleaseManifestDigests(commit)).resolves.toEqual([digest]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    annotations = [{ ...annotation, message: `site-release-manifest-sha256-v1 ${'b'.repeat(40)} ${digest}` }];
    await expect(github.readReleaseManifestDigests(commit)).resolves.toEqual([]);
    annotations = [annotation, { ...annotation, message: `site-release-manifest-sha256-v1 ${commit} ${'d'.repeat(64)}` }];
    await expect(github.readReleaseManifestDigests(commit)).resolves.toEqual([]);
  });
  it('rejects a redirect from the authenticated GitHub request', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.redirect).toBe('manual');
      return new Response(null, { status: 302, headers: { location: 'https://example.test/' } });
    });
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository: 'ssmanji89/sulemanji-port', required_checks: ['build'] }, fetcher);
    await expect(github.readDefaultBranchHead()).rejects.toThrow('GITHUB_API_HTTP_302');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(['public', 'internal'])('rejects a %s staging repository before reading its default branch', async (visibility) => {
    const repo = 'ssmanji89/sulemanji-editorial-fixture';
    const fetcher = vi.fn(async () => Response.json({ full_name: repo, visibility, private: false, default_branch: 'main' }));
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository: repo, required_checks: ['build'], require_private: true }, fetcher as typeof fetch);
    await expect(github.readDefaultBranchHead()).rejects.toThrow('GITHUB_FIXTURE_REPOSITORY_REJECTED');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

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

  it.each([
    { operation: 'create' as const, response: Response.json({ type: 'file' }), expected: 'GITHUB_CREATE_PATH_EXISTS' },
    { operation: 'update' as const, response: new Response('not found', { status: 404 }), expected: 'GITHUB_UPDATE_PATH_MISSING' },
  ])('checks $operation path existence at the exact base before constructing a Git tree', async ({ operation, response, expected }) => {
    const base = 'a'.repeat(40);
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha: base } });
      if (url.endsWith(`/git/commits/${base}`)) return Response.json({ tree: { sha: 'b'.repeat(40) } });
      if (url.includes('/contents/notes/reviewed-article.md?ref=')) return response;
      throw new Error(`Unexpected request ${url}`);
    });
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository: 'ssmanji89/sulemanji-port', required_checks: ['site-release'] }, fetcher as typeof fetch);

    await expect(github.createReviewedBranchAndPullRequest({ candidate_id: 'candidate-42', branch: 'editorial/candidate-42', base_commit: base,
      content_digest: 'c'.repeat(64), files: [{ path: 'notes/reviewed-article.md', operation, encoding: 'utf-8', content: 'reviewed', content_sha256: 'd'.repeat(64) }],
      title: 'Reviewed article', body: 'Reviewed proposal.' }, async () => true)).rejects.toThrow(expected);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.some(([input]) => String(input).endsWith('/git/blobs'))).toBe(false);
  });

  it('rejects a digest-matching branch conflict whose tree is not the exact reviewed proposal', async () => {
    const base = 'a'.repeat(40);
    const branch = 'editorial/candidate-42';
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha: base } });
      if (url.endsWith(`/git/commits/${base}`)) return Response.json({ tree: { sha: 'b'.repeat(40) } });
      if (url.includes('/contents/notes/reviewed-article.md?ref=')) return new Response('not found', { status: 404 });
      if (url.endsWith('/git/blobs')) return Response.json({ sha: 'f'.repeat(40) });
      if (url.endsWith('/git/trees')) return Response.json({ sha: '1'.repeat(40) });
      if (url.endsWith('/git/commits') && init?.method === 'POST') return Response.json({ sha: '2'.repeat(40) });
      if (url.endsWith('/git/refs')) return new Response('already exists', { status: 422 });
      if (url.includes('/git/ref/heads/') && url.includes('candidate-42')) return Response.json({ object: { sha: '3'.repeat(40) } });
      if (url.endsWith(`/git/commits/${'3'.repeat(40)}`)) return Response.json({
        message: `untrusted concurrent commit\n\nContent-Digest: ${'c'.repeat(64)}`, tree: { sha: '4'.repeat(40) }, parents: [{ sha: base }],
      });
      if (url.includes('/pulls?')) return Response.json([{ number: 9, state: 'open', merged: false, merge_commit_sha: null,
        head: { ref: branch, sha: '3'.repeat(40) }, base: { ref: 'main' } }]);
      if (url.includes('/check-runs?')) return Response.json({ check_runs: [{ name: 'site-release', status: 'completed', conclusion: 'success' }] });
      if (url.endsWith('/status')) return Response.json({ statuses: [] });
      throw new Error(`Unexpected request ${url}`);
    });
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository: 'ssmanji89/sulemanji-port', required_checks: ['site-release'] }, fetcher as typeof fetch);

    await expect(github.createReviewedBranchAndPullRequest({ candidate_id: 'candidate-42', branch, base_commit: base, content_digest: 'c'.repeat(64),
      files: [{ path: 'notes/reviewed-article.md', operation: 'create', encoding: 'utf-8', content: 'reviewed', content_sha256: 'd'.repeat(64) }],
      title: 'Reviewed article', body: 'Reviewed proposal.' }, async () => true)).rejects.toThrow('GITHUB_BRANCH_CONTENT_MISMATCH');
    expect(fetcher.mock.calls.some(([input]) => String(input).endsWith('/pulls'))).toBe(false);
  });

  it('requires active strict checks and calls the final authority guard before the merge request', async () => {
    let active = false;
    let merges = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/rules/branches/main')) return Response.json(active ? [{
        type: 'required_status_checks', parameters: { strict_required_status_checks_policy: true,
          required_status_checks: [{ context: 'site-release' }] },
      }] : []);
      if (url.endsWith('/pulls/9/merge') && init?.method === 'PUT') {
        merges += 1;
        return Response.json({ merged: true, sha: 'd'.repeat(40) });
      }
      throw new Error('Unexpected GitHub request');
    });
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository: 'ssmanji89/sulemanji-port',
      required_checks: ['site-release'] }, fetcher as typeof fetch);
    await expect(github.hasStrictMergeChecks()).resolves.toBe(false);
    active = true;
    await expect(github.hasStrictMergeChecks()).resolves.toBe(true);
    await expect(github.mergePullRequest(9, 'a'.repeat(40), async () => false)).resolves.toEqual({ refused: true });
    expect(merges).toBe(0);
    await expect(github.mergePullRequest(9, 'a'.repeat(40), async () => true)).resolves.toEqual({ merge_commit_sha: 'd'.repeat(40) });
    expect(merges).toBe(1);
  });

  it('recognizes a merged PR from the list-pulls response without a merged field or check reads', async () => {
    const branch = 'editorial/candidate-42';
    const head = 'a'.repeat(40);
    const merge = 'b'.repeat(40);
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (!String(input).includes('/pulls?')) throw new Error('Merged PR must not require current checks');
      return Response.json([{ number: 9, state: 'closed', merged_at: '2026-11-27T19:20:30Z', merge_commit_sha: merge,
        head: { ref: branch, sha: head }, base: { ref: 'main' } }]);
    });
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository: 'ssmanji89/sulemanji-port',
      required_checks: ['site-release'] }, fetcher as typeof fetch);
    await expect(github.findPullRequest(branch)).resolves.toMatchObject({ number: 9, head_sha: head, merged: true, merge_commit_sha: merge });
  });

  it('does not adopt an unrelated PR when creating the reviewed PR races with an existing branch PR', async () => {
    const base = 'a'.repeat(40);
    const branch = 'editorial/candidate-42';
    const createdHead = '2'.repeat(40);
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha: base } });
      if (url.endsWith(`/git/commits/${base}`)) return Response.json({ tree: { sha: 'b'.repeat(40) } });
      if (url.includes('/contents/notes/reviewed-article.md?ref=')) return new Response('not found', { status: 404 });
      if (url.endsWith('/git/blobs')) return Response.json({ sha: 'f'.repeat(40) });
      if (url.endsWith('/git/trees')) return Response.json({ sha: '1'.repeat(40) });
      if (url.endsWith('/git/commits') && init?.method === 'POST') return Response.json({ sha: createdHead });
      if (url.endsWith('/git/refs')) return Response.json({ ref: `refs/heads/${branch}` });
      if (url.endsWith('/pulls') && init?.method === 'POST') return new Response('pull request conflict', { status: 422 });
      if (url.includes('/pulls?')) return Response.json([{ number: 9, state: 'open', merged: false, merge_commit_sha: null,
        head: { ref: branch, sha: '3'.repeat(40) }, base: { ref: 'main' } }]);
      if (url.includes('/git/ref/heads/') && url.includes('candidate-42')) return Response.json({ object: { sha: '3'.repeat(40) } });
      if (url.endsWith(`/git/commits/${'3'.repeat(40)}`)) return Response.json({ tree: { sha: '4'.repeat(40) }, parents: [{ sha: base }] });
      if (url.includes('/check-runs?')) return Response.json({ check_runs: [{ name: 'site-release', status: 'completed', conclusion: 'success' }] });
      if (url.endsWith('/status')) return Response.json({ statuses: [] });
      throw new Error(`Unexpected request ${url}`);
    });
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository: 'ssmanji89/sulemanji-port', required_checks: ['site-release'] }, fetcher as typeof fetch);

    await expect(github.createReviewedBranchAndPullRequest({ candidate_id: 'candidate-42', branch, base_commit: base, content_digest: 'c'.repeat(64),
      files: [{ path: 'notes/reviewed-article.md', operation: 'create', encoding: 'utf-8', content: 'reviewed', content_sha256: 'd'.repeat(64) }],
      title: 'Reviewed article', body: 'Reviewed proposal.' }, async () => true)).rejects.toThrow('GITHUB_PR_CONTENT_MISMATCH');
  });

  it('creates and returns a pull request only after its exact expected tree is confirmed', async () => {
    const base = 'a'.repeat(40);
    const branch = 'editorial/candidate-42';
    const head = '2'.repeat(40);
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha: base } });
      if (url.endsWith(`/git/commits/${base}`)) return Response.json({ tree: { sha: 'b'.repeat(40) } });
      if (url.includes('/contents/notes/reviewed-article.md?ref=')) return new Response('not found', { status: 404 });
      if (url.endsWith('/git/blobs')) return Response.json({ sha: 'f'.repeat(40) });
      if (url.endsWith('/git/trees')) return Response.json({ sha: '1'.repeat(40) });
      if (url.endsWith('/git/commits') && init?.method === 'POST') return Response.json({ sha: head });
      if (url.endsWith('/git/refs') && init?.method === 'POST') return Response.json({ ref: `refs/heads/${branch}` });
      if (url.endsWith('/pulls') && init?.method === 'POST') return Response.json({ number: 9, state: 'open', merged: false,
        merge_commit_sha: null, head: { ref: branch, sha: head }, base: { ref: 'main' } });
      if (url.includes('/git/ref/heads/') && url.includes('candidate-42')) return Response.json({ object: { sha: head } });
      if (url.endsWith(`/git/commits/${head}`)) return Response.json({ tree: { sha: '1'.repeat(40) }, parents: [{ sha: base }] });
      if (url.includes('/check-runs?')) return Response.json({ check_runs: [{ name: 'site-release', status: 'completed', conclusion: 'success' }] });
      if (url.endsWith('/status')) return Response.json({ statuses: [] });
      throw new Error(`Unexpected request ${url}`);
    });
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository: 'ssmanji89/sulemanji-port', required_checks: ['site-release'] }, fetcher as typeof fetch);

    await expect(github.createReviewedBranchAndPullRequest({ candidate_id: 'candidate-42', branch, base_commit: base, content_digest: 'c'.repeat(64),
      files: [{ path: 'notes/reviewed-article.md', operation: 'create', encoding: 'utf-8', content: 'reviewed', content_sha256: 'd'.repeat(64) }],
      title: 'Reviewed article', body: 'Reviewed proposal.' }, async () => true)).resolves.toMatchObject({ number: 9, head_sha: head, checks: 'success' });
  });

  it('checks authority again before sharing a prepared commit through a branch or pull request', async () => {
    const base = 'a'.repeat(40);
    let authorized = true;
    const writes: string[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      const uri = new URL(String(input));
      if (init?.method === 'POST') writes.push(uri.pathname.split('/').at(-1)!);
      if (uri.pathname.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha: base } });
      if (uri.pathname.endsWith('/git/commits/' + base)) return Response.json({ tree: { sha: 'b'.repeat(40) } });
      if (uri.pathname.includes('/contents/')) return new Response('not found', { status: 404 });
      if (uri.pathname.endsWith('/git/blobs')) return Response.json({ sha: 'c'.repeat(40) });
      if (uri.pathname.endsWith('/git/trees')) return Response.json({ sha: 'd'.repeat(40) });
      if (uri.pathname.endsWith('/git/commits')) {
        authorized = false;
        return Response.json({ sha: 'e'.repeat(40) });
      }
      throw new Error('Unexpected GitHub effect');
    };
    const github = new GitHubApiPublisher({ token: 'fixture-token', repository: 'ssmanji89/sulemanji-port', required_checks: ['site-release'] }, fetcher);
    await expect(github.createReviewedBranchAndPullRequest({ candidate_id: 'candidate-42', branch: 'editorial/candidate-42', base_commit: base,
      content_digest: 'c'.repeat(64), files: [{ path: 'notes/reviewed-article.md', operation: 'create', encoding: 'utf-8', content: 'reviewed', content_sha256: 'd'.repeat(64) }],
      title: 'Reviewed article', body: 'Reviewed proposal.' }, async () => authorized)).rejects.toThrow('GITHUB_WRITE_AUTHORITY_CHANGED');
    expect(writes).toEqual(['blobs', 'trees', 'commits']);
  });
});
