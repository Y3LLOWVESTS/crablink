

````markdown
# CrabLink Extension for Chrome — Blueprint

RO:WHAT — Browser-extension blueprint for the CrabLink Extension for Chrome.  
RO:WHY — Defines the secure MVP architecture for resolving `crab://` links, viewing b3 asset pages, and connecting browser UX to RustyOnions.  
RO:INTERACTS — Chrome Manifest V3, `svc-gateway`, RustyOnions WEB3_2 product routes, local extension storage, future shared CrabLink browser-client helpers.  
RO:INVARIANTS — Thin client only; no private-key custody in MVP; no silent ROC spending; `svc-gateway` is the only backend target.  
RO:SECURITY — Minimal permissions, local gateway allowlist, token redaction, explicit paid-action prompts, no direct internal service calls.  
RO:TEST — Manual extension checklist, `scripts/check-chrome.sh`, local gateway smoke, future browser-extension automated tests.

---

## 0. Purpose

The **CrabLink Extension for Chrome** is the first browser-facing client for RustyOnions.

Its purpose is to make RustyOnions product routes usable from a normal browser without building a full custom browser yet.

The extension should let a user:

```text
- connect to a local RustyOnions gateway
- check gateway health/readiness
- resolve crab:// links
- view typed b3 asset pages
- resolve named crab:// sites
- prepare future paid ROC actions safely
- copy canonical b3 and crab:// identifiers
- understand backend errors clearly
```

The extension is not the backend. It is not a wallet. It is not a ledger. It is not a storage node. It is not a RustyOnions service.

It is a thin, secure, user-facing browser client.

---

## 1. Product Goal

The immediate product goal is:

```text
Build a safe, dependency-light Chrome extension that proves normal browser users can interact with RustyOnions crab:// links and b3 asset pages through svc-gateway.
```

The longer-term CrabLink goal is:

```text
Prove the browser UX first as an extension, then later grow CrabLink into a full browser or browser shell.
```

The Chrome extension comes first.

The full CrabLink browser comes later.

---

## 2. Non-Negotiable Invariants

These rules must not be violated to make the demo easier.

### 2.1 Client Boundary Invariants

```text
- The extension is a browser client only.
- The extension calls public svc-gateway routes only.
- The extension does not call omnigate directly.
- The extension does not call svc-storage directly.
- The extension does not call svc-index directly.
- The extension does not call svc-wallet directly.
- The extension does not call ron-ledger directly.
- The extension does not mutate backend truth.
- The extension does not infer backend truth from local state.
- The extension displays backend truth returned by svc-gateway.
```

### 2.2 Wallet / ROC Invariants

```text
- No silent ROC spending.
- No fake receipts.
- No local balance truth.
- No local ledger truth.
- No hidden hold/capture/release action.
- No paid action without explicit user confirmation.
- No stored uncapped spend authority.
- No direct ledger mutation.
- No direct wallet mutation in MVP.
```

The extension may display wallet account labels or receipt summaries returned by the backend, but the backend remains the source of truth.

### 2.3 Identity / Passport Invariants

```text
- Passport subject strings may be stored as user preferences.
- Private passport keys are not stored in MVP.
- Seed phrases are not accepted in MVP.
- Wallet spend authority is not stored in MVP.
- Alt passport authority is not assumed.
- The extension does not invent passport permissions.
```

The MVP can show a configured identity label, but real identity, capability, and authorization remain backend-owned.

### 2.4 Content Addressing Invariants

```text
- Internal content IDs use b3:<64 lowercase hex>.
- Public typed asset URLs use crab://<64 lowercase hex>.<asset_kind>.
- Named site URLs use crab://<site_name>.
- Names are human pointers.
- b3 hashes are canonical content identifiers.
- The extension may do light input validation.
- Backend validation remains canonical.
```

The extension must never generate the legacy public form:

```text
crab://b3/<hash>.<kind>
```

New public UX must use:

```text
crab://<hash>.<kind>
```

---

## 3. MVP Scope

### 3.1 In Scope Now

```text
- Manifest V3 Chrome extension
- popup UI
- options UI
- background service worker
- local extension settings
- health/readiness checks
- crab:// input normalization
- b3 asset helper
- site resolver helper
- fetch wrapper for svc-gateway
- safe error display
- copy/display support
- manual test checklist
```

### 3.2 Explicitly Out of Scope for MVP

```text
- private-key custody
- seed phrase import/export
- wallet signing
- native messaging
- background payment automation
- hidden page navigation interception
- direct internal service calls
- custom browser engine
- broad <all_urls> permissions
- webRequest blocking
- production payment automation
- Chrome Web Store release automation
```

