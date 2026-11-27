export interface RouteRule {
  source: string;
  kind: 'redirect' | 'gone';
  target?: string;
  destination?: string;
  status?: 301 | 302 | 307 | 308;
}

export interface SiteRelease {
  source_commit: string;
  asset_digest: string;
  built_at: string;
}

export interface SiteEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  RELEASE: SiteRelease;
}

export type RouteDecision =
  | { kind: 'asset' }
  | { kind: 'redirect'; target: string; status: 301 | 302 | 307 | 308 }
  | { kind: 'gone'; destination?: string }
  | { kind: 'not-found' };

function safeLocalPath(path: string | undefined): path is string {
  return Boolean(path && path.startsWith('/') && !path.startsWith('//') && !/[\r\n\\]/.test(path));
}

export function resolveRoute(pathname: string, rules: RouteRule[]): RouteDecision {
  const rule = rules.find((candidate) => candidate.source === pathname);
  if (rule?.kind === 'redirect') {
    return safeLocalPath(rule.target) && [301, 302, 307, 308].includes(rule.status ?? 301)
      ? { kind: 'redirect', target: rule.target, status: rule.status ?? 301 }
      : { kind: 'not-found' };
  }
  if (rule?.kind === 'gone') {
    return !rule.destination || safeLocalPath(rule.destination)
      ? { kind: 'gone', ...(rule.destination ? { destination: rule.destination } : {}) }
      : { kind: 'not-found' };
  }
  return { kind: 'asset' };
}

function withReleaseHeaders(response: Response, release: SiteRelease, method: string): Response {
  const headers = new Headers(response.headers);
  if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=300');
  headers.set('x-site-source-commit', release.source_commit);
  headers.set('x-site-asset-digest', release.asset_digest);
  headers.set('x-site-built-at', release.built_at);
  return new Response(method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function serveSite(request: Request, env: SiteEnv, rules: RouteRule[]): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }

  const url = new URL(request.url);
  const route = resolveRoute(url.pathname, rules);
  if (route.kind === 'not-found') return new Response('Not found', { status: 404 });

  if (route.kind === 'redirect') {
    const target = new URL(route.target, url);
    if (!target.search && url.search) target.search = url.search;
    return new Response(null, { status: route.status, headers: { location: target.toString(), 'cache-control': 'public, max-age=300' } });
  }

  if (route.kind === 'gone') {
    const headers = new Headers({ 'cache-control': 'public, max-age=300' });
    if (route.destination) headers.set('location', new URL(route.destination, url).toString());
    return new Response('This route is no longer available.', { status: 410, headers });
  }

  const response = await env.ASSETS.fetch(request);
  if (response.status === 404) return withReleaseHeaders(response, env.RELEASE, request.method);
  return withReleaseHeaders(response, env.RELEASE, request.method);
}
