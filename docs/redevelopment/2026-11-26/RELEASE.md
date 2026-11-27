# Release verification

This public note documents the public-site verification interface. Current release state, account/resource identifiers, deployment receipts, and private operating evidence belong in access-controlled records.

The verifier checks public canonical routes, release identity, page metadata and expected headings, content types, article identity and discovery, retired routes, and redirect behavior. It checks public site behavior only; it does not qualify background operation.

```sh
python3 scripts/verify_cloudflare_live.py \
  --base-url https://www.sulemanji.com \
  --expected-commit RELEASE_SHA \
  --expected-digest RELEASE_DIGEST
```

Use the source revision and digest from the exact built artifact. Keep credentials, resource identifiers, internal design, and operational receipts out of public Git history.