---

## 4. Current Architecture

### 4.1 High-Level Flow

```text
Chrome user
  ↓
CrabLink Extension popup/options/content helper
  ↓
svc-gateway public HTTP routes
  ↓
omnigate product hydration
  ↓
svc-storage / svc-index / wallet/accounting/rewarder as needed by backend
  ↓
svc-gateway response
  ↓
CrabLink UI result card
```

The extension should know as little as possible about the internal RustyOnions service mesh.

### 4.2 Local Folder Layout

```text
extensions/chrome/
  manifest.json
  README.md

  docs/
    BLUEPRINT.md

  src/
    background.js
    content.js
    popup.html
    popup.js
    options.html
    options.js
    styles.css
    ronClient.js
    storage.js
    crab.js

  assets/
    icons/
      icon16.png
      icon32.png
      icon48.png
      icon128.png

  test/
    manual-checklist.md
    fixtures/
      asset-page.sample.json
      site-page.sample.json
      problem.not-found.json
      problem.policy-denied.json
```

---

## 5. File Responsibilities

### `manifest.json`

Defines the Chrome extension identity, permissions, popup entrypoint, options page, background service worker, icons, and local gateway host permissions.

The manifest must stay minimal. New permissions require a clear reason in this blueprint or a follow-up design note.

### `src/background.js`

Owns install-time defaults and lightweight runtime coordination.

It must not store durable runtime truth. Manifest V3 service workers can shut down when idle, so durable preferences belong in `chrome.storage.local`, not background globals.

### `src/content.js`

Owns optional page-level helper behavior.

For MVP, it must not hijack navigation or inject broad page behavior. Later it may support user-triggered `activeTab` scans for `crab://` links.

### `src/popup.html`

Defines the main extension popup UI.

It should provide gateway status, configured passport/wallet labels, crab URL input, resolve controls, result display, and error display.

### `src/popup.js`

Owns popup behavior.

It loads settings, creates the `RonClient`, checks node status, normalizes user input, calls gateway routes, renders results, and displays errors safely.

### `src/options.html`

Defines the settings UI.

It should let the user configure gateway URL, passport subject label, wallet account label, optional dev token, and safety settings.

### `src/options.js`

Owns options-page behavior.

It validates settings, stores preferences through `storage.js`, and avoids logging or exposing sensitive values.

### `src/styles.css`

Owns shared popup/options styling.

It should keep the UI readable, compact, and clear about online/offline/error states.

### `src/ronClient.js`

Owns all HTTP calls to `svc-gateway`.

No other extension file should manually build backend fetch calls unless there is a strong reason. This keeps headers, timeouts, error mapping, correlation IDs, and future idempotency behavior centralized.

### `src/storage.js`

Owns extension storage defaults and read/write helpers.

It should decide what is durable, what is session-only later, and what must never be stored.

### `src/crab.js`

Owns lightweight browser-side input normalization.

It may recognize raw hashes, `b3:<hash>`, `crab://<hash>.<kind>`, and `crab://<site_name>`, but backend parsing remains canonical.

---

## 6. Backend Route Contract

The extension should initially target these public `svc-gateway` routes:

```text
GET  /healthz
GET  /readyz
GET  /crab/resolve?url=...
GET  /b3/:hash.kind
GET  /sites/:name
POST /paid/o/prepare
POST /assets/image/prepare
POST /assets/image
POST /sites/prepare
POST /sites
```

MVP route priority:

```text
1. GET /healthz
2. GET /readyz
3. GET /b3/:hash.kind
4. GET /sites/:name
5. GET /crab/resolve?url=...
```

Paid or mutating routes come later and must require explicit user confirmation.

---

## 7. Request Policy

Every backend request should go through `RonClient`.

### 7.1 Required Behaviors

```text
- Normalize gateway base URL.
- Use fetch().
- Set Accept: application/json.
- Use AbortController timeouts.
- Attach x-correlation-id.
- Attach Authorization only if configured.
- Attach x-ron-passport only if configured.
- Attach x-ron-wallet-account only if configured.
- Attach Idempotency-Key for mutating requests.
- Parse JSON safely.
- Surface backend errors clearly.
- Never log sensitive headers.
```

### 7.2 Correlation ID Format

Use:

```text
crablink-<timestamp>-<random>
```

Example:

```text
crablink-1777500000000-a1b2c3d4
```

### 7.3 Idempotency Key Format

For mutating operations:

```text
crablink-idem-<timestamp>-<random>
```

Each mutation attempt must get its own idempotency key unless the user is intentionally retrying the same operation.

---

