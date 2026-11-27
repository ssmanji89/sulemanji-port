# Site delivery and recovery

The site is built with Jekyll and deployed as static assets through Cloudflare. The canonical visitor host is `https://www.sulemanji.com`; the apex host redirects there. This document describes the delivery process, not the current live release or maintenance state.

## Build and release checks

Run the repository's full qualification gate:

```sh
bash scripts/check_site_release.sh
```

The build produces a release manifest with the source revision, asset digest, build time, and preserved article identities. It generates static response headers from that manifest. The release verifier rejects missing or mismatched headers before deployment; Worker-generated responses retain their own release identity.

Production deployment requires an authorized credential held in the CI provider's protected secret store with only the permissions required for deployment. Do not put credentials in source, ordinary environment files, release records, or chat.

Deploy only the exact qualified main artifact. After deployment, read back the public canonical host and verify the source identity, static pages, article paths and dates, feed, sitemap, social image, retired route, missing route, and apex redirect. An HTTP 200 alone does not establish release identity.

## DNS, TLS, and recovery

No DNS or nameserver change is planned. Verify the current DNS proxy state, route attachment, certificate hostname, issuer, and expiry from the authorized account immediately before any routing change. Keep the last verified site available until canonical-host readback succeeds.

- **Static assets:** use the previous recorded deployment version and verify its public identity and routes afterward.
- **Source and articles:** revert only the reviewed source change. Preserve newer articles, existing URLs and dates, and their publication history.
- **Editorial state:** keep the publisher paused during recovery. Inspect the exact database and durable effects before restoring from a recorded recovery point; reconcile later writes separately.
- **Routing:** restore only the exact recorded route or DNS value that changed. Do not change nameservers as a rollback shortcut.

Keep account and resource identifiers, deployment receipts, DNS/certificate observations, and recovery points in access-controlled operating records. Do not publish those details or credentials.
