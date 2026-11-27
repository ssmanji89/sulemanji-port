# Site delivery and cutover

Status: prepared locally; no Cloudflare resource or DNS change has occurred.

## Default delivery

GitHub Pages remains selected unless the repository variable SITE_DEPLOY_TARGET is set to cloudflare. Pull requests build and qualify the same source but cannot receive deployment credentials. Pages remains the rollback target until staging has passed a full route review and production cutover is explicitly scheduled.

## Required GitHub configuration

Create separate GitHub environments named cloudflare-staging and cloudflare-production. Scope a distinct Cloudflare API token and account ID to each environment. The staging token needs only the staging Worker's deploy permissions. The production token needs Worker deployment permissions and, for initial custom-domain attachment, the zone permissions required to attach www.sulemanji.com.

Staging also needs CLOUDFLARE_STAGING_HOST, the exact HTTPS workers.dev hostname returned by the first authorized staging deployment. Production attaches the custom domain www.sulemanji.com. The zone ID, account ID, existing DNS record, Cloudflare access scope, and certificate state remain unverified until the Cloudflare connection is reauthenticated.

## Deploy flow

1. A trusted main push builds and qualifies one _site artifact. The release manifest binds its source SHA, all asset digests, UTC build time, and 55 preserved article URLs/dates.
2. SITE_DEPLOY_TARGET=pages uses the existing Pages deploy action. SITE_DEPLOY_TARGET=cloudflare uploads that exact artifact and routes it to the selected Worker.
3. Staging runs only after a manual workflow dispatch selecting staging. Production runs only from a main push or a manual main dispatch selecting production. Both paths reject a mismatched artifact SHA or digest.
4. The deploy script reads the active Worker version and then checks Writing, one article, one project page, retired intake behavior, a missing route, and the public release manifest. It writes the receipt under the runner's private temporary directory; Actions stores that receipt as a private workflow artifact.

For an authorized local staging run, build and qualify _site, then run:

    SITE_DEPLOY_TARGET=cloudflare scripts/deploy_site.sh --environment staging --source-commit FULL_SHA --artifact _site

For production, the source SHA must still equal the current remote main. The script checks that condition before calling Wrangler:

    SITE_DEPLOY_TARGET=cloudflare scripts/deploy_site.sh --environment production --source-commit FULL_SHA --artifact _site

## DNS and certificate gate

The production Worker is configured on the existing Workers Route www.sulemanji.com/*. On 2026-11-26, public DNS returned A records 172.67.154.7 and 104.21.4.57, AAAA records 2606:4700:3031::ac43:9a07 and 2606:4700:3033::6815:439, and Cloudflare nameservers rayne.ns.cloudflare.com and seamus.ns.cloudflare.com. The proxied DNS response does not reveal the underlying record type or target; confirm those fields and proxy state in the authorized account before deployment. Cloudflare requires an existing proxied DNS record for a Worker route.

No DNS record or certificate change is part of the planned route attachment. Live HTTPS returned HTTP 200 on 2026-11-26; the certificate subject is CN=sulemanji.com, issuer Google Trust Services WE1, validity 2026-11-08 through 2027-02-06. Verify the current record is proxied and certificate still matches www before deployment. After attachment, verify HTTPS without bypassing certificate validation, then read back Home, Writing, an article, a work page, robots.txt, sitemap.xml, and release.json. Only after that readback should SITE_DEPLOY_TARGET switch to cloudflare.

## Recovery

For an application regression while the existing DNS and HTTPS route are healthy, use Wrangler's deployment rollback against the prior recorded Worker version:

    cd cloudflare
    ./node_modules/.bin/wrangler rollback --config wrangler.site.jsonc VERSION_ID

Then repeat the public route and release-manifest checks. To send traffic back to the unchanged GitHub Pages origin, delete the recorded Workers Route through the Cloudflare API using the observed zone and route IDs:

    curl --fail-with-body -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/workers/routes/$ROUTE_ID" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"

Verify the route is absent and the Pages origin serves the canonical paths again. The route ID, zone ID, and API token remain live account values and are not guessed or stored in this repository. If the DNS record itself has changed outside this plan, restore the exact pre-change value captured in the private preflight record and verify HTTPS externally.

The exact DNS restoration command, zone/account identifiers, staging host, prior Worker version, and observed certificate details are release-gate data and must be filled from live authorized readback. Do not infer them from local Wrangler configuration.
