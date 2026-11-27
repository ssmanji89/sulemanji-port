import { serveSite, type RouteRule, type SiteEnv } from './routes.js';
import routeConfig from '../../config/site-routes.json' with { type: 'json' };

interface Env {
  ASSETS: SiteEnv['ASSETS'];
  SOURCE_COMMIT: string;
  ASSET_DIGEST: string;
  BUILT_AT: string;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return serveSite(request, {
      ASSETS: env.ASSETS,
      RELEASE: { source_commit: env.SOURCE_COMMIT, asset_digest: env.ASSET_DIGEST, built_at: env.BUILT_AT },
    }, routeConfig as RouteRule[]);
  },
};
