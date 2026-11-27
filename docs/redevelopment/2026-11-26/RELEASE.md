# Release verification

This public note documents the public-site verification interface. Current release state, account/resource identifiers, deployment receipts, and private operating evidence belong in access-controlled records.

The verifier first validates the exact local artifact manifest and files, then requires the public manifest to match it. It checks public canonical routes, source/digest/build-time response headers, expected page metadata and headings, manifest-bound visible text on key pages and articles, content types, preserved article URLs and dates, discovery, retired routes, and redirect behavior. It checks public site behavior only; it does not qualify background operation.

```sh
python3 scripts/verify_cloudflare_live.py \
  --base-url https://www.sulemanji.com \
  --expected-commit RELEASE_SHA \
  --manifest _site/release.json
```

Use the manifest from the exact built artifact. Keep credentials, resource identifiers, internal design, and operational receipts out of public Git history.
