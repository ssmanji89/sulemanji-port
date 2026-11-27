# Release verification

This public note documents the public-site verification interface. Current release state, account/resource identifiers, deployment receipts, and private operating evidence belong in access-controlled records.

The verifier first validates the exact local artifact manifest and files, then requires the public manifest to match it. It checks public canonical routes, source/digest/build-time response headers, expected page metadata and headings, manifest-bound visible text on key pages and articles, content types, preserved article URLs and dates, discovery, retired routes, and redirect behavior. It checks public site behavior only; it does not qualify background operation.

```sh
python3 -m scripts.verify_cloudflare_live \
  --base-url https://www.sulemanji.com \
  --expected-commit RELEASE_SHA \
  --manifest _site/release.json
```

For the isolated HTTPS staging Worker, use its configured host as `--base-url`
and add `--staging`. The verifier still requires canonical production metadata
and source links, but fetches the candidate pages and social image from staging
and leaves the production apex redirect check to the production run.

Use the manifest from the exact built artifact. Keep credentials, resource identifiers, internal design, and operational receipts out of public Git history.