## 8. Storage Policy

### 8.1 Durable Settings Allowed in MVP

These may be stored in `chrome.storage.local`:

```text
schemaVersion
gatewayUrl
passportSubject
walletAccount
requireSpendConfirm
devMode
requestTimeoutMs
lastCrabUrl
recentReceipts metadata
```

### 8.2 Sensitive / Restricted Values

These must not be stored in MVP:

```text
private keys
seed phrases
raw wallet signing keys
uncapped spend authority
recovery phrases
production bearer tokens without a future secure design
ledger truth
wallet balance truth
asset ownership truth
```

### 8.3 Dev Token Handling

The current `authToken` field is a dev convenience only.

Rules:

```text
- Treat it as sensitive.
- Do not console.log it.
- Do not render it outside password fields.
- Do not include it in copied debug output.
- Do not send it to non-gateway hosts.
- Redact it from future error reports.
```

Before production, token handling needs a stricter capability/passport design.

---

## 9. Permission Policy

### 9.1 MVP Permissions

The MVP should use:

```json
{
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "http://127.0.0.1:*/*",
    "http://localhost:*/*"
  ]
}
```

### 9.2 Avoid in MVP

```text
<all_urls>
tabs
history
cookies
downloads
webRequest
webRequestBlocking
nativeMessaging
unlimitedStorage
declarativeNetRequest
clipboardRead
```

### 9.3 Permission Escalation Rule

Any new permission requires:

```text
- exact feature requiring it
- exact Chrome API requiring it
- user-visible reason
- security risk
- safer alternative considered
- test proving the permission is used correctly
```

---

## 10. UI / UX Principles

### 10.1 General UX

The extension should be:

```text
- clear
- compact
- honest
- developer-friendly
- safe by default
- explicit about backend failures
```

### 10.2 Status Display

Node status should show:

```text
online
degraded
offline
checking
error
```

Do not hide backend failure. A failed `/readyz` is useful information.

### 10.3 Result Display

Asset/site result cards should show:

```text
kind
b3 content ID
crab URL
site name if applicable
manifest status if provided
storage status if provided
receipt summary if provided
raw JSON collapsed or formatted
```

### 10.4 Error Display

Errors should include:

```text
friendly summary
route/action that failed
HTTP status if known
backend reason if known
correlation ID if available
safe retry hint if obvious
```

Errors must not include raw auth tokens.

---

## 11. Paid Action Safety Model

Paid actions are not the MVP’s first milestone, but the safety model must exist now.

### 11.1 Paid Action Requirements

Before any paid action:

```text
- show operation type
- show target asset/site
- show payer account
- show passport subject
- show amount if known
- show hold/capture/release stage if known
- show backend route
- require explicit user confirmation
```

### 11.2 Forbidden Paid Behaviors

```text
- auto-confirm payment
- run paid mutation from content script without popup/user prompt
- retry paid mutation without explaining the retry
- display payment success without backend receipt
- display capture success without backend confirmation
- hide release/capture failures
```

### 11.3 Receipt Rules

Receipt display must be backend-derived.

The extension may cache recent receipt summaries, but those summaries are convenience UI only. They are not economic truth.

---

## 12. Threat Model

### 12.1 Main Threats

```text
- token leakage
- malicious page influencing extension action
- broad permission overreach
- fake payment success UI
- stale local state mistaken for backend truth
- wrong gateway URL
- user confusion around dev/prod mode
- extension calling internal services directly
- accidental silent spend path
- unsafe future content script injection
```

### 12.2 MVP Mitigations

```text
- minimal permissions
- localhost/127.0.0.1 host permissions only
- all backend calls centralized in ronClient.js
- no private key handling
- no seed phrase handling
- no direct wallet/ledger calls
- explicit paid-action future gate
- redacted error handling
- clear dev mode indicator
- manual extension checklist
```

### 12.3 Future Mitigations

```text
- capability-scoped short-lived tokens
- secure passport handoff design
- optional session-only token storage
- origin allowlist for content script behavior
- signed release builds
- automated extension tests
- permission audit in CI
- route-contract fixtures
```

---

## 13. Build / Dependency Strategy

The MVP should remain:

```text
plain JavaScript
plain HTML
plain CSS
Manifest V3
no npm
no bundler
no React
no Vite
no build step
```

This is intentional.

Benefits:

```text
- fewer dependencies
- less supply-chain risk
- faster load-unpacked testing
- easier debugging
- easier AI review through codebundles
- easier beta iteration
```

Later, after UX stabilizes, the project may move to:

```text
TypeScript
Vite
React
Vitest
Playwright extension tests
shared package builds
```

