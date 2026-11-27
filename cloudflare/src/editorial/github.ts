import type { ContentProposal } from './contracts.js';
import type { GitHubPublisher, PullRequestState } from './publisher.js';

type GitHubConfig = { token: string; repository: string; required_checks: string[]; default_branch?: string; api_origin?: string };
type PullRequestApi = { number: number; state: 'open' | 'closed'; merged: boolean; merge_commit_sha: string | null; head: { ref: string; sha: string } };
type CheckRunsApi = { check_runs?: Array<{ name: string; status: string; conclusion: string | null }> };

function binaryBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  return btoa(binary);
}

export class GitHubApiPublisher implements GitHubPublisher {
  private readonly owner: string;
  private readonly repo: string;
  private readonly origin: string;
  private readonly branch: string;

  constructor(private readonly config: GitHubConfig, private readonly fetcher: typeof fetch = fetch) {
    const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(config.repository);
    if (!match || !config.token || !config.required_checks.length) throw new Error('GITHUB_PUBLISHER_NOT_AUTHORIZED');
    this.owner = match[1]; this.repo = match[2]; this.branch = config.default_branch ?? 'main';
    const origin = new URL(config.api_origin ?? 'https://api.github.com');
    if (origin.protocol !== 'https:' || origin.hostname !== 'api.github.com') throw new Error('GITHUB_API_ORIGIN_REJECTED');
    this.origin = origin.origin;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetcher(new URL(path, this.origin), { ...init, redirect: 'error', headers: {
      accept: 'application/vnd.github+json', authorization: `Bearer ${this.config.token}`, 'x-github-api-version': '2022-11-28',
      ...(init?.body ? { 'content-type': 'application/json' } : {}), ...init?.headers,
    } });
    if (!response.ok) throw new Error(`GITHUB_API_HTTP_${response.status}`);
    return await response.json() as T;
  }

  private async checkState(sha: string): Promise<PullRequestState['checks']> {
    const [checks, status] = await Promise.all([
      this.request<CheckRunsApi>(`/repos/${this.owner}/${this.repo}/commits/${sha}/check-runs?per_page=100`),
      this.request<{ statuses?: Array<{ context: string; state: string }> }>(`/repos/${this.owner}/${this.repo}/commits/${sha}/status`),
    ]);
    const runs = checks.check_runs ?? [];
    const statuses = status.statuses ?? [];
    let pending = false;
    for (const required of this.config.required_checks) {
      const run = runs.filter((item) => item.name === required);
      const context = statuses.filter((item) => item.context === required);
      if (!run.length && !context.length) { pending = true; continue; }
      if (run.some((item) => item.conclusion && item.conclusion !== 'success') || context.some((item) => item.state === 'failure' || item.state === 'error')) return 'failure';
      if (!run.some((item) => item.status === 'completed' && item.conclusion === 'success') && !context.some((item) => item.state === 'success')) pending = true;
    }
    return pending ? 'pending' : 'success';
  }

  async findPullRequest(branch: string): Promise<PullRequestState | null> {
    const query = new URLSearchParams({ head: `${this.owner}:${branch}`, state: 'all', per_page: '100' });
    const rows = await this.request<PullRequestApi[]>(`/repos/${this.owner}/${this.repo}/pulls?${query}`);
    const pr = rows.find((item) => item.head.ref === branch);
    if (!pr) return null;
    const checks = await this.checkState(pr.head.sha);
    return { number: pr.number, head_sha: pr.head.sha, state: pr.state, merged: pr.merged, merge_commit_sha: pr.merge_commit_sha, checks };
  }

  async createReviewedBranchAndPullRequest(input: { candidate_id: string; branch: string; base_commit: string; content_digest: string; files: ContentProposal['files']; title: string; body: string }): Promise<PullRequestState> {
    const ref = await this.request<{ object: { sha: string } }>(`/repos/${this.owner}/${this.repo}/git/ref/heads/${this.branch}`);
    if (ref.object.sha !== input.base_commit) throw new Error('GITHUB_BASE_HEAD_CHANGED');
    const commit = await this.request<{ tree: { sha: string } }>(`/repos/${this.owner}/${this.repo}/git/commits/${input.base_commit}`);
    const tree = await Promise.all(input.files.map(async (file) => {
      const bytes = file.encoding === 'base64' ? Uint8Array.from(atob(file.content), (char) => char.charCodeAt(0)) : new TextEncoder().encode(file.content);
      const blob = await this.request<{ sha: string }>(`/repos/${this.owner}/${this.repo}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: binaryBase64(bytes), encoding: 'base64' }) });
      return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha };
    }));
    const nextTree = await this.request<{ sha: string }>(`/repos/${this.owner}/${this.repo}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
    const nextCommit = await this.request<{ sha: string }>(`/repos/${this.owner}/${this.repo}/git/commits`, { method: 'POST', body: JSON.stringify({
      message: `Editorial candidate ${input.candidate_id}\n\nContent-Digest: ${input.content_digest}`, tree: nextTree.sha, parents: [input.base_commit],
    }) });
    const refPath = `/repos/${this.owner}/${this.repo}/git/refs`;
    try {
      await this.request(refPath, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${input.branch}`, sha: nextCommit.sha }) });
    } catch (error) {
      const existingRef = await this.request<{ object: { sha: string } }>(`/repos/${this.owner}/${this.repo}/git/ref/heads/${input.branch}`);
      const existingCommit = await this.request<{ message: string }>(`/repos/${this.owner}/${this.repo}/git/commits/${existingRef.object.sha}`);
      if (!existingCommit.message.includes(`Content-Digest: ${input.content_digest}`)) throw error;
    }
    let pr: PullRequestApi;
    try {
      pr = await this.request<PullRequestApi>(`/repos/${this.owner}/${this.repo}/pulls`, { method: 'POST', body: JSON.stringify({ title: input.title, body: input.body, head: input.branch, base: this.branch, draft: false, maintainer_can_modify: false }) });
    } catch (error) {
      const existing = await this.findPullRequest(input.branch);
      if (!existing) throw error;
      return existing;
    }
    return { number: pr.number, head_sha: pr.head.sha, state: pr.state, merged: pr.merged, merge_commit_sha: pr.merge_commit_sha, checks: await this.checkState(pr.head.sha) };
  }

  async mergePullRequest(number: number, expectedHead: string): Promise<{ merge_commit_sha: string }> {
    const result = await this.request<{ merged: boolean; sha: string }>(`/repos/${this.owner}/${this.repo}/pulls/${number}/merge`, {
      method: 'PUT', body: JSON.stringify({ sha: expectedHead, merge_method: 'squash' }),
    });
    if (!result.merged || !result.sha) throw new Error('GITHUB_MERGE_NOT_CONFIRMED');
    return { merge_commit_sha: result.sha };
  }
}
