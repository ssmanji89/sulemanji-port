# Crawler access and verification

`_data/crawler-policy.yml` is the source policy for origin `robots.txt` generation and
release verification. It permits the named search and user-retrieval clients. It preserves
the 32 existing restricted client tokens without claiming that every token has one purpose.
The content signal permits search and reference use while reserving AI training use.

## Source and edge boundary

The repository controls the GitHub Pages origin. Cloudflare can replace or extend origin
robots output and can deny requests before they reach the origin. A source build proves only
the origin artifact. A Cloudflare readback and live request prove separate edge state.

The intended Bot Management correction disables blocking for `ai_search` and `ai_user` only:

```text
PUT /zones/{zone_id}/bot_management
{"ai_search":"disabled","ai_user":"disabled"}
```

The operator must resolve the zone by domain through the authorized connection. Keep the zone
identifier, account snapshot, and credentials private. Confirm the current API accepts this PUT
shape before use.

## Apply and rollback

1. Read Bot Management, Browser Integrity Check, and effective robots state.
2. Store a private before snapshot. Do not place it in Git or a pull request.
3. Confirm `ai_training`, Bot Preference Sync, managed robots, and security controls remain set.
4. Apply only `ai_search=disabled` and `ai_user=disabled` after production authorization.
5. Read every relevant field again. Compare the complete relevant state to the snapshot.
6. Roll back with the actual before values if any unrelated field changes.

Source rollback uses a reviewed Git revert. Edge rollback uses the private before snapshot.
Neither rollback substitutes for the other.

## Live verification

Run `scripts/smoke_discovery_live.py` with an honest client identity. The script checks both
canonical hosts, effective robots, Writing, Atom, sitemap, and a selected article. It reports
denials and managed-policy conflicts. It does not spoof a crawler or bypass a challenge.

HTTP success does not prove crawler access, indexing, rankings, citations, or leads. Use Search
Console and actual crawler or event evidence when available. Record those outcomes as unknown
when that evidence is unavailable.