That should be a deliberate migration, not the MVP default.

---

## 14. Testing Strategy

### 14.1 Current Manual Tests

Use:

```text
extensions/chrome/test/manual-checklist.md
```

Manual gates:

```text
- extension loads unpacked
- options page opens
- settings save
- popup reads settings
- node status works
- offline state works
- invalid hash rejects locally
- valid crab asset route calls gateway
- valid site route calls gateway
- no paid action happens automatically
- extension permissions are minimal
```

### 14.2 Script Checks

Use:

```text
scripts/check-chrome.sh
scripts/smoke-local-gateway.sh
scripts/package-chrome.sh
```

### 14.3 Future Automated Tests

Future tests should cover:

```text
crab.js normalization
storage.js defaults
ronClient.js error mapping
permission audit
manifest validation
fixture rendering
popup smoke
options smoke
offline gateway behavior
policy denied behavior
not found behavior
```

---

## 15. Observability / Debuggability

The extension should help debugging without leaking secrets.

### 15.1 Safe Debug Info

Safe to show:

```text
gateway URL
route path
HTTP status
correlation ID
backend reason
dev/prod mode
ready/health status
```

### 15.2 Unsafe Debug Info

Do not show or log:

```text
Authorization header
full bearer token
private keys
seed phrases
raw capability secrets
wallet signing material
```

### 15.3 Future Debug Panel

A future developer panel may show:

```text
last request route
last status code
last correlation ID
last safe backend reason
gateway health summary
```

But it must redact all sensitive values.

---

## 16. Versioning

Initial version:

```text
0.1.0
```

Version meaning:

```text
0.1.x — local MVP scaffold / internal testing
0.2.x — route resolution and result-card UX
0.3.x — prepare flows and receipt display scaffolding
0.4.x — beta hardening
1.0.0 — stable public beta candidate
```

---

## 17. Roadmap

### Phase 1 — MVP Scaffold

```text
- manifest
- popup
- options
- background defaults
- local settings
- health/readiness checks
- basic resolver
```

### Phase 2 — Asset and Site UX

```text
- b3 asset card
- site card
- copy buttons
- clearer problem responses
- canonical crab URL display
```

### Phase 3 — Product Prepare Flows

```text
- image prepare
- site prepare
- paid object prepare
- show hold estimate
- show required wallet/account/passport info
```

### Phase 4 — Paid Flow Safety

```text
- explicit confirmation prompt
- receipt card
- receipt history
- policy denied handling
- failed capture/release display
```

### Phase 5 — Content Script Helper

```text
- activeTab-triggered crab link scan
- “Open with CrabLink” helper
- no broad automatic navigation hijacking
```

### Phase 6 — Multi-Browser Foundation

```text
- shared JS helpers
- shared schemas
- Firefox extension
- Edge extension
- Safari extension
```

### Phase 7 — Future CrabLink Browser

```text
- full browser or browser shell
- native crab:// support
- native RON Passport UX
- native RustyOnions app/site navigation
```

---

## 18. Acceptance Gates

The extension is not MVP-complete until all of these are true:

```text
- loads unpacked in Chrome
- manifest has minimal permissions
- popup opens with no console errors
- options page saves settings
- popup reads settings
- /healthz check works
- /readyz check works
- offline gateway state displays cleanly
- crab://<hash>.<kind> input normalizes correctly
- b3:<hash> input normalizes correctly
- raw 64-char hash normalizes correctly
- named crab://<site_name> input normalizes correctly
- invalid input fails safely
- backend errors display clearly
- no token appears in visible error output
- no paid action executes automatically
- no private key or seed phrase field exists
- scripts/check-chrome.sh passes
```

---

## 19. Review Checklist

Before merging extension changes, check:

```text
- Did this add a permission?
- Did this add a new backend route?
- Did this call anything other than svc-gateway?
- Did this store anything sensitive?
- Did this add a paid action path?
- Does the paid path require confirmation?
- Does the UI distinguish backend truth from local state?
- Are errors useful but redacted?
- Does the code avoid broad page injection?
- Does the code preserve crab://<hash>.<kind> public URL format?
- Does scripts/check-chrome.sh still pass?
- Should CODEBUNDLE_CHROME_EXTENSION.md be regenerated?
```

---

## 20. Core Principle

The CrabLink Extension for Chrome should make RustyOnions feel real in the browser while keeping the dangerous things out of the browser.

The browser client should be:

```text
thin
honest
safe
explicit
local-first
gateway-only
receipt-driven
permission-minimal
future-browser-ready
```

The extension proves the UX.

RustyOnions remains the source of truth.
````
