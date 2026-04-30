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