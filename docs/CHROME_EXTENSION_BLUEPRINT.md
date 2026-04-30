# Chrome Extension Blueprint

The CrabLink Extension for Chrome is the first browser-client target for RustyOnions.

## Purpose

The extension provides a browser-facing UX for:

- configuring a local RustyOnions `svc-gateway`
- checking `/healthz` and `/readyz`
- resolving `crab://` links
- viewing b3 asset pages
- viewing named site pages
- preparing future paid image/site workflows safely

## MVP goals

- Dependency-free Manifest V3 extension.
- Plain JavaScript, HTML, and CSS.
- Minimal permissions.
- Local gateway configuration.
- Health and readiness checks.
- `crab://<hash>.<kind>` asset resolution.
- `crab://<site_name>` site resolution.
- Safe error display.

## MVP non-goals

- No private-key custody.
- No seed phrase import.
- No silent ROC spending.
- No fake receipts.
- No direct ledger mutation.
- No full custom browser engine.

## Boundary

The extension should call public `svc-gateway` routes only. It should not call `ron-ledger`, `svc-wallet`, `svc-storage`, `svc-index`, or `omnigate` directly.
