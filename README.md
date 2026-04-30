# CrabLink

CrabLink is the browser-client layer for RustyOnions. It starts with the **CrabLink Extension for Chrome**, which connects to local RustyOnions gateways, resolves `crab://` links, displays b3 asset pages, and prepares the browser-facing UX for future ROC/Web3 workflows.

The long-term goal is to grow CrabLink into a full RustyOnions browser experience. For now, the focus is intentionally narrow: build a safe, minimal, useful Chrome extension first.

---

## Current Focus: CrabLink Extension for Chrome

The first product target is the **CrabLink Extension for Chrome**.

The Chrome extension should:

- Connect to a local RustyOnions `svc-gateway`
- Check `/healthz` and `/readyz`
- Resolve `crab://<hash>.<kind>` asset links
- Resolve `crab://<site_name>` site links
- View b3 asset page responses
- Display site/page hydration responses
- Prepare the UX for paid ROC actions
- Keep user approval required before any paid action
- Stay thin, safe, and dependency-light

The MVP should not become a wallet, ledger, storage node, index node, or backend hydrator.

---

## Future Goal: CrabLink Browser

After the extension proves the UX and backend contract, CrabLink can grow into a dedicated browser or browser shell for RustyOnions.

Future browser ideas include:

- Native `crab://` navigation
- Built-in RustyOnions gateway discovery
- First-class b3 asset pages
- Local RON Passport UX
- Safer paid action prompts
- Built-in creator/site/app workflows
- Developer tools for RustyOnions apps and sites

The browser is a future milestone. The Chrome extension comes first.

---

## Repository Layout

```text
docs/                 Blueprints, route contracts, security model, and UX notes.
extensions/chrome/    CrabLink Extension for Chrome.
extensions/firefox/   Future CrabLink Extension for Firefox.
extensions/edge/      Future CrabLink Extension for Edge.
extensions/safari/    Future CrabLink Extension for Safari.
shared/               Shared browser-client helpers, schemas, and fixtures.
browser/              Future full CrabLink browser or browser shell.
scripts/              Local checks, packaging, and smoke helpers.
tools/                Future developer tooling.