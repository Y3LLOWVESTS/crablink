### BEGIN NOTE - APRIL 29 2026 - 23:00 CST


````markdown
# CrabLink / RustyOnions WEB3_2 Carryover Notes — Chrome Extension + Passport Next Steps

## 0. Current checkpoint

We created the separate browser-client repo:

```text
crablink
````

GitHub repo:

```text
https://github.com/Y3LLOWVESTS/crablink.git
```

Product naming decisions:

```text
- Repo: crablink
- Future full browser: CrabLink
- Browser extensions: CrabLink Extension
- First extension target: Chrome
```

The repo is intentionally separate from the RustyOnions core repo. This is the right boundary. RustyOnions remains the backend/substrate/value-plane repo. CrabLink is the browser-client repo.

The current extension is a thin browser client. It is not a wallet, not a ledger, not storage, not index, and not a backend service.

Current high-level purpose:

```text
CrabLink Extension for Chrome lets normal browser users interact with RustyOnions crab:// links, b3 asset pages, and future RON Passport / ROC flows through svc-gateway.
```

The extension must remain gateway-only. It should not call internal services directly.

---

## 1. Current repo scaffold

The repo scaffold currently includes:

```text
README.md
LICENSE
CONTRIBUTING.md
SECURITY.md
CHANGELOG.md
.gitignore
CODEBUNDLE_CHROME_EXTENSION.md

assets/
  logo.png

docs/
  CHROME_EXTENSION_BLUEPRINT.md
  EXTENSION_SECURITY_MODEL.md
  CRAB_URL_UX.md
  BACKEND_ROUTE_CONTRACTS.md
  FUTURE_BROWSER_PLAN.md

extensions/
  chrome/
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
        logo.png
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

  firefox/
    README.md
    PLACEHOLDER.md

  edge/
    README.md
    PLACEHOLDER.md

  safari/
    README.md
    PLACEHOLDER.md

shared/
  js/
    crab.js
    ronClient.js
    storageSchema.js
    errors.js
    ids.js

  schemas/
    asset-page.schema.json
    site-page.schema.json
    problem.schema.json
    extension-settings.schema.json

  fixtures/
    asset-page.sample.json
    site-page.sample.json
    problem.not-found.json
    problem.policy-denied.json

browser/
  README.md
  FUTURE.md

scripts/
  check-chrome.sh
  package-chrome.sh
  smoke-local-gateway.sh
  make_codebundle.sh

tools/
  README.md
```

Important note: the user may have named the codebundle generator:

```text
scripts/make_codebundle.sh
```

not the earlier name:

```text
scripts/make_chrome_codebundle.sh
```

Use the current repo file name.

---

## 2. Current extension state

The Chrome extension loads successfully from:

```text
extensions/chrome
```

The popup renders successfully in Chrome.

Current visible UI includes:

```text
- CrabLink logo
- CrabLink title
- RustyOnions browser client subtitle
- online/offline badge
- gateway URL display
- passport label display
- wallet label display
- Check Node button
- Settings button
- crab:// / b3 CID / raw hash input
- default asset kind selector
- Resolve button
- Clear button
- safety notes
```

The extension currently shows offline when the gateway is not running, which is expected. It tries to hit:

```text
http://127.0.0.1:8090/healthz
```

Current behavior verified:

```text
Extension loads:       yes
Popup renders:         yes
Settings load:         yes
Health check fires:    yes
Offline error displays: yes
Logo transparency:     fixed
```

The transparent logo issue was resolved using a background-removal tool. The logo now looks clean on the dark header.

---

## 3. Current important files and what they do

### `extensions/chrome/manifest.json`

Chrome Manifest V3 file. Current permissions should remain minimal:

```text
storage
activeTab
```

Current host permissions should remain local gateway only:

```text
http://127.0.0.1:*/*
http://localhost:*/*
```

Do not add broad permissions unless absolutely necessary.

Avoid for now:

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
clipboardRead
```

### `extensions/chrome/src/storage.js`

Owns durable extension settings.

Current settings include roughly:

```text
schemaVersion
gatewayUrl
passportSubject
walletAccount
authToken
requireSpendConfirm
devMode
requestTimeoutMs
lastCrabUrl
recentReceipts
```

Important invariant: extension local storage is convenience state only. It is not backend truth.

### `extensions/chrome/src/crab.js`

Owns local lightweight input normalization for:

```text
raw 64-character hashes
b3:<64 lowercase hex>
crab://<64 lowercase hex>.<asset_kind>
crab://<site_name>
```

Important current public asset URL format:

```text
crab://<64 lowercase hex>.<asset_kind>
```

Do not reintroduce the old public format:

```text
crab://b3/<hash>.<asset_kind>
```

Internal content IDs remain:

```text
b3:<64 lowercase hex>
```

### `extensions/chrome/src/ronClient.js`

Centralized HTTP client for gateway calls.

Important invariant: all backend HTTP calls from the extension must go through this file.

It currently supports calls like:

```text
GET /healthz
GET /readyz
GET /crab/resolve?url=...
GET /b3/:hash.kind
GET /sites/:name
POST /paid/o/prepare
POST /assets/image/prepare
POST /assets/image
POST /sites/prepare
POST /sites
```

Future passport and wallet calls should also be centralized here.

### `extensions/chrome/src/popup.html` and `popup.js`

Own popup UI and behavior.

Current behavior:

```text
- load settings
- show gateway/passport/wallet labels
- check node health/readiness
- normalize crab/b3 input
- resolve asset or site through gateway
- render result card
- copy crab URL / b3 CID / JSON
```

### `extensions/chrome/src/options.html` and `options.js`

Own settings UI and settings validation.

Current settings page includes:

```text
gateway URL
request timeout
passport subject label
wallet account label
dev bearer/cap token
require spend confirmation
dev mode
test gateway
clear token
save/reset
```

### `extensions/chrome/src/styles.css`

Owns the popup/options visual style.

Logo styling exists through:

```css
.brand-row
.brand-logo
```

The logo now appears cleanly on the dark header.

### `extensions/chrome/docs/BLUEPRINT.md`

This is the Chrome extension local blueprint. It defines the extension’s hard rules:

```text
thin client only
gateway-only backend target
no private-key custody in MVP
no silent ROC spending
no fake receipts
no direct ledger/wallet/storage/index/internal service calls
minimal permissions
explicit paid-action prompts
backend-derived truth only
```

---

## 4. Codebundle workflow

We added a codebundle generator for the Chrome extension. Use it before asking AI to review or patch the extension.

Command:

```bash
scripts/make_codebundle.sh
```

It generates:

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

The script was updated to use four-backtick fences so nested Markdown code blocks render correctly.

Normal check workflow:

```bash
scripts/check-chrome.sh
scripts/make_codebundle.sh
git status
```

Commit workflow after changes:

```bash
git add CODEBUNDLE_CHROME_EXTENSION.md <changed files>
git commit -m "<message>"
git push
```

---

## 5. Current visual/branding state

Logo is now in at least:

```text
assets/logo.png
extensions/chrome/assets/icons/logo.png
extensions/chrome/assets/icons/icon16.png
extensions/chrome/assets/icons/icon32.png
extensions/chrome/assets/icons/icon48.png
extensions/chrome/assets/icons/icon128.png
```

README can embed the repo logo with:

```markdown
<p align="center">
  <img src="assets/logo.png" alt="CrabLink logo" width="140" />
</p>
```

The logo looks clean in the extension header now.

---

## 6. Critical invariants for next work

These are the rules the next instance must preserve.

### 6.1 Extension boundary invariants

```text
- The extension is a thin client.
- The extension calls svc-gateway public routes only.
- The extension does not call svc-passport directly.
- The extension does not call svc-wallet directly.
- The extension does not call ron-ledger directly.
- The extension does not call svc-storage directly.
- The extension does not call svc-index directly.
- The extension does not call omnigate directly unless the gateway contract explicitly says otherwise. Prefer gateway only.
- The extension displays backend truth; it does not invent backend truth.
```

### 6.2 Wallet / ROC invariants

```text
- No silent ROC spending.
- No fake balances.
- No fake receipts.
- No local ledger truth.
- No local wallet truth.
- No hidden hold/capture/release.
- No paid action without explicit confirmation.
- No direct economic mutation outside backend wallet/ledger path.
```

The extension may display a ROC balance returned by the backend, but it must label it as backend-derived and should show the source/status.

### 6.3 Passport invariants

```text
- Passports are identities, not wallets.
- A passport may link to a wallet account, but it is not itself wallet spend authority.
- Alt passports must not automatically inherit main wallet authority.
- Persistent private keys should not be introduced casually.
- If local passport private keys are added later, that needs a separate secure design.
- MVP can support dev/local passport bootstrap without seed phrase UX.
```

### 6.4 Capability invariants

```text
- Capabilities fail closed.
- No ambient authority.
- No long-lived uncapped spend authority stored in Chrome local storage.
- Tokens must be redacted from logs/errors/UI.
- Dev token field is local-development only.
```

### 6.5 URL/content invariants

```text
Internal content ID: b3:<64 lowercase hex>
Public asset URL:   crab://<64 lowercase hex>.<asset_kind>
Public site URL:    crab://<site_name>
```

Do not use:

```text
crab://b3/<hash>.<asset_kind>
```

---

## 7. Recommended next major focus: Passport bootstrap in CrabLink

The next session should focus on adding the **RON Passport bootstrap UX** to the Chrome extension.

User’s product goal:

```text
When the user opens CrabLink:
1. If a passport is already configured/loaded, show it.
2. If no passport exists, offer to create one.
3. After passport creation, automatically load/display the linked ROC balance.
4. New users should receive a small starter ROC balance before they earn more.
```

Important architectural refinement:

```text
The extension should not call svc-passport directly.
The extension should call svc-gateway routes that expose a public identity/passport bootstrap contract.
svc-gateway/omnigate/backend may then talk to svc-passport and svc-wallet internally.
```

This keeps the extension’s security boundary clean.

---

## 8. Passport UX concept

### 8.1 Popup behavior

On popup load:

```text
load settings
check gateway health/ready
check identity state
if passport exists:
  show passport card
  show wallet account
  load ROC balance
else:
  show “Create RON Passport” card
```

Suggested visible states:

```text
Identity: Not set
Identity: Creating...
Identity: Ready
Identity: Error
Wallet: Not linked
Wallet: Linked
ROC: Loading...
ROC: <balance> ROC
```

### 8.2 Settings behavior

Options page should eventually include:

```text
Passport section:
- current passport subject
- current wallet account
- create/reset dev passport button
- refresh identity button
- clear local identity labels button

Wallet section:
- load balance
- show account
- show last receipt/last update
```

### 8.3 First-run flow

Suggested first-run flow:

```text
1. User opens popup.
2. Extension detects no passportSubject or walletAccount.
3. Popup shows a first-run card:
   “Create your local RON Passport”
4. User clicks Create.
5. Extension calls gateway bootstrap route.
6. Backend creates/returns passport subject and linked wallet account.
7. Backend optionally issues starter ROC through the proper wallet/ledger path.
8. Extension saves only safe labels:
   passportSubject
   walletAccount
9. Extension fetches balance.
10. Popup shows:
   Passport ready
   Wallet account
   ROC balance
```

Important: for MVP, this can be a dev/local bootstrap flow. Do not pretend it is production-grade key custody unless backend supports it.

---

## 9. Backend route contracts needed for Passport MVP

The next instance should decide the exact backend route shape. Recommended route family through `svc-gateway`:

```text
GET  /identity/me
POST /identity/passport/bootstrap
GET  /wallet/:account/balance
```

Alternative route names:

```text
GET  /passport/me
POST /passport/bootstrap
GET  /wallet/balance?account=<account>
```

Use whichever is easiest to add consistently to `svc-gateway` and backend contracts later.

Recommended clean contract:

### `GET /identity/me`

Purpose:

```text
Return current identity context from configured headers/token.
```

Request headers from extension:

```text
x-correlation-id
Authorization: Bearer <dev token>          optional dev mode
x-ron-passport: <passport subject>         optional
x-ron-wallet-account: <wallet account>     optional
```

Possible success response:

```json
{
  "schema": "crablink.identity.me.v1",
  "passport": {
    "subject": "passport:main:dev",
    "kind": "main",
    "display_name": "Local Dev Passport",
    "created_at": "2026-04-29T00:00:00Z"
  },
  "wallet": {
    "account": "acct_dev",
    "linked": true
  },
  "capabilities": {
    "can_view_balance": true,
    "can_prepare_paid_actions": true,
    "can_spend": false
  }
}
```

If no identity:

```json
{
  "schema": "crablink.identity.me.v1",
  "passport": null,
  "wallet": null,
  "capabilities": {}
}
```

### `POST /identity/passport/bootstrap`

Purpose:

```text
Create or return a local/dev RON Passport identity and linked wallet account.
```

Request body:

```json
{
  "kind": "main",
  "display_name": "Local Passport",
  "create_wallet": true,
  "starter_grant": true
}
```

Possible response:

```json
{
  "schema": "crablink.identity.bootstrap.v1",
  "passport": {
    "subject": "passport:main:dev",
    "kind": "main",
    "display_name": "Local Passport",
    "created_at": "2026-04-29T00:00:00Z"
  },
  "wallet": {
    "account": "acct_dev",
    "linked": true
  },
  "starter_grant": {
    "issued": true,
    "amount_minor_units": 1000,
    "receipt_id": "receipt_..."
  }
}
```

Important backend invariant:

```text
Starter ROC grant must be issued through svc-wallet → ron-ledger.
The extension must not fake a grant.
```

### `GET /wallet/:account/balance`

Purpose:

```text
Return backend-derived wallet balance.
```

Possible response:

```json
{
  "schema": "crablink.wallet.balance.v1",
  "account": "acct_dev",
  "unit": "ROC",
  "available_minor_units": 1000,
  "held_minor_units": 0,
  "display": "10.00 ROC",
  "as_of": "2026-04-29T00:00:00Z"
}
```

If minor units are integer, display can be computed either by backend or extension from explicit decimals, but do not use floating-point money math for truth. The extension may format a string for UI but backend integer minor units are canonical.

---

## 10. Extension files likely needed for next batch

Likely files to update:

```text
extensions/chrome/src/storage.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
extensions/chrome/test/manual-checklist.md
extensions/chrome/docs/BLUEPRINT.md
shared/schemas/extension-settings.schema.json
shared/schemas/problem.schema.json
```

Possibly add new shared schemas:

```text
shared/schemas/identity-me.schema.json
shared/schemas/passport-bootstrap.schema.json
shared/schemas/wallet-balance.schema.json
```

Possibly add new fixtures:

```text
shared/fixtures/identity-me.empty.sample.json
shared/fixtures/identity-me.ready.sample.json
shared/fixtures/passport-bootstrap.sample.json
shared/fixtures/wallet-balance.sample.json

extensions/chrome/test/fixtures/identity-me.empty.sample.json
extensions/chrome/test/fixtures/identity-me.ready.sample.json
extensions/chrome/test/fixtures/passport-bootstrap.sample.json
extensions/chrome/test/fixtures/wallet-balance.sample.json
```

---

## 11. Extension-side storage changes recommended

Add safe identity/balance convenience fields:

```text
identityStatus
passportSubject
passportDisplayName
passportKind
walletAccount
lastBalanceDisplay
lastBalanceAvailableMinorUnits
lastBalanceHeldMinorUnits
lastBalanceAsOf
lastIdentityRefreshAt
```

Do not store:

```text
private keys
seed phrases
wallet private keys
raw spend authority
long-lived production bearer tokens
ledger truth
unverified balance truth
```

Balance fields in local storage must be treated as UI cache only. The UI should say something like:

```text
Last known balance
```

unless freshly loaded from the backend.

---

## 12. Extension-side RonClient changes recommended

Add methods:

```javascript
async getIdentityMe()
async bootstrapPassport(body)
async getWalletBalance(account)
```

All through `RonClient.request`.

Example route choices:

```javascript
getIdentityMe() {
  return this.request('/identity/me', { label: 'Identity status' });
}

bootstrapPassport(body) {
  return this.request('/identity/passport/bootstrap', {
    method: 'POST',
    body,
    label: 'Passport bootstrap',
    mutation: true
  });
}

getWalletBalance(account) {
  return this.request(`/wallet/${encodeURIComponent(account)}/balance`, {
    label: 'Wallet balance'
  });
}
```

Important: `bootstrapPassport` is a mutation and should attach `Idempotency-Key`.

---

## 13. Popup UI additions recommended

Add a new card near the top, probably after gateway status:

```text
Identity & ROC
```

When no passport:

```text
No RON Passport loaded.
Create a local passport to use CrabLink.
[Create RON Passport]
```

When ready:

```text
Passport: passport:main:dev
Wallet: acct_dev
ROC Balance: 10.00 ROC
[Refresh Balance]
```

Safety note:

```text
This extension stores identity labels only. Wallet and balance truth come from RustyOnions.
```

Potential popup sections:

```text
- Gateway card
- Identity & ROC card
- Crab resolver card
- Result card
- Safety card
```

---

## 14. Options UI additions recommended

Add a “Passport / Wallet” section:

```text
Current passport subject
Current wallet account
Passport display name
Create local passport
Refresh identity
Refresh balance
Clear local identity labels
```

The “clear local identity labels” button should only clear extension-local fields. It should not revoke the backend passport.

A real revoke/delete flow must be designed separately and should require explicit confirmation.

---

## 15. Starter ROC grant idea

User wants new users to receive a small amount of ROC before they can earn more.

Recommended framing:

```text
Starter ROC Grant
```

Purpose:

```text
Let a new local user test storage, site launch, image upload, and paid access flows before earning mechanisms are finalized.
```

Rules:

```text
- Grant must be backend-issued through svc-wallet.
- Grant must be auditable in ron-ledger.
- Grant must have deterministic receipt.
- Grant amount must be config-driven, not hardcoded in the extension.
- Extension only displays the result.
```

Suggested backend config later:

```toml
[starter_grant]
enabled = true
amount_minor_units = 1000
max_grants_per_passport = 1
max_grants_per_device_hint = 1
issuer_account = "acct_system_faucet"
```

Security concerns:

```text
- Faucet abuse
- Duplicate passport creation
- Sybil abuse
- Dev-only vs beta vs production grant policy
```

For early beta, it is acceptable to keep this as dev/local/testnet behavior.

Suggested UI wording:

```text
Starter grant available
Create your local RON Passport and receive starter ROC for testing.
```

Do not say “free money” or imply external value.

---

## 16. Future earning ideas, not immediate blockers

The user is still deciding how users earn ROC.

Candidate earning sources mentioned:

```text
- leaving comments
- performing moderation tasks
- relaying assets
- sharing bandwidth
- pinning/storage contribution
- serving popular content
- curation work
```

Recommended future design direction:

```text
ron-accounting records contribution events.
svc-rewarder consumes sealed accounting/policy signals.
svc-rewarder plans deterministic payouts.
svc-wallet commits reward issuance/transfer.
ron-ledger remains durable truth.
```

Do not implement earning directly in the extension.

The extension can later show:

```text
Earn ROC
- Run a node
- Pin content
- Moderate queue
- Curate assets
- Relay bandwidth
```

But actual reward logic belongs in backend accounting/rewarder/wallet.

---

## 17. Important caution for passport creation in Chrome

The user wants to create a passport in the extension. This needs careful staging.

There are two possible implementation levels:

### Level A — Dev/bootstrap identity labels only

This is safest for the next session.

```text
Backend creates or returns a dev/local passport subject and wallet account.
Extension stores subject/account labels.
No private key custody in Chrome.
No seed phrase.
No local signing.
```

This is consistent with current MVP safety.

### Level B — Real local persistent passport keys in extension

This is future work and requires a serious security design.

Would need decisions about:

```text
- WebCrypto key generation
- extractable vs non-extractable keys
- export/recovery UX
- password protection
- encrypted backup
- Chrome storage limitations
- loss/recovery behavior
- multi-device sync policy
- phishing/extension compromise threat model
```

Do not jump to Level B unless explicitly designing passport key custody.

Recommended next session path:

```text
Build Level A first.
Make the UI/product flow real.
Keep key custody backend/local-dev for now.
Later design Level B as a separate security milestone.
```

---

## 18. Manual testing goals for next session

After passport batch, manual checklist should include:

```text
- Extension loads unpacked.
- Popup opens with no console errors.
- Gateway offline state still works.
- Gateway online state still works.
- No passport state displays first-run card.
- Create passport button calls gateway bootstrap route.
- Bootstrap response saves passport subject and wallet account.
- Balance loads after passport creation.
- Refresh balance works.
- Clear local identity labels works.
- No private key or seed phrase fields exist.
- No token appears in visible error output.
- Mutating bootstrap call uses Idempotency-Key.
- Backend errors display clearly.
- scripts/check-chrome.sh passes.
- scripts/make_codebundle.sh regenerates bundle.
```

---

## 19. Likely first batch for next session

Recommended Batch 2 for CrabLink:

```text
Batch 2 — Passport Bootstrap UI + Client Methods
```

Files to update:

```text
extensions/chrome/src/storage.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
extensions/chrome/test/manual-checklist.md
extensions/chrome/docs/BLUEPRINT.md
shared/schemas/extension-settings.schema.json
```

Files to possibly add:

```text
shared/schemas/identity-me.schema.json
shared/schemas/passport-bootstrap.schema.json
shared/schemas/wallet-balance.schema.json

shared/fixtures/identity-me.empty.sample.json
shared/fixtures/identity-me.ready.sample.json
shared/fixtures/passport-bootstrap.sample.json
shared/fixtures/wallet-balance.sample.json
```

Do not modify backend Rust crates from the CrabLink repo unless the user switches back to RustyOnions.

If backend routes do not exist yet, extension should fail gracefully with helpful messages.

---

## 20. Suggested UI copy

No passport state:

```text
Create your RON Passport
CrabLink needs a local RON Passport label before it can show wallet and ROC status.
```

Button:

```text
Create Passport
```

After creation:

```text
Passport Ready
Your passport and linked wallet were loaded from RustyOnions.
```

Balance:

```text
ROC Balance
Backend-derived balance from your configured RustyOnions gateway.
```

Safety note:

```text
CrabLink stores labels only. Wallet truth and receipts come from RustyOnions.
```

Starter grant:

```text
Starter ROC
A small test grant may be issued by the local gateway so you can try paid RustyOnions features.
```

---

## 21. Git workflow reminder

After next batch:

```bash
scripts/check-chrome.sh
scripts/make_codebundle.sh
git status
```

Commit example:

```bash
git add CODEBUNDLE_CHROME_EXTENSION.md \
  extensions/chrome/src/storage.js \
  extensions/chrome/src/ronClient.js \
  extensions/chrome/src/popup.html \
  extensions/chrome/src/popup.js \
  extensions/chrome/src/options.html \
  extensions/chrome/src/options.js \
  extensions/chrome/src/styles.css \
  extensions/chrome/test/manual-checklist.md \
  extensions/chrome/docs/BLUEPRINT.md \
  shared/schemas/extension-settings.schema.json

git commit -m "Add passport bootstrap UI scaffolding"
git push
```

If new schemas/fixtures are added, include them in the commit too.

---

## 22. What to tell the next instance

Start next session with:

```text
We are working in the separate crablink repo, not RustyOnions core. CrabLink is the browser-client repo for RustyOnions. Chrome extension is first. The extension already loads in Chrome, has the CrabLink logo, gateway health checks, settings, crab/b3 input normalization, and resolver UI. We need the next batch: Passport bootstrap + ROC balance display.

Important: Preserve the extension blueprint invariants. The extension is gateway-only. It must not call svc-passport, svc-wallet, ron-ledger, svc-storage, svc-index, or omnigate directly. Add frontend client methods and UI for identity/passport bootstrap through proposed svc-gateway routes. Store only safe labels locally. Do not add private key custody or seed phrase UX yet. Starter ROC must be backend-issued; the extension only displays backend-derived balance and receipts.
```

Attach or paste:

```text
CODEBUNDLE_CHROME_EXTENSION.md
extensions/chrome/docs/BLUEPRINT.md
README.md if relevant
```

Ask for:

```text
Full paste-ready files for Batch 2: Passport Bootstrap UI + ROC Balance Display.
```

---

## 23. Current strategic interpretation

The Chrome extension is becoming the first real user-facing proof that RustyOnions is more than infrastructure.

The product story is now:

```text
User installs CrabLink.
User connects to local RustyOnions gateway.
User creates or loads a RON Passport.
User sees a linked ROC wallet balance.
User opens crab:// links and b3 asset pages.
Later, user can upload/launch/consume paid content with explicit confirmation and receipts.
```

This is the correct path toward RON beta.

The extension should make the system feel real, but the backend must remain the source of truth.

```
```


### END NOTE - APRIL 29 2026 - 23:00 CST



### BEGIN NOTE - APRIL 30 2026 - 00:30 CST

Below is a **paste-ready CrabLink carryover note** for the `crablink` repo. I would drop this into:

```text
NOTES.MD
```

---

# BEGIN NOTE — APRIL 30 2026 — CrabLink Chrome Extension WEB3_2 Passport/Gateway Milestone

## Scope of this note

This note covers the current state of the separate **CrabLink** browser-extension repo.

CrabLink is the browser client for RustyOnions. It is not part of the RustyOnions monorepo crates. It is a separate repo:

```text
https://github.com/Y3LLOWVESTS/crablink.git
```

Current product name:

```text
CrabLink
```

Current browser target:

```text
CrabLink Extension for Chrome
```

Current integration path:

```text
CrabLink Chrome Extension
→ local browser storage
→ svc-gateway public HTTP routes
→ omnigate WEB3_2 routes
→ future svc-passport / svc-wallet / ron-ledger truth
```

The extension currently talks to the RustyOnions local dev gateway at:

```text
http://127.0.0.1:8090
```

---

## Executive summary

This session successfully moved CrabLink from a mostly static browser-extension shell into a live RustyOnions browser client.

The extension can now:

```text
- connect to a running local RustyOnions dev stack
- show gateway online/offline state
- check /healthz and /readyz
- show the configured gateway URL
- show current passport subject
- show current wallet account
- show ROC balance display from backend response
- create/load a dev-safe RON Passport label through the gateway
- refresh identity state through GET /identity/me
- refresh wallet display through GET /wallet/:account/balance
- resolve typed crab:// asset URLs
- resolve b3 asset-page URLs
- run read-only route diagnostics
- package into a clean Chrome extension zip
- run local structural checks
- run live local gateway smoke against RustyOnions
```

The extension now successfully displays live backend state:

```text
Status:   ONLINE
Gateway:  http://127.0.0.1:8090
Passport: passport:main:dev
Wallet:   acct_dev
ROC:      0 ROC
```

This proves the first full browser-to-RustyOnions flow:

```text
Chrome Extension UI
→ CrabLink storage/settings
→ CrabLink ronClient.js
→ svc-gateway
→ omnigate
→ identity/wallet façade
→ back to browser display
```

---

## Current architectural stance

CrabLink is intentionally a **thin browser client**.

It must not become:

```text
- a wallet truth engine
- a ledger
- a passport private-key authority
- a storage service
- an index service
- a policy engine
- a gateway replacement
- a fake backend simulator
```

CrabLink may store safe local labels and UX state, such as:

```text
- gatewayUrl
- passportSubject
- walletAccount
- lastIdentityCheckAt
- lastBootstrapReceiptId
- last displayed ROC balance metadata
- recent receipt display metadata
- local dev bearer token for development only
```

CrabLink must not store in this MVP:

```text
- seed phrases
- raw private keys
- wallet signing keys
- long-lived spend authority
- fake ROC truth
- fake ledger receipts
```

All real authority and economic truth must come from RustyOnions services.

---

## Core invariant: gateway-only backend access

CrabLink should call only public gateway routes.

Correct:

```text
CrabLink
→ svc-gateway
→ omnigate
→ downstream RustyOnions services
```

Incorrect:

```text
CrabLink
→ svc-passport directly

CrabLink
→ svc-wallet directly

CrabLink
→ ron-ledger directly

CrabLink
→ svc-storage directly

CrabLink
→ svc-index directly
```

The extension now centralizes backend access through:

```text
extensions/chrome/src/ronClient.js
```

This is the correct place for all future route methods.

---

## Major files changed in CrabLink

### Chrome extension UI / logic

```text
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
```

### Client and local state

```text
extensions/chrome/src/ronClient.js
extensions/chrome/src/storage.js
```

### Manual QA

```text
extensions/chrome/test/manual-checklist.md
```

### Tooling

```text
scripts/check-chrome.sh
scripts/smoke-local-gateway.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
```

### Shared schemas

```text
shared/schemas/extension-settings.schema.json
shared/schemas/identity-me.schema.json
shared/schemas/passport-bootstrap.schema.json
shared/schemas/wallet-balance.schema.json
```

### Shared fixtures

```text
shared/fixtures/identity-me.empty.sample.json
shared/fixtures/identity-me.ready.sample.json
shared/fixtures/passport-bootstrap.sample.json
shared/fixtures/wallet-balance.sample.json
```

### Generated bundle

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

---

## Current popup behavior

The popup now has these main sections:

```text
- gateway/passport/wallet/ROC status card
- RON Passport card
- route diagnostics card
- crab:// / b3 resolver input
- result display card
- safety card
```

### Status card

Shows:

```text
Gateway URL
Passport subject
Wallet account
ROC balance display
```

Buttons:

```text
Check Node
Check Passport
Settings
```

### Passport card

Shows:

```text
Passport status
Identity check timestamp
Balance check timestamp
Create RON Passport button if no passport is loaded
Refresh Balance button if wallet account is loaded
```

Important behavior:

```text
If passportSubject exists, Create RON Passport is hidden.
If passportSubject is empty, Create RON Passport appears.
```

To manually test first-run creation:

```text
Open extension options
→ Clear Identity Labels
→ reopen popup
→ Create RON Passport button should appear
```

### Route diagnostics card

Read-only diagnostics currently checks:

```text
GET /healthz
GET /readyz
GET /identity/me
GET /wallet/:account/balance
GET /b3/<sample>.image
GET /crab/resolve?url=crab://<sample>.image
```

Diagnostics intentionally skips:

```text
POST /identity/passport/bootstrap
```

Reason: bootstrap is currently a dev-safe route, but it may become a real mutation route once `svc-passport` and `svc-wallet` backing are wired. Diagnostics should never silently run mutation routes.

---

## Current settings/options behavior

Options page now supports:

```text
- gateway URL
- request timeout
- passport subject label
- wallet account label
- last known ROC balance display
- dev bearer/cap token
- require spend confirmation
- dev mode
```

Options page buttons:

```text
Test Gateway
Refresh Identity
Create Dev Passport
Clear Identity Labels
Clear Token
Save Settings
Reset Defaults
```

Important safety detail:

```text
The dev token field is for local development only.
Production signing/key custody must not be stored here in this MVP.
```

---

## Current local storage schema

Current settings schema version:

```text
schemaVersion = 2
```

Current settings fields include:

```text
gatewayUrl
passportSubject
walletAccount
authToken
requireSpendConfirm
devMode
requestTimeoutMs
lastCrabUrl
recentReceipts
lastIdentityCheckAt
lastBootstrapReceiptId
rocBalanceMinorUnits
rocBalanceDisplay
rocBalanceUpdatedAt
```

The shared schema is:

```text
shared/schemas/extension-settings.schema.json
```

The storage implementation is:

```text
extensions/chrome/src/storage.js
```

Key storage helpers now include:

```text
getSettings()
saveSettings()
resetSettings()
clearDevToken()
clearIdentityState()
saveIdentityState()
saveBalanceState()
extractIdentityState()
extractBalanceState()
normalizeGatewayUrl()
normalizeTimeout()
hasPassport()
hasWallet()
identitySummary()
safeSettingsForDisplay()
rememberLastCrabUrl()
addRecentReceipt()
```

Important invariant:

```text
storage.js must never persist private keys, seed phrases, or fake ROC truth.
```

---

## Current gateway client

The gateway client is:

```text
extensions/chrome/src/ronClient.js
```

Current methods include:

```text
getHealth()
getReady()
getIdentity()
bootstrapPassport()
getWalletBalance(account)
resolveCrab(url)
getB3Asset(hash, kind)
resolveSite(name)
preparePaidObject(body)
prepareImageAsset(body)
createImageAsset(body)
prepareSite(body)
createSite(body)
```

Mutation routes automatically get an:

```text
Idempotency-Key
```

Requests also attach:

```text
Authorization
x-correlation-id
x-ron-passport
x-ron-wallet-account
```

when available.

Important invariant:

```text
All new backend routes should be added to ronClient.js first, then consumed by popup/options/background/content.
```

---

## Current backend routes consumed by CrabLink

CrabLink currently consumes:

```text
GET  /healthz
GET  /readyz
GET  /identity/me
POST /identity/passport/bootstrap
GET  /wallet/:account/balance
GET  /crab/resolve?url=<crab_url>
GET  /b3/<64hex>.<kind>
GET  /sites/:name
POST /paid/o/prepare
POST /assets/image/prepare
POST /assets/image
POST /sites/prepare
POST /sites
```

Important note:

```text
Only read-only routes are used by diagnostics.
Mutation routes require explicit user action.
```

---

## Current identity DTO expectations

### `GET /identity/me`

Expected shape:

```json
{
  "schema": "crablink.identity.me.v1",
  "passport": {
    "subject": "passport:main:dev",
    "kind": "main",
    "display_name": "Local Dev Passport",
    "created_at": null,
    "source": "request_header"
  },
  "wallet": {
    "account": "acct_dev",
    "linked": true,
    "source": "request_header"
  },
  "capabilities": {
    "can_view_balance": true,
    "can_prepare_paid_actions": true,
    "can_spend": false
  },
  "warnings": [
    "identity view is header-derived until svc-passport is wired"
  ]
}
```

Schema file:

```text
shared/schemas/identity-me.schema.json
```

Fixtures:

```text
shared/fixtures/identity-me.empty.sample.json
shared/fixtures/identity-me.ready.sample.json
```

Critical rule:

```text
capabilities.can_spend must remain false unless a future short-lived caveated spend token is intentionally introduced.
```

---

## Current passport bootstrap DTO expectations

### `POST /identity/passport/bootstrap`

Current dev façade response shape:

```json
{
  "schema": "crablink.identity.bootstrap.v1",
  "passport": {
    "subject": "passport:main:dev",
    "kind": "main",
    "display_name": "CrabLink main passport",
    "created_at": null,
    "source": "omnigate_dev_bootstrap"
  },
  "wallet": {
    "account": "acct_dev",
    "linked": true,
    "source": "omnigate_dev_bootstrap"
  },
  "starter_grant": {
    "issued": false,
    "amount_minor_units": "0",
    "receipt_id": null,
    "reason": "svc_wallet_integration_pending"
  },
  "capabilities": {
    "can_view_balance": true,
    "can_prepare_paid_actions": true,
    "can_spend": false
  },
  "warnings": [
    "dev bootstrap returns labels only",
    "starter ROC is not issued until svc-wallet integration is wired",
    "wallet spend authority is not granted by this response"
  ]
}
```

Schema file:

```text
shared/schemas/passport-bootstrap.schema.json
```

Fixture:

```text
shared/fixtures/passport-bootstrap.sample.json
```

Current truth:

```text
Bootstrap creates/loads safe labels only.
Bootstrap does not issue ROC yet.
Bootstrap does not call svc-wallet yet.
Bootstrap does not commit to ron-ledger yet.
```

---

## Current wallet balance DTO expectations

### `GET /wallet/:account/balance`

Current dev façade response shape:

```json
{
  "schema": "crablink.wallet.balance.v1",
  "account": "acct_dev",
  "unit": "ROC",
  "available_minor_units": "0",
  "held_minor_units": "0",
  "display": "0 ROC",
  "as_of": null,
  "ledger_backed": false,
  "source": "omnigate_dev_wallet_view.v1",
  "reason": "svc_wallet_integration_pending",
  "warnings": [
    "display-only dev placeholder",
    "real balance must come from svc-wallet and ron-ledger",
    "do not treat this route as spend authority"
  ]
}
```

Schema file:

```text
shared/schemas/wallet-balance.schema.json
```

Fixture:

```text
shared/fixtures/wallet-balance.sample.json
```

Critical rule:

```text
If ledger_backed=false, the extension must not treat the balance as authoritative economic truth.
```

Current display is:

```text
0 ROC
```

because the backend is deliberately not issuing fake starter ROC yet.

---

## Current `crab://` URL behavior

Public CrabLink URL format:

```text
crab://<64 lowercase hex>.<asset_kind>
```

Example:

```text
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.image
```

The old form should not be used in public UX:

```text
crab://b3/<hash>.image
```

Internal RustyOnions content IDs remain:

```text
b3:<64 lowercase hex>
```

The extension can accept:

```text
- crab://<hash>.<kind>
- b3:<hash>
- raw 64 lowercase hex hash
```

Raw hashes and b3 CIDs default to a selected asset kind in the popup.

---

## Current scripts and checks

### `scripts/check-chrome.sh`

Proves:

```text
- required extension files exist
- required schemas/fixtures exist
- manifest_version is 3
- permissions remain minimal
- broad/risky permissions are blocked
- host permissions are limited to localhost/127.0.0.1
- popup IDs exist
- popup.js references expected route methods
- ronClient.js exposes expected methods
- storage.js exposes expected helpers
- old crab://b3/ public URL form is rejected
- all JSON schemas/fixtures parse
- JavaScript syntax checks pass with node --check
```

Successful output:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
```

### `scripts/smoke-local-gateway.sh`

Runs while the RustyOnions dev stack is active.

Proves live:

```text
GET /healthz
GET /readyz
GET /identity/me
GET /wallet/acct_dev/balance
GET /b3/<sample>.image
GET /crab/resolve?url=crab://<sample>.image
```

Skips bootstrap by default:

```text
skip: /identity/passport/bootstrap; set CRABLINK_SMOKE_RUN_BOOTSTRAP=1 to include mutation route
```

Successful output:

```text
CrabLink local gateway smoke passed.
```

### `scripts/package-chrome.sh`

Creates:

```text
dist/crablink-extension-chrome.zip
```

It excludes junk such as:

```text
.DS_Store
Thumbs.db
__MACOSX
.git
node_modules
coverage
dist
```

Successful output:

```text
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

### `scripts/make_codebundle.sh`

Creates:

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

Successful output:

```text
wrote: /Users/mymac/Desktop/crablink/CODEBUNDLE_CHROME_EXTENSION.md
```

---

## Successful command history from this milestone

From the CrabLink repo root:

```bash
chmod +x scripts/check-chrome.sh scripts/package-chrome.sh scripts/smoke-local-gateway.sh
scripts/check-chrome.sh
scripts/smoke-local-gateway.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
git status
```

Observed successful output:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.

CrabLink local gateway smoke passed.

wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
wrote: /Users/mymac/Desktop/crablink/CODEBUNDLE_CHROME_EXTENSION.md
```

---

## Current git status after the milestone

Expected modified files:

```text
CODEBUNDLE_CHROME_EXTENSION.md
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/storage.js
extensions/chrome/src/styles.css
extensions/chrome/test/manual-checklist.md
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
shared/schemas/extension-settings.schema.json
```

Expected new files:

```text
NOTES.MD
shared/fixtures/identity-me.empty.sample.json
shared/fixtures/identity-me.ready.sample.json
shared/fixtures/passport-bootstrap.sample.json
shared/fixtures/wallet-balance.sample.json
shared/schemas/identity-me.schema.json
shared/schemas/passport-bootstrap.schema.json
shared/schemas/wallet-balance.schema.json
```

Recommended commit:

```bash
git add CODEBUNDLE_CHROME_EXTENSION.md \
  extensions/chrome/src/options.html \
  extensions/chrome/src/options.js \
  extensions/chrome/src/popup.html \
  extensions/chrome/src/popup.js \
  extensions/chrome/src/ronClient.js \
  extensions/chrome/src/storage.js \
  extensions/chrome/src/styles.css \
  extensions/chrome/test/manual-checklist.md \
  scripts/check-chrome.sh \
  scripts/package-chrome.sh \
  scripts/smoke-local-gateway.sh \
  shared/schemas/extension-settings.schema.json \
  shared/schemas/identity-me.schema.json \
  shared/schemas/passport-bootstrap.schema.json \
  shared/schemas/wallet-balance.schema.json \
  shared/fixtures/identity-me.empty.sample.json \
  shared/fixtures/identity-me.ready.sample.json \
  shared/fixtures/passport-bootstrap.sample.json \
  shared/fixtures/wallet-balance.sample.json \
  NOTES.MD

git status
git commit -m "Add CrabLink passport diagnostics and gateway smoke tooling"
```

If `NOTES.MD` is not intended to be versioned, omit it from `git add`.

---

## Current RustyOnions backend dependency

For CrabLink to show online, the RustyOnions dev stack must be running.

From the RustyOnions repo root:

```bash
scripts/web3_crablink_dev_stack.sh
```

Successful backend output should end with:

```text
WEB3 identity stack smoke passed

CrabLink dev stack is online
gateway: http://127.0.0.1:8090

Leave this terminal open while using the CrabLink extension.
Press Ctrl-C in this terminal to stop the stack.
```

If that terminal is closed or Ctrl-C is pressed, the extension will go offline again.

---

## Current known limitations

CrabLink is live but still in the safe MVP phase.

Known limitations:

```text
- no real persistent passport vault yet
- no local encrypted key storage yet
- no PIN/password unlock flow yet
- no real alt anonymous passport selection yet
- no real svc-passport-backed identity persistence yet
- no real svc-wallet-backed balance yet
- no 1776 ROC starter grant yet
- no ledger-backed receipt in bootstrap yet
- wallet balance currently comes from omnigate dev façade
- balance currently says ledger_backed=false
- bootstrap currently says starter_grant.issued=false
- Create RON Passport is hidden if passportSubject already exists
```

These are not bugs. They are intentional until the backend is wired.

---

## Important new product requirement

The user requested:

```text
Every newly created RON Passport should automatically start with 1776 ROC.
```

This must not be implemented as a fake local extension balance.

Correct future flow:

```text
CrabLink
→ POST /identity/passport/bootstrap through svc-gateway
→ omnigate
→ svc-passport creates/loads passport
→ svc-wallet issues 1776 ROC
→ ron-ledger commits issue event
→ receipt returned
→ CrabLink refreshes wallet balance
→ popup displays 1776 ROC
```

CrabLink should only display the backend result.

Wrong implementation:

```text
CrabLink locally sets rocBalanceDisplay = "1776 ROC"
```

Correct implementation:

```text
CrabLink receives:
starter_grant.issued=true
amount_minor_units="1776"
receipt_id="<wallet-ledger receipt>"
then refreshes:
GET /wallet/:account/balance
```

No floating-point math. Use integer minor units only.

Current safest interpretation:

```text
1776 means amount_minor_units="1776" and display "1776 ROC" in the dev model.
```

If the project later introduces decimal precision, that should be handled explicitly in backend DTOs.

---

## Next best backend work

The next major work likely belongs in the RustyOnions repo, not CrabLink.

Recommended next RustyOnions batch:

```text
Batch 8 — Real-ish wallet-backed bootstrap with 1776 ROC starter grant
```

Likely backend tasks:

```text
1. Add svc-wallet to scripts/web3_crablink_dev_stack.sh.
2. Configure svc-wallet with a local dev ledger path.
3. Add omnigate wallet downstream config.
4. Add omnigate downstream wallet client.
5. Update GET /v1/wallet/:account/balance to call svc-wallet.
6. Update POST /v1/identity/passport/bootstrap to call svc-wallet issue for 1776 ROC.
7. Make bootstrap idempotent so repeated clicks do not double-issue.
8. Return starter_grant.issued=true with receipt id.
9. Update identity smoke to require amount_minor_units="1776" after bootstrap.
10. Keep fallback/dev façade only behind explicit config if needed.
```

Important backend invariant:

```text
omnigate must not mutate ron-ledger directly.
omnigate must go through svc-wallet.
svc-wallet remains the mutation front-door.
ron-ledger remains durable economic truth.
```

---

## Next best CrabLink work after backend 1776 ROC lands

Once RustyOnions returns real starter grant and balance data, CrabLink should be updated to show:

```text
Starter ROC issued: 1776 ROC
Receipt: <receipt_id>
Ledger-backed: true
```

Likely CrabLink files:

```text
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/storage.js
extensions/chrome/src/ronClient.js
shared/schemas/passport-bootstrap.schema.json
shared/schemas/wallet-balance.schema.json
shared/fixtures/passport-bootstrap.sample.json
shared/fixtures/wallet-balance.sample.json
scripts/smoke-local-gateway.sh
extensions/chrome/test/manual-checklist.md
```

Potential UI improvements:

```text
- show ledger_backed badge
- show receipt id after bootstrap
- show warnings from backend
- show "Starter grant pending / issued / unavailable"
- show "Refresh Balance" after create
- show clear "Create Passport" first-run card
```

---

## First-run passport creation testing

To test the current create button:

```text
1. Open CrabLink Settings.
2. Click Clear Identity Labels.
3. Reopen popup.
4. Create RON Passport button should appear.
5. Click Create RON Passport.
6. Extension should call POST /identity/passport/bootstrap.
7. It should save passportSubject and walletAccount.
8. It should refresh balance.
9. Current result should still be 0 ROC until backend starter grant is wired.
```

Expected current values after create:

```text
passport:main:dev
acct_dev
0 ROC
```

Expected future values after 1776 ROC backend batch:

```text
passport:main:dev
acct_dev
1776 ROC
receipt_id present
ledger_backed=true
```

---

## Security and permission state

The extension should remain minimal.

Allowed current permissions:

```text
storage
activeTab
```

Allowed current host permissions:

```text
http://127.0.0.1:*/*
http://localhost:*/*
```

Blocked/risky permissions in `check-chrome.sh`:

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
clipboardRead
```

Do not add broad permissions unless there is a very specific reason and the checklist/tooling is updated deliberately.

---

## Packaging state

The extension now packages successfully:

```text
dist/crablink-extension-chrome.zip
```

This zip is created by:

```bash
scripts/package-chrome.sh
```

It should be safe for local install/review because it excludes transient and macOS junk files.

---

## Completion estimate for CrabLink current phase

For the current CrabLink Chrome MVP:

```text
Extension shell / manifest:                 85% complete
Popup UI:                                   75% complete
Options UI:                                 75% complete
Gateway client abstraction:                 80% complete
Safe local storage:                         80% complete
Health/readiness integration:               95% complete
Passport label bootstrap UI:                70% complete
Real passport creation / key custody:        0% complete
Wallet display route integration:           70% complete
Real wallet-backed balance:                  0% complete
1776 ROC starter grant display:              0% complete
crab:// / b3 resolver UX:                   70% complete
Route diagnostics:                          85% complete
Local smoke/check/package tooling:           90% complete
Chrome Web Store readiness:                 25% complete
```

Overall CrabLink MVP completion estimate:

```text
~60–65% complete
```

Reason: the extension is now live against the gateway, but real passport custody, real wallet-backed balance, starter grant receipts, production auth, extension install polish, and user onboarding still remain.

---

## What to do at the start of the next session

Recommended starting sequence:

### 1. Start RustyOnions dev stack

From RustyOnions repo root:

```bash
scripts/web3_crablink_dev_stack.sh
```

Leave it running.

### 2. Check CrabLink repo

From CrabLink repo root:

```bash
scripts/check-chrome.sh
scripts/smoke-local-gateway.sh
```

### 3. Reload extension

In Chrome:

```text
chrome://extensions
→ reload CrabLink
→ open popup
→ Check Node
→ Check Passport
→ Refresh Balance
→ Run Diagnostics
```

### 4. Decide next track

Best next track:

```text
RustyOnions backend Batch 8:
1776 ROC starter grant via svc-wallet → ron-ledger
```

Then return to CrabLink for UI updates.

---

## TL;DR carryover

CrabLink is now a working Chrome extension MVP connected to RustyOnions.

Working live path:

```text
CrabLink
→ svc-gateway at http://127.0.0.1:8090
→ omnigate
→ identity/wallet dev façade
```

Currently working:

```text
ONLINE gateway status
passport label display
wallet account display
0 ROC balance display
identity refresh
balance refresh
passport bootstrap button
route diagnostics
crab:// and b3 resolver
local gateway smoke
safe package zip
schema/fixture coverage
```

Still remaining:

```text
real svc-passport backing
real wallet-backed balance
1776 ROC starter grant
receipt display
PIN/password unlock
local persistent encrypted passport vault
alt anonymous passports
production auth/capabilities
Chrome Web Store polish
```

Most important rule:

```text
Do not fake 1776 ROC in CrabLink.
The 1776 ROC starter grant must come from RustyOnions backend truth:
svc-wallet → ron-ledger → receipt → CrabLink display.
```

# END NOTE — APRIL 30 2026 — CrabLink Chrome Extension WEB3_2 Passport/Gateway Milestone


### END NOTE - APRIL 30 2026 - 00:30 CST



### BEGIN NOTE - APRIL 30 2026 - 10:35 CST

The uploaded CrabLink notes/codebundle confirm the repo scope, major Chrome extension files, shared schemas/fixtures, and gateway-only thin-client stance.  

Below is a **drop-in CrabLink note** for:

```text
NOTES.MD
```

---

# BEGIN NOTE — APRIL 30 2026 — CrabLink Chrome Extension Passport + Ledger-Backed ROC Milestone

## Scope of this note

This note covers the current state of the separate **CrabLink** browser-client repo.

CrabLink is the browser client for RustyOnions. It is **not** a RustyOnions crate and should remain in its own repo:

```text
https://github.com/Y3LLOWVESTS/crablink.git
```

Current product naming:

```text
Product: CrabLink
Browser extension: CrabLink Extension for Chrome
Future browser/client family: CrabLink
```

Current browser target:

```text
Chrome Extension / Manifest V3
```

Current integration path:

```text
CrabLink Chrome Extension
→ local browser storage
→ svc-gateway public HTTP routes
→ omnigate WEB3_2 routes
→ svc-wallet
→ ron-ledger-backed wallet truth
```

Default local dev gateway:

```text
http://127.0.0.1:8090
```

Current core milestone:

```text
CrabLink now displays 1776 ROC as ledger-backed through the live RustyOnions dev stack.
```

---

## Executive summary

This session moved CrabLink from “extension shell with gateway route diagnostics” into a **real browser-facing WEB3_2 product proof**.

The extension can now:

```text
- connect to a running local RustyOnions dev stack
- show gateway online/offline state
- check /healthz and /readyz
- show the configured gateway URL
- show the current passport label
- show the current wallet account label
- refresh identity through GET /identity/me
- refresh wallet balance through GET /wallet/:account/balance
- display real backend wallet balance from RustyOnions
- display 1776 ROC as ledger-backed when svc-wallet is live
- create/load a dev-safe RON Passport through the gateway
- request passport bootstrap through POST /identity/passport/bootstrap
- accept backend starter-grant fields when bootstrap is run through CrabLink
- store safe display metadata in chrome.storage.local
- resolve typed crab:// asset URLs
- resolve b3 asset-page URLs
- run read-only route diagnostics
- package into a clean Chrome extension zip
- run local structural checks
- run live local gateway smoke against RustyOnions
```

The headline proof:

```text
CrabLink popup shows:

Gateway:  http://127.0.0.1:8090
Passport: passport:main:dev
Wallet:   acct_dev
ROC:      1776 ROC
Ledger:   ledger-backed
Status:   ONLINE
```

This proves the first real browser-to-ledger-backed RustyOnions value path:

```text
Chrome Extension UI
→ CrabLink storage/settings
→ CrabLink ronClient.js
→ svc-gateway
→ omnigate
→ svc-wallet
→ ron-ledger-backed wallet state
→ back to CrabLink display
```

The most important achievement:

```text
CrabLink is no longer showing fake/local ROC.
It is displaying wallet truth returned through the RustyOnions backend.
```

---

## Current architectural stance

CrabLink is intentionally a **thin browser client**.

It must not become:

```text
- a wallet truth engine
- a ledger
- a passport private-key authority
- a storage service
- an index service
- a policy engine
- a gateway replacement
- a fake backend simulator
- a local ROC minting tool
- a direct svc-wallet client
- a direct ron-ledger client
```

CrabLink may store safe local labels and UI state:

```text
- gatewayUrl
- passportSubject
- walletAccount
- lastIdentityCheckAt
- lastBootstrapReceiptId
- lastStarterGrantIssued
- lastStarterGrantAmountMinorUnits
- lastStarterGrantReason
- rocBalanceMinorUnits
- rocBalanceDisplay
- rocBalanceUpdatedAt
- rocLedgerBacked
- rocBalanceSource
- rocBalanceReason
- recent receipt display metadata
- lastCrabUrl
- local dev bearer token for development only
- requireSpendConfirm flag
- devMode flag
```

CrabLink must not store in this MVP:

```text
- seed phrases
- raw private keys
- wallet signing keys
- passport private keys
- long-lived spend authority
- fake ROC truth
- fake ledger receipts
- direct ledger state
- unbounded spend capabilities
```

All real authority and economic truth must come from RustyOnions services.

---

## Core invariant: gateway-only backend access

CrabLink should call only public gateway routes.

Correct:

```text
CrabLink
→ svc-gateway
→ omnigate
→ downstream RustyOnions services
```

Incorrect:

```text
CrabLink
→ svc-passport directly

CrabLink
→ svc-wallet directly

CrabLink
→ ron-ledger directly

CrabLink
→ svc-storage directly

CrabLink
→ svc-index directly

CrabLink
→ ron-accounting directly

CrabLink
→ svc-rewarder directly
```

The extension centralizes backend access through:

```text
extensions/chrome/src/ronClient.js
```

This remains the correct place for all future backend route methods.

---

## Major files changed in CrabLink

### Chrome extension UI / logic

```text
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
```

### Background/default initialization

```text
extensions/chrome/src/background.js
```

Important change:

```text
background.js should not pre-seed a new install with passport:main:dev and acct_dev in a way that hides first-run creation forever.
```

Current intent:

```text
- initialize safe defaults
- keep gateway URL default
- do not fake passport custody
- do not fake wallet truth
- do not fake ROC balance
```

### Client and local state

```text
extensions/chrome/src/ronClient.js
extensions/chrome/src/storage.js
```

### Crab URL helpers

```text
extensions/chrome/src/crab.js
shared/js/crab.js
```

### Manual QA

```text
extensions/chrome/test/manual-checklist.md
```

### Tooling

```text
scripts/check-chrome.sh
scripts/smoke-local-gateway.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
```

### Shared schemas

```text
shared/schemas/extension-settings.schema.json
shared/schemas/identity-me.schema.json
shared/schemas/passport-bootstrap.schema.json
shared/schemas/wallet-balance.schema.json
shared/schemas/asset-page.schema.json
shared/schemas/site-page.schema.json
shared/schemas/problem.schema.json
```

### Shared fixtures

```text
shared/fixtures/identity-me.empty.sample.json
shared/fixtures/identity-me.ready.sample.json
shared/fixtures/passport-bootstrap.sample.json
shared/fixtures/wallet-balance.sample.json
shared/fixtures/asset-page.sample.json
shared/fixtures/site-page.sample.json
shared/fixtures/problem.not-found.json
shared/fixtures/problem.policy-denied.json
```

### Generated bundle

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

---

## Current popup behavior

The popup now has these main sections:

```text
- gateway/passport/wallet/ROC status card
- RON Passport card
- route diagnostics card
- crab:// / b3 resolver input
- result display card
- safety card
```

### Status card

Shows:

```text
Gateway URL
Passport subject
Wallet account
ROC balance display
Ledger-backed status
```

Current successful live state:

```text
Gateway:  http://127.0.0.1:8090
Passport: passport:main:dev
Wallet:   acct_dev
ROC:      1776 ROC
Ledger:   ledger-backed
```

Buttons:

```text
Check Node
Check Passport
Settings
```

### RON Passport card

Shows:

```text
Passport readiness status
Identity check timestamp
Balance check timestamp
Starter grant status
Grant amount
Receipt id
Create RON Passport button if no passport is loaded
Refresh Balance button if wallet account is loaded
```

Current known display mismatch:

```text
The popup can show:
ROC: 1776 ROC
Ledger: ledger-backed

while still showing:
Starter grant: pending backend
Grant amount: unknown
Receipt: none
```

Reason:

```text
The extension refreshed the wallet balance and saw ledger-backed 1776 ROC, but the extension did not itself perform the bootstrap call that returned the receipt id.
```

This is not a backend failure. It is a local UI/state synchronization issue.

Desired next behavior:

```text
If user clicks Create RON Passport:
  - call POST /identity/passport/bootstrap
  - store starter_grant.issued
  - store starter_grant.amount_minor_units
  - store starter_grant.receipt_id
  - refresh wallet balance
  - show receipt id and ledger-backed balance together

If user only refreshes balance and sees ledger_backed=true with >=1776:
  - show Starter grant: confirmed by ledger balance
  - show Grant amount: 1776 ROC
  - keep Receipt: none unless bootstrap receipt is known locally
```

### Route diagnostics card

Read-only diagnostics currently checks:

```text
GET /healthz
GET /readyz
GET /identity/me
GET /wallet/:account/balance
GET /b3/<sample>.image
GET /crab/resolve?url=crab://<sample>.image
```

Diagnostics intentionally skips mutation by default:

```text
POST /identity/passport/bootstrap
```

Bootstrap can be included in script smoke with:

```text
CRABLINK_SMOKE_RUN_BOOTSTRAP=1
```

Important rule:

```text
The UI diagnostics panel should remain read-only by default.
Mutation routes require explicit user action.
```

### Resolver card

Accepts:

```text
crab://<64 lowercase hex>.<asset_kind>
b3:<64 lowercase hex>
raw 64 lowercase hex hash
```

For raw hash and `b3:<hash>` inputs, the selected default asset kind is used.

Current public CrabLink URL format:

```text
crab://<64 lowercase hex>.<asset_kind>
```

Example:

```text
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.image
```

The old public format should not be used:

```text
crab://b3/<hash>.image
```

Internal RustyOnions content IDs remain:

```text
b3:<64 lowercase hex>
```

---

## Current settings/options behavior

Options page supports:

```text
- gateway URL
- request timeout
- passport subject label
- wallet account label
- last known ROC balance display
- dev bearer/cap token
- require spend confirmation
- dev mode
```

Options page buttons:

```text
Test Gateway
Refresh Identity
Create Dev Passport
Clear Identity Labels
Clear Token
Save Settings
Reset Defaults
```

Important safety detail:

```text
The dev token field is for local development only.
Production signing/key custody must not be stored here in this MVP.
```

Recommended near-term option behavior:

```text
- Clear Identity Labels should clear passport label, wallet label, starter grant metadata, receipt id, and balance display.
- Clear Token should only clear the dev Authorization token.
- Reset Defaults should restore gateway URL and safe empty identity state.
- Create Dev Passport should call the gateway bootstrap route, not locally invent identity or balance.
```

---

## Current local storage schema

Current settings schema version:

```text
schemaVersion = 2
```

Current settings fields include:

```text
schemaVersion
gatewayUrl
passportSubject
walletAccount
authToken
requireSpendConfirm
devMode
requestTimeoutMs
lastCrabUrl
recentReceipts
lastIdentityCheckAt
lastBootstrapReceiptId
lastStarterGrantIssued
lastStarterGrantAmountMinorUnits
lastStarterGrantReason
rocBalanceMinorUnits
rocBalanceDisplay
rocBalanceUpdatedAt
rocLedgerBacked
rocBalanceSource
rocBalanceReason
```

Shared schema:

```text
shared/schemas/extension-settings.schema.json
```

Storage implementation:

```text
extensions/chrome/src/storage.js
```

Key storage helpers include:

```text
getSettings()
saveSettings()
resetSettings()
clearDevToken()
clearIdentityState()
saveIdentityState()
saveBalanceState()
extractIdentityState()
extractBalanceState()
normalizeGatewayUrl()
normalizeTimeout()
hasPassport()
hasWallet()
identitySummary()
safeSettingsForDisplay()
rememberLastCrabUrl()
addRecentReceipt()
formatRocMinorUnits()
```

Important storage invariant:

```text
storage.js must never persist private keys, seed phrases, raw wallet state, or fake ROC truth.
```

---

## Current gateway client

Gateway client:

```text
extensions/chrome/src/ronClient.js
```

Current methods include:

```text
getHealth()
getReady()
getIdentity()
bootstrapPassport()
getWalletBalance(account)
resolveCrab(url)
getB3Asset(hash, kind)
resolveSite(name)
preparePaidObject(body)
prepareImageAsset(body)
createImageAsset(body)
prepareSite(body)
createSite(body)
request(path, options)
makeHeaders(...)
```

Current client behavior:

```text
- normalizes gateway base URL
- enforces http:// or https:// gateway URL
- uses request timeout clamped between 1000ms and 30000ms
- adds Accept: application/json
- sends x-correlation-id
- sends Authorization if authToken is configured
- sends x-ron-passport if passportSubject is configured
- sends x-ron-wallet-account if walletAccount is configured
- sends Idempotency-Key on mutation routes
- parses JSON responses
- maps non-2xx responses into RonClientError
- marks retryable errors for timeout, 408, 429, and 5xx
```

Important invariant:

```text
All new backend routes should be added to ronClient.js first, then consumed by popup/options/background/content.
```

---

## Current backend routes consumed by CrabLink

CrabLink currently consumes or has client methods for:

```text
GET  /healthz
GET  /readyz
GET  /identity/me
POST /identity/passport/bootstrap
GET  /wallet/:account/balance
GET  /crab/resolve?url=<crab_url>
GET  /b3/<64hex>.<kind>
GET  /sites/:name
POST /paid/o/prepare
POST /assets/image/prepare
POST /assets/image
POST /sites/prepare
POST /sites
```

Important route ownership:

```text
CrabLink only knows public gateway paths.
svc-gateway owns public path exposure/proxying.
omnigate owns route hydration/facade behavior.
svc-wallet owns wallet truth and wallet mutation/read behavior.
ron-ledger remains durable truth behind svc-wallet.
```

---

## Current identity DTO expectations

### GET `/identity/me`

Expected shape:

```json
{
  "schema": "crablink.identity.me.v1",
  "passport": {
    "subject": "passport:main:dev",
    "kind": "main",
    "display_name": "Local Dev Passport",
    "created_at": null,
    "source": "request_header"
  },
  "wallet": {
    "account": "acct_dev",
    "linked": true,
    "source": "request_header"
  },
  "capabilities": {
    "can_view_balance": true,
    "can_prepare_paid_actions": true,
    "can_spend": false
  },
  "warnings": [
    "identity view is header-derived until svc-passport is wired"
  ]
}
```

Schema file:

```text
shared/schemas/identity-me.schema.json
```

Fixtures:

```text
shared/fixtures/identity-me.empty.sample.json
shared/fixtures/identity-me.ready.sample.json
```

Critical rule:

```text
capabilities.can_spend must remain false unless a future short-lived caveated spend token is intentionally introduced.
```

Passport label is identity state, not spend authority.

---

## Current passport bootstrap DTO expectations

### POST `/identity/passport/bootstrap`

Current successful backend-truth response:

```json
{
  "schema": "crablink.identity.bootstrap.v1",
  "passport": {
    "subject": "passport:main:dev",
    "kind": "main",
    "display_name": "CrabLink main passport",
    "created_at": null,
    "source": "omnigate_dev_bootstrap"
  },
  "wallet": {
    "account": "acct_dev",
    "linked": true,
    "source": "omnigate_dev_bootstrap"
  },
  "starter_grant": {
    "issued": true,
    "amount_minor_units": "1776",
    "receipt_id": "tx_af4862f11cba82e2497d316f2e76fc83",
    "reason": "issued_by_svc_wallet"
  },
  "capabilities": {
    "can_view_balance": true,
    "can_prepare_paid_actions": true,
    "can_spend": false
  },
  "warnings": [
    "dev bootstrap returns passport labels only until svc-passport custody is wired",
    "wallet spend authority is not granted by this response",
    "starter ROC was issued through svc-wallet"
  ]
}
```

Schema file:

```text
shared/schemas/passport-bootstrap.schema.json
```

Fixture:

```text
shared/fixtures/passport-bootstrap.sample.json
```

Current critical requirement:

```text
The fixture and schema should now be updated/hardened to reflect:
starter_grant.issued=true
amount_minor_units="1776"
receipt_id non-empty
capabilities.can_spend=false
```

Important rule:

```text
CrabLink may store receipt_id for display/history, but the receipt itself remains backend truth.
```

---

## Current wallet balance DTO expectations

### GET `/wallet/:account/balance`

Current successful backend-truth response:

```json
{
  "schema": "crablink.wallet.balance.v1",
  "account": "acct_dev",
  "unit": "ROC",
  "available_minor_units": "1776",
  "held_minor_units": "0",
  "display": "1776 ROC",
  "as_of": null,
  "ledger_backed": true,
  "source": "svc_wallet.v1",
  "reason": null,
  "warnings": []
}
```

Schema file:

```text
shared/schemas/wallet-balance.schema.json
```

Fixture:

```text
shared/fixtures/wallet-balance.sample.json
```

Critical rules:

```text
If ledger_backed=true:
  - balance may be displayed as backend wallet truth.

If ledger_backed=false:
  - extension must not treat the balance as authoritative economic truth.

CrabLink must not locally set 1776 ROC without backend response.
```

Current needed fixture/schema update:

```text
wallet-balance.sample.json should be updated from the older 0 ROC placeholder to the new ledger-backed 1776 ROC success case, or split into:
- wallet-balance.placeholder.sample.json
- wallet-balance.ledger-backed.sample.json
```

---

## Current crab:// and b3 behavior

Public CrabLink asset URL format:

```text
crab://<64 lowercase hex>.<asset_kind>
```

Example:

```text
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.image
```

Internal content ID format:

```text
b3:<64 lowercase hex>
```

Supported popup inputs:

```text
- crab://<hash>.<kind>
- b3:<hash>
- raw 64 lowercase hex hash
```

Raw hash and b3 inputs use the popup’s selected default asset kind.

Important check issue encountered and fixed:

```text
scripts/check-chrome.sh expects the literal placeholder style:
crab://<hash>.image

Do not HTML-escape it as:
crab://&lt;hash&gt;.image
```

The fixed popup includes:

```html
placeholder="crab://<hash>.image"
```

or an explicit check-token comment.

---

## Current scripts and checks

### `scripts/check-chrome.sh`

Proves:

```text
- required extension files exist
- required schemas/fixtures exist
- manifest_version is 3
- permissions remain minimal
- broad/risky permissions are blocked
- host permissions are limited to localhost/127.0.0.1
- popup IDs exist
- popup.js references expected route methods
- ronClient.js exposes expected methods
- storage.js exposes expected helpers
- old crab://b3/ public URL form is rejected
- popup placeholder preserves crab://<hash>.image style
- all JSON schemas/fixtures parse
- JavaScript syntax checks pass with node --check
```

Successful output:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
```

### `scripts/smoke-local-gateway.sh`

Runs while the RustyOnions dev stack is active.

Default read-only proof:

```text
GET /healthz
GET /readyz
GET /identity/me
GET /wallet/acct_dev/balance
GET /b3/<sample>.image
GET /crab/resolve?url=crab://<sample>.image
```

Default behavior:

```text
skip: /identity/passport/bootstrap; set CRABLINK_SMOKE_RUN_BOOTSTRAP=1 to include mutation route
```

Mutation-enabled command:

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Successful mutation-enabled output:

```text
ok: /healthz -> HTTP 200
ok: /readyz -> HTTP 200
ok: /identity/me -> HTTP 200
ok: /wallet/acct_dev/balance -> HTTP 200
ok: /b3/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.image -> HTTP 200
ok: /crab/resolve?url=crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.image -> HTTP 200
bootstrap JSON: ok
ok: /identity/passport/bootstrap -> HTTP 200

CrabLink local gateway smoke passed.
```

Current limitation:

```text
smoke-local-gateway.sh currently proves HTTP 200 and bootstrap JSON shape, but it should be hardened to assert:
- starter_grant.issued == true
- amount_minor_units == "1776"
- receipt_id non-empty
- capabilities.can_spend == false
- wallet ledger_backed == true
- wallet source == "svc_wallet.v1"
- wallet available_minor_units >= 1776
```

### `scripts/package-chrome.sh`

Creates:

```text
dist/crablink-extension-chrome.zip
```

It excludes junk such as:

```text
.DS_Store
Thumbs.db
__MACOSX
.git
node_modules
coverage
dist
```

Successful output:

```text
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

### `scripts/make_codebundle.sh`

Creates:

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

Successful output:

```text
wrote: /Users/mymac/Desktop/crablink/CODEBUNDLE_CHROME_EXTENSION.md
```

---

## Successful command history from this milestone

From the CrabLink repo root:

```bash
scripts/check-chrome.sh
scripts/package-chrome.sh
```

Successful output:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

With RustyOnions dev stack running:

```bash
scripts/smoke-local-gateway.sh
```

Successful read-only output:

```text
CrabLink local gateway smoke passed.
```

With bootstrap mutation enabled:

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Successful mutation-enabled output:

```text
bootstrap JSON: ok
ok: /identity/passport/bootstrap -> HTTP 200
CrabLink local gateway smoke passed.
```

RustyOnions backend proof commands:

```bash
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

Then in RustyOnions repo:

```bash
OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
OMNIGATE_WALLET_BEARER=dev \
scripts/web3_crablink_dev_stack.sh
```

Then in CrabLink repo:

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

---

## Current RustyOnions backend dependency

For CrabLink to show online, the RustyOnions dev stack must be running.

Minimum current live backend setup:

### Terminal A: svc-wallet

From RustyOnions repo:

```bash
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

Expected:

```text
svc-wallet listening local_addr=127.0.0.1:8088
```

### Terminal B: CrabLink dev stack

From RustyOnions repo:

```bash
OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
OMNIGATE_WALLET_BEARER=dev \
scripts/web3_crablink_dev_stack.sh
```

Expected:

```text
CrabLink dev stack is online
gateway: http://127.0.0.1:8090
```

Leave this terminal open while using the extension.

### Terminal C: CrabLink smoke

From CrabLink repo:

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Expected:

```text
CrabLink local gateway smoke passed.
```

If Terminal B is closed or Ctrl-C is pressed, the extension will go offline.

---

## Current known limitations

CrabLink is live, but still in the safe MVP phase.

Known limitations:

```text
- no real persistent passport vault yet
- no local encrypted key storage yet
- no PIN/password unlock flow yet
- no real alt anonymous passport selection yet
- no real svc-passport-backed identity persistence yet
- passport identity is still a dev label
- wallet account is still a dev label
- dev bearer token is still local-only
- Create RON Passport may be hidden if passportSubject already exists
- starter grant receipt only appears if bootstrap was run through CrabLink and stored locally
- balance refresh can prove ledger-backed 1776 ROC without showing bootstrap receipt locally
- no recent receipts UI panel yet
- no paid image upload UI yet
- no site launch UI yet
- no content upload/pinning UI yet
- no Chrome Web Store production packaging yet
- no Firefox/Edge/Safari extension variants yet
```

These are acceptable for the current product-proof stage.

---

## Major product requirement now satisfied

User requirement:

```text
Every newly created RON Passport should automatically start with 1776 ROC.
```

Correct implementation path:

```text
CrabLink
→ POST /identity/passport/bootstrap through svc-gateway
→ omnigate
→ svc-wallet issues 1776 ROC
→ ron-ledger commits issue event behind svc-wallet
→ receipt returned
→ CrabLink refreshes wallet balance
→ popup displays 1776 ROC
```

This is now proven in the dev stack.

Manual backend response proved:

```text
starter_grant.issued = true
starter_grant.amount_minor_units = "1776"
starter_grant.receipt_id = "tx_af4862f11cba82e2497d316f2e76fc83"
starter_grant.reason = "issued_by_svc_wallet"
```

Wallet balance response proved:

```text
available_minor_units = "1776"
display = "1776 ROC"
ledger_backed = true
source = "svc_wallet.v1"
```

CrabLink screenshot proved:

```text
ROC: 1776 ROC
Ledger: ledger-backed
```

Wrong implementation remains forbidden:

```text
CrabLink locally sets rocBalanceDisplay = "1776 ROC"
```

Correct implementation:

```text
CrabLink receives backend starter_grant and/or backend wallet balance.
CrabLink displays only backend-returned ROC state.
```

---

## Current no-fake-money invariant

CrabLink must keep this rule permanently:

```text
CrabLink never invents ROC.
CrabLink never invents ledger receipts.
CrabLink never treats display-only fallback as economic truth.
```

Display rules:

```text
If ledger_backed=true:
  show balance as backend wallet truth.

If ledger_backed=false:
  show warning / display-only / not verified state.

If bootstrap receipt is missing locally but balance is ledger-backed:
  show ledger-backed balance, but do not invent receipt id.
```

---

## Current security posture

CrabLink currently follows these rules:

```text
- no seed phrase storage
- no raw private key storage
- no wallet signing key storage
- no long-lived spend authority storage
- no direct ledger access
- no direct wallet access
- no direct passport service access
- no fake ROC truth
- mutation routes require explicit user action or explicit smoke env var
- diagnostics remain read-only by default
- requireSpendConfirm remains enabled by default
```

Current dev-only weak points:

```text
- authToken can store Bearer dev for local testing
- identity is label/header-derived
- wallet account is label/header-derived
- localhost host permissions are required for dev
```

Before public beta:

```text
- remove or heavily gate dev bearer behavior
- integrate real svc-passport backing
- require short-lived/caveated capabilities for spend-like actions
- keep can_spend=false until real spend authority exists
```

---

## Current permissions posture

CrabLink should remain permission-minimal.

Expected Manifest V3 posture:

```text
- no broad host permissions
- no all_urls permission
- host permissions limited to localhost / 127.0.0.1 in dev
- no tabs permission unless truly needed later
- no webRequestBlocking unless absolutely necessary and justified
- no clipboard permissions unless required by UX and reviewed
```

`check-chrome.sh` should continue blocking broad/risky permissions.

---

## Current packaging status

Packaging is green.

Output:

```text
dist/crablink-extension-chrome.zip
```

This zip is suitable for local review/install testing.

Known repo hygiene issue:

```text
.DS_Store files exist in extensions/chrome and asset folders in some codebundle output.
```

The package script excludes them from the zip, but the repo should avoid committing them.

Recommended `.gitignore` additions if not already present:

```text
.DS_Store
__MACOSX/
dist/
```

Do not use unsafe deletion commands casually. Use Git status and GUI/manual cleanup if needed.

---

## Recommended commit set

After verifying the current CrabLink repo state, likely commit files include:

```text
CODEBUNDLE_CHROME_EXTENSION.md
NOTES.MD
extensions/chrome/src/background.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/storage.js
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
extensions/chrome/test/manual-checklist.md
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
shared/schemas/extension-settings.schema.json
shared/schemas/identity-me.schema.json
shared/schemas/passport-bootstrap.schema.json
shared/schemas/wallet-balance.schema.json
shared/fixtures/identity-me.empty.sample.json
shared/fixtures/identity-me.ready.sample.json
shared/fixtures/passport-bootstrap.sample.json
shared/fixtures/wallet-balance.sample.json
```

Recommended commit message:

```text
Wire CrabLink passport, diagnostics, and ledger-backed ROC display
```

Before committing, check:

```bash
git status
scripts/check-chrome.sh
scripts/package-chrome.sh
```

If RustyOnions dev stack is running:

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

---

## Current completion estimate

CrabLink Chrome extension MVP:

```text
75–82% complete
```

CrabLink local product-proof demo:

```text
88–92% complete
```

CrabLink identity/wallet display path:

```text
80–88% complete
```

CrabLink production-grade passport custody:

```text
20–35% complete
```

CrabLink paid content/site/image creation UX:

```text
20–30% complete
```

CrabLink cross-browser readiness:

```text
10–20% complete
```

Reason the local product-proof score is high:

```text
- extension loads
- checks pass
- package builds
- gateway smoke passes
- bootstrap smoke passes
- typed b3 asset page route passes
- crab:// resolver route passes
- identity route passes
- wallet balance route passes
- backend 1776 ROC starter grant works
- extension displays 1776 ROC ledger-backed
```

Reason production readiness is lower:

```text
- no real persistent passport vault yet
- no encrypted local key custody
- no PIN/password unlock
- no real svc-passport-backed identity
- no mature receipt UI
- no paid create/upload UX
- no Chrome Web Store hardening
- no public security review
```

---

## What remains next

### Priority A — Smoke hardening

Update:

```text
scripts/smoke-local-gateway.sh
shared/fixtures/passport-bootstrap.sample.json
shared/fixtures/wallet-balance.sample.json
shared/schemas/passport-bootstrap.schema.json
shared/schemas/wallet-balance.schema.json
```

New smoke assertions should require:

```text
bootstrap starter_grant.issued == true
bootstrap starter_grant.amount_minor_units == "1776"
bootstrap starter_grant.receipt_id is non-empty
bootstrap capabilities.can_spend == false
wallet ledger_backed == true
wallet source == "svc_wallet.v1"
wallet available_minor_units >= 1776
wallet display contains "ROC"
```

This locks in what we manually proved.

### Priority B — Popup starter-grant/receipt sync

Fix the remaining UI mismatch.

Desired behavior after Create RON Passport:

```text
Starter grant: issued by backend
Grant amount: 1776 ROC
Receipt: tx_...
ROC: 1776 ROC
Ledger: ledger-backed
```

Desired behavior after Refresh Balance only:

```text
ROC: 1776 ROC
Ledger: ledger-backed
Starter grant: confirmed by ledger balance
Grant amount: 1776 ROC
Receipt: none / unknown locally
```

### Priority C — First-run passport UX

Improve first install / cleared state:

```text
- no passport loaded state should be obvious
- Create RON Passport should be primary
- explain that the passport is local/dev-backed for now
- explain that wallet truth comes from RustyOnions
- after create, automatically refresh identity and balance
- show success with receipt id
```

### Priority D — Recent receipts panel

Add a small recent receipts section:

```text
- receipt id
- action
- route
- createdAt
- copy receipt button
```

Initial source:

```text
recentReceipts in extension settings
```

Future source:

```text
svc-wallet receipt lookup route through gateway
```

### Priority E — Better offline/dev-stack guidance

When gateway is offline, show a helpful box:

```text
RustyOnions dev stack is not reachable.

Run from RustyOnions repo:
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet

Then:
OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 OMNIGATE_WALLET_BEARER=dev scripts/web3_crablink_dev_stack.sh
```

Keep this dev help only in dev mode.

### Priority F — Create/upload product flows

After identity and balance are polished, add UI for:

```text
- resolve crab://
- inspect asset page
- prepare paid image upload
- upload image / create manifest
- launch simple site
- view site page
```

This should use existing gateway routes:

```text
POST /assets/image/prepare
POST /assets/image
POST /sites/prepare
POST /sites
GET  /sites/:name
```

Do not add direct storage/index calls.

### Priority G — `svc-passport` integration readiness

Eventually replace dev label behavior with real passport custody.

Needed product behavior:

```text
- local persistent passport identity
- main passport
- alternate anonymous/passport identities
- wallet-linked passport permissions
- no automatic wallet authority inheritance for alt passports
- export/import flow later
- PIN/password unlock later
```

CrabLink should remain thin:

```text
CrabLink stores encrypted local passport material only when the final security model is designed.
CrabLink never stores raw wallet signing state.
```

### Priority H — Security hardening before public beta

Before public beta:

```text
- remove or gate Bearer dev behavior
- add production gateway URL validation
- review extension permissions
- review storage schema for secret leakage
- ensure no console logging of tokens
- ensure no response body logs include auth material
- require explicit confirmation before paid/mutation flows
- add manual QA checklist for install/update/clear identity/create passport/offline stack
```

---

## Recommended next implementation sequence

### Batch 1 — Smoke/schema/fixture hardening

Update CrabLink smoke and fixtures to prove 1776 ledger-backed truth.

Files likely touched:

```text
scripts/smoke-local-gateway.sh
shared/fixtures/passport-bootstrap.sample.json
shared/fixtures/wallet-balance.sample.json
shared/schemas/passport-bootstrap.schema.json
shared/schemas/wallet-balance.schema.json
```

Expected result:

```text
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

fails unless:

```text
issued=true
amount=1776
receipt_id exists
ledger_backed=true
source=svc_wallet.v1
```

### Batch 2 — Popup receipt and starter grant sync

Files likely touched:

```text
extensions/chrome/src/popup.js
extensions/chrome/src/storage.js
extensions/chrome/src/popup.html
extensions/chrome/src/styles.css
```

Goal:

```text
CrabLink popup should show starter grant and receipt correctly after Create RON Passport.
```

### Batch 3 — Options/first-run polish

Files likely touched:

```text
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/background.js
extensions/chrome/src/styles.css
```

Goal:

```text
Clear/create/reset flows are obvious and safe.
```

### Batch 4 — Recent receipts display

Files likely touched:

```text
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/storage.js
extensions/chrome/src/styles.css
```

Goal:

```text
Show last bootstrap receipt and recent route receipts in a clean panel.
```

### Batch 5 — Asset/site creator UX

Files likely touched:

```text
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/storage.js
shared/schemas/*
shared/fixtures/*
```

Goal:

```text
Use existing backend product routes to create a simple paid asset/site flow.
```

---

## Commands to preserve as acceptance gates

### Static extension gate

```bash
scripts/check-chrome.sh
```

Expected:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
```

### Package gate

```bash
scripts/package-chrome.sh
```

Expected:

```text
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

### Local gateway smoke gate

With RustyOnions dev stack live:

```bash
scripts/smoke-local-gateway.sh
```

Expected:

```text
CrabLink local gateway smoke passed.
```

### Mutation-enabled starter grant smoke

With RustyOnions dev stack and svc-wallet live:

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Expected now:

```text
CrabLink local gateway smoke passed.
```

Future expected hardened checks:

```text
starter_grant.issued=true
amount_minor_units=1776
receipt_id non-empty
ledger_backed=true
```

---

## Critical risks to watch

### Risk 1 — Fake local ROC regression

Never allow:

```text
rocBalanceDisplay = "1776 ROC"
```

unless it came from backend wallet balance or backend bootstrap/balance response.

### Risk 2 — Silent mutation diagnostics

Never let “Run Diagnostics” silently execute:

```text
POST /identity/passport/bootstrap
POST /assets/image
POST /sites
```

Mutation routes require explicit user action.

### Risk 3 — Double issuance

If Create RON Passport is clicked repeatedly, the backend must prevent repeated free grants.

CrabLink can help by:

```text
- not repeatedly auto-clicking bootstrap
- storing lastBootstrapReceiptId
- displaying existing receipt
- avoiding background/silent grant retries
```

But final prevention must be backend policy/idempotency.

### Risk 4 — Treating passport label as spend authority

Never assume:

```text
passport:main:dev
```

means the user can spend.

Spend authority must be:

```text
short-lived
capability-scoped
amount-limited
action-limited
audience-limited
expiry-limited
```

### Risk 5 — Dev token leakage

Do not log or expose:

```text
Authorization: Bearer dev
```

in UI, console, saved notes, or copied debug blobs.

### Risk 6 — Extension permission creep

Do not add broad permissions casually.

Avoid:

```text
<all_urls>
tabs
webRequestBlocking
nativeMessaging
downloads
clipboardRead
clipboardWrite
```

unless explicitly justified and reviewed.

---

## Final summary

CrabLink has crossed the first major product threshold.

Before this milestone:

```text
CrabLink was a clean extension shell with route diagnostics and a safe identity/wallet façade.
```

After this milestone:

```text
CrabLink is a working RustyOnions browser client that can display ledger-backed ROC from the backend.
```

Current proof:

```text
CrabLink popup:
ROC: 1776 ROC
Ledger: ledger-backed
```

This is the “it is real” moment for the browser product layer.

The remaining work is no longer about proving the flow can exist. It is about making it:

```text
clean
safe
repeatable
idempotent
well-tested
well-documented
secure enough for testers
polished enough for a RON beta demo
```

# END NOTE — APRIL 30 2026 — CrabLink Chrome Extension WEB3_2 Passport/Gateway Milestone


### END NOTE - APRIL 30 2026 - 10:35 CST



### BEGIN NOTE - APRIL 30 2026 - 13:50 CST

````markdown
# CrabLink / RustyOnions Carryover Notes — Built-in `crab://site` and `crab://image` Navigation Next

## 0. Session checkpoint

We are continuing the **CrabLink + RustyOnions WEB3_2 product layer** work.

Current goal has clarified:

```text
CrabLink should NOT directly create sites, upload images, or run creator workflows inside the extension popup.

CrabLink should be the thin browser client:
- identity / passport display
- wallet balance display
- receipt display
- crab:// link resolver
- b3 asset-page resolver
- navigation bridge into RustyOnions product pages

RustyOnions itself should provide built-in product pages:
- crab://site    → page/app for registering and launching a site/domain
- crab://image   → page/app for uploading/creating image assets
- crab://music   → later page/app for songs/music
- crab://article → later page/app for articles/posts
````

The extension should open or resolve these pages, not implement their business logic. That is the correct architectural boundary.

This is now the next major direction:

```text
Build navigation + built-in RON product pages.
```

---

## 1. Important architectural decision made this session

We corrected the extension design.

Earlier we briefly added a “Creator Preview” section to the extension that had buttons like:

```text
Prepare Site
Create Demo Site
Prepare Image Asset
```

That was the wrong product boundary.

The user clarified the correct UX:

```text
To create sites/images/assets, RustyOnions needs built-in pages such as:

crab://site
crab://image

Those pages are where users register domains/sites, upload images, and perform product actions.
The browser extension should navigate to / resolve those pages, not own those workflows.
```

Correct boundary going forward:

```text
CrabLink Extension:
- resolve crab:// links
- open built-in RON pages
- display identity / wallet / receipts
- detect and route crab links
- never silently spend
- never directly create assets/sites

RustyOnions backend:
- owns built-in product page routes
- owns site/image creation workflows
- owns policy, pricing, wallet holds/captures/releases
- owns manifest generation
- owns storage/index integration
- owns receipts
```

---

## 2. Current CrabLink extension status

The Chrome extension is structurally green.

The user ran:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
```

Output:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

So current extension state is:

```text
- manifest loads
- JSON structure checks pass
- JavaScript syntax checks pass
- package zip builds
- extension displays in Chrome
- gateway status can show ONLINE
- identity labels load
- wallet label loads
- wallet balance displays backend response
- route diagnostics render
- recent receipts panel exists
- built-in pages section should replace product creation UI
```

Screenshots show the extension UI is visually working and showing:

```text
CrabLink
Gateway: http://127.0.0.1:8090
Passport: passport:main:dev
Wallet: acct_dev
Status: ONLINE
```

The extension also successfully shows either:

```text
0 ROC / display-only
```

when `svc-wallet` is unreachable, or:

```text
1776 ROC / ledger-backed
```

when the backend wallet path is available and returns ledger-backed truth.

Important: the extension must continue to treat `ledger_backed=false` as display-only and must not treat that as spend authority.

---

## 3. RustyOnions backend status from terminal output

The user ran:

```bash
cd /Users/mymac/Desktop/RustyOnions
chmod +x scripts/web3_crablink_dev_stack.sh scripts/web3_identity_stack_smoke.sh
scripts/web3_crablink_dev_stack.sh
```

The stack came online:

```text
svc-index    http://127.0.0.1:5304
svc-storage  http://127.0.0.1:5303
omnigate     http://127.0.0.1:9090
svc-gateway  http://127.0.0.1:8090
```

The identity smoke passed:

```text
GET  /healthz                         HTTP 200
GET  /readyz                          HTTP 200
GET  /identity/me                     HTTP 200
POST /identity/passport/bootstrap     HTTP 200
GET  /wallet/acct_dev/balance         HTTP 200

WEB3 identity stack smoke passed
```

However, the direct wallet check returned:

```json
{
  "schema": "crablink.wallet.balance.v1",
  "account": "acct_dev",
  "unit": "ROC",
  "available_minor_units": "0",
  "held_minor_units": "0",
  "display": "0 ROC",
  "as_of": null,
  "ledger_backed": false,
  "source": "omnigate_dev_wallet_view.v1",
  "reason": "svc_wallet_unreachable:error sending request for url (http://127.0.0.1:8088/v1/balance?account=acct_dev&asset=roc)",
  "warnings": [
    "display-only dev fallback",
    "real balance must come from svc-wallet and ron-ledger",
    "svc_wallet_balance_unavailable:svc_wallet_unreachable:error sending request for url (http://127.0.0.1:8088/v1/balance?account=acct_dev&asset=roc)",
    "do not treat this route as spend authority"
  ]
}
```

Interpretation:

```text
The gateway/omnigate identity stack works.

But svc-wallet was not reachable at http://127.0.0.1:8088 during that run.

Therefore omnigate correctly returned the safe fallback:
- 0 ROC
- ledger_backed=false
- display-only dev fallback
- warnings present
```

This behavior is good. It prevents fake positive balances.

For the full 1776 ROC proof, the next session must start `svc-wallet` first and configure omnigate to point at it.

---

## 4. Correct terminal order for ledger-backed CrabLink proof

Use this order next session when testing wallet-backed CrabLink.

### Terminal A — RustyOnions `svc-wallet`

```bash
cd /Users/mymac/Desktop/RustyOnions
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

Leave this running.

Expected:

```text
svc-wallet listening on 127.0.0.1:8088
```

Exact log text may vary.

### Terminal B — RustyOnions CrabLink dev stack

```bash
cd /Users/mymac/Desktop/RustyOnions
OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
OMNIGATE_WALLET_BEARER=dev \
scripts/web3_crablink_dev_stack.sh
```

Leave this running.

Expected:

```text
CrabLink dev stack is online
gateway: http://127.0.0.1:8090
```

### Terminal C — CrabLink checks

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Expected for wallet-backed bootstrap:

```text
bootstrap JSON: ok
wallet JSON: ok
CrabLink local gateway smoke passed.
```

Then reload the extension in Chrome and click:

```text
Check Node
Check Passport
Refresh Balance
```

Target UI:

```text
Gateway:  http://127.0.0.1:8090
Passport: passport:main:dev
Wallet:   acct_dev
ROC:      1776 ROC
Ledger:   ledger-backed
Status:   ONLINE
```

---

## 5. Bug encountered in CrabLink smoke script

When running:

```bash
scripts/smoke-local-gateway.sh
```

the script hit:

```text
cp: .../wallet_after.json and .../wallet_after.json are identical (not copied).
```

Cause:

```text
The script wrote wallet_after.json and then tried to copy wallet_after.json to itself.
```

Fix provided:

```text
Update scripts/smoke-local-gateway.sh so validate_wallet() writes directly to the named output file and does not cp the file to itself.
```

Current corrected behavior should be:

```text
validate_wallet "wallet_display" "0"
validate_wallet "wallet_after_bootstrap" "$CRABLINK_SMOKE_REQUIRE_LEDGER"
```

No `cp` needed.

---

## 6. Extension files updated or intended to update

The latest intended CrabLink direction includes these files:

```text
extensions/chrome/src/ronClient.js
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
scripts/check-chrome.sh
scripts/smoke-local-gateway.sh
extensions/chrome/test/manual-checklist.md
```

Key changes:

```text
- Remove direct product mutation methods from ronClient.js:
  - preparePaidObject
  - prepareImageAsset
  - createImageAsset
  - prepareSite
  - createSite

- Remove creator/product mutation UI from popup:
  - Prepare Site
  - Create Demo Site
  - Prepare Image Asset

- Add Built-in RON Pages card:
  - Open crab://site
  - Open crab://image
  - Open crab://music
  - Open crab://article

- Keep diagnostics read-only:
  - /healthz
  - /readyz
  - /identity/me
  - /wallet/:account/balance
  - /b3/<hash>.image
  - /crab/resolve?url=crab://<hash>.image

- Keep passport bootstrap as explicit user action only.
- Do not silently run bootstrap in diagnostics.
- Do not create sites/images from extension.
```

Next session should verify these latest files were pasted and run:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
```

If check script fails, likely issue is that it still expects old Creator Preview IDs. Update the check script to enforce the new boundary:

```text
Require:
- ronPagesBadge
- data-crab-page="site"
- data-crab-page="image"
- openBuiltInRonPage

Forbid:
- prepareSiteButton
- createSiteButton
- prepareImageButton
- creator-card
- prepareSite(
- createSite(
- prepareImageAsset(
```

---

## 7. Next major objective

Build actual built-in RustyOnions pages:

```text
crab://site
crab://image
```

These should be first-class RON product pages served/resolved through the backend.

The long-term model:

```text
crab://site
  → built-in RustyOnions page/app for registering a site name/domain
  → site preparation/pricing
  → wallet hold
  → site manifest generation
  → storage write
  → index pointer
  → receipt display
  → final crab://<site_name> page

crab://image
  → built-in RustyOnions page/app for uploading an image
  → BLAKE3 content ID calculation
  → asset manifest generation
  → owner/payout metadata
  → wallet hold
  → storage write
  → index registration
  → final crab://<64hex>.image page
```

Important distinction:

```text
crab://site is a built-in app/page.
crab://<site_name> is a user-created site pointer.

crab://image is a built-in app/page.
crab://<64hex>.image is a typed b3 image asset page.
```

---

## 8. Critical naming/resolution design issue for next session

We need a clean resolver distinction between:

```text
Reserved built-in product pages:
- crab://site
- crab://image
- crab://music
- crab://article
- crab://post
- crab://comment
- crab://video
- crab://app
- crab://dashboard
- crab://wallet
- crab://passport

User-created named sites:
- crab://myblog
- crab://seawolf
- crab://rusty-demo

Typed hash asset pages:
- crab://<64hex>.image
- crab://<64hex>.video
- crab://<64hex>.music
- crab://<64hex>.article
```

Recommended design:

```text
ron-naming:
- stays pure parser/validator/formatter
- should understand built-in reserved names as a route class
- should not hydrate pages or query databases

omnigate:
- owns product page hydration
- resolves crab://site and crab://image to built-in page DTOs
- resolves typed b3 asset pages via manifest/index/storage as already started
- resolves named sites via svc-index

svc-gateway:
- remains proxy-only
- exposes public browser routes
- forwards /crab/resolve?url=crab://site to omnigate
- optionally exposes HTML render route later

svc-index:
- stores user site pointers and asset manifest pointers
- must reject registration of reserved built-in names like "site" and "image"
```

Need to decide if reserved names live in:

```text
ron-naming::crab::ReservedPageKind
```

or in `ron-proto` DTOs only.

Recommendation:

```text
Put pure reserved-name parsing/validation in ron-naming.
Put response DTOs in ron-proto if shared across services.
Put hydration/render logic in omnigate.
```

---

## 9. Route design proposal for built-in pages

### Public gateway route

The extension and browser client should continue to use:

```http
GET /crab/resolve?url=crab://site
GET /crab/resolve?url=crab://image
```

These should return JSON first.

Later, for browser display, add either:

```http
GET /crab/page?url=crab://site
```

or:

```http
GET /builtin/site
GET /builtin/image
```

But avoid adding too many public route shapes until the JSON contract is stable.

Recommended first route contract:

```http
GET /crab/resolve?url=crab://site
```

returns:

```json
{
  "schema": "omnigate.builtin-page.v1",
  "url": "crab://site",
  "page_kind": "site",
  "title": "Create a RON Site",
  "description": "Register a name and launch a manifest-backed RustyOnions site.",
  "requires_passport": true,
  "requires_wallet": true,
  "actions": [
    {
      "id": "site.prepare",
      "label": "Prepare site launch",
      "method": "POST",
      "route": "/sites/prepare",
      "mutates": false,
      "requires_confirmation": false
    },
    {
      "id": "site.create",
      "label": "Create site",
      "method": "POST",
      "route": "/sites",
      "mutates": true,
      "requires_confirmation": true
    }
  ],
  "fields": [
    {
      "name": "site_name",
      "label": "Site name",
      "type": "text",
      "required": true
    },
    {
      "name": "title",
      "label": "Title",
      "type": "text",
      "required": false
    },
    {
      "name": "description",
      "label": "Description",
      "type": "textarea",
      "required": false
    }
  ],
  "warnings": []
}
```

For `crab://image`:

```json
{
  "schema": "omnigate.builtin-page.v1",
  "url": "crab://image",
  "page_kind": "image",
  "title": "Upload a RON Image",
  "description": "Upload an image, create a b3 image asset page, and attach ownership/payout metadata.",
  "requires_passport": true,
  "requires_wallet": true,
  "actions": [
    {
      "id": "image.prepare",
      "label": "Prepare image upload",
      "method": "POST",
      "route": "/assets/image/prepare",
      "mutates": false,
      "requires_confirmation": false
    },
    {
      "id": "image.create",
      "label": "Create image asset",
      "method": "POST",
      "route": "/assets/image",
      "mutates": true,
      "requires_confirmation": true
    }
  ],
  "fields": [
    {
      "name": "file",
      "label": "Image file",
      "type": "file",
      "accept": "image/*",
      "required": true
    },
    {
      "name": "title",
      "label": "Title",
      "type": "text",
      "required": false
    },
    {
      "name": "description",
      "label": "Description",
      "type": "textarea",
      "required": false
    },
    {
      "name": "tags",
      "label": "Tags",
      "type": "tags",
      "required": false
    }
  ],
  "warnings": []
}
```

This lets the extension/browser render generic built-in pages without owning business logic.

---

## 10. Product-page rendering options

Need to decide in next session how the user actually sees `crab://site`.

There are two viable approaches.

### Option A — JSON-first MVP

For now:

```text
CrabLink resolves crab://site
→ shows JSON page metadata in popup
→ later opens a webview/gateway page
```

Pros:

```text
- fastest
- safest
- easy tests
- preserves gateway/omnigate JSON contracts
```

Cons:

```text
- not yet a real page UX
```

### Option B — Gateway-hosted HTML page

Add route:

```http
GET /crab/page?url=crab://site
```

or:

```http
GET /pages/site
```

Returns HTML generated by omnigate/gateway.

Pros:

```text
- actually navigable in Chrome tab
- extension can open a real tab
- closer to product experience
```

Cons:

```text
- introduces HTML rendering and CSP/security concerns
- must avoid mixing app logic into gateway
- forms must still POST to product routes through gateway
```

Recommendation for next batch:

```text
Start JSON-first with omnigate.builtin-page.v1 DTO.
Then add a very simple gateway-hosted HTML shell only after JSON contract is green.
```

---

## 11. Where built-in page logic belongs

### `ron-naming`

Owns:

```text
- parse crab://site as reserved built-in page
- parse crab://image as reserved built-in page
- parse crab://<name> as named site
- parse crab://<64hex>.<kind> as typed b3 asset
- normalize and validate names/kinds
```

Must not:

```text
- call svc-index
- call svc-storage
- hydrate pages
- enforce wallet/policy
```

Potential additions:

```rust
BuiltInCrabPageKind
CrabTarget::BuiltInPage { kind }
```

or similar, depending on current code.

### `ron-proto`

Owns shared DTOs if the response crosses crate boundaries.

Potential DTO:

```text
ron-proto::asset or ron-proto::product
- BuiltinPage
- BuiltinPageAction
- BuiltinPageField
```

Need to inspect current `ron-proto::asset::page` or equivalent before adding a new module.

### `omnigate`

Owns:

```text
- built-in page resolver
- /v1/crab/resolve behavior for crab://site and crab://image
- product-page DTO generation
- capability requirements in response metadata
- policy hints
```

Must not:

```text
- store bytes
- mutate ledger directly
- directly mutate site/image state except through existing product routes
```

### `svc-gateway`

Owns:

```text
- public route proxy
- headers
- correlation IDs
- query preservation
- no business logic
```

Should simply forward:

```text
GET /crab/resolve?url=crab://site
GET /crab/resolve?url=crab://image
```

to omnigate.

### `svc-index`

Owns:

```text
- named site pointers
- b3 manifest pointers
- reserved-name rejection if registering names
```

Need next-session check:

```text
Does svc-index currently allow "site" or "image" as user site names?
If yes, add reserved-name rejection or upstream validation.
```

### `svc-storage`

Owns:

```text
- bytes by b3 content ID only
```

Must not:

```text
- know about crab://site
- know about names
- know about product-page UI
```

### `svc-wallet`

Owns:

```text
- wallet balance truth
- issue starter grant
- hold/capture/release for site/image actions
- receipts
```

Must remain the mutation front-door for economic operations.

### `svc-passport`

Future owner for:

```text
- real local persistent RON Passport identity
- capability issuance
- wallet-linked permissions
```

Currently extension/dev flow uses labels and gateway bootstrap.

---

## 12. Built-in page naming policy

Need to reserve built-in names early.

Recommended initial reserved set:

```text
site
image
video
music
song
article
post
comment
app
wallet
passport
dashboard
settings
upload
search
home
help
```

Rules:

```text
- These should resolve as built-in RustyOnions pages.
- They should not be registrable as user site names.
- Attempting to register them via /sites should return deterministic error:
  reserved_name
  HTTP 409 or 400 depending current taxonomy
```

Recommendation:

```text
Return 409 Conflict for reserved names, because the name is syntactically valid but unavailable.
```

Need to check existing error taxonomy before choosing.

---

## 13. What to ask/upload next session

For the next implementation session, upload or provide:

```text
RustyOnions:
- CODEBUNDLE_RS.md
- ALLNOTES.MD
- ALL_DOCS_COMBINED.MD
- WEB3.MD
- WEB3_2.MD
- WEB3_2_PRODUCT_ROUTE_CONTRACTS.md
- WEB3_2_IDENTITY_ROUTE_CONTRACTS.md
- TODO_WEB3_2.MD if available
- Current terminal output from cargo checks

CrabLink:
- CODEBUNDLE_CHROME_EXTENSION.md
- NOTES.MD
- current scripts/check-chrome.sh
- current popup.html / popup.js if not included in codebundle
```

Most important crate code to inspect for the next batch:

```text
RustyOnions crates:
- ron-naming
- ron-proto
- omnigate
- svc-gateway
- svc-index
- svc-storage
- svc-wallet

CrabLink:
- extensions/chrome/src/crab.js
- extensions/chrome/src/popup.js
- extensions/chrome/src/ronClient.js
- scripts/check-chrome.sh
```

---

## 14. Recommended next implementation batch

### Batch name

```text
WEB3_2 Built-in Crab Pages Batch 1
```

### Goal

Make this work:

```bash
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://site' | jq .
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://image' | jq .
```

Expected:

```text
schema = omnigate.builtin-page.v1
url = crab://site or crab://image
page_kind = site or image
actions = metadata for existing backend routes
fields = metadata for frontend rendering
requires_passport = true
requires_wallet = true
```

### Files likely touched

Exact paths need codebundle inspection, but likely:

```text
crates/ron-naming/src/crab.rs
crates/ron-naming/src/lib.rs
crates/ron-naming/tests/crab_links.rs

crates/ron-proto/src/asset/page.rs
or a new appropriate module if current architecture already has product page DTOs

crates/omnigate/src/routes/v1/crab.rs
crates/omnigate/tests/asset_page_resolver.rs
or new test:
crates/omnigate/tests/builtin_page_resolver.rs

crates/svc-gateway/tests/product_routes_proxy.rs
or new gateway proxy test for crab://site and crab://image

crates/svc-index tests if reserved-name registration needs enforcement
```

### Avoid touching

Do not put product-page business logic in:

```text
ron-kernel
ron-bus
ron-transport
svc-storage
svc-gateway
CrabLink extension popup
```

---

## 15. Acceptance gates for next batch

Minimum green checks after built-in page batch:

```bash
cargo fmt
cargo clippy -p ron-naming --all-targets --no-deps -- -D warnings
cargo test -p ron-naming --all-targets

cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
cargo test -p omnigate --test builtin_page_resolver
cargo test -p omnigate --all-targets

cargo clippy -p svc-gateway --all-targets --no-deps -- -D warnings
cargo test -p svc-gateway --all-targets
```

If `ron-proto` changes:

```bash
cargo clippy -p ron-proto --all-targets --no-deps -- -D warnings
cargo test -p ron-proto --all-targets
```

Live smoke target:

```bash
scripts/web3_crablink_dev_stack.sh
```

Then:

```bash
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://site' | jq .
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://image' | jq .
```

CrabLink target:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
```

Manual extension target:

```text
Open popup
Click Open crab://site
Should resolve backend built-in page DTO
Click Open crab://image
Should resolve backend built-in page DTO
No direct create/upload action appears in extension
```

---

## 16. Suggested built-in page DTO contract

Use a schema similar to:

```json
{
  "schema": "omnigate.builtin-page.v1",
  "url": "crab://site",
  "page_kind": "site",
  "title": "Create a RON Site",
  "description": "Register a name and launch a manifest-backed RustyOnions site.",
  "requires_passport": true,
  "requires_wallet": true,
  "actions": [
    {
      "id": "site.prepare",
      "label": "Prepare site launch",
      "method": "POST",
      "route": "/sites/prepare",
      "mutates": false,
      "requires_confirmation": false
    },
    {
      "id": "site.create",
      "label": "Create site",
      "method": "POST",
      "route": "/sites",
      "mutates": true,
      "requires_confirmation": true
    }
  ],
  "fields": [
    {
      "name": "site_name",
      "label": "Site name",
      "type": "text",
      "required": true
    }
  ],
  "warnings": []
}
```

Keep this JSON response deterministic.

No random values.

No dynamic wallet mutation.

No direct ledger changes.

No storage writes.

This page DTO is a description of available actions, not an action execution.

---

## 17. Future after built-in JSON page DTOs

After `crab://site` and `crab://image` resolve as JSON, next steps:

### Step 2 — Browser rendering shell

Add a gateway/omnigate route that renders a simple HTML app shell for built-in pages.

Possible route:

```http
GET /crab/page?url=crab://site
```

The extension can open:

```text
http://127.0.0.1:8090/crab/page?url=crab%3A%2F%2Fsite
```

in a Chrome tab.

### Step 3 — Site page form

Build a real `crab://site` page with:

```text
- site name input
- title input
- description input
- preview of required ROC hold
- prepare button
- confirm/create button
- receipt display
- final crab://<site_name> link
```

### Step 4 — Image upload page

Build real `crab://image` page with:

```text
- file picker
- local/display preview
- hash calculation or backend hash result
- title/description/tags
- prepare upload
- confirm/create
- receipt display
- final crab://<64hex>.image link
```

### Step 5 — Hardening

Add:

```text
- CSP for rendered pages
- no inline scripts unless nonce/hash controlled
- no arbitrary remote scripts
- size limits
- MIME validation
- wallet capability checks
- policy fail-closed behavior
- receipt retrieval
```

---

## 18. Important WEB3 invariants to keep repeating

```text
ROC remains internal only.
No ROX/Solana/external settlement yet.
No floating-point money math.
Integer minor units only.
Basis points for percentages.
ron-ledger is durable economic truth.
svc-wallet is the normal mutation front-door.
ron-accounting is not wallet truth.
svc-rewarder does not mutate ledger directly.
Paid operations use hold → capture → release.
Wallet mutations require nonce + idempotency.
No negative balances by default.
Positive balance display must be ledger-backed.
Capabilities/policy fail closed.
b3:<64 lowercase hex> remains canonical content ID.
Public asset URLs use crab://<64hex>.<kind>.
Storage stores bytes by content ID only.
Names are human pointers, not canonical content truth.
```

---

## 19. Key lesson from this session

The CrabLink extension is already valuable as:

```text
- the user’s RON identity/status widget
- the crab:// resolver
- the bridge from normal Chrome into RustyOnions product pages
- the display surface for wallet truth and receipts
```

It should not grow into:

```text
- a wallet engine
- a site builder
- an image uploader
- a ledger client
- a storage client
- a policy engine
```

The real “jaw drop” product moment comes when:

```text
User opens CrabLink
clicks crab://site
RustyOnions serves a built-in site-launch page
user pays/holds ROC
site launches with b3 manifest + receipt
then user opens crab://<site_name>
```

And then:

```text
User opens crab://image
uploads an image
gets crab://<64hex>.image
page shows owner, payout address, tags, storage/provider data, receipts
```

That is the correct next milestone.

```
```


### END NOTE - APRIL 30 2026 - 13:50 CST


### BEGIN NOTE - MAY 1 2026 - 22:30 CST

Note: some earlier uploaded files have expired in this chat. The next instance should have you re-upload the latest `CODEBUNDLE_RS.md`, `ALLNOTES.MD`, `WEB3.MD`, `WEB3_2.MD`, `TODO_WEB3_2.MD`, and the latest CrabLink codebundle if it needs to inspect exact current files. The notes below capture the current working state from this session and the successful terminal outputs.

# RustyOnions + CrabLink Carryover Notes

## Current checkpoint: CrabLink full-tab browser shell working

We are continuing the RustyOnions WEB3_2 / CrabLink work. The active product direction is now clear:

```text
RustyOnions backend = canonical network/services/economy/storage/index truth
CrabLink popup      = wallet/passport/status/control panel
CrabLink full tab   = actual browser-like RON browsing surface
```

The major breakthrough in this session was moving beyond a tiny Chrome extension popup into a real full-page CrabLink browser tab. The full-tab surface can now open and render RustyOnions built-in product pages such as:

```text
crab://site
crab://image
crab://music
crab://article
```

The popup still exists, but it is no longer the main “new internet” browsing surface. The popup should remain a lightweight control panel for node status, passport/wallet info, diagnostics, and quick launch buttons.

The full-tab page now has:

```text
CrabLink logo
address bar
Go button
refresh icon button
ROC balance chip
Passport button/drawer
settings gear button
quick nav buttons
page content renderer
developer JSON details section
```

This is the correct architecture for the extension-first beta.

---

# 1. North-star project constraints to preserve

The next instance must continue following the active RustyOnions WEB3 instructions:

```text
WEB3.MD
WEB3_2.MD
TODO_WEB3_2.MD
CODEBUNDLE_RS.md
ALLNOTES.MD
ALL_DOCS_COMBINED.MD
CODECHECK.md
CODECOMMENTS.MD
```

`WEB3.MD` and `WEB3_2.MD` remain the active north-star docs. `RON_CORE.MD` remains important substrate reference material, but it does not override the current WEB3 / ROC / CrabLink product direction.

Core invariants to preserve:

```text
No ROX
No Solana
No external settlement
No staking
No liquidity
No public bridge
No exchange-facing logic
ROC is internal deterministic accounting/value plane first
No floating-point money math
Integer minor units only
No direct ledger mutation outside svc-wallet / ron-ledger
Storage/gateway/omnigate/accounting/rewarder/browser must not mutate ledger directly
svc-wallet remains normal mutation front door
ron-ledger remains append-only deterministic economic truth
ron-accounting remains transient usage/metering snapshots
svc-rewarder plans deterministic payouts but does not mutate ledger
```

CrabLink-specific invariants:

```text
CrabLink must stay thin.
CrabLink should call public gateway routes only.
CrabLink must not call internal RustyOnions services directly.
CrabLink must not fake wallet balances or ledger truth.
CrabLink must not store private keys, seed phrases, or secret wallet authority.
CrabLink should render gateway DTOs and route contracts.
Mutating actions must require explicit confirmation and should be handled by backend-owned product routes.
```

Canonical URL rule currently confirmed by the user:

```text
Internal content ID:
b3:<64 lowercase hex>

Public CrabLink/crab URL:
crab://<64 lowercase hex>.<asset_kind>

No public crab://b3/<hash> path prefix.
```

Examples:

```text
crab://<hash>.image
crab://<hash>.video
crab://<hash>.music
crab://<hash>.article
crab://<hash>.post
crab://<hash>.comment
```

Built-in product pages are reserved human entry points:

```text
crab://site
crab://image
crab://music
crab://article
```

---

# 2. What we accomplished on the RustyOnions backend side

## 2.1 omnigate crab resolver now supports built-in product pages

We updated:

```text
/Users/mymac/Desktop/RustyOnions/crates/omnigate/src/routes/v1/crab.rs
```

The resolver now handles both typed b3 asset URLs and reserved built-in product page URLs.

Supported active built-ins:

```text
crab://site
crab://image
```

Supported reserved coming-soon built-ins:

```text
crab://music
crab://article
```

The backend DTO for built-in pages is:

```text
schema: omnigate.builtin-page.v1
url
page_kind
status
title
description
requires_passport
requires_wallet
actions[]
fields[]
warnings[]
```

Current behavior:

```text
crab://site
→ status: active
→ requires_passport: true
→ requires_wallet: true
→ actions:
   - site.prepare → POST /sites/prepare, mutates=false
   - site.create  → POST /sites, mutates=true, requires_confirmation=true
→ fields:
   - site_name
   - title
   - description

crab://image
→ status: active
→ requires_passport: true
→ requires_wallet: true
→ actions:
   - image.prepare → POST /assets/image/prepare, mutates=false
   - image.create  → POST /assets/image, mutates=true, requires_confirmation=true
→ fields:
   - file, accept image/*
   - title
   - description
   - tags

crab://music
→ status: coming_soon
→ requires_passport: false
→ requires_wallet: false
→ actions: []
→ warnings: ["music_page_coming_soon"]

crab://article
→ status: coming_soon
→ requires_passport: false
→ requires_wallet: false
→ actions: []
→ warnings: ["article_page_coming_soon"]
```

Important: `music` and `article` are intentionally reserved but non-mutating. They exist to prevent scary “Failed to fetch” style UX and to prove future product namespace reservation.

## 2.2 Backend tests passed

Commands run successfully:

```bash
cd /Users/mymac/Desktop/RustyOnions
cargo fmt
cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
cargo test -p omnigate --test asset_page_resolver
cargo test -p omnigate --test builtin_page_resolver
```

Results:

```text
asset_page_resolver:
15 passed

builtin_page_resolver:
6 passed

clippy:
omnigate clean with -D warnings
```

## 2.3 Built-in crab pages verified through gateway

The RustyOnions CrabLink dev stack was started:

```bash
cd /Users/mymac/Desktop/RustyOnions
chmod +x scripts/web3_crablink_dev_stack.sh scripts/web3_identity_stack_smoke.sh
scripts/web3_crablink_dev_stack.sh
```

Observed running services:

```text
svc-index:    http://127.0.0.1:5304
svc-storage:  http://127.0.0.1:5303
omnigate:     http://127.0.0.1:9090
svc-gateway:  http://127.0.0.1:8090
policy:       disabled for local CrabLink dev config only
```

Gateway health checks passed:

```bash
curl -i http://127.0.0.1:8090/healthz
curl -i http://127.0.0.1:8090/readyz
```

Observed:

```text
/healthz → HTTP 200 ok
/readyz  → HTTP 200 ready
```

Built-ins verified:

```bash
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://site' | jq .
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://image' | jq .
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://music' | jq .
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://article' | jq .
```

All returned expected `omnigate.builtin-page.v1` DTOs.

## 2.4 Identity smoke passed

The dev stack also ran identity smoke:

```text
GET /healthz                  → 200
GET /readyz                   → 200
GET /identity/me              → 200
POST /identity/passport/bootstrap → 200
GET /wallet/acct_dev/balance  → 200
```

Result:

```text
WEB3 identity stack smoke passed
```

The extension currently shows:

```text
passport: passport:main:dev
wallet: acct_dev
ROC: 0 ROC
ledger: display-only
```

This means the UI is wired, but the local smoke may be running with display-only balance depending on config. Do not fake it client-side.

---

# 3. What we accomplished in CrabLink

CrabLink repo location:

```text
/Users/mymac/Desktop/crablink
```

CrabLink GitHub repo name:

```text
crablink
```

Known GitHub URL:

```text
https://github.com/Y3LLOWVESTS/crablink.git
```

## 3.1 Extension health checks pass

Commands run:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/smoke-local-gateway.sh
scripts/package-chrome.sh
```

Observed:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
CrabLink local gateway smoke passed.
```

The local smoke verified:

```text
/healthz
/readyz
/identity/me
/wallet/acct_dev/balance
/b3/<sample>.image
/crab/resolve?url=crab://<sample>.image
```

We later extended or planned to extend smoke coverage for:

```text
crab://site
crab://image
crab://music
crab://article
```

The next instance should confirm the latest `scripts/smoke-local-gateway.sh` includes those built-in page checks. If not, add them.

## 3.2 Popup fixed and stabilized

We had layout issues in the popup because a compact/newer `popup.html` and the richer `popup.js` were mismatched. The popup had buttons and header content overflowing the popup window. We fixed this by returning to an older stable layout style from the CrabLink codebundle:

```text
body.popup
app-header
brand-row
status-card
normal stacked cards
single-column safe built-in page buttons
```

The popup now behaves more like a compact control panel.

Popup responsibilities:

```text
Check Node
Check Passport
Refresh Balance
Create Dev Passport + Starter ROC
Show passport/wallet/ROC/ledger labels
Run diagnostics
Show recent receipts
Open built-in RON pages
Resolve debug URLs if needed
```

Important UX decision: popup should not become the browsing surface. The popup is too small and temporary. It should stay as a control/status panel.

## 3.3 Full-tab browser surface created

New files created:

```text
/Users/mymac/Desktop/crablink/extensions/chrome/src/page.html
/Users/mymac/Desktop/crablink/extensions/chrome/src/page.css
/Users/mymac/Desktop/crablink/extensions/chrome/src/page.js
```

The full tab opens at:

```text
chrome-extension://<extension-id>/src/page.html?url=crab%3A%2F%2Fsite
```

or similar.

Full-tab behavior:

```text
Reads ?url= query param
Loads settings from chrome.storage.local
Creates RonClient from settings
Normalizes input through crab.js
Resolves through public svc-gateway routes only
Renders built-in page DTOs as clean UI
Renders typed asset page DTOs as clean UI
Keeps raw JSON behind Developer JSON details section
Has Passport drawer
Has address bar
Has quick nav buttons
```

## 3.4 Popup buttons now open the full-tab browser

We updated popup behavior so built-in buttons should open full CrabLink tabs instead of trying to render the page inside the tiny popup.

Expected:

```text
Click crab://site in popup
→ opens full CrabLink tab

Click crab://image in popup
→ opens full CrabLink tab

Click crab://music in popup
→ opens full CrabLink tab

Click crab://article in popup
→ opens full CrabLink tab
```

The popup still has debug result rendering for some cases, but the intended product path is full-tab browsing.

## 3.5 Omnibox now opens full-tab browser

Chrome raw `crab://site` in the normal URL bar does not reliably route through a Manifest V3 extension. Chrome’s omnibox API works through a keyword flow.

Current supported flow:

```text
Type: crab
Press: Tab
Then type: site
Press: Enter
```

Expected:

```text
crab [Tab] site [Enter]
→ opens CrabLink full tab for crab://site

crab [Tab] image [Enter]
→ opens CrabLink full tab for crab://image

crab [Tab] music [Enter]
→ opens CrabLink full tab for crab://music

crab [Tab] article [Enter]
→ opens CrabLink full tab for crab://article
```

Important technical reality:

```text
Raw crab://site directly in Chrome’s URL bar is not solved yet.
That likely needs:
- native OS protocol handler,
- Tauri/desktop CrabLink app,
- full custom CrabLink browser,
- PWA protocol handler,
- or browser support that can actually claim custom schemes.
```

For beta, use the omnibox keyword flow and/or the full-tab CrabLink address bar.

## 3.6 Full-tab browser visual state

The latest screenshot showed the full-tab browser working well. It had:

```text
CrabLink logo
address bar showing crab://site
Go button
ROC chip
Refresh icon
Passport button
Settings gear
quick nav buttons:
  crab://site
  crab://image
  crab://music
  crab://article
main page panel:
  Create a RON Site
  Active badge
  description
  facts grid
  actions
  fields
```

The latest requested polish was:

```text
Make settings gear icon larger.
Move refresh button to the right of Go button.
Fix top ROC display so it does not show "ROC 0 ROC"; only "0 ROC".
```

The last provided patch attempted to do this by updating:

```text
page.html
page.css
page.js
```

Expected top bar order after that patch:

```text
Address bar | Go | Refresh | 0 ROC | Passport | Gear
```

The next instance should verify the actual latest files and run:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
```

Then reload extension in:

```text
chrome://extensions
```

---

# 4. Current known command checklist

## Start RustyOnions dev stack

```bash
cd /Users/mymac/Desktop/RustyOnions
chmod +x scripts/web3_crablink_dev_stack.sh scripts/web3_identity_stack_smoke.sh
scripts/web3_crablink_dev_stack.sh
```

Leave that terminal open.

## Verify backend

```bash
curl -i http://127.0.0.1:8090/healthz
curl -i http://127.0.0.1:8090/readyz
```

```bash
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://site' | jq .
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://image' | jq .
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://music' | jq .
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://article' | jq .
```

## Verify CrabLink

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/smoke-local-gateway.sh
scripts/package-chrome.sh
```

## Reload extension

```text
chrome://extensions
Developer mode ON
CrabLink Extension for Chrome
Reload
```

## Manual tests

Popup:

```text
Open popup
Check Node
Check Passport
Refresh Balance
Click crab://site
Click crab://image
Click crab://music
Click crab://article
```

Full tab:

```text
Use address bar:
crab://site
crab://image
crab://music
crab://article
```

Omnibox:

```text
crab [Tab] site [Enter]
crab [Tab] image [Enter]
crab [Tab] music [Enter]
crab [Tab] article [Enter]
```

---

# 5. Current architecture status

## Completed / working

```text
Backend built-in resolver contract
CrabLink popup control panel
CrabLink full-tab browser shell
CrabLink gateway client
CrabLink settings/options
CrabLink omnibox keyword route
CrabLink local gateway smoke
CrabLink check/package scripts
Identity smoke through gateway
Basic wallet balance display
Basic passport drawer
Built-in page UI rendering
Developer JSON hiding behind details
```

## Still intentionally not implemented

```text
Actual image upload
Actual site creation
Actual music upload
Actual article creation
Paid prepare/hold/capture UX
Manifest construction from browser
Direct file hashing in extension
b3 asset creation flow
name registration flow
site publishing flow
native raw crab:// protocol handler
real full custom CrabLink browser
production auth/passport security
multi-passport management
alt anonymous passports
permission grants per site/app
```

---

# 6. Recommended next step

The best next step is **not** to jump immediately into complex backend mutation while tired. Lock the browser shell first.

## Next batch recommendation: CrabLink browser shell polish

Add browser-like controls:

```text
Back button
Forward button
Home button
Refresh placed beside Go
Address bar refinement
ROC chip polish
Passport icon or improved passport drawer
Settings gear polish
Page title update based on current crab page
Maybe favicon/icon update based on page kind
```

Why this first:

```text
It locks in the huge UI breakthrough.
It gives us a stable browsing surface.
It makes the project demo-ready.
It reduces friction before building real creator workflows.
```

Suggested top bar layout:

```text
[CrabLink logo] [Back] [Forward] [Home] [address bar] [Go] [Refresh] [0 ROC] [Passport] [Gear]
```

Expected full-tab behavior after polish:

```text
Back / Forward use browser history
Home opens crab://site or a future crab://home
Refresh reloads current CrabLink page
Go resolves address bar
ROC chip updates after balance refresh
Passport opens drawer
Gear opens options page
```

---

# 7. After browser shell polish: build crab://image first

After the browser shell is stable, the next major product milestone should be:

```text
Make crab://image real.
```

Reason: `crab://image` proves RustyOnions’ most important signature feature:

```text
uploaded bytes
→ BLAKE3 content ID
→ b3:<64 lowercase hex>
→ crab://<hash>.image
→ storage by content ID
→ image manifest
→ owner/passport/payout metadata
→ svc-index manifest pointer
→ gateway/omnigate typed asset page
→ CrabLink displays asset page
```

This is a stronger demo than site registration because it proves the full b3 asset page model.

## Target UX for crab://image

Full tab opens:

```text
Upload a RON Image

Fields:
- image file
- title
- description
- tags
- owner passport
- payout wallet/account

Buttons:
- Preview
- Prepare upload
- Create image asset
```

After submit:

```text
Returns:
- asset_cid: b3:<hash>
- crab_url: crab://<hash>.image
- manifest_cid
- owner
- payout
- receipt(s), if paid flow is enabled
```

Then CrabLink should navigate to:

```text
crab://<hash>.image
```

## Backend work likely needed for crab://image

Need inspect current `svc-gateway`, `omnigate`, `svc-storage`, `svc-index`, `ron-naming`, `ron-proto`, and possibly `ron-policy`.

Likely path:

```text
CrabLink full tab
→ POST /assets/image/prepare
→ POST /assets/image
→ svc-gateway route
→ storage write/pin path
→ b3 hash computed/canonicalized
→ manifest built
→ manifest stored by content ID
→ index pointer created
→ asset page resolves via omnigate
```

Need preserve boundary:

```text
CrabLink does not directly write to storage.
CrabLink does not mutate ledger.
CrabLink does not create index records directly.
svc-gateway/omnigate/product routes coordinate through existing services.
svc-wallet handles any paid hold/capture if enabled.
```

---

# 8. After crab://image: build crab://site

After image upload is real, move to:

```text
Make crab://site real.
```

Target UX:

```text
Create a RON Site

Fields:
- site name
- title
- description
- owner passport
- wallet/payout account
- optional tags
- optional landing content / manifest pointer

Flow:
- check name availability
- prepare site launch
- create/register site
- return crab://site/<name> or chosen canonical site URL format
```

Need decide exact public URL format for site names. Current active hash canonical rule remains `crab://<hash>.<kind>`. Names are optional human pointers. For sites, likely:

```text
crab://site
```

is the built-in creation page.

A registered site might resolve via a human name route, but names must not replace b3 canonical IDs. Need consult `WEB3_2.MD`, `ron-naming`, `svc-index`, and current gateway route contracts before finalizing.

Important principle:

```text
Names are human pointers.
b3 hashes are canonical.
Storage stores bytes by content ID only.
Naming/index/gateway/omnigate resolve names/manifests/pages upstream.
```

---

# 9. Known Chrome/browser URL limitation

Do not waste too much time trying to make raw `crab://site` typed into Chrome’s native URL bar work through MV3.

Known reality:

```text
Chrome extension omnibox keyword works:
crab [Tab] site

Raw crab://site native browser bar handling is a separate future feature.
```

Future options:

```text
CrabLink Tauri desktop app with OS protocol handler
Full custom CrabLink browser
PWA protocol handler
Chrome extension protocol_handlers only if stable/suitable
Native helper app
```

For beta:

```text
Use full-tab extension browser + omnibox keyword.
```

---

# 10. Files touched / likely current CrabLink file list

Important CrabLink paths:

```text
/Users/mymac/Desktop/crablink/extensions/chrome/manifest.json
/Users/mymac/Desktop/crablink/extensions/chrome/src/background.js
/Users/mymac/Desktop/crablink/extensions/chrome/src/content.js
/Users/mymac/Desktop/crablink/extensions/chrome/src/popup.html
/Users/mymac/Desktop/crablink/extensions/chrome/src/popup.js
/Users/mymac/Desktop/crablink/extensions/chrome/src/styles.css
/Users/mymac/Desktop/crablink/extensions/chrome/src/options.html
/Users/mymac/Desktop/crablink/extensions/chrome/src/options.js
/Users/mymac/Desktop/crablink/extensions/chrome/src/ronClient.js
/Users/mymac/Desktop/crablink/extensions/chrome/src/storage.js
/Users/mymac/Desktop/crablink/extensions/chrome/src/crab.js
/Users/mymac/Desktop/crablink/extensions/chrome/src/page.html
/Users/mymac/Desktop/crablink/extensions/chrome/src/page.css
/Users/mymac/Desktop/crablink/extensions/chrome/src/page.js
/Users/mymac/Desktop/crablink/scripts/check-chrome.sh
/Users/mymac/Desktop/crablink/scripts/smoke-local-gateway.sh
/Users/mymac/Desktop/crablink/scripts/package-chrome.sh
```

Important RustyOnions paths:

```text
/Users/mymac/Desktop/RustyOnions/crates/omnigate/src/routes/v1/crab.rs
/Users/mymac/Desktop/RustyOnions/crates/omnigate/tests/asset_page_resolver.rs
/Users/mymac/Desktop/RustyOnions/crates/omnigate/tests/builtin_page_resolver.rs
/Users/mymac/Desktop/RustyOnions/scripts/web3_crablink_dev_stack.sh
/Users/mymac/Desktop/RustyOnions/scripts/web3_identity_stack_smoke.sh
```

Before code generation in next session:

```text
Review CODECHECK.md.
Use CODECOMMENTS.MD conventions for full paste-ready files.
Provide full files with exact paths, not snippets.
Do not recommend rm commands; use safer cleanup only if needed.
```

---

# 11. Current emotional/project status

User is extremely happy with progress and described being overjoyed but also experiencing brain fog. The project made a major visual/product leap this session. The next instance should not overwhelm the user with too many simultaneous branches.

Best next-session framing:

```text
We have a working full-tab CrabLink browser shell.
Let’s lock it down with one browser-polish batch.
Then we start making crab://image real.
```

Do not immediately jump into five crates. Keep the next batch narrow.

Recommended first question for next instance:

```text
Please upload the latest CrabLink codebundle and the latest RustyOnions CODEBUNDLE_RS.md if you want me to inspect exact current files. Based on the carryover notes, I recommend we start with the CrabLink browser-shell polish batch: Back / Forward / Home, final top-bar alignment, ROC chip polish, and check-chrome coverage.
```

---

# 12. Immediate next-session task list

## Task A — Re-upload current docs/codebundles

Ask user for:

```text
Latest CrabLink codebundle
Latest RustyOnions CODEBUNDLE_RS.md
Latest ALLNOTES.MD
Latest WEB3.MD
Latest WEB3_2.MD
Latest TODO_WEB3_2.MD
```

## Task B — Verify current state

Run:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
```

Run while RustyOnions dev stack is active:

```bash
scripts/smoke-local-gateway.sh
```

## Task C — Browser polish batch

Update full-tab files:

```text
page.html
page.css
page.js
check-chrome.sh if needed
```

Add:

```text
Back button
Forward button
Home button
better topbar layout
ROC chip single text
larger settings gear
refresh next to Go
history behavior
home opens crab://site or crab://home placeholder
```

## Task D — Lock with tests

Run:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
```

Then manual:

```text
Open full tab
Go to crab://site
Go to crab://image
Back
Forward
Home
Refresh
Open Passport drawer
Settings gear
```

## Task E — Begin real `crab://image`

Only after shell polish is stable.

Need inspect backend route contracts and decide smallest safe first implementation.

---

# 13. Definition of done for next milestone

The CrabLink browser shell milestone is done when:

```text
Popup opens full-tab pages reliably.
Omnibox keyword opens full-tab pages reliably.
Full tab has Back / Forward / Home / Refresh / Go.
Full tab renders built-in pages cleanly.
Full tab renders coming-soon pages cleanly.
Full tab shows ROC balance chip without duplicate ROC text.
Passport drawer displays gateway/passport/wallet/ROC/ledger.
Settings gear opens options.
check-chrome.sh passes.
package-chrome.sh passes.
smoke-local-gateway.sh passes.
RustyOnions dev stack resolves built-ins through gateway.
```

After that, move to:

```text
crab://image real upload/manifest workflow
```

### END NOTE - MAY 1 2026 - 22:30 CST




### BEGIN NOTE - MAY 2 2026 - 00:05 CST

# BEGIN NOTE — MAY 2 2026 — CrabLink Full-Tab Browser + Built-In Page Prepare Milestone

## 0. Current checkpoint

We are continuing the separate browser-client repo:

```text
/Users/mymac/Desktop/crablink
````

Product/repo identity:

```text
Repo: crablink
Product: CrabLink
First client: CrabLink Extension for Chrome
Target browser model: Chrome Manifest V3 extension first, future CrabLink browser/client family later
```

CrabLink remains separate from the RustyOnions monorepo. This is intentional and correct.

Current role split:

```text
RustyOnions:
- backend substrate
- gateway
- omnigate
- storage
- index
- wallet
- ledger
- accounting
- rewarder
- policy
- product routes
- canonical b3/content truth
- ROC economic truth

CrabLink:
- browser-facing client
- full-tab browser shell
- popup control/status panel
- settings/options UI
- local safe labels/settings
- gateway HTTP client
- crab:// navigation UX
- typed b3 asset-page display
- non-mutating prepare-route UX
```

CrabLink must remain:

```text
thin
honest
safe
gateway-only
permission-minimal
backend-truth-driven
future-browser-ready
```

CrabLink must not become:

```text
wallet truth engine
ledger
storage service
index service
gateway replacement
policy engine
fake backend simulator
private-key custody layer
direct svc-wallet/svc-storage/svc-index client
```

---

## 1. Active backend / product context

RustyOnions WEB3_2 product routes already expose the product surface CrabLink is using.

Known public gateway route contracts include:

```text
GET  /crab/resolve?url=<crab_url>
GET  /b3/<hash>.<asset_kind>
POST /paid/o/prepare
POST /assets/image/prepare
POST /assets/image
POST /sites/prepare
POST /sites
GET  /sites/:name
```

Important backend responsibility split:

```text
svc-gateway:
- public ingress / stable browser paths
- proxy selected headers/bodies to omnigate
- preserve query strings
- filter hop-by-hop headers
- return upstream product bodies

omnigate:
- product hydration
- built-in page contracts
- asset/site prepare responses
- product DTO composition

svc-storage:
- stores bytes by content ID only

svc-index:
- manifest pointers / site names / asset index lookups

svc-wallet:
- wallet mutation front-door
- hold/capture/release/receipt

ron-ledger:
- durable append-only economic truth
```

CrabLink must not shortcut any of that.

---

## 2. Canonical URL and content rules

Internal content IDs remain:

```text
b3:<64 lowercase hex>
```

Public typed asset URLs remain:

```text
crab://<64 lowercase hex>.<asset_kind>
```

Examples:

```text
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.image
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.video
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.article
```

Do not reintroduce the old public URL form:

```text
crab://b3/<hash>.<asset_kind>
```

Names remain human pointers. b3 hashes remain canonical.

Current built-in product page URLs:

```text
crab://site
crab://image
crab://music
crab://article
```

Current registered site URL shape from route contracts:

```text
crab://<site_name>
```

Important reminder:

```text
crab://site is the built-in site-launch page.
crab://<site_name> is a named site pointer.
crab://<hash>.<kind> is the canonical typed asset page.
```

---

## 3. What we accomplished in this latest CrabLink session

## 3.1 Full-tab browser proof is working

The CrabLink full-tab browser now opens and renders real built-in RustyOnions product pages through the local gateway.

Working examples:

```text
crab://site
crab://image
crab://music
crab://article
```

The full-tab browser displays:

```text
CrabLink logo/title
browser-style top bar
Back button
Forward button
Home button
address bar
Go button
Refresh icon
ROC balance chip
Passport button
Settings gear
quick nav buttons
main page panel
facts grid
available actions
fields
developer JSON details
passport drawer
footer status line
```

The full-tab UI is now the correct browsing surface. The popup remains a compact status/control panel.

## 3.2 Backend connection verified

The RustyOnions dev stack was started successfully, and the user verified:

```text
curl -i http://127.0.0.1:8090/healthz
→ HTTP 200 ok

curl -i http://127.0.0.1:8090/readyz
→ HTTP 200 ready

curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://site' | jq .
→ schema: omnigate.builtin-page.v1
→ page_kind: site
→ status: active
→ title: Create a RON Site
→ actions include /sites/prepare and /sites
→ fields include site_name/title/description
```

This proved:

```text
CrabLink full tab
→ svc-gateway at http://127.0.0.1:8090
→ omnigate built-in page resolver
→ product route contract DTO
→ rendered in browser
```

## 3.3 Built-in page resolver is visible in CrabLink

The full-tab browser renders backend DTOs for:

```text
crab://site
crab://image
```

Observed working page behavior:

```text
crab://site:
- title: Create a RON Site
- active badge
- facts grid
- prepare site launch action
- create site action
- site_name/title/description fields

crab://image:
- image upload draft form
- prepare image upload action
- create image asset action
- image file/title/description/tags fields
```

`crab://music` and `crab://article` remain reserved/product-layer pages for later expansion.

## 3.4 Browser top bar polish completed

We adjusted the full-tab browser top bar into the desired browser-like layout:

```text
[CrabLink logo] [Back] [Forward] [Home] [address bar] [Go] [Refresh] [0 ROC] [Passport] [Gear]
```

Working expectations:

```text
Back / Forward use browser history
Home opens crab://site
Refresh reloads current CrabLink page
Go resolves address bar input
ROC chip displays cleanly as “0 ROC” or backend balance
Passport opens drawer
Gear opens options page
```

The settings gear icon was enlarged, the refresh button was moved to the right side near Go, and the duplicated ROC label was fixed.

## 3.5 Request draft UX added

For built-in product pages, CrabLink now builds local request-preview JSON from backend route contracts.

For `crab://site`, observed:

```text
Site Launch Draft
Build Request Preview
Send Prepare Request
Clear Draft
Copy Draft JSON
Copy Prepare JSON
```

Fields:

```text
site_name
title
description
```

For `crab://image`, observed:

```text
Image Upload Draft
Build Request Preview
Send Prepare Request
Clear Draft
Copy Draft JSON
Copy Prepare JSON
```

Fields:

```text
image file
title
description
tags
```

The draft is intentionally local first. It clearly states:

```text
CrabLink will not create sites/images, upload bytes, spend ROC, capture holds, or mutate ledger truth.
```

## 3.6 Non-mutating prepare-route calls now work

CrabLink now safely calls real backend non-mutating prepare routes:

```text
POST /sites/prepare
POST /assets/image/prepare
```

These are preflight/estimate/hold-template routes. They are allowed because they do not create the final asset/site and do not directly mutate ledger truth.

Observed working site flow:

```text
User opened crab://site
Typed site name and description
Clicked Build Request Preview
Clicked Send Prepare Request
Backend returned prepare response
CrabLink rendered raw JSON and a prepare response panel
```

Proven chain:

```text
CrabLink full tab
→ crab://site built-in page
→ local request draft
→ POST /sites/prepare through svc-gateway
→ omnigate route contract response
→ safe prepare response rendered back in CrabLink
```

## 3.7 Strict JSON issue found and fixed for image prepare

When first testing `crab://image`, the backend rejected the prepare request:

```text
HTTP 400
code: invalid_image_prepare_request
message: image prepare request must be strict JSON
reason: bad_json
```

Root cause:

```text
CrabLink sent an extra field not accepted by /assets/image/prepare:
owner_wallet_account
```

Backend strict JSON correctly rejected this because image prepare expects only fields such as:

```text
bytes
payer_account
owner_passport_subject
content_type
expected_asset_cid
title
description
tags
client_idempotency_key
```

We fixed the image prepare request body to remove the unsupported image field.

## 3.8 Image prepare now works end-to-end

After the strict JSON fix, `crab://image` prepare worked.

Observed successful prepare summary:

```text
PREPARED
Image Prepare Ready
schema: omnigate.image-asset-prepare.v1
action: paid_storage_put
asset: roc
bytes: 121927
amount minor: 121927
minimum hold: 121927
payer account: acct_dev
idempotency hint: crablink-preview:image:logo.png
status: 200
route: /assets/image/prepare
ok: true
```

This proves:

```text
crab://image
→ Build Request Preview
→ Send Prepare Request
→ POST /assets/image/prepare
→ strict JSON accepted
→ paid_storage_put prepare response returned
→ CrabLink summary UI rendered it
```

The prepare response identified the next gated steps:

```text
1. Create a wallet hold through /v1/wallet/hold.
2. After wallet hold confirmation, submit through /v1/assets/image.
3. After create/upload, resolve new page through /v1/crab/resolve?url=crab://<hash>.image.
4. CrabLink still needs the future hold-confirmation flow before upload can be enabled.
```

## 3.9 Prepare Summary UI added

CrabLink now renders a human-readable prepare summary above the raw JSON.

The summary extracts useful values from backend response JSON:

```text
schema
action
asset
bytes
amount minor
minimum hold
payer account
idempotency hint
next gated steps
```

This dramatically improves UX because the user does not have to read raw JSON to understand the result.

Raw JSON remains available in the two-column preview area:

```text
Request Preview
Prepare Response
```

Developer JSON remains behind `<details>`.

---

## 4. Files updated in the latest batches

The most recent CrabLink changes focused on these files:

```text
/Users/mymac/Desktop/crablink/extensions/chrome/src/page.html
/Users/mymac/Desktop/crablink/extensions/chrome/src/page.css
/Users/mymac/Desktop/crablink/extensions/chrome/src/page.js
/Users/mymac/Desktop/crablink/extensions/chrome/src/ronClient.js
/Users/mymac/Desktop/crablink/scripts/check-chrome.sh
```

Purpose by file:

```text
page.html:
- full-tab browser structure
- workflow section
- request preview
- prepare response
- prepare summary
- next gated steps panel

page.css:
- full-tab browser styling
- topbar
- navigation controls
- workflow form
- summary cards
- preview grid
- prepare result styling

page.js:
- full-tab browser logic
- history navigation
- crab:// input parsing
- built-in page rendering
- draft construction
- strict prepare JSON bodies
- prepare route calling
- prepare summary rendering
- safe no-mutation boundary

ronClient.js:
- centralized gateway-only client
- get health/ready/identity/wallet
- resolve crab links
- resolve b3 asset pages
- resolve site pages
- prepare image asset
- prepare site
- headers/correlation/idempotency handling

scripts/check-chrome.sh:
- verifies required files
- verifies manifest permissions
- verifies page/popup/options structure
- verifies no old crab://b3 URL form
- verifies no create/upload mutation client methods were added
- verifies JS syntax
```

Important: after this latest session, `CODEBUNDLE_CHROME_EXTENSION.md` is likely stale unless regenerated.

---

## 5. Current manual proofs from screenshots

## 5.1 `crab://site` proof

Screenshot showed:

```text
CrabLink full-tab browser
address: crab://site
Site Launch Draft
Build Request Preview
Send Prepare Request
Request Preview JSON
Prepare Response JSON
Available Actions
Prepare site launch
Create site
Fields
```

User typed a website name and description, clicked:

```text
Build Request Preview
Send Prepare Request
```

Result:

```text
/site prepare flow worked
prepare response returned and displayed
```

## 5.2 `crab://image` proof

Screenshot showed:

```text
CrabLink full-tab browser
address: crab://image
Image Upload Draft
image file selected: logo.png
description/tags filled
Build Request Preview
Send Prepare Request
Prepare Summary displayed
PREPARED
Image Prepare Ready
ok: true
status: 200
schema: omnigate.image-asset-prepare.v1
action: paid_storage_put
asset: roc
bytes: 121927
amount_minor: 121927
minimum_hold: 121927
payer_account: acct_dev
```

This is the strongest current product proof.

---

## 6. Current validation commands

From CrabLink repo:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
```

Expected:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

Then reload extension:

```text
chrome://extensions
Developer mode ON
CrabLink Extension for Chrome
Reload
```

RustyOnions dev stack minimum:

```bash
cd /Users/mymac/Desktop/RustyOnions
scripts/web3_crablink_dev_stack.sh
```

Verify backend:

```bash
curl -i http://127.0.0.1:8090/healthz
curl -i http://127.0.0.1:8090/readyz
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://site' | jq .
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://image' | jq .
```

Optional ledger-backed wallet flow requires svc-wallet first:

```bash
cd /Users/mymac/Desktop/RustyOnions
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

Then RustyOnions dev stack with wallet base:

```bash
cd /Users/mymac/Desktop/RustyOnions
OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
OMNIGATE_WALLET_BEARER=dev \
scripts/web3_crablink_dev_stack.sh
```

Then CrabLink smoke:

```bash
cd /Users/mymac/Desktop/crablink
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

---

## 7. Current architecture status

## Completed / working

```text
CrabLink separate repo exists
Chrome MV3 extension loads
minimal permissions enforced
local gateway host permissions only
popup control panel exists
options/settings page exists
centralized ronClient.js gateway client exists
storage.js safe local settings exists
crab.js local input normalization exists
full-tab browser shell exists
full-tab browser renders built-in pages
full-tab browser renders typed asset DTOs
quick nav buttons exist for site/image/music/article
browser-like topbar exists
Back / Forward / Home / Refresh / Go implemented
ROC chip display fixed
Passport drawer exists
Settings gear opens options
Developer JSON is hidden behind details
local request draft flow exists
/site prepare request works
/assets/image/prepare request works
image strict JSON issue fixed
prepare summary UX exists
check-chrome.sh validates structure/security basics
package-chrome.sh creates Chrome extension zip
```

## Working backend route proofs

```text
GET  /healthz
GET  /readyz
GET  /crab/resolve?url=crab://site
GET  /crab/resolve?url=crab://image
POST /sites/prepare
POST /assets/image/prepare
```

## Confirmed live prepare proofs

```text
crab://site → /sites/prepare → prepare response rendered
crab://image → /assets/image/prepare → omnigate.image-asset-prepare.v1 rendered
```

---

## 8. Still intentionally not implemented

These are intentionally not done yet:

```text
actual image upload/create
actual site creation from CrabLink
wallet hold creation from CrabLink
wallet capture/release UX
paid confirmation dialog
spend authorization UX
manifest construction from browser
client-side BLAKE3 hashing of selected files
actual byte upload from extension
post-create navigation to crab://<hash>.image
site publishing flow
name availability flow
registered site resolve UX beyond existing backend route
receipt display for prepare/hold/capture
native raw crab:// protocol handler
production auth/capability UX
local encrypted passport vault
PIN/password unlock
alt anonymous passports
multi-passport selector
wallet-linked passport permissions UI
Chrome Web Store polish
```

---

## 9. Critical invariants to preserve next session

## 9.1 Extension gateway-only invariant

Correct:

```text
CrabLink
→ svc-gateway public routes
→ omnigate
→ downstream RustyOnions services
```

Incorrect:

```text
CrabLink → svc-wallet directly
CrabLink → svc-passport directly
CrabLink → svc-storage directly
CrabLink → svc-index directly
CrabLink → ron-ledger directly
```

## 9.2 No fake truth invariant

CrabLink may store/display labels and last-seen data, but it must not invent backend truth.

Do not fake:

```text
ROC balances
ledger-backed status
receipt IDs
wallet authority
passport authority
asset CIDs
manifest CIDs
site pointers
```

## 9.3 No silent spending invariant

No user action should silently:

```text
create wallet hold
capture wallet hold
release wallet hold
spend ROC
create asset
upload bytes
publish site
mutate index
mutate ledger
```

Paid/write actions must be explicit, confirmation-gated, and backend-enforced.

## 9.4 Minimal extension permissions invariant

Current allowed permissions:

```text
storage
activeTab
```

Current allowed host permissions:

```text
http://127.0.0.1:*/*
http://localhost:*/*
```

Avoid unless explicitly justified:

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
clipboardRead
clipboardWrite
```

## 9.5 Sensitive data invariant

Do not store:

```text
seed phrases
raw private keys
wallet signing keys
long-lived spend authority
uncapped capabilities
private passport keys
fake receipt truth
```

Dev bearer token is local-development only and must be redacted from logs/UI/debug blobs.

## 9.6 WEB3 / ROC invariants

Preserve:

```text
ROC remains internal only for this phase.
No ROX/Solana/external settlement.
No floating-point money math.
All ROC amounts are integer minor units.
All percentages use basis points.
ron-ledger is durable append-only truth.
svc-wallet is the normal economic mutation front-door.
ron-accounting is transient counters/snapshots only.
svc-rewarder plans rewards but does not mutate ledger directly.
Paid operations use hold → capture → release.
Wallet mutations require nonce + idempotency.
No negative balances by default.
Transfers conserve value.
Capabilities and policy checks fail closed.
```

---

## 10. Recommended next steps

## Priority 1 — Regenerate CrabLink codebundle and notes

Before major next-instance code generation, regenerate the CrabLink bundle so the next model sees the current state.

Run from CrabLink repo:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
git status
```

Expected generated file:

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

Then upload:

```text
CODEBUNDLE_CHROME_EXTENSION.md
NOTES.MD
```

Also upload current RustyOnions materials if backend work is needed:

```text
CODEBUNDLE_RS.md
ALLNOTES.MD
WEB3.MD
WEB3_2.MD
TODO_WEB3_2.MD
WEB3_2_PRODUCT_ROUTE_CONTRACTS.md
```

## Priority 2 — Harden smoke tests for full-tab prepare flows

Update CrabLink smoke/manual checks to cover:

```text
GET /crab/resolve?url=crab://site
GET /crab/resolve?url=crab://image
POST /sites/prepare with strict valid JSON
POST /assets/image/prepare with strict valid JSON
assert image prepare schema == omnigate.image-asset-prepare.v1
assert image prepare action == paid_storage_put
assert image prepare asset == roc
assert bytes > 0
assert amount/minimum_hold exists
assert no unsupported image fields are sent
```

Potential scripts to update:

```text
scripts/smoke-local-gateway.sh
extensions/chrome/test/manual-checklist.md
scripts/check-chrome.sh
```

The smoke script can be a pure HTTP probe against the local gateway; it does not need browser automation yet.

## Priority 3 — Improve prepare summary further

Prepare summary currently extracts the major fields. Next polish could add:

```text
wallet hold route card
submit route card
resolve-after route card
required submit fields card
optional submit headers card
warnings card
receipt/hold status placeholder
copy hold template button
copy next route button
```

This makes CrabLink feel more like a guided product workflow while remaining safe.

## Priority 4 — Build wallet hold confirmation UX, but do it carefully

This is the next major leap after prepare.

Target next milestone:

```text
Prepare succeeded
→ show "Create Wallet Hold" confirmation panel
→ user explicitly confirms
→ CrabLink calls gateway wallet-hold route
→ backend wallet creates hold through svc-wallet/ron-ledger
→ CrabLink displays hold txid/receipt
→ upload/create remains locked until hold exists
```

But before implementing, inspect the latest RustyOnions route contracts and wallet/gateway support.

Questions to answer before code:

```text
What exact public gateway route should CrabLink call for wallet hold?
Is it /wallet/hold, /v1/wallet/hold, /paid/o/hold, or another gateway-safe route?
Does svc-gateway proxy wallet hold through omnigate or wallet route?
What request schema is accepted?
What response schema is returned?
What idempotency key and nonce semantics are required?
What headers are required?
Does the hold route require Authorization: Bearer dev locally?
Does hold require x-ron-passport and x-ron-wallet-account?
How should CrabLink display hold receipt?
```

Do not guess these. Inspect `CODEBUNDLE_RS.md` and route contract docs first.

## Priority 5 — After wallet hold: implement actual image asset create/upload

This is the big product demo milestone.

Target final image flow:

```text
User opens crab://image
selects image file
fills title/description/tags
CrabLink computes or gets backend b3 content ID
CrabLink prepares upload
CrabLink creates wallet hold with explicit confirmation
CrabLink submits image create/upload with hold txid
backend stores bytes by content ID
backend creates manifest
backend stores manifest by content ID
backend indexes pointer
backend returns:
  asset_cid: b3:<hash>
  crab_url: crab://<hash>.image
  manifest_cid
  owner/passport
  payout/wallet
  receipts
CrabLink navigates to crab://<hash>.image
```

This must preserve boundary:

```text
CrabLink does not mutate ledger directly.
CrabLink does not write storage directly.
CrabLink does not write index directly.
CrabLink only calls public gateway routes.
```

Likely files involved on CrabLink side:

```text
extensions/chrome/src/page.html
extensions/chrome/src/page.css
extensions/chrome/src/page.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/storage.js
scripts/check-chrome.sh
scripts/smoke-local-gateway.sh
extensions/chrome/test/manual-checklist.md
```

Likely RustyOnions backend files to inspect before enabling this:

```text
crates/svc-gateway
crates/omnigate/src/routes/v1/assets.rs
crates/omnigate/src/routes/v1/paid.rs
crates/omnigate/src/routes/v1/wallet.rs
crates/svc-storage
crates/svc-index
crates/ron-proto/src/asset
crates/ron-naming
crates/svc-wallet
crates/ron-ledger
```

## Priority 6 — Then site creation

After image upload works, make `crab://site` real.

Target site flow:

```text
User opens crab://site
enters site name/title/description
prepare site launch
create wallet hold with confirmation
submit site create with hold txid
backend creates site manifest object
backend stores manifest by b3 CID
backend writes site name pointer in svc-index
backend returns:
  site_name
  site_url: crab://<site_name>
  manifest_cid
  owner/passport
  payout/wallet
  receipts
CrabLink navigates to crab://<site_name>
```

Need be careful:

```text
Names are human pointers.
b3 hashes remain canonical.
Storage stores bytes by content ID only.
svc-index resolves names/pointers.
omnigate hydrates site page.
```

## Priority 7 — Passport / wallet UX hardening

CrabLink still needs a better identity/wallet story:

```text
first-run passport card
create dev passport button
starter grant display
receipt display
refresh balance
ledger-backed badge
display-only warning when wallet backend is unavailable
multi-passport planning
alt anonymous passport planning
PIN/password unlock design later
```

Do not add local private-key custody until there is a dedicated secure design.

---

## 11. Known Chrome/browser URL limitation

Do not waste time trying to make raw `crab://site` typed directly into Chrome’s native URL bar work as if Chrome supported custom scheme handlers.

Known working path:

```text
Use CrabLink full-tab browser address bar.
Use quick-nav buttons.
Use popup built-in page buttons.
Use Chrome omnibox keyword:
  crab [Tab] site [Enter]
  crab [Tab] image [Enter]
```

Raw native `crab://...` handling likely needs one of:

```text
Tauri desktop app with OS protocol handler
native helper app
full custom CrabLink browser
PWA protocol handler if suitable
browser-level support for custom protocols
```

For beta, the full-tab browser shell is sufficient and already works.

---

## 12. Current completion estimate for CrabLink

Approximate completion for the Chrome extension MVP:

```text
Extension scaffold:               95%
Popup control panel:              80%
Options/settings page:            75%
Gateway client:                   80%
Full-tab browser shell:           75%
Built-in page rendering:          80%
Prepare-route UX:                 70%
Prepare summary UX:               65%
Passport bootstrap display:       65%
Wallet balance display:           60%
Receipt display:                  35%
Paid hold UX:                     10%
Actual image upload/create:        0%
Actual site create/publish:        0%
Production auth/cap UX:           10%
Chrome Web Store polish:          15%
```

Overall CrabLink Chrome Extension beta estimate:

```text
~55–60% complete for a local-dev demo/beta shell.
~35–40% complete for a safer public tester beta.
```

The biggest remaining gap is not UI anymore. The biggest remaining gap is the gated paid-action chain:

```text
prepare
→ explicit confirmation
→ wallet hold
→ create/upload
→ capture/release
→ receipt
→ navigate to result page
```

---

## 13. Current “wow demo” story

CrabLink can now show a powerful demo:

```text
1. Start RustyOnions dev stack.
2. Load CrabLink extension.
3. Open full CrabLink browser tab.
4. Navigate to crab://site.
5. Show backend route contract rendered as product UI.
6. Build and send /sites/prepare.
7. Navigate to crab://image.
8. Select logo image.
9. Fill metadata.
10. Build and send /assets/image/prepare.
11. Show PREPARED card:
    - action: paid_storage_put
    - asset: roc
    - bytes
    - amount_minor
    - payer_account
    - next gated steps
12. Explain that CrabLink is not faking this; it is using RustyOnions backend route contracts.
```

This is a real product threshold:

```text
CrabLink is no longer just an extension shell.
CrabLink is now a browser-facing RustyOnions product client that can drive safe WEB3_2 prepare flows.
```

---

## 14. Suggested first message for next instance

Use something like:

```text
We are continuing CrabLink. It is a separate Chrome MV3 browser-client repo for RustyOnions. CrabLink is gateway-only and must not become wallet/ledger/storage/index truth. Current milestone: full-tab browser shell works, built-in crab://site and crab://image pages render, local request drafts work, POST /sites/prepare works, POST /assets/image/prepare works, and the image prepare strict JSON bug was fixed. The prepare summary now shows PREPARED with schema omnigate.image-asset-prepare.v1, action paid_storage_put, asset roc, bytes, amount_minor, minimum_hold, payer_account, and next gated steps.

Next step: update/regenerate codebundle, then harden smoke/manual checks for site/image prepare flows. After that, inspect RustyOnions wallet/gateway route contracts and design the explicit wallet hold confirmation UX. Do not implement create/upload until wallet hold flow is understood and confirmation-gated.
```

---

## 15. Final summary

This session delivered a major CrabLink milestone.

Before:

```text
CrabLink could render built-in pages and draft request JSON.
```

After:

```text
CrabLink can call real non-mutating prepare routes for crab://site and crab://image through svc-gateway and render useful prepare summaries.
```

Most important proofs:

```text
crab://site → /sites/prepare works.
crab://image → /assets/image/prepare works.
Image prepare strict JSON issue was found and fixed.
Prepare summary clearly shows paid_storage_put / ROC / bytes / hold requirement.
```

The project is now ready for the next careful step:

```text
prepare → explicit user confirmation → wallet hold → create/upload → receipt → resolve final crab page
```

Do not skip straight to create/upload. The next work should harden tests, confirm wallet hold route contracts, and then build the hold-confirmation UX safely.

# END NOTE — MAY 2 2026 — CrabLink Full-Tab Browser + Built-In Page Prepare Milestone

```
```


### END NOTE - MAY 2 2026 - 00:05 CST



### BEGIN NOTE - MAY 2 2026 - 13:50 CST

Below is a **drop-in carryover note set** for the next instance. It captures what we accomplished, exact proof artifacts, what remains, and the safest next implementation order.

---

# CrabLink / RustyOnions WEB3_2 Carryover Notes — Paid Image Proof Achieved

## 0. Current checkpoint summary

We reached a major CrabLink milestone.

CrabLink is no longer just a resolver/mock UI. It now proves a real user-facing product loop:

```text
CrabLink browser extension
→ crab:// built-in product pages
→ live RustyOnions gateway
→ live ledger-backed ROC balance
→ explicit ROC wallet hold
→ paid image upload through gateway
→ b3 content ID generated
→ image bytes stored
→ manifest stored
→ index pointer stored
→ crab://<hash>.image resolves
→ hydrated asset page renders inside CrabLink
```

The successful backend upload returned `omnigate.image-asset-upload.v1`, with `asset_cid`, `crab_url`, storage upload proof, manifest storage, index pointer storage, owner metadata, payout metadata, and paid storage receipt information. The resolved `crab://...image` page returned `omnigate.asset-page.v1`, with hydrated manifest, storage availability, owner, payout, metadata, receipt, and links. 

The tested live asset URL is:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

The asset CID is:

```text
b3:984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4
```

The manifest CID is:

```text
b3:e81539db791855a113757e2d84bfd53d40721f232208ff79879ab0eb77e1f6f5
```

The extension successfully loaded this `crab://...image` URL in the full-tab CrabLink browser shell and displayed the asset page.

---

## 1. Strategic status

The project has crossed from “backend is green” into **product proof**.

What is now proven:

```text
A user can use CrabLink to reach a RustyOnions page.
A RustyOnions page can request a paid operation.
CrabLink can show a preflight prepare response.
CrabLink can create an explicit wallet hold after user confirmation.
The backend can accept the hold as paid proof.
The backend can store paid content.
The backend can create a manifest and index pointer.
The content receives a canonical b3 hash.
The content gets a typed crab://<hash>.image URL.
CrabLink can render that typed asset page.
```

This is exactly aligned with WEB3_2:

```text
local RON Passport labels
wallet-linked actions
crab:// navigation
b3-hash-first asset pages
paid storage/image upload
creator ownership/payout metadata
wallet receipts
```

No ROX, no Solana, no external settlement, no staking, no exchange-facing logic. ROC remains internal-only.

---

## 2. Repos and boundaries

There are two active repos:

```text
/Users/mymac/Desktop/RustyOnions
/Users/mymac/Desktop/crablink
```

Boundary rule remains strict:

```text
RustyOnions = backend/substrate/services/value plane.
CrabLink = browser client only.
```

CrabLink must remain:

```text
gateway-only
no direct svc-wallet calls
no direct svc-storage calls
no direct svc-index calls
no direct ron-ledger mutation
no private keys or seed phrases
no fake wallet truth
no silent ROC spend
```

All CrabLink backend traffic should go through:

```text
http://127.0.0.1:8090
```

That is `svc-gateway`.

---

## 3. Backend RustyOnions status

### 3.1 Crates touched in this CrabLink batch

RustyOnions crates touched:

```text
omnigate
svc-gateway
```

Main backend additions:

```text
svc-gateway:
  POST /wallet/hold
  proxies to omnigate /v1/wallet/hold

omnigate:
  POST /v1/wallet/hold
  proxies to svc-wallet /v1/hold

existing proven routes:
  GET  /wallet/:account/balance
  GET  /crab/resolve?url=...
  GET  /b3/<hash>.<kind>
  POST /sites/prepare
  POST /assets/image/prepare
  POST /assets/image
```

Important architecture invariant preserved:

```text
svc-wallet remains the mutation front-door.
omnigate is only a façade/proxy/coordinator.
svc-gateway is only public routing/proxy.
ron-ledger is not mutated directly by gateway, omnigate, CrabLink, storage, or index.
```

### 3.2 Backend tests green

The user ran:

```bash
cargo fmt
cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
cargo clippy -p svc-gateway --all-targets --no-deps -- -D warnings
cargo test -p omnigate --all-targets
cargo test -p svc-gateway --all-targets
```

Result: green.

Important passing tests included:

```text
omnigate asset page resolver tests
omnigate built-in page resolver tests
omnigate image_asset_prepare tests
omnigate paid_storage_prepare tests
omnigate paid_storage_write_proxy tests
omnigate site_launch tests
svc-gateway identity route proxy tests
svc-gateway product route proxy tests
svc-gateway paid storage proxy tests
```

The green run showed `omnigate` and `svc-gateway` clippy/test completion with the relevant product and image/site tests passing. 

---

## 4. CrabLink extension status

### 4.1 Extension features currently working

The full-tab CrabLink browser shell currently supports:

```text
address bar
Back / Forward / Home
Refresh
settings gear
passport drawer
ROC balance chip
quick nav:
  crab://site
  crab://image
  crab://music
  crab://article
crab://site built-in page
crab://image built-in page
crab://<hash>.image asset page
prepare request builder
prepare request sender
wallet hold preview
explicit Confirm ROC Hold button
Copy JSON controls
Developer JSON details panel
```

The extension loaded the real asset page:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

It showed:

```text
asset CID
asset kind
crab URL
manifest CID
storage available
gateway route
developer JSON
```

### 4.2 CrabLink files changed recently

Files updated in CrabLink during this stretch:

```text
extensions/chrome/src/ronClient.js
extensions/chrome/src/page.html
extensions/chrome/src/page.css
extensions/chrome/src/page.js
scripts/check-chrome.sh
```

Key client additions:

```text
RonClient.createWalletHold()
full-tab hold section
hold preview cards
Confirm ROC Hold button
Copy Hold JSON button
wallet hold confirmation popup
wallet hold result rendering
checker rules for explicit hold flow
```

Important: after a CSS checker issue, `page.css` needed an explicit `.workflow-section` selector. The user had not yet shown a clean rerun of `scripts/check-chrome.sh` after the final CSS replacement, so the next instance should verify that first.

Run:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
```

Expected:

```text
json/structure checks: ok
javascript/shell syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

---

## 5. Live stack startup procedure

Use this order.

### Terminal A — start `svc-wallet`

```bash
cd /Users/mymac/Desktop/RustyOnions
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

Leave it running.

### Terminal B — start CrabLink WEB3_2 dev stack

```bash
cd /Users/mymac/Desktop/RustyOnions
OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
OMNIGATE_WALLET_BEARER=dev \
scripts/web3_crablink_dev_stack.sh
```

Leave it running.

Expected local service layout:

```text
svc-wallet   http://127.0.0.1:8088
svc-index    http://127.0.0.1:5304
svc-storage  http://127.0.0.1:5303
omnigate     http://127.0.0.1:9090
svc-gateway  http://127.0.0.1:8090
```

### Terminal C — verify from CrabLink repo

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

### Manual backend checks

```bash
curl -i http://127.0.0.1:8090/healthz
curl -i http://127.0.0.1:8090/readyz

curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://site' | jq .
curl -s 'http://127.0.0.1:8090/crab/resolve?url=crab://image' | jq .

curl -s http://127.0.0.1:8090/wallet/acct_dev/balance \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' | jq .
```

Expected wallet shape:

```json
{
  "schema": "crablink.wallet.balance.v1",
  "account": "acct_dev",
  "unit": "ROC",
  "available_minor_units": "...",
  "held_minor_units": "0",
  "display": "... ROC",
  "ledger_backed": true,
  "source": "svc_wallet.v1"
}
```

---

## 6. Important live values from this session

### 6.1 Account and passport

```text
passport: passport:main:dev
wallet:   acct_dev
escrow:   escrow_paid_write
```

### 6.2 Starter balance

The visible wallet started at:

```text
1776 ROC
```

### 6.3 Site hold proof

CrabLink created an explicit wallet hold for the site prepare flow:

```text
amount: 1024
from: acct_dev
to: escrow_paid_write
nonce: 1
idempotency: crablink-preview:site:awebsitename
```

Receipt:

```json
{
  "txid": "tx_14b0998645b92302c222931ed90c567e",
  "op": "hold",
  "from": "acct_dev",
  "to": "escrow_paid_write",
  "asset": "roc",
  "amount_minor": "1024",
  "nonce": 1,
  "idem": "crablink-preview:site:awebsitename",
  "ledger_seq_start": 2,
  "ledger_seq_end": 3,
  "ledger_root": "ab2551be5dc15a435ff9d97ed62b643c0304ffb4921f4f3150305a800feccded",
  "receipt_hash": "b3:86c620beca061320570baf5cbc8ba7ee2f5d51bd072523195252e10e1ff8d34e"
}
```

Balance after site hold:

```text
752 ROC
```

### 6.4 Tiny image hold proof

A tiny 1x1 PNG was created locally:

```text
artifacts/crablink-manual/tiny-crablink.png
size: 68 bytes
```

Image hold:

```json
{
  "txid": "tx_f227fae07360b37dfefe31cafeec3fdb",
  "op": "hold",
  "from": "acct_dev",
  "to": "escrow_paid_write",
  "asset": "roc",
  "amount_minor": "68",
  "nonce": 2,
  "idem": "crablink-preview:image:tiny-crablink.png",
  "ledger_seq_start": 4,
  "ledger_seq_end": 5,
  "ledger_root": "bdf0cb74e42952166eae66ed6f16b1813de99ff8480e5cbce3da91bbf22364af",
  "receipt_hash": "b3:8c05f9c22010c9118d21e38d2cda75cb9c7a0d4d85c5c5b86a938f991ed73e9e"
}
```

Balance after image hold:

```text
684 ROC
```

Note: the extension screenshot later still showed `752 ROC`, probably because the UI had not refreshed after the second terminal-side hold. Backend balance should be treated as authoritative.

### 6.5 Successful paid image upload proof

Upload response:

```text
schema: omnigate.image-asset-upload.v1
asset_kind: image
asset_cid: b3:984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4
crab_url: crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
manifest_cid: b3:e81539db791855a113757e2d84bfd53d40721f232208ff79879ab0eb77e1f6f5
index pointer: stored, HTTP 202
owner: passport:main:dev / acct_dev
payout recipient: acct_dev
wallet txid: tx_f227fae07360b37dfefe31cafeec3fdb
wallet receipt hash: b3:8c05f9c22010c9118d21e38d2cda75cb9c7a0d4d85c5c5b86a938f991ed73e9e
```

Resolved asset page:

```text
schema: omnigate.asset-page.v1
asset_kind: image
manifest.status: present
manifest.hydration_status: hydrated
storage.available: true
storage.size_bytes: 68
metadata.title: Tiny CrabLink Test Image
metadata.description: First terminal-proven CrabLink paid image upload.
metadata.tags: crablink, tiny, proof
receipt_kind: paid_storage
receipt amount: 68
```

The upload proof and resolve proof are captured in the terminal output. 

---

## 7. Critical paid upload header contract learned

We discovered the exact paid proof header contract through live backend errors.

First wrong header:

```text
x-ron-wallet-hold-txid
```

Backend wanted:

```text
x-ron-wallet-txid
```

Then backend required:

```text
x-ron-paid-op
```

Final successful paid upload required:

```text
x-ron-paid-op: hold
x-ron-paid-asset: roc
x-ron-paid-estimate-minor: <amount>
x-ron-wallet-txid: <txid>
x-ron-wallet-receipt-hash: <receipt_hash>
x-ron-wallet-from: <payer>
x-ron-wallet-to: <escrow>
```

Plus regular CrabLink/gateway headers:

```text
Authorization: Bearer dev
Content-Type: image/png
Accept: application/json
x-ron-passport: passport:main:dev
x-ron-wallet-account: acct_dev
x-ron-asset-title: ...
x-ron-asset-description: ...
x-ron-asset-tags: ...
idempotency-key: ...
```

This contract should be encoded into `RonClient.uploadImageAsset()` in the next batch.

---

## 8. Manual paid image upload command that succeeded

Use this as the reference implementation for the next UI batch.

```bash
cd /Users/mymac/Desktop/RustyOnions

HOLD_TXID=$(jq -r '.txid' artifacts/crablink-manual/tiny-hold.json)
HOLD_HASH=$(jq -r '.receipt_hash' artifacts/crablink-manual/tiny-hold.json)
HOLD_FROM=$(jq -r '.from' artifacts/crablink-manual/tiny-hold.json)
HOLD_TO=$(jq -r '.to' artifacts/crablink-manual/tiny-hold.json)
HOLD_AMOUNT=$(jq -r '.amount_minor' artifacts/crablink-manual/tiny-hold.json)

curl -s http://127.0.0.1:8090/assets/image \
  -X POST \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: image/png' \
  -H 'Accept: application/json' \
  -H 'x-ron-paid-op: hold' \
  -H 'x-ron-paid-asset: roc' \
  -H "x-ron-paid-estimate-minor: ${HOLD_AMOUNT}" \
  -H "x-ron-wallet-txid: ${HOLD_TXID}" \
  -H "x-ron-wallet-receipt-hash: ${HOLD_HASH}" \
  -H "x-ron-wallet-from: ${HOLD_FROM}" \
  -H "x-ron-wallet-to: ${HOLD_TO}" \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' \
  -H 'x-ron-asset-title: Tiny CrabLink Test Image' \
  -H 'x-ron-asset-description: First terminal-proven CrabLink paid image upload.' \
  -H 'x-ron-asset-tags: crablink,tiny,proof' \
  -H 'idempotency-key: crablink-upload:image:tiny-crablink.png' \
  --data-binary @artifacts/crablink-manual/tiny-crablink.png \
  | tee artifacts/crablink-manual/tiny-upload.json | jq .
```

Resolve command:

```bash
CRAB_URL=$(jq -r '.crab_url // .links.crab // .asset.crab_url // empty' artifacts/crablink-manual/tiny-upload.json)

curl -s "http://127.0.0.1:8090/crab/resolve?url=${CRAB_URL}" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' | jq .
```

---

## 9. Next implementation batch: wire image upload into CrabLink UI

This is the best next move.

Current UI flow:

```text
crab://image
→ choose file
→ Build Request Preview
→ Send Prepare Request
→ Confirm ROC Hold
```

Next UI flow should become:

```text
crab://image
→ choose file
→ Build Request Preview
→ Send Prepare Request
→ Confirm ROC Hold
→ Submit Image Upload
→ show upload result
→ show final crab://<hash>.image URL
→ auto-navigate to the new asset page
→ refresh wallet balance
```

### 9.1 Files likely needing updates

```text
extensions/chrome/src/ronClient.js
extensions/chrome/src/page.html
extensions/chrome/src/page.css
extensions/chrome/src/page.js
scripts/check-chrome.sh
extensions/chrome/test/manual-checklist.md
```

### 9.2 `RonClient` method to add

Add something like:

```text
uploadImageAsset({ file, title, description, tags, paidProof, idempotencyKey })
```

It should:

```text
POST /assets/image
body: raw File/Blob bytes
Content-Type: file.type || image/png
headers:
  x-ron-paid-op: hold
  x-ron-paid-asset: roc
  x-ron-paid-estimate-minor: paidProof.amount_minor
  x-ron-wallet-txid: paidProof.txid
  x-ron-wallet-receipt-hash: paidProof.receipt_hash
  x-ron-wallet-from: paidProof.from
  x-ron-wallet-to: paidProof.to
  x-ron-passport: settings.passportSubject
  x-ron-wallet-account: settings.walletAccount
  x-ron-asset-title
  x-ron-asset-description
  x-ron-asset-tags
  idempotency-key
```

Important: existing `request()` method JSON-stringifies bodies, so image upload needs either:

```text
a new requestRaw() helper
```

or `request()` must gain a mode that allows raw body and custom content-type.

Do not JSON-stringify the image file.

### 9.3 Preserve selected file across prepare → hold → upload

Current prepare flow sends only metadata:

```text
bytes
content_type
title
description
tags
```

The browser-side selected `File` object must be retained in memory after draft/prepare.

Add state such as:

```text
currentImageFile
currentUploadDraft
currentUploadResult
```

When building image draft:

```text
currentImageFile = selected File
```

When user changes file or clears draft:

```text
currentImageFile = null
currentUploadResult = null
```

### 9.4 Add UI section after successful hold

After `currentHoldResponse.ok === true`, show a new section:

```text
Image Upload
Status: Ready to upload
Submit Image Upload button
Copy Upload JSON button
```

Safety message:

```text
This will upload the selected image bytes using the confirmed wallet hold.
It still does not capture/release manually in CrabLink.
The backend coordinates paid storage semantics.
```

Button should only enable when:

```text
pageKind === image
currentImageFile exists
currentPrepareResponse.ok
currentHoldResponse.ok
currentHoldResponse.data.txid exists
currentHoldResponse.data.receipt_hash exists
```

### 9.5 After successful upload

Render:

```text
Upload complete
asset_cid
manifest_cid
crab_url
storage status
index pointer status
receipt txid
```

Then add:

```text
Open Asset Page
Copy crab:// URL
```

Optionally auto-navigate:

```javascript
await navigateTo(uploadResponse.data.crab_url)
```

### 9.6 Refresh balance after hold and upload

After `Confirm ROC Hold`, call:

```text
client.getWalletBalance(settings.walletAccount)
saveBalanceState()
renderTopBarState()
renderPassportDrawer()
```

After image upload, refresh balance again.

The screenshot before terminal upload still showed `752 ROC` even after terminal balance was `684 ROC`; the UI needs automatic refresh after wallet-affecting operations.

---

## 10. Next backend/product batch after image upload UI

After image upload works entirely inside CrabLink, the next product proof should be site creation.

Current site flow:

```text
crab://site
→ prepare
→ hold
```

Next site flow should become:

```text
crab://site
→ prepare
→ hold
→ create site
→ resolve crab://<site_name>
```

Before coding the site-create UI, inspect backend route contract for `/sites`:

```text
omnigate site_create request body
required headers
whether it expects x-ron-wallet-txid or paid-proof headers
whether it captures/uses the hold internally
```

Existing tests say `site_create_stores_manifest_and_index_pointer` passes, so the backend can create/resolve a site. But the exact client request shape needs to be confirmed from code/tests before wiring UI.

Likely files to inspect next:

```text
crates/omnigate/src/routes/v1/sites.rs
crates/omnigate/tests/site_launch.rs
crates/svc-gateway/tests/product_routes_proxy.rs
```

---

## 11. Asset-page rendering improvements needed

The current asset page displays basic fields:

```text
asset CID
asset kind
crab URL
manifest
storage
gateway route
developer JSON
```

Next rendering pass should add richer cards:

```text
Title
Description
Tags
Owner passport
Owner wallet
Payout recipient
Storage size bytes
Content type
Receipt txid
Receipt kind
Receipt amount
Manifest URL
Raw content URL
```

For image assets, add a safe image preview:

```text
<img src="http://127.0.0.1:8090/o/b3:<asset_hash>">
```

or through whatever public gateway raw route is stable.

Security requirement:

```text
Only render image bytes as an <img> for asset_kind=image.
Do not render backend-provided HTML.
Do not execute scripts.
Do not inject metadata as HTML.
Use textContent for all text fields.
```

---

## 12. Smoke script improvements needed

Add an optional paid image upload smoke to CrabLink scripts.

Current `scripts/smoke-local-gateway.sh` covers:

```text
healthz
readyz
identity/me
wallet balance
b3 asset route
crab resolve
builtin pages
site prepare
image prepare
optional bootstrap
```

Add optional:

```text
CRABLINK_SMOKE_RUN_UPLOAD=1
```

Flow:

```text
create tiny PNG
prepare image
create wallet hold
upload image using paid-proof headers
resolve returned crab_url
assert omnigate.asset-page.v1
assert manifest hydrated
assert receipt present
```

Default should remain safe/non-mutating unless explicitly enabled:

```text
CRABLINK_SMOKE_RUN_PREPARE=1
CRABLINK_SMOKE_RUN_BOOTSTRAP=0
CRABLINK_SMOKE_RUN_UPLOAD=0
```

The upload smoke should print a warning before running because it consumes ROC.

---

## 13. Important warnings / pitfalls

### 13.1 Idempotency

If you replay the exact same hold with the same body and same idempotency key, it returns the same receipt and should not deduct again.

If you change body, nonce, amount, or idempotency key, it may create another hold and deduct more ROC.

### 13.2 Nonces

The UI currently lets the user enter nonce manually.

Observed nonces:

```text
site hold: nonce 1
image hold: nonce 2
```

Next improvement:

```text
remember last used nonce per wallet account in chrome.storage
default next nonce to last + 1
allow manual override
```

Better future backend improvement:

```text
svc-wallet exposes next nonce / account state endpoint
CrabLink fetches suggested nonce
```

### 13.3 `held_minor_units`

The balance view shows:

```text
held_minor_units: "0"
```

Even after holds, available is deducted. This means the current wallet-facing display treats holds as unavailable/deducted, but does not expose reserved holds separately. Not a blocker, but the wording “held” in UI should avoid relying on `held_minor_units` until the backend models it clearly.

### 13.4 Image upload header names

Use:

```text
x-ron-wallet-txid
```

Not:

```text
x-ron-wallet-hold-txid
```

### 13.5 Public crab URL format

Use:

```text
crab://<64 lowercase hex>.<kind>
```

Do not use:

```text
crab://b3/<hash>.<kind>
```

The current canonical public example is:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Internal content IDs remain:

```text
b3:<64 lowercase hex>
```

### 13.6 User preference

When providing code after compile errors or implementation work, provide:

```text
full paste-ready files
exact file paths
no partial snippets
```

For terminal commands, do not start commands with a leading `#`. Comments inside scripts are okay.

Do not recommend `rm` cleanup commands. Prefer `cargo clean` or safer alternatives.

---

## 14. Suggested immediate next session plan

### Step 1 — verify CrabLink checker after CSS fix

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
```

If checker fails, fix only the missing token/structure issue first.

### Step 2 — regenerate/update CrabLink codebundle

From CrabLink repo:

```bash
cd /Users/mymac/Desktop/crablink
scripts/make_codebundle.sh
```

Then upload the updated CrabLink codebundle to the next instance if needed.

### Step 3 — implement in-UI image upload

Files:

```text
extensions/chrome/src/ronClient.js
extensions/chrome/src/page.html
extensions/chrome/src/page.css
extensions/chrome/src/page.js
scripts/check-chrome.sh
extensions/chrome/test/manual-checklist.md
```

Goal:

```text
Prepare Image
→ Confirm ROC Hold
→ Submit Image Upload
→ display crab_url
→ auto-open crab_url
→ refresh balance
```

Acceptance:

```text
scripts/check-chrome.sh passes
scripts/package-chrome.sh passes
manual crab://image full UI upload succeeds
returned crab_url resolves in CrabLink
balance updates after hold/upload
upload/create remains explicit user action
```

### Step 4 — add optional upload smoke

Add:

```text
CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

Goal:

```text
terminal proves the same path automatically
```

### Step 5 — improve asset page rendering

Add:

```text
image preview
metadata section
owner card
payout card
receipt card
storage/provider card
manifest/raw link cards
```

### Step 6 — wire site creation UI

After image upload UI is green, inspect backend site create contract, then wire:

```text
Prepare Site
→ Confirm ROC Hold
→ Create Site
→ open crab://<site_name>
```

---

## 15. Current proof artifacts to preserve

Keep these files for reference:

```text
/Users/mymac/Desktop/RustyOnions/artifacts/crablink-manual/tiny-crablink.png
/Users/mymac/Desktop/RustyOnions/artifacts/crablink-manual/tiny-hold.json
/Users/mymac/Desktop/RustyOnions/artifacts/crablink-manual/tiny-upload.json
```

Important values:

```text
tiny image txid:
tx_f227fae07360b37dfefe31cafeec3fdb

tiny image receipt hash:
b3:8c05f9c22010c9118d21e38d2cda75cb9c7a0d4d85c5c5b86a938f991ed73e9e

tiny image asset:
b3:984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4

tiny image crab URL:
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image

tiny image manifest:
b3:e81539db791855a113757e2d84bfd53d40721f232208ff79879ab0eb77e1f6f5
```

---

## 16. What to tell the next instance first

Paste this summary at the top of the next session:

```text
We are continuing CrabLink. The backend product proof is now real:
1. RustyOnions omnigate + svc-gateway clippy/tests are green.
2. svc-wallet is running and CrabLink shows ledger-backed ROC balance.
3. CrabLink can resolve crab://site and crab://image.
4. CrabLink can prepare site/image requests.
5. CrabLink can create explicit ROC wallet holds via POST /wallet/hold.
6. A terminal-paid image upload succeeded using x-ron-paid-* and x-ron-wallet-* proof headers.
7. The returned crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image resolves as a hydrated omnigate.asset-page.v1 inside CrabLink.
8. Next task: wire the image upload step into the CrabLink UI after Confirm ROC Hold, then auto-open the returned crab:// image asset page.
```

---

## 17. Success statement

This session proved the first real RustyOnions creator economy product loop:

```text
pay ROC → upload image → get b3 hash → get crab:// image page → show ownership/payout/receipt metadata
```

That is a meaningful product milestone. The remaining work is not inventing the core path anymore; it is wiring the already-proven terminal path into polished CrabLink UI flows, then repeating the pattern for site creation and richer asset pages.


### END NOTE - MAY 2 2026 - 13:50 CST



### BEGIN NOTE - MAY 2 2026 - 16:15 CST

Absolutely. Below is a **paste-ready carryover note** for the next instance. It folds in the latest successful in-UI CrabLink image upload, the 25 ROC dev pricing fix, the wallet-hold schema bug fix, and the `NEXT_LEVEL.MD` path forward.

````markdown
### BEGIN NOTE - MAY 02 2026 - CRABLINK IN-UI PAID IMAGE UPLOAD GREEN + NEXT_LEVEL HANDOFF

# RustyOnions / CrabLink Carryover Notes — In-UI Paid Image Upload Working + NEXT_LEVEL Roadmap

**Date:** 2026-05-02  
**Primary repos:**  
- `/Users/mymac/Desktop/RustyOnions`
- `/Users/mymac/Desktop/crablink`

**Primary active blueprints / references:**  
- `NEXT_LEVEL.MD`
- `WEB3.MD`
- `WEB3_2.MD`
- `TODO_WEB3_2.MD`
- `WEB3_2_PRODUCT_ROUTE_CONTRACTS.md`
- `CODEBUNDLE_RS.md`
- `CODEBUNDLE_CHROME_EXTENSION.md`
- `ALLNOTES.MD`
- `ALL_DOCS_COMBINED.MD`
- `CODECHECK.md`
- `CODECOMMENTS.MD`

**Status:** Major product-proof milestone achieved. CrabLink now performs the full browser UI flow:

```text
crab://image
→ select image file
→ Build Request Preview
→ Send Prepare Request
→ explicit Confirm ROC Hold
→ Submit Image Upload
→ 25 ROC deducted
→ image published as b3 asset
→ crab://<hash>.image returned
→ asset page can be opened/rendered in CrabLink
````

**Verdict:** We crossed from “terminal-proven paid image upload” into “user-facing browser-driven paid image upload.” This is a huge milestone for the RustyOnions WEB3_2 product layer and directly matches the immediate `NEXT_LEVEL.MD` checkpoint: finish CrabLink in-UI image upload before moving to site creation and only then generalize `.image` into `.post/.comment/.article`. `NEXT_LEVEL.MD` explicitly says the current checkpoint is image upload, site creation/open flow, asset-page rendering, optional paid upload smoke, and only then generalizing to new asset types. 

---

# 0. Executive summary

We successfully proved the first real **CrabLink in-browser creator economy loop**:

```text
CrabLink Extension for Chrome
→ svc-gateway
→ omnigate
→ svc-wallet
→ ron-ledger-backed ROC wallet state
→ explicit wallet hold
→ paid image upload
→ svc-storage stores bytes by b3 CID
→ manifest is stored
→ svc-index stores pointer
→ crab://<hash>.image resolves
→ hydrated asset page opens in CrabLink
```

This now proves:

```text
A user can start with ledger-backed ROC.
A user can prepare an image upload.
A user can confirm a wallet hold.
The system can deduct 25 ROC.
A user can submit the image upload from the browser UI.
RustyOnions returns a typed crab:// image URL.
The image is now addressable as a b3-backed asset page.
```

This matches the larger WEB3_2 goal: local passport identity, crab links, b3 asset pages, content manifests, ROC economics, paid access, and creator/provider payouts. WEB3_2 defines that product layer while preserving the WEB3 value-plane invariants: ROC remains internal, `svc-wallet` remains the normal mutation front-door, `ron-ledger` remains durable truth, and paid operations use hold → capture/release semantics. 

---

# 1. What was accomplished in this latest CrabLink session

## 1.1 The refactor succeeded

Before this session, `extensions/chrome/src/page.js` had become too large and was carrying too many responsibilities:

```text
DOM lookup
navigation
built-in page rendering
asset rendering
prepare drafting
wallet hold preview
wallet hold submission
copy helpers
future upload state
```

We refactored it into smaller files:

```text
extensions/chrome/src/page-constants.js
extensions/chrome/src/page-dom.js
extensions/chrome/src/page-utils.js
extensions/chrome/src/page-workflow.js
extensions/chrome/src/page.js
```

Current responsibility split:

```text
page.js
  browser orchestration, navigation, render routing, top-bar/passport drawer, event wiring

page-workflow.js
  prepare request flow, wallet hold flow, image upload flow, paid proof extraction

page-dom.js
  required DOM element table and fail-fast DOM lookup

page-utils.js
  safe formatting, summary helpers, deepPick, status badge helpers

page-constants.js
  schemas, built-in page constants, default escrow account
```

This refactor is important because `NEXT_LEVEL.MD` will require several new product primitives. Without splitting `page.js`, CrabLink would become spaghetti very quickly.

## 1.2 Full-tab CrabLink browser shell still works

The full-tab browser UI still supports:

```text
crab://site
crab://image
crab://music
crab://article
b3/hash asset URLs
typed crab://<64hex>.image asset URLs
Back / Forward / Home
Refresh
Passport drawer
Settings
ROC balance chip
Developer JSON
Copy URL
Copy JSON
```

`crab://image` resolves to an active built-in page.

`crab://site` resolves to an active built-in page.

`crab://music` and `crab://article` currently resolve as `coming_soon`.

## 1.3 CrabLink structural checks are green

The current CrabLink repo passes:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh && scripts/package-chrome.sh
```

Known successful output:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

The package zip is generated at:

```text
/Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

Important: always run with `&&` so the package step only runs after the checker succeeds:

```bash
scripts/check-chrome.sh && scripts/package-chrome.sh
```

## 1.4 Local gateway smoke is green

The CrabLink local smoke script passed against RustyOnions:

```bash
cd /Users/mymac/Desktop/crablink
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Successful smoke proved:

```text
GET /healthz
GET /readyz
GET /identity/me
GET /wallet/acct_dev/balance
GET /b3/<sample>.image
GET /crab/resolve?url=crab://<sample>.image
GET /crab/resolve?url=crab://site
GET /crab/resolve?url=crab://image
GET /crab/resolve?url=crab://music
GET /crab/resolve?url=crab://article
POST /sites/prepare
POST /assets/image/prepare
POST /identity/passport/bootstrap
GET /wallet/acct_dev/balance after bootstrap
```

Known successful ending:

```text
site prepare JSON: ok
image prepare JSON: ok
bootstrap JSON: ok
wallet JSON: ok

CrabLink local gateway smoke passed.
```

---

# 2. Latest fixes and bugs resolved

## 2.1 Fixed outdated smoke script expectations

The smoke script originally failed on `/sites/prepare` because it expected an older route shape. The backend returned a valid `omnigate.site-prepare.v1` response, but the script was too strict/outdated.

We updated:

```text
scripts/smoke-local-gateway.sh
```

So it accepts the current live shape:

```text
schema: omnigate.site-prepare.v1
action: paid_storage_put or paid_site_launch
wallet_hold.required: true
wallet_hold.capability.required_action: wallet.hold
next.create_hold: /v1/wallet/hold
next.submit_site: /v1/sites
next.resolve_after_launch: /v1/sites/<site_name>
```

This keeps the smoke script aligned with current omnigate product route contracts.

## 2.2 Fixed human-facing amount wording

CrabLink was showing:

```text
ROC minor units
```

We changed user-facing prompts/cards to say:

```text
ROC
```

For example:

```text
Amount: 25 ROC
```

not:

```text
Amount: 25 ROC minor units
```

Backend/protocol fields may still be named `amount_minor`; that is fine internally. UI text should be user-friendly.

## 2.3 Fixed too-expensive upload pricing for local dev

Problem:

```text
Default legacy storage pricing priced image bytes roughly 1:1.
A 121,927-byte image cost 121,927 ROC.
A starter wallet has 1776 ROC.
Therefore normal users were immediately priced out.
```

Fix:

We introduced a local/dev economics config path:

```text
configs/roc-economics.dev.toml
```

The critical dev price:

```toml
[actions.paid_storage_put]
enabled = true
pricing_kind = "flat"
price_minor = 25
minimum_charge_minor = 25
max_spend_minor = 2000
max_hold_multiplier_bps = 10000
```

Important: keep both files:

```text
configs/roc-economics.toml
configs/roc-economics.dev.toml
```

Do **not** permanently replace the canonical config with the dev file unless explicitly intended. The canonical file is useful for default tests/policy. The dev file is for friendly CrabLink product testing.

## 2.4 Fixed missing economics path problem

Problem:

We started RustyOnions with:

```text
RON_STORAGE_ROC_ECONOMICS_PATH=configs/roc-economics.dev.toml
```

but the file did not exist, so `svc-storage` failed closed with:

```json
{
  "code": "storage_estimate_rejected",
  "storage_error": {
    "error": "config_error",
    "reason": "failed to read RON_STORAGE_ROC_ECONOMICS_PATH=configs/roc-economics.dev.toml: No such file or directory"
  }
}
```

This was correct behavior: explicit bad config should fail closed, not silently fall back to legacy pricing.

Fix:

Create the dev file and start with an absolute path:

```bash
cd /Users/mymac/Desktop/RustyOnions
ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
OMNIGATE_WALLET_BEARER=dev \
RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
scripts/web3_crablink_dev_stack.sh
```

After this, `crab://image` prepare returned:

```text
Amount: 25 ROC
```

instead of:

```text
Amount: 121,927 ROC
```

## 2.5 Fixed wallet hold 422 error from extra `schema` field

Problem:

CrabLink preview request included:

```json
"schema": "crablink.wallet-hold-request.v1"
```

Then CrabLink sent that full object to `/wallet/hold`.

`svc-wallet` rejected it:

```text
HTTP 422
unknown field `schema`, expected one of `from`, `to`, `asset`, `amount_minor`, `nonce`, `memo`, `idempotency_key`
```

Fix:

Keep `schema` in the UI preview, but strip it from the actual API body.

Actual API request to `svc-wallet` now sends only:

```json
{
  "from": "acct_dev",
  "to": "escrow_paid_write",
  "asset": "roc",
  "amount_minor": "25",
  "nonce": 1,
  "memo": "CrabLink image hold for crab://image",
  "idempotency_key": "crablink-preview:image:<filename>"
}
```

This cleared the 422, and wallet hold succeeded.

## 2.6 In-UI image upload is now working

The user confirmed:

```text
Everything is working now.
We minted/published an image.
The 25 ROC got deducted.
```

Important wording:

This is not a ROC mint. It is better to call it:

```text
paid image publish
paid image upload
b3 asset creation
crab:// image asset creation
```

The user may casually call it “minting an image,” but internally we should avoid confusing that with `svc-wallet issue/mint`.

---

# 3. Current live UX state

## 3.1 CrabLink top bar

Working:

```text
CrabLink logo
Back / Forward / Home
Address bar
Go button
Refresh icon
ROC balance chip
Passport button
Settings gear
```

Known good state before upload:

```text
1776 ROC
ledger-backed
passport:main:dev
acct_dev
gateway: http://127.0.0.1:8090
```

After image hold/upload:

```text
25 ROC deducted
balance refresh works after wallet mutation/upload path
```

## 3.2 `crab://image` flow

Working:

```text
Go to crab://image
Select image file
Enter optional title/description/tags
Build Request Preview
Send Prepare Request
Prepare succeeds
Wallet hold section appears
Confirm ROC Hold
Wallet hold succeeds
Submit Image Upload appears
Submit Image Upload succeeds
Returned crab://<hash>.image can be opened/copied
Balance is deducted/refreshed
```

This is the first in-browser proof of the product creator loop.

## 3.3 Price now reasonable

With the dev economics file active:

```text
Image upload hold: 25 ROC
Starter wallet: 1776 ROC
```

This means a new dev/test user can upload many images instead of being priced out immediately.

---

# 4. Current restart procedure for next session

Use this exact order.

## Terminal A — start `svc-wallet`

```bash
cd /Users/mymac/Desktop/RustyOnions
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

Leave it running.

## Terminal B — start RustyOnions CrabLink dev stack with dev economics

```bash
cd /Users/mymac/Desktop/RustyOnions
ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
OMNIGATE_WALLET_BEARER=dev \
RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
scripts/web3_crablink_dev_stack.sh
```

Expected services:

```text
svc-wallet   http://127.0.0.1:8088
svc-index    http://127.0.0.1:5304
svc-storage  http://127.0.0.1:5303
omnigate     http://127.0.0.1:9090
svc-gateway  http://127.0.0.1:8090
```

If `9090` or another port is stuck, check:

```bash
lsof -nP -iTCP:8088 -sTCP:LISTEN
lsof -nP -iTCP:5303 -sTCP:LISTEN
lsof -nP -iTCP:5304 -sTCP:LISTEN
lsof -nP -iTCP:8090 -sTCP:LISTEN
lsof -nP -iTCP:9090 -sTCP:LISTEN
```

Then stop stale processes with:

```bash
kill -TERM <PID>
```

## Terminal C — verify CrabLink

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh && scripts/package-chrome.sh
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Then reload the extension:

```text
chrome://extensions
→ CrabLink
→ Reload
```

Manual test:

```text
Open CrabLink full-tab browser
Go to crab://image
Choose small image
Build Request Preview
Send Prepare Request
Confirm ROC Hold
Submit Image Upload
Open Asset Page
```

---

# 5. Files modified recently in CrabLink

## Main extension files

```text
extensions/chrome/src/ronClient.js
extensions/chrome/src/page.html
extensions/chrome/src/page.css
extensions/chrome/src/page.js
extensions/chrome/src/page-workflow.js
extensions/chrome/src/page-dom.js
extensions/chrome/src/page-utils.js
extensions/chrome/src/page-constants.js
```

## Scripts

```text
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
```

## Important implementation notes

### `ronClient.js`

Now supports:

```text
getHealth()
getReady()
getIdentity()
bootstrapPassport()
getWalletBalance()
resolveCrab()
getB3Asset()
resolveSite()
prepareImageAsset()
prepareSite()
createWalletHold()
uploadImageAsset()
request()
requestRaw()
stableIdempotencyKey()
```

Important image upload contract:

```text
POST /assets/image
body: raw File/Blob bytes
Content-Type: file.type || image/png

headers:
  x-ron-paid-op: hold
  x-ron-paid-asset: roc
  x-ron-paid-estimate-minor: paidProof.amount_minor
  x-ron-wallet-txid: paidProof.txid
  x-ron-wallet-receipt-hash: paidProof.receipt_hash
  x-ron-wallet-from: paidProof.from
  x-ron-wallet-to: paidProof.to
  x-ron-passport: settings.passportSubject
  x-ron-wallet-account: settings.walletAccount
  x-ron-asset-title
  x-ron-asset-description
  x-ron-asset-tags
  idempotency-key
```

Important correction:

```text
Use x-ron-wallet-txid.
Do NOT use x-ron-wallet-hold-txid.
```

### `page-workflow.js`

Owns:

```text
build prepare draft
send prepare request
render prepare summary
build wallet hold preview
confirm wallet hold
strip schema from wallet hold API body
extract paid proof
submit image upload
render upload result
copy/open returned crab URL
refresh balance after wallet-affecting actions
```

Important internal state:

```text
currentDraft
currentPrepareResponse
currentHoldRequest
currentHoldResponse
currentImageFile
currentUploadResult
currentReturnedUrl
```

### `page.js`

Owns:

```text
navigation
rendering built-in pages
rendering asset pages
top bar
passport drawer
balance refresh
copy helpers
event binding
```

### `page.html`

Now includes:

```text
prepare summary section
wallet hold section
image upload submit section
request preview
prepare response panel
developer JSON
```

### `page.css`

Has additional styles for:

```text
hold-summary
submit-summary
summary cards
danger-button
workflow previews
```

### `check-chrome.sh`

Now understands the refactored page modules and verifies required IDs/tokens.

---

# 6. RustyOnions config/files changed or needed

## 6.1 Dev economics file

Must exist:

```text
/Users/mymac/Desktop/RustyOnions/configs/roc-economics.dev.toml
```

Key section:

```toml
[actions.paid_storage_put]
enabled = true
pricing_kind = "flat"
price_minor = 25
minimum_charge_minor = 25
max_spend_minor = 2000
max_hold_multiplier_bps = 10000
```

Important: keep the canonical file too:

```text
configs/roc-economics.toml
```

The dev stack should be started with the absolute path to `.dev.toml`.

## 6.2 Potential future script improvement

The dev stack should eventually default to the dev economics config automatically when present.

Potential future improvement:

```text
scripts/web3_crablink_dev_stack.sh
```

should detect:

```text
configs/roc-economics.dev.toml
```

and use it unless `RON_STORAGE_ROC_ECONOMICS_PATH` is already set.

This avoids the old footgun:

```text
RON_STORAGE_ROC_ECONOMICS_PATH=configs/roc-economics.dev.toml
```

being interpreted relative to a service working directory where it does not exist.

Better script behavior:

```bash
if [ -z "${RON_STORAGE_ROC_ECONOMICS_PATH:-}" ] && [ -f "$ROOT/configs/roc-economics.dev.toml" ]; then
  export RON_STORAGE_ROC_ECONOMICS_PATH="$ROOT/configs/roc-economics.dev.toml"
fi
```

---

# 7. Known bugs / issues to fix later

## 7.1 Check Passport may reset visible ROC display to 1776

Observed bug:

```text
Clicking Check Passport can restore the displayed ROC balance back to 1776 in the passport drawer.
```

Likely cause:

```text
identity refresh / bootstrap state is overwriting balance display from starter-grant identity metadata
instead of preserving or immediately refreshing ledger-backed wallet balance.
```

Correct behavior:

```text
Check Passport should refresh identity labels only.
Then it should refresh wallet balance through GET /wallet/:account/balance.
A ledger-backed balance should never be overwritten by a starter-grant display value.
```

Fix later in CrabLink:

```text
storage.js / saveIdentityState()
popup.js / page.js identity refresh flow
```

Rule:

```text
If rocLedgerBacked === true, do not replace rocBalanceDisplay from identity/bootstrap metadata.
Always prefer /wallet/:account/balance for actual balance.
```

Do not let this derail the NEXT_LEVEL path unless it blocks user testing.

## 7.2 Need optional paid upload smoke

Current `scripts/smoke-local-gateway.sh` covers prepare and bootstrap but not full paid upload by default.

Add later:

```text
CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

Goal:

```text
create tiny PNG
prepare image
create wallet hold
upload image
assert omnigate.image-asset-upload.v1
assert crab_url present
resolve crab_url
assert omnigate.asset-page.v1
assert storage.available=true
assert owner/payout/receipt fields exist
```

## 7.3 Asset page rendering needs richer UI

Current asset page renders basic facts and Developer JSON.

Next rendering pass should add dedicated cards:

```text
Preview card
Metadata card
Owner card
Payout card
Receipt card
Storage/provider card
Manifest/raw link card
```

For `asset_kind=image`, add safe preview:

```text
<img src="http://127.0.0.1:8090/o/b3:<asset_hash>">
```

or whatever stable public raw-object gateway route is confirmed.

Security rule:

```text
Render text via textContent.
Never render backend HTML.
Never execute crab-provided scripts.
Only render <img> for safe image assets.
No arbitrary executable linked code.
```

This matches NEXT_LEVEL’s no arbitrary executable code invariant. 

## 7.4 Site create flow remains next major product task

Current site flow:

```text
crab://site
→ prepare
→ hold
```

Next target:

```text
crab://site
→ prepare
→ hold
→ create site
→ return crab://<site_name>
→ open crab://<site_name>
```

Before wiring UI, inspect exact backend contract:

```text
crates/omnigate/src/routes/v1/sites.rs
crates/omnigate/tests/site_launch.rs
crates/svc-gateway/tests/product_routes_proxy.rs
docs/WEB3_2_PRODUCT_ROUTE_CONTRACTS.md
```

Need confirm:

```text
POST /sites request body
required submit fields
required headers
whether it expects root_document_cid
whether it expects x-ron-wallet-txid paid proof headers
whether site creation captures/reuses hold internally
what exact response shape returns crab URL or site URL
```

## 7.5 Manual nonce issue may appear after repeated holds

The UI currently defaults `holdNonce` to `1`.

Repeated holds against the same account may eventually need smarter nonce handling if `svc-wallet` enforces nonces strictly.

Possible next fix:

```text
Read next nonce from wallet/balance/receipt endpoint if exposed.
Or increment local nonce after successful hold.
Or let backend accept idempotency and manage nonce in dev mode.
```

Do not invent local wallet truth. If nonce source is needed, expose it through gateway/wallet response.

---

# 8. NEXT_LEVEL.MD direction

## 8.1 Do not skip ahead

`NEXT_LEVEL.MD` is clear: the next product layer begins after the current image/site flows are clean. The immediate checkpoint is:

```text
1. Finish CrabLink in-UI image upload.      DONE / just achieved manually in UI
2. Finish site creation/open flow.          NEXT
3. Improve asset-page rendering.            NEXT/PARALLEL
4. Add optional paid image upload smoke.    NEXT/PARALLEL
5. Then generalize .image to .post/.comment/.article.
```

The blueprint explicitly says not to invent a new parallel publishing system. The proven pattern is prepare → explicit ROC hold → paid upload/create → b3 CID → manifest CID → index pointer → crab URL → hydrated page, and NEXT_LEVEL should generalize that exact shape. 

## 8.2 Site as reference graph is the big architectural pivot

NEXT_LEVEL’s core thesis:

```text
A RON-native site owns:
- route maps
- layout
- moderation policy
- payout policy
- reference graphs
- site identity
- site manifest

A RON-native site should not permanently own every post/comment/image/article/song/video in a centralized DB.
Every user-created content object should become a b3-addressed asset.
Sites store references to assets.
Asset manifests store attribution, ownership, payout, provenance, storage/provider data, and receipts.
```

Future model:

```text
Site = manifest + routes + policies + references
Post = b3 asset + manifest
Comment = b3 asset + manifest
Article = b3 asset + manifest
Image = b3 asset + manifest
Thread = reference collection / manifest
Profile = passport-linked asset/page
```

This is the “site as reference graph” architecture.

## 8.3 Do not start `.post/.comment/.article` until image/site are polished

The correct order:

```text
A. Finish image UI and smoke hardening.
B. Finish site create/open UI.
C. Improve asset-page rendering.
D. Add optional paid image upload smoke.
E. Then start NEXT_LEVEL Phase 1: ron-proto + ron-naming DTO foundation for .post/.comment/.article.
```

When we reach E, start with DTOs and parsing, not service logic.

---

# 9. Next recommended work order

## Batch 1 — harden current CrabLink image upload

Goal:

```text
Make current image upload proof repeatable and less fragile.
```

Tasks:

```text
1. Run scripts/check-chrome.sh && scripts/package-chrome.sh.
2. Run CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh.
3. Manually upload image through CrabLink.
4. Confirm:
   - prepare shows 25 ROC
   - wallet hold succeeds
   - upload succeeds
   - balance decreases
   - returned crab URL opens
5. Fix any display polish issues.
```

Acceptance:

```text
Manual in-UI image upload works twice in a row after full stack restart.
Balance refreshes correctly after hold/upload.
No stale 1776 display after Check Passport.
No 422 wallet hold error.
No 121,927 ROC legacy pricing.
```

## Batch 2 — add optional full paid upload smoke

Update:

```text
scripts/smoke-local-gateway.sh
```

Add:

```text
CRABLINK_SMOKE_RUN_UPLOAD=1
```

Smoke should:

```text
create tiny PNG or use fixture
POST /assets/image/prepare
POST /wallet/hold
POST /assets/image with raw PNG body and proof headers
assert schema == omnigate.image-asset-upload.v1
extract crab_url
resolve crab_url
assert schema == omnigate.asset-page.v1
assert manifest present
assert storage available
assert owner/payout/receipt present
```

Acceptance:

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

passes.

## Batch 3 — improve asset-page rendering

Add richer UI cards:

```text
Image preview
Title
Description
Tags
Owner passport
Owner wallet
Payout recipient
Storage status
Storage size
Receipt txid
Receipt amount
Manifest CID
Raw content link
Manifest link
Developer JSON
```

Acceptance:

```text
Returned crab://<hash>.image page looks like a real asset page, not just a generic JSON fact table.
```

Security:

```text
No backend HTML execution.
Use textContent.
Only render img preview for image assets.
```

## Batch 4 — site create/open flow

Target flow:

```text
crab://site
→ fill site name/title/description
→ Build Request Preview
→ Send Prepare Request
→ Confirm ROC Hold
→ Create Site
→ Open crab://<site_name>
```

Before coding, inspect backend contract:

```text
crates/omnigate/src/routes/v1/sites.rs
crates/omnigate/tests/site_launch.rs
crates/svc-gateway/tests/product_routes_proxy.rs
docs/WEB3_2_PRODUCT_ROUTE_CONTRACTS.md
```

Likely UI changes:

```text
page-workflow.js:
  add submitSiteCreate()

ronClient.js:
  add createSite(...)

page.html:
  reuse submitSection but adapt label/body for site

check-chrome.sh:
  add tokens for site create path
```

Acceptance:

```text
Manual crab://site create works.
Returned site URL opens.
Balance reflects hold/spend.
smoke script optionally tests site create if env enabled.
```

## Batch 5 — only then begin NEXT_LEVEL primitives

Start with RustyOnions DTO/foundation batch:

```text
ron-proto
ron-naming
possibly ron-app-sdk after DTOs
```

First primitives:

```text
.post
.comment
.article
```

Do not start with omnigate/service routes until DTOs and parsing are clean.

Potential phase order:

```text
1. ron-naming AssetKind parse/format tests for post/comment/article
2. ron-proto DTOs:
   - TextAssetBodyV1
   - PostAssetV1
   - CommentAssetV1
   - ArticleAssetV1
   - AssetReferenceV1
   - ReferenceGraphV1
   - ThreadManifestV1
   - SiteReferenceMapV1
   - AttributionStatus
3. DTO wire tests and golden fixtures
4. omnigate prepare/create for .post only
5. svc-gateway route proxy for .post only
6. CrabLink built-in crab://post only after backend route exists
7. Repeat for comment/article
```

---

# 10. Important invariants to preserve

From WEB3, WEB3_2, and NEXT_LEVEL:

```text
ROC remains internal only.
No ROX.
No Solana.
No external settlement.
No staking/liquidity/exchange-facing logic.
No floating-point money math.
Use integer ROC amounts internally.
Use basis points for percentages.
Wallet mutation goes through svc-wallet.
Durable economic truth remains ron-ledger.
ron-accounting is usage/metering snapshots, not balance truth.
svc-rewarder computes payout plans but does not mutate ledger directly.
Paid operations use hold → capture/release semantics.
Wallet actions require nonce + idempotency.
No silent ROC spending.
No fake receipts.
No direct ledger mutation by svc-gateway, omnigate, svc-storage, svc-index, CrabLink, or SDKs.
b3:<64 lowercase hex> is canonical internal content ID.
crab://<64 lowercase hex>.<kind> is canonical public typed asset URL.
Names are human pointers; b3 hashes are canonical.
Storage stores bytes by CID only.
Index stores pointers and lookup metadata.
Omnigate hydrates views but owns no durable truth.
Gateway exposes public routes and enforces ingress limits.
CrabLink remains gateway-only.
No arbitrary executable code from crab links.
Clearnet crossover remains feature-gated and OFF until attribution is safe.
```

WEB3_2’s service-boundary section is especially important: usage/metering belongs to `ron-accounting`, reward calculation to `svc-rewarder`, economic mutation to `svc-wallet`, durable truth to `ron-ledger`, paid enforcement to storage/gateway/omnigate, identity to passport/auth, naming/indexing to ron-naming/svc-index, content bytes to storage/edge, and visibility to admin/dashboard/extension UI. 

---

# 11. What to tell the next instance first

Use this exact short summary:

```text
We are continuing RustyOnions + CrabLink under NEXT_LEVEL.MD.

Latest success:
The CrabLink full-tab browser can now complete an in-UI paid image upload:
crab://image → choose file → prepare → explicit wallet hold → submit image upload → 25 ROC deducted → b3 image asset created → crab://<hash>.image returned/opened.

Important fixes:
- Refactored page.js into page.js/page-workflow.js/page-dom.js/page-utils.js/page-constants.js.
- Added raw upload support in ronClient.js via requestRaw/uploadImageAsset.
- Fixed UI wording from "ROC minor units" to "ROC".
- Added configs/roc-economics.dev.toml with paid_storage_put flat 25 ROC.
- Must start dev stack with absolute RON_STORAGE_ROC_ECONOMICS_PATH.
- Fixed wallet hold 422 by stripping preview-only schema before POST /wallet/hold.
- Confirmed 25 ROC deducted after upload.

Current next task:
Do not jump to .post/.comment/.article yet.
First harden image upload, add optional paid image upload smoke, improve asset-page rendering, then wire crab://site create/open flow.
Only after image and site are green should we begin NEXT_LEVEL Phase 1 in ron-proto/ron-naming for .post/.comment/.article.
```

---

# 12. Success statement

This session proved the first **browser-native RustyOnions creator economy loop**:

```text
open CrabLink
→ go to crab://image
→ choose an image
→ prepare paid storage
→ explicitly hold ROC
→ upload the image
→ deduct 25 ROC
→ receive b3 content address
→ receive crab:// image asset URL
→ resolve/open the asset page
```

This is the key bridge between the RustyOnions backend and normal user product UX.

The architecture held:

```text
CrabLink stayed gateway-only.
svc-gateway stayed proxy/public edge.
omnigate hydrated/coordinated product views.
svc-wallet remained economic mutation front-door.
ron-ledger remained economic truth.
svc-storage stored bytes/manifests.
svc-index stored pointers.
b3 remained canonical.
crab:// became user-facing.
```

The next phase should preserve that discipline and finish the immediate product loop before expanding.

### END NOTE - MAY 02 2026 - CRABLINK IN-UI PAID IMAGE UPLOAD GREEN + NEXT_LEVEL HANDOFF

```

The biggest takeaway: we should treat today as a **real product milestone**, not just a coding milestone. The backend, wallet, pricing policy, extension UI, explicit spend confirmation, paid storage, b3 asset creation, and crab navigation all worked together. The next instance should stay disciplined: polish image, wire site creation, improve asset pages, add a paid-upload smoke, and only then start `.post/.comment/.article` primitives.
```


### END NOTE - MAY 2 2026 - 16:15 CST


### BEGIN NOTE - MAY 2 2026 - 16:40 CST

````markdown
### BEGIN NOTE - MAY 02 2026 - CRABLINK SMOKE GATES GREEN + SITE CREATE/OPEN PROOF + NEXT_LEVEL HANDOFF

# RustyOnions / CrabLink Carryover Notes — Reproducible Paid Image Upload + Site Create/Open Green

**Date:** 2026-05-02  
**Primary repos:**  
- `/Users/mymac/Desktop/RustyOnions`
- `/Users/mymac/Desktop/crablink`

**Primary active blueprints / references:**  
- `NEXT_LEVEL.MD`
- `WEB3.MD`
- `WEB3_2.MD`
- `TODO_WEB3_2.MD`
- `WEB3_2_PRODUCT_ROUTE_CONTRACTS.md`
- `CODEBUNDLE_RS.md`
- `CODEBUNDLE_CHROME_EXTENSION.md`
- `ALLNOTES.MD`
- `ALL_DOCS_COMBINED.MD`
- `CODECHECK.md`
- `CODECOMMENTS.MD`

## 0. Executive summary

This was a **major checkpoint session** for CrabLink and RustyOnions WEB3_2 / NEXT_LEVEL.

We started with a working in-browser paid image upload and then turned that fragile manual success into reproducible smoke gates. By the end of the session, the following were green:

```text
CrabLink static Chrome checks/package                 ✅
CrabLink read/prepare gateway smoke                   ✅
CrabLink bootstrap/passport/wallet smoke              ✅
CrabLink opt-in paid image upload smoke               ✅
CrabLink site create/open smoke via /sites/:name       ✅
````

The only known product-route gap exposed by the new smoke is:

```text
crab://<site_name> through /crab/resolve               ⚠️ pending backend resolver batch
direct GET /sites/<site_name>                          ✅ green
```

This aligns very cleanly with `NEXT_LEVEL.MD`, which says the immediate checkpoint is: finish CrabLink image upload, finish site creation/open flow, improve asset-page rendering, add optional paid image upload smoke, and only then generalize `.image` into `.post/.comment/.article`. 

The project is now past “can this work?” for the first two product primitives:

```text
.image asset primitive     proven end-to-end
.site primitive            create/open proven through direct site route
```

The remaining work is polishing, resolver completion, UI wiring, richer rendering, and then generalizing the exact proven pattern into new asset types.

---

# 1. What was accomplished in this session

## 1.1 CrabLink Chrome extension static gates are green

The extension passes:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh && scripts/package-chrome.sh
```

Observed green output:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

This proves the current Chrome extension JavaScript and manifest/package structure remain valid after the recent file/refactor work.

---

## 1.2 Fixed `scripts/smoke-local-gateway.sh` health probe assumption

Problem encountered:

```text
ok: GET /healthz -> HTTP 200
jq: parse error: Invalid numeric literal at EOF at line 1, column 2
fail: GET /healthz did not return valid JSON
```

Root cause:

```text
/healthz and /readyz may return plain text like "ok".
They are HTTP status probes, not guaranteed JSON DTO endpoints.
```

Fix:

```text
scripts/smoke-local-gateway.sh now treats /healthz and /readyz as HTTP status probes only.
It no longer jq-validates them.
```

This was the correct behavior. JSON validation remains for product DTO routes such as:

```text
/identity/me
/wallet/:account/balance
/b3/<hash>.image
/crab/resolve?url=...
/sites/prepare
/assets/image/prepare
/identity/passport/bootstrap
/assets/image
```

---

## 1.3 Read/prepare CrabLink gateway smoke is green

Command run:

```bash
scripts/smoke-local-gateway.sh
```

Observed green path:

```text
GET /healthz                                      ✅
GET /readyz                                       ✅
GET /identity/me                                  ✅
GET /wallet/acct_dev/balance                      ✅
GET /b3/<sample>.image                            ✅
GET /crab/resolve?url=crab://<sample>.image       ✅
GET /crab/resolve?url=crab://site                 ✅
GET /crab/resolve?url=crab://image                ✅
GET /crab/resolve?url=crab://music                ✅ coming_soon
GET /crab/resolve?url=crab://article              ✅ coming_soon
POST /sites/prepare                               ✅
POST /assets/image/prepare                        ✅
```

Observed ending:

```text
CrabLink local gateway smoke passed.
```

Meaning:

```text
The public gateway route surface CrabLink depends on is reachable.
The built-in page resolver is working for active/coming-soon pages.
The typed sample image asset route is working.
The wallet balance route is working.
The site prepare route is working.
The image prepare route is working.
```

This continues the prior route-contract direction: the Chrome extension should treat the gateway routes as its backend API and remain a thin client over those routes. 

---

## 1.4 Bootstrap/passport/wallet smoke is green

Command run:

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Observed green path:

```text
POST /identity/passport/bootstrap                  ✅
GET /wallet/acct_dev/balance after bootstrap       ✅
```

Observed output included:

```text
bootstrap JSON: ok
wallet JSON: ok
CrabLink local gateway smoke passed.
```

Meaning:

```text
CrabLink can prove passport bootstrap through gateway.
CrabLink can prove wallet/account binding through gateway.
CrabLink can fetch ledger-backed wallet balance after bootstrap.
```

Important rule preserved:

```text
Do not fake wallet truth in the extension.
Always prefer /wallet/:account/balance for actual ROC balance.
If rocLedgerBacked === true, do not overwrite the displayed balance using stale bootstrap metadata.
```

---

## 1.5 Opt-in paid image upload smoke is now green

This was the most important green gate added in this session.

Final successful command:

```bash
CRABLINK_SMOKE_HOLD_NONCE=3 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

Observed green path:

```text
POST /assets/image/prepare                         ✅
POST /wallet/hold                                  ✅
POST /assets/image                                 ✅
GET /crab/resolve?url=crab://<hash>.image          ✅
```

Observed successful output:

```text
ok: POST /wallet/hold -> HTTP 200
wallet hold JSON: ok
ok: POST /assets/image -> HTTP 200
image upload JSON: ok
ok: GET /crab/resolve?url=crab%3A%2F%2F984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image -> HTTP 200
asset page JSON: ok
paid image upload JSON: ok
paid image crab URL: crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image

CrabLink local gateway smoke passed.
```

This proves:

```text
CrabLink smoke script
→ svc-gateway
→ omnigate
→ image prepare
→ svc-wallet hold
→ paid image upload
→ svc-storage stores bytes
→ manifest stored
→ svc-index pointer stored
→ crab://<hash>.image returned
→ crab:// resolver opens hydrated asset page
```

This matches the proven NEXT_LEVEL product pattern:

```text
prepare
→ explicit ROC hold
→ paid upload/create
→ raw bytes stored by b3 CID
→ manifest stored by b3 CID
→ index pointer stored
→ crab:// URL returned
→ hydrated page resolves in CrabLink
```

`NEXT_LEVEL.MD` explicitly says this proven pattern should be generalized rather than replaced by a new parallel publishing system. 

---

## 1.6 Paid upload validator was fixed to match real response shape

During paid upload smoke, the upload succeeded, but the smoke validator initially failed with:

```text
error: missing image upload manifest cid
```

Real response shape:

```json
{
  "schema": "omnigate.image-asset-upload.v1",
  "asset_kind": "image",
  "asset_cid": "b3:984128e6...",
  "crab_url": "crab://984128e6....image",
  "manifest": {
    "status": "stored",
    "manifest_cid": "b3:6d1f8600...",
    "storage_path": "/o"
  },
  "index_pointer": {
    "status": "stored"
  }
}
```

Old validator expected:

```text
.manifest_cid
.manifest.cid
.manifest_b3
.manifest_id
```

Fix:

```text
scripts/smoke-local-gateway.sh now accepts:
.manifest.manifest_cid
```

This aligned the smoke script with the actual `omnigate.image-asset-upload.v1` response.

---

## 1.7 Wallet nonce behavior was proven and documented

During paid upload smoke, wallet hold failed with:

```json
{
  "code": "NONCE_CONFLICT",
  "http": 409,
  "message": "nonce conflict for account acct_dev: expected 2, got 1777756959",
  "retryable": false
}
```

Meaning:

```text
svc-wallet enforces strict sequential nonces.
It does not accept timestamp/random nonces.
For acct_dev, after nonce 1, the next hold must use nonce 2.
```

Then nonce `2` was used and hold succeeded.

After that, nonce `3` was needed for the next paid upload smoke.

Important carryover:

```text
The current safest smoke method is to pass CRABLINK_SMOKE_HOLD_NONCE=<expected_next_nonce>.
The wallet itself will tell us the next expected nonce in NONCE_CONFLICT errors.
```

Future improvement:

```text
Expose/fetch next expected nonce through wallet/balance/account state if available.
Or add a dev-safe helper route through gateway/wallet.
Or make the script retry once by parsing "expected N" from NONCE_CONFLICT.
Do not invent wallet truth locally in CrabLink.
```

This directly connects to the prior note that repeated holds would need smarter nonce handling. 

---

## 1.8 Wallet idempotency behavior was proven and documented

During paid upload smoke, wallet hold also failed with:

```json
{
  "code": "IDEMPOTENCY_CONFLICT",
  "http": 409,
  "message": "same Idempotency-Key used with different request body",
  "retryable": false
}
```

Root cause:

```text
The script reused the same HTTP Idempotency-Key while changing the JSON request body, especially nonce.
```

Fix:

```text
scripts/smoke-local-gateway.sh now uses idempotency keys that include the per-run CORR_PREFIX and nonce.
```

Carryover rule:

```text
If request body changes, idempotency key must change too.
For wallet hold, include run id and nonce in idempotency key.
```

This is correct wallet/ledger safety behavior, not a bug.

---

## 1.9 Added `scripts/smoke-site-create-local.sh`

A new CrabLink repo script was created:

```text
/Users/mymac/Desktop/crablink/scripts/smoke-site-create-local.sh
```

Purpose:

```text
Prove site create/open through public svc-gateway routes before wiring the flow into CrabLink UI.
```

It exercises:

```text
GET  /healthz
GET  /readyz
POST /sites/prepare
POST /sites
GET  /sites/:name
GET  /crab/resolve?url=crab://<site_name>   currently expected pending gap
```

It uses a sample root document CID:

```text
b3:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

It creates a unique site name like:

```text
crablink-site-smoke-20260502-163451
```

---

## 1.10 Site create/open smoke is green via direct `/sites/:name`

Final successful command:

```bash
scripts/smoke-site-create-local.sh
```

Observed green path:

```text
POST /sites/prepare                               ✅
POST /sites                                       ✅
GET /sites/<site_name>                            ✅
```

Observed output:

```text
ok: POST /sites/prepare -> HTTP 200
site prepare JSON: ok
ok: POST /sites -> HTTP 200
site create JSON: ok
ok: GET /sites/crablink-site-smoke-20260502-163451 -> HTTP 200
site page JSON: ok
```

Observed final success:

```text
CrabLink site create/open smoke passed.
site crab URL: crab://crablink-site-smoke-20260502-163451
direct open route: /sites/crablink-site-smoke-20260502-163451
named crab resolver: pending backend batch unless already green above
```

Meaning:

```text
The backend can prepare a site.
The backend can create a site manifest.
The backend can store the site manifest.
The backend can store the site name pointer.
The backend can hydrate the site through /sites/:name.
```

This matches the prior product route contract that `POST /sites` creates a site manifest and writes a site name → manifest CID pointer, while `GET /sites/:name` hydrates the site page. 

---

## 1.11 Named-site `crab://<site_name>` resolver gap was exposed cleanly

The site smoke found:

```text
GET /crab/resolve?url=crab://<site_name> -> HTTP 400
```

Response:

```json
{
  "code": "invalid_crab_url",
  "message": "missing asset kind suffix",
  "retryable": false,
  "reason": "missing_asset_kind"
}
```

Meaning:

```text
/crab/resolve currently understands:
- built-in product pages like crab://site and crab://image
- typed b3 asset URLs like crab://<64hex>.image

It does not yet route arbitrary named sites:
- crab://<site_name>
```

This is now documented as a **pending backend batch**, not a script failure.

Important:

```text
Direct /sites/<site_name> works.
Named crab resolver for created sites is pending.
```

---

# 2. Current green commands to rerun next session

## 2.1 Start RustyOnions stack

Terminal A:

```bash
cd /Users/mymac/Desktop/RustyOnions
SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

Terminal B:

```bash
cd /Users/mymac/Desktop/RustyOnions
ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
OMNIGATE_WALLET_BEARER=dev \
RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
scripts/web3_crablink_dev_stack.sh
```

If `configs/roc-economics.dev.toml` is not present, either recreate it or use the current checked-in dev economics path. The important behavior is that local dev image prepare should return:

```text
25 ROC
```

not legacy byte-size pricing.

---

## 2.2 CrabLink static checks/package

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh && scripts/package-chrome.sh
```

Expected:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

---

## 2.3 Read/prepare smoke

```bash
scripts/smoke-local-gateway.sh
```

Expected:

```text
CrabLink local gateway smoke passed.
```

---

## 2.4 Bootstrap smoke

```bash
CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
```

Expected:

```text
bootstrap JSON: ok
wallet JSON: ok
CrabLink local gateway smoke passed.
```

---

## 2.5 Paid image upload smoke

Use the next expected nonce for `acct_dev`.

In the final green run, nonce `3` was used. If running against the same wallet DB, the next hold nonce is likely `4`.

```bash
CRABLINK_SMOKE_HOLD_NONCE=4 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

If it returns:

```text
NONCE_CONFLICT expected N, got M
```

rerun with:

```bash
CRABLINK_SMOKE_HOLD_NONCE=N CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

Expected final success:

```text
ok: POST /wallet/hold -> HTTP 200
wallet hold JSON: ok
ok: POST /assets/image -> HTTP 200
image upload JSON: ok
ok: GET /crab/resolve?url=...image -> HTTP 200
asset page JSON: ok
paid image upload JSON: ok
paid image crab URL: crab://<64hex>.image

CrabLink local gateway smoke passed.
```

---

## 2.6 Site create/open smoke

```bash
scripts/smoke-site-create-local.sh
```

Expected:

```text
ok: POST /sites/prepare -> HTTP 200
site prepare JSON: ok
ok: POST /sites -> HTTP 200
site create JSON: ok
ok: GET /sites/<site_name> -> HTTP 200
site page JSON: ok
pending: /crab/resolve named-site support is not wired yet; direct /sites/<site_name> is green

CrabLink site create/open smoke passed.
```

---

## 2.7 Regenerate codebundle after changes

After confirming everything is green:

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/make_codebundle.sh
```

Expected:

```text
wrote: /Users/mymac/Desktop/crablink/CODEBUNDLE_CHROME_EXTENSION.md
```

Before next RustyOnions backend work, also regenerate relevant RustyOnions codebundle/notes if changed.

---

# 3. Files changed or created in this session

## 3.1 CrabLink repo

Likely changed:

```text
scripts/smoke-local-gateway.sh
scripts/smoke-site-create-local.sh
extensions/chrome/test/manual-checklist.md
```

Confirmed important changes:

```text
scripts/smoke-local-gateway.sh
  - no longer requires /healthz or /readyz to be JSON
  - validates wallet/builtin/asset/site/image DTOs
  - supports CRABLINK_SMOKE_RUN_BOOTSTRAP=1
  - supports CRABLINK_SMOKE_RUN_UPLOAD=1
  - creates tiny PNG fixture for paid upload smoke
  - performs /assets/image/prepare
  - performs /wallet/hold
  - performs /assets/image upload
  - resolves returned crab://<hash>.image
  - validates omnigate.image-asset-upload.v1
  - validates omnigate.asset-page.v1
  - accepts manifest.manifest_cid response shape
  - uses unique idempotency keys per run/body/nonce

scripts/smoke-site-create-local.sh
  - new opt-in site create/open smoke
  - proves /sites/prepare
  - proves /sites create
  - proves /sites/:name hydration
  - treats /crab/resolve?url=crab://<site_name> missing_asset_kind as pending backend gap, not failure
```

Possible changed if pasted earlier:

```text
extensions/chrome/test/manual-checklist.md
  - updated manual check process
  - documents read/prepare smoke
  - documents bootstrap smoke
  - documents opt-in paid upload smoke
  - documents site flow target
  - documents no silent spend/no fake wallet truth rules
```

Before next session:

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/make_codebundle.sh
```

Upload the regenerated:

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

if asking for CrabLink UI file changes.

---

# 4. Architectural lessons confirmed this session

## 4.1 CrabLink must remain gateway-only

All successful flows used:

```text
CrabLink/script → svc-gateway → omnigate → backend services
```

No direct browser calls were made to:

```text
svc-wallet
svc-storage
svc-index
ron-ledger
ron-accounting
svc-rewarder
```

This is correct. CrabLink should remain a thin browser client:

```text
- attach headers
- prompt for paid actions
- render DTOs
- copy/share URLs
- show receipts
- open crab links
```

It must not own:

```text
ledger truth
wallet balance truth
storage truth
index truth
reward truth
accounting snapshots
```

This matches the WEB3_2 / TODO boundary map, where `omnigate` owns product-facing BFF/hydration, `svc-gateway` owns ingress/proxy surface, and `svc-wallet` owns wallet mutation/nonce/idempotency. 

---

## 4.2 Wallet nonce/idempotency is strict and correct

Confirmed wallet rules:

```text
Nonces are strict sequential per account.
Skipped nonces are rejected.
Reused nonces are rejected.
Same Idempotency-Key with different request body is rejected.
```

This is exactly what we want for economic safety.

CrabLink UI next step:

```text
Do not leave holdNonce hardcoded to 1 forever.
Either:
  - increment local nonce after success for dev UX,
  - parse expected nonce from NONCE_CONFLICT for retry,
  - or expose/fetch next nonce from wallet through gateway.
```

Important:

```text
Do not invent final wallet truth in the extension.
```

For now, manual/smoke can pass:

```text
CRABLINK_SMOKE_HOLD_NONCE=<expected_next_nonce>
```

---

## 4.3 `/healthz` and `/readyz` should stay status probes

Smoke scripts should not assume JSON for:

```text
/healthz
/readyz
```

They should treat HTTP success as the contract unless a service-specific JSON readiness contract is explicitly documented.

---

## 4.4 The paid image upload path is now a reusable template

The image path is the template for NEXT_LEVEL primitives:

```text
prepare
→ explicit ROC hold
→ upload/create
→ storage by b3 CID
→ manifest by b3 CID
→ index pointer
→ crab URL
→ hydrated page
```

This should be reused for:

```text
.post
.comment
.article
```

Do not invent a second content-publishing mechanism.

`NEXT_LEVEL.MD` defines asset primitives as creating canonical content bytes, b3 asset CID, asset manifest, b3 manifest CID, index pointer, crab URL, receipt refs, and a hydrated asset page. 

---

## 4.5 Site create/open is green, but named crab resolver is pending

The project can now:

```text
POST /sites/prepare
POST /sites
GET /sites/:name
```

But not yet:

```text
GET /crab/resolve?url=crab://<site_name>
```

Current resolver gap:

```json
{
  "code": "invalid_crab_url",
  "reason": "missing_asset_kind"
}
```

This is the next best RustyOnions backend batch.

---

# 5. Current project status by area

## 5.1 CrabLink Chrome extension

Status:

```text
MVP browser shell: green
Image upload UI: manually green
Static checks/package: green
Gateway read/prepare smoke: green
Bootstrap smoke: green
Paid image upload smoke: green
Site create/open smoke script: green via direct /sites/:name
```

Remaining:

```text
Wire full site create/open into crab://site UI.
Add smarter nonce UX for repeated wallet holds.
Improve asset page rendering into cards.
Add safe image preview route once raw-object public route is confirmed.
After backend resolver batch, open created sites through crab://<site_name> resolver.
Eventually add .post/.comment/.article UI after DTO/backend foundation.
```

---

## 5.2 RustyOnions backend product routes

Status:

```text
GET /healthz                                      green
GET /readyz                                       green
GET /identity/me                                  green
GET /wallet/:account/balance                      green
POST /identity/passport/bootstrap                 green
GET /b3/<hash>.image                              green
GET /crab/resolve?url=crab://<hash>.image         green
GET /crab/resolve?url=crab://site                 green
GET /crab/resolve?url=crab://image                green
GET /crab/resolve?url=crab://music                green coming_soon
GET /crab/resolve?url=crab://article              green coming_soon
POST /assets/image/prepare                        green
POST /wallet/hold                                 green
POST /assets/image                                green
POST /sites/prepare                               green
POST /sites                                       green
GET /sites/:name                                  green
GET /crab/resolve?url=crab://<site_name>          pending
```

Remaining backend route work:

```text
omnigate: named-site crab resolver
svc-gateway: likely no business logic change; ensure proxy keeps working
tests: add named-site resolver coverage
docs: update route contracts after resolver is green
```

---

## 5.3 Omnigate

Current role:

```text
Product-facing BFF
Built-in page resolver
Typed b3 asset-page hydration
Image prepare/upload coordination
Site prepare/create/hydration
Wallet façade routing through gateway
```

Proven by this session:

```text
Built-in pages resolve.
Typed image asset resolves.
Paid image upload returns omnigate.image-asset-upload.v1.
Uploaded image resolves to omnigate.asset-page.v1.
Site create returns omnigate.site-create.v1.
Site direct resolve returns omnigate.site-page.v1.
```

Next omnigate work:

```text
Teach /v1/crab/resolve that crab://<site_name> should hydrate through existing site resolver.
Preserve current behavior for:
  crab://site
  crab://image
  crab://music
  crab://article
  crab://<64hex>.image
  invalid missing suffix hash forms
Add test for created/named site resolution.
```

Implementation idea:

```text
In omnigate crab resolver:
1. If URL is built-in page, return built-in page DTO.
2. If URL is typed b3 asset URL, return asset page DTO.
3. If URL is valid named site URL, call existing site hydration path.
4. Otherwise return deterministic problem body.
```

Do not put business logic in `svc-gateway`.

---

## 5.4 svc-gateway

Current role:

```text
Public route exposure
Proxying selected headers/bodies to omnigate
Stable browser/client path surface
```

This session suggests:

```text
No immediate gateway business logic change should be needed for named-site resolution.
Existing /crab/resolve proxy should forward to omnigate.
```

Next gateway work only if tests show needed:

```text
Ensure query strings are preserved.
Ensure x-ron-* headers forward.
Ensure hop-by-hop headers are not forwarded.
Add/extend product route proxy tests if named-site resolver needs coverage.
```

---

## 5.5 svc-wallet / ron-ledger

Current role:

```text
Wallet mutation front door
Nonce/idempotency enforcement
Ledger-backed ROC balance
Hold receipts
```

Proven this session:

```text
/wallet/hold works through gateway/omnigate.
Nonce conflict behavior is strict and deterministic.
Idempotency conflict behavior is strict and deterministic.
Paid upload can use wallet hold receipt to satisfy storage/image upload.
```

Remaining:

```text
Expose next expected nonce if not already available.
Improve CrabLink UX around nonce.
Keep wallet truth out of CrabLink.
```

Do not weaken nonce/idempotency enforcement just to make demos easier.

---

## 5.6 svc-storage / svc-index

Current role:

```text
svc-storage stores raw bytes/manifests by b3 CID.
svc-index stores asset/site pointers.
```

Proven this session:

```text
Image bytes stored by b3 CID.
Image manifest stored and manifest_cid returned.
Asset index pointer stored.
Site manifest stored.
Site name pointer stored.
Site hydrated through /sites/:name.
```

Remaining:

```text
No heavy changes needed immediately.
Future .post/.comment/.article should reuse the same storage/index pattern.
Reference-graph site work will eventually need index/list/ref APIs, but do not start until image/site are polished.
```

---

# 6. Known exact successful proof artifacts from terminal

## 6.1 Paid image proof

Final returned image URL:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Final paid upload proof included:

```text
asset_cid: b3:984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4
manifest.manifest_cid: b3:6d1f86000ab10217e46fcbab3d0adc0769f0c020973c6ff2b633697e66edf99a
wallet_txid: tx_f5089c78db6797dbddce831058c8d662
wallet_receipt_hash: b3:d451540c1df9960dadf1034d54dc73d27a76679615036fb82d84e3d4ac8a18e2
```

Note: repeated tiny PNG upload produced same `asset_cid` because the tiny PNG bytes are identical. That is correct content-addressed behavior.

---

## 6.2 Site create/open proof

Successful site smoke created:

```text
crab://crablink-site-smoke-20260502-163451
```

Direct open route:

```text
/sites/crablink-site-smoke-20260502-163451
```

Direct hydration:

```text
GET /sites/crablink-site-smoke-20260502-163451 -> HTTP 200
schema: omnigate.site-page.v1
manifest.status: present
manifest.hydration_status: hydrated
```

Named crab resolver gap:

```text
GET /crab/resolve?url=crab://crablink-site-smoke-20260502-163451 -> HTTP 400
reason: missing_asset_kind
```

---

# 7. Recommended next session plan

## Batch A — Update codebundles / freeze green state

First thing next session:

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/make_codebundle.sh
```

Upload:

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

If doing RustyOnions backend work, also regenerate/upload:

```text
CODEBUNDLE_RS.md
ALLNOTES.MD
ALL_DOCS_COMBINED.MD
NEXT_LEVEL.MD
```

---

## Batch B — RustyOnions backend: named-site crab resolver

This should be the **next code batch**.

Goal:

```text
GET /crab/resolve?url=crab://<site_name>
→ omnigate.site-page.v1
```

Likely crates:

```text
omnigate
svc-gateway tests only if needed
ron-naming only if current parser blocks named sites at library level
```

Likely files to inspect:

```text
crates/omnigate/src/routes/v1/crab.rs
crates/omnigate/src/routes/v1/sites.rs
crates/omnigate/tests/builtin_page_resolver.rs
crates/omnigate/tests/asset_page_resolver.rs
crates/omnigate/tests/site_launch.rs
crates/svc-gateway/tests/product_routes_proxy.rs
crates/ron-naming/src/crab.rs
crates/ron-naming/tests/crab_links.rs
```

Acceptance:

```text
cargo fmt
cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
cargo test -p omnigate --test builtin_page_resolver
cargo test -p omnigate --test asset_page_resolver
cargo test -p omnigate --test site_launch
cargo test -p omnigate --all-targets
scripts/smoke-site-create-local.sh
CRABLINK_SITE_REQUIRE_CRAB_RESOLVE=1 scripts/smoke-site-create-local.sh
```

Expected after backend fix:

```text
ok: GET /crab/resolve?url=crab://<site_name> -> HTTP 200
site page JSON: ok
named crab resolver: required
CrabLink site create/open smoke passed.
```

---

## Batch C — CrabLink UI: wire site create/open flow

Only after Batch B or in parallel using direct `/sites/:name` fallback.

Goal UI flow:

```text
crab://site
→ enter site name/title/description
→ Build Request Preview
→ Send Prepare Request
→ Confirm ROC Hold
→ Create Site
→ show crab://<site_name>
→ open site page
```

Important decision:

```text
If named-site resolver is still pending:
  open direct /sites/<site_name> DTO inside CrabLink renderer.
If named-site resolver is fixed:
  open crab://<site_name> through normal /crab/resolve path.
```

CrabLink files likely touched:

```text
extensions/chrome/src/page.html
extensions/chrome/src/page.css
extensions/chrome/src/page.js
extensions/chrome/src/page-workflow.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/page-utils.js
extensions/chrome/test/manual-checklist.md
scripts/check-chrome.sh
```

Required UX rules:

```text
No silent ROC spend.
User must explicitly confirm wallet hold.
Show amount in ROC, not "minor units".
Show payer account and escrow.
Show hold txid/receipt hash.
Show Create Site only after hold succeeds if paid proof is required.
Refresh wallet balance after hold/create.
Do not fake site URL; use backend response.
```

---

## Batch D — Improve asset page rendering

Current asset page rendering is basic.

Next target cards:

```text
Preview card
Metadata card
Owner card
Payout card
Receipt card
Storage/provider card
Manifest/raw link card
Developer JSON details
```

Security rules:

```text
Render backend text with textContent.
Never render backend HTML.
Never execute crab-provided scripts.
No arbitrary executable linked code.
Only use safe <img> previews for image assets.
```

This matches the no-executable-code invariant in `NEXT_LEVEL.MD`. 

Need confirm stable public raw object route before image preview:

```text
Possibilities:
GET /o/b3:<hash>
GET /v1/o/b3:<hash>
GET /objects/...
GET links.raw from asset page response
```

Do not guess. Use response `links.raw` if stable through gateway.

---

## Batch E — Smart wallet nonce UX

Problem:

```text
Current UI/smoke can require manual nonce management.
Wallet enforces sequential nonces.
```

Near-term solutions:

```text
1. If wallet balance/account response exposes next_nonce, use it.
2. If /wallet/hold returns NONCE_CONFLICT expected N, show "Use next nonce N" or retry only after explicit confirmation.
3. Increment local nonce after successful hold for dev UX only.
4. Add gateway/wallet endpoint for next nonce if backend team agrees.
```

Do not:

```text
Use timestamps.
Use random nonces.
Disable nonce checking.
Fake ledger state.
```

---

## Batch F — Only after image/site polished: start `.post/.comment/.article`

Do not start this until:

```text
paid image upload smoke remains green
site create/open UI is green
named-site resolver is green or explicitly deferred
asset page rendering is at least acceptably polished
nonce UX is not blocking normal tests
```

Then begin with DTO/parser foundation, not service sprawl:

```text
ron-proto:
  TextAssetBodyV1
  PostAssetV1
  CommentAssetV1
  ArticleAssetV1
  AssetReferenceV1
  ReferenceGraphV1

ron-naming:
  .post
  .comment
  .article asset suffix parsing/canonicalization tests

omnigate:
  only after DTOs exist
```

`NEXT_LEVEL.MD` explicitly says sites should become reference graphs where posts/comments/articles/images are b3 assets and sites store references to them. 

---

# 8. Updated completion estimate

Rough current status:

```text
Core RON substrate / RON beta foundation:        ~90% for product-proof purposes
Internal ROC economy loop:                       ~85–90% for closed-loop beta
WEB3_2 product routes:                           ~80–85%
CrabLink extension MVP:                          ~70–75%
NEXT_LEVEL reusable asset primitives:            ~20–25% started, not yet generalized
```

Why this jumped:

```text
Image upload is now not just manually green; it is smoke-gated.
Site create/open is now not just backend-theoretical; it is smoke-gated through /sites/:name.
The remaining major gap is routing/polish/generalization, not proving the basic architecture.
```

Most important remaining blockers:

```text
1. Named-site crab resolver.
2. CrabLink site create/open UI.
3. Asset page rendering polish.
4. Smart wallet nonce handling.
5. Route-contract tests for the newly proven smoke paths.
6. Begin text primitives only after the above are clean.
```

---

# 9. One-sentence status for next instance

```text
As of the end of this session, CrabLink has green static/package checks, green read/prepare smoke, green bootstrap/passport/wallet smoke, green opt-in paid image upload smoke, and green site create/open smoke via /sites/:name; the next RustyOnions backend batch should add named-site crab resolver support so crab://<site_name> resolves through /crab/resolve, then CrabLink should wire the site create/open UI on top of that.
```

---

# 10. Final morale / strategic note

This session was a major product-proof success.

The stack now demonstrates:

```text
pay ROC
→ publish content
→ store by b3 CID
→ store manifest
→ index pointer
→ return crab:// URL
→ resolve hydrated page
```

And now also:

```text
prepare site
→ create site manifest
→ store pointer
→ open hydrated site page
```

That is the foundation of the content-addressed creator web described in `NEXT_LEVEL.MD`: sites as reference graphs, assets as b3-backed primitives, manifests carrying ownership/payout/provenance/receipt data, and CrabLink as the gateway-only browser UX. 


### END NOTE - MAY 2 2026 - 16:40 CST





### BEGIN NOTE - MAY 2 2026 - 18:00 CST

## Drop-in notes for `omnigate` and `ron-app-sdk`

### Session focus

This session focused on completing and proving the NEXT_LEVEL / WEB3_2 product-layer path for **named crab sites** and cleaning up `ron-app-sdk` enough that the product-layer verification gates are meaningful. The most important outcome is that a user-created site name such as:

```text
crab://thedustyonion
```

now resolves through Omnigate into a hydrated `omnigate.site-page.v1` response, and CrabLink can load and display that response in the browser-tab UI.

We deliberately **did not modify `ron-kernel`**. A full `ron-kernel` clippy cleanup should remain a separate, dedicated kernel-maintenance session because it is the core substrate and carries much higher risk than product-layer changes.

---

# `omnigate` notes

## What changed / what was accomplished

### 1. Named `crab://<site_name>` resolution now works

Before this session, the typed b3 asset resolver path worked for asset-style URLs such as:

```text
crab://<64hex>.image
```

and built-in product URLs such as:

```text
crab://site
crab://image
crab://music
crab://article
```

were understood as built-in pages, but a user-created named site URL like:

```text
crab://thedustyonion
```

was still falling through the asset parser and returning a missing/invalid asset-style response.

This session added the intended named-site fallback behavior:

```text
/crab/resolve?url=crab://thedustyonion
→ parse as not a built-in page
→ parse as not a typed b3 asset
→ safely treat as possible named site
→ route through existing site resolver
→ hydrate omnigate.site-page.v1
```

This preserves the correct split:

```text
crab://site
→ built-in site creation / launch page

crab://image
→ built-in image upload/mint page

crab://music
→ reserved built-in music page

crab://article
→ reserved built-in article page

crab://thedustyonion
→ user-created named site page

crab://<64 lowercase hex>.image
→ typed b3 image asset page
```

The canonical internal content IDs remain `b3:<64 lowercase hex>`. Human names remain optional pointers layered above content-addressed storage.

---

### 2. Site launch / site resolve flow was proven end-to-end

We manually created a local static HTML document:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>The Dusty Onion</title>
  </head>
  <body>
    <h1>The Dusty Onion</h1>
    <p>Hello from my first RustyOnions crab site.</p>
  </body>
</html>
```

Then stored it in `svc-storage`, producing this root document CID:

```text
b3:c0acf5c68296173b4b0b85612bfc30437b53a00b54e3100a5d613d2326a23b91
```

Then created the site through:

```text
POST http://127.0.0.1:8090/sites
```

The site creation returned:

```text
schema: omnigate.site-create.v1
site_name: thedustyonion
root_document_cid: b3:c0acf5...
manifest.status: stored
manifest_cid: b3:6ad6224cecacc448de14cdf91ce84cf87def5b0234af0041280864b76675aebd
index_pointer.status: stored
links.crab: crab://thedustyonion
links.resolve: /v1/sites/thedustyonion
```

Then direct site resolve worked:

```text
GET http://127.0.0.1:8090/sites/thedustyonion
```

and returned:

```text
schema: omnigate.site-page.v1
site_name: thedustyonion
manifest.status: present
manifest.hydration_status: hydrated
owner.passport_subject: passport:main:dev
owner.wallet_account: acct_dev
payout.default_action: site_visit
payout.recipient_account: acct_dev
metadata.title: The Dusty Onion
route_map["/"]: b3:c0acf5...
asset_map["index.html"]: b3:c0acf5...
receipts[0].receipt_kind: paid_site_launch
links.crab: crab://thedustyonion
```

Then named crab resolve also worked:

```text
GET http://127.0.0.1:8090/crab/resolve?url=crab://thedustyonion
```

and returned the same hydrated `omnigate.site-page.v1` shape.

This proves the named site path is now wired through Omnigate and usable by CrabLink.

---

### 3. New/updated Omnigate test coverage

The important new test target is:

```bash
cargo test -p omnigate --test named_site_crab_resolver
```

That test covers:

```text
crab_resolve_named_site_hydrates_site_page
crab_resolve_bare_b3_hash_still_requires_asset_kind
```

The second test is important because it proves we did **not** accidentally reinterpret bare 64-character b3 hashes as site names. A bare hash without a kind suffix still fails as missing an asset kind, preserving typed b3 asset semantics.

Existing route/product tests also remained green:

```bash
cargo test -p omnigate --test site_launch
cargo test -p omnigate --test asset_page_resolver
```

The final confirmed Omnigate product-layer gate passed:

```bash
cargo test -p omnigate --test named_site_crab_resolver
cargo test -p omnigate --test site_launch
cargo test -p omnigate --test asset_page_resolver
cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
```

The terminal log confirms the named-site resolver tests, site launch tests, asset page resolver tests, and Omnigate `--no-deps` clippy all passed. 

---

### 4. CrabLink live UX was proven against Omnigate

CrabLink was used to load:

```text
crab://thedustyonion
```

CrabLink successfully received a `200` response and displayed the hydrated `omnigate.site-page.v1` JSON. The UI currently labels it as a “Generic gateway response,” but the JSON clearly contains:

```text
schema: omnigate.site-page.v1
site_name: thedustyonion
root_document_cid: b3:c0acf5...
manifest.status: present
manifest.hydration_status: hydrated
owner
payout
metadata
route_map
asset_map
receipts
links
```

This means the backend route is working and CrabLink can reach it. The remaining work is better frontend rendering.

---

## Omnigate invariants preserved

No `ron-kernel` changes were made.

No direct ledger mutation was introduced.

No storage bytes are stored by Omnigate itself. Omnigate continues to coordinate through existing service boundaries.

No asset-name lookup was pushed into `svc-storage`. Storage remains content-addressed by CID.

Named sites are human pointers. The canonical root document is still a `b3:<64 lowercase hex>` CID.

Typed asset URLs still require asset kinds:

```text
crab://<64hex>.image
crab://<64hex>.article
crab://<64hex>.comment
```

Bare `crab://<64hex>` is not accepted as a complete asset URL.

Built-in product pages and user-created named sites stay separate:

```text
crab://site
```

is not the same thing as:

```text
crab://thedustyonion
```

---

## Omnigate work remaining

### 1. Better CrabLink rendering for `omnigate.site-page.v1`

Backend is working. The extension currently displays the JSON under a generic response panel. Next CrabLink/Omnigate-aligned UX should render site pages as first-class pages:

```text
Title
Description
Site name
Owner passport
Owner wallet
Payout/default action
Root document CID
Manifest CID
Route map
Asset map
Receipts
Open raw root document button
Copy crab URL
Copy manifest CID
Copy root CID
```

### 2. Full “view site content” path

We can resolve the site manifest and root document CID, but the UI should next fetch and display the actual root document bytes:

```text
root_document_cid
→ /o/<root_document_cid>
→ render index.html safely
```

This should be sandboxed/controlled. Do not execute arbitrary scripts in the extension page until a security model is defined. Start with static HTML/text rendering or a safe preview pane.

### 3. CrabLink Create Site UI

Currently site creation was proven by terminal `POST /sites`. Next product step is `crab://site` UI in CrabLink:

```text
crab://site
→ form for site name/title/description/root document
→ prepare request
→ wallet hold/cost preview
→ explicit confirm
→ POST /sites
→ show created crab://<site_name>
```

### 4. Real paid-site economics

The site create response includes a receipt-like `paid_site_launch` reference and wallet account metadata, but the long-term NEXT_LEVEL flow should keep tightening real wallet hold/capture integration:

```text
prepare
→ wallet hold
→ site create
→ hold capture
→ receipt committed
→ site manifest includes receipt refs
```

Do not bypass `svc-wallet` or mutate `ron-ledger` directly from Omnigate.

### 5. Expand product pages after site/image foundation

After `crab://site` and `crab://image` are strong, expand carefully:

```text
crab://article
crab://music
crab://post
crab://comment
```

Do not jump ahead into social/content feeds until the basic site/image ownership and payout flows are solid.

---

## How to prove Omnigate work

Use this product-layer gate:

```bash
cd /Users/mymac/Desktop/RustyOnions

cargo test -p omnigate --test named_site_crab_resolver
cargo test -p omnigate --test site_launch
cargo test -p omnigate --test asset_page_resolver
cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
```

Use this live proof after the local stack is running:

```bash
curl -sG 'http://127.0.0.1:8090/crab/resolve' \
  --data-urlencode 'url=crab://thedustyonion' | jq .
```

Expected proof fields:

```text
schema = omnigate.site-page.v1
site_name = thedustyonion
manifest.status = present
manifest.hydration_status = hydrated
links.crab = crab://thedustyonion
```

---

# `ron-app-sdk` notes

## Why this crate was touched

`ron-app-sdk` was not the main feature target, but it came up because the product-layer verification path included workspace/local crate checks, and `ron-app-sdk` still had placeholder scaffold tests such as `assert!(true)` and test assumptions that did not match the current `SdkConfig::validate()` behavior.

Instead of leaving fake tests in place, this session replaced them with real contract tests. This gives future work much better confidence around SDK invariants.

---

## What changed / what was accomplished

### 1. Placeholder tests were replaced with real tests

Several test files previously had scaffold tests that effectively did nothing:

```rust
assert!(true);
```

Those were replaced with meaningful integration/contract/property checks.

This was done across the SDK test suite, including:

```text
i_1_profile_parity.rs
i_2_caps_required.rs
i_3_oap_bounds.rs
i_4_content_addressing.rs
i_5_retries_deadlines.rs
i_6_dto_strictness.rs
i_7_transport_agnostic.rs
i_8_deadlines_everywhere.rs
i_9_error_taxonomy.rs
i_10_semver_snapshot.rs
i_11_no_persistence.rs
i_12_canon_deps.rs
interop_vectors.rs
prop_oap_frames.rs
prop_retry_bounds.rs
```

The final run confirms the SDK clippy gate and all SDK tests passed. 

---

### 2. Profile parity contract

`i_1_profile_parity.rs` now checks that Micronode-style and Macronode-style configurations share the same SDK semantics:

```text
same transport posture
same overall timeout
same connect/read/write timeouts
different gateway targets
both validate through check_ready()
```

A subtle issue was discovered: `SdkConfig::default()` does not currently validate under the SDK’s own timeout relationship rules because default `overall_timeout` is shorter than default read/write timeouts. The tests were corrected to use explicit valid configs when asserting readiness.

This is now a documented behavior/remaining design question rather than a hidden flaky test.

---

### 3. Capability-required contract

`i_2_caps_required.rs` now verifies that SDK storage calls require an explicit `Capability` argument at the function boundary.

It also checks that capability failures are non-retriable:

```text
SdkError::CapabilityDenied → RetryClass::NoRetry
SdkError::CapabilityExpired → RetryClass::NoRetry
```

Important limitation: this proves the SDK API surface requires a capability parameter. It does not yet prove the transport serializes capability material into wire headers. That remains future work.

---

### 4. OAP frame bound contract

`i_3_oap_bounds.rs` and `prop_oap_frames.rs` now verify OAP frame-size assumptions:

```text
OAP max frame = 1 MiB
normal stream chunk = 64 KiB
64 KiB chunks fit inside 1 MiB
one byte over max is detected as oversize
storage_put rejects payloads larger than OAP_MAX_FRAME_BYTES
```

This protects the SDK boundary against oversized client-side payload construction.

---

### 5. Content addressing contract

`i_4_content_addressing.rs` now spins up a small mock Axum gateway and verifies a real SDK storage round trip:

```text
storage_put(blob)
→ mock gateway stores blob by BLAKE3 b3 CID
→ SDK receives b3:<64 lowercase hex>
→ storage_get(cid)
→ SDK receives exact original bytes
```

The test verifies:

```text
b3: prefix
64 lowercase hex digest
digest equals BLAKE3(blob)
roundtrip bytes match original blob
```

This is important because content-addressing is a RustyOnions signature invariant.

---

### 6. Retry/deadline contract

`i_5_retries_deadlines.rs`, `i_8_deadlines_everywhere.rs`, and `prop_retry_bounds.rs` now verify:

```text
retry schedules are finite
retry delays are monotonic when jitter is disabled
retry delays do not exceed cap
explicit valid configs validate
invalid timeout relationships fail closed
zero per-call deadlines fail before transport
```

Important discovered behavior:

```text
SdkConfig::default()
```

currently has bounded fields, but does not necessarily satisfy the full validation relationship of:

```text
overall_timeout >= read timeout
overall_timeout >= write timeout
```

Tests were updated to use explicit valid configs for “valid config” assertions. Remaining design question: should `SdkConfig::default()` itself be changed later to always validate, or should defaults remain raw construction values that must be adjusted by callers?

No code change to default config was made in this session.

---

### 7. DTO strictness contract

`i_6_dto_strictness.rs` now verifies:

```text
AddrB3 accepts canonical b3:<64 lowercase hex>
AddrB3 rejects uppercase hex
AddrB3 rejects missing prefix
AddrB3 rejects short strings
Capability DTOs use explicit typed ron-proto Caveat values
```

The test was corrected to use real `ron_proto::cap::Caveat` variants instead of raw strings. This keeps DTO strictness aligned with canonical `ron-proto` capability types.

---

### 8. Transport agnosticism contract

`i_7_transport_agnostic.rs` now verifies TLS and Tor configs share public SDK semantics while preserving transport distinction:

```text
same gateway address
same overall timeout
same connect/read/write timeouts
different transport enum
Tor readiness exposes tor_ok = Some(true)
TLS readiness has no Tor-specific status
```

The test uses an explicit valid timeout config and explicit Tor SOCKS address:

```text
127.0.0.1:9050
```

This avoids incorrectly depending on invalid default timeout relationships.

---

### 9. Error taxonomy contract

`i_9_error_taxonomy.rs` now verifies deterministic retry classification:

Retriable:

```text
DeadlineExceeded
Transport(TimedOut)
RateLimited
Server(503)
```

Non-retriable:

```text
Tls
TorUnavailable
OapViolation
CapabilityExpired
CapabilityDenied
NotFound
Conflict
Server(404)
Unknown
SchemaViolation
```

This matters because SDK callers need stable retry behavior and should not blindly retry capability/security failures.

---

### 10. No-persistence contract

`i_11_no_persistence.rs` now verifies the SDK’s default posture remains memory-only / non-durable:

```text
cache disabled by default
cache has bounded capacity if enabled
cache has bounded TTL if enabled
no disk-path persistence knob is introduced
```

This supports amnesia-mode-friendly client behavior.

---

### 11. Canonical dependency contract

`i_12_canon_deps.rs` now checks the SDK manifest shape:

```text
ron-app-sdk depends on ron-proto for canonical DTOs
ron-app-sdk keeps thin HTTP client transport during this phase
ron-app-sdk remains rustls-oriented
ron-app-sdk does not directly depend on service crates
```

Forbidden direct service dependencies checked include:

```text
svc-gateway
omnigate
svc-storage
svc-index
svc-wallet
ron-ledger
```

This preserves modularity: the SDK should not become a backdoor into service internals.

---

### 12. Interop vectors

`interop_vectors.rs` now includes stable vectors for:

```text
canonical b3 content ID parsing
uppercase b3 rejection
retry taxonomy
retry config caps
opaque idempotency config shape
```

These are useful for future TypeScript/Go/Python SDK parity work.

---

### 13. Semver snapshot metadata

`i_10_semver_snapshot.rs` now checks that package metadata is available:

```text
CARGO_PKG_NAME = ron-app-sdk
CARGO_PKG_VERSION is non-empty
version is semver-like
```

This is a lightweight placeholder for later real public API snapshot/semver gates.

---

## ron-app-sdk invariants preserved

No service-specific logic was introduced into the SDK.

No direct dependency on Omnigate, svc-gateway, svc-storage, svc-index, svc-wallet, or ron-ledger was introduced.

No persistence layer was added.

No unsafe code was introduced.

Capability tests enforce explicit capability passing, but do not pretend capability serialization is complete.

Retry/error classification remains deterministic and low-cardinality.

Content IDs remain canonical lowercase `b3:<64hex>`.

---

## ron-app-sdk work remaining

### 1. Decide whether `SdkConfig::default()` should validate

The tests exposed a real design issue:

```text
SdkConfig::default()
```

currently has nonzero/bounded fields, but the full validation relationship may fail because default `overall_timeout` is shorter than read/write timeouts.

Future options:

```text
Option A: Change defaults so SdkConfig::default().validate() succeeds.
Option B: Keep defaults as loose construction defaults and require callers/tests to set explicit valid timeout profiles.
```

This session chose Option B for tests, because changing default config behavior might affect SDK users and should be a deliberate API decision.

### 2. Wire capability material into transport headers

Storage functions currently require a `Capability` argument, but deeper transport serialization remains future work.

Remaining desired flow:

```text
Capability
→ SDK transport header / OAP metadata
→ gateway/service validates capability
→ fail closed on missing/invalid capability
```

Do not fake this in tests. Add it when the SDK transport contract is ready.

### 3. Wire idempotency keys into transport headers

`storage_put` accepts an optional idempotency key, and the idempotency helper exists, but the wire mapping should be finalized later:

```text
IdempotencyKey
→ Idempotency-Key header or OAP metadata
→ service idempotency cache / replay-safe behavior
```

### 4. Expand SDK integration tests from mock gateway to local dev stack

Current content-addressing roundtrip uses a mock Axum gateway. Future tests can add an ignored/manual integration test against a live local stack:

```text
svc-storage
svc-gateway
omnigate
```

Keep this separate from normal unit tests so CI does not require a full stack.

### 5. Add TypeScript/CrabLink interop vectors later

Because CrabLink will become a primary consumer, add JSON fixture vectors for:

```text
AddrB3
Capability
IdempotencyKey
SdkError
RetryClass
ByteRange
Site page DTOs if they move into shared SDK/proto surfaces
```

---

## How to prove ron-app-sdk work

Run:

```bash
cd /Users/mymac/Desktop/RustyOnions

cargo fmt -p ron-app-sdk
cargo clippy -p ron-app-sdk --all-targets -- -D warnings
cargo test -p ron-app-sdk --tests
```

Expected result:

```text
cargo clippy passes
all ron-app-sdk unit tests pass
all ron-app-sdk integration tests pass
all ron-app-sdk property-style tests pass
```

The final uploaded terminal output confirms this gate passed. 

---

# Combined proof gate for this session

Use this as the “session accomplished” proof:

```bash
cd /Users/mymac/Desktop/RustyOnions

cargo fmt -p ron-app-sdk -p omnigate

cargo clippy -p ron-app-sdk --all-targets -- -D warnings
cargo test -p ron-app-sdk --tests

cargo test -p omnigate --test named_site_crab_resolver
cargo test -p omnigate --test site_launch
cargo test -p omnigate --test asset_page_resolver
cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
```

Do **not** use this as the product-layer gate yet:

```bash
cargo clippy -p omnigate --all-targets -- -D warnings
```

That checks path dependencies too and currently triggers `ron-kernel` pedantic lint cleanup. We intentionally deferred `ron-kernel` clippy cleanup for a future dedicated kernel-only session.

---

# Important carry-forward warning

Do not casually patch `ron-kernel` while working on NEXT_LEVEL / CrabLink product-layer features.

`ron-kernel` is the core substrate. Its full clippy cleanup should be done later as a dedicated session with:

```text
careful review
small focused batches
full tests
no behavior changes unless intentional
no product-layer logic added
```

For current NEXT_LEVEL work, the correct scoped clippy command is:

```bash
cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
```

---

# Recommended next work

The next work should move back to CrabLink and product UX, not kernel maintenance.

Recommended next batch:

```text
CrabLink site-page renderer
```

Goal:

```text
When user opens crab://thedustyonion,
CrabLink recognizes schema = omnigate.site-page.v1
and renders a real site page card instead of a generic JSON response.
```

Suggested rendering fields:

```text
Title: The Dusty Onion
Description
Site name
Root document CID
Manifest CID
Owner passport
Owner wallet
Payout recipient
Route map
Asset map
Receipts
Copy URL
Copy JSON
Open root document / preview index.html
```

Next after that:

```text
CrabLink crab://site Create Site UI
```

Goal:

```text
Use the extension to create a site instead of terminal curl.
```

Workflow:

```text
crab://site
→ form: site name, title, description, root document HTML/file
→ prepare/estimate
→ explicit confirmation
→ POST /sites
→ show crab://<site_name>
→ allow opening the created site
```

This session proved the backend path. The next session should make the browser UX feel real.


### BEGIN CRAB LINK AND NEXT LEVEL NOTES: 


# RustyOnions / CrabLink / NEXT_LEVEL Carryover Notes

## 0. Current checkpoint

We are continuing RustyOnions WEB3 / NEXT_LEVEL work with the focus now shifting back to **CrabLink product UX**.

The important checkpoint from this session:

```text
CrabLink can now open a real user-created named crab site:
crab://thedustyonion
```

The backend now supports the complete named-site flow:

```text
HTML bytes
→ svc-storage stores bytes by b3 CID
→ POST /sites creates site manifest
→ manifest stored by b3 CID
→ site-name pointer stored in index
→ GET /sites/thedustyonion hydrates site page
→ /crab/resolve?url=crab://thedustyonion hydrates the same site page
→ CrabLink opens and displays the hydrated response
```

This is a big milestone because it proves that `crab://<site_name>` is no longer just a concept. It is a live product-layer address that resolves through the RustyOnions stack and is visible in the CrabLink browser UI.

The latest proof logs show `ron-app-sdk` clippy and tests passing, plus Omnigate’s named-site, site-launch, asset-page tests, and `omnigate --no-deps` clippy passing. 

---

# 1. Major accomplishments this session

## 1.1 Omnigate named-site resolver completed

We fixed the key backend gap:

```text
crab://thedustyonion
```

Before this session, `/crab/resolve` mostly understood:

```text
crab://site
crab://image
crab://music
crab://article
crab://<64hex>.<kind>
```

But named sites like:

```text
crab://thedustyonion
```

were not resolving through the crab resolver cleanly.

Now the intended behavior is in place:

```text
/crab/resolve?url=crab://thedustyonion
→ not a built-in page
→ not a typed b3 asset
→ safely considered as a named site
→ routes into existing site resolver
→ returns omnigate.site-page.v1
```

This preserves the namespace split:

```text
crab://site
→ built-in site creation page

crab://image
→ built-in image creation/upload page

crab://music
→ reserved built-in music page

crab://article
→ reserved built-in article page

crab://thedustyonion
→ named user-created site

crab://<64 lowercase hex>.image
→ typed b3 image asset page
```

Important invariant preserved:

```text
Internal content IDs remain b3:<64 lowercase hex>.
Human names are optional pointers.
Storage still stores bytes by content ID only.
```

---

## 1.2 `thedustyonion` site was created live

We created a simple HTML document:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>The Dusty Onion</title>
  </head>
  <body>
    <h1>The Dusty Onion</h1>
    <p>Hello from my first RustyOnions crab site.</p>
  </body>
</html>
```

Then we stored it in `svc-storage`, receiving this root document CID:

```text
b3:c0acf5c68296173b4b0b85612bfc30437b53a00b54e3100a5d613d2326a23b91
```

Then we created the named site through:

```text
POST /sites
```

The successful response created:

```text
site_name: thedustyonion
root_document_cid: b3:c0acf5...
manifest_cid: b3:6ad6224cecacc448de14cdf91ce84cf87def5b0234af0041280864b76675aebd
links.crab: crab://thedustyonion
links.resolve: /v1/sites/thedustyonion
```

Then both direct site resolution and crab resolution worked:

```text
GET /sites/thedustyonion
GET /crab/resolve?url=crab://thedustyonion
```

Both returned:

```text
schema: omnigate.site-page.v1
site_name: thedustyonion
manifest.status: present
manifest.hydration_status: hydrated
owner.passport_subject: passport:main:dev
owner.wallet_account: acct_dev
payout.default_action: site_visit
payout.recipient_account: acct_dev
metadata.title: The Dusty Onion
route_map["/"]: b3:c0acf5...
asset_map["index.html"]: b3:c0acf5...
links.crab: crab://thedustyonion
```

This proves the named-site system works end-to-end.

---

## 1.3 CrabLink successfully loaded `crab://thedustyonion`

CrabLink was opened with:

```text
crab://thedustyonion
```

The browser-tab UI sent the resolve request, received HTTP `200`, and displayed the hydrated `omnigate.site-page.v1` JSON.

The screenshot showed:

```text
Input: crab://thedustyonion
Route: /sites/thedustyonion
Status: 200
Schema: omnigate.site-page.v1
Site name: thedustyonion
Root document CID: b3:c0acf5...
Manifest: present / hydrated
Owner: passport:main:dev / acct_dev
Payout: site_visit / acct_dev
```

The UI currently says “Generic gateway response,” which is fine for the current proof. The next UX step is to render `omnigate.site-page.v1` as a first-class site page rather than only showing the developer JSON.

---

## 1.4 Omnigate product-layer tests are green

The important product-layer gate passed:

```bash
cargo test -p omnigate --test named_site_crab_resolver
cargo test -p omnigate --test site_launch
cargo test -p omnigate --test asset_page_resolver
cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
```

Confirmed passing tests:

```text
named_site_crab_resolver:
  crab_resolve_named_site_hydrates_site_page
  crab_resolve_bare_b3_hash_still_requires_asset_kind

site_launch:
  site_prepare_returns_wallet_hold_template
  site_resolve_hydrates_manifest_from_index_and_storage
  site_create_stores_manifest_and_index_pointer
  site_prepare_rejects_bad_site_name
  site_prepare_maps_storage_estimate_errors

asset_page_resolver:
  15 tests passed
```

This proves the Omnigate product-layer work is stable under scoped checks.

Important command nuance:

```bash
cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
```

is the correct product-layer clippy gate for now.

Do **not** use this as the ordinary product-layer gate yet:

```bash
cargo clippy -p omnigate --all-targets -- -D warnings
```

because that pulls in strict `ron-kernel` clippy lints and turns kernel cleanup into a blocker. `ron-kernel` should be handled later in its own dedicated session.

---

## 1.5 `ron-app-sdk` cleanup completed

The SDK was not the main NEXT_LEVEL feature target, but we cleaned it up because placeholder tests and bad assumptions were getting in the way of clean product-layer verification.

The final SDK gate passed:

```bash
cargo clippy -p ron-app-sdk --all-targets -- -D warnings
cargo test -p ron-app-sdk --tests
```

The test suite now has real checks instead of placeholder `assert!(true)` tests.

Important SDK test areas now covered:

```text
i_1_profile_parity
i_2_caps_required
i_3_oap_bounds
i_4_content_addressing
i_5_retries_deadlines
i_6_dto_strictness
i_7_transport_agnostic
i_8_deadlines_everywhere
i_9_error_taxonomy
i_10_semver_snapshot
i_11_no_persistence
i_12_canon_deps
interop_vectors
prop_oap_frames
prop_retry_bounds
```

The final terminal output shows the SDK unit tests, integration tests, interop vectors, and property-style tests all passing. 

---

# 2. What changed conceptually

## 2.1 Named sites are now a real product object

We now have three distinct crab URL categories:

```text
Built-in product pages:
  crab://site
  crab://image
  crab://music
  crab://article

Named human site pointers:
  crab://thedustyonion
  crab://sealobsta
  crab://example-site

Typed b3 asset pages:
  crab://<64hex>.image
  crab://<64hex>.video
  crab://<64hex>.article
  crab://<64hex>.post
  crab://<64hex>.comment
```

This is important because CrabLink can now behave like a real browser tab:

```text
User types crab://thedustyonion
→ browser resolves it
→ browser renders the site-page response
```

---

## 2.2 `crab://site` is not a site; it is the site-creation page

This distinction must be preserved:

```text
crab://site
```

means:

```text
Open built-in RustyOnions site creation / registration workflow.
```

But:

```text
crab://thedustyonion
```

means:

```text
Open the user-created named site called thedustyonion.
```

Same for:

```text
crab://image
```

That should open the built-in image upload/mint workflow, not a user image.

---

## 2.3 `ron-kernel` intentionally stayed untouched

We paused and made the correct architectural decision:

```text
Do not casually patch ron-kernel during product-layer work.
```

`ron-kernel` is the core substrate. Clippy cleanup there is valid work, but it should be isolated later as:

```text
Dedicated ron-kernel maintenance session
→ small batches
→ full tests
→ no product logic
→ no opportunistic behavior changes
```

For current NEXT_LEVEL and CrabLink work, stay focused on:

```text
omnigate
svc-gateway
svc-index
ron-naming
svc-storage
svc-wallet
ron-app-sdk only when SDK/client boundary matters
crablink extension
```

---

# 3. Current RustyOnions proof commands

## 3.1 SDK proof

Run:

```bash
cd /Users/mymac/Desktop/RustyOnions

cargo fmt -p ron-app-sdk
cargo clippy -p ron-app-sdk --all-targets -- -D warnings
cargo test -p ron-app-sdk --tests
```

Expected:

```text
clippy passes
32 unit tests pass
all integration/scaffold/property tests pass
```

This was proven in the latest run. 

---

## 3.2 Omnigate product-layer proof

Run:

```bash
cd /Users/mymac/Desktop/RustyOnions

cargo test -p omnigate --test named_site_crab_resolver
cargo test -p omnigate --test site_launch
cargo test -p omnigate --test asset_page_resolver
cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
```

Expected:

```text
named_site_crab_resolver: 2 passed
site_launch: 5 passed
asset_page_resolver: 15 passed
omnigate --no-deps clippy: clean
```

This was proven in the latest run. 

---

## 3.3 Live named-site proof

Start the RustyOnions / CrabLink dev stack:

```bash
cd /Users/mymac/Desktop/RustyOnions
scripts/web3_crablink_dev_stack.sh
```

Then resolve:

```bash
curl -sG 'http://127.0.0.1:8090/crab/resolve' \
  --data-urlencode 'url=crab://thedustyonion' | jq .
```

Expected:

```text
schema: omnigate.site-page.v1
site_name: thedustyonion
manifest.status: present
manifest.hydration_status: hydrated
links.crab: crab://thedustyonion
```

In CrabLink, type:

```text
crab://thedustyonion
```

Expected:

```text
Status 200
schema = omnigate.site-page.v1
developer JSON shows hydrated site metadata
```

---

# 4. Current CrabLink state

## 4.1 CrabLink repo and product identity

Repo:

```text
crablink
```

GitHub:

```text
https://github.com/Y3LLOWVESTS/crablink.git
```

Product naming:

```text
Full future browser: CrabLink
Chrome extension: CrabLink Extension
```

CrabLink is separate from RustyOnions core. This is the correct architecture. RustyOnions is the backend/substrate/value-plane repo; CrabLink is the browser-client repo.

Existing CrabLink notes define it as a thin gateway-only browser client, not a wallet, ledger, storage service, index service, or backend service. 

---

## 4.2 Current UX capabilities

CrabLink currently has a browser-tab style UI with:

```text
back / forward controls
home button
address bar
Go button
refresh button
ROC balance display
Passport button
settings gear
quick buttons:
  crab://site
  crab://image
  crab://music
  crab://article
result card
developer JSON panel
copy URL
copy JSON
```

Live proof:

```text
crab://thedustyonion
```

loads successfully and displays backend JSON.

Current weakness:

```text
It displays omnigate.site-page.v1 as a generic gateway response.
```

Next UX step:

```text
Add first-class rendering for schema = omnigate.site-page.v1.
```

---

# 5. Next session primary objective

The next session should focus on:

```text
CrabLink site-page renderer
```

Goal:

```text
When user opens crab://thedustyonion,
CrabLink recognizes schema = omnigate.site-page.v1
and renders it as a real site page, not a generic JSON response.
```

Suggested first-class UI fields:

```text
Title
Description
Site name
Root document CID
Manifest CID
Owner passport
Owner wallet
Payout recipient
Payout action
Route map
Asset map
Receipts
Open root document / preview content
Copy crab URL
Copy root CID
Copy manifest CID
Copy JSON
```

The result card should use the manifest metadata:

```text
metadata.title = The Dusty Onion
metadata.description = My first RustyOnions crab site.
```

instead of only showing:

```text
crab://thedustyonion
Generic gateway response
```

---

# 6. Next CrabLink implementation plan

## 6.1 Add schema-based rendering

CrabLink should route result rendering by response schema.

Recommended renderer table:

```text
omnigate.site-page.v1
→ renderSitePage()

omnigate.asset-page.v1
→ renderAssetPage()

omnigate.builtin-page.v1
→ renderBuiltinPage()

problem/error schema or code/message/reason
→ renderProblem()

unknown schema
→ renderGenericGatewayResponse()
```

This preserves fallback behavior while making site pages feel real.

---

## 6.2 Site page renderer behavior

For:

```json
{
  "schema": "omnigate.site-page.v1",
  "site_name": "thedustyonion",
  "metadata": {
    "title": "The Dusty Onion",
    "description": "My first RustyOnions crab site."
  }
}
```

render:

```text
SITE
The Dusty Onion
My first RustyOnions crab site.

crab://thedustyonion

Site name: thedustyonion
Root document: b3:c0acf5...
Manifest: b3:6ad622...
Owner: passport:main:dev
Wallet: acct_dev
Payout: site_visit → acct_dev
```

Route map section:

```text
Routes
/ → b3:c0acf5...
```

Asset map section:

```text
Assets
index.html → b3:c0acf5...
```

Receipt section:

```text
Receipts
paid_site_launch
tx_id: manual-site-create-1
account: acct_dev
```

Warnings section only if `warnings.length > 0`.

Developer JSON should remain available and collapsible.

---

## 6.3 Root document preview

After the site page renderer works, add a button:

```text
Open Root Document
```

Possible first version:

```text
GET /o/<root_document_cid>
display as escaped text or safe static HTML preview
```

Security rule:

```text
Do not execute arbitrary scripts from site HTML inside the extension.
```

Start with safe preview:

```text
- Plain text view, or
- sandboxed iframe with scripts disabled, or
- escaped HTML preview
```

Do not add full script execution yet.

---

## 6.4 Built-in page renderer

`crab://site` should show a product workflow page, not generic JSON.

The built-in page response shape is already established in earlier notes:

```text
schema: omnigate.builtin-page.v1
url
page_kind
status
title
description
requires_passport
requires_wallet
actions[]
fields[]
warnings[]
```

For:

```text
crab://site
```

render:

```text
Create a RON Site
Register a name and launch a manifest-backed RustyOnions site.

Fields:
- Site name
- Title
- Description

Actions:
- Prepare site launch
- Create site
```

For the next session, full mutation may be deferred. The first improvement can be visual rendering only.

---

## 6.5 Create-site UI is the next major feature after site rendering

After site-page rendering:

```text
crab://site
→ Create Site form
```

Desired flow:

```text
User opens crab://site
→ form appears
→ user enters site name/title/description
→ user provides root document content or file
→ extension stores root document through backend route
→ prepare estimate / hold preview
→ user explicitly confirms
→ POST /sites
→ extension shows created crab://<site_name>
→ user clicks Open
```

Important: if backend currently requires root document CID to already exist, the extension will need either:

```text
Option A: call a public gateway upload route to store bytes and get CID
Option B: use an existing upload path through svc-gateway
Option C: add a proper public route for site root document upload
```

Do not have CrabLink call `svc-storage` directly unless the architecture explicitly changes. The preferred boundary is gateway-only.

Existing CrabLink notes emphasize that the extension should remain gateway-only and should not call internal services directly. 

---

# 7. Backend work likely needed soon

## 7.1 Public upload path for site root documents

Manual site creation used:

```text
svc-storage directly at http://127.0.0.1:5303/o
```

That was okay for a terminal proof, but CrabLink should not call `svc-storage` directly.

NEXT_LEVEL-friendly options:

```text
POST /o
POST /assets/raw
POST /sites/root-document
POST /sites/upload-root
```

through `svc-gateway` / Omnigate path.

The route should:

```text
accept bytes
store bytes by b3 CID
return b3:<64hex>
possibly enforce paid storage or prepare/hold policy later
```

Do not put storage logic in CrabLink.

Do not bypass paid-use enforcement once paid storage is required.

---

## 7.2 Create-site full paid path

Current manual `POST /sites` accepted a wallet hold txid:

```text
x-ron-wallet-hold-txid: manual-site-create-1
```

The complete product flow should become:

```text
POST /sites/prepare
→ returns estimate and wallet hold template

wallet hold through svc-wallet
→ returns hold txid

POST /sites
→ consumes hold txid
→ creates site manifest
→ stores pointer
→ captures hold
→ writes receipt
```

Current proof is acceptable for dev, but the mature flow must make wallet/ledger receipts real and deterministic.

---

## 7.3 Site delete/update later

Not next priority, but eventually needed:

```text
PUT /sites/:name
PATCH /sites/:name
DELETE /sites/:name
```

These must be capability-gated and wallet/policy-aware.

Do not add too early. Finish create/open/render first.

---

# 8. CrabLink files likely touched next

Likely files in the CrabLink repo:

```text
extensions/chrome/src/popup.js
extensions/chrome/src/popup.html
extensions/chrome/src/styles.css
extensions/chrome/src/ronClient.js
extensions/chrome/src/crab.js
extensions/chrome/src/storage.js
extensions/chrome/test/manual-checklist.md
extensions/chrome/docs/BLUEPRINT.md
shared/fixtures/site-page.sample.json
shared/schemas/site-page.schema.json
```

Possible new files:

```text
extensions/chrome/src/renderers.js
extensions/chrome/src/sitePage.js
extensions/chrome/src/builtinPage.js
extensions/chrome/src/assetPage.js
```

But avoid over-splitting unless the current extension code is getting hard to manage.

Preferred next batch shape:

```text
1. Add schema dispatch function in popup.js.
2. Add renderSitePage(result) function.
3. Add site-page card CSS.
4. Keep Developer JSON unchanged.
5. Do not add create-site mutation in the same batch unless context is still manageable.
```

---

# 9. Important current constraints and invariants

## 9.1 CrabLink must remain a thin client

CrabLink should not become a backend.

Do not add:

```text
ledger logic
wallet accounting truth
storage internals
index internals
reward calculation
policy calculation truth
private settlement logic
```

CrabLink displays backend-derived truth and submits user-approved actions.

---

## 9.2 No silent ROC spending

Paid actions must require explicit user confirmation.

CrabLink must not silently:

```text
hold ROC
capture ROC
release held ROC
issue ROC
burn ROC
transfer ROC
```

All real mutations must go through backend wallet/ledger surfaces.

---

## 9.3 Integer money only

If CrabLink displays ROC, truth must come from integer minor units.

UI may format:

```text
1751 ROC
```

but backend truth should remain:

```text
available_minor_units
held_minor_units
```

Do not use floating-point math for monetary truth.

---

## 9.4 Gateway-only boundary

CrabLink should call the public gateway surface, not internal services.

Avoid direct calls to:

```text
svc-storage
svc-index
svc-wallet
svc-passport
ron-ledger
ron-accounting
svc-rewarder
```

Preferred:

```text
CrabLink
→ svc-gateway public route
→ gateway/omnigate/internal service boundary
```

---

## 9.5 `ron-kernel` is off-limits for product work

Do not touch `ron-kernel` in the next CrabLink/NEXT_LEVEL feature session.

Carry this warning forward:

```text
ron-kernel clippy cleanup is real work, but it needs a dedicated kernel-only session.
```

Current product gate:

```bash
cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
```

Not:

```bash
cargo clippy -p omnigate --all-targets -- -D warnings
```

---

# 10. Current known issue: SDK default config semantics

During SDK cleanup, we discovered:

```text
SdkConfig::default()
```

may not satisfy:

```text
overall_timeout >= read timeout
overall_timeout >= write timeout
```

Tests were updated to use explicit valid configs instead of assuming defaults validate.

Future design decision:

```text
Should SdkConfig::default().validate() pass?
```

Options:

```text
Option A:
Change SDK defaults so default config validates.

Option B:
Keep current defaults as raw constructor defaults and require callers/tests to choose a valid profile.
```

We did not change SDK default behavior in this session.

---

# 11. Current known issue: CrabLink generic site rendering

CrabLink successfully loads `crab://thedustyonion`, but the result card says:

```text
Generic gateway response. See Developer JSON for full details.
```

Next UX goal:

```text
schema-aware rendering for omnigate.site-page.v1
```

This is the best next session starting point.

---

# 12. Current known issue: Manual site creation still requires terminal flow

Currently, creating a named site was done with terminal commands.

Manual proof used:

```text
POST storage bytes to svc-storage
POST /sites through gateway
```

CrabLink does not yet have a polished site creation flow.

Next after rendering:

```text
Implement crab://site Create Site UI
```

But do not mix too much into one batch. First make `crab://thedustyonion` look beautiful.

---

# 13. Recommended next session order

## Step 1: Update project files

Before starting code, regenerate or upload current references:

```bash
cd /Users/mymac/Desktop/RustyOnions

scripts/make_codebundle.sh
scripts/collect_notes.sh
scripts/collect_alldocs.sh
```

For CrabLink repo, regenerate the extension codebundle too:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
```

Use whatever actual script names exist in the current CrabLink repo. Earlier notes indicate the codebundle script may be `scripts/make_codebundle.sh`. 

---

## Step 2: Run current proof gates

RustyOnions:

```bash
cd /Users/mymac/Desktop/RustyOnions

cargo clippy -p ron-app-sdk --all-targets -- -D warnings
cargo test -p ron-app-sdk --tests

cargo test -p omnigate --test named_site_crab_resolver
cargo test -p omnigate --test site_launch
cargo test -p omnigate --test asset_page_resolver
cargo clippy -p omnigate --all-targets --no-deps -- -D warnings
```

CrabLink:

```bash
cd /Users/mymac/Desktop/crablink

scripts/check-chrome.sh
scripts/package-chrome.sh
```

---

## Step 3: Implement CrabLink site-page renderer

Target:

```text
schema = omnigate.site-page.v1
```

Add rendering for:

```text
title
description
site_name
root_document_cid
manifest_cid
owner
payout
route_map
asset_map
receipts
warnings
```

Do not remove Developer JSON.

---

## Step 4: Test in live UI

Start stack:

```bash
cd /Users/mymac/Desktop/RustyOnions
scripts/web3_crablink_dev_stack.sh
```

Open CrabLink and type:

```text
crab://thedustyonion
```

Expected:

```text
A first-class site page card appears.
Developer JSON remains available.
No backend errors.
Status 200.
```

---

## Step 5: Only after rendering works, design create-site UI

Then move to:

```text
crab://site
```

Goal:

```text
Create site from CrabLink instead of terminal curl.
```

But this should probably be a separate batch after site rendering.

---

# 14. Suggested acceptance gates for next CrabLink batch

A next CrabLink site-renderer batch should be accepted only when:

```text
scripts/check-chrome.sh passes
scripts/package-chrome.sh passes
CrabLink opens normally
crab://thedustyonion returns status 200
CrabLink recognizes omnigate.site-page.v1
CrabLink displays title as "The Dusty Onion"
CrabLink displays description
CrabLink displays root_document_cid
CrabLink displays manifest_cid
CrabLink displays owner wallet/passport
CrabLink displays payout action/account
CrabLink keeps Developer JSON available
No silent wallet mutation occurs
No direct internal service call is added
```

Optional additional proof:

```bash
curl -sG 'http://127.0.0.1:8090/crab/resolve' \
  --data-urlencode 'url=crab://thedustyonion' | jq .
```

---

# 15. Recommended note for future AI instance

Start the next session with this framing:

```text
We are continuing NEXT_LEVEL.MD product-layer work.

Do not touch ron-kernel.

Current backend proof is green:
- ron-app-sdk clippy/tests pass.
- omnigate named_site_crab_resolver/site_launch/asset_page_resolver pass.
- omnigate --no-deps clippy passes.
- crab://thedustyonion resolves live through /crab/resolve to omnigate.site-page.v1.
- CrabLink can load crab://thedustyonion, but currently renders it as a generic gateway response.

Next task:
Implement CrabLink schema-aware rendering for omnigate.site-page.v1 so named crab sites look like real pages in the extension UI.
```

---

# 16. Do not forget

The most important success from this session is not just “tests passed.”

The real product success is:

```text
A user-created human-readable crab site exists:
crab://thedustyonion
```

and it resolves to a manifest-backed, owner/payout-aware, b3-rooted site page.

That is exactly the NEXT_LEVEL direction:

```text
hash-first ownership
manifest-backed asset/site pages
passport/wallet metadata
payout hooks
CrabLink browser UX
internal ROC economy foundation
```

Next session should make that success visible and polished in CrabLink.



### END NOTE - MAY 2 2026 - 18:00 CST



### BEGIN NOTE - MAY 3 2026 - 11:45 CST

Below are comprehensive carryover notes for the next instance.

---

# RustyOnions / CrabLink NEXT_LEVEL Carryover Notes

## High-level session result

This session produced a major product-proof milestone:

```text
We created and resolved the first named RON site:

crab://thedustyonion
```

It now resolves inside CrabLink as a real RON site page backed by:

```text
root document CID:
b3:192602366a47455bf4c3353222176d41b33dfd92dea87e62665ee60723578f45

site manifest CID:
b3:d080f3c519154fbd09d0821f8f5de942469a202d85eb33934b90147b71947f62

site name:
thedustyonion

owner:
passport:main:dev / acct_dev

payout action:
site_visit

payout account:
acct_dev

receipt kind:
paid_site_launch
```

The site resolves through:

```text
crab://thedustyonion
→ svc-gateway /crab/resolve
→ omnigate named-site resolver
→ svc-index site manifest pointer
→ svc-storage manifest object
→ hydrated omnigate.site-page.v1
→ CrabLink rendered site metadata page
```

This is a real NEXT_LEVEL milestone: the system now has a working named `crab://` site page rendered in the CrabLink Chrome extension.

---

# Scope of work completed this session

## Code changes were mostly CrabLink-only

No Rust crate source files were modified in this session.

The code changes and paste-ready file batches were focused on the separate CrabLink Chrome extension repo.

RustyOnions backend crates were used, started, configured, tested, and proven, but their source code was not edited.

### CrabLink files worked on

Files patched or discussed during this session:

```text
extensions/chrome/src/page.js
extensions/chrome/src/page.html
extensions/chrome/src/page.css
extensions/chrome/src/page-dom.js
extensions/chrome/src/page-constants.js
extensions/chrome/src/storage.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/page-workflow.js
scripts/check-chrome.sh
```

### RustyOnions files/configs touched or discussed

```text
configs/roc-economics.dev.toml
```

This was not crate source. It was beta/dev economics configuration.

---

# Backend crates involved in proof, but not modified

These crates were exercised and validated by the session:

```text
svc-wallet
ron-ledger
svc-storage
svc-index
omnigate
svc-gateway
ron-policy
```

Their roles in the proof:

```text
svc-wallet:
Confirmed ledger-backed ROC balance through gateway.

ron-ledger:
Underlying durable wallet truth source behind svc-wallet.

svc-storage:
Stored the root HTML document by canonical b3 CID.
Stored the generated site manifest object.

svc-index:
Stored the named site manifest pointer for thedustyonion.

omnigate:
Handled site creation and hydrated site-page DTO rendering.

svc-gateway:
Exposed the product-facing routes:
- /wallet/acct_dev/balance
- /sites
- /sites/thedustyonion
- /crab/resolve?url=crab://thedustyonion
- /b3/<hash>.image style asset pages

ron-policy:
Economics config was involved in paid prepare estimates.
```

---

# Important architectural context

The active blueprint direction remains:

```text
NEXT_LEVEL.MD
WEB3.MD
WEB3_2.MD
TODO_WEB3_2.MD
```

RON_CORE remains important as substrate reference, but WEB3 / WEB3_2 / NEXT_LEVEL are the active product-layer north stars.

Key invariants preserved this session:

```text
No direct ledger mutation from CrabLink.
No direct ledger mutation from svc-gateway/omnigate/storage/index.
svc-wallet remains the wallet mutation front door.
ron-ledger remains the durable economic truth.
CrabLink is gateway-only.
CrabLink stores display/cache state only.
CrabLink must not treat display-only wallet fallback as spend authority.
ROC remains internal; no ROX/Solana/bridge/external settlement.
Integer-only ROC math.
b3:<64 lowercase hex> remains canonical content ID.
Public user-facing crab asset/site links use crab://<name> or crab://<hash>.<kind>.
```

---

# Major accomplishments

## 1. CrabLink full-tab rendering was improved

CrabLink can now render more than generic JSON responses.

It now recognizes and renders:

```text
omnigate.builtin-page.v1
omnigate.asset-page.v1
omnigate.site-page.v1
```

Important result:

```text
crab://thedustyonion now renders as a site page in CrabLink.
```

The site page shows:

```text
site badge
title
description
crab URL
site name
root document CID
manifest CID
manifest status
owner passport
owner wallet
payout action
payout account
route count
asset count
receipt count
site-page cards
ownership card
payout card
manifest card
metadata card
route map card
asset map card
receipts card
developer JSON
```

This is a big UX step because CrabLink is now becoming a real browser surface rather than a JSON viewer.

---

## 2. CrabLink named-site resolver behavior was corrected

Earlier behavior sent named sites directly to:

```text
/sites/:name
```

A patch changed the logic so named sites prefer:

```text
/crab/resolve?url=crab://<site_name>
```

and fall back to:

```text
/sites/:name
```

only when appropriate.

This matters because the canonical public UX should be:

```text
crab://thedustyonion
```

not a direct internal-looking route.

---

## 3. Wallet fallback bug was diagnosed correctly

At one point CrabLink showed:

```text
0 ROC
display-only
source: omnigate_dev_wallet_view.v1
ledger_backed: false
```

This was initially concerning, but the real cause was:

```text
svc-wallet was not running / not reachable through the dev stack.
```

The gateway correctly returned a safe display-only fallback:

```json
{
  "ledger_backed": false,
  "source": "omnigate_dev_wallet_view.v1",
  "warnings": [
    "display-only dev fallback",
    "real balance must come from svc-wallet and ron-ledger",
    "do not treat this route as spend authority"
  ]
}
```

After starting `svc-wallet`, the true wallet route returned:

```json
{
  "schema": "crablink.wallet.balance.v1",
  "account": "acct_dev",
  "unit": "ROC",
  "available_minor_units": "1776",
  "held_minor_units": "0",
  "display": "1776 ROC",
  "ledger_backed": true,
  "source": "svc_wallet.v1",
  "warnings": []
}
```

Conclusion:

```text
No wallet funds were lost.
The earlier 0 ROC was only display-only fallback.
```

A CrabLink storage guard was added/discussed so that a display-only fallback should not overwrite a known ledger-backed balance in local extension state.

---

## 4. Correct stack startup order was established

Best practice going forward:

Terminal A:

```bash
cd /Users/mymac/Desktop/RustyOnions
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

Terminal B:

```bash
cd /Users/mymac/Desktop/RustyOnions
ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
OMNIGATE_WALLET_BEARER=dev \
RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
scripts/web3_crablink_dev_stack.sh
```

Starting `svc-wallet` after the stack can work only if the stack was already started with the wallet upstream env vars. Preferred order is still wallet first, then stack.

Quick wallet proof command:

```bash
curl -s http://127.0.0.1:8090/wallet/acct_dev/balance \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' | jq .
```

Required proof shape:

```text
ledger_backed: true
source: svc_wallet.v1
warnings: []
```

---

## 5. Cheap beta ROC economics were discussed and merged

Problem encountered:

```text
CrabLink site prepare showed 1,024 ROC.
```

That was too high for beta testing. User requested:

```text
Everything should be cheap for beta testing, no more than 50 ROC moving forward.
```

The existing `configs/roc-economics.dev.toml` was better than replacing it wholesale because it preserved the `curator` role and curator split for `paid_song_play`.

Recommended merged config keeps existing action structure but lowers caps:

```text
default_daily_spend_cap_minor = 1776
default_single_action_cap_minor = 50
anonymous_daily_spend_cap_minor = 250
```

Action prices/caps:

```text
paid_storage_put:
price_minor = 25
minimum_charge_minor = 25
max_spend_minor = 50

paid_storage_pin:
price_minor = 3
minimum_charge_minor = 3
max_spend_minor = 50

paid_content_view:
price_minor = 5
minimum_charge_minor = 5
max_spend_minor = 50

paid_song_play:
price_minor = 8
minimum_charge_minor = 8
max_spend_minor = 50

site_visit:
price_minor = 2
minimum_charge_minor = 2
max_spend_minor = 50
```

The user should keep the current fuller config shape and only adjust caps/prices as needed.

If prepare still shows `1,024`, the issue is not the config file content; it means the running stack did not pick up:

```text
RON_STORAGE_ROC_ECONOMICS_PATH
```

---

## 6. Root document CID concept was clarified

A major distinction was established:

```text
Typed asset page route /b3/<hash>.image can return an asset-page DTO
even when raw storage object and manifest are missing.
```

This is why CrabLink showed an asset page for:

```text
b3:c0acf5c68296173b4b0b85612bfc30437b53a00b54e3100a5d613d2326a23b91
```

but warned:

```text
storage_object_missing
manifest_pointer_missing
```

The real proof that a root document exists is:

```text
GET /o/<b3 CID>
```

The old root CID returned `404`, so it was not a valid stored object in the current running stack.

---

## 7. A real root HTML document was stored in svc-storage

A real HTML root document was created:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>The Dusty Onion</title>
  </head>
  <body>
    <h1>The Dusty Onion</h1>
    <p>This is a RustyOnions root document stored by b3 CID.</p>
  </body>
</html>
```

It was uploaded directly to `svc-storage`:

```bash
ROOT_CID=$(curl -sS -X PUT --data-binary @artifacts/crablink-manual/root-index.html \
  http://127.0.0.1:5303/o | jq -r '.cid')
```

Result:

```text
b3:192602366a47455bf4c3353222176d41b33dfd92dea87e62665ee60723578f45
```

Proof:

```bash
curl -i "http://127.0.0.1:5303/o/$ROOT_CID" | head -n 20
```

Returned:

```text
HTTP/1.1 200 OK
content-type: application/octet-stream
etag: "192602366a47455bf4c3353222176d41b33dfd92dea87e62665ee60723578f45"
content-length: 225
```

Then body returned the expected HTML.

Conclusion:

```text
The root document CID is valid and stored.
```

---

## 8. CrabLink paid prepare/hold path worked

The CrabLink UI successfully performed the paid prepare and wallet hold path for site creation.

Wallet before:

```text
1776 ROC
```

Wallet after:

```text
1751 ROC
```

Final wallet proof:

```json
{
  "schema": "crablink.wallet.balance.v1",
  "account": "acct_dev",
  "unit": "ROC",
  "available_minor_units": "1751",
  "held_minor_units": "0",
  "display": "1751 ROC",
  "ledger_backed": true,
  "source": "svc_wallet.v1",
  "warnings": []
}
```

This proves:

```text
CrabLink → gateway → svc-wallet → ron-ledger paid wallet path is working.
```

Important nuance:

```text
The wallet paid/hold path succeeded.
The site pointer creation did not happen through CrabLink UI yet.
```

---

## 9. Manual POST /sites proved backend site creation

Because CrabLink did not actually create the site pointer after the hold, we manually created the site pointer with curl.

Manual create request used:

```text
SITE_NAME="thedustyonion"
ROOT_CID="b3:192602366a47455bf4c3353222176d41b33dfd92dea87e62665ee60723578f45"
```

Manual POST:

```bash
curl -s -X POST "http://127.0.0.1:8090/sites" \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: crablink-manual-site-create-1' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' \
  -H 'x-ron-wallet-hold-txid: crablink-manual-site-hold-1' \
  -d "{
    \"site_name\": \"$SITE_NAME\",
    \"root_document_cid\": \"$ROOT_CID\",
    \"owner_passport_subject\": \"passport:main:dev\",
    \"owner_wallet_account\": \"acct_dev\",
    \"title\": \"The Dusty Onion\",
    \"description\": \"A test RustyOnions site launched from CrabLink.\",
    \"route_map\": {
      \"/\": \"$ROOT_CID\"
    },
    \"asset_map\": {
      \"index.html\": \"$ROOT_CID\"
    }
  }" | jq .
```

Successful response:

```json
{
  "schema": "omnigate.site-create.v1",
  "site_name": "thedustyonion",
  "root_document_cid": "b3:192602366a47455bf4c3353222176d41b33dfd92dea87e62665ee60723578f45",
  "manifest": {
    "status": "stored",
    "manifest_cid": "b3:d080f3c519154fbd09d0821f8f5de942469a202d85eb33934b90147b71947f62",
    "storage_path": "/o"
  },
  "index_pointer": {
    "status": "stored",
    "route": "/v1/index/sites/thedustyonion/manifest",
    "http_status": 202
  },
  "owner": {
    "passport_subject": "passport:main:dev",
    "wallet_account": "acct_dev"
  },
  "payout": {
    "default_action": "site_visit",
    "recipient_account": "acct_dev"
  },
  "links": {
    "crab": "crab://thedustyonion",
    "resolve": "/v1/sites/thedustyonion",
    "manifest_raw": "/o/b3:d080f3c519154fbd09d0821f8f5de942469a202d85eb33934b90147b71947f62"
  },
  "warnings": []
}
```

Conclusion:

```text
The backend POST /sites path works.
The failure was CrabLink UI not completing POST /sites.
```

---

## 10. Site resolution was proven through both backend routes

After manual creation, this worked:

```bash
curl -s "http://127.0.0.1:8090/sites/$SITE_NAME" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' | jq .
```

Returned:

```text
schema: omnigate.site-page.v1
site_name: thedustyonion
root_document_cid: b3:192602...
manifest.status: present
manifest.hydration_status: hydrated
owner: passport:main:dev / acct_dev
payout.default_action: site_visit
payout.recipient_account: acct_dev
route_map: { "/": root CID }
asset_map: { "index.html": root CID }
receipts: paid_site_launch
links.crab: crab://thedustyonion
warnings: []
```

Also worked:

```bash
curl -sG "http://127.0.0.1:8090/crab/resolve" \
  --data-urlencode "url=crab://$SITE_NAME" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' | jq .
```

Returned the same hydrated `omnigate.site-page.v1`.

Conclusion:

```text
Both /sites/:name and /crab/resolve?url=crab://<name> work.
```

---

## 11. CrabLink successfully rendered the new RON site

After manual site creation, CrabLink loaded:

```text
crab://thedustyonion
```

The screenshot showed:

```text
SITE badge
The Dusty Onion title
description
crab://thedustyonion
site_name = thedustyonion
root_document_cid = b3:192602...
manifest_cid = b3:d080...
manifest status = present / hydrated
owner passport = passport:main:dev
owner wallet = acct_dev
payout action = site_visit
payout account = acct_dev
routes = 1
assets = 1
receipts = 1
ownership card
payout card
manifest card
metadata card
route map card
asset map card
receipts card
developer JSON
```

Conclusion:

```text
CrabLink named-site rendering is proven.
```

---

# Honest current state

## Proven

```text
1. svc-wallet works through gateway and returns ledger-backed balances.
2. Cheap 25 ROC paid hold path can run through CrabLink.
3. svc-storage can store root HTML by b3 CID.
4. POST /sites backend path works.
5. svc-index stores named site manifest pointer.
6. /sites/thedustyonion resolves.
7. /crab/resolve?url=crab://thedustyonion resolves.
8. CrabLink renders omnigate.site-page.v1 beautifully.
9. First named RON site exists:
   crab://thedustyonion
```

## Not yet fully proven

```text
CrabLink UI has not yet proven the complete:
crab://site
→ prepare
→ hold
→ POST /sites
→ open crab://<site_name>

The hold worked, but the site pointer had to be finalized manually with curl.
```

This is the immediate next bug/feature.

---

# Known issue: CrabLink site create UI stops after wallet hold

The next instance should assume there is a CrabLink UI/workflow bug:

```text
CrabLink successfully performs /sites/prepare and /wallet/hold,
but does not successfully submit POST /sites afterward.
```

The older uploaded codebundle showed `page-workflow.js` still had image-only logic:

```text
Only image upload is enabled in this batch. Site create is next.
```

Some patches were provided afterward to add `createSite()` and `submitSiteCreate()`, but the latest local state should be verified with a fresh codebundle before generating more code.

Critical next debugging target:

```text
extensions/chrome/src/page-workflow.js
extensions/chrome/src/ronClient.js
```

Need to ensure:

```text
1. page-workflow.js shows Root Document CID panel clearly.
2. The Root Document CID survives prepare/hold state transitions.
3. After wallet hold succeeds, pageKind === "site" enables Create Site.
4. Create Site calls client.createSite().
5. client.createSite() sends POST /sites.
6. Request includes:
   site_name
   root_document_cid
   owner_passport_subject
   owner_wallet_account
   title
   description
   route_map
   asset_map
7. Headers include:
   Authorization: Bearer dev
   Idempotency-Key
   x-ron-passport
   x-ron-wallet-account
   x-ron-wallet-hold-txid
   x-ron-wallet-txid
   x-ron-wallet-receipt-hash if available
   x-ron-wallet-from if available
   x-ron-wallet-to if available
8. On success, CrabLink stores returned crab URL and enables Open Site Page.
9. Open Site Page navigates to crab://<site_name>.
```

Manual backend proof means this is frontend-side unless a different request shape is sent.

---

# Current beta test values to reuse

## Site form values

```text
Site name:
thedustyonion

Title:
The Dusty Onion

Description:
A test RustyOnions site launched from CrabLink.

Root document CID:
b3:192602366a47455bf4c3353222176d41b33dfd92dea87e62665ee60723578f45
```

If `thedustyonion` already exists, use:

```text
thedustyonion2
```

or:

```text
dusty-onion-test
```

## Known working root document CID

```text
b3:192602366a47455bf4c3353222176d41b33dfd92dea87e62665ee60723578f45
```

## Known working manifest CID for created site

```text
b3:d080f3c519154fbd09d0821f8f5de942469a202d85eb33934b90147b71947f62
```

## Known working site URL

```text
crab://thedustyonion
```

---

# Commands that proved the current state

## Check wallet

```bash
curl -s http://127.0.0.1:8090/wallet/acct_dev/balance \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' | jq .
```

Expected:

```text
ledger_backed: true
source: svc_wallet.v1
warnings: []
```

Current after site hold:

```text
available_minor_units: 1751
held_minor_units: 0
```

## Check root document in storage

```bash
ROOT_CID="b3:192602366a47455bf4c3353222176d41b33dfd92dea87e62665ee60723578f45"

curl -i "http://127.0.0.1:5303/o/$ROOT_CID" | head -n 20
curl -s "http://127.0.0.1:5303/o/$ROOT_CID" | head -n 20
```

Expected:

```text
HTTP/1.1 200 OK
HTML body returned
```

## Check site route

```bash
SITE_NAME="thedustyonion"

curl -s "http://127.0.0.1:8090/sites/$SITE_NAME" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' | jq .
```

Expected:

```text
schema: omnigate.site-page.v1
site_name: thedustyonion
manifest.status: present
manifest.hydration_status: hydrated
warnings: []
```

## Check crab resolver

```bash
curl -sG "http://127.0.0.1:8090/crab/resolve" \
  --data-urlencode "url=crab://$SITE_NAME" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' | jq .
```

Expected:

```text
schema: omnigate.site-page.v1
links.crab: crab://thedustyonion
warnings: []
```

---

# Recommended immediate next workflow

## Step 1: Ask user for fresh CrabLink codebundle

The next instance should ask for a fresh codebundle before patching `page-workflow.js`.

Command:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh && scripts/package-chrome.sh
bash scripts/make_chrome_codebundle.sh
```

Upload:

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

Reason:

```text
The local CrabLink repo may include some root-CID panel patches that are not reflected in the uploaded bundle.
Avoid overwriting working local code with stale generated replacements.
```

## Step 2: Patch CrabLink site creation flow

Immediate patch target:

```text
extensions/chrome/src/page-workflow.js
extensions/chrome/src/ronClient.js
scripts/check-chrome.sh if required
```

Acceptance test:

```text
Open CrabLink
Go to crab://site
Fill site name/title/description
Send Prepare Request
Confirm ROC Hold
Paste/confirm root document CID
Click Create Site
CrabLink receives ok true from POST /sites
CrabLink shows Site Created
Open Site Page button loads crab://<site_name>
Terminal /sites/<site_name> returns omnigate.site-page.v1
Terminal /crab/resolve?url=crab://<site_name> returns omnigate.site-page.v1
Wallet remains ledger_backed:true
```

## Step 3: Add safe root HTML preview/rendering

Current CrabLink site page renders metadata, not the actual HTML page.

NEXT_LEVEL next logical feature:

```text
Site page should provide a safe preview/open root document option:
root_document_cid
→ gateway/storage read route
→ render index.html in sandboxed iframe or safe text preview
```

Important security rules:

```text
Do not execute backend-provided scripts directly.
No extension privilege leakage.
No direct storage calls from CrabLink if gateway route exists.
Prefer gateway route for /o/<cid> or a safe site-doc route.
Sandbox iframe with scripts disabled initially.
Treat HTML as untrusted.
```

Current limitation:

```text
The site exists, but CrabLink displays the site metadata page rather than the raw website HTML.
```

This is acceptable for the current milestone but should be improved next.

---

# Current NEXT_LEVEL completion estimate

For NEXT_LEVEL as a whole:

```text
~40–50%
```

Reasoning:

```text
The first named-site proof now works.
Paid image upload proof already worked earlier.
Wallet/ledger path is proven.
Site rendering is proven.
But site creation through CrabLink UI still needs final patch.
Safe root HTML preview is not implemented.
.post/.comment/.article primitives are not done.
Reference graph model is only beginning.
Provider hosting/payout modes are still early.
Full creator economy routing is not finished.
```

For the first product-proof slice:

```text
~80–88%
```

Slice means:

```text
CrabLink + ROC + b3 + named site/image proof.
```

Remaining gap for this slice:

```text
Finish CrabLink POST /sites after hold.
Add safe root document preview/rendering.
Add smoke script for site create/open.
```

---

# Suggested next small milestones

## Milestone A — Finish CrabLink site create UI

Goal:

```text
crab://site fully creates a site without manual curl.
```

Acceptance:

```text
Wallet goes 1776 → 1751 or similar.
POST /sites succeeds from CrabLink.
crab://newsite opens immediately.
No manual curl required.
```

## Milestone B — Add CrabLink site root preview

Goal:

```text
From crab://thedustyonion, click “Open Root Document” or see safe preview.
```

Acceptance:

```text
CrabLink retrieves root_document_cid bytes through gateway/storage.
Displays HTML in a sandboxed iframe or text preview.
Does not execute unsafe scripts.
```

## Milestone C — Add smoke script for named site proof

Potential script:

```text
scripts/smoke-site-create-local.sh
```

It should prove:

```text
storage root object
prepare site
wallet hold
POST /sites
GET /sites/:name
GET /crab/resolve?url=crab://name
wallet balance
```

CrabLink already has some smoke/check scripts; next instance should inspect current script names in the fresh bundle.

## Milestone D — Polish site-page UX

Possible improvements:

```text
Make route map entries clickable.
Make asset map entries clickable.
Add “Open root document” button.
Add “Copy root CID”.
Add “Copy manifest CID”.
Add “View manifest raw”.
Add receipt detail card.
```

## Milestone E — Generalize asset primitives

After site/image flow is fully green:

```text
.post
.comment
.article
.music/song
.video
```

All should preserve:

```text
b3 canonical addressing
manifest-backed pages
ownership/payout metadata
ROC paid access or paid creation where applicable
```

---

# Current known caveats

## 1. Manual site create used a fake/manual hold txid

Manual `POST /sites` used:

```text
x-ron-wallet-hold-txid: crablink-manual-site-hold-1
```

The backend accepted it for this dev proof. This is acceptable for manual beta proof but not final production behavior.

Final CrabLink flow should use the actual hold txid/receipt returned by `/wallet/hold`.

## 2. CrabLink paid hold succeeded before site create

The 25 ROC was deducted/settled through the UI flow, then the manual site create used a manually supplied hold txid. This is okay for proof but should be cleaned up so one UI flow produces one coherent paid receipt chain.

## 3. Root document upload is still manual/direct to svc-storage

The root document was uploaded through:

```text
PUT http://127.0.0.1:5303/o
```

That is direct storage and was used for manual local testing only.

A proper product path should eventually use gateway-owned upload/create routes rather than the user manually calling `svc-storage`.

## 4. Site page is metadata/hydration page, not the raw website yet

Current UI shows the manifest-backed site page, not a normal rendered website.

Need future safe rendering.

## 5. Wallet startup order matters

Always start `svc-wallet` before the dev stack when possible.

If not, the gateway may show:

```text
0 ROC
ledger_backed:false
display-only fallback
```

This is not spend authority.

---

# Final state summary

The session achieved:

```text
First real named RON site exists:
crab://thedustyonion

It is b3-backed:
root document CID and manifest CID exist.

It is owner/payout aware:
passport:main:dev / acct_dev
site_visit → acct_dev

It is wallet/economy connected:
CrabLink paid prepare/hold deducted 25 ROC from ledger-backed wallet.

It is rendered in CrabLink:
CrabLink displays the hydrated site-page metadata/cards.

Backend path is proven:
POST /sites, /sites/:name, /crab/resolve all work.

Remaining gap:
CrabLink must finish POST /sites after wallet hold without manual curl.
```

This was a genuine product milestone. The next instance should treat the backend site path as proven and focus first on fixing the CrabLink site-create submit step.


### END NOTE - MAY 3 2026 - 11:45 CST



### BEGIN NOTE - MAY 3 2026 - 13:35 CST

Below is a paste-ready carryover note for the next session. It covers both repos, what we accomplished against `NEXT_LEVEL.MD`, what remains, the exact known-good asset URL, the dev-stack pitfalls we discovered, and the recommended next batch.

---

# RustyOnions / CrabLink Carryover Notes — May 03 2026 — Gateway Raw Object Proxy + Professional CrabLink Asset Pages

## 0. Session headline

This session closed the missing browser-preview loop for RustyOnions image assets.

Before this session, CrabLink could:

```text
pay ROC
→ upload image
→ receive b3 hash
→ receive crab://<hash>.image URL
→ resolve hydrated asset page metadata
```

But CrabLink could **not** reliably show the actual image preview on the asset page.

By the end of the session, we proved:

```text
CrabLink
→ crab://<hash>.image
→ svc-gateway /crab/resolve
→ omnigate asset page DTO
→ svc-gateway /o/b3:<hash>
→ svc-storage raw bytes
→ browser image preview
```

This is a major `NEXT_LEVEL.MD` milestone because the current checkpoint says not to jump ahead into `.post/.comment/.article` until the image upload, site/open flow, asset-page rendering, and optional paid upload smoke are clean enough to use as the template. 

Current successful test asset:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

This asset should be treated as the current “known-good CrabLink image page” for next-session verification.

---

# 1. Repos involved

## RustyOnions repo

```text
/Users/mymac/Desktop/RustyOnions
```

RustyOnions is still the backend/substrate/value-plane repo.

## CrabLink repo

```text
/Users/mymac/Desktop/crablink
```

CrabLink remains a separate browser-client repo, not a RustyOnions crate. The uploaded CrabLink notes explicitly preserve this boundary: CrabLink is a browser client, not a wallet, ledger, storage service, index service, or backend service, and it must remain gateway-only. 

---

# 2. RustyOnions crates changed this session

Only one RustyOnions crate had code changed:

```text
svc-gateway
```

Files changed:

```text
crates/svc-gateway/src/routes/objects.rs
crates/svc-gateway/src/routes/mod.rs
```

No `Cargo.toml` changes were required.

RustyOnions crates/services exercised but not modified:

```text
svc-storage
omnigate
svc-wallet
svc-index
ron-policy / ROC economics config
ron-ledger behind svc-wallet
```

---

# 3. RustyOnions work accomplished

## 3.1 `svc-gateway` raw object proxy added

We replaced/updated the temporary object-read path so `svc-gateway` can proxy raw immutable object reads to `svc-storage`.

New public route behavior:

```text
GET  /o/b3:<64hex>
HEAD /o/b3:<64hex>
```

Proxy path:

```text
client / CrabLink
→ svc-gateway /o/b3:<hash>
→ svc-storage /o/b3:<hash>
→ raw object bytes
```

This is the route CrabLink needs for safe image previews after an asset page exposes:

```text
links.raw = /o/b3:<hash>
```

## 3.2 Router mounted the object path

`crates/svc-gateway/src/routes/mod.rs` was updated to mount the object route into the public router.

The route is covered by:

```text
correlation middleware
HTTP metrics middleware
```

This keeps `/o/:addr` observable and consistent with other gateway-facing product routes.

## 3.3 Gateway boundary preserved

The important architectural invariant remained intact:

```text
svc-gateway is proxy-only.
```

It still does **not**:

```text
store bytes
verify the object itself
own manifests
hydrate asset pages
own naming or site pointers
price uploads
create wallet holds directly
capture or release ROC
mutate wallet
mutate ledger
write index pointers
```

This matches the previously established gateway boundary: `svc-gateway` owns stable browser/client paths, selected header forwarding, body/query forwarding, hop-by-hop header filtering, and returning upstream response body/status, but it must not parse manifests, hydrate pages, price storage, mutate ledger, or store bytes. 

## 3.4 Debugged the preview failure

We found the real problem by comparing gateway vs storage directly.

Initial broken behavior:

```text
GET/HEAD http://127.0.0.1:8090/o/b3:<hash> → 502 or 404
GET/HEAD http://127.0.0.1:5303/o/b3:<hash> → 200 OK
```

That proved:

```text
svc-storage had the image bytes.
omnigate had the asset metadata.
CrabLink had the correct raw route.
svc-gateway or gateway config was the failing layer.
```

The root cause was not the image upload, not CrabLink, and not omnigate hydration. The gateway was either not mounted yet or was using the wrong storage upstream.

## 3.5 Discovered required dev-stack env var

For the local CrabLink dev stack, `svc-storage` runs on:

```text
http://127.0.0.1:5303
```

So `svc-gateway` must be launched with:

```text
SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303
```

Without this, gateway `/o/b3:<hash>` can return:

```text
502 Bad Gateway
```

even when storage direct `/o/b3:<hash>` returns `200`.

## 3.6 Discovered pricing config regression during stack restart

When restarting the stack to fix `/o` routing, the image prepare flow temporarily reverted to absurd byte-based pricing:

```text
bytes = 121927
amount = 121927
minimum_hold = 121927
```

That meant `svc-storage`/policy economics was not loading the dev economics file.

Correct local dev pricing config requires:

```text
RON_STORAGE_ROC_ECONOMICS_PATH=/Users/mymac/Desktop/RustyOnions/configs/roc-economics.dev.toml
RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put
```

Expected dev pricing:

```text
25 ROC
```

Do **not** click Confirm ROC Hold if prepare returns a byte-sized absurd estimate. CrabLink was accurately showing the backend response; the backend dev stack was misconfigured.

## 3.7 Confirmed 1 MiB cap behavior

A 1.3 MB image was rejected with:

```text
413 Payload Too Large
```

That is expected for now. Current hardening/OAP-style ingress limits are around `1 MiB`, so image testing should use files under 1 MiB until chunked/streamed upload support is intentionally implemented.

## 3.8 Quality gates run for `svc-gateway`

The user ran:

```bash
cd /Users/mymac/Desktop/RustyOnions
cargo fmt -p svc-gateway
cargo clippy -p svc-gateway --all-targets --no-deps -- -D warnings
cargo test -p svc-gateway --test product_routes_proxy
```

Final status:

```text
cargo fmt: green
cargo clippy -p svc-gateway --all-targets --no-deps -- -D warnings: green
cargo test -p svc-gateway --test product_routes_proxy: green
```

`product_routes_proxy` result:

```text
6 passed
```

Clippy issues fixed during the session:

```text
clippy::doc_markdown
clippy::manual_let_else
```

---

# 4. RustyOnions operational lessons from this session

## 4.1 Use this dev-stack command shape

Correct startup command for the current CrabLink dev loop:

```bash
cd /Users/mymac/Desktop/RustyOnions

ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

env \
  OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
  OMNIGATE_WALLET_BEARER=dev \
  RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
  RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
  SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
  scripts/web3_crablink_dev_stack.sh
```

Important shell gotcha discovered:

```text
Do not put a space after a line-continuation backslash.
```

Bad:

```bash
OMNIGATE_WALLET_BEARER=dev \ 
```

Good:

```bash
OMNIGATE_WALLET_BEARER=dev \
```

The `env \` form above is safer.

## 4.2 Stop stale gateway process before restart

A restart failed with:

```text
Address already in use
svc-gateway bind address 127.0.0.1:8090 is already in use by another process
```

Use:

```bash
lsof -nP -iTCP:8090 -sTCP:LISTEN
```

Then stop the old PID if needed:

```bash
kill -TERM <PID>
```

Also check:

```bash
lsof -nP -iTCP:5303 -sTCP:LISTEN
lsof -nP -iTCP:5304 -sTCP:LISTEN
lsof -nP -iTCP:9090 -sTCP:LISTEN
```

## 4.3 Use proper curl debug output

Do not use `curl -i -o file` when inspecting image bytes, because that writes HTTP headers into the output file.

Use this instead:

```bash
HASH="2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058"
CID="b3:${HASH}"

curl -sS -D /tmp/crablink-gateway-headers.txt \
  -o /tmp/crablink-gateway-image-body.bin \
  "http://127.0.0.1:8090/o/${CID}" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev'

cat /tmp/crablink-gateway-headers.txt
file /tmp/crablink-gateway-image-body.bin
xxd -l 16 /tmp/crablink-gateway-image-body.bin
```

Expected body magic for PNG:

```text
89 50 4e 47
```

Expected body magic for JPEG:

```text
ff d8 ff
```

---

# 5. CrabLink work accomplished

## 5.1 CrabLink files changed this session

Primary files touched across the session:

```text
extensions/chrome/src/page.html
extensions/chrome/src/page-product-preview.js
extensions/chrome/src/ronClient.js
scripts/check-chrome.sh
```

The current codebundle scope includes `extensions/chrome`, `shared`, and the key scripts `check-chrome.sh`, `package-chrome.sh`, and `smoke-local-gateway.sh`. 

## 5.2 `ronClient.js` header contract fixed

We found and fixed the wallet paid-proof header confusion.

Wrong/obsolete header:

```text
x-ron-wallet-hold-txid
```

Correct header:

```text
x-ron-wallet-txid
```

We updated `ronClient.js` so paid site/image flows use the correct header.

Important current rule:

```text
Do not reintroduce x-ron-wallet-hold-txid.
Use x-ron-wallet-txid.
```

This matters because the live backend expects `x-ron-wallet-txid`.

## 5.3 `scripts/check-chrome.sh` fixed

The checker originally looked for `x-ron-wallet-txid` in the wrong source group. We moved the paid upload header checks into the `ronClient.js` section.

Final successful check:

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/check-chrome.sh && scripts/package-chrome.sh
```

Result:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

## 5.4 Asset preview enhancement layer added and iterated

We added and iterated:

```text
extensions/chrome/src/page-product-preview.js
```

Purpose:

```text
- read the hydrated asset/site DTO from Developer JSON
- detect omnigate.asset-page.v1
- render richer asset-page cards
- show safe image preview through gateway /o
- show metadata, ownership, payout, manifest, storage/provider, receipts
- keep Developer JSON collapsed
```

Security posture:

```text
- no innerHTML
- no direct storage/index/ledger calls
- no wallet action
- no spend
- image preview uses gateway /o only
- site root preview remains sandboxed
```

## 5.5 Asset page UI polished

The asset page was initially far too narrow and bunched together. Cards were squeezed into columns, hashes were unreadable, and the image preview was hidden in a tiny card.

We fixed the display by making the asset page layout more professional:

```text
- large/wide preview area
- readable Metadata card
- readable Ownership card
- readable Payout card
- readable Manifest card
- readable Storage/Provider card
- copy buttons for raw route and b3 CID
- long hashes wrapped in readable blocks
- asset preview shown in a clean centered panel
```

The user confirmed the improved layout looked professional and close to the intended vision.

## 5.6 Image preview proved working

The final verified visual path:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
→ Asset Page
→ Image Preview
→ image loads from /o/b3:<hash>
```

At one point the preview required clicking **Load safe image preview**. We later provided a full-file update that changes image assets to auto-load preview bytes on page render and leaves a **Reload preview** button for manual reload.

Important state:

```text
Manual preview confirmed working.
Professional asset-page layout confirmed working.
Auto-load preview patch provided.
Auto-load preview still needs next-session verification if not already tested after reload.
```

## 5.7 Current known-good asset URL saved

The known-good test asset is:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

This has also been saved in memory for future RustyOnions/CrabLink testing.

---

# 6. CrabLink current status after this session

CrabLink is now much more than a shell. It is a working browser-facing product proof.

Working or proven:

```text
- loads as Chrome extension
- checks gateway health/readiness
- displays live backend ROC balance
- displays passport/wallet labels
- opens full-tab CrabLink browser shell
- supports crab://site, crab://image, crab://music, crab://article built-in nav buttons
- supports typed crab://<hash>.image asset pages
- supports paid image prepare
- supports explicit wallet hold flow
- supports paid image upload path
- receives returned crab:// image URL
- renders hydrated asset metadata
- renders owner/passport and wallet/payout info
- renders manifest/storage/provider info
- loads raw image preview through gateway /o
- package/check scripts pass
```

CrabLink architectural invariant remains:

```text
CrabLink
→ svc-gateway
→ omnigate
→ downstream services
```

CrabLink must not call:

```text
svc-wallet directly
ron-ledger directly
svc-storage directly
svc-index directly
ron-accounting directly
svc-rewarder directly
```

The CrabLink notes and blueprint emphasize the extension as a thin client with gateway-only backend access, no private-key custody in MVP, no silent ROC spending, minimal permissions, and no direct internal service calls.  

---

# 7. NEXT_LEVEL progress in this session

## 7.1 What NEXT_LEVEL says the immediate checkpoint is

The active checkpoint is:

```text
1. Finish CrabLink in-UI image upload.
2. Finish site creation/open flow.
3. Improve asset-page rendering.
4. Add optional paid image upload smoke.
5. Then generalize .image into .post / .comment / .article.
```

Previous notes state the image UI flow already reached the browser-driven product loop: select image, build request, prepare, explicit hold, submit upload, 25 ROC deducted, image published, and `crab://<hash>.image` returned.  This session moved the next item—asset-page rendering—from “metadata shell” to “professional preview page with actual image bytes.”

## 7.2 NEXT_LEVEL items completed or advanced this session

### Completed / substantially advanced

```text
Improve asset-page rendering
```

This session made asset pages actually useful and professional:

```text
- asset page shows readable metadata
- raw image preview works
- image loads through public gateway /o
- ownership/payout/storage cards are visible and clean
- current asset page resembles the intended creator asset page UX
```

### Confirmed existing image loop

The in-browser paid image upload loop was already working from the previous session, and this session confirmed the final missing image preview leg.

Current complete image product loop:

```text
crab://image
→ choose image under 1 MiB
→ prepare request
→ 25 ROC hold
→ submit upload
→ b3 CID generated
→ manifest/index pointer created
→ crab://<hash>.image returned
→ asset page resolves
→ image preview loads through /o/b3:<hash>
```

### Corrected backend/client integration details

This session fixed or clarified:

```text
- x-ron-wallet-txid is correct
- x-ron-wallet-hold-txid is wrong
- SVC_GATEWAY_STORAGE_BASE_URL is required for preview
- RON_STORAGE_ROC_ECONOMICS_PATH is required for 25 ROC dev pricing
- old dev process on port 8090 can invalidate tests
```

## 7.3 NEXT_LEVEL items not yet complete

Still not complete:

```text
- formal optional paid image upload smoke script
- site creation/open flow polish from CrabLink UI
- dedicated raw object proxy tests in svc-gateway
- clean config/script hardening so env vars are not manually forgotten
- .post / .comment / .article generalization
- .music / .video safe renderers
- persistent/passport vault UX
- real production auth/capability gating beyond dev token flow
```

Do not jump to `.post`, `.comment`, or `.article` yet. The next step should harden and test the image/site template.

---

# 8. Known issues and gotchas for next session

## 8.1 Dev pricing can regress if economics env vars are missing

Symptom:

```text
image prepare amount = byte count
```

Example bad result:

```text
bytes = 121927
amount = 121927
minimum_hold = 121927
```

Expected dev result:

```text
amount = 25
minimum_hold = 25
wallet_hold_amount = 25
```

Verify before using CrabLink:

```bash
cd /Users/mymac/Desktop/RustyOnions

curl -s 'http://127.0.0.1:8090/assets/image/prepare' \
  -X POST \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' \
  -d '{
    "bytes": 121927,
    "payer_account": "acct_dev",
    "owner_passport_subject": "passport:main:dev",
    "content_type": "image/png",
    "title": "pricing check",
    "description": "dev economics check",
    "tags": ["test"],
    "client_idempotency_key": "pricing-check-121927"
  }' | jq '{
    schema,
    action,
    bytes,
    amount_minor: .paid_storage.estimate.amount_minor,
    minimum_hold_minor: .paid_storage.estimate.minimum_hold_minor,
    wallet_hold_amount: .wallet_hold.amount_minor
  }'
```

Expected:

```json
{
  "amount_minor": "25",
  "minimum_hold_minor": "25",
  "wallet_hold_amount": "25"
}
```

## 8.2 Wallet nonce conflicts are normal safety behavior

Observed example:

```text
nonce conflict for account acct_dev: expected 2, got 1
```

This is not a bug. It means the previous nonce was already used.

CrabLink should eventually parse this and offer:

```text
Use expected nonce <N>
```

For now, manually update the nonce field to the expected value and retry.

## 8.3 Dev ROC can be refilled

If dev ROC gets drained by test holds/uploads, refill via `svc-wallet`:

```bash
cd /Users/mymac/Desktop/RustyOnions

IDEM="crablink-dev-refill-$(date +%s)"

curl -s -X POST 'http://127.0.0.1:8088/v1/issue' \
  -H 'Authorization: Bearer dev' \
  -H "Idempotency-Key: ${IDEM}" \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "acct_dev",
    "asset": "roc",
    "amount_minor": "1776",
    "memo": "CrabLink dev refill"
  }' | jq .
```

## 8.4 Old objects can disappear after stack restart

If the dev stack uses temp/in-memory storage, old image URLs can become stale after restart.

Check:

```bash
HASH="2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058"
CID="b3:${HASH}"

curl -I "http://127.0.0.1:5303/o/${CID}" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev'

curl -I "http://127.0.0.1:8090/o/${CID}" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev'
```

Both should return `200` for a current live object.

## 8.5 If the page still looks old, reload extension and package

After editing CrabLink files:

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/check-chrome.sh && scripts/package-chrome.sh
```

Then:

```text
chrome://extensions
→ Reload CrabLink
```

Open:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

---

# 9. Recommended next session start sequence

## 9.1 Start RustyOnions stack correctly

Terminal A should run wallet/passport services if not already running, depending on the current project script setup.

Terminal B for the CrabLink dev stack:

```bash
cd /Users/mymac/Desktop/RustyOnions

ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

env \
  OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
  OMNIGATE_WALLET_BEARER=dev \
  RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
  RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
  SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
  scripts/web3_crablink_dev_stack.sh
```

## 9.2 Verify gateway/storage raw read

```bash
HASH="2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058"
CID="b3:${HASH}"

curl -I "http://127.0.0.1:8090/o/${CID}" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev'

curl -I "http://127.0.0.1:5303/o/${CID}" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev'
```

If the known-good old object returns 404 due to temp storage, upload a new small image and use the new returned URL.

## 9.3 Verify 25 ROC pricing

Use the `/assets/image/prepare` curl from section 8.1 and confirm `25`.

## 9.4 Verify CrabLink extension

```bash
cd /Users/mymac/Desktop/crablink
bash scripts/check-chrome.sh && scripts/package-chrome.sh
```

Then reload in Chrome and open:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

Check:

```text
- asset page opens
- image preview auto-loads if latest patch was applied
- metadata readable
- ownership readable
- payout readable
- storage/provider readable
- copy raw route works
- copy b3 CID works
- ROC balance still displays
```

---

# 10. Recommended next implementation batch

## Best next batch: harden the newly proven image/template loop

Do **not** jump to `.post/.comment/.article` yet.

Recommended batch name:

```text
Batch: image asset proof hardening + smoke
```

Scope:

```text
1. Add svc-gateway object proxy tests.
2. Update scripts/web3_crablink_dev_stack.sh so required env vars are automatic.
3. Add optional CrabLink/RustyOnions paid image upload smoke.
4. Add safety guard in CrabLink against absurd prepare estimates.
5. Verify auto-loaded preview patch.
6. Update CrabLink manual checklist.
7. Generate fresh CODEBUNDLE_CHROME_EXTENSION.md.
8. Generate/collect fresh RustyOnions notes/codebundle if Rust code changes.
```

## 10.1 RustyOnions next code work

### `svc-gateway`

Add:

```text
crates/svc-gateway/tests/objects_proxy.rs
```

Test:

```text
GET /o/b3:<hash> proxies to storage
HEAD /o/b3:<hash> proxies to storage
404 pass-through
502 storage connect failure
headers filtered correctly
ETag preserved
Content-Length preserved
Content-Type preserved/fallback applied
```

Then run:

```bash
cd /Users/mymac/Desktop/RustyOnions
cargo fmt -p svc-gateway
cargo clippy -p svc-gateway --all-targets --no-deps -- -D warnings
cargo test -p svc-gateway --test objects_proxy
cargo test -p svc-gateway --test product_routes_proxy
```

### Dev stack script

Update:

```text
scripts/web3_crablink_dev_stack.sh
```

So it always sets/prints:

```text
SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303
RON_STORAGE_ROC_ECONOMICS_PATH=<repo>/configs/roc-economics.dev.toml
RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put
OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088
OMNIGATE_WALLET_BEARER=dev
```

Add port diagnostics for:

```text
8090 gateway
9090 omnigate
5303 storage
5304 index
8088 wallet
```

## 10.2 CrabLink next code work

### Safety guard for absurd estimates

In `page-workflow.js`, before enabling **Confirm ROC Hold**, detect obviously wrong dev pricing.

Suggested dev guard:

```text
If action is paid_storage_put
and estimate/minimum hold is greater than 2000
and devMode is true
then disable Confirm ROC Hold
and show:
"Economics config may not be loaded. Expected 25 ROC dev price."
```

This would have prevented the accidental absurd 121,927 ROC hold prompt.

### Nonce UX helper

If wallet hold fails with:

```text
expected N, got M
```

CrabLink should offer:

```text
Use nonce N
```

or auto-fill the nonce field after explicit user click.

### Auto image preview verification

The latest `page-product-preview.js` patch auto-loads image assets through gateway `/o` and keeps a **Reload preview** button.

Need verify after reload:

```text
open known asset page
image appears without manual click
reload button still works
```

### Manual checklist update

Update:

```text
extensions/chrome/test/manual-checklist.md
```

Add checks:

```text
- open known crab://<hash>.image
- image preview auto-loads
- copy raw route
- copy b3 CID
- Developer JSON remains collapsed
- no silent spend on asset page read
- asset page read does not require wallet hold
- if gateway /o fails, UI shows readable preview error
```

---

# 11. What remains for the overall project after this session

## Immediate remaining work

```text
- Make dev-stack startup foolproof.
- Add svc-gateway /o object proxy tests.
- Add optional paid image upload smoke script.
- Add CrabLink safety guard for bad economics estimate.
- Add CrabLink nonce helper.
- Confirm image preview auto-load after latest patch.
- Update manual checklist and codebundle.
```

## Short-term NEXT_LEVEL work

```text
- Finish site creation/open flow inside CrabLink.
- Make crab://site pages as polished as image asset pages.
- Add site root-document preview through sandboxed iframe.
- Add smoke proof for site creation/open from browser path.
- Keep all paid actions explicit and gated.
```

## Medium-term NEXT_LEVEL work

Only after image/site flows are clean:

```text
- Generalize image asset flow into .post.
- Generalize image asset flow into .comment.
- Generalize image asset flow into .article.
- Define safe renderers for .music and .video later.
- Build reference-graph site pages.
- Build manifest-backed ownership/payout/curator/provenance sections.
```

## Long-term WEB3_2 / product work

```text
- Local persistent encrypted RON Passport vault.
- Main passport and alternate anonymous passports.
- Wallet-linked passport permissions.
- Production capability scopes.
- Better receipt display and wallet history.
- Creator payout dashboards.
- Provider/storage reward visibility.
- Safe paid content view flow.
- Browser extension install polish and Chrome Web Store readiness.
```

## Still deferred

Do not add yet:

```text
ROX
Solana
external settlement
public bridge
staking
liquidity
exchange-facing logic
```

The active value-plane invariant remains: ROC is internal for this phase, `svc-wallet` remains the normal mutation front-door, and `ron-ledger` remains durable economic truth behind wallet operations. The WEB3 carryover notes continue to stress backend truth only and no fake ROC in CrabLink. 

---

# 12. Current completion estimate

## RustyOnions WEB3_2 image asset path

```text
~85–90% for the image asset proof path
```

Why:

```text
- prepare works
- wallet hold works
- paid upload works
- b3 CID returned
- crab:// image URL returned
- asset page resolves
- raw image preview works through gateway /o
- UI is now professional/readable
```

Remaining gap:

```text
- smoke automation
- object proxy tests
- dev stack foolproof config
- edge cases around nonce/pricing UX
```

## CrabLink Chrome extension MVP

```text
~70–75% for local developer MVP
```

Why:

```text
- extension works live against RustyOnions
- full-tab browser shell exists
- paid image upload path works
- professional asset page rendering now exists
- package/check pipeline green
```

Remaining gap:

```text
- site creation/open polish
- auto preview patch verification
- safety guard for bad pricing
- nonce helper
- manual smoke/checklist updates
- persistent encrypted passport vault not done
- production auth/capability UX not done
- Chrome Web Store readiness not done
```

## NEXT_LEVEL current checkpoint

```text
~55–65% through the immediate checkpoint
```

Completed or mostly completed:

```text
Finish CrabLink in-UI image upload
Improve asset-page rendering
Prove raw image preview through gateway
```

Still remaining:

```text
Finish site creation/open flow polish
Add optional paid image upload smoke
Only then generalize to .post/.comment/.article
```

---

# 13. Success statement

This session achieved a real creator-web milestone:

```text
A user can pay ROC, upload an image, receive a canonical b3-backed crab:// image URL, open the asset page in CrabLink, see ownership/payout/storage metadata, and view the actual image bytes through the public gateway.
```

That is no longer just terminal smoke. It is product-shaped browser UX.

The next session should focus on hardening what now works, not expanding too quickly. The correct next move is:

```text
Make the image asset proof reproducible, tested, smoke-scripted, and foolproof.
Then polish crab://site.
Then generalize the template.
```


### END NOTE - MAY 3 2026 - 13:35 CST


### BEGIN NOTE - MAY 3 2026 - 15:10 CST

That screenshot is **excellent**. The asset page now looks like a real product page, not just a debug response. The image preview is loading through the safe gateway raw route, the metadata/ownership/payout/manifest cards are readable, and the page is clearly following the `b3 → crab:// → manifest-backed asset page` model.

## NEXT_LEVEL.MD completion estimate

My honest estimate:

```text
NEXT_LEVEL.MD overall completion: ~38–45%
```

For the **immediate NEXT_LEVEL checkpoint**, I would score us higher:

```text
Immediate image/site product checkpoint: ~72–78%
```

Reasoning:

NEXT_LEVEL’s immediate checkpoint says to finish CrabLink in-UI image upload, finish site creation/open flow, improve asset-page rendering, add optional paid upload smoke, and only then generalize `.image` into `.post/.comment/.article`.  We have now substantially completed the image path: prepare, explicit ROC hold, paid upload, b3 asset CID, manifest CID, crab URL, hydrated asset page, and raw preview through `/o/b3:<hash>`. That exact pattern is the one NEXT_LEVEL says must be generalized rather than replaced. 

The reason I am **not** putting overall NEXT_LEVEL above ~45% is because the full blueprint includes much more than images: reusable `.post/.comment/.article` primitives, reference-graph sites, payout routing, hosting/placement modes, paid views, provider/curator/moderator splits, accounting/rewarder expansion, and stronger route-contract tests. NEXT_LEVEL explicitly defines the larger model as content-addressed creator web + reusable asset primitives + reference-graph sites + manifest-backed attribution + ROC payout routing + hosting modes + SDK/CrabLink developer UX. 

A fair breakdown:

```text
WEB3 / ROC closed-loop foundation:             ~88–92%
WEB3_2 product-route foundation:               ~82–88%
CrabLink Chrome MVP:                           ~78–84%
Immediate NEXT_LEVEL checkpoint:               ~72–78%
Full NEXT_LEVEL blueprint:                      ~38–45%
```

The project has crossed the “is this real?” threshold. The remaining NEXT_LEVEL work is now mostly **polish, generalization, route contracts, and expansion**, not proving the core architecture.

---

# Carryover Notes — RustyOnions / CrabLink / NEXT_LEVEL — May 03 2026

## 0. Session headline

This session proved and polished the first **browser-native RustyOnions creator economy loop**:

```text
CrabLink full-tab UI
→ crab://image
→ select image
→ build prepare request
→ send prepare
→ explicit ROC wallet hold
→ paid image upload
→ receive b3 asset CID
→ receive b3 manifest CID
→ receive crab://<hash>.image
→ auto-open asset page
→ resolve hydrated asset metadata
→ load raw bytes through svc-gateway /o/b3:<hash>
→ display safe image preview
```

This is a major NEXT_LEVEL milestone because the blueprint says the current product layer must finish image upload, site/open flow, asset-page rendering, optional paid upload smoke, and then generalize the proven `.image` path into `.post/.comment/.article`. 

The most important outcome: we are no longer only “terminal testing” RustyOnions. We now have a working browser-facing product proof.

---

## 1. Current known-good asset

Fresh known-good paid image asset:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Raw gateway route:

```text
/o/b3:984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4
```

Smoke proof:

```text
/assets/image/prepare       → HTTP 200
/wallet/hold                → HTTP 200
/assets/image               → HTTP 200
/crab/resolve               → HTTP 200
/o/b3:<hash>                → HTTP 200 raw bytes
raw byte response           → 68 bytes
raw byte match              → passed
```

This should be treated as the current fresh known-good CrabLink image URL.

---

## 2. Repos involved

RustyOnions repo:

```text
/Users/mymac/Desktop/RustyOnions
```

CrabLink repo:

```text
/Users/mymac/Desktop/crablink
```

CrabLink remains a separate browser-client repo. It is not a RustyOnions crate, not a wallet, not a ledger, not storage, not index, and not a backend service. The extension must remain gateway-only; the older CrabLink notes explicitly define that boundary and warn against direct internal-service calls. 

---

## 3. RustyOnions crates changed in this session

For the latest set of work discussed here: **no RustyOnions crates were modified**.

RustyOnions services/crates exercised heavily:

```text
svc-gateway
omnigate
svc-wallet
svc-storage
svc-index
ron-ledger behind svc-wallet
ron-policy / ROC economics config
```

Previously, in the immediately preceding May 03 gateway/raw-preview work, `svc-gateway` was modified to expose and mount the raw object proxy:

```text
GET  /o/b3:<64hex>
HEAD /o/b3:<64hex>
```

That route proxies through gateway to storage so CrabLink can display safe previews without calling `svc-storage` directly. 

---

## 4. CrabLink files changed in this session

Primary CrabLink files changed:

```text
scripts/smoke-local-gateway.sh
extensions/chrome/test/manual-checklist.md
extensions/chrome/src/storage.js
extensions/chrome/src/page-workflow.js
extensions/chrome/src/page-utils.js
extensions/chrome/src/ronClient.js
```

High-level purpose of each:

```text
scripts/smoke-local-gateway.sh
  Reproducible route smoke for health/ready, identity, wallet, built-ins,
  prepare routes, optional paid image upload, known-good raw preview,
  wallet nonce retry, and raw byte verification.

extensions/chrome/test/manual-checklist.md
  Updated human QA path for gateway stack, image upload, known-good raw preview,
  site flow, failure modes, and done criteria.

extensions/chrome/src/storage.js
  Added safe product-state persistence for last crab URL, last b3 CID,
  last product summary, and ledger-backed wallet balance display rules.

extensions/chrome/src/page-workflow.js
  Hardened full-tab product flow: prepare → hold → upload/create,
  nonce recovery, explicit confirm prompts, dev pricing guard, site root CID panel,
  auto-open returned page.

extensions/chrome/src/page-utils.js
  Added paid-flow safety helpers: dev pricing guard, expected nonce extraction,
  canonical b3 normalization, integer money helpers.

extensions/chrome/src/ronClient.js
  Fixed idempotency key length bug by compacting all idempotency keys to backend-safe
  length. This resolved the long filename/idempotency-key failure.
```

---

## 5. Major bugs fixed

### 5.1 Gateway was not running

Initial smoke failed with:

```text
curl: Failed to connect to 127.0.0.1 port 8090
error: GET /healthz -> HTTP 000
```

Root cause:

```text
RustyOnions dev stack was not running.
```

Resolution:

```text
Terminal 1: run svc-wallet on 127.0.0.1:8088
Terminal 2: run scripts/web3_crablink_dev_stack.sh with proper economics/storage/wallet env
Terminal 3: run CrabLink checks and smoke
```

### 5.2 Wallet nonce conflict in smoke

Smoke initially used timestamp nonce:

```text
got 1777834785
expected 1
```

Root cause:

```text
svc-wallet enforces sequential nonces.
The smoke script incorrectly generated timestamp nonces.
```

Resolution:

```text
Default smoke nonce changed to 1.
If /wallet/hold returns NONCE_CONFLICT, script extracts expected nonce and retries once.
```

Rule preserved:

```text
Do not use timestamp/random wallet nonces.
Do not disable nonce checking.
Do not fake wallet state.
```

### 5.3 Manual UI wallet nonce friction

Manual UI originally required annoying nonce fiddling.

Resolution in UI:

```text
After successful hold, CrabLink increments the local nonce field.
If backend returns NONCE_CONFLICT and exposes/mentions expected nonce,
CrabLink fills/retries using expected nonce logic.
```

Longer-term better fix:

```text
Expose next_nonce in wallet/balance or a wallet/account state endpoint.
```

Do not invent wallet truth locally.

### 5.4 Long image filename broke wallet hold idempotency

The screenshot showed:

```text
Idempotency-Key must be 1..=64 bytes
```

Root cause:

```text
The image filename was included directly in the wallet hold idempotency key.
Long screenshot filenames made the key exceed backend length limits.
```

Resolution:

```text
ronClient.js now compacts all idempotency keys.
stableIdempotencyKey() now returns deterministic, ASCII-safe, max-64-byte keys.
```

Important clarification:

```text
The image file itself was fine.
The filename only broke the generated idempotency key.
```

### 5.5 Bad pricing safety

Earlier stack restarts could return byte-sized pricing, such as:

```text
amount = 121927
```

Expected dev image price:

```text
25 ROC
```

Resolution:

```text
CrabLink now has a dev pricing guard.
If action is paid_storage_put and devMode is true and the returned price is absurdly high,
Confirm ROC Hold stays disabled and shows a warning.
```

Required backend env:

```text
RON_STORAGE_ROC_ECONOMICS_PATH=/Users/mymac/Desktop/RustyOnions/configs/roc-economics.dev.toml
RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put
```

---

## 6. Green proofs achieved

### 6.1 Extension static gates

Command:

```bash
scripts/check-chrome.sh && scripts/package-chrome.sh
```

Observed:

```text
json/structure checks: ok
javascript syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: /Users/mymac/Desktop/crablink/dist/crablink-extension-chrome.zip
```

### 6.2 Paid image upload smoke

Command:

```bash
CRABLINK_SMOKE_EXPECT_IMAGE_PRICE=25 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

Proved:

```text
GET  /healthz
GET  /readyz
GET  /identity/me
GET  /wallet/acct_dev/balance
GET  /b3/<sample>.image
GET  /crab/resolve?url=crab://<sample>.image
GET  /crab/resolve?url=crab://site
GET  /crab/resolve?url=crab://image
GET  /crab/resolve?url=crab://music
GET  /crab/resolve?url=crab://article
POST /sites/prepare
POST /assets/image/prepare
POST /wallet/hold
POST /assets/image
GET  /crab/resolve?url=crab://984128...
GET  /o/b3:984128...
```

Critical success:

```text
raw byte match: paid_image_raw
```

### 6.3 Known-good raw preview smoke

Command:

```bash
CRABLINK_SMOKE_KNOWN_GOOD_CRAB_URL='crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image' \
CRABLINK_SMOKE_RUN_KNOWN_GOOD=1 \
scripts/smoke-local-gateway.sh
```

Proved:

```text
crab://984128...
→ /crab/resolve
→ omnigate.asset-page.v1
→ /o/b3:984128...
→ 68 raw bytes
```

### 6.4 Manual UI image minting

The user confirmed the latest UI fix worked perfectly. The screenshot shows:

```text
image page renders
asset CID visible
asset kind visible
crab URL visible
manifest visible
owner passport visible
owner wallet visible
payout recipient visible
storage available
gateway route visible
safe preview visible
metadata card visible
ownership card visible
payout card visible
manifest card visible
```

This is a real product page now.

---

## 7. Current state against immediate NEXT_LEVEL checkpoint

NEXT_LEVEL immediate checkpoint:

```text
1. Finish CrabLink in-UI image upload.
2. Finish site creation/open flow.
3. Improve asset-page rendering.
4. Add optional paid image upload smoke.
5. Then generalize the proven .image path into .post / .comment / .article.
```

Current status:

```text
1. Finish CrabLink in-UI image upload.
   Status: essentially green.
   Notes: Manual minting works. Paid smoke works. Idempotency filename bug fixed.

2. Finish site creation/open flow.
   Status: partially done / next major task.
   Notes: /sites/prepare is green. Prior backend direct site create/open was proven in earlier notes.
          Full CrabLink UI site create/open still needs final manual proof/polish.

3. Improve asset-page rendering.
   Status: significantly improved.
   Notes: Screenshot shows professional page with safe preview and dedicated cards.
          Still needs polishing for receipts/warnings layout and non-image kinds later.

4. Add optional paid image upload smoke.
   Status: done and green.
   Notes: CRABLINK_SMOKE_RUN_UPLOAD=1 now verifies hold/upload/resolve/raw-byte match.

5. Generalize .image to .post/.comment/.article.
   Status: not started intentionally.
   Notes: Correctly deferred until image/site polish is complete.
```

The notes are explicit that we should not start `.post/.comment/.article` until image and site flows are polished, and that the next phase should begin with DTO/parser foundations rather than service sprawl. 

---

## 8. Current project architecture status

### 8.1 RustyOnions backend

Working/proven for current product proof:

```text
svc-gateway
  Public browser/client gateway.
  Routes CrabLink calls.
  Proxies raw /o/b3:<hash> bytes to storage.
  Preserves gateway boundary.

omnigate
  Hydrates product pages.
  Handles crab:// resolver surfaces.
  Provides asset-page/site-page DTOs.
  Coordinates prepare/upload/create product responses.

svc-wallet
  Handles wallet balance and wallet hold.
  Enforces sequential nonce.
  Enforces idempotency key length.
  Remains economic mutation front-door.

ron-ledger
  Durable truth behind wallet.

svc-storage
  Stores bytes and manifests by b3 CID.
  Does not own names or payout logic.

svc-index
  Stores pointers / lookup metadata.

ron-policy / configs/roc-economics.dev.toml
  Controls dev pricing.
  25 ROC image prepare path confirmed.
```

### 8.2 CrabLink

Working/proven:

```text
Chrome extension checks/package
full-tab browser shell
crab://site, crab://image, crab://music, crab://article nav buttons
crab://<hash>.image page rendering
gateway health/ready checks
identity/wallet display
backend ROC balance display
image prepare UI
explicit wallet hold UI
safe idempotency key generation
nonce recovery / increment behavior
image upload UI
automatic returned page open
safe image preview through /o/b3:<hash>
copy URL / copy JSON / copy raw route / copy b3 CID
manual checklist and smoke script
```

### 8.3 Boundaries preserved

Important: the architecture held.

```text
CrabLink stayed gateway-only.
svc-gateway stayed public proxy/edge.
omnigate stayed view hydrator/coordinator.
svc-wallet stayed economic mutation front-door.
ron-ledger stayed durable truth.
svc-storage stored bytes/manifests.
svc-index stored pointers.
b3 remained canonical.
crab:// remained user-facing.
No browser-side fake receipts.
No browser-side fake balances.
No direct browser calls to storage/index/ledger.
No arbitrary executable crab-linked code.
```

NEXT_LEVEL’s non-negotiable rules specifically include keeping ROC internal, keeping wallet mutation through `svc-wallet`, preserving `ron-ledger` truth, using b3 as canonical ID, keeping CrabLink gateway-only, and forbidding arbitrary executable code from crab links. 

---

## 9. Important commands for next session

### 9.1 Start wallet

From RustyOnions repo:

```bash
cd /Users/mymac/Desktop/RustyOnions
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

### 9.2 Start CrabLink dev stack

From RustyOnions repo:

```bash
cd /Users/mymac/Desktop/RustyOnions

ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

env \
  OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
  OMNIGATE_WALLET_BEARER=dev \
  RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
  RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
  SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
  scripts/web3_crablink_dev_stack.sh
```

### 9.3 Run CrabLink checks

From CrabLink repo:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh && scripts/package-chrome.sh
```

### 9.4 Run paid upload smoke

```bash
CRABLINK_SMOKE_EXPECT_IMAGE_PRICE=25 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

### 9.5 Run known-good preview smoke

```bash
CRABLINK_SMOKE_KNOWN_GOOD_CRAB_URL='crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image' \
CRABLINK_SMOKE_RUN_KNOWN_GOOD=1 \
scripts/smoke-local-gateway.sh
```

### 9.6 Reload extension

```text
chrome://extensions
→ CrabLink
→ Reload
```

---

## 10. Known pitfalls

### 10.1 Stack not running

Symptom:

```text
Failed to connect to 127.0.0.1 port 8090
HTTP 000
```

Fix:

```text
Start RustyOnions wallet and dev stack.
```

### 10.2 Missing gateway storage upstream

Symptom:

```text
asset metadata resolves
image preview fails
/o/b3:<hash> returns 502
```

Fix:

```text
SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303
```

### 10.3 Bad economics config

Symptom:

```text
prepare returns amount equal to byte count
Confirm hold wants absurd ROC amount
```

Fix:

```text
RON_STORAGE_ROC_ECONOMICS_PATH=/Users/mymac/Desktop/RustyOnions/configs/roc-economics.dev.toml
RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put
```

### 10.4 Wallet nonce conflict

Symptom:

```text
NONCE_CONFLICT expected N got M
```

Current behavior:

```text
Smoke retries once with expected nonce.
UI can fill/retry or increment after success.
```

Better future backend/UI work:

```text
Expose next_nonce from wallet balance/account state.
```

### 10.5 Idempotency key too long

Symptom:

```text
Idempotency-Key must be 1..=64 bytes
```

Fixed:

```text
ronClient.js compacts stable idempotency keys.
```

### 10.6 Image too large

Symptom:

```text
413 Payload Too Large
```

Current rule:

```text
Use image files under 1 MiB.
Chunked/streamed upload is future work.
```

---

## 11. NEXT_LEVEL status by section

### 11.1 Asset primitive model

Status:

```text
.image: proven end-to-end
.site: partly proven; UI finalization remains
.post: not started
.comment: not started
.article: not started
.video/song/page/profile/thread: future
```

NEXT_LEVEL defines asset primitives as creating content bytes, b3 asset CID, manifest, b3 manifest CID, index pointer, crab URL, optional receipt reference, and hydrated asset page. 

### 11.2 Reference-graph sites

Status:

```text
Concept accepted.
Site as reference graph not yet implemented fully.
Need site create/open UI first.
Then start reference graph DTOs.
```

NEXT_LEVEL’s thesis is that RON-native sites should own route maps/layout/moderation/payout/reference graphs/site identity/site manifest, while user-created posts/comments/articles/images become b3 assets referenced by sites. 

### 11.3 Payout routing

Status:

```text
Basic payout recipient display exists.
Full split routing not implemented.
Receipt/payout cards need richer data.
```

Future work:

```text
configs/roc-economics.toml action splits
basis point validation
integer minor-unit split math
deterministic dust handling
wallet committed receipts
accounting/rewarder flow for provider/curator/moderator rewards
```

### 11.4 Hosting modes

Status:

```text
Not implemented beyond current local storage provider.
Automatic decentralized placement: future.
Dedicated provider placement: feature-gated future.
Self-hosted mode: future.
```

### 11.5 Paid views / view accounting

Status:

```text
Not started.
```

Future:

```text
paid content view prepare/hold/capture
view receipts
ron-accounting view/serve events
anti-abuse policy
```

### 11.6 CrabLink developer UX

Status:

```text
Strong MVP emerging.
Image path is real.
Site path is next.
```

---

## 12. Recommended next work order

### Batch 1 — Finish `crab://site` UI create/open

Goal:

```text
Make site flow as clean as image flow.
```

Target flow:

```text
crab://site
→ fill site name/title/description
→ Build Request Preview
→ Send Prepare Request
→ Confirm ROC Hold
→ root_document_cid field
→ Create Site
→ return crab://<site_name>
→ auto-open crab://<site_name>
```

Before coding:

```text
Inspect exact backend route contract:
crates/omnigate/src/routes/v1/sites.rs
crates/omnigate/tests/site_launch.rs
crates/svc-gateway/tests/product_routes_proxy.rs
docs/WEB3_2_PRODUCT_ROUTE_CONTRACTS.md
```

Need confirm:

```text
POST /sites request body
required fields
required paid proof headers
whether root_document_cid is mandatory
response shape
whether crab://<site_name> resolver works through /crab/resolve
whether direct /sites/:name remains required
```

### Batch 2 — Polish asset page rendering

Current screenshot is good. Next polish:

```text
Fix image preview scaling / avoid recursive screenshot effect.
Improve receipts card.
Improve warnings layout.
Add storage/provider details when available.
Add manifest raw route copy.
Add raw object route card.
Add clearer paid proof/receipt card.
Add “open raw bytes” safe button.
Add small “this is rendered as safe preview only” note.
```

Security rules:

```text
textContent only for backend text
never render backend HTML
never execute crab-provided scripts
only safe <img> preview for image assets
site preview only sandboxed
no arbitrary executable linked code
```

### Batch 3 — Add `svc-gateway` object proxy tests

RustyOnions code task:

```text
crates/svc-gateway/tests/objects_proxy.rs
```

Tests:

```text
GET /o/b3:<hash> proxies to storage
HEAD /o/b3:<hash> proxies to storage
404 pass-through
502 storage connect failure
headers filtered correctly
ETag preserved
Content-Length preserved
Content-Type preserved/fallback applied
```

Run:

```bash
cd /Users/mymac/Desktop/RustyOnions
cargo fmt -p svc-gateway
cargo clippy -p svc-gateway --all-targets --no-deps -- -D warnings
cargo test -p svc-gateway --test objects_proxy
cargo test -p svc-gateway --test product_routes_proxy
```

### Batch 4 — Make `web3_crablink_dev_stack.sh` self-configuring

Goal:

```text
Avoid manually remembering env vars.
```

Update script to set/print:

```text
SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303
RON_STORAGE_ROC_ECONOMICS_PATH=<repo>/configs/roc-economics.dev.toml
RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put
OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088
OMNIGATE_WALLET_BEARER=dev
```

Add diagnostics for:

```text
8090 gateway
9090 omnigate
5303 storage
5304 index
8088 wallet
```

### Batch 5 — Generate fresh bundles/notes

After next successful code batch:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
```

For RustyOnions, if any Rust files change:

```bash
cd /Users/mymac/Desktop/RustyOnions
scripts/make_repo_codebundle_rs.sh
scripts/collect_notes.sh
scripts/collect_all_docs.sh
```

Use actual script names in repo if they differ.

### Batch 6 — Only after image/site are green, start `.post/.comment/.article`

Start with DTOs/parsing, not service sprawl:

```text
ron-proto:
  TextAssetBodyV1
  PostAssetV1
  CommentAssetV1
  ArticleAssetV1
  AssetReferenceV1
  ReferenceGraphV1

ron-naming:
  .post
  .comment
  .article asset suffix parsing/canonicalization tests

omnigate / svc-gateway:
  only after DTOs and parsing exist
```

---

## 13. Current completion estimate

```text
Core RustyOnions substrate for product proof:      ~90%
WEB3 internal ROC loop:                            ~88–92%
WEB3_2 route/product foundation:                   ~82–88%
CrabLink Chrome MVP:                               ~78–84%
Immediate NEXT_LEVEL checkpoint:                   ~72–78%
Full NEXT_LEVEL blueprint:                         ~38–45%
```

Why this is a major jump:

```text
The .image primitive is now end-to-end real.
The browser UI now mints an image asset.
The gateway raw preview path is proven.
The optional paid upload smoke is green.
The known-good raw preview smoke is green.
The asset page is now professional enough to evaluate product UX.
The idempotency and nonce footguns are no longer blocking normal use.
```

Why full NEXT_LEVEL is still under half:

```text
Reference-graph sites are not fully implemented.
.post/.comment/.article are intentionally not started.
Paid views are not implemented.
Full payout split routing is not implemented.
Hosting placement modes are not implemented.
Provider/curator/moderator reward flows are not implemented.
CrabLink site create/open UI still needs final polish/proof.
Route-contract tests need expansion.
```

---

## 14. Best one-sentence handoff to next instance

```text
We are continuing RustyOnions/CrabLink NEXT_LEVEL: the .image asset primitive is now browser-proven end-to-end through CrabLink with explicit ROC hold, paid upload, b3 CID, manifest CID, crab:// image page, and safe gateway /o raw preview; next we must finish crab://site create/open UI, polish asset-page cards, add gateway object proxy tests/dev-stack self-config, and only then begin .post/.comment/.article DTO/parser foundations.
```

---

## 15. Success statement

This session proved that RustyOnions is becoming a real content-addressed creator web, not just a backend experiment.

The core product loop now exists:

```text
Creator pays ROC
→ publishes an image
→ receives canonical b3 identity
→ receives user-facing crab:// URL
→ asset page displays ownership/payout/manifest/storage info
→ image preview loads safely through gateway
```

That is the exact pattern NEXT_LEVEL is supposed to generalize.


### END NOTE - MAY 3 2026 - 15:10 CST



### BEGIN NOTE - MAY 4 2026 - 14:30 CST

Absolutely — this was a **major achievement**. We now have a real browser-facing proof that RustyOnions can create, pay for, store, resolve, and render both **b3-backed images** and **named crab:// sites** through CrabLink. Below are paste-ready carryover notes for the next instance.

# RustyOnions / CrabLink / NEXT_LEVEL Carryover Notes — May 04 2026

## 0. Current headline

This session crossed a major product threshold:

```text
CrabLink is no longer just showing manifest/debug pages.
CrabLink can now behave like a browser tab for a named crab:// site.
```

The latest proof:

```text
crab://thedustyonion2
→ resolves through svc-gateway / omnigate
→ hydrates as omnigate.site-page.v1
→ points to a custom HTML root document stored by b3 CID
→ renders that HTML in CrabLink inside a sandboxed iframe
→ keeps the CrabLink URL bar visible
→ hides most manifest/proof details behind a “Site Manifest” button
```

This is directly aligned with `NEXT_LEVEL.MD`, whose immediate checkpoint is to finish image upload, finish site creation/open flow, improve asset-page rendering, add optional paid image upload smoke, and only then generalize the proven `.image` path into `.post`, `.comment`, and `.article`. 

## 1. Current proof status

### 1.1 Image flow is green

We previously proved the full in-browser image publishing loop:

```text
crab://image
→ select image
→ Build Request Preview
→ Send Prepare Request
→ explicit Confirm ROC Hold
→ Submit Image Upload
→ ROC deducted
→ image bytes stored by b3 CID
→ manifest stored
→ crab://<hash>.image returned
→ asset page opens in CrabLink
→ image auto-loads safely through svc-gateway /o
```

The carryover notes already describe this as crossing from terminal-proven paid image upload into user-facing browser-driven paid image upload, with CrabLink calling gateway/omnigate/wallet/storage/index paths through the correct public route chain. 

Known-good paid image asset from prior proof:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Fresh current-session image proof also worked with the crab-claw image. It showed:

```text
asset CID:      b3:877953f035925c8e573397f593ef848619664a864ab28763a3bec7ad9c3472c1
asset kind:     image
owner passport: passport:main:dev
owner wallet:   acct_dev
payout account: acct_dev
storage:        available
receipt:        paid_storage
```

### 1.2 Site flow is now green enough for proof-of-concept

We proved:

```text
crab://site
→ fill site name/title/description
→ Build Request Preview
→ Send Prepare Request
→ Confirm ROC Hold
→ paste/write custom HTML root document
→ Store Root HTML through gateway paid object path
→ returned b3 root document CID auto-fills Root Document CID
→ Create Site
→ open crab://thedustyonion2
→ named site resolves
→ custom HTML renders inside CrabLink
```

Current proof site:

```text
site URL:          crab://thedustyonion2
title:             a second dusty onion
description:       we done did it again hyuk hyuk hyuk
owner passport:    passport:main:dev
owner wallet:      acct_dev
payout action:     site_visit
payout account:    acct_dev
```

Current root document CID visible from the screenshots:

```text
b3:fcc4c4339fe7d8b38f1378a23ee48b770ec0622f2d2ea8cd3623af1e0ecdbf3d
```

Current site manifest CID visible from the screenshots:

```text
b3:e8fa0e4145c230e1797fe07946a35fa83e8c3f92df75ea338c7839bd880493ef
```

This proves the key NEXT_LEVEL pattern:

```text
prepare
→ explicit ROC hold
→ paid upload/create
→ raw bytes stored by b3 CID
→ manifest stored by b3 CID
→ index pointer stored
→ crab:// URL returned
→ hydrated page resolves in CrabLink
```

NEXT_LEVEL explicitly says this proven pattern should be generalized rather than replaced. 

## 2. What changed in CrabLink this session

This session was **CrabLink-only** from a code-change perspective. RustyOnions backend services were used and proven, but we did not edit Rust crate source in this immediate sequence.

The latest uploaded CrabLink codebundle confirms the current extension scope includes:

```text
extensions/chrome/
shared/
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
```

and it includes the key files we worked around:

```text
extensions/chrome/src/page.html
extensions/chrome/src/page.js
extensions/chrome/src/page-workflow.js
extensions/chrome/src/page-product-preview.js
extensions/chrome/src/page-site-root-upload.js
extensions/chrome/src/page-site-render-mode.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/storage.js
scripts/check-chrome.sh
```



### 2.1 `page-site-root-upload.js`

Added the missing root HTML author/storage step for `crab://site`.

Purpose:

```text
Before creating a site, the user needs a root document CID.
CrabLink now lets the user paste HTML or choose an .html file,
store it as paid b3 bytes,
then auto-fill the Root Document CID field.
```

Important behavior:

```text
- Does not execute typed HTML.
- Requires explicit ROC hold first.
- Uses gateway paid object upload path.
- Fills root_document_cid only from backend returned b3 CID.
- Does not call storage/index/ledger directly.
```

We initially introduced a MutationObserver loop that froze the page after Send Prepare Request, then fixed it by stopping observation after install and making updates idempotent.

### 2.2 `page-product-preview.js`

This already handled manifest-backed asset/site pages. We used it as the source loader for site root HTML. It remains the proof/debug layer:

```text
site root document source
manifest CID
ownership
payout
route map
asset map
receipts
Developer JSON
```

It is still valuable and should not be deleted; the user-facing site renderer now hides most of it by default.

### 2.3 `page-site-render-mode.js`

This was the main site-renderer file we iterated heavily.

Evolution:

```text
1. First version made named crab:// site pages auto-click “Show sandbox preview.”
2. Next version hid source/details and added website-first mode.
3. Then we moved away from rendering inside the manifest card.
4. Then we created a separate full-page sandbox iframe renderer.
5. Then we fixed width, white blank iframe, iframe scrollbar, and runaway vertical positioning issues.
6. Final current state is acceptable proof-of-concept:
   - CrabLink URL bar stays up top.
   - Site renders below it.
   - Manifest/debug details are behind “Site Manifest.”
   - Top site controls are simplified.
```

Current visual state:

```text
CrabLink top browser bar remains visible.
Site toolbar below it shows:
- site title
- crab:// URL + short root b3 CID
- @username placeholder
- Site Manifest button

The old excessive buttons were removed:
- Reload site
- Site details
- Source
- Copy URL
- Copy root CID

Only the manifest/proof affordance remains.
```

### 2.4 `page.html`

Updated to load:

```html
<script type="module" src="./page-site-root-upload.js"></script>
<script type="module" src="./page-product-preview.js"></script>
<script type="module" src="./page-site-render-mode.js"></script>
```

The full-tab CrabLink browser remains the main browsing surface. The older notes correctly define CrabLink as a thin browser client, not a wallet, ledger, storage, index, or backend service. 

## 3. Product decision added this session: site creator handles

New product rule to preserve:

```text
Main RON Passports should eventually have human @username handles.
```

The site viewer should show:

```text
site creator: @username
```

near the top right, immediately to the left of:

```text
Site Manifest
```

Desired behavior:

```text
site creator: @username
```

where `@username` is clickable and loads a read-only passport/user manifest page.

Proposed future routes, not final yet:

```text
crab://@username
crab://passport/@username
crab://passport/<username>
```

The cleanest product model is likely:

```text
crab://@username
```

for user-facing discovery, with the gateway resolving it to a hydrated passport/profile manifest page. Internally, this should still map to a canonical passport subject and b3-backed/profile-backed manifest.

Important identity rule from the user:

```text
Main passport:
- may create sites
- may have @username
- may own payout/creator identity

Alt/anonymous passports:
- may browse/surf
- may leave comments
- should not create sites
- should not automatically inherit main wallet/site creation authority
```

This matches the existing carryover invariant that passports are identities, not wallets, and that alt passports must not automatically inherit main wallet authority. 

## 4. Current architectural state

### 4.1 Backend roles proven

The site and image proofs exercised these RustyOnions services:

```text
svc-gateway
omnigate
svc-storage
svc-index
svc-wallet
ron-ledger
ron-policy / roc-economics config
```

Their roles:

```text
svc-gateway:
Public entrypoint CrabLink talks to.

omnigate:
Hydrates product pages and handles site/image product route logic.

svc-storage:
Stores raw bytes by b3 CID.

svc-index:
Stores/resolves site and asset pointers.

svc-wallet:
Normal wallet mutation front door.

ron-ledger:
Durable economic truth behind wallet state.

ron-policy / roc economics:
Provides paid write/prepare pricing and enforcement config.
```

### 4.2 CrabLink boundary still correct

CrabLink must remain:

```text
CrabLink
→ svc-gateway public routes
→ backend services
```

CrabLink must not become:

```text
CrabLink → svc-wallet directly
CrabLink → svc-storage directly
CrabLink → svc-index directly
CrabLink → ron-ledger directly
CrabLink → policy engine
CrabLink → wallet engine
```

This gateway-only rule is repeated in prior notes and must remain hard. 

## 5. Critical invariants to preserve

Do not break these:

```text
- ROC remains internal only.
- No ROX.
- No Solana.
- No external settlement.
- No staking/liquidity/exchange logic.
- No floating-point money math.
- All ROC amounts are integer minor units.
- Paid actions require explicit confirmation.
- No silent ROC spend.
- No fake balances.
- No fake receipts.
- Wallet mutation goes through svc-wallet.
- Durable economic truth remains ron-ledger.
- CrabLink remains gateway-only.
- Storage stores bytes by b3 CID only.
- Names are human pointers; b3 hashes are canonical.
- Public asset URL format remains crab://<64hex>.<kind>.
- Internal content ID remains b3:<64 lowercase hex>.
- Developer JSON / manifest proof must remain available somewhere.
- No arbitrary executable code from crab links.
```

NEXT_LEVEL also explicitly states that ROC remains internal, b3 hashes are canonical, sites store references, wallet remains mutation front-door, storage stores bytes only, and no arbitrary executable linked code should be introduced. 

## 6. Current completion estimate

Updated honest estimate after this session:

```text
WEB3 / ROC closed-loop foundation:       ~88–92%
WEB3_2 product-route foundation:         ~84–89%
CrabLink Chrome MVP:                     ~84–88%
Immediate NEXT_LEVEL checkpoint:         ~80–86%
Full NEXT_LEVEL blueprint:               ~42–48%
```

Why the immediate checkpoint jumped:

```text
- Image path is green.
- Paid image upload is browser-proven.
- Asset image page is professionally rendered.
- Site creation/open flow is now browser-proven.
- Custom root HTML storage works.
- Named crab:// site renders inside CrabLink.
- Manifest proof is still available but no longer dominates the default site view.
```

Why full NEXT_LEVEL is still under 50%:

```text
- .post / .comment / .article are not implemented yet.
- Site-as-reference-graph is not implemented beyond the simple site root proof.
- Paid views and view receipts are not fully implemented.
- Creator/provider/curator/moderator payout splits are not implemented.
- @username/passport profile manifests are not implemented.
- Alt passport permissions are not implemented.
- Hosting placement modes are not implemented.
- Accounting/rewarder integration for views/serving/curation is not productized.
- Browser UX still needs polish and testing.
```

## 7. Known issues / rough edges

### 7.1 Site renderer still needs polish

Current site renderer is acceptable for proof-of-concept, but not final.

Known issues:

```text
- Demo HTML itself uses a centered max-width card, so the content appears centered/narrow.
- The CrabLink site toolbar is functional but not final.
- We still need “site creator: @username” plain text to the left of clickable @username.
- @username is currently placeholder-only.
- Site Manifest button opens proof/details, but details UX can be improved.
- Need a cleaner distinction between:
  normal website view
  manifest/proof view
  source view
  passport/profile view
```

### 7.2 Iframe/sandbox layout is tricky

We ran into:

```text
- iframe internal scrollbar
- white blank iframe
- renderer blinking/reloading while scrolling
- iframe height feeding back into 100vh layout
- centered site content walking down the page
```

Current state is good enough for proof. Do not over-optimize immediately unless it breaks again. The long-term solution may be to define a cleaner `crab://site` rendering contract and optionally a safer “RON static page” renderer rather than constantly resizing an iframe.

### 7.3 Dev stack storage is ephemeral

When the CrabLink dev stack restarts, prior uploaded images/sites may disappear because the script uses fresh artifact-local DBs. That is expected for now.

Important command pattern used:

```bash
cd /Users/mymac/Desktop/RustyOnions

ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

env \
  OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
  OMNIGATE_WALLET_BEARER=dev \
  RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
  RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
  SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
  scripts/web3_crablink_dev_stack.sh
```

If port 8090 is already in use:

```bash
lsof -nP -iTCP:8090 -sTCP:LISTEN
ps -fp <PID>
kill <PID>
lsof -nP -iTCP:8090 -sTCP:LISTEN
```

### 7.4 Nonce UX is still annoying

The user noted that manually dealing with wallet nonces is annoying.

Future fix should not fake local wallet truth. Possible safe approaches:

```text
- svc-wallet exposes next nonce through balance/account state.
- gateway exposes next nonce in wallet/balance response.
- wallet hold response allows idempotency-first retry behavior.
- CrabLink increments local dev nonce only as a convenience, clearly labeled non-authoritative.
```

Best product direction:

```text
CrabLink should not make the user think about nonces.
Backend/gateway should expose enough safe wallet account metadata for CrabLink to prefill the next nonce.
```

## 8. What remains for NEXT_LEVEL

### Priority 1 — freeze current image/site proof as the template

Before expanding to new asset kinds, make sure these stay green after a fresh stack restart:

```text
crab://image
→ prepare
→ hold
→ upload
→ open asset page
→ safe preview loads

crab://site
→ prepare
→ hold
→ store root HTML
→ create site
→ open named crab site
→ rendered site appears
→ Site Manifest opens proof/details
```

The manual checklist already says the NEXT_LEVEL order is: keep image upload green, keep asset-page rendering and raw preview green, make optional paid upload smoke prove raw bytes through `/o`, finish site create/open flow polish, and only then start `.post/.comment/.article`. 

### Priority 2 — add clickable site creator identity

Implement:

```text
site creator: @username    [Site Manifest]
```

Details:

```text
- plain text label: “site creator:”
- clickable handle: @username
- clicking opens read-only passport/profile manifest
- initially placeholder can route to a future/empty state
- no mutation
- no wallet authority
- no private data exposure
```

Possible MVP behavior:

```text
If owner username missing:
show “site creator: @username”
clicking opens crab://@username placeholder page or disabled tooltip.
```

Future backend route contract:

```text
GET /identity/profile/:handle
GET /passport/:subject/profile
GET /crab/resolve?url=crab://@username
```

Preferred product UX:

```text
crab://@username
```

resolves to:

```text
passport/profile manifest page
owner display metadata
public sites
public assets
optional bio
public payout pointer
no private wallet secrets
```

### Priority 3 — main passport vs alt passport permissions

New rule:

```text
Main passport can create sites.
Alt/anonymous passports can browse and comment, but should not create sites.
```

Implementation implications:

```text
- Add passport kind to identity DTOs: main | alt | anon.
- Site prepare/create contract should require main passport permission.
- CrabLink should display why site creation is blocked for alts.
- Comment creation should be allowed for alts if policy permits.
- Alts should not automatically expose main identity.
- Wallet authority should not automatically flow to alts.
```

This belongs partly in:

```text
svc-passport
omnigate identity/product route contracts
svc-gateway proxy/contracts
CrabLink identity UI
ron-proto DTOs if shared types are needed
ron-policy capability checks
```

### Priority 4 — update tests/checks for new site render mode

Update `scripts/check-chrome.sh` to require the latest file/tokens:

```text
extensions/chrome/src/page-site-render-mode.js
site creator:
@username
Site Manifest
creatorHandle
crablinkSiteCreatorHandle
```

Also update manual checklist:

```text
- Open crab://thedustyonion2.
- CrabLink URL bar remains visible.
- Site content renders below.
- Only @username + Site Manifest are visible in site toolbar.
- Site Manifest opens proof/details.
- Source remains available from manifest/proof view.
- No direct wallet/storage/index calls.
```

### Priority 5 — smoke site creation/open path

Add or harden a script/manual checklist for:

```text
crab://site
→ prepare
→ hold
→ store root HTML
→ create site
→ resolve named site
→ verify rendered view
```

The smoke should ideally check:

```text
GET /healthz
GET /readyz
GET /identity/me
GET /wallet/acct_dev/balance
POST /sites/prepare
POST /wallet/hold
POST /paid/o or site-root upload path
POST /sites
GET /crab/resolve?url=crab://<site>
```

### Priority 6 — then generalize to `.post`, `.comment`, `.article`

Do not start here until image/site are repeatably green.

When ready, generalize the same shape:

```text
prepare
→ explicit ROC hold if paid
→ upload/create
→ b3 CID
→ manifest CID
→ index pointer
→ crab://<hash>.<kind>
→ hydrated page
```

Initial candidates:

```text
crab://post
crab://comment
crab://article
```

Typed public URLs:

```text
crab://<64hex>.post
crab://<64hex>.comment
crab://<64hex>.article
```

## 9. Files most likely relevant next session

CrabLink:

```text
extensions/chrome/src/page-site-render-mode.js
extensions/chrome/src/page-site-root-upload.js
extensions/chrome/src/page-product-preview.js
extensions/chrome/src/page-workflow.js
extensions/chrome/src/page.js
extensions/chrome/src/page.html
extensions/chrome/src/ronClient.js
extensions/chrome/src/storage.js
extensions/chrome/src/crab.js
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
extensions/chrome/test/manual-checklist.md
```

RustyOnions if backend identity/profile work begins:

```text
crates/svc-passport/
crates/omnigate/src/routes/v1/identity.rs
crates/omnigate/src/routes/v1/sites.rs
crates/omnigate/src/routes/v1/crab.rs
crates/svc-gateway/src/routes/product.rs
crates/svc-gateway/src/routes/dev.rs
crates/svc-gateway/tests/product_routes_proxy.rs
crates/ron-naming/src/crab.rs
crates/ron-naming/src/asset.rs
crates/ron-proto/src/asset/
crates/ron-proto/src/naming.rs
configs/roc-economics.dev.toml
```

## 10. Commands to run before next code batch

From CrabLink repo:

```bash
cd /Users/mymac/Desktop/crablink
node --check extensions/chrome/src/page-site-render-mode.js
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
git status
```

From RustyOnions repo, if backend stack is needed:

```bash
cd /Users/mymac/Desktop/RustyOnions
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

In another terminal:

```bash
cd /Users/mymac/Desktop/RustyOnions

ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

env \
  OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
  OMNIGATE_WALLET_BEARER=dev \
  RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
  RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
  SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
  scripts/web3_crablink_dev_stack.sh
```

## 11. Recommended next-session opening prompt

Paste this to the next instance:

```text
We are continuing RustyOnions / CrabLink NEXT_LEVEL work.

Use WEB3.MD, WEB3_2.MD, TODO_WEB3_2.MD, NEXT_LEVEL.MD, CODEBUNDLE_RS.md, ALLNOTES.MD, ALL_DOCS_COMBINED.MD, CODECHECK.md, and CODECOMMENTS.MD as project references. CODEBUNDLE_RS.md is the current Rust source reference. CODEBUNDLE_CHROME_EXTENSION.md is the current CrabLink reference.

Current status:
- Image upload path is green in CrabLink.
- Asset image pages render with safe gateway /o preview.
- Site creation/open flow is now proof-green.
- CrabLink can store custom HTML as a paid b3 root object.
- CrabLink can create a named site using that root CID.
- crab://thedustyonion2 resolves and renders as a sandboxed site in the full-tab CrabLink browser.
- The current site view is acceptable proof-of-concept. It has a top CrabLink URL bar, rendered website body, @username placeholder, and Site Manifest button.
- Do not over-polish site rendering unless necessary; next desired UX tweak is “site creator: @username” with @username clickable to a future read-only passport/profile manifest page.
- Main passports should be allowed to create sites; alt/anonymous passports should browse/comment but not create sites.
- Preserve gateway-only CrabLink, no fake truth, no silent ROC spending, and all WEB3/ROC invariants.

Next best task:
Update CrabLink site render UX to show “site creator: @username” where @username is clickable/read-only, then update check-chrome/manual checklist. After that, decide whether to implement passport profile manifests or freeze current proof and move to .post/.comment/.article planning.
```

## 12. Final success statement

This was a real milestone.

We proved:

```text
b3 content IDs are not just backend theory.
crab:// URLs are not just parser strings.
ROC paid actions are not just ledger tests.
CrabLink is not just a popup.
```

The project now has a visible product loop:

```text
creator pays ROC
→ publishes image or site
→ receives b3/crab address
→ opens it in CrabLink
→ sees ownership/payout/manifest proof
→ sees actual content render
```

That is the foundation for the NEXT_LEVEL vision: a content-addressed creator web where sites are reference graphs, assets are portable b3 objects, ownership and payout metadata travel with the content, and CrabLink becomes the human-facing browser layer.


### END NOTE - MAY 4 2026 - 14:30 CST



### BEGIN NOTE - MAY 4 2026 - 19:00 CST


````markdown
# RustyOnions / CrabLink / NEXT_LEVEL Carryover Notes — May 04 2026

## 0. Current headline

We crossed a major RustyOnions product milestone.

CrabLink is no longer only resolving manifests or showing developer/debug JSON. It can now behave like a real browser surface for RustyOnions content:

```text
creator pays ROC
→ publishes image/site/root HTML
→ receives b3/crab address
→ opens address in CrabLink
→ sees ownership/payout/manifest proof
→ sees actual content render
````

The latest proof is:

```text
crab://thedustyonion6
```

This is the strongest proof so far of the `NEXT_LEVEL.MD` thesis: RustyOnions sites can become reference graphs where a site root document stores references to separate b3-backed assets, rather than owning all content bytes itself. The updated `NEXT_LEVEL.MD` now explicitly records the current checkpoint: paid image path works, site creation/open works, CrabLink renders named sites, CrabLink renders site-root HTML, CrabLink renders `<crab-image>`, the root-image-CID guard exists, and `crab://thedustyonion6` proves the first reference-graph embed primitive. 

---

## 1. Active repositories and source references

Primary repos:

```text
/Users/mymac/Desktop/RustyOnions
/Users/mymac/Desktop/crablink
```

Current primary RustyOnions reference files:

```text
WEB3.MD
WEB3_2.MD
TODO_WEB3_2.MD
NEXT_LEVEL.MD
WEB3_2_PRODUCT_ROUTE_CONTRACTS.md
CODEBUNDLE_RS.md
ALLNOTES.MD
ALL_DOCS_COMBINED.MD
CODECHECK.md
CODECOMMENTS.MD
```

Current CrabLink reference file:

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

The uploaded Chrome extension codebundle is current as of `2026-05-04T23:54:56Z`, from `/Users/mymac/Desktop/crablink`, and includes the Chrome extension files, shared browser-client helpers, schemas, fixtures, and scripts. The important current extension files include `page-site-render-mode.js`, `page-site-root-upload.js`, `page-workflow.js`, `ronClient.js`, `storage.js`, `page.css`, `page.html`, `scripts/check-chrome.sh`, `scripts/package-chrome.sh`, and `scripts/smoke-local-gateway.sh`. 

---

## 2. What we accomplished in this session

### 2.1 We proved `<crab-image>` embeds inside a named site

We successfully created a site root HTML document containing:

```html
<crab-image
  src="crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image"
  alt="RustyOnions b3-backed image"
></crab-image>
```

This proved the following flow:

```text
site root HTML
→ stored as its own b3 root document
→ site manifest points to that HTML root
→ HTML contains <crab-image src="crab://...image">
→ CrabLink detects the referenced image asset
→ CrabLink fetches image bytes through svc-gateway raw object path
→ image renders inside the sandboxed site page
```

This is a key product breakthrough because the site does not contain or own the image bytes. The image remains its own independent b3-backed asset with its own address, manifest, owner/payout metadata, and future receipts/provenance. This is exactly the “site as reference graph” model now documented in `NEXT_LEVEL.MD`, where sites own route maps/layout/policies/references while posts/comments/articles/images/videos/music remain separate b3-addressed assets. 

### 2.2 We diagnosed and fixed the “PNG bytes rendered as HTML” bug

Problem discovered:

```text
thedustyonion3 / thedustyonion4 were created with the image CID as the site root document CID.
```

The visible symptom was binary-looking PNG text in the rendered site area:

```text
PNG IHDR IDAT ...
```

Root cause:

```text
Root Document CID field contained:
b3:2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058
```

That is the image asset CID, not the HTML root document CID.

Correct model:

```text
Root Document CID = b3 hash of the HTML root document
Image CID = only appears inside the HTML as crab://<hash>.image
```

Fix implemented in CrabLink:

```text
extensions/chrome/src/page-site-root-upload.js
```

Key behavior added:

```text
- Detects if Root Document CID equals an embedded <crab-image> CID.
- Blocks Create Site if that mistake is present.
- Auto-clears prefilled image CID when valid root HTML contains that same image.
- Keeps Store Root HTML available when valid HTML is present.
- If no wallet hold exists, clicking Store Root HTML gives an explicit “Confirm ROC Hold first” message.
```

This guard is now proven because after the patch the user successfully created:

```text
crab://thedustyonion6
```

### 2.3 We added friendly binary-root protection in the site renderer

Patch target:

```text
extensions/chrome/src/page-site-render-mode.js
```

Purpose:

```text
If a named site’s root document points to image bytes instead of HTML, CrabLink no longer blindly renders binary as text.
It shows a friendly “site root is image bytes, not HTML” warning.
```

This protects future testers from confusion and makes the UX much safer.

### 2.4 We made CrabLink render image embeds inside sandboxed site pages

Patch target:

```text
extensions/chrome/src/page-site-render-mode.js
```

Core behavior:

```text
- Site HTML renders in a sandboxed iframe.
- Scripts remain disabled.
- CrabLink scans for <crab-image src="crab://<hash>.image">.
- CrabLink validates only crab://<64 lowercase hex>.image references.
- CrabLink fetches bytes through gateway, not direct internal services.
- CrabLink creates a blob URL and replaces <crab-image> with an <img>.
- Failed embeds render as safe warning text.
```

Security posture preserved:

```text
- No arbitrary backend-provided JavaScript.
- No extension privilege leakage.
- No direct ledger/storage/index/wallet/internal service calls.
- Gateway-only fetch path.
- Explicit paid action flow remains separate from rendering.
```

### 2.5 We confirmed the first real reference-graph site proof

The successful site is:

```text
crab://thedustyonion6
```

This site proves:

```text
HTML root stored as b3 object
→ named site manifest points at HTML root
→ HTML root references a separate image asset
→ CrabLink resolves and renders the referenced asset
```

This should be treated as the current canonical proof for the first “site as reference graph” primitive.

Known-good image assets to keep in future tests:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

The `2e24...` image is the one used for the `<crab-image>` embed proof.

---

## 3. Files changed or recently worked on

This session was CrabLink-only for code changes.

Important CrabLink files touched or discussed:

```text
extensions/chrome/src/page-site-render-mode.js
extensions/chrome/src/page-site-root-upload.js
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
CODEBUNDLE_CHROME_EXTENSION.md
```

Main behavior implemented in `page-site-root-upload.js`:

```text
- Root HTML author panel.
- Store Root HTML flow.
- Paid proof extraction from hold preview.
- Paid root HTML storage through gateway paid object path.
- Root CID auto-fill from backend b3 response.
- Guard against using embedded image CID as site root CID.
- Auto-clear prefilled image CID.
- “Confirm ROC Hold first” UX if user clicks Store Root HTML before hold.
```

Main behavior implemented in `page-site-render-mode.js`:

```text
- Full named-site render mode.
- Top site toolbar with Site Manifest button.
- Site creator placeholder.
- Sandboxed iframe rendering.
- Binary-root warning document.
- <crab-image> resolver.
- Gateway raw-object image fetch.
- Blob URL rendering.
- Image embed error warnings.
```

The Chrome extension codebundle still emphasizes core safety gates: the extension must remain thin, honest, explicit, local-first, gateway-only, receipt-driven, permission-minimal, and future-browser-ready; RustyOnions remains the source of truth. 

---

## 4. Important commands to run before the next code batch

From the CrabLink repo:

```bash
cd /Users/mymac/Desktop/crablink

node --check extensions/chrome/src/page-site-root-upload.js && \
node --check extensions/chrome/src/page-site-render-mode.js && \
scripts/check-chrome.sh && \
scripts/package-chrome.sh && \
scripts/make_codebundle.sh

git status
```

If continuing with RustyOnions backend testing, start `svc-wallet` first:

```bash
cd /Users/mymac/Desktop/RustyOnions

RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

In another terminal, start the WEB3 CrabLink dev stack:

```bash
cd /Users/mymac/Desktop/RustyOnions

ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

env \
  OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
  OMNIGATE_WALLET_BEARER=dev \
  RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
  RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
  SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
  scripts/web3_crablink_dev_stack.sh
```

Wallet startup order matters. If the stack comes up before `svc-wallet`, CrabLink can show fallback identity/wallet display with `ledger_backed:false` or stale/zero ROC state. That fallback is not spend authority and should not be treated as wallet truth.

---

## 5. How to manually verify the current proof

### 5.1 Verify the image embed asset still resolves

```bash
curl -sG "http://127.0.0.1:8090/crab/resolve" \
  --data-urlencode "url=crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image" \
  -H 'Authorization: Bearer dev' \
  -H 'x-ron-passport: passport:main:dev' \
  -H 'x-ron-wallet-account: acct_dev' | jq .
```

Expected:

```text
schema = omnigate.asset-page.v1
asset_kind = image
storage.available = true
owner/payout fields present
```

### 5.2 Verify raw image bytes still serve through gateway

```bash
curl -i "http://127.0.0.1:8090/o/b3:2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058" | head -n 20
```

Expected:

```text
HTTP 200
image bytes returned
```

### 5.3 Verify `crab://thedustyonion6`

In CrabLink:

```text
Open crab://thedustyonion6
```

Expected:

```text
- Site loads in the CrabLink full-tab view.
- Top toolbar remains visible.
- Site Manifest button remains available.
- Site creator placeholder still appears.
- Root HTML renders.
- Embedded image appears automatically.
- No “PNG IHDR IDAT” binary text appears.
```

### 5.4 Verify the root CID is not the image CID

When creating a new site with the embed sample, Root Document CID must not be:

```text
b3:2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058
```

That hash should only appear inside HTML as:

```html
<crab-image src="crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image"></crab-image>
```

---

## 6. NEXT_LEVEL.MD update summary

We updated `NEXT_LEVEL.MD` into the new active blueprint:

```text
NEXT_LEVEL.MD — RON Asset Primitives, Reference-Graph Sites, Passports, Reputation, and Creator Economy Routing
```

The updated document now begins from the concrete proof we achieved:

```text
paid image upload
+ crab://site proof
+ <crab-image> reference embed proof
```

It frames the next product layer as:

```text
content-addressed creator web
+ reusable asset primitives
+ reference-graph sites
+ manifest-backed attribution
+ RON Passports with @usernames
+ reputation and moderation summaries
+ anonymous/pseudonymous alt passports
+ privacy-honest alt-wallet handling
+ ROC payout routing
+ decentralized/dedicated/self-hosted placement modes
+ SDK/CrabLink developer UX
```

Important corrections made in the final updated blueprint:

```text
- Passports are identity/capability records, not wallets.
- Passports are not merely b3 assets.
- A passport may publish a public b3-addressed profile/passport manifest.
- Public profile manifests may expose @username, public profile data, public asset catalogue pointers, reputation summary, moderation summary, and site-scoped public roles.
- Private keys, local alt mappings, spend authority, and recovery data must remain private/local or service-internal.
- Private alt→main ROC withdrawal is not promised.
- Direct alt→main transfer is traceable unless a real privacy protocol exists.
- next_level_alt_private_withdrawal remains disabled until a research/security-gated privacy design exists.
```

This was the big discipline fix: we rejected the idea that “every passport is just a b3 asset,” and replaced it with the safer architecture:

```text
passport = identity/capability record
public profile/passport manifest = optional b3-addressed public object
```

This keeps `svc-passport` and `ron-auth` as the identity/capability owners, while still enabling `crab://@username` read-only profile discovery later.

### 6.1 Main new NEXT_LEVEL themes

The updated blueprint now includes:

```text
- Site as reference graph.
- Reusable asset primitives.
- Embed primitive family.
- Passport @username claims.
- Public profile/passport manifests.
- Reputation score.
- Moderator score.
- Site-scoped moderator roles.
- Alt passports.
- Privacy-honest alt wallet handling.
- Site edit/revision route contract.
- Media-lite video/music path.
- Text assets: .post, .comment, .article.
- Paid views.
- Accounting/rewarder payout planning.
- Provider hosting modes.
- Clearnet crossover feature gate.
```

### 6.2 Feature gates added or clarified

Important NEXT_LEVEL gates:

```text
next_level_assets_text
next_level_assets_media_lite
next_level_media_streaming
next_level_reference_graph
next_level_site_revisions
next_level_paid_views
next_level_provider_rewards
next_level_hosting_placement
next_level_passport_usernames
next_level_passport_public_profiles
next_level_passport_alts
next_level_reputation
next_level_site_moderation_roles
next_level_alt_private_withdrawal
next_level_clearnet_crossover
next_level_free_impression_rewards
next_level_executable_apps
```

Key default-off gates:

```text
next_level_alt_private_withdrawal = OFF
next_level_clearnet_crossover = OFF
next_level_free_impression_rewards = OFF
next_level_executable_apps = OFF
```

### 6.3 Updated immediate implementation order

The final updated `NEXT_LEVEL.MD` recommends this near-term order:

```text
1. CrabLink-only layout polish:
   Make site content span the usable browser window.
   Keep Site Manifest proof available but not dominant.

2. CrabLink-only embed resolver cleanup:
   Keep <crab-image> green.
   Prepare a clean registry for future <crab-video>, <crab-audio>, <crab-article>, <crab-post>, <crab-comment>.

3. Thin passport/profile DTO + naming batch:
   Add public profile/passport manifest DTOs to ron-proto.
   Add @username parser/normalizer to ron-naming.
   Do not add svc-passport mutation yet.

4. svc-passport username batch:
   First-passport creation with @username.

5. Omnigate/gateway read-only profile exposure:
   Resolve crab://@username through gateway.

6. CrabLink passport creation UX:
   User chooses @username during first passport setup.

7. Site creator hydration:
   Site page top bar uses real @username and reputation/mod score when backend provides it.

8. Media-lite exploratory DTOs:
   Prepare for .video and .music carefully without claiming production streaming.

9. Text primitive foundation:
   .post, .comment, .article.
```

This order is intentionally efficient. It does not try to patch nine Rust crates in one batch. It allows a narrow identity/display track because the site creator chip already exists in CrabLink, but it keeps mutation-heavy passport, alt, reputation, moderation, and site-edit logic staged.

---

## 7. Architecture invariants that must continue to be preserved

### 7.1 WEB3 / ROC invariants

From WEB3 and WEB3_2, preserve:

```text
- ROC remains internal only.
- No ROX.
- No Solana.
- No external settlement.
- No staking/liquidity/exchange-facing logic.
- No floating-point money math.
- All ROC amounts use integer minor units.
- All percentages use integer basis points.
- ron-ledger is durable append-only economic truth.
- svc-wallet is the only normal economic mutation front-door.
- ron-accounting is transient counters/snapshots, not balance truth.
- svc-rewarder computes deterministic reward/payout plans but does not directly mutate ledger.
- Paid operations use hold → capture → release.
- Wallet mutations require nonce + idempotency.
- No negative balances by default.
- Transfers conserve value.
- Mint/issue and burn are explicit audited exceptions.
- Wallet receipts must be stable and retrievable.
```

WEB3_2 also explicitly preserves the service boundary that usage/metering goes to `ron-accounting`, rewards to `svc-rewarder`, economic mutation to `svc-wallet`, durable truth to `ron-ledger`, paid enforcement to storage/gateway/omnigate, identity to passport/auth, naming/indexing to ron-naming/svc-index, bytes to storage/edge, and visibility to dashboard/extension UI. It forbids direct ledger mutation from storage, gateway, omnigate, accounting, rewarder, browser extension, or passport token surfaces. 

### 7.2 CrabLink invariants

CrabLink must remain:

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

CrabLink must not become:

```text
wallet truth
ledger truth
storage truth
index truth
reward computation
passport truth
internal service client
arbitrary code execution host
```

The Chrome extension review checklist specifically asks whether a change added permissions, added backend routes, called anything other than `svc-gateway`, stored sensitive state, added a paid path, preserved explicit confirmation, redacted errors, avoided broad injection, preserved `crab://<hash>.<kind>`, kept checks passing, and regenerated the codebundle when needed. 

### 7.3 b3 / crab URL invariants

Current canonical forms:

```text
Internal content ID:
b3:<64 lowercase hex>

Public asset URL:
crab://<64 lowercase hex>.<asset_kind>

Public named site URL:
crab://<site_name>

Future public username/profile URL:
crab://@username
```

Do not reintroduce old public format:

```text
crab://b3/<hash>.<asset_kind>
```

Names and usernames are human pointers. b3 hashes remain canonical.

### 7.4 Site/root document invariants

```text
Site root CID must point to HTML/root document bytes.
Image/video/article/post/comment CIDs must appear as references inside the root or reference graph.
Do not use image bytes as a site root.
Edits should create new root CIDs later.
Named site pointers may advance only through authorized site revision/update flow later.
Old root bytes must remain immutable.
```

---

## 8. What remains for the project

### 8.1 Immediate CrabLink work

Highest-priority near-term work:

```text
1. Confirm check/package/codebundle are green after the latest patch.
2. Polish full-window site rendering so content spans the usable window width.
3. Keep Site Manifest button/drawer available but not dominant.
4. Extract/generalize embed resolver into a clean registry.
5. Keep <crab-image> behavior unchanged while preparing for future embed tags.
```

Potential future embed tags:

```html
<crab-image src="crab://<hash>.image"></crab-image>
<crab-article src="crab://<hash>.article"></crab-article>
<crab-post src="crab://<hash>.post"></crab-post>
<crab-comment src="crab://<hash>.comment"></crab-comment>
<crab-video src="crab://<hash>.video"></crab-video>
<crab-audio src="crab://<hash>.music"></crab-audio>
```

Do not add video/audio streaming first as a full feature. Start with video-lite/media DTO contracts and small-file tests only.

### 8.2 Immediate RustyOnions work

Likely next RustyOnions code batch, if we leave CrabLink-only mode:

```text
ron-naming + ron-proto only
```

Possible narrow batch:

```text
- @username parser/normalizer in ron-naming.
- Public profile/passport manifest DTOs in ron-proto.
- ReputationSummaryV1 DTO placeholder.
- ModeratorSummaryV1 DTO placeholder.
- SiteModeratorRoleV1 DTO placeholder.
```

Do not touch yet in the same batch:

```text
svc-passport
omnigate
svc-gateway
svc-index
svc-storage
svc-wallet
ron-ledger
CrabLink
```

If going Rust, remember:

```text
- Review CODECHECK.md before generating code.
- Use CODECOMMENTS.MD RO header conventions for full paste-ready files.
- Provide full paste-ready files with exact paths.
- Include Cargo.toml only if dependencies/features change.
- Do not use unsafe.
- Do not hold locks across .await.
- Do not add dependencies unless clearly necessary.
```

### 8.3 Passport work remaining

Passport-related future tasks:

```text
- Main passport creation with @username.
- @username uniqueness and reserved-name rejection.
- Read-only public profile/passport route.
- crab://@username resolver.
- Site creator hydration from backend username.
- Reputation/moderation summary display.
- Alt passport creation/selection.
- Separate alt ROC account/balance.
- Local private main→alt mapping.
- No public main↔alt linkage.
```

Important privacy rule:

```text
Do not promise anonymous cash-out yet.
Direct alt→main transfer is traceable until a real privacy protocol exists.
Private alt→main withdrawal remains research/security-gated and feature-gated OFF.
```

### 8.4 Site editing/revisions remaining

Site creation now works, but editing is not done.

Site editing requires:

```text
- Owner passport check.
- Site update authority.
- Optional wallet hold/capture.
- Store new root document.
- Create new site manifest revision.
- Advance site name pointer only after authorization succeeds.
- Read revision history.
- Optional rollback semantics.
```

Candidate future routes:

```text
POST /sites/:name/update/prepare
POST /sites/:name/update
GET  /sites/:name/revisions
GET  /sites/:name/revisions/:revision
```

Do not start this until:

```text
- site creation is stable
- creator identity display is stable
- passport @username MVP exists
```

### 8.5 Text primitives remaining

Future typed text assets:

```text
.post
.comment
.article
```

Suggested order:

```text
1. ron-proto DTOs
2. ron-naming asset kind parsing if needed
3. omnigate .post prepare/create/resolve
4. svc-gateway .post route exposure
5. terminal smoke for paid post
6. CrabLink crab://post UI
7. repeat for .comment
8. repeat for .article
```

Do not implement `.comment` before `.post` is green. Do not implement `.article` before `.comment` is green.

### 8.6 Media/video/music remaining

User wants to try video next, but video is more complex than images.

Safe path:

```text
video-lite first
```

Meaning:

```text
- DTOs and route contracts first.
- Small test video only if current body limits allow.
- No production streaming claim.
- No range/chunk/edge/accounting rewrite in the same batch.
```

Full production video/music later requires:

```text
range requests
chunked upload
edge caching
egress accounting
content-type validation
possibly transcoding through svc-mod / svc-sandbox later
```

### 8.7 Accounting/rewarder/value-plane remaining

The product loop is visible, but the full WEB3 value-plane integration still needs:

```text
usage recorded
→ accounting window sealed
→ rewarder computes deterministic payout plan
→ wallet issues ROC
→ ledger balance changes
→ ledger replay proves no double issue
```

Prior notes identify the end-to-end ROC loop test as eventually needed and recommend keeping rewarder stateless or carefully deciding any manifest/index UX so it does not become a second ledger. 

---

## 9. Current completion estimate

### 9.1 NEXT_LEVEL overall

Estimated:

```text
~45–55%
```

Reason:

```text
- Paid image upload is browser-proven.
- Image asset pages render.
- Site creation/open is browser-proven.
- Site root HTML rendering is proven.
- <crab-image> reference embed is proven.
- The first reference-graph primitive works.
- NEXT_LEVEL blueprint has been updated with identity/reputation/alt/privacy/media/site-revision plans.
```

But not complete because:

```text
- Full-width site rendering still needs polish.
- Embed resolver still needs cleanup/generalization.
- Passport @username creation is not implemented.
- Real site creator username hydration is not implemented.
- Reputation/moderation display is not implemented.
- Alt passports are not implemented.
- Site editing/revisions are not implemented.
- .post/.comment/.article are not implemented.
- .video/.music are not implemented.
- Paid views are not implemented.
- Accounting→rewarder→wallet payout loop is not fully productized.
- Provider hosting/placement modes are not implemented.
```

### 9.2 First product-proof slice

Estimated:

```text
~88–93%
```

Slice means:

```text
CrabLink + ROC + b3 + image asset pages + named sites + root HTML + crab-image embeds.
```

Remaining gap for this slice:

```text
- Run/confirm check-chrome/package/codebundle after latest patches.
- Polish full-window layout.
- Add/manual checklist or smoke for <crab-image> site embed.
- Possibly extract embed resolver cleanup without changing behavior.
```

### 9.3 CrabLink beta readiness

Estimated:

```text
~55–65%
```

Strong:

```text
- Extension loads.
- Gateway settings exist.
- crab:// image and site flows are working.
- Paid image upload flow works.
- Site creation flow works.
- Root HTML store flow works.
- Image embeds render.
```

Still missing:

```text
- First-run passport creation UX.
- @username selection.
- Reliable ROC balance/nonce UX polish.
- Rich receipt history.
- Rich asset cards.
- Stable smoke scripts for full paid upload and site embed.
- Multi-browser packaging.
```

---

## 10. Suggested next-instance prompt

Use this as the next opening prompt:

```text
We are continuing RustyOnions / CrabLink NEXT_LEVEL work.

Use WEB3.MD, WEB3_2.MD, TODO_WEB3_2.MD, NEXT_LEVEL.MD, CODEBUNDLE_RS.md, ALLNOTES.MD, ALL_DOCS_COMBINED.MD, CODECHECK.md, CODECOMMENTS.MD, and CODEBUNDLE_CHROME_EXTENSION.md as project references.

Current status:
- Paid image upload path is green in CrabLink.
- Image asset pages render with safe gateway /o preview.
- Site creation/open flow is green.
- CrabLink can store custom HTML as a paid b3 root object.
- CrabLink can create a named site using that root CID.
- CrabLink can render named sites as sandboxed full-tab pages.
- CrabLink can render <crab-image src="crab://<hash>.image"> inside site HTML.
- crab://thedustyonion6 is the current proof that site-root HTML can reference an independent b3-backed image asset.
- The image-root guard prevents using an image CID as the site root CID.
- NEXT_LEVEL.MD has been updated to include passport @usernames, public profile manifests, reputation/moderation summaries, alt passports, privacy-honest alt ROC handling, media-lite, site revisions, and anti-spaghetti implementation ordering.
- Passports are identity/capability records, not wallets and not merely assets. A public profile/passport manifest may be b3-addressed.
- Do not promise private alt→main cash-out until a real privacy protocol exists.
- Preserve gateway-only CrabLink, no fake truth, no silent ROC spending, and all WEB3/ROC invariants.

Before code:
- Review CODECHECK.md.
- Use CODECOMMENTS.MD if full files are generated.
- Provide full paste-ready files with exact paths.
- Do not use stale bundles.
- Run/ask me to run:
  cd /Users/mymac/Desktop/crablink
  node --check extensions/chrome/src/page-site-root-upload.js && node --check extensions/chrome/src/page-site-render-mode.js && scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh

Recommended next task:
CrabLink-only layout polish and embed resolver cleanup:
1. Make rendered site content span the usable browser window cleanly.
2. Keep Site Manifest proof available but not dominant.
3. Keep <crab-image> working unchanged.
4. Extract/prepare an embed registry shape for future <crab-video>, <crab-audio>, <crab-article>, <crab-post>, and <crab-comment>.
```

---

## 11. Final success statement

This session proved something big:

```text
b3 content IDs are not just backend theory.
crab:// URLs are not just parser strings.
ROC paid actions are not just ledger tests.
CrabLink is not just a popup.
RustyOnions sites can reference independent b3 assets and render them in a browser-like UX.
```

The most important proof is:

```text
crab://thedustyonion6
```

That site proves the NEXT_LEVEL architecture in miniature:

```text
named site
→ b3 root HTML
→ embedded crab:// image reference
→ independent b3 image asset
→ gateway-resolved bytes
→ sandboxed browser rendering
```

That is the foundation for the creator web vision: portable b3 assets, manifest-backed attribution, public crab links, explicit ROC payments, site-owned reference graphs, and CrabLink as the human-facing browser layer.

```
```



### END NOTE - MAY 4 2026 - 19:00 CST



### BEGIN NOTE - MAY 4 2026 - 20:45 CST

Below is a comprehensive carry-over note set for the next instance. You can paste this into the next chat, into `NEXT_LEVEL` notes, or into your CrabLink project notes.

# RustyOnions / CrabLink NEXT_LEVEL Carry-Over Notes — May 4, 2026

## 0. Current north-star context

The active project direction is still governed by:

```text
NEXT_LEVEL.MD
WEB3.MD
WEB3_2.MD
TODO_WEB3_2.MD
WEB3_2_PRODUCT_ROUTE_CONTRACTS.md
CODEBUNDLE_RS.md
CODEBUNDLE_CHROME_EXTENSION.md
ALLNOTES.MD
ALL_DOCS_COMBINED.MD
CODECHECK.md
CODECOMMENTS.MD
```

`NEXT_LEVEL.MD` is now the active product-layer continuation after the earlier WEB3 / WEB3_2 work. The purpose is to turn the proven paid image + site + `<crab-image>` embed proof into a reusable creator web model:

```text
content-addressed creator web
+ reusable asset primitives
+ reference-graph sites
+ manifest-backed attribution
+ RON Passports with @usernames
+ reputation and moderation surfaces
+ anonymous/pseudonymous alt passports
+ privacy-honest alt-wallet handling
+ ROC payout routing
+ browser extension UX through CrabLink
```

Core invariants remain:

```text
- ROC is internal only.
- No ROX, Solana, bridge, liquidity, staking, exchange, or public settlement work yet.
- b3:<64 lowercase hex> remains canonical internal content ID.
- Public typed asset URLs use crab://<64 lowercase hex>.<asset_kind>.
- Named sites use crab://<site_name>.
- Sites store references and route maps; assets remain separate b3-backed objects.
- Wallet mutation goes through svc-wallet / gateway surfaces only.
- CrabLink must remain gateway-only.
- CrabLink does not fake wallet truth, receipt truth, profile truth, reputation truth, or moderation truth.
- Paid actions require explicit user confirmation.
- No silent spend.
- No public main↔alt linkage by default.
```

## 1. Important product URL rules

Public asset URL format is now:

```text
crab://<64 lowercase hex>.<asset_kind>
```

Examples:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

Named site URL format:

```text
crab://<site_name>
```

Known proof site:

```text
crab://thedustyonion6
```

Do **not** reintroduce:

```text
crab://b3/<hash>.<asset_kind>
```

Internal CIDs remain:

```text
b3:<64 lowercase hex>
```

## 2. What was accomplished in this session

This session was mostly **CrabLink Chrome extension** work, plus test/check/smoke hardening. We did **not** update RustyOnions Rust crates in this portion. The backend stack was already capable enough to support the flows; we hardened and proved the browser-client side and smoke/runbook gates.

The major achievements were:

```text
1. Added/verified creator proof UI on named site pages.
2. Fixed stale named-site iframe bug when navigating away.
3. Restored named-site render to full browser width.
4. Hid quick-nav buttons while viewing a named site.
5. Hardened static checker scripts without overmatching exact strings.
6. Added site create/open smoke.
7. Added one-command green-gate runner.
8. Fixed paid image smoke wallet idempotency key length.
9. Proved safe green gate.
10. Proved full mutating green gate with all optional gates enabled.
11. Updated docs/runbooks to freeze the milestone.
```

The latest full run ended with all optional gates enabled and passing: bootstrap, known-good raw preview, paid image upload, site create/open, named site resolver, and codebundle regeneration. 

## 3. Files changed or added in CrabLink during this work

### UI / renderer files

```text
extensions/chrome/src/page.html
extensions/chrome/src/page-site-render-mode.js
extensions/chrome/src/page-site-creator-proof.js
```

### Scripts

```text
scripts/check-chrome.sh
scripts/smoke-site-create-local.sh
scripts/smoke-local-gateway.sh
scripts/green-gate-local.sh
```

### Docs / runbooks

```text
extensions/chrome/README.md
extensions/chrome/test/manual-checklist.md
extensions/chrome/docs/GREEN_GATE_LOCAL.md
extensions/chrome/docs/NEXT_LEVEL_NEXT_BATCHES.md
```

### Regenerated bundle

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

## 4. Named site render work completed

We worked heavily on named-site rendering.

The goal was for a named site such as:

```text
crab://thedustyonion6
```

to render like a real page inside the CrabLink browser shell, not like JSON or a narrow preview card.

Current expected behavior:

```text
- CrabLink top browser bar remains visible.
- Named site content renders in a sandboxed iframe.
- Site content spans the browser viewport.
- Quick-nav buttons are hidden while viewing a named site.
- Site toolbar appears above the rendered page.
- Site toolbar includes:
  - site creator:
  - @username placeholder or backend-provided handle
  - reputation chip
  - moderator chip
  - Site Manifest button
- <crab-image src="crab://<hash>.image"> automatically hydrates.
- Image bytes load through svc-gateway /o.
- No PNG binary/IHDR/IDAT text appears.
- Navigating away removes the old iframe.
```

We hit and fixed a bug where after navigating from `crab://thedustyonion6` to `crab://site`, the old Dusty Onion iframe remained stuck on the page. The fix was to make `page-site-render-mode.js` explicitly clean up the injected site viewport when the current payload is not `omnigate.site-page.v1`.

We then hit and fixed a layout regression where the named-site content became too narrow and the quick-nav buttons still showed. The final fix restored full viewport width and hides `.quick-nav` while `body.crablink-site-full-view-mode` is active.

Manual no-regression check:

```text
crab://thedustyonion6
→ crab://site
```

Expected:

```text
The old named-site iframe disappears completely.
The crab://site creation page appears cleanly.
```

## 5. Creator proof UI completed as a frontend placeholder/hydration layer

A new module was introduced:

```text
extensions/chrome/src/page-site-creator-proof.js
```

Purpose:

```text
Add creator @username, reputation, and moderator score UI around named-site render pages without inventing backend truth.
```

Current UI target:

```text
site creator: @username   rep —   mod —   Site Manifest
```

Rules implemented:

```text
- If backend provides username/handle/profile fields, use those.
- If backend does not provide username, show @username placeholder.
- If backend does not provide reputation or moderator score, show dash/unknown.
- Do not invent reputation scores.
- Do not invent moderator scores.
- Do not create fake profile manifests.
- Clicking creator handle should eventually open profile route if backend provides it.
- If no profile route exists, show honest placeholder/status.
```

This aligns with NEXT_LEVEL direction: main passports should eventually have human `@username`s; alt passports can exist but must not publicly link to main identity by default; site creation should be tied to main identity/passport permissions.

## 6. `scripts/check-chrome.sh` was hardened

The static checker now validates:

```text
- Required Chrome extension files exist.
- Required shared schema/fixture files exist.
- Required smoke scripts exist.
- Manifest V3 is used.
- Omnibox keyword is crab.
- Permissions remain minimal.
- Host permissions are only local gateway hosts.
- Broad dangerous permissions are absent.
- page.html loads required modules.
- page modules include required route/client functions.
- page-site-render-mode.js still has sandbox/image hydration primitives.
- page-site-creator-proof.js still has creator/reputation/moderation placeholders.
- ronClient.js still has required gateway methods and idempotency helpers.
- storage.js remains schemaVersion 3.
- crab.js still handles canonical crab asset formatting.
- smoke-local-gateway.sh still covers image prepare/upload, wallet hold, raw preview capability.
- smoke-site-create-local.sh still covers site prepare, wallet hold, site create, named site lookup, named crab resolver.
- green-gate-local.sh exists and references the right child scripts.
- JSON schemas and fixtures parse.
- Fixtures still represent expected wallet/passport shape.
- Forbidden strings such as crab://b3/ and broad Chrome permission calls are absent.
```

Several checker bugs were fixed during this session. The checker had been too literal and failed because the code did not contain exact placeholder strings such as:

```text
crab://<hash>.<kind>
omnigate.asset-page.v1 inside generic schema placeholders
Math.random()
POST /assets/image/prepare as an exact human text token
/o/b3: as an exact token
```

Those were adjusted so the checker validates **capability and invariants**, not brittle exact documentation strings.

Important outcome:

```text
scripts/check-chrome.sh now passes.
```

## 7. `scripts/smoke-site-create-local.sh` was added and proved

New file:

```text
scripts/smoke-site-create-local.sh
```

Purpose:

```text
End-to-end opt-in site create/open smoke for CrabLink extension-facing gateway routes.
```

It proves:

```text
GET /healthz
GET /readyz
POST /sites/prepare
POST /wallet/hold
POST /sites
GET /sites/<site_name>
GET /crab/resolve?url=crab://<site_name>
GET /wallet/<account>/balance
```

Important fix during this session:

The original script sent the site create body to `/sites/prepare`, which caused:

```text
HTTP 400
invalid_site_prepare_request
site prepare request must be strict JSON
```

We fixed it by separating:

```text
build_site_prepare_body()
build_site_create_body()
```

Prepare body now uses fields like:

```text
site_name
files
payer_account
owner_passport_subject
owner_wallet_account
title
description
client_idempotency_key
```

Create body uses:

```text
site_name
root_document_cid
owner_passport_subject
owner_wallet_account
title
description
route_map
asset_map
```

The final site smoke passed, including named crab resolver.

Known passing site smoke proof from the session:

```text
/sites/prepare -> HTTP 200
/wallet/hold -> HTTP 200 after nonce retry
/sites -> HTTP 200
/sites/<site_name> -> HTTP 200
/crab/resolve?url=crab://<site_name> -> HTTP 200
/wallet/acct_dev/balance -> HTTP 200
CrabLink site create/open smoke passed.
```

## 8. `scripts/smoke-local-gateway.sh` was fixed and proved

Existing file:

```text
scripts/smoke-local-gateway.sh
```

Purpose:

```text
Local gateway smoke for extension-facing routes, paid image upload, and raw preview bytes.
```

It covers:

```text
GET /healthz
GET /readyz
GET /identity/me
GET /wallet/:account/balance
GET /b3/<sample>.image
GET /crab/resolve?url=crab://<sample>.image
GET /crab/resolve?url=crab://site
GET /crab/resolve?url=crab://image
GET /crab/resolve?url=crab://music
GET /crab/resolve?url=crab://article
POST /sites/prepare
POST /assets/image/prepare
optional POST /identity/passport/bootstrap
optional known-good raw preview
optional paid image upload
```

Important fix:

The paid image upload smoke initially failed after a nonce retry with:

```text
Idempotency-Key must be 1..=64 bytes
```

Root cause:

```text
The HTTP Idempotency-Key header and JSON idempotency_key field were too long.
```

Fix:

```text
Added compact idempotency helpers:
- corr_short()
- smoke_idempotency_key()

Shortened image hold idempotency keys:
- img-hold:<short_corr>:<nonce>
- img_hold_n<nonce>
- img_hold_r<expected_nonce>
```

Outcome:

The paid image smoke now passes even after wallet nonce conflict retry.

Paid image path proven:

```text
/assets/image/prepare
→ /wallet/hold with nonce retry
→ /assets/image
→ /crab/resolve?url=crab://<hash>.image
→ /o/b3:<hash>
→ raw byte match
→ wallet balance refresh
```

Latest known-good paid image URL generated/proven again:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

That asset returned exactly 68 raw bytes in the paid upload smoke and matched the uploaded tiny PNG fixture.

## 9. `scripts/green-gate-local.sh` was added and fully proved

New file:

```text
scripts/green-gate-local.sh
```

Purpose:

```text
One-command local green-gate runner for CrabLink.
```

Safe default:

```bash
scripts/green-gate-local.sh
```

This runs:

```text
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/smoke-local-gateway.sh
scripts/make_codebundle.sh
```

Safe default is non-mutating. It does not intentionally spend ROC.

Full mutating proof:

```bash
CRABLINK_GREEN_RUN_BOOTSTRAP=1 \
CRABLINK_GREEN_RUN_KNOWN_GOOD=1 \
CRABLINK_GREEN_MUTATING=1 \
scripts/green-gate-local.sh
```

This runs:

```text
static checks
Chrome package build
non-mutating gateway smoke
passport/bootstrap smoke
known-good raw preview smoke
paid image upload smoke
site create/open smoke
codebundle regeneration
```

The full proof passed. The latest uploaded log shows the final full gate ended with:

```text
CrabLink local green gate passed.

Optional mutating gates run:
- bootstrap:         1
- known-good raw:    1
- paid image upload: 1
- site create/open:  1
```

The uploaded log also proves known-good raw preview returned 121,927 bytes for:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

and paid image upload returned a 68-byte raw object for:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

## 10. Current working proof commands

### Safe default gate

```bash
cd /Users/mymac/Desktop/crablink
scripts/green-gate-local.sh
```

### Full mutating proof

```bash
cd /Users/mymac/Desktop/crablink

CRABLINK_GREEN_RUN_BOOTSTRAP=1 \
CRABLINK_GREEN_RUN_KNOWN_GOOD=1 \
CRABLINK_GREEN_MUTATING=1 \
scripts/green-gate-local.sh
```

### Individual static/package checks

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh && scripts/package-chrome.sh
```

### Non-mutating gateway smoke

```bash
cd /Users/mymac/Desktop/crablink
scripts/smoke-local-gateway.sh
```

### Known-good raw preview smoke

```bash
cd /Users/mymac/Desktop/crablink
CRABLINK_SMOKE_RUN_KNOWN_GOOD=1 scripts/smoke-local-gateway.sh
```

### Paid image upload smoke

```bash
cd /Users/mymac/Desktop/crablink
CRABLINK_SMOKE_EXPECT_IMAGE_PRICE=25 CRABLINK_SMOKE_RUN_UPLOAD=1 scripts/smoke-local-gateway.sh
```

### Site create/open smoke

```bash
cd /Users/mymac/Desktop/crablink
CRABLINK_SITE_REQUIRE_CRAB_RESOLVE=1 scripts/smoke-site-create-local.sh
```

### Codebundle regeneration

```bash
cd /Users/mymac/Desktop/crablink
scripts/make_codebundle.sh
```

## 11. Current RustyOnions backend startup reminder

Start wallet first:

```bash
cd /Users/mymac/Desktop/RustyOnions
RUST_LOG=info SVC_WALLET_ADDR=127.0.0.1:8088 cargo run -p svc-wallet
```

Then start the CrabLink WEB3 stack:

```bash
cd /Users/mymac/Desktop/RustyOnions

ECON_PATH="$(pwd)/configs/roc-economics.dev.toml"

env \
  OMNIGATE_WALLET_BASE_URL=http://127.0.0.1:8088 \
  OMNIGATE_WALLET_BEARER=dev \
  RON_STORAGE_ROC_ECONOMICS_PATH="$ECON_PATH" \
  RON_STORAGE_ROC_ECONOMICS_ACTION=paid_storage_put \
  SVC_GATEWAY_STORAGE_BASE_URL=http://127.0.0.1:5303 \
  scripts/web3_crablink_dev_stack.sh
```

Expected gateway:

```text
http://127.0.0.1:8090
```

Important:

```text
Wallet startup order matters.
If gateway/omnigate starts before svc-wallet, identity/balance display can degrade or show fallback state.
Fallback display must not be treated as spend authority.
```

## 12. Current known proof assets and site

Known-good reference image used by `<crab-image>` proof:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

Known-good paid image asset:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Known-good named site:

```text
crab://thedustyonion6
```

Latest smoke-created site examples from this session included names like:

```text
crablink-site-smoke-20260504-200307
crablink-site-smoke-20260504-200316
```

These are dev smoke artifacts.

## 13. Docs updated / proposed

We added or drafted docs to freeze the milestone:

```text
extensions/chrome/README.md
extensions/chrome/docs/GREEN_GATE_LOCAL.md
extensions/chrome/docs/NEXT_LEVEL_NEXT_BATCHES.md
extensions/chrome/test/manual-checklist.md
```

Purpose:

```text
- Record safe green gate.
- Record full mutating green gate.
- Record known proof URLs.
- Record paid image proof path.
- Record site create/open proof path.
- Record no-regression checks.
- Establish next batch order.
```

If the user has not yet pasted the docs batch, the next instance should confirm whether the docs were applied before continuing.

## 14. Current NEXT_LEVEL completion estimate

For the **current foundation slice** of NEXT_LEVEL — meaning image/site/passport/gateway/CrabLink proof, not the whole long-term creator economy — we are now around:

```text
85%–90% complete for the image/site/reference-graph CrabLink proof slice
```

What is green:

```text
- Paid image upload.
- Paid site create/open.
- Named crab:// site resolver.
- Known-good raw preview.
- Sandboxed named-site rendering.
- <crab-image> embed hydration.
- Full local green-gate script.
- Static checks and packaging.
- Basic creator toolbar placeholder.
```

What is not done yet:

```text
- Real @username reservation/confirmation backend contract.
- Real public profile manifest route.
- Real site creator username hydration from backend truth.
- Real reputation score backend truth.
- Real moderator score/backend roles.
- Alt passport UX.
- Post/comment/article asset primitives.
- Receipt history UI polish.
- Polished first-run onboarding.
```

For **all of NEXT_LEVEL.MD**, including @usernames, profiles, reputation, moderator roles, alt passports, articles/posts/comments, and creator economy routing, the overall completion is closer to:

```text
35%–45%
```

But the foundation is now strong and green.

## 15. Recommended next session order

The next session should **not** jump directly into `.post`, `.comment`, `.article`, or reputation math. The safer order is:

```text
1. Confirm docs/checkpoint hardening was pasted and green.
2. Update NEXT_LEVEL.MD or a carryover notes file to mark CrabLink green gate proven.
3. Start Batch B: First-run @username UX scaffold.
4. Keep @username as pending/local unless backend confirms it.
5. Add optional requested_username/requested_handle to extension bootstrap request only if backend supports or safely ignores it.
6. Add UI states for:
   - no passport
   - create passport
   - requested @username
   - backend confirmed @username
7. Do not claim username ownership until backend returns it.
8. Keep full green gate passing.
```

Recommended next feature batch:

```text
Batch B — First-run @username UX scaffold
```

Goal:

```text
When creating a first passport in CrabLink, user can choose/request an @username.
```

Important rule:

```text
If backend does not yet support username reservation, CrabLink may store/display it only as local draft/pending.
It must not display it as confirmed public identity.
```

Likely files for Batch B:

```text
extensions/chrome/src/storage.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
shared/schemas/extension-settings.schema.json
shared/schemas/passport-bootstrap.schema.json
shared/fixtures/passport-bootstrap.sample.json
scripts/check-chrome.sh
```

Potential fields:

```text
requested_username
requested_handle
username
handle
profile_crab_url
public_profile_cid
username_status
```

Suggested local validation:

```text
@username must:
- start with a letter or number
- be lowercase normalized
- allow letters, numbers, underscore, hyphen, dot
- reject empty
- reject reserved built-ins like site, image, music, article, post, comment, admin, wallet, passport
- reject consecutive dots
- reject too-short / too-long values
```

Possible local statuses:

```text
local_draft
requested
confirmed
rejected
unavailable
backend_unknown
```

## 16. Backend contract gaps for upcoming @username work

Before implementing fully truthful @username identity, backend may need support in one or more routes:

```text
POST /identity/passport/bootstrap
GET /identity/me
GET /crab/resolve?url=crab://@username
GET /crab/resolve?url=crab://profile/@username
GET /profiles/:username
```

Potential response fields:

```json
{
  "passport": {
    "subject": "passport:main:dev",
    "kind": "main",
    "username": "@alice",
    "username_status": "confirmed",
    "public_profile_cid": "b3:<hash>",
    "profile_crab_url": "crab://@alice"
  },
  "capabilities": {
    "can_create_site": true,
    "can_comment": true,
    "can_moderate": true,
    "can_spend": false
  }
}
```

Need to avoid false claims:

```text
- Do not say username is owned unless backend confirms.
- Do not say profile is published unless backend gives CID or profile URL.
- Do not show reputation score unless backend publishes score.
- Do not show moderator score unless backend publishes score.
```

## 17. Site creator identity next work

Current site toolbar shows placeholder:

```text
site creator: @username
rep —
mod —
```

Next steps:

```text
1. Read creator username fields from site page payload if backend provides them.
2. Read public profile route if backend provides profile_crab_url.
3. Show confirmed username only when backend provides it.
4. Keep @username placeholder otherwise.
5. Keep rep/mod as dash unless backend provides real values.
```

Candidate payload fields to support:

```text
payload.creator.username
payload.creator.handle
payload.creator.profile_crab_url
payload.owner.username
payload.owner.handle
payload.passport.username
payload.passport.handle
payload.public_profile.username
payload.publicProfile.handle
payload.owner_username
payload.creator_username
```

Reputation/moderation fields already searched by the frontend placeholder module:

```text
creator.reputation_score
creator.reputationScore
creator.reputation.score
owner.reputation_score
passport.reputation_score
public_profile.reputation_score
reputation_score
moderator_score
moderation_score
```

But these must remain display-only.

## 18. Profile/passport page next work

After @username UX scaffold, next likely batch:

```text
Read-only profile/passport page placeholder
```

Goal:

```text
Clicking site creator @username should open a read-only public profile if backend provides a route.
```

Potential public routes:

```text
crab://@username
crab://profile/@username
crab://<profile_manifest_hash>.profile
```

Rules:

```text
- Public profile pages are read-only.
- No spend authority shown on public profile.
- No private alt mapping shown.
- No private wallet details shown.
- No fake reputation.
- No fake moderation score.
```

Likely new files:

```text
shared/schemas/profile-page.schema.json
shared/fixtures/profile-page.sample.json
```

Likely changed files:

```text
extensions/chrome/src/ronClient.js
extensions/chrome/src/page.js
extensions/chrome/src/page-product-preview.js
extensions/chrome/src/page-site-creator-proof.js
scripts/check-chrome.sh
```

## 19. Reputation/moderator score work is not ready until backend truth exists

Do not compute scores locally in CrabLink.

Allowed:

```text
rep —
mod —
```

Allowed if backend provides score:

```text
rep 42
mod 7
```

Not allowed:

```text
fake score 100
fake five-star rating
local browser-only reputation
local moderation power claims
```

Need backend truth source:

```text
public profile manifest
passport public summary
site payload
moderation policy payload
```

## 20. Post/comment/article primitives should wait

Do not start `.post`, `.comment`, or `.article` until the full green gate keeps passing after restart.

Suggested order:

```text
1. .article
2. .post
3. .comment
```

Do not start with video/music streaming yet. Those need range/streaming design and are more complex.

For each new primitive:

```text
- Create content object.
- Compute canonical b3 CID.
- Create asset manifest.
- Public URL crab://<hash>.<kind>.
- Store references in site/thread/page manifests.
- Enforce paid flow if publishing/storage requires ROC.
- Expose raw bytes only through gateway.
- Keep storage bytes keyed by b3 CID only.
```

## 21. What not to do next

Avoid these until the backend/product design is ready:

```text
- External settlement.
- ROX.
- Solana.
- Public bridge.
- Liquidity/staking/exchange logic.
- Main↔alt public linking.
- Fake privacy claims.
- Local key custody.
- Seed phrase UX.
- Browser-stored long-lived spend authority.
- Reputation computed locally.
- Moderator privileges computed locally.
- Clearnet attribution claims.
- Video/music streaming before article/post/comment.
```

## 22. Important debugging lessons from this session

### Checker overmatching

Several errors were caused by checker scripts requiring exact text tokens instead of real capability. Future checks should avoid brittle string requirements unless the exact string is an actual invariant.

Examples of bad overmatching encountered:

```text
crab.js missing token: crab://<hash>.<kind>
asset-page.schema.json missing token: omnigate.asset-page.v1
ronClient must not include Math.random()
smoke-local-gateway.sh missing token: POST /assets/image/prepare
smoke-local-gateway.sh missing token: /o/b3:
```

Correct approach:

```text
Check for behavior/capability and important function names.
Do not require exact prose/comment strings.
Do not ban Math.random for correlation IDs if idempotency remains stable.
```

### Strict JSON

`/sites/prepare` requires strict JSON. Do not send create-body fields to prepare.

Bad prepare fields:

```text
root_document_cid
route_map
asset_map
```

Good prepare fields:

```text
site_name
files
payer_account
owner_passport_subject
owner_wallet_account
title
description
client_idempotency_key
```

### Idempotency key length

Wallet and gateway idempotency keys must be compact.

Avoid long keys like:

```text
crablink-smoke:image:paid-upload:hold:<long_timestamp_prefix>:<nonce>
```

Use compact keys like:

```text
img-hold:<short_corr>:<nonce>
cl:<short_corr>:<name>
```

### Nonce conflicts are expected

Wallet nonce conflicts are normal during repeated dev runs.

Expected behavior:

```text
HTTP 409 NONCE_CONFLICT
retry once with backend-provided expected nonce
```

Both paid image and site smokes now support nonce retry and proved it.

## 23. Current “definition of green” before next feature work

Before touching @username/profile/reputation/post/comment/article features, run:

```bash
cd /Users/mymac/Desktop/crablink

CRABLINK_GREEN_RUN_BOOTSTRAP=1 \
CRABLINK_GREEN_RUN_KNOWN_GOOD=1 \
CRABLINK_GREEN_MUTATING=1 \
scripts/green-gate-local.sh
```

Then manually check:

```text
crab://thedustyonion6
→ crab://site
```

Expected:

```text
- No stale iframe.
- Full-width site render.
- Quick-nav hidden on named site.
- Site creator toolbar visible.
- Site Manifest works.
- Embedded image loads.
- No binary text regression.
```

## 24. Summary of current project status

CrabLink has now crossed a major proof threshold.

What we have:

```text
- Chrome extension loads.
- Popup/options/page shell exist.
- Local gateway config works.
- Identity/balance display works.
- Built-in pages work.
- Paid image upload works.
- Image asset page works.
- Raw image preview works.
- Named site creation works.
- Named site resolver works.
- Sandboxed named site render works.
- <crab-image> reference graph works.
- Creator toolbar placeholder works.
- Full safe and mutating green gates pass.
```

Why this matters:

```text
RustyOnions now has a working proof of a content-addressed creator-web loop:
passport context
→ wallet balance
→ prepare
→ hold
→ publish image/site
→ resolve crab URL
→ hydrate manifest
→ render content
→ verify raw b3 bytes
→ refresh wallet state
```

That is the foundation for NEXT_LEVEL:

```text
@usernames
public profile manifests
site creator identity
reputation/moderation summaries
post/comment/article primitives
creator payout routing
reference-graph sites
```

## 25. Recommended first prompt for next instance

Use something like this in the next chat:

```text
We are continuing RustyOnions / CrabLink NEXT_LEVEL work. The full CrabLink local green gate passed with bootstrap, known-good raw preview, paid image upload, site create/open, named crab resolver, and codebundle regeneration. We should now begin Batch B from NEXT_LEVEL_NEXT_BATCHES: first-run @username UX scaffold. Keep CrabLink gateway-only and do not fake backend username/profile/reputation truth. Please review CODEBUNDLE_CHROME_EXTENSION.md, NEXT_LEVEL.MD, and the carryover notes, then provide the next batch of full paste-ready files.
```

## 26. Likely next batch file list

For Batch B, expect files around:

```text
extensions/chrome/src/storage.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
shared/schemas/extension-settings.schema.json
shared/schemas/passport-bootstrap.schema.json
shared/fixtures/passport-bootstrap.sample.json
scripts/check-chrome.sh
```

Possible first batch should be conservative:

```text
- Add username draft/pending fields to storage.
- Add local username validation helper.
- Add UI input for requested @username during passport create.
- Send requested username only if feature flag says to.
- Display backend-confirmed username only when returned by backend.
- Keep all unknown profile/reputation values honest.
- Keep green gate passing.
```

## 27. Final state of this session

This session ended in a highly successful state.

The latest full proof passed:

```text
CRABLINK_GREEN_RUN_BOOTSTRAP=1
CRABLINK_GREEN_RUN_KNOWN_GOOD=1
CRABLINK_GREEN_MUTATING=1
scripts/green-gate-local.sh
```

Final reported result:

```text
CrabLink local green gate passed.

Optional mutating gates run:
- bootstrap:         1
- known-good raw:    1
- paid image upload: 1
- site create/open:  1
```

This is a major milestone. The next instance should treat the CrabLink image/site foundation as green and preserve it while starting username/profile work.


### END NOTE - MAY 4 2026 - 20:45 CST



### BEGIN NOTE - MAY 5 2026 - 12:25 CST



# CrabLink / RustyOnions NEXT_LEVEL Carryover Notes — May 5, 2026 Session

## 0. Session outcome summary

This was a **major CrabLink product-polish and NEXT_LEVEL UX session**. We did **not** intentionally work on RustyOnions Rust crates in this session. The work was focused on the separate `crablink` Chrome extension repo and the full-tab CrabLink browser UX.

The main achievement: **CrabLink now feels much closer to an actual RON browser/client instead of a popup extension.**

We moved the extension toward the NEXT_LEVEL direction: RON Passports, `@username` display, creator identity surfaces, read-only proof modals, and manifest-backed site proof display, without breaking the core RustyOnions boundaries. This aligns with NEXT_LEVEL’s goal of turning the proven paid image + site + `<crab-image>` pipeline into reusable creator primitives, identity/display primitives, reputation/moderation surfaces, and reference-graph sites. 

The latest uploaded CrabLink codebundle was generated from `/Users/mymac/Desktop/crablink` and includes the Chrome extension files, shared schemas/fixtures, and relevant scripts for the current working state. 

---

## 1. Current project north star

The active product blueprint moving forward is:

```text
NEXT_LEVEL.MD
```

NEXT_LEVEL builds on the WEB3 / WEB3_2 foundation and starts from the proven checkpoint:

```text
1. Paid image asset path works.
2. Site creation/open flow works.
3. CrabLink renders named crab:// sites.
4. CrabLink can render a site root HTML document.
5. CrabLink can render <crab-image src="crab://<hash>.image">.
6. The site root stores only an image reference.
7. The image remains its own b3-backed asset.
8. The guard prevents accidentally using an image CID as the site root CID.
9. crab://thedustyonion6 proves the first working reference-graph embed primitive.
```

Strategic model:

```text
Site = manifest + routes + policies + references + revisions
Post = b3 asset + manifest
Comment = b3 asset + manifest
Article = b3 asset + manifest
Image = b3 asset + manifest
Video = b3 asset + manifest + future streaming/range plan
Music = b3 asset + manifest + future streaming/range plan
Profile = passport-linked read-only page / public manifest
Passport = identity/capability record + optional public profile manifest
Alt Passport = separate pseudonymous identity + separate wallet/account + no public main linkage
```

Important invariants remain:

```text
- ROC remains internal.
- b3 hashes remain canonical.
- crab:// URLs are product/user-facing pointers.
- Wallet remains the mutation front-door.
- Ledger remains economic truth.
- Storage stores bytes only.
- Sites store references.
- Passports are identities/capability records, not wallets.
- Public profile manifests may be b3-addressed.
- No arbitrary executable linked code.
- No fake profile/reputation/moderator truth.
- No silent ROC spending.
- No private main↔alt linkage by default.
```

---

## 2. Repository worked on

This session worked on:

```text
/Users/mymac/Desktop/crablink
```

Primary target:

```text
extensions/chrome
```

Important repo/product naming:

```text
Repo: crablink
Product/browser client: CrabLink
Extension: CrabLink Extension for Chrome
```

RustyOnions remains the backend/substrate/value-plane repo. CrabLink remains a separate browser-client repo. This separation is correct and should be preserved.

---

## 3. RustyOnions crates touched this session

No RustyOnions Rust crates were intentionally edited in this session.

Crates not touched directly:

```text
svc-gateway
omnigate
ron-proto
ron-naming
svc-index
svc-storage
svc-wallet
ron-ledger
ron-accounting
svc-rewarder
svc-passport
```

The session was CrabLink-only.

However, CrabLink changes were designed around existing RustyOnions route contracts and NEXT_LEVEL direction:

```text
GET  /healthz
GET  /readyz
GET  /identity/me
GET  /wallet/:account/balance
GET  /crab/resolve?url=...
GET  /b3/:hash.kind
GET  /sites/:name
POST /identity/passport/bootstrap
POST /assets/image/prepare
POST /assets/image
POST /sites/prepare
POST /wallet/hold
POST /sites
```

---

## 4. Major accomplishments this session

### 4.1 Extension icon now opens the full CrabLink browser

Problem at start:

```text
Clicking the CrabLink extension icon opened a small popup panel.
The user did not want that.
The user wanted clicking the icon to go directly to the full CrabLink browser tab with the URL bar.
```

What we did:

```text
- Removed/neutralized the old popup-as-product-control behavior.
- Ensured manifest no longer depends on default_popup for the real product surface.
- Added chrome.action.onClicked in background.js.
- Converted popup.html/popup.js into an emergency launcher.
- Even if Chrome still invoked popup.html due to extension caching or loaded-source quirks, popup.html now immediately opens src/page.html?url=crab://site and closes itself.
```

Result:

```text
Clicking the CrabLink extension icon now goes straight to the full CrabLink browser page.
This is working exactly as the user wanted.
```

Important files involved:

```text
extensions/chrome/manifest.json
extensions/chrome/src/background.js
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
scripts/check-chrome.sh
```

Manual verification:

```text
User confirmed: “I tested it out and its working exactly as I want it to!”
```

---

### 4.2 Full-tab browser remains the main product surface

Current intended product surface:

```text
extensions/chrome/src/page.html
extensions/chrome/src/page.js
extensions/chrome/src/page.css
```

The popup is no longer the main UX. It is only a fallback launcher.

Current product behavior:

```text
- Opens full CrabLink browser tab.
- Has CrabLink URL/address bar.
- Supports crab://site, crab://image, named sites, and b3 asset pages.
- Shows ROC balance chip.
- Shows Passport button.
- Shows Settings gear.
- Can render named sites such as crab://thedustyonion6.
- Can render site root HTML.
- Can render <crab-image> embeds from typed crab image URLs.
```

---

### 4.3 Settings page redesigned into a real dashboard-style page

Problem:

```text
The settings page was visually sloppy.
It was condensed into one column on the left or stretched awkwardly.
Window proportions were off.
Bottom content was cut off behind the sticky save bar.
```

What we did:

```text
- Rebuilt options.html into a dashboard layout.
- Added a hero/header section.
- Added a left sidebar with Current Identity summary and Safety Rules.
- Added a main content area for Gateway, Identity Labels, Dev Token, and Safety controls.
- Added a fixed/sticky save bar.
- Added enough bottom padding / scroll padding so content is no longer hidden behind the save bar.
```

Key UX improvements:

```text
- Balanced two-column layout on desktop.
- Responsive layout for smaller widths.
- Current identity is easy to scan.
- Gateway settings are visually separated from identity settings.
- Dev token and safety controls are visually grouped.
- Save/Reset actions are persistent but no longer block bottom content.
```

Important files involved:

```text
extensions/chrome/src/options.html
extensions/chrome/src/styles.css
extensions/chrome/src/options.js
```

Manual verification:

```text
User confirmed the settings page looked good after padding fix:
“perfect! thank you.”
```

---

### 4.4 First-run / local @username scaffold added

We added an honest local `@username` scaffold.

Current state:

```text
@skinnycrabby exists locally as a requested/local draft username.
It is not yet backend-confirmed.
CrabLink displays this honestly.
```

Important behavior:

```text
- The local username draft can be shown in UI.
- It stays marked local_draft / not backend confirmed.
- CrabLink does not pretend the backend has reserved the handle.
- CrabLink does not pretend a public profile route exists yet.
```

Storage/settings concepts added or used:

```text
requestedUsername
requestedHandle
username
handle
usernameStatus
profileCrabUrl
publicProfileCid
usernameUpdatedAt
```

Allowed/honest status vocabulary:

```text
local_draft
requested
confirmed
rejected
unavailable
backend_unknown
```

Important files involved:

```text
extensions/chrome/src/storage.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/page.js
shared/schemas/extension-settings.schema.json
shared/schemas/passport-bootstrap.schema.json
shared/fixtures/passport-bootstrap.sample.json
```

Current manual state seen in UI:

```text
@skinnycrabby
local draft; not backend confirmed
```

This matches NEXT_LEVEL’s identity direction without jumping ahead to a backend `svc-passport` uniqueness/reservation implementation.

---

### 4.5 Passport drawer improved

Problem:

```text
The full-tab Passport drawer did not show the username at first.
Then it showed @USERNAME as the label, which the user did not want.
The user wanted:
- USERNAME label
- @skinnycrabby value
- @skinnycrabby in green
- label color matching PASSPORT/GATEWAY style
```

What we did:

```text
- Added Username row to Passport drawer.
- Moved USERNAME to the top position.
- Kept PASSPORT second.
- Moved GATEWAY third.
- Kept WALLET / ROC / LEDGER below.
- Styled @skinnycrabby green.
- Styled USERNAME label like PASSPORT/GATEWAY label.
- Preserved the status text:
  local draft; not backend confirmed
```

Current Passport drawer order:

```text
USERNAME
@skinnycrabby
local draft; not backend confirmed

PASSPORT
passport:main:dev

GATEWAY
http://127.0.0.1:8090

WALLET
acct_dev

ROC
1451 ROC

LEDGER
ledger-backed
```

Important file involved:

```text
extensions/chrome/src/page.js
```

Current UI status:

```text
User was satisfied with the Passport drawer and requested only the small label tweak.
```

---

### 4.6 Site creator username chip and creator proof popup added

Problem/opportunity:

```text
Sites now show a creator username placeholder/chip.
The user wanted creator @username to be useful/clickable and eventually point to passport/profile data.
```

What we implemented:

```text
- Added a site creator chip:
  site creator: @username
- Added reputation and moderator score chips:
  rep —
  mod —
- Made creator username clickable.
- Clicking the creator username opens a centered read-only creator proof modal.
```

Current modal title/state:

```text
READ-ONLY CREATOR PROOF
@username
Local read-only proof only; backend has not published a profile route yet.
```

Current creator proof modal fields:

```text
Username
Username source
Passport
Wallet label
Profile route
Reputation
Moderator
Site role
```

Current behavior is intentionally honest:

```text
- If no backend profile route is published, it says not published.
- If no reputation score is published, it says not published.
- If no moderator score is published, it says not published.
- It does not invent scores.
- It does not infer private passport keys.
- It does not infer wallet spend authority.
- It does not infer main↔alt linkage.
```

Important file involved:

```text
extensions/chrome/src/page-site-creator-proof.js
```

Manual verification:

```text
User liked the popup:
“I like this popup…”
```

---

### 4.7 Site Manifest button now opens a modal instead of appending inline form/details

Problem:

```text
The Site Manifest button expanded or revealed manifest/proof content at the bottom of the webpage.
This cluttered the site page and felt inconsistent with the new creator proof modal.
```

User request:

```text
Make Site Manifest pop up the same way as the creator proof popup.
Do not add it to the bottom of the webpage.
```

What we implemented:

```text
- Intercepted the Site Manifest button.
- Prevented the old inline details expansion.
- Hid the old inline manifest/details section.
- Added a centered Site Manifest modal.
```

Current Site Manifest modal fields:

```text
Crab URL
Site name
Root document CID
Manifest CID
Manifest status
Owner passport
Owner wallet
Creator
Payout account
Payout action
Routes
Assets
Receipts
Gateway route
```

Additional modal sections:

```text
Route map
Asset map
Root document source
Developer JSON
```

Copy actions added:

```text
Copy Site URL
Copy Root CID
Copy Manifest CID
Copy Manifest JSON
```

Security/architecture:

```text
- Modal is read-only.
- No backend mutation.
- No storage/index/wallet/ledger mutation.
- No fake manifest truth.
- Uses DTO/developer JSON/root-source preview already available to CrabLink.
```

Important file involved:

```text
extensions/chrome/src/page-site-creator-proof.js
```

Manual verification:

```text
User confirmed:
“excellent! very happy with the work we accomplished in this session.”
```

---

### 4.8 check-chrome.sh improved and false positives fixed

During the session, `scripts/check-chrome.sh` caught or falsely flagged several things.

Issues encountered:

```text
- page.js missing token: crab://site
- page-product-preview.js missing token: prepare
```

These were checker false-negatives because the architecture had evolved:

```text
- page.js imports HOME_PAGE_URL instead of containing literal crab://site.
- page-product-preview.js is preview/rendering logic and does not need literal prepare text.
```

What we did:

```text
- Adjusted check script to inspect page-constants.js for crab://site.
- Adjusted check script to check page-product-preview.js for asset/site preview invariants instead of “prepare”.
- Added checks for popup launcher behavior.
- Added checks for no default_popup.
- Added checks for chrome.action.onClicked.
- Added checks for full browser page modules.
- Added checks for local-only host permissions.
- Added checks against risky Chrome permissions and old crab://b3 format.
```

Important file involved:

```text
scripts/check-chrome.sh
```

Final command passed:

```bash
scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh
```

The user confirmed everything passed before later UI work.

---

### 4.9 package/check/codebundle workflow stabilized

Current preferred command:

```bash
scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh
```

Important note:

```text
Use && so package/codebundle only run if checks pass.
Earlier, running commands line-by-line allowed package-chrome.sh to run even after check-chrome.sh failed.
```

Current package output:

```text
dist/crablink-extension-chrome.zip
```

Current codebundle:

```text
CODEBUNDLE_CHROME_EXTENSION.md
```

The latest uploaded codebundle includes the current Chrome extension files, shared helpers, schemas, fixtures, and scripts. 

---

## 5. Current known working UX

### 5.1 Extension icon

Expected:

```text
Click CrabLink extension icon.
A full browser tab opens directly.
It goes to crab://site or last CrabLink URL.
No little control popup is the main experience anymore.
```

Current status:

```text
Working exactly as desired.
```

### 5.2 CrabLink browser page

Expected:

```text
- Top browser bar with CrabLink logo.
- Back/forward/home buttons.
- Address input.
- Go button.
- Refresh button.
- ROC balance chip.
- Passport button.
- Settings gear.
```

Current status:

```text
Working.
```

### 5.3 Passport drawer

Expected:

```text
- USERNAME at top.
- @skinnycrabby shown in green.
- Local draft / not backend confirmed status visible.
- Passport, Gateway, Wallet, ROC, Ledger visible.
- Check Node, Check Passport, Refresh Balance buttons visible.
```

Current status:

```text
Working.
```

### 5.4 Settings page

Expected:

```text
- Full-window dashboard layout.
- Current Identity sidebar.
- Gateway card.
- Identity Labels card.
- Dev Token card.
- Safety card.
- Sticky save bar.
- Enough bottom scroll padding.
```

Current status:

```text
Working and visually improved.
```

### 5.5 Creator proof modal

Expected:

```text
Click site creator @username.
Creator proof modal opens.
No fake profile/reputation/moderator claims.
```

Current status:

```text
Working.
```

### 5.6 Site Manifest modal

Expected:

```text
Click Site Manifest.
Centered modal opens.
Inline bottom-of-page manifest/details section stays hidden.
```

Current status:

```text
Working.
```

---

## 6. Important currently known runtime/account state

The user noticed ROC balance had dropped.

Observed current balance:

```text
1451 ROC
```

Known prior context:

```text
The account previously had 1776 ROC from starter grant/bootstrap.
Paid image mint/upload and site creation flows deducted/captured ROC.
A drop in ROC after site/image creation is expected if hold/capture completed.
```

Current wallet account:

```text
acct_dev
```

Current passport:

```text
passport:main:dev
```

Current local username draft:

```text
@skinnycrabby
```

Current username status:

```text
local_draft
not backend confirmed
```

Current known test site:

```text
crab://thedustyonion6
```

Current proof significance:

```text
crab://thedustyonion6 proves the reference-graph site primitive:
site root HTML references an independently b3-backed image through <crab-image>.
```

---

## 7. Files changed or heavily involved this session

Most likely changed files in CrabLink:

```text
extensions/chrome/manifest.json
extensions/chrome/src/background.js
extensions/chrome/src/popup.html
extensions/chrome/src/popup.js
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
extensions/chrome/src/page.js
extensions/chrome/src/page-site-creator-proof.js
extensions/chrome/src/ronClient.js
extensions/chrome/src/storage.js
shared/schemas/extension-settings.schema.json
shared/schemas/passport-bootstrap.schema.json
shared/fixtures/passport-bootstrap.sample.json
scripts/check-chrome.sh
```

Not all of these may have changed in the final state after later overwrites, but these are the major files touched during the session.

Most important final-state files to inspect first next session:

```text
extensions/chrome/src/page.js
extensions/chrome/src/page-site-creator-proof.js
extensions/chrome/src/options.html
extensions/chrome/src/styles.css
extensions/chrome/src/background.js
extensions/chrome/src/popup.js
scripts/check-chrome.sh
```

---

## 8. Design decisions made this session

### 8.1 Popup is not the browser

Decision:

```text
The little Chrome popup is no longer the main UX.
The extension icon should launch the full CrabLink browser tab.
```

Keep this.

The popup may remain only as:

```text
- emergency launcher
- fallback
- debug-only artifact
```

### 8.2 Full-tab browser is the product

Decision:

```text
All meaningful browsing should happen in the full-tab page.html/page.js browser.
```

### 8.3 Settings should be full-window dashboard

Decision:

```text
Settings page should not look like a popup stretched sideways.
It should be a real dashboard/control panel.
```

### 8.4 Username is a display/human pointer, not canonical truth

Decision:

```text
@skinnycrabby may be shown as a local requested handle.
But it must remain local_draft / not backend confirmed until backend supports reservation/confirmation.
```

### 8.5 Creator profile proof must be honest

Decision:

```text
Clicking a site creator username opens useful read-only proof.
But no fake profile, reputation, moderator score, wallet authority, or private identity linkage is invented.
```

### 8.6 Manifest proof should be modal

Decision:

```text
Site Manifest should open a centered read-only modal.
It should not append proof/details to the bottom of the rendered site page.
```

---

## 9. Current limitations / honest gaps

### 9.1 @username is local draft only

Current state:

```text
@skinnycrabby is locally requested/displayed.
There is no completed backend uniqueness/reservation claim yet.
```

Needs future backend work:

```text
svc-passport or equivalent backend route to reserve/confirm @username
public profile/passport manifest route
profile_crab_url or public_profile_cid in identity responses
```

### 9.2 Creator proof uses placeholder unless backend DTO includes creator fields

Current site creator currently appears as:

```text
@username
placeholder; not backend confirmed
```

Why:

```text
Site page DTO does not yet publish real creator username/profile fields.
CrabLink correctly refuses to invent them.
```

Needs future backend DTO work:

```text
creator.username
creator.handle
creator.profile_crab_url
creator.passport_subject
creator.wallet_account
creator.reputation_score
creator.moderator_score
```

or equivalent fields.

### 9.3 Reputation and moderator scores are placeholders

Current state:

```text
rep —
mod —
```

Needed later:

```text
- Decide reputation score model.
- Decide moderator score model.
- Decide whether global score, site-scoped score, or both.
- Decide event inputs and anti-gaming rules.
- Add DTO fields only after backend has truthful values.
```

### 9.4 Profile route not published yet

Current state:

```text
Profile route: not published
No Profile Route Yet button disabled
```

Needed later:

```text
crab://@username
crab://profile/@username
or crab://<profile-manifest-hash>.profile
```

Need to decide canonical route format before implementation.

### 9.5 Site Manifest modal is client-side proof, not a dedicated route

Current state:

```text
The modal uses existing site page DTO/developer JSON/root-source preview.
```

Future improvement:

```text
Add proper manifest raw route / profile route / structured manifest details if backend exposes them.
```

### 9.6 Popup launcher is a fallback hack

Current state:

```text
popup.html/popup.js opens page.html and closes.
This is okay and useful as a safety net.
```

Future cleanup:

```text
Once Chrome loading/caching behavior is stable, popup could remain as fallback or be removed.
For now, keep it because it prevents regression if Chrome invokes popup again.
```

---

## 10. NEXT_LEVEL remaining work — recommended order

Below is a recommended efficient order for next sessions. This tries to avoid touching too many crates at once.

---

### Phase A — Finish CrabLink UX proof surfaces

This is probably the best immediate next area because it is high-impact and keeps work mostly in CrabLink.

#### A1. Make site creator username come from actual site DTO when available

Current:

```text
@username placeholder
```

Goal:

```text
Site pages display actual creator handle when site DTO includes it.
```

Backend field possibilities CrabLink already anticipates:

```text
creator.username
creator.handle
owner.username
owner.handle
passport.username
passport.handle
public_profile.username
public_profile.handle
owner_username
owner_handle
creator_username
creator_handle
```

Next step:

```text
Add backend DTO fields in omnigate/svc-gateway later.
CrabLink already has enough fallback parsing to display them once present.
```

CrabLink-only improvement possible now:

```text
If site creator matches current local passport/wallet, optionally show local @skinnycrabby as “local display label” instead of generic @username, but must label it honestly.
```

Be careful:

```text
Do not claim backend-confirmed creator identity unless backend DTO says so.
```

---

#### A2. Improve creator proof modal copy / visual polish

Possible improvements:

```text
- Show “Local display label” instead of “placeholder” when using local username.
- Add a small badge:
  LOCAL DRAFT
  BACKEND CONFIRMED
  PROFILE PUBLISHED
- Add visual separation between:
  local label
  site DTO label
  backend profile label
```

---

#### A3. Add modal behavior polish

Potential improvements:

```text
- Focus trap in modals.
- Better ESC handling.
- Return focus to clicked button after close.
- Prevent body scroll behind modal.
- Add consistent animation.
```

Not urgent, but good polish.

---

#### A4. Add manifest modal tabs

Current manifest modal has:

```text
Facts grid
Route map
Asset map
Root document source
Developer JSON
Copy buttons
```

Potential next polish:

```text
Tabs or segmented controls:
- Overview
- Routes
- Assets
- Receipts
- JSON
```

This may make the modal less tall.

---

### Phase B — Backend DTO enrichment for site creator identity

This is the next high-impact backend step after CrabLink polish.

Likely crates:

```text
omnigate
svc-gateway
ron-proto
ron-naming or svc-index if owner metadata lives there
```

Goal:

```text
Site page DTO should publish enough safe creator/owner identity fields for CrabLink.
```

Possible DTO additions:

```json
{
  "creator": {
    "handle": "@skinnycrabby",
    "username_status": "local_draft|requested|confirmed",
    "passport_subject": "passport:main:dev",
    "wallet_account": "acct_dev",
    "profile_crab_url": null,
    "public_profile_cid": null,
    "reputation_score": null,
    "moderator_score": null,
    "site_role": "creator"
  }
}
```

Important:

```text
The backend must not publish private alt/main linkages.
It must not publish wallet authority.
It must not publish fake reputation.
It must not publish unverified clearnet attribution.
```

Acceptance gate:

```text
Open crab://thedustyonion6.
Top site creator chip shows actual @skinnycrabby if backend confirms/publishes it.
Creator proof modal says source is backend DTO, not placeholder.
```

---

### Phase C — RON Passport backend truth

This is a bigger phase and probably requires Rust work.

Likely crates:

```text
svc-passport or current identity/passport route owner
svc-gateway
omnigate
ron-proto
ron-auth
ron-policy
svc-wallet integration only through wallet front-door
```

Goals:

```text
- Create/reserve @username.
- Confirm uniqueness.
- Expose identity/passport state through gateway.
- Optionally publish public profile manifest.
- Keep local private passport state separate from public profile state.
```

Needed route concepts:

```text
POST /identity/passport/bootstrap
GET  /identity/me
POST /identity/username/reserve
GET  /identity/username/:handle
GET  /identity/profile/:handle
```

or CrabLink-facing equivalents through gateway.

Acceptance gate:

```text
1. User enters @skinnycrabby.
2. Backend confirms reservation or says unavailable.
3. CrabLink displays confirmed when confirmed.
4. Public profile route is not shown until backend publishes it.
5. No private keys or spend authority are stored in extension.
```

---

### Phase D — Public profile/passport manifest

NEXT_LEVEL wants public profile/passport manifests as discovery/read-only pages.

Possible route formats to decide:

```text
crab://@skinnycrabby
crab://profile/@skinnycrabby
crab://<64hex>.profile
```

Need to be careful because current canonical typed asset URL format is:

```text
crab://<64 lowercase hex>.<asset_kind>
```

Potential profile architecture:

```text
Passport identity record = service/internal identity/capability state.
Public profile manifest = optional b3-addressed public document.
@username = human pointer to public profile/passport manifest.
```

Public profile manifest fields could include:

```json
{
  "schema": "ron.profile.v1",
  "handle": "@skinnycrabby",
  "passport_subject": "passport:main:dev",
  "display_name": "Skinny Crabby",
  "bio": "",
  "avatar_image": "crab://<hash>.image",
  "profile_tags": [],
  "public_asset_catalogue": [],
  "public_sites": [],
  "reputation_summary": null,
  "moderation_summary": null,
  "site_roles": []
}
```

Security:

```text
Do not put private keys, wallet secrets, private alt mappings, or private permission state in public profile manifests.
```

---

### Phase E — Reputation and moderator score model

NEXT_LEVEL mentions:

```text
- Reputation score for every passport.
- Moderator score for every passport.
- Everyone with a passport is automatically a moderator in some base sense.
- Sites can designate special moderators with greater site-scoped privileges.
```

Needs design before coding.

Possible model:

```text
global_reputation_score
global_moderator_score
site_reputation_score
site_moderator_score
site_roles
moderation_events
appeal/undo events
```

Need to decide:

```text
- What events increase/decrease score?
- What actions count as moderation?
- How to prevent brigading/gaming?
- How much is global vs site-scoped?
- Can alts accumulate reputation separately?
- Can a main delegate site moderation role to an alt?
- What is public vs private?
```

Do not rush this into code.

---

### Phase F — Asset primitives beyond image

Current proven:

```text
.image
```

Next asset kinds to add:

```text
.post
.comment
.article
.music
.video
.page
.profile
```

Recommended order:

```text
1. post
2. comment
3. article
4. profile
5. music/video later because streaming/range work is harder
```

Need shared DTO and route contracts before UI.

---

### Phase G — Reference-graph sites

The current big proof:

```text
Site root HTML references independent image assets through <crab-image>.
```

Next reference primitives:

```html
<crab-image src="crab://<hash>.image">
<crab-post src="crab://<hash>.post">
<crab-comment src="crab://<hash>.comment">
<crab-article src="crab://<hash>.article">
```

Need to decide:

```text
- Which custom elements are allowed?
- How are references hydrated?
- What fallback appears if unavailable?
- How are payments enforced for paid asset views?
- How are references indexed?
- How are comments/moderation represented?
```

---

## 11. CrabLink immediate next tasks

If continuing CrabLink next, recommended batch order:

### Batch 1 — Creator identity display source polish

Goal:

```text
Use current local @skinnycrabby as a local display label for creator proof only when site owner/passport matches current local passport, but keep the status honest.
```

Possible UI text:

```text
@skinnycrabby
source: local display label matched to current passport; backend site DTO has not confirmed public creator handle
```

This would avoid generic `@username` on the current user’s own test sites while preserving honesty.

Files likely:

```text
extensions/chrome/src/page-site-creator-proof.js
extensions/chrome/src/storage.js maybe not needed
```

Risk:

```text
Do not claim this is the site creator unless backend owner passport matches current passport or the DTO provides owner passport.
```

Need inspect current payload fields first.

---

### Batch 2 — Manifest modal polish

Goal:

```text
Make Site Manifest modal more compact and easier to scan.
```

Possible changes:

```text
- Add Overview / Maps / Source / JSON tabs.
- Keep copy buttons.
- Keep read-only status.
```

File:

```text
extensions/chrome/src/page-site-creator-proof.js
```

---

### Batch 3 — Settings page final polish

Goal:

```text
Small refinements after user uses it more.
```

Potential work:

```text
- Make current identity sidebar use green username.
- Add backend confirmation badge.
- Add “Open CrabLink Browser” button.
- Add “Reload Identity” result area.
```

Files:

```text
extensions/chrome/src/options.html
extensions/chrome/src/options.js
extensions/chrome/src/styles.css
```

---

### Batch 4 — Update docs/manual checklist

Goal:

```text
Document the new extension icon behavior, settings dashboard, passport drawer, creator proof modal, manifest modal.
```

Files likely:

```text
extensions/chrome/README.md
extensions/chrome/docs/blueprint.md
extensions/chrome/test/manual-checklist.md
docs/CHROME_EXTENSION_BLUEPRINT.md
docs/CRAB_URL_UX.md
docs/BACKEND_ROUTE_CONTRACTS.md
```

---

## 12. RustyOnions backend next tasks

If moving back to RustyOnions crates, recommended next Rust batch:

### Batch R1 — Site DTO creator fields

Likely crates:

```text
ron-proto
omnigate
svc-gateway
possibly ron-app-sdk
```

Goal:

```text
Site page DTO includes explicit creator identity block.
```

Suggested DTO shape:

```json
"creator": {
  "handle": "@skinnycrabby",
  "handle_status": "confirmed|requested|local_draft|backend_unknown",
  "passport_subject": "passport:main:dev",
  "wallet_account": "acct_dev",
  "profile_crab_url": null,
  "public_profile_cid": null,
  "reputation_score": null,
  "moderator_score": null,
  "site_role": "creator"
}
```

Acceptance:

```text
CrabLink site creator chip shows real backend-published handle/source when present.
Creator proof modal shows backend field source instead of placeholder.
```

---

### Batch R2 — Identity/passport @username reservation

Likely crates:

```text
svc-passport or current passport bootstrap owner
svc-gateway
omnigate
ron-proto
ron-auth
ron-policy
```

Goal:

```text
@username is no longer just local_draft.
Backend can return requested/confirmed/unavailable.
```

Acceptance:

```text
CrabLink settings creates/requests @skinnycrabby.
Backend says confirmed or unavailable.
CrabLink displays confirmed only when backend says confirmed.
```

---

### Batch R3 — Public profile route/manifest

Likely crates:

```text
svc-passport
svc-gateway
omnigate
ron-naming
svc-index
svc-storage
ron-proto
```

Goal:

```text
@username resolves to read-only public profile/passport manifest.
```

Acceptance:

```text
Creator proof modal “Open Profile Route” becomes enabled.
Clicking it opens a profile page in CrabLink.
```

---

### Batch R4 — Reputation/moderation DTO skeleton

Likely crates:

```text
ron-proto
ron-accounting
ron-policy
svc-rewarder later
svc-passport maybe
svc-gateway/omnigate presentation
```

Goal:

```text
Expose truthful empty/null reputation/moderation summaries first.
Do not implement full scoring until policy is defined.
```

Acceptance:

```text
CrabLink shows “not published yet” or “0 / no events” based on backend truth.
```

---

## 13. Important commands

### CrabLink check/package/codebundle

```bash
scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh
```

### Node syntax check for a specific file

```bash
node --check extensions/chrome/src/page-site-creator-proof.js
```

### Reload extension

```text
chrome://extensions
CrabLink Extension for Chrome
Reload
```

### If Chrome uses stale extension source

```text
chrome://extensions
Remove CrabLink Extension for Chrome
Load unpacked
Select: /Users/mymac/Desktop/crablink/extensions/chrome
```

Do not load the `dist` zip/folder for dev testing unless intentionally testing packaged distribution.

---

## 14. Important manual tests

### Test 1 — Extension icon opens browser

```text
Click CrabLink icon.
Expected: full CrabLink browser tab opens.
Expected: no small control popup remains as main UX.
```

### Test 2 — Passport drawer

```text
Click Passport.
Expected:
USERNAME
@skinnycrabby
local draft; not backend confirmed

PASSPORT
passport:main:dev

GATEWAY
http://127.0.0.1:8090

WALLET
acct_dev

ROC
1451 ROC

LEDGER
ledger-backed
```

### Test 3 — Settings page

```text
Click Settings gear.
Expected:
Full dashboard layout.
No bottom content cut off.
Save bar does not obscure Safety/Dev Token cards.
```

### Test 4 — Known site

```text
Open:
crab://thedustyonion6

Expected:
Site renders.
Root HTML renders.
crab-image embedded image renders.
```

### Test 5 — Creator proof modal

```text
Open crab://thedustyonion6.
Click site creator @username.
Expected:
Read-only creator proof modal opens.
Expected:
No fake profile route.
No fake reputation score.
No fake moderator score.
No fake wallet authority.
```

### Test 6 — Site Manifest modal

```text
Open crab://thedustyonion6.
Click Site Manifest.
Expected:
Centered Site Manifest modal opens.
Expected:
Old inline bottom details do not expand.
Expected:
Copy buttons available.
```

---

## 15. Things to avoid next session

Do not reintroduce:

```text
default_popup as the main UX
old crab://b3/<hash> public URL format
broad Chrome permissions like <all_urls>
direct calls to internal RustyOnions services
fake reputation scores
fake moderator scores
fake profile routes
fake username confirmation
private key or seed phrase storage in CrabLink
silent ROC spending
```

Do not turn CrabLink into:

```text
wallet
ledger
storage service
index service
backend service
custodial identity manager
```

CrabLink should remain:

```text
thin browser client
gateway-only
explicit paid action UI
read-only proof surfaces unless user explicitly confirms paid/write action
```

---

## 16. Current emotional/product checkpoint

This session was a strong “product becoming real” checkpoint.

Before:

```text
CrabLink had strong technical proof, but some UX still felt extension-popup-like or debug-like.
```

After:

```text
- Extension icon launches full browser.
- Settings feels like a real dashboard.
- Passport drawer exposes username.
- Creator identity is clickable.
- Creator proof is a polished modal.
- Site Manifest is a polished modal.
- Site pages feel much more like a real RON-native browser/product.
```

The work materially advances NEXT_LEVEL because it turns raw proof objects into understandable product primitives:

```text
site creator
passport identity
username display
manifest proof
reputation placeholder
moderator placeholder
profile route placeholder
site ownership/payout/route/asset proof
```

All of this was done while preserving honesty and boundaries.

---

## 17. Recommended next immediate prompt

A good next prompt for the next instance would be:

```text
We are continuing CrabLink/NEXT_LEVEL. Review the latest CODEBUNDLE_CHROME_EXTENSION.md and NEXT_LEVEL.MD. In the previous session we made the extension icon launch the full browser, redesigned settings, added @username display in the Passport drawer, added the creator proof modal, and made Site Manifest open as a modal. Next I want to continue with high-impact NEXT_LEVEL work. Start by inspecting page-site-creator-proof.js, page-site-render-mode.js, page.js, storage.js, ronClient.js, and the latest NEXT_LEVEL carryover notes. Recommend the next focused batch of paste-ready files without touching Rust crates unless needed.
```

Recommended next batch:

```text
CrabLink Batch: creator identity source polish
```

or, if switching to RustyOnions:

```text
RustyOnions Batch: add backend site creator DTO fields so CrabLink can display actual @skinnycrabby from backend truth.
```


### END NOTE - MAY 5 2026 - 12:25 CST


### BEGIN NOTE - MAY 5 2026 - 15:00 CST

## Completion estimate

My current estimate:

```text
Core RustyOnions substrate / product-proof foundation:     90–92%
Internal ROC closed-loop beta:                             85–90%
WEB3_2 product-route foundation:                           82–88%
CrabLink Chrome extension MVP:                             80–85%
NEXT_LEVEL foundation slice already proven:                 88–92%
Full NEXT_LEVEL blueprint overall:                          45–50%
Overall RustyOnions + CrabLink internal WEB3 beta:          78–82%
```

The reason full `NEXT_LEVEL.MD` is still around **45–50%** is that the core proof is strong, but the full blueprint includes much more than the current proof: public profile manifests, real backend username reservation, reputation/moderator scoring, alt passport backend semantics, `.post`, `.comment`, `.article`, `.music`, `.video`, paid views, reference-graph expansion, site revisions, provider payouts, hosting placement, and policy hardening. `NEXT_LEVEL.MD` explicitly frames the target as moving from the proven paid image/site/crab-image pipeline into reusable creator primitives, identity primitives, reputation/moderation, alt passports, payout routing, hosting modes, and developer UX. 

The **foundation slice** is now very far along because paid image upload, site creation/opening, named site rendering, site root HTML rendering, `<crab-image>` embeds, image-root guard, and the `crab://thedustyonion6` reference-graph proof are all part of the current proven checkpoint.  This session pushed the identity/profile UX forward without pretending backend profile, reputation, moderation, or username truth exists.

---

# CrabLink / RustyOnions NEXT_LEVEL Carryover Notes — End of May 5, 2026 Session

## 0. Session outcome summary

This was a **major CrabLink profile/passport/identity UX session**.

We did **not** intentionally edit RustyOnions Rust crates in this session. The work stayed in the separate `crablink` Chrome extension repo, primarily under:

```text
/Users/mymac/Desktop/crablink
extensions/chrome
```

The session began with the Passport drawer and `crab://profile` still feeling too much like a debug/control panel. By the end, `crab://profile` looks much more like a real public profile page:

```text
- Large profile header.
- Large avatar frame.
- The provided crab:// image now renders as the profile image.
- Display name shows prominently.
- @username shows below the display name.
- Bio and tags show in an About section.
- ROC / REP / MOD / Profile chips are visible.
- Edit Profile button is in the top-right of the profile header.
- Dev/debug identity cards remain below for now.
```

The last user-visible state looked good enough to stop and continue later. The user said:

```text
“This is much better we will fix it more later I think we probably keep the other stuff there for debug and dev purposes for now.”
```

That is the correct stopping point: profile UX is now directionally right, while still preserving debug panels for development.

---

## 1. Current north-star context

The active blueprint remains:

```text
NEXT_LEVEL.MD
```

`NEXT_LEVEL.MD` builds on WEB3 / WEB3_2 and starts from the already proven paid image + site + `<crab-image>` checkpoint. It says RustyOnions should grow from:

```text
paid image upload
+ crab://site proof
+ <crab-image> reference embed proof
```

into:

```text
content-addressed creator web
+ reusable asset primitives
+ reference-graph sites
+ manifest-backed attribution
+ RON Passports with @usernames
+ reputation and moderation summaries
+ anonymous/pseudonymous alt passports
+ privacy-honest alt-wallet handling
+ ROC payout routing
+ decentralized/dedicated/self-hosted placement modes
+ SDK/CrabLink developer UX
```

Important invariants remain non-negotiable:

```text
- ROC remains internal.
- b3 hashes are canonical.
- crab:// URLs are product-facing pointers.
- Sites store references.
- Storage stores bytes only.
- Wallet remains mutation front-door.
- Ledger remains economic truth.
- Passports are identities/capability records, not wallets.
- Public profile/passport manifests may be b3-addressed.
- No arbitrary executable linked code.
- No fake profile truth.
- No fake reputation truth.
- No fake moderator truth.
- No silent ROC spending.
- No public main↔alt linkage by default.
- No privacy claims without a real protocol.
```

These invariants are explicitly present in `NEXT_LEVEL.MD`, including the rule that passports are not merely assets, storage stores bytes only, wallet remains the mutation front-door, and public main↔alt linkage must not be exposed by default. 

---

## 2. Repositories and crates touched

### Worked on

```text
/Users/mymac/Desktop/crablink
```

Primary target:

```text
extensions/chrome
```

### RustyOnions crates touched

```text
None intentionally in this session.
```

No direct edits were made to:

```text
svc-gateway
omnigate
ron-proto
ron-naming
svc-index
svc-storage
svc-wallet
ron-ledger
ron-accounting
svc-rewarder
svc-passport
ron-auth
ron-policy
```

This is correct. CrabLink remains the browser/client repo. RustyOnions remains the backend/substrate/value-plane repo. The carryover notes already reinforce that this session’s work was CrabLink-only and that RustyOnions crates were not intentionally touched. 

---

## 3. What we accomplished in this session

### 3.1 Passport drawer decluttered

Earlier in the session, the Passport drawer had too much “NEXT_LEVEL” explanatory content stuffed directly into the drawer. The user correctly called this clutter.

We removed the large explanatory block and kept the drawer focused on identity/wallet basics:

```text
USERNAME
PASSPORT
GATEWAY
WALLET
LEDGER
ROC / REP / MOD row
Profile / My Sites / My Assets row
Check Node / Check Passport / Refresh Balance row
Create Alt / Load Alt row
Status line
```

Important UX rule established:

```text
The Passport drawer should be a compact account/control surface, not a long explanatory webpage.
```

Remaining desired future shape:

```text
- Balance
- Username
- Passport
- Wallet label
- Ledger status
- Alts
- Profile
- My Sites
- My Assets
- Create/Load Alt
- Create/Edit Profile
```

The drawer should not become a dumping ground for all NEXT_LEVEL concepts.

---

### 3.2 ROC balance display fixed in Passport drawer

The user pointed out two ROC display issues:

```text
1. The old ROC row was redundant because the new ROC/REP/MOD row exists.
2. The ROC stat displayed “1426 ROC” even though the label already says ROC.
```

We fixed that:

```text
- Removed the old standalone ROC row from visible drawer grid.
- Kept the new ROC / REP / MOD stat row.
- Removed duplicate “ROC” unit from the ROC stat body.
```

Current desired drawer stat row:

```text
ROC: 1426
REP: —%
MOD: —%
```

This keeps the top-right balance chip and drawer balance compact and avoids visual repetition.

---

### 3.3 My Sites / My Assets moved into Passport drawer

The user wanted `My Sites` and `My Assets` to be user-specific controls, not global quick-nav controls on the site/profile page.

We moved the user catalogue controls into the Passport drawer:

```text
Profile | My Sites | My Assets
```

Important product rule:

```text
My Sites / My Assets belong to the user/passport context, so they live in the Passport drawer, not on every page.
```

Current state:

```text
- Profile button opens crab://profile.
- My Sites opens local catalogue/history-style site view.
- My Assets opens local catalogue/history-style asset view.
- They are still local/browser-history scaffolds, not backend-owned public catalogues.
```

Future backend target:

```text
My Sites / My Assets should eventually hydrate from public profile/passport manifest pointers or svc-index/profile catalogue routes.
```

---

### 3.4 Alt Vault UX added and fixed

We added a local-only Alt Vault scaffold for future anonymous/pseudonymous alt passports.

Key behavior now:

```text
- Passport drawer shows Create Alt if no local alt draft exists.
- Passport drawer shows Load Alt if a local alt draft exists.
- Clicking Create Alt opens the Alt Vault.
- It does not automatically create a draft anymore.
- User must explicitly click Create Alt Draft inside the vault.
- Alt drafts are stored locally under crablinkAltDraftsV1.
- Alt drafts are not backend identities.
- Alt drafts are not public .alt b3 roots.
- Alt drafts do not inherit wallet authority.
```

Important privacy posture established:

```text
Alts are for privacy/pseudonymity, but CrabLink must not claim real anonymity or private withdrawal guarantees without a backend/protocol design.
```

Alt public route design note:

```text
Future .alt route:
crab://<b3-of-alt-public-root>.alt
```

Important rule:

```text
The b3 hash for an alt public ID must be a hash of an independently generated public alt root, not a hash that exposes or derives from the main passport.
```

The user clarified:

```text
<passport-public-id>.passport and <alt-public-id>.alt should be b3 hashes of something,
and the alt hash must be privacy-aware.
```

Current state:

```text
- Local alt draft UX exists.
- Backend alt identity route does not exist yet.
- Public .alt manifest does not exist yet.
- No real privacy protocol exists yet.
```

Do not overclaim this feature next session.

---

### 3.5 `crab://profile` scaffold added

We added a `crab://profile` route in CrabLink.

Initial behavior:

```text
- It used the local @username.
- It showed the passport subject.
- It showed wallet label.
- It showed ROC balance.
- It clearly stated backend profile publishing is not wired.
```

The first version was too debug-like. The user wanted a true profile page, and that was the correct UX critique.

Current behavior after the last batch:

```text
crab://profile
→ renders a profile-style page instead of generic cards
→ shows large avatar image
→ shows display name
→ shows @username
→ shows bio
→ shows tags
→ shows ROC/REP/MOD/Profile stat chips
→ has Edit Profile at top-right
→ keeps identity/debug cards below for dev
```

Important honesty boundary:

```text
- The profile is still local draft only.
- Backend profile publishing is not wired.
- Public profile CID is not published.
- Profile route is not published.
- REP/MOD are placeholders.
- @username remains local draft / not backend confirmed.
```

---

### 3.6 Local Profile Editor added

We added a local-only profile editor.

Current fields:

```text
Display name
Bio
Avatar Image crab:// URL
Tags
```

Current storage key:

```text
crablinkProfileDraftV1
```

Current behavior:

```text
- Save Local Draft writes to Chrome local storage.
- Copy Public Template copies a future-safe public profile template.
- Clear Draft clears the local profile draft.
- Close closes the editor.
```

Important validation:

```text
Avatar must be empty or:
crab://<64 lowercase hex>.image
```

Known working avatar image URL used:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

Another known-good paid image URL from memory/project context:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Important security boundary:

```text
The profile editor does not publish to backend.
It does not create a public profile CID.
It does not store wallet authority.
It does not store private keys or recovery material.
It does not claim username ownership.
```

---

### 3.7 Profile avatar preview fixed by moving rendering into profile page

Initial avatar preview did not show reliably. There were two issues:

```text
1. check-chrome.sh had a malformed JavaScript string in its Node heredoc.
2. The standalone page-profile-avatar.js approach was fragile because profile rendering and avatar mounting could race.
```

We corrected the checker and then improved the architecture:

```text
- Avatar rendering moved directly into page-profile-home.js.
- page-profile-avatar.js became a compatibility shim that removes old duplicate mounts.
- The profile page itself now owns the avatar frame.
- It fetches image bytes from the configured gateway route:
  /o/b3:<hash>
- It includes local auth/passport/wallet headers if available.
```

Current result:

```text
The provided crab:// image appears in the large avatar frame at the top-left of crab://profile.
```

This was visible in the final screenshot and is a big product improvement.

---

### 3.8 `crab://profile` was redesigned into a real profile page

The final version now looks much closer to the intended product shape.

Current `crab://profile` layout:

```text
Profile cover card
  - Large avatar on left
  - Local profile draft badge
  - Display name
  - @username
  - backend/local status copy
  - Edit Profile button top-right
  - Copy Profile URL button top-right

About section
  - bio text
  - tags as chips
  - local/pending status pill

Stats row
  - ROC
  - REP
  - MOD
  - Profile

Dev/detail cards below
  - Identity
  - SSO direction
  - Profile actions
```

The user agreed this is much better and explicitly said we can keep the other debug/dev cards for now.

Next UX polish later:

```text
- Make the ROC chip less verbose.
- Possibly move Identity / SSO direction / Profile actions behind a dev/debug toggle.
- Improve mobile layout.
- Add a real public asset/site table once backend profile catalogue exists.
- Make the profile look less “admin dashboard” and more “social/profile page.”
```

---

### 3.9 `check-chrome.sh` repeatedly evolved

During the session, `check-chrome.sh` caught several issues and also had several false positives / over-strict checks.

Issues encountered:

```text
- page-local-catalog.js must not include token: quick-nav .catalog-quick-button
- page-alt-vault.js missing token: crablinkAltDraftsV1
- malformed JS string in Node heredoc
- page-alt-vault.js must not include token: passport-catalog-action-row.has-alt-vault
```

Important lesson:

```text
check-chrome.sh is valuable but should not ban cleanup selectors that are intentionally used to remove legacy DOM.
```

Current checker should enforce:

```text
- Required extension files exist.
- No broad Chrome permissions.
- No old crab://b3/ public URL format.
- No fake wallet/private key terms.
- No fake profile publish calls.
- page-profile-home owns the profile avatar now.
- page-profile-avatar is a compatibility shim only.
- page-alt-vault can use legacy selectors for cleanup if needed.
```

Recommended next-session caution:

```text
If check-chrome.sh fails on a token, inspect whether it is a real product/security invariant or a false positive caused by architectural evolution.
```

---

## 4. Current known-good commands

Primary CrabLink local check/package/codebundle command:

```bash
cd /Users/mymac/Desktop/crablink
node --check extensions/chrome/src/page-profile-home.js
node --check extensions/chrome/src/page-profile-avatar.js
scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh
```

General command used often:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh
```

Expected good result:

```text
json/structure checks: ok
javascript syntax checks: ok
bash syntax checks: ok
CrabLink Chrome extension checks passed.
wrote: dist/crablink-extension-chrome.zip
CODEBUNDLE_CHROME_EXTENSION.md regenerated
```

After package/check:

```text
Reload unpacked extension in Chrome.
Open CrabLink.
Go to crab://profile.
Confirm profile image and profile layout render.
```

---

## 5. Current known-good local runtime state

Current CrabLink UI state from screenshot:

```text
URL: crab://profile
Gateway: http://127.0.0.1:8090
Passport: passport:main:dev
Wallet: acct_dev
ROC: 1426
Username: @skinnycrabby
Username status: local draft; not backend confirmed
Ledger: ledger-backed
```

Current local profile draft visible in final screenshot:

```text
Display name: Skinnycrabby
Handle: @skinnycrabby
Bio: ldskfjahsdllkjfahsldkjf
Avatar:
  crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
Tags:
  blah
Profile status:
  draft saved
```

The avatar image successfully displayed from gateway raw object bytes.

---

## 6. Important architectural decisions made this session

### 6.1 Profile is a page, not a drawer

We clarified by UX work that:

```text
Passport drawer = compact account/control surface
crab://profile = profile page
Profile editor = modal/editor
Alt Vault = separate modal
Assets/Sites = catalogue surfaces
```

This is important because stuffing all profile/alt/asset content into the Passport drawer created clutter.

### 6.2 Profile is local-only until backend profile manifests exist

Current `crab://profile` is allowed to show:

```text
- local display name
- local bio
- local avatar URL
- local tags
- local wallet label
- local passport label
- local ROC balance display from gateway-backed wallet state
```

It must not claim:

```text
- public profile CID exists
- backend profile route exists
- username is backend confirmed
- reputation score exists
- moderator score exists
- profile is globally discoverable
```

### 6.3 Avatar preview reads bytes, does not publish

The profile avatar is loaded by:

```text
crab://<hash>.image
→ parse hash
→ fetch http://127.0.0.1:8090/o/b3:<hash>
→ object URL
→ img src = object URL
```

This is correct for local preview.

It does not:

```text
- publish the profile
- create or mutate a manifest
- edit the image asset
- claim ownership of the image
- change wallet/ledger/storage/index state
```

### 6.4 Alt privacy remains honest

We established the correct privacy doctrine:

```text
Alts are meant for privacy.
Alts should not publicly reveal main passport linkage.
Alt public IDs should be b3 hashes of independently generated public alt roots.
Do not hash obvious main-passport material into alt public IDs.
Do not promise private alt→main withdrawal without a real protocol.
```

---

## 7. Files changed or introduced in this session

The exact set changed across the session may vary depending on what was pasted last, but the important active files are:

```text
extensions/chrome/src/page.html
extensions/chrome/src/page.js
extensions/chrome/src/page.css
extensions/chrome/src/page-local-catalog.js
extensions/chrome/src/page-alt-vault.js
extensions/chrome/src/page-profile-home.js
extensions/chrome/src/page-profile-editor.js
extensions/chrome/src/page-profile-avatar.js
extensions/chrome/src/page-site-creator-proof.js
extensions/chrome/src/page-site-render-mode.js
extensions/chrome/src/storage.js
extensions/chrome/src/ronClient.js
scripts/check-chrome.sh
scripts/package-chrome.sh
scripts/make_codebundle.sh
```

New or important modules added during this identity/profile push:

```text
page-alt-vault.js
page-profile-home.js
page-profile-editor.js
page-profile-avatar.js
```

Current intent of each:

```text
page-profile-home.js
  Owns crab://profile, .passport reserved route, .alt reserved route, local profile rendering, and now avatar image hydration.

page-profile-editor.js
  Owns local-only profile draft modal/editor and crablinkProfileDraftV1.

page-profile-avatar.js
  Compatibility shim only. Removes old duplicate avatar preview mounts. It should not fetch or render now.

page-alt-vault.js
  Owns local-only alt draft vault, crablinkAltDraftsV1, Create Alt / Load Alt button.

page-local-catalog.js
  Owns Profile / My Sites / My Assets buttons and ROC/REP/MOD row in Passport drawer.

page-site-creator-proof.js
  Owns site creator proof modal and site manifest proof modal for rendered site pages.

page-site-render-mode.js
  Owns named site rendering and crab-image embed hydration.
```

---

## 8. Current product status by area

### 8.1 Paid image asset path

Status:

```text
Working / green
```

Known good:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Needs later:

```text
- Better receipt history UI.
- Better asset page polish.
- Better ownership/profile linkage.
- Asset catalogue on profile page once backend exists.
```

### 8.2 Site creation/open path

Status:

```text
Working / green enough for proof
```

Known site:

```text
crab://thedustyonion6
```

Needs later:

```text
- Site edit/revision flow.
- Better root HTML editor.
- Better site manifest page.
- Site assets route/map display polish.
- Creator profile backend hydration.
```

### 8.3 `<crab-image>` embed

Status:

```text
Working / proven
```

Architecture:

```text
Site root HTML contains:
<crab-image src="crab://<hash>.image"></crab-image>

CrabLink fetches:
GET /o/b3:<hash>

Then renders image in the site page.
```

Needs later:

```text
- More embed types:
  crab-post
  crab-comment
  crab-article
  crab-video
  crab-audio
- Better loading/error UI.
- Maybe manifest-aware embed cards.
```

### 8.4 Passport drawer

Status:

```text
Good MVP / dev-polish level
```

Current includes:

```text
- Username
- Passport
- Gateway
- Wallet
- Ledger
- ROC/REP/MOD
- Profile / My Sites / My Assets
- Check Node / Check Passport / Refresh Balance
- Create Alt / Load Alt
```

Needs later:

```text
- Possibly reduce status text.
- Add account switcher eventually.
- Add proper alt selection once backend alts exist.
- Add profile button behavior polish.
```

### 8.5 `crab://profile`

Status:

```text
Good local UX scaffold / much better than before
```

Current includes:

```text
- Real profile-style header.
- Avatar loads.
- Display name.
- @username.
- Bio.
- Tags.
- Edit Profile button.
- ROC/REP/MOD/Profile chips.
- Debug cards below.
```

Needs later:

```text
- Real backend profile publish route.
- Real public profile CID.
- Real @username confirmation.
- Real public asset catalogue.
- Real public sites list.
- Real reputation and moderator scores.
- Better non-dev profile layout.
```

### 8.6 Alt Vault

Status:

```text
Local-only scaffold / good UX starting point
```

Current includes:

```text
- Create Alt / Load Alt button.
- Local alt draft table.
- Copy draft.
- Copy public-safe template.
- Delete draft.
```

Needs later:

```text
- Backend alt root manifest design.
- Real .alt route hydration.
- Separate alt wallet/account semantics.
- Explicit main/alt switching.
- Privacy warning surfaces.
- No public main linkage.
```

### 8.7 Reputation / moderator scores

Status:

```text
Placeholder only
```

Current UI:

```text
REP: —%
MOD: —%
```

Do not fake values.

Needs design before backend code:

```text
- What events affect reputation?
- What events affect moderator score?
- Global vs site-scoped.
- Anti-gaming.
- Alt behavior.
- Public vs private signals.
- Appeal/reversal/decay model.
```

The earlier carryover material already warns that reputation and moderator score need design before coding. 

---

## 9. Things to avoid next session

Do not reintroduce:

```text
- The giant NEXT_LEVEL explanatory card inside Passport drawer.
- Old crab://b3/<hash> public URL format.
- Fake username confirmation.
- Fake public profile CID.
- Fake reputation score.
- Fake moderator score.
- Fake profile route.
- Silent ROC spending.
- Direct wallet/ledger mutation from CrabLink.
- Direct calls to non-gateway backend services.
- Private key / seed phrase / spend authority storage in Chrome.
- Public main↔alt linkage.
- Claims of real alt anonymity without a protocol.
```

Do not turn CrabLink into:

```text
wallet
ledger
storage service
index service
passport backend
custodial identity manager
```

CrabLink should remain:

```text
thin browser client
gateway-only
explicit paid action UI
read-only proof surface unless user confirms a write/paid action
```

This matches the existing project rule that CrabLink is a browser/client layer while backend services own truth. `NEXT_LEVEL.MD` reinforces gateway-only CrabLink behavior, wallet front-door discipline, and no fake identity/privacy claims. 

---

## 10. Recommended next session order

### Step 1 — Re-run green checks

Start next session with:

```bash
cd /Users/mymac/Desktop/crablink
scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh
```

Then reload Chrome unpacked extension and manually verify:

```text
crab://profile
crab://site
crab://image
crab://thedustyonion6
Passport drawer
Create/Load Alt
Edit Profile modal
```

### Step 2 — Polish profile page lightly, but do not overdo it

The profile page is good enough now. Next profile polish should be careful and focused:

```text
- Make ROC stat chip less verbose:
  currently may show “1426 ROC (ledger-backed, svc_wallet.v1)”
  better: 1426
  subtext: ledger-backed

- Consider shrinking or hiding debug cards behind Developer Details.
- Improve profile header spacing at different widths.
- Add a small “local draft” warning but do not over-warn.
- Make Edit Profile remain obvious.
```

### Step 3 — Decide whether to continue CrabLink UX or move backend for profile truth

There are two good next paths.

#### Path A — Continue CrabLink UX

Recommended if user wants fast visible progress:

```text
- Polish profile page.
- Add local My Sites / My Assets modal/table from recent local history.
- Improve site creator profile proof.
- Improve Site Manifest modal tabs.
- Improve asset page rendering.
```

#### Path B — Start backend identity/profile truth

Recommended if user wants to turn local profile into real network truth:

```text
- Begin svc-passport / ron-proto / ron-naming work for username reservation.
- Add backend-confirmed @username DTO.
- Add profile manifest DTO.
- Add gateway/omnigate read-only profile route.
- Keep profile publishing gated.
```

Path B requires RustyOnions code and must follow code-generation discipline:

```text
- Review CODECHECK.md before code.
- Use CODEBUNDLE_RS.md for current Rust code.
- Provide full paste-ready files.
- Do not add product logic to kernel/core plumbing.
```

---

## 11. Best next high-impact batches

### Batch 1 — Profile page final polish

Likely files:

```text
extensions/chrome/src/page-profile-home.js
extensions/chrome/src/page-profile-editor.js
scripts/check-chrome.sh
```

Goals:

```text
- Clean ROC chip.
- Better avatar fallback/error state.
- Better profile card spacing.
- Move dev details lower or behind Developer Details.
- Keep profile page looking like a profile, not admin panel.
```

### Batch 2 — My Sites / My Assets drawer modals

Likely files:

```text
extensions/chrome/src/page-local-catalog.js
extensions/chrome/src/page-profile-home.js
scripts/check-chrome.sh
```

Goals:

```text
- My Sites opens a modal/table of local known sites.
- My Assets opens a modal/table of local known assets.
- Include kind, crab URL, title/name, created/seen time, status.
- Keep local-only label.
- Do not claim backend public catalogue.
```

### Batch 3 — Backend username reservation design note

Before code, write a note for NEXT_LEVEL or TODO:

```text
@username is human pointer.
passport_subject is canonical identity.
svc-passport owns uniqueness and persistence.
ron-naming owns parser/normalizer.
gateway/omnigate expose safe read/claim routes.
CrabLink displays confirmed only when backend confirms.
```

Potential future route shape:

```text
POST /identity/username/prepare
POST /identity/username/claim
GET  /identity/username/:handle
GET  /profile/:handle
```

But do not invent routes without checking existing RustyOnions code.

### Batch 4 — Public profile manifest DTO

Likely RustyOnions crates later:

```text
ron-proto
ron-naming
svc-passport
omnigate
svc-gateway
svc-index
```

Possible manifest:

```json
{
  "schema": "ron.profile.v1",
  "handle": "@skinnycrabby",
  "passport_subject": "passport:main:dev",
  "display_name": "Skinnycrabby",
  "bio": "...",
  "avatar_image": "crab://<hash>.image",
  "public_sites": [],
  "public_asset_catalogue": [],
  "reputation_summary": null,
  "moderation_summary": null
}
```

Security rule:

```text
No private keys, wallet secrets, private alt mappings, private receipts, or spend authority.
```

### Batch 5 — Text asset primitives

Do this only after profile/site/image UX is stable.

Order:

```text
.post
.comment
.article
```

Likely RustyOnions starting crates:

```text
ron-proto
ron-naming
omnigate
svc-gateway
CrabLink
```

`NEXT_LEVEL.MD` explicitly says the product model should generalize the already proven prepare → hold → paid upload/create → b3 CID → manifest CID → index pointer → crab URL → hydrated page pattern, rather than inventing a parallel system. 

---

## 12. Current proof URLs and values

Known image proof:

```text
crab://2e24f045f01a1bc77c57a94d622365e6b291936fcdd3ae64b45b0578e99c2058.image
```

Known paid image proof:

```text
crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image
```

Known named site proof:

```text
crab://thedustyonion6
```

Local profile:

```text
crab://profile
```

Local username:

```text
@skinnycrabby
```

Local passport:

```text
passport:main:dev
```

Local wallet:

```text
acct_dev
```

Gateway:

```text
http://127.0.0.1:8090
```

---

## 13. One-sentence next-session prompt

Use this to start the next instance:

```text
We are continuing RustyOnions / CrabLink NEXT_LEVEL. In the previous session we kept work CrabLink-only, decluttered the Passport drawer, added Profile/My Sites/My Assets controls, added local Create/Load Alt with Alt Vault, added a local profile editor, and redesigned crab://profile into a real profile page with avatar image loaded from crab://<hash>.image through gateway /o/b3:<hash>. The profile is still local draft only; backend profile publishing, username confirmation, reputation, moderation, and public profile CID are not wired. Please review NEXT_LEVEL.MD, CODEBUNDLE_CHROME_EXTENSION.md, and the carryover notes, then continue with the next focused high-impact batch of full paste-ready files.
```

---

## 14. Final status statement

This session was a strong product UX win.

Before this identity/profile work:

```text
CrabLink already proved paid image + site + crab-image embed technically,
but the identity/profile layer still felt like debug scaffolding.
```

After this session:

```text
CrabLink feels more like a real RON browser/client:
- Passport drawer is cleaner.
- @username is visible.
- Alts have a local vault.
- Profiles have an editor.
- crab://profile looks like an actual profile page.
- Profile avatar image renders from b3-backed crab image assets.
- The UX still tells the truth about what is local, pending, or backend-confirmed.
```

This is exactly the right direction for NEXT_LEVEL: make the proven b3/crab/ROC substrate understandable and usable without violating the boundary between client UX and backend truth.


### END NOTE - MAY 5 2026 - 15:00 CST


### BEGIN NOTE - MAY 5 2026 - 18:35 CST

## Carryover Notes — CrabLink / RustyOnions NEXT_LEVEL Session

### Session endpoint

We reached a strong product-surface milestone for CrabLink. The extension now has polished local scaffolds for several new `crab://` built-in creator destinations:

```text
crab://article
crab://video
crab://stream
crab://podcast
```

These are intentionally **local UX / prepare scaffolds**, not real backend-published assets yet. They do not create b3 CIDs, upload bytes, charge ROC, mutate wallets, mint stream keys, or claim backend truth. They generate future manifest drafts and make non-mutating gateway prepare attempts to placeholder backend routes that currently return 404 unless wired later.

The user is happy with the forms and product direction, especially the video form, stream scaffold, and podcast scaffold. The current blocking issue is a navigation/state cleanup bug between the new local pages.

---

## Major accomplishments in this session

### 1. Codebundle hygiene was fixed

We replaced `scripts/make_codebundle.sh` to stop dumping `.DS_Store`, OS metadata, and binary garbage into `CODEBUNDLE_CHROME_EXTENSION.md`.

Important outcome:

```text
scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh
```

now completes and produces a clean codebundle with expected binary assets omitted.

Earlier bug fixed:

```text
TEXT_FILES[@]: unbound variable
```

The final fix avoided fragile Bash arrays and streamed file lists instead.

This is important because future sessions can rely on `CODEBUNDLE_CHROME_EXTENSION.md` again without binary noise corrupting review context.

---

### 2. Profile and Passport drawer polish

We fixed the profile/Passport UI issues shown in screenshots:

```text
- Profile ROC chip now tries to use the same ROC display source as the top bar / Passport drawer.
- Passport drawer background was made more solid so page text does not bleed through.
- Profile page remains honest: local draft/profile display only unless backend confirms profile publication.
```

Relevant file updated earlier:

```text
extensions/chrome/src/page-profile-polish.js
```

Current state:

```text
crab://profile
```

is visually much stronger. It includes profile polish, avatar handling, local creator library preview, and developer details collapsed behind a dev section.

---

### 3. Site creator / manifest proof polish

We added a stronger site creator proof layer for rendered sites:

```text
extensions/chrome/src/page-site-creator-proof.js
```

Features added:

```text
- Better creator handle chip.
- REP / MOD / source chips beside creator identity.
- Creator proof modal.
- Tabbed Site Manifest modal with Summary / Ownership / Routes / Assets / Receipts / Raw tabs.
- Honest truth boundary: no fake profile route, no fake reputation, no backend mutation.
```

This supports the NEXT_LEVEL direction that site pages should show creator identity, manifest/provenance, payout ownership, and receipts in a clean UX without cluttering the page itself.

---

### 4. `crab://article` local draft scaffold

We created:

```text
extensions/chrome/src/page-article-draft.js
```

And wired it into:

```text
extensions/chrome/src/page.html
```

Article surface features:

```text
- Article title, subtitle, summary, body, tags, language, license, author handle.
- Live article preview.
- Word/character/body-byte stats.
- Future article manifest JSON.
- Copy manifest JSON.
- Copy plain text.
- Save local draft.
- Clear local draft.
- Non-mutating prepare attempt to /assets/article/prepare.
```

Observed result:

```text
Article prepare failed with HTTP 404. Backend article routes may not be wired yet.
```

This is expected and correct. Backend article publishing is not wired yet.

Important bug fixed during article work:

```text
Article prepare failed: Cannot access 'correlationId' before initialization
```

Cause:

```javascript
const correlationId = correlationId();
```

Fixed by renaming the helper to:

```javascript
createCorrelationId()
```

and using:

```javascript
const requestCorrelationId = createCorrelationId();
```

Article scaffold should be considered a successful UX foundation, not a complete publishing feature.

---

### 5. `crab://video` local video draft scaffold

We created:

```text
extensions/chrome/src/page-video-draft.js
```

And wired it into:

```text
extensions/chrome/src/page.html
extensions/chrome/src/background.js
extensions/chrome/src/crab.js
```

Video surface features:

```text
- Local video file picker.
- Safe local video preview.
- Video title, description, tags, language, license, creator handle.
- Thumbnail crab URL field.
- Suggested price minor units.
- Future video manifest JSON.
- Copy manifest JSON.
- Copy metadata JSON.
- Save local draft.
- Clear draft.
- Non-mutating prepare attempt to /assets/video/prepare.
```

Truth boundary:

```text
No video upload.
No b3 CID.
No manifest CID.
No ROC charge.
No wallet mutation.
No streaming/range backend yet.
```

We also fixed a collision where `crab://article` remained visible above `crab://video`.

Root fix applied in `page-video-draft.js`:

```text
- Explicitly removes #articleDraftSection on video route.
- Clears article route body class.
- Rewrites stale developer JSON when needed.
```

---

### 6. `crab://stream` local streamer studio scaffold

We created:

```text
extensions/chrome/src/page-stream-draft.js
```

And wired it into:

```text
extensions/chrome/src/page.html
extensions/chrome/src/background.js
extensions/chrome/src/crab.js
```

Stream surface features:

```text
- Local camera/mic preview.
- Local screen-share preview.
- Stream title, category/game, description, tags, language.
- Visibility mode.
- Chat mode.
- Moderation mode.
- Stream mode.
- Creator handle.
- Thumbnail crab URL.
- Suggested access price minor units.
- Tips enabled later checkbox.
- Future stream manifest JSON.
- Copy manifest JSON.
- Copy metadata JSON.
- Save local draft.
- Clear draft.
- Non-mutating prepare attempt to /streams/prepare.
```

Truth boundary:

```text
No live stream starts.
No ingest key.
No stream session.
No chat room.
No tips route.
No ROC charge.
No b3 stream manifest.
No wallet mutation.
```

This is a strong product-direction milestone for streamers.

---

### 7. `crab://podcast` local podcast studio scaffold

We created:

```text
extensions/chrome/src/page-podcast-draft.js
```

And wired it into:

```text
extensions/chrome/src/page.html
extensions/chrome/src/background.js
extensions/chrome/src/crab.js
```

Podcast surface features:

```text
- Local audio file picker.
- Local audio preview.
- Local live mic preview.
- Show title.
- Episode title.
- Season number.
- Episode number.
- Podcast kind.
- Audio mode: upload / live / hybrid later.
- Description / show notes.
- Category.
- Tags.
- Language.
- Visibility.
- Creator handle.
- Cover image crab URL.
- Suggested access price minor units.
- Tips enabled later checkbox.
- Future podcast manifest JSON.
- Copy manifest JSON.
- Copy metadata JSON.
- Save local draft.
- Clear draft.
- Non-mutating prepare attempt to /podcasts/prepare.
```

Truth boundary:

```text
No podcast publication.
No audio upload.
No live audio session.
No b3 CID.
No manifest CID.
No ROC charge.
No wallet mutation.
No RSS/feed creation yet.
```

This sets up a future pathway for audio creators, podcasters, live audio, show pages, episode pages, transcripts, tips, comments, and RSS/export compatibility.

---

## Current known bug: navigation gets stuck between new local `crab://` pages

### User-reported issue

When navigating between:

```text
crab://video
crab://stream
crab://podcast
```

the URL changes, but the page content can remain stuck on the previous scaffold.

Example:

```text
Open crab://video.
Then click/open crab://stream.
URL changes to crab://stream, but video UI may remain.
```

or:

```text
Open crab://stream.
Then click/open crab://podcast.
URL changes to crab://podcast, but stream UI may remain.
```

The user explicitly wants this fixed next.

---

## Deep diagnosis of the navigation bug

This is likely **not** a backend issue. It is a client-side route-mode cleanup bug caused by multiple independent local scaffold modules trying to own the page.

Current local scaffold modules include:

```text
page-article-draft.js
page-video-draft.js
page-stream-draft.js
page-podcast-draft.js
page-profile-home.js / page-profile-polish.js
page-site-render-mode.js
```

Each module runs independently, watches DOM mutations, reads the address bar and/or `developerJson`, and decides whether its page is active.

The problematic pattern is:

```text
isVideoPage()
isStreamPage()
isPodcastPage()
```

These functions often check:

```text
1. current addressInput URL
2. developerJson payload
3. payload title / slug / schema / crab URL
```

The bug likely happens because `developerJson` can remain stale from the previous route for a short time or permanently if the new route is locally handled. So even after the address bar changes to `crab://podcast`, the stale payload may still say `crablink.stream.local_page.v1` or `crablink.video.local_page.v1`.

Then the old module says:

```text
"I still see my schema in developerJson, so I am still active."
```

Meanwhile the new module may also say:

```text
"The address is crab://podcast, so I am active too."
```

This creates route collisions where one scaffold does not remove the other, or the previous page wins the race.

We already patched this once for article → video by making video remove article, but now we need a more systematic solution across video/stream/podcast/article.

---

## Best next fix: centralize local route authority

The next session should **not** keep doing one-off cleanup fixes forever. The best high-impact fix is to introduce a small shared route-mode helper or orchestrator.

Recommended new file:

```text
extensions/chrome/src/page-local-route-mode.js
```

Purpose:

```text
- Determine the current local built-in route from addressInput/window query.
- Treat addressInput / URL query as authoritative over stale developerJson.
- Clean up inactive local scaffold sections.
- Set exactly one body class at a time.
- Remove stale local scaffold sections from previous routes.
- Optionally rewrite developerJson for local-only routes.
```

Suggested local route IDs:

```text
article
video
stream
podcast
profile
site
image
music
none
```

Suggested section IDs to manage:

```text
articleDraftSection
videoDraftSection
streamDraftSection
podcastDraftSection
profileHomeSection
sitePageSection
workflowSection
actionsSection
fieldsSection
warningsSection
prepareSummary
holdSection
submitSection
```

Suggested body classes to enforce:

```text
crablink-article-draft-view-mode
crablink-video-draft-view-mode
crablink-stream-draft-view-mode
crablink-podcast-draft-view-mode
crablink-profile-view-mode
crablink-site-full-view-mode
```

Suggested exported functions:

```javascript
export function currentCrabRoute()
export function isExactLocalRoute(routeName)
export function enterLocalRoute(routeName, options = {})
export function leaveLocalRoute(routeName)
export function removeOtherLocalSections(activeRouteName)
export function clearLocalRouteBodyClasses(activeRouteName)
```

Then update these modules to use it:

```text
page-article-draft.js
page-video-draft.js
page-stream-draft.js
page-podcast-draft.js
```

Most important rule:

```text
If addressInput or page URL says crab://podcast, then video/stream/article modules must return false immediately, regardless of stale developerJson.
```

In other words, each module should do:

```javascript
const route = readCurrentCrabUrl().toLowerCase();

if (route.startsWith('crab://')) {
  return route === 'crab://video';
}
```

for video, and analogous for article/stream/podcast.

Only fall back to `developerJson` when the current address is missing or not authoritative.

---

## Simpler next-session patch option

If we do not want to introduce a shared orchestrator yet, patch all four files with consistent route cleanup:

```text
extensions/chrome/src/page-article-draft.js
extensions/chrome/src/page-video-draft.js
extensions/chrome/src/page-stream-draft.js
extensions/chrome/src/page-podcast-draft.js
```

Each file should:

1. Define all sibling section IDs:

```javascript
const ARTICLE_SECTION_ID = 'articleDraftSection';
const VIDEO_SECTION_ID = 'videoDraftSection';
const STREAM_SECTION_ID = 'streamDraftSection';
const PODCAST_SECTION_ID = 'podcastDraftSection';
```

2. Define all sibling body classes:

```javascript
const ARTICLE_VIEW_CLASS = 'crablink-article-draft-view-mode';
const VIDEO_VIEW_CLASS = 'crablink-video-draft-view-mode';
const STREAM_VIEW_CLASS = 'crablink-stream-draft-view-mode';
const PODCAST_VIEW_CLASS = 'crablink-podcast-draft-view-mode';
```

3. In each `enforceXOnlyLayout()`, remove all sibling sections:

For article:

```text
remove videoDraftSection
remove streamDraftSection
remove podcastDraftSection
```

For video:

```text
remove articleDraftSection
remove streamDraftSection
remove podcastDraftSection
```

For stream:

```text
remove articleDraftSection
remove videoDraftSection
remove podcastDraftSection
```

For podcast:

```text
remove articleDraftSection
remove videoDraftSection
remove streamDraftSection
```

4. In each `isXPage()`, make address route authoritative:

For video:

```javascript
const url = readCurrentCrabUrl().toLowerCase();

if (url.startsWith('crab://')) {
  return url === 'crab://video';
}
```

For stream:

```javascript
if (url.startsWith('crab://')) {
  return url === 'crab://stream';
}
```

For podcast:

```javascript
if (url.startsWith('crab://')) {
  return url === 'crab://podcast';
}
```

For article:

```javascript
if (url.startsWith('crab://')) {
  return url === 'crab://article';
}
```

5. Avoid using `developerJson` as active-route truth if the address bar says a different `crab://` route.

This simpler patch is probably fastest and should solve the immediate bug.

---

## Additional route issue to watch

`page.js` may still render backend “coming soon” built-in content underneath or above local scaffolds. The local modules currently hide generic sections:

```text
workflowSection
actionsSection
fieldsSection
warningsSection
sitePageSection
prepareSummary
holdSection
submitSection
```

But if `page.js` rerenders after a local module runs, the old sections can reappear, causing duplicate forms or stale UI. This was already observed with article:

```text
Article polished top form existed, but generic title/body form also appeared below.
```

The immediate workaround was local CSS:

```css
body.crablink-article-draft-view-mode #workflowSection,
body.crablink-article-draft-view-mode #actionsSection,
...
{
  display: none !important;
}
```

The long-term fix is to have `page.js` understand that these local pages are **custom local renderer pages** and should not render generic backend form fields for them.

Potential `page.js` improvement later:

```text
If resolved crab URL is crab://article/video/stream/podcast:
  render only page hero/facts/developer shell.
  skip generic workflow/actions/fields panels.
  let local module own the page content.
```

This would reduce race conditions.

---

## New routes added to extension navigation / parser

Current built-in route list in `background.js` should include:

```javascript
const BUILTIN_TARGETS = [
  'site',
  'image',
  'profile',
  'music',
  'article',
  'video',
  'stream',
  'podcast'
];
```

Current `crab.js` known asset kinds should include:

```text
image
video
stream
podcast
audio
music
song
article
post
comment
page
site
app
file
manifest
```

This is important for typed asset URLs later:

```text
crab://<hash>.image
crab://<hash>.video
crab://<hash>.stream
crab://<hash>.podcast
crab://<hash>.audio
crab://<hash>.article
```

Remember the user’s canonical public URL preference:

```text
crab://<64 lowercase hex>.<asset_kind>
```

not:

```text
crab://b3/<hash>.<kind>
```

Internal content IDs remain:

```text
b3:<64 lowercase hex>
```

---

## Current backend state for these new pages

The backend routes for these new prepare attempts are not wired yet:

```text
/assets/article/prepare
/assets/video/prepare
/streams/prepare
/podcasts/prepare
```

Expected result today:

```text
HTTP 404
```

That is okay. It proves the frontend is making honest non-mutating gateway attempts.

Do not “fake success” in the extension. Keep showing:

```text
Backend routes may not be wired yet.
No publication occurred.
No b3 CID was assigned.
No ROC was charged.
```

This is aligned with RustyOnions WEB3 / NEXT_LEVEL invariants.

---

## Architectural invariants to preserve

For RustyOnions / CrabLink work, preserve these rules:

```text
- CrabLink is a thin client.
- CrabLink talks through svc-gateway / omnigate public gateway routes only.
- CrabLink must not directly call svc-wallet, ron-ledger, svc-storage, svc-index, svc-passport, or internal services.
- No fake ROC.
- No fake b3 CIDs.
- No fake profile publication.
- No fake username ownership.
- No fake REP/MOD scores.
- No silent paid actions.
- No wallet mutation from client except explicit gateway-mediated hold flow already proven for images.
- b3 hash remains canonical object identity.
- crab://<hash>.<kind> remains canonical public asset URL shape.
- Main passport creates sites.
- Alt passports can browse/comment later but should not create sites.
```

---

## Recommended next-session first task

Start by fixing the navigation collision between:

```text
crab://article
crab://video
crab://stream
crab://podcast
```

### Best file batch for next session

Recommended full paste-ready batch:

```text
extensions/chrome/src/page-local-route-mode.js        new
extensions/chrome/src/page-article-draft.js           update
extensions/chrome/src/page-video-draft.js             update
extensions/chrome/src/page-stream-draft.js            update
extensions/chrome/src/page-podcast-draft.js           update
extensions/chrome/src/page.html                       update only if importing route-mode or script order changes
```

Alternative minimal patch batch:

```text
extensions/chrome/src/page-article-draft.js
extensions/chrome/src/page-video-draft.js
extensions/chrome/src/page-stream-draft.js
extensions/chrome/src/page-podcast-draft.js
```

### Acceptance test

After patching, run:

```bash
cd /Users/mymac/Desktop/crablink
node --check extensions/chrome/src/page-article-draft.js
node --check extensions/chrome/src/page-video-draft.js
node --check extensions/chrome/src/page-stream-draft.js
node --check extensions/chrome/src/page-podcast-draft.js
scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh
```

Then reload unpacked extension and manually test this route sequence:

```text
crab://article
crab://video
crab://stream
crab://podcast
crab://video
crab://podcast
crab://stream
crab://article
```

Expected result:

```text
- URL and page content always match.
- Only one local scaffold is visible at a time.
- Article never appears above video.
- Video never appears above stream.
- Stream never appears above podcast.
- Podcast never remains when navigating back to video/stream/article.
- Profile page does not appear at bottom of article/video/stream/podcast.
- Generic duplicate backend forms remain hidden on local scaffold pages.
```

---

## Medium-term next steps after navigation bug

Once local scaffold routing is stable, the next high-impact options are:

### Option A — polish local creator hub navigation

Make the quick nav look more like a real CrabLink creator dashboard:

```text
Create
  Site
  Image
  Article
  Video
  Stream
  Podcast

Identity
  Profile
  Passport
  My Sites
  My Assets
```

This would reduce top-row clutter as more `crab://` surfaces are added.

### Option B — backend article publishing first

Article is the easiest real backend publishing target after image because it is text, not heavy media.

Suggested backend path:

```text
ron-proto article DTOs
ron-naming .article typed URL support if needed
omnigate /assets/article/prepare
omnigate /assets/article create
svc-gateway proxy routes
paid storage write reuse
index pointer for crab://<hash>.article
asset page hydration for article kind
CrabLink hold/capture submit flow
```

Article should be done before real video/stream/podcast backend because it exercises typed text assets with less complexity.

### Option C — real media backend planning

Video/stream/podcast need a bigger media plan:

```text
- large object paid storage
- range reads / streaming
- thumbnails
- manifests
- provider availability metadata
- archive/VOD plan
- live ingest/session keys
- chat/moderation/tips
- payout splits
```

Do not rush this into the backend until the local UX and route models are stable.

---

## Current emotional/product checkpoint

The project has crossed from “technical extension shell” into visible product territory. The user is seeing pages that feel like a real creator internet:

```text
- profile
- site creator proof
- article editor
- video upload draft
- streamer studio
- podcast studio
```

The current local scaffolds are not backend-complete, but they are valuable because they define the product shape before backend implementation. This helps avoid spaghetti across Rust crates and keeps frontend/backend contracts clean.

Next instance should begin with the routing bug, then continue either toward:

```text
1. article backend publishing, or
2. more CrabLink creator-dashboard polish.
```


### END NOTE - MAY 5 2026 - 18:35 CST