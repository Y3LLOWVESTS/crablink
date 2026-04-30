# Contributing to CrabLink

CrabLink is the browser-client layer for RustyOnions.

## Rules

- Keep browser clients thin.
- Call public `svc-gateway` routes only.
- Do not call internal services directly from the extension.
- Do not silently spend ROC.
- Do not fake receipts.
- Do not store private keys or seed phrases in the MVP.
- Use minimal browser permissions.
- Keep the first Chrome MVP dependency-free.

## First target

The first target is the CrabLink Extension for Chrome using Manifest V3, plain JavaScript, plain HTML, and plain CSS.
